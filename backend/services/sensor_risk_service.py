import csv
import math
import os
from datetime import datetime, timezone
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
SENSOR_LOG_PATH = Path(os.getenv("SENSOR_LOG_PATH", BACKEND_DIR / "sensor_log.csv"))
SENSOR_STALE_SECONDS = float(os.getenv("SENSOR_STALE_SECONDS", "60"))

# Prototype operational values. Calibrate against local soil, sensor, rainfall,
# and historical hazard observations before operational deployment.
MOISTURE_WARNING_THRESHOLD = 40
SENSOR_LOW_THRESHOLD = 30
SENSOR_HIGH_THRESHOLD = 70

EXPECTED_COLUMNS = {
    "timestamp",
    "millis",
    "temperature_C",
    "humidity_pct",
    "soil_moisture_pct",
    "buzzer_state",
}


def _clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, float(value)))


def _number(value):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _parse_timestamp(value):
    try:
        parsed = datetime.fromisoformat(str(value).strip())
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _moisture_score(moisture):
    if moisture <= 20:
        score = 0
    elif moisture <= 40:
        score = ((moisture - 20) / 20) * 40
    elif moisture <= 60:
        score = 40 + ((moisture - 40) / 20) * 35
    else:
        score = 75 + ((moisture - 60) / 40) * 25
    return _clamp(score)


def _humidity_score(humidity):
    if humidity <= 40:
        score = (humidity / 40) * 20
    elif humidity <= 70:
        score = 20 + ((humidity - 40) / 30) * 50
    else:
        score = 70 + ((humidity - 70) / 30) * 30
    return _clamp(score)


def _temperature_score(temperature):
    if temperature <= 20:
        score = 20
    elif temperature <= 30:
        score = 20 + ((temperature - 20) / 10) * 40
    elif temperature <= 40:
        score = 60 + ((temperature - 30) / 10) * 40
    else:
        score = 100
    return _clamp(score)


def calculate_sensor_risk(moisture, humidity, temperature):
    moisture = _number(moisture)
    humidity = _number(humidity)
    temperature = _number(temperature)
    if moisture is None or humidity is None or temperature is None:
        return None

    moisture = _clamp(moisture)
    humidity = _clamp(humidity)
    temperature = _clamp(temperature, -50, 60)
    moisture_score = _moisture_score(moisture)
    humidity_score = _humidity_score(humidity)
    temperature_score = _temperature_score(temperature)
    sensor_score = round(
        0.70 * moisture_score
        + 0.15 * humidity_score
        + 0.15 * temperature_score
    )
    risk_level = (
        "LOW" if sensor_score < SENSOR_LOW_THRESHOLD
        else "MODERATE" if sensor_score <= SENSOR_HIGH_THRESHOLD
        else "HIGH"
    )
    return {
        "sensorRiskScore": int(_clamp(sensor_score)),
        "riskLevel": risk_level,
        "moistureScore": round(moisture_score),
        "humidityScore": round(humidity_score),
        "temperatureScore": round(temperature_score),
        "moistureWarningThreshold": MOISTURE_WARNING_THRESHOLD,
    }


def _read_valid_rows():
    if not SENSOR_LOG_PATH.exists():
        return []
    rows = []
    try:
        with SENSOR_LOG_PATH.open("r", encoding="utf-8-sig", newline="") as sensor_file:
            reader = csv.DictReader(sensor_file)
            if not reader.fieldnames or not EXPECTED_COLUMNS.issubset(set(reader.fieldnames)):
                return []
            for row in reader:
                timestamp = _parse_timestamp(row.get("timestamp"))
                temperature = _number(row.get("temperature_C"))
                humidity = _number(row.get("humidity_pct"))
                moisture = _number(row.get("soil_moisture_pct"))
                millis = _number(row.get("millis"))
                buzzer = _number(row.get("buzzer_state"))
                if timestamp is None or None in (temperature, humidity, moisture, millis, buzzer):
                    continue
                risk = calculate_sensor_risk(moisture, humidity, temperature)
                if risk is None:
                    continue
                rows.append({
                    "timestamp": timestamp.isoformat(),
                    "temperature": round(_clamp(temperature, -50, 60), 1),
                    "humidity": round(_clamp(humidity), 1),
                    "moisture": round(_clamp(moisture), 1),
                    "buzzer": int(buzzer != 0),
                    "millis": int(millis),
                    **risk,
                })
    except (OSError, csv.Error):
        return []
    return rows


def _with_status(reading):
    if reading is None:
        return {
            "timestamp": None,
            "temperature": None,
            "humidity": None,
            "moisture": None,
            "buzzer": None,
            "sensorRiskScore": None,
            "riskLevel": None,
            "status": "OFFLINE",
            "message": "No valid sensor data received yet.",
            "ageSeconds": None,
        }
    timestamp = _parse_timestamp(reading["timestamp"])
    age_seconds = max(0, (datetime.now(timezone.utc) - timestamp).total_seconds())
    status = "ONLINE" if age_seconds <= SENSOR_STALE_SECONDS else "STALE"
    return {**reading, "status": status, "ageSeconds": round(age_seconds, 1)}


def get_latest_sensor_reading():
    rows = _read_valid_rows()
    return _with_status(rows[-1] if rows else None)


def get_sensor_history(hours=24):
    try:
        hours = max(1.0, min(float(hours), 168.0))
    except (TypeError, ValueError):
        hours = 24.0
    cutoff = datetime.now(timezone.utc).timestamp() - hours * 3600
    rows = [row for row in _read_valid_rows() if _parse_timestamp(row["timestamp"]).timestamp() >= cutoff]
    return {
        "hours": hours,
        "status": _with_status(rows[-1] if rows else None)["status"],
        "readings": rows,
    }


def get_sensor_status():
    latest = get_latest_sensor_reading()
    return {
        "status": latest["status"],
        "timestamp": latest["timestamp"],
        "ageSeconds": latest["ageSeconds"],
        "staleAfterSeconds": SENSOR_STALE_SECONDS,
    }

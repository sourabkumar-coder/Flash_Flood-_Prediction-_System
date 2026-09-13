import csv
from datetime import datetime, timezone

import services.sensor_risk_service as sensor_service


def test_sensor_risk_cases():
    assert sensor_service.calculate_sensor_risk(20, 40, 20)["riskLevel"] == "LOW"
    assert sensor_service.calculate_sensor_risk(40, 46, 26.7)["riskLevel"] == "MODERATE"
    assert sensor_service.calculate_sensor_risk(50, 46, 26.7)["riskLevel"] == "MODERATE"
    assert sensor_service.calculate_sensor_risk(70, 80, 32)["riskLevel"] == "HIGH"
    assert sensor_service.calculate_sensor_risk(None, 40, 20) is None


def test_csv_reader_ignores_malformed_rows_and_returns_latest(tmp_path, monkeypatch):
    path = tmp_path / "sensor_log.csv"
    with path.open("w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["timestamp", "millis", "temperature_C", "humidity_pct", "soil_moisture_pct", "buzzer_state"])
        writer.writerow(["bad-row", "no", "data", "here", "x", "y"])
        writer.writerow([datetime.now(timezone.utc).isoformat(), "12", "26.7", "46", "50", "0"])
    monkeypatch.setattr(sensor_service, "SENSOR_LOG_PATH", path)
    reading = sensor_service.get_latest_sensor_reading()
    assert reading["status"] == "ONLINE"
    assert reading["moisture"] == 50.0
    assert reading["sensorRiskScore"] == 52


def test_missing_file_is_offline(tmp_path, monkeypatch):
    monkeypatch.setattr(sensor_service, "SENSOR_LOG_PATH", tmp_path / "missing.csv")
    reading = sensor_service.get_latest_sensor_reading()
    assert reading["status"] == "OFFLINE"
    assert reading["sensorRiskScore"] is None


def test_old_reading_is_stale(tmp_path, monkeypatch):
    path = tmp_path / "sensor_log.csv"
    with path.open("w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["timestamp", "millis", "temperature_C", "humidity_pct", "soil_moisture_pct", "buzzer_state"])
        writer.writerow(["2020-01-01T00:00:00+00:00", "12", "26.7", "46", "50", "0"])
    monkeypatch.setattr(sensor_service, "SENSOR_LOG_PATH", path)
    assert sensor_service.get_latest_sensor_reading()["status"] == "STALE"

import os
import sys
import joblib
import pandas as pd

from services.risk_engine import (
    calculate_risk_score,
    classify_risk,
    generate_risk_explanation,
)

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.feature_service import build_features
from services.iot_service import get_iot_sensor_data

MODEL_PATH = os.path.abspath(os.path.join(BACKEND_DIR, "../ml/models/flood_susceptibility_model.pkl"))


def _to_python_float(value, default=0.0):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_python_int(value, default=0):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return int(value)
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def predict_flood_risk(state_name, district_name, village_name=None):
    data = build_features(state_name, district_name)
    weather = data["weather"]
    terrain = data["terrain"]
    hydrology = data["hydrology"]
    historical = data["historical"]

    elevation = _to_python_float(terrain.get("mean_elevation_m"), 0.0)
    slope = _to_python_float(terrain.get("mean_slope_percent"), 0.0)
    max_slope = _to_python_float(terrain.get("max_slope_percent"), 0.0)
    relief = _to_python_float(terrain.get("relief_m"), 0.0)

    historical_events = _to_python_int(historical.get("historical_flood_events", 0), 0)
    historical_years = _to_python_int(historical.get("historical_flood_years", 0), 0)
    fatalities = _to_python_int(historical.get("historical_fatalities", 0), 0)
    displaced = _to_python_int(historical.get("historical_displaced", 0), 0)
    max_severity = _to_python_float(historical.get("historical_max_severity", 0), 0.0)
    max_impact = _to_python_float(historical.get("historical_max_impact", 0), 0.0)

    model_input = pd.DataFrame([{
        "elevation_m": elevation,
        "slope_percent": slope,
        "historical_flood_events": historical_events,
        "historical_flood_years": historical_years,
        "historical_fatalities": fatalities,
        "historical_displaced": displaced,
        "historical_max_severity": max_severity,
        "historical_max_impact": max_impact,
    }])

    model = load_model()
    probability = float(model.predict_proba(model_input)[0][1])
    susceptibility = probability * 100

    rainfall_1h = _to_python_float(weather.get("rainfall_1h", 0), 0.0)
    rainfall_3h = _to_python_float(weather.get("rainfall_3h", 0), 0.0)
    rainfall_6h = _to_python_float(weather.get("rainfall_6h", 0), 0.0)
    rainfall_24h = _to_python_float(weather.get("rainfall_24h", 0), 0.0)

    discharge_value = _to_python_float(hydrology.get("discharge"), 0.0) if hydrology.get("discharge") is not None else None
    discharge_status = hydrology.get("discharge_data_status")

    hilly_region = bool(elevation >= 1000 or slope >= 10)

    risk_score = calculate_risk_score(
        rainfall_1h=rainfall_1h,
        rainfall_3h=rainfall_3h,
        rainfall_6h=rainfall_6h,
        rainfall_24h=rainfall_24h,
        slope_percent=slope,
        elevation_m=elevation,
        relief_m=relief,
        river_discharge=discharge_value,
        hydrology_status=discharge_status,
        historical_susceptibility=susceptibility,
        hilly_region=hilly_region,
    )
    risk_level = classify_risk(risk_score)

    reason = generate_risk_explanation(
        risk_level=risk_level,
        hilly_region=hilly_region,
        slope_percent=slope,
        rainfall_24h=rainfall_24h,
        historical_susceptibility=susceptibility,
        hydrology_status=discharge_status,
        discharge_value=discharge_value,
    )

    soil_properties = data.get("soil", {}).get("properties", {})
    clay_percent = _to_python_float(soil_properties.get("clay", {}).get("mean_percent", 0), 0.0)
    sand_percent = _to_python_float(soil_properties.get("sand", {}).get("mean_percent", 0), 0.0)
    silt_percent = _to_python_float(soil_properties.get("silt", {}).get("mean_percent", 0), 0.0)

    return {
        "location": {
            "state": state_name,
            "district": district_name,
            "latitude": float(data["coordinates"]["latitude"]),
            "longitude": float(data["coordinates"]["longitude"]),
        },
        "terrain": {
            "hilly_region": hilly_region,
            "elevation_m": float(elevation) if elevation is not None else None,
            "slope_percent": float(slope) if slope is not None else None,
            "max_slope_percent": float(max_slope) if max_slope is not None else None,
            "relief_m": float(relief) if relief is not None else None,
        },
        "weather": {
            "temperature_c": float(weather.get("temperature")) if weather.get("temperature") is not None else None,
            "humidity_percent": float(weather.get("humidity", 0)) if weather.get("humidity") is not None else None,
            "rainfall_mm": float(weather.get("rainfall")) if weather.get("rainfall") is not None else None,
            "rainfall_1h_mm": float(rainfall_1h) if rainfall_1h is not None else None,
            "rainfall_3h_mm": float(rainfall_3h) if rainfall_3h is not None else None,
            "rainfall_6h_mm": float(rainfall_6h) if rainfall_6h is not None else None,
            "rainfall_24h_mm": float(rainfall_24h) if rainfall_24h is not None else None,
        },
        "hydrology": {
            "river_discharge": float(discharge_value) if discharge_value is not None else None,
            "water_level": float(hydrology.get("water_level")) if hydrology.get("water_level") is not None else None,
            "status": discharge_status,
            "station": hydrology.get("discharge_station"),
            "distance_km": float(hydrology.get("discharge_distance_km")) if hydrology.get("discharge_distance_km") is not None else None,
            "reason": reason,
        },
        "soil": {
            "clay_percent": float(clay_percent),
            "sand_percent": float(sand_percent),
            "silt_percent": float(silt_percent),
        },
        "historical": {
            "flood_events": historical_events,
            "flood_years": historical_years,
            "fatalities": fatalities,
            "displaced": displaced,
            "max_severity": float(max_severity) if max_severity is not None else None,
            "max_impact": float(max_impact) if max_impact is not None else None,
        },
        "iot": get_iot_sensor_data(state_name, district_name, village_name) if village_name else {
            "status": "UNAVAILABLE",
            "soil_moisture_percent": None,
            "localized_rainfall_mm_hr": None,
            "slope_tilt_mm": None,
            "last_updated": "N/A"
        },
        "landslide": {
            "risk_score": float(risk_score) * 0.8 if hilly_region else 0.0,
            "risk_level": risk_level if hilly_region else "LOW"
        },
        "evacuation": {
            "lead_time_hours": 24.0 if risk_level in ["CRITICAL", "HIGH"] else None,
            "status": "PREPARE" if risk_level == "CRITICAL" else "MONITORING"
        },
        "prediction": {
            "susceptibility_percent": round(float(susceptibility), 2),
            "risk_score": float(risk_score),
            "risk_level": risk_level,
            "hilly_region": hilly_region,
        },
    }
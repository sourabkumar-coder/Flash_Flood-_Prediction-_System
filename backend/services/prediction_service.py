"""
Prediction Service
==================
Builds the 13-feature vector expected by xgboost_flood_model.pkl
and runs risk scoring.

Model expected features (from training):
  Categorical : Land Cover, Soil Type
  Numeric     : Latitude, Longitude, Rainfall (mm), Temperature (°C),
                Humidity (%), River Discharge (m³/s), Water Level (m),
                Elevation (m), Population Density, Infrastructure,
                Historical Floods
"""

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

MODEL_PATH = os.path.abspath(
    os.path.join(BACKEND_DIR, "../ml/models/xgboost_flood_model.pkl")
)

HILLY_STATES = {
    "Himachal Pradesh", "Uttarakhand", "Jammu and Kashmir", "Ladakh",
    "Sikkim", "Arunachal Pradesh", "Assam", "Meghalaya", "Manipur",
    "Mizoram", "Nagaland", "Tripura"
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _f(value, default=0.0):
    """Safe float conversion."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _i(value, default=0):
    """Safe int conversion."""
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# Soil type mapping: clay/sand/silt percentages → dominant Soil Type label
# ---------------------------------------------------------------------------
_SOIL_TYPE_THRESHOLDS = [
    ("Clay",  "clay",  0.40),   # >40% clay → Clay
    ("Sandy", "sand",  0.50),   # >50% sand → Sandy
    ("Silt",  "silt",  0.40),   # >40% silt → Silt
]

def _infer_soil_type(clay_pct, sand_pct, silt_pct):
    """Map soil fractions (%) to training-time Soil Type label."""
    for label, prop, threshold in _SOIL_TYPE_THRESHOLDS:
        val = {"clay": clay_pct, "sand": sand_pct, "silt": silt_pct}[prop]
        if val >= threshold * 100:
            return label
    return "Loam"  # balanced / default


# ---------------------------------------------------------------------------
# Land Cover heuristic: elevation + river discharge → Land Cover label
# Training categories: Water Body, Forest, Agricultural, Desert, Urban
# ---------------------------------------------------------------------------
def _infer_land_cover(elevation_m, discharge_m3s, rainfall_mm):
    """Estimate land cover from terrain & hydrology heuristics."""
    if discharge_m3s is not None and discharge_m3s > 2000:
        return "Water Body"
    if elevation_m >= 800 and rainfall_mm > 100:
        return "Forest"
    if rainfall_mm < 20 and elevation_m < 400:
        return "Desert"
    return "Agricultural"   # most of India's flood-risk districts


# ---------------------------------------------------------------------------
# Population density proxy: use historical flood data as signal
# Training range: ~2–10 000 persons/km². Median ≈ 5 000.
# Without census data we use 5 000 as a neutral prior.
# ---------------------------------------------------------------------------
_DEFAULT_POPULATION_DENSITY = 5000.0
_DEFAULT_INFRASTRUCTURE    = 1        # 1 = basic infrastructure present


# ---------------------------------------------------------------------------
# Model loader
# ---------------------------------------------------------------------------
def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


# ---------------------------------------------------------------------------
# Main prediction
# ---------------------------------------------------------------------------
def predict_flood_risk(state_name=None, district_name=None, village_name=None, latitude=None, longitude=None):
    data = build_features(
        state_name=state_name,
        district_name=district_name,
        latitude=latitude,
        longitude=longitude,
    )

    coordinates = data.get("coordinates", {})
    resolved_state = data.get("state") or coordinates.get("state") or state_name or "India"
    resolved_district = data.get("district") or coordinates.get("district") or district_name or f"GPS ({latitude:.4f}, {longitude:.4f})"
    resolved_village = village_name or data.get("village") or coordinates.get("village")

    weather     = data["weather"]
    terrain     = data["terrain"]
    hydrology   = data["hydrology"]
    historical  = data["historical"]

    # ------------------------------------------------------------------
    # Extract individual signals
    # ------------------------------------------------------------------
    latitude   = _f(coordinates.get("latitude", latitude))
    longitude  = _f(coordinates.get("longitude", longitude))

    elevation  = _f(terrain.get("mean_elevation_m"), 0.0)
    slope      = _f(terrain.get("mean_slope_percent"), 0.0)
    max_slope  = _f(terrain.get("max_slope_percent"), 0.0)
    relief     = _f(terrain.get("relief_m"), 0.0)

    temperature = _f(weather.get("temperature"), 25.0)
    humidity    = _f(weather.get("humidity"), 60.0)
    rainfall    = _f(weather.get("rainfall_24h"), _f(weather.get("rainfall"), 0.0))
    rainfall_1h = _f(weather.get("rainfall_1h"), 0.0)
    rainfall_3h = _f(weather.get("rainfall_3h"), 0.0)
    rainfall_6h = _f(weather.get("rainfall_6h"), 0.0)

    discharge_raw   = hydrology.get("discharge")
    discharge_value = _f(discharge_raw, 0.0)
    discharge_status = hydrology.get("discharge_data_status", "UNAVAILABLE")

    water_level_raw = hydrology.get("water_level")
    water_level     = _f(water_level_raw, 0.0)

    historical_floods = _i(historical.get("historical_flood_events"), 0)
    historical_years  = _i(historical.get("historical_flood_years"), 0)
    fatalities        = _i(historical.get("historical_fatalities"), 0)
    displaced         = _i(historical.get("historical_displaced"), 0)
    max_severity      = _f(historical.get("historical_max_severity"), 0.0)
    max_impact        = _f(historical.get("historical_max_impact"), 0.0)

    # ------------------------------------------------------------------
    # Soil composition
    # ------------------------------------------------------------------
    soil_props  = data.get("soil", {}).get("properties", {})
    clay_pct    = _f(soil_props.get("clay",  {}).get("mean_percent"), 30.0)
    sand_pct    = _f(soil_props.get("sand",  {}).get("mean_percent"), 40.0)
    silt_pct    = _f(soil_props.get("silt",  {}).get("mean_percent"), 30.0)

    soil_type   = _infer_soil_type(clay_pct, sand_pct, silt_pct)
    land_cover  = _infer_land_cover(elevation, discharge_value, rainfall)

    # ------------------------------------------------------------------
    # Build model input DataFrame — MUST match training columns exactly
    # ------------------------------------------------------------------
    model_input = pd.DataFrame([{
        "Latitude":                latitude,
        "Longitude":               longitude,
        "Rainfall (mm)":           rainfall,
        "Temperature (°C)":        temperature,
        "Humidity (%)":            humidity,
        "River Discharge (m³/s)":  discharge_value,
        "Water Level (m)":         water_level,
        "Elevation (m)":           elevation,
        "Land Cover":              land_cover,
        "Soil Type":               soil_type,
        "Population Density":      _DEFAULT_POPULATION_DENSITY,
        "Infrastructure":          _DEFAULT_INFRASTRUCTURE,
        "Historical Floods":       historical_floods,
    }])

    # ------------------------------------------------------------------
    # XGBoost prediction
    # ------------------------------------------------------------------
    model = load_model()
    probability     = float(model.predict_proba(model_input)[0][1])
    susceptibility  = probability * 100

    # ------------------------------------------------------------------
    # Risk scoring (weighted formula in risk_engine.py)
    # ------------------------------------------------------------------
    hilly_region = bool(resolved_state in HILLY_STATES or elevation >= 500 or slope >= 5.0)

    risk_score = calculate_risk_score(
        rainfall_1h=rainfall_1h,
        rainfall_3h=rainfall_3h,
        rainfall_6h=rainfall_6h,
        rainfall_24h=rainfall,
        slope_percent=slope,
        elevation_m=elevation,
        relief_m=relief,
        river_discharge=discharge_value if discharge_raw is not None else None,
        hydrology_status=discharge_status,
        historical_susceptibility=susceptibility,
        hilly_region=hilly_region,
    )
    risk_level = classify_risk(risk_score)

    reason = generate_risk_explanation(
        risk_level=risk_level,
        hilly_region=hilly_region,
        slope_percent=slope,
        rainfall_24h=rainfall,
        historical_susceptibility=susceptibility,
        hydrology_status=discharge_status,
        discharge_value=discharge_value if discharge_raw is not None else None,
    )

    return {
        "location": {
            "state":     resolved_state,
            "district":  resolved_district,
            "village":   resolved_village,
            "latitude":  latitude,
            "longitude": longitude,
        },
        "terrain": {
            "hilly_region":     hilly_region,
            "elevation_m":      elevation,
            "slope_percent":    slope,
            "max_slope_percent": max_slope,
            "relief_m":         relief,
        },
        "weather": {
            "temperature_c":    temperature,
            "humidity_percent": humidity,
            "rainfall_mm":      rainfall,
            "rainfall_1h_mm":   rainfall_1h,
            "rainfall_3h_mm":   rainfall_3h,
            "rainfall_6h_mm":   rainfall_6h,
            "rainfall_24h_mm":  rainfall,
        },
        "hydrology": {
            "river_discharge":      discharge_value if discharge_raw is not None else None,
            "discharge_mean":       _f(hydrology.get("discharge_mean")) if hydrology.get("discharge_mean") is not None else None,
            "discharge_max":        _f(hydrology.get("discharge_max")) if hydrology.get("discharge_max") is not None else None,
            "discharge_min":        _f(hydrology.get("discharge_min")) if hydrology.get("discharge_min") is not None else None,
            "discharge_p25":        _f(hydrology.get("discharge_p25")) if hydrology.get("discharge_p25") is not None else None,
            "discharge_p75":        _f(hydrology.get("discharge_p75")) if hydrology.get("discharge_p75") is not None else None,
            "discharge_max_7d":     _f(hydrology.get("discharge_max_7d")) if hydrology.get("discharge_max_7d") is not None else None,
            "discharge_avg_7d":     _f(hydrology.get("discharge_avg_7d")) if hydrology.get("discharge_avg_7d") is not None else None,
            "discharge_forecast_7d": hydrology.get("discharge_forecast_7d"),
            "water_level":          water_level if water_level_raw is not None else None,
            "water_level_status":   hydrology.get("water_level_data_status"),
            "status":               discharge_status,
            "station":              hydrology.get("discharge_station"),
            "discharge_source":     hydrology.get("discharge_source"),
            "model_name":           hydrology.get("model_name"),
            "distance_km":          _f(hydrology.get("discharge_distance_km")) if hydrology.get("discharge_distance_km") is not None else None,
            "reason":               reason,
            "time_series":          hydrology.get("time_series"),
        },
        "soil": {
            "clay_percent":  clay_pct,
            "sand_percent":  sand_pct,
            "silt_percent":  silt_pct,
            "soil_type":     soil_type,
            "land_cover":    land_cover,
        },
        "historical": {
            "flood_events": historical_floods,
            "flood_years":  historical_years,
            "fatalities":   fatalities,
            "displaced":    displaced,
            "max_severity": max_severity if historical.get("historical_max_severity") is not None else None,
            "max_impact":   max_impact   if historical.get("historical_max_impact")   is not None else None,
        },
        "iot": get_iot_sensor_data(state_name, district_name, village_name) if village_name else {
            "status": "UNAVAILABLE",
            "soil_moisture_percent": None,
            "localized_rainfall_mm_hr": None,
            "slope_tilt_mm": None,
            "last_updated": "N/A",
        },
        "landslide": {
            "risk_score": float(risk_score) * 0.8 if hilly_region else 0.0,
            "risk_level": risk_level if hilly_region else "LOW",
        },
        "evacuation": {
            "lead_time_hours": 24.0 if risk_level in ["CRITICAL", "HIGH"] else None,
            "status": "PREPARE" if risk_level == "CRITICAL" else "MONITORING",
        },
        "prediction": {
            "susceptibility_percent": round(float(susceptibility), 2),
            "risk_score":   float(risk_score),
            "risk_level":   risk_level,
            "hilly_region": hilly_region,
            "reason":       reason,
        },
    }

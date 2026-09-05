"""
FastAPI REST Endpoints for AegisHydro Flash Flood Decision Support System
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
from backend.app.core.data_fixtures import (
    BEAS_BASIN_REGION, VILLAGE_GEOJSON, RIVER_CHANNELS, HISTORICAL_EVENTS
)
from backend.app.services.iot_simulator import iot_simulator
from backend.app.services.evacuation_engine import evacuation_engine
from backend.app.services.ml_engine import ml_engine
from backend.app.services.live_weather_service import live_weather_service

router = APIRouter(prefix="/api/v1", tags=["AegisHydro"])

class WhatIfRequest(BaseModel):
    rainfall_intensity_mm_h: float = 55.0
    soil_presaturation_pct: float = 75.0
    upstream_dam_inflow_cusecs: float = 35000.0
    cloudburst_duration_hrs: float = 3.0

class SensorStatusRequest(BaseModel):
    status: str  # "ONLINE", "DEGRADED", "OFFLINE"

@router.get("/regions/current")
def get_current_region():
    return {
        "region": BEAS_BASIN_REGION,
        "river_channels": RIVER_CHANNELS
    }

@router.get("/villages")
def get_villages_geojson():
    """Returns village polygon boundaries enriched with real-time risk predictions."""
    geojson = {
        "type": "FeatureCollection",
        "features": []
    }
    for feat in VILLAGE_GEOJSON["features"]:
        v_id = feat["id"]
        v_state = iot_simulator.village_states.get(v_id)
        
        # Merge static geometry with live predictions
        feature_copy = dict(feat)
        props = dict(feature_copy["properties"])
        
        if v_state:
            pred = v_state.get("prediction", {})
            props["risk_score"] = pred.get("risk_score", 0.0)
            props["risk_level"] = pred.get("risk_level", "LOW")
            props["lead_time_hrs"] = pred.get("lead_time_hrs", 12.0)
            props["probability"] = pred.get("probability", 0.0)
            props["confidence_pct"] = pred.get("confidence_pct", 90.0)
            props["features"] = v_state.get("features", {})
            props["last_updated"] = v_state.get("last_updated")

        feature_copy["properties"] = props
        geojson["features"].append(feature_copy)

    return geojson

@router.get("/villages/{village_id}/history")
def get_village_temporal_curve(village_id: str):
    if village_id not in iot_simulator.village_states:
        raise HTTPException(status_code=404, detail="Village not found")
    
    st = iot_simulator.village_states[village_id]
    curr_risk = st["prediction"]["risk_score"]
    curr_rain = st["features"]["rain_accum_1h"]
    curr_stage = st["features"]["river_water_level_m"]
    
    # 12-step temporal history & 6-step forward projection
    history = []
    for i in range(12, 0, -1):
        history.append({
            "time_offset": f"-{i*30}m",
            "risk_score": max(5.0, round(curr_risk * (1.0 - (i * 0.06)), 1)),
            "rainfall_mm": max(0.0, round(curr_rain * (1.0 - (i * 0.05)), 1)),
            "stage_m": max(1.0, round(curr_stage * (1.0 - (i * 0.04)), 2))
        })
    
    # Current
    history.append({
        "time_offset": "NOW",
        "risk_score": curr_risk,
        "rainfall_mm": curr_rain,
        "stage_m": curr_stage
    })

    # Forward Forecast
    for i in range(1, 7):
        decay = 1.05 if st["prediction"]["risk_level"] in ["HIGH", "CRITICAL"] else 0.95
        history.append({
            "time_offset": f"+{i}h (Forecast)",
            "risk_score": min(100.0, max(5.0, round(curr_risk * (decay ** i), 1))),
            "rainfall_mm": max(0.0, round(st["features"]["forecast_rain_next_6h"] / 6.0, 1)),
            "stage_m": round(curr_stage * (decay ** (i * 0.5)), 2)
        })

    return {
        "village_id": village_id,
        "village_name": st["name"],
        "temporal_series": history
    }

@router.get("/sensors")
def get_sensors():
    return {
        "count": len(iot_simulator.sensors),
        "sensors": iot_simulator.sensors,
        "health_summary": {
            "online": sum(1 for s in iot_simulator.sensors if s["status"] == "ONLINE"),
            "degraded": sum(1 for s in iot_simulator.sensors if s["status"] == "DEGRADED"),
            "offline": sum(1 for s in iot_simulator.sensors if s["status"] == "OFFLINE")
        }
    }

@router.post("/sensors/{sensor_id}/status")
def set_sensor_status(sensor_id: str, req: SensorStatusRequest):
    res = iot_simulator.set_sensor_status(sensor_id, req.status)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.get("/risk/explain/{village_id}")
def explain_village_risk(village_id: str):
    if village_id not in iot_simulator.village_states:
        raise HTTPException(status_code=404, detail="Village not found")
    
    st = iot_simulator.village_states[village_id]
    pred = st["prediction"]
    feats = st["features"]

    # Hydrological saturation regime
    sm = feats["soil_moisture_pct"]
    if sm > 80:
        amc_regime = "AMC-III (Severely Saturated / Near Zero Infiltration)"
    elif sm > 50:
        amc_regime = "AMC-II (Moderate Antecedent Moisture)"
    else:
        amc_regime = "AMC-I (Dry Soil Condition / High Absorption)"

    return {
        "village_id": village_id,
        "village_name": st["name"],
        "district": st["district"],
        "risk_score": pred["risk_score"],
        "risk_level": pred["risk_level"],
        "probability": pred["probability"],
        "lead_time_hrs": pred["lead_time_hrs"],
        "confidence_pct": pred["confidence_pct"],
        "amc_soil_regime": amc_regime,
        "shap_factors": pred["shap_factors"],
        "raw_features": feats
    }

@router.get("/evacuation/plan")
def get_evacuation_plan():
    return evacuation_engine.get_evacuation_plan()

@router.get("/alerts")
def get_alerts():
    return {
        "count": len(iot_simulator.alerts),
        "alerts": iot_simulator.alerts[-15:]  # Latest 15 alerts
    }

@router.post("/simulation/start-demo")
def start_demo():
    return iot_simulator.start_disaster_demo()

@router.post("/simulation/step")
def step_demo():
    res = iot_simulator.step_disaster_demo()
    return res or {"message": "Demo is not active or completed."}

@router.post("/simulation/what-if")
def what_if_simulation(req: WhatIfRequest):
    return iot_simulator.execute_what_if(req.dict())

@router.post("/simulation/reset")
def reset_simulation():
    return iot_simulator.reset_to_normal()

@router.get("/models/benchmark")
def get_model_benchmark():
    return {
        "primary_model": ml_engine.feature_metadata.get("primary_model", "Real-data classifier"),
        "validation_strategy": "Time-based Train/Test Split (Preventing Data Leakage)",
        "optimization_criterion": "Recall-first model selection with PR-AUC/F1 tie-breaks; false negatives are explicitly reported",
        "models": ml_engine.benchmark_metrics,
        "feature_importances": ml_engine.feature_metadata.get("importances", {})
    }

@router.get("/historical/events")
def get_historical_events():
    return {
        "events": HISTORICAL_EVENTS
    }

@router.post("/weather/live-sync")
async def sync_live_weather():
    """Fetches real-time live data from Open-Meteo & OpenWeatherMap and recalculates ML risk."""
    live_data = await live_weather_service.sync_all_villages_live()
    
    # Apply to in-memory features and recalculate ML predictions
    for v_id, w_info in live_data.items():
        if v_id in iot_simulator.village_states:
            st = iot_simulator.village_states[v_id]
            st["features"]["rain_accum_1h"] = float(w_info["live_rain_1h"])
            st["features"]["soil_moisture_pct"] = float(w_info["live_soil_moisture_pct"])
            st["features"]["soil_saturation_ratio"] = float(w_info["live_soil_moisture_pct"]) / 100.0
            
            # Re-predict
            st["prediction"] = ml_engine.predict_single(st["features"])
            
    return {
        "status": "LIVE_SYNC_COMPLETED",
        "synced_wards_count": len(live_data),
        "data": live_data,
        "sources": [
            {"name": "Open-Meteo API", "status": "ACTIVE_LIVE", "metrics": "Hourly Rain, Multi-layer Soil Moisture, Temperature"},
            {"name": "OpenWeatherMap API", "status": "CONFIGURED"},
            {"name": "IMD Mausam Portal", "status": "SYNOPTIC_REFERENCE", "url": "https://mausam.imd.gov.in/responsive/rainfall_statistics.php?PAGE=4"}
        ]
    }


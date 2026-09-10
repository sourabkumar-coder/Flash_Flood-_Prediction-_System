from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time

from api_models import (
    LocationRequest, PredictionResponse, BatchPredictionRequest, BatchPredictionResponse
)
from services.district_service import (
    get_states, get_districts_by_state, get_district_coordinates, reverse_geocode_coordinates
)
from services.feature_service import build_features
from services.prediction_service import predict_flood_risk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Flash Flood Prediction System",
    description="Real-time Flash Flood Early Warning System for hilly regions of India",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory prediction cache (TTL: 10 minutes)
PREDICTION_CACHE = {}
CACHE_TTL = 600

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error handler caught: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": "InternalServerError"}
    )

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/states")
def read_states():
    try:
        states = get_states()
        return {"states": states}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch states: {str(e)}")

@app.get("/districts/{state}")
def read_districts(state: str):
    try:
        districts = get_districts_by_state(state)
        if not districts:
            raise HTTPException(status_code=404, detail="State not found or has no districts")
        return {"districts": districts}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch districts: {str(e)}")

@app.get("/villages/{district}")
def read_villages(district: str):
    try:
        # Currently returns empty list as village GeoJSON was removed
        return {"villages": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch villages: {str(e)}")

@app.get("/location/reverse")
def read_reverse_location(lat: float, lon: float):
    """
    Reverse geocode GPS coordinates to State, District, and nearest location metadata.
    """
    try:
        coords = reverse_geocode_coordinates(lat, lon)
        return coords
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reverse-geocode coordinates: {str(e)}")

@app.get("/location/{state}/{district}")
def read_location(state: str, district: str):
    try:
        coords = get_district_coordinates(state, district)
        if not coords:
            raise HTTPException(status_code=404, detail="District not found")
        return coords
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch location: {str(e)}")

@app.get("/features/{state}/{district}")
def read_features(state: str, district: str):
    try:
        data = build_features(state, district)
        return data
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build features: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
def predict_risk(request: LocationRequest):
    now = time.time()

    # Determine cache key based on GPS coords or state/district
    if request.latitude is not None and request.longitude is not None:
        cache_key = f"gps_{request.latitude:.4f}_{request.longitude:.4f}"
    else:
        village_key = request.village.strip().casefold() if request.village else ""
        state_key = request.state.strip().casefold() if request.state else ""
        district_key = request.district.strip().casefold() if request.district else ""
        cache_key = f"{state_key}_{district_key}_{village_key}"
    
    if cache_key in PREDICTION_CACHE:
        cached_data, timestamp = PREDICTION_CACHE[cache_key]
        if now - timestamp < CACHE_TTL:
            logger.info(f"Returning cached prediction for key: {cache_key}")
            return cached_data
            
    try:
        logger.info(f"Predicting risk for state={request.state}, district={request.district}, lat={request.latitude}, lon={request.longitude}")
        result = predict_flood_risk(
            state_name=request.state,
            district_name=request.district,
            village_name=request.village,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        
        # Save to cache
        PREDICTION_CACHE[cache_key] = (result, now)
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(request: BatchPredictionRequest):
    predictions = []
    errors = []
    
    for loc in request.locations:
        try:
            res = predict_risk(loc)
            predictions.append(res)
        except HTTPException as he:
            errors.append({"state": loc.state, "district": loc.district, "error": he.detail})
        except Exception as e:
            errors.append({"state": loc.state, "district": loc.district, "error": str(e)})
            
    return BatchPredictionResponse(predictions=predictions, errors=errors)

# ==============================================================================
# Evacuation Routing Endpoint
# ==============================================================================
from services.routing_service import get_evacuation_routes

@app.get("/api/evacuation/plan")
def get_evacuation_plan(lat: float, lon: float):
    routes = get_evacuation_routes(lat, lon)
    if not routes:
        raise HTTPException(status_code=404, detail="Evacuation routes could not be generated.")
    return routes

# ==============================================================================
# Regional Hilly Basins & Macro GIS Overview Endpoints
# ==============================================================================
import json
from pathlib import Path

REGIONAL_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "regional_hilly_basins.json"
REGIONAL_DATA = {"basins": [], "monitored_valleys": []}
if REGIONAL_DATA_FILE.exists():
    try:
        with open(REGIONAL_DATA_FILE, "r", encoding="utf-8") as f:
            REGIONAL_DATA = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load regional basin data: {e}")

REGIONAL_CACHE = {
    "lastSync": None,
    "isSimulated": False,
    "simulationScenario": None,
    "criticalAlert": None,
    "valleys": [],
    "summary": {
        "totalMonitored": 0,
        "criticalCount": 0,
        "highCount": 0,
        "moderateCount": 0,
        "lowCount": 0,
        "minLeadTimeHours": 12.0,
        "status": "NORMAL_BASELINE"
    }
}

def get_threat_overview_data():
    if REGIONAL_CACHE["valleys"]:
        return REGIONAL_CACHE
    
    valleys = REGIONAL_DATA.get("monitored_valleys", [])
    computed = []
    for v in valleys:
        threat_score = v.get("base_risk", 20.0)
        risk_level = "LOW"
        if threat_score >= 75:
            risk_level = "CRITICAL"
        elif threat_score >= 55:
            risk_level = "HIGH"
        elif threat_score >= 30:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"
        
        computed.append({
            **v,
            "risk_score": threat_score,
            "risk_level": risk_level,
            "lead_time_hours": 12.0,
            "current_rainfall_mm": 0.0,
            "rainfall_24h_mm": 0.0,
            "current_river_stage_m": v.get("danger_stage_m", 5.0) * 0.45,
            "is_above_danger": False
        })
    
    REGIONAL_CACHE["valleys"] = computed
    REGIONAL_CACHE["lastSync"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    REGIONAL_CACHE["summary"]["totalMonitored"] = len(computed)
    return REGIONAL_CACHE

@app.get("/api/overview/threats")
@app.get("/overview/threats")
def read_threats():
    return get_threat_overview_data()

@app.get("/api/overview/rivers")
@app.get("/overview/rivers")
def read_rivers():
    basins = REGIONAL_DATA.get("basins", [])
    updated = []
    for b in basins:
        gauges = []
        for g in b.get("gauge_nodes", []):
            gauges.append({
                **g,
                "current_stage_m": g.get("base_level", 2.0),
                "is_danger": False
            })
        updated.append({**b, "gauge_nodes": gauges})
    return {"basins": updated}

@app.post("/api/overview/simulate")
@app.post("/overview/simulate")
async def simulate_overview(request: Request):
    body = await request.json()
    scenario = body.get("scenario", "CLOUDBURST_SAINJ")
    if scenario == "RESET":
        REGIONAL_CACHE["isSimulated"] = False
        REGIONAL_CACHE["simulationScenario"] = None
        REGIONAL_CACHE["criticalAlert"] = None
        REGIONAL_CACHE["valleys"] = []
        get_threat_overview_data()
        return {"message": "Simulation reset.", "threatCache": REGIONAL_CACHE}
    
    REGIONAL_CACHE["isSimulated"] = True
    REGIONAL_CACHE["simulationScenario"] = scenario
    valleys = REGIONAL_DATA.get("monitored_valleys", [])
    computed = []
    for v in valleys:
        if v.get("id") == "val_sainj":
            computed.append({
                **v,
                "risk_score": 77.7,
                "risk_level": "CRITICAL",
                "lead_time_hours": 3.2,
                "current_rainfall_mm": 88.5,
                "rainfall_24h_mm": 194.2,
                "current_river_stage_m": 7.8,
                "is_above_danger": True
            })
        elif v.get("id") in ["val_aut", "val_larji"]:
            computed.append({
                **v,
                "risk_score": 64.2,
                "risk_level": "HIGH",
                "lead_time_hours": 5.5,
                "current_rainfall_mm": 42.0,
                "rainfall_24h_mm": 112.0,
                "current_river_stage_m": 6.8,
                "is_above_danger": False
            })
        else:
            computed.append({
                **v,
                "risk_score": v.get("base_risk", 20.0),
                "risk_level": "LOW",
                "lead_time_hours": 12.0,
                "current_rainfall_mm": 0.0,
                "rainfall_24h_mm": 2.0,
                "current_river_stage_m": 2.2,
                "is_above_danger": False
            })
    computed.sort(key=lambda x: x["risk_score"], reverse=True)
    REGIONAL_CACHE["valleys"] = computed
    REGIONAL_CACHE["criticalAlert"] = {
        "title": "FLASH FLOOD WARNING: Sainj Valley (Neuli) has reached CRITICAL risk (77.7/100)",
        "target": "Sainj Valley (Neuli) · Kullu Dist. · Lead Time: 3.2h",
        "leadTime": "3.2 hrs",
        "action": "Evacuate low-lying riverbanks immediately."
    }
    REGIONAL_CACHE["summary"] = {
        "totalMonitored": len(computed),
        "criticalCount": 1,
        "highCount": 2,
        "moderateCount": 0,
        "lowCount": len(computed) - 3,
        "minLeadTimeHours": 3.2,
        "status": "CRITICAL_SIMULATION"
    }
    return {"message": "Simulation active.", "threatCache": REGIONAL_CACHE}

@app.post("/api/overview/sync")
@app.post("/overview/sync")
def sync_overview():
    return {"message": "Synced.", "threatCache": get_threat_overview_data()}

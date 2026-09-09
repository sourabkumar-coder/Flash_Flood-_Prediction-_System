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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from env_loader import load_env

load_env()


from api_models import (
    LocationRequest, PredictionResponse, BatchPredictionRequest, BatchPredictionResponse,
    UserRegisterRequest, UserLoginRequest, RegionalAlertRequest, ChatRequest
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
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/states")
@app.get("/api/states")
def read_states():
    try:
        states = get_states()
        return {"states": states}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch states: {str(e)}")

@app.get("/districts")
@app.get("/api/districts")
def read_all_districts():
    try:
        from services.district_service import _load_districts_data
        data = _load_districts_data()
        all_districts = []
        for state, districts in data.items():
            for d in districts:
                all_districts.append({"district": d, "state": state})
        all_districts.sort(key=lambda x: x["district"])
        return {"districts": all_districts, "by_state": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch all districts: {str(e)}")

@app.get("/districts/{state}")
@app.get("/api/districts/{state}")
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

@app.get("/villages")
@app.get("/api/villages")
def read_all_villages():
    try:
        from services.village_service import get_all_monitored_villages
        villages = get_all_monitored_villages()
        if villages:
            return {"villages": villages}
        data = get_threat_overview_data()
        return {"villages": data.get("valleys", [])}
    except Exception as e:
        logger.error(f"Failed to read all villages: {str(e)}")
        return {"villages": []}

@app.get("/villages/{district}")
@app.get("/api/villages/{district}")
def read_villages(district: str, state: str = None):
    try:
        from services.village_service import get_villages_by_district
        v_list = get_villages_by_district(district, state)
        village_names = [v["name"] for v in v_list]
        return {
            "district": district,
            "state": state,
            "villages": village_names,
            "details": v_list
        }
    except Exception as e:
        logger.error(f"Failed to fetch villages for {district}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch villages: {str(e)}")

@app.get("/location/reverse")
@app.get("/api/location/reverse")
def read_reverse_location(lat: float, lon: float):
    """
    Reverse geocode GPS coordinates to State, District, and nearest location metadata.
    """
    try:
        coords = reverse_geocode_coordinates(lat, lon)
        return coords
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reverse-geocode coordinates: {str(e)}")


def _weather_condition_from_code(code: int) -> str:
    if code == 0:
        return 'Clear'
    if code in (1, 2):
        return 'Partly cloudy'
    if code in (3,):
        return 'Cloudy'
    if code in (45, 48):
        return 'Fog'
    if code in (51, 53, 55, 56, 57):
        return 'Drizzle'
    if code in (61, 63, 65, 66, 67, 80, 81, 82):
        return 'Rain'
    if code in (71, 73, 75, 77, 85, 86):
        return 'Snow'
    if code in (95, 96, 99):
        return 'Thunderstorm'
    return 'Cloudy'


@app.get("/weather")
@app.get("/api/weather")
def get_weather_endpoint(lat: float, lon: float):
    """Fetch live GPS-driven weather and 24h precipitation from Open-Meteo."""
    try:
        import requests
        url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
            "&hourly=temperature_2m,precipitation_probability,weather_code"
            "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max"
            "&timezone=auto"
        )
        res = requests.get(url, timeout=10)
        res.raise_for_status()
        data = res.json()
        current = data.get("current", {})
        hourly = data.get("hourly", {})
        daily = data.get("daily", {})

        hourly_times = hourly.get("time", [])[:24]
        formatted_hourly = [
            {
                "time": t,
                "temperature": hourly.get("temperature_2m", [])[i] if i < len(hourly.get("temperature_2m", [])) else None,
                "precipitationProbability": hourly.get("precipitation_probability", [])[i] if i < len(hourly.get("precipitation_probability", [])) else 0,
                "conditionCode": hourly.get("weather_code", [])[i] if i < len(hourly.get("weather_code", [])) else 0
            }
            for i, t in enumerate(hourly_times)
        ]

        daily_times = daily.get("time", [])
        formatted_daily = [
            {
                "time": t,
                "temperatureMax": daily.get("temperature_2m_max", [])[i] if i < len(daily.get("temperature_2m_max", [])) else None,
                "temperatureMin": daily.get("temperature_2m_min", [])[i] if i < len(daily.get("temperature_2m_min", [])) else None,
                "precipitationSum": daily.get("precipitation_sum", [])[i] if i < len(daily.get("precipitation_sum", [])) else 0.0,
                "precipitationProbability": daily.get("precipitation_probability_max", [])[i] if i < len(daily.get("precipitation_probability_max", [])) else 0,
                "conditionCode": daily.get("weather_code", [])[i] if i < len(daily.get("weather_code", [])) else 0
            }
            for i, t in enumerate(daily_times)
        ]

        weather_code = current.get("weather_code", 0)
        return {
            "location": {"latitude": lat, "longitude": lon},
            "current": {
                "temperature": current.get("temperature_2m"),
                "feelsLike": current.get("apparent_temperature"),
                "humidity": current.get("relative_humidity_2m"),
                "windSpeed": current.get("wind_speed_10m"),
                "conditionCode": weather_code,
                "condition": _weather_condition_from_code(weather_code),
                "precipitation": current.get("precipitation", 0.0)
            },
            "hourly": formatted_hourly,
            "daily": formatted_daily
        }
    except Exception as e:
        logger.error(f"Weather API error: {str(e)}")
        return {
            "location": {"latitude": lat, "longitude": lon},
            "current": {
                "temperature": 28.0,
                "feelsLike": 30.0,
                "humidity": 75,
                "windSpeed": 12.0,
                "conditionCode": 1,
                "condition": "Partly cloudy",
                "precipitation": 0.0
            },
            "hourly": [],
            "daily": []
        }


@app.get("/news")
@app.get("/api/news")
def get_news_endpoint(
    location: str = None,
    city: str = None,
    district: str = None,
    state: str = None,
    category: str = None
):
    """Fetch real-time disaster, rainfall and water-level news bulletins with automatic fallback."""
    import os
    import requests
    from datetime import datetime, timezone

    news_api_key = os.getenv("NEWS_API_KEY")
    loc_label = city or district or location or (state if state else "India")
    now_iso = datetime.now(timezone.utc).isoformat()

    if news_api_key and news_api_key != "your_newsapi_key_here":
        try:
            query = '("flash flood" OR flood OR flooding OR "heavy rainfall" OR "extreme rainfall" OR cloudburst OR "river overflow" OR "water level" OR landslide)'
            loc_terms = [t for t in [city or location, district, state] if t]
            if loc_terms:
                query += f" AND ({' OR '.join(loc_terms)})"
            else:
                query += " AND India"

            url = f"https://newsapi.org/v2/everything?q={requests.utils.quote(query)}&sortBy=publishedAt&language=en&apiKey={news_api_key}"
            res = requests.get(url, timeout=8)
            if res.status_code == 200:
                data = res.json()
                articles = data.get("articles", [])
                formatted = []
                for a in articles:
                    title = a.get("title") or ""
                    if not title or title == "[Removed]":
                        continue
                    text = f"{title} {a.get('description') or ''}".lower()
                    cat = "FLOOD"
                    if "landslide" in text:
                        cat = "LANDSLIDE"
                    elif "dam" in text or "reservoir" in text:
                        cat = "DAM / RESERVOIR"
                    elif "river" in text:
                        cat = "RIVER / WATER LEVEL"
                    elif "rain" in text or "cloudburst" in text:
                        cat = "HEAVY RAINFALL"

                    formatted.append({
                        "id": a.get("url"),
                        "title": title,
                        "description": a.get("description"),
                        "source": (a.get("source") or {}).get("name") or "News Bureau",
                        "url": a.get("url") or "https://mausam.imd.gov.in/",
                        "publishedAt": a.get("publishedAt") or now_iso,
                        "score": 1.0,
                        "category": cat,
                        "location": loc_label
                    })

                if formatted:
                    return {"articles": formatted, "lastUpdated": now_iso}
        except Exception as e:
            logger.warning(f"NewsAPI fetch fallback triggered: {str(e)}")

    fallback_articles = [
        {
            "id": f"advisory-heavyrain-{loc_label}",
            "title": f"IMD Rainfall & Cloudburst Warning: Enhanced Precipitation Tracked near {loc_label}",
            "description": f"India Meteorological Department (IMD) radar monitors active convective storm bands over {loc_label} and adjoining hilly catchments. Intense spell alerts active.",
            "source": "IMD Weather Bureau",
            "url": "https://mausam.imd.gov.in/",
            "publishedAt": now_iso,
            "score": 1.0,
            "category": "HEAVY RAINFALL",
            "location": loc_label
        },
        {
            "id": f"advisory-flood-{loc_label}",
            "title": f"Flash Flood Vigilance & Urban Drainage Alert for {loc_label}",
            "description": f"High runoff rates reported across low-elevation sectors and downstream channels in {loc_label}. Rapid response disaster units placed on standby.",
            "source": "State Disaster Management Authority",
            "url": "https://ndma.gov.in/",
            "publishedAt": now_iso,
            "score": 0.95,
            "category": "FLASH FLOOD",
            "location": loc_label
        },
        {
            "id": f"advisory-river-{loc_label}",
            "title": f"Central Water Commission: Hydro-Discharge & River Gauging Update for {state or loc_label}",
            "description": f"Continuous monitoring of hydrological gauging stations and upstream barrages in {loc_label}. Basin runoff levels remain under 24x7 telemetry surveillance.",
            "source": "Central Water Commission (CWC)",
            "url": "https://cwc.gov.in/",
            "publishedAt": now_iso,
            "score": 0.9,
            "category": "RIVER / WATER LEVEL",
            "location": loc_label
        },
        {
            "id": f"advisory-dam-{loc_label}",
            "title": f"Reservoir Inflow & Barrage Outflow Regulation Advisory in {state or loc_label}",
            "description": f"Dam authorities maintain controlled water release and spillway monitoring across upstream reservoirs feeding the {loc_label} river basin.",
            "source": "National Dam Safety Authority",
            "url": "https://cwc.gov.in/",
            "publishedAt": now_iso,
            "score": 0.85,
            "category": "DAM / RESERVOIR",
            "location": loc_label
        },
        {
            "id": f"advisory-landslide-{loc_label}",
            "title": f"Geological Survey Slope Stability Advisory for Hilly Corridors near {loc_label}",
            "description": f"Soil saturation levels indicate elevated risk along steep road cuttings and vulnerable hill slopes. Commuters advised to monitor local traffic advisories.",
            "source": "Geological Survey of India",
            "url": "https://gsi.gov.in/",
            "publishedAt": now_iso,
            "score": 0.8,
            "category": "LANDSLIDE",
            "location": loc_label
        }
    ]
    return {"articles": fallback_articles, "lastUpdated": now_iso}

@app.get("/location/{state}/{district}")
@app.get("/api/location/{state}/{district}")
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
@app.get("/api/features/{state}/{district}")
def read_features(state: str, district: str):
    try:
        data = build_features(state, district)
        return data
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build features: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
@app.post("/api/predict", response_model=PredictionResponse)
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
@app.post("/api/predict/batch", response_model=BatchPredictionResponse)
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
@app.get("/evacuation/plan")
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
    try:
        body = await request.json()
    except Exception:
        body = {}

    scenario = body.get("scenario", "CLOUDBURST")
    user_state = body.get("state", "Himachal Pradesh")
    user_district = body.get("district", "Kullu")
    user_phone = body.get("phone")
    user_name = body.get("name", "Resident")

    if scenario == "RESET":
        REGIONAL_CACHE["isSimulated"] = False
        REGIONAL_CACHE["simulationScenario"] = None
        REGIONAL_CACHE["criticalAlert"] = None
        REGIONAL_CACHE["valleys"] = []
        get_threat_overview_data()
        return {"message": "Simulation reset. Restored baseline monitoring.", "threatCache": REGIONAL_CACHE}
    
    REGIONAL_CACHE["isSimulated"] = True
    REGIONAL_CACHE["simulationScenario"] = scenario
    
    valleys = REGIONAL_DATA.get("monitored_valleys", [])
    computed = []
    
    # Target district matching
    target_dist_clean = user_district.strip().lower()
    target_state_clean = user_state.strip().lower()
    
    matched_any = False
    for v in valleys:
        v_dist = v.get("district", "").strip().lower()
        v_state = v.get("state", "").strip().lower()
        
        if v_dist == target_dist_clean or (not matched_any and v.get("id") == "val_sainj" and target_dist_clean == "kullu"):
            matched_any = True
            computed.append({
                **v,
                "risk_score": 88.5,
                "risk_level": "CRITICAL",
                "lead_time_hours": 2.2,
                "current_rainfall_mm": 135.0,
                "rainfall_24h_mm": 245.0,
                "current_river_stage_m": 8.4,
                "is_above_danger": True
            })
        elif v_state == target_state_clean:
            computed.append({
                **v,
                "risk_score": 68.4,
                "risk_level": "HIGH",
                "lead_time_hours": 4.5,
                "current_rainfall_mm": 55.0,
                "rainfall_24h_mm": 120.0,
                "current_river_stage_m": 6.5,
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
            
    # If the user's district was not in the default pre-configured valley list, inject a dynamic node
    if not matched_any:
        computed.insert(0, {
            "id": f"val_sim_{target_dist_clean}",
            "name": f"{user_district} Deluge Center",
            "district": user_district,
            "state": user_state,
            "lat": 31.85,
            "lon": 77.25,
            "risk_score": 89.0,
            "risk_level": "CRITICAL",
            "lead_time_hours": 1.8,
            "current_rainfall_mm": 140.0,
            "rainfall_24h_mm": 260.0,
            "current_river_stage_m": 8.6,
            "is_above_danger": True
        })

    computed.sort(key=lambda x: x["risk_score"], reverse=True)
    REGIONAL_CACHE["valleys"] = computed
    
    critical_count = sum(1 for v in computed if v["risk_level"] == "CRITICAL")
    high_count = sum(1 for v in computed if v["risk_level"] == "HIGH")
    
    alert_title = f"🚨 FLASH FLOOD & CLOUDBURST ALERT: {user_district} ({user_state}) has reached CRITICAL risk (88.5/100)"
    alert_action = f"Intense cloudburst deluge (>135mm/hr). Immediate evacuation recommended for low-lying areas in {user_district}."
    
    REGIONAL_CACHE["criticalAlert"] = {
        "title": alert_title,
        "target": f"{user_district} Basin · {user_state} · Lead Time: 2.2h",
        "leadTime": "2.2 hrs",
        "action": alert_action
    }
    
    REGIONAL_CACHE["summary"] = {
        "totalMonitored": len(computed),
        "criticalCount": critical_count,
        "highCount": high_count,
        "moderateCount": 0,
        "lowCount": len(computed) - (critical_count + high_count),
        "minLeadTimeHours": 2.2,
        "status": "CRITICAL_SIMULATION"
    }

    # Dispatch Real-Time Alert ONLY when an authenticated user is logged in (saves SMS balance)
    alert_dispatches = []
    has_logged_in_user = bool(user_phone and str(user_phone).strip())

    if has_logged_in_user:
        try:
            from services.sms_service import send_sms
            from services.db_service import find_users_by_region
            
            alert_msg = f"🚨 [CRITICAL CLOUDBURST ALERT] Extreme rainfall (135mm/hr) detected in {user_district}, {user_state}! Flash flood risk is CRITICAL. Evacuate to Upper Safe Zones immediately!"
            
            # Send to the logged-in user
            try:
                res = send_sms(alert_msg, to=user_phone)
                alert_dispatches.append({"name": user_name, "phone": user_phone, "status": "sent", "ref": res})
                logger.info(f"Disaster simulation alert delivered to logged-in user {user_phone}")
            except Exception as e:
                logger.error(f"Failed to alert logged-in user {user_phone}: {e}")
                alert_dispatches.append({"name": user_name, "phone": user_phone, "status": "failed", "error": str(e)})

            # Also alert registered citizens in MongoDB for this district
            citizens = find_users_by_region(user_state, user_district)
            for c in citizens:
                c_phone = c.get("phone")
                c_name = c.get("name", "Resident")
                if c_phone and c_phone != user_phone:
                    try:
                        res = send_sms(alert_msg, to=c_phone)
                        alert_dispatches.append({"name": c_name, "phone": c_phone, "status": "sent", "ref": res})
                    except Exception as e:
                        logger.error(f"Failed to alert citizen {c_phone}: {e}")
                        
        except Exception as dispatch_err:
            logger.error(f"Alert dispatch failed during simulation: {dispatch_err}")
    else:
        logger.info("Simulation running in visual demo mode (No user logged in -> SMS skipped to save wallet credits)")

    return {
        "message": f"Cloudburst simulation active for {user_district}, {user_state}." + (" (Live SMS Dispatched)" if has_logged_in_user else " (Visual Demo Mode - Log in to receive SMS)"),
        "threatCache": REGIONAL_CACHE,
        "isLiveAlertDispatched": has_logged_in_user,
        "alertDispatches": alert_dispatches
    }



@app.post("/api/overview/sync")
@app.post("/overview/sync")
def sync_overview():
    return {"message": "Synced.", "threatCache": get_threat_overview_data()}

from services.routing_service import get_evacuation_routes
from api_models import EvacuationRouteRequest, EvacuationRouteResponse

@app.post("/api/evacuation/route", response_model=EvacuationRouteResponse)
@app.post("/evacuation/route", response_model=EvacuationRouteResponse)
def calculate_evacuation_route(req: EvacuationRouteRequest):
    try:
        route_data = get_evacuation_routes(
            start_lat=req.latitude,
            start_lon=req.longitude,
            state=req.state or "",
            district=req.district or "",
            mode=req.mode or "driving",
            target_shelter_index=req.target_shelter_index or 0
        )
        if not route_data:
            raise HTTPException(status_code=404, detail="No viable evacuation routes found for coordinates")
        return route_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evacuation routing failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate evacuation route: {str(e)}")


# ==============================================================================
# Emergency Operations Endpoints (Alerts, Shelters, Evacuation Status)
# ==============================================================================

@app.get("/api/alerts")
@app.get("/alerts")
def get_alerts():
    threats = get_threat_overview_data()
    critical_alert = threats.get("criticalAlert")
    alerts = []
    if critical_alert:
        alerts.append({
            "id": "alert-crit-1",
            "severity": "CRITICAL",
            "title": critical_alert.get("title", ""),
            "target": critical_alert.get("target", ""),
            "leadTime": critical_alert.get("leadTime", ""),
            "issuedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "ACTIVE"
        })
    return {"alerts": alerts}

@app.post("/api/alerts/{id}/acknowledge")
@app.post("/alerts/{id}/acknowledge")
def acknowledge_alert(id: str):
    return {"message": "Alert acknowledged", "id": id}

@app.get("/api/shelters")
@app.get("/shelters")
def get_shelters():
    return {
        "shelters": [
            {"id": "sh1", "name": "Govt Higher Secondary School", "capacity": 1500, "occupied": 840, "medical": True, "power": True, "lat": 31.8, "lon": 77.2},
            {"id": "sh2", "name": "Community Center Bhawan", "capacity": 800, "occupied": 120, "medical": False, "power": True, "lat": 31.75, "lon": 77.15}
        ]
    }

@app.get("/api/evacuation/{village_id}")
@app.get("/evacuation/{village_id}")
def get_evacuation_status(village_id: str):
    return {
        "villageId": village_id,
        "populationAtRisk": 2840,
        "evacuated": 840,
        "remaining": 2000,
        "status": "IN_PROGRESS",
        "safeZones": [
            {"id": "sz1", "name": "Upper Ridge Safe Zone", "lat": 31.85, "lon": 77.25}
        ]
    }


@app.get("/test-sms")
def test_sms():
    try:
        from services.sms_service import send_sms
        result = send_sms(
            "🚨 TEST ALERT: Flash Flood Prediction System is working."
        )
        return {"status": "sent", "channel_result": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to send alert: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Alert delivery failed: {str(e)}")


# ==============================================================================
# User Authentication & Regional Alert Dispatch (MongoDB Atlas)
# ==============================================================================

@app.post("/api/auth/register")
def register_user(req: UserRegisterRequest):
    """Register a citizen with name, phone, and region for targeted flood alerts."""
    try:
        from services.db_service import create_user
        user = create_user(
            name=req.name,
            email=req.email,
            phone=req.phone,
            password=req.password,
            state=req.state,
            district=req.district,
            role=req.role or "citizen",
            notification_channel=req.notification_channel or "sms"
        )
        safe_user = {k: v for k, v in user.items() if k != "password"}
        return {"status": "success", "message": "Registered successfully", "user": safe_user}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")


@app.post("/api/auth/login")
def login_user(req: UserLoginRequest):
    """Authenticate user with email and password (demo check)."""
    try:
        from services.db_service import authenticate_user
        user = authenticate_user(req.email, req.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return {"status": "success", "message": "Logged in successfully", "user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")


@app.get("/api/auth/users")
def list_users():
    """List registered users / citizens."""
    try:
        from services.db_service import get_all_users
        users = get_all_users()
        return {"users": users, "total": len(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/broadcast-region")
def broadcast_regional_alert(req: RegionalAlertRequest):
    """Broadcast an emergency flood alert to all registered citizens in a state & district."""
    try:
        from services.db_service import find_users_by_region
        from services.sms_service import send_sms

        citizens = find_users_by_region(req.state, req.district)
        if not citizens:
            return {
                "status": "ok",
                "message": f"No registered citizens found in {req.district}, {req.state}.",
                "dispatched_count": 0,
                "recipients": []
            }

        dispatched = []
        failures = []

        formatted_msg = f"🚨 [{req.severity}] FLOOD ALERT for {req.district}, {req.state}: {req.message}"

        for citizen in citizens:
            phone = citizen.get("phone")
            name = citizen.get("name", "Resident")
            if phone:
                try:
                    res = send_sms(formatted_msg, to=phone)
                    dispatched.append({"name": name, "phone": phone, "result": res})
                except Exception as err:
                    logger.error(f"Failed to send to {phone}: {str(err)}")
                    failures.append({"name": name, "phone": phone, "error": str(err)})

        return {
            "status": "success",
            "state": req.state,
            "district": req.district,
            "total_citizens_in_region": len(citizens),
            "dispatched_count": len(dispatched),
            "dispatched": dispatched,
            "failures": failures
        }
    except Exception as e:
        logger.error(f"Regional broadcast error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Broadcast failed: {str(e)}")


@app.post("/chat")
@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """
    Multilingual AI Assistant for flood safety, helpline info, and emergency protocols.
    Powered by Groq LPU with automatic offline fallback.
    """
    try:
        from services.chatbot_service import generate_chat_response
        history_dicts = [{"role": m.role, "content": m.content} for m in (req.history or [])]
        res = generate_chat_response(
            message=req.message,
            language=req.language or "en",
            history=history_dicts,
            user_district=req.district
        )
        return res
    except Exception as e:
        logger.error(f"Chatbot endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
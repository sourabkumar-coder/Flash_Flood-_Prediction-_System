from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class LocationRequest(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LocationModel(BaseModel):
    state: str
    district: str
    village: Optional[str] = None
    latitude: float
    longitude: float

class TerrainModel(BaseModel):
    hilly_region: bool
    elevation_m: Optional[float]
    slope_percent: Optional[float]
    max_slope_percent: Optional[float]
    relief_m: Optional[float]

class WeatherModel(BaseModel):
    temperature_c: Optional[float]
    humidity_percent: Optional[float]
    rainfall_mm: Optional[float]
    rainfall_1h_mm: Optional[float]
    rainfall_3h_mm: Optional[float]
    rainfall_6h_mm: Optional[float]
    rainfall_24h_mm: Optional[float]

class HydrologyTimeSeriesModel(BaseModel):
    dates: List[str] = []
    discharge: List[Optional[float]] = []
    mean: List[Optional[float]] = []
    max: List[Optional[float]] = []
    min: List[Optional[float]] = []
    p25: List[Optional[float]] = []
    p75: List[Optional[float]] = []

class HydrologyModel(BaseModel):
    river_discharge: Optional[float] = None
    discharge_mean: Optional[float] = None
    discharge_max: Optional[float] = None
    discharge_min: Optional[float] = None
    discharge_p25: Optional[float] = None
    discharge_p75: Optional[float] = None
    discharge_max_7d: Optional[float] = None
    discharge_avg_7d: Optional[float] = None
    discharge_forecast_7d: Optional[List[Optional[float]]] = None
    water_level: Optional[float] = None
    water_level_status: Optional[str] = None
    status: Optional[str] = None
    station: Optional[str] = None
    discharge_source: Optional[str] = None
    model_name: Optional[str] = None
    distance_km: Optional[float] = None
    reason: Optional[str] = None
    time_series: Optional[HydrologyTimeSeriesModel] = None

class SoilModel(BaseModel):
    clay_percent: Optional[float]
    sand_percent: Optional[float]
    silt_percent: Optional[float]

class HistoricalModel(BaseModel):
    flood_events: Optional[int]
    flood_years: Optional[int]
    fatalities: Optional[int]
    displaced: Optional[int]
    max_severity: Optional[float]
    max_impact: Optional[float]

class IoTModel(BaseModel):
    status: str
    soil_moisture_percent: Optional[float]
    localized_rainfall_mm_hr: Optional[float]
    slope_tilt_mm: Optional[float]
    last_updated: str

class LandslideModel(BaseModel):
    risk_score: float
    risk_level: str

class EvacuationModel(BaseModel):
    lead_time_hours: Optional[float]
    status: str

class PredictionDetailsModel(BaseModel):
    susceptibility_percent: float
    risk_score: float
    risk_level: str

class PredictionResponse(BaseModel):
    location: LocationModel
    terrain: TerrainModel
    weather: WeatherModel
    hydrology: HydrologyModel
    soil: SoilModel
    historical: HistoricalModel
    iot: IoTModel
    landslide: LandslideModel
    evacuation: EvacuationModel
    prediction: PredictionDetailsModel

class BatchPredictionRequest(BaseModel):
    locations: List[LocationRequest]

class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    errors: List[Dict[str, Any]]

# ==============================================================================
# Dynamic Safest Evacuation Route Models (OSRM + OSM + SRTM)
# ==============================================================================

class EvacuationRouteRequest(BaseModel):
    latitude: float
    longitude: float
    state: Optional[str] = ""
    district: Optional[str] = ""
    mode: Optional[str] = "driving"
    target_shelter_index: Optional[int] = 0

class ShelterModel(BaseModel):
    name: str
    type: str
    latitude: float
    longitude: float
    distance_km: float
    capacity: Optional[str] = None
    elevation_gain_m: Optional[float] = None

class RouteStepModel(BaseModel):
    step: int
    instruction: str
    street_name: str
    distance_m: int
    duration_s: int
    is_safe: bool = True

class SafeRouteDetails(BaseModel):
    distance_km: float
    duration_min: int
    elevation_gain_m: float
    geometry: Dict[str, Any]
    hazard_level: str
    steps: List[RouteStepModel]

class DisruptedRouteDetails(BaseModel):
    distance_km: float
    duration_min: int
    geometry: Dict[str, Any]
    hazard_type: str
    hazard_reason: str
    block_point: Optional[Dict[str, Any]] = None

class EvacuationRouteResponse(BaseModel):
    origin: Dict[str, Any]
    shelter: ShelterModel
    alternative_shelters: List[ShelterModel] = []
    mode: str
    elevation_gain_m: float
    safe_route: SafeRouteDetails
    disrupted_route: Optional[DisruptedRouteDetails] = None
    emergency_helpline: Dict[str, str]


# ==============================================================================
# Auth & Regional Alert Models
# ==============================================================================

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    state: str = "Himachal Pradesh"
    district: str = "Kullu"
    role: Optional[str] = "citizen"
    notification_channel: Optional[str] = "sms"


class UserLoginRequest(BaseModel):
    email: str
    password: str


class RegionalAlertRequest(BaseModel):
    state: str
    district: str
    message: str
    severity: Optional[str] = "CRITICAL"



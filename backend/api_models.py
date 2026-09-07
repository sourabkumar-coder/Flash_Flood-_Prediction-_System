from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class LocationRequest(BaseModel):
    state: str
    district: str
    village: Optional[str] = None

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

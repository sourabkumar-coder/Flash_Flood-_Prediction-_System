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

class HydrologyModel(BaseModel):
    river_discharge: Optional[float]
    water_level: Optional[float]
    status: Optional[str]
    station: Optional[str]
    distance_km: Optional[float]

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

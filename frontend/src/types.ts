export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface SHAPFactor {
  feature_key: string;
  feature_name: string;
  feature_value: number;
  shap_impact: number;
  impact_direction: 'INCREASES_RISK' | 'DECREASES_RISK';
}

export interface VillageProperties {
  id: string;
  name: string;
  district: string;
  elevation_m: number;
  slope_deg: number;
  twi: number;
  dist_to_river_m: number;
  catchment_area_km2: number;
  drainage_density_km_km2: number;
  scs_curve_number: number;
  population: number;
  danger_stage_m: number;
  warning_stage_m: number;
  risk_score: number;
  risk_level: RiskLevel;
  lead_time_hrs: number;
  probability: number;
  confidence_pct: number;
  features?: Record<string, number>;
  last_updated?: number;
}

export interface VillageFeature {
  type: 'Feature';
  id: string;
  properties: VillageProperties;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface VillageGeoJSON {
  type: 'FeatureCollection';
  features: VillageFeature[];
}

export interface IoTSensor {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  elevation_m: number;
  village_id: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  battery_pct: number;
  solar_charging: boolean;
  sampling_rate_sec: number;
  last_ping_seconds_ago: number;
  sensors_active: string[];
  current_stage_m: number;
  rain_rate_mm_h: number;
  soil_moisture_pct: number;
}

export interface EvacuationQueueItem {
  village_id: string;
  village_name: string;
  district: string;
  population: number;
  vulnerable_population: number;
  risk_score: number;
  risk_level: RiskLevel;
  lead_time_hrs: number;
  priority_score: number;
  urgency: string;
  shelter_id: string;
  shelter_name: string;
  shelter_capacity: number;
  shelter_elevation_m: number;
  medical_post: boolean;
  safe_route_notes: string;
}

export interface Shelter {
  id: string;
  name: string;
  village_id: string;
  lat: number;
  lon: number;
  elevation_m: number;
  capacity_people: number;
  current_occupancy: number;
  medical_post: boolean;
  helipad_nearby: boolean;
  water_food_days: number;
  status: string;
}

export interface BridgeStatus {
  id: string;
  name: string;
  nearest_village: string;
  clearance_m: number;
  status: string;
}

export interface EvacuationPlanResponse {
  total_vulnerable_population: number;
  ndrf_teams_deployed_estimate: number;
  inflatable_rescue_boats_needed: number;
  priority_queue: EvacuationQueueItem[];
  shelters: Shelter[];
  bridges_infrastructure: BridgeStatus[];
}

export interface AlertItem {
  id: string;
  timestamp: string;
  village_id: string;
  village_name: string;
  district: string;
  severity: RiskLevel;
  risk_score: number;
  lead_time_hrs: number;
  message: string;
}

export interface ModelMetrics {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  f2_score: number;
  roc_auc: number;
  pr_auc: number;
  confusion_matrix: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
  false_negative_rate: number;
}

export interface ModelBenchmarkResponse {
  primary_model: string;
  validation_strategy: string;
  optimization_criterion: string;
  models: Record<string, ModelMetrics>;
  feature_importances: Record<string, number>;
}

export interface LiveFeedPayload {
  timestamp: number;
  mode: string;
  demo_step: number;
  demo_active: boolean;
  sensors: IoTSensor[];
  alerts: AlertItem[];
  villages_summary: Array<{
    id: string;
    name: string;
    risk_score: number;
    risk_level: RiskLevel;
    lead_time_hrs: number;
    rain_1h: number;
    river_stage: number;
    soil_moisture: number;
  }>;
}

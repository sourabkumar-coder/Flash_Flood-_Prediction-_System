"""
Real-time IoT Sensor Mesh Simulator & Hydrological State Engine
Simulates virtual ESP32 sensor grid, multi-stage disaster flows, what-if counterfactuals,
and sensor fault states (ONLINE, DEGRADED, OFFLINE).
"""

import time
import asyncio
import numpy as np
from typing import Dict, List, Any
from backend.app.core.data_fixtures import VILLAGE_GEOJSON, IOT_STATIONS, HISTORICAL_EVENTS
from backend.app.services.ml_engine import ml_engine

class IoTSimulator:
    def __init__(self):
        self.mode = "NORMAL"  # "NORMAL", "DISASTER_DEMO", "WHAT_IF", "HISTORICAL_REPLAY"
        self.demo_step = 0
        self.demo_max_steps = 10
        self.demo_active = False
        self.demo_task = None
        
        # Historical replay state
        self.replay_event_id = None
        self.replay_frame = 0
        self.replay_max_frames = 12

        # What-If custom parameters
        self.what_if_params = {
            "rainfall_intensity_mm_h": 45.0,
            "soil_presaturation_pct": 65.0,
            "upstream_dam_inflow_cusecs": 25000.0,
            "cloudburst_duration_hrs": 3.0
        }

        # Initialize sensor states
        self.sensors: List[Dict[str, Any]] = []
        self._init_sensors()

        # Initialize village hydro state
        self.village_states: Dict[str, Dict[str, Any]] = {}
        self._init_village_states()

        # Alert history log
        self.alerts: List[Dict[str, Any]] = []

    def _init_sensors(self):
        self.sensors = [dict(s) for s in IOT_STATIONS]
        for s in self.sensors:
            s["current_stage_m"] = 1.8 + np.random.uniform(-0.2, 0.2)
            s["rain_rate_mm_h"] = round(float(np.random.exponential(1.5)), 1)
            s["soil_moisture_pct"] = round(float(35.0 + np.random.uniform(0, 10)), 1)
            s["battery_pct"] = s.get("battery_pct", 90)
            s["status"] = s.get("status", "ONLINE")

    def _init_village_states(self):
        for feat in VILLAGE_GEOJSON["features"]:
            p = feat["properties"]
            v_id = p["id"]
            
            # Base features matching Master Dataset Schema
            feats = {
                "rainfall_1d": 28.0,
                "rainfall_3d": 45.0,
                "rainfall_6d": 72.0,
                "rainfall_24h": 28.0,
                "rainfall_intensity": 4.5,
                "soil_moisture": 38.0,
                "river_level": 1.9,
                "elevation": p.get("elevation", p.get("elevation_m", 1200)),
                "slope": p.get("slope", p.get("slope_deg", 25.0)),
                "aspect": p.get("aspect", 150.0),
                "flow_accumulation": p.get("flow_accumulation", p.get("catchment_area_km2", 800.0)),
                "distance_to_river": p.get("distance_to_river", p.get("dist_to_river_m", 35)),
                "historical_flood_frequency": p.get("historical_flood_frequency", 5),
                "forecast_rainfall": 12.0,
                "land_use": p.get("land_use", "Urban Settlement"),
                # UI / Legacy aliases
                "rain_accum_1h": 2.5,
                "rain_accum_3h": 7.0,
                "rain_accum_6h": 14.5,
                "rain_accum_24h": 28.0,
                "rain_intensity_max_1h": 4.5,
                "soil_moisture_pct": 38.0,
                "river_water_level_m": 1.9,
                "danger_stage_m": p.get("danger_stage_m", 5.0)
            }
            
            # Run initial prediction
            pred = ml_engine.predict_single(feats)

            self.village_states[v_id] = {
                "id": v_id,
                "name": p["name"],
                "district": p["district"],
                "population": p["population"],
                "danger_stage_m": p["danger_stage_m"],
                "warning_stage_m": p["warning_stage_m"],
                "features": feats,
                "prediction": pred,
                "last_updated": time.time()
            }

    def update_normal_tick(self):
        """Simulates small natural jitter and diurnal hydrologic fluctuations."""
        for v_id, v_data in self.village_states.items():
            f = v_data["features"]
            
            # Gentle stochastic variations
            f["rain_accum_1h"] = max(0.0, round(float(f["rain_accum_1h"] + np.random.normal(0, 0.2)), 2))
            f["rain_accum_3h"] = max(0.0, round(float(f["rain_accum_3h"] + np.random.normal(0, 0.4)), 2))
            f["river_water_level_m"] = max(1.2, round(float(f["river_water_level_m"] + np.random.normal(0, 0.02)), 2))
            f["soil_moisture_pct"] = max(15.0, min(95.0, round(float(f["soil_moisture_pct"] + np.random.normal(0, 0.1)), 1)))
            f["soil_saturation_ratio"] = round(f["soil_moisture_pct"] / 100.0, 3)

            # Re-predict
            v_data["prediction"] = ml_engine.predict_single(f)
            v_data["last_updated"] = time.time()

        # Update sensor values
        for s in self.sensors:
            v_id = s["village_id"]
            if v_id in self.village_states:
                st = self.village_states[v_id]
                s["current_stage_m"] = st["features"]["river_water_level_m"]
                s["rain_rate_mm_h"] = st["features"]["rain_accum_1h"]
                s["soil_moisture_pct"] = st["features"]["soil_moisture_pct"]
                s["last_ping_seconds_ago"] = max(1, s["last_ping_seconds_ago"] % 3 + 1)

    def start_disaster_demo(self):
        """Triggers the full multi-stage SIH disaster simulation."""
        self.mode = "DISASTER_DEMO"
        self.demo_step = 0
        self.demo_active = True
        self.alerts.clear()
        print("[IoTSimulator] Disaster Simulation Triggered!")
        return {"status": "DISASTER_SIMULATION_STARTED", "total_steps": self.demo_max_steps}

    def step_disaster_demo(self):
        """Advances the disaster simulation by one step."""
        if not self.demo_active:
            return

        self.demo_step += 1
        step = self.demo_step

        # Stage 1: Cloudburst onset in Upper Basin (Manali, Naggar, Bhuntar)
        # Stage 2: Heavy infiltration, AMC-III saturation, stage starts climbing
        # Stage 3: Upstream floodwave surges past Larji Gorge & Thalout
        # Stage 4: Critical flood stage reaches Pandoh Dam & Mandi Urban
        # Stage 5: Peak catastrophic discharge (>120,000 cusecs)
        # Stage 6+: Recession phase

        intensity_curve = {
            1: {"rain": 45.0, "soil_gain": 15.0, "stage_mult": 1.25, "desc": "Extreme cloudburst reported over Solang & Manali ridgelines (45 mm/hr)"},
            2: {"rain": 85.0, "soil_gain": 30.0, "stage_mult": 1.65, "desc": "Soil saturation exceeds 85% (AMC-III); massive surface runoff generated"},
            3: {"rain": 115.0, "soil_gain": 42.0, "stage_mult": 2.20, "desc": "River Beas crosses Warning Level at Bhuntar & Larji; upstream surge delta +2.8m"},
            4: {"rain": 125.0, "soil_gain": 50.0, "stage_mult": 2.85, "desc": "CRITICAL FLASH FLOOD ALARM: Beas breached Danger Mark (6.8m) at Thalout & Pandoh"},
            5: {"rain": 95.0, "soil_gain": 52.0, "stage_mult": 3.10, "desc": "Peak Flood Crest reaching Mandi Urban; Suketi Khad backflow flooding low-lying wards"},
            6: {"rain": 60.0, "soil_gain": 48.0, "stage_mult": 2.70, "desc": "Rainfall recedes; hydrograph crest passing downstream towards Pong Reservoir"},
            7: {"rain": 25.0, "soil_gain": 40.0, "stage_mult": 2.20, "desc": "Recession limb active; river water level dropping at Manali & Kullu"},
            8: {"rain": 10.0, "soil_gain": 30.0, "stage_mult": 1.70, "desc": "Post-flood stabilization; search, rescue, and shelter relief operations active"},
            9: {"rain": 4.0, "soil_gain": 18.0, "stage_mult": 1.30, "desc": "Water levels normalising below warning mark basin-wide"},
            10: {"rain": 1.5, "soil_gain": 5.0, "stage_mult": 1.05, "desc": "Simulation Completed. Basin hydrograph returned to safe baseline."}
        }

        stage_info = intensity_curve.get(step, intensity_curve[10])
        rain_val = stage_info["rain"]
        soil_add = stage_info["soil_gain"]
        stage_factor = stage_info["stage_mult"]

        for v_id, v_data in self.village_states.items():
            f = v_data["features"]
            # Altitude / catchment spatial weighting
            spatial_lag = 1.2 if v_id in ["VIL_001", "VIL_002", "VIL_003"] else (1.4 if step >= 3 else 0.8)
            
            rain_1h = round(rain_val * spatial_lag * (0.8 + np.random.uniform(0, 0.3)), 1)
            f["rain_accum_1h"] = rain_1h
            f["rain_accum_3h"] = round(rain_1h * 2.4, 1)
            f["rain_accum_6h"] = round(f["rain_accum_3h"] * 1.6, 1)
            f["rain_accum_24h"] = round(f["rain_accum_6h"] * 1.8, 1)
            f["rain_intensity_max_1h"] = round(rain_1h * 1.1, 1)
            
            # Master dataset schema sync
            f["rainfall_intensity"] = f["rain_intensity_max_1h"]
            f["rainfall_24h"] = f["rain_accum_24h"]
            f["rainfall_1d"] = f["rain_accum_24h"]
            f["rainfall_3d"] = round(f["rainfall_1d"] * 2.2, 1)
            f["rainfall_6d"] = round(f["rainfall_3d"] * 1.7, 1)
            f["forecast_rainfall"] = round(max(5.0, 75.0 - step * 7.0), 1)

            f["soil_moisture_pct"] = round(min(98.0, 35.0 + soil_add * spatial_lag), 1)
            f["soil_moisture"] = f["soil_moisture_pct"]

            base_stg = 1.8
            f["river_water_level_m"] = round(min(v_data["danger_stage_m"] * 1.25, base_stg * stage_factor * spatial_lag), 2)
            f["river_level"] = f["river_water_level_m"]

            # Re-predict with ML & SHAP
            v_data["prediction"] = ml_engine.predict_single(f)
            v_data["last_updated"] = time.time()

            # Generate Alert if High/Critical
            if v_data["prediction"]["risk_level"] in ["HIGH", "CRITICAL"]:
                alert_entry = {
                    "id": f"ALT_{int(time.time())}_{v_id}",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "village_id": v_id,
                    "village_name": v_data["name"],
                    "district": v_data["district"],
                    "severity": v_data["prediction"]["risk_level"],
                    "risk_score": v_data["prediction"]["risk_score"],
                    "lead_time_hrs": v_data["prediction"]["lead_time_hrs"],
                    "message": f"FLASH FLOOD WARNING: {v_data['name']} has reached {v_data['prediction']['risk_level']} risk ({v_data['prediction']['risk_score']}/100). Evacuate low-lying riverbanks immediately. Estimated lead time: {v_data['prediction']['lead_time_hrs']} hrs."
                }
                # Prevent duplicate recent alerts
                if not any(a["village_id"] == v_id and a["severity"] == alert_entry["severity"] for a in self.alerts[-5:]):
                    self.alerts.append(alert_entry)

        # Update sensors
        for s in self.sensors:
            v_id = s["village_id"]
            if v_id in self.village_states:
                st = self.village_states[v_id]
                s["current_stage_m"] = st["features"]["river_water_level_m"]
                s["rain_rate_mm_h"] = st["features"]["rain_accum_1h"]
                s["soil_moisture_pct"] = st["features"]["soil_moisture_pct"]

        if step >= self.demo_max_steps:
            self.demo_active = False

        return {
            "step": step,
            "max_steps": self.demo_max_steps,
            "stage_description": stage_info["desc"],
            "demo_active": self.demo_active
        }

    def execute_what_if(self, params: dict):
        """Runs counterfactual what-if disaster simulation with user sliders."""
        self.mode = "WHAT_IF"
        self.what_if_params.update(params)
        
        rain_in = float(self.what_if_params.get("rainfall_intensity_mm_h", 50.0))
        soil_in = float(self.what_if_params.get("soil_presaturation_pct", 70.0))
        dam_in = float(self.what_if_params.get("upstream_dam_inflow_cusecs", 30000.0))

        for v_id, v_data in self.village_states.items():
            f = v_data["features"]
            f["rain_accum_1h"] = round(rain_in * (0.9 + np.random.uniform(0, 0.2)), 1)
            f["rain_accum_3h"] = round(rain_in * 2.5, 1)
            f["rain_accum_6h"] = round(f["rain_accum_3h"] * 1.5, 1)
            f["rain_accum_24h"] = round(f["rain_accum_6h"] * 1.8, 1)
            f["rain_intensity_max_1h"] = round(rain_in * 1.15, 1)
            
            # Master dataset schema sync
            f["rainfall_intensity"] = f["rain_intensity_max_1h"]
            f["rainfall_24h"] = f["rain_accum_24h"]
            f["rainfall_1d"] = f["rain_accum_24h"]
            f["rainfall_3d"] = round(f["rainfall_1d"] * 2.2, 1)
            f["rainfall_6d"] = round(f["rainfall_3d"] * 1.7, 1)
            f["forecast_rainfall"] = round(rain_in * 0.8, 1)

            f["soil_moisture_pct"] = round(min(98.5, soil_in), 1)
            f["soil_moisture"] = f["soil_moisture_pct"]

            # Hydraulic stage surge based on dam inflow and rain
            dam_stage_boost = (dam_in / 40000.0) * 2.2
            rain_stage_boost = (rain_in / 80.0) * 2.5
            f["river_water_level_m"] = round(1.8 + dam_stage_boost + rain_stage_boost, 2)
            f["river_level"] = f["river_water_level_m"]

            v_data["prediction"] = ml_engine.predict_single(f)
            v_data["last_updated"] = time.time()

        # Update sensors
        for s in self.sensors:
            v_id = s["village_id"]
            if v_id in self.village_states:
                st = self.village_states[v_id]
                s["current_stage_m"] = st["features"]["river_water_level_m"]
                s["rain_rate_mm_h"] = st["features"]["rain_accum_1h"]
                s["soil_moisture_pct"] = st["features"]["soil_moisture_pct"]

        return {
            "status": "WHAT_IF_APPLIED",
            "params": self.what_if_params,
            "villages_impacted": sum(1 for v in self.village_states.values() if v["prediction"]["risk_level"] in ["HIGH", "CRITICAL"])
        }

    def reset_to_normal(self):
        """Resets all simulation parameters back to calm monsoon baseline."""
        self.mode = "NORMAL"
        self.demo_step = 0
        self.demo_active = False
        self._init_sensors()
        self._init_village_states()
        self.alerts.clear()
        return {"status": "RESET_COMPLETE"}

    def set_sensor_status(self, sensor_id: str, status: str):
        """Simulates sensor fault injection (ONLINE, DEGRADED, OFFLINE)."""
        for s in self.sensors:
            if s["id"] == sensor_id:
                s["status"] = status
                return {"sensor_id": sensor_id, "new_status": status}
        return {"error": "Sensor not found"}

# Global singleton
iot_simulator = IoTSimulator()

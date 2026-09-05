"""ML inference engine for the real-data AegisHydro model.

The preferred artifact is the real retrospective classifier trained from IMD
historical rainfall + India Flood Inventory labels. Risk score is the model
probability expressed on a 0-100 scale. Lead time is an explicit heuristic
because the available historical daily labels cannot support a scientifically
valid hourly lead-time regressor.
"""
from __future__ import annotations
import os
import json
import joblib
import numpy as np
import pandas as pd
import shap

class MLEngine:
    def __init__(self):
        self.model_dir = "backend/app/models"
        self.classifier = None
        self.feature_cols = []
        self.feature_metadata = {}
        self.benchmark_metrics = {}
        self.explainer = None
        self.is_loaded = False
        self.load_models()

    def load_models(self):
        clf_path = os.path.join(self.model_dir, "best_flood_classifier.joblib")
        meta_path = os.path.join(self.model_dir, "feature_metadata.json")
        bench_path = os.path.join(self.model_dir, "benchmark_metrics.json")
        if not (os.path.exists(clf_path) and os.path.exists(meta_path)):
            print("[MLEngine] Real model artifacts not found. Run the real training pipeline.")
            return
        try:
            self.classifier = joblib.load(clf_path)
            with open(meta_path, encoding="utf-8") as f:
                self.feature_metadata = json.load(f)
            self.feature_cols = self.feature_metadata.get("features", [])
            if os.path.exists(bench_path):
                with open(bench_path, encoding="utf-8") as f:
                    self.benchmark_metrics = json.load(f)
            self.explainer = shap.TreeExplainer(self.classifier)
            self.is_loaded = True
            print("[MLEngine] Real-data flood classifier + SHAP loaded.")
        except Exception as e:
            print(f"[MLEngine] Error loading model: {e}")
            self.is_loaded = False

    def _prepare_vector(self, features: dict) -> list[float]:
        aliases = {
            "rainfall_1d": ["rainfall_1d", "rain_accum_24h"],
            "rainfall_3d": ["rainfall_3d", "rain_accum_3h"],
            "rainfall_7d": ["rainfall_7d", "rain_accum_6h"],
            "rainfall_intensity_proxy": ["rainfall_intensity_proxy", "rainfall_intensity", "rain_intensity_max_1h"],
            "soil_moisture_proxy": ["soil_moisture_proxy", "soil_moisture", "soil_moisture_pct"],
            "elevation": ["elevation", "elevation_m"],
            "slope": ["slope", "slope_deg"],
            "aspect": ["aspect", "aspect_deg"],
            "flow_accumulation": ["flow_accumulation", "catchment_area_km2"],
            "distance_to_river": ["distance_to_river", "dist_to_river_m"],
            "historical_flood_frequency": ["historical_flood_frequency"],
            "forecast_rainfall_proxy": ["forecast_rainfall_proxy", "forecast_rainfall", "forecast_rain_next_6h"],
            "land_use_code": ["land_use_code"],
        }
        vector = []
        for col in self.feature_cols:
            val = None
            for key in aliases.get(col, [col]):
                if features.get(key) is not None:
                    val = features[key]
                    break
            if val is None:
                # Legacy string land use gets a stable code for the new model.
                if col == "land_use_code":
                    val = {"Urban Settlement": 1, "Riverbed Floodplain": 2,
                           "Steepland Scrub": 3, "Terraced Agriculture": 4,
                           "Dense Forest": 5}.get(str(features.get("land_use", "Urban Settlement")), 0)
                else:
                    val = 0.0
            vector.append(float(val))
        return vector

    @staticmethod
    def _lead_time(prob: float, features: dict) -> tuple[float, str]:
        # Conservative prototype estimate. This is not a trained hourly model.
        rain = float(features.get("rainfall_intensity", features.get("rain_intensity_max_1h", 0)) or 0)
        if prob >= 0.85 or rain >= 50:
            return 1.0, "LOW"
        if prob >= 0.60 or rain >= 30:
            return 2.0, "LOW"
        if prob >= 0.35 or rain >= 15:
            return 4.0, "MEDIUM"
        return 12.0, "MEDIUM"

    def predict_single(self, features: dict):
        if not self.is_loaded:
            self.load_models()
        if not self.is_loaded:
            return self._heuristic_fallback(features)

        vector = self._prepare_vector(features)
        frame = pd.DataFrame([vector], columns=self.feature_cols)
        prob = float(self.classifier.predict_proba(frame)[0, 1])
        risk = float(np.clip(prob * 100.0, 0, 100))
        if risk >= 75: level = "CRITICAL"
        elif risk >= 50: level = "HIGH"
        elif risk >= 25: level = "MODERATE"
        else: level = "LOW"
        lead, lead_conf = self._lead_time(prob, features)

        shap_factors = []
        try:
            vals = self.explainer.shap_values(frame)
            if isinstance(vals, list): vals = vals[-1][0]
            elif getattr(vals, "ndim", 0) == 3: vals = vals[0, :, -1]
            else: vals = vals[0]
            friendly = {
                "rainfall_1d": "24h rainfall (mm)",
                "rainfall_3d": "3-day rainfall (mm)",
                "rainfall_7d": "7-day rainfall (mm)",
                "rainfall_intensity_proxy": "Daily rainfall / intensity proxy",
                "soil_moisture_proxy": "Rainfall-derived soil wetness proxy",
                "elevation": "Elevation (m)", "slope": "Slope (deg)",
                "aspect": "Aspect (deg)", "flow_accumulation": "Catchment area proxy",
                "distance_to_river": "Distance to river (m)",
                "historical_flood_frequency": "Historical flood frequency",
                "forecast_rainfall_proxy": "Short-horizon rainfall proxy",
                "land_use_code": "Land-use class",
            }
            rows = []
            for col, val, sv in zip(self.feature_cols, vector, vals):
                rows.append({"feature_key": col, "feature_name": friendly.get(col, col),
                             "feature_value": round(float(val), 3), "shap_impact": round(float(sv), 4),
                             "impact_direction": "INCREASES_RISK" if sv > 0 else "DECREASES_RISK"})
            rows.sort(key=lambda x: abs(x["shap_impact"]), reverse=True)
            shap_factors = rows[:6]
        except Exception as e:
            print(f"[MLEngine] SHAP warning: {e}")

        return {
            "probability": round(prob, 4),
            "risk_score": round(risk, 1),
            "risk_level": level,
            "lead_time_hrs": lead,
            "lead_time_confidence": lead_conf,
            "confidence_pct": round(50 + abs(prob - 0.5) * 100, 1),
            "shap_factors": shap_factors,
            "model_type": self.feature_metadata.get("model_type", "unknown")
        }

    def _heuristic_fallback(self, f):
        rain = float(f.get("rainfall_24h", f.get("rain_accum_24h", 0)) or 0)
        soil = float(f.get("soil_moisture", f.get("soil_moisture_pct", 30)) or 30)
        risk = float(np.clip(0.65 * min(rain / 100, 1) + 0.35 * min(soil / 100, 1), 0, 1) * 100)
        level = "CRITICAL" if risk >= 75 else ("HIGH" if risk >= 50 else ("MODERATE" if risk >= 25 else "LOW"))
        return {"probability": round(risk/100, 3), "risk_score": round(risk, 1),
                "risk_level": level, "lead_time_hrs": 12.0, "lead_time_confidence": "LOW",
                "confidence_pct": 50.0, "shap_factors": [], "model_type": "heuristic_fallback"}

ml_engine = MLEngine()

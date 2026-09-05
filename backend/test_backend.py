"""
Verification test script for AegisHydro Backend & ML Engine
"""

import sys
import os
sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from backend.app.main import app

def test_api():
    client = TestClient(app)
    
    # Root
    r = client.get("/")
    assert r.status_code == 200
    assert "AegisHydro" in r.json()["system"]
    print("[OK] Root endpoint OK")

    # Region
    r = client.get("/api/v1/regions/current")
    assert r.status_code == 200
    assert r.json()["region"]["id"] == "REG_HP_BEAS_01"
    print("[OK] Region endpoint OK")

    # Villages GeoJSON
    r = client.get("/api/v1/villages")
    assert r.status_code == 200
    data = r.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 10
    print(f"[OK] Villages endpoint OK ({len(data['features'])} wards)")

    # Sensors
    r = client.get("/api/v1/sensors")
    assert r.status_code == 200
    assert r.json()["count"] >= 8
    print(f"[OK] Sensors endpoint OK ({r.json()['count']} stations)")

    # SHAP Explainability
    r = client.get("/api/v1/risk/explain/VIL_001")
    assert r.status_code == 200
    shap_data = r.json()
    assert "shap_factors" in shap_data
    assert len(shap_data["shap_factors"]) > 0
    print(f"[OK] SHAP explainability OK (Top factor: {shap_data['shap_factors'][0]['feature_name']})")

    # Evacuation Plan
    r = client.get("/api/v1/evacuation/plan")
    assert r.status_code == 200
    assert len(r.json()["priority_queue"]) == 10
    print("[OK] Evacuation plan OK")

    # Model Benchmark
    r = client.get("/api/v1/models/benchmark")
    assert r.status_code == 200
    bench = r.json()
    assert "LightGBM" in bench["models"]
    assert "Random Forest" in bench["models"]
    print(f"[OK] Model benchmark OK (LightGBM F2: {bench['models']['LightGBM']['f2_score']})")

    # What-If test
    r = client.post("/api/v1/simulation/what-if", json={
        "rainfall_intensity_mm_h": 120.0,
        "soil_presaturation_pct": 95.0,
        "upstream_dam_inflow_cusecs": 50000.0,
        "cloudburst_duration_hrs": 4.0
    })
    assert r.status_code == 200
    print("[OK] What-If simulation execution OK")

    # Reset
    r = client.post("/api/v1/simulation/reset")
    assert r.status_code == 200
    print("[OK] Simulation reset OK")

    print("\n[ALL BACKEND & ML TESTS PASSED!]")

if __name__ == "__main__":
    test_api()

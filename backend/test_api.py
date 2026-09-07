from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_states():
    response = client.get("/states")
    assert response.status_code == 200
    data = response.json()
    assert "states" in data
    assert len(data["states"]) > 0

def test_get_districts():
    response = client.get("/districts/Himachal Pradesh")
    assert response.status_code == 200
    data = response.json()
    assert "districts" in data
    assert "Kullu" in data["districts"]

def test_get_location():
    response = client.get("/location/Himachal Pradesh/Kullu")
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "Himachal Pradesh"
    assert data["district"] == "Kullu"
    assert "latitude" in data
    assert "longitude" in data

def test_get_districts_not_found():
    response = client.get("/districts/UnknownState")
    assert response.status_code == 404

def test_features_contract():
    response = client.get("/features/Himachal Pradesh/Kullu")
    assert response.status_code == 200
    data = response.json()
    assert "coordinates" in data
    assert "terrain" in data
    assert "weather" in data
    assert "hydrology" in data
    assert "soil" in data
    assert "historical" in data
    assert "prediction" not in data


def test_predict_kullu_contract():
    response = client.post("/predict", json={"state": "Himachal Pradesh", "district": "Kullu"})
    assert response.status_code == 200
    data = response.json()
    assert set(["location", "terrain", "weather", "hydrology", "soil", "historical", "prediction", "iot", "landslide", "evacuation"]).issubset(data.keys())
    assert set(["risk_score", "risk_level", "susceptibility_percent"]).issubset(data["prediction"].keys())
    assert data["prediction"]["risk_level"] in {"LOW", "MODERATE", "HIGH", "CRITICAL"}
    
def test_predict_village_contract():
    response = client.post("/predict", json={"state": "Himachal Pradesh", "district": "Kullu", "village": "Rampur Basti"})
    assert response.status_code == 200
    data = response.json()
    assert data["location"]["village"] == "Rampur Basti"
    assert data["iot"]["status"] == "LIVE"

def test_villages_endpoint():
    response = client.get("/villages/Kullu")
    assert response.status_code == 200
    assert "villages" in response.json()
    assert len(response.json()["villages"]) > 0


def test_predict_multiple_districts():
    for state, district in [("Himachal Pradesh", "Kullu"), ("Uttarakhand", "Dehradun"), ("Bihar", "Araria")]:
        response = client.post("/predict", json={"state": state, "district": district})
        assert response.status_code == 200, (state, district, response.text)

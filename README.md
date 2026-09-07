# 🌊 Flash Flood Prediction & Early Warning System

An intelligent, multi-source **Flash Flood Early Warning System & Disaster Management Dashboard** designed to deliver hyper-local, real-time flood risk assessments across India.

---

## 📌 Key Features

* **🌐 Multi-Source Real-Time Ingestion:**
  * **Open-Meteo Weather API:** Real-time precipitation, temperature, relative humidity, and dynamic rainfall accumulations ($1\text{h}, 3\text{h}, 6\text{h}, 24\text{h}$).
  * **Open-Meteo GloFAS v4 Seamless Flood API:** Real-time hydrological simulations combining 1984+ historical data with 30-day ensemble forecasts (Daily Discharge, Ensemble Mean, Maximum, Minimum, 25th Percentile, and 75th Percentile).
  * **Open-Meteo Digital Elevation (SRTM):** Dynamic 25-point sample grid across district bounds computing mean elevation, relief, and slope percentage/degrees.
  * **ISRIC SoilGrids REST API:** Quantitative soil texture composition ($\text{Clay}\%$, $\text{Sand}\%$, $\text{Silt}\%$) and dominant soil classification.
  * **Dartmouth Flood Observatory (DFO):** Historical flood disaster inventory, severity index, fatalities, and displacement records.
* **⚡ Machine Learning Susceptibility Modeling:**
  * Pre-trained **XGBoost Classifier Pipeline** combining categorical encoders and numeric scalers.
  * Multi-factor **Weighted Risk Engine** factoring weather intensity, terrain steepness, river discharge surge, and historical exposure.
* **📊 Modern Interactive UI / Dashboard:**
  * **Interactive Geospatial Map:** Leaflet map with colored risk boundaries and coordinate markers.
  * **GloFAS v4 River Discharge Chart:** Multi-series SVG time-series visualizer with interactive legends, percentile uncertainty bands ($\text{p25}\text{--}\text{p75}$), timeline boundary markers (Past vs. Forecast), and hover tooltips.
  * **Rainfall Accumulation Visualizer:** Clean bar graph tracking rapid precipitation spikes.

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │       React / Vite Dashboard (UI)       │
                               └────────────────────┬────────────────────┘
                                                    │ REST API
                               ┌────────────────────▼────────────────────┐
                               │          FastAPI Backend Engine         │
                               └────────────────────┬────────────────────┘
                                                    │
         ┌──────────────────┬───────────────────────┼──────────────────────┬──────────────────┐
         │                  │                       │                      │                  │
┌────────▼────────┐ ┌───────▼────────┐      ┌───────▼────────┐     ┌───────▼────────┐ ┌───────▼────────┐
│  Open-Meteo     │ │  Open-Meteo    │      │  Open-Meteo    │     │ ISRIC          │ │ DFO Historical │
│  Forecast API   │ │  GloFAS v4     │      │  Elevation     │     │ SoilGrids      │ │ Flood Archive  │
│  (Precipitation)│ │  (Discharge)   │      │  (Slope/Relief)│     │ (Clay/Sand/Silt│ │ (Disaster DB)  │
└─────────────────┘ └────────────────┘      └────────────────┘     └────────────────┘ └────────────────┘
         │                  │                       │                      │                  │
         └──────────────────┴───────────────────────┼──────────────────────┴──────────────────┘
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │   Feature Pipeline (feature_service)    │
                               └────────────────────┬────────────────────┘
                                                    │
                         ┌──────────────────────────┴──────────────────────────┐
                         │                                                     │
              ┌──────────▼──────────┐                               ┌──────────▼──────────┐
              │  XGBoost Classifier │                               │ Multi-Factor Risk   │
              │  (Susceptibility %) │                               │ Engine (Heuristics) │
              └──────────┬──────────┘                               └──────────┬──────────┘
                         │                                                     │
                         └──────────────────────────┬──────────────────────────┘
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │  Risk Level: LOW / MODERATE / HIGH /    │
                               │  CRITICAL & Actionable Evacuation Alert │
                               └─────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Installation

### 1. Prerequisites
* **Python:** `3.10` or higher
* **Node.js:** `18.0` or higher & `npm`

---

### 2. Backend Setup

```bash
# 1. Clone or navigate to the repository
cd Flash_Flood-_Prediction-_System

# 2. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the FastAPI backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

* 📖 **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* 🩺 **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Frontend Setup

```bash
# In a new terminal window:
cd Flash_Flood-_Prediction-_System/frontend

# 1. Install dependencies
npm install

# 2. Start the Vite development server
npm run dev
```

* 🌐 **Open Dashboard:** [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to customize settings:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `HOST` | `0.0.0.0` | Backend bind address |
| `PORT` | `8000` | Backend server port |
| `ENVIRONMENT` | `development` | Environment mode (`development` / `production`) |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL for frontend |
| `BHUVAN_LULC_TOKEN` | *(Optional)* | ISRO Bhuvan LULC API token |

---

## 📡 REST API Reference

### `GET /health`
Verifies backend service health.
```json
{ "status": "ok" }
```

### `GET /states`
Returns all 36 Indian states and Union Territories.

### `GET /districts/{state}`
Returns all districts available in the given state.

### `POST /predict`
Performs multi-source environmental assessment and returns flood risk prediction.
* **Request Body:**
  ```json
  {
    "state": "Andhra Pradesh",
    "district": "Alluri Sitharama Raju",
    "village": null
  }
  ```
* **Response Structure:**
  * `location`: State, District, Latitude, Longitude.
  * `weather`: Temperature (°C), Humidity (%), Rainfall (1h, 3h, 6h, 24h).
  * `terrain`: Mean Elevation (m), Relief (m), Slope (%), Hilly region flag.
  * `hydrology`: GloFAS v4 River Discharge (m³/s), Ensemble Mean, Max, Min, 25th %ile, 75th %ile, Estimated Water Level (m), and full 60-day `time_series`.
  * `soil`: Clay%, Sand%, Silt%, dominant soil texture.
  * `historical`: Flood events, fatalities, displaced population, max severity.
  * `prediction`: Susceptibility %, Composite Risk Score (0–100), Risk Level (`LOW` / `MODERATE` / `HIGH` / `CRITICAL`), and human-readable explanation.

---

## 🧪 Testing

Run automated tests from the `backend` directory:
```bash
pytest
```

---

## 📁 Project Directory Structure

```
Flash_Flood-_Prediction-_System/
├── backend/
│   ├── main.py                     # FastAPI application & route controllers
│   ├── api_models.py               # Pydantic schemas & response models
│   └── services/
│       ├── district_service.py     # District geocoding & centroid index
│       ├── weather_service.py      # Open-Meteo precipitation & weather API
│       ├── flood_api_service.py    # Open-Meteo GloFAS v4 Seamless flood service
│       ├── unified_hydrology_service.py # Hydrology aggregator & rating curve
│       ├── terrain_service.py      # SRTM elevation & slope grid sampling
│       ├── soil_service.py         # ISRIC SoilGrids texture service
│       ├── feature_service.py      # Multi-source pipeline orchestrator
│       ├── prediction_service.py   # Feature builder & XGBoost predictor
│       └── risk_engine.py          # Composite risk scoring engine
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main disaster dashboard view
│   │   ├── App.css                 # Dark-mode styling & layout
│   │   └── components/
│   │       ├── GloFASChart.jsx     # GloFAS v4 discharge time-series visualizer
│   │       └── MapComponent.jsx    # Leaflet geospatial risk map
│   └── package.json
├── ml/
│   ├── models/
│   │   └── xgboost_flood_model.pkl # Trained XGBoost classifier
│   └── train.py                    # Model training script
├── data/                           # District indexes & historical records
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
├── requirements.txt                # Pinned Python dependencies
└── README.md                       # Documentation
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).

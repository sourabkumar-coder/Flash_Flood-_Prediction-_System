# 🌊 Flash Flood Early Warning System & Regional GIS Command Center
### *AEGISHYDRO SIH EDITION — Himalayan & North-East River Basins Threat Matrix*

An intelligent, multi-tier **Flash Flood Early Warning System, Regional Macro GIS Command Center, and Hyper-Local ML Risk Engine** designed to deliver near-real-time flood risk assessments across India, with specialized hydrological intelligence for the Himalayas and North-East river basins.

---

## 📌 Key Capabilities

### 1. 🛰️ Regional GIS Command Center (North-East & Hilly Basins)
* **Interactive Macro Leaflet GIS Map:**
  * Displays 5 major Himalayan & North-East river basins (**Upper & Middle Beas**, **Alaknanda & Upper Ganga**, **Teesta Basin**, **Brahmaputra Valley**, **Barak & Meghalaya Basins**).
  * 22 real-time river gauge nodes with dynamic water stage badges (`2.3m`, `4.5m`, `7.8m`) and color-coded alert stages (Normal, Warning, Danger).
  * 22 monitored vulnerable valleys/wards across Himachal Pradesh, Uttarakhand, Sikkim, Assam, and Meghalaya.
* **⚡ Live Wards Threat Monitor Sidebar:**
  * Real-time ranked list of catchment areas sorted by composite flash-flood threat index.
  * Filter by severity pills: `ALL`, `CRITICAL`, `HIGH`, `MODERATE`, `LOW`.
  * Instant search by valley, district, or state.
  * One-click "🎯 Focus Map" and "🔬 Analyze District" actions.
* **🚨 Disaster Simulation Lab:**
  * Toggle **Cloudburst Simulation Mode** to simulate an extreme Himalayan monsoon deluge (e.g. Sainj Valley / Kullu cloudburst scenario), triggering real-time gauge surges and siren alert banners.
  * One-click reset to restore live synoptic weather streams.
* **🛡️ Rate-Limit Shield (Express Gateway):**
  * Batches all 22 checkpoint coordinates into a single Open-Meteo API query every 15 minutes.
  * Serves cached synoptic telemetry instantaneously to concurrent users with 0 risk of API rate limiting.

### 2. 📊 Hyper-Local District Analytics & ML Engine
* **📍 GPS Auto-Detection:**
  * One-click browser geolocation (`Use Current Location (GPS)`) with high-accuracy GPS coordinates and automated reverse geocoding to State & District.
* **🌊 Open-Meteo GloFAS v4 Seamless Hydrology:**
  * 60-day interactive river discharge hydrograph (30 days hindcast + 30 days ensemble forecast).
  * Multi-series SVG chart with ensemble mean, maximum, minimum, and 25th–75th percentile uncertainty envelopes.
* **🏔️ Digital Elevation & Slope Relief (SRTM):**
  * Dynamic 25-point sample grid across district bounds computing mean elevation, relief, and slope percentage/degrees.
* **🌱 ISRIC SoilGrids Infiltration:**
  * Quantitative soil texture composition ($\text{Clay}\%$, $\text{Sand}\%$, $\text{Silt}\%$) and dominant soil classification.
* **📜 Historical Disaster Inventory (1950–2024):**
  * Historical flood disaster archive, severity indices, fatalities, and displacement records.
* **🤖 XGBoost ML Susceptibility Pipeline:**
  * Machine learning susceptibility scoring paired with hydrological physics heuristics for actionable evacuation lead times (`⏱ 1.5h - 12.0h`).

---

## 🏗️ System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │      React 19 / Vite GIS Dashboard (UI)      │
                                  │   (GIS Command Center & District Analytics)  │
                                  └──────────────────────┬───────────────────────┘
                                                         │ REST (Port 5173 -> 5000 / 8000)
                                  ┌──────────────────────▼───────────────────────┐
                                  │       Node.js Express Gateway (Port 5000)    │
                                  │  • 15-min Batched Open-Meteo Weather Cache   │
                                  │  • Regional Threat Matrix & Basin Geometries │
                                  │  • Disaster Simulation Lab (Cloudburst)      │
                                  └──────────────────────┬───────────────────────┘
                                                         │ Proxy /predict & data
                                  ┌──────────────────────▼───────────────────────┐
                                  │       Python FastAPI Engine (Port 8000)      │
                                  │  • XGBoost ML Susceptibility Pipeline        │
                                  │  • GloFAS v4 60-Day Hydrograph Engine        │
                                  │  • SRTM Terrain & SoilGrids Infiltration     │
                                  └──────────────────────┬───────────────────────┘
                                                         │
          ┌──────────────────┬───────────────────────────┼──────────────────────────┬──────────────────┐
          │                  │                           │                          │                  │
 ┌────────▼────────┐ ┌───────▼────────┐         ┌────────▼────────┐        ┌────────▼────────┐ ┌───────▼────────┐
 │  Open-Meteo     │ │  Open-Meteo    │         │  Open-Meteo     │        │ ISRIC           │ │ Historical DFO │
 │  Weather API    │ │  GloFAS v4     │         │  SRTM Elevation │        │ SoilGrids       │ │ Flood Archive  │
 │  (Precipitation)│ │  (Discharge)   │         │  (Slope/Relief) │        │ (Clay/Sand/Silt)│ │ (Disaster DB)  │
 └─────────────────┘ └────────────────┘         └─────────────────┘        └─────────────────┘ └────────────────┘
```

---

## 🚀 Quickstart & Installation

### 1. Prerequisites
* **Python:** `3.10` or higher
* **Node.js:** `18.0` or higher & `npm`

---

### 2. Start Python FastAPI Backend (Port 8000)

```bash
# Navigate to repository root
cd Flash_Flood-_Prediction-_System

# Activate Python virtual environment
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies if needed
pip install -r requirements.txt

# Start FastAPI server
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
* 📖 **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* 🩺 **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### 3. Start Node.js Express Gateway (Port 5000)

In a new terminal:
```bash
cd Flash_Flood-_Prediction-_System/gateway
npm install
node server.js
```
* 🩺 **Gateway Health Check:** [http://localhost:5000/health](http://localhost:5000/health)
* 🌊 **Regional Threats API:** [http://localhost:5000/api/overview/threats](http://localhost:5000/api/overview/threats)
* 🗺️ **Basin Rivers & Gauges API:** [http://localhost:5000/api/overview/rivers](http://localhost:5000/api/overview/rivers)

---

### 4. Start React Frontend (Port 5173)

In a third terminal:
```bash
cd Flash_Flood-_Prediction-_System/frontend
npm install
npm run dev
```
* 🌐 **Dashboard:** [http://localhost:5173](http://localhost:5173)

---

## 📁 Repository Structure

```
Flash_Flood-_Prediction-_System/
├── backend/                        # Python FastAPI ML & Hydrology Engine
│   ├── main.py                     # FastAPI application endpoints
│   ├── model/                      # Trained XGBoost classifier & scalers
│   └── services/                   # Modular microservices
│       ├── feature_service.py      # Unified multi-source pipeline
│       ├── weather_service.py      # Open-Meteo precipitation ingest
│       ├── open_meteo_service.py   # GloFAS v4 60-day river hydrographs
│       ├── terrain_service.py      # SRTM 90m slope & relief engine
│       ├── soil_service.py         # ISRIC SoilGrids texture composition
│       ├── historical_service.py   # DFO historical flood archive
│       └── district_service.py     # Reverse-geocoding & centroid resolver
├── gateway/                        # Node.js Express API Gateway & Aggregator
│   ├── package.json                # Express, Axios, Node-cron, Cors
│   └── server.js                   # Batched 15m synoptic cache & simulation lab
├── data/                           # Regional datasets
│   ├── regional_hilly_basins.json  # 5 Basins, 22 gauges, 22 monitored valleys
│   ├── district_coordinates.json   # 700+ Indian district coordinates
│   └── Indian_villages.json        # Village & ward mapping
├── frontend/                       # React 19 + Vite Dark GIS Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandCenter.jsx   # Regional GIS Leaflet Command Center
│   │   │   ├── GloFASChart.jsx     # Interactive 60-day river hydrograph
│   │   │   └── MapComponent.jsx    # District geospatial map
│   │   ├── App.jsx                 # View controller & drilldown handler
│   │   └── App.css                 # Dark Command Center styling
│   └── package.json
├── .env.example                    # Environment configuration template
├── requirements.txt                # Python dependencies
└── README.md                       # Documentation
```

---

## 🛡️ License
Built for Disaster Resilience and Early Warning Intelligence.

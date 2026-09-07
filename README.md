# Flash Flood Prediction System for Hilly Regions of India

A real-time, multi-source flash flood early warning and disaster-management dashboard designed specifically for hilly terrains across India.

## Overview
This system provides real-time risk analysis by integrating data from:
- District Boundaries (GeoJSON)
- Live Weather (Open-Meteo)
- Hydrology/Telemetry (NWIC/CWC)
- Terrain & Elevation (SRTM / Elevation Services)
- Soil Characteristics (ISRIC SoilGrids)
- Historical Flood Inventories (DFO)

The system **automatically** determines whether a region is hilly based on real elevation and slope data. It does not rely on user input or hardcoded states. 

> **Important**: The current ML model is a historical susceptibility baseline (trained on DFO flood events), *not* a fully validated operational forecasting model. The final risk score is an aggregate of this baseline combined with real-time environmental conditions.

## Architecture

The architecture separates the frontend dashboard from a FastAPI backend. It is designed to easily integrate a future landslide model.

```
Frontend (React/Vite)
    | REST API
FastAPI Backend (main.py)
    +── District Service
    +── Weather Service
    +── Terrain Service
    +── Soil Service
    +── Hydrology Service
    +── Historical Flood Service
    +── Feature Service
    +── Prediction Service -> Final Risk Engine
    |
ML Susceptibility Model (Historical Baseline)
```

## Setup Instructions

### 1. Backend Setup
The backend is built with Python and FastAPI.

```bash
cd backend
# Optional: create a virtual environment
# python -m venv venv
# source venv/bin/activate (or venv\Scripts\activate on Windows)

pip install fastapi uvicorn pydantic cachetools pandas joblib scikit-learn shapely pyproj
```

**Run the backend server:**
```bash
uvicorn main:app --reload
```
The API documentation will be available at: http://localhost:8000/docs

### 2. Frontend Setup
The frontend is a React application built with Vite.

```bash
cd frontend
npm install
```

**Run the frontend server:**
```bash
npm run dev
```
The application will usually run at http://localhost:5173.

### Environment Variables
For production or custom deployment, set the `VITE_API_BASE_URL` in the frontend `.env` file:
```
VITE_API_BASE_URL=http://your-backend-domain.com
```
In the backend, if you have specific API tokens for services (like Bhuvan), set them in `backend/.env`.

## Limitations & Real-time Data Handling
- **Hydrology Freshness**: Telemetry data from river stations can often be stale or unavailable. The system actively checks the timestamp and tags data as `LIVE` or `STALE`. Risk calculations explicitly reduce confidence when data is stale to avoid false alarms.
- **API Rate Limits**: The backend caches static terrain/soil features and briefly caches dynamic weather features (10 minutes) to prevent hammering external APIs. Do NOT attempt to run historical weather ingestion scripts en masse without considering rate limits.
- **Landslide Readiness**: The backend prediction response separates `terrain`, `weather`, and `soil` to allow a future landslide model to seamlessly consume the same features.

## Testing
Run unit tests for the API and services from the `backend` directory:
```bash
pytest test_api.py
```

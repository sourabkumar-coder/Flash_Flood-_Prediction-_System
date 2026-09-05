# AegisHydro: Production-Quality Flash Flood Early Warning & Decision-Support System (SIH Edition)

> **Pilot Region**: Upper & Middle Beas River Basin, Himachal Pradesh (Kullu & Mandi Districts)  
> **Target**: Predict Flash Flood Occurrence & Surge Probability within a **3–6 Hour Lead-Time Window** at Ward/Village Level  
> **Disclaimer**: *This system is a prototype AI decision-support platform designed to assist emergency response operations and does not claim to replace official state/national disaster management authorities (NDMA/SDMA).*

---

## 🌟 Key Features

1. **2.5D GIS Threat Command Center**:
   - High-contrast dark topographic GIS map of the Upper & Middle Beas Basin.
   - Dynamic polygon risk overlays (Green $\rightarrow$ Yellow $\rightarrow$ Orange $\rightarrow$ Pulsing Crimson Red).
   - Dynamic river vector hydro-flows and live ultrasonic sensor stage bubbles.
2. **Real-time Explainable AI (TreeSHAP)**:
   - Live feature contribution breakdown for every ward/village.
   - Identifies exact marginal drivers ($+28\%$ 3h rainfall intensity, $+19\%$ river stage surge, $+14\%$ AMC-III soil saturation).
   - Hydrological Antecedent Moisture Condition (AMC-I, II, III) diagnostics.
3. **IoT Sensor Mesh Network Monitor**:
   - Virtual ESP32 microcontrollers streaming live stage ($m$), rain rate ($mm/h$), and dielectric soil moisture ($0-100\%$).
   - Sensor health telemetry (`ONLINE`, `DEGRADED`, `OFFLINE`), solar charging, and battery tracking.
   - **Interactive Fault Injection**: Test degraded/offline sensor resilience directly from the UI.
4. **Evacuation Decision-Support Hub**:
   - Multi-criteria evacuation priority ranking:
     $$P = \frac{\text{Risk}^{1.4} \times \text{Population}}{\text{Lead Time} \times 1200}$$
   - Real-time road bridge inundation monitoring (Victoria Bridge, Aut Tunnel causeway, etc.).
   - High-ground relief camp capacity and resource requirement calculators (NDRF battalions, rescue boats).
5. **"What-If" Counterfactual Disaster Simulation Lab**:
   - Interactive sliders for Cloudburst Rainfall ($0-150\text{ mm/h}$), Soil Pre-saturation ($0-100\%$), Upstream Dam Inflow ($0-60,000\text{ cusecs}$), and Duration ($1-8\text{ hrs}$).
   - Instant downstream risk propagation.
6. **Machine Learning Model Benchmark & Historical Flood Replay**:
   - Benchmarking **Random Forest**, **XGBoost**, and **LightGBM** on time-based validation splits.
   - False-Negative penalized loss ($F_2$-score optimization).
   - Frame-by-frame replay of the historic **July 9–11, 2023 Beas Flash Flood Disaster**.
7. **One-Click "START DISASTER SIMULATION" Demo**:
   - Multi-stage automated storm cascade demonstrating cloudburst onset $\rightarrow$ soil saturation $\rightarrow$ stage surge $\rightarrow$ critical alert broadcast $\rightarrow$ SHAP reasons $\rightarrow$ evacuation priority queue.

---

## ⚙️ Tech Stack & Machine Learning Architecture

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Leaflet GIS, Recharts, Lucide Icons, Vite
- **Backend**: FastAPI (Python 3.13), Uvicorn, Pydantic v2, WebSockets
- **Machine Learning**: LightGBM, XGBoost, Scikit-Learn, SHAP TreeExplainer, Pandas, NumPy
- **Optimization Strategy**: Optimized strictly for CPU & 16GB RAM. Sub-second inference latency ($<15\text{ms}$ per ward).

---

## 🚀 How to Run Locally

### 1. Start the Backend API (FastAPI)
```powershell
cd scratch/aegis-hydro
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Start the Frontend Dashboard (React + Vite)
```powershell
cd scratch/aegis-hydro/frontend
npm run dev
```
Open your browser at: [http://127.0.0.1:5173](http://127.0.0.1:5173)

### 3. Run Automated Tests
```powershell
cd scratch/aegis-hydro
python backend/test_backend.py
```

"""
FastAPI Application Entrypoint with Real-Time WebSocket Broadcaster for AegisHydro
"""

import asyncio
import json
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.endpoints import router as api_router
from backend.app.services.iot_simulator import iot_simulator
from backend.app.services.evacuation_engine import evacuation_engine

# Active WebSocket connections pool
active_connections: list[WebSocket] = []

async def simulation_loop():
    """Background loop that ticks IoT simulation and broadcasts real-time feed over WebSockets."""
    while True:
        try:
            if iot_simulator.mode == "NORMAL":
                iot_simulator.update_normal_tick()
            elif iot_simulator.mode == "DISASTER_DEMO" and iot_simulator.demo_active:
                iot_simulator.step_disaster_demo()

            # Prepare broadcast payload
            payload = {
                "timestamp": time.time(),
                "mode": iot_simulator.mode,
                "demo_step": iot_simulator.demo_step,
                "demo_active": iot_simulator.demo_active,
                "sensors": iot_simulator.sensors,
                "alerts": iot_simulator.alerts[-5:],
                "villages_summary": [
                    {
                        "id": v_id,
                        "name": v_data["name"],
                        "risk_score": v_data["prediction"]["risk_score"],
                        "risk_level": v_data["prediction"]["risk_level"],
                        "lead_time_hrs": v_data["prediction"]["lead_time_hrs"],
                        "rain_1h": v_data["features"]["rain_accum_1h"],
                        "river_stage": v_data["features"]["river_water_level_m"],
                        "soil_moisture": v_data["features"]["soil_moisture_pct"]
                    }
                    for v_id, v_data in iot_simulator.village_states.items()
                ]
            }

            # Broadcast to all connected clients
            disconnected = []
            for ws in active_connections:
                try:
                    await ws.send_text(json.dumps(payload))
                except Exception:
                    disconnected.append(ws)

            for ws in disconnected:
                if ws in active_connections:
                    active_connections.remove(ws)

        except Exception as e:
            print(f"[SimulationLoop] Error: {e}")

        await asyncio.sleep(1.8)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    sim_task = asyncio.create_task(simulation_loop())
    print("[AegisHydro Backend] Real-time engine started.")
    yield
    # Shutdown
    sim_task.cancel()
    print("[AegisHydro Backend] Real-time engine stopped.")

app = FastAPI(
    title="AegisHydro Early Warning & Disaster Decision Support API",
    description="Multi-Source Flash Flood Prediction & Early Warning System for Hilly Regions (SIH Edition)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root_status():
    return {
        "system": "AegisHydro Flash Flood Decision Support System",
        "status": "OPERATIONAL",
        "pilot_region": "Upper & Middle Beas River Basin (Kullu & Mandi, HP)",
        "disclaimer": "This is a prototype decision-support system and does not claim to replace official state/national disaster management authorities (NDMA/SDMA)."
    }

@app.websocket("/ws/live-feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep connection alive & accept incoming client commands
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                if cmd.get("action") == "START_DEMO":
                    iot_simulator.start_disaster_demo()
                elif cmd.get("action") == "RESET":
                    iot_simulator.reset_to_normal()
            except Exception:
                pass
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)

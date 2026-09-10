import express from 'express';
import cors from 'cors';
import axios from 'axios';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = process.env.GATEWAY_PORT || 5000;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Load regional hilly basin dataset
const DATA_PATH = path.resolve(__dirname, '../data/regional_hilly_basins.json');
let regionalData = { basins: [], monitored_valleys: [] };

try {
  if (fs.existsSync(DATA_PATH)) {
    regionalData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log(`[Gateway] Loaded ${regionalData.basins.length} river basins & ${regionalData.monitored_valleys.length} monitored valleys.`);
  }
} catch (err) {
  console.error('[Gateway] Failed to load regional basin data:', err.message);
}

// In-Memory Regional Threat Cache
let threatCache = {
  lastSync: null,
  isSimulated: false,
  simulationScenario: null,
  criticalAlert: null,
  valleys: [],
  summary: {
    totalMonitored: 0,
    criticalCount: 0,
    highCount: 0,
    moderateCount: 0,
    lowCount: 0,
    minLeadTimeHours: 12.0,
    status: 'NORMAL_BASELINE'
  }
};

/**
 * Batch-fetch live weather for all regional valley checkpoints in 1 API call
 */
async function syncRegionalThreats() {
  if (threatCache.isSimulated) {
    console.log('[Gateway] Simulation active, skipping automatic live weather sync.');
    return;
  }

  const valleys = regionalData.monitored_valleys || [];
  if (valleys.length === 0) return;

  console.log(`[Gateway] Performing batched multi-coordinate weather sync for ${valleys.length} checkpoints...`);

  try {
    const lats = valleys.map(v => v.lat.toFixed(4)).join(',');
    const lons = valleys.map(v => v.lon.toFixed(4)).join(',');

    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,rain&hourly=precipitation&past_hours=24&forecast_hours=1&timezone=auto`;

    const response = await axios.get(openMeteoUrl, { timeout: 15000 });
    const weatherList = Array.isArray(response.data) ? response.data : [response.data];

    let criticalCount = 0;
    let highCount = 0;
    let moderateCount = 0;
    let lowCount = 0;

    const computedValleys = valleys.map((valley, index) => {
      const w = weatherList[index] || {};
      const current = w.current || {};
      const hourly = w.hourly || {};

      const currentRain = Number(current.precipitation ?? current.rain ?? 0);
      const rainSeries = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];
      const past24hRain = rainSeries.slice(0, 24).reduce((acc, val) => acc + (Number(val) || 0), 0);

      // Multi-factor Threat Score Calculation
      let threatScore = valley.base_risk + (past24hRain * 0.45) + (currentRain * 1.5) + ((valley.slope_deg / 45) * 6);
      threatScore = Math.min(100, Math.max(5, Math.round(threatScore * 10) / 10));

      // Unified Risk Thresholds matching backend risk_engine.py
      let riskLevel = 'LOW';
      let leadTimeHours = 12.0;

      if (threatScore >= 75) {
        riskLevel = 'CRITICAL';
        leadTimeHours = 3.5;
        criticalCount++;
      } else if (threatScore >= 55) {
        riskLevel = 'HIGH';
        leadTimeHours = 6.0;
        highCount++;
      } else if (threatScore >= 30) {
        riskLevel = 'MODERATE';
        leadTimeHours = 9.0;
        moderateCount++;
      } else {
        riskLevel = 'LOW';
        lowCount++;
      }

      const simulatedRiverStage = Math.round((2.0 + (threatScore / 100) * (valley.danger_stage_m - 1.5)) * 10) / 10;

      return {
        ...valley,
        current_rainfall_mm: currentRain,
        rainfall_24h_mm: Math.round(past24hRain * 10) / 10,
        temperature_c: current.temperature_2m ?? 18,
        humidity_percent: current.relative_humidity_2m ?? 70,
        risk_score: threatScore,
        risk_level: riskLevel,
        lead_time_hours: leadTimeHours,
        current_river_stage_m: simulatedRiverStage,
        is_above_danger: simulatedRiverStage >= valley.danger_stage_m
      };
    });

    computedValleys.sort((a, b) => b.risk_score - a.risk_score);

    threatCache = {
      lastSync: new Date().toISOString(),
      isSimulated: false,
      simulationScenario: null,
      criticalAlert: criticalCount > 0 ? {
        title: `FLASH FLOOD WARNING: ${computedValleys[0].name} has reached CRITICAL risk (${computedValleys[0].risk_score}/100)`,
        target: `${computedValleys[0].name} (${computedValleys[0].district} Dist.)`,
        leadTime: `${computedValleys[0].lead_time_hours} hrs`,
        action: 'Evacuate low-lying riverbanks immediately. Activate SDRF emergency teams.'
      } : null,
      valleys: computedValleys,
      summary: {
        totalMonitored: computedValleys.length,
        criticalCount,
        highCount,
        moderateCount,
        lowCount,
        minLeadTimeHours: criticalCount > 0 ? 3.5 : (highCount > 0 ? 6.0 : 12.0),
        status: criticalCount > 0 ? 'CRITICAL_ALERT' : (highCount > 0 ? 'ELEVATED_WATCH' : 'NORMAL_BASELINE')
      }
    };

    console.log(`[Gateway] Sync complete. Status: ${threatCache.summary.status} (Critical: ${criticalCount}, High: ${highCount})`);
  } catch (err) {
    console.error('[Gateway] Failed to batch-sync Open-Meteo weather:', err.message);
    if (threatCache.valleys.length === 0) {
      threatCache.valleys = valleys.map(v => {
        const score = v.base_risk;
        let riskLevel = 'LOW';
        if (score >= 75) riskLevel = 'CRITICAL';
        else if (score >= 55) riskLevel = 'HIGH';
        else if (score >= 30) riskLevel = 'MODERATE';

        return {
          ...v,
          risk_score: score,
          risk_level: riskLevel,
          lead_time_hours: 12.0,
          current_rainfall_mm: 0.0,
          rainfall_24h_mm: 0.0,
          current_river_stage_m: 2.2,
          is_above_danger: false
        };
      });
      threatCache.lastSync = new Date().toISOString();
    }
  }
}

// Initial sync on server start & recurring cron every 15 minutes
syncRegionalThreats();
cron.schedule('*/15 * * * *', () => {
  console.log('[Gateway Cron] Triggering scheduled 15-min regional weather update...');
  syncRegionalThreats();
});

// ==============================================================================
// REST ENDPOINTS
// ==============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Flash Flood Express Gateway', fastapi: FASTAPI_URL });
});

app.get('/api/overview/threats', (req, res) => {
  res.json(threatCache);
});

app.get('/api/overview/rivers', (req, res) => {
  const basins = (regionalData.basins || []).map(b => {
    const updatedGauges = (b.gauge_nodes || []).map(g => {
      let stage = g.base_level;
      if (threatCache.isSimulated && threatCache.simulationScenario === 'CLOUDBURST_SAINJ' && b.id === 'beas_basin') {
        stage = Math.round((g.danger_level + 1.2) * 10) / 10;
      }
      return {
        ...g,
        current_stage_m: stage,
        is_danger: stage >= g.danger_level
      };
    });

    return {
      ...b,
      gauge_nodes: updatedGauges
    };
  });

  res.json({ basins });
});

app.post('/api/overview/simulate', (req, res) => {
  const { scenario } = req.body;

  if (scenario === 'RESET') {
    threatCache.isSimulated = false;
    threatCache.simulationScenario = null;
    syncRegionalThreats();
    return res.json({ message: 'Simulation reset. Restored live synoptic streams.', threatCache });
  }

  threatCache.isSimulated = true;
  threatCache.simulationScenario = 'CLOUDBURST_SAINJ';
  threatCache.lastSync = new Date().toISOString();

  threatCache.valleys = (regionalData.monitored_valleys || []).map(v => {
    if (v.id === 'val_sainj') {
      return {
        ...v,
        risk_score: 77.7,
        risk_level: 'CRITICAL',
        lead_time_hours: 3.2,
        current_rainfall_mm: 88.5,
        rainfall_24h_mm: 194.2,
        current_river_stage_m: 7.8,
        is_above_danger: true
      };
    } else if (v.id === 'val_aut' || v.id === 'val_larji') {
      return {
        ...v,
        risk_score: 64.2,
        risk_level: 'HIGH',
        lead_time_hours: 5.5,
        current_rainfall_mm: 42.0,
        rainfall_24h_mm: 112.0,
        current_river_stage_m: 6.8,
        is_above_danger: false
      };
    } else if (v.district === 'Kullu' || v.district === 'Mandi') {
      return {
        ...v,
        risk_score: 48.0,
        risk_level: 'MODERATE',
        lead_time_hours: 8.0,
        current_rainfall_mm: 22.0,
        rainfall_24h_mm: 65.0,
        current_river_stage_m: 4.1,
        is_above_danger: false
      };
    }
    return {
      ...v,
      risk_score: v.base_risk,
      risk_level: 'LOW',
      lead_time_hours: 12.0,
      current_rainfall_mm: 0.0,
      rainfall_24h_mm: 2.0,
      current_river_stage_m: 2.2,
      is_above_danger: false
    };
  });

  threatCache.valleys.sort((a, b) => b.risk_score - a.risk_score);

  threatCache.criticalAlert = {
    title: 'FLASH FLOOD WARNING: Sainj Valley (Neuli) has reached CRITICAL risk (77.7/100).',
    target: 'Sainj Valley (Neuli) · Kullu Dist. · Lead Time: 3.2h',
    leadTime: '3.2 hrs',
    action: 'Evacuate low-lying riverbanks immediately. High-velocity debris flow imminent.'
  };

  threatCache.summary = {
    totalMonitored: threatCache.valleys.length,
    criticalCount: 1,
    highCount: 2,
    moderateCount: 6,
    lowCount: threatCache.valleys.length - 9,
    minLeadTimeHours: 3.2,
    status: 'CRITICAL_SIMULATION'
  };

  res.json({ message: 'Disaster simulation activated for Upper Beas Basin (Sainj Valley).', threatCache });
});

app.post('/api/overview/sync', async (req, res) => {
  threatCache.isSimulated = false;
  await syncRegionalThreats();
  res.json({ message: 'Live synoptic streams resynced.', threatCache });
});

app.post('/api/predict', async (req, res) => {
  try {
    const response = await axios.post(`${FASTAPI_URL}/predict`, req.body, { timeout: 30000 });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || err.message;
    res.status(status).json({ detail });
  }
});

app.get('/api/states', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/states`, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.get('/api/districts/:state', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/districts/${encodeURIComponent(req.params.state)}`, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/api/evacuation/route', async (req, res) => {
  try {
    const response = await axios.post(`${FASTAPI_URL}/api/evacuation/route`, req.body, { timeout: 30000 });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || err.message;
    res.status(status).json({ detail });
  }
});

app.get('/api/villages/:district', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/villages/${encodeURIComponent(req.params.district)}`, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.get('/api/features/:state/:district', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/features/${encodeURIComponent(req.params.state)}/${encodeURIComponent(req.params.district)}`, { timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.get('/api/location/reverse', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/location/reverse`, { params: req.query, timeout: 10000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


// ==============================================================================
// NEW JALDRISHTI MOCK ENDPOINTS (Until backend is fully integrated)
// ==============================================================================

let mockAlerts = [];

app.get('/api/alerts', (req, res) => {
  res.json({ alerts: mockAlerts.length > 0 ? mockAlerts : (threatCache.criticalAlert ? [
    {
      id: 'alert-1',
      severity: 'CRITICAL',
      title: threatCache.criticalAlert.title,
      target: threatCache.criticalAlert.target,
      leadTime: threatCache.criticalAlert.leadTime,
      issuedAt: new Date().toISOString(),
      status: 'ACTIVE'
    }
  ] : []) });
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  res.json({ message: 'DEMO ACTION: Alert acknowledged', id: req.params.id });
});

app.get('/api/villages', (req, res) => {
  // Return the valleys as villages for the initial table view
  res.json({ villages: threatCache.valleys || [] });
});

app.get('/api/shelters', (req, res) => {
  res.json({
    shelters: [
      { id: 'sh1', name: 'Govt Higher Secondary School', capacity: 1500, occupied: 840, medical: true, power: true, lat: 31.8, lon: 77.2 },
      { id: 'sh2', name: 'Community Center Bhawan', capacity: 800, occupied: 120, medical: false, power: true, lat: 31.75, lon: 77.15 }
    ]
  });
});

app.get('/api/evacuation/:villageId', (req, res) => {
  res.json({
    villageId: req.params.villageId,
    populationAtRisk: 2840,
    evacuated: 840,
    remaining: 2000,
    status: 'IN_PROGRESS',
    safeZones: [
      { id: 'sz1', name: 'Upper Ridge Safe Zone', lat: 31.85, lon: 77.25 }
    ]
  });
});

// Broadcast threat cache updates via WebSocket
io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);
  socket.emit('threatCache.updated', threatCache);
  socket.on('disconnect', () => console.log('[Socket.IO] Client disconnected:', socket.id));
});

function broadcastUpdates() {
  io.emit('threatCache.updated', threatCache);
}

// Override the original sync function calls to also broadcast
const originalSync = syncRegionalThreats;
syncRegionalThreats = async () => {
  await originalSync();
  broadcastUpdates();
};

httpServer.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Flash Flood Express Gateway running on port ${PORT}`);
  console.log(`🔗 Connected to Python FastAPI ML engine at ${FASTAPI_URL}`);
  console.log(`📡 WebSocket real-time server is active`);
  console.log(`=======================================================`);
});

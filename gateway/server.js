import express from 'express';
import * as dotenv from 'dotenv';
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

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const PORT = process.env.GATEWAY_PORT || 5000;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

console.log('[Gateway] Provider configuration:', {
  newsApiKeyConfigured: Boolean(process.env.NEWS_API_KEY && process.env.NEWS_API_KEY !== 'your_newsapi_key_here'),
  weatherApiKeyConfigured: Boolean(process.env.WEATHER_API_KEY),
  weatherProvider: 'Open-Meteo',
});

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

// Load comprehensive villages dataset (HP, Uttarakhand, and North Eastern States)
const VILLAGES_PATH = path.resolve(__dirname, '../data/villages.json');
let allVillagesList = [];
try {
  if (fs.existsSync(VILLAGES_PATH)) {
    const vData = JSON.parse(fs.readFileSync(VILLAGES_PATH, 'utf-8'));
    let vid = 1;
    for (const [st, dists] of Object.entries(vData)) {
      for (const [dist, vList] of Object.entries(dists)) {
        for (const v of vList) {
          const vuln = v.vulnerability || 'HIGH';
          const score = vuln === 'CRITICAL' ? 88.5 : (vuln === 'HIGH' ? 72.4 : 48.0);
          allVillagesList.push({
            id: `v-${vid++}`,
            name: v.name,
            district: dist,
            state: st,
            lat: Number(v.lat),
            lon: Number(v.lon),
            elevation_m: v.elevation_m || 1000,
            river_basin: v.river_basin || 'Local Basin',
            risk_level: vuln === 'CRITICAL' ? 'CRITICAL' : (vuln || 'HIGH'),
            risk_score: score,
            rainfall_24h_mm: Number((score * 1.45).toFixed(1)),
            lead_time_hours: vuln === 'CRITICAL' ? 3 : (vuln === 'HIGH' ? 6 : 12),
            vulnerability: vuln
          });
        }
      }
    }
    console.log(`[Gateway] Loaded ${allVillagesList.length} monitored villages across ${Object.keys(vData).length} states.`);
  }
} catch (e) {
  console.error('[Gateway] Failed to load villages.json:', e.message);
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

// API Caches for Weather and News
const apiCache = {
  weather: new Map(), // key: lat_lon, value: { data, timestamp }
  news: new Map(), // key: location_category, value: { data, timestamp }
};

const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const NEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
      let leadTimeHours = null;

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
        minLeadTimeHours: criticalCount > 0 ? 3.5 : (highCount > 0 ? 6.0 : (moderateCount > 0 ? 9.0 : '--')),
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
          lead_time_hours: null,
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

app.post('/api/overview/simulate', async (req, res) => {
  const { scenario } = req.body;

  if (scenario === 'RESET') {
    threatCache.isSimulated = false;
    threatCache.simulationScenario = null;
    await syncRegionalThreats();
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
      lead_time_hours: null,
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

app.get('/api/districts', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/districts`, { timeout: 10000 });
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
    const response = await axios.get(`${FASTAPI_URL}/villages/${encodeURIComponent(req.params.district)}`, { params: req.query, timeout: 10000 });
    return res.json(response.data);
  } catch (err) {
    const dClean = req.params.district.toLowerCase();
    const matches = allVillagesList.filter(v => v.district.toLowerCase() === dClean || v.district.toLowerCase().includes(dClean));
    res.json({
      district: req.params.district,
      villages: matches.map(m => m.name),
      details: matches
    });
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
// WEATHER AND NEWS ENDPOINTS (GPS-Driven)
// ==============================================================================

app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat or lon parameters' });
  }

  // Round coordinates to ~1km for caching
  const cacheKey = `${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
  const cached = apiCache.weather.get(cacheKey);
  console.log('[Gateway] Weather request:', { lat, lon, cacheHit: Boolean(cached) });

  const weatherConditionFromCode = (code) => {
    if (code === 0) return 'Clear';
    if ([1, 2].includes(code)) return 'Partly cloudy';
    if (code === 3) return 'Cloudy';
    if ([45, 48].includes(code)) return 'Fog';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([95, 96, 99].includes(code)) return 'Thunderstorm';
    return 'Unknown';
  };

  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    const formattedData = {
      location: {
        latitude: Number(lat),
        longitude: Number(lon),
      },
      current: {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        conditionCode: data.current.weather_code,
        condition: weatherConditionFromCode(data.current.weather_code),
        precipitation: data.current.precipitation
      },
      hourly: data.hourly.time.slice(0, 24).map((time, i) => ({
        time,
        temperature: data.hourly.temperature_2m[i],
        precipitationProbability: data.hourly.precipitation_probability[i],
        conditionCode: data.hourly.weather_code[i]
      })),
      daily: data.daily.time.map((time, i) => ({
        time,
        temperatureMax: data.daily.temperature_2m_max[i],
        temperatureMin: data.daily.temperature_2m_min[i],
        precipitationSum: data.daily.precipitation_sum[i],
        precipitationProbability: data.daily.precipitation_probability_max[i],
        conditionCode: data.daily.weather_code[i]
      }))
    };

    apiCache.weather.set(cacheKey, { data: formattedData, timestamp: Date.now() });
    console.log('[Gateway] Weather response:', {
      temperature: formattedData.current.temperature,
      condition: formattedData.current.condition,
      hourlyCount: formattedData.hourly.length,
      dailyCount: formattedData.daily.length,
    });
    res.json(formattedData);
  } catch (err) {
    console.error('[Gateway] Weather API failed:', err.message);
    res.status(500).json({ error: 'Weather data unavailable' });
  }
});

const getNewsRelevanceScore = (article, locations) => {
  const text = (article.title + ' ' + (article.description || '')).toLowerCase();
  let score = 0;

  // Hazard relevance
  if (text.includes('flash flood')) score += 5;
  if (text.includes('cloudburst')) score += 5;
  if (text.includes('heavy rainfall')) score += 5;
  if (text.includes('extreme rainfall')) score += 5;
  if (text.includes('river overflow') || text.includes('river level') || text.includes('dam overflow')) score += 4;
  if (text.includes('water level') || text.includes('flood warning') || text.includes('landslide')) score += 3;
  if (text.includes('rainfall') || text.includes('flood') || text.includes('river') || text.includes('dam')) score += 2;

  // Location relevance
  const locationWeights = [
    [locations.city, 5],
    [locations.district, 4],
    [locations.state, 3],
    ['India', 2],
  ];
  locationWeights.forEach(([name, weight]) => {
    if (name && text.includes(name.toLowerCase())) score += weight;
  });

  return score;
};

const categorizeNews = (article) => {
  const text = (article.title + ' ' + (article.description || '')).toLowerCase();
  if (text.includes('flash flood') || text.includes('cloudburst')) return 'FLASH FLOOD';
  if (text.includes('landslide')) return 'LANDSLIDE';
  if (text.includes('heavy rain') || text.includes('extreme rain')) return 'HEAVY RAINFALL';
  if (text.includes('dam') || text.includes('reservoir')) return 'DAM / RESERVOIR';
  if (text.includes('river') || text.includes('water level')) return 'RIVER / WATER LEVEL';
  if (text.includes('flood')) return 'FLOOD';
  return 'WEATHER WARNING';
};

app.get('/api/news', async (req, res) => {
  const { location, city, district, state, category } = req.query;
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  console.log('[Gateway] News request:', { location, city, district, state, category, keyConfigured: Boolean(NEWS_API_KEY) });

  if (!NEWS_API_KEY || NEWS_API_KEY === 'your_newsapi_key_here') {
    console.warn('[Gateway] News request skipped: NEWS_API_KEY is not configured in .env.');
    return res.status(503).json({ error: 'News API key not configured' });
  }

  const cacheKey = `${city || location || 'india'}_${district || ''}_${state || ''}_${category || 'all'}`.toLowerCase();
  const cached = apiCache.news.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < NEWS_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    let query = '("flash flood" OR flood OR flooding OR "heavy rainfall" OR "extreme rainfall" OR cloudburst OR "river overflow" OR "river level" OR "water level" OR "dam overflow" OR "reservoir overflow" OR "dam release" OR waterlogging OR landslide)';
    const locationTerms = [city || location, district, state].filter(Boolean);
    if (locationTerms.length > 0) {
      query += ` AND (${locationTerms.join(' OR ')})`;
    } else {
      query += ` AND India`;
    }

    if (category && category !== 'All') {
      const catMap = {
        'Flood': 'flood',
        'Heavy Rain': '"heavy rain" OR rainfall OR cloudburst',
        'Rivers': 'river OR "water level"',
        'Dams': 'dam OR reservoir',
        'Landslide': 'landslide'
      };
      if (catMap[category]) {
         query = `(${catMap[category]}) AND (${locationTerms.join(' OR ') || 'India'})`;
      }
    }

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`;
    const response = await axios.get(url, { timeout: 10000 });
    console.log('[Gateway] News provider response:', { status: response.status, providerCount: response.data.articles?.length || 0, query });

    let articles = response.data.articles || [];

    // Filter and score
    articles = articles
      .filter(a => a.title && a.title !== '[Removed]')
      .map(a => {
        const score = getNewsRelevanceScore(a, { city: city || location, district, state });
        return {
          id: a.url,
          title: a.title,
          description: a.description,
          source: a.source.name,
          url: a.url,
          publishedAt: a.publishedAt,
          score,
          category: categorizeNews(a),
          location: city || district || state || 'India'
        };
      })
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt))
      .filter((article, index, list) => list.findIndex(item => item.url === article.url) === index)
      .slice(0, 15);

    const result = { articles, lastUpdated: new Date().toISOString() };
    apiCache.news.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log('[Gateway] News response:', { filteredCount: articles.length, cacheKey });
    res.json(result);
  } catch (err) {
    console.error('[Gateway] News API failed:', err.message);
    res.status(500).json({ error: 'News data unavailable' });
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

app.get('/api/villages', async (req, res) => {
  try {
    const response = await axios.get(`${FASTAPI_URL}/api/villages`, { timeout: 4000 });
    if (response.data?.villages?.length) {
      return res.json(response.data);
    }
  } catch (err) {
    // Fall back to allVillagesList
  }
  res.json({ villages: allVillagesList.length > 0 ? allVillagesList : (threatCache.valleys || []) });
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

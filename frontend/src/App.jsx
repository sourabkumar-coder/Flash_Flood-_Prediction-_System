import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import GloFASChart from './components/GloFASChart';
import CommandCenter from './components/CommandCenter';
import EvacuationModal from './components/EvacuationModal';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const loadingSteps = [
  'Fetching region metadata...',
  'Connecting to live weather feeds...',
  'Assessing terrain and slope...',
  'Checking upstream hydrology...',
  'Reviewing historical flood patterns...',
  'Calculating flood risk index...'
];

const statusClassMap = {
  live: 'live',
  available: 'available',
  stale: 'stale',
  unavailable: 'unavailable'
};

function App() {
  // Navigation View: 'command_center' | 'district_analytics'
  const [activeTab, setActiveTab] = useState('command_center');

  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('');

  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);

  // Evacuation Routing State (OSRM + OSM + SRTM)
  const [evacuationPlan, setEvacuationPlan] = useState(null);
  const [evacLoading, setEvacLoading] = useState(false);
  const [isEvacModalOpen, setIsEvacModalOpen] = useState(false);
  const [evacMode, setEvacMode] = useState('driving'); // 'driving' | 'walking'

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState);
    } else {
      setDistricts([]);
      setSelectedDistrict('');
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedDistrict) {
      fetchVillages(selectedDistrict);
    } else {
      setVillages([]);
      setSelectedVillage('');
    }
  }, [selectedDistrict]);

  const fetchStates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/states`).catch(async () => {
        return await axios.get(`http://localhost:8000/states`);
      });
      setStates(response.data.states || []);
    } catch (err) {
      setError('Failed to fetch states. Please verify the backend is running.');
    }
  };

  const fetchDistricts = async (state) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/districts/${state}`).catch(async () => {
        return await axios.get(`http://localhost:8000/districts/${state}`);
      });
      setDistricts(response.data.districts || []);
    } catch (err) {
      setError('Failed to fetch districts for the selected state.');
    }
  };

  const fetchVillages = async (district) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/villages/${district}`).catch(async () => {
        return await axios.get(`http://localhost:8000/villages/${district}`);
      });
      setVillages(response.data.villages || []);
    } catch (err) {
      setError('Failed to fetch villages for the selected district.');
    }
  };

  // Fetch Safest Evacuation Route from OSRM + OSM
  const handleFetchEvacuationRoute = async (targetMode = evacMode, shelterIdx = 0) => {
    const lat = prediction?.location?.latitude || gpsCoords?.latitude;
    const lon = prediction?.location?.longitude || gpsCoords?.longitude;
    if (!lat || !lon) return;

    try {
      setEvacLoading(true);
      const payload = {
        latitude: lat,
        longitude: lon,
        state: prediction?.location?.state || selectedState || '',
        district: prediction?.location?.district || selectedDistrict || '',
        mode: targetMode,
        target_shelter_index: shelterIdx
      };

      let res = await axios.post(`${API_BASE_URL}/api/evacuation/route`, payload).catch(async () => {
        return await axios.post(`http://localhost:8000/api/evacuation/route`, payload);
      });

      if (res?.data) {
        setEvacuationPlan(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch evacuation route:', err);
    } finally {
      setEvacLoading(false);
    }
  };

  // Open Evacuation Modal and trigger route calculation
  const handleOpenEvacuation = async () => {
    setIsEvacModalOpen(true);
    if (!evacuationPlan) {
      await handleFetchEvacuationRoute(evacMode, 0);
    }
  };

  // Change driving/walking transport mode
  const handleModeChange = async (newMode) => {
    setEvacMode(newMode);
    await handleFetchEvacuationRoute(newMode, 0);
  };

  // Switch destination to an alternative shelter
  const handleSelectAlternativeShelter = async (shelterIdx) => {
    await handleFetchEvacuationRoute(evacMode, shelterIdx);
  };

  // Run prediction pipeline given payload
  const runPrediction = async (payload) => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setEvacuationPlan(null);
    setLoadingMessage(loadingSteps[0]);

    try {
      for (let i = 0; i < loadingSteps.length; i += 1) {
        setLoadingMessage(loadingSteps[i]);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const response = await axios.post(`${API_BASE_URL}/predict`, payload).catch(async () => {
        return await axios.post(`http://localhost:8000/predict`, payload);
      });
      const data = response.data;
      setPrediction(data);

      if (data?.location) {
        const { state, district } = data.location;
        if (state && state !== 'Unknown' && state !== 'India') {
          setSelectedState(state);
          if (district && district !== 'Unknown' && !district.startsWith('GPS')) {
            setSelectedDistrict(district);
          }
        }
      }

      // Pre-fetch evacuation route automatically if risk is Elevated or Critical
      if (data?.location?.latitude && data?.location?.longitude) {
        const lat = data.location.latitude;
        const lon = data.location.longitude;
        axios.post(`${API_BASE_URL}/api/evacuation/route`, {
          latitude: lat,
          longitude: lon,
          state: data.location.state || '',
          district: data.location.district || '',
          mode: 'driving'
        }).then(r => {
          if (r.data) setEvacuationPlan(r.data);
        }).catch(() => {
          axios.post(`http://localhost:8000/api/evacuation/route`, {
            latitude: lat,
            longitude: lon,
            state: data.location.state || '',
            district: data.location.district || '',
            mode: 'driving'
          }).then(r2 => {
            if (r2.data) setEvacuationPlan(r2.data);
          }).catch(() => null);
        });
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze risk for the selected region.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleAnalyze = async () => {
    if (gpsCoords) {
      await runPrediction({
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
      });
      return;
    }

    if (!selectedState || !selectedDistrict) return;

    const payload = {
      state: selectedState,
      district: selectedDistrict,
    };
    if (selectedVillage) {
      payload.village = selectedVillage;
    }

    await runPrediction(payload);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setGpsCoords({ latitude: lat, longitude: lon });
        setGpsLoading(false);

        setActiveTab('district_analytics');
        await runPrediction({
          latitude: lat,
          longitude: lon,
        });
      },
      (err) => {
        setGpsLoading(false);
        let msg = 'Failed to acquire GPS location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow location access in your browser.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  const handleClearGps = () => {
    setGpsCoords(null);
  };

  const handleSelectValleyFromMap = async (valley) => {
    setSelectedState(valley.state);
    setSelectedDistrict(valley.district);
    setSelectedVillage(valley.village || '');
    setGpsCoords(null);
    setActiveTab('district_analytics');

    await runPrediction({
      state: valley.state,
      district: valley.district,
      village: valley.village,
      latitude: valley.latitude,
      longitude: valley.longitude
    });
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MODERATE': return '#eab308';
      case 'LOW': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  const rainfallChartData = useMemo(() => {
    if (!prediction) return [];

    return [
      { label: '1h', value: Number(prediction.weather.rainfall_1h_mm ?? 0) },
      { label: '3h', value: Number(prediction.weather.rainfall_3h_mm ?? 0) },
      { label: '6h', value: Number(prediction.weather.rainfall_6h_mm ?? 0) },
      { label: '24h', value: Number(prediction.weather.rainfall_24h_mm ?? 0) }
    ];
  }, [prediction]);

  const maxRainfall = Math.max(...rainfallChartData.map((item) => item.value), 1);

  return (
    <div className="app-shell">
      {/* Top Global Navigation Bar */}
      <header className="topbar panel">
        <div className="topbar-brand">
          <p className="eyebrow">Disaster Early-Warning & Hydrological Intelligence</p>
          <h1>Flash Flood Prediction System</h1>
        </div>

        {/* View Mode Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'command_center' ? 'active' : ''}`}
            onClick={() => setActiveTab('command_center')}
          >
            <span className="tab-icon">🛰️</span>
            <span>Regional GIS Command Center</span>
            <span className="tab-badge">North-East & Hilly</span>
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'district_analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('district_analytics')}
          >
            <span className="tab-icon">📊</span>
            <span>Precise District Analytics</span>
            {prediction && <span className="tab-active-dot" />}
          </button>
        </nav>

        <div className="topbar-meta">
          <div className="system-pill">
            <span className="live-dot" />
            <span>Multi-Source Live</span>
          </div>
          <span>GloFAS v4</span>
        </div>
      </header>

      {/* VIEW 1: Regional Macro GIS Command Center */}
      {activeTab === 'command_center' && (
        <CommandCenter
          apiBaseUrl={API_BASE_URL}
          onSelectValley={handleSelectValleyFromMap}
          onSwitchToDistrictView={() => setActiveTab('district_analytics')}
        />
      )}

      {/* VIEW 2: Precise District Analytics & XGBoost Deep View */}
      {activeTab === 'district_analytics' && (
        <div className="layout">
          <aside className="sidebar panel">
            <div className="panel-header">
              <h2>Target Region</h2>
            </div>

            {/* GPS Auto-Detect Option */}
            <div className="gps-section">
              <button
                type="button"
                className={`gps-btn ${gpsCoords ? 'gps-active' : ''}`}
                onClick={handleDetectLocation}
                disabled={loading || gpsLoading}
              >
                {gpsLoading ? (
                  <>
                    <div className="spinner mini-spinner" />
                    <span>Acquiring GPS Signal...</span>
                  </>
                ) : (
                  <>
                    <span className="gps-icon">📍</span>
                    <span>{gpsCoords ? 'Re-detect GPS Location' : 'Use Current Location (GPS)'}</span>
                  </>
                )}
              </button>

              {gpsCoords && (
                <div className="gps-badge">
                  <div className="gps-badge-info">
                    <span className="gps-dot" />
                    <span>{gpsCoords.latitude.toFixed(4)}°N, {gpsCoords.longitude.toFixed(4)}°E</span>
                  </div>
                  <button
                    type="button"
                    className="gps-clear-btn"
                    onClick={handleClearGps}
                    title="Switch to manual selection"
                  >
                    ✕ Manual
                  </button>
                </div>
              )}
            </div>

            <div className="section-divider">
              <span>OR SELECT MANUALLY</span>
            </div>

            <div className="control-group">
              <label htmlFor="state">State</label>
              <select
                id="state"
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  if (gpsCoords) setGpsCoords(null);
                }}
              >
                <option value="">Select state</option>
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label htmlFor="district">District</label>
              <select
                id="district"
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  if (gpsCoords) setGpsCoords(null);
                }}
                disabled={!selectedState}
              >
                <option value="">Select district</option>
                {districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label htmlFor="village">Village / ward</label>
              <select
                id="village"
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                disabled={!selectedDistrict || villages.length === 0}
              >
                <option value="">District-level analysis</option>
                {villages.map((village) => (
                  <option key={village} value={village}>{village}</option>
                ))}
              </select>
            </div>

            <button
              className="primary-btn"
              onClick={handleAnalyze}
              disabled={loading || gpsLoading || (!gpsCoords && (!selectedState || !selectedDistrict))}
            >
              {loading ? 'Processing...' : gpsCoords ? 'Analyze GPS Risk' : 'Analyze risk'}
            </button>

            {/* Quick Evacuation Assistant Button */}
            {prediction && (
              <button
                className="evac-trigger-btn"
                onClick={handleOpenEvacuation}
                title="Calculate fastest and safest escape route avoiding river inundation paths"
              >
                <span className="evac-icon">🚨</span>
                <span>View Safest Evacuation Route (OSRM)</span>
              </button>
            )}

            {error && <div className="error-box">{error}</div>}

            {loading && (
              <div className="loading-box">
                <div className="spinner" />
                <span>{loadingMessage}</span>
              </div>
            )}

            <div className="utility-box">
              <h3>Data Feeds & Engines</h3>
              <ul>
                <li>Weather: live (Open-Meteo)</li>
                <li>Terrain: available (SRTM 90m)</li>
                <li>Hydrology: GloFAS v4 Seamless</li>
                <li>Routing: OSRM + OSM Overpass</li>
                <li>Historical: 1950-2024 EM-DAT Baseline</li>
              </ul>
            </div>
          </aside>

          <main className="dashboard">
            {!prediction ? (
              <div className="empty-state panel">
                <div className="empty-icon">📍</div>
                <h2>Select a Target Region or GPS Location</h2>
                <p>
                  Query high-resolution weather telemetry, SRTM slope relief, GloFAS v4 river ensemble,
                  and historical exposure to assess flash-flood risk in real time.
                </p>
                <button
                  className="empty-cta-btn"
                  onClick={() => setActiveTab('command_center')}
                >
                  🗺️ Or Explore Regional Basins on GIS Map &rarr;
                </button>
              </div>
            ) : (
              <>
                <section className="risk-banner panel" style={{ background: `linear-gradient(135deg, ${getRiskColor(prediction.prediction.risk_level)}, rgba(15, 23, 42, 0.9))` }}>
                  <div className="risk-banner-row">
                    <div>
                      <p className="subtitle">Current Risk Level</p>
                      <h2>{prediction.prediction.risk_level}</h2>
                    </div>
                    <div className="risk-score-box">
                      <span>Risk Score</span>
                      <strong>{prediction.prediction.risk_score}</strong>
                    </div>
                  </div>

                  <div className="risk-meta-row">
                    <span>{prediction.location.state}</span>
                    <span>{prediction.location.district}</span>
                    <span>{prediction.location.village || 'District-level analysis'}</span>
                    {prediction.location.latitude && (
                      <span>📍 {prediction.location.latitude.toFixed(4)}°N, {prediction.location.longitude.toFixed(4)}°E</span>
                    )}
                    <span>Historical Susceptibility: {prediction.prediction.susceptibility_percent}%</span>
                    <span>Hilly Region: {prediction.prediction.hilly_region ? 'Yes' : 'No'}</span>
                  </div>

                  <div className="banner-actions-row">
                    {prediction.evacuation?.lead_time_hours !== null && (
                      <div className="warning-bar">
                        Lead time: {prediction.evacuation.lead_time_hours} hours · {prediction.evacuation.status}
                      </div>
                    )}
                    <button
                      className="banner-evac-btn"
                      onClick={handleOpenEvacuation}
                    >
                      🚨 Open Evacuation Navigator &rarr;
                    </button>
                  </div>
                </section>

                <section className="summary-grid">
                  <div className="metric-card panel">
                    <span className="metric-label">State</span>
                    <strong>{prediction.location.state}</strong>
                  </div>
                  <div className="metric-card panel">
                    <span className="metric-label">District</span>
                    <strong>{prediction.location.district}</strong>
                  </div>
                  <div className="metric-card panel">
                    <span className="metric-label">Susceptibility</span>
                    <strong>{prediction.prediction.susceptibility_percent}%</strong>
                  </div>
                  <div className="metric-card panel">
                    <span className="metric-label">Terrain Type</span>
                    <strong>{prediction.terrain.hilly_region ? 'Hilly / Mountainous' : 'Plain / Plateau'}</strong>
                  </div>
                </section>

                <section className="content-grid">
                  <div className="panel map-panel">
                    <div className="panel-header">
                      <h3>Geospatial & Evacuation Map</h3>
                      {evacuationPlan && (
                        <button
                          className="mini-evac-toggle-btn"
                          onClick={() => setIsEvacModalOpen(true)}
                        >
                          🛡️ Shelter: {evacuationPlan.shelter?.name?.split(' ')[0]} ({evacuationPlan.safe_route?.distance_km}km)
                        </button>
                      )}
                    </div>
                    <div className="map-wrap">
                      <MapComponent
                        latitude={prediction.location.latitude}
                        longitude={prediction.location.longitude}
                        riskLevel={prediction.prediction.risk_level}
                        districtName={prediction.location.village || prediction.location.district}
                        evacuationPlan={evacuationPlan}
                      />
                    </div>
                  </div>

                  <div className="panel insight-panel">
                    <div className="panel-header">
                      <h3>Risk Explanation & Indicators</h3>
                    </div>
                    <p className="insight-text">{prediction.hydrology.reason || 'Risk assessment is being evaluated with live environmental indicators.'}</p>
                    
                    {evacuationPlan && (
                      <div className="evac-quick-card">
                        <div className="eq-head">
                          <span className="eq-shield">🛡️</span>
                          <div>
                            <strong>Primary Safe Shelter Found:</strong>
                            <p>{evacuationPlan.shelter?.name}</p>
                          </div>
                        </div>
                        <div className="eq-meta">
                          <span>⏱ {evacuationPlan.safe_route?.duration_min} min drive</span>
                          <span>·</span>
                          <span>▲ +{evacuationPlan.elevation_gain_m}m High Ground</span>
                          <span>·</span>
                          <span className="text-green">✓ River Avoided</span>
                        </div>
                        <button
                          className="eq-btn"
                          onClick={() => setIsEvacModalOpen(true)}
                        >
                          Show Turn-by-Turn Guidance &rarr;
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <h3>Weather Conditions</h3>
                      <span className={`status-badge ${statusClassMap.live}`}>Live</span>
                    </div>
                    <div className="stats-grid">
                      <div><span>Temperature</span><strong>{prediction.weather.temperature_c ?? 'N/A'}°C</strong></div>
                      <div><span>Humidity</span><strong>{prediction.weather.humidity_percent ?? 'N/A'}%</strong></div>
                      <div><span>Current Rain</span><strong>{prediction.weather.rainfall_mm ?? 'N/A'} mm</strong></div>
                      <div><span>1h Rain</span><strong>{prediction.weather.rainfall_1h_mm ?? 'N/A'} mm</strong></div>
                      <div><span>3h Rain</span><strong>{prediction.weather.rainfall_3h_mm ?? 'N/A'} mm</strong></div>
                      <div><span>6h Rain</span><strong>{prediction.weather.rainfall_6h_mm ?? 'N/A'} mm</strong></div>
                      <div><span>24h Rain</span><strong>{prediction.weather.rainfall_24h_mm ?? 'N/A'} mm</strong></div>
                    </div>

                    <div className="chart-wrap">
                      <div className="chart-header">Rainfall Accumulation</div>
                      <div className="rain-chart">
                        {rainfallChartData.map((item) => (
                          <div key={item.label} className="bar-group">
                            <div className="bar-rail">
                              <div className="bar-fill" style={{ height: `${(item.value / maxRainfall) * 100}%` }} />
                            </div>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <h3>Terrain & Relief</h3>
                      <span className={`status-badge ${statusClassMap.available}`}>Available</span>
                    </div>
                    <div className="stats-grid">
                      <div><span>Elevation</span><strong>{prediction.terrain.elevation_m ?? 'N/A'} m</strong></div>
                      <div><span>Relief</span><strong>{prediction.terrain.relief_m ?? 'N/A'} m</strong></div>
                      <div><span>Slope</span><strong>{prediction.terrain.slope_percent ?? 'N/A'}%</strong></div>
                      <div><span>Max Slope</span><strong>{prediction.terrain.max_slope_percent ?? 'N/A'}%</strong></div>
                      <div><span>Hilly Region</span><strong>{prediction.terrain.hilly_region ? 'Yes' : 'No'}</strong></div>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <h3>Hydrology (GloFAS v4)</h3>
                      <span className={`status-badge ${statusClassMap[prediction.hydrology.status?.toLowerCase()] || 'unavailable'}`}>
                        {prediction.hydrology.status || 'Unavailable'}
                      </span>
                    </div>
                    <div className="stats-grid">
                      <div><span>Discharge (Current)</span><strong>{prediction.hydrology.river_discharge ?? 'N/A'} m³/s</strong></div>
                      <div><span>Ensemble Mean</span><strong>{prediction.hydrology.discharge_mean ?? prediction.hydrology.river_discharge ?? 'N/A'} m³/s</strong></div>
                      <div><span>75th Percentile</span><strong>{prediction.hydrology.discharge_p75 ?? 'N/A'} m³/s</strong></div>
                      <div><span>25th Percentile</span><strong>{prediction.hydrology.discharge_p25 ?? 'N/A'} m³/s</strong></div>
                      <div><span>Water Level</span><strong>{prediction.hydrology.water_level ?? 'N/A'} m</strong></div>
                      <div><span>Water Level Status</span><strong>{prediction.hydrology.water_level_status || 'N/A'}</strong></div>
                    </div>
                  </div>

                  {prediction.hydrology?.time_series && (
                    <div className="panel glofas-panel">
                      <GloFASChart
                        timeSeries={prediction.hydrology.time_series}
                        stationName={prediction.hydrology.station}
                        modelName={prediction.hydrology.model_name || 'GloFAS v4 Seamless'}
                      />
                    </div>
                  )}

                  <div className="panel">
                    <div className="panel-header">
                      <h3>Soil & Infiltration</h3>
                      <span className={`status-badge ${statusClassMap.available}`}>Available</span>
                    </div>
                    <div className="stats-grid">
                      <div><span>Clay</span><strong>{prediction.soil.clay_percent ?? 'N/A'}%</strong></div>
                      <div><span>Sand</span><strong>{prediction.soil.sand_percent ?? 'N/A'}%</strong></div>
                      <div><span>Silt</span><strong>{prediction.soil.silt_percent ?? 'N/A'}%</strong></div>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <h3>Historical Baseline (1950-2024)</h3>
                      <span className={`status-badge ${statusClassMap.available}`}>Available</span>
                    </div>
                    <div className="stats-grid">
                      <div><span>Flood Events</span><strong>{prediction.historical.flood_events ?? 0}</strong></div>
                      <div><span>Flood Years</span><strong>{prediction.historical.flood_years ?? 0}</strong></div>
                      <div><span>Fatalities</span><strong>{prediction.historical.fatalities ?? 0}</strong></div>
                      <div><span>Displaced</span><strong>{prediction.historical.displaced ?? 0}</strong></div>
                      <div><span>Max Severity</span><strong>{prediction.historical.max_severity ?? 0}</strong></div>
                      <div><span>Impact Index</span><strong>{prediction.historical.max_impact ?? 0}</strong></div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      )}

      {/* Evacuation Assistant Modal & Turn-by-Turn Drawer */}
      <EvacuationModal
        isOpen={isEvacModalOpen}
        onClose={() => setIsEvacModalOpen(false)}
        evacuationData={evacuationPlan}
        loading={evacLoading}
        mode={evacMode}
        onModeChange={handleModeChange}
        onSelectShelter={handleSelectAlternativeShelter}
        originLabel={prediction?.location?.village || prediction?.location?.district || 'Selected Location'}
      />
    </div>
  );
}

export default App;

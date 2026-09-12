import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { riskApi, villageApi, evacuationApi } from '../api/client';
import MapComponent from '../components/MapComponent';
import GloFASChart from '../components/GloFASChart';
import { 
  Search, Filter, Home, ArrowUpDown, MapPin, AlertTriangle, 
  CloudRain, Droplets, Mountain, Layers, History, ShieldAlert,
  Navigation, RefreshCw, Compass
} from 'lucide-react';
import './Villages.css';

const loadingSteps = [
  'Acquiring coordinates & GIS metadata...',
  'Fetching live Open-Meteo telemetry...',
  'Querying SRTM 90m terrain & hydrological data...',
  'Executing XGBoost ensemble risk engine...'
];

export default function Villages() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || '');
  const [allDistricts, setAllDistricts] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get('district') || '');
  const [villages, setVillages] = useState([]);
  const [villageDetails, setVillageDetails] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(searchParams.get('village') || '');
  const [villagesLoading, setVillagesLoading] = useState(false);

  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [evacuationPlan, setEvacuationPlan] = useState(null);

  // Valleys table list
  const [valleyList, setValleyList] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchStates();
    fetchAllDistricts();
    fetchValleyTable();
  }, []);

  // Filter or populate districts whenever selectedState or allDistricts changes
  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState);
    } else if (allDistricts.length > 0) {
      setDistricts(allDistricts.map((d) => d.district));
    }
  }, [selectedState, allDistricts]);

  // Fetch villages when selectedDistrict changes
  useEffect(() => {
    if (selectedDistrict) {
      fetchVillagesList(selectedDistrict, selectedState);
    } else {
      setVillages([]);
      setVillageDetails([]);
      setSelectedVillage('');
    }
  }, [selectedDistrict, selectedState]);

  // Initial load from URL parameters if provided
  useEffect(() => {
    const s = searchParams.get('state');
    const d = searchParams.get('district');
    const v = searchParams.get('village');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (lat && lon) {
      setGpsCoords({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
      runPrediction({ latitude: parseFloat(lat), longitude: parseFloat(lon) });
    } else if (s && d) {
      setSelectedState(s);
      setSelectedDistrict(d);
      if (v) setSelectedVillage(v);
      runPrediction({ state: s, district: d, village: v || undefined });
    }
  }, [searchParams]);

  const fetchStates = async () => {
    try {
      const res = await riskApi.getStates();
      setStates(res.data.states || []);
    } catch (err) {
      console.error('Failed to fetch states:', err);
    }
  };

  const fetchAllDistricts = async () => {
    try {
      const res = await riskApi.getDistricts();
      const distList = res.data.districts || [];
      setAllDistricts(distList);
      if (!selectedState && distList.length > 0) {
        setDistricts(distList.map((d) => (typeof d === 'string' ? d : d.district)));
      }
    } catch (err) {
      console.error('Failed to fetch all districts:', err);
    }
  };

  const fetchDistricts = async (state) => {
    try {
      const res = await riskApi.getDistricts(state);
      const list = res.data.districts || [];
      setDistricts(list.map((d) => (typeof d === 'string' ? d : d.district)));
    } catch (err) {
      console.error('Failed to fetch districts for state:', err);
    }
  };

  const fetchVillagesList = async (district, state) => {
    setVillagesLoading(true);
    try {
      const res = await riskApi.getVillages(district, state);
      const vList = res.data.villages || [];
      const vDetails = res.data.details || [];
      setVillages(vList);
      setVillageDetails(vDetails);
    } catch (err) {
      console.error('Failed to fetch villages:', err);
      setVillages([]);
      setVillageDetails([]);
    } finally {
      setVillagesLoading(false);
    }
  };

  const fetchValleyTable = async () => {
    try {
      const res = await villageApi.getVillages();
      setValleyList(res.data.villages || []);
    } catch (err) {
      console.error('Failed to fetch village table:', err);
    }
  };

  const runPrediction = async (payload) => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setEvacuationPlan(null);
    setLoadingMessage(loadingSteps[0]);

    try {
      for (let i = 0; i < loadingSteps.length; i += 1) {
        setLoadingMessage(loadingSteps[i]);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      const res = await riskApi.predict(payload);
      const data = res.data;
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

      // Only calculate evacuation routes when the assessed area needs one.
      if (data?.prediction?.risk_level !== 'LOW' && data?.location?.latitude && data?.location?.longitude) {
        evacuationApi.getRoute({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          state: data.location.state || '',
          district: data.location.district || '',
          mode: 'driving'
        }).then(r => {
          if (r.data) setEvacuationPlan(r.data);
        }).catch(() => null);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze risk for the selected location.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleAnalyze = async () => {
    if (gpsCoords && !selectedDistrict) {
      await runPrediction({ latitude: gpsCoords.latitude, longitude: gpsCoords.longitude });
      return;
    }
    if (!selectedDistrict) return;
    const payload = {
      state: selectedState || undefined,
      district: selectedDistrict,
      village: selectedVillage || undefined
    };
    if (selectedVillage) {
      const vMatch = villageDetails.find(v => v.name === selectedVillage);
      if (vMatch && vMatch.lat && vMatch.lon) {
        payload.latitude = parseFloat(vMatch.lat);
        payload.longitude = parseFloat(vMatch.lon);
      }
    } else if (gpsCoords) {
      payload.latitude = gpsCoords.latitude;
      payload.longitude = gpsCoords.longitude;
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
        await runPrediction({ latitude: lat, longitude: lon });
      },
      (err) => {
        setGpsLoading(false);
        setError('Failed to acquire GPS location. Please allow browser location access.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleSelectFromTable = (v) => {
    setSelectedState(v.state || 'Himachal Pradesh');
    setSelectedDistrict(v.district);
    setSelectedVillage(v.name || '');
    if (v.lat && v.lon) {
      setGpsCoords({ latitude: parseFloat(v.lat), longitude: parseFloat(v.lon) });
    }
    runPrediction({
      state: v.state || 'Himachal Pradesh',
      district: v.district,
      village: v.name,
      latitude: v.lat ? parseFloat(v.lat) : undefined,
      longitude: v.lon ? parseFloat(v.lon) : undefined
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MODERATE': return '#eab308';
      case 'LOW': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const rainfallChartData = useMemo(() => {
    if (!prediction?.weather) return [];
    return [
      { label: '1h', value: Number(prediction.weather.rainfall_1h_mm ?? 0) },
      { label: '3h', value: Number(prediction.weather.rainfall_3h_mm ?? 0) },
      { label: '6h', value: Number(prediction.weather.rainfall_6h_mm ?? 0) },
      { label: '24h', value: Number(prediction.weather.rainfall_24h_mm ?? 0) }
    ];
  }, [prediction]);

  const maxRainfall = Math.max(...rainfallChartData.map((item) => item.value), 1);

  const filteredAndSortedVillages = useMemo(() => {
    return valleyList
      .filter(v => v.name?.toLowerCase().includes(tableSearch.toLowerCase()) || v.district?.toLowerCase().includes(tableSearch.toLowerCase()))
      .sort((a, b) => {
        let valA = a[sortField] ?? 0;
        let valB = b[sortField] ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [valleyList, tableSearch, sortField, sortOrder]);

  return (
    <div className="analytics-page-container">
      {/* Target Location Controls Panel */}
      <div className="location-control-panel panel">
        <div className="panel-title-row">
          <div className="title-group">
            <Compass size={20} className="icon-blue" />
            <h2>{t('villages_page.title')}</h2>
          </div>
          <button
            type="button"
            className={`gps-btn ${gpsCoords ? 'gps-active' : ''}`}
            onClick={handleDetectLocation}
            disabled={loading || gpsLoading}
          >
            <MapPin size={15} />
            <span>{gpsLoading ? t('villages_page.detecting_gps') : gpsCoords ? t('villages_page.gps_active') : t('villages_page.use_gps')}</span>
          </button>
        </div>

        <div className="selectors-grid">
          <div className="input-group">
            <label>{t('villages_page.state')}</label>
            <select
              value={selectedState}
              onChange={(e) => {
                const newState = e.target.value;
                setSelectedState(newState);
                setSelectedDistrict('');
                setSelectedVillage('');
                if (gpsCoords) setGpsCoords(null);
              }}
            >
              <option value="">{t('villages_page.select_state')}</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>{t('villages_page.district')}</label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                const dist = e.target.value;
                setSelectedDistrict(dist);
                setSelectedVillage('');
                if (gpsCoords) setGpsCoords(null);
                if (dist && !selectedState) {
                  const match = allDistricts.find(d => (typeof d === 'string' ? d === dist : d.district === dist));
                  if (match && typeof match !== 'string' && match.state) {
                    setSelectedState(match.state);
                  }
                }
              }}
            >
              <option value="">{t('villages_page.select_district')}</option>
              {selectedState ? (
                districts.map(d => <option key={d} value={d}>{d}</option>)
              ) : (
                allDistricts.map(d => {
                  const name = typeof d === 'string' ? d : d.district;
                  const st = typeof d === 'string' ? '' : d.state;
                  return <option key={`${name}-${st}`} value={name}>{name}{st ? ` (${st})` : ''}</option>;
                })
              )}
            </select>
          </div>

          <div className="input-group">
            <label>{t('villages_page.village')}</label>
            <select
              value={selectedVillage}
              onChange={(e) => {
                const vName = e.target.value;
                setSelectedVillage(vName);
                if (vName) {
                  const vMatch = villageDetails.find(v => v.name === vName);
                  if (vMatch && vMatch.lat && vMatch.lon) {
                    setGpsCoords({ latitude: parseFloat(vMatch.lat), longitude: parseFloat(vMatch.lon) });
                  }
                } else {
                  setGpsCoords(null);
                }
              }}
              disabled={!selectedDistrict || villagesLoading}
            >
              <option value="">
                {villagesLoading
                  ? 'Fetching settlements...'
                  : !selectedDistrict
                  ? `${t('villages_page.select_district')} first`
                  : t('villages_page.select_village')}
              </option>
              {villages.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="input-group action-group">
            <label>&nbsp;</label>
            <button
              type="button"
              className="btn-primary analyze-btn"
              onClick={handleAnalyze}
              disabled={loading || gpsLoading || (!gpsCoords && !selectedDistrict)}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="spinning" />
                  <span>{t('villages_page.processing')}</span>
                </>
              ) : (
                t('villages_page.run_analysis')
              )}
            </button>
          </div>
        </div>

        {error && <div className="error-banner"><AlertTriangle size={16} /><span>{error}</span></div>}

        {loading && (
          <div className="loading-stepper">
            <div className="spinner mini-spinner" />
            <span>{loadingMessage}</span>
          </div>
        )}
      </div>

      {/* Main Prediction Telemetry Section */}
      {prediction ? (
        <div className="analytics-results">
          {/* Dynamic Risk Banner */}
          <div
            className="risk-hero-banner"
            style={{
              background: `linear-gradient(135deg, ${getRiskColor(prediction.prediction.risk_level)}dd, rgba(15, 23, 42, 0.95))`
            }}
          >
            <div className="rh-left">
              <span className="rh-eyebrow">{t('villages_page.assessed_level')}</span>
              <h1>{prediction.prediction.risk_level} {t('villages_page.risk_suffix')}</h1>
              <p className="rh-location">
                📍 {prediction.location.village ? `${prediction.location.village}, ` : ''}{prediction.location.district}, {prediction.location.state}
                {prediction.location.latitude && ` (${prediction.location.latitude.toFixed(3)}°N, ${prediction.location.longitude.toFixed(3)}°E)`}
              </p>
            </div>

            <div className="rh-right">
              <div className="rh-score-card">
                <span className="sc-label">{t('metrics.risk_score')}</span>
                <span className="sc-value">{prediction.prediction.risk_score} / 100</span>
              </div>
              <div className="rh-meta">
                <span>{t('metrics.susceptibility')}: {prediction.prediction.susceptibility_percent}%</span>
                <span>{t('metrics.terrain')}: {prediction.terrain.hilly_region ? 'Hilly Region' : 'Plain'}</span>
                {prediction.evacuation?.lead_time_hours != null && (
                  <span>{t('metrics.lead_time')}: {prediction.evacuation.lead_time_hours} {t('dashboard.hrs')}</span>
                )}
              </div>
              {prediction.prediction.risk_level !== 'LOW' && (
                <button
                  className="rh-evac-btn"
                  onClick={() => navigate(`/evacuation?lat=${prediction.location.latitude}&lon=${prediction.location.longitude}&name=${encodeURIComponent(prediction.location.village || prediction.location.district)}&state=${encodeURIComponent(prediction.location.state)}&district=${encodeURIComponent(prediction.location.district)}&risk=${prediction.prediction.risk_level}`)}
                >
                  {t('villages_page.view_escape')} &rarr;
                </button>
              )}
            </div>
          </div>

          {/* Deep Telemetry Cards Grid */}
          <div className="telemetry-grid">
            {/* 1. Map & Route Visualizer */}
            <div className="telemetry-card panel map-card">
              <div className="card-header">
                <h3><MapPin size={18} className="icon-blue" /> Geospatial & Escape Map</h3>
                {prediction.prediction.risk_level !== 'LOW' && evacuationPlan?.shelter && (
                  <span className="badge-shelter">
                    🛡️ {t('evacuation_page.target_shelter')}: {evacuationPlan.shelter.name?.split(' ')[0]} ({evacuationPlan.safe_route?.distance_km}km)
                  </span>
                )}
              </div>
              <div className="card-map-wrap">
                <MapComponent
                  latitude={prediction.location.latitude}
                  longitude={prediction.location.longitude}
                  riskLevel={prediction.prediction.risk_level}
                  districtName={prediction.location.village || prediction.location.district}
                  evacuationPlan={prediction.prediction.risk_level === 'LOW' ? null : evacuationPlan}
                  height="340px"
                />
              </div>
            </div>

            {/* 2. Weather & Accumulation Chart */}
            <div className="telemetry-card panel">
              <div className="card-header">
                <h3><CloudRain size={18} className="icon-blue" /> {t('villages_page.weather_header')}</h3>
                <span className="live-tag">Open-Meteo Synoptic</span>
              </div>
              <div className="stats-row-grid">
                <div><span>{t('metrics.temperature')}</span><strong>{prediction.weather.temperature_c ?? 0}°C</strong></div>
                <div><span>{t('metrics.humidity')}</span><strong>{prediction.weather.humidity_percent ?? 0}%</strong></div>
                <div><span>{t('metrics.current_rain')}</span><strong>{prediction.weather.rainfall_mm ?? 0} mm</strong></div>
                <div><span>{t('metrics.rain_24h')}</span><strong>{prediction.weather.rainfall_24h_mm ?? 0} mm</strong></div>
              </div>

              <div className="rainfall-bars-box">
                <span className="chart-label">Precipitation Accumulation (1h / 3h / 6h / 24h)</span>
                <div className="bar-chart-flex">
                  {rainfallChartData.map((item) => (
                    <div key={item.label} className="bar-col">
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ height: `${Math.max(8, (item.value / maxRainfall) * 100)}%` }}
                        />
                      </div>
                      <span className="bar-val">{item.value}mm</span>
                      <span className="bar-lbl">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Terrain & Slope (SRTM) */}
            <div className="telemetry-card panel">
              <div className="card-header">
                <h3><Mountain size={18} className="icon-blue" /> {t('villages_page.topography_header')}</h3>
                <span className="live-tag">SRTM 90m</span>
              </div>
              <div className="stats-row-grid">
                <div><span>{t('metrics.elevation')}</span><strong>{prediction.terrain.elevation_m ?? 0} m</strong></div>
                <div><span>Relative Relief</span><strong>{prediction.terrain.relief_m ?? 0} m</strong></div>
                <div><span>{t('metrics.slope')}</span><strong>{prediction.terrain.slope_percent ?? 0}%</strong></div>
                <div><span>Max Slope</span><strong>{prediction.terrain.max_slope_percent ?? 0}%</strong></div>
              </div>
              <div className="insight-snippet">
                <p>
                  High steep slope gradients accelerate surface runoff velocity into valley floors, causing rapid cresting during high-intensity cloudbursts.
                </p>
              </div>
            </div>

            {/* 4. Hydrology & River Discharge */}
            <div className="telemetry-card panel">
              <div className="card-header">
                <h3><Droplets size={18} className="icon-blue" /> {t('villages_page.hydrology_header')}</h3>
                <span className="live-tag">{prediction.hydrology.model_name || 'GloFAS v4'}</span>
              </div>
              <div className="stats-row-grid">
                <div><span>{t('metrics.discharge')}</span><strong>{prediction.hydrology.river_discharge ?? 0} m³/s</strong></div>
                <div><span>Ensemble Mean</span><strong>{prediction.hydrology.discharge_mean ?? prediction.hydrology.river_discharge ?? 0} m³/s</strong></div>
                <div><span>75th Percentile</span><strong>{prediction.hydrology.discharge_p75 ?? 0} m³/s</strong></div>
                <div><span>{t('metrics.water_stage')}</span><strong>{prediction.hydrology.water_level ?? 0} m</strong></div>
              </div>
              <div className="insight-snippet">
                <strong>Model Reasoning:</strong>
                <p>{prediction.hydrology.reason || 'Telemetry integrated from live hydrological gauge stations.'}</p>
              </div>
            </div>

            {/* 5. GloFAS 30-Day Discharge Chart */}
            {prediction.hydrology?.time_series && (
              <div className="telemetry-card panel full-width-card">
                <div className="card-header">
                  <h3><Droplets size={18} className="icon-blue" /> GloFAS 30-Day Ensemble Forecast</h3>
                  <span className="live-tag">Station: {prediction.hydrology.station || 'Regional Station'}</span>
                </div>
                <GloFASChart
                  timeSeries={prediction.hydrology.time_series}
                  stationName={prediction.hydrology.station}
                  modelName={prediction.hydrology.model_name || 'GloFAS v4 Seamless'}
                />
              </div>
            )}

            {/* 6. Soil Composition */}
            <div className="telemetry-card panel">
              <div className="card-header">
                <h3><Layers size={18} className="icon-blue" /> {t('villages_page.soil_header')}</h3>
                <span className="live-tag">ISRIC SoilGrids</span>
              </div>
              <div className="stats-row-grid">
                <div><span>Clay Content</span><strong>{prediction.soil.clay_percent ?? 0}%</strong></div>
                <div><span>Sand Content</span><strong>{prediction.soil.sand_percent ?? 0}%</strong></div>
                <div><span>Silt Content</span><strong>{prediction.soil.silt_percent ?? 0}%</strong></div>
              </div>
            </div>

            {/* 7. Historical Baseline (1950-2024) */}
            <div className="telemetry-card panel">
              <div className="card-header">
                <h3><History size={18} className="icon-blue" /> {t('villages_page.history_header')}</h3>
                <span className="live-tag">Disaster Catalog</span>
              </div>
              <div className="stats-row-grid">
                <div><span>Past Flood Events</span><strong>{prediction.historical.flood_events ?? 0}</strong></div>
                <div><span>Fatalities</span><strong>{prediction.historical.fatalities ?? 0}</strong></div>
                <div><span>Displaced</span><strong>{prediction.historical.displaced ?? 0}</strong></div>
                <div><span>Max Severity</span><strong>{prediction.historical.max_severity ?? 0}</strong></div>
              </div>
            </div>

            {/* 8. NDRF Control & Emergency Hotline */}
            <div className="telemetry-card panel full-width-card ndrf-telemetry-card">
              <div className="card-header">
                <h3><ShieldAlert size={18} color="#ef4444" /> {t('villages_page.ndrf_header')}</h3>
                <span className="badge critical">16 Battalions Active</span>
              </div>
              <p className="ndrf-text">
                {t('ndrf.desc')}
              </p>
              <div className="ndrf-hotlines-row">
                <div><span>{t('ndrf.tollfree')}</span><strong>1078 / 112</strong></div>
                <div><span>{t('ndrf.helpline')}</span><strong>+91-9711077372</strong></div>
                <div><span>{t('ndrf.seoc')}</span><strong>1070</strong></div>
                <div><span>{t('ndrf.hq')}</span><strong>011-23438091</strong></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-analytics panel">
          <MapPin size={42} className="icon-blue" />
          <h3>{t('villages_page.empty_title')}</h3>
          <p>
            {t('villages_page.empty_desc')}
          </p>
        </div>
      )}

      {/* Monitored Valleys & Checkpoints Table */}
      <div className="table-section">
        <div className="section-header">
          <h2>{t('villages_page.table_title')}</h2>
          <p>{t('villages_page.table_subtitle')}</p>
        </div>

        <div className="toolbar panel">
          <div className="search-box">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search village, district, state or river basin..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>
          <span className="count-tag">{filteredAndSortedVillages.length} Monitored Settlements &amp; Valleys</span>
        </div>

        <div className="table-container panel">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => setSortField('name')}>{t('villages_page.th_valley')} <ArrowUpDown size={14} /></th>
                <th onClick={() => setSortField('district')}>{t('villages_page.th_district')} / State <ArrowUpDown size={14} /></th>
                <th onClick={() => setSortField('river_basin')}>River Basin <ArrowUpDown size={14} /></th>
                <th onClick={() => setSortField('risk_level')}>{t('villages_page.th_status')} <ArrowUpDown size={14} /></th>
                <th onClick={() => setSortField('risk_score')}>{t('villages_page.th_risk_score')} <ArrowUpDown size={14} /></th>
                <th onClick={() => setSortField('rainfall_24h_mm')}>{t('villages_page.th_24h_rain')} <ArrowUpDown size={14} /></th>
                <th>{t('villages_page.th_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedVillages.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">{t('villages_page.no_match')}</td>
                </tr>
              ) : (
                filteredAndSortedVillages.map((v, i) => (
                  <tr key={v.id || i}>
                    <td>
                      <div className="flex-align-center">
                        <Home size={16} className="text-muted mr-2" />
                        <strong>{v.name}</strong>
                      </div>
                      {v.lat && (
                        <small className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                          📍 {Number(v.lat).toFixed(3)}°N, {Number(v.lon).toFixed(3)}°E ({v.elevation_m || 1000}m)
                        </small>
                      )}
                    </td>
                    <td>
                      <div><strong>{v.district}</strong></div>
                      <small className="text-muted">{v.state}</small>
                    </td>
                    <td><span className="badge neutral">{v.river_basin || 'Mountain Catchment'}</span></td>
                    <td>
                      <span className={`badge ${v.risk_level?.toLowerCase() || 'low'}`}>
                        {v.risk_level || 'LOW'}
                      </span>
                    </td>
                    <td><strong style={{ color: getRiskColor(v.risk_level) }}>{v.risk_score || '0.0'}</strong></td>
                    <td>{v.rainfall_24h_mm || '0.0'} mm</td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary table-action-btn"
                        onClick={() => handleSelectFromTable(v)}
                      >
                        {t('villages_page.analyze_risk_btn')} &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


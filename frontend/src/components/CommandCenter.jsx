import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';


// Component to dynamically pan/zoom map
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Helpers for threat colors
const getThreatColor = (level) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'MODERATE': return '#eab308';
    case 'LOW': return '#10b981';
    default: return '#3b82f6';
  }
};

const getGaugeColor = (isDanger, currentStage, dangerLevel) => {
  if (isDanger || currentStage >= dangerLevel) return '#ef4444';
  if (currentStage >= dangerLevel * 0.8) return '#f97316';
  if (currentStage >= dangerLevel * 0.6) return '#eab308';
  return '#10b981';
};

// Basemap URL Configurations
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY || import.meta.env.VITE_MAP_API_KEY || '';
const BASEMAPS = {
  esri_dark: {
    name: 'Esri Dark Canvas (Clean GIS)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, USGS, GloFAS v4',
    maxZoom: 16
  },
  carto_dark: {
    name: 'Carto Dark Matter',
    url: CARTO_KEY 
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${CARTO_KEY}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; CARTO, OpenStreetMap contributors',
    maxZoom: 18
  },
  osm_dark: {
    name: 'OpenStreetMap (Filtered Dark)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    className: 'dark-gis-tiles',
    maxZoom: 19
  }
};

export default function CommandCenter({ apiBaseUrl, onSelectValley, onSwitchToDistrictView }) {
  const [threatData, setThreatData] = useState(null);
  const [riversData, setRiversData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedBasin, setSelectedBasin] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [mapCenter, setMapCenter] = useState([28.5, 84.0]);
  const [mapZoom, setMapZoom] = useState(6);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeBasemap, setActiveBasemap] = useState('esri_dark');

  // Fetch threat data & river vectors on mount
  useEffect(() => {
    fetchThreatOverview();
    fetchRivers();
  }, []);

  const fetchThreatOverview = async () => {
    try {
      setLoading(true);
      // Try gateway first, then FastAPI port 8000
      let res = await axios.get(`${apiBaseUrl}/api/overview/threats`).catch(() => null);
      if (!res?.data) {
        res = await axios.get(`http://localhost:8000/api/overview/threats`).catch(() => null);
      }
      if (!res?.data) {
        res = await axios.get(`http://localhost:8000/overview/threats`).catch(() => null);
      }
      
      if (res?.data) {
        setThreatData(res.data);
        if (res.data.isSimulated) {
          setIsSimulating(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch regional threat overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRivers = async () => {
    try {
      let res = await axios.get(`${apiBaseUrl}/api/overview/rivers`).catch(() => null);
      if (!res?.data?.basins) {
        res = await axios.get(`http://localhost:8000/api/overview/rivers`).catch(() => null);
      }
      if (!res?.data?.basins) {
        res = await axios.get(`http://localhost:8000/overview/rivers`).catch(() => null);
      }
      if (res?.data?.basins) {
        setRiversData(res.data.basins);
      }
    } catch (err) {
      console.error('Failed to fetch river vectors:', err);
    }
  };

  const handleSyncWeather = async () => {
    try {
      setSyncing(true);
      let res = await axios.post(`${apiBaseUrl}/api/overview/sync`).catch(() => null);
      if (!res?.data) {
        res = await axios.post(`http://localhost:8000/api/overview/sync`).catch(() => null);
      }
      if (res?.data?.threatCache) {
        setThreatData(res.data.threatCache);
        setIsSimulating(false);
      }
      await fetchRivers();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const { user } = useAuth();

  const handleToggleSimulation = async () => {
    try {
      setSyncing(true);
      const targetState = !isSimulating;
      const scenario = targetState ? 'CLOUDBURST' : 'RESET';
      
      const payload = {
        scenario,
        state: user?.state || 'Himachal Pradesh',
        district: user?.district || 'Kullu',
        phone: user?.phone || null,
        name: user?.name || 'Resident'
      };

      let res = await axios.post(`${apiBaseUrl}/api/overview/simulate`, payload).catch(() => null);
      if (!res?.data) {
        res = await axios.post(`http://localhost:8000/api/overview/simulate`, payload).catch(() => null);
      }

      if (res?.data?.threatCache) {
        setThreatData(res.data.threatCache);
        setIsSimulating(targetState);
      }
      await fetchRivers();

      if (targetState) {
        const topValley = res?.data?.threatCache?.valleys?.[0];
        if (topValley && topValley.lat && topValley.lon) {
          setMapCenter([topValley.lat, topValley.lon]);
          setMapZoom(10);
        } else {
          setMapCenter([31.7850, 77.2950]);
          setMapZoom(9);
        }
      }
    } catch (err) {
      console.error('Simulation toggle failed:', err);
    } finally {
      setSyncing(false);
    }
  };


  const handleFocusValley = (valley) => {
    setSelectedNode(valley);
    setMapCenter([valley.lat, valley.lon]);
    setMapZoom(10);
  };

  const handleDrillDown = (valley) => {
    if (onSelectValley) {
      onSelectValley({
        state: valley.state,
        district: valley.district,
        village: valley.name,
        latitude: valley.lat,
        longitude: valley.lon
      });
    }
  };

  // Filtered valleys
  const filteredValleys = useMemo(() => {
    if (!threatData?.valleys) return [];
    return threatData.valleys.filter((v) => {
      const matchesBasin = selectedBasin === 'ALL' || v.basin?.toLowerCase().includes(selectedBasin.replace('_basin', '').toLowerCase());
      const matchesSeverity = filterSeverity === 'ALL' || v.risk_level === filterSeverity;
      const matchesSearch = searchTerm === '' ||
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.state?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBasin && matchesSeverity && matchesSearch;
    });
  }, [threatData, selectedBasin, filterSeverity, searchTerm]);

  // Filtered rivers & gauges
  const visibleBasins = useMemo(() => {
    if (selectedBasin === 'ALL') return riversData;
    return riversData.filter((b) => b.id === selectedBasin);
  }, [riversData, selectedBasin]);

  const allGauges = useMemo(() => {
    const list = [];
    visibleBasins.forEach((basin) => {
      if (basin.gauge_nodes) {
        basin.gauge_nodes.forEach((g) => {
          list.push({ ...g, basin_name: basin.name, river_name: basin.river });
        });
      }
    });
    return list;
  }, [visibleBasins]);

  // Create Custom Leaflet DivIcon for Valley Wards
  const createValleyIcon = (valley) => {
    const color = getThreatColor(valley.risk_level);
    const isCritical = valley.risk_level === 'CRITICAL';
    const isSelected = selectedNode?.id === valley.id;

    return L.divIcon({
      className: 'valley-div-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${isCritical ? `<div style="
            position: absolute;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: ${color};
            opacity: 0.35;
            animation: pulse-ring 1.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          "></div>` : ''}
          <div style="
            width: ${isSelected ? '22px' : '18px'};
            height: ${isSelected ? '22px' : '18px'};
            background: ${color};
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.8);
            transition: transform 0.2s ease;
          "></div>
        </div>
      `
    });
  };

  // Create Custom Leaflet DivIcon for River Gauges
  const createGaugeIcon = (gauge) => {
    const color = getGaugeColor(gauge.is_danger, gauge.current_stage_m, gauge.danger_level);
    return L.divIcon({
      className: 'gauge-div-icon',
      iconSize: [84, 26],
      iconAnchor: [42, 13],
      popupAnchor: [0, -14],
      html: `
        <div style="
          background: rgba(15, 23, 42, 0.94);
          border: 1.5px solid ${color};
          border-radius: 12px;
          padding: 2px 8px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #f8fafc;
          font-family: monospace;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.7), 0 0 6px ${color}44;
          white-space: nowrap;
          cursor: pointer;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
          <span>${gauge.current_stage_m?.toFixed(1) || gauge.base_level}m</span>
        </div>
      `
    });
  };

  const criticalCount = threatData?.summary?.criticalCount ?? 0;
  const highCount = threatData?.summary?.highCount ?? 0;
  const criticalValleys = useMemo(() => {
    if (!threatData?.valleys) return [];
    return threatData.valleys.filter(v => v.risk_level === 'CRITICAL');
  }, [threatData]);

  const currentBasemap = BASEMAPS[activeBasemap] || BASEMAPS.esri_dark;

  return (
    <div className="command-center">
      {/* Top Banner Alert if Critical */}
      {criticalCount > 0 && (
        <div className="alert-marquee-banner">
          <div className="alert-tag">
            <span className="siren-icon">🚨</span> CRITICAL REGIONAL FLOOD ALERT
          </div>
          <div className="alert-text">
            <strong>{criticalCount} Valley{criticalCount > 1 ? 's' : ''} / Ward{criticalCount > 1 ? 's' : ''} exceeding flash flood thresholds!</strong>{' '}
            High-risk zones: {criticalValleys.map(v => v.name).join(', ')}. Evacuation of low-lying banks recommended.
          </div>
          <button 
            className="alert-action-btn"
            onClick={() => {
              if (criticalValleys.length > 0) handleFocusValley(criticalValleys[0]);
            }}
          >
            Inspect Flash Threat
          </button>
        </div>
      )}

      {/* Control Header */}
      <header className="cc-header">
        <div className="cc-title-area">
          <div className="cc-badge">AEGISHYDRO SIH EDITION</div>
          <h2>Regional GIS Command Center</h2>
          <span className="cc-subtitle">North-East & Himalayan River Basins Threat Matrix</span>
        </div>

        <div className="cc-controls-bar">
          {/* Basin selector */}
          <div className="basin-filter">
            <label>Basin:</label>
            <select 
              value={selectedBasin} 
              onChange={(e) => setSelectedBasin(e.target.value)}
              className="cc-select"
            >
              <option value="ALL">All Basins (5 Basins)</option>
              <option value="beas_basin">Beas River (HP)</option>
              <option value="alaknanda_basin">Alaknanda River (UK)</option>
              <option value="teesta_basin">Teesta River (Sikkim / WB)</option>
              <option value="brahmaputra_basin">Brahmaputra Valley (Assam)</option>
              <option value="barak_basin">Barak & Meghalaya Basins</option>
            </select>
          </div>

          {/* Sync Live Open-Meteo */}
          <button 
            className="cc-btn cc-btn-sync"
            onClick={handleSyncWeather}
            disabled={syncing}
            title="Fetches batched Open-Meteo telemetry for all 23 checkpoints"
          >
            {syncing ? 'Syncing Feeds...' : '🔄 Sync Live Weather (APIs)'}
          </button>

          {/* Disaster Simulation Mode */}
          <button 
            className={`cc-btn ${isSimulating ? 'cc-btn-sim-active' : 'cc-btn-sim'}`}
            onClick={handleToggleSimulation}
            disabled={syncing}
            title="Simulates an extreme Himalayan cloudburst scenario across all basins"
          >
            {isSimulating ? '🛑 Reset Baseline Weather' : '⚡ START DISASTER SIMULATION'}
          </button>

          {/* Switch to Precise District View */}
          <button 
            className="cc-btn cc-btn-switch"
            onClick={onSwitchToDistrictView}
          >
            📊 Precise District Analytics &rarr;
          </button>
        </div>
      </header>

      {/* Main Grid: GIS Map + Live Threat Sidebar */}
      <div className="cc-body">
        {/* Left: Interactive GIS Map */}
        <div className="cc-map-container">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ width: '100%', height: '100%', minHeight: '620px', background: '#090d16' }}
            scrollWheelZoom={true}
          >
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Clean Dark GIS Tiles (No Watermark!) */}
            <TileLayer
              key={activeBasemap}
              url={currentBasemap.url}
              attribution={currentBasemap.attribution}
              maxZoom={currentBasemap.maxZoom}
              className={currentBasemap.className || ''}
            />

            {/* River Basins Polylines */}
            {visibleBasins.map((basin) => (
              <Polyline
                key={basin.id}
                positions={basin.path}
                pathOptions={{
                  color: basin.id === 'beas_basin' ? '#38bdf8' : (basin.id === 'teesta_basin' ? '#34d399' : (basin.id === 'alaknanda_basin' ? '#818cf8' : '#38bdf8')),
                  weight: 4,
                  opacity: 0.85,
                  dashArray: '8, 4',
                  lineCap: 'round'
                }}
              >
                <Tooltip sticky>
                  <div className="map-tooltip">
                    <strong>🌊 {basin.river}</strong>
                    <div>Basin: {basin.name} ({basin.region})</div>
                  </div>
                </Tooltip>
              </Polyline>
            ))}

            {/* Gauge Station Markers */}
            {allGauges.map((gauge) => (
              <Marker
                key={gauge.id}
                position={[gauge.lat, gauge.lon]}
                icon={createGaugeIcon(gauge)}
              >
                <Popup className="cc-popup">
                  <div className="gauge-popup-card">
                    <div 
                      className="popup-badge" 
                      style={{ background: getGaugeColor(gauge.is_danger, gauge.current_stage_m, gauge.danger_level) }}
                    >
                      {gauge.current_stage_m >= gauge.danger_level ? 'GAUGE DANGER' : (gauge.current_stage_m >= gauge.danger_level * 0.8 ? 'GAUGE WARNING' : 'GAUGE NORMAL')}
                    </div>
                    <h4>{gauge.name}</h4>
                    <div className="popup-river">{gauge.river_name}</div>
                    
                    <div className="popup-stats-grid">
                      <div>
                        <span>Current Stage:</span>
                        <strong>{gauge.current_stage_m?.toFixed(2) || gauge.base_level} m</strong>
                      </div>
                      <div>
                        <span>Danger Mark:</span>
                        <strong>{gauge.danger_level.toFixed(2)} m</strong>
                      </div>
                      <div>
                        <span>Base Level:</span>
                        <strong>{gauge.base_level.toFixed(2)} m</strong>
                      </div>
                      <div>
                        <span>Basin:</span>
                        <strong>{gauge.basin_name?.split(' ')[0]}</strong>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Valley Threat Markers */}
            {filteredValleys.map((valley) => (
              <Marker
                key={valley.id}
                position={[valley.lat, valley.lon]}
                icon={createValleyIcon(valley)}
                eventHandlers={{
                  click: () => setSelectedNode(valley)
                }}
              >
                <Popup className="cc-popup">
                  <div className="valley-popup-card">
                    <div className="popup-header-row">
                      <span 
                        className="popup-threat-tag" 
                        style={{ background: getThreatColor(valley.risk_level) }}
                      >
                        {valley.risk_level} ({valley.risk_score}%)
                      </span>
                      <span className="popup-lead-time">⏱ {valley.lead_time_hours == null ? '--' : `${valley.lead_time_hours}h`} Lead</span>
                    </div>

                    <h3>{valley.name}</h3>
                    <p className="popup-sub">{valley.district}, {valley.state} ({valley.basin})</p>

                    <div className="popup-metrics-table">
                      <div className="metric-cell">
                        <span className="label">Current Rain</span>
                        <strong className="val">{valley.current_rainfall_mm ?? 0} mm</strong>
                      </div>
                      <div className="metric-cell">
                        <span className="label">24h Rain</span>
                        <strong className="val">{valley.rainfall_24h_mm ?? 0} mm</strong>
                      </div>
                      <div className="metric-cell">
                        <span className="label">Elevation / Slope</span>
                        <strong className="val">{valley.elevation}m / {valley.slope_deg}°</strong>
                      </div>
                      <div className="metric-cell">
                        <span className="label">River Stage</span>
                        <strong className="val">{valley.current_river_stage_m}m / {valley.danger_stage_m}m</strong>
                      </div>
                    </div>

                    <div className="popup-action-row">
                      <button
                        className="popup-drill-btn"
                        onClick={() => handleDrillDown(valley)}
                      >
                        🔬 Drill Down to Precise District Analytics &rarr;
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map Overlay Legend & Basemap Switcher */}
          <div className="map-legend">
            <div className="legend-header-row">
              <h4>GIS Threat Legend</h4>
              <select 
                className="basemap-selector"
                value={activeBasemap}
                onChange={(e) => setActiveBasemap(e.target.value)}
                title="Change Basemap Style"
              >
                <option value="esri_dark">Esri Dark GIS (Clean)</option>
                <option value="carto_dark">Carto Dark Matter</option>
                <option value="osm_dark">OpenStreetMap Dark</option>
              </select>
            </div>
            <div className="legend-items">
              <div className="legend-item"><span className="dot dot-critical"></span> Critical (&gt;75%)</div>
              <div className="legend-item"><span className="dot dot-high"></span> High (50-75%)</div>
              <div className="legend-item"><span className="dot dot-moderate"></span> Moderate (25-50%)</div>
              <div className="legend-item"><span className="dot dot-low"></span> Normal (&lt;25%)</div>
              <div className="legend-item"><span className="pill-gauge">2.3m</span> River Gauge</div>
              <div className="legend-item"><span className="river-line"></span> Basin Flow Polyline</div>
            </div>
          </div>
        </div>

        {/* Right: Live Wards Threat Monitor Sidebar */}
        <aside className="cc-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <h3>LIVE WARDS THREAT MONITOR</h3>
              <span className="pulse-indicator">● LIVE</span>
            </div>
            <p className="sidebar-desc">Real-time ranking of 23 high-risk Himalayan & NE catchments</p>

            {/* Severity filter pills */}
            <div className="severity-tabs">
              {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map((lvl) => (
                <button
                  key={lvl}
                  className={`sev-tab ${filterSeverity === lvl ? 'active' : ''}`}
                  onClick={() => setFilterSeverity(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Search valley, district or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Scrollable Valley Threat Cards */}
          <div className="threat-cards-list">
            {loading ? (
              <div className="sidebar-loading">
                <div className="spinner mini-spinner" />
                <span>Aggregating regional telemetry...</span>
              </div>
            ) : filteredValleys.length === 0 ? (
              <div className="sidebar-empty">
                <p>No valleys matching criteria.</p>
                <button 
                  className="btn-sync-retry"
                  onClick={handleSyncWeather}
                >
                  🔄 Refresh Data
                </button>
              </div>
            ) : (
              filteredValleys.map((valley, index) => {
                const isSelected = selectedNode?.id === valley.id;
                const threatColor = getThreatColor(valley.risk_level);

                return (
                  <div
                    key={valley.id}
                    className={`threat-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFocusValley(valley)}
                  >
                    <div className="threat-card-top">
                      <div className="card-rank">#{index + 1}</div>
                      <div className="card-title-group">
                        <h4 className="card-valley-name">{valley.name}</h4>
                        <span className="card-district-state">{valley.district}, {valley.state}</span>
                      </div>
                      <div
                        className="card-threat-badge"
                        style={{ background: threatColor }}
                      >
                        {valley.risk_level}
                      </div>
                    </div>

                    <div className="threat-bar-wrap">
                      <div className="threat-bar-label">
                        <span>Threat Index</span>
                        <strong>{valley.risk_score}%</strong>
                      </div>
                      <div className="threat-progress-track">
                        <div
                          className="threat-progress-fill"
                          style={{
                            width: `${Math.min(100, valley.risk_score)}%`,
                            background: threatColor
                          }}
                        />
                      </div>
                    </div>

                    <div className="card-meta-chips">
                      <span className="chip chip-time">⏱ Lead: {valley.lead_time_hours == null ? '--' : `${valley.lead_time_hours}h`}</span>
                      <span className="chip chip-rain">🌧 24h: {valley.rainfall_24h_mm}mm</span>
                      <span className="chip chip-basin">🌊 {valley.basin}</span>
                    </div>

                    <div className="card-action-row">
                      <button
                        className="btn-locate"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFocusValley(valley);
                        }}
                      >
                        🎯 Focus Map
                      </button>
                      <button
                        className="btn-analyze"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDrillDown(valley);
                        }}
                      >
                        🔬 Analyze District &rarr;
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Telemetry Footer */}
      <footer className="cc-footer">
        <div className="telemetry-item">
          <span className="t-label">Monitored Basins:</span>
          <strong>5 Active (HP, UK, Sikkim, Assam, Meghalaya)</strong>
        </div>
        <div className="telemetry-item">
          <span className="t-label">Telemetry Gauges:</span>
          <strong>22 Real-time Stations</strong>
        </div>
        <div className="telemetry-item">
          <span className="t-label">Critical Alerts:</span>
          <strong style={{ color: criticalCount > 0 ? '#ef4444' : '#10b981' }}>
            {criticalCount} Critical ({highCount} High)
          </strong>
        </div>
        <div className="telemetry-item">
          <span className="t-label">Gateway Cache:</span>
          <strong>{threatData?.lastSync ? new Date(threatData.lastSync).toLocaleTimeString() : 'Active'}</strong>
        </div>
        <div className="telemetry-item">
          <span className="t-label">Hydrology Engine:</span>
          <strong>GloFAS v4 Seamless Ensemble</strong>
        </div>
      </footer>
    </div>
  );
}

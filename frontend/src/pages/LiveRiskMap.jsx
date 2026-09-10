import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { riskApi } from '../api/client';
import { X, Navigation, AlertTriangle, Droplets, Map as MapIcon, ChevronRight, CloudRain, Zap, RefreshCw, Layers, Search, ShieldAlert, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './LiveRiskMap.css';

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

const BASEMAP_TILES = {
  osm: {
    name: 'OpenStreetMap (Standard)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  esri_topo: {
    name: 'Esri World Topographic',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, USGS, NOAA'
  },
  esri_dark: {
    name: 'Esri Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, USGS'
  },
  esri_satellite: {
    name: 'Esri Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  }
};


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

const createValleyIcon = (valley, isSelected) => {
  const color = getThreatColor(valley.risk_level);
  const isCritical = valley.risk_level === 'CRITICAL';

  return L.divIcon({
    className: 'valley-div-icon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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
          width: ${isSelected ? '24px' : '18px'};
          height: ${isSelected ? '24px' : '18px'};
          background: ${color};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.2);
          transition: transform 0.2s ease;
        "></div>
      </div>
    `
  });
};

const createGaugeIcon = (gauge) => {
  const color = getGaugeColor(gauge.is_danger, gauge.current_stage_m, gauge.danger_level);
  return L.divIcon({
    className: 'gauge-div-icon',
    iconSize: [84, 26],
    iconAnchor: [42, 13],
    html: `
      <div style="
        background: #ffffff;
        border: 1.5px solid ${color};
        border-radius: 12px;
        padding: 2px 8px;
        display: flex;
        align-items: center;
        gap: 5px;
        color: #0f172a;
        font-family: monospace;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        white-space: nowrap;
      ">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
        <span>${gauge.current_stage_m?.toFixed(1) || gauge.base_level}m</span>
      </div>
    `
  });
};

export default function LiveRiskMap() {
  const navigate = useNavigate();
  const [threatData, setThreatData] = useState(null);
  const [riversData, setRiversData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mapCenter, setMapCenter] = useState([31.8, 77.2]);
  const [mapZoom, setMapZoom] = useState(8);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeBasemap, setActiveBasemap] = useState('osm');
  const [selectedBasin, setSelectedBasin] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [threats, rivers] = await Promise.all([
        riskApi.getThreats(),
        riskApi.getRivers()
      ]);
      setThreatData(threats.data);
      setRiversData(rivers.data.basins || []);
      if (threats.data?.isSimulated) {
        setIsSimulating(true);
      }
    } catch (err) {
      console.error('Failed to fetch map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSimulation = async () => {
    try {
      setSyncing(true);
      if (isSimulating) {
        const res = await riskApi.simulate('RESET');
        if (res.data?.threatCache) {
          setThreatData(res.data.threatCache);
        }
        setIsSimulating(false);
      } else {
        const res = await riskApi.simulate('CLOUDBURST_SAINJ');
        if (res.data?.threatCache) {
          setThreatData(res.data.threatCache);
        }
        setIsSimulating(true);
        // Pan to Sainj Valley
        setMapCenter([31.76, 77.34]);
        setMapZoom(11);
      }
    } catch (err) {
      console.error('Simulation toggle failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const res = await riskApi.sync();
      if (res.data?.threatCache) {
        setThreatData(res.data.threatCache);
      }
      setIsSimulating(false);
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkerClick = (valley) => {
    setSelectedNode(valley);
    setMapCenter([valley.lat, valley.lon]);
    setMapZoom(11);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const allGauges = useMemo(() => {
    const list = [];
    riversData.forEach(basin => {
      if (basin.gauge_nodes) {
        basin.gauge_nodes.forEach(g => list.push({ ...g, basin_name: basin.name, basin_id: basin.id }));
      }
    });
    return list;
  }, [riversData]);

  const filteredValleys = useMemo(() => {
    let list = threatData?.valleys || [];
    if (selectedBasin !== 'ALL') {
      list = list.filter(v => v.basin === selectedBasin || v.basin_id === selectedBasin);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(v => v.name.toLowerCase().includes(q) || v.district.toLowerCase().includes(q));
    }
    return list;
  }, [threatData, selectedBasin, searchTerm]);

  return (
    <div className="map-page-wrapper">
      {/* Top Map Action & Filter Bar */}
      <div className="map-controls-bar">
        <div className="bar-group-left">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search valley or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={selectedBasin}
            onChange={(e) => setSelectedBasin(e.target.value)}
            className="basin-select"
          >
            <option value="ALL">All River Basins</option>
            {riversData.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={activeBasemap}
            onChange={(e) => setActiveBasemap(e.target.value)}
            className="basemap-select"
          >
            <option value="osm">🗺️ OpenStreetMap</option>
            <option value="esri_topo">🏔️ Esri Topographic (Hilly / Terrain)</option>
            <option value="esri_dark">🌑 Esri Dark Canvas</option>
            <option value="esri_satellite">🛰️ Esri Satellite</option>
          </select>

        </div>

        <div className="bar-group-right">
          <button
            type="button"
            className={`btn-sim ${isSimulating ? 'sim-active' : ''}`}
            onClick={handleToggleSimulation}
            disabled={syncing}
            title="Simulate sudden cloudburst & flash flood at Sainj Valley"
          >
            <Zap size={15} />
            <span>{isSimulating ? 'Reset Simulation' : '⚡ Simulate Cloudburst'}</span>
          </button>

          <button
            type="button"
            className="btn-sync"
            onClick={handleManualSync}
            disabled={syncing}
            title="Fetch live synoptic streams"
          >
            <RefreshCw size={15} className={syncing ? 'spinning' : ''} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* Critical Alert Bar if simulation or live risk is critical */}
      {threatData?.criticalAlert && (
        <div className="map-critical-banner">
          <div className="mcb-icon"><AlertTriangle size={18} /></div>
          <div className="mcb-text">
            <strong>{threatData.criticalAlert.title}</strong> — {threatData.criticalAlert.action}
          </div>
          <button
            className="mcb-btn"
            onClick={() => {
              const val = threatData.valleys?.[0];
              if (val) {
                navigate(`/evacuation?lat=${val.lat}&lon=${val.lon}&name=${encodeURIComponent(val.name)}`);
              }
            }}
          >
            Evacuate Now &rarr;
          </button>
        </div>
      )}

      {/* Main Map Canvas */}
      <div className="map-page-container">
        <div className="map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="leaflet-map"
            zoomControl={false}
          >
            <MapController center={mapCenter} zoom={mapZoom} />

            <TileLayer
              url={BASEMAP_TILES[activeBasemap]?.url || BASEMAP_TILES.voyager.url}
              attribution={BASEMAP_TILES[activeBasemap]?.attribution || BASEMAP_TILES.voyager.attribution}
            />

            {riversData.map(basin => (
              <Polyline
                key={basin.id}
                positions={basin.path}
                pathOptions={{
                  color: basin.id === 'beas_basin' && isSimulating ? '#ef4444' : '#0ea5e9',
                  weight: basin.id === 'beas_basin' && isSimulating ? 5 : 3.5,
                  opacity: 0.75
                }}
              >
                <Tooltip sticky>{basin.name}</Tooltip>
              </Polyline>
            ))}

            {allGauges.map(gauge => (
              <Marker key={gauge.id} position={[gauge.lat, gauge.lon]} icon={createGaugeIcon(gauge)} />
            ))}

            {filteredValleys.map(valley => (
              <Marker
                key={valley.id}
                position={[valley.lat, valley.lon]}
                icon={createValleyIcon(valley, selectedNode?.id === valley.id)}
                eventHandlers={{ click: () => handleMarkerClick(valley) }}
              />
            ))}
          </MapContainer>

          {/* Map Overlays */}
          <div className="map-legend">
            <h4>Risk Legend</h4>
            <div className="legend-item"><span className="dot" style={{ background: '#ef4444' }} /> Critical (Score &ge; 75)</div>
            <div className="legend-item"><span className="dot" style={{ background: '#f97316' }} /> High (Score 55-74)</div>
            <div className="legend-item"><span className="dot" style={{ background: '#eab308' }} /> Moderate (Score 30-54)</div>
            <div className="legend-item"><span className="dot" style={{ background: '#10b981' }} /> Low (Score &lt; 30)</div>
          </div>
        </div>

        {/* Detail Drawer overlay */}
        <div className={`village-drawer ${isDrawerOpen ? 'open' : ''}`}>
          {selectedNode && (
            <div className="drawer-content">
              <button className="close-drawer-btn" onClick={closeDrawer}><X size={20} /></button>
              <div className="drawer-header">
                <span className={`badge ${selectedNode.risk_level.toLowerCase()}`}>
                  {selectedNode.risk_level} RISK
                </span>
                <h2>{selectedNode.name}</h2>
                <p className="subtitle-text">{selectedNode.district}, {selectedNode.state}</p>
              </div>

              <div className="drawer-stats">
                <div className="stat-card">
                  <span>Risk Score</span>
                  <strong style={{ color: getThreatColor(selectedNode.risk_level) }}>{selectedNode.risk_score} / 100</strong>
                </div>
                <div className="stat-card">
                  <span>Lead Time</span>
                  <strong>{selectedNode.lead_time_hours} hrs</strong>
                </div>
              </div>

              <div className="drawer-section">
                <h3><CloudRain size={16} /> Precipitation & Soil</h3>
                <div className="grid-2">
                  <div><span>Current Rain</span> <strong>{selectedNode.current_rainfall_mm} mm</strong></div>
                  <div><span>24h Accumulation</span> <strong>{selectedNode.rainfall_24h_mm} mm</strong></div>
                  <div><span>Valley Slope</span> <strong>{selectedNode.slope_deg || 28}°</strong></div>
                  <div><span>Elevation</span> <strong>{selectedNode.elevation_m || 1420} m</strong></div>
                </div>
              </div>

              <div className="drawer-section">
                <h3><Droplets size={16} /> Hydrology & River Stage</h3>
                <div className="grid-2">
                  <div><span>Current River Stage</span> <strong>{selectedNode.current_river_stage_m} m</strong></div>
                  <div><span>Danger Level</span> <strong>{selectedNode.danger_stage_m} m</strong></div>
                  <div><span>Status</span> <strong style={{ color: selectedNode.is_above_danger ? '#ef4444' : '#10b981' }}>{selectedNode.is_above_danger ? 'ABOVE DANGER' : 'Safe Headroom'}</strong></div>
                  <div><span>Basin Node</span> <strong>{selectedNode.basin || 'Beas Upper'}</strong></div>
                </div>
              </div>

              <div className="drawer-actions">
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/villages?state=${encodeURIComponent(selectedNode.state || '')}&district=${encodeURIComponent(selectedNode.district || '')}&village=${encodeURIComponent(selectedNode.name || '')}`)}
                >
                  Deep ML Risk Analysis &rarr;
                </button>
                <button
                  className="btn-outline"
                  onClick={() => navigate(`/forecast?state=${encodeURIComponent(selectedNode.state || '')}&district=${encodeURIComponent(selectedNode.district || '')}&village=${encodeURIComponent(selectedNode.name || '')}&lat=${selectedNode.lat}&lon=${selectedNode.lon}`)}
                >
                  GloFAS 30-Day Forecast &rarr;
                </button>
                <button
                  className="btn-outline evac-btn"
                  onClick={() => navigate(`/evacuation?lat=${selectedNode.lat}&lon=${selectedNode.lon}&name=${encodeURIComponent(selectedNode.name)}&state=${encodeURIComponent(selectedNode.state || '')}&district=${encodeURIComponent(selectedNode.district || '')}`)}
                >
                  🚨 Safest Evacuation Route &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


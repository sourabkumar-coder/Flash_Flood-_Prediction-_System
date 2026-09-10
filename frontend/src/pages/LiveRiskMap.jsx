import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { riskApi } from '../api/client';
import { X, Navigation, AlertTriangle, Droplets, Map as MapIcon, ChevronRight, CloudRain } from 'lucide-react';
import './LiveRiskMap.css';

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

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
  const [threatData, setThreatData] = useState(null);
  const [riversData, setRiversData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.5, 84.0]);
  const [mapZoom, setMapZoom] = useState(6);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      setRiversData(rivers.data.basins);
    } catch (err) {
      console.error('Failed to fetch map data:', err);
    } finally {
      setLoading(false);
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
        basin.gauge_nodes.forEach(g => list.push({ ...g, basin_name: basin.name }));
      }
    });
    return list;
  }, [riversData]);

  const valleys = threatData?.valleys || [];

  return (
    <div className="map-page-container">
      <div className="map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="leaflet-map"
          zoomControl={false}
        >
          <MapController center={mapCenter} zoom={mapZoom} />
          {/* Use a bright, professional basemap instead of dark mode */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {riversData.map(basin => (
            <Polyline
              key={basin.id}
              positions={basin.path}
              pathOptions={{ color: '#0ea5e9', weight: 3, opacity: 0.6 }}
            />
          ))}

          {allGauges.map(gauge => (
            <Marker key={gauge.id} position={[gauge.lat, gauge.lon]} icon={createGaugeIcon(gauge)} />
          ))}

          {valleys.map(valley => (
            <Marker
              key={valley.id}
              position={[valley.lat, valley.lon]}
              icon={createValleyIcon(valley, selectedNode?.id === valley.id)}
              eventHandlers={{ click: () => handleMarkerClick(valley) }}
            />
          ))}
        </MapContainer>

        {/* Map Overlays */}
        <div className="map-legend liquid-glass">
          <h4>Legend</h4>
          <div className="legend-item"><span className="dot" style={{background: '#ef4444'}}/> Critical</div>
          <div className="legend-item"><span className="dot" style={{background: '#f97316'}}/> High</div>
          <div className="legend-item"><span className="dot" style={{background: '#eab308'}}/> Moderate</div>
          <div className="legend-item"><span className="dot" style={{background: '#10b981'}}/> Low</div>
        </div>
      </div>

      {/* Detail Drawer overlay instead of navigating away */}
      <div className={`village-drawer ${isDrawerOpen ? 'open' : ''}`}>
        {selectedNode && (
          <div className="drawer-content">
            <button className="close-drawer-btn" onClick={closeDrawer}><X size={20} /></button>
            <div className="drawer-header">
              <span className={`badge ${selectedNode.risk_level.toLowerCase()}`}>
                {selectedNode.risk_level}
              </span>
              <h2>{selectedNode.name}</h2>
              <p className="subtitle-text">{selectedNode.district}, {selectedNode.state}</p>
            </div>

            <div className="drawer-stats">
              <div className="stat-card">
                <span>Risk Score</span>
                <strong>{selectedNode.risk_score}</strong>
              </div>
              <div className="stat-card">
                <span>Lead Time</span>
                <strong>{selectedNode.lead_time_hours} hrs</strong>
              </div>
            </div>

            <div className="drawer-section">
              <h3><CloudRain size={16} /> Environmental</h3>
              <div className="grid-2">
                <div><span>Current Rain</span> <strong>{selectedNode.current_rainfall_mm} mm</strong></div>
                <div><span>24h Rain</span> <strong>{selectedNode.rainfall_24h_mm} mm</strong></div>
                <div><span>Soil Moisture</span> <strong>76%</strong></div>
              </div>
            </div>

            <div className="drawer-section">
              <h3><Droplets size={16} /> Hydrology</h3>
              <div className="grid-2">
                <div><span>River Stage</span> <strong>{selectedNode.current_river_stage_m} m</strong></div>
                <div><span>Danger Mark</span> <strong>{selectedNode.danger_stage_m} m</strong></div>
              </div>
            </div>

            <div className="drawer-actions">
              <button className="btn-primary" onClick={() => window.location.href='/forecast'}>
                View Detailed Forecast
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

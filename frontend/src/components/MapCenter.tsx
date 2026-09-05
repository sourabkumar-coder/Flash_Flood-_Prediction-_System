import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Activity,
  Droplets,
  ChevronRight,
  Eye
} from 'lucide-react';
import type { VillageGeoJSON, IoTSensor, VillageProperties, RiskLevel } from '../types';

interface MapCenterProps {
  villages: VillageGeoJSON | null;
  sensors: IoTSensor[];
  selectedVillageId: string | null;
  onSelectVillage: (id: string) => void;
  onOpenXAI: (id: string) => void;
}

export const MapCenter: React.FC<MapCenterProps> = ({
  villages,
  sensors,
  selectedVillageId,
  onSelectVillage,
  onOpenXAI
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const sensorLayerRef = useRef<L.LayerGroup | null>(null);
  const riverLayerRef = useRef<L.LayerGroup | null>(null);

  const [showSensors, setShowSensors] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [basemapType, setBasemapType] = useState<'dark' | 'satellite' | 'topo'>('dark');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Selected village detail for floating card
  const selectedVillage = villages?.features.find(f => f.id === selectedVillageId)?.properties;

  const getRiskColor = (level: RiskLevel): string => {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MODERATE': return '#eab308';
      case 'LOW': default: return '#10b981';
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [31.86, 77.15],
      zoom: 10,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Tile Layer
    const tile = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> | SRTM DEM',
      maxZoom: 16
    }).addTo(map);
    tileLayerRef.current = tile;

    sensorLayerRef.current = L.layerGroup().addTo(map);
    riverLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Basemap Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    let url = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    let maxZ = 16;

    if (basemapType === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZ = 18;
    } else if (basemapType === 'topo') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZ = 18;
    }

    const tile = L.tileLayer(url, {
      attribution: '&copy; OpenStreetMap / ESRI GIS',
      maxZoom: maxZ
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = tile;
  }, [basemapType]);

  // Update Village GeoJSON Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !villages) return;

    if (geojsonLayerRef.current) {
      geojsonLayerRef.current.remove();
    }

    const geoLayer = L.geoJSON(villages as any, {
      style: (feature: any) => {
        const p: VillageProperties = feature.properties;
        const color = getRiskColor(p.risk_level);
        const isSelected = p.id === selectedVillageId;
        const isCritical = p.risk_level === 'CRITICAL';

        return {
          fillColor: color,
          fillOpacity: isCritical ? 0.65 : (isSelected ? 0.55 : 0.40),
          weight: isSelected ? 3 : (isCritical ? 2.5 : 1.5),
          color: isSelected ? '#38bdf8' : (isCritical ? '#ff3b30' : color),
          dashArray: isSelected ? '4, 4' : undefined
        };
      },
      onEachFeature: (feature: any, layer: L.Layer) => {
        const p: VillageProperties = feature.properties;
        
        layer.on({
          click: () => {
            onSelectVillage(p.id);
          },
          mouseover: (e: any) => {
            const l = e.target;
            l.setStyle({ fillOpacity: 0.75, weight: 3 });
          },
          mouseout: (e: any) => {
            geoLayer.resetStyle(e.target);
          }
        });

        layer.bindTooltip(`
          <div class="px-2 py-1 text-xs font-sans">
            <div class="font-bold text-slate-100">${p.name}</div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="font-semibold" style="color:${getRiskColor(p.risk_level)}">${p.risk_level} (${p.risk_score}/100)</span>
              <span class="text-slate-400">| Lead: ${p.lead_time_hrs}h</span>
            </div>
          </div>
        `, { sticky: true, className: 'bg-slate-900/90 text-white border border-slate-700 rounded shadow-lg' });
      }
    }).addTo(mapInstanceRef.current);

    geojsonLayerRef.current = geoLayer;
  }, [villages, selectedVillageId, onSelectVillage]);

  // Update River Polylines
  useEffect(() => {
    if (!mapInstanceRef.current || !riverLayerRef.current) return;
    riverLayerRef.current.clearLayers();

    if (!showRivers) return;

    const riverPaths = [
      [[32.250, 77.188], [32.220, 77.184], [32.140, 77.165], [32.060, 77.140], [31.980, 77.110], [31.950, 77.108]],
      [[31.950, 77.108], [31.910, 77.125], [31.875, 77.152], [31.820, 77.170], [31.745, 77.205]],
      [[31.745, 77.205], [31.710, 77.150], [31.680, 77.080], [31.670, 77.001], [31.690, 76.960], [31.708, 76.932]],
      [[32.010, 77.310], [31.950, 77.250], [31.900, 77.190], [31.875, 77.152]],
      [[31.640, 77.345], [31.690, 77.280], [31.720, 77.220], [31.745, 77.205]]
    ];

    riverPaths.forEach(coords => {
      L.polyline(coords as any, {
        color: '#0284c7',
        weight: 6,
        opacity: 0.4
      }).addTo(riverLayerRef.current!);

      L.polyline(coords as any, {
        color: '#38bdf8',
        weight: 3,
        opacity: 0.9,
        dashArray: '8, 6'
      }).addTo(riverLayerRef.current!);
    });
  }, [showRivers]);

  // Update IoT Sensor Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !sensorLayerRef.current) return;
    sensorLayerRef.current.clearLayers();

    if (!showSensors) return;

    sensors.forEach(sensor => {
      const statusColor = sensor.status === 'ONLINE' ? '#10b981' : (sensor.status === 'DEGRADED' ? '#f59e0b' : '#ef4444');
      
      const customIcon = L.divIcon({
        className: 'custom-sensor-icon',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-60" style="background-color:${statusColor}"></span>
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 border-2 shadow-lg text-[10px] font-bold text-white font-mono" style="border-color:${statusColor}">
              ${sensor.current_stage_m.toFixed(1)}m
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([sensor.lat, sensor.lon], { icon: customIcon });
      marker.bindPopup(`
        <div class="p-2 text-xs font-sans bg-slate-900 text-slate-100 rounded">
          <div class="font-bold text-cyan-400 mb-1">${sensor.name}</div>
          <div class="text-[11px] text-slate-300 mb-2">${sensor.type}</div>
          <div class="grid grid-cols-2 gap-2 text-[11px] mb-2 font-mono">
            <div class="p-1 rounded bg-slate-800">Stage: <b class="text-white">${sensor.current_stage_m.toFixed(2)}m</b></div>
            <div class="p-1 rounded bg-slate-800">Rain: <b class="text-white">${sensor.rain_rate_mm_h.toFixed(1)} mm/h</b></div>
            <div class="p-1 rounded bg-slate-800">Soil: <b class="text-white">${sensor.soil_moisture_pct.toFixed(1)}%</b></div>
            <div class="p-1 rounded bg-slate-800">Status: <b style="color:${statusColor}">${sensor.status}</b></div>
          </div>
        </div>
      `, { className: 'custom-popup' });

      marker.addTo(sensorLayerRef.current!);
    });
  }, [sensors, showSensors]);

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950 flex flex-col">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0 dark-map" />

      {/* Floating Layer Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 p-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs shadow-lg">
        <button
          onClick={() => setShowRivers(!showRivers)}
          className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${
            showRivers ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>River Vectors</span>
        </button>

        <button
          onClick={() => setShowSensors(!showSensors)}
          className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${
            showSensors ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>IoT Telemetry ({sensors.length})</span>
        </button>

        <div className="h-5 w-px bg-slate-700 mx-0.5 self-center" />

        <button
          onClick={() => setBasemapType('dark')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
            basemapType === 'dark' ? 'bg-slate-700 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Dark GIS
        </button>

        <button
          onClick={() => setBasemapType('satellite')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
            basemapType === 'satellite' ? 'bg-slate-700 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Satellite
        </button>

        <button
          onClick={() => setBasemapType('topo')}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
            basemapType === 'topo' ? 'bg-slate-700 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          OSM Topo
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 p-2.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] shadow-lg flex items-center gap-3">
        <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Risk Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300">Low (&lt;25)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          <span className="text-slate-300">Moderate (25-50)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span className="text-slate-300">High (50-75)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-red-400 font-bold">Critical (&gt;75)</span>
        </div>
      </div>

      {/* Floating Selected Ward Quick Inspector */}
      {selectedVillage && (
        <div className="absolute top-3 right-3 z-10 w-80 p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 shadow-2xl animate-fade-in">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                {selectedVillage.name}
              </h3>
              <p className="text-[11px] text-slate-400">{selectedVillage.district} District • Pop: {selectedVillage.population.toLocaleString()}</p>
            </div>
            <span
              className="px-2 py-0.5 rounded text-xs font-bold font-mono uppercase"
              style={{
                backgroundColor: `${getRiskColor(selectedVillage.risk_level)}25`,
                color: getRiskColor(selectedVillage.risk_level),
                border: `1px solid ${getRiskColor(selectedVillage.risk_level)}60`
              }}
            >
              {selectedVillage.risk_level}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2.5 text-xs font-mono">
            <div className="p-2 rounded bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-400 text-[10px] block">Risk Score</span>
              <span className="text-base font-bold" style={{ color: getRiskColor(selectedVillage.risk_level) }}>
                {selectedVillage.risk_score} <span className="text-[10px] text-slate-400">/ 100</span>
              </span>
            </div>
            <div className="p-2 rounded bg-slate-800/70 border border-slate-700/60">
              <span className="text-slate-400 text-[10px] block">Lead Time</span>
              <span className="text-base font-bold text-cyan-400">
                {selectedVillage.lead_time_hrs} <span className="text-[10px] text-slate-400">hrs</span>
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 mb-3 font-sans">
            <div className="flex justify-between">
              <span className="text-slate-400">Elevation / Slope:</span>
              <span className="font-mono">{selectedVillage.elevation_m}m / {selectedVillage.slope_deg}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Topographic Wetness (TWI):</span>
              <span className="font-mono">{selectedVillage.twi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">River Danger Stage:</span>
              <span className="font-mono">{selectedVillage.danger_stage_m}m</span>
            </div>
          </div>

          <button
            onClick={() => onOpenXAI(selectedVillage.id)}
            className="w-full py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open SHAP Explainability Breakdown</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Battery,
  Sun,
  Radio
} from 'lucide-react';
import { setSensorStatus } from '../services/api';
import type { IoTSensor } from '../types';

interface IoTMeshMonitorProps {
  sensors: IoTSensor[];
  onRefreshSensors: () => void;
}

export const IoTMeshMonitor: React.FC<IoTMeshMonitorProps> = ({
  sensors,
  onRefreshSensors
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const onlineCount = sensors.filter(s => s.status === 'ONLINE').length;
  const degradedCount = sensors.filter(s => s.status === 'DEGRADED').length;
  const offlineCount = sensors.filter(s => s.status === 'OFFLINE').length;

  const handleStatusChange = async (sensorId: string, newStatus: string) => {
    setUpdatingId(sensorId);
    try {
      await setSensorStatus(sensorId, newStatus);
      onRefreshSensors();
    } catch (e) {
      console.error('Failed to change sensor status', e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Network Header & Summary Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            Virtual ESP32 Sensor Grid & Telemetry Health Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Real-time ultrasonic stage radars, acoustic flowmeters, tipping bucket rain gauges, and TDR soil moisture nodes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-400 font-bold">{onlineCount} ONLINE</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-amber-400 font-bold">{degradedCount} DEGRADED</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-red-400 font-bold">{offlineCount} OFFLINE</span>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {sensors.map((s) => {
          const isOnline = s.status === 'ONLINE';
          const isDegraded = s.status === 'DEGRADED';
          const isOffline = s.status === 'OFFLINE';

          return (
            <div
              key={s.id}
              className={`p-3.5 rounded-xl border transition-all shadow-lg flex flex-col justify-between ${
                isOffline
                  ? 'bg-red-950/20 border-red-900/40 opacity-75'
                  : (isDegraded
                      ? 'bg-slate-900/90 border-amber-500/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/40')
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                    {s.id}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    {s.solar_charging && <Sun className="w-3.5 h-3.5 text-amber-400" />}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{s.battery_pct}%</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-white line-clamp-1 mb-0.5">{s.name}</h3>
                <p className="text-[10px] text-slate-400 line-clamp-1 mb-2.5">{s.type}</p>

                {/* Telemetry Numbers */}
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono my-2 text-xs">
                  <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700/50">
                    <span className="text-[9px] text-slate-400 block">Stage</span>
                    <span className="font-bold text-white">{isOffline ? '--' : `${s.current_stage_m.toFixed(2)}m`}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700/50">
                    <span className="text-[9px] text-slate-400 block">Rain</span>
                    <span className="font-bold text-cyan-300">{isOffline ? '--' : `${s.rain_rate_mm_h.toFixed(1)}`}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700/50">
                    <span className="text-[9px] text-slate-400 block">Soil</span>
                    <span className="font-bold text-emerald-300">{isOffline ? '--' : `${s.soil_moisture_pct.toFixed(0)}%`}</span>
                  </div>
                </div>
              </div>

              {/* Status & Fault Injection Controls */}
              <div className="pt-2 border-t border-slate-800/80 mt-2">
                <div className="text-[10px] text-slate-400 mb-1 font-medium flex justify-between">
                  <span>Simulate Sensor Fault:</span>
                  <span className="font-mono text-slate-500">Ping: {s.last_ping_seconds_ago}s</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold font-mono">
                  <button
                    onClick={() => handleStatusChange(s.id, 'ONLINE')}
                    disabled={updatingId === s.id || isOnline}
                    className={`py-1 rounded transition-all ${
                      isOnline
                        ? 'bg-emerald-500 text-white font-bold'
                        : 'bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    ONLINE
                  </button>
                  <button
                    onClick={() => handleStatusChange(s.id, 'DEGRADED')}
                    disabled={updatingId === s.id || isDegraded}
                    className={`py-1 rounded transition-all ${
                      isDegraded
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 hover:bg-amber-950 text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    DEGRADE
                  </button>
                  <button
                    onClick={() => handleStatusChange(s.id, 'OFFLINE')}
                    disabled={updatingId === s.id || isOffline}
                    className={`py-1 rounded transition-all ${
                      isOffline
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300'
                    }`}
                  >
                    OFFLINE
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

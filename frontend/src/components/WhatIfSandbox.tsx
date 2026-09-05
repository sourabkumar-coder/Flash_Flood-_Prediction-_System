import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Flame,
  CloudRain,
  Droplets,
  Zap
} from 'lucide-react';
import { runWhatIf, resetSimulation } from '../services/api';

interface WhatIfSandboxProps {
  onSimulationApplied: () => void;
}

export const WhatIfSandbox: React.FC<WhatIfSandboxProps> = ({ onSimulationApplied }) => {
  const [rainfall, setRainfall] = useState(65.0);
  const [soilMoisture, setSoilMoisture] = useState(78.0);
  const [damInflow, setDamInflow] = useState(32000.0);
  const [duration, setDuration] = useState(3.0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const applyPreset = (rain: number, soil: number, dam: number, dur: number) => {
    setRainfall(rain);
    setSoilMoisture(soil);
    setDamInflow(dam);
    setDuration(dur);
  };

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await runWhatIf({
        rainfall_intensity_mm_h: rainfall,
        soil_presaturation_pct: soilMoisture,
        upstream_dam_inflow_cusecs: damInflow,
        cloudburst_duration_hrs: duration
      });
      setResult(res);
      onSimulationApplied();
    } catch (e) {
      console.error('Error running what-if simulation', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetSimulation();
      setResult(null);
      onSimulationApplied();
    } catch (e) {
      console.error('Error resetting simulation', e);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              "What-If" Counterfactual Disaster Simulation Sandbox
            </h2>
            <p className="text-xs text-slate-400">
              Simulate hypothetical cloudburst bursts, extreme upstream reservoir releases, and soil saturation extremes
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Actions */}
      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-300 mr-2 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-cyan-400" /> Presets:
        </span>
        <button
          onClick={() => applyPreset(30.0, 45.0, 12000.0, 2.0)}
          className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
        >
          Normal Monsoon Inflow
        </button>
        <button
          onClick={() => applyPreset(85.0, 85.0, 38000.0, 4.0)}
          className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 text-xs font-medium transition-all"
        >
          July 2023 Cloudburst Equivalent (85 mm/h)
        </button>
        <button
          onClick={() => applyPreset(135.0, 98.0, 56000.0, 6.0)}
          className="px-2.5 py-1 rounded bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/40 text-xs font-medium transition-all"
        >
          Extreme Catastrophic Surge (135 mm/h + Dam Inundation)
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Slider 1: Rainfall */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              Cloudburst Peak Rainfall Intensity
            </span>
            <span className="font-mono font-bold text-cyan-400 text-sm">{rainfall} mm/hr</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={rainfall}
            onChange={(e) => setRainfall(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>10 mm/h (Light)</span>
            <span>75 mm/h (Heavy)</span>
            <span>150 mm/h (Extreme)</span>
          </div>
        </div>

        {/* Slider 2: Soil Moisture */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-emerald-400" />
              Antecedent Soil Pre-Saturation
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{soilMoisture}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="2"
            value={soilMoisture}
            onChange={(e) => setSoilMoisture(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>20% (Dry AMC-I)</span>
            <span>60% (Moderate AMC-II)</span>
            <span>100% (Saturated AMC-III)</span>
          </div>
        </div>

        {/* Slider 3: Upstream Dam Discharge */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Upstream Reservoir Inflow / Gate Release
            </span>
            <span className="font-mono font-bold text-amber-400 text-sm">{damInflow.toLocaleString()} cusecs</span>
          </div>
          <input
            type="range"
            min="5000"
            max="60000"
            step="2500"
            value={damInflow}
            onChange={(e) => setDamInflow(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>5,000 (Calm)</span>
            <span>30,000 (High Discharge)</span>
            <span>60,000 (Extreme Spillway)</span>
          </div>
        </div>

        {/* Slider 4: Storm Duration */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Event Duration Window
            </span>
            <span className="font-mono font-bold text-indigo-300 text-sm">{duration} Hours</span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            step="0.5"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>1 Hour (Flash Burst)</span>
            <span>4 Hours</span>
            <span>8 Hours (Continuous Deluge)</span>
          </div>
        </div>
      </div>

      {/* Execution Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Normal Baseline</span>
        </button>

        <button
          onClick={handleRun}
          disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 active:scale-95 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{loading ? 'Propagating Hydro Dynamic...' : 'Execute Counterfactual Model & Propagate Risk'}</span>
        </button>
      </div>

      {result && (
        <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between">
          <span>✓ Simulation applied successfully across all 10 Beas Basin wards!</span>
          <span className="font-mono font-bold text-amber-300">
            {result.villages_impacted} Wards Escalated to High/Critical
          </span>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Radio,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ShieldAlert,
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react';
import type { LiveFeedPayload } from '../types';

interface HeaderProps {
  liveFeed: LiveFeedPayload | null;
  onStartDemo: () => void;
  onReset: () => void;
  onOpenWhatIf: () => void;
  onSyncLiveWeather: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
  isSyncingWeather: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  liveFeed,
  onStartDemo,
  onReset,
  onOpenWhatIf,
  onSyncLiveWeather,
  activeTab,
  setActiveTab,
  isLoading,
  isSyncingWeather
}) => {
  const isDisasterMode = liveFeed?.mode === 'DISASTER_DEMO' && liveFeed?.demo_active;
  const criticalCount = liveFeed?.villages_summary.filter(v => v.risk_level === 'CRITICAL').length || 0;
  const highCount = liveFeed?.villages_summary.filter(v => v.risk_level === 'HIGH').length || 0;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      {/* Top Notice Banner */}
      <div className="flex items-center justify-between px-4 py-1 text-xs border-b border-cyan-950/50 bg-slate-900/60 text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-cyan-400">PILOT REGION:</span>
          <span>Upper & Middle Beas River Basin (Kullu & Mandi, HP)</span>
          <span className="text-slate-600">|</span>
          <span>CWC & IMD Synoptic Multi-Source Stream</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Decision-Support Prototype (Operates alongside NDMA/SDMA authorities)</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        {/* Brand & Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-500/20 text-white font-black text-xl tracking-wider">
            AH
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wide text-white uppercase flex items-center gap-1.5">
                AegisHydro <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-medium">SIH EDITION</span>
              </h1>
              {isDisasterMode ? (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                  SIMULATION STAGE {liveFeed?.demo_step}/10
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  NORMAL BASELINE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Multi-Source Flash Flood Early Warning & AI Decision Support</p>
          </div>
        </div>

        {/* Dynamic Threat Ticker */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">BASIN STATUS:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
              {criticalCount} CRITICAL
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {highCount} HIGH RISK
            </span>
            <span className="text-xs text-slate-400">
              Lead Time: <span className="font-mono text-cyan-300 font-bold">3.2 - 6.0h</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSyncLiveWeather}
            disabled={isSyncingWeather}
            className="px-3 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
            title="Fetch live real-world weather and soil moisture from Open-Meteo & OpenWeatherMap APIs"
          >
            <Radio className={`w-3.5 h-3.5 text-cyan-400 ${isSyncingWeather ? 'animate-spin' : ''}`} />
            <span>{isSyncingWeather ? 'Syncing...' : 'Sync Live Weather (APIs)'}</span>
          </button>

          <button
            onClick={onStartDemo}
            disabled={isLoading || isDisasterMode}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-lg ${
              isDisasterMode
                ? 'bg-red-600/50 text-red-200 cursor-not-allowed border border-red-500/30'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30 border border-red-400/30 active:scale-95'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START DISASTER SIMULATION</span>
          </button>

          <button
            onClick={onOpenWhatIf}
            className="px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>What-If Sandbox</span>
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all"
            title="Reset Simulation to Calm Baseline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 border-t border-slate-800/80 bg-slate-900/40 overflow-x-auto">
        {[
          { id: 'command_map', label: 'GIS Command Center', icon: Layers },
          { id: 'xai_inspector', label: 'Explainable AI (SHAP)', icon: ShieldAlert },
          { id: 'iot_mesh', label: 'IoT Sensor Network', icon: Activity },
          { id: 'evacuation_hub', label: 'Evacuation Decision Hub', icon: AlertTriangle },
          { id: 'what_if_lab', label: '"What-If" Simulation Lab', icon: Sparkles },
          { id: 'ml_benchmark', label: 'ML Benchmark & 2023 Replay', icon: Radio },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};

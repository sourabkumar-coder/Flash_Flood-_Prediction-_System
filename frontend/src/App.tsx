import { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { MapCenter } from './components/MapCenter';
import { XAIInspector } from './components/XAIInspector';
import { IoTMeshMonitor } from './components/IoTMeshMonitor';
import { EvacuationHub } from './components/EvacuationHub';
import { WhatIfSandbox } from './components/WhatIfSandbox';
import { MLBenchmarkReplay } from './components/MLBenchmarkReplay';
import {
  fetchVillagesGeoJSON,
  fetchSensors,
  startDisasterDemo,
  resetSimulation,
  syncLiveWeather,
  createLiveFeedWebSocket
} from './services/api';
import type { VillageGeoJSON, IoTSensor, LiveFeedPayload } from './types';
import { AlertTriangle, Shield, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('command_map');
  const [villages, setVillages] = useState<VillageGeoJSON | null>(null);
  const [sensors, setSensors] = useState<IoTSensor[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>('VIL_001');
  const [liveFeed, setLiveFeed] = useState<LiveFeedPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeToastAlert, setActiveToastAlert] = useState<any | null>(null);

  // Initial Data Fetch
  const reloadData = useCallback(async () => {
    try {
      const [vData, sData] = await Promise.all([
        fetchVillagesGeoJSON(),
        fetchSensors()
      ]);
      setVillages(vData);
      setSensors(sData.sensors);
    } catch (e) {
      console.error('Failed to load initial GIS data', e);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // WebSocket Live Stream Connection
  useEffect(() => {
    const disconnect = createLiveFeedWebSocket((payload: LiveFeedPayload) => {
      setLiveFeed(payload);
      setSensors(payload.sensors);

      // Check for latest critical alert
      if (payload.alerts && payload.alerts.length > 0) {
        const latest = payload.alerts[payload.alerts.length - 1];
        if (latest.severity === 'CRITICAL' || latest.severity === 'HIGH') {
          setActiveToastAlert(latest);
        }
      }

      // Update villages risk scores dynamically in-memory
      setVillages(prev => {
        if (!prev) return prev;
        const updatedFeatures = prev.features.map(f => {
          const match = payload.villages_summary.find(v => v.id === f.id);
          if (match) {
            return {
              ...f,
              properties: {
                ...f.properties,
                risk_score: match.risk_score,
                risk_level: match.risk_level,
                lead_time_hrs: match.lead_time_hrs
              }
            };
          }
          return f;
        });
        return { ...prev, features: updatedFeatures };
      });
    });

    return () => disconnect();
  }, []);

  const [isSyncingWeather, setIsSyncingWeather] = useState(false);

  const handleSyncLiveWeather = async () => {
    setIsSyncingWeather(true);
    try {
      const res = await syncLiveWeather();
      if (res.data) {
        reloadData();
      }
    } catch (e) {
      console.error('Failed to sync live weather', e);
    } finally {
      setIsSyncingWeather(false);
    }
  };

  const handleStartDemo = async () => {
    setIsLoading(true);
    try {
      await startDisasterDemo();
      reloadData();
    } catch (e) {
      console.error('Failed to trigger disaster demo', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await resetSimulation();
      setActiveToastAlert(null);
      reloadData();
    } catch (e) {
      console.error('Failed to reset simulation', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenXAI = (villageId: string) => {
    setSelectedVillageId(villageId);
    setActiveTab('xai_inspector');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        liveFeed={liveFeed}
        onStartDemo={handleStartDemo}
        onReset={handleReset}
        onOpenWhatIf={() => setActiveTab('what_if_lab')}
        onSyncLiveWeather={handleSyncLiveWeather}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLoading={isLoading}
        isSyncingWeather={isSyncingWeather}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-7xl w-full mx-auto space-y-4">
        {/* Floating Critical Alert Toast */}
        {activeToastAlert && (
          <div className="p-3.5 rounded-xl bg-red-950/90 border-2 border-red-500/80 shadow-2xl shadow-red-500/20 text-xs flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-red-200 text-sm flex items-center gap-2">
                  <span>{activeToastAlert.message}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-800 text-white">
                    {activeToastAlert.timestamp}
                  </span>
                </div>
                <div className="text-[11px] text-red-300">
                  Target: {activeToastAlert.village_name} ({activeToastAlert.district} Dist.) • Lead Time: {activeToastAlert.lead_time_hrs}h
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveToastAlert(null)}
              className="p-1 rounded-lg hover:bg-red-800/50 text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: GIS Risk Command Center */}
        {activeTab === 'command_map' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 h-[620px]">
              <MapCenter
                villages={villages}
                sensors={sensors}
                selectedVillageId={selectedVillageId}
                onSelectVillage={setSelectedVillageId}
                onOpenXAI={handleOpenXAI}
              />
            </div>
            <div className="h-[620px] overflow-y-auto">
              {/* Quick Village Ranking Sidebar */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Live Wards Threat Monitor
                </h3>

                <div className="space-y-2">
                  {villages?.features.map((f) => {
                    const p = f.properties;
                    const isSelected = p.id === selectedVillageId;
                    const isCritical = p.risk_level === 'CRITICAL';
                    const isHigh = p.risk_level === 'HIGH';

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedVillageId(p.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400/80 shadow-md'
                            : (isCritical
                                ? 'bg-red-950/30 border-red-500/50'
                                : (isHigh
                                    ? 'bg-amber-950/20 border-amber-500/40'
                                    : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'))
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-slate-100">{p.name}</span>
                          <span className={`font-mono font-bold text-[11px] ${isCritical ? 'text-red-400' : (isHigh ? 'text-amber-400' : 'text-emerald-400')}`}>
                            {p.risk_score}/100
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>{p.district}</span>
                          <span>Lead: {p.lead_time_hrs}h</span>
                          <span className="font-semibold" style={{ color: isCritical ? '#ef4444' : (isHigh ? '#f59e0b' : '#10b981') }}>
                            {p.risk_level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Explainable AI (SHAP) */}
        {activeTab === 'xai_inspector' && (
          <XAIInspector
            villages={villages}
            selectedVillageId={selectedVillageId}
            onSelectVillage={setSelectedVillageId}
          />
        )}

        {/* Tab 3: IoT Sensor Mesh Monitor */}
        {activeTab === 'iot_mesh' && (
          <IoTMeshMonitor
            sensors={sensors}
            onRefreshSensors={reloadData}
          />
        )}

        {/* Tab 4: Evacuation Hub */}
        {activeTab === 'evacuation_hub' && (
          <EvacuationHub
            onSelectVillage={handleOpenXAI}
          />
        )}

        {/* Tab 5: What-If Sandbox */}
        {activeTab === 'what_if_lab' && (
          <WhatIfSandbox
            onSimulationApplied={reloadData}
          />
        )}

        {/* Tab 6: ML Benchmark & 2023 Replay */}
        {activeTab === 'ml_benchmark' && (
          <MLBenchmarkReplay />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-3 px-4 text-center text-xs text-slate-500 font-sans">
        <p>AegisHydro Flash Flood Prediction & Decision-Support System • Upper & Middle Beas Pilot Basin (Kullu & Mandi, HP)</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Built with React, FastAPI, LightGBM, XGBoost, Random Forest, SHAP & Leaflet GIS</p>
      </footer>
    </div>
  );
}

export default App;

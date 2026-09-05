import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { fetchVillageExplain, fetchVillageHistory } from '../services/api';
import type { VillageGeoJSON, SHAPFactor, RiskLevel } from '../types';

interface XAIInspectorProps {
  villages: VillageGeoJSON | null;
  selectedVillageId: string | null;
  onSelectVillage: (id: string) => void;
}

export const XAIInspector: React.FC<XAIInspectorProps> = ({
  villages,
  selectedVillageId,
  onSelectVillage
}) => {
  const [explainData, setExplainData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);

  const activeId = selectedVillageId || (villages?.features[0]?.id ?? 'VIL_001');

  useEffect(() => {
    if (!activeId) return;
    Promise.all([
      fetchVillageExplain(activeId),
      fetchVillageHistory(activeId)
    ])
      .then(([exp, hist]) => {
        setExplainData(exp);
        setHistoryData(hist);
      })
      .catch(err => console.error('Error fetching XAI details', err));
  }, [activeId]);

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 text-xs font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 text-xs font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/40">HIGH RISK</span>;
      case 'MODERATE':
        return <span className="px-2.5 py-1 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">MODERATE</span>;
      case 'LOW': default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">LOW RISK</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Explainable AI (TreeSHAP) Ward Diagnostic Console
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Select Ward / Village:</label>
          <select
            value={activeId}
            onChange={(e) => onSelectVillage(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
          >
            {villages?.features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.properties.name} ({f.properties.district}) - {f.properties.risk_level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {explainData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Risk & Lead-Time KPI */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{explainData.village_name}</h3>
                <p className="text-xs text-slate-400">{explainData.district} District • Beas Basin</p>
              </div>
              {getRiskBadge(explainData.risk_level)}
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block mb-1">Calibrated Risk Score</span>
                <span className="text-2xl font-black text-white">{explainData.risk_score}</span>
                <span className="text-xs text-slate-400"> / 100</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Estimated Lead Time
                </span>
                <span className="text-2xl font-black text-cyan-400">{explainData.lead_time_hrs}</span>
                <span className="text-xs text-slate-400"> hrs</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs space-y-2 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Model Decision Confidence:</span>
                <span className="font-mono font-bold text-emerald-400">{explainData.confidence_pct}%</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${explainData.confidence_pct}%` }} />
              </div>
              <div className="pt-2 border-t border-slate-700/60 flex justify-between">
                <span className="text-slate-400">Soil Moisture State:</span>
                <span className="font-mono text-cyan-300 font-semibold">{explainData.raw_features?.soil_moisture_pct}%</span>
              </div>
              <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20 font-medium">
                {explainData.amc_soil_regime}
              </div>
            </div>
          </div>

          {/* Card 2: SHAP Feature Attribution Chart */}
          <div className="lg:col-span-2 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  SHAP Factor Attribution (Why is risk elevated?)
                </h3>
                <p className="text-xs text-slate-400">Exact Shapley marginal contributions for this specific ward</p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                LightGBM TreeExplainer
              </span>
            </div>

            <div className="space-y-2 pt-2">
              {explainData.shap_factors?.map((factor: SHAPFactor, idx: number) => {
                const isPositive = factor.shap_impact >= 0;
                const impactPercent = Math.min(100, Math.abs(factor.shap_impact) * 200);

                return (
                  <div key={idx} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-200">{factor.feature_name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({factor.feature_value})</span>
                      </div>
                      <span className={`font-mono font-bold text-xs ${isPositive ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isPositive ? `+${factor.shap_impact.toFixed(3)}` : factor.shap_impact.toFixed(3)} SHAP
                      </span>
                    </div>

                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden flex">
                      {isPositive ? (
                        <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${impactPercent}%` }} />
                      ) : (
                        <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${impactPercent}%` }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Temporal History & Forecast Chart */}
      {historyData && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                24-Hour Historical Trend & 6-Hour Forward Flood Projection
              </h3>
              <p className="text-xs text-slate-400">Continuous hydrograph trajectory, rainfall accumulation, and predicted risk score</p>
            </div>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData.temporal_series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time_offset" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#38bdf8" tick={{ fontSize: 10 }} label={{ value: 'Risk Score (0-100)', angle: -90, position: 'insideLeft', fill: '#38bdf8', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 10 }} label={{ value: 'Rainfall (mm) / Stage (m)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="risk_score" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} name="Risk Score (0-100)" />
                <Line yAxisId="right" type="monotone" dataKey="rainfall_mm" stroke="#38bdf8" strokeWidth={1.8} dot={false} name="Rainfall (mm)" />
                <Line yAxisId="right" type="monotone" dataKey="stage_m" stroke="#f59e0b" strokeWidth={1.8} strokeDasharray="4 4" dot={false} name="River Stage (m)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

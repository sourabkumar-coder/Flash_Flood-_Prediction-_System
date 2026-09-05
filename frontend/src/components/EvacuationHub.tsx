import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Users,
  Building2,
  Anchor,
  Compass,
  CheckCircle2,
  XCircle,
  Truck
} from 'lucide-react';
import { fetchEvacuationPlan } from '../services/api';
import type { EvacuationPlanResponse } from '../types';

interface EvacuationHubProps {
  onSelectVillage: (id: string) => void;
}

export const EvacuationHub: React.FC<EvacuationHubProps> = ({ onSelectVillage }) => {
  const [plan, setPlan] = useState<EvacuationPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvacuationPlan()
      .then(setPlan)
      .catch(err => console.error('Error fetching evacuation plan', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !plan) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-sm">
        Computing multi-criteria evacuation priority queue and shelter assignments...
      </div>
    );
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE_EVACUATION':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">IMMEDIATE EVACUATION</span>;
      case 'HIGH_PRIORITY_RELOCATION':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/40">HIGH PRIORITY</span>;
      case 'STAGE_1_ADVISORY':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">STAGE 1 ADVISORY</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">STANDBY MONITORING</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Resource KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Population in High Hazard Zone</span>
            <span className="text-xl font-bold font-mono text-white">{plan.total_vulnerable_population.toLocaleString()}</span>
            <span className="text-xs text-slate-400"> citizens</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Recommended NDRF Battalions</span>
            <span className="text-xl font-bold font-mono text-cyan-400">{plan.ndrf_teams_deployed_estimate}</span>
            <span className="text-xs text-slate-400"> quick-response units</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Inflatable Rescue Boats Req.</span>
            <span className="text-xl font-bold font-mono text-indigo-300">{plan.inflatable_rescue_boats_needed}</span>
            <span className="text-xs text-slate-400"> motorized zodiacs</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Priority Queue Table */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                Village Evacuation Priority Ranking Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Formula: P = (Risk^1.4 × Vulnerable Population) / (Lead Time × 1200)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-700">
                <tr>
                  <th className="py-2 px-3">Rank</th>
                  <th className="py-2 px-3">Ward / Village</th>
                  <th className="py-2 px-3">Risk Level</th>
                  <th className="py-2 px-3">Lead Time</th>
                  <th className="py-2 px-3">At-Risk Pop</th>
                  <th className="py-2 px-3">Designated Safe Center</th>
                  <th className="py-2 px-3">Action Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {plan.priority_queue.map((item, idx) => (
                  <tr
                    key={item.village_id}
                    onClick={() => onSelectVillage(item.village_id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <div>{item.village_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.district} District</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={item.risk_level === 'CRITICAL' ? 'text-red-400' : (item.risk_level === 'HIGH' ? 'text-orange-400' : 'text-emerald-400')}>
                        {item.risk_score} <span className="text-[10px] text-slate-500">({item.risk_level})</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">{item.lead_time_hrs}h</td>
                    <td className="py-2.5 px-3 font-mono">{item.vulnerable_population.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="font-medium">{item.shelter_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Elev: {item.shelter_elevation_m}m • Cap: {item.shelter_capacity}</div>
                    </td>
                    <td className="py-2.5 px-3">{getUrgencyBadge(item.urgency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Critical Infrastructure & Road Closures */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Critical Bridges & Road Closures
            </h3>
            <p className="text-xs text-slate-400">Real-time flood inundation check on mountain arteries</p>
          </div>

          <div className="space-y-2.5">
            {plan.bridges_infrastructure.map((brg) => {
              const isClosed = brg.status.includes('CLOSED') || brg.status.includes('DANGER');
              return (
                <div
                  key={brg.id}
                  className={`p-3 rounded-lg border text-xs ${
                    isClosed
                      ? 'bg-red-950/20 border-red-500/40 text-red-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-bold text-white">{brg.name}</span>
                    {isClosed ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500 text-white flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> CLOSED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> PASSABLE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Clearance: {brg.clearance_m}m • Status: <span className="font-semibold text-slate-300">{brg.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Designated Shelters Overview */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Designated High-Ground Relief Camps
            </h4>
            <div className="space-y-2 text-xs">
              {plan.shelters.slice(0, 4).map((s) => (
                <div key={s.id} className="p-2 rounded bg-slate-800/40 border border-slate-700/40 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-200 text-[11px]">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Elev: {s.elevation_m}m • Food Stock: {s.water_food_days} Days</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono font-bold text-[10px]">
                    Cap: {s.capacity_people}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Award,
  BarChart3,
  History,
  Play,
  RotateCcw
} from 'lucide-react';
import { fetchModelBenchmark, fetchHistoricalEvents } from '../services/api';
import type { ModelBenchmarkResponse } from '../types';

export const MLBenchmarkReplay: React.FC = () => {
  const [benchmark, setBenchmark] = useState<ModelBenchmarkResponse | null>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [replayFrame, setReplayFrame] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchModelBenchmark().then(setBenchmark).catch(console.error);
    fetchHistoricalEvents().then(res => {
      if (res.events?.length > 0) setActiveEvent(res.events[0]);
    }).catch(console.error);
  }, []);

  // Frame animation timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && activeEvent) {
      interval = setInterval(() => {
        setReplayFrame(prev => {
          if (prev >= activeEvent.timeline_frames) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeEvent]);

  if (!benchmark) {
    return <div className="p-8 text-center text-slate-400 font-mono text-sm">Loading ML Model Benchmark Matrix...</div>;
  }

  const modelNames = ['LightGBM', 'XGBoost', 'Random Forest'];

  const getTimelineStageDesc = (frame: number) => {
    const descriptions: Record<number, string> = {
      1: "July 9, 02:00 IST - Light continuous orographic rain begins across Solang & Manali ridgelines.",
      2: "July 9, 06:00 IST - Cloudburst trigger in Parbati Valley; rainfall rate surges to 75 mm/hr.",
      3: "July 9, 10:00 IST - TDR soil sensors cross AMC-III threshold (>88% saturation). Runoff coefficient jumps to 0.85.",
      4: "July 9, 14:00 IST - River Beas stage exceeds Warning Level (4.2m) at Bhuntar confluence.",
      5: "July 9, 18:00 IST - XGBoost/LightGBM model issues CRITICAL FLASH FLOOD ALARM (Lead Time: 3.4 hrs).",
      6: "July 9, 22:00 IST - Beas breaches Danger Level at Thalout (6.5m); NH-21 highway section inundated.",
      7: "July 10, 02:00 IST - Peak flood discharge crests at Pandoh Dam (>150,000 cusecs); spillway gates opened.",
      8: "July 10, 06:00 IST - Mandi Urban low-lying wards flooded; Panchvaktra temple submerged to plinth.",
      9: "July 10, 12:00 IST - Upstream rainfall intensity subsides; hydrograph crest begins moving downstream.",
      10: "July 10, 18:00 IST - Recession limb active; stage drops below danger mark at Manali & Kullu.",
      11: "July 11, 00:00 IST - Post-disaster stabilization and search/rescue relief underway.",
      12: "July 11, 08:00 IST - Water levels normalized across entire Beas Basin."
    };
    return descriptions[frame] || "Event active in basin.";
  };

  return (
    <div className="space-y-5">
      {/* ML Benchmark Section */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Machine Learning Model Benchmark & False-Negative Optimization
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated on time-based validation splits to eliminate temporal leakage with strong $F_2$-Score penalty for missed floods
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
            Best: LightGBM (F2: 0.9982)
          </span>
        </div>

        {/* Model Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modelNames.map((name) => {
            const m = benchmark.models[name];
            if (!m) return null;
            const isWinner = name === 'LightGBM';

            return (
              <div
                key={name}
                className={`p-4 rounded-xl border transition-all ${
                  isWinner
                    ? 'bg-slate-900/95 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {name}
                      {isWinner && <Award className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isWinner ? 'Primary Production Ensemble' : 'Baseline Comparison'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                    F2: {m.f2_score}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                  <div className="p-2 rounded bg-slate-800/80 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block">Recall (Sensitivity)</span>
                    <span className="font-bold text-emerald-400">{(m.recall * 100).toFixed(2)}%</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/80 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block">PR-AUC</span>
                    <span className="font-bold text-cyan-300">{m.pr_auc.toFixed(4)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/80 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block">Precision</span>
                    <span className="font-bold text-slate-200">{(m.precision * 100).toFixed(2)}%</span>
                  </div>
                  <div className="p-2 rounded bg-slate-800/80 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block">False Negatives</span>
                    <span className="font-bold text-red-400">{m.confusion_matrix.false_negative} / 1,215</span>
                  </div>
                </div>

                {/* Mini Confusion Matrix */}
                <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>TP: {m.confusion_matrix.true_positive}</span>
                    <span>FP: {m.confusion_matrix.false_positive}</span>
                    <span>TN: {m.confusion_matrix.true_negative}</span>
                    <span>FN: {m.confusion_matrix.false_negative}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Feature Importances Bar */}
        <div className="pt-3 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Top Global Feature Importance Rankings
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {Object.entries(benchmark.feature_importances).slice(0, 8).map(([feat, score]) => (
              <div key={feat} className="p-2 rounded bg-slate-800/60 border border-slate-700/50 flex justify-between items-center">
                <span className="text-slate-300 text-[11px] truncate mr-2">{feat}</span>
                <span className="text-cyan-400 font-bold">{score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Disaster Replay Section */}
      {activeEvent && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Historical Disaster Replay: {activeEvent.name}
              </h2>
              <p className="text-xs text-slate-400">{activeEvent.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isPlaying ? 'Pause Replay' : 'Play Historical Storm'}</span>
              </button>
              <button
                onClick={() => setReplayFrame(1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                title="Reset Replay"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Timeline Frame: <b className="text-white">{replayFrame} / {activeEvent.timeline_frames}</b></span>
              <span className="text-indigo-400 font-bold">Peak Stage Surge: +{activeEvent.peak_stage_surge_m}m</span>
            </div>

            <input
              type="range"
              min="1"
              max={activeEvent.timeline_frames}
              value={replayFrame}
              onChange={(e) => setReplayFrame(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />

            <div className="p-3 rounded-lg bg-slate-900 border border-indigo-500/30 text-xs text-slate-200">
              <span className="font-mono text-cyan-400 font-bold block mb-1">STAGE {replayFrame} HYDROMETEOROLOGY:</span>
              <p className="text-slate-300 font-sans">{getTimelineStageDesc(replayFrame)}</p>
            </div>

            <div className="text-[11px] text-slate-400 font-sans italic">
              <b>Observed Damage:</b> {activeEvent.damage_notes}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { FeatureImportanceChart } from '../components/BacktestCharts';
import { ModelTrainingReport, PipelineStateSummary } from '../types/quant';

interface ModelPageProps {
  summary: PipelineStateSummary | null;
  modelReport: ModelTrainingReport | null;
  onRetrain: (params: {
    numTrees: number;
    maxDepth: number;
    confidenceThreshold: number;
    trainRatio: number;
  }) => Promise<void>;
  busy: boolean;
}

const FLOW_STAGES = [
  { label: 'Market Data', detail: '5m OHLCV NIFTY 50 candles' },
  { label: 'VWAP + RSI', detail: 'Intraday trend & momentum' },
  { label: 'Initial Signal', detail: 'Candidate BUY or SELL' },
  { label: 'Feature Extraction', detail: '8 microstructure features' },
  { label: 'Random Forest', detail: 'Ensemble probability vote' },
  { label: 'ACCEPT / REJECT', detail: 'Threshold meta-filter' },
  { label: 'Risk Management', detail: 'ATR SL/TP & sized lot' },
];

export const ModelPage: React.FC<ModelPageProps> = ({
  summary,
  modelReport,
  onRetrain,
  busy,
}) => {
  const [numTrees, setNumTrees] = useState(modelReport?.numTrees ?? 50);
  const [maxDepth, setMaxDepth] = useState(modelReport?.maxDepth ?? 5);
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    modelReport?.confidenceThreshold ?? 0.52
  );
  const [trainRatio, setTrainRatio] = useState(modelReport?.trainRatio ?? 0.7);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRetrain({ numTrees, maxDepth, confidenceThreshold, trainRatio });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
        <div className="text-xs font-medium text-purple-400">Meta-Labeling Architecture</div>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Random Forest Meta-Labeling Model
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          In classical quantitative systems, a single model tries to predict price direction from
          scratch and frequently overfits noise. In <strong className="text-white">Meta-Labeling</strong>,
          the primary VWAP + RSI strategy proposes the directional trade, while a{' '}
          <strong className="text-cyan-300">Random Forest classifier</strong> predicts the
          probability that the proposed trade hits the +1.6 ATR profit barrier before stopping out.
        </p>
      </div>

      {/* Visual Flow Diagram */}
      <section className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
        <h2 className="text-base font-semibold text-white">Meta-Labeling Decision Flow</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FLOW_STAGES.map((stage, idx) => (
            <React.Fragment key={stage.label}>
              <div className="min-w-[138px] flex-1 rounded-lg border border-slate-800 bg-[#070c18] p-3">
                <div className="font-mono text-[11px] text-cyan-400">0{idx + 1}</div>
                <div className="mt-0.5 text-sm font-semibold text-white whitespace-nowrap">
                  {stage.label}
                </div>
                <div className="mt-1 text-xs text-slate-400">{stage.detail}</div>
              </div>
              {idx < FLOW_STAGES.length - 1 && (
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-500 xl:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Why Random Forest + Hyperparameter Lab */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 rounded-xl border border-slate-800 bg-[#0b1120] p-6 lg:col-span-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Why Random Forest?</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="rounded-lg border border-slate-800/80 bg-[#070c18] p-3">
                <span className="font-semibold text-cyan-300">Handles Nonlinear Relationships:</span>{' '}
                Captures threshold interactions such as high RSI velocity paired with volume surge
                versus high upper-shadow exhaustion.
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-[#070c18] p-3">
                <span className="font-semibold text-blue-300">Combines Multiple Decision Trees:</span>{' '}
                Bootstrap aggregating (bagging) across {numTrees} trees with random feature subsets
                reduces variance on noisy 5-minute financial candles.
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-[#070c18] p-3">
                <span className="font-semibold text-purple-300">Evaluates Multiple Market Features:</span>{' '}
                Jointly weighs VWAP distance, RSI momentum, candle anatomy, volume, and volatility.
              </li>
              <li className="rounded-lg border border-slate-800/80 bg-[#070c18] p-3">
                <span className="font-semibold text-emerald-300">Filters Weak Trading Signals:</span>{' '}
                Produces a calibrated probability score so low-conviction setups are skipped cleanly.
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-slate-800 bg-[#0b1120] p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Interactive Random Forest Training & Evaluation
              </h2>
              <p className="text-xs text-slate-400">
                Adjust hyperparameters and retrain chronologically via /api/model/train & /api/backtest/run
              </p>
            </div>
          </div>

          <form onSubmit={handleApply} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block rounded-lg border border-slate-800 bg-[#070c18] p-3.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Number of Trees</span>
                <span className="font-mono text-cyan-400 tabular-nums">{numTrees}</span>
              </div>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={numTrees}
                onChange={(e) => setNumTrees(Number(e.target.value))}
                className="mt-2 w-full accent-cyan-400"
              />
            </label>

            <label className="block rounded-lg border border-slate-800 bg-[#070c18] p-3.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Max Tree Depth</span>
                <span className="font-mono text-cyan-400 tabular-nums">{maxDepth}</span>
              </div>
              <input
                type="range"
                min={2}
                max={8}
                step={1}
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="mt-2 w-full accent-cyan-400"
              />
            </label>

            <label className="block rounded-lg border border-slate-800 bg-[#070c18] p-3.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Acceptance Threshold</span>
                <span className="font-mono text-purple-400 tabular-nums">
                  {(confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0.4}
                max={0.75}
                step={0.02}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="mt-2 w-full accent-purple-400"
              />
            </label>

            <label className="block rounded-lg border border-slate-800 bg-[#070c18] p-3.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Chronological Train Split</span>
                <span className="font-mono text-blue-400 tabular-nums">
                  {(trainRatio * 100).toFixed(0)}% / {((1 - trainRatio) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0.55}
                max={0.8}
                step={0.05}
                value={trainRatio}
                onChange={(e) => setTrainRatio(Number(e.target.value))}
                className="mt-2 w-full accent-blue-400"
              />
            </label>

            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <div className="text-xs text-slate-400">
                Train Signals:{' '}
                <span className="font-mono text-white tabular-nums">
                  {modelReport?.trainSignals ?? 0}
                </span>{' '}
                · Test Signals:{' '}
                <span className="font-mono text-white tabular-nums">
                  {modelReport?.testSignals ?? 0}
                </span>{' '}
                · Accepted:{' '}
                <span className="font-mono text-emerald-400 tabular-nums">
                  {summary?.acceptedSignalCount ?? 0}
                </span>{' '}
                · Rejected:{' '}
                <span className="font-mono text-rose-400 tabular-nums">
                  {summary?.rejectedSignalCount ?? 0}
                </span>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                {busy ? 'Retraining...' : 'Retrain & Evaluate'}
              </button>
            </div>
          </form>

          {modelReport && (
            <div className="border-t border-slate-800 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Computed Feature Importance (Gini Decrease)
                </h3>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  Train Fit: {modelReport.oobOrTrainAccuracy.toFixed(1)}%
                </span>
              </div>
              <FeatureImportanceChart items={modelReport.featureImportances} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { Download, Play, RefreshCw, Upload } from 'lucide-react';
import {
  DecisionDistributionChart,
  DrawdownChart,
  EquityCurveChart,
  MonthlyPerfChart,
  WinLossChart,
} from '../components/BacktestCharts';
import { BacktestReport, PipelineStateSummary } from '../types/quant';

interface BacktestingPageProps {
  summary: PipelineStateSummary | null;
  backtestReport: BacktestReport | null;
  busy: boolean;
  onUploadCsv: (file: File) => Promise<void>;
  onStepSignals: () => Promise<void>;
  onStepTrainPredict: () => Promise<void>;
  onStepBacktest: () => Promise<void>;
}

export const BacktestingPage: React.FC<BacktestingPageProps> = ({
  summary,
  backtestReport,
  busy,
  onUploadCsv,
  onStepSignals,
  onStepTrainPredict,
  onStepBacktest,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACCEPTED' | 'REJECTED'>('ALL');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadCsv(file);
      e.target.value = '';
    }
  };

  const downloadBacktestJson = () => {
    if (!backtestReport) return;
    const blob = new Blob([JSON.stringify(backtestReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astraquant_x_backtest_results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTradesCsv = () => {
    if (!backtestReport) return;
    const header =
      'TradeID,EntryTime,ExitTime,Direction,EntryPrice,ExitPrice,ProfitTarget,StopLoss,BarrierHit,HoldingBars,AIConfidence,Decision,PositionMultiplier,RawReturnPct,SizedReturnPct';
    const rows = backtestReport.trades.map((t) =>
      [
        t.id,
        t.entryTimestamp,
        t.exitTimestamp,
        t.direction,
        t.entryPrice,
        t.exitPrice,
        t.profitTargetPrice,
        t.stopLossPrice,
        t.barrierHit,
        t.holdingBars,
        t.aiConfidence,
        t.aiAccepted ? `ACCEPT_${t.direction}` : 'REJECT_SKIP',
        t.positionMultiplier,
        t.rawReturnPct,
        t.sizedReturnPct,
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astraquant_x_test_trades.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTrades = (backtestReport?.trades ?? []).filter((t) => {
    if (filterMode === 'ACCEPTED') return t.aiAccepted;
    if (filterMode === 'REJECTED') return !t.aiAccepted;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-cyan-400">
              Chronological Out-of-Sample Evaluation (Zero Data Leakage)
            </div>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Backtesting & Strategy Comparison
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Compares the unfiltered VWAP + RSI primary strategy against the Random Forest
              meta-labeled strategy strictly on the final{' '}
              <span className="font-mono text-cyan-300">
                {backtestReport ? `${((1 - backtestReport.trainRatio) * 100).toFixed(0)}%` : '30%'}
              </span>{' '}
              chronological test split.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </button>
            <button
              type="button"
              disabled={busy || !summary?.datasetLoaded}
              onClick={onStepSignals}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-blue-500/60 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              Run Strategy
            </button>
            <button
              type="button"
              disabled={busy || !summary?.datasetLoaded}
              onClick={onStepTrainPredict}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-600/20 px-3 py-2 text-xs font-medium text-purple-200 hover:bg-purple-600/30 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Run AI Model
            </button>
            <button
              type="button"
              disabled={busy || !summary?.modelReport?.trained}
              onClick={onStepBacktest}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              Run Backtest
            </button>
            {backtestReport && (
              <>
                <button
                  type="button"
                  onClick={downloadTradesCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#070c18] px-3 py-2 text-xs font-medium text-cyan-300 hover:border-cyan-500/50 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Trades CSV
                </button>
                <button
                  type="button"
                  onClick={downloadBacktestJson}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#070c18] px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {!backtestReport ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0b1120] p-12 text-center">
          <p className="text-sm text-slate-300">
            Backtesting results are not generated yet. Run the strategy, train the Random Forest
            model, and execute Backtest to populate performance charts.
          </p>
        </div>
      ) : (
        <>
          {/* Trading Performance vs ML Classification Metrics (Clearly Distinguished) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Trading Performance Comparison */}
            <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5 lg:col-span-7">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-white">
                  Trading Performance Metrics (Out-of-Sample Test Split)
                </h2>
                <span className="text-xs text-slate-400">Financial Execution</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 pr-3">Metric</th>
                      <th className="px-3 py-2.5 text-right">Primary (VWAP+RSI)</th>
                      <th className="pl-3 py-2.5 text-right text-cyan-300">AI Meta-Labeled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                    <tr>
                      <td className="py-2.5 pr-3 font-sans text-slate-300">Total Executed Trades</td>
                      <td className="px-3 py-2.5 text-right">{backtestReport.primaryMetrics.totalTrades}</td>
                      <td className="pl-3 py-2.5 text-right font-semibold text-white">
                        {backtestReport.aiMetrics.totalTrades}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-sans text-slate-300">Winning / Losing Trades</td>
                      <td className="px-3 py-2.5 text-right">
                        {backtestReport.primaryMetrics.winningTrades} /{' '}
                        {backtestReport.primaryMetrics.losingTrades}
                      </td>
                      <td className="pl-3 py-2.5 text-right font-semibold text-white">
                        {backtestReport.aiMetrics.winningTrades} /{' '}
                        {backtestReport.aiMetrics.losingTrades}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-sans text-slate-300">Win Rate</td>
                      <td className="px-3 py-2.5 text-right">
                        {backtestReport.primaryMetrics.winRate.toFixed(2)}%
                      </td>
                      <td className="pl-3 py-2.5 text-right font-semibold text-emerald-400">
                        {backtestReport.aiMetrics.winRate.toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-sans text-slate-300">Total Return</td>
                      <td className="px-3 py-2.5 text-right">
                        {backtestReport.primaryMetrics.totalReturnPct >= 0 ? '+' : ''}
                        {backtestReport.primaryMetrics.totalReturnPct.toFixed(2)}%
                      </td>
                      <td
                        className={`pl-3 py-2.5 text-right font-semibold ${
                          backtestReport.aiMetrics.totalReturnPct >= 0
                            ? 'text-cyan-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {backtestReport.aiMetrics.totalReturnPct >= 0 ? '+' : ''}
                        {backtestReport.aiMetrics.totalReturnPct.toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-sans text-slate-300">Maximum Drawdown</td>
                      <td className="px-3 py-2.5 text-right text-rose-400">
                        -{backtestReport.primaryMetrics.maxDrawdownPct.toFixed(2)}%
                      </td>
                      <td className="pl-3 py-2.5 text-right font-semibold text-blue-300">
                        -{backtestReport.aiMetrics.maxDrawdownPct.toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-sans text-slate-300">Profit Factor</td>
                      <td className="px-3 py-2.5 text-right">
                        {backtestReport.primaryMetrics.profitFactor.toFixed(2)}
                      </td>
                      <td className="pl-3 py-2.5 text-right font-semibold text-white">
                        {backtestReport.aiMetrics.profitFactor.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Machine Learning Classification Metrics */}
            <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5 lg:col-span-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-white">
                  ML Classification Metrics (Random Forest)
                </h2>
                <span className="text-xs text-purple-400">
                  {backtestReport.classificationMetrics.sampleCount} Test Signals
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                  <div className="font-sans text-xs text-slate-400">Accuracy</div>
                  <div className="mt-1 text-xl font-bold text-white">
                    {backtestReport.classificationMetrics.accuracy.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                  <div className="font-sans text-xs text-slate-400">Precision</div>
                  <div className="mt-1 text-xl font-bold text-cyan-300">
                    {backtestReport.classificationMetrics.precision.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                  <div className="font-sans text-xs text-slate-400">Recall</div>
                  <div className="mt-1 text-xl font-bold text-blue-300">
                    {backtestReport.classificationMetrics.recall.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                  <div className="font-sans text-xs text-slate-400">F1-Score</div>
                  <div className="mt-1 text-xl font-bold text-purple-300">
                    {backtestReport.classificationMetrics.f1Score.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-800 bg-[#070c18] p-3">
                <div className="mb-2 text-xs font-medium text-slate-400">
                  Test Confusion Matrix (Triple Barrier Ground Truth)
                </div>
                <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs tabular-nums">
                  <div className="rounded border border-emerald-500/30 bg-emerald-950/20 py-2">
                    <div className="text-slate-400">True Positive (TP)</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {backtestReport.classificationMetrics.tp}
                    </div>
                  </div>
                  <div className="rounded border border-rose-500/30 bg-rose-950/20 py-2">
                    <div className="text-slate-400">False Positive (FP)</div>
                    <div className="text-sm font-bold text-rose-400">
                      {backtestReport.classificationMetrics.fp}
                    </div>
                  </div>
                  <div className="rounded border border-amber-500/30 bg-amber-950/20 py-2">
                    <div className="text-slate-400">False Negative (FN)</div>
                    <div className="text-sm font-bold text-amber-300">
                      {backtestReport.classificationMetrics.fn}
                    </div>
                  </div>
                  <div className="rounded border border-cyan-500/30 bg-cyan-950/20 py-2">
                    <div className="text-slate-400">True Negative (TN)</div>
                    <div className="text-sm font-bold text-cyan-300">
                      {backtestReport.classificationMetrics.tn}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5 Required Chart.js Visualizations */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Equity Curve (Base = 100, Out-of-Sample)
              </h3>
              <EquityCurveChart report={backtestReport} />
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Drawdown Curve (%)
              </h3>
              <DrawdownChart report={backtestReport} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Win / Loss Distribution
              </h3>
              <WinLossChart report={backtestReport} />
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Monthly Performance (%)
              </h3>
              <MonthlyPerfChart report={backtestReport} />
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Trade Decision Distribution
              </h3>
              <DecisionDistributionChart report={backtestReport} />
            </div>
          </div>

          {/* Detailed Test Trade Log */}
          <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Out-of-Sample Signal & Trade Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Every primary test signal with its AI probability, final gate decision, and exact
                  Triple Barrier exit.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#070c18] p-1">
                {(['ALL', 'ACCEPTED', 'REJECTED'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      filterMode === mode
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'ALL'
                      ? 'All Signals'
                      : mode === 'ACCEPTED'
                      ? 'Accepted Trades'
                      : 'Rejected / Skipped'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs tabular-nums">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 pr-3">#</th>
                    <th className="px-3 py-2.5">Entry Time</th>
                    <th className="px-3 py-2.5">Exit Time</th>
                    <th className="px-3 py-2.5">Signal</th>
                    <th className="px-3 py-2.5 text-right">Entry</th>
                    <th className="px-3 py-2.5 text-right">TP (+1.6 ATR)</th>
                    <th className="px-3 py-2.5 text-right">SL (-1.0 ATR)</th>
                    <th className="px-3 py-2.5">Barrier Crossed</th>
                    <th className="px-3 py-2.5 text-right">AI Conf</th>
                    <th className="px-3 py-2.5">Decision</th>
                    <th className="pl-3 py-2.5 text-right">Sized PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/40">
                      <td className="py-2 pr-3 text-slate-400">{t.id}</td>
                      <td className="px-3 py-2 text-slate-300">{t.entryTimestamp.slice(5, 16)}</td>
                      <td className="px-3 py-2 text-slate-400">{t.exitTimestamp.slice(5, 16)}</td>
                      <td
                        className={`px-3 py-2 font-semibold ${
                          t.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.direction}
                      </td>
                      <td className="px-3 py-2 text-right">{t.entryPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-emerald-400">
                        {t.profitTargetPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-rose-400">
                        {t.stopLossPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{t.barrierHit}</td>
                      <td className="px-3 py-2 text-right text-cyan-300">
                        {(t.aiConfidence * 100).toFixed(1)}%
                      </td>
                      <td
                        className={`px-3 py-2 font-semibold ${
                          t.aiAccepted ? 'text-cyan-300' : 'text-amber-300'
                        }`}
                      >
                        {t.aiAccepted ? `ACCEPT ${t.direction}` : 'REJECT / SKIP'}
                      </td>
                      <td
                        className={`pl-3 py-2 text-right font-semibold ${
                          !t.aiAccepted
                            ? 'text-slate-500'
                            : t.sizedReturnPct >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {t.aiAccepted
                          ? `${t.sizedReturnPct >= 0 ? '+' : ''}${t.sizedReturnPct.toFixed(3)}%`
                          : '0.000% (Skipped)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

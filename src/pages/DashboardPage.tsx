import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Info,
  Play,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from 'lucide-react';
import { CandlestickChart } from '../components/CandlestickChart';
import { EnrichedCandle, PipelineStateSummary } from '../types/quant';

interface DashboardPageProps {
  summary: PipelineStateSummary | null;
  candles: EnrichedCandle[];
  warnings: string[];
  busy: boolean;
  onUploadCsv: (file: File) => Promise<void>;
  onRunDemo: () => Promise<void>;
  onStepSignals: () => Promise<void>;
  onStepFeatures: () => Promise<void>;
  onStepTrainPredict: () => Promise<void>;
  onStepBacktest: () => Promise<void>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  candles,
  warnings,
  busy,
  onUploadCsv,
  onRunDemo,
  onStepSignals,
  onStepFeatures,
  onStepTrainPredict,
  onStepBacktest,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>('TEST_SPLIT');
  const [selectedSignalIdx, setSelectedSignalIdx] = useState<number | null>(null);
  const [showRejected, setShowRejected] = useState(true);
  const [showCrossings, setShowCrossings] = useState(true);

  const sessions = useMemo(() => {
    const dates = Array.from(new Set(candles.map((c) => c.timestamp.slice(0, 10))));
    return dates;
  }, [candles]);

  const visibleCandles = useMemo(() => {
    if (candles.length === 0) return [];
    if (selectedSession === 'TEST_SPLIT') {
      const test = candles.filter((c) => c.splitRole === 'TEST');
      return test.length > 0 ? test.slice(-150) : candles.slice(-150);
    }
    if (selectedSession === 'LAST_100') {
      return candles.slice(-100);
    }
    return candles.filter((c) => c.timestamp.startsWith(selectedSession));
  }, [candles, selectedSession]);

  const visibleSignals = useMemo(
    () => visibleCandles.filter((c) => c.primarySignal !== 'NONE'),
    [visibleCandles]
  );

  // Default inspected signal: user selection if still visible, else last signal in visible window, else last signal overall
  const inspectedCandle = useMemo(() => {
    if (selectedSignalIdx !== null) {
      const found = candles.find((c) => c.index === selectedSignalIdx);
      if (found) return found;
    }
    if (visibleSignals.length > 0) {
      return visibleSignals[visibleSignals.length - 1];
    }
    const allSignals = candles.filter((c) => c.primarySignal !== 'NONE');
    return allSignals[allSignals.length - 1] ?? candles[candles.length - 1] ?? null;
  }, [candles, visibleSignals, selectedSignalIdx]);

  const latest = summary?.latestCandle ?? candles[candles.length - 1] ?? null;
  const prevCandle =
    candles.length >= 2 ? candles[candles.length - 2] : latest;
  const priceChange = latest && prevCandle ? latest.close - prevCandle.close : 0;
  const priceChangePct =
    latest && prevCandle && prevCandle.close > 0
      ? (priceChange / prevCandle.close) * 100
      : 0;

  // Most recent actionable signal across dataset for top decision summary
  const activeSignalCandle = useMemo(() => {
    const sigs = candles.filter((c) => c.primarySignal !== 'NONE');
    return sigs[sigs.length - 1] ?? latest;
  }, [candles, latest]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadCsv(file);
      e.target.value = '';
    }
  };

  const handleDownloadSample = () => {
    window.location.href = '/api/data/sample-csv';
  };

  const decisionDisplay = activeSignalCandle?.finalDecision ?? 'NO SIGNAL';
  const decisionTone =
    decisionDisplay === 'ACCEPT BUY'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30'
      : decisionDisplay === 'ACCEPT SELL'
      ? 'text-rose-400 border-rose-500/40 bg-rose-950/30'
      : 'text-amber-300 border-amber-500/40 bg-amber-950/25';

  return (
    <div className="space-y-6">
      {/* Historical / Demo Data Transparency Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0b1120] px-4 py-3 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>
            <strong className="text-white">
              {summary?.isSampleDemoData ? 'Historical Sample / Demo Data' : 'Uploaded Historical CSV'}
            </strong>
            {' · '}
            {summary?.datasetName || 'No dataset loaded'}
            {summary?.dateRange && (
              <>
                {' · '}
                <span className="font-mono text-slate-400">
                  {summary.dateRange.start} to {summary.dateRange.end}
                </span>
              </>
            )}
            {' · '}
            <span className="text-slate-400">
              Academic decision-support simulation (no live broker feed).
            </span>
          </span>
        </div>
        {warnings.length > 0 && (
          <span className="text-amber-300">{warnings.length} CSV envelope warning(s)</span>
        )}
      </div>

      {/* Data Upload & Pipeline Control Bar */}
      <section className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload 5m OHLCV CSV
            </button>

            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              Download Sample CSV
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={onRunDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/25 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Demo Mode (One-Click)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-slate-400">Pipeline Steps:</span>
            <button
              type="button"
              disabled={busy || candles.length === 0}
              onClick={onStepSignals}
              className="rounded-md border border-slate-700 bg-[#070c18] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-blue-500/60 hover:text-white disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              1. Signals
            </button>
            <button
              type="button"
              disabled={busy || candles.length === 0}
              onClick={onStepFeatures}
              className="rounded-md border border-slate-700 bg-[#070c18] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-blue-500/60 hover:text-white disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              2. Features
            </button>
            <button
              type="button"
              disabled={busy || candles.length === 0}
              onClick={onStepTrainPredict}
              className="rounded-md border border-slate-700 bg-[#070c18] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-purple-500/60 hover:text-white disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              3. Train & Predict RF
            </button>
            <button
              type="button"
              disabled={busy || !summary?.modelReport?.trained}
              onClick={onStepBacktest}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Play className="h-3 w-3" />
              4. Backtest
            </button>
          </div>
        </div>
      </section>

      {/* Live / Historical Market Telemetry & Decision Strip */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">NIFTY 50 Price</div>
          <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
            {latest ? latest.close.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div
            className={`mt-1 font-mono text-xs tabular-nums ${
              priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {latest
              ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${priceChangePct >= 0 ? '+' : ''}${priceChangePct.toFixed(2)}%)`
              : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">Market Trend</div>
          <div
            className={`mt-1 text-lg font-bold ${
              latest?.trend === 'BULLISH'
                ? 'text-emerald-400'
                : latest?.trend === 'BEARISH'
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {latest?.trend ?? '—'}
          </div>
          <div className="mt-1 text-xs text-slate-400">Close vs Session VWAP</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">RSI (14)</div>
          <div className="mt-1 font-mono text-xl font-bold text-cyan-300 tabular-nums">
            {latest ? latest.rsi.toFixed(2) : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {latest
              ? latest.rsi > 70
                ? 'Overbought Zone'
                : latest.rsi < 30
                ? 'Oversold Zone'
                : 'Neutral Momentum'
              : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">Session VWAP</div>
          <div className="mt-1 font-mono text-xl font-bold text-blue-300 tabular-nums">
            {latest ? latest.vwap.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
            Z: {latest ? latest.features.vwapZScore.toFixed(2) : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">ATR (14)</div>
          <div className="mt-1 font-mono text-xl font-bold text-purple-300 tabular-nums">
            {latest ? latest.atr.toFixed(2) : '—'}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
            TP: +{latest ? (latest.atr * 1.6).toFixed(1) : '—'} / SL: -
            {latest ? latest.atr.toFixed(1) : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">Volume (5m)</div>
          <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
            {latest ? `${(latest.volume / 1000).toFixed(1)}k` : '—'}
          </div>
          <div className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
            Surge: {latest ? `${latest.features.volumeSurge.toFixed(2)}x` : '—'} SMA20
          </div>
        </div>
      </section>

      {/* Primary Signal vs AI-Filtered Final Decision Banner */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">Original Primary Strategy Signal (VWAP + RSI)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`font-mono text-xl font-bold ${
                activeSignalCandle?.primarySignal === 'BUY'
                  ? 'text-emerald-400'
                  : activeSignalCandle?.primarySignal === 'SELL'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {activeSignalCandle?.primarySignal ?? 'NONE'}
            </span>
            <span className="font-mono text-xs text-slate-400">
              {activeSignalCandle?.timestamp ?? ''}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {activeSignalCandle?.signalReason || 'Awaiting primary crossover'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-4">
          <div className="text-xs text-slate-400">Random Forest Meta-Label Confidence</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold text-cyan-300 tabular-nums">
              {activeSignalCandle?.aiConfidence !== null &&
              activeSignalCandle?.aiConfidence !== undefined
                ? `${(activeSignalCandle.aiConfidence * 100).toFixed(1)}%`
                : '—'}
            </span>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              Threshold:{' '}
              {summary?.modelReport
                ? `${(summary.modelReport.confidenceThreshold * 100).toFixed(0)}%`
                : '52%'}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{
                width: `${
                  activeSignalCandle?.aiConfidence
                    ? Math.min(100, activeSignalCandle.aiConfidence * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${decisionTone}`}>
          <div className="text-xs opacity-80">AI-Filtered Final Trading Decision</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-xl font-bold">
              {decisionDisplay === 'ACCEPT BUY'
                ? 'BUY (ACCEPT)'
                : decisionDisplay === 'ACCEPT SELL'
                ? 'SELL (ACCEPT)'
                : 'SKIP (REJECT)'}
            </span>
            <span className="font-mono text-xs tabular-nums">
              Size: {activeSignalCandle?.risk?.positionSizeMultiplier ?? 0}x
            </span>
          </div>
          <p className="mt-1 text-xs opacity-85">
            {decisionDisplay === 'REJECT / SKIP'
              ? 'Filtered out by Random Forest meta-classifier to avoid potential false signal.'
              : decisionDisplay === 'NO SIGNAL'
              ? 'No primary trigger active.'
              : 'Primary trigger passed Random Forest quality threshold.'}
          </p>
        </div>
      </section>

      {/* Main Candlestick Chart + Signal/Barrier Inspector */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5 xl:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                NIFTY 50 Five-Minute Candlestick Chart & Triple Barrier Crossings
              </h2>
              <p className="text-xs text-slate-400">
                Click any signal candle to inspect its +1.6 ATR Profit Target, -1.0 ATR Stop-Loss,
                and exact barrier crossing point.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showRejected}
                  onChange={(e) => setShowRejected(e.target.checked)}
                  className="accent-cyan-400"
                />
                Show Skipped Signals
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={showCrossings}
                  onChange={(e) => setShowCrossings(e.target.checked)}
                  className="accent-cyan-400"
                />
                Show TP/SL Crossings
              </label>
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedSession}
                  onChange={(e) => {
                    setSelectedSession(e.target.value);
                    setSelectedSignalIdx(null);
                  }}
                  className="rounded-lg border border-slate-700 bg-[#070c18] px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="TEST_SPLIT">Out-of-Sample Test Window</option>
                  <option value="LAST_100">Last 100 Candles</option>
                  {sessions.map((s) => (
                    <option key={s} value={s}>
                      Session: {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {visibleCandles.length > 0 ? (
            <CandlestickChart
              candles={visibleCandles}
              selectedSignalIndex={inspectedCandle?.index ?? null}
              onSelectCandle={(c) => setSelectedSignalIdx(c.index)}
              showRejectedSignals={showRejected}
              showBarrierCrossings={showCrossings}
            />
          ) : (
            <div className="flex h-[460px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 text-center">
              <FileSpreadsheet className="h-8 w-8 text-slate-500" />
              <p className="mt-2 text-sm text-slate-300">No market candles loaded yet.</p>
              <button
                type="button"
                onClick={onRunDemo}
                className="mt-3 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950"
              >
                Load Historical Demo Data
              </button>
            </div>
          )}
        </div>

        {/* Right Signal & Risk Inspector */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0b1120] p-5 xl:col-span-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Signal & Barrier Inspector</h3>
                <div className="text-xs text-slate-400">
                  {visibleSignals.length} primary signal(s) in current chart view
                </div>
              </div>
              {visibleSignals.length > 0 && (
                <select
                  value={inspectedCandle?.index ?? ''}
                  onChange={(e) => setSelectedSignalIdx(Number(e.target.value))}
                  className="max-w-[165px] rounded-md border border-slate-700 bg-[#070c18] px-2 py-1 font-mono text-xs text-cyan-300"
                >
                  {visibleSignals.map((sig) => (
                    <option key={sig.index} value={sig.index}>
                      {sig.timestamp.slice(5, 16)} · {sig.primarySignal}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {inspectedCandle && inspectedCandle.primarySignal !== 'NONE' ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                    <div className="text-slate-400">Primary Strategy</div>
                    <div
                      className={`mt-1 font-mono text-sm font-bold ${
                        inspectedCandle.primarySignal === 'BUY'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {inspectedCandle.primarySignal}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                    <div className="text-slate-400">AI Decision</div>
                    <div
                      className={`mt-1 font-mono text-sm font-bold ${
                        inspectedCandle.finalDecision === 'ACCEPT BUY'
                          ? 'text-emerald-400'
                          : inspectedCandle.finalDecision === 'ACCEPT SELL'
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {inspectedCandle.finalDecision}
                    </div>
                  </div>
                </div>

                {inspectedCandle.tripleBarrier && (
                  <div className="space-y-2 rounded-lg border border-slate-800 bg-[#070c18] p-3.5 text-xs">
                    <div className="font-semibold text-white">
                      Triple Barrier & Risk Coordinates
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entry Price ({inspectedCandle.timestamp.slice(11, 16)})</span>
                      <span className="font-mono text-white tabular-nums">
                        {inspectedCandle.tripleBarrier.entryPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Upper Profit Target (+1.6 ATR)</span>
                      <span className="font-mono text-emerald-400 tabular-nums">
                        {inspectedCandle.tripleBarrier.profitTargetPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lower Stop Loss (-1.0 ATR)</span>
                      <span className="font-mono text-rose-400 tabular-nums">
                        {inspectedCandle.tripleBarrier.stopLossPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Barrier Crossed</span>
                      <span
                        className={`font-mono font-semibold ${
                          inspectedCandle.tripleBarrier.barrierHit === 'PROFIT_TARGET'
                            ? 'text-cyan-300'
                            : inspectedCandle.tripleBarrier.barrierHit === 'STOP_LOSS'
                            ? 'text-rose-400'
                            : 'text-purple-300'
                        }`}
                      >
                        {inspectedCandle.tripleBarrier.barrierHit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Crossing Candle</span>
                      <span className="font-mono text-slate-200 tabular-nums">
                        {inspectedCandle.tripleBarrier.exitTimestamp.slice(5, 16)} @{' '}
                        {inspectedCandle.tripleBarrier.exitPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-400">Outcome Return ({inspectedCandle.tripleBarrier.holdingBars} bars)</span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          inspectedCandle.tripleBarrier.returnPct >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {inspectedCandle.tripleBarrier.returnPct >= 0 ? '+' : ''}
                        {inspectedCandle.tripleBarrier.returnPct.toFixed(3)}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 rounded-lg border border-slate-800 bg-[#070c18] p-3.5 text-xs">
                  <div className="mb-1.5 font-semibold text-white">8 Extracted Features</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono tabular-nums">
                    <div className="flex justify-between text-slate-400">
                      <span>VWAP Z:</span>
                      <span className="text-slate-200">{inspectedCandle.features.vwapZScore.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Norm RSI:</span>
                      <span className="text-slate-200">{inspectedCandle.features.normalizedRsi.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>RSI Vel:</span>
                      <span className="text-slate-200">{inspectedCandle.features.rsiVelocity3Bar.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Vol Surge:</span>
                      <span className="text-slate-200">{inspectedCandle.features.volumeSurge.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Body Ratio:</span>
                      <span className="text-slate-200">{inspectedCandle.features.candleBodyRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Upper Wick:</span>
                      <span className="text-slate-200">{inspectedCandle.features.upperShadowRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Lower Wick:</span>
                      <span className="text-slate-200">{inspectedCandle.features.lowerShadowRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Real. Vol:</span>
                      <span className="text-slate-200">{inspectedCandle.features.realizedVolatility.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4 text-xs text-slate-400">
                Select any signal triangle/diamond on the candlestick chart or switch sessions to
                inspect entry, stop loss, profit target, and feature scores.
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
            CSV format required: <span className="font-mono text-slate-300">Timestamp, Open, High, Low, Close, Volume</span>
          </div>
        </div>
      </section>
    </div>
  );
};

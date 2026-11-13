import React, { useMemo, useState } from 'react';
import { CandlestickChart } from '../components/CandlestickChart';
import { FeatureImportanceChart } from '../components/BacktestCharts';
import { EnrichedCandle, PipelineStateSummary } from '../types/quant';

interface WorkflowPageProps {
  summary: PipelineStateSummary | null;
  candles: EnrichedCandle[];
}

const STEPS = [
  { id: 1, title: 'Step 1: Market Data Input', subtitle: 'NIFTY 50 5-min OHLCV candles' },
  { id: 2, title: 'Step 2: Technical Indicators', subtitle: 'VWAP, RSI, ATR, Volume SMA' },
  { id: 3, title: 'Step 3: Primary Strategy', subtitle: 'VWAP + RSI BUY/SELL triggers' },
  { id: 4, title: 'Step 4: Feature Extraction', subtitle: 'Eight quantitative features' },
  { id: 5, title: 'Step 5: Triple Barrier Method', subtitle: '+1.6 ATR / -1.0 ATR / 12 bars' },
  { id: 6, title: 'Step 6: Random Forest Meta-Labeling', subtitle: 'Weka-aligned probability filter' },
  { id: 7, title: 'Step 7: Final Trading Decision', subtitle: 'ACCEPT BUY / SELL or SKIP' },
  { id: 8, title: 'Step 8: Risk Management', subtitle: 'ATR sizing & R:R discipline' },
  { id: 9, title: 'Step 9: Backtesting', subtitle: 'Out-of-sample test evaluation' },
];

export const WorkflowPage: React.FC<WorkflowPageProps> = ({ summary, candles }) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const signalCandles = useMemo(
    () => candles.filter((c) => c.primarySignal !== 'NONE' && c.tripleBarrier !== null),
    [candles]
  );

  // Pick a clear Profit Target win or Stop Loss signal for Step 5 Triple Barrier demonstration
  const barrierDemoCandle = useMemo(() => {
    return (
      signalCandles.find((c) => c.tripleBarrier?.barrierHit === 'PROFIT_TARGET') ??
      signalCandles[0] ??
      null
    );
  }, [signalCandles]);

  const barrierWindowCandles = useMemo(() => {
    if (!barrierDemoCandle) return candles.slice(0, 30);
    const start = Math.max(0, barrierDemoCandle.index - 8);
    const end = Math.min(candles.length, barrierDemoCandle.index + 20);
    return candles.slice(start, end);
  }, [candles, barrierDemoCandle]);

  const latest = candles[candles.length - 1] ?? null;
  const inspectedSig =
    signalCandles.find((c) => c.aiPrediction === 'ACCEPT') ??
    signalCandles[signalCandles.length - 1] ??
    latest;

  const bt = summary?.backtestReport;
  const mr = summary?.modelReport;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
        <div className="text-xs font-medium text-cyan-400">Interactive Pipeline Walkthrough</div>
        <h1 className="mt-1 text-2xl font-bold text-white">
          How ASTRAQUANT X Evaluates Every Trade in 9 Stages
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Select any stage below to inspect live calculations directly from the active dataset.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Step Selector List */}
        <div className="space-y-2 lg:col-span-4">
          {STEPS.map((step) => {
            const active = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-cyan-500/60 bg-cyan-950/25 text-white'
                    : 'border-slate-800 bg-[#0b1120] text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="text-sm font-semibold">{step.title}</div>
                <div className="mt-0.5 text-xs text-slate-400">{step.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detail Viewport */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6 lg:col-span-8">
          {activeStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 1: Market Data Input (5-Minute OHLCV)
              </h2>
              <p className="text-sm text-slate-300">
                The ingestion pipeline (`DataLoaderService`) validates required columns (`Timestamp`,
                `Open`, `High`, `Low`, `Close`, `Volume`), verifies numeric integrity, and enforces
                chronological ordering across {candles.length} candles.
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left font-mono text-xs tabular-nums">
                  <thead className="bg-[#070c18] text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Timestamp</th>
                      <th className="px-3 py-2 text-right">Open</th>
                      <th className="px-3 py-2 text-right">High</th>
                      <th className="px-3 py-2 text-right">Low</th>
                      <th className="px-3 py-2 text-right">Close</th>
                      <th className="px-3 py-2 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {candles.slice(-8).map((c) => (
                      <tr key={c.index} className="hover:bg-slate-900/40">
                        <td className="px-3 py-2 text-slate-300">{c.timestamp}</td>
                        <td className="px-3 py-2 text-right">{c.open.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-emerald-400">{c.high.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-rose-400">{c.low.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-white">{c.close.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{c.volume.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 2: Technical Indicators (VWAP, RSI, ATR, Volume)
              </h2>
              <p className="text-sm text-slate-300">
                Computed directly from the uploaded candles using session-resetting VWAP,
                14-period Wilder RSI, 14-period Wilder ATR, and 20-period Volume SMA.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Session VWAP (Latest)</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-cyan-300 tabular-nums">
                    {latest ? latest.vwap.toFixed(2) : '—'}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Cumulative (Typical Price × Volume) / Cumulative Volume, reset at 09:15 each session.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Wilder RSI (14)</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-blue-300 tabular-nums">
                    {latest ? latest.rsi.toFixed(2) : '—'}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Measures short-term momentum strength between 0 and 100.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Wilder ATR (14)</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-purple-300 tabular-nums">
                    {latest ? latest.atr.toFixed(2) : '—'}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Volatility unit driving dynamic +1.6 ATR target and -1.0 ATR stop loss.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Volume vs 20-Bar SMA</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                    {latest ? `${latest.volume.toLocaleString()} (${latest.features.volumeSurge.toFixed(2)}x)` : '—'}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Confirms institutional liquidity behind breakouts and VWAP crosses.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 3: Primary Strategy (VWAP + RSI)
              </h2>
              <p className="text-sm text-slate-300">
                The primary strategy generated <strong className="text-white">{signalCandles.length}</strong>{' '}
                initial BUY or SELL signals across the dataset based on VWAP crossovers and RSI
                pullback rebounds.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/30 bg-[#070c18] p-4">
                  <div className="text-sm font-semibold text-emerald-400">Initial BUY Trigger</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    Triggered when Close crosses above session VWAP with RSI between 40–68, or when
                    RSI rebounds cleanly above 44 while price holds above VWAP.
                  </p>
                </div>
                <div className="rounded-lg border border-rose-500/30 bg-[#070c18] p-4">
                  <div className="text-sm font-semibold text-rose-400">Initial SELL Trigger</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    Triggered when Close crosses below session VWAP with RSI between 32–60, or when
                    RSI rejects downward below 56 while price trades below VWAP.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left font-mono text-xs tabular-nums">
                  <thead className="bg-[#070c18] text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Timestamp</th>
                      <th className="px-3 py-2">Split</th>
                      <th className="px-3 py-2">Primary</th>
                      <th className="px-3 py-2 text-right">Close</th>
                      <th className="px-3 py-2 text-right">VWAP</th>
                      <th className="px-3 py-2 text-right">RSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {signalCandles.slice(-6).map((s) => (
                      <tr key={s.index}>
                        <td className="px-3 py-2 text-slate-300">{s.timestamp}</td>
                        <td className="px-3 py-2 text-slate-400">{s.splitRole}</td>
                        <td
                          className={`px-3 py-2 font-semibold ${
                            s.primarySignal === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {s.primarySignal}
                        </td>
                        <td className="px-3 py-2 text-right">{s.close.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-cyan-300">{s.vwap.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{s.rsi.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeStep === 4 && inspectedSig && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 4: Eight-Feature Extraction (Sample Signal: {inspectedSig.timestamp})
              </h2>
              <p className="text-sm text-slate-300">
                Each primary signal is converted into an 8-dimensional numeric feature vector fed to
                the Random Forest meta-classifier.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    name: '1. VWAP Z-Score',
                    val: inspectedSig.features.vwapZScore.toFixed(4),
                    desc: 'Standardized distance from intraday fair value.',
                    why: 'Rejects overextended chases far from VWAP.',
                  },
                  {
                    name: '2. Normalized RSI',
                    val: inspectedSig.features.normalizedRsi.toFixed(4),
                    desc: 'Centered RSI in [-1, +1].',
                    why: 'Pinpoints balanced momentum vs exhaustion.',
                  },
                  {
                    name: '3. RSI 3-Bar Velocity',
                    val: inspectedSig.features.rsiVelocity3Bar.toFixed(4),
                    desc: '3-candle slope of RSI.',
                    why: 'Verifies accelerating directional thrust.',
                  },
                  {
                    name: '4. Volume Surge',
                    val: `${inspectedSig.features.volumeSurge.toFixed(4)}x`,
                    desc: 'Volume relative to 20-bar SMA.',
                    why: 'Separates institutional breakouts from thin traps.',
                  },
                  {
                    name: '5. Candle Body Ratio',
                    val: inspectedSig.features.candleBodyRatio.toFixed(4),
                    desc: 'Body size relative to total High-Low range.',
                    why: 'Measures directional conviction vs doji chop.',
                  },
                  {
                    name: '6. Upper Shadow Ratio',
                    val: inspectedSig.features.upperShadowRatio.toFixed(4),
                    desc: 'Upper wick fraction of bar range.',
                    why: 'Detects overhead supply rejecting highs.',
                  },
                  {
                    name: '7. Lower Shadow Ratio',
                    val: inspectedSig.features.lowerShadowRatio.toFixed(4),
                    desc: 'Lower wick fraction of bar range.',
                    why: 'Detects demand absorption rejecting lows.',
                  },
                  {
                    name: '8. Realized Volatility',
                    val: `${inspectedSig.features.realizedVolatility.toFixed(4)}%`,
                    desc: '12-bar log-return volatility.',
                    why: 'Calibrates regime stability for ATR barriers.',
                  },
                ].map((f) => (
                  <div key={f.name} className="rounded-lg border border-slate-800 bg-[#070c18] p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{f.name}</span>
                      <span className="font-mono text-sm font-bold text-cyan-300 tabular-nums">
                        {f.val}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{f.desc}</p>
                    <p className="mt-1 text-xs text-slate-300">Why it matters: {f.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 5: Triple Barrier Method (+1.6 ATR / -1.0 ATR / 12 Candles)
              </h2>
              <p className="text-sm text-slate-300">
                Every historical primary signal is labeled by whichever barrier price touches first:
                Upper Profit Target (+1.6 ATR → Label 1), Lower Stop Loss (-1.0 ATR → Label 0), or
                the 12-candle Vertical Timeout.
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-emerald-500/30 bg-[#070c18] p-3">
                  <div className="font-semibold text-emerald-400">Upper Barrier</div>
                  <div className="mt-0.5 font-mono text-white">+1.6 × ATR Profit Target</div>
                </div>
                <div className="rounded-lg border border-rose-500/30 bg-[#070c18] p-3">
                  <div className="font-semibold text-rose-400">Lower Barrier</div>
                  <div className="mt-0.5 font-mono text-white">-1.0 × ATR Stop Loss</div>
                </div>
                <div className="rounded-lg border border-purple-500/30 bg-[#070c18] p-3">
                  <div className="font-semibold text-purple-300">Vertical Barrier</div>
                  <div className="mt-0.5 font-mono text-white">12 Candles (60 Min Max)</div>
                </div>
              </div>
              {barrierWindowCandles.length > 0 && (
                <CandlestickChart
                  candles={barrierWindowCandles}
                  selectedSignalIndex={barrierDemoCandle?.index ?? null}
                  showRejectedSignals={true}
                  showBarrierCrossings={true}
                />
              )}
            </div>
          )}

          {activeStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 6: Random Forest Meta-Labeling
              </h2>
              <p className="text-sm text-slate-300">
                Trained strictly on the chronological first {(mr?.trainRatio ?? 0.7) * 100}% of
                candles ({mr?.trainSignals ?? 0} labeled signals across {mr?.numTrees ?? 50} trees).
                The model outputs a probability confidence score for each candidate signal.
              </p>
              {mr && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 font-mono text-xs tabular-nums">
                    <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                      <div className="text-slate-400">Sample Signal Confidence</div>
                      <div className="mt-1 text-lg font-bold text-cyan-300">
                        {inspectedSig?.aiConfidence
                          ? `${(inspectedSig.aiConfidence * 100).toFixed(1)}%`
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                      <div className="text-slate-400">Classification Result</div>
                      <div className="mt-1 text-lg font-bold text-white">
                        {inspectedSig?.aiPrediction ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3">
                      <div className="text-slate-400">Test F1-Score</div>
                      <div className="mt-1 text-lg font-bold text-purple-300">
                        {bt ? `${bt.classificationMetrics.f1Score.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                  </div>
                  <FeatureImportanceChart items={mr.featureImportances} />
                </div>
              )}
            </div>
          )}

          {activeStep === 7 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 7: Final Trading Decision (Filter, Never Invent)
              </h2>
              <p className="text-sm text-slate-300">
                The AI meta-classifier strictly gates the primary strategy&apos;s signal. It never
                generates an independent trade when the primary VWAP + RSI strategy is inactive.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-4">
                  <div className="font-mono text-base font-bold text-emerald-400">ACCEPT BUY</div>
                  <p className="mt-2 text-xs text-slate-300">
                    Primary = BUY and Random Forest confidence ≥ threshold. Executed with
                    confidence-scaled sizing.
                  </p>
                </div>
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-4">
                  <div className="font-mono text-base font-bold text-rose-400">ACCEPT SELL</div>
                  <p className="mt-2 text-xs text-slate-300">
                    Primary = SELL and Random Forest confidence ≥ threshold. Short setup approved.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4">
                  <div className="font-mono text-base font-bold text-amber-300">REJECT / SKIP</div>
                  <p className="mt-2 text-xs text-slate-300">
                    Primary signal present, but AI probability below threshold. Capital stays in cash.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 8 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 8: Risk Management Engine
              </h2>
              <p className="text-sm text-slate-300">
                Every accepted trade receives deterministic volatility-scaled risk coordinates prior
                to execution (`RiskManagementService`).
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Stop Loss Rule</div>
                  <div className="mt-1 font-mono font-bold text-rose-400">-1.0 × ATR(14)</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Profit Target Rule</div>
                  <div className="mt-1 font-mono font-bold text-emerald-400">+1.6 × ATR(14)</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Reward / Risk Ratio</div>
                  <div className="mt-1 font-mono font-bold text-cyan-300">1.60 : 1</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                  <div className="text-xs text-slate-400">Max Holding Period</div>
                  <div className="mt-1 font-mono font-bold text-purple-300">12 Candles (60m)</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4 sm:col-span-2">
                  <div className="text-xs text-slate-400">Confidence-Based Position Sizing</div>
                  <div className="mt-1 font-mono text-white">
                    0.75x to 1.50x scaled by (Confidence - Threshold)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 9 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Step 9: Out-of-Sample Backtesting Summary
              </h2>
              {bt ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                    <div className="text-xs font-medium text-cyan-400">
                      Trading Performance (AI-Filtered Test Split)
                    </div>
                    <dl className="mt-3 space-y-2 font-mono text-xs tabular-nums">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Executed Trades</dt>
                        <dd className="text-white">{bt.aiMetrics.totalTrades}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Winning / Losing</dt>
                        <dd className="text-white">
                          {bt.aiMetrics.winningTrades} / {bt.aiMetrics.losingTrades}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Win Rate</dt>
                        <dd className="text-emerald-400">{bt.aiMetrics.winRate.toFixed(2)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Total Return</dt>
                        <dd className="text-cyan-300">
                          {bt.aiMetrics.totalReturnPct >= 0 ? '+' : ''}
                          {bt.aiMetrics.totalReturnPct.toFixed(2)}%
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Max Drawdown</dt>
                        <dd className="text-rose-400">-{bt.aiMetrics.maxDrawdownPct.toFixed(2)}%</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-[#070c18] p-4">
                    <div className="text-xs font-medium text-purple-400">
                      ML Classification Metrics (Meta-Labeling)
                    </div>
                    <dl className="mt-3 space-y-2 font-mono text-xs tabular-nums">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Accuracy</dt>
                        <dd className="text-white">{bt.classificationMetrics.accuracy.toFixed(2)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Precision (Positive Predictive)</dt>
                        <dd className="text-cyan-300">{bt.classificationMetrics.precision.toFixed(2)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Recall (Sensitivity)</dt>
                        <dd className="text-blue-300">{bt.classificationMetrics.recall.toFixed(2)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">F1-Score</dt>
                        <dd className="text-purple-300">{bt.classificationMetrics.f1Score.toFixed(2)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">TP / FP / TN / FN</dt>
                        <dd className="text-slate-300">
                          {bt.classificationMetrics.tp} / {bt.classificationMetrics.fp} /{' '}
                          {bt.classificationMetrics.tn} / {bt.classificationMetrics.fn}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  Run backtesting from the Dashboard or Backtesting tab to inspect live test metrics.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

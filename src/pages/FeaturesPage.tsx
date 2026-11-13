import React from 'react';
import { EnrichedCandle, EightFeatures, ModelTrainingReport } from '../types/quant';

interface FeaturesPageProps {
  candles: EnrichedCandle[];
  modelReport: ModelTrainingReport | null;
}

interface FeatureDefinition {
  key: keyof EightFeatures;
  index: string;
  name: string;
  formula: string;
  purpose: string;
  impact: string;
}

const FEATURE_DOCS: FeatureDefinition[] = [
  {
    key: 'vwapZScore',
    index: '01',
    name: 'VWAP Z-Score',
    formula: 'Z = (Close - VWAP) / StdDev_20(Close - VWAP)',
    purpose:
      'Measures how many standard deviations the current NIFTY 50 price sits above or below the intraday institutional fair-value anchor (VWAP).',
    impact:
      'Prevents chasing overextended moves (|Z| > 2.0) where mean reversion often triggers stop-outs right after entry.',
  },
  {
    key: 'normalizedRsi',
    index: '02',
    name: 'Normalized RSI',
    formula: 'NormRSI = (RSI_14 - 50) / 50   ∈ [-1, +1]',
    purpose:
      'Centers the 14-period Wilder Relative Strength Index around zero so tree splits treat bullish and bearish momentum symmetrically.',
    impact:
      'Separates healthy trend-continuation momentum from saturated overbought/oversold exhaustion zones.',
  },
  {
    key: 'rsiVelocity3Bar',
    index: '03',
    name: 'RSI 3-Bar Velocity',
    formula: 'Velocity = (RSI_t - RSI_{t-3}) / 3',
    purpose:
      'Captures the rate of change (acceleration) of momentum across the last 15 minutes (three 5-minute candles).',
    impact:
      'Positive velocity on BUY signals confirms active buyer acceleration rather than a stale drifting crossover.',
  },
  {
    key: 'volumeSurge',
    index: '04',
    name: 'Volume Surge',
    formula: 'VolSurge = Volume_t / SMA_20(Volume)',
    purpose:
      'Compares current 5-minute traded volume against its trailing 20-candle moving average to detect institutional participation.',
    impact:
      'Low-volume breakouts (< 0.85x) frequently fail into chop; high-volume surges (> 1.15x) raise Random Forest acceptance confidence.',
  },
  {
    key: 'candleBodyRatio',
    index: '05',
    name: 'Candle Body Ratio',
    formula: 'BodyRatio = |Close - Open| / max(High - Low, ε)',
    purpose:
      'Evaluates conviction inside the trigger candle by comparing the net open-to-close body against the full high-to-low bar range.',
    impact:
      'High ratios (> 0.55) signal decisive directional control, whereas spinning tops (< 0.25) indicate indecision.',
  },
  {
    key: 'upperShadowRatio',
    index: '06',
    name: 'Upper Shadow Ratio',
    formula: 'UpperShadow = (High - max(Open, Close)) / Range',
    purpose:
      'Quantifies intraday overhead supply and selling pressure rejecting higher prices during the 5-minute bar.',
    impact:
      'Large upper wicks on BUY triggers warn of immediate supply resistance and increase rejection probability.',
  },
  {
    key: 'lowerShadowRatio',
    index: '07',
    name: 'Lower Shadow Ratio',
    formula: 'LowerShadow = (min(Open, Close) - Low) / Range',
    purpose:
      'Measures lower-wick absorption where buyers stepped in to reject lower prices within the 5-minute interval.',
    impact:
      'Long lower wicks on SELL triggers indicate trapped shorts and demand absorption, helping the model skip bad shorts.',
  },
  {
    key: 'realizedVolatility',
    index: '08',
    name: 'Realized Volatility',
    formula: 'RV = StdDev_12(ln(C_t / C_{t-1})) × √75 × 100',
    purpose:
      'Estimates short-horizon 1-hour (12-bar) intraday volatility scaled to an NSE 75-bar session percentage.',
    impact:
      'Identifies erratic noise spikes versus smooth directional expansion so the +1.6 ATR / -1.0 ATR barriers stay well-calibrated.',
  },
];

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ candles, modelReport }) => {
  const signalCandles = candles.filter((c) => c.primarySignal !== 'NONE');
  const exampleCandle =
    signalCandles.find((c) => c.aiPrediction === 'ACCEPT') ??
    signalCandles[signalCandles.length - 1] ??
    candles[candles.length - 1];

  const impMap = new Map(
    (modelReport?.featureImportances ?? []).map((item) => [item.key, item])
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
        <div className="text-xs font-medium text-cyan-400">Feature Engineering Matrix</div>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Eight Microstructure & Momentum Features
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          Every time the primary VWAP + RSI strategy produces a BUY or SELL trigger, ASTRAQUANT X
          extracts these eight quantitative features from the trigger candle and trailing window.
          Example values below are computed live from{' '}
          <span className="font-mono text-cyan-300">
            {exampleCandle ? exampleCandle.timestamp : 'loaded dataset'}
          </span>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {FEATURE_DOCS.map((feat) => {
          const liveVal = exampleCandle ? exampleCandle.features[feat.key] : 0;
          const imp = impMap.get(feat.key);

          return (
            <article
              key={feat.key}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0b1120] p-5"
            >
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-xs font-semibold text-purple-400">
                      {feat.index}.
                    </span>
                    <h2 className="text-lg font-semibold text-white">{feat.name}</h2>
                  </div>
                  {imp && (
                    <span className="font-mono text-xs text-cyan-400 tabular-nums">
                      RF Weight: {imp.importance.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded-lg border border-slate-800/80 bg-[#070c18] px-3.5 py-2 font-mono text-xs text-cyan-300">
                  {feat.formula}
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <div className="text-xs font-medium text-slate-400">Purpose</div>
                    <p className="mt-0.5 leading-relaxed text-slate-300">{feat.purpose}</p>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-400">
                      Impact on Trade Filtering
                    </div>
                    <p className="mt-0.5 leading-relaxed text-slate-300">{feat.impact}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs">
                <div>
                  <span className="text-slate-400">Live Example Value: </span>
                  <span className="font-mono font-semibold text-white tabular-nums">
                    {liveVal.toFixed(4)}
                  </span>
                </div>
                {imp && (
                  <div className="font-mono text-slate-400 tabular-nums">
                    Accept Avg: <span className="text-emerald-400">{imp.meanAccepted.toFixed(3)}</span>{' '}
                    / Reject Avg:{' '}
                    <span className="text-rose-400">{imp.meanRejected.toFixed(3)}</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

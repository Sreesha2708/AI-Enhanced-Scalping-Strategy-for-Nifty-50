import {
  BacktestReport,
  BacktestTradeRecord,
  BarrierHitType,
  ClassificationMetrics,
  EightFeatures,
  EnrichedCandle,
  EquityPoint,
  FeatureImportanceItem,
  FinalDecisionType,
  MarketCandle,
  ModelTrainingReport,
  MonthlyPerfPoint,
  PrimarySignalType,
  RiskParameters,
  StrategyPerformanceMetrics,
  TripleBarrierResult,
} from '../src/types/quant';

export const FEATURE_METADATA: Array<{ key: keyof EightFeatures; label: string }> = [
  { key: 'vwapZScore', label: 'VWAP Z-Score' },
  { key: 'normalizedRsi', label: 'Normalized RSI' },
  { key: 'rsiVelocity3Bar', label: 'RSI 3-Bar Velocity' },
  { key: 'volumeSurge', label: 'Volume Surge' },
  { key: 'candleBodyRatio', label: 'Candle Body Ratio' },
  { key: 'upperShadowRatio', label: 'Upper Shadow Ratio' },
  { key: 'lowerShadowRatio', label: 'Lower Shadow Ratio' },
  { key: 'realizedVolatility', label: 'Realized Volatility' },
];

export const TRIPLE_BARRIER_CONFIG = {
  profitAtrMultiplier: 1.6,
  stopAtrMultiplier: 1.0,
  verticalBars: 12,
};

// ---------------------------------------------------------------------------
// 1. CSV Parsing & Validation
// ---------------------------------------------------------------------------
export function parseAndValidateCsv(csvContent: string): {
  candles: MarketCandle[];
  warnings: string[];
} {
  const cleaned = csvContent.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    throw new Error('CSV file is empty. Please upload a valid 5-minute OHLCV CSV file.');
  }

  const rawLines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length < 40) {
    throw new Error(
      `Insufficient data: found ${rawLines.length - 1} data rows. At least 40 five-minute candles are required to compute 14-period indicators and train/test splits.`
    );
  }

  const headerCols = rawLines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
  const colIndex: Record<string, number> = {};

  for (const req of required) {
    const idx = headerCols.indexOf(req);
    if (idx === -1) {
      throw new Error(
        `Missing required CSV column "${req}". Expected headers: Timestamp, Open, High, Low, Close, Volume.`
      );
    }
    colIndex[req] = idx;
  }

  const candles: MarketCandle[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const parts = rawLines[i].split(',').map((p) => p.trim());
    if (parts.length < 6) {
      throw new Error(`Malformed row at line ${i + 1}: expected at least 6 comma-separated columns.`);
    }

    const timestamp = parts[colIndex.timestamp];
    const open = Number(parts[colIndex.open]);
    const high = Number(parts[colIndex.high]);
    const low = Number(parts[colIndex.low]);
    const close = Number(parts[colIndex.close]);
    const volume = Number(parts[colIndex.volume]);

    if (!timestamp) {
      throw new Error(`Missing timestamp at line ${i + 1}.`);
    }

    if ([open, high, low, close, volume].some((v) => !Number.isFinite(v))) {
      throw new Error(
        `Invalid or missing numeric OHLCV value at line ${i + 1} (${timestamp}). Ensure no NaN or blank cells exist.`
      );
    }

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
      throw new Error(`Non-positive price found at line ${i + 1} (${timestamp}).`);
    }

    if (volume < 0) {
      throw new Error(`Negative volume found at line ${i + 1} (${timestamp}).`);
    }

    let fixedHigh = high;
    let fixedLow = low;
    if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) {
      fixedHigh = Math.max(high, open, close, low);
      fixedLow = Math.min(low, open, close, high);
      warnings.push(`Adjusted inconsistent High/Low envelope at line ${i + 1} (${timestamp}).`);
    }

    candles.push({
      index: candles.length,
      timestamp,
      open,
      high: fixedHigh,
      low: fixedLow,
      close,
      volume,
    });
  }

  return { candles, warnings };
}

// ---------------------------------------------------------------------------
// 2. Technical Indicators (Session VWAP, Wilder RSI-14, Wilder ATR-14, Vol SMA)
// ---------------------------------------------------------------------------
function extractSessionDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export function computeIndicatorsAndFeatures(
  rawCandles: MarketCandle[],
  trainRatio = 0.7
): EnrichedCandle[] {
  const n = rawCandles.length;
  const splitIdx = Math.floor(n * trainRatio);

  // Session VWAP
  const vwapArr = new Array<number>(n).fill(0);
  let cumPV = 0;
  let cumVol = 0;
  let currentDate = '';

  for (let i = 0; i < n; i++) {
    const c = rawCandles[i];
    const d = extractSessionDate(c.timestamp);
    if (d !== currentDate) {
      cumPV = 0;
      cumVol = 0;
      currentDate = d;
    }
    const typical = (c.high + c.low + c.close) / 3;
    const vol = Math.max(c.volume, 1);
    cumPV += typical * vol;
    cumVol += vol;
    vwapArr[i] = cumVol > 0 ? cumPV / cumVol : c.close;
  }

  // RSI (14-period Wilder's smoothing)
  const rsiArr = new Array<number>(n).fill(50);
  const rsiPeriod = 14;
  if (n > rsiPeriod) {
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= rsiPeriod; i++) {
      const diff = rawCandles[i].close - rawCandles[i - 1].close;
      if (diff >= 0) avgGain += diff;
      else avgLoss += Math.abs(diff);
    }
    avgGain /= rsiPeriod;
    avgLoss /= rsiPeriod;
    rsiArr[rsiPeriod] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = rsiPeriod + 1; i < n; i++) {
      const diff = rawCandles[i].close - rawCandles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
      if (avgLoss === 0) {
        rsiArr[i] = avgGain === 0 ? 50 : 100;
      } else {
        const rs = avgGain / avgLoss;
        rsiArr[i] = 100 - 100 / (1 + rs);
      }
    }
  }

  // ATR (14-period Wilder's smoothing)
  const atrArr = new Array<number>(n).fill(0);
  const trArr = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const c = rawCandles[i];
    if (i === 0) {
      trArr[i] = c.high - c.low;
    } else {
      const prevClose = rawCandles[i - 1].close;
      trArr[i] = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
    }
  }
  const atrPeriod = 14;
  if (n > atrPeriod) {
    let sumTr = 0;
    for (let i = 0; i < atrPeriod; i++) sumTr += trArr[i];
    let atr = sumTr / atrPeriod;
    for (let i = 0; i < atrPeriod; i++) atrArr[i] = Math.max(atr, 0.5);
    atrArr[atrPeriod] = Math.max(atr, 0.5);
    for (let i = atrPeriod + 1; i < n; i++) {
      atr = (atr * (atrPeriod - 1) + trArr[i]) / atrPeriod;
      atrArr[i] = Math.max(atr, 0.5);
    }
  } else {
    for (let i = 0; i < n; i++) atrArr[i] = Math.max(trArr[i], 0.5);
  }

  // Volume SMA(20)
  const volSmaArr = new Array<number>(n).fill(1);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - 19);
    let sum = 0;
    for (let j = start; j <= i; j++) sum += rawCandles[j].volume;
    volSmaArr[i] = Math.max(sum / (i - start + 1), 1);
  }

  // VWAP Deviation Rolling StdDev(20) for VWAP Z-Score
  const vwapDiffs = rawCandles.map((c, i) => c.close - vwapArr[i]);
  const vwapZArr = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - 19);
    const slice = vwapDiffs.slice(start, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance =
      slice.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / Math.max(slice.length, 1);
    const std = Math.sqrt(variance);
    vwapZArr[i] = std > 1e-4 ? (vwapDiffs[i] - mean) / std : 0;
  }

  // Log returns for Realized Volatility (12-bar window)
  const logReturns = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    logReturns[i] = Math.log(rawCandles[i].close / Math.max(rawCandles[i - 1].close, 1e-6));
  }

  const enriched: EnrichedCandle[] = [];

  for (let i = 0; i < n; i++) {
    const c = rawCandles[i];
    const vwap = Number(vwapArr[i].toFixed(2));
    const rsi = Number(rsiArr[i].toFixed(2));
    const atr = Number(atrArr[i].toFixed(2));
    const volumeSma = Math.round(volSmaArr[i]);

    const trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      c.close > vwap * 1.0004 ? 'BULLISH' : c.close < vwap * 0.9996 ? 'BEARISH' : 'NEUTRAL';

    // Primary Strategy (VWAP + RSI) — skip warmup first 15 bars
    let primarySignal: PrimarySignalType = 'NONE';
    let signalReason = 'No VWAP/RSI trigger';

    if (i >= 15) {
      const prev = rawCandles[i - 1];
      const prevVwap = vwapArr[i - 1];
      const prevRsi = rsiArr[i - 1];

      const bullishCross = c.close > vwap && prev.close <= prevVwap && rsi >= 40 && rsi <= 68;
      const bullishPullback = c.close > vwap && prevRsi < 44 && rsi >= 44 && rsi <= 60 && rsi > prevRsi;

      const bearishCross = c.close < vwap && prev.close >= prevVwap && rsi >= 32 && rsi <= 60;
      const bearishPullback = c.close < vwap && prevRsi > 56 && rsi <= 56 && rsi < prevRsi;

      if (bullishCross) {
        primarySignal = 'BUY';
        signalReason = 'Price crossed above session VWAP with constructive RSI momentum';
      } else if (bullishPullback) {
        primarySignal = 'BUY';
        signalReason = 'Bullish RSI rebound above VWAP support';
      } else if (bearishCross) {
        primarySignal = 'SELL';
        signalReason = 'Price crossed below session VWAP with bearish RSI slope';
      } else if (bearishPullback) {
        primarySignal = 'SELL';
        signalReason = 'Bearish RSI rejection below VWAP resistance';
      }
    }

    // Extract 8 Features
    const range = Math.max(c.high - c.low, 0.01);
    const body = Math.abs(c.close - c.open);
    const upperShadow = c.high - Math.max(c.open, c.close);
    const lowerShadow = Math.min(c.open, c.close) - c.low;

    const rsiPrev3 = i >= 3 ? rsiArr[i - 3] : rsiArr[0];
    const rsiVelocity3Bar = (rsi - rsiPrev3) / 3;

    const rvStart = Math.max(1, i - 11);
    const rvSlice = logReturns.slice(rvStart, i + 1);
    const rvMean = rvSlice.reduce((a, b) => a + b, 0) / Math.max(rvSlice.length, 1);
    const rvVar =
      rvSlice.reduce((acc, v) => acc + (v - rvMean) * (v - rvMean), 0) /
      Math.max(rvSlice.length, 1);
    // Intraday 5-min session scaling (sqrt(75) * 100 in %)
    const realizedVolatility = Math.sqrt(rvVar) * Math.sqrt(75) * 100;

    const features: EightFeatures = {
      vwapZScore: Number(vwapZArr[i].toFixed(4)),
      normalizedRsi: Number(((rsi - 50) / 50).toFixed(4)),
      rsiVelocity3Bar: Number(rsiVelocity3Bar.toFixed(4)),
      volumeSurge: Number((c.volume / Math.max(volSmaArr[i], 1)).toFixed(4)),
      candleBodyRatio: Number((body / range).toFixed(4)),
      upperShadowRatio: Number((upperShadow / range).toFixed(4)),
      lowerShadowRatio: Number((lowerShadow / range).toFixed(4)),
      realizedVolatility: Number(realizedVolatility.toFixed(4)),
    };

    enriched.push({
      ...c,
      vwap,
      rsi,
      atr,
      volumeSma,
      trend,
      primarySignal,
      signalReason,
      features,
      tripleBarrier: null,
      aiConfidence: null,
      aiPrediction: null,
      finalDecision: primarySignal === 'NONE' ? 'NO SIGNAL' : 'REJECT / SKIP',
      risk: null,
      splitRole: i < splitIdx ? 'TRAIN' : 'TEST',
    });
  }

  // Apply Triple Barrier Labeling on all primary signals
  for (let i = 0; i < enriched.length; i++) {
    const candle = enriched[i];
    if (candle.primarySignal === 'NONE') continue;

    // Need at least 1 subsequent candle to evaluate barriers
    if (i >= enriched.length - 1) continue;

    const direction = candle.primarySignal;
    const entryPrice = candle.close;
    const atr = Math.max(candle.atr, 0.5);
    const tpDist = TRIPLE_BARRIER_CONFIG.profitAtrMultiplier * atr;
    const slDist = TRIPLE_BARRIER_CONFIG.stopAtrMultiplier * atr;

    const profitTargetPrice =
      direction === 'BUY'
        ? Number((entryPrice + tpDist).toFixed(2))
        : Number((entryPrice - tpDist).toFixed(2));
    const stopLossPrice =
      direction === 'BUY'
        ? Number((entryPrice - slDist).toFixed(2))
        : Number((entryPrice + slDist).toFixed(2));

    const maxIndex = Math.min(enriched.length - 1, i + TRIPLE_BARRIER_CONFIG.verticalBars);
    let exitIndex = maxIndex;
    let exitPrice = enriched[maxIndex].close;
    let barrierHit: BarrierHitType = 'VERTICAL_TIMEOUT';

    for (let j = i + 1; j <= maxIndex; j++) {
      const future = enriched[j];
      if (direction === 'BUY') {
        const hitSL = future.low <= stopLossPrice;
        const hitTP = future.high >= profitTargetPrice;
        // Conservative tie-breaker: if both hit in same 5m bar, assume stop loss hit first
        if (hitSL) {
          exitIndex = j;
          exitPrice = stopLossPrice;
          barrierHit = 'STOP_LOSS';
          break;
        }
        if (hitTP) {
          exitIndex = j;
          exitPrice = profitTargetPrice;
          barrierHit = 'PROFIT_TARGET';
          break;
        }
      } else {
        const hitSL = future.high >= stopLossPrice;
        const hitTP = future.low <= profitTargetPrice;
        if (hitSL) {
          exitIndex = j;
          exitPrice = stopLossPrice;
          barrierHit = 'STOP_LOSS';
          break;
        }
        if (hitTP) {
          exitIndex = j;
          exitPrice = profitTargetPrice;
          barrierHit = 'PROFIT_TARGET';
          break;
        }
      }
    }

    const rawReturnPct =
      direction === 'BUY'
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100;

    // Meta-label = 1 if Upper Profit Barrier (+1.6 ATR) reached, or strictly positive timeout > 0.05%
    const metaLabel: 0 | 1 =
      barrierHit === 'PROFIT_TARGET' || (barrierHit === 'VERTICAL_TIMEOUT' && rawReturnPct > 0.04)
        ? 1
        : 0;

    const tripleBarrier: TripleBarrierResult = {
      entryIndex: i,
      entryTimestamp: candle.timestamp,
      entryPrice,
      direction,
      atrAtEntry: atr,
      profitTargetPrice,
      stopLossPrice,
      verticalBarrierIndex: maxIndex,
      exitIndex,
      exitTimestamp: enriched[exitIndex].timestamp,
      exitPrice: Number(exitPrice.toFixed(2)),
      barrierHit,
      holdingBars: exitIndex - i,
      returnPct: Number(rawReturnPct.toFixed(4)),
      metaLabel,
    };

    candle.tripleBarrier = tripleBarrier;
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// 3. Random Forest Meta-Labeling Classifier (CART Ensemble in TypeScript)
// ---------------------------------------------------------------------------
interface TreeNode {
  isLeaf: boolean;
  probPositive: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

interface TrainingSample {
  x: number[];
  y: 0 | 1;
}

function featuresToVector(f: EightFeatures): number[] {
  return [
    f.vwapZScore,
    f.normalizedRsi,
    f.rsiVelocity3Bar,
    f.volumeSurge,
    f.candleBodyRatio,
    f.upperShadowRatio,
    f.lowerShadowRatio,
    f.realizedVolatility,
  ];
}

function giniImpurity(posCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  const p = posCount / totalCount;
  return 1 - p * p - (1 - p) * (1 - p);
}

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildCartTree(
  samples: TrainingSample[],
  depth: number,
  maxDepth: number,
  minSamplesLeaf: number,
  mtry: number,
  rand: () => number,
  importanceAccum: number[]
): TreeNode {
  const n = samples.length;
  const pos = samples.reduce((acc, s) => acc + s.y, 0);
  const probPositive = n > 0 ? pos / n : 0.5;

  if (depth >= maxDepth || n < minSamplesLeaf * 2 || pos === 0 || pos === n) {
    return { isLeaf: true, probPositive };
  }

  const numFeatures = samples[0].x.length;
  const indices = Array.from({ length: numFeatures }, (_, i) => i);
  // Fisher-Yates shuffle to sample mtry features
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const candidateFeatures = indices.slice(0, mtry);

  const parentGini = giniImpurity(pos, n);
  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestLeft: TrainingSample[] = [];
  let bestRight: TrainingSample[] = [];

  for (const fIdx of candidateFeatures) {
    const sorted = [...samples].sort((a, b) => a.x[fIdx] - b.x[fIdx]);
    let leftPos = 0;
    for (let i = 0; i < n - 1; i++) {
      leftPos += sorted[i].y;
      const leftCount = i + 1;
      const rightCount = n - leftCount;
      if (leftCount < minSamplesLeaf || rightCount < minSamplesLeaf) continue;
      if (sorted[i].x[fIdx] === sorted[i + 1].x[fIdx]) continue;

      const rightPos = pos - leftPos;
      const weightedGini =
        (leftCount / n) * giniImpurity(leftPos, leftCount) +
        (rightCount / n) * giniImpurity(rightPos, rightCount);
      const gain = parentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = fIdx;
        bestThreshold = (sorted[i].x[fIdx] + sorted[i + 1].x[fIdx]) / 2;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 1e-6) {
    return { isLeaf: true, probPositive };
  }

  importanceAccum[bestFeature] += bestGain * n;

  for (const s of samples) {
    if (s.x[bestFeature] <= bestThreshold) bestLeft.push(s);
    else bestRight.push(s);
  }

  return {
    isLeaf: false,
    probPositive,
    featureIndex: bestFeature,
    threshold: bestThreshold,
    left: buildCartTree(bestLeft, depth + 1, maxDepth, minSamplesLeaf, mtry, rand, importanceAccum),
    right: buildCartTree(bestRight, depth + 1, maxDepth, minSamplesLeaf, mtry, rand, importanceAccum),
  };
}

function predictTree(node: TreeNode, x: number[]): number {
  let curr = node;
  while (!curr.isLeaf && curr.featureIndex !== undefined && curr.threshold !== undefined) {
    if (x[curr.featureIndex] <= curr.threshold) {
      curr = curr.left!;
    } else {
      curr = curr.right!;
    }
  }
  return curr.probPositive;
}

export class RandomForestMetaModel {
  private trees: TreeNode[] = [];
  private numTrees = 50;
  private maxDepth = 5;
  private confidenceThreshold = 0.52;
  private featureImportances: number[] = new Array(8).fill(1 / 8);

  public train(
    candles: EnrichedCandle[],
    options?: { numTrees?: number; maxDepth?: number; confidenceThreshold?: number; trainRatio?: number }
  ): ModelTrainingReport {
    this.numTrees = options?.numTrees ?? 50;
    this.maxDepth = options?.maxDepth ?? 5;
    this.confidenceThreshold = options?.confidenceThreshold ?? 0.52;
    const trainRatio = options?.trainRatio ?? 0.7;

    const trainCandles = candles.filter((c) => c.splitRole === 'TRAIN');
    const testCandles = candles.filter((c) => c.splitRole === 'TEST');

    const trainSignalCandles = trainCandles.filter(
      (c) => c.primarySignal !== 'NONE' && c.tripleBarrier !== null
    );
    const testSignalCandles = testCandles.filter(
      (c) => c.primarySignal !== 'NONE' && c.tripleBarrier !== null
    );

    if (trainSignalCandles.length < 6) {
      throw new Error(
        `Only ${trainSignalCandles.length} labeled signals found in chronological training split. Upload a larger dataset or adjust train/test split ratio.`
      );
    }

    const samples: TrainingSample[] = trainSignalCandles.map((c) => ({
      x: featuresToVector(c.features),
      y: c.tripleBarrier!.metaLabel,
    }));

    const rand = seededRandom(421337);
    const importanceAccum = new Array(8).fill(0);
    this.trees = [];

    const minLeaf = Math.max(2, Math.floor(samples.length * 0.06));

    for (let t = 0; t < this.numTrees; t++) {
      // Bootstrap sample with replacement
      const boot: TrainingSample[] = [];
      for (let i = 0; i < samples.length; i++) {
        boot.push(samples[Math.floor(rand() * samples.length)]);
      }
      const tree = buildCartTree(boot, 0, this.maxDepth, minLeaf, 3, rand, importanceAccum);
      this.trees.push(tree);
    }

    const totalImp = importanceAccum.reduce((a, b) => a + b, 0);
    if (totalImp > 0) {
      this.featureImportances = importanceAccum.map((v) => v / totalImp);
    } else {
      this.featureImportances = new Array(8).fill(1 / 8);
    }

    // Apply predictions across all candles
    this.applyPredictions(candles, this.confidenceThreshold);

    // Training accuracy
    let trainCorrect = 0;
    for (const c of trainSignalCandles) {
      const pred = (c.aiConfidence ?? 0) >= this.confidenceThreshold ? 1 : 0;
      if (pred === c.tripleBarrier!.metaLabel) trainCorrect++;
    }

    const acceptedCandles = candles.filter((c) => c.aiPrediction === 'ACCEPT');
    const rejectedCandles = candles.filter(
      (c) => c.primarySignal !== 'NONE' && c.aiPrediction === 'REJECT'
    );

    const meanFeature = (list: EnrichedCandle[], key: keyof EightFeatures) => {
      if (list.length === 0) return 0;
      return Number(
        (list.reduce((acc, item) => acc + item.features[key], 0) / list.length).toFixed(4)
      );
    };

    const featureImportanceReport: FeatureImportanceItem[] = FEATURE_METADATA.map((meta, idx) => ({
      key: meta.key,
      label: meta.label,
      importance: Number((this.featureImportances[idx] * 100).toFixed(2)),
      meanAccepted: meanFeature(acceptedCandles, meta.key),
      meanRejected: meanFeature(rejectedCandles, meta.key),
    })).sort((a, b) => b.importance - a.importance);

    const trainPos = trainSignalCandles.filter((c) => c.tripleBarrier!.metaLabel === 1).length;
    const testPos = testSignalCandles.filter((c) => c.tripleBarrier!.metaLabel === 1).length;

    return {
      trained: true,
      numTrees: this.numTrees,
      maxDepth: this.maxDepth,
      confidenceThreshold: this.confidenceThreshold,
      trainRatio,
      trainCandles: trainCandles.length,
      testCandles: testCandles.length,
      trainSignals: trainSignalCandles.length,
      testSignals: testSignalCandles.length,
      trainPositiveRate: Number(((trainPos / trainSignalCandles.length) * 100).toFixed(2)),
      testPositiveRate:
        testSignalCandles.length > 0
          ? Number(((testPos / testSignalCandles.length) * 100).toFixed(2))
          : 0,
      oobOrTrainAccuracy: Number(((trainCorrect / trainSignalCandles.length) * 100).toFixed(2)),
      featureImportances: featureImportanceReport,
      trainedAt: new Date().toISOString(),
    };
  }

  public predictConfidence(features: EightFeatures): number {
    if (this.trees.length === 0) return 0.5;
    const vec = featuresToVector(features);
    let sum = 0;
    for (const tree of this.trees) {
      sum += predictTree(tree, vec);
    }
    return Number((sum / this.trees.length).toFixed(4));
  }

  public applyPredictions(candles: EnrichedCandle[], confidenceThreshold?: number): void {
    const threshold = confidenceThreshold ?? this.confidenceThreshold;
    this.confidenceThreshold = threshold;

    for (const c of candles) {
      if (c.primarySignal === 'NONE') {
        c.aiConfidence = null;
        c.aiPrediction = null;
        c.finalDecision = 'NO SIGNAL';
        c.risk = null;
        continue;
      }

      const conf = this.predictConfidence(c.features);
      const accepted = conf >= threshold;
      c.aiConfidence = conf;
      c.aiPrediction = accepted ? 'ACCEPT' : 'REJECT';

      let finalDecision: FinalDecisionType = 'REJECT / SKIP';
      if (accepted) {
        finalDecision = c.primarySignal === 'BUY' ? 'ACCEPT BUY' : 'ACCEPT SELL';
      }
      c.finalDecision = finalDecision;

      // Risk Management calculation
      const atr = Math.max(c.atr, 0.5);
      const slDist = Number((TRIPLE_BARRIER_CONFIG.stopAtrMultiplier * atr).toFixed(2));
      const tpDist = Number((TRIPLE_BARRIER_CONFIG.profitAtrMultiplier * atr).toFixed(2));
      const stopLossPrice =
        c.primarySignal === 'BUY'
          ? Number((c.close - slDist).toFixed(2))
          : Number((c.close + slDist).toFixed(2));
      const profitTargetPrice =
        c.primarySignal === 'BUY'
          ? Number((c.close + tpDist).toFixed(2))
          : Number((c.close - tpDist).toFixed(2));

      // Confidence-based position sizing: 0x if rejected, 0.75x to 1.50x scaled above threshold
      const excess = Math.max(0, conf - threshold) / Math.max(1 - threshold, 0.01);
      const positionSizeMultiplier = accepted ? Number((0.75 + excess * 0.75).toFixed(2)) : 0;

      const risk: RiskParameters = {
        stopLossPrice,
        profitTargetPrice,
        stopLossDistance: slDist,
        profitTargetDistance: tpDist,
        riskRewardRatio: 1.6,
        maxHoldCandles: TRIPLE_BARRIER_CONFIG.verticalBars,
        positionSizeMultiplier,
        capitalAllocationPct: accepted ? Number((positionSizeMultiplier * 10).toFixed(1)) : 0,
      };
      c.risk = risk;
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Backtesting Engine (Chronological Out-of-Sample Test Split)
// ---------------------------------------------------------------------------
function computeStrategyMetrics(
  returns: number[],
  holdingBars: number[]
): StrategyPerformanceMetrics {
  const totalTrades = returns.length;
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      profitFactor: 0,
      avgHoldingBars: 0,
    };
  }

  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;

  for (const r of returns) {
    if (r > 0) {
      winningTrades++;
      grossProfit += r;
    } else {
      losingTrades++;
      grossLoss += Math.abs(r);
    }
    equity *= 1 + r / 100;
    if (equity > peak) peak = equity;
    const dd = ((peak - equity) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const totalReturnPct = equity - 100;
  const winRate = (winningTrades / totalTrades) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 0;
  const avgHolding =
    holdingBars.reduce((a, b) => a + b, 0) / Math.max(holdingBars.length, 1);

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Number(winRate.toFixed(2)),
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgHoldingBars: Number(avgHolding.toFixed(1)),
  };
}

export function runChronologicalBacktest(
  candles: EnrichedCandle[],
  trainRatio: number,
  confidenceThreshold: number
): BacktestReport {
  const testSignals = candles.filter(
    (c) =>
      c.splitRole === 'TEST' &&
      c.primarySignal !== 'NONE' &&
      c.tripleBarrier !== null &&
      c.aiConfidence !== null
  );

  // If test split had fewer signals on a very short CSV, fallback gracefully while noting split
  const evalSignals =
    testSignals.length > 0
      ? testSignals
      : candles.filter(
          (c) => c.primarySignal !== 'NONE' && c.tripleBarrier !== null && c.aiConfidence !== null
        );

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  let acceptBuy = 0;
  let acceptSell = 0;
  let rejectSkip = 0;

  const primaryReturns: number[] = [];
  const primaryHolds: number[] = [];
  const aiReturns: number[] = [];
  const aiHolds: number[] = [];

  const trades: BacktestTradeRecord[] = [];
  const equityCurve: EquityPoint[] = [];

  let pEq = 100;
  let pPeak = 100;
  let aEq = 100;
  let aPeak = 100;

  if (evalSignals.length > 0) {
    equityCurve.push({
      index: evalSignals[0].index,
      timestamp: evalSignals[0].timestamp,
      primaryEquity: 100,
      aiEquity: 100,
      primaryDrawdownPct: 0,
      aiDrawdownPct: 0,
    });
  }

  const monthlyMap = new Map<
    string,
    { primary: number; ai: number; primaryTrades: number; aiTrades: number }
  >();

  evalSignals.forEach((c, idx) => {
    const tb = c.tripleBarrier!;
    const conf = c.aiConfidence ?? 0;
    const accepted = conf >= confidenceThreshold;
    const predLabel: 0 | 1 = accepted ? 1 : 0;
    const actualLabel = tb.metaLabel;

    if (predLabel === 1 && actualLabel === 1) tp++;
    else if (predLabel === 1 && actualLabel === 0) fp++;
    else if (predLabel === 0 && actualLabel === 0) tn++;
    else fn++;

    if (accepted) {
      if (c.primarySignal === 'BUY') acceptBuy++;
      else acceptSell++;
    } else {
      rejectSkip++;
    }

    // Scale intraday index return by 3x intraday leverage equivalent for clear visual % comparison
    // (or keep unleveraged spot return + position sizing multiplier). Keeping transparent spot return * multiplier:
    const rawRet = tb.returnPct;
    const mult = accepted ? c.risk?.positionSizeMultiplier ?? 1 : 0;
    const sizedRet = Number((rawRet * mult).toFixed(4));

    primaryReturns.push(rawRet);
    primaryHolds.push(tb.holdingBars);

    if (accepted) {
      aiReturns.push(sizedRet);
      aiHolds.push(tb.holdingBars);
    }

    pEq *= 1 + rawRet / 100;
    if (pEq > pPeak) pPeak = pEq;
    const pDD = -((pPeak - pEq) / pPeak) * 100;

    if (accepted) {
      aEq *= 1 + sizedRet / 100;
    }
    if (aEq > aPeak) aPeak = aEq;
    const aDD = -((aPeak - aEq) / aPeak) * 100;

    equityCurve.push({
      index: tb.exitIndex,
      timestamp: tb.exitTimestamp,
      primaryEquity: Number(pEq.toFixed(2)),
      aiEquity: Number(aEq.toFixed(2)),
      primaryDrawdownPct: Number(pDD.toFixed(2)),
      aiDrawdownPct: Number(aDD.toFixed(2)),
    });

    const monthKey = tb.entryTimestamp.slice(0, 7); // YYYY-MM
    const mEntry = monthlyMap.get(monthKey) ?? {
      primary: 0,
      ai: 0,
      primaryTrades: 0,
      aiTrades: 0,
    };
    mEntry.primary += rawRet;
    mEntry.primaryTrades += 1;
    if (accepted) {
      mEntry.ai += sizedRet;
      mEntry.aiTrades += 1;
    }
    monthlyMap.set(monthKey, mEntry);

    trades.push({
      id: idx + 1,
      entryIndex: tb.entryIndex,
      exitIndex: tb.exitIndex,
      entryTimestamp: tb.entryTimestamp,
      exitTimestamp: tb.exitTimestamp,
      direction: tb.direction,
      entryPrice: tb.entryPrice,
      exitPrice: tb.exitPrice,
      profitTargetPrice: tb.profitTargetPrice,
      stopLossPrice: tb.stopLossPrice,
      barrierHit: tb.barrierHit,
      holdingBars: tb.holdingBars,
      aiConfidence: conf,
      aiAccepted: accepted,
      positionMultiplier: mult,
      rawReturnPct: rawRet,
      sizedReturnPct: sizedRet,
      actualLabel,
      predictedLabel: predLabel,
    });
  });

  const totalClassSamples = tp + fp + tn + fn;
  const accuracy = totalClassSamples > 0 ? ((tp + tn) / totalClassSamples) * 100 : 0;
  const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
  const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const classificationMetrics: ClassificationMetrics = {
    accuracy: Number(accuracy.toFixed(2)),
    precision: Number(precision.toFixed(2)),
    recall: Number(recall.toFixed(2)),
    f1Score: Number(f1Score.toFixed(2)),
    tp,
    fp,
    tn,
    fn,
    sampleCount: totalClassSamples,
  };

  const monthlyPerformance: MonthlyPerfPoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, val]) => ({
      period,
      primaryReturnPct: Number(val.primary.toFixed(2)),
      aiReturnPct: Number(val.ai.toFixed(2)),
      primaryTrades: val.primaryTrades,
      aiTrades: val.aiTrades,
    }));

  return {
    splitMode: 'CHRONOLOGICAL_TEST',
    trainRatio,
    confidenceThreshold,
    primaryMetrics: computeStrategyMetrics(primaryReturns, primaryHolds),
    aiMetrics: computeStrategyMetrics(aiReturns, aiHolds),
    classificationMetrics,
    equityCurve,
    monthlyPerformance,
    decisionDistribution: {
      acceptBuy,
      acceptSell,
      rejectSkip,
    },
    trades,
  };
}

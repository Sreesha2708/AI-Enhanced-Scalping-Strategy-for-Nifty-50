export type PrimarySignalType = 'BUY' | 'SELL' | 'NONE';
export type FinalDecisionType = 'ACCEPT BUY' | 'ACCEPT SELL' | 'REJECT / SKIP' | 'NO SIGNAL';
export type BarrierHitType = 'PROFIT_TARGET' | 'STOP_LOSS' | 'VERTICAL_TIMEOUT';

export interface MarketCandle {
  index: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EightFeatures {
  vwapZScore: number;
  normalizedRsi: number;
  rsiVelocity3Bar: number;
  volumeSurge: number;
  candleBodyRatio: number;
  upperShadowRatio: number;
  lowerShadowRatio: number;
  realizedVolatility: number;
}

export interface TripleBarrierResult {
  entryIndex: number;
  entryTimestamp: string;
  entryPrice: number;
  direction: 'BUY' | 'SELL';
  atrAtEntry: number;
  profitTargetPrice: number;
  stopLossPrice: number;
  verticalBarrierIndex: number;
  exitIndex: number;
  exitTimestamp: string;
  exitPrice: number;
  barrierHit: BarrierHitType;
  holdingBars: number;
  returnPct: number;
  metaLabel: 0 | 1;
}

export interface RiskParameters {
  stopLossPrice: number;
  profitTargetPrice: number;
  stopLossDistance: number;
  profitTargetDistance: number;
  riskRewardRatio: number;
  maxHoldCandles: number;
  positionSizeMultiplier: number;
  capitalAllocationPct: number;
}

export interface EnrichedCandle extends MarketCandle {
  vwap: number;
  rsi: number;
  atr: number;
  volumeSma: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  primarySignal: PrimarySignalType;
  signalReason: string;
  features: EightFeatures;
  tripleBarrier: TripleBarrierResult | null;
  aiConfidence: number | null;
  aiPrediction: 'ACCEPT' | 'REJECT' | null;
  finalDecision: FinalDecisionType;
  risk: RiskParameters | null;
  splitRole: 'TRAIN' | 'TEST';
}

export interface FeatureImportanceItem {
  key: keyof EightFeatures;
  label: string;
  importance: number;
  meanAccepted: number;
  meanRejected: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  sampleCount: number;
}

export interface StrategyPerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  profitFactor: number;
  avgHoldingBars: number;
}

export interface BacktestTradeRecord {
  id: number;
  entryIndex: number;
  exitIndex: number;
  entryTimestamp: string;
  exitTimestamp: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  profitTargetPrice: number;
  stopLossPrice: number;
  barrierHit: BarrierHitType;
  holdingBars: number;
  aiConfidence: number;
  aiAccepted: boolean;
  positionMultiplier: number;
  rawReturnPct: number;
  sizedReturnPct: number;
  actualLabel: 0 | 1;
  predictedLabel: 0 | 1;
}

export interface EquityPoint {
  index: number;
  timestamp: string;
  primaryEquity: number;
  aiEquity: number;
  primaryDrawdownPct: number;
  aiDrawdownPct: number;
}

export interface MonthlyPerfPoint {
  period: string;
  primaryReturnPct: number;
  aiReturnPct: number;
  primaryTrades: number;
  aiTrades: number;
}

export interface ModelTrainingReport {
  trained: boolean;
  numTrees: number;
  maxDepth: number;
  confidenceThreshold: number;
  trainRatio: number;
  trainCandles: number;
  testCandles: number;
  trainSignals: number;
  testSignals: number;
  trainPositiveRate: number;
  testPositiveRate: number;
  oobOrTrainAccuracy: number;
  featureImportances: FeatureImportanceItem[];
  trainedAt: string;
}

export interface BacktestReport {
  splitMode: 'CHRONOLOGICAL_TEST';
  trainRatio: number;
  confidenceThreshold: number;
  primaryMetrics: StrategyPerformanceMetrics;
  aiMetrics: StrategyPerformanceMetrics;
  classificationMetrics: ClassificationMetrics;
  equityCurve: EquityPoint[];
  monthlyPerformance: MonthlyPerfPoint[];
  decisionDistribution: {
    acceptBuy: number;
    acceptSell: number;
    rejectSkip: number;
  };
  trades: BacktestTradeRecord[];
}

export interface PipelineStateSummary {
  datasetLoaded: boolean;
  datasetName: string;
  isSampleDemoData: boolean;
  totalCandles: number;
  dateRange: {
    start: string;
    end: string;
  } | null;
  latestCandle: EnrichedCandle | null;
  primarySignalCount: number;
  acceptedSignalCount: number;
  rejectedSignalCount: number;
  modelReport: ModelTrainingReport | null;
  backtestReport: BacktestReport | null;
}

import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  computeIndicatorsAndFeatures,
  parseAndValidateCsv,
  RandomForestMetaModel,
  runChronologicalBacktest,
} from './server/quantEngine';
import { generateSampleNifty50Csv } from './server/sampleData';
import {
  BacktestReport,
  EnrichedCandle,
  MarketCandle,
  ModelTrainingReport,
  PipelineStateSummary,
} from './src/types/quant';

const PORT = 3000;

// Ensure sample CSV exists on disk for both Node and Java Spring Boot resources
function ensureSampleCsvOnDisk(): string {
  const sampleCsv = generateSampleNifty50Csv();
  const targets = [
    path.resolve(process.cwd(), 'data', 'nifty50_sample_5min.csv'),
    path.resolve(process.cwd(), 'java-backend', 'src', 'main', 'resources', 'data', 'nifty50_sample_5min.csv'),
  ];
  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, sampleCsv, 'utf-8');
    }
  }
  return sampleCsv;
}

interface AppSessionState {
  datasetName: string;
  isSampleDemoData: boolean;
  rawCandles: MarketCandle[];
  candles: EnrichedCandle[];
  signalsGenerated: boolean;
  featuresExtracted: boolean;
  trainRatio: number;
  confidenceThreshold: number;
  numTrees: number;
  maxDepth: number;
  model: RandomForestMetaModel;
  modelReport: ModelTrainingReport | null;
  backtestReport: BacktestReport | null;
  warnings: string[];
}

const state: AppSessionState = {
  datasetName: '',
  isSampleDemoData: false,
  rawCandles: [],
  candles: [],
  signalsGenerated: false,
  featuresExtracted: false,
  trainRatio: 0.7,
  confidenceThreshold: 0.52,
  numTrees: 50,
  maxDepth: 5,
  model: new RandomForestMetaModel(),
  modelReport: null,
  backtestReport: null,
  warnings: [],
};

function buildSummary(): PipelineStateSummary {
  const latestCandle =
    state.candles.length > 0 ? state.candles[state.candles.length - 1] : null;
  const primarySignals = state.candles.filter((c) => c.primarySignal !== 'NONE');
  const accepted = primarySignals.filter((c) => c.aiPrediction === 'ACCEPT');
  const rejected = primarySignals.filter((c) => c.aiPrediction === 'REJECT');

  return {
    datasetLoaded: state.rawCandles.length > 0,
    datasetName: state.datasetName,
    isSampleDemoData: state.isSampleDemoData,
    totalCandles: state.rawCandles.length,
    dateRange:
      state.rawCandles.length > 0
        ? {
            start: state.rawCandles[0].timestamp,
            end: state.rawCandles[state.rawCandles.length - 1].timestamp,
          }
        : null,
    latestCandle,
    primarySignalCount: primarySignals.length,
    acceptedSignalCount: accepted.length,
    rejectedSignalCount: rejected.length,
    modelReport: state.modelReport,
    backtestReport: state.backtestReport,
  };
}

function loadDatasetIntoState(
  csvText: string,
  datasetName: string,
  isSampleDemoData: boolean,
  trainRatio = 0.7
) {
  const { candles, warnings } = parseAndValidateCsv(csvText);
  state.datasetName = datasetName;
  state.isSampleDemoData = isSampleDemoData;
  state.rawCandles = candles;
  state.trainRatio = trainRatio;
  state.candles = computeIndicatorsAndFeatures(candles, trainRatio);
  state.signalsGenerated = false;
  state.featuresExtracted = false;
  state.model = new RandomForestMetaModel();
  state.modelReport = null;
  state.backtestReport = null;
  state.warnings = warnings;
}

function listJavaFiles(dir: string, baseDir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listJavaFiles(full, baseDir));
    } else {
      files.push(path.relative(baseDir, full).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

async function startServer() {
  const sampleCsv = ensureSampleCsvOnDisk();

  // Initialize with historical sample demo dataset ready to inspect or run
  loadDatasetIntoState(sampleCsv, 'nifty50_sample_5min.csv (Historical Sample Data)', true, 0.7);
  state.signalsGenerated = true;
  state.featuresExtracted = true;
  state.modelReport = state.model.train(state.candles, {
    numTrees: state.numTrees,
    maxDepth: state.maxDepth,
    confidenceThreshold: state.confidenceThreshold,
    trainRatio: state.trainRatio,
  });
  state.backtestReport = runChronologicalBacktest(
    state.candles,
    state.trainRatio,
    state.confidenceThreshold
  );

  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.use(express.json({ limit: '10mb' }));

  // 1. Download Sample CSV
  app.get('/api/data/sample-csv', (_req, res) => {
    const csvPath = path.resolve(process.cwd(), 'data', 'nifty50_sample_5min.csv');
    const content = fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf-8') : sampleCsv;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="nifty50_sample_5min.csv"');
    res.send(content);
  });

  // 2. Upload CSV (multipart file, raw CSV JSON, or demo=true)
  app.post('/api/data/upload', upload.single('file'), (req, res) => {
    try {
      const isDemo = req.query.demo === 'true' || req.body?.demo === true;
      const trainRatio = Math.min(0.85, Math.max(0.5, Number(req.body?.trainRatio ?? 0.7)));

      if (isDemo) {
        loadDatasetIntoState(
          sampleCsv,
          'nifty50_sample_5min.csv (Historical Sample Data)',
          true,
          trainRatio
        );
      } else if (req.file) {
        const csvText = req.file.buffer.toString('utf-8');
        loadDatasetIntoState(csvText, req.file.originalname || 'uploaded_nifty50.csv', false, trainRatio);
      } else if (typeof req.body?.csv === 'string') {
        loadDatasetIntoState(
          req.body.csv,
          req.body.fileName || 'uploaded_nifty50.csv',
          false,
          trainRatio
        );
      } else {
        return res.status(400).json({
          error: 'No CSV file provided. Upload a .csv file with Timestamp, Open, High, Low, Close, Volume columns.',
        });
      }

      return res.json({
        status: 'UPLOADED',
        warnings: state.warnings,
        summary: buildSummary(),
        candles: state.candles,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse CSV data.';
      return res.status(400).json({ error: message });
    }
  });

  // 3. Generate Primary Signals (VWAP + RSI)
  app.post('/api/strategy/generate-signals', (req, res) => {
    try {
      if (state.rawCandles.length === 0) {
        return res.status(400).json({ error: 'Upload market CSV data before generating signals.' });
      }
      const trainRatio = Math.min(
        0.85,
        Math.max(0.5, Number(req.body?.trainRatio ?? state.trainRatio))
      );
      state.trainRatio = trainRatio;
      state.candles = computeIndicatorsAndFeatures(state.rawCandles, trainRatio);
      state.signalsGenerated = true;
      state.modelReport = null;
      state.backtestReport = null;

      return res.json({
        status: 'SIGNALS_GENERATED',
        summary: buildSummary(),
        candles: state.candles,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signal generation failed.';
      return res.status(400).json({ error: message });
    }
  });

  // 4. Extract Eight Features + Triple Barrier Labeling
  app.post('/api/features/extract', (_req, res) => {
    try {
      if (state.rawCandles.length === 0) {
        return res.status(400).json({ error: 'Upload market CSV data first.' });
      }
      if (!state.signalsGenerated) {
        state.candles = computeIndicatorsAndFeatures(state.rawCandles, state.trainRatio);
        state.signalsGenerated = true;
      }
      state.featuresExtracted = true;

      return res.json({
        status: 'FEATURES_EXTRACTED',
        summary: buildSummary(),
        candles: state.candles,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Feature extraction failed.';
      return res.status(400).json({ error: message });
    }
  });

  // 5. Train Random Forest Meta-Labeling Model
  app.post('/api/model/train', (req, res) => {
    try {
      if (state.rawCandles.length === 0) {
        return res.status(400).json({ error: 'Upload market CSV data first.' });
      }
      const numTrees = Math.min(200, Math.max(10, Number(req.body?.numTrees ?? state.numTrees)));
      const maxDepth = Math.min(10, Math.max(2, Number(req.body?.maxDepth ?? state.maxDepth)));
      const confidenceThreshold = Math.min(
        0.85,
        Math.max(0.35, Number(req.body?.confidenceThreshold ?? state.confidenceThreshold))
      );
      const trainRatio = Math.min(
        0.85,
        Math.max(0.5, Number(req.body?.trainRatio ?? state.trainRatio))
      );

      state.numTrees = numTrees;
      state.maxDepth = maxDepth;
      state.confidenceThreshold = confidenceThreshold;

      if (trainRatio !== state.trainRatio || !state.signalsGenerated) {
        state.trainRatio = trainRatio;
        state.candles = computeIndicatorsAndFeatures(state.rawCandles, trainRatio);
        state.signalsGenerated = true;
      }
      state.featuresExtracted = true;

      state.model = new RandomForestMetaModel();
      state.modelReport = state.model.train(state.candles, {
        numTrees,
        maxDepth,
        confidenceThreshold,
        trainRatio,
      });
      state.backtestReport = null;

      return res.json({
        status: 'MODEL_TRAINED',
        modelReport: state.modelReport,
        summary: buildSummary(),
        candles: state.candles,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Model training failed.';
      return res.status(400).json({ error: message });
    }
  });

  // 6. Predict / Apply Meta-Labeling Filter
  app.post('/api/model/predict', (req, res) => {
    try {
      if (!state.modelReport?.trained) {
        return res.status(400).json({ error: 'Train the Random Forest model before running prediction.' });
      }
      const confidenceThreshold = Math.min(
        0.85,
        Math.max(0.35, Number(req.body?.confidenceThreshold ?? state.confidenceThreshold))
      );
      state.confidenceThreshold = confidenceThreshold;
      state.modelReport.confidenceThreshold = confidenceThreshold;
      state.model.applyPredictions(state.candles, confidenceThreshold);

      return res.json({
        status: 'PREDICTIONS_APPLIED',
        summary: buildSummary(),
        candles: state.candles,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Prediction failed.';
      return res.status(400).json({ error: message });
    }
  });

  // 7. Run Chronological Backtest
  app.post('/api/backtest/run', (req, res) => {
    try {
      if (!state.modelReport?.trained) {
        return res.status(400).json({ error: 'Train the Random Forest model before running backtesting.' });
      }
      const confidenceThreshold = Math.min(
        0.85,
        Math.max(0.35, Number(req.body?.confidenceThreshold ?? state.confidenceThreshold))
      );
      state.confidenceThreshold = confidenceThreshold;
      state.model.applyPredictions(state.candles, confidenceThreshold);
      state.backtestReport = runChronologicalBacktest(
        state.candles,
        state.trainRatio,
        confidenceThreshold
      );

      return res.json({
        status: 'BACKTEST_COMPLETED',
        backtestReport: state.backtestReport,
        summary: buildSummary(),
        candles: state.candles,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Backtest failed.';
      return res.status(400).json({ error: message });
    }
  });

  // 8. One-click Full Pipeline (Demo Mode or Current CSV)
  app.post('/api/pipeline/run-demo', (req, res) => {
    try {
      const trainRatio = Math.min(0.85, Math.max(0.5, Number(req.body?.trainRatio ?? 0.7)));
      const confidenceThreshold = Math.min(
        0.85,
        Math.max(0.35, Number(req.body?.confidenceThreshold ?? 0.52))
      );
      loadDatasetIntoState(
        sampleCsv,
        'nifty50_sample_5min.csv (Historical Sample Data)',
        true,
        trainRatio
      );
      state.signalsGenerated = true;
      state.featuresExtracted = true;
      state.confidenceThreshold = confidenceThreshold;
      state.modelReport = state.model.train(state.candles, {
        numTrees: state.numTrees,
        maxDepth: state.maxDepth,
        confidenceThreshold,
        trainRatio,
      });
      state.backtestReport = runChronologicalBacktest(
        state.candles,
        trainRatio,
        confidenceThreshold
      );
      return res.json({
        status: 'DEMO_PIPELINE_COMPLETED',
        summary: buildSummary(),
        candles: state.candles,
        backtestReport: state.backtestReport,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Demo pipeline failed.';
      return res.status(400).json({ error: message });
    }
  });

  // 9. GET Dashboard Summary & Candles
  app.get('/api/dashboard/summary', (_req, res) => {
    res.json({
      summary: buildSummary(),
      candles: state.candles,
      warnings: state.warnings,
    });
  });

  // 10. GET Backtest Results
  app.get('/api/backtest/results', (_req, res) => {
    if (!state.backtestReport) {
      return res.status(404).json({ error: 'Backtest has not been executed yet.' });
    }
    res.json(state.backtestReport);
  });

  // 11. Java Spring Boot Source Explorer endpoints (for evaluator inspection)
  app.get('/api/java-project/files', (_req, res) => {
    const javaRoot = path.resolve(process.cwd(), 'java-backend');
    const files = listJavaFiles(javaRoot, javaRoot);
    res.json({ files });
  });

  app.get('/api/java-project/file', (req, res) => {
    const relPath = String(req.query.path || '');
    const javaRoot = path.resolve(process.cwd(), 'java-backend');
    const resolved = path.resolve(javaRoot, relPath);
    if (!resolved.startsWith(javaRoot) || !fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Requested Java project file not found.' });
    }
    const content = fs.readFileSync(resolved, 'utf-8');
    res.json({ path: relPath, content });
  });

  // Vite middleware in dev; static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASTRAQUANT X running on http://localhost:${PORT}`);
  });
}

startServer();

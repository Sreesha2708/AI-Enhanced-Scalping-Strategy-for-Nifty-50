import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Code2, Server } from 'lucide-react';

interface ArchitectureComponent {
  id: number;
  name: string;
  javaClass: string;
  purpose: string;
  input: string;
  output: string;
}

const ARCH_COMPONENTS: ArchitectureComponent[] = [
  {
    id: 1,
    name: 'NIFTY 50 OHLCV Data',
    javaClass: 'MarketData.java / CSV Dataset',
    purpose: 'Represents 5-minute intraday candles (Timestamp, Open, High, Low, Close, Volume) stored in JPA/H2/MySQL.',
    input: 'Historical or uploaded CSV rows',
    output: 'Validated MarketData entities',
  },
  {
    id: 2,
    name: 'Data Preprocessing',
    javaClass: 'DataLoaderService.java',
    purpose: 'Parses CSV via Apache Commons CSV, rejects missing/NaN values, enforces positive prices, and repairs OHLC bounds.',
    input: 'Multipart CSV upload or demo stream',
    output: 'Chronologically ordered candle series',
  },
  {
    id: 3,
    name: 'Technical Indicator Calculation',
    javaClass: 'IndicatorService / VWAP, RSI, ATR Calculators',
    purpose: 'Computes session-resetting VWAP, 14-period Wilder RSI, 14-period Wilder ATR, and 20-bar Volume SMA.',
    input: 'Preprocessed OHLCV candles',
    output: 'Indicator-enriched candles',
  },
  {
    id: 4,
    name: 'VWAP + RSI Primary Strategy',
    javaClass: 'TradingStrategyService.java',
    purpose: 'Generates candidate intraday BUY and SELL triggers using VWAP crossovers and RSI pullback alignment.',
    input: 'Close, VWAP, and RSI(14)',
    output: 'Initial BUY / SELL / NONE signal',
  },
  {
    id: 5,
    name: 'Eight-Feature Extraction',
    javaClass: 'FeatureExtractionService.java',
    purpose: 'Builds 8 quantitative features (VWAP Z-Score, Norm RSI, RSI Velocity, Volume Surge, Candle Body, Shadows, Volatility).',
    input: 'Candles + indicator series',
    output: '8-dimensional feature vector',
  },
  {
    id: 6,
    name: 'Triple Barrier Labeling',
    javaClass: 'TripleBarrierService.java',
    purpose: 'Labels each primary signal based on first touch of +1.6 ATR target, -1.0 ATR stop loss, or 12-candle vertical barrier.',
    input: 'Entry price, ATR, next 12 bars',
    output: 'Binary Meta-Label (1 or 0) & exit bar',
  },
  {
    id: 7,
    name: 'Random Forest Meta-Classifier',
    javaClass: 'RandomForestService.java (Weka)',
    purpose: 'Trains ensemble decision trees strictly on chronological training split to score trade success probability.',
    input: '8 features + Triple Barrier labels',
    output: 'Confidence score ∈ [0, 1] & Gini weights',
  },
  {
    id: 8,
    name: 'Trade Acceptance / Rejection',
    javaClass: 'MetaLabelingService.java',
    purpose: 'Applies confidence threshold gate to convert primary signals into ACCEPT BUY, ACCEPT SELL, or REJECT / SKIP.',
    input: 'Primary signal + RF probability',
    output: 'Filtered final decision',
  },
  {
    id: 9,
    name: 'Risk Management',
    javaClass: 'RiskManagementService.java',
    purpose: 'Computes ATR stop-loss/targets (1.6:1 R:R), 12-candle max hold, and confidence-scaled position sizing.',
    input: 'Accepted signal, ATR, confidence',
    output: 'Sized order risk coordinates',
  },
  {
    id: 10,
    name: 'Backtesting Engine',
    javaClass: 'BacktestingService.java',
    purpose: 'Evaluates Primary vs AI-Filtered performance on out-of-sample test split and separates ML vs financial metrics.',
    input: 'Chronological test split signals',
    output: 'Equity curve, drawdown, F1, PnL log',
  },
  {
    id: 11,
    name: 'Web Dashboard',
    javaClass: 'DashboardController.java / Chart.js UI',
    purpose: 'Exposes REST endpoints and renders candlesticks, TP/SL crossings, feature diagnostics, and downloadable reports.',
    input: 'REST JSON responses',
    output: 'Interactive terminal interface',
  },
];

export const ArchitecturePage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number>(1);
  const [javaFiles, setJavaFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    fetch('/api/java-project/files')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.files) && data.files.length > 0) {
          setJavaFiles(data.files);
          const defaultFile =
            data.files.find((f: string) => f.endsWith('RandomForestService.java')) ??
            data.files[0];
          setActiveFile(defaultFile);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeFile) return;
    setLoadingFile(true);
    fetch(`/api/java-project/file?path=${encodeURIComponent(activeFile)}`)
      .then((r) => r.json())
      .then((data) => {
        setFileContent(data.content || '');
      })
      .catch(() => setFileContent('// Unable to load file content.'))
      .finally(() => setLoadingFile(false));
  }, [activeFile]);

  const activeComp =
    ARCH_COMPONENTS.find((c) => c.id === selectedId) ?? ARCH_COMPONENTS[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
        <div className="text-xs font-medium text-cyan-400">System Design & Spring Boot Codebase</div>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Eleven-Component Quantitative Architecture
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Click any architectural stage below to inspect its Spring Boot service class, inputs, and
          outputs, or browse the complete Java 17 + Maven + Weka project source files at the bottom.
        </p>
      </div>

      {/* 11-Component Architecture Diagram */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5 xl:col-span-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ARCH_COMPONENTS.map((comp) => {
              const selected = comp.id === selectedId;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedId(comp.id)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors ${
                    selected
                      ? 'border-cyan-500/70 bg-cyan-950/30 text-white'
                      : 'border-slate-800 bg-[#070c18] text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-cyan-400">
                        {String(comp.id).padStart(2, '0')}
                      </span>
                      {comp.id < 11 ? (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-cyan-400" />
                      )}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{comp.name}</div>
                  </div>
                  <div className="mt-2 truncate font-mono text-[11px] text-slate-400">
                    {comp.javaClass}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Component Detail */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-5 xl:col-span-4">
          <div className="flex items-center gap-2 text-xs font-medium text-purple-400">
            <Server className="h-4 w-4" />
            Component {String(activeComp.id).padStart(2, '0')} Specification
          </div>
          <h2 className="mt-1.5 text-lg font-bold text-white">{activeComp.name}</h2>
          <div className="mt-2 rounded-md border border-slate-800 bg-[#070c18] px-3 py-1.5 font-mono text-xs text-cyan-300">
            {activeComp.javaClass}
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-xs font-medium text-slate-400">Responsibility</div>
              <p className="mt-1 leading-relaxed text-slate-300">{activeComp.purpose}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3 text-xs">
              <div className="text-slate-400">Input</div>
              <div className="mt-0.5 font-medium text-slate-200">{activeComp.input}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#070c18] p-3 text-xs">
              <div className="text-slate-400">Output</div>
              <div className="mt-0.5 font-medium text-emerald-300">{activeComp.output}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Java Spring Boot + Weka Source Code Inspector */}
      <section className="rounded-xl border border-slate-800 bg-[#0b1120] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Java 17 + Spring Boot + Weka Maven Project Explorer
              </h2>
              <p className="text-xs text-slate-400">
                Inspect the complete runnable Java backend source files located in /java-backend
              </p>
            </div>
          </div>
          <select
            value={activeFile}
            onChange={(e) => setActiveFile(e.target.value)}
            className="max-w-full rounded-lg border border-slate-700 bg-[#070c18] px-3 py-1.5 font-mono text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none"
          >
            {javaFiles.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-800 bg-[#060a14] p-4 font-mono text-xs leading-relaxed text-slate-300">
          {loadingFile ? 'Loading source file...' : <pre>{fileContent}</pre>}
        </div>
      </section>
    </div>
  );
};

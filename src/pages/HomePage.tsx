import React from 'react';
import { ArrowRight, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import { PipelineStateSummary } from '../types/quant';

export type PageId =
  | 'home'
  | 'dashboard'
  | 'workflow'
  | 'features'
  | 'model'
  | 'backtesting'
  | 'architecture';

interface HomePageProps {
  summary: PipelineStateSummary | null;
  onNavigate: (page: PageId) => void;
  onRunDemo: () => void;
  busy: boolean;
}

const OBJECTIVES = [
  {
    index: '01',
    title: 'Filter Low-Quality Scalping Signals',
    detail:
      'Reduce false VWAP + RSI crossovers during choppy intraday consolidation using secondary machine learning verification.',
  },
  {
    index: '02',
    title: 'Dynamic Triple Barrier Labeling',
    detail:
      'Replace arbitrary fixed-bar exits with volatility-adaptive +1.6 ATR profit targets, -1.0 ATR stop losses, and a 12-candle vertical time limit.',
  },
  {
    index: '03',
    title: 'Leakage-Free Chronological Validation',
    detail:
      'Evaluate out-of-sample generalization on strictly chronological test splits, separating classification metrics from trading metrics.',
  },
  {
    index: '04',
    title: 'Confidence-Scaled Risk Management',
    detail:
      'Allocate position sizing proportionally to Random Forest probability confidence while enforcing hard ATR stop-loss boundaries.',
  },
];

const TECH_STACK = [
  { layer: 'Backend Engine', items: 'Java 17/21 · Spring Boot · Spring MVC · Maven' },
  { layer: 'Machine Learning', items: 'Weka RandomForest · Triple Barrier Meta-Labeling' },
  { layer: 'Data & Persistence', items: 'Apache Commons CSV · Spring Data JPA · H2 / MySQL' },
  { layer: 'Frontend & Charts', items: 'HTML5 · CSS3 · TypeScript · Chart.js · Thymeleaf / Bootstrap 5' },
];

export const HomePage: React.FC<HomePageProps> = ({
  summary,
  onNavigate,
  onRunDemo,
  busy,
}) => {
  const bt = summary?.backtestReport;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="rounded-xl border border-slate-800/90 bg-gradient-to-br from-[#0b1224] via-[#091020] to-[#0f172a] p-6 lg:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          <div className="space-y-5 lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-400">
              <span>NIFTY 50 Five-Minute Scalping Research</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-400">Academic & Hackathon Decision-Support Prototype</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15] [text-wrap:balance]">
              ASTRAQUANT X — AI-Enhanced Scalping Intelligence for NIFTY 50
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-slate-300">
              An explainable quantitative trading architecture combining classical{' '}
              <span className="font-medium text-cyan-300">VWAP + RSI</span> intraday triggers
              with a <span className="font-medium text-indigo-300">Random Forest Meta-Labeling</span>{' '}
              classifier and <span className="font-medium text-emerald-300">Triple Barrier</span>{' '}
              risk controls to filter weak setups before capital is committed.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('architecture')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                <Layers className="h-4 w-4 text-purple-400" />
                View Architecture
              </button>
              <button
                type="button"
                onClick={onRunDemo}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                {busy ? 'Running Demo...' : 'Run Demo Pipeline'}
              </button>
            </div>
          </div>

          {/* Right Quantitative Snapshot Panel */}
          <div className="rounded-xl border border-slate-800 bg-[#070c18] p-5 lg:col-span-4">
            <div className="border-b border-slate-800 pb-3">
              <div className="text-xs font-medium text-slate-400">Active Session Snapshot</div>
              <div className="mt-1 truncate text-sm font-semibold text-white">
                {summary?.datasetLoaded
                  ? summary.datasetName
                  : 'No CSV loaded — Run Demo or Upload CSV'}
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-slate-400">5m Candles</dt>
                <dd className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                  {summary?.totalCandles ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Primary Signals</dt>
                <dd className="mt-1 font-mono text-xl font-semibold text-blue-400 tabular-nums">
                  {summary?.primarySignalCount ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">AI Win Rate (Test)</dt>
                <dd className="mt-1 font-mono text-xl font-semibold text-emerald-400 tabular-nums">
                  {bt ? `${bt.aiMetrics.winRate.toFixed(1)}%` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">RF F1-Score</dt>
                <dd className="mt-1 font-mono text-xl font-semibold text-purple-400 tabular-nums">
                  {bt ? `${bt.classificationMetrics.f1Score.toFixed(1)}%` : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
              All metrics are computed strictly from chronological out-of-sample test candles.
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement & Proposed Solution */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
          <div className="text-xs font-medium text-rose-400">Problem Statement</div>
          <h2 className="mt-1.5 text-xl font-semibold text-white">
            False Scalping Signals in Volatile Chop
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Traditional indicator-based scalping strategies can generate false trading signals
            during volatile market conditions, resulting in unnecessary trades and potential losses.
            Single-layer VWAP or RSI rules lack awareness of microstructure exhaustion, wick
            rejection, and sudden volatility regime shifts.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
          <div className="text-xs font-medium text-cyan-400">Proposed Solution</div>
          <h2 className="mt-1.5 text-xl font-semibold text-white">
            VWAP + RSI Primary Strategy with Random Forest Meta-Labeling
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            ASTRAQUANT X combines VWAP and RSI-based trading signals with a Random Forest
            Meta-Labeling model to evaluate trade quality and filter potentially unsuccessful
            trades. Rather than inventing independent directional calls, the AI model acts as a
            disciplined risk gatekeeper.
          </p>
        </div>
      </section>

      {/* Project Objectives */}
      <section className="rounded-xl border border-slate-800 bg-[#0b1120] p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Project Objectives</h2>
          <span className="text-xs text-slate-400">
            End-to-end quantitative validation pipeline
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {OBJECTIVES.map((obj) => (
            <div
              key={obj.index}
              className="rounded-lg border border-slate-800/80 bg-[#070c18] p-4"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs font-semibold text-cyan-400">{obj.index}.</span>
                <h3 className="text-sm font-semibold text-white">{obj.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{obj.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Stack & Academic Notice */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0b1120] p-6 lg:col-span-8">
          <h2 className="text-lg font-semibold text-white">Technology Stack</h2>
          <div className="mt-4 divide-y divide-slate-800/80">
            {TECH_STACK.map((row) => (
              <div
                key={row.layer}
                className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center"
              >
                <span className="text-sm font-medium text-slate-200">{row.layer}</span>
                <span className="font-mono text-xs text-cyan-300">{row.items}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-950/15 p-6 lg:col-span-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Academic Demonstration Notice
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              ASTRAQUANT X is an educational final-year and hackathon decision-support prototype.
              Historical backtest outcomes do not guarantee future market performance, and sample
              CSV candles are explicitly marked as demonstration data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('workflow')}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            Explore 9-Step AI Workflow
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};

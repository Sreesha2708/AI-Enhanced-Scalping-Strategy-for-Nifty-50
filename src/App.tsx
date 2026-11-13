import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  Cpu,
  GitBranch,
  Home,
  Menu,
  Network,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { BacktestingPage } from './pages/BacktestingPage';
import { DashboardPage } from './pages/DashboardPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HomePage, PageId } from './pages/HomePage';
import { ModelPage } from './pages/ModelPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { EnrichedCandle, PipelineStateSummary } from './types/quant';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'dashboard', label: 'Trading Dashboard', icon: Activity },
  { id: 'workflow', label: 'AI System Workflow', icon: GitBranch },
  { id: 'features', label: 'Eight Features', icon: Boxes },
  { id: 'model', label: 'Random Forest Model', icon: Cpu },
  { id: 'backtesting', label: 'Backtesting & Results', icon: BarChart3 },
  { id: 'architecture', label: 'Project Architecture', icon: Network },
];

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [summary, setSummary] = useState<PipelineStateSummary | null>(null);
  const [candles, setCandles] = useState<EnrichedCandle[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dashboard state.');
      setSummary(data.summary);
      setCandles(data.candles ?? []);
      setWarnings(data.warnings ?? []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to connect to backend API.');
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const runAction = async (fn: () => Promise<void>, successText?: string) => {
    setBusy(true);
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      await fn();
      if (successText) setStatusNotice(successText);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadCsv = async (file: File) => {
    await runAction(async () => {
      const formData = new FormData();
      formData.append('file', file);
      const upRes = await fetch('/api/data/upload', { method: 'POST', body: formData });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || 'CSV upload failed.');

      // Automatically run signals, features, RF train/predict, and chronological backtest on newly uploaded CSV
      await fetch('/api/strategy/generate-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainRatio: 0.7 }),
      });
      await fetch('/api/features/extract', { method: 'POST' });

      const trainRes = await fetch('/api/model/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numTrees: 50, maxDepth: 5, confidenceThreshold: 0.52 }),
      });
      const trainData = await trainRes.json();
      if (!trainRes.ok) {
        // Still keep uploaded candles visible even if dataset is too small for RF training
        setSummary(upData.summary);
        setCandles(upData.candles ?? []);
        setWarnings(upData.warnings ?? []);
        throw new Error(trainData.error || 'Model training could not complete on uploaded CSV.');
      }

      await fetch('/api/model/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceThreshold: 0.52 }),
      });
      await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceThreshold: 0.52 }),
      });
      await loadSummary();
    }, `Uploaded "${file.name}" and executed full Random Forest meta-labeling backtest.`);
  };

  const handleRunDemo = async () => {
    await runAction(async () => {
      const res = await fetch('/api/pipeline/run-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainRatio: 0.7, confidenceThreshold: 0.52 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo pipeline failed.');
      setSummary(data.summary);
      setCandles(data.candles ?? []);
      setWarnings([]);
    }, 'Demo Mode executed: 675 historical 5-min NIFTY 50 candles processed through Random Forest.');
  };

  const handleStepSignals = async () => {
    await runAction(async () => {
      const res = await fetch('/api/strategy/generate-signals', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signal generation failed.');
      setSummary(data.summary);
      setCandles(data.candles ?? []);
    }, 'Primary VWAP + RSI signals regenerated from loaded candles.');
  };

  const handleStepFeatures = async () => {
    await runAction(async () => {
      const res = await fetch('/api/features/extract', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Feature extraction failed.');
      setSummary(data.summary);
      setCandles(data.candles ?? []);
    }, 'Extracted all 8 microstructure features and Triple Barrier labels.');
  };

  const handleStepTrainPredict = async () => {
    await runAction(async () => {
      const trainRes = await fetch('/api/model/train', { method: 'POST' });
      const trainData = await trainRes.json();
      if (!trainRes.ok) throw new Error(trainData.error || 'Model training failed.');

      const predRes = await fetch('/api/model/predict', { method: 'POST' });
      const predData = await predRes.json();
      if (!predRes.ok) throw new Error(predData.error || 'Prediction failed.');

      setSummary(predData.summary);
      setCandles(predData.candles ?? []);
    }, 'Trained Random Forest Meta-Classifier and applied ACCEPT / REJECT decisions.');
  };

  const handleStepBacktest = async () => {
    await runAction(async () => {
      const res = await fetch('/api/backtest/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backtest failed.');
      setSummary(data.summary);
      setCandles(data.candles ?? []);
    }, 'Chronological out-of-sample backtest completed.');
  };

  const handleRetrainParams = async (params: {
    numTrees: number;
    maxDepth: number;
    confidenceThreshold: number;
    trainRatio: number;
  }) => {
    await runAction(async () => {
      const trainRes = await fetch('/api/model/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const trainData = await trainRes.json();
      if (!trainRes.ok) throw new Error(trainData.error || 'Retraining failed.');

      await fetch('/api/model/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceThreshold: params.confidenceThreshold }),
      });

      const btRes = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceThreshold: params.confidenceThreshold }),
      });
      const btData = await btRes.json();
      if (!btRes.ok) throw new Error(btData.error || 'Backtest update failed.');

      setSummary(btData.summary);
      setCandles(btData.candles ?? []);
    }, `Retrained ${params.numTrees}-tree Random Forest (Threshold ${(params.confidenceThreshold * 100).toFixed(0)}%) & updated backtest.`);
  };

  const navigate = (page: PageId) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeNav = NAV_ITEMS.find((n) => n.id === activePage) ?? NAV_ITEMS[0];

  return (
    <div className="flex min-h-screen bg-[#060a14] text-slate-200">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/90 bg-[#080d1a] lg:flex">
        <div className="border-b border-slate-800/90 px-5 py-5">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-left focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <div className="font-display text-lg font-extrabold tracking-tight text-white">
              ASTRAQUANT <span className="text-cyan-400">X</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              NIFTY 50 AI Scalping Terminal
            </div>
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activePage;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-100 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/90 p-4 text-xs text-slate-400">
          <div className="font-medium text-slate-300">Academic Research Mode</div>
          <div className="mt-1 leading-relaxed">
            Decision-support prototype. Sample/uploaded CSV data is historical simulation only.
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col border-r border-slate-800 bg-[#080d1a]">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <span className="font-display text-lg font-extrabold text-white">
                ASTRAQUANT <span className="text-cyan-400">X</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.id === activePage;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: 3 clean zones */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-8 border-b border-slate-800/90 bg-[#060a14]/95 px-4 py-3.5 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:text-white lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="truncate font-display text-base font-semibold text-white whitespace-nowrap">
              {activeNav.label}
            </div>
          </div>

          <div className="hidden text-xs text-slate-400 md:block truncate">
            {summary?.datasetLoaded
              ? `${summary.isSampleDemoData ? 'Sample Historical Data' : 'Custom CSV'} · ${summary.totalCandles} Candles`
              : 'No Dataset Loaded'}
          </div>

          <div className="shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={handleRunDemo}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busy ? 'Processing...' : 'Demo Mode'}
            </button>
          </div>
        </header>

        {/* Feedback Alerts */}
        <main className="mx-auto w-full max-w-[1380px] flex-1 p-4 sm:p-6">
          {errorMsg && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-xs font-medium text-rose-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {statusNotice && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-cyan-950/25 px-4 py-3 text-sm text-cyan-200">
              <span>{statusNotice}</span>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-xs font-medium text-cyan-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              {activePage === 'home' && (
                <HomePage
                  summary={summary}
                  onNavigate={navigate}
                  onRunDemo={handleRunDemo}
                  busy={busy}
                />
              )}
              {activePage === 'dashboard' && (
                <DashboardPage
                  summary={summary}
                  candles={candles}
                  warnings={warnings}
                  busy={busy}
                  onUploadCsv={handleUploadCsv}
                  onRunDemo={handleRunDemo}
                  onStepSignals={handleStepSignals}
                  onStepFeatures={handleStepFeatures}
                  onStepTrainPredict={handleStepTrainPredict}
                  onStepBacktest={handleStepBacktest}
                />
              )}
              {activePage === 'workflow' && (
                <WorkflowPage summary={summary} candles={candles} />
              )}
              {activePage === 'features' && (
                <FeaturesPage
                  candles={candles}
                  modelReport={summary?.modelReport ?? null}
                />
              )}
              {activePage === 'model' && (
                <ModelPage
                  summary={summary}
                  modelReport={summary?.modelReport ?? null}
                  onRetrain={handleRetrainParams}
                  busy={busy}
                />
              )}
              {activePage === 'backtesting' && (
                <BacktestingPage
                  summary={summary}
                  backtestReport={summary?.backtestReport ?? null}
                  busy={busy}
                  onUploadCsv={handleUploadCsv}
                  onStepSignals={handleStepSignals}
                  onStepTrainPredict={handleStepTrainPredict}
                  onStepBacktest={handleStepBacktest}
                />
              )}
              {activePage === 'architecture' && <ArchitecturePage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

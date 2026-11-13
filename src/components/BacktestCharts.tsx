import React, { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import {
  BacktestReport,
  FeatureImportanceItem,
} from '../types/quant';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
);

function useChartInstance(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  buildConfig: () => ChartConfiguration | null,
  deps: unknown[]
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cfg = buildConfig();
    if (!cfg) return;
    const chart = new Chart(canvas, cfg);
    return () => {
      chart.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const baseAxisTicks = {
  color: '#64748b',
  font: { family: '"JetBrains Mono", monospace', size: 10 },
};

const baseGrid = {
  color: 'rgba(30, 41, 59, 0.45)',
};

export const EquityCurveChart: React.FC<{ report: BacktestReport }> = ({ report }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useChartInstance(
    ref,
    () => ({
      type: 'line',
      data: {
        labels: report.equityCurve.map((p) => p.timestamp.slice(5, 16)),
        datasets: [
          {
            label: 'AI Meta-Labeled Strategy',
            data: report.equityCurve.map((p) => p.aiEquity),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            fill: true,
            borderWidth: 2.2,
            pointRadius: 2.5,
            tension: 0.2,
          },
          {
            label: 'Primary VWAP+RSI (Unfiltered)',
            data: report.equityCurve.map((p) => p.primaryEquity),
            borderColor: '#8b5cf6',
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            borderWidth: 1.8,
            pointRadius: 2,
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { family: '"DM Sans", sans-serif', size: 11 } } },
          tooltip: {
            backgroundColor: '#0b1120',
            borderColor: '#1e293b',
            borderWidth: 1,
          },
        },
        scales: {
          x: { ticks: { ...baseAxisTicks, maxTicksLimit: 8 }, grid: baseGrid },
          y: { ticks: baseAxisTicks, grid: baseGrid },
        },
      },
    }),
    [report]
  );

  return (
    <div className="h-64 w-full">
      <canvas ref={ref} />
    </div>
  );
};

export const DrawdownChart: React.FC<{ report: BacktestReport }> = ({ report }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useChartInstance(
    ref,
    () => ({
      type: 'line',
      data: {
        labels: report.equityCurve.map((p) => p.timestamp.slice(5, 16)),
        datasets: [
          {
            label: 'AI Strategy Drawdown (%)',
            data: report.equityCurve.map((p) => p.aiDrawdownPct),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.18)',
            fill: true,
            borderWidth: 1.8,
            pointRadius: 1.5,
            tension: 0.15,
          },
          {
            label: 'Primary Strategy Drawdown (%)',
            data: report.equityCurve.map((p) => p.primaryDrawdownPct),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            borderWidth: 1.5,
            pointRadius: 1.5,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { family: '"DM Sans", sans-serif', size: 11 } } },
        },
        scales: {
          x: { ticks: { ...baseAxisTicks, maxTicksLimit: 8 }, grid: baseGrid },
          y: {
            ticks: { ...baseAxisTicks, callback: (v) => `${v}%` },
            grid: baseGrid,
          },
        },
      },
    }),
    [report]
  );

  return (
    <div className="h-64 w-full">
      <canvas ref={ref} />
    </div>
  );
};

export const WinLossChart: React.FC<{ report: BacktestReport }> = ({ report }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useChartInstance(
    ref,
    () => ({
      type: 'bar',
      data: {
        labels: ['Primary VWAP+RSI', 'AI Meta-Labeled'],
        datasets: [
          {
            label: 'Winning Trades',
            data: [report.primaryMetrics.winningTrades, report.aiMetrics.winningTrades],
            backgroundColor: '#10b981',
            borderRadius: 4,
          },
          {
            label: 'Losing Trades',
            data: [report.primaryMetrics.losingTrades, report.aiMetrics.losingTrades],
            backgroundColor: '#ef4444',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { family: '"DM Sans", sans-serif', size: 11 } } },
        },
        scales: {
          x: { ticks: baseAxisTicks, grid: { display: false } },
          y: { ticks: { ...baseAxisTicks, stepSize: 1 }, grid: baseGrid },
        },
      },
    }),
    [report]
  );

  return (
    <div className="h-60 w-full">
      <canvas ref={ref} />
    </div>
  );
};

export const MonthlyPerfChart: React.FC<{ report: BacktestReport }> = ({ report }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useChartInstance(
    ref,
    () => ({
      type: 'bar',
      data: {
        labels: report.monthlyPerformance.map((m) => m.period),
        datasets: [
          {
            label: 'Primary Return (%)',
            data: report.monthlyPerformance.map((m) => m.primaryReturnPct),
            backgroundColor: '#8b5cf6',
            borderRadius: 4,
          },
          {
            label: 'AI Meta-Labeled Return (%)',
            data: report.monthlyPerformance.map((m) => m.aiReturnPct),
            backgroundColor: '#06b6d4',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { family: '"DM Sans", sans-serif', size: 11 } } },
        },
        scales: {
          x: { ticks: baseAxisTicks, grid: { display: false } },
          y: { ticks: { ...baseAxisTicks, callback: (v) => `${v}%` }, grid: baseGrid },
        },
      },
    }),
    [report]
  );

  return (
    <div className="h-60 w-full">
      <canvas ref={ref} />
    </div>
  );
};

export const DecisionDistributionChart: React.FC<{ report: BacktestReport }> = ({ report }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { acceptBuy, acceptSell, rejectSkip } = report.decisionDistribution;

  useChartInstance(
    ref,
    () => ({
      type: 'doughnut',
      data: {
        labels: ['ACCEPT BUY', 'ACCEPT SELL', 'REJECT / SKIP'],
        datasets: [
          {
            data: [acceptBuy, acceptSell, rejectSkip],
            backgroundColor: ['#10b981', '#ef4444', '#475569'],
            borderColor: '#0b1120',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#cbd5e1', font: { family: '"DM Sans", sans-serif', size: 11 }, padding: 14 },
          },
        },
      },
    }),
    [acceptBuy, acceptSell, rejectSkip]
  );

  return (
    <div className="h-60 w-full">
      <canvas ref={ref} />
    </div>
  );
};

export const FeatureImportanceChart: React.FC<{ items: FeatureImportanceItem[] }> = ({ items }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useChartInstance(
    ref,
    () => ({
      type: 'bar',
      data: {
        labels: items.map((i) => i.label),
        datasets: [
          {
            label: 'Gini Split Importance (%)',
            data: items.map((i) => i.importance),
            backgroundColor: ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#6366f1', '#0ea5e9', '#a855f7', '#64748b'],
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { ...baseAxisTicks, callback: (v) => `${v}%` },
            grid: baseGrid,
          },
          y: {
            ticks: { color: '#cbd5e1', font: { family: '"DM Sans", sans-serif', size: 11 } },
            grid: { display: false },
          },
        },
      },
    }),
    [items]
  );

  return (
    <div className="h-64 w-full">
      <canvas ref={ref} />
    </div>
  );
};

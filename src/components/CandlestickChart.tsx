import React, { useEffect, useMemo, useRef } from 'react';
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from 'chart.js';
import { EnrichedCandle } from '../types/quant';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
  Legend
);

interface CandlestickChartProps {
  candles: EnrichedCandle[];
  selectedSignalIndex: number | null;
  onSelectCandle?: (candle: EnrichedCandle) => void;
  showRejectedSignals?: boolean;
  showBarrierCrossings?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  selectedSignalIndex,
  onSelectCandle,
  showRejectedSignals = true,
  showBarrierCrossings = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const selectedSignalCandle = useMemo(() => {
    if (selectedSignalIndex === null) return null;
    return candles.find((c) => c.index === selectedSignalIndex) ?? null;
  }, [candles, selectedSignalIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const labels = candles.map((c) => {
      // Compact timestamp label: MM-DD HH:mm
      const parts = c.timestamp.split(' ');
      if (parts.length === 2) {
        return `${parts[0].slice(5)} ${parts[1].slice(0, 5)}`;
      }
      return c.timestamp;
    });

    const minLow = Math.min(...candles.map((c) => c.low));
    const maxHigh = Math.max(...candles.map((c) => c.high));
    const pad = Math.max((maxHigh - minLow) * 0.08, 10);

    // Precompute marker arrays aligned with local window indices
    const localIdxMap = new Map<number, number>();
    candles.forEach((c, idx) => localIdxMap.set(c.index, idx));

    // Signal points for tooltip & crisp scatter overlays
    const acceptBuyPts: Array<{ x: number; y: number; candle: EnrichedCandle }> = [];
    const acceptSellPts: Array<{ x: number; y: number; candle: EnrichedCandle }> = [];
    const rejectPts: Array<{ x: number; y: number; candle: EnrichedCandle }> = [];
    const tpCrossPts: Array<{ x: number; y: number; candle: EnrichedCandle }> = [];
    const slCrossPts: Array<{ x: number; y: number; candle: EnrichedCandle }> = [];
    const verticalExitPts: Array<{ x: number; y: number; candle: EnrichedCandle }> = [];

    const candleOffset = pad * 0.14;

    candles.forEach((c, localIdx) => {
      if (c.primarySignal === 'BUY') {
        if (c.aiPrediction === 'ACCEPT') {
          acceptBuyPts.push({ x: localIdx, y: c.low - candleOffset, candle: c });
        } else if (showRejectedSignals) {
          rejectPts.push({ x: localIdx, y: c.low - candleOffset, candle: c });
        }
      } else if (c.primarySignal === 'SELL') {
        if (c.aiPrediction === 'ACCEPT') {
          acceptSellPts.push({ x: localIdx, y: c.high + candleOffset, candle: c });
        } else if (showRejectedSignals) {
          rejectPts.push({ x: localIdx, y: c.high + candleOffset, candle: c });
        }
      }

      if (showBarrierCrossings && c.tripleBarrier && c.primarySignal !== 'NONE') {
        const tb = c.tripleBarrier;
        const exitLocalIdx = localIdxMap.get(tb.exitIndex);
        if (exitLocalIdx !== undefined) {
          if (tb.barrierHit === 'PROFIT_TARGET') {
            tpCrossPts.push({ x: exitLocalIdx, y: tb.exitPrice, candle: c });
          } else if (tb.barrierHit === 'STOP_LOSS') {
            slCrossPts.push({ x: exitLocalIdx, y: tb.exitPrice, candle: c });
          } else {
            verticalExitPts.push({ x: exitLocalIdx, y: tb.exitPrice, candle: c });
          }
        }
      }
    });

    // Custom Chart.js plugin to draw OHLC candlesticks & selected trade's Triple Barrier box
    const ohlcAndBarrierPlugin = {
      id: 'ohlcAndBarrierPlugin',
      beforeDatasetsDraw(chart: Chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;
        if (!xScale || !yScale || !chartArea) return;

        ctx.save();
        ctx.beginPath();
        ctx.rect(
          chartArea.left,
          chartArea.top,
          chartArea.right - chartArea.left,
          chartArea.bottom - chartArea.top
        );
        ctx.clip();

        // 1. Draw selected signal's Triple Barrier window (+1.6 ATR TP, -1.0 ATR SL, 12-bar vertical)
        if (selectedSignalCandle && selectedSignalCandle.tripleBarrier) {
          const tb = selectedSignalCandle.tripleBarrier;
          const entryLocal = localIdxMap.get(tb.entryIndex);
          const endLocal = localIdxMap.get(tb.verticalBarrierIndex) ?? localIdxMap.get(tb.exitIndex);

          if (entryLocal !== undefined) {
            const xStart = xScale.getPixelForValue(entryLocal);
            const xEnd =
              endLocal !== undefined
                ? xScale.getPixelForValue(endLocal)
                : xScale.getPixelForValue(Math.min(candles.length - 1, entryLocal + 12));
            const yTP = yScale.getPixelForValue(tb.profitTargetPrice);
            const ySL = yScale.getPixelForValue(tb.stopLossPrice);
            const yEntry = yScale.getPixelForValue(tb.entryPrice);

            const boxTop = Math.min(yTP, ySL);
            const boxBottom = Math.max(yTP, ySL);

            // Subtle holding zone tint
            ctx.fillStyle = 'rgba(59, 130, 246, 0.06)';
            ctx.fillRect(xStart, boxTop, Math.max(xEnd - xStart, 12), boxBottom - boxTop);

            // Profit Target line (+1.6 ATR)
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(xStart, yTP);
            ctx.lineTo(xEnd, yTP);
            ctx.stroke();

            // Stop Loss line (-1.0 ATR)
            ctx.strokeStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(xStart, ySL);
            ctx.lineTo(xEnd, ySL);
            ctx.stroke();

            // Entry price reference
            ctx.strokeStyle = '#38bdf8';
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(xStart, yEntry);
            ctx.lineTo(xEnd, yEntry);
            ctx.stroke();

            // Vertical barrier boundary
            ctx.strokeStyle = '#8b5cf6';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xEnd, boxTop);
            ctx.lineTo(xEnd, boxBottom);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.font = '600 10px "JetBrains Mono", monospace';
            ctx.fillStyle = '#10b981';
            ctx.fillText(`TP +1.6 ATR (${tb.profitTargetPrice.toFixed(1)})`, xStart + 4, yTP - 5);
            ctx.fillStyle = '#ef4444';
            ctx.fillText(`SL -1.0 ATR (${tb.stopLossPrice.toFixed(1)})`, xStart + 4, ySL + 12);
          }
        }

        // 2. Draw OHLC Candlesticks
        const stepWidth =
          candles.length > 1
            ? Math.abs(xScale.getPixelForValue(1) - xScale.getPixelForValue(0))
            : 12;
        const bodyWidth = Math.max(2.5, Math.min(11, stepWidth * 0.62));

        candles.forEach((c, idx) => {
          const x = xScale.getPixelForValue(idx);
          const yOpen = yScale.getPixelForValue(c.open);
          const yClose = yScale.getPixelForValue(c.close);
          const yHigh = yScale.getPixelForValue(c.high);
          const yLow = yScale.getPixelForValue(c.low);

          const bullish = c.close >= c.open;
          const color = bullish ? '#10b981' : '#ef4444';

          // Highlight selected candle
          if (selectedSignalIndex === c.index) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
            ctx.fillRect(x - bodyWidth * 0.9, chartArea.top, bodyWidth * 1.8, chartArea.bottom - chartArea.top);
          }

          // Wick
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(x, yHigh);
          ctx.lineTo(x, yLow);
          ctx.stroke();

          // Body
          const top = Math.min(yOpen, yClose);
          const height = Math.max(1.5, Math.abs(yClose - yOpen));
          ctx.fillStyle = color;
          ctx.fillRect(x - bodyWidth / 2, top, bodyWidth, height);
        });

        ctx.restore();
      },
    };

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'VWAP',
            data: candles.map((c) => c.vwap),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderWidth: 1.8,
            pointRadius: 0,
            tension: 0.15,
            order: 2,
          },
          {
            type: 'line',
            label: 'Close Envelope (Hover)',
            data: candles.map((c) => c.close),
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#38bdf8',
            order: 3,
          },
          {
            type: 'scatter',
            label: 'ACCEPT BUY',
            data: acceptBuyPts.map((p) => ({ x: p.x, y: p.y })),
            backgroundColor: '#10b981',
            borderColor: '#ecfdf5',
            borderWidth: 1.5,
            pointStyle: 'triangle',
            pointRadius: 7,
            pointHoverRadius: 9,
            order: 1,
          },
          {
            type: 'scatter',
            label: 'ACCEPT SELL',
            data: acceptSellPts.map((p) => ({ x: p.x, y: p.y })),
            backgroundColor: '#ef4444',
            borderColor: '#fef2f2',
            borderWidth: 1.5,
            pointStyle: 'triangle',
            pointRotation: 180,
            pointRadius: 7,
            pointHoverRadius: 9,
            order: 1,
          },
          {
            type: 'scatter',
            label: 'REJECT / SKIP Signal',
            data: rejectPts.map((p) => ({ x: p.x, y: p.y })),
            backgroundColor: 'rgba(148, 163, 184, 0.35)',
            borderColor: '#94a3b8',
            borderWidth: 1.2,
            pointStyle: 'rectRot',
            pointRadius: 5,
            pointHoverRadius: 7,
            order: 1,
          },
          {
            type: 'scatter',
            label: 'Profit Target Cross (+1.6 ATR)',
            data: tpCrossPts.map((p) => ({ x: p.x, y: p.y })),
            backgroundColor: '#22d3ee',
            borderColor: '#0f172a',
            borderWidth: 1.5,
            pointStyle: 'star',
            pointRadius: 8,
            pointHoverRadius: 10,
            order: 0,
          },
          {
            type: 'scatter',
            label: 'Stop-Loss Cross (-1.0 ATR)',
            data: slCrossPts.map((p) => ({ x: p.x, y: p.y })),
            backgroundColor: '#f43f5e',
            borderColor: '#fff1f2',
            borderWidth: 2,
            pointStyle: 'crossRot',
            pointRadius: 7,
            pointHoverRadius: 9,
            order: 0,
          },
          {
            type: 'scatter',
            label: 'Vertical Barrier Exit (12 Bars)',
            data: verticalExitPts.map((p) => ({ x: p.x, y: p.y })),
            backgroundColor: '#a855f7',
            borderColor: '#faf5ff',
            borderWidth: 1.2,
            pointStyle: 'circle',
            pointRadius: 5,
            pointHoverRadius: 7,
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        onClick: (_event, elements) => {
          if (elements.length > 0 && onSelectCandle) {
            const idx = elements[0].index;
            if (candles[idx]) {
              onSelectCandle(candles[idx]);
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'start',
            labels: {
              color: '#94a3b8',
              usePointStyle: true,
              boxWidth: 8,
              boxHeight: 8,
              padding: 14,
              font: {
                family: '"DM Sans", sans-serif',
                size: 11,
              },
              filter: (item) => item.text !== 'Close Envelope (Hover)',
            },
          },
          tooltip: {
            backgroundColor: '#0b1120',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#1e293b',
            borderWidth: 1,
            padding: 12,
            titleFont: { family: '"JetBrains Mono", monospace', size: 11 },
            bodyFont: { family: '"JetBrains Mono", monospace', size: 11 },
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const c = candles[idx];
                return c ? `${c.timestamp} (${c.splitRole})` : '';
              },
              label: () => '',
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const c = candles[idx];
                if (!c) return [];
                const lines = [
                  `O: ${c.open.toFixed(2)}  H: ${c.high.toFixed(2)}`,
                  `L: ${c.low.toFixed(2)}  C: ${c.close.toFixed(2)}`,
                  `Vol: ${c.volume.toLocaleString()}  VWAP: ${c.vwap.toFixed(2)}`,
                  `RSI(14): ${c.rsi.toFixed(2)}  ATR(14): ${c.atr.toFixed(2)}`,
                ];
                if (c.primarySignal !== 'NONE') {
                  lines.push(`Primary Signal: ${c.primarySignal}`);
                  if (c.aiConfidence !== null) {
                    lines.push(
                      `AI Confidence: ${(c.aiConfidence * 100).toFixed(1)}% -> ${c.finalDecision}`
                    );
                  }
                  if (c.tripleBarrier) {
                    lines.push(
                      `TP: ${c.tripleBarrier.profitTargetPrice.toFixed(2)} | SL: ${c.tripleBarrier.stopLossPrice.toFixed(2)}`
                    );
                    lines.push(
                      `Outcome: ${c.tripleBarrier.barrierHit} (${c.tripleBarrier.returnPct >= 0 ? '+' : ''}${c.tripleBarrier.returnPct.toFixed(2)}%)`
                    );
                  }
                }
                return lines;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(30, 41, 59, 0.45)',
            },
            ticks: {
              color: '#64748b',
              maxTicksLimit: 12,
              font: { family: '"JetBrains Mono", monospace', size: 10 },
            },
          },
          y: {
            position: 'right',
            min: minLow - pad,
            max: maxHigh + pad,
            grid: {
              color: 'rgba(30, 41, 59, 0.45)',
            },
            ticks: {
              color: '#94a3b8',
              font: { family: '"JetBrains Mono", monospace', size: 11 },
              callback: (v) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 }),
            },
          },
        },
      },
      plugins: [ohlcAndBarrierPlugin],
    };

    chartRef.current = new Chart(canvas, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [candles, selectedSignalIndex, selectedSignalCandle, showRejectedSignals, showBarrierCrossings, onSelectCandle]);

  return (
    <div className="relative h-[460px] w-full">
      <canvas ref={canvasRef} />
    </div>
  );
};

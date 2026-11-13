// Generates a deterministic, realistic historical-style NIFTY 50 5-minute OHLCV CSV dataset
// across 9 NSE sessions (Sep, Oct, Nov) totaling 675 candles for academic demonstration.
// Clearly labeled as Historical Sample / Demo Data.

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_SESSIONS = [
  { date: '2025-09-12', openBase: 24310, regime: 'BULL_TREND' },
  { date: '2025-09-19', openBase: 24485, regime: 'CHOPPY_TRAP' },
  { date: '2025-09-26', openBase: 24410, regime: 'BEAR_TREND' },
  { date: '2025-10-08', openBase: 24260, regime: 'REVERSAL_BOUNCE' },
  { date: '2025-10-17', openBase: 24520, regime: 'CHOPPY_TRAP' },
  { date: '2025-10-24', openBase: 24460, regime: 'BULL_TREND' },
  { date: '2025-11-05', openBase: 24690, regime: 'BEAR_TREND' },
  { date: '2025-11-12', openBase: 24510, regime: 'CHOPPY_TRAP' },
  { date: '2025-11-19', openBase: 24580, regime: 'BULL_TREND' },
] as const;

export function generateSampleNifty50Csv(): string {
  const rand = mulberry32(20251119);
  const lines: string[] = ['Timestamp,Open,High,Low,Close,Volume'];

  let prevClose: number = SAMPLE_SESSIONS[0].openBase;

  for (const session of SAMPLE_SESSIONS) {
    // Overnight gap
    const gap = (rand() - 0.5) * 35;
    let price = Math.round((session.openBase + gap * 0.4) * 100) / 100;
    if (Math.abs(price - prevClose) > 180) {
      price = prevClose + Math.sign(price - prevClose) * 95;
    }

    for (let bar = 0; bar < 75; bar++) {
      const totalMinutes = 9 * 60 + 15 + bar * 5;
      const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const mm = String(totalMinutes % 60).padStart(2, '0');
      const timestamp = `${session.date} ${hh}:${mm}:00`;

      // Intraday U-shaped volume curve
      const uShape = 1.45 - 0.75 * Math.sin((Math.PI * bar) / 74);
      let volume = Math.round((115000 + rand() * 55000) * uShape);

      let drift = 0;
      let volScale = 9.5;
      let wickFactor = 0.55;

      // Regime-specific price dynamics
      if (session.regime === 'BULL_TREND') {
        if (bar >= 8 && bar <= 26) {
          drift = 3.2;
          volume = Math.round(volume * 1.45);
          wickFactor = 0.25;
        } else if (bar >= 27 && bar <= 38) {
          // Pullback toward VWAP then clean continuation
          drift = -2.1;
          volScale = 8.0;
        } else if (bar >= 39 && bar <= 58) {
          drift = 3.6;
          volume = Math.round(volume * 1.55);
          wickFactor = 0.22;
        } else {
          drift = (rand() - 0.48) * 3.0;
        }
      } else if (session.regime === 'BEAR_TREND') {
        if (bar >= 7 && bar <= 24) {
          drift = -3.4;
          volume = Math.round(volume * 1.48);
          wickFactor = 0.24;
        } else if (bar >= 25 && bar <= 35) {
          drift = 2.0;
          volScale = 8.0;
        } else if (bar >= 36 && bar <= 56) {
          drift = -3.8;
          volume = Math.round(volume * 1.5);
          wickFactor = 0.24;
        } else {
          drift = (rand() - 0.52) * 3.0;
        }
      } else if (session.regime === 'REVERSAL_BOUNCE') {
        if (bar < 25) {
          drift = -2.8;
          volScale = 10.5;
        } else if (bar >= 25 && bar <= 52) {
          drift = 3.9;
          volume = Math.round(volume * 1.6);
          wickFactor = 0.22;
        } else {
          drift = 0.5;
        }
      } else {
        // CHOPPY_TRAP: frequent false crosses around VWAP with heavy wicks & low conviction volume
        const cycle = Math.sin(bar / 3.4);
        drift = cycle * 4.5 + (rand() - 0.5) * 6.0;
        volScale = 13.5;
        wickFactor = 1.35;
        volume = Math.round(volume * 0.72);
      }

      const open = Number(price.toFixed(2));
      const bodyMove = drift + (rand() - 0.5) * volScale;
      const close = Number(Math.max(18000, open + bodyMove).toFixed(2));

      const bodyHigh = Math.max(open, close);
      const bodyLow = Math.min(open, close);
      const upperWick = Math.abs(rand() * volScale * wickFactor + 1.2);
      const lowerWick = Math.abs(rand() * volScale * wickFactor + 1.2);

      const high = Number((bodyHigh + upperWick).toFixed(2));
      const low = Number((bodyLow - lowerWick).toFixed(2));

      lines.push(`${timestamp},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${volume}`);
      price = close;
      prevClose = close;
    }
  }

  return lines.join('\n');
}

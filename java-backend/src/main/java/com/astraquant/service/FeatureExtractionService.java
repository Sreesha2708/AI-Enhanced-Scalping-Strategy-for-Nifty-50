package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FeatureExtractionService {

    public void extractEightFeatures(List<MarketData> candles) {
        int n = candles.size();
        double[] vwapDiff = new double[n];
        double[] logReturns = new double[n];

        for (int i = 0; i < n; i++) {
            vwapDiff[i] = candles.get(i).getClose() - candles.get(i).getVwap();
            if (i > 0) {
                logReturns[i] = Math.log(candles.get(i).getClose() / Math.max(candles.get(i - 1).getClose(), 1e-6));
            }
        }

        for (int i = 0; i < n; i++) {
            MarketData c = candles.get(i);

            // 1. VWAP Z-Score (20-bar rolling)
            int start = Math.max(0, i - 19);
            int count = i - start + 1;
            double mean = 0.0;
            for (int j = start; j <= i; j++) mean += vwapDiff[j];
            mean /= count;
            double var = 0.0;
            for (int j = start; j <= i; j++) {
                double d = vwapDiff[j] - mean;
                var += d * d;
            }
            double std = Math.sqrt(var / count);
            c.setVwapZScore(std > 1e-4 ? (vwapDiff[i] - mean) / std : 0.0);

            // 2. Normalized RSI
            c.setNormalizedRsi((c.getRsi() - 50.0) / 50.0);

            // 3. RSI 3-Bar Velocity
            double rsi3Prev = i >= 3 ? candles.get(i - 3).getRsi() : candles.get(0).getRsi();
            c.setRsiVelocity3Bar((c.getRsi() - rsi3Prev) / 3.0);

            // 4. Volume Surge
            c.setVolumeSurge(c.getVolume() / Math.max(c.getVolumeSma(), 1.0));

            // 5, 6, 7. Candle Morphology Ratios
            double range = Math.max(c.getHigh() - c.getLow(), 0.01);
            double body = Math.abs(c.getClose() - c.getOpen());
            double upperShadow = c.getHigh() - Math.max(c.getOpen(), c.getClose());
            double lowerShadow = Math.min(c.getOpen(), c.getClose()) - c.getLow();

            c.setCandleBodyRatio(body / range);
            c.setUpperShadowRatio(upperShadow / range);
            c.setLowerShadowRatio(lowerShadow / range);

            // 8. Realized Volatility (12-bar intraday 5m scaled)
            int rvStart = Math.max(1, i - 11);
            int rvCount = Math.max(1, i - rvStart + 1);
            double rvMean = 0.0;
            for (int j = rvStart; j <= i; j++) rvMean += logReturns[j];
            rvMean /= rvCount;
            double rvVar = 0.0;
            for (int j = rvStart; j <= i; j++) {
                double d = logReturns[j] - rvMean;
                rvVar += d * d;
            }
            c.setRealizedVolatility(Math.sqrt(rvVar / rvCount) * Math.sqrt(75.0) * 100.0);
        }
    }
}

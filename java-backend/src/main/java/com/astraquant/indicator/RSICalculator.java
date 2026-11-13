package com.astraquant.indicator;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RSICalculator {

    private static final int PERIOD = 14;

    public void calculate(List<MarketData> candles) {
        int n = candles.size();
        for (MarketData c : candles) {
            c.setRsi(50.0);
        }
        if (n <= PERIOD) return;

        double avgGain = 0.0;
        double avgLoss = 0.0;
        for (int i = 1; i <= PERIOD; i++) {
            double diff = candles.get(i).getClose() - candles.get(i - 1).getClose();
            if (diff >= 0) avgGain += diff;
            else avgLoss += Math.abs(diff);
        }
        avgGain /= PERIOD;
        avgLoss /= PERIOD;

        double firstRsi = avgLoss == 0 ? 100.0 : 100.0 - (100.0 / (1.0 + (avgGain / avgLoss)));
        candles.get(PERIOD).setRsi(Math.round(firstRsi * 100.0) / 100.0);

        for (int i = PERIOD + 1; i < n; i++) {
            double diff = candles.get(i).getClose() - candles.get(i - 1).getClose();
            double gain = Math.max(diff, 0.0);
            double loss = diff < 0 ? Math.abs(diff) : 0.0;

            avgGain = (avgGain * (PERIOD - 1) + gain) / PERIOD;
            avgLoss = (avgLoss * (PERIOD - 1) + loss) / PERIOD;

            double rsi;
            if (avgLoss == 0) {
                rsi = avgGain == 0 ? 50.0 : 100.0;
            } else {
                double rs = avgGain / avgLoss;
                rsi = 100.0 - (100.0 / (1.0 + rs));
            }
            candles.get(i).setRsi(Math.round(rsi * 100.0) / 100.0);
        }
    }
}

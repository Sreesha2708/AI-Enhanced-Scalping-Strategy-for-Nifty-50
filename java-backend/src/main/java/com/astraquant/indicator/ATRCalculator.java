package com.astraquant.indicator;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ATRCalculator {

    private static final int PERIOD = 14;

    public void calculate(List<MarketData> candles) {
        int n = candles.size();
        if (n == 0) return;

        double[] tr = new double[n];
        for (int i = 0; i < n; i++) {
            MarketData curr = candles.get(i);
            if (i == 0) {
                tr[i] = curr.getHigh() - curr.getLow();
            } else {
                double prevClose = candles.get(i - 1).getClose();
                tr[i] = Math.max(
                        curr.getHigh() - curr.getLow(),
                        Math.max(Math.abs(curr.getHigh() - prevClose), Math.abs(curr.getLow() - prevClose))
                );
            }
        }

        if (n <= PERIOD) {
            for (int i = 0; i < n; i++) {
                candles.get(i).setAtr(Math.round(Math.max(tr[i], 0.5) * 100.0) / 100.0);
            }
            return;
        }

        double sum = 0.0;
        for (int i = 0; i < PERIOD; i++) sum += tr[i];
        double atr = Math.max(sum / PERIOD, 0.5);

        for (int i = 0; i <= PERIOD; i++) {
            candles.get(i).setAtr(Math.round(atr * 100.0) / 100.0);
        }

        for (int i = PERIOD + 1; i < n; i++) {
            atr = Math.max((atr * (PERIOD - 1) + tr[i]) / PERIOD, 0.5);
            candles.get(i).setAtr(Math.round(atr * 100.0) / 100.0);
        }
    }
}

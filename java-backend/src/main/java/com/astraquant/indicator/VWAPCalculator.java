package com.astraquant.indicator;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class VWAPCalculator {

    public void calculate(List<MarketData> candles) {
        double cumPV = 0.0;
        double cumVol = 0.0;
        String currentSessionDate = "";

        for (MarketData candle : candles) {
            String sessionDate = candle.getTimestamp().length() >= 10
                    ? candle.getTimestamp().substring(0, 10)
                    : "";

            if (!sessionDate.equals(currentSessionDate)) {
                cumPV = 0.0;
                cumVol = 0.0;
                currentSessionDate = sessionDate;
            }

            double typicalPrice = (candle.getHigh() + candle.getLow() + candle.getClose()) / 3.0;
            double volume = Math.max(candle.getVolume(), 1.0);
            cumPV += typicalPrice * volume;
            cumVol += volume;

            double vwap = cumVol > 0 ? cumPV / cumVol : candle.getClose();
            candle.setVwap(Math.round(vwap * 100.0) / 100.0);
        }
    }
}

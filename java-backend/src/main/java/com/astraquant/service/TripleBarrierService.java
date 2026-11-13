package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TripleBarrierService {

    public static final double UPPER_ATR_MULTIPLIER = 1.6;
    public static final double LOWER_ATR_MULTIPLIER = 1.0;
    public static final int VERTICAL_BARS = 12;

    public void applyTripleBarriers(List<MarketData> candles) {
        int n = candles.size();
        for (int i = 0; i < n - 1; i++) {
            MarketData entry = candles.get(i);
            String sig = entry.getPrimarySignal();
            if (!"BUY".equals(sig) && !"SELL".equals(sig)) continue;

            double entryPrice = entry.getClose();
            double atr = Math.max(entry.getAtr(), 0.5);
            double tpDist = UPPER_ATR_MULTIPLIER * atr;
            double slDist = LOWER_ATR_MULTIPLIER * atr;

            double tpPrice = "BUY".equals(sig) ? entryPrice + tpDist : entryPrice - tpDist;
            double slPrice = "BUY".equals(sig) ? entryPrice - slDist : entryPrice + slDist;

            int maxIndex = Math.min(n - 1, i + VERTICAL_BARS);
            int exitIndex = maxIndex;
            double exitPrice = candles.get(maxIndex).getClose();
            String barrierHit = "VERTICAL_TIMEOUT";

            for (int j = i + 1; j <= maxIndex; j++) {
                MarketData future = candles.get(j);
                if ("BUY".equals(sig)) {
                    if (future.getLow() <= slPrice) {
                        exitIndex = j;
                        exitPrice = slPrice;
                        barrierHit = "STOP_LOSS";
                        break;
                    }
                    if (future.getHigh() >= tpPrice) {
                        exitIndex = j;
                        exitPrice = tpPrice;
                        barrierHit = "PROFIT_TARGET";
                        break;
                    }
                } else {
                    if (future.getHigh() >= slPrice) {
                        exitIndex = j;
                        exitPrice = slPrice;
                        barrierHit = "STOP_LOSS";
                        break;
                    }
                    if (future.getLow() <= tpPrice) {
                        exitIndex = j;
                        exitPrice = tpPrice;
                        barrierHit = "PROFIT_TARGET";
                        break;
                    }
                }
            }

            double returnPct = "BUY".equals(sig)
                    ? ((exitPrice - entryPrice) / entryPrice) * 100.0
                    : ((entryPrice - exitPrice) / entryPrice) * 100.0;

            int label = ("PROFIT_TARGET".equals(barrierHit)
                    || ("VERTICAL_TIMEOUT".equals(barrierHit) && returnPct > 0.04)) ? 1 : 0;

            entry.setProfitTargetPrice(Math.round(tpPrice * 100.0) / 100.0);
            entry.setStopLossPrice(Math.round(slPrice * 100.0) / 100.0);
            entry.setExitIndex(exitIndex);
            entry.setExitTimestamp(candles.get(exitIndex).getTimestamp());
            entry.setExitPrice(Math.round(exitPrice * 100.0) / 100.0);
            entry.setBarrierHit(barrierHit);
            entry.setReturnPct(Math.round(returnPct * 10000.0) / 10000.0);
            entry.setTripleBarrierLabel(label);
        }
    }
}

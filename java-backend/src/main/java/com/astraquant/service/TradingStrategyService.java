package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TradingStrategyService {

    public int generatePrimarySignals(List<MarketData> candles, double trainRatio) {
        int splitIndex = (int) Math.floor(candles.size() * trainRatio);
        int signalCount = 0;

        for (int i = 0; i < candles.size(); i++) {
            MarketData curr = candles.get(i);
            curr.setSplitRole(i < splitIndex ? "TRAIN" : "TEST");

            if (i < 15) {
                curr.setPrimarySignal("NONE");
                curr.setSignalReason("Warmup period");
                curr.setFinalDecision("NO SIGNAL");
                continue;
            }

            MarketData prev = candles.get(i - 1);
            boolean bullishCross = curr.getClose() > curr.getVwap()
                    && prev.getClose() <= prev.getVwap()
                    && curr.getRsi() >= 40.0 && curr.getRsi() <= 68.0;

            boolean bullishPullback = curr.getClose() > curr.getVwap()
                    && prev.getRsi() < 44.0
                    && curr.getRsi() >= 44.0 && curr.getRsi() <= 60.0
                    && curr.getRsi() > prev.getRsi();

            boolean bearishCross = curr.getClose() < curr.getVwap()
                    && prev.getClose() >= prev.getVwap()
                    && curr.getRsi() >= 32.0 && curr.getRsi() <= 60.0;

            boolean bearishPullback = curr.getClose() < curr.getVwap()
                    && prev.getRsi() > 56.0
                    && curr.getRsi() <= 56.0
                    && curr.getRsi() < prev.getRsi();

            if (bullishCross) {
                curr.setPrimarySignal("BUY");
                curr.setSignalReason("Price crossed above session VWAP with constructive RSI momentum");
                signalCount++;
            } else if (bullishPullback) {
                curr.setPrimarySignal("BUY");
                curr.setSignalReason("Bullish RSI rebound above VWAP support");
                signalCount++;
            } else if (bearishCross) {
                curr.setPrimarySignal("SELL");
                curr.setSignalReason("Price crossed below session VWAP with bearish RSI slope");
                signalCount++;
            } else if (bearishPullback) {
                curr.setPrimarySignal("SELL");
                curr.setSignalReason("Bearish RSI rejection below VWAP resistance");
                signalCount++;
            } else {
                curr.setPrimarySignal("NONE");
                curr.setSignalReason("No VWAP/RSI trigger");
                curr.setFinalDecision("NO SIGNAL");
            }
        }
        return signalCount;
    }
}

package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class RiskManagementService {

    public double calculatePositionSizeMultiplier(double confidence, double threshold, boolean accepted) {
        if (!accepted) return 0.0;
        double excess = Math.max(0.0, confidence - threshold) / Math.max(1.0 - threshold, 0.01);
        return Math.round((0.75 + excess * 0.75) * 100.0) / 100.0;
    }

    public Map<String, Object> buildRiskProfile(MarketData candle) {
        Map<String, Object> profile = new LinkedHashMap<>();
        double atr = Math.max(candle.getAtr(), 0.5);
        double slDist = Math.round(TripleBarrierService.LOWER_ATR_MULTIPLIER * atr * 100.0) / 100.0;
        double tpDist = Math.round(TripleBarrierService.UPPER_ATR_MULTIPLIER * atr * 100.0) / 100.0;
        profile.put("stopLossDistance", slDist);
        profile.put("profitTargetDistance", tpDist);
        profile.put("riskRewardRatio", 1.6);
        profile.put("maxHoldCandles", TripleBarrierService.VERTICAL_BARS);
        profile.put("positionSizeMultiplier", candle.getPositionSizeMultiplier() != null ? candle.getPositionSizeMultiplier() : 0.0);
        return profile;
    }
}

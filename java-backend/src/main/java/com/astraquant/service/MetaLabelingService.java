package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MetaLabelingService {

    private final RandomForestService randomForestService;
    private final RiskManagementService riskManagementService;

    public MetaLabelingService(RandomForestService randomForestService,
                               RiskManagementService riskManagementService) {
        this.randomForestService = randomForestService;
        this.riskManagementService = riskManagementService;
    }

    public void evaluateSignals(List<MarketData> candles, double threshold) throws Exception {
        for (MarketData c : candles) {
            if ("NONE".equals(c.getPrimarySignal())) {
                c.setAiConfidence(null);
                c.setAiPrediction(null);
                c.setFinalDecision("NO SIGNAL");
                c.setPositionSizeMultiplier(0.0);
                continue;
            }

            double conf = randomForestService.predictPositiveProbability(c);
            boolean accepted = conf >= threshold;

            c.setAiConfidence(conf);
            c.setAiPrediction(accepted ? "ACCEPT" : "REJECT");

            if (accepted) {
                c.setFinalDecision("BUY".equals(c.getPrimarySignal()) ? "ACCEPT BUY" : "ACCEPT SELL");
            } else {
                c.setFinalDecision("REJECT / SKIP");
            }

            double sizeMultiplier = riskManagementService.calculatePositionSizeMultiplier(conf, threshold, accepted);
            c.setPositionSizeMultiplier(sizeMultiplier);
        }
    }
}

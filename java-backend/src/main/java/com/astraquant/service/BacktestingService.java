package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BacktestingService {

    public Map<String, Object> runChronologicalBacktest(List<MarketData> candles, double threshold) {
        List<MarketData> testSignals = candles.stream()
                .filter(c -> "TEST".equals(c.getSplitRole())
                        && !"NONE".equals(c.getPrimarySignal())
                        && c.getTripleBarrierLabel() != null
                        && c.getAiConfidence() != null)
                .toList();

        if (testSignals.isEmpty()) {
            testSignals = candles.stream()
                    .filter(c -> !"NONE".equals(c.getPrimarySignal())
                            && c.getTripleBarrierLabel() != null
                            && c.getAiConfidence() != null)
                    .toList();
        }

        int tp = 0, fp = 0, tn = 0, fn = 0;
        List<Double> primaryReturns = new ArrayList<>();
        List<Double> aiReturns = new ArrayList<>();
        List<Map<String, Object>> equityCurve = new ArrayList<>();
        List<Map<String, Object>> trades = new ArrayList<>();

        double primaryEq = 100.0, primaryPeak = 100.0;
        double aiEq = 100.0, aiPeak = 100.0;

        for (MarketData c : testSignals) {
            double conf = c.getAiConfidence();
            boolean accepted = conf >= threshold;
            int pred = accepted ? 1 : 0;
            int actual = c.getTripleBarrierLabel();

            if (pred == 1 && actual == 1) tp++;
            else if (pred == 1) fp++;
            else if (actual == 0) tn++;
            else fn++;

            double rawRet = c.getReturnPct() != null ? c.getReturnPct() : 0.0;
            double mult = accepted && c.getPositionSizeMultiplier() != null ? c.getPositionSizeMultiplier() : 0.0;
            double sizedRet = rawRet * mult;

            primaryReturns.add(rawRet);
            primaryEq *= (1.0 + rawRet / 100.0);
            primaryPeak = Math.max(primaryPeak, primaryEq);

            if (accepted) {
                aiReturns.add(sizedRet);
                aiEq *= (1.0 + sizedRet / 100.0);
                aiPeak = Math.max(aiPeak, aiEq);
            }

            Map<String, Object> pt = new LinkedHashMap<>();
            pt.put("timestamp", c.getExitTimestamp() != null ? c.getExitTimestamp() : c.getTimestamp());
            pt.put("primaryEquity", Math.round(primaryEq * 100.0) / 100.0);
            pt.put("aiEquity", Math.round(aiEq * 100.0) / 100.0);
            equityCurve.add(pt);

            Map<String, Object> tr = new LinkedHashMap<>();
            tr.put("entryTimestamp", c.getTimestamp());
            tr.put("exitTimestamp", c.getExitTimestamp());
            tr.put("direction", c.getPrimarySignal());
            tr.put("entryPrice", c.getClose());
            tr.put("exitPrice", c.getExitPrice());
            tr.put("barrierHit", c.getBarrierHit());
            tr.put("aiConfidence", conf);
            tr.put("aiAccepted", accepted);
            tr.put("rawReturnPct", rawRet);
            tr.put("sizedReturnPct", Math.round(sizedRet * 10000.0) / 10000.0);
            trades.add(tr);
        }

        int total = tp + fp + tn + fn;
        double acc = total > 0 ? ((tp + tn) * 100.0) / total : 0.0;
        double prec = (tp + fp) > 0 ? (tp * 100.0) / (tp + fp) : 0.0;
        double rec = (tp + fn) > 0 ? (tp * 100.0) / (tp + fn) : 0.0;
        double f1 = (prec + rec) > 0 ? (2.0 * prec * rec) / (prec + rec) : 0.0;

        Map<String, Object> classMetrics = new LinkedHashMap<>();
        classMetrics.put("accuracy", Math.round(acc * 100.0) / 100.0);
        classMetrics.put("precision", Math.round(prec * 100.0) / 100.0);
        classMetrics.put("recall", Math.round(rec * 100.0) / 100.0);
        classMetrics.put("f1Score", Math.round(f1 * 100.0) / 100.0);
        classMetrics.put("tp", tp);
        classMetrics.put("fp", fp);
        classMetrics.put("tn", tn);
        classMetrics.put("fn", fn);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("primaryMetrics", summarizeReturns(primaryReturns));
        result.put("aiMetrics", summarizeReturns(aiReturns));
        result.put("classificationMetrics", classMetrics);
        result.put("equityCurve", equityCurve);
        result.put("trades", trades);
        return result;
    }

    private Map<String, Object> summarizeReturns(List<Double> returns) {
        int wins = 0, losses = 0;
        double eq = 100.0, peak = 100.0, maxDD = 0.0;
        for (double r : returns) {
            if (r > 0) wins++;
            else losses++;
            eq *= (1.0 + r / 100.0);
            peak = Math.max(peak, eq);
            maxDD = Math.max(maxDD, ((peak - eq) / peak) * 100.0);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalTrades", returns.size());
        m.put("winningTrades", wins);
        m.put("losingTrades", losses);
        m.put("winRate", returns.isEmpty() ? 0.0 : Math.round((wins * 10000.0) / returns.size()) / 100.0);
        m.put("totalReturnPct", Math.round((eq - 100.0) * 100.0) / 100.0);
        m.put("maxDrawdownPct", Math.round(maxDD * 100.0) / 100.0);
        return m;
    }
}

package com.astraquant.service;

import com.astraquant.indicator.ATRCalculator;
import com.astraquant.indicator.RSICalculator;
import com.astraquant.indicator.VWAPCalculator;
import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IndicatorService {

    private final VWAPCalculator vwapCalculator;
    private final RSICalculator rsiCalculator;
    private final ATRCalculator atrCalculator;

    public IndicatorService(VWAPCalculator vwapCalculator,
                            RSICalculator rsiCalculator,
                            ATRCalculator atrCalculator) {
        this.vwapCalculator = vwapCalculator;
        this.rsiCalculator = rsiCalculator;
        this.atrCalculator = atrCalculator;
    }

    public void computeAll(List<MarketData> candles) {
        vwapCalculator.calculate(candles);
        rsiCalculator.calculate(candles);
        atrCalculator.calculate(candles);
        computeVolumeSma(candles, 20);
    }

    private void computeVolumeSma(List<MarketData> candles, int period) {
        for (int i = 0; i < candles.size(); i++) {
            int start = Math.max(0, i - period + 1);
            double sum = 0.0;
            for (int j = start; j <= i; j++) {
                sum += candles.get(j).getVolume();
            }
            candles.get(i).setVolumeSma(Math.max(sum / (i - start + 1), 1.0));
        }
    }
}

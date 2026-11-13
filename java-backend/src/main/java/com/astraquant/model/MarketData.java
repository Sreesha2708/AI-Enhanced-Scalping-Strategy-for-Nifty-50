package com.astraquant.model;

import jakarta.persistence.*;

@Entity
@Table(name = "market_candles")
public class MarketData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int candleIndex;

    @Column(nullable = false)
    private String timestamp;

    private double open;
    private double high;
    private double low;
    private double close;
    private double volume;

    // Calculated Indicators
    private double vwap;
    private double rsi;
    private double atr;
    private double volumeSma;

    // Primary Strategy Signal: BUY, SELL, NONE
    private String primarySignal = "NONE";
    private String signalReason = "";

    // Eight Extracted Meta-Features
    private double vwapZScore;
    private double normalizedRsi;
    private double rsiVelocity3Bar;
    private double volumeSurge;
    private double candleBodyRatio;
    private double upperShadowRatio;
    private double lowerShadowRatio;
    private double realizedVolatility;

    // Triple Barrier Output
    private Integer tripleBarrierLabel; // 1 = profit target / positive, 0 = stop loss / negative
    private String barrierHit;          // PROFIT_TARGET, STOP_LOSS, VERTICAL_TIMEOUT
    private Double profitTargetPrice;
    private Double stopLossPrice;
    private Integer exitIndex;
    private String exitTimestamp;
    private Double exitPrice;
    private Double returnPct;

    // Random Forest Meta-Labeling Decision
    private Double aiConfidence;
    private String aiPrediction;        // ACCEPT, REJECT
    private String finalDecision;       // ACCEPT BUY, ACCEPT SELL, REJECT / SKIP, NO SIGNAL
    private Double positionSizeMultiplier;
    private String splitRole;           // TRAIN, TEST

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public int getCandleIndex() { return candleIndex; }
    public void setCandleIndex(int candleIndex) { this.candleIndex = candleIndex; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public double getOpen() { return open; }
    public void setOpen(double open) { this.open = open; }

    public double getHigh() { return high; }
    public void setHigh(double high) { this.high = high; }

    public double getLow() { return low; }
    public void setLow(double low) { this.low = low; }

    public double getClose() { return close; }
    public void setClose(double close) { this.close = close; }

    public double getVolume() { return volume; }
    public void setVolume(double volume) { this.volume = volume; }

    public double getVwap() { return vwap; }
    public void setVwap(double vwap) { this.vwap = vwap; }

    public double getRsi() { return rsi; }
    public void setRsi(double rsi) { this.rsi = rsi; }

    public double getAtr() { return atr; }
    public void setAtr(double atr) { this.atr = atr; }

    public double getVolumeSma() { return volumeSma; }
    public void setVolumeSma(double volumeSma) { this.volumeSma = volumeSma; }

    public String getPrimarySignal() { return primarySignal; }
    public void setPrimarySignal(String primarySignal) { this.primarySignal = primarySignal; }

    public String getSignalReason() { return signalReason; }
    public void setSignalReason(String signalReason) { this.signalReason = signalReason; }

    public double getVwapZScore() { return vwapZScore; }
    public void setVwapZScore(double vwapZScore) { this.vwapZScore = vwapZScore; }

    public double getNormalizedRsi() { return normalizedRsi; }
    public void setNormalizedRsi(double normalizedRsi) { this.normalizedRsi = normalizedRsi; }

    public double getRsiVelocity3Bar() { return rsiVelocity3Bar; }
    public void setRsiVelocity3Bar(double rsiVelocity3Bar) { this.rsiVelocity3Bar = rsiVelocity3Bar; }

    public double getVolumeSurge() { return volumeSurge; }
    public void setVolumeSurge(double volumeSurge) { this.volumeSurge = volumeSurge; }

    public double getCandleBodyRatio() { return candleBodyRatio; }
    public void setCandleBodyRatio(double candleBodyRatio) { this.candleBodyRatio = candleBodyRatio; }

    public double getUpperShadowRatio() { return upperShadowRatio; }
    public void setUpperShadowRatio(double upperShadowRatio) { this.upperShadowRatio = upperShadowRatio; }

    public double getLowerShadowRatio() { return lowerShadowRatio; }
    public void setLowerShadowRatio(double lowerShadowRatio) { this.lowerShadowRatio = lowerShadowRatio; }

    public double getRealizedVolatility() { return realizedVolatility; }
    public void setRealizedVolatility(double realizedVolatility) { this.realizedVolatility = realizedVolatility; }

    public Integer getTripleBarrierLabel() { return tripleBarrierLabel; }
    public void setTripleBarrierLabel(Integer tripleBarrierLabel) { this.tripleBarrierLabel = tripleBarrierLabel; }

    public String getBarrierHit() { return barrierHit; }
    public void setBarrierHit(String barrierHit) { this.barrierHit = barrierHit; }

    public Double getProfitTargetPrice() { return profitTargetPrice; }
    public void setProfitTargetPrice(Double profitTargetPrice) { this.profitTargetPrice = profitTargetPrice; }

    public Double getStopLossPrice() { return stopLossPrice; }
    public void setStopLossPrice(Double stopLossPrice) { this.stopLossPrice = stopLossPrice; }

    public Integer getExitIndex() { return exitIndex; }
    public void setExitIndex(Integer exitIndex) { this.exitIndex = exitIndex; }

    public String getExitTimestamp() { return exitTimestamp; }
    public void setExitTimestamp(String exitTimestamp) { this.exitTimestamp = exitTimestamp; }

    public Double getExitPrice() { return exitPrice; }
    public void setExitPrice(Double exitPrice) { this.exitPrice = exitPrice; }

    public Double getReturnPct() { return returnPct; }
    public void setReturnPct(Double returnPct) { this.returnPct = returnPct; }

    public Double getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Double aiConfidence) { this.aiConfidence = aiConfidence; }

    public String getAiPrediction() { return aiPrediction; }
    public void setAiPrediction(String aiPrediction) { this.aiPrediction = aiPrediction; }

    public String getFinalDecision() { return finalDecision; }
    public void setFinalDecision(String finalDecision) { this.finalDecision = finalDecision; }

    public Double getPositionSizeMultiplier() { return positionSizeMultiplier; }
    public void setPositionSizeMultiplier(Double positionSizeMultiplier) { this.positionSizeMultiplier = positionSizeMultiplier; }

    public String getSplitRole() { return splitRole; }
    public void setSplitRole(String splitRole) { this.splitRole = splitRole; }
}

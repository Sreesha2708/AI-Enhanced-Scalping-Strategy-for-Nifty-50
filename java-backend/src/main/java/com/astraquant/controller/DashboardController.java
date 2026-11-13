package com.astraquant.controller;

import com.astraquant.model.MarketData;
import com.astraquant.repository.MarketDataRepository;
import com.astraquant.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Controller
public class DashboardController {

    private final MarketDataRepository repository;
    private final DataLoaderService dataLoaderService;
    private final IndicatorService indicatorService;
    private final TradingStrategyService strategyService;
    private final FeatureExtractionService featureService;
    private final TripleBarrierService tripleBarrierService;
    private final RandomForestService randomForestService;
    private final MetaLabelingService metaLabelingService;
    private final BacktestingService backtestingService;

    private Map<String, Object> latestModelReport;
    private Map<String, Object> latestBacktestReport;

    public DashboardController(MarketDataRepository repository,
                               DataLoaderService dataLoaderService,
                               IndicatorService indicatorService,
                               TradingStrategyService strategyService,
                               FeatureExtractionService featureService,
                               TripleBarrierService tripleBarrierService,
                               RandomForestService randomForestService,
                               MetaLabelingService metaLabelingService,
                               BacktestingService backtestingService) {
        this.repository = repository;
        this.dataLoaderService = dataLoaderService;
        this.indicatorService = indicatorService;
        this.strategyService = strategyService;
        this.featureService = featureService;
        this.tripleBarrierService = tripleBarrierService;
        this.randomForestService = randomForestService;
        this.metaLabelingService = metaLabelingService;
        this.backtestingService = backtestingService;
    }

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @PostMapping("/api/data/upload")
    @ResponseBody
    public ResponseEntity<?> uploadCsv(@RequestParam(value = "file", required = false) MultipartFile file,
                                       @RequestParam(value = "demo", defaultValue = "false") boolean demo) {
        try {
            List<MarketData> candles = demo || file == null
                    ? dataLoaderService.loadSampleDataset()
                    : dataLoaderService.parseCsv(file);
            repository.deleteAll();
            repository.saveAll(candles);
            latestModelReport = null;
            latestBacktestReport = null;
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "totalCandles", candles.size(),
                    "isSampleDemoData", demo || file == null
            ));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/api/strategy/generate-signals")
    @ResponseBody
    public ResponseEntity<?> generateSignals(@RequestParam(defaultValue = "0.70") double trainRatio) {
        List<MarketData> candles = repository.findAllByOrderByCandleIndexAsc();
        if (candles.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No market data loaded."));
        }
        indicatorService.computeAll(candles);
        int count = strategyService.generatePrimarySignals(candles, trainRatio);
        repository.saveAll(candles);
        return ResponseEntity.ok(Map.of("status", "SIGNALS_GENERATED", "primarySignals", count));
    }

    @PostMapping("/api/features/extract")
    @ResponseBody
    public ResponseEntity<?> extractFeatures() {
        List<MarketData> candles = repository.findAllByOrderByCandleIndexAsc();
        if (candles.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No market data loaded."));
        }
        featureService.extractEightFeatures(candles);
        tripleBarrierService.applyTripleBarriers(candles);
        repository.saveAll(candles);
        return ResponseEntity.ok(Map.of("status", "FEATURES_AND_BARRIERS_EXTRACTED", "candles", candles.size()));
    }

    @PostMapping("/api/model/train")
    @ResponseBody
    public ResponseEntity<?> trainModel(@RequestParam(defaultValue = "50") int numTrees,
                                        @RequestParam(defaultValue = "5") int maxDepth,
                                        @RequestParam(defaultValue = "0.52") double threshold) {
        try {
            List<MarketData> candles = repository.findAllByOrderByCandleIndexAsc();
            latestModelReport = randomForestService.train(candles, numTrees, maxDepth, threshold);
            return ResponseEntity.ok(latestModelReport);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/api/model/predict")
    @ResponseBody
    public ResponseEntity<?> predict(@RequestParam(defaultValue = "0.52") double threshold) {
        try {
            List<MarketData> candles = repository.findAllByOrderByCandleIndexAsc();
            metaLabelingService.evaluateSignals(candles, threshold);
            repository.saveAll(candles);
            long accepted = candles.stream().filter(c -> "ACCEPT".equals(c.getAiPrediction())).count();
            long rejected = candles.stream().filter(c -> "REJECT".equals(c.getAiPrediction())).count();
            return ResponseEntity.ok(Map.of("accepted", accepted, "rejected", rejected));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/api/backtest/run")
    @ResponseBody
    public ResponseEntity<?> runBacktest(@RequestParam(defaultValue = "0.52") double threshold) {
        List<MarketData> candles = repository.findAllByOrderByCandleIndexAsc();
        if (candles.isEmpty() || !randomForestService.isTrained()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Train the Random Forest model before running backtest."));
        }
        latestBacktestReport = backtestingService.runChronologicalBacktest(candles, threshold);
        return ResponseEntity.ok(latestBacktestReport);
    }

    @GetMapping("/api/dashboard/summary")
    @ResponseBody
    public ResponseEntity<?> getSummary() {
        List<MarketData> candles = repository.findAllByOrderByCandleIndexAsc();
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("datasetLoaded", !candles.isEmpty());
        summary.put("totalCandles", candles.size());
        summary.put("latestCandle", candles.isEmpty() ? null : candles.get(candles.size() - 1));
        summary.put("modelReport", latestModelReport);
        summary.put("backtestReport", latestBacktestReport);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/api/backtest/results")
    @ResponseBody
    public ResponseEntity<?> getBacktestResults() {
        if (latestBacktestReport == null) {
            return ResponseEntity.ok(Map.of("status", "NOT_RUN"));
        }
        return ResponseEntity.ok(latestBacktestReport);
    }
}

package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.springframework.stereotype.Service;
import weka.classifiers.trees.RandomForest;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;

import java.util.*;

@Service
public class RandomForestService {

    private RandomForest model;
    private Instances datasetHeader;
    private boolean trained = false;
    private double confidenceThreshold = 0.52;

    private Instances buildHeader() {
        ArrayList<Attribute> attrs = new ArrayList<>();
        attrs.add(new Attribute("vwapZScore"));
        attrs.add(new Attribute("normalizedRsi"));
        attrs.add(new Attribute("rsiVelocity3Bar"));
        attrs.add(new Attribute("volumeSurge"));
        attrs.add(new Attribute("candleBodyRatio"));
        attrs.add(new Attribute("upperShadowRatio"));
        attrs.add(new Attribute("lowerShadowRatio"));
        attrs.add(new Attribute("realizedVolatility"));

        ArrayList<String> classVals = new ArrayList<>(Arrays.asList("0", "1"));
        attrs.add(new Attribute("metaLabel", classVals));

        Instances header = new Instances("AstraQuantMetaLabeling", attrs, 0);
        header.setClassIndex(attrs.size() - 1);
        return header;
    }

    private Instance toInstance(MarketData c, Instances header, boolean includeLabel) {
        double[] vals = new double[header.numAttributes()];
        vals[0] = c.getVwapZScore();
        vals[1] = c.getNormalizedRsi();
        vals[2] = c.getRsiVelocity3Bar();
        vals[3] = c.getVolumeSurge();
        vals[4] = c.getCandleBodyRatio();
        vals[5] = c.getUpperShadowRatio();
        vals[6] = c.getLowerShadowRatio();
        vals[7] = c.getRealizedVolatility();

        if (includeLabel && c.getTripleBarrierLabel() != null) {
            vals[8] = c.getTripleBarrierLabel() == 1 ? 1.0 : 0.0;
        } else {
            vals[8] = weka.core.Utils.missingValue();
        }
        Instance inst = new DenseInstance(1.0, vals);
        inst.setDataset(header);
        return inst;
    }

    public Map<String, Object> train(List<MarketData> candles, int numTrees, int maxDepth, double threshold) throws Exception {
        this.confidenceThreshold = threshold;
        this.datasetHeader = buildHeader();
        Instances trainSet = new Instances(this.datasetHeader);

        List<MarketData> trainSignals = candles.stream()
                .filter(c -> "TRAIN".equals(c.getSplitRole()) && !"NONE".equals(c.getPrimarySignal()) && c.getTripleBarrierLabel() != null)
                .toList();

        if (trainSignals.size() < 6) {
            throw new IllegalStateException("Insufficient training signals in chronological split: " + trainSignals.size());
        }

        for (MarketData c : trainSignals) {
            trainSet.add(toInstance(c, this.datasetHeader, true));
        }

        RandomForest rf = new RandomForest();
        rf.setNumIterations(numTrees);
        rf.setMaxDepth(maxDepth);
        rf.setNumFeatures(3);
        rf.setSeed(42);
        rf.setComputeAttributeImportance(true);
        rf.buildClassifier(trainSet);

        this.model = rf;
        this.trained = true;

        int correct = 0;
        for (MarketData c : trainSignals) {
            double prob = predictPositiveProbability(c);
            int pred = prob >= threshold ? 1 : 0;
            if (pred == c.getTripleBarrierLabel()) correct++;
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("trained", true);
        report.put("numTrees", numTrees);
        report.put("maxDepth", maxDepth);
        report.put("confidenceThreshold", threshold);
        report.put("trainSignals", trainSignals.size());
        report.put("trainAccuracy", Math.round((correct * 10000.0) / trainSignals.size()) / 100.0);

        double[] importances = rf.computeAverageImpurityDecreasePerAttribute(null);
        String[] names = {
                "vwapZScore", "normalizedRsi", "rsiVelocity3Bar", "volumeSurge",
                "candleBodyRatio", "upperShadowRatio", "lowerShadowRatio", "realizedVolatility"
        };
        List<Map<String, Object>> impList = new ArrayList<>();
        double total = 0.0;
        if (importances != null) {
            for (int i = 0; i < 8; i++) total += Math.max(0.0, importances[i]);
        }
        for (int i = 0; i < 8; i++) {
            double val = (importances != null && total > 0) ? (Math.max(0.0, importances[i]) / total) * 100.0 : 12.5;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("feature", names[i]);
            item.put("importance", Math.round(val * 100.0) / 100.0);
            impList.add(item);
        }
        report.put("featureImportances", impList);
        return report;
    }

    public double predictPositiveProbability(MarketData c) throws Exception {
        if (!trained || model == null) {
            throw new IllegalStateException("Weka RandomForest model must be trained before prediction.");
        }
        Instance inst = toInstance(c, this.datasetHeader, false);
        double[] dist = model.distributionForInstance(inst);
        // dist[1] corresponds to class "1"
        return Math.round(dist[1] * 10000.0) / 10000.0;
    }

    public boolean isTrained() {
        return trained;
    }

    public double getConfidenceThreshold() {
        return confidenceThreshold;
    }
}

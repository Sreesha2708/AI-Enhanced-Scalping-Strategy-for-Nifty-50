package com.astraquant.service;

import com.astraquant.model.MarketData;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class DataLoaderService {

    public List<MarketData> parseCsv(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded CSV file is empty.");
        }
        return parseInputStream(file.getInputStream());
    }

    public List<MarketData> loadSampleDataset() throws Exception {
        ClassPathResource resource = new ClassPathResource("data/nifty50_sample_5min.csv");
        return parseInputStream(resource.getInputStream());
    }

    public List<MarketData> parseInputStream(InputStream inputStream) throws Exception {
        List<MarketData> candles = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            int index = 0;
            for (CSVRecord record : parser) {
                String timestamp = record.get("Timestamp");
                double open = Double.parseDouble(record.get("Open"));
                double high = Double.parseDouble(record.get("High"));
                double low = Double.parseDouble(record.get("Low"));
                double close = Double.parseDouble(record.get("Close"));
                double volume = Double.parseDouble(record.get("Volume"));

                if (open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) {
                    throw new IllegalArgumentException("Invalid non-positive price or negative volume at row " + (index + 1));
                }

                MarketData md = new MarketData();
                md.setCandleIndex(index++);
                md.setTimestamp(timestamp);
                md.setOpen(open);
                md.setHigh(Math.max(high, Math.max(open, close)));
                md.setLow(Math.min(low, Math.min(open, close)));
                md.setClose(close);
                md.setVolume(volume);
                candles.add(md);
            }
        }

        if (candles.size() < 40) {
            throw new IllegalArgumentException("CSV must contain at least 40 five-minute candles.");
        }
        return candles;
    }
}

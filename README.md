# ASTRAQUANT X — AI-Enhanced Scalping Strategy for NIFTY 50

> **Academic & Hackathon Research Prototype**: This platform is an educational decision-support and quantitative research demonstration. It does **not** connect to live brokerage execution, claim guaranteed profits, or present historical/sample data as live market quotes.

---

## Project Overview

Traditional indicator-based intraday scalping strategies (such as VWAP + RSI crossovers) suffer from frequent false signals during sideways, low-volume, or high-wick consolidation regimes.

**ASTRAQUANT X** implements **Meta-Labeling** (inspired by Marcos López de Prado):
1. **Primary Strategy (VWAP + RSI)**: Generates candidate `BUY` and `SELL` scalping signals on 5-minute NIFTY 50 OHLCV candles.
2. **Eight-Feature Microstructure Extraction**: Computes VWAP Z-Score, Normalized RSI, RSI 3-Bar Velocity, Volume Surge, Candle Body Ratio, Upper Shadow Ratio, Lower Shadow Ratio, and Realized Volatility.
3. **Triple Barrier Labeling**: Labels historical signals using `+1.6 × ATR` Profit Target (Upper), `-1.0 × ATR` Stop Loss (Lower), and `12 candles` (Vertical max holding period).
4. **Random Forest Meta-Classifier**: Evaluates the 8 features to output an AI confidence score and decide whether to **ACCEPT BUY**, **ACCEPT SELL**, or **REJECT / SKIP** the primary signal — never inventing unrelated trades.
5. **Risk Management & Chronological Backtesting**: Uses ATR-based stop-loss/targets, confidence-scaled sizing, and a strict chronological train/test split to prevent future data leakage.

---

## Architecture in This Repository

### 1. Live Interactive Web Application (Port `3000`)
Runs directly in this workspace via Express + Vite + React + TypeScript + Chart.js:
- `server.ts` & `server/quantEngine.ts`: Full REST API (`/api/data/upload`, `/api/strategy/generate-signals`, `/api/features/extract`, `/api/model/train`, `/api/model/predict`, `/api/backtest/run`, `/api/dashboard/summary`, `/api/backtest/results`), CSV validator, indicators, CART Random Forest classifier, Triple Barrier engine, and chronological backtester.
- `src/`: 7-page quantitative trading terminal UI with interactive OHLC candlestick charting, BUY/SELL signal markers, Profit Target (`+1.6 ATR`) & Stop Loss (`-1.0 ATR`) level lines and exact crossing markers, 8-feature explorer, Random Forest visual explanation, backtest comparison, and Java Spring Boot source explorer.

### 2. Complete Java 17 + Spring Boot + Weka + Maven Project (`/java-backend/`)
Ready to open in VS Code or IntelliJ IDEA and build with Maven:
- `java-backend/pom.xml` (Spring Boot 3.2, Thymeleaf, Spring Data JPA, H2, MySQL Connector, Weka `3.8.6`, Apache Commons CSV `1.10.0`)
- `java-backend/src/main/java/com/astraquant/model/MarketData.java`
- `java-backend/src/main/java/com/astraquant/indicator/{VWAPCalculator,RSICalculator,ATRCalculator}.java`
- `java-backend/src/main/java/com/astraquant/service/{DataLoaderService,IndicatorService,TradingStrategyService,FeatureExtractionService,TripleBarrierService,RandomForestService,MetaLabelingService,RiskManagementService,BacktestingService}.java`
- `java-backend/src/main/java/com/astraquant/controller/DashboardController.java`

---

## Running Locally

### Option A: Interactive Web Workspace (Node.js 20+)
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Option B: Java Spring Boot + Weka Backend (VS Code / Maven)
1. Install **Java 17+** (or Java 21) and **Apache Maven 3.9+**.
2. In VS Code, install **Extension Pack for Java** and **Spring Boot Extension Pack**.
3. Open the `java-backend/` folder in VS Code (or terminal):
   ```bash
   cd java-backend
   mvn clean compile
   mvn spring-boot:run
   ```
4. Open `http://localhost:8080` in your browser (H2 database console available at `http://localhost:8080/h2-console`).
5. To switch from H2 to MySQL, uncomment the MySQL configuration block in `java-backend/src/main/resources/application.properties`.

---

## CSV Format Requirement

Uploaded 5-minute OHLCV CSV files must contain these exact column headers:
```csv
Timestamp,Open,High,Low,Close,Volume
2025-11-19 09:15:00,24580.00,24592.40,24571.10,24586.50,185420
```

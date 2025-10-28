# HRV Trends and Readiness Scoring Implementation Summary

## Overview

This document summarizes the implementation of HRV (Heart Rate Variability) trend analysis and comprehensive readiness scoring for the Garmin Connect MCP server.

## Implementation Status: ✅ Complete

All 7 tasks have been successfully implemented:

- ✅ Task 1: HRV Data Storage and Historical Tracking Service
- ✅ Task 2: HRV Baseline Calculator Service
- ✅ Task 3: HRV Anomaly Detector Service
- ✅ Task 4: Comprehensive Readiness Scoring Service
- ✅ Task 5: HRV and Readiness MCP Tools
- ✅ Task 6: Enhanced Recovery Quality Service Integration
- ✅ Task 7: Comprehensive Testing Suite

## Architecture

### Type Definitions

#### `/src/types/hrv-tracking.ts`
- `HRVMeasurement`: Raw HRV measurement with context
- `HRVDataPoint`: Enriched data point with rolling averages
- `HRVHistory`: Persistent storage structure
- `HRVTrendAnalysis`: Trend analysis result
- `HRVBaseline`: Baseline statistics with confidence intervals
- `HRVAnomaly`: Anomaly detection result with severity classification

#### `/src/types/readiness.ts`
- `ReadinessScore`: Comprehensive readiness assessment
- `MetricContribution`: Individual metric scoring
- `TrainingRecommendation`: Evidence-based training guidance
- `ReadinessFactor`: Positive/negative factors affecting readiness

### Services

#### HRV Storage Service (`/src/services/hrvStorageService.ts`)
**Purpose**: Persistent storage for HRV measurements

**Key Features**:
- Atomic file writes using temp files
- Rolling average calculation (7-day and 28-day windows)
- Data quality tracking and statistics
- Retention policy (365 days default)
- Date-range queries
- Storage location: `~/.garmin-connect-mcp/hrv-history.json`

**Main Methods**:
- `addMeasurement(measurement)`: Add/update HRV measurement
- `getMeasurements(startDate, endDate)`: Get raw measurements
- `getDataPoints(startDate, endDate)`: Get enriched data with rolling averages
- `getAllMeasurements()`: Get all stored measurements
- `getStats()`: Get storage statistics
- `clear()`: Clear all data (for testing)

#### HRV Baseline Calculator (`/src/services/hrvBaselineCalculator.ts`)
**Purpose**: Calculate robust HRV baseline statistics

**Statistical Methods**:
- **Baseline**: Median (robust to outliers)
- **Spread**: Interquartile Range (IQR)
- **Confidence Interval**: 95% CI using median ± 1.96 * (IQR / 1.35)
- **Weekly Pattern**: Average and std dev by day of week
- **Evolution**: 28-day sliding window baselines

**Requirements**:
- Minimum 14 days of data
- Uses most recent 28 days for baseline calculation

**Main Methods**:
- `calculate(measurements)`: Calculate baseline statistics
- `isWithinNormalRange(value, baseline)`: Check if value is within CI
- `calculateDeviation(value, baseline)`: Calculate percentage deviation
- `getExpectedForDayOfWeek(day, baseline)`: Get day-specific expected value

#### HRV Anomaly Detector (`/src/services/hrvAnomalyDetector.ts`)
**Purpose**: Detect and classify HRV anomalies

**Severity Classification**:
- **Minor**: 5-10% below baseline
- **Moderate**: 10-15% below baseline
- **Significant**: 15-20% below baseline
- **Critical**: >20% below baseline

**Velocity Classification**:
- **Sudden**: Drop > 5ms/day
- **Gradual**: Drop 2-5ms/day

**Features**:
- Consecutive days low tracking
- Velocity calculation using linear regression
- Correlation detection (high training load, poor sleep, elevated resting HR)
- Recovery time estimation (1-7+ days based on severity and correlations)

**Main Methods**:
- `detectAnomalies(measurements, baseline, daysToAnalyze)`: Detect recent anomalies
- `hasActiveAnomaly(anomalies)`: Check for active anomaly
- `getMostSevereAnomaly(anomalies)`: Get most severe current anomaly

#### Readiness Scorer (`/src/services/readinessScorer.ts`)
**Purpose**: Calculate comprehensive readiness score

**Metric Weights** (redistributed if missing):
- HRV: 25% (baseline-aware scoring)
- Sleep Quality: 25%
- Training Stress Balance (TSB): 20%
- Resting Heart Rate: 15%
- Body Battery: 15%

**Scoring Logic**:
```typescript
// HRV Scoring (baseline-aware)
score = 80 + (deviation_from_baseline * 2)
// +20% above baseline = 100 score
// 0% (at baseline) = 80 score
// -10% below baseline = 60 score
// -20% below baseline = 40 score

// TSB Scoring
> +10 = 100 (Fresh)
0 to +10 = 90-100 (Optimal form)
-10 to 0 = 50-70 (Slight fatigue)
-20 to -10 = 30-50 (Moderate fatigue)
< -30 = 10 (Overreaching)

// Sleep: Direct 0-100 score
// Resting HR: Deviation from baseline
// Body Battery: Direct 0-100 score
```

**Recommendation Levels**:
- **High** (85-100): High-intensity training recommended
- **Normal** (70-84): Normal training as planned
- **Moderate** (55-69): Reduce intensity or volume
- **Light** (40-54): Light activity only
- **Rest** (<40): Complete rest recommended

**Main Methods**:
- `calculate(input)`: Calculate readiness score and recommendations

### Enhanced Services

#### Recovery Quality Service (Updated)
**Changes**:
- Added HRV baseline-aware scoring (optional parameter)
- Maintains backward compatibility
- Falls back to population-based scoring if no baseline provided

**Scoring Enhancement**:
```typescript
// Before: Hardcoded thresholds
if (hrv >= 60) return 100;
if (hrv >= 50) return 85;
// ...

// After: Baseline-aware (when baseline provided)
const deviation = ((hrv - baseline) / baseline) * 100;
score = 80 + deviation * 2;
```

### MCP Tools

#### `/src/tools/hrv-tools.ts`

Four new tools integrated into the MCP server:

1. **`get_hrv_trends`**
   - Analyzes HRV trends over time
   - Returns: current value, weekly/monthly trends, rolling averages
   - Parameters: startDate, endDate, syncFromGarmin
   - Auto-syncs from Garmin if requested

2. **`get_readiness_score`**
   - Comprehensive readiness assessment
   - Returns: overall score, metric breakdown, training recommendations, factors
   - Parameters: date, syncFromGarmin
   - Combines HRV, sleep, TSB, resting HR, body battery

3. **`get_hrv_baseline`**
   - Calculate baseline statistics
   - Returns: baseline value, IQR, confidence interval, weekly pattern, evolution
   - Parameters: syncFromGarmin, days
   - Requires minimum 14 days of data

4. **`get_hrv_anomalies`**
   - Detect HRV anomalies
   - Returns: anomalies with severity, velocity, correlations, recovery estimates
   - Parameters: days, syncFromGarmin
   - Analyzes recent measurements (default: 7 days)

**Data Synchronization**:
- Tools can sync HRV data from Garmin on request
- HRV extracted from sleep data (various field attempts)
- Context data fetched (sleep score, resting HR)
- Stored locally for historical analysis

### Testing

#### Test Coverage: 52/52 tests passing

**Test Files**:
1. `hrvStorageService.test.ts` (10 tests)
   - Add/update measurements
   - Date filtering
   - Rolling averages
   - Statistics calculation

2. `hrvBaselineCalculator.test.ts` (14 tests)
   - Median calculation
   - IQR calculation
   - Confidence intervals
   - Weekly patterns
   - Baseline evolution
   - Deviation calculations

3. `hrvAnomalyDetector.test.ts` (12 tests)
   - Anomaly detection
   - Severity classification
   - Consecutive days tracking
   - Velocity classification
   - Correlation detection
   - Recovery estimation

4. `readinessScorer.test.ts` (16 tests)
   - Multi-metric scoring
   - Weight redistribution
   - HRV scoring
   - TSB scoring
   - Recommendations
   - Factor identification
   - Status classification

**Test Data**: Synthetic data used to validate statistical accuracy

## Usage Examples

### Get HRV Trends
```bash
# Analyze last 30 days of HRV
{
  "name": "get_hrv_trends",
  "arguments": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-30",
    "syncFromGarmin": true
  }
}
```

### Get Readiness Score
```bash
# Get today's readiness assessment
{
  "name": "get_readiness_score",
  "arguments": {
    "date": "2025-01-15",
    "syncFromGarmin": true
  }
}
```

### Get HRV Baseline
```bash
# Calculate baseline from last 28 days
{
  "name": "get_hrv_baseline",
  "arguments": {
    "syncFromGarmin": true,
    "days": 28
  }
}
```

### Get HRV Anomalies
```bash
# Check for anomalies in last 7 days
{
  "name": "get_hrv_anomalies",
  "arguments": {
    "days": 7,
    "syncFromGarmin": true
  }
}
```

## Data Flow

1. **HRV Data Collection**:
   ```
   Garmin Connect → Sleep Data → HRV Extraction → Local Storage
   ```

2. **Baseline Calculation**:
   ```
   Historical Data → Statistical Analysis → Baseline + CI
   ```

3. **Anomaly Detection**:
   ```
   Recent Data + Baseline → Deviation Analysis → Anomaly Classification
   ```

4. **Readiness Scoring**:
   ```
   HRV + Sleep + TSB + Resting HR + Body Battery → Weighted Score → Recommendations
   ```

## Key Features

### Robust Statistics
- Median-based baseline (resistant to outliers)
- IQR for spread measurement
- 95% confidence intervals
- Weekly pattern analysis

### Intelligent Anomaly Detection
- Severity classification (minor to critical)
- Velocity analysis (sudden vs gradual)
- Correlation detection
- Recovery time estimation

### Comprehensive Readiness
- Multi-metric integration
- Weight redistribution for missing data
- Baseline-aware HRV scoring
- Evidence-based training recommendations
- Factor analysis (positive/negative)

### Data Quality
- Atomic file writes
- Data quality tracking
- Retention policies
- Error handling

## Integration Points

### Existing Services
- `sleepDataService`: Fetch sleep data for HRV extraction
- `performanceDataService`: Fetch performance metrics for readiness
- `recoveryQualityService`: Enhanced with baseline-aware HRV scoring
- `trainingStressService`: TSB calculation for readiness

### MCP Server
- Integrated into main server (`/src/index.ts`)
- Tool definitions added to ListToolsRequestSchema
- Tool handlers added to CallToolRequestSchema
- Follows existing pattern from sleep correlation tools

## Limitations and Future Enhancements

### Current Limitations
1. **HRV Data Availability**: Depends on Garmin API field structure
2. **Body Battery**: Not currently available from API methods
3. **Resting HR Baseline**: Uses fixed value (60), needs historical calculation
4. **TSB Integration**: Optional, not always available

### Future Enhancements
1. Add resting HR baseline calculation from historical data
2. Integrate with body battery API when available
3. Add HRV recovery prediction models
4. Implement automated readiness alerts
5. Add trend prediction using time series models
6. Create visualization endpoints
7. Add export functionality for external analysis

## Configuration

### Storage Location
Default: `~/.garmin-connect-mcp/hrv-history.json`

Customizable via:
```typescript
const storage = new HRVStorageService({
  filePath: '/custom/path/hrv-history.json',
  maxRetentionDays: 365,
  minQuality: 0.0,
});
```

### Readiness Weights
Customizable via:
```typescript
const scorer = new ReadinessScorer({
  weights: {
    hrv: 0.30,
    sleep: 0.25,
    trainingStressBalance: 0.20,
    restingHeartRate: 0.15,
    bodyBattery: 0.10,
  },
  redistributeWeights: true,
});
```

## References

### Scientific Basis
- HRV baseline methodology based on population studies
- Anomaly detection thresholds from recovery research
- Readiness scoring weights from training load literature

### Code Structure
- Follows existing patterns from sleep correlation implementation
- TypeScript strict typing throughout
- Functional programming patterns
- Comprehensive error handling
- JSDoc documentation

## Conclusion

This implementation provides a production-ready, statistically robust system for HRV trend analysis and readiness scoring. The modular architecture allows for easy extension and integration with other health metrics, while maintaining high code quality and test coverage.

All 52 tests pass, demonstrating correctness of statistical calculations, anomaly detection logic, and readiness scoring algorithms.

/**
 * HRV Tracking Types
 *
 * Type definitions for HRV data storage, analysis, and historical tracking.
 */

/**
 * Raw HRV measurement for a single day
 */
export interface HRVMeasurement {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** HRV value in milliseconds */
  value: number;
  /** Measurement quality (0-1) */
  quality?: number;
  /** Additional context */
  context?: {
    sleepScore?: number;
    trainingLoad?: number;
    restingHeartRate?: number;
    bodyBattery?: number;
  };
}

/**
 * HRV data point with calculated metrics
 */
export interface HRVDataPoint extends HRVMeasurement {
  /** Rolling 7-day average */
  weeklyAverage: number;
  /** Rolling 28-day average */
  monthlyAverage: number;
  /** Deviation from baseline (percentage) */
  baselineDeviation?: number;
  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number;
}

/**
 * Persistent HRV history storage
 */
export interface HRVHistory {
  /** Array of HRV measurements, sorted by date ascending */
  measurements: HRVMeasurement[];
  /** Last updated timestamp */
  lastUpdated: string;
  /** Data quality statistics */
  quality: {
    totalDays: number;
    daysWithQuality: number;
    averageQuality: number;
  };
  /** Metadata */
  metadata: {
    version: string;
    createdAt: string;
  };
}

/**
 * HRV trend analysis result
 */
export interface HRVTrendAnalysis {
  /** Current HRV value */
  current: number;
  /** 7-day trend */
  weeklyTrend: {
    average: number;
    change: number; // percentage change
    direction: 'increasing' | 'decreasing' | 'stable';
  };
  /** 28-day trend */
  monthlyTrend: {
    average: number;
    change: number;
    direction: 'increasing' | 'decreasing' | 'stable';
  };
  /** Historical data points */
  history: HRVDataPoint[];
}

/**
 * HRV baseline statistics
 */
export interface HRVBaseline {
  /** Baseline HRV value (median) */
  baseline: number;
  /** Interquartile range */
  iqr: number;
  /** 95% confidence interval */
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  /** Weekly pattern analysis */
  weeklyPattern: {
    dayOfWeek: number;
    average: number;
    stdDev: number;
  }[];
  /** Baseline evolution over time */
  evolution: {
    date: string;
    baseline: number;
  }[];
  /** Number of days used for baseline */
  daysAnalyzed: number;
  /** Date range */
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * HRV anomaly severity levels
 */
export type AnomalySeverity = 'minor' | 'moderate' | 'significant' | 'critical';

/**
 * HRV anomaly detection result
 */
export interface HRVAnomaly {
  /** Date of anomaly */
  date: string;
  /** HRV value */
  value: number;
  /** Expected baseline value */
  expectedValue: number;
  /** Deviation from baseline (percentage) */
  deviation: number;
  /** Severity classification */
  severity: AnomalySeverity;
  /** Consecutive days below baseline */
  consecutiveDaysLow: number;
  /** Rate of change (velocity) */
  velocity: {
    value: number; // ms/day
    classification: 'sudden' | 'gradual';
  };
  /** Potential correlations */
  correlations: {
    highTrainingLoad?: boolean;
    poorSleep?: boolean;
    elevatedRestingHR?: boolean;
  };
  /** Estimated recovery time (days) */
  estimatedRecoveryDays: number;
}

/**
 * Storage configuration
 */
export interface HRVStorageConfig {
  /** Storage file path */
  filePath: string;
  /** Maximum history retention (days) */
  maxRetentionDays: number;
  /** Minimum data quality threshold */
  minQuality: number;
}

/**
 * Type definitions for sleep quality correlation with performance analysis
 *
 * This module defines all types and constants used for analyzing the relationship
 * between sleep quality and athletic performance in Garmin Connect data.
 */

/**
 * Sleep metrics for a single night
 */
export interface SleepMetrics {
  /** Date of the sleep session (YYYY-MM-DD format) */
  date: string;
  /** Total sleep duration in minutes */
  totalSleepMinutes: number;
  /** Deep sleep duration in minutes */
  deepSleepMinutes: number;
  /** Light sleep duration in minutes */
  lightSleepMinutes: number;
  /** REM sleep duration in minutes */
  remSleepMinutes: number;
  /** Awake time during sleep in minutes */
  awakeMinutes: number;
  /** Sleep quality score (0-100) */
  sleepScore: number;
  /** Average heart rate during sleep (bpm) */
  avgHeartRate?: number;
  /** Heart rate variability during sleep (ms) */
  hrv?: number;
  /** Average respiration rate (breaths/min) */
  avgRespiration?: number;
  /** Number of times awakened */
  awakeningsCount?: number;
  /** Sleep start time (ISO 8601) */
  sleepStartTime?: string;
  /** Sleep end time (ISO 8601) */
  sleepEndTime?: string;
}

/**
 * Performance metrics for a single day
 */
export interface DailyPerformance {
  /** Date of the performance data (YYYY-MM-DD format) */
  date: string;
  /** Total activities completed */
  activitiesCount: number;
  /** Total training duration in minutes */
  totalDurationMinutes: number;
  /** Total distance covered in kilometers */
  totalDistanceKm: number;
  /** Average pace across activities (min/km) */
  avgPace?: number;
  /** Average heart rate across activities (bpm) */
  avgHeartRate?: number;
  /** Average power output in watts (if applicable) */
  avgPower?: number;
  /** Training Stress Score for the day */
  trainingStressScore?: number;
  /** Total elevation gain in meters */
  totalElevationGain?: number;
  /** Average perceived exertion (1-10 scale) */
  avgPerceivedExertion?: number;
  /** Body Battery at end of day (0-100) */
  endBodyBattery?: number;
  /** Average stress level (0-100) */
  avgStress?: number;
}

/**
 * Correlation between sleep and performance metrics
 */
export interface SleepPerformanceCorrelation {
  /** Correlation coefficient between sleep duration and performance (-1 to 1) */
  sleepDurationCorrelation: number;
  /** Correlation coefficient between sleep quality and performance (-1 to 1) */
  sleepQualityCorrelation: number;
  /** Correlation coefficient between deep sleep and performance (-1 to 1) */
  deepSleepCorrelation: number;
  /** Correlation coefficient between REM sleep and performance (-1 to 1) */
  remSleepCorrelation: number;
  /** Statistical significance (p-value) */
  pValue: number;
  /** Number of data points used in correlation */
  sampleSize: number;
  /** Confidence level (e.g., 0.95 for 95% confidence) */
  confidenceLevel: number;
  /** Whether the correlation is statistically significant */
  isSignificant: boolean;
}

/**
 * Optimal sleep pattern for best performance
 */
export interface OptimalSleepPattern {
  /** Recommended total sleep duration in minutes */
  optimalDurationMinutes: number;
  /** Recommended deep sleep percentage */
  optimalDeepSleepPercent: number;
  /** Recommended REM sleep percentage */
  optimalRemSleepPercent: number;
  /** Recommended sleep quality score threshold */
  optimalSleepScore: number;
  /** Days with performance above threshold */
  daysAboveThreshold: number;
  /** Days with performance below threshold */
  daysBelowThreshold: number;
  /** Average performance on optimal sleep days */
  avgPerformanceOptimal: number;
  /** Average performance on sub-optimal sleep days */
  avgPerformanceSubOptimal: number;
  /** Performance improvement percentage with optimal sleep */
  performanceImprovement: number;
}

/**
 * Sleep debt tracking and cumulative effects
 */
export interface SleepDebt {
  /** Current accumulated sleep debt in minutes */
  currentDebtMinutes: number;
  /** Date sleep debt was last calculated */
  calculatedDate: string;
  /** Maximum debt reached in period (minutes) */
  maxDebtMinutes: number;
  /** Date of maximum debt */
  maxDebtDate: string;
  /** Average debt over period (minutes) */
  avgDebtMinutes: number;
  /** Days with sleep debt > 60 minutes */
  daysWithDebt: number;
  /** Estimated recovery time needed (nights) */
  estimatedRecoveryNights: number;
  /** Correlation between debt and performance */
  debtPerformanceCorrelation: number;
  /** Whether sleep debt is affecting performance */
  isAffectingPerformance: boolean;
}

/**
 * Impact of poor sleep on specific performance metrics
 */
export interface PoorSleepImpact {
  /** Date of poor sleep */
  date: string;
  /** Sleep metrics for the poor sleep night */
  sleepMetrics: SleepMetrics;
  /** Performance metrics for the following day */
  performanceMetrics: DailyPerformance;
  /** Percentage decrease in performance vs baseline */
  performanceDecreasePercent: number;
  /** Specific metrics affected */
  affectedMetrics: string[];
  /** Severity of impact (low, moderate, high) */
  severity: 'low' | 'moderate' | 'high';
  /** Recovery time observed (days) */
  recoveryDays?: number;
}

/**
 * Sleep trend over time period
 */
export interface SleepTrend {
  /** Period being analyzed */
  period: string;
  /** Average sleep duration in minutes */
  avgDurationMinutes: number;
  /** Trend direction (improving, declining, stable) */
  trendDirection: 'improving' | 'declining' | 'stable';
  /** Rate of change (minutes per week) */
  changeRate: number;
  /** Average sleep quality score */
  avgSleepScore: number;
  /** Sleep consistency score (0-100) */
  consistencyScore: number;
  /** Days with insufficient sleep */
  insufficientSleepDays: number;
  /** Percentage of nights meeting recommendations */
  meetsRecommendationPercent: number;
}

/**
 * Recovery quality assessment based on sleep
 */
export interface RecoveryQuality {
  /** Date of assessment */
  date: string;
  /** Overall recovery score (0-100) */
  recoveryScore: number;
  /** Sleep contribution to recovery (0-100) */
  sleepContribution: number;
  /** HRV contribution to recovery (0-100) */
  hrvContribution?: number;
  /** Resting heart rate contribution (0-100) */
  restingHrContribution?: number;
  /** Recovery status (optimal, adequate, poor) */
  status: 'optimal' | 'adequate' | 'poor';
  /** Recommended training intensity for the day */
  recommendedIntensity: 'high' | 'moderate' | 'low' | 'rest';
  /** Readiness to train score (0-100) */
  readinessScore: number;
}

/**
 * Complete sleep-performance analysis results
 */
export interface SleepPerformanceAnalysis {
  /** Date range analyzed */
  dateRange: {
    start: string;
    end: string;
  };
  /** Overall correlations */
  correlations: SleepPerformanceCorrelation;
  /** Identified optimal sleep patterns */
  optimalPattern: OptimalSleepPattern;
  /** Current sleep debt status */
  sleepDebt: SleepDebt;
  /** Recent poor sleep impacts */
  poorSleepImpacts: PoorSleepImpact[];
  /** Sleep trends over period */
  sleepTrends: SleepTrend;
  /** Recent recovery quality assessments */
  recoveryQuality: RecoveryQuality[];
  /** Generated insights */
  insights: string[];
  /** Actionable recommendations */
  recommendations: string[];
  /** Data quality metrics */
  dataQuality: {
    totalDays: number;
    daysWithSleepData: number;
    daysWithPerformanceData: number;
    daysWithBothDatasets: number;
    dataCompletenessPercent: number;
  };
}

/**
 * Sleep quality thresholds for classification
 */
export const SLEEP_QUALITY_THRESHOLDS = {
  /** Minimum sleep duration for optimal performance (minutes) */
  OPTIMAL_DURATION_MIN: 420, // 7 hours
  /** Maximum sleep duration before diminishing returns (minutes) */
  OPTIMAL_DURATION_MAX: 540, // 9 hours
  /** Minimum deep sleep percentage for quality sleep */
  MIN_DEEP_SLEEP_PERCENT: 15,
  /** Optimal deep sleep percentage */
  OPTIMAL_DEEP_SLEEP_PERCENT: 20,
  /** Minimum REM sleep percentage for quality sleep */
  MIN_REM_SLEEP_PERCENT: 20,
  /** Optimal REM sleep percentage */
  OPTIMAL_REM_SLEEP_PERCENT: 25,
  /** Minimum sleep score for good quality */
  GOOD_SLEEP_SCORE: 70,
  /** Minimum sleep score for excellent quality */
  EXCELLENT_SLEEP_SCORE: 85,
  /** Maximum awakenings for quality sleep */
  MAX_AWAKENINGS: 2,
  /** Maximum awake time during sleep (minutes) */
  MAX_AWAKE_MINUTES: 30,
  /** Sleep debt threshold (minutes) */
  SLEEP_DEBT_THRESHOLD: 60,
  /** Critical sleep debt level (minutes) */
  CRITICAL_SLEEP_DEBT: 180, // 3 hours
} as const;

/**
 * Performance impact thresholds
 */
export const PERFORMANCE_IMPACT = {
  /** Minimum correlation coefficient for significance */
  SIGNIFICANCE_THRESHOLD: 0.3,
  /** P-value threshold for statistical significance */
  P_VALUE_THRESHOLD: 0.05,
  /** Minimum performance decrease to flag (percent) */
  MIN_PERFORMANCE_DECREASE: 5,
  /** Moderate performance decrease threshold (percent) */
  MODERATE_PERFORMANCE_DECREASE: 10,
  /** Severe performance decrease threshold (percent) */
  SEVERE_PERFORMANCE_DECREASE: 20,
  /** Minimum sample size for reliable correlation */
  MIN_SAMPLE_SIZE: 14, // 2 weeks
  /** Optimal sample size for analysis */
  OPTIMAL_SAMPLE_SIZE: 30,
} as const;

/**
 * Sleep stage percentages for classification
 */
export const SLEEP_STAGE_PERCENTAGES = {
  /** Typical deep sleep percentage range */
  DEEP_SLEEP_RANGE: { min: 15, max: 25 },
  /** Typical light sleep percentage range */
  LIGHT_SLEEP_RANGE: { min: 40, max: 60 },
  /** Typical REM sleep percentage range */
  REM_SLEEP_RANGE: { min: 20, max: 30 },
} as const;

/**
 * Recovery time estimates based on sleep debt
 */
export const RECOVERY_ESTIMATES = {
  /** Recovery rate (minutes of debt recovered per good night) */
  RECOVERY_RATE_PER_NIGHT: 90, // Can recover ~1.5 hours per good night
  /** Maximum recovery per night (minutes) */
  MAX_RECOVERY_PER_NIGHT: 120,
  /** Minimum good sleep quality score for recovery */
  MIN_RECOVERY_SLEEP_SCORE: 75,
} as const;

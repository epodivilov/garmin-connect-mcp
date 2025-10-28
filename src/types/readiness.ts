/**
 * Readiness Scoring Types
 *
 * Type definitions for comprehensive readiness assessment combining
 * HRV, sleep, training stress, and other health metrics.
 */

/**
 * Individual metric contribution to readiness score
 */
export interface MetricContribution {
  /** Metric name */
  name: string;
  /** Raw value */
  value: number | undefined;
  /** Normalized score (0-100) */
  score: number;
  /** Weight in overall calculation */
  weight: number;
  /** Weighted contribution to total score */
  weightedScore: number;
  /** Status classification */
  status: 'optimal' | 'good' | 'fair' | 'poor';
}

/**
 * Readiness score breakdown
 */
export interface ReadinessScore {
  /** Overall readiness score (0-100) */
  overall: number;
  /** Date of assessment */
  date: string;
  /** Individual metric contributions */
  metrics: {
    hrv: MetricContribution;
    sleep: MetricContribution;
    trainingStressBalance: MetricContribution;
    restingHeartRate: MetricContribution;
    bodyBattery: MetricContribution;
  };
  /** Training recommendation */
  recommendation: TrainingRecommendation;
  /** Factors affecting readiness */
  factors: ReadinessFactor[];
}

/**
 * Training recommendation based on readiness
 */
export interface TrainingRecommendation {
  /** Recommendation level */
  level: 'rest' | 'light' | 'moderate' | 'normal' | 'high';
  /** Intensity guidance (0-100) */
  intensityGuidance: number;
  /** Volume guidance (percentage of normal) */
  volumeGuidance: number;
  /** Recommendation text */
  message: string;
  /** Specific activities to avoid */
  avoid?: string[];
  /** Suggested activities */
  suggested?: string[];
}

/**
 * Factor affecting readiness
 */
export interface ReadinessFactor {
  /** Factor type */
  type: 'positive' | 'negative' | 'neutral';
  /** Factor description */
  description: string;
  /** Impact magnitude (0-1) */
  impact: number;
}

/**
 * Input data for readiness calculation
 */
export interface ReadinessInput {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** HRV value (ms) */
  hrv?: number;
  /** HRV baseline (ms) */
  hrvBaseline?: number;
  /** Sleep score (0-100) */
  sleepScore?: number;
  /** Training Stress Balance */
  tsb?: number;
  /** Resting heart rate (bpm) */
  restingHeartRate?: number;
  /** Baseline resting heart rate (bpm) */
  restingHeartRateBaseline?: number;
  /** Body Battery level (0-100) */
  bodyBattery?: number;
}

/**
 * Readiness configuration
 */
export interface ReadinessConfig {
  /** Metric weights (must sum to 1.0) */
  weights: {
    hrv: number;
    sleep: number;
    trainingStressBalance: number;
    restingHeartRate: number;
    bodyBattery: number;
  };
  /** Enable weight redistribution for missing metrics */
  redistributeWeights: boolean;
}

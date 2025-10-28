/**
 * Service for assessing recovery quality based on sleep
 *
 * This service handles:
 * - Calculating recovery scores from sleep metrics
 * - Assessing readiness to train
 * - Recommending training intensity
 * - Integrating HRV and resting heart rate data
 */

import type { SleepMetrics, RecoveryQuality } from '../types/sleep-correlation.js';
import { SLEEP_QUALITY_THRESHOLDS } from '../types/sleep-correlation.js';
import { calculateSleepStagePercentages } from './sleepDataService.js';
import type { HRVBaseline } from '../types/hrv-tracking.js';

/**
 * Assess recovery quality for a date
 *
 * @param sleep - Sleep metrics for the previous night
 * @param restingHR - Optional resting heart rate
 * @param hrvBaseline - Optional HRV baseline for baseline-aware scoring
 * @param hrvAnomalies - Optional HRV anomalies for additional warnings
 * @returns Recovery quality assessment
 */
export function assessRecoveryQuality(
  sleep: SleepMetrics,
  restingHR?: number,
  hrvBaseline?: HRVBaseline
): RecoveryQuality {
  // Calculate sleep contribution (0-100)
  const sleepContribution = calculateSleepContribution(sleep);

  // Calculate HRV contribution if available
  const hrvContribution = sleep.hrv
    ? calculateHRVContribution(sleep.hrv, hrvBaseline)
    : undefined;

  // Calculate resting HR contribution if available
  const restingHrContribution = restingHR ? calculateRestingHRContribution(restingHR) : undefined;

  // Calculate overall recovery score
  let recoveryScore = sleepContribution;

  if (hrvContribution !== undefined) {
    recoveryScore = recoveryScore * 0.6 + hrvContribution * 0.4;
  }

  if (restingHrContribution !== undefined && hrvContribution === undefined) {
    recoveryScore = recoveryScore * 0.7 + restingHrContribution * 0.3;
  }

  // Determine recovery status
  const status = determineRecoveryStatus(recoveryScore);

  // Recommend training intensity
  const recommendedIntensity = recommendTrainingIntensity(recoveryScore, status);

  // Calculate readiness score
  const readinessScore = calculateReadinessScore(recoveryScore, sleep);

  return {
    date: sleep.date,
    recoveryScore: Math.round(recoveryScore),
    sleepContribution: Math.round(sleepContribution),
    hrvContribution: hrvContribution ? Math.round(hrvContribution) : undefined,
    restingHrContribution: restingHrContribution ? Math.round(restingHrContribution) : undefined,
    status,
    recommendedIntensity,
    readinessScore: Math.round(readinessScore),
  };
}

/**
 * Calculate sleep's contribution to recovery (0-100)
 */
function calculateSleepContribution(sleep: SleepMetrics): number {
  let score = 0;

  // Duration component (30 points)
  const durationScore = calculateDurationScore(sleep.totalSleepMinutes);
  score += durationScore * 0.3;

  // Sleep quality component (30 points)
  score += (sleep.sleepScore / 100) * 30;

  // Deep sleep component (20 points)
  const percentages = calculateSleepStagePercentages(sleep);
  const deepSleepScore = Math.min(100, (percentages.deepPercent / SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DEEP_SLEEP_PERCENT) * 100);
  score += (deepSleepScore / 100) * 20;

  // REM sleep component (15 points)
  const remSleepScore = Math.min(100, (percentages.remPercent / SLEEP_QUALITY_THRESHOLDS.OPTIMAL_REM_SLEEP_PERCENT) * 100);
  score += (remSleepScore / 100) * 15;

  // Awake time penalty (up to -15 points)
  if (sleep.awakeMinutes > SLEEP_QUALITY_THRESHOLDS.MAX_AWAKE_MINUTES) {
    const penalty = Math.min(15, (sleep.awakeMinutes - SLEEP_QUALITY_THRESHOLDS.MAX_AWAKE_MINUTES) / 4);
    score -= penalty;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate duration score (0-100)
 */
function calculateDurationScore(durationMinutes: number): number {
  if (durationMinutes >= SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN &&
      durationMinutes <= SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MAX) {
    return 100;
  }

  if (durationMinutes < SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN) {
    // Linear decrease below optimal
    return (durationMinutes / SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN) * 100;
  }

  // Slight decrease above optimal
  const excess = durationMinutes - SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MAX;
  return Math.max(70, 100 - excess / 6);
}

/**
 * Calculate HRV contribution (0-100)
 * Higher HRV generally indicates better recovery
 *
 * @param hrv - Current HRV value
 * @param baseline - Optional HRV baseline for individualized scoring
 * @returns HRV contribution score (0-100)
 */
function calculateHRVContribution(hrv: number, baseline?: HRVBaseline): number {
  // If baseline is available, use baseline-aware scoring
  if (baseline) {
    const deviation = ((hrv - baseline.baseline) / baseline.baseline) * 100;

    // Score based on deviation from personal baseline
    // +20% or more = 100
    // +10% = 90
    // 0% = 80
    // -10% = 60
    // -20% = 40
    // -30% or less = 20
    const score = 80 + deviation * 2;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  // Fallback to population-based scoring (backward compatible)
  // Typical HRV ranges: 20-100ms
  // This is a simplified scoring, actual optimal HRV is individual
  if (hrv >= 60) return 100;
  if (hrv >= 50) return 85;
  if (hrv >= 40) return 70;
  if (hrv >= 30) return 55;
  return 40;
}

/**
 * Calculate resting HR contribution (0-100)
 * Lower resting HR typically indicates better recovery
 */
function calculateRestingHRContribution(restingHR: number): number {
  // Typical athlete ranges: 40-80 bpm
  // Lower is better for recovery
  if (restingHR <= 50) return 100;
  if (restingHR <= 55) return 90;
  if (restingHR <= 60) return 80;
  if (restingHR <= 65) return 70;
  if (restingHR <= 70) return 60;
  return 50;
}

/**
 * Determine recovery status from score
 */
function determineRecoveryStatus(score: number): 'optimal' | 'adequate' | 'poor' {
  if (score >= 75) return 'optimal';
  if (score >= 55) return 'adequate';
  return 'poor';
}

/**
 * Recommend training intensity based on recovery
 */
function recommendTrainingIntensity(
  score: number,
  status: 'optimal' | 'adequate' | 'poor'
): 'high' | 'moderate' | 'low' | 'rest' {
  if (status === 'optimal' && score >= 85) return 'high';
  if (status === 'optimal') return 'moderate';
  if (status === 'adequate' && score >= 65) return 'moderate';
  if (status === 'adequate') return 'low';
  if (score >= 45) return 'low';
  return 'rest';
}

/**
 * Calculate readiness to train score
 */
function calculateReadinessScore(recoveryScore: number, sleep: SleepMetrics): number {
  let readiness = recoveryScore;

  // Adjust based on recent sleep patterns
  if (sleep.totalSleepMinutes < 360) {
    readiness -= 15; // Significant penalty for < 6 hours
  }

  if (sleep.sleepScore < 60) {
    readiness -= 10;
  }

  return Math.max(0, Math.min(100, readiness));
}

/**
 * Assess recovery quality for multiple days
 */
export function assessMultipleDaysRecovery(
  sleepData: SleepMetrics[]
): RecoveryQuality[] {
  return sleepData.map(sleep => assessRecoveryQuality(sleep));
}

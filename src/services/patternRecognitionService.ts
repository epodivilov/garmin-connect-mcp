/**
 * Service for identifying optimal sleep patterns for performance
 *
 * This service handles:
 * - Identifying sleep patterns that correlate with best performance
 * - Calculating performance thresholds
 * - Analyzing optimal sleep duration and quality parameters
 */

import type { SleepMetrics, DailyPerformance, OptimalSleepPattern } from '../types/sleep-correlation.js';
import { SLEEP_QUALITY_THRESHOLDS } from '../types/sleep-correlation.js';
import { calculateSleepStagePercentages } from './sleepDataService.js';
import { calculatePerformanceScore } from './performanceDataService.js';

/**
 * Identify optimal sleep pattern for best performance
 *
 * @param sleepData - Array of sleep metrics
 * @param performanceData - Array of performance metrics
 * @returns Optimal sleep pattern analysis
 */
export function identifyOptimalSleepPattern(
  sleepData: SleepMetrics[],
  performanceData: DailyPerformance[]
): OptimalSleepPattern {
  // Pair sleep and performance data
  const paired = pairSleepPerformance(sleepData, performanceData);

  if (paired.length === 0) {
    return createDefaultOptimalPattern();
  }

  // Calculate performance scores
  const performanceScores = paired.map(p => ({
    ...p,
    perfScore: calculatePerformanceScore(p.performance),
  }));

  // Determine performance threshold (75th percentile)
  const scores = performanceScores.map(p => p.perfScore).sort((a, b) => a - b);
  const threshold = scores[Math.floor(scores.length * 0.75)];

  // Split into above and below threshold groups
  const aboveThreshold = performanceScores.filter(p => p.perfScore >= threshold);
  const belowThreshold = performanceScores.filter(p => p.perfScore < threshold);

  // Calculate optimal sleep parameters from above threshold group
  const optimalDuration = calculateMedian(aboveThreshold.map(p => p.sleep.totalSleepMinutes));
  const optimalDeepPercent = calculateMedian(
    aboveThreshold.map(p => {
      const percentages = calculateSleepStagePercentages(p.sleep);
      return percentages.deepPercent;
    })
  );
  const optimalRemPercent = calculateMedian(
    aboveThreshold.map(p => {
      const percentages = calculateSleepStagePercentages(p.sleep);
      return percentages.remPercent;
    })
  );
  const optimalSleepScore = calculateMedian(aboveThreshold.map(p => p.sleep.sleepScore));

  // Calculate average performance for each group
  const avgPerfOptimal = aboveThreshold.reduce((sum, p) => sum + p.perfScore, 0) / aboveThreshold.length;
  const avgPerfSubOptimal = belowThreshold.length > 0
    ? belowThreshold.reduce((sum, p) => sum + p.perfScore, 0) / belowThreshold.length
    : 0;

  // Calculate performance improvement percentage
  const performanceImprovement = avgPerfSubOptimal > 0
    ? ((avgPerfOptimal - avgPerfSubOptimal) / avgPerfSubOptimal) * 100
    : 0;

  return {
    optimalDurationMinutes: Math.round(optimalDuration),
    optimalDeepSleepPercent: Math.round(optimalDeepPercent * 10) / 10,
    optimalRemSleepPercent: Math.round(optimalRemPercent * 10) / 10,
    optimalSleepScore: Math.round(optimalSleepScore),
    daysAboveThreshold: aboveThreshold.length,
    daysBelowThreshold: belowThreshold.length,
    avgPerformanceOptimal: Math.round(avgPerfOptimal * 10) / 10,
    avgPerformanceSubOptimal: Math.round(avgPerfSubOptimal * 10) / 10,
    performanceImprovement: Math.round(performanceImprovement * 10) / 10,
  };
}

/**
 * Pair sleep with next day's performance
 *
 * @param sleepData - Sleep metrics
 * @param performanceData - Performance metrics
 * @returns Paired data
 */
function pairSleepPerformance(
  sleepData: SleepMetrics[],
  performanceData: DailyPerformance[]
): Array<{ sleep: SleepMetrics; performance: DailyPerformance }> {
  const paired: Array<{ sleep: SleepMetrics; performance: DailyPerformance }> = [];
  const sleepMap = new Map(sleepData.map(s => [s.date, s]));

  for (const perf of performanceData) {
    const perfDate = new Date(perf.date);
    const previousNight = new Date(perfDate);
    previousNight.setDate(previousNight.getDate() - 1);
    const previousNightStr = previousNight.toISOString().split('T')[0];

    const sleep = sleepMap.get(previousNightStr);
    if (sleep) {
      paired.push({ sleep, performance: perf });
    }
  }

  return paired;
}

/**
 * Calculate median of number array
 *
 * @param values - Array of numbers
 * @returns Median value
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Create default optimal pattern when no data available
 *
 * @returns Default optimal pattern
 */
function createDefaultOptimalPattern(): OptimalSleepPattern {
  return {
    optimalDurationMinutes: SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN,
    optimalDeepSleepPercent: SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DEEP_SLEEP_PERCENT,
    optimalRemSleepPercent: SLEEP_QUALITY_THRESHOLDS.OPTIMAL_REM_SLEEP_PERCENT,
    optimalSleepScore: SLEEP_QUALITY_THRESHOLDS.GOOD_SLEEP_SCORE,
    daysAboveThreshold: 0,
    daysBelowThreshold: 0,
    avgPerformanceOptimal: 0,
    avgPerformanceSubOptimal: 0,
    performanceImprovement: 0,
  };
}

/**
 * Check if sleep metrics meet optimal pattern
 *
 * @param sleep - Sleep metrics
 * @param optimalPattern - Optimal pattern to compare against
 * @returns True if sleep meets optimal criteria
 */
export function meetsOptimalPattern(
  sleep: SleepMetrics,
  optimalPattern: OptimalSleepPattern
): boolean {
  const percentages = calculateSleepStagePercentages(sleep);

  // Check duration (within 10% tolerance)
  const durationOk = Math.abs(sleep.totalSleepMinutes - optimalPattern.optimalDurationMinutes) <=
    optimalPattern.optimalDurationMinutes * 0.1;

  // Check deep sleep (within 3% tolerance)
  const deepSleepOk = Math.abs(percentages.deepPercent - optimalPattern.optimalDeepSleepPercent) <= 3;

  // Check REM sleep (within 3% tolerance)
  const remSleepOk = Math.abs(percentages.remPercent - optimalPattern.optimalRemSleepPercent) <= 3;

  // Check sleep score (within 10 points tolerance)
  const sleepScoreOk = Math.abs(sleep.sleepScore - optimalPattern.optimalSleepScore) <= 10;

  // Must meet at least 3 out of 4 criteria
  const criteriasMet = [durationOk, deepSleepOk, remSleepOk, sleepScoreOk].filter(Boolean).length;

  return criteriasMet >= 3;
}

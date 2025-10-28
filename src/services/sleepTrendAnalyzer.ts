/**
 * Service for analyzing sleep trends over time
 *
 * This service handles:
 * - Tracking sleep patterns and trends
 * - Calculating consistency scores
 * - Identifying trend directions
 * - Analyzing adherence to recommendations
 */

import type { SleepMetrics, SleepTrend } from '../types/sleep-correlation.js';
import { SLEEP_QUALITY_THRESHOLDS } from '../types/sleep-correlation.js';
import { calculateAverageSleepMetrics } from './sleepDataService.js';

/**
 * Analyze sleep trends over a period
 *
 * @param sleepData - Array of sleep metrics
 * @param periodLabel - Label for the period (e.g., "Last 30 days")
 * @returns Sleep trend analysis
 */
export function analyzeSleepTrends(
  sleepData: SleepMetrics[],
  periodLabel: string = 'Analysis period'
): SleepTrend {
  if (sleepData.length === 0) {
    return createEmptyTrend(periodLabel);
  }

  // Sort by date
  const sorted = [...sleepData].sort((a, b) => a.date.localeCompare(b.date));

  // Calculate averages
  const averages = calculateAverageSleepMetrics(sorted);

  // Determine trend direction
  const trendDirection = determineTrendDirection(sorted);

  // Calculate rate of change (minutes per week)
  const changeRate = calculateChangeRate(sorted);

  // Calculate consistency score
  const consistencyScore = calculateConsistencyScore(sorted);

  // Count insufficient sleep days
  const insufficientSleepDays = sorted.filter(
    sleep => sleep.totalSleepMinutes < SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN
  ).length;

  // Calculate percentage meeting recommendations
  const meetsRecommendation = sorted.filter(
    sleep => meetsSleepRecommendations(sleep)
  ).length;
  const meetsRecommendationPercent = (meetsRecommendation / sorted.length) * 100;

  return {
    period: periodLabel,
    avgDurationMinutes: Math.round(averages.avgDuration),
    trendDirection,
    changeRate: Math.round(changeRate * 10) / 10,
    avgSleepScore: Math.round(averages.avgSleepScore),
    consistencyScore: Math.round(consistencyScore),
    insufficientSleepDays,
    meetsRecommendationPercent: Math.round(meetsRecommendationPercent * 10) / 10,
  };
}

/**
 * Determine overall trend direction
 */
function determineTrendDirection(
  sleepData: SleepMetrics[]
): 'improving' | 'declining' | 'stable' {
  if (sleepData.length < 7) {
    return 'stable';
  }

  // Split into first half and second half
  const midpoint = Math.floor(sleepData.length / 2);
  const firstHalf = sleepData.slice(0, midpoint);
  const secondHalf = sleepData.slice(midpoint);

  // Calculate average durations
  const firstAvg = firstHalf.reduce((sum, s) => sum + s.totalSleepMinutes, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, s) => sum + s.totalSleepMinutes, 0) / secondHalf.length;

  // Calculate average scores
  const firstScore = firstHalf.reduce((sum, s) => sum + s.sleepScore, 0) / firstHalf.length;
  const secondScore = secondHalf.reduce((sum, s) => sum + s.sleepScore, 0) / secondHalf.length;

  const durationChange = secondAvg - firstAvg;
  const scoreChange = secondScore - firstScore;

  // Significant change threshold: 30 minutes or 5 score points
  if (durationChange > 30 || scoreChange > 5) {
    return 'improving';
  }
  if (durationChange < -30 || scoreChange < -5) {
    return 'declining';
  }

  return 'stable';
}

/**
 * Calculate rate of change in minutes per week
 */
function calculateChangeRate(sleepData: SleepMetrics[]): number {
  if (sleepData.length < 7) {
    return 0;
  }

  // Use linear regression to calculate trend
  const points = sleepData.map((sleep, index) => ({
    x: index,
    y: sleep.totalSleepMinutes,
  }));

  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

  // Slope of regression line
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Convert from per-day to per-week
  return slope * 7;
}

/**
 * Calculate consistency score (0-100)
 * Higher score means more consistent sleep patterns
 */
function calculateConsistencyScore(sleepData: SleepMetrics[]): number {
  if (sleepData.length < 3) {
    return 50; // Neutral score for insufficient data
  }

  // Calculate standard deviation of sleep durations
  const durations = sleepData.map(s => s.totalSleepMinutes);
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation
  const cv = (stdDev / mean) * 100;

  // Convert to consistency score (lower CV = higher consistency)
  // CV < 10% = excellent (90-100)
  // CV 10-20% = good (70-90)
  // CV 20-30% = fair (50-70)
  // CV > 30% = poor (0-50)

  if (cv < 10) {
    return 90 + (10 - cv);
  } else if (cv < 20) {
    return 70 + (20 - cv);
  } else if (cv < 30) {
    return 50 + (30 - cv) * 2;
  } else {
    return Math.max(0, 50 - (cv - 30));
  }
}

/**
 * Check if sleep meets recommendations
 */
function meetsSleepRecommendations(sleep: SleepMetrics): boolean {
  // Must meet these criteria:
  // - Duration: 7-9 hours
  // - Sleep score: >= 70
  // - Awake time: <= 30 minutes

  const durationOk = sleep.totalSleepMinutes >= SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN &&
    sleep.totalSleepMinutes <= SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MAX;

  const scoreOk = sleep.sleepScore >= SLEEP_QUALITY_THRESHOLDS.GOOD_SLEEP_SCORE;

  const awakeOk = sleep.awakeMinutes <= SLEEP_QUALITY_THRESHOLDS.MAX_AWAKE_MINUTES;

  return durationOk && scoreOk && awakeOk;
}

/**
 * Create empty trend for no data
 */
function createEmptyTrend(period: string): SleepTrend {
  return {
    period,
    avgDurationMinutes: 0,
    trendDirection: 'stable',
    changeRate: 0,
    avgSleepScore: 0,
    consistencyScore: 0,
    insufficientSleepDays: 0,
    meetsRecommendationPercent: 0,
  };
}

/**
 * Compare trends between two periods
 */
export function compareTrends(
  currentTrend: SleepTrend,
  previousTrend: SleepTrend
): {
  durationChange: number;
  scoreChange: number;
  consistencyChange: number;
  improvementAreas: string[];
  declineAreas: string[];
} {
  const durationChange = currentTrend.avgDurationMinutes - previousTrend.avgDurationMinutes;
  const scoreChange = currentTrend.avgSleepScore - previousTrend.avgSleepScore;
  const consistencyChange = currentTrend.consistencyScore - previousTrend.consistencyScore;

  const improvementAreas: string[] = [];
  const declineAreas: string[] = [];

  if (durationChange > 15) improvementAreas.push('sleep duration');
  else if (durationChange < -15) declineAreas.push('sleep duration');

  if (scoreChange > 5) improvementAreas.push('sleep quality');
  else if (scoreChange < -5) declineAreas.push('sleep quality');

  if (consistencyChange > 10) improvementAreas.push('consistency');
  else if (consistencyChange < -10) declineAreas.push('consistency');

  if (currentTrend.meetsRecommendationPercent > previousTrend.meetsRecommendationPercent + 10) {
    improvementAreas.push('adherence to recommendations');
  } else if (currentTrend.meetsRecommendationPercent < previousTrend.meetsRecommendationPercent - 10) {
    declineAreas.push('adherence to recommendations');
  }

  return {
    durationChange: Math.round(durationChange),
    scoreChange: Math.round(scoreChange),
    consistencyChange: Math.round(consistencyChange),
    improvementAreas,
    declineAreas,
  };
}

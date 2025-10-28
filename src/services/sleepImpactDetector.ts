/**
 * Service for detecting impacts of poor sleep on performance
 *
 * This service handles:
 * - Identifying poor sleep nights
 * - Detecting performance decreases following poor sleep
 * - Categorizing impact severity
 * - Tracking recovery time
 */

import type { SleepMetrics, DailyPerformance, PoorSleepImpact } from '../types/sleep-correlation.js';
import { PERFORMANCE_IMPACT } from '../types/sleep-correlation.js';
import { calculatePerformanceScore, calculateAveragePerformance } from './performanceDataService.js';

/**
 * Detect poor sleep impacts on performance
 *
 * @param sleepData - Array of sleep metrics
 * @param performanceData - Array of performance metrics
 * @param maxImpacts - Maximum number of impacts to return (default: 10)
 * @returns Array of poor sleep impacts
 */
export function detectPoorSleepImpacts(
  sleepData: SleepMetrics[],
  performanceData: DailyPerformance[],
  maxImpacts: number = 10
): PoorSleepImpact[] {
  // Calculate baseline performance
  const baseline = calculateAveragePerformance(performanceData);
  const baselineScore = calculatePerformanceScore({
    date: '',
    activitiesCount: baseline.avgActivities,
    totalDurationMinutes: baseline.avgDuration,
    totalDistanceKm: baseline.avgDistance,
    avgPace: baseline.avgPace,
    avgHeartRate: baseline.avgHeartRate,
    avgPower: baseline.avgPower,
    trainingStressScore: baseline.avgTSS,
  });

  // Identify poor sleep nights
  const poorSleepNights = sleepData.filter(sleep => isPoorSleep(sleep));

  const impacts: PoorSleepImpact[] = [];

  for (const sleep of poorSleepNights) {
    // Find next day's performance
    const sleepDate = new Date(sleep.date);
    const nextDay = new Date(sleepDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    const performance = performanceData.find(p => p.date === nextDayStr);

    if (performance) {
      const perfScore = calculatePerformanceScore(performance);
      const decreasePercent = ((baselineScore - perfScore) / baselineScore) * 100;

      // Only include if there's a meaningful decrease
      if (decreasePercent >= PERFORMANCE_IMPACT.MIN_PERFORMANCE_DECREASE) {
        const affectedMetrics = identifyAffectedMetrics(performance, baseline);
        const severity = categorizeSeverity(decreasePercent);

        // Try to determine recovery time
        const recoveryDays = estimateRecoveryTime(sleep.date, sleepData, performanceData, baselineScore);

        impacts.push({
          date: sleep.date,
          sleepMetrics: sleep,
          performanceMetrics: performance,
          performanceDecreasePercent: Math.round(decreasePercent * 10) / 10,
          affectedMetrics,
          severity,
          recoveryDays,
        });
      }
    }
  }

  // Sort by impact severity and date
  impacts.sort((a, b) => {
    const severityOrder = { high: 0, moderate: 1, low: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.date.localeCompare(a.date);
  });

  return impacts.slice(0, maxImpacts);
}

/**
 * Determine if sleep qualifies as poor
 *
 * @param sleep - Sleep metrics
 * @returns True if sleep is poor quality
 */
function isPoorSleep(sleep: SleepMetrics): boolean {
  // Poor if any of these conditions met:
  // - Sleep duration < 6 hours
  // - Sleep score < 60
  // - Deep sleep < 10%
  // - Awake time > 60 minutes

  if (sleep.totalSleepMinutes < 360) return true;
  if (sleep.sleepScore < 60) return true;
  if (sleep.awakeMinutes > 60) return true;

  const deepPercent = (sleep.deepSleepMinutes / sleep.totalSleepMinutes) * 100;
  if (deepPercent < 10) return true;

  return false;
}

/**
 * Identify which performance metrics were affected
 *
 * @param performance - Performance metrics
 * @param baseline - Baseline performance
 * @returns Array of affected metric names
 */
function identifyAffectedMetrics(
  performance: DailyPerformance,
  baseline: ReturnType<typeof calculateAveragePerformance>
): string[] {
  const affected: string[] = [];

  // Check each metric for significant decrease (>10%)
  if (performance.totalDurationMinutes < baseline.avgDuration * 0.9) {
    affected.push('duration');
  }

  if (performance.totalDistanceKm < baseline.avgDistance * 0.9) {
    affected.push('distance');
  }

  if (baseline.avgPace && performance.avgPace && performance.avgPace > baseline.avgPace * 1.1) {
    affected.push('pace');
  }

  if (baseline.avgPower && performance.avgPower && performance.avgPower < baseline.avgPower * 0.9) {
    affected.push('power');
  }

  if (baseline.avgTSS && performance.trainingStressScore &&
      performance.trainingStressScore < baseline.avgTSS * 0.9) {
    affected.push('training_stress');
  }

  if (performance.endBodyBattery && performance.endBodyBattery < 40) {
    affected.push('body_battery');
  }

  return affected;
}

/**
 * Categorize impact severity
 *
 * @param decreasePercent - Performance decrease percentage
 * @returns Severity category
 */
function categorizeSeverity(decreasePercent: number): 'low' | 'moderate' | 'high' {
  if (decreasePercent >= PERFORMANCE_IMPACT.SEVERE_PERFORMANCE_DECREASE) {
    return 'high';
  }
  if (decreasePercent >= PERFORMANCE_IMPACT.MODERATE_PERFORMANCE_DECREASE) {
    return 'moderate';
  }
  return 'low';
}

/**
 * Estimate recovery time after poor sleep
 *
 * @param poorSleepDate - Date of poor sleep
 * @param sleepData - All sleep data
 * @param performanceData - All performance data
 * @param baselineScore - Baseline performance score
 * @returns Estimated recovery days or undefined
 */
function estimateRecoveryTime(
  poorSleepDate: string,
  _sleepData: SleepMetrics[],
  performanceData: DailyPerformance[],
  baselineScore: number
): number | undefined {
  const startDate = new Date(poorSleepDate);

  // Look at next 7 days
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(checkDate.getDate() + i);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    const perf = performanceData.find(p => p.date === checkDateStr);

    if (perf) {
      const perfScore = calculatePerformanceScore(perf);

      // Consider recovered if within 5% of baseline
      if (perfScore >= baselineScore * 0.95) {
        return i;
      }
    }
  }

  return undefined;
}

/**
 * Service for tracking sleep debt and cumulative effects
 *
 * This service handles:
 * - Calculating accumulated sleep debt
 * - Tracking debt trends over time
 * - Estimating recovery time needed
 * - Analyzing debt impact on performance
 */

import type { SleepMetrics, DailyPerformance, SleepDebt } from '../types/sleep-correlation.js';
import { SLEEP_QUALITY_THRESHOLDS, RECOVERY_ESTIMATES } from '../types/sleep-correlation.js';
import { calculatePerformanceScore } from './performanceDataService.js';
import { pearsonCorrelation } from './correlationCalculator.js';

/**
 * Track sleep debt over a period
 *
 * @param sleepData - Array of sleep metrics
 * @param performanceData - Optional performance data for correlation
 * @param targetDuration - Target sleep duration in minutes (default: 480 = 8 hours)
 * @returns Sleep debt analysis
 */
export function trackSleepDebt(
  sleepData: SleepMetrics[],
  performanceData?: DailyPerformance[],
  targetDuration: number = 480
): SleepDebt {
  if (sleepData.length === 0) {
    return createEmptySleepDebt();
  }

  // Sort by date
  const sorted = [...sleepData].sort((a, b) => a.date.localeCompare(b.date));

  // Calculate daily debt and accumulate
  let currentDebt = 0;
  let maxDebt = 0;
  let maxDebtDate = sorted[0].date;
  const dailyDebts: number[] = [];
  let daysWithDebt = 0;

  for (const sleep of sorted) {
    const dailyDebt = targetDuration - sleep.totalSleepMinutes;
    currentDebt += dailyDebt;

    // Debt can't be negative (surplus sleep doesn't create credit)
    currentDebt = Math.max(0, currentDebt);

    dailyDebts.push(currentDebt);

    if (currentDebt > maxDebt) {
      maxDebt = currentDebt;
      maxDebtDate = sleep.date;
    }

    if (currentDebt > SLEEP_QUALITY_THRESHOLDS.SLEEP_DEBT_THRESHOLD) {
      daysWithDebt++;
    }

    // Recovery: good sleep reduces debt
    if (sleep.sleepScore >= RECOVERY_ESTIMATES.MIN_RECOVERY_SLEEP_SCORE) {
      const recovery = Math.min(RECOVERY_ESTIMATES.RECOVERY_RATE_PER_NIGHT, currentDebt);
      currentDebt -= recovery;
      currentDebt = Math.max(0, currentDebt);
    }
  }

  // Calculate average debt
  const avgDebt = dailyDebts.reduce((sum, debt) => sum + debt, 0) / dailyDebts.length;

  // Estimate recovery nights needed
  const estimatedRecovery = Math.ceil(currentDebt / RECOVERY_ESTIMATES.RECOVERY_RATE_PER_NIGHT);

  // Calculate correlation with performance if data available
  let debtPerfCorr = 0;
  let isAffectingPerformance = false;

  if (performanceData && performanceData.length > 0) {
    const paired = pairDebtWithPerformance(dailyDebts, sorted, performanceData);

    if (paired.length >= 7) {
      const debts = paired.map(p => p.debt);
      const perfScores = paired.map(p => calculatePerformanceScore(p.performance));

      debtPerfCorr = pearsonCorrelation(debts, perfScores);
      isAffectingPerformance = Math.abs(debtPerfCorr) > 0.3 && debtPerfCorr < 0;
    }
  }

  return {
    currentDebtMinutes: Math.round(currentDebt),
    calculatedDate: sorted[sorted.length - 1].date,
    maxDebtMinutes: Math.round(maxDebt),
    maxDebtDate,
    avgDebtMinutes: Math.round(avgDebt),
    daysWithDebt,
    estimatedRecoveryNights: estimatedRecovery,
    debtPerformanceCorrelation: Math.round(debtPerfCorr * 100) / 100,
    isAffectingPerformance,
  };
}

/**
 * Pair debt values with performance data
 */
function pairDebtWithPerformance(
  dailyDebts: number[],
  sleepData: SleepMetrics[],
  performanceData: DailyPerformance[]
): Array<{ debt: number; performance: DailyPerformance }> {
  const paired: Array<{ debt: number; performance: DailyPerformance }> = [];
  const perfMap = new Map(performanceData.map(p => [p.date, p]));

  sleepData.forEach((sleep, index) => {
    const perf = perfMap.get(sleep.date);
    if (perf && index < dailyDebts.length) {
      paired.push({ debt: dailyDebts[index], performance: perf });
    }
  });

  return paired;
}

/**
 * Create empty sleep debt structure
 */
function createEmptySleepDebt(): SleepDebt {
  return {
    currentDebtMinutes: 0,
    calculatedDate: new Date().toISOString().split('T')[0],
    maxDebtMinutes: 0,
    maxDebtDate: new Date().toISOString().split('T')[0],
    avgDebtMinutes: 0,
    daysWithDebt: 0,
    estimatedRecoveryNights: 0,
    debtPerformanceCorrelation: 0,
    isAffectingPerformance: false,
  };
}

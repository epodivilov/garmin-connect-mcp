/**
 * Service for calculating statistical correlations between sleep and performance
 *
 * This service handles:
 * - Pearson correlation coefficient calculation
 * - Statistical significance testing
 * - Confidence interval calculation
 * - Data pairing and validation
 */

import type { SleepMetrics, DailyPerformance, SleepPerformanceCorrelation } from '../types/sleep-correlation.js';
import { PERFORMANCE_IMPACT } from '../types/sleep-correlation.js';
import { calculateSleepStagePercentages } from './sleepDataService.js';
import { calculatePerformanceScore } from './performanceDataService.js';

/**
 * Calculate correlations between sleep and performance metrics
 *
 * @param sleepData - Array of sleep metrics
 * @param performanceData - Array of performance metrics
 * @returns Correlation analysis results
 */
export function calculateSleepPerformanceCorrelation(
  sleepData: SleepMetrics[],
  performanceData: DailyPerformance[]
): SleepPerformanceCorrelation {
  // Pair sleep and performance data by date
  const pairedData = pairSleepPerformanceData(sleepData, performanceData);

  if (pairedData.length < PERFORMANCE_IMPACT.MIN_SAMPLE_SIZE) {
    // Not enough data for reliable correlation
    return {
      sleepDurationCorrelation: 0,
      sleepQualityCorrelation: 0,
      deepSleepCorrelation: 0,
      remSleepCorrelation: 0,
      pValue: 1,
      sampleSize: pairedData.length,
      confidenceLevel: 0,
      isSignificant: false,
    };
  }

  // Extract data arrays for correlation
  const sleepDurations = pairedData.map(d => d.sleep.totalSleepMinutes);
  const sleepScores = pairedData.map(d => d.sleep.sleepScore);
  const deepSleepPercents = pairedData.map(d => {
    const percentages = calculateSleepStagePercentages(d.sleep);
    return percentages.deepPercent;
  });
  const remSleepPercents = pairedData.map(d => {
    const percentages = calculateSleepStagePercentages(d.sleep);
    return percentages.remPercent;
  });

  // Calculate performance scores
  const performanceScores = pairedData.map(d => calculatePerformanceScore(d.performance));

  // Calculate correlations
  const durationCorr = pearsonCorrelation(sleepDurations, performanceScores);
  const qualityCorr = pearsonCorrelation(sleepScores, performanceScores);
  const deepCorr = pearsonCorrelation(deepSleepPercents, performanceScores);
  const remCorr = pearsonCorrelation(remSleepPercents, performanceScores);

  // Use the strongest correlation for significance testing
  const maxCorr = Math.max(
    Math.abs(durationCorr),
    Math.abs(qualityCorr),
    Math.abs(deepCorr),
    Math.abs(remCorr)
  );

  // Calculate statistical significance
  const pValue = calculatePValue(maxCorr, pairedData.length);
  const isSignificant = pValue < PERFORMANCE_IMPACT.P_VALUE_THRESHOLD &&
    maxCorr >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD;

  // Calculate confidence level
  const confidenceLevel = 1 - pValue;

  return {
    sleepDurationCorrelation: durationCorr,
    sleepQualityCorrelation: qualityCorr,
    deepSleepCorrelation: deepCorr,
    remSleepCorrelation: remCorr,
    pValue,
    sampleSize: pairedData.length,
    confidenceLevel,
    isSignificant,
  };
}

/**
 * Pair sleep and performance data by date
 * Performance data is paired with the PREVIOUS night's sleep
 *
 * @param sleepData - Array of sleep metrics
 * @param performanceData - Array of performance metrics
 * @returns Paired sleep-performance data
 */
function pairSleepPerformanceData(
  sleepData: SleepMetrics[],
  performanceData: DailyPerformance[]
): Array<{ sleep: SleepMetrics; performance: DailyPerformance }> {
  const paired: Array<{ sleep: SleepMetrics; performance: DailyPerformance }> = [];

  // Create map of sleep by date
  const sleepMap = new Map<string, SleepMetrics>();
  sleepData.forEach(sleep => sleepMap.set(sleep.date, sleep));

  // For each performance day, find the previous night's sleep
  for (const performance of performanceData) {
    const performanceDate = new Date(performance.date);
    const previousNightDate = new Date(performanceDate);
    previousNightDate.setDate(previousNightDate.getDate() - 1);
    const previousNightStr = previousNightDate.toISOString().split('T')[0];

    const sleep = sleepMap.get(previousNightStr);

    if (sleep) {
      paired.push({ sleep, performance });
    }
  }

  return paired;
}

/**
 * Calculate Pearson correlation coefficient
 *
 * @param x - First data series
 * @param y - Second data series
 * @returns Correlation coefficient (-1 to 1)
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  // Calculate correlation components
  let numerator = 0;
  let sumSquaredX = 0;
  let sumSquaredY = 0;

  for (let i = 0; i < n; i++) {
    const deltaX = x[i] - meanX;
    const deltaY = y[i] - meanY;

    numerator += deltaX * deltaY;
    sumSquaredX += deltaX * deltaX;
    sumSquaredY += deltaY * deltaY;
  }

  const denominator = Math.sqrt(sumSquaredX * sumSquaredY);

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

/**
 * Calculate p-value for correlation coefficient
 * Uses t-distribution approximation
 *
 * @param r - Correlation coefficient
 * @param n - Sample size
 * @returns P-value
 */
function calculatePValue(r: number, n: number): number {
  if (n < 3) {
    return 1;
  }

  // Calculate t-statistic
  const t = r * Math.sqrt((n - 2) / (1 - r * r));

  // Degrees of freedom
  const df = n - 2;

  // Approximate p-value using t-distribution
  // This is a simplified approximation
  const pValue = approximateTDistributionPValue(Math.abs(t), df);

  return pValue;
}

/**
 * Critical z-scores for two-tailed hypothesis testing at common significance levels
 *
 * These values represent the standard normal distribution (z-distribution) critical values
 * used for large sample sizes (df > 30). For smaller samples, these are adjusted upward
 * to approximate the wider tails of the t-distribution.
 *
 * Source: Standard statistical tables for normal distribution
 */
const CRITICAL_Z_SCORES = {
  /** p = 0.10 (90% confidence, two-tailed α = 0.20) */
  P_010: 1.28,
  /** p = 0.05 (95% confidence, two-tailed α = 0.10) */
  P_005: 1.645,
  /** p = 0.025 (97.5% confidence, two-tailed α = 0.05) */
  P_0025: 1.96,
  /** p = 0.01 (99% confidence, two-tailed α = 0.02) */
  P_001: 2.33,
  /** p = 0.005 (99.5% confidence, two-tailed α = 0.01) */
  P_0005: 2.58,
  /** p = 0.001 (99.9% confidence, two-tailed α = 0.002) */
  P_0001: 3.09,
} as const;

/**
 * Degrees of freedom threshold for using normal approximation
 *
 * For df > 30, the t-distribution closely approximates the normal distribution.
 * Below this threshold, we apply an adjustment factor to account for the heavier
 * tails of the t-distribution.
 */
const LARGE_SAMPLE_DF_THRESHOLD = 30;

/**
 * Small sample adjustment scaling factor
 *
 * For df < 30, we increase critical values by (30 - df) / 100 to account for
 * the heavier tails of the t-distribution. This is a simplified approximation
 * that provides conservative p-value estimates.
 *
 * Example: For df = 20, adjustment = 1.10 (10% increase in critical values)
 */
const SMALL_SAMPLE_ADJUSTMENT_FACTOR = 100;

/**
 * Approximate p-value from t-distribution
 * Uses simplified approximation for common cases
 *
 * This function provides a computationally efficient approximation of p-values
 * without requiring a full t-distribution CDF implementation. It uses:
 * - Normal distribution critical values for large samples (df > 30)
 * - Adjusted critical values for small samples to account for heavier tails
 *
 * Limitations:
 * - Returns discrete p-value estimates rather than exact values
 * - Less accurate for very small samples (df < 10)
 * - Sufficiently accurate for typical correlation analysis use cases
 *
 * @param t - T-statistic (absolute value)
 * @param df - Degrees of freedom
 * @returns Approximate two-tailed p-value
 */
function approximateTDistributionPValue(t: number, df: number): number {
  // For large df (>30), use normal distribution approximation
  if (df > LARGE_SAMPLE_DF_THRESHOLD) {
    if (t < CRITICAL_Z_SCORES.P_010) return 0.2;
    if (t < CRITICAL_Z_SCORES.P_005) return 0.1;
    if (t < CRITICAL_Z_SCORES.P_0025) return 0.05;
    if (t < CRITICAL_Z_SCORES.P_001) return 0.02;
    if (t < CRITICAL_Z_SCORES.P_0005) return 0.01;
    if (t < CRITICAL_Z_SCORES.P_0001) return 0.002;
    return 0.001;
  }

  // For small df, use more conservative estimates by adjusting critical values upward
  // This accounts for the heavier tails of the t-distribution
  const adjustment = 1 + (LARGE_SAMPLE_DF_THRESHOLD - df) / SMALL_SAMPLE_ADJUSTMENT_FACTOR;

  if (t < CRITICAL_Z_SCORES.P_010 * adjustment) return 0.2;
  if (t < CRITICAL_Z_SCORES.P_005 * adjustment) return 0.1;
  if (t < CRITICAL_Z_SCORES.P_0025 * adjustment) return 0.05;
  if (t < CRITICAL_Z_SCORES.P_001 * adjustment) return 0.02;
  if (t < CRITICAL_Z_SCORES.P_0005 * adjustment) return 0.01;
  if (t < CRITICAL_Z_SCORES.P_0001 * adjustment) return 0.002;
  return 0.001;
}

/**
 * Calculate confidence interval for correlation
 *
 * @param r - Correlation coefficient
 * @param n - Sample size
 * @param confidenceLevel - Confidence level (e.g., 0.95)
 * @returns Confidence interval [lower, upper]
 */
export function calculateConfidenceInterval(
  r: number,
  n: number,
  confidenceLevel: number = 0.95
): [number, number] {
  if (n < 3) {
    return [0, 0];
  }

  // Fisher's z-transformation
  const z = 0.5 * Math.log((1 + r) / (1 - r));

  // Standard error
  const se = 1 / Math.sqrt(n - 3);

  // Z-score for confidence level
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.58 : 1.645;

  // Confidence interval in z-space
  const zLower = z - zScore * se;
  const zUpper = z + zScore * se;

  // Transform back to r-space
  const rLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
  const rUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);

  return [rLower, rUpper];
}

/**
 * Determine correlation strength category
 *
 * @param r - Correlation coefficient
 * @returns Strength description
 */
export function getCorrelationStrength(r: number): string {
  const abs = Math.abs(r);

  if (abs < 0.1) return 'negligible';
  if (abs < 0.3) return 'weak';
  if (abs < 0.5) return 'moderate';
  if (abs < 0.7) return 'strong';
  return 'very strong';
}

/**
 * Calculate effect size (Cohen's d) for sleep-performance relationship
 *
 * @param sleepData - Sleep metrics
 * @param performanceData - Performance metrics
 * @param sleepThreshold - Sleep quality threshold to split groups
 * @returns Effect size
 */
export function calculateEffectSize(
  sleepData: SleepMetrics[],
  performanceData: DailyPerformance[],
  sleepThreshold: number = 70
): number {
  const paired = pairSleepPerformanceData(sleepData, performanceData);

  if (paired.length < 4) {
    return 0;
  }

  // Split into good sleep and poor sleep groups
  const goodSleepPerformance: number[] = [];
  const poorSleepPerformance: number[] = [];

  for (const pair of paired) {
    const perfScore = calculatePerformanceScore(pair.performance);

    if (pair.sleep.sleepScore >= sleepThreshold) {
      goodSleepPerformance.push(perfScore);
    } else {
      poorSleepPerformance.push(perfScore);
    }
  }

  if (goodSleepPerformance.length === 0 || poorSleepPerformance.length === 0) {
    return 0;
  }

  // Calculate means
  const meanGood = goodSleepPerformance.reduce((sum, val) => sum + val, 0) / goodSleepPerformance.length;
  const meanPoor = poorSleepPerformance.reduce((sum, val) => sum + val, 0) / poorSleepPerformance.length;

  // Calculate pooled standard deviation
  const varGood = goodSleepPerformance.reduce((sum, val) => sum + Math.pow(val - meanGood, 2), 0) / (goodSleepPerformance.length - 1);
  const varPoor = poorSleepPerformance.reduce((sum, val) => sum + Math.pow(val - meanPoor, 2), 0) / (poorSleepPerformance.length - 1);

  const pooledSD = Math.sqrt((varGood + varPoor) / 2);

  if (pooledSD === 0) {
    return 0;
  }

  // Cohen's d
  return (meanGood - meanPoor) / pooledSD;
}

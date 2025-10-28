/**
 * HRV Baseline Calculator Service
 *
 * Calculates HRV baseline statistics using robust statistical methods:
 * - Median-based baseline (resistant to outliers)
 * - Interquartile range (IQR) for spread
 * - 95% confidence intervals
 * - Weekly pattern analysis
 * - Baseline evolution tracking
 */

import type {
  HRVMeasurement,
  HRVBaseline,
} from '../types/hrv-tracking.js';

const MIN_BASELINE_DAYS = 14;
const BASELINE_WINDOW_DAYS = 28;

/**
 * HRV Baseline Calculator
 */
export class HRVBaselineCalculator {
  /**
   * Calculate baseline statistics from measurements
   */
  calculate(measurements: HRVMeasurement[]): HRVBaseline | null {
    if (measurements.length < MIN_BASELINE_DAYS) {
      return null;
    }

    // Sort measurements by date
    const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));

    // Use most recent window for baseline
    const recentWindow = sorted.slice(-BASELINE_WINDOW_DAYS);
    const values = recentWindow.map((m) => m.value);

    // Calculate baseline using median (robust to outliers)
    const baseline = this.calculateMedian(values);
    const iqr = this.calculateIQR(values);
    const confidenceInterval = this.calculateConfidenceInterval(values);

    // Calculate weekly pattern
    const weeklyPattern = this.calculateWeeklyPattern(recentWindow);

    // Calculate baseline evolution (4-week sliding windows)
    const evolution = this.calculateEvolution(sorted);

    return {
      baseline,
      iqr,
      confidenceInterval,
      weeklyPattern,
      evolution,
      daysAnalyzed: recentWindow.length,
      dateRange: {
        start: recentWindow[0].date,
        end: recentWindow[recentWindow.length - 1].date,
      },
    };
  }

  /**
   * Check if measurement is within normal range
   */
  isWithinNormalRange(value: number, baseline: HRVBaseline): boolean {
    return (
      value >= baseline.confidenceInterval.lower &&
      value <= baseline.confidenceInterval.upper
    );
  }

  /**
   * Calculate deviation from baseline (percentage)
   */
  calculateDeviation(value: number, baseline: number): number {
    return ((value - baseline) / baseline) * 100;
  }

  /**
   * Calculate median value
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate interquartile range (IQR)
   */
  private calculateIQR(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];

    return q3 - q1;
  }

  /**
   * Calculate 95% confidence interval
   * Using median ± 1.96 * (IQR / 1.35)
   * (1.35 is the conversion factor from IQR to standard deviation for normal distribution)
   */
  private calculateConfidenceInterval(
    values: number[]
  ): { lower: number; upper: number } {
    const median = this.calculateMedian(values);
    const iqr = this.calculateIQR(values);

    // Estimate standard deviation from IQR
    const estimatedStdDev = iqr / 1.35;

    // 95% confidence interval (±1.96 standard deviations)
    const margin = 1.96 * estimatedStdDev;

    return {
      lower: Math.max(0, median - margin),
      upper: median + margin,
    };
  }

  /**
   * Calculate weekly pattern (average HRV by day of week)
   */
  private calculateWeeklyPattern(
    measurements: HRVMeasurement[]
  ): HRVBaseline['weeklyPattern'] {
    // Group by day of week
    const byDayOfWeek: Record<number, number[]> = {};

    for (const m of measurements) {
      const date = new Date(m.date);
      const dayOfWeek = date.getUTCDay();

      if (!byDayOfWeek[dayOfWeek]) {
        byDayOfWeek[dayOfWeek] = [];
      }
      byDayOfWeek[dayOfWeek].push(m.value);
    }

    // Calculate statistics for each day
    const pattern: HRVBaseline['weeklyPattern'] = [];

    for (let day = 0; day < 7; day++) {
      const values = byDayOfWeek[day] || [];

      if (values.length === 0) {
        pattern.push({ dayOfWeek: day, average: 0, stdDev: 0 });
        continue;
      }

      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) /
        values.length;
      const stdDev = Math.sqrt(variance);

      pattern.push({ dayOfWeek: day, average, stdDev });
    }

    return pattern;
  }

  /**
   * Calculate baseline evolution using sliding 28-day windows
   */
  private calculateEvolution(
    measurements: HRVMeasurement[]
  ): { date: string; baseline: number }[] {
    if (measurements.length < MIN_BASELINE_DAYS) {
      return [];
    }

    const evolution: { date: string; baseline: number }[] = [];
    const windowSize = 28;
    const stepSize = 7; // Calculate every week

    for (let i = windowSize; i <= measurements.length; i += stepSize) {
      const window = measurements.slice(i - windowSize, i);
      const values = window.map((m) => m.value);
      const baseline = this.calculateMedian(values);

      evolution.push({
        date: window[window.length - 1].date,
        baseline,
      });
    }

    return evolution;
  }


  /**
   * Get expected HRV for a specific day of week
   */
  getExpectedForDayOfWeek(dayOfWeek: number, baseline: HRVBaseline): number {
    const pattern = baseline.weeklyPattern.find((p) => p.dayOfWeek === dayOfWeek);
    return pattern?.average || baseline.baseline;
  }
}

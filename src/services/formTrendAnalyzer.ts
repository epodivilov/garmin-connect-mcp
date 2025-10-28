/**
 * Form Trend Analyzer Service
 *
 * Analyzes form (TSB) trends over different time periods (7, 14, 30 days).
 * Detects trend direction, velocity, volatility, zone transitions, and reversals.
 */

import type {
  FormTrend,
  FormZone,
  FormSnapshot,
} from '../types/fatigue-freshness.js';
import { FORM_TREND_VELOCITY } from '../types/fatigue-freshness.js';
import { FormZoneClassifier } from './formZoneClassifier.js';

/**
 * Data point for trend analysis
 */
interface TrendDataPoint {
  date: string;
  tsb: number;
  ctl: number;
  atl: number;
  zone: FormZone;
}

/**
 * Form Trend Analyzer Service
 */
export class FormTrendAnalyzer {
  private zoneClassifier: FormZoneClassifier;

  constructor(zoneClassifier?: FormZoneClassifier) {
    this.zoneClassifier = zoneClassifier || new FormZoneClassifier();
  }

  /**
   * Get zone classifier (for testing)
   */
  getZoneClassifier(): FormZoneClassifier {
    return this.zoneClassifier;
  }

  /**
   * Analyze form trend for a specific period
   */
  analyzeTrend(
    snapshots: FormSnapshot[],
    period: 'week' | 'two_weeks' | 'month'
  ): FormTrend {
    const durationDays = this.getPeriodDuration(period);

    // Get snapshots for the period
    const periodSnapshots = this.getSnapshotsForPeriod(snapshots, durationDays);

    if (periodSnapshots.length < 2) {
      return this.createEmptyTrend(period, durationDays);
    }

    // Extract data points
    const dataPoints: TrendDataPoint[] = periodSnapshots.map((s) => ({
      date: s.date,
      tsb: s.tsb,
      ctl: s.ctl,
      atl: s.atl,
      zone: s.zone,
    }));

    // Calculate trend metrics
    const direction = this.calculateDirection(dataPoints);
    const slope = this.calculateSlope(dataPoints);
    const velocity = this.calculateVelocity(slope);

    // Statistical measures
    const tsbValues = dataPoints.map((d) => d.tsb);
    const averageTSB = this.calculateMean(tsbValues);
    const minTSB = Math.min(...tsbValues);
    const maxTSB = Math.max(...tsbValues);
    const volatility = this.calculateStandardDeviation(tsbValues);

    // Zone analysis
    const zoneChanges = this.detectZoneChanges(dataPoints);
    const reversals = this.detectReversals(dataPoints);

    return {
      period,
      durationDays,
      startDate: dataPoints[0].date,
      endDate: dataPoints[dataPoints.length - 1].date,
      direction,
      slope,
      velocity,
      averageTSB,
      minTSB,
      maxTSB,
      volatility,
      zoneChanges,
      reversals,
    };
  }

  /**
   * Analyze multiple trends (week, two weeks, month)
   */
  analyzeMultipleTrends(snapshots: FormSnapshot[]): {
    week: FormTrend;
    twoWeeks: FormTrend;
    month: FormTrend;
  } {
    return {
      week: this.analyzeTrend(snapshots, 'week'),
      twoWeeks: this.analyzeTrend(snapshots, 'two_weeks'),
      month: this.analyzeTrend(snapshots, 'month'),
    };
  }

  /**
   * Detect if trend is accelerating or decelerating
   */
  detectTrendAcceleration(snapshots: FormSnapshot[]): {
    isAccelerating: boolean;
    accelerationRate: number;
    interpretation: string;
  } {
    if (snapshots.length < 3) {
      return {
        isAccelerating: false,
        accelerationRate: 0,
        interpretation: 'Insufficient data for acceleration analysis',
      };
    }

    // Compare recent slope to earlier slope
    const recentSnapshots = snapshots.slice(-7); // Last week
    const earlierSnapshots = snapshots.slice(-14, -7); // Previous week

    if (recentSnapshots.length < 2 || earlierSnapshots.length < 2) {
      return {
        isAccelerating: false,
        accelerationRate: 0,
        interpretation: 'Insufficient data for acceleration analysis',
      };
    }

    const recentSlope = this.calculateSlope(
      recentSnapshots.map((s) => ({ date: s.date, tsb: s.tsb, ctl: s.ctl, atl: s.atl, zone: s.zone }))
    );
    const earlierSlope = this.calculateSlope(
      earlierSnapshots.map((s) => ({ date: s.date, tsb: s.tsb, ctl: s.ctl, atl: s.atl, zone: s.zone }))
    );

    const accelerationRate = recentSlope - earlierSlope;
    const isAccelerating = Math.abs(accelerationRate) > 0.5;

    let interpretation: string;
    if (!isAccelerating) {
      interpretation = 'Form trend is steady';
    } else if (accelerationRate > 0) {
      interpretation = 'Form is improving at an accelerating rate (recovery accelerating)';
    } else {
      interpretation = 'Form is declining at an accelerating rate (fatigue accumulating faster)';
    }

    return {
      isAccelerating,
      accelerationRate,
      interpretation,
    };
  }

  /**
   * Get trend summary for interpretation
   */
  getTrendSummary(trend: FormTrend): string {
    const parts: string[] = [];

    // Direction and velocity
    if (trend.direction === 'improving') {
      parts.push(`Form is ${trend.velocity} improving`);
    } else if (trend.direction === 'declining') {
      parts.push(`Form is ${trend.velocity} declining`);
    } else {
      parts.push('Form is stable');
    }

    // Volatility
    if (trend.volatility > 10) {
      parts.push('with high volatility');
    } else if (trend.volatility > 5) {
      parts.push('with moderate volatility');
    } else {
      parts.push('with low volatility');
    }

    // Zone changes
    if (trend.zoneChanges.length > 0) {
      parts.push(`(${trend.zoneChanges.length} zone changes)`);
    }

    // Reversals
    if (trend.reversals.length > 0) {
      parts.push(`with ${trend.reversals.length} trend reversals`);
    }

    return parts.join(' ');
  }

  /**
   * Get period duration in days
   */
  private getPeriodDuration(period: 'week' | 'two_weeks' | 'month'): number {
    switch (period) {
      case 'week':
        return 7;
      case 'two_weeks':
        return 14;
      case 'month':
        return 30;
    }
  }

  /**
   * Get snapshots for a specific period (most recent N days)
   */
  private getSnapshotsForPeriod(snapshots: FormSnapshot[], days: number): FormSnapshot[] {
    return snapshots.slice(-days);
  }

  /**
   * Calculate trend direction
   */
  private calculateDirection(dataPoints: TrendDataPoint[]): 'improving' | 'declining' | 'stable' {
    if (dataPoints.length < 2) {
      return 'stable';
    }

    const slope = this.calculateSlope(dataPoints);

    if (slope > 0.2) {
      return 'improving'; // TSB increasing = recovering
    } else if (slope < -0.2) {
      return 'declining'; // TSB decreasing = accumulating fatigue
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate slope using linear regression
   */
  private calculateSlope(dataPoints: TrendDataPoint[]): number {
    if (dataPoints.length < 2) {
      return 0;
    }

    const n = dataPoints.length;
    const xValues = Array.from({ length: n }, (_, i) => i); // Use indices as x-values
    const yValues = dataPoints.map((d) => d.tsb);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return slope;
  }

  /**
   * Calculate velocity category from slope
   */
  private calculateVelocity(slope: number): 'rapid' | 'moderate' | 'slow' | 'stable' {
    const absSlope = Math.abs(slope);

    if (absSlope >= FORM_TREND_VELOCITY.RAPID) {
      return 'rapid';
    } else if (absSlope >= FORM_TREND_VELOCITY.MODERATE) {
      return 'moderate';
    } else if (absSlope >= FORM_TREND_VELOCITY.SLOW) {
      return 'slow';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate mean
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = this.calculateMean(squaredDiffs);

    return Math.sqrt(variance);
  }

  /**
   * Detect zone changes
   */
  private detectZoneChanges(
    dataPoints: TrendDataPoint[]
  ): FormTrend['zoneChanges'] {
    const changes: FormTrend['zoneChanges'] = [];

    for (let i = 1; i < dataPoints.length; i++) {
      const prev = dataPoints[i - 1];
      const curr = dataPoints[i];

      if (prev.zone !== curr.zone) {
        changes.push({
          date: curr.date,
          fromZone: prev.zone,
          toZone: curr.zone,
          tsbValue: curr.tsb,
        });
      }
    }

    return changes;
  }

  /**
   * Detect trend reversals (inflection points)
   */
  private detectReversals(
    dataPoints: TrendDataPoint[]
  ): FormTrend['reversals'] {
    const reversals: FormTrend['reversals'] = [];

    if (dataPoints.length < 3) {
      return reversals;
    }

    for (let i = 1; i < dataPoints.length - 1; i++) {
      const prev = dataPoints[i - 1];
      const curr = dataPoints[i];
      const next = dataPoints[i + 1];

      const prevDirection = curr.tsb > prev.tsb ? 'increasing' : 'decreasing';
      const nextDirection = next.tsb > curr.tsb ? 'increasing' : 'decreasing';

      // Check for direction change
      if (prevDirection !== nextDirection) {
        // Ensure it's a significant reversal (> 2 TSB points)
        const prevChange = Math.abs(curr.tsb - prev.tsb);
        const nextChange = Math.abs(next.tsb - curr.tsb);

        if (prevChange > 2 || nextChange > 2) {
          reversals.push({
            date: curr.date,
            tsbValue: curr.tsb,
            previousDirection: prevDirection,
            newDirection: nextDirection,
          });
        }
      }
    }

    return reversals;
  }

  /**
   * Create empty trend (for insufficient data)
   */
  private createEmptyTrend(
    period: 'week' | 'two_weeks' | 'month',
    durationDays: number
  ): FormTrend {
    const today = new Date().toISOString().split('T')[0];

    return {
      period,
      durationDays,
      startDate: today,
      endDate: today,
      direction: 'stable',
      slope: 0,
      velocity: 'stable',
      averageTSB: 0,
      minTSB: 0,
      maxTSB: 0,
      volatility: 0,
      zoneChanges: [],
      reversals: [],
    };
  }
}

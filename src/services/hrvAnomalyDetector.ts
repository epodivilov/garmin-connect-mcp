/**
 * HRV Anomaly Detector Service
 *
 * Detects HRV anomalies and classifies their severity:
 * - Identifies drops below baseline
 * - Calculates velocity (sudden vs gradual changes)
 * - Tracks consecutive days low
 * - Correlates with training load, sleep, and resting HR
 * - Estimates recovery time
 */

import type {
  HRVMeasurement,
  HRVBaseline,
  HRVAnomaly,
  AnomalySeverity,
} from '../types/hrv-tracking.js';

/**
 * Severity thresholds (percentage below baseline)
 */
const SEVERITY_THRESHOLDS = {
  minor: -5, // 5-10% below baseline
  moderate: -10, // 10-15% below baseline
  significant: -15, // 15-20% below baseline
  critical: -20, // >20% below baseline
} as const;

/**
 * Velocity thresholds (ms/day)
 */
const VELOCITY_THRESHOLDS = {
  sudden: -5, // Drop > 5ms/day
  gradual: -2, // Drop 2-5ms/day
} as const;

/**
 * HRV Anomaly Detector
 */
export class HRVAnomalyDetector {
  /**
   * Detect anomalies in recent measurements
   */
  detectAnomalies(
    measurements: HRVMeasurement[],
    baseline: HRVBaseline,
    daysToAnalyze = 7
  ): HRVAnomaly[] {
    if (measurements.length === 0) {
      return [];
    }

    // Sort by date descending (most recent first)
    const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date));

    // Analyze recent measurements
    const recent = sorted.slice(0, daysToAnalyze);
    const anomalies: HRVAnomaly[] = [];

    for (let i = 0; i < recent.length; i++) {
      const measurement = recent[i];
      const deviation = this.calculateDeviation(measurement.value, baseline.baseline);

      // Check if below baseline threshold
      if (deviation < SEVERITY_THRESHOLDS.minor) {
        const anomaly = this.analyzeAnomaly(
          measurement,
          baseline,
          recent,
          i,
          sorted
        );
        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  /**
   * Analyze a single anomaly
   */
  private analyzeAnomaly(
    measurement: HRVMeasurement,
    baseline: HRVBaseline,
    recent: HRVMeasurement[],
    index: number,
    allMeasurements: HRVMeasurement[]
  ): HRVAnomaly {
    const deviation = this.calculateDeviation(measurement.value, baseline.baseline);
    const severity = this.classifySeverity(deviation);

    // Calculate consecutive days low
    const consecutiveDaysLow = this.calculateConsecutiveDaysLow(
      recent,
      baseline,
      index
    );

    // Calculate velocity
    const velocity = this.calculateVelocity(allMeasurements, measurement.date);

    // Detect correlations
    const correlations = this.detectCorrelations(measurement);

    // Estimate recovery time
    const estimatedRecoveryDays = this.estimateRecoveryTime(
      severity,
      consecutiveDaysLow,
      velocity.classification,
      correlations
    );

    return {
      date: measurement.date,
      value: measurement.value,
      expectedValue: baseline.baseline,
      deviation,
      severity,
      consecutiveDaysLow,
      velocity,
      correlations,
      estimatedRecoveryDays,
    };
  }

  /**
   * Calculate deviation from baseline (percentage)
   */
  private calculateDeviation(value: number, baseline: number): number {
    return ((value - baseline) / baseline) * 100;
  }

  /**
   * Classify anomaly severity based on deviation
   */
  private classifySeverity(deviation: number): AnomalySeverity {
    if (deviation <= SEVERITY_THRESHOLDS.critical) {
      return 'critical';
    }
    if (deviation <= SEVERITY_THRESHOLDS.significant) {
      return 'significant';
    }
    if (deviation <= SEVERITY_THRESHOLDS.moderate) {
      return 'moderate';
    }
    return 'minor';
  }

  /**
   * Calculate consecutive days below baseline
   */
  private calculateConsecutiveDaysLow(
    recent: HRVMeasurement[],
    baseline: HRVBaseline,
    startIndex: number
  ): number {
    let count = 0;

    for (let i = startIndex; i < recent.length; i++) {
      const value = recent[i].value;
      const deviation = this.calculateDeviation(value, baseline.baseline);

      if (deviation < SEVERITY_THRESHOLDS.minor) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Calculate velocity (rate of change)
   */
  private calculateVelocity(
    measurements: HRVMeasurement[],
    targetDate: string
  ): HRVAnomaly['velocity'] {
    // Find target measurement and previous measurement
    const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
    const targetIndex = sorted.findIndex((m) => m.date === targetDate);

    if (targetIndex < 1) {
      return { value: 0, classification: 'gradual' };
    }

    // Calculate change over last 3 days (or fewer if not available)
    const windowSize = Math.min(3, targetIndex + 1);
    const window = sorted.slice(targetIndex - windowSize + 1, targetIndex + 1);

    if (window.length < 2) {
      return { value: 0, classification: 'gradual' };
    }

    // Linear regression to calculate slope (ms/day)
    const slope = this.calculateSlope(window);

    // Classify velocity
    const classification =
      slope <= VELOCITY_THRESHOLDS.sudden ? 'sudden' : 'gradual';

    return { value: slope, classification };
  }

  /**
   * Calculate slope using linear regression
   */
  private calculateSlope(window: HRVMeasurement[]): number {
    const n = window.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i; // Day index
      const y = window[i].value;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Detect potential correlations
   */
  private detectCorrelations(
    measurement: HRVMeasurement
  ): HRVAnomaly['correlations'] {
    const context = measurement.context;
    const correlations: HRVAnomaly['correlations'] = {};

    if (!context) {
      return correlations;
    }

    // High training load correlation
    if (context.trainingLoad !== undefined && context.trainingLoad > 100) {
      correlations.highTrainingLoad = true;
    }

    // Poor sleep correlation
    if (context.sleepScore !== undefined && context.sleepScore < 60) {
      correlations.poorSleep = true;
    }

    // Elevated resting HR correlation
    if (context.restingHeartRate !== undefined) {
      // Assume normal resting HR is 50-70, elevated is >70
      if (context.restingHeartRate > 70) {
        correlations.elevatedRestingHR = true;
      }
    }

    return correlations;
  }

  /**
   * Estimate recovery time based on severity and correlations
   */
  private estimateRecoveryTime(
    severity: AnomalySeverity,
    consecutiveDaysLow: number,
    velocity: 'sudden' | 'gradual',
    correlations: HRVAnomaly['correlations']
  ): number {
    // Base recovery time by severity
    let baseRecovery = 0;
    switch (severity) {
      case 'minor':
        baseRecovery = 1;
        break;
      case 'moderate':
        baseRecovery = 2;
        break;
      case 'significant':
        baseRecovery = 4;
        break;
      case 'critical':
        baseRecovery = 7;
        break;
    }

    // Adjust for consecutive days low (adds 0.5 days per consecutive day)
    baseRecovery += Math.floor(consecutiveDaysLow * 0.5);

    // Adjust for velocity (sudden drops take longer to recover)
    if (velocity === 'sudden') {
      baseRecovery += 1;
    }

    // Adjust for correlations
    let correlationCount = 0;
    if (correlations.highTrainingLoad) correlationCount++;
    if (correlations.poorSleep) correlationCount++;
    if (correlations.elevatedRestingHR) correlationCount++;

    baseRecovery += correlationCount;

    return Math.max(1, baseRecovery);
  }

  /**
   * Check if currently in anomaly state
   */
  hasActiveAnomaly(anomalies: HRVAnomaly[]): boolean {
    if (anomalies.length === 0) {
      return false;
    }

    // Sort by date descending
    const sorted = [...anomalies].sort((a, b) => b.date.localeCompare(a.date));

    // Check if most recent anomaly is still active
    const mostRecent = sorted[0];
    return mostRecent.consecutiveDaysLow > 0;
  }

  /**
   * Get most severe active anomaly
   */
  getMostSevereAnomaly(anomalies: HRVAnomaly[]): HRVAnomaly | null {
    if (anomalies.length === 0) {
      return null;
    }

    const severityOrder: Record<AnomalySeverity, number> = {
      critical: 4,
      significant: 3,
      moderate: 2,
      minor: 1,
    };

    return anomalies.reduce((prev, current) => {
      return severityOrder[current.severity] > severityOrder[prev.severity]
        ? current
        : prev;
    });
  }
}

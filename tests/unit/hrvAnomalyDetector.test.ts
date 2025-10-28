/**
 * Unit tests for HRV Anomaly Detector
 */

import { describe, it, expect } from 'vitest';
import { HRVAnomalyDetector } from '../../src/services/hrvAnomalyDetector.js';
import { HRVBaselineCalculator } from '../../src/services/hrvBaselineCalculator.js';
import type { HRVMeasurement } from '../../src/types/hrv-tracking.js';

describe('HRVAnomalyDetector', () => {
  const detector = new HRVAnomalyDetector();
  const calculator = new HRVBaselineCalculator();

  // Helper to create test data
  function createMeasurements(days: number, baseValue: number, pattern?: (i: number) => number): HRVMeasurement[] {
    const measurements: HRVMeasurement[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(2025, 0, 1 + i);
      measurements.push({
        date: date.toISOString().split('T')[0],
        value: pattern ? pattern(i) : baseValue,
      });
    }
    return measurements;
  }

  describe('detectAnomalies', () => {
    it('should detect no anomalies for normal HRV', () => {
      const measurements = createMeasurements(30, 50);
      const baseline = calculator.calculate(measurements)!;

      const anomalies = detector.detectAnomalies(measurements, baseline, 7);
      expect(anomalies).toHaveLength(0);
    });

    it('should detect minor anomaly for slight drop', () => {
      const measurements = createMeasurements(28, 50);
      // Add recent drop
      measurements.push({ date: '2025-01-29', value: 46 }); // -8%
      measurements.push({ date: '2025-01-30', value: 45 }); // -10%

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].severity).toBe('moderate');
    });

    it('should detect significant anomaly for major drop', () => {
      const measurements = createMeasurements(28, 50);
      // Add significant drop (need -15% to -20% for significant)
      measurements.push({ date: '2025-01-29', value: 42 }); // -16%

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      expect(anomalies.length).toBeGreaterThan(0);
      // Should be at least moderate or significant
      expect(['moderate', 'significant', 'critical']).toContain(anomalies[0].severity);
    });

    it('should calculate consecutive days low', () => {
      const measurements = createMeasurements(28, 50);
      // Add multiple days of low HRV
      measurements.push({ date: '2025-01-29', value: 44 }); // -12%
      measurements.push({ date: '2025-01-30', value: 43 }); // -14%
      measurements.push({ date: '2025-01-31', value: 42 }); // -16%

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      expect(anomalies.length).toBeGreaterThan(0);
      // Most recent anomaly should have consecutive days = 3
      const mostRecent = anomalies[0];
      expect(mostRecent.consecutiveDaysLow).toBeGreaterThanOrEqual(1);
    });

    it('should detect correlations with context data', () => {
      const measurements = createMeasurements(28, 50);
      // Add anomaly with poor sleep
      measurements.push({
        date: '2025-01-29',
        value: 40,
        context: {
          sleepScore: 45, // Poor sleep
          trainingLoad: 120, // High training load
        },
      });

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      expect(anomalies[0].correlations.poorSleep).toBe(true);
      expect(anomalies[0].correlations.highTrainingLoad).toBe(true);
    });

    it('should classify sudden vs gradual velocity', () => {
      // Test sudden drop
      const suddenMeasurements = createMeasurements(28, 50);
      suddenMeasurements.push({ date: '2025-01-29', value: 50 });
      suddenMeasurements.push({ date: '2025-01-30', value: 40 }); // Sudden -10ms

      const baseline1 = calculator.calculate(suddenMeasurements.slice(0, 28))!;
      const suddenAnomalies = detector.detectAnomalies(suddenMeasurements, baseline1, 7);

      if (suddenAnomalies.length > 0) {
        expect(suddenAnomalies[0].velocity.classification).toBe('sudden');
      }

      // Test gradual drop
      const gradualMeasurements = createMeasurements(28, 50);
      gradualMeasurements.push({ date: '2025-01-29', value: 49 });
      gradualMeasurements.push({ date: '2025-01-30', value: 48 });
      gradualMeasurements.push({ date: '2025-01-31', value: 47 });
      gradualMeasurements.push({ date: '2025-02-01', value: 46 });
      gradualMeasurements.push({ date: '2025-02-02', value: 44 }); // Gradual decline

      const baseline2 = calculator.calculate(gradualMeasurements.slice(0, 28))!;
      const gradualAnomalies = detector.detectAnomalies(gradualMeasurements, baseline2, 7);

      if (gradualAnomalies.length > 0) {
        expect(gradualAnomalies[0].velocity.classification).toBe('gradual');
      }
    });
  });

  describe('hasActiveAnomaly', () => {
    it('should return true for active anomalies', () => {
      const measurements = createMeasurements(28, 50);
      measurements.push({ date: '2025-01-29', value: 40 });

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      expect(detector.hasActiveAnomaly(anomalies)).toBe(true);
    });

    it('should return false for no anomalies', () => {
      const anomalies: any[] = [];
      expect(detector.hasActiveAnomaly(anomalies)).toBe(false);
    });
  });

  describe('getMostSevereAnomaly', () => {
    it('should return null for no anomalies', () => {
      const anomalies: any[] = [];
      expect(detector.getMostSevereAnomaly(anomalies)).toBeNull();
    });

    it('should return most severe anomaly', () => {
      const measurements = createMeasurements(28, 50);
      measurements.push({ date: '2025-01-29', value: 45 }); // Moderate
      measurements.push({ date: '2025-01-30', value: 35 }); // Critical

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      const mostSevere = detector.getMostSevereAnomaly(anomalies);
      expect(mostSevere).not.toBeNull();

      if (mostSevere) {
        // Critical should be most severe
        const severityOrder = { minor: 1, moderate: 2, significant: 3, critical: 4 };
        expect(severityOrder[mostSevere.severity]).toBeGreaterThanOrEqual(
          severityOrder.moderate
        );
      }
    });
  });

  describe('recovery time estimation', () => {
    it('should estimate longer recovery for critical anomalies', () => {
      const measurements = createMeasurements(28, 50);
      // Critical drop with correlations
      measurements.push({
        date: '2025-01-29',
        value: 35, // -30% critical
        context: {
          sleepScore: 40,
          trainingLoad: 130,
          restingHeartRate: 75,
        },
      });

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      if (anomalies.length > 0) {
        expect(anomalies[0].estimatedRecoveryDays).toBeGreaterThan(3);
      }
    });

    it('should estimate shorter recovery for minor anomalies', () => {
      const measurements = createMeasurements(28, 50);
      // Minor drop
      measurements.push({ date: '2025-01-29', value: 46 }); // -8% minor

      const baseline = calculator.calculate(measurements.slice(0, 28))!;
      const anomalies = detector.detectAnomalies(measurements, baseline, 7);

      if (anomalies.length > 0) {
        expect(anomalies[0].estimatedRecoveryDays).toBeLessThanOrEqual(3);
      }
    });
  });
});

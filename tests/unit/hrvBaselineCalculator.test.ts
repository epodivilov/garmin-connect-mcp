/**
 * Unit tests for HRV Baseline Calculator
 */

import { describe, it, expect } from 'vitest';
import { HRVBaselineCalculator } from '../../src/services/hrvBaselineCalculator.js';
import type { HRVMeasurement } from '../../src/types/hrv-tracking.js';

describe('HRVBaselineCalculator', () => {
  const calculator = new HRVBaselineCalculator();

  describe('calculate', () => {
    it('should return null for insufficient data', () => {
      const measurements: HRVMeasurement[] = [
        { date: '2025-01-01', value: 50 },
        { date: '2025-01-02', value: 52 },
      ];

      const baseline = calculator.calculate(measurements);
      expect(baseline).toBeNull();
    });

    it('should calculate baseline with minimum data', () => {
      const measurements: HRVMeasurement[] = [];
      // Add 14 days of data
      for (let i = 1; i <= 14; i++) {
        measurements.push({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50 + (i % 5), // Some variation
        });
      }

      const baseline = calculator.calculate(measurements);
      expect(baseline).not.toBeNull();
      expect(baseline!.daysAnalyzed).toBe(14);
    });

    it('should calculate median as baseline', () => {
      const measurements: HRVMeasurement[] = [];
      // Add data with clear median
      for (let i = 1; i <= 15; i++) {
        measurements.push({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50, // All same value
        });
      }

      const baseline = calculator.calculate(measurements);
      expect(baseline!.baseline).toBe(50);
    });

    it('should calculate IQR correctly', () => {
      const measurements: HRVMeasurement[] = [];
      // Create data with known distribution
      const values = [40, 45, 48, 50, 52, 55, 60, 48, 50, 52, 55, 50, 52, 55, 58];

      for (let i = 0; i < values.length; i++) {
        measurements.push({
          date: `2025-01-${String(i + 1).padStart(2, '0')}`,
          value: values[i],
        });
      }

      const baseline = calculator.calculate(measurements);
      expect(baseline!.iqr).toBeGreaterThan(0);
    });

    it('should calculate confidence interval', () => {
      const measurements: HRVMeasurement[] = [];
      for (let i = 1; i <= 20; i++) {
        measurements.push({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50 + Math.random() * 10, // Values between 50-60
        });
      }

      const baseline = calculator.calculate(measurements);
      expect(baseline!.confidenceInterval.lower).toBeLessThan(baseline!.baseline);
      expect(baseline!.confidenceInterval.upper).toBeGreaterThan(baseline!.baseline);
      expect(baseline!.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
    });

    it('should calculate weekly pattern', () => {
      const measurements: HRVMeasurement[] = [];
      // Add 4 weeks of data
      for (let i = 1; i <= 28; i++) {
        measurements.push({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50 + (i % 7), // Pattern by day of week
        });
      }

      const baseline = calculator.calculate(measurements);
      expect(baseline!.weeklyPattern).toHaveLength(7);

      // Each day should have data
      baseline!.weeklyPattern.forEach((pattern) => {
        expect(pattern.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(pattern.dayOfWeek).toBeLessThanOrEqual(6);
        expect(pattern.average).toBeGreaterThan(0);
        expect(pattern.stdDev).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate baseline evolution', () => {
      const measurements: HRVMeasurement[] = [];
      // Add 8 weeks of data
      for (let i = 1; i <= 56; i++) {
        measurements.push({
          date: `2025-${String(Math.floor((i - 1) / 31) + 1).padStart(2, '0')}-${String(((i - 1) % 31) + 1).padStart(2, '0')}`,
          value: 50 + i * 0.1, // Gradually increasing
        });
      }

      const baseline = calculator.calculate(measurements);
      expect(baseline!.evolution.length).toBeGreaterThan(0);

      // Evolution should show increasing trend
      if (baseline!.evolution.length >= 2) {
        const first = baseline!.evolution[0].baseline;
        const last = baseline!.evolution[baseline!.evolution.length - 1].baseline;
        expect(last).toBeGreaterThan(first);
      }
    });
  });

  describe('isWithinNormalRange', () => {
    it('should identify values within range', () => {
      const measurements: HRVMeasurement[] = [];
      for (let i = 1; i <= 20; i++) {
        measurements.push({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50,
        });
      }

      const baseline = calculator.calculate(measurements)!;
      expect(calculator.isWithinNormalRange(50, baseline)).toBe(true);
    });

    it('should identify values outside range', () => {
      const measurements: HRVMeasurement[] = [];
      for (let i = 1; i <= 20; i++) {
        measurements.push({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50,
        });
      }

      const baseline = calculator.calculate(measurements)!;
      // Very low value should be outside range
      expect(calculator.isWithinNormalRange(20, baseline)).toBe(false);
    });
  });

  describe('calculateDeviation', () => {
    it('should calculate positive deviation', () => {
      const deviation = calculator.calculateDeviation(60, 50);
      expect(deviation).toBeCloseTo(20); // 20% increase
    });

    it('should calculate negative deviation', () => {
      const deviation = calculator.calculateDeviation(40, 50);
      expect(deviation).toBeCloseTo(-20); // 20% decrease
    });

    it('should calculate zero deviation', () => {
      const deviation = calculator.calculateDeviation(50, 50);
      expect(deviation).toBe(0);
    });
  });

  describe('getExpectedForDayOfWeek', () => {
    it('should return day-specific expected value', () => {
      const measurements: HRVMeasurement[] = [];
      // Create data starting from a Monday (Jan 6, 2025 is a Monday)
      const startDate = new Date(2025, 0, 6); // Monday Jan 6, 2025

      // Add 4 weeks of data where Mondays are consistently higher
      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 7; day++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + week * 7 + day);
          measurements.push({
            date: date.toISOString().split('T')[0],
            value: day === 0 ? 60 : 50, // Mondays (day 0 in this sequence) higher
          });
        }
      }

      const baseline = calculator.calculate(measurements)!;
      // Jan 6, 2025 is Monday = day 1 in week
      const mondayExpected = calculator.getExpectedForDayOfWeek(1, baseline);
      const tuesdayExpected = calculator.getExpectedForDayOfWeek(2, baseline);

      expect(mondayExpected).toBeGreaterThan(tuesdayExpected);
    });

    it('should fallback to baseline for day with no data', () => {
      const measurements: HRVMeasurement[] = [];
      for (let i = 1; i <= 14; i++) {
        measurements.push({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50,
        });
      }

      const baseline = calculator.calculate(measurements)!;
      const expected = calculator.getExpectedForDayOfWeek(7, baseline); // Invalid day
      expect(expected).toBe(baseline.baseline);
    });
  });
});

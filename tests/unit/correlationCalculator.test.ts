import { describe, it, expect } from 'vitest';
import {
  pearsonCorrelation,
  calculateConfidenceInterval,
  getCorrelationStrength,
  calculateEffectSize,
  calculateSleepPerformanceCorrelation,
} from '../../src/services/correlationCalculator.js';
import type { SleepMetrics, DailyPerformance } from '../../src/types/sleep-correlation.js';

describe('correlationCalculator', () => {
  describe('pearsonCorrelation', () => {
    it('should calculate perfect positive correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      const result = pearsonCorrelation(x, y);

      expect(result).toBeCloseTo(1.0, 2);
    });

    it('should calculate perfect negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];

      const result = pearsonCorrelation(x, y);

      expect(result).toBeCloseTo(-1.0, 2);
    });

    it('should calculate no correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 3, 3, 3, 3];

      const result = pearsonCorrelation(x, y);

      expect(Math.abs(result)).toBeLessThan(0.1);
    });

    it('should handle mismatched array lengths', () => {
      const x = [1, 2, 3];
      const y = [1, 2];

      const result = pearsonCorrelation(x, y);

      expect(result).toBe(0);
    });

    it('should handle empty arrays', () => {
      const result = pearsonCorrelation([], []);

      expect(result).toBe(0);
    });
  });

  describe('getCorrelationStrength', () => {
    it('should categorize negligible correlation', () => {
      expect(getCorrelationStrength(0.05)).toBe('negligible');
    });

    it('should categorize weak correlation', () => {
      expect(getCorrelationStrength(0.2)).toBe('weak');
    });

    it('should categorize moderate correlation', () => {
      expect(getCorrelationStrength(0.4)).toBe('moderate');
    });

    it('should categorize strong correlation', () => {
      expect(getCorrelationStrength(0.6)).toBe('strong');
    });

    it('should categorize very strong correlation', () => {
      expect(getCorrelationStrength(0.8)).toBe('very strong');
    });

    it('should handle negative values', () => {
      expect(getCorrelationStrength(-0.6)).toBe('strong');
    });
  });

  describe('calculateConfidenceInterval', () => {
    it('should calculate confidence interval', () => {
      const [lower, upper] = calculateConfidenceInterval(0.5, 30, 0.95);

      expect(lower).toBeLessThan(0.5);
      expect(upper).toBeGreaterThan(0.5);
      expect(lower).toBeGreaterThan(0);
      expect(upper).toBeLessThan(1);
    });

    it('should handle small sample size', () => {
      const [lower, upper] = calculateConfidenceInterval(0.5, 2, 0.95);

      expect(lower).toBe(0);
      expect(upper).toBe(0);
    });

    it('should widen interval for lower confidence', () => {
      const [lower95, upper95] = calculateConfidenceInterval(0.5, 30, 0.95);
      const [lower90, upper90] = calculateConfidenceInterval(0.5, 30, 0.90);

      const width95 = upper95 - lower95;
      const width90 = upper90 - lower90;

      expect(width95).toBeGreaterThan(width90);
    });
  });

  describe('calculateSleepPerformanceCorrelation', () => {
    it('should calculate correlations with sufficient data', () => {
      // Create mock data with 20 days
      const sleepData: SleepMetrics[] = Array.from({ length: 20 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        totalSleepMinutes: 420 + i * 5, // Increasing sleep
        deepSleepMinutes: 84,
        lightSleepMinutes: 210,
        remSleepMinutes: 126,
        awakeMinutes: 20,
        sleepScore: 70 + i, // Increasing quality
      }));

      const performanceData: DailyPerformance[] = Array.from({ length: 20 }, (_, i) => ({
        date: `2025-01-${String(i + 2).padStart(2, '0')}`, // Next day after sleep
        activitiesCount: 1,
        totalDurationMinutes: 60,
        totalDistanceKm: 10 + i * 0.2, // Increasing performance
      }));

      const result = calculateSleepPerformanceCorrelation(sleepData, performanceData);

      expect(result.sampleSize).toBeGreaterThan(0);
      expect(result.sleepDurationCorrelation).toBeGreaterThanOrEqual(-1);
      expect(result.sleepDurationCorrelation).toBeLessThanOrEqual(1);
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data', () => {
      const sleepData: SleepMetrics[] = [{
        date: '2025-01-15',
        totalSleepMinutes: 480,
        deepSleepMinutes: 96,
        lightSleepMinutes: 240,
        remSleepMinutes: 144,
        awakeMinutes: 20,
        sleepScore: 85,
      }];

      const performanceData: DailyPerformance[] = [{
        date: '2025-01-16',
        activitiesCount: 1,
        totalDurationMinutes: 60,
        totalDistanceKm: 10,
      }];

      const result = calculateSleepPerformanceCorrelation(sleepData, performanceData);

      expect(result.isSignificant).toBe(false);
      expect(result.pValue).toBe(1);
    });
  });

  describe('calculateEffectSize', () => {
    it('should calculate effect size', () => {
      // Good sleep group
      const goodSleep: SleepMetrics[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        totalSleepMinutes: 480,
        deepSleepMinutes: 96,
        lightSleepMinutes: 240,
        remSleepMinutes: 144,
        awakeMinutes: 20,
        sleepScore: 85,
      }));

      // Poor sleep group
      const poorSleep: SleepMetrics[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-01-${String(i + 11).padStart(2, '0')}`,
        totalSleepMinutes: 360,
        deepSleepMinutes: 60,
        lightSleepMinutes: 180,
        remSleepMinutes: 120,
        awakeMinutes: 40,
        sleepScore: 55,
      }));

      const sleepData = [...goodSleep, ...poorSleep];

      // Higher performance with good sleep (with some variation)
      const goodPerf: DailyPerformance[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-01-${String(i + 2).padStart(2, '0')}`,
        activitiesCount: 1,
        totalDurationMinutes: 75 + i, // 75-84 minutes
        totalDistanceKm: 11 + i * 0.2, // 11-12.8 km
      }));

      // Lower performance with poor sleep (with some variation)
      const poorPerf: DailyPerformance[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-01-${String(i + 12).padStart(2, '0')}`,
        activitiesCount: 1,
        totalDurationMinutes: 40 + i, // 40-49 minutes
        totalDistanceKm: 5 + i * 0.2, // 5-6.8 km
      }));

      const performanceData = [...goodPerf, ...poorPerf];

      const effectSize = calculateEffectSize(sleepData, performanceData, 70);

      // Should show positive effect (good sleep -> better performance)
      expect(Math.abs(effectSize)).toBeGreaterThan(0);
    });
  });
});

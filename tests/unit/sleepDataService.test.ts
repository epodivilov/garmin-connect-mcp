import { describe, it, expect } from 'vitest';
import {
  normalizeSleepData,
  isValidSleepData,
  calculateSleepStagePercentages,
  calculateAverageSleepMetrics,
} from '../../src/services/sleepDataService.js';
import type { SleepMetrics } from '../../src/types/sleep-correlation.js';

describe('sleepDataService', () => {
  describe('normalizeSleepData', () => {
    it('should normalize valid sleep data', () => {
      const rawData = {
        dailySleepDTO: {
          deepSleepSeconds: 7200, // 2 hours
          lightSleepSeconds: 18000, // 5 hours
          remSleepSeconds: 5400, // 1.5 hours
          awakeSleepSeconds: 1200, // 20 minutes
          sleepScores: { overall: { value: 85 } },
        },
      };

      const result = normalizeSleepData(rawData, '2025-01-15');

      expect(result).toBeDefined();
      expect(result?.totalSleepMinutes).toBe(510); // 8.5 hours
      expect(result?.deepSleepMinutes).toBe(120);
      expect(result?.lightSleepMinutes).toBe(300);
      expect(result?.remSleepMinutes).toBe(90);
      expect(result?.awakeMinutes).toBe(20);
      expect(result?.sleepScore).toBe(85);
    });

    it('should return null for invalid data', () => {
      const result = normalizeSleepData({}, '2025-01-15');
      expect(result).toBeNull();
    });

    it('should calculate sleep score if not provided', () => {
      const rawData = {
        dailySleepDTO: {
          deepSleepSeconds: 7200,
          lightSleepSeconds: 18000,
          remSleepSeconds: 5400,
          awakeSleepSeconds: 600,
        },
      };

      const result = normalizeSleepData(rawData, '2025-01-15');

      expect(result).toBeDefined();
      expect(result?.sleepScore).toBeGreaterThan(0);
      expect(result?.sleepScore).toBeLessThanOrEqual(100);
    });
  });

  describe('isValidSleepData', () => {
    it('should validate good sleep data', () => {
      const metrics: SleepMetrics = {
        date: '2025-01-15',
        totalSleepMinutes: 480,
        deepSleepMinutes: 96,
        lightSleepMinutes: 240,
        remSleepMinutes: 144,
        awakeMinutes: 20,
        sleepScore: 85,
      };

      expect(isValidSleepData(metrics)).toBe(true);
    });

    it('should reject sleep < 60 minutes', () => {
      const metrics: SleepMetrics = {
        date: '2025-01-15',
        totalSleepMinutes: 45,
        deepSleepMinutes: 10,
        lightSleepMinutes: 25,
        remSleepMinutes: 10,
        awakeMinutes: 5,
        sleepScore: 50,
      };

      expect(isValidSleepData(metrics)).toBe(false);
    });

    it('should reject inconsistent stage totals', () => {
      const metrics: SleepMetrics = {
        date: '2025-01-15',
        totalSleepMinutes: 480,
        deepSleepMinutes: 100,
        lightSleepMinutes: 200,
        remSleepMinutes: 100,
        awakeMinutes: 20,
        sleepScore: 85,
      };

      expect(isValidSleepData(metrics)).toBe(false);
    });

    it('should reject invalid sleep score', () => {
      const metrics: SleepMetrics = {
        date: '2025-01-15',
        totalSleepMinutes: 480,
        deepSleepMinutes: 96,
        lightSleepMinutes: 240,
        remSleepMinutes: 144,
        awakeMinutes: 20,
        sleepScore: 150, // Invalid
      };

      expect(isValidSleepData(metrics)).toBe(false);
    });
  });

  describe('calculateSleepStagePercentages', () => {
    it('should calculate correct percentages', () => {
      const metrics: SleepMetrics = {
        date: '2025-01-15',
        totalSleepMinutes: 480,
        deepSleepMinutes: 96, // 20%
        lightSleepMinutes: 240, // 50%
        remSleepMinutes: 144, // 30%
        awakeMinutes: 20,
        sleepScore: 85,
      };

      const result = calculateSleepStagePercentages(metrics);

      expect(result.deepPercent).toBeCloseTo(20, 1);
      expect(result.lightPercent).toBeCloseTo(50, 1);
      expect(result.remPercent).toBeCloseTo(30, 1);
    });

    it('should handle zero sleep', () => {
      const metrics: SleepMetrics = {
        date: '2025-01-15',
        totalSleepMinutes: 0,
        deepSleepMinutes: 0,
        lightSleepMinutes: 0,
        remSleepMinutes: 0,
        awakeMinutes: 0,
        sleepScore: 0,
      };

      const result = calculateSleepStagePercentages(metrics);

      expect(result.deepPercent).toBe(0);
      expect(result.lightPercent).toBe(0);
      expect(result.remPercent).toBe(0);
      expect(result.awakePercent).toBe(0);
    });
  });

  describe('calculateAverageSleepMetrics', () => {
    it('should calculate averages correctly', () => {
      const sleepData: SleepMetrics[] = [
        {
          date: '2025-01-15',
          totalSleepMinutes: 480,
          deepSleepMinutes: 96,
          lightSleepMinutes: 240,
          remSleepMinutes: 144,
          awakeMinutes: 20,
          sleepScore: 85,
        },
        {
          date: '2025-01-16',
          totalSleepMinutes: 420,
          deepSleepMinutes: 84,
          lightSleepMinutes: 210,
          remSleepMinutes: 126,
          awakeMinutes: 30,
          sleepScore: 75,
        },
      ];

      const result = calculateAverageSleepMetrics(sleepData);

      expect(result.avgDuration).toBe(450);
      expect(result.avgSleepScore).toBe(80);
      expect(result.avgDeepPercent).toBeCloseTo(20, 0);
      expect(result.avgRemPercent).toBeCloseTo(30, 0);
    });

    it('should handle empty array', () => {
      const result = calculateAverageSleepMetrics([]);

      expect(result.avgDuration).toBe(0);
      expect(result.avgSleepScore).toBe(0);
    });
  });
});

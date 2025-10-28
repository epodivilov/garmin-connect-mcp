/**
 * Unit tests for Readiness Scorer
 */

import { describe, it, expect } from 'vitest';
import { ReadinessScorer } from '../../src/services/readinessScorer.js';
import type { ReadinessInput } from '../../src/types/readiness.js';

describe('ReadinessScorer', () => {
  const scorer = new ReadinessScorer();

  describe('calculate', () => {
    it('should calculate readiness with all metrics', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 55,
        hrvBaseline: 50,
        sleepScore: 80,
        tsb: 5,
        restingHeartRate: 55,
        restingHeartRateBaseline: 60,
        bodyBattery: 75,
      };

      const readiness = scorer.calculate(input);

      expect(readiness.overall).toBeGreaterThan(0);
      expect(readiness.overall).toBeLessThanOrEqual(100);
      expect(readiness.date).toBe('2025-01-15');
      expect(readiness.recommendation).toBeDefined();
      expect(readiness.factors.length).toBeGreaterThan(0);
    });

    it('should handle missing HRV', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        sleepScore: 80,
        restingHeartRate: 55,
        bodyBattery: 75,
      };

      const readiness = scorer.calculate(input);

      expect(readiness.metrics.hrv.value).toBeUndefined();
      expect(readiness.overall).toBeGreaterThan(0);
    });

    it('should handle missing sleep', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 55,
        hrvBaseline: 50,
        restingHeartRate: 55,
        bodyBattery: 75,
      };

      const readiness = scorer.calculate(input);

      expect(readiness.metrics.sleep.value).toBeUndefined();
      expect(readiness.overall).toBeGreaterThan(0);
    });

    it('should redistribute weights for missing metrics', () => {
      const inputAllMetrics: ReadinessInput = {
        date: '2025-01-15',
        hrv: 55,
        hrvBaseline: 50,
        sleepScore: 80,
        tsb: 5,
        restingHeartRate: 55,
        restingHeartRateBaseline: 60,
        bodyBattery: 75,
      };

      const inputMissingMetrics: ReadinessInput = {
        date: '2025-01-15',
        hrv: 55,
        hrvBaseline: 50,
        sleepScore: 80,
      };

      const allMetricsResult = scorer.calculate(inputAllMetrics);
      const missingMetricsResult = scorer.calculate(inputMissingMetrics);

      // With missing metrics, available metrics should have higher weights
      expect(missingMetricsResult.metrics.hrv.weight).toBeGreaterThan(
        allMetricsResult.metrics.hrv.weight
      );
    });
  });

  describe('HRV scoring', () => {
    it('should score high for HRV above baseline', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 60, // +20% above baseline
        hrvBaseline: 50,
        sleepScore: 80,
        bodyBattery: 75,
      };

      const readiness = scorer.calculate(input);
      expect(readiness.metrics.hrv.score).toBeGreaterThan(85);
    });

    it('should score low for HRV below baseline', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 40, // -20% below baseline
        hrvBaseline: 50,
        sleepScore: 80,
        bodyBattery: 75,
      };

      const readiness = scorer.calculate(input);
      expect(readiness.metrics.hrv.score).toBeLessThan(50);
    });
  });

  describe('TSB scoring', () => {
    it('should score high for positive TSB', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 55,
        hrvBaseline: 50,
        sleepScore: 80,
        tsb: 15, // Very fresh
      };

      const readiness = scorer.calculate(input);
      expect(readiness.metrics.trainingStressBalance.score).toBeGreaterThan(85);
    });

    it('should score low for negative TSB', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 55,
        hrvBaseline: 50,
        sleepScore: 80,
        tsb: -25, // Fatigued
      };

      const readiness = scorer.calculate(input);
      expect(readiness.metrics.trainingStressBalance.score).toBeLessThan(50);
    });
  });

  describe('recommendations', () => {
    it('should recommend high training for optimal readiness', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 60,
        hrvBaseline: 50,
        sleepScore: 90,
        tsb: 10,
        restingHeartRate: 50,
        restingHeartRateBaseline: 60,
        bodyBattery: 85,
      };

      const readiness = scorer.calculate(input);
      expect(readiness.overall).toBeGreaterThan(80);
      expect(readiness.recommendation.level).toBe('high');
      expect(readiness.recommendation.intensityGuidance).toBeGreaterThan(90);
    });

    it('should recommend rest for poor readiness', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 35,
        hrvBaseline: 50,
        sleepScore: 45,
        tsb: -30,
        restingHeartRate: 75,
        restingHeartRateBaseline: 60,
        bodyBattery: 25,
      };

      const readiness = scorer.calculate(input);
      expect(readiness.overall).toBeLessThan(50);
      expect(['rest', 'light']).toContain(readiness.recommendation.level);
      expect(readiness.recommendation.intensityGuidance).toBeLessThan(50);
    });

    it('should recommend moderate training for moderate readiness', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 48,
        hrvBaseline: 50,
        sleepScore: 70,
        tsb: 0,
        restingHeartRate: 60,
        restingHeartRateBaseline: 60,
        bodyBattery: 60,
      };

      const readiness = scorer.calculate(input);
      expect(readiness.overall).toBeGreaterThan(50);
      expect(readiness.overall).toBeLessThan(75);
      expect(['moderate', 'normal']).toContain(readiness.recommendation.level);
    });
  });

  describe('factors identification', () => {
    it('should identify positive factors', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 60,
        hrvBaseline: 50,
        sleepScore: 90,
        bodyBattery: 85,
      };

      const readiness = scorer.calculate(input);
      const positiveFactors = readiness.factors.filter((f) => f.type === 'positive');

      expect(positiveFactors.length).toBeGreaterThan(0);
    });

    it('should identify negative factors', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 35,
        hrvBaseline: 50,
        sleepScore: 45,
        bodyBattery: 25,
      };

      const readiness = scorer.calculate(input);
      const negativeFactors = readiness.factors.filter((f) => f.type === 'negative');

      expect(negativeFactors.length).toBeGreaterThan(0);
    });

    it('should sort factors by impact', () => {
      const input: ReadinessInput = {
        date: '2025-01-15',
        hrv: 35,
        hrvBaseline: 50,
        sleepScore: 45,
        tsb: -25,
        bodyBattery: 25,
      };

      const readiness = scorer.calculate(input);

      // Factors should be sorted by impact descending
      for (let i = 1; i < readiness.factors.length; i++) {
        expect(readiness.factors[i - 1].impact).toBeGreaterThanOrEqual(
          readiness.factors[i].impact
        );
      }
    });
  });

  describe('metric status classification', () => {
    it('should classify HRV status correctly', () => {
      const testCases = [
        { hrv: 60, hrvBaseline: 50, expectedStatus: 'optimal' }, // +20% = 120 score (clamped to 100) -> optimal >= 85
        { hrv: 51, hrvBaseline: 50, expectedStatus: 'good' }, // +2% = 84 score -> good: 70-84
        { hrv: 45, hrvBaseline: 50, expectedStatus: 'fair' }, // -10% = 60 score -> fair: 50-69
        { hrv: 35, hrvBaseline: 50, expectedStatus: 'poor' }, // -30% = 20 score -> poor < 50
      ];

      for (const testCase of testCases) {
        const input: ReadinessInput = {
          date: '2025-01-15',
          hrv: testCase.hrv,
          hrvBaseline: testCase.hrvBaseline,
        };

        const readiness = scorer.calculate(input);
        expect(readiness.metrics.hrv.status).toBe(testCase.expectedStatus);
      }
    });

    it('should classify sleep status correctly', () => {
      const testCases = [
        { sleepScore: 85, expectedStatus: 'optimal' },
        { sleepScore: 70, expectedStatus: 'good' },
        { sleepScore: 55, expectedStatus: 'fair' },
        { sleepScore: 40, expectedStatus: 'poor' },
      ];

      for (const testCase of testCases) {
        const input: ReadinessInput = {
          date: '2025-01-15',
          sleepScore: testCase.sleepScore,
        };

        const readiness = scorer.calculate(input);
        expect(readiness.metrics.sleep.status).toBe(testCase.expectedStatus);
      }
    });
  });
});

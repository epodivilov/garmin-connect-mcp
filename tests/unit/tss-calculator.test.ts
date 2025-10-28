import { describe, it, expect } from 'vitest';
import {
  calculateTSSFromHR,
  estimateTSSFromDuration,
  calculateActivityTSS,
  aggregateDailyTSS,
  calculateCTL,
  calculateATL,
  calculateTSB,
  determineFormStatus,
  generateRecommendation,
  calculateTrainingStressBalance,
  fillMissingDates
} from '../../src/utils/tss-calculator.js';
import { ActivityTSS, DailyTSS } from '../../src/types/training-stress.js';

describe('TSS Calculator', () => {
  describe('calculateTSSFromHR', () => {
    it('should calculate TSS using TRIMP method', () => {
      // 1 hour at average HR 150, resting HR 50, threshold HR 170, max HR 185
      const result = calculateTSSFromHR(3600, 150, 50, 170, 185);

      // IF = (150 - 50) / (170 - 50) = 100 / 120 = 0.833
      // TSS = 1 * 0.833^2 * 100 = 69.4
      expect(result.tss).toBeCloseTo(69, 0);
      expect(result.intensityFactor).toBeCloseTo(0.833, 2);
      expect(result.confidence).toBe('high');
    });

    it('should estimate threshold HR when not provided', () => {
      // Threshold HR should be 90% of max HR (185 * 0.9 = 166.5)
      const result = calculateTSSFromHR(3600, 150, 50, undefined, 185);

      // IF = (150 - 50) / (166.5 - 50) = 100 / 116.5 = 0.858
      expect(result.intensityFactor).toBeCloseTo(0.858, 2);
      expect(result.confidence).toBe('medium'); // Medium because threshold is estimated
    });

    it('should return zero TSS for invalid inputs', () => {
      expect(calculateTSSFromHR(0, 150, 50, 170, 185).tss).toBe(0);
      expect(calculateTSSFromHR(3600, 0, 50, 170, 185).tss).toBe(0);
      expect(calculateTSSFromHR(3600, 150, 150, 150, 185).tss).toBe(0); // Invalid HR range
    });

    it('should return low confidence for questionable HR data', () => {
      // Average HR below resting HR
      const result1 = calculateTSSFromHR(3600, 40, 50, 170, 185);
      expect(result1.confidence).toBe('low');

      // Average HR way above max HR
      const result2 = calculateTSSFromHR(3600, 210, 50, 170, 185);
      expect(result2.confidence).toBe('low');
    });

    it('should handle different durations correctly', () => {
      // 30 minutes should give approximately half the TSS of 1 hour at same intensity
      const result1hr = calculateTSSFromHR(3600, 150, 50, 170, 185);
      const result30min = calculateTSSFromHR(1800, 150, 50, 170, 185);

      // Allow some rounding difference since both values are rounded
      expect(Math.abs(result30min.tss - result1hr.tss / 2)).toBeLessThanOrEqual(1);
    });

    it('should handle very high intensity correctly', () => {
      // At threshold HR, IF should be 1.0
      const result = calculateTSSFromHR(3600, 170, 50, 170, 185);

      expect(result.intensityFactor).toBeCloseTo(1.0, 2);
      expect(result.tss).toBeCloseTo(100, 0); // 1 hour at threshold = 100 TSS
    });
  });

  describe('estimateTSSFromDuration', () => {
    it('should estimate TSS for running', () => {
      // 1 hour running = ~70 TSS
      const result = estimateTSSFromDuration(3600, 'running');
      expect(result.tss).toBe(70);
      expect(result.confidence).toBe('low');
    });

    it('should estimate TSS for cycling', () => {
      // 1 hour cycling = ~60 TSS
      const result = estimateTSSFromDuration(3600, 'cycling');
      expect(result.tss).toBe(60);
    });

    it('should estimate TSS for walking', () => {
      // 1 hour walking = ~30 TSS
      const result = estimateTSSFromDuration(3600, 'walking');
      expect(result.tss).toBe(30);
    });

    it('should use default for unknown activity types', () => {
      // Unknown activity type should use 50 TSS/hour
      const result = estimateTSSFromDuration(3600, 'unknown_activity');
      expect(result.tss).toBe(50);
    });

    it('should handle different durations', () => {
      // 30 minutes = half the TSS
      const result = estimateTSSFromDuration(1800, 'running');
      expect(result.tss).toBe(35);
    });

    it('should not return negative TSS', () => {
      const result = estimateTSSFromDuration(0, 'running');
      expect(result.tss).toBe(0);
    });
  });

  describe('calculateActivityTSS', () => {
    it('should use HR-based calculation when HR data is available', () => {
      const activity = {
        activityId: 123,
        activityName: 'Morning Run',
        activityType: { typeKey: 'running' },
        startTimeLocal: '2025-01-10T08:00:00',
        duration: 3600,
        averageHR: 150,
        maxHR: 175
      };

      const result = calculateActivityTSS(activity, { restingHR: 50, maxHR: 185 });

      expect(result.activityId).toBe(123);
      expect(result.activityName).toBe('Morning Run');
      expect(result.calculationMethod).toBe('hr-trimp');
      expect(result.tss).toBeGreaterThan(0);
      expect(result.details.averageHR).toBe(150);
    });

    it('should fall back to duration estimation when HR data is unavailable', () => {
      const activity = {
        activityId: 124,
        activityName: 'Evening Ride',
        activityType: { typeKey: 'cycling' },
        startTimeLocal: '2025-01-10T18:00:00',
        duration: 3600
      };

      const result = calculateActivityTSS(activity);

      expect(result.calculationMethod).toBe('duration-estimate');
      expect(result.confidence).toBe('low');
      expect(result.tss).toBe(60); // Cycling estimate
    });

    it('should handle activity with zero HR', () => {
      const activity = {
        activityId: 125,
        activityName: 'Test',
        activityType: { typeKey: 'running' },
        startTimeLocal: '2025-01-10T12:00:00',
        duration: 3600,
        averageHR: 0
      };

      const result = calculateActivityTSS(activity);

      expect(result.calculationMethod).toBe('duration-estimate');
      expect(result.tss).toBe(70); // Running estimate
    });

    it('should use custom HR thresholds', () => {
      const activity = {
        activityId: 126,
        activityName: 'Custom HR Run',
        activityType: { typeKey: 'running' },
        startTimeLocal: '2025-01-10T10:00:00',
        duration: 3600,
        averageHR: 160
      };

      const result = calculateActivityTSS(activity, {
        restingHR: 55,
        maxHR: 190,
        thresholdHR: 175
      });

      expect(result.details.restingHR).toBe(55);
      expect(result.details.thresholdHR).toBe(175);
      expect(result.calculationMethod).toBe('hr-trimp');
    });
  });

  describe('aggregateDailyTSS', () => {
    it('should aggregate activities by date', () => {
      const activities: ActivityTSS[] = [
        {
          activityId: 1,
          activityName: 'Run 1',
          activityType: 'running',
          startTimeLocal: '2025-01-10T08:00:00',
          duration: 3600,
          tss: 70,
          calculationMethod: 'hr-trimp',
          confidence: 'high',
          details: {}
        },
        {
          activityId: 2,
          activityName: 'Run 2',
          activityType: 'running',
          startTimeLocal: '2025-01-10T18:00:00',
          duration: 1800,
          tss: 35,
          calculationMethod: 'hr-trimp',
          confidence: 'high',
          details: {}
        },
        {
          activityId: 3,
          activityName: 'Ride',
          activityType: 'cycling',
          startTimeLocal: '2025-01-11T10:00:00',
          duration: 3600,
          tss: 60,
          calculationMethod: 'duration-estimate',
          confidence: 'low',
          details: {}
        }
      ];

      const result = aggregateDailyTSS(activities);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2025-01-10');
      expect(result[0].totalTSS).toBe(105); // 70 + 35
      expect(result[0].activityCount).toBe(2);
      expect(result[1].date).toBe('2025-01-11');
      expect(result[1].totalTSS).toBe(60);
      expect(result[1].activityCount).toBe(1);
    });

    it('should sort by date', () => {
      const activities: ActivityTSS[] = [
        {
          activityId: 1,
          activityName: 'Late',
          activityType: 'running',
          startTimeLocal: '2025-01-12T10:00:00',
          duration: 3600,
          tss: 70,
          calculationMethod: 'hr-trimp',
          confidence: 'high',
          details: {}
        },
        {
          activityId: 2,
          activityName: 'Early',
          activityType: 'running',
          startTimeLocal: '2025-01-10T10:00:00',
          duration: 3600,
          tss: 60,
          calculationMethod: 'hr-trimp',
          confidence: 'high',
          details: {}
        }
      ];

      const result = aggregateDailyTSS(activities);

      expect(result[0].date).toBe('2025-01-10');
      expect(result[1].date).toBe('2025-01-12');
    });

    it('should handle empty activity list', () => {
      const result = aggregateDailyTSS([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateCTL', () => {
    it('should calculate CTL using EWMA', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 100, activityCount: 1, activities: [] },
        { date: '2025-01-02', totalTSS: 80, activityCount: 1, activities: [] },
        { date: '2025-01-03', totalTSS: 90, activityCount: 1, activities: [] }
      ];

      const ctl = calculateCTL(dailyTSS, 0);

      // CTL should gradually increase
      expect(ctl).toBeGreaterThan(0);
      expect(ctl).toBeLessThan(100); // Should be less than a single day's TSS
    });

    it('should continue from previous CTL', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 100, activityCount: 1, activities: [] }
      ];

      const ctl = calculateCTL(dailyTSS, 50);

      // Should be influenced by previous CTL of 50
      expect(ctl).toBeGreaterThan(50);
      expect(ctl).toBeLessThan(100);
    });

    it('should handle empty daily TSS', () => {
      const ctl = calculateCTL([], 40);
      expect(ctl).toBe(40); // Should return previous CTL unchanged
    });
  });

  describe('calculateATL', () => {
    it('should calculate ATL using EWMA with shorter time constant', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 100, activityCount: 1, activities: [] },
        { date: '2025-01-02', totalTSS: 80, activityCount: 1, activities: [] },
        { date: '2025-01-03', totalTSS: 90, activityCount: 1, activities: [] }
      ];

      const atl = calculateATL(dailyTSS, 0);
      const ctl = calculateCTL(dailyTSS, 0);

      // ATL should respond faster than CTL (shorter time constant)
      expect(atl).toBeGreaterThan(ctl);
    });

    it('should continue from previous ATL', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 100, activityCount: 1, activities: [] }
      ];

      const atl = calculateATL(dailyTSS, 30);

      expect(atl).toBeGreaterThan(30);
      expect(atl).toBeLessThan(100);
    });
  });

  describe('calculateTSB', () => {
    it('should calculate TSB as CTL minus ATL', () => {
      const tsb = calculateTSB(60, 40);
      expect(tsb).toBe(20); // 60 - 40 = 20
    });

    it('should handle negative TSB', () => {
      const tsb = calculateTSB(40, 60);
      expect(tsb).toBe(-20); // 40 - 60 = -20
    });

    it('should round to one decimal', () => {
      const tsb = calculateTSB(60.55, 40.33);
      expect(tsb).toBe(20.2);
    });
  });

  describe('determineFormStatus', () => {
    it('should identify fresh status', () => {
      const result = determineFormStatus(30);
      expect(result.status).toBe('fresh');
      expect(result.description).toContain('detraining');
    });

    it('should identify optimal status', () => {
      const result = determineFormStatus(15);
      expect(result.status).toBe('optimal');
      expect(result.description).toContain('Peak readiness');
    });

    it('should identify neutral status', () => {
      const result = determineFormStatus(0);
      expect(result.status).toBe('neutral');
      expect(result.description).toContain('Maintenance');
    });

    it('should identify fatigued status', () => {
      const result = determineFormStatus(-20);
      expect(result.status).toBe('fatigued');
      expect(result.description).toContain('Productive');
    });

    it('should identify overreached status', () => {
      const result = determineFormStatus(-40);
      expect(result.status).toBe('overreached');
      expect(result.description).toContain('risk');
    });

    it('should handle boundary values correctly', () => {
      expect(determineFormStatus(26).status).toBe('fresh');
      expect(determineFormStatus(25).status).toBe('optimal');
      expect(determineFormStatus(10).status).toBe('optimal');
      expect(determineFormStatus(9.9).status).toBe('neutral');
      expect(determineFormStatus(-10).status).toBe('neutral');
      expect(determineFormStatus(-10.1).status).toBe('fatigued');
      expect(determineFormStatus(-30).status).toBe('fatigued');
      expect(determineFormStatus(-30.1).status).toBe('overreached');
    });
  });

  describe('generateRecommendation', () => {
    it('should recommend hard training for fresh status', () => {
      const rec = generateRecommendation(30, 60, 30);
      expect(rec).toContain('hard training');
      expect(rec.toLowerCase()).toContain('race');
    });

    it('should recommend race for optimal status', () => {
      const rec = generateRecommendation(15, 60, 45);
      expect(rec.toLowerCase()).toContain('race');
    });

    it('should recommend maintenance for neutral status', () => {
      const rec = generateRecommendation(0, 60, 60);
      expect(rec).toContain('Maintain');
      expect(rec).toContain('balanced');
    });

    it('should warn about high fatigue when ATL >> CTL', () => {
      const rec = generateRecommendation(-20, 40, 100);
      expect(rec).toContain('High fatigue');
      expect(rec).toContain('recovery');
    });

    it('should recommend rest for overreached status', () => {
      const rec = generateRecommendation(-35, 60, 95);
      expect(rec).toContain('WARNING');
      expect(rec).toContain('rest');
      expect(rec).toContain('overtraining');
    });
  });

  describe('calculateTrainingStressBalance', () => {
    it('should calculate complete training stress balance', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 80, activityCount: 1, activities: [] },
        { date: '2025-01-02', totalTSS: 90, activityCount: 1, activities: [] },
        { date: '2025-01-03', totalTSS: 70, activityCount: 1, activities: [] },
        { date: '2025-01-04', totalTSS: 85, activityCount: 1, activities: [] },
        { date: '2025-01-05', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-06', totalTSS: 100, activityCount: 1, activities: [] },
        { date: '2025-01-07', totalTSS: 95, activityCount: 1, activities: [] }
      ];

      const targetDate = new Date('2025-01-07');
      const result = calculateTrainingStressBalance(dailyTSS, targetDate);

      expect(result.current).toBeDefined();
      expect(result.current.date).toBe('2025-01-07');
      expect(result.current.ctl).toBeGreaterThan(0);
      expect(result.current.atl).toBeGreaterThan(0);
      expect(result.current.tsb).toBeDefined();
      expect(result.current.formStatus).toBeDefined();
      expect(result.current.recommendation).toBeDefined();
    });

    it('should include time series when requested', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 80, activityCount: 1, activities: [] },
        { date: '2025-01-02', totalTSS: 90, activityCount: 1, activities: [] },
        { date: '2025-01-03', totalTSS: 70, activityCount: 1, activities: [] }
      ];

      const result = calculateTrainingStressBalance(
        dailyTSS,
        new Date('2025-01-03'),
        { includeTimeSeries: true }
      );

      expect(result.timeSeries).toHaveLength(3);
      expect(result.timeSeries[0].date).toBe('2025-01-01');
      expect(result.timeSeries[2].date).toBe('2025-01-03');
    });

    it('should calculate trends when enough history is available', () => {
      const dailyTSS: DailyTSS[] = [];
      const startDate = new Date('2025-01-01');

      // Create 14 days of data
      for (let i = 0; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dailyTSS.push({
          date: date.toISOString().split('T')[0],
          totalTSS: 80,
          activityCount: 1,
          activities: []
        });
      }

      const result = calculateTrainingStressBalance(
        dailyTSS,
        new Date('2025-01-14'),
        { lookbackDays: 7 }
      );

      expect(result.current.trends).toBeDefined();
      expect(result.current.trends?.ctlChange).toBeDefined();
      expect(result.current.trends?.atlChange).toBeDefined();
      expect(result.current.trends?.tsbChange).toBeDefined();
      expect(result.current.trends?.tsbTrend).toBeDefined();
    });

    it('should handle no data gracefully', () => {
      const result = calculateTrainingStressBalance([], new Date('2025-01-10'));

      expect(result.current.ctl).toBe(0);
      expect(result.current.atl).toBe(0);
      expect(result.current.tsb).toBe(0);
      expect(result.current.recommendation).toContain('No training data');
    });
  });

  describe('fillMissingDates', () => {
    it('should fill missing dates with zero TSS', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 80, activityCount: 1, activities: [] },
        { date: '2025-01-03', totalTSS: 90, activityCount: 1, activities: [] }
      ];

      const result = fillMissingDates(
        dailyTSS,
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2025-01-01');
      expect(result[0].totalTSS).toBe(80);
      expect(result[1].date).toBe('2025-01-02');
      expect(result[1].totalTSS).toBe(0);
      expect(result[1].activityCount).toBe(0);
      expect(result[2].date).toBe('2025-01-03');
      expect(result[2].totalTSS).toBe(90);
    });

    it('should handle continuous dates', () => {
      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-01', totalTSS: 80, activityCount: 1, activities: [] },
        { date: '2025-01-02', totalTSS: 90, activityCount: 1, activities: [] },
        { date: '2025-01-03', totalTSS: 70, activityCount: 1, activities: [] }
      ];

      const result = fillMissingDates(
        dailyTSS,
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result).toHaveLength(3);
      // All original data should be preserved
      expect(result[0].totalTSS).toBe(80);
      expect(result[1].totalTSS).toBe(90);
      expect(result[2].totalTSS).toBe(70);
    });

    it('should handle empty input', () => {
      const result = fillMissingDates(
        [],
        new Date('2025-01-01'),
        new Date('2025-01-03')
      );

      expect(result).toHaveLength(3);
      result.forEach(day => {
        expect(day.totalTSS).toBe(0);
        expect(day.activityCount).toBe(0);
      });
    });
  });
});

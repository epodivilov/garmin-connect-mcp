import { describe, it, expect } from 'vitest';
import { aggregateWeeklyMetrics } from '../../src/services/weeklyAggregator.js';
import type { DailyTSS } from '../../src/types/training-stress.js';

describe('Weekly Aggregator', () => {
  describe('aggregateWeeklyMetrics', () => {
    it('should aggregate activities into weekly metrics', () => {
      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-06T08:00:00', // Monday, Week 1
          duration: 3600,
          distance: 10000,
          elevationGain: 100,
          averageHR: 150
        },
        {
          activityId: 2,
          activityType: { typeKey: 'cycling' },
          startTimeLocal: '2025-01-08T10:00:00', // Wednesday, Week 1
          duration: 7200,
          distance: 40000,
          elevationGain: 300,
          averageHR: 140
        },
        {
          activityId: 3,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-13T08:00:00', // Monday, Week 2
          duration: 3600,
          distance: 12000,
          elevationGain: 150,
          averageHR: 155
        }
      ];

      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-06', totalTSS: 70, activityCount: 1, activities: [] },
        { date: '2025-01-07', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-08', totalTSS: 120, activityCount: 1, activities: [] },
        { date: '2025-01-09', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-10', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-11', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-12', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-13', totalTSS: 75, activityCount: 1, activities: [] }
      ];

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      expect(result).toHaveLength(2);

      // Week 1
      expect(result[0].activityCount).toBe(2);
      expect(result[0].totalDistance).toBe(50000); // 10km + 40km
      expect(result[0].totalDuration).toBe(10800); // 1h + 2h
      expect(result[0].totalElevation).toBe(400); // 100 + 300
      expect(result[0].totalTSS).toBe(190); // 70 + 120

      // Week 2
      expect(result[1].activityCount).toBe(1);
      expect(result[1].totalDistance).toBe(12000);
      expect(result[1].totalDuration).toBe(3600);
      expect(result[1].totalTSS).toBe(75);
    });

    it('should calculate proper CTL/ATL/TSB using EWMA', () => {
      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-06T08:00:00',
          duration: 3600,
          distance: 10000,
          elevationGain: 100
        }
      ];

      // Create 42 days of data for CTL to stabilize
      const dailyTSS: DailyTSS[] = [];
      const startDate = new Date('2025-01-01');

      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dailyTSS.push({
          date: date.toISOString().split('T')[0],
          totalTSS: 100, // Consistent 100 TSS per day
          activityCount: 1,
          activities: []
        });
      }

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      // With constant 100 TSS/day, CTL should approach 100
      // CTL formula: ctl = ctl + (tss - ctl) / 42
      // After many iterations with TSS=100, CTL approaches 100

      const lastWeek = result[result.length - 1];

      // After 42 days with constant TSS=100, CTL reaches ~61.9 (not 100)
      // EWMA formula: ctl = ctl + (tss - ctl) / 42
      // It takes ~4-5 time constants to reach steady state
      expect(lastWeek.avgCTL).toBeGreaterThan(55);
      expect(lastWeek.avgCTL).toBeLessThan(65);

      // ATL responds faster (7-day time constant)
      // After 42 days, ATL is much closer to 100
      expect(lastWeek.avgATL).toBeGreaterThan(95);
      expect(lastWeek.avgATL).toBeLessThan(100);

      // TSB = CTL - ATL, should be negative (fatigued)
      expect(lastWeek.avgTSB).toBeLessThan(-30);
      expect(lastWeek.avgTSB).toBeGreaterThan(-40);
    });

    it('should handle varying TSS with proper EWMA calculation', () => {
      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-13T08:00:00', // Monday of week 3
          duration: 3600,
          distance: 10000,
          elevationGain: 100
        }
      ];

      // Create pattern: 7 days of high load, then 7 days of low load
      const dailyTSS: DailyTSS[] = [];
      const startDate = new Date('2025-01-13'); // Start Monday (Week 3)

      for (let i = 0; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const tss = i < 7 ? 150 : 50; // High load, then low load

        dailyTSS.push({
          date: date.toISOString().split('T')[0],
          totalTSS: tss,
          activityCount: 1,
          activities: []
        });
      }

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      expect(result.length).toBeGreaterThanOrEqual(1);

      const week1 = result[0];

      // Week 1 (high load): ATL should increase faster than CTL
      // Both should be > 0
      expect(week1.avgCTL).toBeGreaterThan(0);
      expect(week1.avgATL).toBeGreaterThan(0);
      expect(week1.avgATL).toBeGreaterThan(week1.avgCTL);

      // If we have week 2, TSB should improve (become more positive)
      if (result.length > 1) {
        const week2 = result[1];
        expect(week2.avgTSB).toBeGreaterThan(week1.avgTSB);
      }
    });

    it('should calculate CTL with historical context', () => {
      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-13T08:00:00',
          duration: 3600,
          distance: 10000
        }
      ];

      // Build 6 weeks of historical data
      const dailyTSS: DailyTSS[] = [];
      const startDate = new Date('2024-12-01');

      for (let i = 0; i < 43; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dailyTSS.push({
          date: date.toISOString().split('T')[0],
          totalTSS: 80,
          activityCount: 1,
          activities: []
        });
      }

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      expect(result.length).toBeGreaterThan(0);

      // Each week should have progressively higher CTL as it builds
      for (let i = 1; i < Math.min(result.length, 4); i++) {
        expect(result[i].avgCTL).toBeGreaterThanOrEqual(result[i - 1].avgCTL);
      }
    });

    it('should handle empty activity list', () => {
      const result = aggregateWeeklyMetrics([], []);
      expect(result).toHaveLength(0);
    });

    it('should handle activities without optional fields', () => {
      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-06T08:00:00'
          // Missing duration, distance, elevationGain
        }
      ];

      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-06', totalTSS: 50, activityCount: 1, activities: [] }
      ];

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      expect(result).toHaveLength(1);
      expect(result[0].totalDistance).toBe(0);
      expect(result[0].totalDuration).toBe(0);
      expect(result[0].totalElevation).toBe(0);
    });

    it('should correctly assign activities to ISO weeks', () => {
      // ISO week starts on Monday
      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-05T08:00:00', // Sunday (end of W1)
          duration: 3600,
          distance: 10000
        },
        {
          activityId: 2,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-06T08:00:00', // Monday (start of W2)
          duration: 3600,
          distance: 10000
        }
      ];

      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-05', totalTSS: 70, activityCount: 1, activities: [] },
        { date: '2025-01-06', totalTSS: 70, activityCount: 1, activities: [] }
      ];

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      expect(result).toHaveLength(2);
      expect(result[0].activityCount).toBe(1); // Sunday in week 1
      expect(result[1].activityCount).toBe(1); // Monday in week 2
    });

    it('should include activity details in weekly metrics', () => {
      const activities = [
        {
          activityId: 123,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-06T08:00:00',
          duration: 3600,
          distance: 10000,
          averageHR: 150
        }
      ];

      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-06', totalTSS: 70, activityCount: 1, activities: [] }
      ];

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      expect(result[0].activities).toHaveLength(1);
      expect(result[0].activities[0].activityId).toBe(123);
      expect(result[0].activities[0].activityType).toBe('running');
      expect(result[0].activities[0].date).toBe('2025-01-06');
      expect(result[0].activities[0].avgHR).toBe(150);
    });

    it('should not use simplified CTL/ATL calculation', () => {
      // This test ensures we're NOT using the old formula:
      // avgCTL = avgWeeklyTSS * 0.7
      // avgATL = avgWeeklyTSS * 1.2

      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-13T08:00:00', // Week 3 starts 2025-01-13
          duration: 3600,
          distance: 10000
        }
      ];

      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-13', totalTSS: 100, activityCount: 1, activities: [] },
        { date: '2025-01-14', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-15', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-16', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-17', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-18', totalTSS: 0, activityCount: 0, activities: [] },
        { date: '2025-01-19', totalTSS: 0, activityCount: 0, activities: [] }
      ];

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      // With proper EWMA (starting from 0):
      // Day 1: ctl = 2.38, atl = 14.29
      // Day 2-7: TSS=0, values decay
      // End of week: ctl ≈ 2.1, atl ≈ 5.7

      // The results should follow EWMA pattern
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].avgCTL).toBeGreaterThan(1.5);
      expect(result[0].avgCTL).toBeLessThan(3); // Much less than 70 (simplified would be 100 * 0.7)
      expect(result[0].avgATL).toBeGreaterThan(4);
      expect(result[0].avgATL).toBeLessThan(7); // Much less than 120 (simplified would be 100 * 1.2)
    });

    it('should properly round CTL/ATL/TSB to one decimal', () => {
      const activities = [
        {
          activityId: 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-06T08:00:00',
          duration: 3600,
          distance: 10000
        }
      ];

      const dailyTSS: DailyTSS[] = [
        { date: '2025-01-06', totalTSS: 87, activityCount: 1, activities: [] }
      ];

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      // Check that values are rounded to 1 decimal place
      const ctl = result[0].avgCTL;
      const atl = result[0].avgATL;
      const tsb = result[0].avgTSB;

      expect(ctl).toBe(Math.round(ctl * 10) / 10);
      expect(atl).toBe(Math.round(atl * 10) / 10);
      expect(tsb).toBe(Math.round(tsb * 10) / 10);
    });

    it('should handle multiple activities in same week', () => {
      const startDate = new Date('2025-01-06'); // Monday
      const activities = [];
      const dailyTSS: DailyTSS[] = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        activities.push({
          activityId: i + 1,
          activityType: { typeKey: 'running' },
          startTimeLocal: date.toISOString(),
          duration: 3600,
          distance: 10000
        });

        dailyTSS.push({
          date: dateStr,
          totalTSS: 80,
          activityCount: 1,
          activities: []
        });
      }

      const result = aggregateWeeklyMetrics(activities, dailyTSS);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].activityCount).toBe(7);
      expect(result[0].totalTSS).toBeGreaterThan(0); // Should have TSS
      expect(result[0].activities).toHaveLength(7);
    });
  });
});

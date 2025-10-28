import { describe, it, expect } from 'vitest';
import { trackSleepDebt } from '../../src/services/sleepDebtTracker.js';
import type { SleepMetrics, DailyPerformance } from '../../src/types/sleep-correlation.js';

describe('sleepDebtTracker', () => {
  it('should track accumulating sleep debt', () => {
    // Create 7 days of insufficient sleep (6 hours per night, target 8 hours)
    const sleepData: SleepMetrics[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2025-01-${String(i + 15).padStart(2, '0')}`,
      totalSleepMinutes: 360, // 6 hours
      deepSleepMinutes: 72,
      lightSleepMinutes: 180,
      remSleepMinutes: 108,
      awakeMinutes: 20,
      sleepScore: 65,
    }));

    const result = trackSleepDebt(sleepData, [], 480); // Target 8 hours

    // Should have accumulated debt (2 hours per day * 7 days = 14 hours)
    expect(result.currentDebtMinutes).toBeGreaterThan(0);
    expect(result.avgDebtMinutes).toBeGreaterThan(0);
    expect(result.daysWithDebt).toBeGreaterThan(0);
    expect(result.estimatedRecoveryNights).toBeGreaterThan(0);
  });

  it('should not accumulate debt with sufficient sleep', () => {
    // Create 7 days of good sleep
    const sleepData: SleepMetrics[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2025-01-${String(i + 15).padStart(2, '0')}`,
      totalSleepMinutes: 480, // 8 hours
      deepSleepMinutes: 96,
      lightSleepMinutes: 240,
      remSleepMinutes: 144,
      awakeMinutes: 20,
      sleepScore: 85,
    }));

    const result = trackSleepDebt(sleepData, [], 480);

    expect(result.currentDebtMinutes).toBe(0);
    expect(result.daysWithDebt).toBe(0);
  });

  it('should allow recovery with good sleep', () => {
    // Mix of poor and good sleep
    const sleepData: SleepMetrics[] = [
      // Poor sleep days
      ...Array.from({ length: 3 }, (_, i) => ({
        date: `2025-01-${String(i + 15).padStart(2, '0')}`,
        totalSleepMinutes: 300, // 5 hours
        deepSleepMinutes: 60,
        lightSleepMinutes: 150,
        remSleepMinutes: 90,
        awakeMinutes: 30,
        sleepScore: 55,
      })),
      // Good recovery sleep days
      ...Array.from({ length: 4 }, (_, i) => ({
        date: `2025-01-${String(i + 18).padStart(2, '0')}`,
        totalSleepMinutes: 540, // 9 hours
        deepSleepMinutes: 108,
        lightSleepMinutes: 270,
        remSleepMinutes: 162,
        awakeMinutes: 15,
        sleepScore: 90,
      })),
    ];

    const result = trackSleepDebt(sleepData, [], 480);

    // Recovery should reduce debt
    expect(result.currentDebtMinutes).toBeLessThan(result.maxDebtMinutes);
  });

  it('should track maximum debt', () => {
    const sleepData: SleepMetrics[] = [
      {
        date: '2025-01-15',
        totalSleepMinutes: 300,
        deepSleepMinutes: 60,
        lightSleepMinutes: 150,
        remSleepMinutes: 90,
        awakeMinutes: 30,
        sleepScore: 55,
      },
      {
        date: '2025-01-16',
        totalSleepMinutes: 300,
        deepSleepMinutes: 60,
        lightSleepMinutes: 150,
        remSleepMinutes: 90,
        awakeMinutes: 30,
        sleepScore: 55,
      },
      {
        date: '2025-01-17',
        totalSleepMinutes: 480, // Recovery
        deepSleepMinutes: 96,
        lightSleepMinutes: 240,
        remSleepMinutes: 144,
        awakeMinutes: 20,
        sleepScore: 85,
      },
    ];

    const result = trackSleepDebt(sleepData, [], 480);

    expect(result.maxDebtMinutes).toBeGreaterThan(0);
    expect(result.maxDebtDate).toBeDefined();
    expect(result.currentDebtMinutes).toBeLessThanOrEqual(result.maxDebtMinutes);
  });

  it('should handle empty data', () => {
    const result = trackSleepDebt([], []);

    expect(result.currentDebtMinutes).toBe(0);
    expect(result.maxDebtMinutes).toBe(0);
    expect(result.avgDebtMinutes).toBe(0);
    expect(result.daysWithDebt).toBe(0);
  });

  it('should detect correlation with performance', () => {
    // Create sleep with increasing debt
    const sleepData: SleepMetrics[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2025-01-${String(i + 15).padStart(2, '0')}`,
      totalSleepMinutes: 420 - i * 10, // Decreasing sleep
      deepSleepMinutes: 84,
      lightSleepMinutes: 210,
      remSleepMinutes: 126,
      awakeMinutes: 20,
      sleepScore: 75 - i * 2,
    }));

    // Create performance that decreases with more debt
    const performanceData: DailyPerformance[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2025-01-${String(i + 15).padStart(2, '0')}`,
      activitiesCount: 1,
      totalDurationMinutes: 60,
      totalDistanceKm: 12 - i * 0.3, // Decreasing performance
    }));

    const result = trackSleepDebt(sleepData, performanceData, 480);

    // Should detect that debt is affecting performance
    expect(result.debtPerformanceCorrelation).toBeDefined();
  });
});

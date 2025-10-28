/**
 * Form Trend Analyzer Tests
 *
 * Tests trend detection, velocity calculations, volatility, and reversals
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormTrendAnalyzer } from '../../src/services/formTrendAnalyzer.js';
import { FormZoneClassifier } from '../../src/services/formZoneClassifier.js';
import type { FormSnapshot } from '../../src/types/fatigue-freshness.js';

describe('FormTrendAnalyzer', () => {
  let analyzer: FormTrendAnalyzer;

  beforeEach(() => {
    analyzer = new FormTrendAnalyzer();
  });

  function createSnapshot(date: string, tsb: number, ctl: number, atl: number): FormSnapshot {
    const classifier = new FormZoneClassifier();
    const zoneInfo = classifier.classifyFormZone(tsb, ctl);

    return {
      date,
      tss: 100,
      ctl,
      atl,
      tsb,
      zone: zoneInfo.zone,
      zoneInfo,
      activityCount: 1,
      totalDuration: 3600,
      changes: {
        tssChange: 0,
        ctlChange: 0,
        atlChange: 0,
        tsbChange: 0,
        zoneChanged: false,
      },
    };
  }

  describe('analyzeTrend', () => {
    it('should detect improving trend', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', -20, 60, 80),
        createSnapshot('2025-01-02', -15, 60, 75),
        createSnapshot('2025-01-03', -10, 60, 70),
        createSnapshot('2025-01-04', -5, 60, 65),
        createSnapshot('2025-01-05', 0, 60, 60),
        createSnapshot('2025-01-06', 5, 60, 55),
        createSnapshot('2025-01-07', 10, 60, 50),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.direction).toBe('improving');
      expect(trend.slope).toBeGreaterThan(0);
      expect(trend.velocity).toMatch(/rapid|moderate|slow/);
      expect(trend.averageTSB).toBeCloseTo(-5, 0);
    });

    it('should detect declining trend', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', 10, 60, 50),
        createSnapshot('2025-01-02', 5, 60, 55),
        createSnapshot('2025-01-03', 0, 60, 60),
        createSnapshot('2025-01-04', -5, 60, 65),
        createSnapshot('2025-01-05', -10, 60, 70),
        createSnapshot('2025-01-06', -15, 60, 75),
        createSnapshot('2025-01-07', -20, 60, 80),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.direction).toBe('declining');
      expect(trend.slope).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', 0, 60, 60),
        createSnapshot('2025-01-02', 1, 60, 59),
        createSnapshot('2025-01-03', -1, 60, 61),
        createSnapshot('2025-01-04', 0, 60, 60),
        createSnapshot('2025-01-05', 1, 60, 59),
        createSnapshot('2025-01-06', 0, 60, 60),
        createSnapshot('2025-01-07', -1, 60, 61),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.direction).toBe('stable');
      expect(Math.abs(trend.slope)).toBeLessThan(0.2);
      expect(trend.velocity).toBe('stable');
    });

    it('should calculate velocity correctly', () => {
      // Rapid decline
      const rapidSnapshots: FormSnapshot[] = [];
      for (let i = 0; i < 7; i++) {
        rapidSnapshots.push(createSnapshot(`2025-01-0${i + 1}`, 20 - i * 3, 60, 40 + i * 3));
      }

      const rapidTrend = analyzer.analyzeTrend(rapidSnapshots, 'week');
      expect(rapidTrend.velocity).toBe('rapid');

      // Slow improvement (0.3 TSB/day which is < 0.5 MODERATE threshold)
      const slowSnapshots: FormSnapshot[] = [];
      for (let i = 0; i < 7; i++) {
        slowSnapshots.push(createSnapshot(`2025-01-0${i + 1}`, -10 + i * 0.3, 60, 70 - i * 0.3));
      }

      const slowTrend = analyzer.analyzeTrend(slowSnapshots, 'week');
      expect(slowTrend.velocity).toBe('slow');
    });

    it('should calculate statistical measures', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', -15, 60, 75),
        createSnapshot('2025-01-02', -10, 60, 70),
        createSnapshot('2025-01-03', -5, 60, 65),
        createSnapshot('2025-01-04', 0, 60, 60),
        createSnapshot('2025-01-05', 5, 60, 55),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.averageTSB).toBeCloseTo(-5, 0);
      expect(trend.minTSB).toBe(-15);
      expect(trend.maxTSB).toBe(5);
      expect(trend.volatility).toBeGreaterThan(0);
    });

    it('should detect zone changes', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', -25, 60, 85),  // fatigued
        createSnapshot('2025-01-02', -12, 60, 72),  // productive_training
        createSnapshot('2025-01-03', 0, 60, 60),    // maintenance
        createSnapshot('2025-01-04', 15, 60, 45),   // optimal_race
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.zoneChanges.length).toBeGreaterThan(0);
      expect(trend.zoneChanges[0].fromZone).toBeDefined();
      expect(trend.zoneChanges[0].toZone).toBeDefined();
      expect(trend.zoneChanges[0].date).toBeDefined();
    });

    it('should detect reversals', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', -10, 60, 70),
        createSnapshot('2025-01-02', -5, 60, 65),   // improving
        createSnapshot('2025-01-03', 0, 60, 60),    // peak
        createSnapshot('2025-01-04', -4, 60, 64),   // reversal to declining
        createSnapshot('2025-01-05', -8, 60, 68),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.reversals.length).toBeGreaterThan(0);
      expect(trend.reversals[0].previousDirection).toBeDefined();
      expect(trend.reversals[0].newDirection).toBeDefined();
    });
  });

  describe('analyzeMultipleTrends', () => {
    it('should analyze multiple time periods', () => {
      const snapshots: FormSnapshot[] = [];
      for (let i = 0; i < 35; i++) {
        snapshots.push(
          createSnapshot(`2025-01-${String(i + 1).padStart(2, '0')}`, -15 + i, 60, 75 - i)
        );
      }

      const trends = analyzer.analyzeMultipleTrends(snapshots);

      expect(trends.week).toBeDefined();
      expect(trends.twoWeeks).toBeDefined();
      expect(trends.month).toBeDefined();

      expect(trends.week.durationDays).toBe(7);
      expect(trends.twoWeeks.durationDays).toBe(14);
      expect(trends.month.durationDays).toBe(30);
    });

    it('should show different trends for different periods', () => {
      // Recent improvement, but longer-term decline
      const snapshots: FormSnapshot[] = [];

      // Days 1-21: declining
      for (let i = 0; i < 21; i++) {
        snapshots.push(createSnapshot(`2025-01-${String(i + 1).padStart(2, '0')}`, 10 - i, 60, 50 + i));
      }

      // Days 22-28: improving
      for (let i = 21; i < 28; i++) {
        snapshots.push(createSnapshot(`2025-01-${String(i + 1).padStart(2, '0')}`, -11 + (i - 21) * 2, 60, 71 - (i - 21) * 2));
      }

      const trends = analyzer.analyzeMultipleTrends(snapshots);

      expect(trends.week.direction).toBe('improving'); // Recent 7 days
      expect(trends.month.direction).toBe('declining'); // Overall 30 days
    });
  });

  describe('detectTrendAcceleration', () => {
    it('should detect accelerating improvement', () => {
      const snapshots: FormSnapshot[] = [];

      // Week 1: slow improvement (1 TSB/day)
      for (let i = 0; i < 7; i++) {
        snapshots.push(createSnapshot(`2025-01-0${i + 1}`, -14 + i, 60, 74 - i));
      }

      // Week 2: faster improvement (2 TSB/day)
      for (let i = 0; i < 7; i++) {
        snapshots.push(createSnapshot(`2025-01-${String(i + 8).padStart(2, '0')}`, -7 + i * 2, 60, 67 - i * 2));
      }

      const result = analyzer.detectTrendAcceleration(snapshots);

      expect(result.isAccelerating).toBe(true);
      expect(result.accelerationRate).toBeGreaterThan(0);
      expect(result.interpretation).toContain('accelerating');
    });

    it('should detect accelerating decline', () => {
      const snapshots: FormSnapshot[] = [];

      // Week 1: slow decline
      for (let i = 0; i < 7; i++) {
        snapshots.push(createSnapshot(`2025-01-0${i + 1}`, 7 - i, 60, 53 + i));
      }

      // Week 2: faster decline
      for (let i = 0; i < 7; i++) {
        snapshots.push(createSnapshot(`2025-01-${String(i + 8).padStart(2, '0')}`, 0 - i * 2, 60, 60 + i * 2));
      }

      const result = analyzer.detectTrendAcceleration(snapshots);

      expect(result.isAccelerating).toBe(true);
      expect(result.accelerationRate).toBeLessThan(0);
      expect(result.interpretation).toContain('fatigue');
    });

    it('should handle insufficient data', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', 0, 60, 60),
      ];

      const result = analyzer.detectTrendAcceleration(snapshots);

      expect(result.isAccelerating).toBe(false);
      expect(result.accelerationRate).toBe(0);
      expect(result.interpretation).toContain('Insufficient');
    });
  });

  describe('getTrendSummary', () => {
    it('should generate summary for improving trend', () => {
      const snapshots: FormSnapshot[] = [];
      for (let i = 0; i < 7; i++) {
        snapshots.push(createSnapshot(`2025-01-0${i + 1}`, -10 + i * 2, 60, 70 - i * 2));
      }

      const trend = analyzer.analyzeTrend(snapshots, 'week');
      const summary = analyzer.getTrendSummary(trend);

      expect(summary).toContain('improving');
      expect(summary).toMatch(/volatility/i);
    });

    it('should generate summary for declining trend with zone changes', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', 15, 60, 45),   // optimal
        createSnapshot('2025-01-02', 10, 60, 50),
        createSnapshot('2025-01-03', 5, 60, 55),
        createSnapshot('2025-01-04', 0, 60, 60),    // maintenance
        createSnapshot('2025-01-05', -5, 60, 65),
        createSnapshot('2025-01-06', -10, 60, 70),  // productive
        createSnapshot('2025-01-07', -15, 60, 75),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');
      const summary = analyzer.getTrendSummary(trend);

      expect(summary).toContain('declining');
      expect(summary).toMatch(/zone changes/i);
    });
  });

  describe('edge cases', () => {
    it('should handle empty snapshots', () => {
      const trend = analyzer.analyzeTrend([], 'week');

      expect(trend.direction).toBe('stable');
      expect(trend.slope).toBe(0);
      expect(trend.zoneChanges).toHaveLength(0);
      expect(trend.reversals).toHaveLength(0);
    });

    it('should handle single snapshot', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', 0, 60, 60),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.direction).toBe('stable');
      expect(trend.averageTSB).toBe(0);
    });

    it('should handle flat trend (no change)', () => {
      const snapshots: FormSnapshot[] = [];
      for (let i = 0; i < 7; i++) {
        snapshots.push(createSnapshot(`2025-01-0${i + 1}`, 0, 60, 60));
      }

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.direction).toBe('stable');
      expect(trend.slope).toBeCloseTo(0, 1);
      expect(trend.volatility).toBeCloseTo(0, 1);
    });

    it('should handle missing dates in sequence', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', -10, 60, 70),
        createSnapshot('2025-01-03', -5, 60, 65),   // Skip day 2
        createSnapshot('2025-01-05', 0, 60, 60),    // Skip day 4
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.direction).toBeDefined();
      expect(trend.slope).toBeGreaterThan(0);
    });

    it('should handle extreme volatility', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', -20, 60, 80),
        createSnapshot('2025-01-02', 10, 60, 50),
        createSnapshot('2025-01-03', -15, 60, 75),
        createSnapshot('2025-01-04', 15, 60, 45),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.volatility).toBeGreaterThan(10);
      expect(trend.reversals.length).toBeGreaterThan(0);
    });

    it('should calculate correct slope with linear regression', () => {
      // Perfect linear increase: 1 TSB per day
      const snapshots: FormSnapshot[] = [];
      for (let i = 0; i < 7; i++) {
        snapshots.push(createSnapshot(`2025-01-0${i + 1}`, i, 60, 60 - i));
      }

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      // Slope should be approximately 1.0
      expect(trend.slope).toBeCloseTo(1.0, 1);
    });

    it('should not detect reversal for small changes', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', 0, 60, 60),
        createSnapshot('2025-01-02', 0.5, 60, 59.5),
        createSnapshot('2025-01-03', 0, 60, 60),
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      // Should not detect reversal for changes < 2 TSB points
      expect(trend.reversals).toHaveLength(0);
    });
  });

  describe('zone classifier integration', () => {
    it('should use injected zone classifier', () => {
      const customClassifier = new FormZoneClassifier({
        overreached: { max: -40 },
      });

      const analyzer = new FormTrendAnalyzer(customClassifier);

      expect(analyzer.getZoneClassifier()).toBe(customClassifier);
    });

    it('should correctly identify zones in trends', () => {
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', -35, 50, 85),  // overreached
        createSnapshot('2025-01-02', -25, 50, 75),  // fatigued
        createSnapshot('2025-01-03', -12, 50, 62),  // productive
        createSnapshot('2025-01-04', 0, 50, 50),    // maintenance
        createSnapshot('2025-01-05', 15, 50, 35),   // optimal
        createSnapshot('2025-01-06', 30, 50, 20),   // fresh
      ];

      const trend = analyzer.analyzeTrend(snapshots, 'week');

      expect(trend.zoneChanges.length).toBe(5);
    });
  });
});

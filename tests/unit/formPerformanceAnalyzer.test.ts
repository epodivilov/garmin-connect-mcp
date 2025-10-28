/**
 * Form Performance Analyzer Tests
 */

import { describe, it, expect } from 'vitest';
import { FormPerformanceAnalyzer } from '../../src/services/formPerformanceAnalyzer.js';
import type { FormSnapshot } from '../../src/types/fatigue-freshness.js';
import type { PRHistoryEntry } from '../../src/types/personalRecords.js';

function createSnapshot(date: string, tsb: number, ctl: number, zone: any): FormSnapshot {
  return {
    date, tss: 100, ctl, atl: ctl - tsb, tsb, zone,
    zoneInfo: { zone, label: '', description: '', color: '', tsbRange: { min: 0, max: 0 },
      characteristics: { performancePotential: 'moderate', injuryRisk: 'low', recommendedIntensity: 'moderate', trainingFocus: [] },
      recommendations: { workoutTypes: [], intensityGuidance: '', volumeGuidance: '', recoveryGuidance: '' }
    },
    activityCount: 1, totalDuration: 3600,
    changes: { tssChange: 0, ctlChange: 0, atlChange: 0, tsbChange: 0, zoneChanged: false }
  };
}

function createPR(date: string, categoryId: string): PRHistoryEntry {
  return {
    categoryId, timestamp: `${date}T10:00:00.000Z`, value: 100, unit: 'seconds',
    activityId: 123, activityType: 'running', activityName: 'Test',
    improvement: { absolute: 5, percentage: 5, previousValue: 95 }
  };
}

describe('FormPerformanceAnalyzer', () => {
  describe('analyzeCorrelation', () => {
    it('should analyze form-performance correlation', () => {
      const analyzer = new FormPerformanceAnalyzer();
      const snapshots: FormSnapshot[] = [
        createSnapshot('2025-01-01', 15, 60, 'optimal_race'),
        createSnapshot('2025-01-02', 10, 60, 'maintenance'),
        createSnapshot('2025-01-03', 15, 60, 'optimal_race'),
      ];

      const prs: PRHistoryEntry[] = [
        createPR('2025-01-01', '5k'),
        createPR('2025-01-03', '10k'),
      ];

      const result = analyzer.analyzeCorrelation(snapshots, prs, '2025-01-01', '2025-01-03');

      expect(result.period.startDate).toBe('2025-01-01');
      expect(result.performanceByZone.optimal_race.totalPRs).toBe(2);
      expect(result.optimalZones.length).toBeGreaterThan(0);
    });

    it('should handle no PRs', () => {
      const analyzer = new FormPerformanceAnalyzer();
      const snapshots = [createSnapshot('2025-01-01', 0, 60, 'maintenance')];
      
      const result = analyzer.analyzeCorrelation(snapshots, [], '2025-01-01', '2025-01-01');
      
      expect(result.performanceByZone.maintenance.totalPRs).toBe(0);
    });
  });

  describe('calculatePerformanceProbability', () => {
    it('should calculate PR probability by zone', () => {
      const analyzer = new FormPerformanceAnalyzer();
      const snapshots = [
        createSnapshot('2025-01-01', 15, 60, 'optimal_race'),
        createSnapshot('2025-01-02', 15, 60, 'optimal_race'),
      ];
      const prs = [createPR('2025-01-01', '5k')];

      const result = analyzer.calculatePerformanceProbability(snapshots, prs);

      expect(result.optimal_race.prProbability).toBeGreaterThan(0);
    });
  });

  describe('findOptimalTSBForGoal', () => {
    it('should find optimal TSB for race', () => {
      const analyzer = new FormPerformanceAnalyzer();
      const snapshots = [createSnapshot('2025-01-01', 15, 60, 'optimal_race')];
      const prs = [createPR('2025-01-01', '5k')];

      const result = analyzer.findOptimalTSBForGoal(snapshots, prs, 'race');

      expect(result.optimalTSBRange).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});

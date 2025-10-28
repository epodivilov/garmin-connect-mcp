import { describe, it, expect } from 'vitest';
import { calculateEffectiveness } from '../../src/services/periodizationScorer.js';
import type { DetectedPhase, WeeklyMetrics } from '../../src/types/periodization.js';
import type { PersonalRecord } from '../../src/types/personalRecords.js';

describe('Periodization Scorer', () => {
  const createPhase = (overrides: Partial<DetectedPhase>): DetectedPhase => ({
    phase: overrides.phase || 'base',
    startDate: overrides.startDate || '2025-01-01',
    endDate: overrides.endDate || '2025-01-21',
    durationWeeks: overrides.durationWeeks || 3,
    avgWeeklyVolume: overrides.avgWeeklyVolume || 8,
    avgWeeklyDistance: 50,
    volumeTrend: overrides.volumeTrend || 'increasing',
    volumeChange: overrides.volumeChange || 10,
    avgWeeklyTSS: overrides.avgWeeklyTSS || 250,
    tssTrend: 'increasing',
    avgCTL: overrides.avgCTL || 50,
    ctlGain: overrides.ctlGain || 10,
    avgATL: overrides.avgATL || 60,
    avgTSB: overrides.avgTSB || -10,
    intensityTrend: 'increasing',
    confidence: 75,
    detectionMethod: 'hybrid',
    confidenceFactors: {
      volumeConfidence: 75,
      intensityConfidence: 75,
      tssConfidence: 75,
      durationConfidence: 100
    },
    ...overrides
  });

  const createWeeklyMetrics = (overrides: Partial<WeeklyMetrics>[]): WeeklyMetrics[] => {
    return overrides.map((override, index) => ({
      weekStart: override.weekStart || `2025-01-${String((index * 7) + 1).padStart(2, '0')}`,
      weekEnd: override.weekEnd || `2025-01-${String((index * 7) + 7).padStart(2, '0')}`,
      weekNumber: index + 1,
      year: 2025,
      totalDistance: override.totalDistance ?? 50000,
      totalDuration: override.totalDuration ?? 14400,
      totalElevation: override.totalElevation ?? 500,
      activityCount: override.activityCount ?? 4,
      avgWeeklyTSS: override.avgWeeklyTSS ?? 250,
      totalTSS: override.totalTSS ?? 250,
      avgCTL: override.avgCTL ?? 50,
      avgATL: override.avgATL ?? 60,
      avgTSB: override.avgTSB ?? -10,
      activities: [],
      ...override
    }));
  };

  describe('calculateEffectiveness', () => {
    it('should calculate overall effectiveness score', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 6 }),
        createPhase({ phase: 'build', startDate: '2025-02-01', endDate: '2025-02-28', durationWeeks: 4 }),
        createPhase({ phase: 'peak', startDate: '2025-03-01', endDate: '2025-03-14', durationWeeks: 2 })
      ];

      const weeklyMetrics = createWeeklyMetrics(
        Array.from({ length: 12 }, (_, i) => ({
          avgCTL: 40 + i * 2, // Progressive CTL gain
          avgTSB: -10
        }))
      );

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.grade).toBeDefined();
      expect(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']).toContain(result.grade);
    });

    it('should assign grade based on score', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 6, avgCTL: 40, ctlGain: 15 })
      ];

      const weeklyMetrics = createWeeklyMetrics([
        { avgCTL: 40, avgTSB: -5 },
        { avgCTL: 45, avgTSB: -8 },
        { avgCTL: 50, avgTSB: -10 },
        { avgCTL: 55, avgTSB: -7 }
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      if (result.overallScore >= 95) expect(result.grade).toBe('A+');
      else if (result.overallScore >= 90) expect(result.grade).toBe('A');
      else if (result.overallScore >= 85) expect(result.grade).toBe('B+');
      else if (result.overallScore >= 80) expect(result.grade).toBe('B');
      else if (result.overallScore >= 75) expect(result.grade).toBe('C+');
      else if (result.overallScore >= 70) expect(result.grade).toBe('C');
      else if (result.overallScore >= 60) expect(result.grade).toBe('D');
      else expect(result.grade).toBe('F');
    });

    it('should calculate structure score', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 6 }),
        createPhase({ phase: 'build', durationWeeks: 4 })
      ];

      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 10 }, () => ({})));

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.structureScore).toBeDefined();
      expect(result.structureScore.overall).toBeGreaterThan(0);
      expect(result.structureScore.phaseBalance).toBeDefined();
      expect(result.structureScore.phaseTransitions).toBeDefined();
      expect(result.structureScore.phaseLengths).toBeDefined();
    });

    it('should reward good phase balance', () => {
      const goodPhases = [
        createPhase({ phase: 'base', durationWeeks: 8 }),
        createPhase({ phase: 'build', durationWeeks: 5 })
      ];

      const poorPhases = [
        createPhase({ phase: 'base', durationWeeks: 1 }),
        createPhase({ phase: 'build', durationWeeks: 1 })
      ];

      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 13 }, () => ({})));

      const goodResult = calculateEffectiveness(goodPhases, weeklyMetrics, []);
      const poorResult = calculateEffectiveness(poorPhases, weeklyMetrics.slice(0, 2), []);

      expect(goodResult.structureScore.phaseBalance.score).toBeGreaterThan(
        poorResult.structureScore.phaseBalance.score
      );
    });

    it('should score smooth phase transitions highly', () => {
      const smoothPhases = [
        createPhase({ phase: 'base', durationWeeks: 6 }),
        createPhase({ phase: 'build', startDate: '2025-02-01', durationWeeks: 4 }),
        createPhase({ phase: 'recovery', startDate: '2025-03-01', durationWeeks: 2 })
      ];

      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 12 }, () => ({})));

      const result = calculateEffectiveness(smoothPhases, weeklyMetrics, []);

      expect(result.structureScore.phaseTransitions.smoothTransitions).toBe(2);
      expect(result.structureScore.phaseTransitions.abruptTransitions).toBe(0);
      expect(result.structureScore.phaseTransitions.logicalSequence).toBe(true);
    });

    it('should calculate progression score', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 4 })
      ];

      const weeklyMetrics = createWeeklyMetrics([
        { avgCTL: 40, totalDuration: 21600 },
        { avgCTL: 43, totalDuration: 23400 },
        { avgCTL: 46, totalDuration: 25200 },
        { avgCTL: 49, totalDuration: 27000 }
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.progressionScore).toBeDefined();
      expect(result.progressionScore.volumeProgression).toBeDefined();
      expect(result.progressionScore.ctlGain).toBeGreaterThan(0);
      expect(result.progressionScore.ctlGainScore).toBeGreaterThan(0);
    });

    it('should detect rapid volume increases', () => {
      const phases = [createPhase({ phase: 'base', durationWeeks: 3 })];

      const weeklyMetrics = createWeeklyMetrics([
        { totalDuration: 21600 }, // 6 hours
        { totalDuration: 25200 }, // 7 hours (+16.7%)
        { totalDuration: 32400 }  // 9 hours (+28.6% - rapid!)
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.progressionScore.volumeProgression.rapidIncreases.length).toBeGreaterThan(0);
      expect(result.progressionScore.volumeProgression.rapidIncreases[0].increase).toBeGreaterThan(15);
    });

    it('should reward progressive volume increase', () => {
      const phases = [createPhase({ phase: 'base', durationWeeks: 4 })];

      const progressiveMetrics = createWeeklyMetrics([
        { totalDuration: 21600 }, // 6 hours
        { totalDuration: 23400 }, // 6.5 hours (+8.3%)
        { totalDuration: 25200 }, // 7 hours (+7.7%)
        { totalDuration: 27000 }  // 7.5 hours (+7.1%)
      ]);

      const result = calculateEffectiveness(phases, progressiveMetrics, []);

      expect(result.progressionScore.volumeProgression.isProgressive).toBe(true);
      expect(result.progressionScore.volumeProgression.isWithinSafeRange).toBe(true);
    });

    it('should calculate recovery score', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 4 }),
        createPhase({ phase: 'recovery', durationWeeks: 1 })
      ];

      const weeklyMetrics = createWeeklyMetrics([
        { avgTSB: -10 },
        { avgTSB: -15 },
        { avgTSB: -12 },
        { avgTSB: -8 },
        { avgTSB: 20 } // Recovery week
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.recoveryScore).toBeDefined();
      expect(result.recoveryScore.management).toBeDefined();
      expect(result.recoveryScore.management.tsbManagement).toBeDefined();
    });

    it('should detect overreaching episodes', () => {
      const phases = [createPhase({ phase: 'build', durationWeeks: 3 })];

      const weeklyMetrics = createWeeklyMetrics([
        { avgTSB: -15 },
        { avgTSB: -35 }, // Overreaching!
        { avgTSB: -25 }
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.recoveryScore.management.tsbManagement.overreachingEpisodes).toBeGreaterThan(0);
    });

    it('should calculate performance score', () => {
      const phases = [
        createPhase({
          phase: 'build',
          startDate: '2025-01-01',
          endDate: '2025-01-21',
          durationWeeks: 3
        })
      ];

      const weeklyMetrics = createWeeklyMetrics([
        { avgCTL: 40 },
        { avgCTL: 45 },
        { avgCTL: 50 }
      ]);

      const personalRecords: PersonalRecord[] = [
        {
          id: 'pr1',
          sport: 'running',
          category: { id: '5k', name: '5K Time' } as any,
          activityId: 123,
          timestamp: '2025-01-15T08:00:00',
          metricValue: 1200,
          quality: { score: 90 } as any
        }
      ];

      const result = calculateEffectiveness(phases, weeklyMetrics, personalRecords);

      expect(result.performanceScore).toBeDefined();
      expect(result.performanceScore.correlation.totalPRs).toBe(1);
      expect(result.performanceScore.correlation.prsByPhase.build).toBe(1);
    });

    it('should calculate phase balance', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 6 }),
        createPhase({ phase: 'build', durationWeeks: 4 }),
        createPhase({ phase: 'recovery', durationWeeks: 2 })
      ];

      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 12 }, () => ({})));

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.phaseBalance).toBeDefined();
      expect(result.phaseBalance.totalWeeks).toBe(12);
      expect(result.phaseBalance.baseRatio).toBeCloseTo(50, 0);
      expect(result.phaseBalance.buildRatio).toBeCloseTo(33.3, 0);
      expect(result.phaseBalance.recoveryRatio).toBeCloseTo(16.7, 0);
    });

    it('should identify strengths', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 8 }),
        createPhase({ phase: 'build', durationWeeks: 5 }),
        createPhase({ phase: 'recovery', durationWeeks: 2 })
      ];

      const weeklyMetrics = createWeeklyMetrics(
        Array.from({ length: 15 }, (_, i) => ({
          avgCTL: 40 + i * 2,
          avgTSB: -8,
          totalDuration: 21600 + i * 600 // Progressive increase
        }))
      );

      const personalRecords: PersonalRecord[] = Array.from({ length: 6 }, (_, i) => ({
        id: `pr${i}`,
        sport: 'running',
        category: { id: '5k', name: '5K Time' } as any,
        activityId: 100 + i,
        timestamp: `2025-01-${String(i * 2 + 10).padStart(2, '0')}T08:00:00`,
        metricValue: 1200 - i * 10,
        quality: { score: 90 } as any
      }));

      const result = calculateEffectiveness(phases, weeklyMetrics, personalRecords);

      expect(result.strengths).toBeDefined();
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('should identify weaknesses', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 1 }), // Too brief
        createPhase({ phase: 'build', durationWeeks: 1 })  // Too brief
      ];

      const weeklyMetrics = createWeeklyMetrics([
        { avgTSB: -35 }, // Overreaching
        { avgTSB: -38 }
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.weaknesses).toBeDefined();
      expect(result.weaknesses.length).toBeGreaterThan(0);
    });

    it('should identify critical issues', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 3 })
      ];

      const weeklyMetrics = createWeeklyMetrics([
        { totalDuration: 21600, avgTSB: -10 },
        { totalDuration: 36000, avgTSB: -35 }, // Rapid increase + overreaching
        { totalDuration: 39600, avgTSB: -38 }
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.criticalIssues).toBeDefined();
      expect(result.criticalIssues.length).toBeGreaterThan(0);
    });

    it('should reward fitness gains', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 6, avgCTL: 55, ctlGain: 20 })
      ];

      const weeklyMetrics = createWeeklyMetrics([
        { avgCTL: 40 },
        { avgCTL: 44 },
        { avgCTL: 48 },
        { avgCTL: 52 },
        { avgCTL: 56 },
        { avgCTL: 60 }
      ]);

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.progressionScore.ctlGain).toBeCloseTo(20, 0);
      expect(result.progressionScore.ctlGainScore).toBeGreaterThan(70);
    });

    it('should provide recommendations for phase balance', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 2 }), // Too little base
        createPhase({ phase: 'build', durationWeeks: 1 })  // Too little build
      ];

      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 3 }, () => ({})));

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.phaseBalance.recommendations).toBeDefined();
      expect(result.phaseBalance.recommendations.length).toBeGreaterThan(0);
    });

    it('should respect target periodization model', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 8 }),
        createPhase({ phase: 'build', durationWeeks: 6 })
      ];

      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 14 }, () => ({})));

      const result = calculateEffectiveness(phases, weeklyMetrics, [], 'linear');

      expect(result.structureScore).toBeDefined();
      expect(result.structureScore.overall).toBeGreaterThan(0);
    });

    it('should calculate weighted overall score correctly', () => {
      const phases = [
        createPhase({ phase: 'base', durationWeeks: 6 }),
        createPhase({ phase: 'build', durationWeeks: 4 })
      ];

      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 10 }, (_, i) => ({
        avgCTL: 40 + i * 2,
        avgTSB: -8,
        totalDuration: 21600
      })));

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      // Overall score should be weighted: 20% structure + 25% progression + 25% recovery + 30% performance
      const expectedScore = Math.round(
        result.structureScore.overall * 0.20 +
        result.progressionScore.overall * 0.25 +
        result.recoveryScore.overall * 0.25 +
        result.performanceScore.overall * 0.30
      );

      expect(result.overallScore).toBe(expectedScore);
    });

    it('should handle empty personal records gracefully', () => {
      const phases = [createPhase({ phase: 'base', durationWeeks: 4 })];
      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 4 }, () => ({})));

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.performanceScore.correlation.totalPRs).toBe(0);
      expect(result.performanceScore.overall).toBeDefined();
    });

    it('should handle single phase gracefully', () => {
      const phases = [createPhase({ phase: 'base', durationWeeks: 4 })];
      const weeklyMetrics = createWeeklyMetrics(Array.from({ length: 4 }, () => ({})));

      const result = calculateEffectiveness(phases, weeklyMetrics, []);

      expect(result.structureScore.phaseTransitions.transitionCount).toBe(0);
      expect(result.structureScore.phaseTransitions.score).toBe(100);
    });
  });
});

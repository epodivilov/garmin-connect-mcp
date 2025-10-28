import { describe, it, expect } from 'vitest';
import { detectPhases } from '../../src/services/phaseDetector.js';
import type { WeeklyMetrics } from '../../src/types/periodization.js';
import { DEFAULT_PHASE_THRESHOLDS } from '../../src/constants/periodizationModels.js';

describe('Phase Detector', () => {
  const createWeeklyMetrics = (overrides: Partial<WeeklyMetrics>[]): WeeklyMetrics[] => {
    return overrides.map((override, index) => ({
      weekStart: `2025-01-${String((index * 7) + 1).padStart(2, '0')}`,
      weekEnd: `2025-01-${String((index * 7) + 7).padStart(2, '0')}`,
      weekNumber: index + 1,
      year: 2025,
      totalDistance: override.totalDistance ?? 50000,
      totalDuration: override.totalDuration ?? 14400, // 4 hours
      totalElevation: override.totalElevation ?? 500,
      activityCount: override.activityCount ?? 4,
      avgWeeklyTSS: override.avgWeeklyTSS ?? 250,
      totalTSS: override.totalTSS ?? 250,
      avgCTL: override.avgCTL ?? 50,
      avgATL: override.avgATL ?? 60,
      avgTSB: override.avgTSB ?? -10,
      activities: [],
      hrZoneDistribution: override.hrZoneDistribution,
      ...override
    }));
  };

  describe('detectPhases', () => {
    it('should return empty array if not enough weeks', () => {
      const weeklyMetrics = createWeeklyMetrics([
        { totalDuration: 14400 }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result).toHaveLength(0);
    });

    it('should detect base phase with high volume and low intensity', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 36000, // 10 hours (high volume)
          avgWeeklyTSS: 200,
          avgCTL: 30,
          avgATL: 35,
          avgTSB: -5,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 20,
            zone3Percentage: 8,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 39600, // 11 hours (increasing)
          avgWeeklyTSS: 220,
          avgCTL: 35,
          avgATL: 42,
          avgTSB: -7,
          hrZoneDistribution: {
            zone1Percentage: 75,
            zone2Percentage: 18,
            zone3Percentage: 5,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 43200, // 12 hours (increasing)
          avgWeeklyTSS: 240,
          avgCTL: 40,
          avgATL: 50,
          avgTSB: -10,
          hrZoneDistribution: {
            zone1Percentage: 72,
            zone2Percentage: 20,
            zone3Percentage: 6,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].phase).toBe('base');
      expect(result[0].durationWeeks).toBe(3);
      expect(result[0].volumeTrend).toBe('increasing');
    });

    it('should detect build phase with balanced intensity', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 21600, // 6 hours (medium volume)
          avgWeeklyTSS: 350,
          avgCTL: 50,
          avgATL: 65,
          avgTSB: -15,
          hrZoneDistribution: {
            zone1Percentage: 50,
            zone2Percentage: 25,
            zone3Percentage: 10,
            zone4Percentage: 12,
            zone5Percentage: 3
          }
        },
        {
          totalDuration: 25200, // 7 hours (increasing)
          avgWeeklyTSS: 400,
          avgCTL: 58,
          avgATL: 75,
          avgTSB: -17,
          hrZoneDistribution: {
            zone1Percentage: 45,
            zone2Percentage: 28,
            zone3Percentage: 10,
            zone4Percentage: 14,
            zone5Percentage: 3
          }
        },
        {
          totalDuration: 28800, // 8 hours (increasing)
          avgWeeklyTSS: 450,
          avgCTL: 65,
          avgATL: 85,
          avgTSB: -20,
          hrZoneDistribution: {
            zone1Percentage: 42,
            zone2Percentage: 30,
            zone3Percentage: 12,
            zone4Percentage: 13,
            zone5Percentage: 3
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].phase).toBe('build');
      expect(result[0].volumeTrend).toBe('increasing');
    });

    it('should detect peak phase with high intensity', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 21600, // 6 hours (medium volume)
          avgWeeklyTSS: 550,
          avgCTL: 70,
          avgATL: 75,
          avgTSB: -5,
          hrZoneDistribution: {
            zone1Percentage: 30,
            zone2Percentage: 25,
            zone3Percentage: 15,
            zone4Percentage: 20,
            zone5Percentage: 10
          }
        },
        {
          totalDuration: 21600,
          avgWeeklyTSS: 560,
          avgCTL: 72,
          avgATL: 77,
          avgTSB: -5,
          hrZoneDistribution: {
            zone1Percentage: 28,
            zone2Percentage: 25,
            zone3Percentage: 17,
            zone4Percentage: 22,
            zone5Percentage: 8
          }
        },
        {
          totalDuration: 21600,
          avgWeeklyTSS: 540,
          avgCTL: 73,
          avgATL: 75,
          avgTSB: -2,
          hrZoneDistribution: {
            zone1Percentage: 32,
            zone2Percentage: 25,
            zone3Percentage: 15,
            zone4Percentage: 18,
            zone5Percentage: 10
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].phase).toBe('peak');
    });

    it('should detect taper phase with decreasing volume', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 21600, // 6 hours (medium)
          avgWeeklyTSS: 250,
          avgCTL: 65,
          avgATL: 55,
          avgTSB: 10,
          hrZoneDistribution: {
            zone1Percentage: 40,
            zone2Percentage: 20,
            zone3Percentage: 25,
            zone4Percentage: 12,
            zone5Percentage: 3
          }
        },
        {
          totalDuration: 18000, // 5 hours (decreasing)
          avgWeeklyTSS: 220,
          avgCTL: 64,
          avgATL: 48,
          avgTSB: 16,
          hrZoneDistribution: {
            zone1Percentage: 45,
            zone2Percentage: 20,
            zone3Percentage: 23,
            zone4Percentage: 10,
            zone5Percentage: 2
          }
        },
        {
          totalDuration: 14400, // 4 hours (decreasing)
          avgWeeklyTSS: 180,
          avgCTL: 63,
          avgATL: 42,
          avgTSB: 21,
          hrZoneDistribution: {
            zone1Percentage: 50,
            zone2Percentage: 20,
            zone3Percentage: 20,
            zone4Percentage: 8,
            zone5Percentage: 2
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].phase).toBe('taper');
      expect(result[0].volumeTrend).toBe('decreasing');
    });

    it('should detect recovery phase with very low volume', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 7200, // 2 hours (very low)
          avgWeeklyTSS: 80,
          avgCTL: 55,
          avgATL: 35,
          avgTSB: 20,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 25,
            zone3Percentage: 4,
            zone4Percentage: 1,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 5400, // 1.5 hours (decreasing)
          avgWeeklyTSS: 60,
          avgCTL: 53,
          avgATL: 30,
          avgTSB: 23,
          hrZoneDistribution: {
            zone1Percentage: 75,
            zone2Percentage: 23,
            zone3Percentage: 2,
            zone4Percentage: 0,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 5400,
          avgWeeklyTSS: 60,
          avgCTL: 51,
          avgATL: 28,
          avgTSB: 23,
          hrZoneDistribution: {
            zone1Percentage: 72,
            zone2Percentage: 25,
            zone3Percentage: 3,
            zone4Percentage: 0,
            zone5Percentage: 0
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].phase).toBe('recovery');
    });

    it('should detect multiple phases in sequence', () => {
      const weeklyMetrics = createWeeklyMetrics([
        // Base phase (weeks 1-3): High volume, low intensity
        {
          totalDuration: 36000,
          avgWeeklyTSS: 200,
          avgCTL: 30,
          avgATL: 35,
          avgTSB: -5,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 20,
            zone3Percentage: 8,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 39600,
          avgWeeklyTSS: 220,
          avgCTL: 35,
          avgATL: 42,
          avgTSB: -7,
          hrZoneDistribution: {
            zone1Percentage: 72,
            zone2Percentage: 20,
            zone3Percentage: 6,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 43200,
          avgWeeklyTSS: 240,
          avgCTL: 40,
          avgATL: 50,
          avgTSB: -10,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 22,
            zone3Percentage: 6,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        },
        // Build phase (weeks 4-6): Medium volume, balanced intensity
        {
          totalDuration: 25200,
          avgWeeklyTSS: 350,
          avgCTL: 48,
          avgATL: 62,
          avgTSB: -14,
          hrZoneDistribution: {
            zone1Percentage: 50,
            zone2Percentage: 25,
            zone3Percentage: 10,
            zone4Percentage: 12,
            zone5Percentage: 3
          }
        },
        {
          totalDuration: 28800,
          avgWeeklyTSS: 400,
          avgCTL: 55,
          avgATL: 72,
          avgTSB: -17,
          hrZoneDistribution: {
            zone1Percentage: 48,
            zone2Percentage: 27,
            zone3Percentage: 10,
            zone4Percentage: 12,
            zone5Percentage: 3
          }
        },
        {
          totalDuration: 28800,
          avgWeeklyTSS: 420,
          avgCTL: 62,
          avgATL: 78,
          avgTSB: -16,
          hrZoneDistribution: {
            zone1Percentage: 45,
            zone2Percentage: 28,
            zone3Percentage: 12,
            zone4Percentage: 12,
            zone5Percentage: 3
          }
        },
        // Recovery phase (weeks 7-9): Low volume
        {
          totalDuration: 7200,
          avgWeeklyTSS: 80,
          avgCTL: 60,
          avgATL: 50,
          avgTSB: 10,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 25,
            zone3Percentage: 4,
            zone4Percentage: 1,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 7200,
          avgWeeklyTSS: 80,
          avgCTL: 58,
          avgATL: 42,
          avgTSB: 16,
          hrZoneDistribution: {
            zone1Percentage: 72,
            zone2Percentage: 25,
            zone3Percentage: 3,
            zone4Percentage: 0,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 7200,
          avgWeeklyTSS: 80,
          avgCTL: 56,
          avgATL: 38,
          avgTSB: 18,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 27,
            zone3Percentage: 3,
            zone4Percentage: 0,
            zone5Percentage: 0
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThanOrEqual(2);
      // Should detect at least base and build phases
      const phaseTypes = result.map(p => p.phase);
      expect(phaseTypes).toContain('base');
      expect(phaseTypes).toContain('build');
    });

    it('should calculate confidence scores', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 36000,
          avgWeeklyTSS: 200,
          avgCTL: 30,
          avgATL: 35,
          avgTSB: -5,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 20,
            zone3Percentage: 8,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 39600,
          avgWeeklyTSS: 220,
          avgCTL: 35,
          avgATL: 42,
          avgTSB: -7,
          hrZoneDistribution: {
            zone1Percentage: 72,
            zone2Percentage: 20,
            zone3Percentage: 6,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        },
        {
          totalDuration: 43200,
          avgWeeklyTSS: 240,
          avgCTL: 40,
          avgATL: 50,
          avgTSB: -10,
          hrZoneDistribution: {
            zone1Percentage: 70,
            zone2Percentage: 22,
            zone3Percentage: 6,
            zone4Percentage: 2,
            zone5Percentage: 0
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].confidence).toBeGreaterThan(0);
      expect(result[0].confidence).toBeLessThanOrEqual(100);
      expect(result[0].confidenceFactors).toBeDefined();
      expect(result[0].confidenceFactors.volumeConfidence).toBeGreaterThan(0);
      expect(result[0].confidenceFactors.intensityConfidence).toBeGreaterThan(0);
      expect(result[0].confidenceFactors.tssConfidence).toBeGreaterThan(0);
    });

    it('should calculate volume and intensity trends', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 21600, // 6 hours
          avgWeeklyTSS: 250
        },
        {
          totalDuration: 25200, // 7 hours
          avgWeeklyTSS: 300
        },
        {
          totalDuration: 28800, // 8 hours
          avgWeeklyTSS: 350
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].volumeTrend).toBe('increasing');
      expect(result[0].tssTrend).toBe('increasing');
      expect(result[0].volumeChange).toBeGreaterThan(0);
    });

    it('should calculate CTL gain', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          avgCTL: 40
        },
        {
          avgCTL: 48
        },
        {
          avgCTL: 55
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].ctlGain).toBeCloseTo(15, 0); // 55 - 40 = 15
    });

    it('should handle weeks without HR zone data', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 36000,
          avgWeeklyTSS: 200,
          hrZoneDistribution: undefined // No HR data
        },
        {
          totalDuration: 39600,
          avgWeeklyTSS: 220,
          hrZoneDistribution: undefined
        },
        {
          totalDuration: 43200,
          avgWeeklyTSS: 240,
          hrZoneDistribution: undefined
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      // Should still detect phases based on volume and TSS
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].phase).toBeDefined();
    });

    it('should enrich phases with performance metrics', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          weekStart: '2025-01-01',
          weekEnd: '2025-01-07',
          totalDuration: 36000,
          avgWeeklyTSS: 200
        },
        {
          weekStart: '2025-01-08',
          weekEnd: '2025-01-14',
          totalDuration: 39600,
          avgWeeklyTSS: 220
        },
        {
          weekStart: '2025-01-15',
          weekEnd: '2025-01-21',
          totalDuration: 43200,
          avgWeeklyTSS: 240
        }
      ]);

      const personalRecords = [
        {
          id: 'pr1',
          activityId: 123,
          timestamp: '2025-01-10T08:00:00',
          category: {
            id: '5k',
            name: '5K Time'
          },
          metricValue: 1200
        }
      ];

      const result = detectPhases(weeklyMetrics, personalRecords);

      expect(result.length).toBeGreaterThan(0);
      const phaseWithPR = result.find(p => p.performanceMetrics);
      expect(phaseWithPR).toBeDefined();
      expect(phaseWithPR?.performanceMetrics?.prsAchieved).toBe(1);
    });

    it('should respect custom phase detection config', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 21600
        },
        {
          totalDuration: 25200
        }
      ]);

      const customConfig = {
        ...DEFAULT_PHASE_THRESHOLDS,
        minPhaseWeeks: 2
      };

      const result = detectPhases(weeklyMetrics, [], customConfig);

      // With minPhaseWeeks = 2, should detect phase
      expect(result.length).toBeGreaterThan(0);
    });

    it('should add HR zone profiles to detected phases', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 36000,
          avgWeeklyTSS: 200,
          hrZoneDistribution: {
            zone1Percentage: 60,
            zone2Percentage: 25,
            zone3Percentage: 10,
            zone4Percentage: 4,
            zone5Percentage: 1
          }
        },
        {
          totalDuration: 39600,
          avgWeeklyTSS: 220,
          hrZoneDistribution: {
            zone1Percentage: 65,
            zone2Percentage: 23,
            zone3Percentage: 8,
            zone4Percentage: 3,
            zone5Percentage: 1
          }
        },
        {
          totalDuration: 43200,
          avgWeeklyTSS: 240,
          hrZoneDistribution: {
            zone1Percentage: 62,
            zone2Percentage: 24,
            zone3Percentage: 9,
            zone4Percentage: 4,
            zone5Percentage: 1
          }
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].hrZoneProfile).toBeDefined();
      expect(result[0].hrZoneProfile?.dominantZones).toBeDefined();
      expect(result[0].hrZoneProfile?.dominantZones).toHaveLength(2);
    });

    it('should use hybrid detection method', () => {
      const weeklyMetrics = createWeeklyMetrics([
        {
          totalDuration: 36000,
          avgWeeklyTSS: 200,
          avgCTL: 30,
          avgATL: 35,
          avgTSB: -5
        },
        {
          totalDuration: 39600,
          avgWeeklyTSS: 220,
          avgCTL: 35,
          avgATL: 42,
          avgTSB: -7
        },
        {
          totalDuration: 43200,
          avgWeeklyTSS: 240,
          avgCTL: 40,
          avgATL: 50,
          avgTSB: -10
        }
      ]);

      const result = detectPhases(weeklyMetrics);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].detectionMethod).toBe('hybrid');
    });
  });
});

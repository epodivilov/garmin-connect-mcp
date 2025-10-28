import { describe, it, expect } from 'vitest';
import {
  createHRZoneConfig,
  determineHRZone,
  calculateZoneDistribution,
  mergeZoneDistributions,
  findDominantZone,
  createVisualizationData,
  parseActivityHRData
} from '../../src/utils/hr-zone-calculator.js';
import { HRDataPoint } from '../../src/types/hr-zones.js';

describe('HR Zone Calculator', () => {
  describe('createHRZoneConfig', () => {
    it('should create standard 5-zone configuration', () => {
      const config = createHRZoneConfig(185);

      expect(config.maxHR).toBe(185);
      expect(config.zone1.min).toBe(93); // 50% of 185
      expect(config.zone1.max).toBe(111); // 60% of 185
      expect(config.zone1.label).toBe('Recovery');

      expect(config.zone2.min).toBe(111); // 60% of 185
      expect(config.zone2.max).toBe(130); // 70% of 185
      expect(config.zone2.label).toBe('Endurance');

      expect(config.zone3.min).toBe(130); // 70% of 185
      expect(config.zone3.max).toBe(148); // 80% of 185
      expect(config.zone3.label).toBe('Tempo');

      expect(config.zone4.min).toBe(148); // 80% of 185
      expect(config.zone4.max).toBe(167); // 90% of 185
      expect(config.zone4.label).toBe('Threshold');

      expect(config.zone5.min).toBe(167); // 90% of 185
      expect(config.zone5.max).toBe(185); // 100% of 185
      expect(config.zone5.label).toBe('Anaerobic');
    });

    it('should accept custom zone percentages', () => {
      const customZones = {
        zone1: { min: 40, max: 50 },
        zone2: { min: 50, max: 65 },
        zone3: { min: 65, max: 75 },
        zone4: { min: 75, max: 85 },
        zone5: { min: 85, max: 100 }
      };

      const config = createHRZoneConfig(200, customZones);

      expect(config.zone1.min).toBe(80); // 40% of 200
      expect(config.zone1.max).toBe(100); // 50% of 200
      expect(config.zone2.min).toBe(100); // 50% of 200
      expect(config.zone2.max).toBe(130); // 65% of 200
    });

    it('should use default max HR if not provided', () => {
      const config = createHRZoneConfig();
      expect(config.maxHR).toBe(185);
    });
  });

  describe('determineHRZone', () => {
    const config = createHRZoneConfig(185);

    it('should determine zone 1 correctly', () => {
      expect(determineHRZone(95, config)).toBe(1);
      expect(determineHRZone(110, config)).toBe(1);
    });

    it('should determine zone 2 correctly', () => {
      expect(determineHRZone(115, config)).toBe(2);
      expect(determineHRZone(125, config)).toBe(2);
    });

    it('should determine zone 3 correctly', () => {
      expect(determineHRZone(135, config)).toBe(3);
      expect(determineHRZone(145, config)).toBe(3);
    });

    it('should determine zone 4 correctly', () => {
      expect(determineHRZone(150, config)).toBe(4);
      expect(determineHRZone(165, config)).toBe(4);
    });

    it('should determine zone 5 correctly', () => {
      expect(determineHRZone(170, config)).toBe(5);
      expect(determineHRZone(185, config)).toBe(5);
      expect(determineHRZone(190, config)).toBe(5); // Above max still zone 5
    });

    it('should return 0 for HR below zone 1', () => {
      expect(determineHRZone(50, config)).toBe(0);
      expect(determineHRZone(90, config)).toBe(0);
    });

    it('should return 0 for invalid HR', () => {
      expect(determineHRZone(0, config)).toBe(0);
      expect(determineHRZone(-10, config)).toBe(0);
    });
  });

  describe('calculateZoneDistribution', () => {
    const config = createHRZoneConfig(185);

    it('should calculate zone distribution from HR data points', () => {
      // Create 60 data points (1 per second for 1 minute)
      const hrData: HRDataPoint[] = [
        ...Array(10).fill(null).map((_, i) => ({ timestamp: i, heartRate: 100 })), // Zone 1
        ...Array(20).fill(null).map((_, i) => ({ timestamp: 10 + i, heartRate: 120 })), // Zone 2
        ...Array(15).fill(null).map((_, i) => ({ timestamp: 30 + i, heartRate: 140 })), // Zone 3
        ...Array(10).fill(null).map((_, i) => ({ timestamp: 45 + i, heartRate: 160 })), // Zone 4
        ...Array(5).fill(null).map((_, i) => ({ timestamp: 55 + i, heartRate: 175 }))  // Zone 5
      ];

      const distribution = calculateZoneDistribution(hrData, 60, config);

      expect(distribution).toHaveLength(5);
      expect(distribution[0].zone).toBe(1);
      expect(distribution[0].timeSeconds).toBe(10);
      expect(distribution[0].percentage).toBeCloseTo(16.7, 1);

      expect(distribution[1].zone).toBe(2);
      expect(distribution[1].timeSeconds).toBe(20);
      expect(distribution[1].percentage).toBeCloseTo(33.3, 1);

      expect(distribution[2].zone).toBe(3);
      expect(distribution[2].timeSeconds).toBe(15);
      expect(distribution[2].percentage).toBeCloseTo(25, 1);

      expect(distribution[3].zone).toBe(4);
      expect(distribution[3].timeSeconds).toBe(10);
      expect(distribution[3].percentage).toBeCloseTo(16.7, 1);

      expect(distribution[4].zone).toBe(5);
      expect(distribution[4].timeSeconds).toBe(5);
      expect(distribution[4].percentage).toBeCloseTo(8.3, 1);
    });

    it('should return empty distribution for no data', () => {
      const distribution = calculateZoneDistribution([], 0, config);

      expect(distribution).toHaveLength(5);
      distribution.forEach(zone => {
        expect(zone.timeSeconds).toBe(0);
        expect(zone.percentage).toBe(0);
      });
    });

    it('should include zone labels and ranges', () => {
      const hrData: HRDataPoint[] = [
        { timestamp: 0, heartRate: 120 }
      ];

      const distribution = calculateZoneDistribution(hrData, 60, config);

      expect(distribution[0].label).toBe('Recovery');
      expect(distribution[0].range).toContain('bpm');
      expect(distribution[1].label).toBe('Endurance');
      expect(distribution[2].label).toBe('Tempo');
      expect(distribution[3].label).toBe('Threshold');
      expect(distribution[4].label).toBe('Anaerobic');
    });

    it('should convert time to minutes', () => {
      const hrData: HRDataPoint[] = Array(120).fill(null).map((_, i) => ({
        timestamp: i,
        heartRate: 120
      }));

      const distribution = calculateZoneDistribution(hrData, 120, config);

      // All time should be in zone 2
      expect(distribution[1].timeSeconds).toBe(120);
      expect(distribution[1].timeMinutes).toBe(2);
    });
  });

  describe('mergeZoneDistributions', () => {
    const config = createHRZoneConfig(185);

    it('should merge multiple zone distributions', () => {
      const dist1 = [
        { zone: 1, label: 'Recovery', timeSeconds: 60, timeMinutes: 1, percentage: 0, range: '93-111 bpm' },
        { zone: 2, label: 'Endurance', timeSeconds: 120, timeMinutes: 2, percentage: 0, range: '111-130 bpm' },
        { zone: 3, label: 'Tempo', timeSeconds: 0, timeMinutes: 0, percentage: 0, range: '130-148 bpm' },
        { zone: 4, label: 'Threshold', timeSeconds: 0, timeMinutes: 0, percentage: 0, range: '148-167 bpm' },
        { zone: 5, label: 'Anaerobic', timeSeconds: 0, timeMinutes: 0, percentage: 0, range: '167-185 bpm' }
      ];

      const dist2 = [
        { zone: 1, label: 'Recovery', timeSeconds: 0, timeMinutes: 0, percentage: 0, range: '93-111 bpm' },
        { zone: 2, label: 'Endurance', timeSeconds: 180, timeMinutes: 3, percentage: 0, range: '111-130 bpm' },
        { zone: 3, label: 'Tempo', timeSeconds: 120, timeMinutes: 2, percentage: 0, range: '130-148 bpm' },
        { zone: 4, label: 'Threshold', timeSeconds: 60, timeMinutes: 1, percentage: 0, range: '148-167 bpm' },
        { zone: 5, label: 'Anaerobic', timeSeconds: 0, timeMinutes: 0, percentage: 0, range: '167-185 bpm' }
      ];

      const merged = mergeZoneDistributions([dist1, dist2], config);

      expect(merged[0].timeSeconds).toBe(60); // Zone 1
      expect(merged[1].timeSeconds).toBe(300); // Zone 2: 120 + 180
      expect(merged[2].timeSeconds).toBe(120); // Zone 3
      expect(merged[3].timeSeconds).toBe(60); // Zone 4
      expect(merged[4].timeSeconds).toBe(0); // Zone 5

      // Check percentages are recalculated
      expect(merged[1].percentage).toBeCloseTo(55.6, 1); // 300/540 * 100
    });

    it('should return empty distribution for no distributions', () => {
      const merged = mergeZoneDistributions([], config);

      expect(merged).toHaveLength(5);
      merged.forEach(zone => {
        expect(zone.timeSeconds).toBe(0);
        expect(zone.percentage).toBe(0);
      });
    });
  });

  describe('findDominantZone', () => {
    it('should find zone with most time', () => {
      const distribution = [
        { zone: 1, label: 'Recovery', timeSeconds: 60, timeMinutes: 1, percentage: 10, range: '93-111 bpm' },
        { zone: 2, label: 'Endurance', timeSeconds: 300, timeMinutes: 5, percentage: 50, range: '111-130 bpm' },
        { zone: 3, label: 'Tempo', timeSeconds: 120, timeMinutes: 2, percentage: 20, range: '130-148 bpm' },
        { zone: 4, label: 'Threshold', timeSeconds: 90, timeMinutes: 1.5, percentage: 15, range: '148-167 bpm' },
        { zone: 5, label: 'Anaerobic', timeSeconds: 30, timeMinutes: 0.5, percentage: 5, range: '167-185 bpm' }
      ];

      expect(findDominantZone(distribution)).toBe(2);
    });

    it('should return 0 for empty distribution', () => {
      expect(findDominantZone([])).toBe(0);
    });
  });

  describe('createVisualizationData', () => {
    it('should create visualization data from distribution', () => {
      const distribution = [
        { zone: 1, label: 'Recovery', timeSeconds: 60, timeMinutes: 1, percentage: 10, range: '93-111 bpm' },
        { zone: 2, label: 'Endurance', timeSeconds: 300, timeMinutes: 5, percentage: 50, range: '111-130 bpm' },
        { zone: 3, label: 'Tempo', timeSeconds: 120, timeMinutes: 2, percentage: 20, range: '130-148 bpm' },
        { zone: 4, label: 'Threshold', timeSeconds: 90, timeMinutes: 1.5, percentage: 15, range: '148-167 bpm' },
        { zone: 5, label: 'Anaerobic', timeSeconds: 30, timeMinutes: 0.5, percentage: 5, range: '167-185 bpm' }
      ];

      const viz = createVisualizationData(distribution);

      expect(viz.labels).toHaveLength(5);
      expect(viz.values).toHaveLength(5);
      expect(viz.colors).toHaveLength(5);

      expect(viz.labels[0]).toBe('Zone 1: Recovery');
      expect(viz.labels[1]).toBe('Zone 2: Endurance');
      expect(viz.values[0]).toBe(10);
      expect(viz.values[1]).toBe(50);

      // Colors should be defined
      expect(viz.colors[0]).toBeDefined();
      expect(viz.colors[0]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('parseActivityHRData', () => {
    it('should parse HR data from activity with time series', () => {
      const activity = {
        averageHR: 150,
        maxHR: 175,
        activityDetailMetrics: [
          { heartRate: 140, directTimestamp: 0 },
          { heartRate: 150, directTimestamp: 60 },
          { heartRate: 160, directTimestamp: 120 },
          { heartRate: 155, directTimestamp: 180 }
        ]
      };

      const { hrData, averageHR, maxHR } = parseActivityHRData(activity);

      expect(averageHR).toBe(150);
      expect(maxHR).toBe(175);
      expect(hrData).toHaveLength(4);
      expect(hrData[0].heartRate).toBe(140);
      expect(hrData[1].heartRate).toBe(150);
    });

    it('should handle activity with only summary stats', () => {
      const activity = {
        averageHR: 145,
        maxHR: 170,
        duration: 1800 // 30 minutes
      };

      const { hrData, averageHR, maxHR } = parseActivityHRData(activity);

      expect(averageHR).toBe(145);
      expect(maxHR).toBe(170);
      // Should create synthetic data points
      expect(hrData.length).toBeGreaterThan(0);
    });

    it('should handle activity without HR data', () => {
      const activity = {
        duration: 1800
      };

      const { hrData, averageHR, maxHR } = parseActivityHRData(activity);

      expect(averageHR).toBeUndefined();
      expect(maxHR).toBeUndefined();
      expect(hrData).toHaveLength(0);
    });

    it('should skip HR data points with zero or invalid values', () => {
      const activity = {
        averageHR: 150,
        activityDetailMetrics: [
          { heartRate: 140, directTimestamp: 0 },
          { heartRate: 0, directTimestamp: 60 }, // Invalid
          { heartRate: 160, directTimestamp: 120 },
          { heartRate: -10, directTimestamp: 180 } // Invalid - but would be ignored by determineHRZone
        ]
      };

      const { hrData } = parseActivityHRData(activity);

      // Should only include valid HR points (> 0)
      const validPoints = hrData.filter(p => p.heartRate > 0);
      expect(validPoints).toHaveLength(2);
    });

    it('should cap synthetic data points at 500', () => {
      const activity = {
        averageHR: 150,
        duration: 10000 // Very long duration
      };

      const { hrData } = parseActivityHRData(activity);

      expect(hrData.length).toBeLessThanOrEqual(500);
    });
  });
});

/**
 * Form Zone Classifier Tests
 *
 * Tests zone classification, adaptive thresholds, and recommendations
 */

import { describe, it, expect } from 'vitest';
import { FormZoneClassifier } from '../../src/services/formZoneClassifier.js';
import type { FormZone } from '../../src/types/fatigue-freshness.js';

describe('FormZoneClassifier', () => {
  describe('classifyFormZone', () => {
    it('should classify TSB into overreached zone', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(-35, 50);

      expect(result.zone).toBe('overreached');
      expect(result.tsbRange.max).toBeLessThan(-24); // Adjusted for low fitness
      expect(result.characteristics.injuryRisk).toBe('very_high');
    });

    it('should classify TSB into fatigued zone', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(-25, 60);

      expect(result.zone).toBe('fatigued');
      expect(result.characteristics.injuryRisk).toBe('high');
      expect(result.recommendations.workoutTypes).toContain('easy recovery');
    });

    it('should classify TSB into productive training zone', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(-12, 70);

      expect(result.zone).toBe('productive_training');
      expect(result.characteristics.performancePotential).toBe('low');
      expect(result.recommendations.intensityGuidance).toContain('low');
    });

    it('should classify TSB into maintenance zone', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(0, 60);

      expect(result.zone).toBe('maintenance');
      expect(result.characteristics.recommendedIntensity).toBe('moderate');
    });

    it('should classify TSB into optimal race zone', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(15, 80);

      expect(result.zone).toBe('optimal_race');
      expect(result.characteristics.performancePotential).toBe('very_high');
      expect(result.recommendations.workoutTypes).toContain('race pace');
    });

    it('should classify TSB into fresh zone', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(30, 60);

      expect(result.zone).toBe('fresh');
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('detraining'))).toBe(true);
    });

    it('should apply adaptive thresholds based on CTL - low fitness', () => {
      const classifier = new FormZoneClassifier();

      // Low CTL (< 40) should narrow ranges (factor 0.8)
      const result = classifier.classifyFormZone(-25, 35);

      expect(result.zone).toBe('overreached'); // -30 * 0.8 = -24, so -25 is overreached
    });

    it('should apply adaptive thresholds based on CTL - moderate fitness', () => {
      const classifier = new FormZoneClassifier();

      // Moderate CTL (40-80) should use standard ranges (factor 1.0)
      const result = classifier.classifyFormZone(-25, 60);

      expect(result.zone).toBe('fatigued'); // -30 to -20 range
    });

    it('should apply adaptive thresholds based on CTL - high fitness', () => {
      const classifier = new FormZoneClassifier();

      // High CTL (> 80) should widen ranges (factor 1.2)
      const result = classifier.classifyFormZone(-26, 90);

      expect(result.zone).toBe('fatigued'); // -36 to -24 range (wider)
    });
  });

  describe('classifyMultipleZones', () => {
    it('should classify multiple TSB values', () => {
      const classifier = new FormZoneClassifier();
      const dataPoints = [
        { tsb: -35, ctl: 50, date: '2025-01-01' },
        { tsb: -10, ctl: 55, date: '2025-01-02' },
        { tsb: 15, ctl: 60, date: '2025-01-03' },
      ];

      const result = classifier.classifyMultipleZones(dataPoints);

      expect(result).toHaveLength(3);
      expect(result[0].zone).toBe('overreached');
      expect(result[1].zone).toBe('productive_training');
      expect(result[2].zone).toBe('optimal_race');
    });
  });

  describe('isOptimalForRace', () => {
    it('should return true for optimal race TSB', () => {
      const classifier = new FormZoneClassifier();

      expect(classifier.isOptimalForRace(15, 60)).toBe(true);
      expect(classifier.isOptimalForRace(20, 70)).toBe(true);
    });

    it('should return false for non-optimal TSB', () => {
      const classifier = new FormZoneClassifier();

      expect(classifier.isOptimalForRace(-10, 60)).toBe(false);
      expect(classifier.isOptimalForRace(30, 60)).toBe(false);
    });
  });

  describe('isOverreached', () => {
    it('should detect overreaching', () => {
      const classifier = new FormZoneClassifier();

      expect(classifier.isOverreached(-35)).toBe(true);
      expect(classifier.isOverreached(-31)).toBe(true);
    });

    it('should not detect overreaching for higher TSB', () => {
      const classifier = new FormZoneClassifier();

      expect(classifier.isOverreached(-25)).toBe(false);
      expect(classifier.isOverreached(0)).toBe(false);
    });
  });

  describe('isExcessivelyFresh', () => {
    it('should detect excessive freshness', () => {
      const classifier = new FormZoneClassifier();

      // Fresh threshold is 25, + 10 = 35
      expect(classifier.isExcessivelyFresh(40, 60)).toBe(true);
      expect(classifier.isExcessivelyFresh(50, 60)).toBe(true);
    });

    it('should not detect excessive freshness for normal values', () => {
      const classifier = new FormZoneClassifier();

      expect(classifier.isExcessivelyFresh(30, 60)).toBe(false);
      expect(classifier.isExcessivelyFresh(15, 60)).toBe(false);
    });
  });

  describe('getRecommendedTSBRange', () => {
    it('should return race range', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getRecommendedTSBRange('race', 60);

      expect(result.targetZone).toBe('optimal_race');
      expect(result.min).toBeGreaterThanOrEqual(8);
      expect(result.max).toBeLessThanOrEqual(27);
    });

    it('should return training range', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getRecommendedTSBRange('training', 60);

      expect(result.targetZone).toBe('productive_training');
      expect(result.min).toBeLessThan(0);
      expect(result.max).toBeLessThan(0);
    });

    it('should return recovery range', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getRecommendedTSBRange('recovery', 60);

      expect(result.targetZone).toBe('fresh');
      expect(result.min).toBeGreaterThan(20);
      expect(result.max).toBe(50);
    });

    it('should return maintenance range', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getRecommendedTSBRange('maintenance', 60);

      expect(result.targetZone).toBe('maintenance');
      expect(result.min).toBeGreaterThanOrEqual(-6);
      expect(result.max).toBeLessThanOrEqual(11);
    });
  });

  describe('estimateDaysToTargetZone', () => {
    it('should estimate days to reach optimal race zone with rest', () => {
      const classifier = new FormZoneClassifier();
      const days = classifier.estimateDaysToTargetZone(
        -15,  // currentTSB
        60,   // currentCTL
        75,   // currentATL
        'optimal_race',
        0     // rest (no TSS)
      );

      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThan(30);
    });

    it('should return 0 if already at target', () => {
      const classifier = new FormZoneClassifier();
      const days = classifier.estimateDaysToTargetZone(
        15,   // currentTSB (already optimal)
        60,
        45,
        'optimal_race',
        0
      );

      expect(days).toBe(0);
    });

    it('should estimate days with training load', () => {
      const classifier = new FormZoneClassifier();
      const days = classifier.estimateDaysToTargetZone(
        -15,
        60,
        75,
        'optimal_race',
        50    // light training
      );

      expect(days).toBeGreaterThan(0);
    });
  });

  describe('getZoneTransitionInfo', () => {
    it('should detect improving transition', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getZoneTransitionInfo('fatigued', 'maintenance');

      expect(result.direction).toBe('improving');
      expect(result.significance).toBe('minor');
      expect(result.interpretation).toContain('neutral');
    });

    it('should detect declining transition', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getZoneTransitionInfo('maintenance', 'fatigued');

      expect(result.direction).toBe('declining');
      expect(result.significance).toBe('minor');
      expect(result.interpretation).toContain('fatigue');
    });

    it('should detect major transition', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getZoneTransitionInfo('optimal_race', 'fatigued');

      expect(result.direction).toBe('declining');
      expect(result.significance).toBe('major');
    });

    it('should detect neutral transition (same zone)', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getZoneTransitionInfo('maintenance', 'maintenance');

      expect(result.direction).toBe('neutral');
      expect(result.significance).toBe('none');
      expect(result.interpretation).toContain('Remained');
    });

    it('should provide critical interpretation for overreached', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.getZoneTransitionInfo('fatigued', 'overreached');

      expect(result.direction).toBe('declining');
      expect(result.interpretation).toContain('CRITICAL');
    });
  });

  describe('edge cases', () => {
    it('should handle zero CTL', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(0, 0);

      expect(result.zone).toBeDefined();
      expect(result.tsbRange).toBeDefined();
    });

    it('should handle extreme negative TSB', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(-100, 50);

      expect(result.zone).toBe('overreached');
      expect(result.tsbRange.max).toBeLessThan(-20);
    });

    it('should handle extreme positive TSB', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(100, 50);

      expect(result.zone).toBe('fresh');
      expect(result.tsbRange.min).toBeGreaterThan(20);
    });

    it('should handle custom thresholds', () => {
      const classifier = new FormZoneClassifier({
        overreached: { max: -40 },
        fatigued: { min: -40, max: -25 },
      });

      const result = classifier.classifyFormZone(-30, 60);

      // With custom thresholds, -30 should be fatigued
      expect(result.zone).toBe('fatigued');
    });

    it('should handle very high CTL', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(15, 150);

      expect(result.zone).toBe('optimal_race');
      // High CTL should widen ranges
      expect(result.tsbRange.min).toBeLessThan(10);
    });
  });

  describe('confidence calculations', () => {
    it('should provide consistent zone info', () => {
      const classifier = new FormZoneClassifier();
      const result1 = classifier.classifyFormZone(15, 60);
      const result2 = classifier.classifyFormZone(15, 60);

      expect(result1.zone).toBe(result2.zone);
      expect(result1.tsbRange).toEqual(result2.tsbRange);
    });

    it('should include all required zone info fields', () => {
      const classifier = new FormZoneClassifier();
      const result = classifier.classifyFormZone(15, 60);

      expect(result.zone).toBeDefined();
      expect(result.label).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.color).toBeDefined();
      expect(result.tsbRange).toBeDefined();
      expect(result.characteristics).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should provide appropriate recommendations for each zone', () => {
      const classifier = new FormZoneClassifier();
      const zones: FormZone[] = [
        'overreached',
        'fatigued',
        'productive_training',
        'maintenance',
        'optimal_race',
        'fresh'
      ];

      for (const expectedZone of zones) {
        const tsbValue = {
          'overreached': -35,
          'fatigued': -25,
          'productive_training': -12,
          'maintenance': 0,
          'optimal_race': 15,
          'fresh': 30
        }[expectedZone];

        const result = classifier.classifyFormZone(tsbValue, 60);

        expect(result.zone).toBe(expectedZone);
        expect(result.recommendations.workoutTypes.length).toBeGreaterThan(0);
        expect(result.recommendations.intensityGuidance).toBeTruthy();
        expect(result.recommendations.volumeGuidance).toBeTruthy();
      }
    });
  });
});

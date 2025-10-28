/**
 * Form Predictor Tests
 *
 * Tests future predictions, taper plans, recovery estimates, and scenario simulations
 */

import { describe, it, expect } from 'vitest';
import { FormPredictor } from '../../src/services/formPredictor.js';
import { FormZoneClassifier } from '../../src/services/formZoneClassifier.js';

// Helper to get future date
function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

describe('FormPredictor', () => {
  describe('predictFutureForm', () => {
    it('should predict future form with rest scenario', () => {
      const predictor = new FormPredictor();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const prediction = predictor.predictFutureForm({
        targetDate: futureDate.toISOString().split('T')[0],
        plannedTSS: 0,  // Complete rest
        currentCTL: 60,
        currentATL: 75,
        currentTSB: -15,
      });

      expect(prediction.predictedTSB).toBeGreaterThan(-15);  // Should improve with rest
      expect(prediction.predictedZone).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
    });

    it('should predict future form with maintenance load', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(15),
        plannedTSS: 60,  // Maintenance
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(prediction.predictedTSB).toBeDefined();
      expect(Math.abs(prediction.predictedTSB)).toBeLessThan(10);  // Should stay near 0
    });

    it('should predict future form with light training', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 40,  // Light training
        currentCTL: 60,
        currentATL: 75,
        currentTSB: -15,
      });

      expect(prediction.predictedTSB).toBeGreaterThan(-15);  // Should improve
    });

    it('should predict future form with moderate training', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 80,  // Moderate training
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(prediction.predictedTSB).toBeDefined();
    });

    it('should predict future form with hard training', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 100,  // Hard training
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(prediction.predictedTSB).toBeLessThan(0);  // Should decline with high load
    });

    it('should handle array of daily TSS values', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: [80, 60, 100, 40, 80, 60, 0],  // Varied training week
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(prediction.predictedTSB).toBeDefined();
      expect(prediction.assumptions.plannedDailyTSS).toHaveLength(7);
    });

    it('should apply recovery days', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 80,
        recoveryDays: [2, 5],  // Days 2 and 5 are rest
        currentCTL: 60,
        currentATL: 75,
        currentTSB: -15,
      });

      expect(prediction.assumptions.plannedDailyTSS[2]).toBe(0);
      expect(prediction.assumptions.plannedDailyTSS[5]).toBe(0);
    });

    it('should calculate confidence decreasing with time', () => {
      const predictor = new FormPredictor();

      const shortTerm = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 60,
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      const longTerm = predictor.predictFutureForm({
        targetDate: getFutureDate(22),
        plannedTSS: 60,
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(shortTerm.confidence).toBeGreaterThan(longTerm.confidence);
    });

    it('should provide projection details', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(15),
        plannedTSS: 0,
        currentCTL: 60,
        currentATL: 75,
        currentTSB: -15,
      });

      expect(prediction.details.projectedCTL).toBeDefined();
      expect(prediction.details.projectedATL).toBeDefined();
      expect(prediction.details.expectedFatigueDecay).toBeDefined();
      expect(prediction.details.expectedFitnessDecay).toBeDefined();
    });

    it('should generate recommendations', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(15),
        plannedTSS: 0,
        currentCTL: 60,
        currentATL: 90,  // High fatigue
        currentTSB: -30,  // Overreached
      });

      expect(prediction.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle negative days (past date)', () => {
      const predictor = new FormPredictor();

      expect(() => {
        predictor.predictFutureForm({
          targetDate: '2020-01-01',  // Past date
          plannedTSS: 60,
          currentCTL: 60,
          currentATL: 60,
          currentTSB: 0,
        });
      }).toThrow();
    });
  });

  describe('generateTaperPlan', () => {
    it('should generate linear taper plan', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 7,
        targetTSB: 17,
        strategy: 'linear',
        volumeReduction: 50,
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.taperDuration).toBe(7);
      expect(plan.schedule).toHaveLength(7);
      expect(plan.strategy.type).toBe('linear');
      expect(plan.strategy.volumeReduction).toBe(50);

      // Verify linear reduction
      expect(plan.schedule[0].plannedTSS).toBeGreaterThan(plan.schedule[6].plannedTSS);
    });

    it('should generate exponential taper plan', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 14,
        targetTSB: 17,
        strategy: 'exponential',
        volumeReduction: 60,
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.strategy.type).toBe('exponential');
      expect(plan.schedule).toHaveLength(14);

      // Verify exponential reduction (more aggressive early)
      const earlyReduction = plan.schedule[0].plannedTSS - plan.schedule[3].plannedTSS;
      const lateReduction = plan.schedule[10].plannedTSS - plan.schedule[13].plannedTSS;
      expect(earlyReduction).toBeGreaterThan(lateReduction);
    });

    it('should generate step taper plan', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 9,
        targetTSB: 17,
        strategy: 'step',
        volumeReduction: 60,
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.strategy.type).toBe('step');

      // Verify step reductions (plateaus)
      const tssValues = plan.schedule.map(s => s.plannedTSS);
      const uniqueTSS = new Set(tssValues);
      expect(uniqueTSS.size).toBeLessThan(tssValues.length);  // Should have repeated values
    });

    it('should include current state', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 14,
        targetTSB: 17,
        currentCTL: 80,
        currentATL: 85,
        currentTSB: -5,
      });

      expect(plan.currentState.ctl).toBe(80);
      expect(plan.currentState.atl).toBe(85);
      expect(plan.currentState.tsb).toBe(-5);
      expect(plan.currentState.zone).toBeDefined();
    });

    it('should include target state', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 14,
        targetTSB: 17,
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.targetState.targetTSB).toBe(17);
      expect(plan.targetState.targetZone).toBe('optimal_race');
      expect(plan.targetState.targetCTL).toBeDefined();
    });

    it('should provide daily schedule with predictions', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 7,
        targetTSB: 17,
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      for (const day of plan.schedule) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(day.dayOfTaper).toBeGreaterThan(0);
        expect(day.plannedTSS).toBeGreaterThanOrEqual(0);
        expect(day.reductionFromPeak).toBeGreaterThanOrEqual(0);
        expect(day.predictedTSB).toBeDefined();
        expect(day.predictedZone).toBeDefined();
        expect(day.notes).toBeTruthy();
      }
    });

    it('should maintain intensity if requested', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 14,
        targetTSB: 17,
        maintainIntensity: true,
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.strategy.intensityMaintenance).toBe(true);
      expect(plan.strategy.criticalWorkouts.length).toBeGreaterThan(0);
    });

    it('should generate warnings for problematic scenarios', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 14,
        targetTSB: 17,
        currentCTL: 30,  // Low fitness
        currentATL: 60,  // High fatigue
        currentTSB: -30,  // Overreached
      });

      expect(plan.warnings.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        taperDuration: 14,
        targetTSB: 17,
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.recommendations.length).toBeGreaterThan(0);
    });

    it('should use default values when optional params omitted', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(15),
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.taperDuration).toBe(14);  // Default
      expect(plan.targetState.targetTSB).toBe(17);  // Default
      expect(plan.strategy.type).toBe('exponential');  // Default
      expect(plan.strategy.volumeReduction).toBe(50);  // Default
    });
  });

  describe('estimateRecoveryTime', () => {
    it('should estimate recovery with complete rest', () => {
      const predictor = new FormPredictor();

      const estimate = predictor.estimateRecoveryTime(
        60,   // currentCTL
        80,   // currentATL
        -20,  // currentTSB
        'optimal_race',
        true  // rest
      );

      expect(estimate.estimatedDays).toBeGreaterThan(0);
      expect(estimate.dailyTSBChange).toBeGreaterThan(0);  // Should improve
      expect(estimate.targetTSBRange).toBeDefined();
      expect(estimate.recommendations.length).toBeGreaterThan(0);
    });

    it('should estimate recovery with active recovery', () => {
      const predictor = new FormPredictor();

      const estimate = predictor.estimateRecoveryTime(
        60,
        80,
        -20,
        'optimal_race',
        false  // active recovery
      );

      expect(estimate.estimatedDays).toBeGreaterThan(0);
      expect(estimate.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle different target zones', () => {
      const predictor = new FormPredictor();

      const raceRecovery = predictor.estimateRecoveryTime(60, 80, -20, 'optimal_race', true);
      const freshRecovery = predictor.estimateRecoveryTime(60, 80, -20, 'fresh', true);

      expect(freshRecovery.estimatedDays).toBeGreaterThan(raceRecovery.estimatedDays);
    });
  });

  describe('simulateScenario', () => {
    it('should simulate single TSS value', () => {
      const predictor = new FormPredictor();

      const scenario = predictor.simulateScenario(
        60,   // currentCTL
        60,   // currentATL
        0,    // currentTSB
        7,    // scenarioDays
        80    // dailyTSS
      );

      expect(scenario).toHaveLength(7);

      for (const day of scenario) {
        expect(day.day).toBeGreaterThan(0);
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(day.tss).toBe(80);
        expect(day.ctl).toBeDefined();
        expect(day.atl).toBeDefined();
        expect(day.tsb).toBeDefined();
        expect(day.zone).toBeDefined();
      }
    });

    it('should simulate array of TSS values', () => {
      const predictor = new FormPredictor();

      const scenario = predictor.simulateScenario(
        60,
        60,
        0,
        5,
        [100, 80, 60, 40, 0]  // Progressive reduction
      );

      expect(scenario).toHaveLength(5);
      expect(scenario[0].tss).toBe(100);
      expect(scenario[4].tss).toBe(0);

      // TSB should improve with reducing load
      expect(scenario[4].tsb).toBeGreaterThan(scenario[0].tsb);
    });

    it('should show progressive CTL/ATL changes', () => {
      const predictor = new FormPredictor();

      const scenario = predictor.simulateScenario(
        60,
        60,
        0,
        7,
        100  // High load
      );

      // ATL should increase faster than CTL (7-day vs 42-day time constant)
      expect(scenario[6].atl).toBeGreaterThan(scenario[0].atl);
    });
  });

  describe('edge cases', () => {
    it('should handle zero CTL/ATL', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 50,
        currentCTL: 0,
        currentATL: 0,
        currentTSB: 0,
      });

      expect(prediction.predictedTSB).toBeDefined();
    });

    it('should handle extreme TSS values', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 300,  // Extreme load
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(prediction.predictedTSB).toBeLessThan(-20);  // Should be highly fatigued
    });

    it('should handle very long prediction periods', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(60),  // ~2 months
        plannedTSS: 60,
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(prediction.confidence).toBeLessThan(70);  // Lower confidence for long periods
    });

    it('should handle variable TSS with high variance', () => {
      const predictor = new FormPredictor();

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: [10, 150, 20, 130, 15, 140, 10],  // High variance
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      // Higher variance should reduce confidence
      expect(prediction.confidence).toBeLessThan(90);
    });

    it('should handle taper with short duration', () => {
      const predictor = new FormPredictor();

      const plan = predictor.generateTaperPlan({
        raceDate: getFutureDate(10),
        taperDuration: 3,  // Very short taper
        currentCTL: 80,
        currentATL: 80,
        currentTSB: 0,
      });

      expect(plan.schedule).toHaveLength(3);
      expect(plan.warnings.some(w => w.includes('short'))).toBe(true);
    });

    it('should handle recovery from extreme fatigue', () => {
      const predictor = new FormPredictor();

      const estimate = predictor.estimateRecoveryTime(
        60,
        120,  // Extreme ATL
        -60,  // Extreme TSB
        'optimal_race',
        true
      );

      expect(estimate.estimatedDays).toBeGreaterThan(7);  // Should take significant time
    });
  });

  describe('zone classifier integration', () => {
    it('should use custom zone classifier', () => {
      const customClassifier = new FormZoneClassifier({
        optimalRace: { min: 5, max: 20 },  // Custom thresholds
      });

      const predictor = new FormPredictor(customClassifier);

      const prediction = predictor.predictFutureForm({
        targetDate: getFutureDate(8),
        plannedTSS: 0,
        currentCTL: 60,
        currentATL: 75,
        currentTSB: -15,
      });

      expect(prediction.predictedZone).toBeDefined();
    });
  });

  describe('statistical accuracy', () => {
    it('should produce consistent results with same inputs', () => {
      const predictor = new FormPredictor();

      const pred1 = predictor.predictFutureForm({
        targetDate: getFutureDate(15),
        plannedTSS: 60,
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      const pred2 = predictor.predictFutureForm({
        targetDate: getFutureDate(15),
        plannedTSS: 60,
        currentCTL: 60,
        currentATL: 60,
        currentTSB: 0,
      });

      expect(pred1.predictedTSB).toBe(pred2.predictedTSB);
      expect(pred1.predictedZone).toBe(pred2.predictedZone);
    });

    it('should follow EWMA decay correctly', () => {
      const predictor = new FormPredictor();

      // With zero TSS, CTL and ATL should decay exponentially
      const scenario = predictor.simulateScenario(
        100,  // Start with CTL=100
        100,  // Start with ATL=100
        0,
        42,   // Full CTL time constant
        0     // Zero TSS
      );

      // After 42 days with zero TSS, CTL should decay to ~37% (1/e)
      const finalCTL = scenario[scenario.length - 1].ctl;
      expect(finalCTL).toBeGreaterThan(30);
      expect(finalCTL).toBeLessThan(40);
    });
  });
});

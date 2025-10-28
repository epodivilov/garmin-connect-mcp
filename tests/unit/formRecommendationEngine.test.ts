/**
 * Form Recommendation Engine Tests
 */

import { describe, it, expect } from 'vitest';
import { FormRecommendationEngine } from '../../src/services/formRecommendationEngine.js';

describe('FormRecommendationEngine', () => {
  describe('generateRecommendation', () => {
    it('should generate recommendations for overreached zone', () => {
      const engine = new FormRecommendationEngine();
      
      const recommendation = engine.generateRecommendation({
        currentZone: 'overreached',
        currentTSB: -35,
        currentCTL: 60,
        currentATL: 95,
        tsbTrend: 'declining',
        recentZoneChanges: 1,
        readinessScore: 40,
      });

      expect(recommendation.recommendedIntensity).toBe('very_low');
      expect(recommendation.guidance.primary).toContain('CRITICAL');
      expect(recommendation.guidance.cautions.length).toBeGreaterThan(0);
    });

    it('should generate recommendations for optimal_race zone', () => {
      const engine = new FormRecommendationEngine();
      
      const recommendation = engine.generateRecommendation({
        currentZone: 'optimal_race',
        currentTSB: 15,
        currentCTL: 80,
        currentATL: 65,
        tsbTrend: 'improving',
        recentZoneChanges: 0,
      });

      expect(recommendation.recommendedIntensity).toBe('high');
      expect(recommendation.guidance.primary).toContain('race');
    });

    it('should adjust for poor sleep', () => {
      const engine = new FormRecommendationEngine();
      
      const recommendation = engine.generateRecommendation({
        currentZone: 'maintenance',
        currentTSB: 0,
        currentCTL: 60,
        currentATL: 60,
        tsbTrend: 'stable',
        recentZoneChanges: 0,
        sleepQuality: 'poor',
      });

      expect(recommendation.adjustments?.sleepAdjustment).toContain('Reduce');
    });

    it('should adjust for low HRV', () => {
      const engine = new FormRecommendationEngine();
      
      const recommendation = engine.generateRecommendation({
        currentZone: 'maintenance',
        currentTSB: 0,
        currentCTL: 60,
        currentATL: 60,
        tsbTrend: 'stable',
        recentZoneChanges: 0,
        hrvStatus: 'low',
      });

      expect(recommendation.recommendedIntensity).not.toBe('high');
      expect(recommendation.adjustments?.hrvAdjustment).toContain('Low HRV');
    });
  });

  describe('generateWeeklyRecommendations', () => {
    it('should generate recommendations for full week', () => {
      const engine = new FormRecommendationEngine();
      
      const predictions = [
        { day: 1, predictedTSB: 0, predictedZone: 'maintenance' as const },
        { day: 2, predictedTSB: 5, predictedZone: 'maintenance' as const },
        { day: 3, predictedTSB: 10, predictedZone: 'optimal_race' as const },
      ];

      const recommendations = engine.generateWeeklyRecommendations({
        currentZone: 'maintenance',
        currentTSB: 0,
        currentCTL: 60,
        currentATL: 60,
        tsbTrend: 'improving',
        recentZoneChanges: 0,
      }, predictions);

      expect(recommendations).toHaveLength(3);
      expect(recommendations[2].currentZone).toBe('optimal_race');
    });
  });
});

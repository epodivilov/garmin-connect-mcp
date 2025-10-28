/**
 * Fatigue-Freshness Pipeline Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { FormZoneClassifier } from '../../src/services/formZoneClassifier.js';
import { FormTrendAnalyzer } from '../../src/services/formTrendAnalyzer.js';
import { FormPredictor } from '../../src/services/formPredictor.js';
import { FormHistoryStorage } from '../../src/services/formHistoryStorage.js';
import { FormPerformanceAnalyzer } from '../../src/services/formPerformanceAnalyzer.js';
import { FormRecommendationEngine } from '../../src/services/formRecommendationEngine.js';
import type { FormSnapshot } from '../../src/types/fatigue-freshness.js';
import { tmpdir } from 'os';
import { join } from 'path';

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

describe('Fatigue-Freshness Pipeline Integration', () => {
  it('should complete full analysis pipeline', async () => {
    // Zone Classification
    const classifier = new FormZoneClassifier();
    const zoneInfo = classifier.classifyFormZone(-15, 60);
    expect(zoneInfo.zone).toBe('productive_training');

    // Create snapshots
    const snapshots: FormSnapshot[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      snapshots.push(createSnapshot(
        date.toISOString().split('T')[0],
        -20 + i,
        60 + i,
        'maintenance'
      ));
    }

    // Trend Analysis
    const analyzer = new FormTrendAnalyzer(classifier);
    const trends = analyzer.analyzeMultipleTrends(snapshots);
    expect(trends.week).toBeDefined();
    expect(trends.twoWeeks.direction).toBe('improving');

    // Predictions
    const predictor = new FormPredictor(classifier);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const prediction = predictor.predictFutureForm({
      targetDate: futureDate.toISOString().split('T')[0],
      plannedTSS: 60,
      currentCTL: 67,
      currentATL: 73,
      currentTSB: -6,
    });

    expect(prediction.predictedTSB).toBeDefined();

    // Recommendations
    const engine = new FormRecommendationEngine(classifier);
    const recommendation = engine.generateRecommendation({
      currentZone: zoneInfo.zone,
      currentTSB: -6,
      currentCTL: 67,
      currentATL: 73,
      tsbTrend: trends.twoWeeks.direction,
      recentZoneChanges: trends.twoWeeks.zoneChanges.length,
    });

    expect(recommendation.recommendedTSS).toBeDefined();
  });

  it('should support periodization integration', () => {
    const classifier = new FormZoneClassifier();

    const basePhase = classifier.classifyFormZone(-15, 50);
    expect(basePhase.zone).toBe('productive_training');
    
    const peakPhase = classifier.classifyFormZone(15, 80);
    expect(peakPhase.zone).toBe('optimal_race');
  });
});

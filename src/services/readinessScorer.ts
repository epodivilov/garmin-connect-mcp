/**
 * Readiness Scorer Service
 *
 * Calculates comprehensive readiness scores combining:
 * - HRV (25%): Heart rate variability vs baseline
 * - Sleep (25%): Sleep quality score
 * - Training Stress Balance (20%): Form/fitness/fatigue
 * - Resting HR (15%): Resting heart rate vs baseline
 * - Body Battery (15%): Garmin's body battery metric
 *
 * Handles missing metrics with weight redistribution.
 */

import type {
  ReadinessScore,
  ReadinessInput,
  ReadinessConfig,
  MetricContribution,
  TrainingRecommendation,
  ReadinessFactor,
} from '../types/readiness.js';

const DEFAULT_CONFIG: ReadinessConfig = {
  weights: {
    hrv: 0.25,
    sleep: 0.25,
    trainingStressBalance: 0.20,
    restingHeartRate: 0.15,
    bodyBattery: 0.15,
  },
  redistributeWeights: true,
};

/**
 * Readiness Scorer Service
 */
export class ReadinessScorer {
  private config: ReadinessConfig;

  constructor(config: Partial<ReadinessConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: { ...DEFAULT_CONFIG.weights, ...config.weights },
    };
  }

  /**
   * Calculate readiness score
   */
  calculate(input: ReadinessInput): ReadinessScore {
    // Calculate individual metric contributions
    const hrvContribution = this.calculateHRVScore(input.hrv, input.hrvBaseline);
    const sleepContribution = this.calculateSleepScore(input.sleepScore);
    const tsbContribution = this.calculateTSBScore(input.tsb);
    const restingHRContribution = this.calculateRestingHRScore(
      input.restingHeartRate,
      input.restingHeartRateBaseline
    );
    const bodyBatteryContribution = this.calculateBodyBatteryScore(
      input.bodyBattery
    );

    // Collect all contributions
    const contributions = [
      { key: 'hrv', contribution: hrvContribution },
      { key: 'sleep', contribution: sleepContribution },
      { key: 'trainingStressBalance', contribution: tsbContribution },
      { key: 'restingHeartRate', contribution: restingHRContribution },
      { key: 'bodyBattery', contribution: bodyBatteryContribution },
    ];

    // Redistribute weights if needed
    const weights = this.redistributeWeights(contributions);

    // Calculate weighted scores
    const metrics = {
      hrv: this.applyWeight(hrvContribution, weights.hrv),
      sleep: this.applyWeight(sleepContribution, weights.sleep),
      trainingStressBalance: this.applyWeight(
        tsbContribution,
        weights.trainingStressBalance
      ),
      restingHeartRate: this.applyWeight(
        restingHRContribution,
        weights.restingHeartRate
      ),
      bodyBattery: this.applyWeight(
        bodyBatteryContribution,
        weights.bodyBattery
      ),
    };

    // Calculate overall score
    const overall = this.calculateOverallScore(metrics);

    // Generate recommendation
    const recommendation = this.generateRecommendation(overall, metrics);

    // Identify factors
    const factors = this.identifyFactors(metrics);

    return {
      overall: Math.round(overall),
      date: input.date,
      metrics,
      recommendation,
      factors,
    };
  }

  /**
   * Calculate HRV score (0-100)
   */
  private calculateHRVScore(
    hrv: number | undefined,
    baseline: number | undefined
  ): MetricContribution {
    if (hrv === undefined || baseline === undefined) {
      return this.createMissingMetric('HRV');
    }

    // Calculate deviation from baseline
    const deviation = ((hrv - baseline) / baseline) * 100;

    // Score based on deviation
    // +20% or more = 100
    // +10% = 90
    // 0% = 80
    // -10% = 60
    // -20% = 40
    // -30% or less = 20
    let score = 80 + deviation * 2;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Classify status
    let status: MetricContribution['status'];
    if (score >= 85) status = 'optimal';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'fair';
    else status = 'poor';

    return {
      name: 'HRV',
      value: hrv,
      score,
      weight: 0,
      weightedScore: 0,
      status,
    };
  }

  /**
   * Calculate sleep score (0-100)
   */
  private calculateSleepScore(
    sleepScore: number | undefined
  ): MetricContribution {
    if (sleepScore === undefined) {
      return this.createMissingMetric('Sleep Quality');
    }

    // Sleep score is already 0-100, use directly
    const score = sleepScore;

    // Classify status
    let status: MetricContribution['status'];
    if (score >= 80) status = 'optimal';
    else if (score >= 65) status = 'good';
    else if (score >= 50) status = 'fair';
    else status = 'poor';

    return {
      name: 'Sleep Quality',
      value: sleepScore,
      score,
      weight: 0,
      weightedScore: 0,
      status,
    };
  }

  /**
   * Calculate TSB score (0-100)
   */
  private calculateTSBScore(tsb: number | undefined): MetricContribution {
    if (tsb === undefined) {
      return this.createMissingMetric('Training Stress Balance');
    }

    // TSB interpretation:
    // > +10 = Fresh (100)
    // 0 to +10 = Optimal form (90)
    // -10 to 0 = Slight fatigue (70)
    // -20 to -10 = Moderate fatigue (50)
    // -30 to -20 = High fatigue (30)
    // < -30 = Overreaching (10)

    let score = 70; // Default

    if (tsb > 10) {
      score = 100;
    } else if (tsb > 0) {
      score = 90 + tsb; // 90-100
    } else if (tsb > -10) {
      score = 70 + tsb * 2; // 50-70
    } else if (tsb > -20) {
      score = 50 + (tsb + 10) * 2; // 30-50
    } else if (tsb > -30) {
      score = 30 + (tsb + 20) * 2; // 10-30
    } else {
      score = 10;
    }

    // Classify status
    let status: MetricContribution['status'];
    if (score >= 85) status = 'optimal';
    else if (score >= 65) status = 'good';
    else if (score >= 45) status = 'fair';
    else status = 'poor';

    return {
      name: 'Training Stress Balance',
      value: tsb,
      score,
      weight: 0,
      weightedScore: 0,
      status,
    };
  }

  /**
   * Calculate resting HR score (0-100)
   */
  private calculateRestingHRScore(
    restingHR: number | undefined,
    baseline: number | undefined
  ): MetricContribution {
    if (restingHR === undefined) {
      return this.createMissingMetric('Resting Heart Rate');
    }

    // If no baseline, use absolute thresholds
    if (baseline === undefined) {
      // General healthy resting HR: 50-70
      let score = 80;
      if (restingHR < 50) score = 100;
      else if (restingHR < 60) score = 90;
      else if (restingHR < 70) score = 80;
      else if (restingHR < 80) score = 60;
      else score = 40;

      return {
        name: 'Resting Heart Rate',
        value: restingHR,
        score,
        weight: 0,
        weightedScore: 0,
        status: score >= 70 ? 'good' : 'fair',
      };
    }

    // Calculate deviation from baseline
    const deviation = restingHR - baseline;

    // Score based on deviation
    // -5 bpm or more = 100
    // 0 bpm = 85
    // +3 bpm = 70
    // +5 bpm = 50
    // +8 bpm = 30
    // +10 bpm or more = 10
    let score = 85 - deviation * 7;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Classify status
    let status: MetricContribution['status'];
    if (score >= 85) status = 'optimal';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'fair';
    else status = 'poor';

    return {
      name: 'Resting Heart Rate',
      value: restingHR,
      score,
      weight: 0,
      weightedScore: 0,
      status,
    };
  }

  /**
   * Calculate body battery score (0-100)
   */
  private calculateBodyBatteryScore(
    bodyBattery: number | undefined
  ): MetricContribution {
    if (bodyBattery === undefined) {
      return this.createMissingMetric('Body Battery');
    }

    // Body Battery is already 0-100, use directly
    const score = bodyBattery;

    // Classify status
    let status: MetricContribution['status'];
    if (score >= 75) status = 'optimal';
    else if (score >= 50) status = 'good';
    else if (score >= 25) status = 'fair';
    else status = 'poor';

    return {
      name: 'Body Battery',
      value: bodyBattery,
      score,
      weight: 0,
      weightedScore: 0,
      status,
    };
  }

  /**
   * Create metric contribution for missing data
   */
  private createMissingMetric(name: string): MetricContribution {
    return {
      name,
      value: undefined,
      score: 0,
      weight: 0,
      weightedScore: 0,
      status: 'fair',
    };
  }

  /**
   * Redistribute weights for missing metrics
   */
  private redistributeWeights(
    contributions: Array<{
      key: string;
      contribution: MetricContribution;
    }>
  ): ReadinessConfig['weights'] {
    const weights = { ...this.config.weights };

    if (!this.config.redistributeWeights) {
      return weights;
    }

    // Find missing metrics
    const missing = contributions.filter((c) => c.contribution.value === undefined);
    const available = contributions.filter(
      (c) => c.contribution.value !== undefined
    );

    if (missing.length === 0 || available.length === 0) {
      return weights;
    }

    // Calculate total weight to redistribute
    const totalMissingWeight = missing.reduce(
      (sum, m) => sum + weights[m.key as keyof ReadinessConfig['weights']],
      0
    );

    // Calculate total available weight
    const totalAvailableWeight = available.reduce(
      (sum, a) => sum + weights[a.key as keyof ReadinessConfig['weights']],
      0
    );

    // Redistribute proportionally
    for (const item of available) {
      const key = item.key as keyof ReadinessConfig['weights'];
      const proportion = weights[key] / totalAvailableWeight;
      weights[key] = weights[key] + totalMissingWeight * proportion;
    }

    // Zero out missing metrics
    for (const item of missing) {
      const key = item.key as keyof ReadinessConfig['weights'];
      weights[key] = 0;
    }

    return weights;
  }

  /**
   * Apply weight to metric contribution
   */
  private applyWeight(
    contribution: MetricContribution,
    weight: number
  ): MetricContribution {
    return {
      ...contribution,
      weight,
      weightedScore: contribution.score * weight,
    };
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(
    metrics: ReadinessScore['metrics']
  ): number {
    return Object.values(metrics).reduce(
      (sum, m) => sum + m.weightedScore,
      0
    );
  }

  /**
   * Generate training recommendation
   */
  private generateRecommendation(
    overall: number,
    metrics: ReadinessScore['metrics']
  ): TrainingRecommendation {
    // Determine recommendation level
    let level: TrainingRecommendation['level'];
    let intensityGuidance: number;
    let volumeGuidance: number;
    let message: string;
    const avoid: string[] = [];
    const suggested: string[] = [];

    if (overall >= 85) {
      level = 'high';
      intensityGuidance = 100;
      volumeGuidance = 110;
      message = 'Excellent readiness! You can handle high-intensity training.';
      suggested.push('High-intensity intervals', 'Long endurance sessions');
    } else if (overall >= 70) {
      level = 'normal';
      intensityGuidance = 85;
      volumeGuidance = 100;
      message = 'Good readiness. Proceed with normal training as planned.';
      suggested.push('Moderate intensity', 'Normal training volume');
    } else if (overall >= 55) {
      level = 'moderate';
      intensityGuidance = 65;
      volumeGuidance = 80;
      message =
        'Moderate readiness. Consider reducing intensity or volume slightly.';
      avoid.push('High-intensity intervals', 'Long endurance sessions');
      suggested.push('Moderate aerobic training', 'Technique work');
    } else if (overall >= 40) {
      level = 'light';
      intensityGuidance = 45;
      volumeGuidance = 60;
      message =
        'Low readiness. Focus on light activity and recovery. Avoid hard efforts.';
      avoid.push('High-intensity training', 'Long sessions');
      suggested.push('Easy recovery runs', 'Walking', 'Yoga');
    } else {
      level = 'rest';
      intensityGuidance = 20;
      volumeGuidance = 30;
      message =
        'Very low readiness. Prioritize rest and recovery. Avoid training today.';
      avoid.push('All intense training', 'Long endurance sessions');
      suggested.push('Complete rest', 'Light walking', 'Stretching');
    }

    // Adjust based on specific metric issues
    if (metrics.hrv.status === 'poor') {
      message += ' Your HRV is significantly suppressed, indicating stress or fatigue.';
      avoid.push('High-intensity training');
    }

    if (metrics.sleep.status === 'poor') {
      message += ' Poor sleep quality is affecting your recovery.';
      suggested.push('Earlier bedtime', 'Sleep hygiene improvements');
    }

    if (metrics.trainingStressBalance.status === 'poor') {
      message += ' Your training stress balance indicates overreaching.';
      avoid.push('Additional training load');
    }

    return {
      level,
      intensityGuidance,
      volumeGuidance,
      message,
      avoid: avoid.length > 0 ? avoid : undefined,
      suggested: suggested.length > 0 ? suggested : undefined,
    };
  }

  /**
   * Identify factors affecting readiness
   */
  private identifyFactors(
    metrics: ReadinessScore['metrics']
  ): ReadinessFactor[] {
    const factors: ReadinessFactor[] = [];

    // Check each metric
    for (const metric of Object.values(metrics)) {
      if (metric.value === undefined) continue;

      const impact = metric.weight;

      if (metric.status === 'optimal') {
        factors.push({
          type: 'positive',
          description: `${metric.name} is optimal (${Math.round(metric.score)}/100)`,
          impact,
        });
      } else if (metric.status === 'poor') {
        factors.push({
          type: 'negative',
          description: `${metric.name} is poor (${Math.round(metric.score)}/100)`,
          impact,
        });
      } else if (metric.status === 'fair') {
        factors.push({
          type: 'negative',
          description: `${metric.name} is below optimal (${Math.round(metric.score)}/100)`,
          impact: impact * 0.5,
        });
      }
    }

    // Sort by impact
    factors.sort((a, b) => b.impact - a.impact);

    return factors;
  }
}

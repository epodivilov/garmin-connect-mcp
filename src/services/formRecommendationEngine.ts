/**
 * Form-Based Training Recommendation Engine
 *
 * Generates form-aware training recommendations integrating TSB, HRV,
 * sleep quality, and training phase context.
 */

import type {
  FormTrainingRecommendation,
  FormRecommendationContext,
  FormZone,
} from '../types/fatigue-freshness.js';
import { FormZoneClassifier } from './formZoneClassifier.js';

/**
 * Form Recommendation Engine
 */
export class FormRecommendationEngine {
  private zoneClassifier: FormZoneClassifier;

  constructor(zoneClassifier?: FormZoneClassifier) {
    this.zoneClassifier = zoneClassifier || new FormZoneClassifier();
  }

  /**
   * Get zone classifier (for testing)
   */
  getZoneClassifier(): FormZoneClassifier {
    return this.zoneClassifier;
  }

  /**
   * Generate training recommendations based on current form and context
   */
  generateRecommendation(
    context: FormRecommendationContext
  ): FormTrainingRecommendation {
    const {
      currentZone,
      currentCTL,
      tsbTrend,
      readinessScore,
      sleepQuality,
      sleepDebt,
      hrvStatus,
      trainingPhase,
      upcomingRace,
    } = context;

    // Note: Zone classification already done in context, using currentZone

    // Calculate base TSS recommendation from zone
    const baseTSSRange = this.calculateBaseTSSRange(currentCTL, currentZone);

    // Adjust for external factors
    const adjustedTSS = this.adjustTSSForContext(
      baseTSSRange,
      readinessScore,
      sleepQuality,
      sleepDebt,
      hrvStatus,
      tsbTrend
    );

    // Determine intensity and volume recommendations
    const intensity = this.determineIntensity(
      currentZone,
      tsbTrend,
      readinessScore,
      hrvStatus
    );

    const volume = this.determineVolume(
      currentZone,
      tsbTrend,
      currentCTL,
      sleepQuality
    );

    // Get workout suggestions
    const workoutTypes = this.getWorkoutTypes(
      currentZone,
      intensity,
      trainingPhase,
      upcomingRace
    );

    const avoidWorkouts = this.getAvoidWorkouts(
      currentZone,
      readinessScore,
      hrvStatus
    );

    // Generate guidance
    const guidance = this.generateGuidance(
      currentZone,
      tsbTrend,
      readinessScore,
      sleepQuality,
      upcomingRace
    );

    // Context-aware adjustments
    const adjustments = this.generateAdjustments(
      sleepQuality,
      sleepDebt,
      hrvStatus,
      trainingPhase
    );

    return {
      date: new Date().toISOString().split('T')[0],
      currentZone,
      recommendedTSS: adjustedTSS,
      recommendedIntensity: intensity,
      recommendedVolume: volume,
      workoutTypes,
      avoidWorkouts,
      guidance,
      adjustments,
    };
  }

  /**
   * Generate recommendations for upcoming week
   */
  generateWeeklyRecommendations(
    context: FormRecommendationContext,
    predictedFormProgression: Array<{ day: number; predictedTSB: number; predictedZone: FormZone }>
  ): Array<FormTrainingRecommendation> {
    const recommendations: FormTrainingRecommendation[] = [];

    for (const prediction of predictedFormProgression) {
      const dayContext: FormRecommendationContext = {
        ...context,
        currentZone: prediction.predictedZone,
        currentTSB: prediction.predictedTSB,
      };

      const recommendation = this.generateRecommendation(dayContext);

      // Adjust date
      const date = new Date();
      date.setDate(date.getDate() + prediction.day - 1);
      recommendation.date = date.toISOString().split('T')[0];

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Calculate base TSS range based on CTL and zone
   */
  private calculateBaseTSSRange(
    ctl: number,
    zone: FormZone
  ): { min: number; max: number } {
    // Base TSS as percentage of CTL
    let minPercentage: number;
    let maxPercentage: number;

    switch (zone) {
      case 'overreached':
        minPercentage = 0;
        maxPercentage = 0.3;
        break;
      case 'fatigued':
        minPercentage = 0.3;
        maxPercentage = 0.6;
        break;
      case 'productive_training':
        minPercentage = 0.7;
        maxPercentage = 1.1;
        break;
      case 'maintenance':
        minPercentage = 0.8;
        maxPercentage = 1.2;
        break;
      case 'optimal_race':
        minPercentage = 0.7;
        maxPercentage = 1.0;
        break;
      case 'fresh':
        minPercentage = 0.8;
        maxPercentage = 1.3;
        break;
    }

    return {
      min: Math.round(ctl * minPercentage),
      max: Math.round(ctl * maxPercentage),
    };
  }

  /**
   * Adjust TSS for context (readiness, sleep, HRV)
   */
  private adjustTSSForContext(
    baseTSS: { min: number; max: number },
    readinessScore?: number,
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent',
    sleepDebt?: number,
    hrvStatus?: 'low' | 'normal' | 'high',
    tsbTrend?: 'improving' | 'declining' | 'stable'
  ): { min: number; max: number } {
    let adjustmentFactor = 1.0;

    // Readiness adjustment
    if (readinessScore !== undefined) {
      if (readinessScore < 50) {
        adjustmentFactor *= 0.7;
      } else if (readinessScore < 70) {
        adjustmentFactor *= 0.85;
      } else if (readinessScore > 85) {
        adjustmentFactor *= 1.1;
      }
    }

    // Sleep quality adjustment
    if (sleepQuality) {
      switch (sleepQuality) {
        case 'poor':
          adjustmentFactor *= 0.7;
          break;
        case 'fair':
          adjustmentFactor *= 0.85;
          break;
        case 'excellent':
          adjustmentFactor *= 1.05;
          break;
      }
    }

    // Sleep debt adjustment
    if (sleepDebt !== undefined && sleepDebt > 2) {
      adjustmentFactor *= Math.max(0.6, 1 - (sleepDebt - 2) * 0.1);
    }

    // HRV adjustment
    if (hrvStatus === 'low') {
      adjustmentFactor *= 0.75;
    } else if (hrvStatus === 'high') {
      adjustmentFactor *= 1.05;
    }

    // TSB trend adjustment
    if (tsbTrend === 'declining') {
      adjustmentFactor *= 0.9;
    }

    return {
      min: Math.round(baseTSS.min * adjustmentFactor),
      max: Math.round(baseTSS.max * adjustmentFactor),
    };
  }

  /**
   * Determine recommended intensity
   */
  private determineIntensity(
    zone: FormZone,
    tsbTrend: 'improving' | 'declining' | 'stable',
    readinessScore?: number,
    hrvStatus?: 'low' | 'normal' | 'high'
  ): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
    // Get base intensity from zone
    let baseIntensity: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

    switch (zone) {
      case 'overreached':
      case 'fatigued':
        baseIntensity = 'very_low';
        break;
      case 'productive_training':
        baseIntensity = 'low';
        break;
      case 'maintenance':
        baseIntensity = 'moderate';
        break;
      case 'optimal_race':
      case 'fresh':
        baseIntensity = 'high';
        break;
      default:
        baseIntensity = 'moderate';
    }

    // Adjust for readiness
    if (readinessScore !== undefined && readinessScore < 60) {
      // Reduce intensity if low readiness
      if (baseIntensity === 'high') baseIntensity = 'moderate';
      else if (baseIntensity === 'moderate') baseIntensity = 'low';
    }

    // Adjust for HRV
    if (hrvStatus === 'low') {
      if (baseIntensity === 'high') baseIntensity = 'low';
    }

    // Adjust for trend
    if (tsbTrend === 'declining' && baseIntensity === 'high') {
      baseIntensity = 'moderate';
    }

    return baseIntensity;
  }

  /**
   * Determine recommended volume
   */
  private determineVolume(
    zone: FormZone,
    tsbTrend: 'improving' | 'declining' | 'stable',
    _ctl: number,
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent'
  ): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
    let volume: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

    switch (zone) {
      case 'overreached':
        volume = 'very_low';
        break;
      case 'fatigued':
        volume = 'low';
        break;
      case 'productive_training':
        volume = 'moderate';
        break;
      case 'maintenance':
        volume = 'moderate';
        break;
      case 'optimal_race':
        volume = 'low';
        break;
      case 'fresh':
        volume = 'high';
        break;
    }

    // Adjust for sleep quality
    if (sleepQuality === 'poor' && volume === 'high') {
      volume = 'moderate';
    }

    // Adjust for trend
    if (tsbTrend === 'declining' && volume === 'high') {
      volume = 'moderate';
    }

    return volume;
  }

  /**
   * Get recommended workout types
   */
  private getWorkoutTypes(
    _zone: FormZone,
    _intensity: string,
    trainingPhase?: string,
    upcomingRace?: { daysUntil: number }
  ): string[] {
    const workouts: string[] = [];

    // Phase-based adjustments
    if (trainingPhase === 'base') {
      workouts.push('Long steady aerobic', 'Easy runs', 'Base building');
    } else if (trainingPhase === 'build') {
      workouts.push('Tempo runs', 'Threshold intervals', 'Hill repeats');
    } else if (trainingPhase === 'peak') {
      workouts.push('Race-specific work', 'Short high-intensity', 'Speed work');
    }

    // Race proximity adjustments
    if (upcomingRace && upcomingRace.daysUntil <= 7) {
      return ['Easy recovery', 'Short race-pace efforts', 'Shakeout runs'];
    } else if (upcomingRace && upcomingRace.daysUntil <= 14) {
      return ['Moderate volume', 'Race-pace practice', 'Threshold maintenance'];
    }

    // Remove duplicates
    return Array.from(new Set(workouts));
  }

  /**
   * Get workouts to avoid
   */
  private getAvoidWorkouts(
    zone: FormZone,
    readinessScore?: number,
    hrvStatus?: 'low' | 'normal' | 'high'
  ): string[] {
    const avoid: string[] = [];

    // Zone-based avoidance
    if (zone === 'overreached' || zone === 'fatigued') {
      avoid.push('High-intensity intervals', 'Long runs', 'Hard efforts');
    }

    // Readiness-based avoidance
    if (readinessScore !== undefined && readinessScore < 50) {
      avoid.push('Intense workouts', 'Max efforts', 'Long duration');
    }

    // HRV-based avoidance
    if (hrvStatus === 'low') {
      avoid.push('Hard intervals', 'Max intensity', 'High stress workouts');
    }

    if (zone === 'fresh') {
      avoid.push('Complete rest (risk of detraining)');
    }

    return avoid;
  }

  /**
   * Generate guidance text
   */
  private generateGuidance(
    zone: FormZone,
    tsbTrend: 'improving' | 'declining' | 'stable',
    readinessScore?: number,
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent',
    upcomingRace?: { daysUntil: number; priority: 'A' | 'B' | 'C' }
  ): FormTrainingRecommendation['guidance'] {
    const primary = this.generatePrimaryGuidance(zone, tsbTrend, upcomingRace);
    const secondary = this.generateSecondaryGuidance(
      zone,
      tsbTrend,
      readinessScore,
      sleepQuality
    );
    const cautions = this.generateCautions(
      zone,
      readinessScore,
      sleepQuality,
      upcomingRace
    );

    return { primary, secondary, cautions };
  }

  /**
   * Generate primary guidance
   */
  private generatePrimaryGuidance(
    zone: FormZone,
    tsbTrend: 'improving' | 'declining' | 'stable',
    upcomingRace?: { daysUntil: number; priority: 'A' | 'B' | 'C' }
  ): string {
    if (upcomingRace && upcomingRace.daysUntil <= 7) {
      return `Race in ${upcomingRace.daysUntil} days - Final taper phase, prioritize rest and short efforts`;
    }

    switch (zone) {
      case 'overreached':
        return 'CRITICAL: Immediate recovery required - complete rest or very light activity only';
      case 'fatigued':
        return 'High fatigue - reduce training load and focus on recovery';
      case 'productive_training':
        return 'Good training state - maintain steady training load for fitness gains';
      case 'maintenance':
        return 'Balanced state - good for consistent mixed training';
      case 'optimal_race':
        return 'Peak race readiness - excellent for key workouts or events';
      case 'fresh':
        if (tsbTrend === 'improving') {
          return 'Very fresh - can increase training load progressively';
        }
        return 'Very fresh - good opportunity to build training volume';
    }
  }

  /**
   * Generate secondary guidance
   */
  private generateSecondaryGuidance(
    zone: FormZone,
    tsbTrend: 'improving' | 'declining' | 'stable',
    readinessScore?: number,
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent'
  ): string[] {
    const guidance: string[] = [];

    // Trend guidance
    if (tsbTrend === 'declining') {
      guidance.push('Form is declining - monitor for overtraining signs');
    } else if (tsbTrend === 'improving') {
      guidance.push('Form is improving - recovery progressing well');
    }

    // Readiness guidance
    if (readinessScore !== undefined) {
      if (readinessScore < 50) {
        guidance.push('Low readiness - prioritize recovery over training stress');
      } else if (readinessScore > 85) {
        guidance.push('High readiness - good day for quality work');
      }
    }

    // Sleep guidance
    if (sleepQuality === 'poor') {
      guidance.push('Poor sleep quality - reduce intensity and volume');
    } else if (sleepQuality === 'excellent') {
      guidance.push('Excellent sleep - optimal recovery conditions');
    }

    // Zone-specific guidance
    if (zone === 'productive_training') {
      guidance.push('Building fitness - consistent training yielding adaptations');
    } else if (zone === 'optimal_race') {
      guidance.push('Consider scheduling key workout or race');
    }

    return guidance;
  }

  /**
   * Generate cautions
   */
  private generateCautions(
    zone: FormZone,
    readinessScore?: number,
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent',
    upcomingRace?: { daysUntil: number }
  ): string[] {
    const cautions: string[] = [];

    // Zone cautions
    if (zone === 'overreached') {
      cautions.push('CRITICAL: Very high injury and illness risk');
      cautions.push('Consider consulting coach or medical professional');
    } else if (zone === 'fatigued') {
      cautions.push('Elevated injury risk - avoid hard efforts');
    }

    // Combined risk factors
    if (zone === 'fatigued' && readinessScore !== undefined && readinessScore < 60) {
      cautions.push('Multiple fatigue indicators - strong rest recommendation');
    }

    if (zone === 'fatigued' && sleepQuality === 'poor') {
      cautions.push('Fatigue + poor sleep = high risk - prioritize recovery');
    }

    // Race cautions
    if (upcomingRace && upcomingRace.daysUntil <= 14 && zone === 'fatigued') {
      cautions.push('May not recover in time for race - consider additional rest');
    }

    return cautions;
  }

  /**
   * Generate context-specific adjustments
   */
  private generateAdjustments(
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent',
    sleepDebt?: number,
    hrvStatus?: 'low' | 'normal' | 'high',
    trainingPhase?: string
  ): FormTrainingRecommendation['adjustments'] {
    const adjustments: FormTrainingRecommendation['adjustments'] = {};

    // Sleep adjustments
    if (sleepQuality === 'poor' || (sleepDebt !== undefined && sleepDebt > 2)) {
      adjustments.sleepAdjustment =
        'Reduce training by 20-30% due to sleep issues - focus on recovery';
    } else if (sleepQuality === 'excellent') {
      adjustments.sleepAdjustment =
        'Excellent sleep - can handle planned training load';
    }

    // HRV adjustments
    if (hrvStatus === 'low') {
      adjustments.hrvAdjustment =
        'Low HRV detected - reduce intensity, prioritize easy aerobic work';
    } else if (hrvStatus === 'high') {
      adjustments.hrvAdjustment =
        'High HRV - good day for quality/intense training';
    }

    // Phase adjustments
    if (trainingPhase === 'base') {
      adjustments.phaseAdjustment =
        'Base phase - emphasize volume over intensity';
    } else if (trainingPhase === 'build') {
      adjustments.phaseAdjustment =
        'Build phase - balance volume and intensity';
    } else if (trainingPhase === 'peak') {
      adjustments.phaseAdjustment =
        'Peak phase - maintain intensity, reduce volume';
    } else if (trainingPhase === 'taper') {
      adjustments.phaseAdjustment =
        'Taper phase - progressive volume reduction while maintaining intensity';
    }

    return adjustments;
  }
}

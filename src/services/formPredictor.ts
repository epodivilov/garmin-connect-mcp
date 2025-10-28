/**
 * Form Prediction Engine
 *
 * Predicts future TSB/form based on planned training stress (TSS).
 * Generates optimal taper plans, estimates recovery time, and supports "what-if" scenarios.
 */

import type {
  FormPrediction,
  TaperPlan,
  FormPredictionOptions,
  TaperPlanOptions,
  FormZone,
} from '../types/fatigue-freshness.js';
import { FORM_TIME_CONSTANTS } from '../types/fatigue-freshness.js';
import { FormZoneClassifier } from './formZoneClassifier.js';

/**
 * Form Predictor Service
 */
export class FormPredictor {
  private zoneClassifier: FormZoneClassifier;

  constructor(zoneClassifier?: FormZoneClassifier) {
    this.zoneClassifier = zoneClassifier || new FormZoneClassifier();
  }

  /**
   * Predict future form given planned TSS
   */
  predictFutureForm(options: FormPredictionOptions): FormPrediction {
    const {
      targetDate,
      plannedTSS,
      recoveryDays = [],
      currentCTL = 0,
      currentATL = 0,
      currentTSB = 0,
    } = options;

    // Calculate days until target
    const today = new Date();
    const target = new Date(targetDate);
    const daysUntilTarget = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilTarget < 0) {
      throw new Error('Target date must be in the future');
    }

    // Normalize planned TSS to daily array
    const dailyTSS = this.normalizePlannedTSS(plannedTSS, daysUntilTarget, recoveryDays);

    // Simulate CTL/ATL/TSB progression
    const simulation = this.simulateProgression(
      currentCTL,
      currentATL,
      dailyTSS
    );

    const finalState = simulation[simulation.length - 1];
    const predictedTSB = finalState.tsb;
    const predictedZone = this.zoneClassifier.classifyFormZone(predictedTSB, finalState.ctl).zone;

    // Calculate confidence (decreases with time)
    const confidence = this.calculatePredictionConfidence(daysUntilTarget, dailyTSS);

    // Generate recommendations
    const recommendations = this.generatePredictionRecommendations(
      predictedTSB,
      predictedZone,
      currentTSB,
      daysUntilTarget
    );

    return {
      targetDate,
      predictedTSB: Math.round(predictedTSB * 10) / 10,
      predictedZone,
      confidence,
      assumptions: {
        plannedDailyTSS: dailyTSS,
        currentCTL,
        currentATL,
        currentTSB,
      },
      details: {
        projectedCTL: Math.round(finalState.ctl * 10) / 10,
        projectedATL: Math.round(finalState.atl * 10) / 10,
        expectedFatigueDecay: Math.round((currentATL - finalState.atl) * 10) / 10,
        expectedFitnessDecay: Math.round((currentCTL - finalState.ctl) * 10) / 10,
      },
      recommendations,
    };
  }

  /**
   * Generate optimal taper plan for race
   */
  generateTaperPlan(options: TaperPlanOptions): TaperPlan {
    const {
      raceDate,
      taperDuration = 14,
      targetTSB = 17, // Mid-point of optimal race zone
      strategy = 'exponential',
      volumeReduction = 50,
      maintainIntensity = true,
      currentCTL = 0,
      currentATL = 0,
      currentTSB = 0,
    } = options;

    // Calculate taper start date
    const raceDay = new Date(raceDate);
    const taperStart = new Date(raceDay);
    taperStart.setDate(taperStart.getDate() - taperDuration);
    const taperStartDate = taperStart.toISOString().split('T')[0];

    // Get current zone
    const currentZone = this.zoneClassifier.classifyFormZone(currentTSB, currentCTL).zone;

    // Generate daily taper schedule
    const schedule = this.generateTaperSchedule(
      taperDuration,
      currentCTL,
      currentATL,
      currentTSB,
      targetTSB,
      strategy,
      volumeReduction,
      taperStartDate
    );

    // Determine critical workouts
    const criticalWorkouts = this.determineCriticalWorkouts(
      taperDuration,
      maintainIntensity
    );

    // Generate warnings and recommendations
    const warnings = this.generateTaperWarnings(
      currentTSB,
      targetTSB,
      currentCTL,
      taperDuration
    );

    const recommendations = this.generateTaperRecommendations(
      currentZone,
      targetTSB,
      strategy,
      taperDuration
    );

    return {
      raceDate,
      taperStartDate,
      taperDuration,
      currentState: {
        date: new Date().toISOString().split('T')[0],
        ctl: currentCTL,
        atl: currentATL,
        tsb: currentTSB,
        zone: currentZone,
      },
      targetState: {
        targetTSB,
        targetZone: 'optimal_race',
        targetCTL: currentCTL * 0.95, // Slight CTL decay during taper
      },
      schedule,
      strategy: {
        type: strategy,
        volumeReduction,
        intensityMaintenance: maintainIntensity,
        criticalWorkouts,
      },
      warnings,
      recommendations,
    };
  }

  /**
   * Estimate recovery time to reach target zone
   */
  estimateRecoveryTime(
    currentCTL: number,
    currentATL: number,
    currentTSB: number,
    targetZone: FormZone = 'optimal_race',
    restDays: boolean = true
  ): {
    estimatedDays: number;
    dailyTSBChange: number;
    targetTSBRange: { min: number; max: number };
    recommendations: string[];
  } {
    const targetRange = this.zoneClassifier.getRecommendedTSBRange(
      targetZone === 'optimal_race' ? 'race' : 'recovery',
      currentCTL
    );

    const targetTSB = (targetRange.min + targetRange.max) / 2;

    let estimatedDays: number;
    let dailyTSBChange: number;

    if (restDays) {
      // Complete rest scenario - use simulation for accuracy
      const maxDays = 60; // Max simulation period
      const simulation = this.simulateProgression(
        currentCTL,
        currentATL,
        Array(maxDays).fill(0) // Complete rest
      );

      // Find when we reach target zone
      estimatedDays = simulation.findIndex((s) => s.tsb >= targetRange.min);
      if (estimatedDays === -1) {
        estimatedDays = maxDays; // Didn't reach target in simulation
      } else {
        estimatedDays++; // Convert from 0-indexed to day count
      }

      // Calculate average daily change over the recovery period
      const finalTSB = simulation[estimatedDays - 1]?.tsb || targetTSB;
      dailyTSBChange = (finalTSB - currentTSB) / estimatedDays;
    } else {
      // Active recovery scenario (low TSS)
      const lowTSS = currentCTL * 0.3; // 30% of CTL
      const simulation = this.simulateProgression(
        currentCTL,
        currentATL,
        Array(30).fill(lowTSS)
      );

      // Find when we reach target zone
      estimatedDays = simulation.findIndex((s) => s.tsb >= targetRange.min);
      if (estimatedDays === -1) {
        estimatedDays = 30; // Max estimation period
      } else {
        estimatedDays++; // Convert from 0-indexed to day count
      }

      dailyTSBChange = (simulation[estimatedDays - 1]?.tsb || targetTSB) - currentTSB;
      dailyTSBChange = dailyTSBChange / estimatedDays;
    }

    const recommendations = this.generateRecoveryRecommendations(
      currentTSB,
      targetTSB,
      estimatedDays,
      restDays
    );

    return {
      estimatedDays,
      dailyTSBChange: Math.round(dailyTSBChange * 100) / 100,
      targetTSBRange: targetRange,
      recommendations,
    };
  }

  /**
   * Simulate "what-if" scenario
   */
  simulateScenario(
    currentCTL: number,
    currentATL: number,
    _currentTSB: number,
    scenarioDays: number,
    dailyTSS: number | number[]
  ): Array<{
    day: number;
    date: string;
    tss: number;
    ctl: number;
    atl: number;
    tsb: number;
    zone: FormZone;
  }> {
    const tssArray = Array.isArray(dailyTSS)
      ? dailyTSS
      : Array(scenarioDays).fill(dailyTSS);

    const simulation = this.simulateProgression(currentCTL, currentATL, tssArray);

    const today = new Date();
    return simulation.map((state, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);

      return {
        day: index + 1,
        date: date.toISOString().split('T')[0],
        tss: tssArray[index] || 0,
        ctl: Math.round(state.ctl * 10) / 10,
        atl: Math.round(state.atl * 10) / 10,
        tsb: Math.round(state.tsb * 10) / 10,
        zone: this.zoneClassifier.classifyFormZone(state.tsb, state.ctl).zone,
      };
    });
  }

  /**
   * Simulate CTL/ATL/TSB progression using exponential weighted moving average
   */
  private simulateProgression(
    initialCTL: number,
    initialATL: number,
    dailyTSS: number[]
  ): Array<{ ctl: number; atl: number; tsb: number }> {
    const ctlTimeConstant = FORM_TIME_CONSTANTS.CTL;
    const atlTimeConstant = FORM_TIME_CONSTANTS.ATL;

    let ctl = initialCTL;
    let atl = initialATL;

    const results: Array<{ ctl: number; atl: number; tsb: number }> = [];

    for (const tss of dailyTSS) {
      // EWMA formula: new_value = yesterday_value + (today_tss - yesterday_value) / time_constant
      ctl = ctl + (tss - ctl) / ctlTimeConstant;
      atl = atl + (tss - atl) / atlTimeConstant;

      const tsb = ctl - atl;

      results.push({ ctl, atl, tsb });
    }

    return results;
  }

  /**
   * Normalize planned TSS to daily array
   */
  private normalizePlannedTSS(
    plannedTSS: number | number[],
    days: number,
    recoveryDays: number[]
  ): number[] {
    let dailyTSS: number[];

    if (Array.isArray(plannedTSS)) {
      // Use the provided array as-is, don't pad or repeat
      dailyTSS = [...plannedTSS];
    } else {
      // Use single value for all days
      dailyTSS = Array(days).fill(plannedTSS);
    }

    // Apply recovery days (zero TSS)
    for (const recoveryDay of recoveryDays) {
      if (recoveryDay >= 0 && recoveryDay < dailyTSS.length) {
        dailyTSS[recoveryDay] = 0;
      }
    }

    return dailyTSS;
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(days: number, dailyTSS: number[]): number {
    // Confidence decreases with time and variability
    const baseConfidence = 100 * Math.pow(FORM_TIME_CONSTANTS.PREDICTION_CONFIDENCE_DECAY, days);

    // Reduce confidence if TSS varies significantly
    const tssVariance = this.calculateVariance(dailyTSS);
    const variabilityPenalty = Math.min(20, tssVariance / 10);

    return Math.max(30, Math.round(baseConfidence - variabilityPenalty));
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));

    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Generate taper schedule
   */
  private generateTaperSchedule(
    duration: number,
    currentCTL: number,
    currentATL: number,
    _currentTSB: number,
    _targetTSB: number,
    strategy: 'linear' | 'exponential' | 'step',
    volumeReduction: number,
    startDate: string
  ): TaperPlan['schedule'] {
    // Calculate baseline TSS from CTL (rough estimate)
    const baselineTSS = currentCTL * 0.9;

    // Generate daily TSS based on strategy
    const dailyTSS = this.calculateTaperTSS(
      duration,
      baselineTSS,
      volumeReduction,
      strategy
    );

    // Simulate progression
    const simulation = this.simulateProgression(currentCTL, currentATL, dailyTSS);

    // Build schedule
    const schedule: TaperPlan['schedule'] = [];
    const start = new Date(startDate);

    for (let i = 0; i < duration; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      const state = simulation[i];
      const zone = this.zoneClassifier.classifyFormZone(state.tsb, state.ctl).zone;

      schedule.push({
        date: date.toISOString().split('T')[0],
        dayOfTaper: i + 1,
        plannedTSS: Math.round(dailyTSS[i]),
        reductionFromPeak: Math.round(((baselineTSS - dailyTSS[i]) / baselineTSS) * 100),
        predictedTSB: Math.round(state.tsb * 10) / 10,
        predictedZone: zone,
        notes: this.getTaperDayNotes(i + 1, duration, zone),
      });
    }

    return schedule;
  }

  /**
   * Calculate daily TSS for taper strategy
   */
  private calculateTaperTSS(
    duration: number,
    baselineTSS: number,
    volumeReduction: number,
    strategy: 'linear' | 'exponential' | 'step'
  ): number[] {
    const dailyTSS: number[] = [];

    for (let day = 0; day < duration; day++) {
      const progress = day / duration; // 0 to 1

      let reductionFactor: number;

      switch (strategy) {
        case 'linear':
          reductionFactor = 1 - (progress * volumeReduction / 100);
          break;
        case 'exponential':
          reductionFactor = Math.pow(1 - volumeReduction / 100, progress);
          break;
        case 'step':
          // Step down at 1/3 and 2/3 points
          if (progress < 0.33) {
            reductionFactor = 1 - (volumeReduction / 300);
          } else if (progress < 0.67) {
            reductionFactor = 1 - (volumeReduction / 150);
          } else {
            reductionFactor = 1 - (volumeReduction / 100);
          }
          break;
      }

      dailyTSS.push(baselineTSS * reductionFactor);
    }

    return dailyTSS;
  }

  /**
   * Determine critical workouts during taper
   */
  private determineCriticalWorkouts(
    duration: number,
    maintainIntensity: boolean
  ): string[] {
    const workouts: string[] = [];

    if (duration >= 14) {
      workouts.push('Week 1: One race-pace workout');
      workouts.push('Week 2: Short threshold or race-pace efforts');
    } else if (duration >= 7) {
      workouts.push('Week 1: One short high-intensity session');
    }

    if (maintainIntensity) {
      workouts.push('Maintain intensity, reduce volume');
    }

    return workouts;
  }

  /**
   * Get taper day notes
   */
  private getTaperDayNotes(day: number, totalDays: number, _zone: FormZone): string {
    const daysFromRace = totalDays - day;

    if (daysFromRace === 0) {
      return 'Race day - minimal activity';
    } else if (daysFromRace <= 2) {
      return 'Final preparation - very light activity';
    } else if (daysFromRace <= 5) {
      return 'Late taper - reduced volume, maintain some intensity';
    } else if (daysFromRace <= 10) {
      return 'Mid taper - progressive volume reduction';
    } else {
      return 'Early taper - begin reducing volume';
    }
  }

  /**
   * Generate taper warnings
   */
  private generateTaperWarnings(
    currentTSB: number,
    targetTSB: number,
    currentCTL: number,
    duration: number
  ): string[] {
    const warnings: string[] = [];

    if (currentCTL < 40) {
      warnings.push('Current fitness (CTL) is low - consider building base before major race');
    }

    if (currentTSB < -20) {
      warnings.push('Currently in fatigued state - may need longer taper');
    }

    if (duration < 7) {
      warnings.push('Taper duration is short - may not provide adequate recovery');
    }

    if (Math.abs(targetTSB - currentTSB) > 30) {
      warnings.push('Large TSB change required - taper may be challenging');
    }

    return warnings;
  }

  /**
   * Generate taper recommendations
   */
  private generateTaperRecommendations(
    currentZone: FormZone,
    targetTSB: number,
    strategy: string,
    duration: number
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Using ${strategy} taper strategy over ${duration} days`);
    recommendations.push(`Target TSB of ${targetTSB} for optimal race readiness`);

    if (currentZone === 'fatigued' || currentZone === 'overreached') {
      recommendations.push('Prioritize recovery in early taper phase');
    }

    recommendations.push('Maintain intensity while reducing volume');
    recommendations.push('Focus on quality rest and nutrition');
    recommendations.push('Include 1-2 short race-pace efforts');

    return recommendations;
  }

  /**
   * Generate prediction recommendations
   */
  private generatePredictionRecommendations(
    predictedTSB: number,
    predictedZone: FormZone,
    currentTSB: number,
    daysUntilTarget: number
  ): string[] {
    const recommendations: string[] = [];

    const tsbChange = predictedTSB - currentTSB;

    if (predictedZone === 'optimal_race') {
      recommendations.push('Predicted to reach optimal race zone');
    } else if (predictedZone === 'overreached') {
      recommendations.push('WARNING: Predicted overreaching - reduce planned load');
    } else if (predictedZone === 'fresh' && daysUntilTarget < 7) {
      recommendations.push('May be too fresh - consider adding light training');
    }

    if (Math.abs(tsbChange) > 20) {
      recommendations.push('Large form change predicted - monitor closely');
    }

    return recommendations;
  }

  /**
   * Generate recovery recommendations
   */
  private generateRecoveryRecommendations(
    currentTSB: number,
    _targetTSB: number,
    estimatedDays: number,
    restDays: boolean
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Estimated ${estimatedDays} days to reach target form`);

    if (restDays) {
      recommendations.push('Complete rest recommended for optimal recovery');
    } else {
      recommendations.push('Active recovery with low-intensity work');
    }

    if (currentTSB < -30) {
      recommendations.push('Severely overreached - prioritize sleep and nutrition');
    }

    if (estimatedDays > 14) {
      recommendations.push('Extended recovery period - consider consulting coach');
    }

    return recommendations;
  }
}

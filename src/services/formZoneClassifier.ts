/**
 * Form Zone Classifier Service
 *
 * Classifies training stress balance (TSB/Form) into zones with adaptive thresholds
 * based on current fitness level (CTL). Provides zone-specific recommendations
 * and characteristics.
 */

import type {
  FormZone,
  FormZoneInfo,
  FormZoneThresholds,
} from '../types/fatigue-freshness.js';
import { DEFAULT_FORM_ZONES } from '../types/fatigue-freshness.js';

/**
 * Default zone thresholds (non-adaptive)
 */
const DEFAULT_THRESHOLDS: FormZoneThresholds = {
  overreached: { max: -30 },
  fatigued: { min: -30, max: -20 },
  productiveTraining: { min: -20, max: -5 },
  maintenance: { min: -5, max: 10 },
  optimalRace: { min: 10, max: 25 },
  fresh: { min: 25 },
  ctlAdjustmentFactors: {
    lowFitness: 0.8,      // CTL < 40: narrower ranges
    moderateFitness: 1.0,  // CTL 40-80: standard ranges
    highFitness: 1.2,      // CTL > 80: wider ranges
  },
};

/**
 * Form Zone Classifier Service
 */
export class FormZoneClassifier {
  private thresholds: FormZoneThresholds;

  constructor(customThresholds?: Partial<FormZoneThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  }

  /**
   * Classify TSB into form zone with adaptive thresholds
   */
  classifyFormZone(tsb: number, ctl: number = 0): FormZoneInfo {
    // Get adjustment factor based on CTL
    const adjustmentFactor = this.getCtlAdjustmentFactor(ctl);

    // Apply adaptive thresholds
    const adaptiveThresholds = this.getAdaptiveThresholds(adjustmentFactor);

    // Determine zone
    const zone = this.determineZone(tsb, adaptiveThresholds);

    // Get zone info with adjusted ranges
    return this.getZoneInfo(zone, adaptiveThresholds);
  }

  /**
   * Get multiple zone classifications for comparison
   */
  classifyMultipleZones(
    dataPoints: Array<{ tsb: number; ctl: number; date: string }>
  ): Array<{ date: string; zone: FormZone; zoneInfo: FormZoneInfo }> {
    return dataPoints.map((point) => ({
      date: point.date,
      zone: this.determineZone(point.tsb, this.getAdaptiveThresholds(this.getCtlAdjustmentFactor(point.ctl))),
      zoneInfo: this.classifyFormZone(point.tsb, point.ctl),
    }));
  }

  /**
   * Check if TSB is within optimal race zone
   */
  isOptimalForRace(tsb: number, ctl: number = 0): boolean {
    const adjustmentFactor = this.getCtlAdjustmentFactor(ctl);
    const adaptiveThresholds = this.getAdaptiveThresholds(adjustmentFactor);
    const zone = this.determineZone(tsb, adaptiveThresholds);
    return zone === 'optimal_race';
  }

  /**
   * Check if TSB indicates overreaching/high risk
   */
  isOverreached(tsb: number): boolean {
    return tsb < this.thresholds.overreached.max;
  }

  /**
   * Check if TSB indicates excessive freshness (detraining risk)
   */
  isExcessivelyFresh(tsb: number, ctl: number = 0): boolean {
    const adjustmentFactor = this.getCtlAdjustmentFactor(ctl);
    const freshThreshold = this.thresholds.fresh.min * adjustmentFactor;
    return tsb > freshThreshold + 10; // 10 points above fresh threshold
  }

  /**
   * Get recommended TSB range for specific goal
   */
  getRecommendedTSBRange(
    goal: 'race' | 'training' | 'recovery' | 'maintenance',
    ctl: number = 0
  ): { min: number; max: number; targetZone: FormZone } {
    const adjustmentFactor = this.getCtlAdjustmentFactor(ctl);

    switch (goal) {
      case 'race':
        return {
          min: this.thresholds.optimalRace.min * adjustmentFactor,
          max: this.thresholds.optimalRace.max * adjustmentFactor,
          targetZone: 'optimal_race',
        };
      case 'training':
        return {
          min: this.thresholds.productiveTraining.min * adjustmentFactor,
          max: this.thresholds.productiveTraining.max * adjustmentFactor,
          targetZone: 'productive_training',
        };
      case 'recovery':
        return {
          min: this.thresholds.fresh.min * adjustmentFactor,
          max: 50, // Upper bound for recovery
          targetZone: 'fresh',
        };
      case 'maintenance':
        return {
          min: this.thresholds.maintenance.min * adjustmentFactor,
          max: this.thresholds.maintenance.max * adjustmentFactor,
          targetZone: 'maintenance',
        };
    }
  }

  /**
   * Calculate days needed to reach target TSB
   */
  estimateDaysToTargetZone(
    currentTSB: number,
    currentCTL: number,
    currentATL: number,
    targetZone: FormZone,
    plannedDailyTSS: number = 0
  ): number {
    const targetRange = this.getRecommendedTSBRange(
      targetZone === 'optimal_race' ? 'race' :
      targetZone === 'fresh' ? 'recovery' :
      targetZone === 'productive_training' ? 'training' : 'maintenance',
      currentCTL
    );

    // Check if already in target zone
    if (currentTSB >= targetRange.min && currentTSB <= targetRange.max) {
      return 0;
    }

    const targetTSB = (targetRange.min + targetRange.max) / 2;

    // Simplified estimation (assumes exponential decay)
    // More accurate calculation would require iterative simulation
    const tsbDifference = targetTSB - currentTSB;

    // Rough estimation based on typical TSB change rates
    const ctlDecayRate = 1 / 42; // CTL time constant
    const atlDecayRate = 1 / 7;  // ATL time constant

    if (plannedDailyTSS === 0) {
      // Rest scenario
      const dailyTSBChange = (currentATL * atlDecayRate) - (currentCTL * ctlDecayRate);
      return Math.abs(Math.ceil(tsbDifference / dailyTSBChange));
    } else {
      // Training scenario - more complex
      // Approximate: 1-2 points TSB change per day depending on load
      const estimatedDailyChange = currentTSB < targetTSB ? 1.5 : -1.5;
      return Math.abs(Math.ceil(tsbDifference / estimatedDailyChange));
    }
  }

  /**
   * Get zone transition information
   */
  getZoneTransitionInfo(
    fromZone: FormZone,
    toZone: FormZone
  ): {
    direction: 'improving' | 'declining' | 'neutral';
    significance: 'major' | 'minor' | 'none';
    interpretation: string;
  } {
    const zoneRanking: Record<FormZone, number> = {
      overreached: 1,
      fatigued: 2,
      productive_training: 3,
      maintenance: 4,
      optimal_race: 5,
      fresh: 6,
    };

    const fromRank = zoneRanking[fromZone];
    const toRank = zoneRanking[toZone];
    const rankDiff = Math.abs(toRank - fromRank);

    let direction: 'improving' | 'declining' | 'neutral';
    if (toRank > fromRank) {
      direction = 'improving';
    } else if (toRank < fromRank) {
      direction = 'declining';
    } else {
      direction = 'neutral';
    }

    const significance = rankDiff > 2 ? 'major' : rankDiff >= 1 ? 'minor' : 'none';

    const interpretation = this.getTransitionInterpretation(fromZone, toZone, direction);

    return { direction, significance, interpretation };
  }

  /**
   * Get CTL adjustment factor based on fitness level
   */
  private getCtlAdjustmentFactor(ctl: number): number {
    const factors = this.thresholds.ctlAdjustmentFactors!;

    if (ctl < 40) {
      return factors.lowFitness;
    } else if (ctl <= 80) {
      return factors.moderateFitness;
    } else {
      return factors.highFitness;
    }
  }

  /**
   * Get adaptive thresholds based on adjustment factor
   *
   * Applies fitness-based adjustments to zone thresholds:
   * - For negative TSB zones (overreached, fatigued, productive_training):
   *   Uses standard adjustment factor. Higher fitness (factor > 1) widens ranges,
   *   allowing more fatigue before crossing into worse zones.
   *
   * - For positive TSB zones (optimal_race, fresh):
   *   Uses inverse adjustment for minimum thresholds. This is because:
   *   * High fitness athletes (CTL > 80, factor = 1.2) can race well at LOWER TSB
   *     Example: factor 1.2 → inverse 1/1.2 = 0.83 → optimal_race min becomes 10 * 0.83 = 8.3
   *   * Low fitness athletes (CTL < 40, factor = 0.8) need HIGHER TSB to race well
   *     Example: factor 0.8 (already < 1) → stays 0.8 → optimal_race min becomes 10 * 0.8 = 8
   *
   * The inverse adjustment reflects the physiological reality that well-trained athletes
   * can perform optimally with less recovery (lower TSB) due to better fatigue resistance.
   */
  private getAdaptiveThresholds(adjustmentFactor: number): FormZoneThresholds {
    // For positive TSB zones, calculate inverse adjustment factor
    // High fitness (factor > 1) → inverse < 1 → LOWERS threshold (can perform at lower TSB)
    // Low fitness (factor < 1) → keeps original → RAISES threshold (need higher TSB)
    const positiveAdjustmentFactor = adjustmentFactor > 1 ? 1 / adjustmentFactor : adjustmentFactor;

    return {
      overreached: { max: this.thresholds.overreached.max * adjustmentFactor },
      fatigued: {
        min: this.thresholds.fatigued.min * adjustmentFactor,
        max: this.thresholds.fatigued.max * adjustmentFactor,
      },
      productiveTraining: {
        min: this.thresholds.productiveTraining.min * adjustmentFactor,
        max: this.thresholds.productiveTraining.max * adjustmentFactor,
      },
      maintenance: {
        min: this.thresholds.maintenance.min * adjustmentFactor,
        max: this.thresholds.maintenance.max * positiveAdjustmentFactor,
      },
      optimalRace: {
        min: this.thresholds.optimalRace.min * positiveAdjustmentFactor,
        max: this.thresholds.optimalRace.max * positiveAdjustmentFactor,
      },
      fresh: { min: this.thresholds.fresh.min * positiveAdjustmentFactor },
    };
  }

  /**
   * Determine zone from TSB and thresholds
   */
  private determineZone(tsb: number, thresholds: FormZoneThresholds): FormZone {
    if (tsb < thresholds.overreached.max) {
      return 'overreached';
    } else if (tsb >= thresholds.fatigued.min && tsb < thresholds.fatigued.max) {
      return 'fatigued';
    } else if (tsb >= thresholds.productiveTraining.min && tsb < thresholds.productiveTraining.max) {
      return 'productive_training';
    } else if (tsb >= thresholds.maintenance.min && tsb < thresholds.maintenance.max) {
      return 'maintenance';
    } else if (tsb >= thresholds.optimalRace.min && tsb < thresholds.optimalRace.max) {
      return 'optimal_race';
    } else {
      return 'fresh';
    }
  }

  /**
   * Get zone info with adjusted thresholds
   */
  private getZoneInfo(zone: FormZone, thresholds: FormZoneThresholds): FormZoneInfo {
    const baseInfo = DEFAULT_FORM_ZONES[zone];

    // Get adjusted TSB range for this zone
    const tsbRange = this.getZoneTSBRange(zone, thresholds);

    return {
      zone,
      ...baseInfo,
      tsbRange,
    };
  }

  /**
   * Get TSB range for a specific zone with adaptive thresholds
   */
  private getZoneTSBRange(zone: FormZone, thresholds: FormZoneThresholds): { min: number; max: number } {
    switch (zone) {
      case 'overreached':
        return { min: -Infinity, max: thresholds.overreached.max };
      case 'fatigued':
        return { min: thresholds.fatigued.min, max: thresholds.fatigued.max };
      case 'productive_training':
        return { min: thresholds.productiveTraining.min, max: thresholds.productiveTraining.max };
      case 'maintenance':
        return { min: thresholds.maintenance.min, max: thresholds.maintenance.max };
      case 'optimal_race':
        return { min: thresholds.optimalRace.min, max: thresholds.optimalRace.max };
      case 'fresh':
        return { min: thresholds.fresh.min, max: Infinity };
    }
  }

  /**
   * Get transition interpretation
   */
  private getTransitionInterpretation(
    fromZone: FormZone,
    toZone: FormZone,
    direction: 'improving' | 'declining' | 'neutral'
  ): string {
    if (direction === 'neutral') {
      return `Remained in ${fromZone} zone`;
    }

    if (direction === 'improving') {
      if (toZone === 'optimal_race' && fromZone === 'maintenance') {
        return 'Entering peak race readiness - good timing for key workouts or races';
      } else if (toZone === 'fresh' && fromZone === 'fatigued') {
        return 'Significant recovery - fatigue dissipating';
      } else if (toZone === 'maintenance' && (fromZone === 'productive_training' || fromZone === 'fatigued')) {
        return 'Moving toward neutral state - training load balanced';
      } else {
        return `Recovering from ${fromZone} to ${toZone}`;
      }
    } else {
      // declining
      if (toZone === 'overreached') {
        return 'CRITICAL: Entered overreached state - immediate recovery needed';
      } else if (toZone === 'fatigued' && fromZone === 'maintenance') {
        return 'Accumulating fatigue - monitor recovery carefully';
      } else if (toZone === 'productive_training' && fromZone === 'optimal_race') {
        return 'Building training load - moving away from race readiness';
      } else {
        return `Increased fatigue from ${fromZone} to ${toZone}`;
      }
    }
  }
}

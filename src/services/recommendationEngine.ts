/**
 * Phase Recommendation Engine
 *
 * Generates actionable recommendations for next training phase based on:
 * - Current phase and duration
 * - TSB status
 * - Recent performance
 * - Training load trends
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  DetectedPhase,
  PhaseRecommendation,
  WeeklyMetrics,
  PeriodizationModel
} from '../types/periodization.js';
import { PERIODIZATION_MODELS } from '../constants/periodizationModels.js';

/**
 * Generate phase recommendations
 */
export function generateRecommendations(
  phases: DetectedPhase[],
  weeklyMetrics: WeeklyMetrics[],
  targetModel?: PeriodizationModel
): PhaseRecommendation[] {
  if (phases.length === 0 || weeklyMetrics.length === 0) {
    return [];
  }

  const currentPhase = phases[phases.length - 1];
  const recentWeeks = weeklyMetrics.slice(-4);
  const avgTSB = recentWeeks.reduce((sum, w) => sum + w.avgTSB, 0) / recentWeeks.length;
  const avgCTL = recentWeeks.reduce((sum, w) => sum + w.avgCTL, 0) / recentWeeks.length;

  const model = targetModel ? PERIODIZATION_MODELS[targetModel] : null;

  return [determineNextPhase(currentPhase, avgTSB, avgCTL, model)];
}

/**
 * Determine next recommended phase
 *
 * Uses form metrics (if available) to enhance recommendations with:
 * - Form zone-based recovery timing
 * - TSB trend analysis
 * - Adaptive recovery recommendations
 */
function determineNextPhase(
  currentPhase: DetectedPhase,
  avgTSB: number,
  avgCTL: number,
  model: any
): PhaseRecommendation {
  const phase = currentPhase.phase;
  const weeksInPhase = currentPhase.durationWeeks;

  // Use form metrics if available for enhanced recommendations
  const formMetrics = currentPhase.formMetrics;
  const hasOverreaching = formMetrics && formMetrics.overreachingDays > 7;
  const isInFreshZone = formMetrics && formMetrics.dominantZone === 'fresh';
  const tsbTrend = formMetrics?.tsbTrend;

  // Recovery needed (enhanced with form data)
  const needsRecovery = avgTSB < -25 || weeksInPhase > 12 || hasOverreaching;

  if (needsRecovery) {
    const reasoning: string[] = [];

    if (avgTSB < -25) reasoning.push('High fatigue detected (TSB < -25)');
    if (weeksInPhase > 12) reasoning.push('Extended phase duration requires recovery');
    if (hasOverreaching) reasoning.push(`${formMetrics!.overreachingDays} days of overreaching detected`);

    // Adjust recovery duration based on form
    const recoveryWeeks = hasOverreaching && formMetrics!.overreachingDays > 14
      ? { min: 2, max: 3 }
      : { min: 1, max: 2 };

    return {
      recommendedPhase: 'recovery',
      currentPhase: phase,
      confidence: hasOverreaching ? 95 : 85,
      reasoning,
      targets: {
        durationWeeks: recoveryWeeks,
        weeklyVolume: { min: 2, max: 4 },
        weeklyTSS: { min: 50, max: 150 },
        targetTSB: { min: 15, max: 30 },
        hrZoneEmphasis: [1, 2]
      },
      actions: [
        'Reduce training volume by 40-60%',
        'Focus on easy aerobic activities',
        'Prioritize sleep and nutrition',
        'Allow TSB to return to positive range',
        ...(hasOverreaching ? ['Consider complete rest for 2-3 days'] : [])
      ],
      cautions: [
        'Avoid high-intensity work',
        'Monitor for signs of overtraining',
        ...(hasOverreaching ? ['Critical recovery period - do not rush back to training'] : [])
      ]
    };
  }

  // Check if already fresh and ready for more training
  if (isInFreshZone && avgTSB > 20 && tsbTrend !== 'increasing') {
    // Suggest resuming training rather than staying in recovery
    const nextPhaseHint = phase === 'recovery' ? 'base' : 'build';

    return generateResumeTrainingRecommendation(nextPhaseHint, avgCTL, avgTSB, model);
  }

  // Phase-specific recommendations
  switch (phase) {
    case 'base':
      if (weeksInPhase >= 8) {
        return buildPhaseRecommendation(avgCTL, model);
      }
      return continueBaseRecommendation(weeksInPhase);

    case 'build':
      if (weeksInPhase >= 6 && avgCTL > 50) {
        return peakPhaseRecommendation(avgTSB, model);
      }
      return continueBuildRecommendation(weeksInPhase, avgTSB);

    case 'peak':
      if (weeksInPhase >= 3) {
        return taperRecommendation(avgTSB);
      }
      return continuePeakRecommendation(avgTSB);

    case 'taper':
      return competitionRecommendation(avgTSB);

    case 'recovery':
      if (avgTSB > 10) {
        return buildPhaseRecommendation(avgCTL, model);
      }
      return continueRecoveryRecommendation(avgTSB);

    case 'transition':
    default:
      return basePhaseRecommendation(model);
  }
}

function continueBaseRecommendation(weeks: number): PhaseRecommendation {
  return {
    recommendedPhase: 'base',
    confidence: 75,
    reasoning: [`Continue base building (${weeks} weeks completed)`],
    targets: {
      durationWeeks: { min: 8 - weeks, max: 12 - weeks },
      weeklyVolume: { min: 6, max: 10 },
      weeklyTSS: { min: 200, max: 400 },
      hrZoneEmphasis: [1, 2],
      intensityDistribution: { lowIntensity: 80, moderateIntensity: 15, highIntensity: 5 }
    },
    actions: [
      'Maintain high aerobic volume',
      'Progressive volume increase (5-10% per week)',
      'Include 1-2 tempo sessions per week'
    ],
    cautions: ['Avoid excessive high-intensity work']
  };
}

function buildPhaseRecommendation(avgCTL: number, _model: any): PhaseRecommendation {
  return {
    recommendedPhase: 'build',
    confidence: 80,
    reasoning: ['Solid aerobic base established', `Current fitness (CTL): ${avgCTL.toFixed(1)}`],
    targets: {
      durationWeeks: { min: 6, max: 12 },
      weeklyVolume: { min: 6, max: 12 },
      weeklyTSS: { min: 300, max: 500 },
      hrZoneEmphasis: [2, 3],
      intensityDistribution: { lowIntensity: 70, moderateIntensity: 20, highIntensity: 10 }
    },
    actions: [
      'Increase training intensity',
      'Add threshold and tempo work',
      'Maintain moderate volume',
      'Include recovery weeks every 3-4 weeks'
    ],
    cautions: ['Monitor fatigue closely', 'Ensure adequate recovery']
  };
}

function continueBuildRecommendation(weeks: number, _avgTSB: number): PhaseRecommendation {
  return {
    recommendedPhase: 'build',
    confidence: 70,
    reasoning: [`Build phase in progress (${weeks} weeks)`, `TSB: ${_avgTSB.toFixed(1)}`],
    targets: {
      durationWeeks: { min: 6 - weeks, max: 10 - weeks },
      weeklyVolume: { min: 6, max: 12 },
      weeklyTSS: { min: 300, max: 500 },
      hrZoneEmphasis: [2, 3, 4]
    },
    actions: [
      'Continue progressive overload',
      'Balance volume and intensity',
      'Schedule recovery week if TSB < -20'
    ],
    cautions: ['Watch for overtraining signs']
  };
}

function peakPhaseRecommendation(_avgTSB: number, _model: any): PhaseRecommendation {
  return {
    recommendedPhase: 'peak',
    confidence: 85,
    reasoning: ['High fitness achieved', 'Ready for race-specific work'],
    targets: {
      durationWeeks: { min: 2, max: 4 },
      weeklyTSS: { min: 400, max: 600 },
      hrZoneEmphasis: [4, 5],
      intensityDistribution: { lowIntensity: 60, moderateIntensity: 20, highIntensity: 20 }
    },
    actions: [
      'Focus on race-specific intensity',
      'Maintain moderate volume',
      'Include race-pace intervals',
      'Prioritize quality over quantity'
    ],
    cautions: ['High injury risk - monitor carefully', 'Limit duration to 2-4 weeks']
  };
}

function continuePeakRecommendation(_avgTSB: number): PhaseRecommendation {
  return {
    recommendedPhase: 'peak',
    confidence: 75,
    reasoning: ['Peak phase in progress', `Current form: TSB ${_avgTSB.toFixed(1)}`],
    targets: {
      durationWeeks: { min: 1, max: 2 },
      weeklyTSS: { min: 400, max: 600 },
      hrZoneEmphasis: [4, 5]
    },
    actions: [
      'Maintain high-intensity work',
      'Monitor recovery closely',
      'Consider taper if competition approaching'
    ],
    cautions: ['Peak phase should be limited to 2-4 weeks total']
  };
}

function taperRecommendation(_avgTSB: number): PhaseRecommendation {
  return {
    recommendedPhase: 'taper',
    confidence: 90,
    reasoning: ['Competition preparation', 'Time to optimize freshness'],
    targets: {
      durationWeeks: { min: 1, max: 2 },
      weeklyVolume: { min: 3, max: 5 },
      weeklyTSS: { min: 150, max: 300 },
      targetTSB: { min: 10, max: 20 },
      hrZoneEmphasis: [3, 4]
    },
    actions: [
      'Reduce volume by 40-60%',
      'Maintain intensity with shorter intervals',
      'Increase rest days',
      'Focus on race-pace feel'
    ],
    cautions: ['Avoid trying new workouts', "Don't overtaper"]
  };
}

function competitionRecommendation(avgTSB: number): PhaseRecommendation {
  return {
    recommendedPhase: 'recovery',
    confidence: 85,
    reasoning: ['Post-competition recovery', `TSB: ${avgTSB.toFixed(1)}`],
    targets: {
      durationWeeks: { min: 1, max: 2 },
      weeklyVolume: { min: 2, max: 4 },
      weeklyTSS: { min: 50, max: 150 },
      targetTSB: { min: 15, max: 30 }
    },
    actions: [
      'Active recovery only',
      'Cross-training encouraged',
      'Address any injuries',
      'Mental reset'
    ],
    cautions: ['Resist urge to train hard too soon']
  };
}

function continueRecoveryRecommendation(avgTSB: number): PhaseRecommendation {
  return {
    recommendedPhase: 'recovery',
    confidence: 80,
    reasoning: [`Recovery in progress, TSB: ${avgTSB.toFixed(1)}`],
    targets: {
      durationWeeks: { min: 1, max: 1 },
      weeklyVolume: { min: 2, max: 4 },
      weeklyTSS: { min: 50, max: 150 },
      targetTSB: { min: 15, max: 30 }
    },
    actions: [
      'Continue easy aerobic work',
      'Monitor TSB recovery',
      'Prepare for next build phase'
    ],
    cautions: []
  };
}

function basePhaseRecommendation(_model: any): PhaseRecommendation {
  return {
    recommendedPhase: 'base',
    confidence: 75,
    reasoning: ['Start with aerobic foundation'],
    targets: {
      durationWeeks: { min: 8, max: 12 },
      weeklyVolume: { min: 6, max: 10 },
      weeklyTSS: { min: 200, max: 400 },
      hrZoneEmphasis: [1, 2]
    },
    actions: [
      'Build aerobic base',
      'Progressive volume increase',
      'Focus on consistency'
    ],
    cautions: []
  };
}

/**
 * Generate recommendation to resume training after recovery
 *
 * Used when form metrics indicate sufficient recovery (fresh zone, high TSB)
 */
function generateResumeTrainingRecommendation(
  nextPhase: 'base' | 'build',
  avgCTL: number,
  avgTSB: number,
  _model: any
): PhaseRecommendation {
  if (nextPhase === 'build') {
    return {
      recommendedPhase: 'build',
      confidence: 85,
      reasoning: [
        'Well recovered - ready to resume training',
        `Current form: TSB ${avgTSB.toFixed(1)} (fresh)`,
        `Current fitness: CTL ${avgCTL.toFixed(1)}`
      ],
      targets: {
        durationWeeks: { min: 4, max: 8 },
        weeklyVolume: { min: 6, max: 10 },
        weeklyTSS: { min: 250, max: 450 },
        targetTSB: { min: -15, max: 5 },
        hrZoneEmphasis: [2, 3]
      },
      actions: [
        'Gradually resume training volume',
        'Start with moderate intensity',
        'Progressive overload over 2-3 weeks',
        'Monitor form (TSB) carefully as load increases'
      ],
      cautions: ['Avoid sudden jumps in volume', 'Allow 2-3 weeks to rebuild work capacity']
    };
  } else {
    return {
      recommendedPhase: 'base',
      confidence: 80,
      reasoning: [
        'Well recovered - resume base building',
        `Current form: TSB ${avgTSB.toFixed(1)} (fresh)`
      ],
      targets: {
        durationWeeks: { min: 6, max: 10 },
        weeklyVolume: { min: 5, max: 8 },
        weeklyTSS: { min: 200, max: 350 },
        targetTSB: { min: -10, max: 10 },
        hrZoneEmphasis: [1, 2]
      },
      actions: [
        'Resume aerobic base building',
        'Gradual volume progression',
        'Focus on consistency and technique',
        'Monitor TSB - aim for neutral range'
      ],
      cautions: ['Start conservatively', 'Avoid high-intensity work initially']
    };
  }
}

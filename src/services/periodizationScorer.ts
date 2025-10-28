/**
 * Periodization Effectiveness Scoring Service
 *
 * Evaluates training periodization effectiveness across four dimensions:
 * 1. Structure Score - Phase balance, transitions, and lengths
 * 2. Progression Score - Volume progression and CTL gains
 * 3. Recovery Score - TSB management and recovery adequacy
 * 4. Performance Score - PR correlation and fitness gains
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  DetectedPhase,
  EffectivenessAnalysis,
  StructureScore,
  PhaseBalance,
  VolumeProgression,
  RecoveryManagement,
  PerformanceCorrelation,
  FormManagementScore,
  PeriodizationModel,
  WeeklyMetrics,
  TrainingPhase
} from '../types/periodization.js';
import type { PersonalRecord } from '../types/personalRecords.js';
import type { TrendAnalysis } from '../types/progress.js';
import { PERIODIZATION_MODELS } from '../constants/periodizationModels.js';

/**
 * Calculate overall effectiveness score
 */
export function calculateEffectiveness(
  phases: DetectedPhase[],
  weeklyMetrics: WeeklyMetrics[],
  personalRecords: PersonalRecord[],
  targetModel?: PeriodizationModel
): EffectivenessAnalysis {
  // Calculate component scores
  const structureScore = calculateStructureScore(phases, targetModel);
  const progressionAnalysis = calculateProgressionScore(weeklyMetrics, phases);
  const recoveryAnalysis = calculateRecoveryScore(weeklyMetrics, phases);
  const performanceAnalysis = calculatePerformanceScore(phases, personalRecords, weeklyMetrics);

  // Calculate form management score (optional, backward compatible)
  const formManagementScore = calculateFormManagementScore(phases, weeklyMetrics);

  // Calculate overall score (weighted average)
  // If form management is available, include it; otherwise use original weighting
  const hasFormScore = formManagementScore !== undefined;
  const overallScore = hasFormScore
    ? Math.round(
        structureScore.overall * 0.18 +
        progressionAnalysis.overall * 0.22 +
        recoveryAnalysis.overall * 0.22 +
        performanceAnalysis.overall * 0.26 +
        formManagementScore.overall * 0.12
      )
    : Math.round(
        structureScore.overall * 0.20 +
        progressionAnalysis.overall * 0.25 +
        recoveryAnalysis.overall * 0.25 +
        performanceAnalysis.overall * 0.30
      );

  // Assign grade
  const grade = getGrade(overallScore);

  // Calculate phase balance
  const totalWeeks = phases.reduce((sum, p) => sum + p.durationWeeks, 0);
  const phaseBalance = calculatePhaseBalance(phases, totalWeeks, targetModel);

  // Identify strengths and weaknesses
  const { strengths, weaknesses, criticalIssues } = identifyStrengthsWeaknesses({
    structureScore,
    progressionAnalysis,
    recoveryAnalysis,
    performanceAnalysis,
    formManagementScore,
    phaseBalance
  });

  return {
    overallScore,
    grade,
    structureScore,
    progressionScore: progressionAnalysis,
    recoveryScore: recoveryAnalysis,
    performanceScore: performanceAnalysis,
    formManagementScore,
    phaseBalance,
    strengths,
    weaknesses,
    criticalIssues
  };
}

/**
 * Calculate structure score
 */
function calculateStructureScore(
  phases: DetectedPhase[],
  targetModel?: PeriodizationModel
): StructureScore {
  const model = targetModel ? PERIODIZATION_MODELS[targetModel] : null;

  // Phase balance scoring
  const hasBasePhase = phases.some(p => p.phase === 'base');
  const hasBuildPhase = phases.some(p => p.phase === 'build');
  const basePhases = phases.filter(p => p.phase === 'base');
  const buildPhases = phases.filter(p => p.phase === 'build');

  const baseTooBrief = hasBasePhase &&
    basePhases.every(p => p.durationWeeks < (model?.effectivenessCriteria.minBasePhaseWeeks || 6));
  const buildTooBrief = hasBuildPhase &&
    buildPhases.every(p => p.durationWeeks < (model?.effectivenessCriteria.minBuildPhaseWeeks || 4));

  let phaseBalanceScore = 70;
  if (hasBasePhase) phaseBalanceScore += 15;
  if (hasBuildPhase) phaseBalanceScore += 15;
  if (baseTooBrief) phaseBalanceScore -= 20;
  if (buildTooBrief) phaseBalanceScore -= 15;
  phaseBalanceScore = Math.max(0, Math.min(100, phaseBalanceScore));

  // Phase transitions scoring
  let smoothTransitions = 0;
  let abruptTransitions = 0;
  let logicalSequence = true;

  for (let i = 1; i < phases.length; i++) {
    const prev = phases[i - 1];
    const curr = phases[i];

    // Check if transition is logical
    if (isLogicalTransition(prev.phase, curr.phase)) {
      smoothTransitions++;
    } else {
      abruptTransitions++;
      logicalSequence = false;
    }
  }

  const transitionScore = phases.length <= 1 ? 100 :
    Math.round((smoothTransitions / (phases.length - 1)) * 100);

  // Phase lengths scoring
  let appropriateLengths = 0;
  let tooShortPhases = 0;
  let tooLongPhases = 0;

  for (const phase of phases) {
    const minLength = getMinPhaseLength(phase.phase, model);
    const maxLength = getMaxPhaseLength(phase.phase, model);

    if (phase.durationWeeks < minLength) {
      tooShortPhases++;
    } else if (phase.durationWeeks > maxLength) {
      tooLongPhases++;
    } else {
      appropriateLengths++;
    }
  }

  const lengthScore = phases.length === 0 ? 0 :
    Math.round((appropriateLengths / phases.length) * 100);

  // Overall structure score
  const overall = Math.round(
    phaseBalanceScore * 0.40 +
    transitionScore * 0.30 +
    lengthScore * 0.30
  );

  return {
    overall,
    phaseBalance: {
      score: phaseBalanceScore,
      hasBasePhase,
      hasBuildPhase,
      baseTooBrief,
      buildTooBrief
    },
    phaseTransitions: {
      score: transitionScore,
      transitionCount: phases.length - 1,
      smoothTransitions,
      abruptTransitions,
      logicalSequence
    },
    phaseLengths: {
      score: lengthScore,
      appropriateLengths,
      tooShortPhases,
      tooLongPhases
    }
  };
}

/**
 * Calculate progression score
 */
function calculateProgressionScore(
  weeklyMetrics: WeeklyMetrics[],
  phases: DetectedPhase[]
): {
  overall: number;
  volumeProgression: VolumeProgression;
  ctlGain: number;
  ctlGainScore: number;
  recoveryWeeksScore: number;
} {
  const volumeProgression = analyzeVolumeProgression(weeklyMetrics);
  const ctlGain = calculateCTLGain(weeklyMetrics);
  const ctlGainScore = scoreCTLGain(ctlGain, weeklyMetrics.length);
  const recoveryWeeksScore = scoreRecoveryFrequency(phases);

  const overall = Math.round(
    volumeProgression.progressionScore * 0.40 +
    ctlGainScore * 0.40 +
    recoveryWeeksScore * 0.20
  );

  return {
    overall,
    volumeProgression,
    ctlGain,
    ctlGainScore,
    recoveryWeeksScore
  };
}

/**
 * Analyze volume progression
 */
function analyzeVolumeProgression(weeklyMetrics: WeeklyMetrics[]): VolumeProgression {
  const rapidIncreases: VolumeProgression['rapidIncreases'] = [];
  const weeklyIncreases: number[] = [];

  for (let i = 1; i < weeklyMetrics.length; i++) {
    const prevVolume = weeklyMetrics[i - 1].totalDuration / 3600;
    const currVolume = weeklyMetrics[i].totalDuration / 3600;

    if (prevVolume > 0) {
      const increase = ((currVolume - prevVolume) / prevVolume) * 100;
      weeklyIncreases.push(increase);

      if (increase > 15) {
        rapidIncreases.push({
          weekStart: weeklyMetrics[i].weekStart,
          increase,
          previousWeek: prevVolume,
          currentWeek: currVolume
        });
      }
    }
  }

  const avgWeeklyIncrease = weeklyIncreases.length > 0 ?
    weeklyIncreases.reduce((sum, v) => sum + v, 0) / weeklyIncreases.length : 0;

  const isWithinSafeRange = rapidIncreases.length === 0 || rapidIncreases.length < weeklyMetrics.length * 0.1;
  const isProgressive = avgWeeklyIncrease > 0 && avgWeeklyIncrease < 15;

  let progressionScore = 70;
  if (isProgressive) progressionScore += 20;
  if (isWithinSafeRange) progressionScore += 10;
  progressionScore -= rapidIncreases.length * 5;
  progressionScore = Math.max(0, Math.min(100, progressionScore));

  // Mock trend analysis (would use regression in real implementation)
  const volumeTrend: TrendAnalysis = {
    slope: avgWeeklyIncrease,
    intercept: 0,
    rSquared: 0.7,
    isSignificant: true,
    confidenceInterval: { lower: 0, upper: 0 },
    interpretation: isProgressive ? 'Progressive increase' : 'Non-progressive'
  };

  return {
    isProgressive,
    avgWeeklyIncrease,
    isWithinSafeRange,
    rapidIncreases,
    progressionScore,
    volumeTrend
  };
}

/**
 * Calculate CTL gain
 */
function calculateCTLGain(weeklyMetrics: WeeklyMetrics[]): number {
  if (weeklyMetrics.length === 0) return 0;
  const startCTL = weeklyMetrics[0].avgCTL;
  const endCTL = weeklyMetrics[weeklyMetrics.length - 1].avgCTL;
  return endCTL - startCTL;
}

/**
 * Score CTL gain
 *
 * Optimal progression is ~5-7 CTL points per month (1.25-1.75 per week)
 * This translates to roughly 0.6-0.8 weeks per CTL point
 */
function scoreCTLGain(ctlGain: number, weeks: number): number {
  if (ctlGain < 0) return 30; // Loss of fitness
  if (ctlGain === 0) return 50; // Maintenance
  if (weeks === 0) return 50; // Invalid data

  const weeksPerPoint = weeks / ctlGain;

  // Very rapid gain (too fast, high injury risk)
  // More than 4 CTL points per week
  if (weeksPerPoint < 0.25) return 40;

  // Rapid but acceptable for short periods
  // 2-4 CTL points per week (0.25-0.5 weeks per point)
  if (weeksPerPoint < 0.5) return 75;

  // Excellent progression (optimal rate)
  // 1.25-2 CTL points per week (0.5-0.8 weeks per point)
  if (weeksPerPoint <= 0.8) return 95;

  // Good progression
  // 1-1.25 CTL points per week (0.8-1 week per point)
  if (weeksPerPoint <= 1) return 90;

  // Moderate progression
  // 0.5-1 CTL points per week (1-2 weeks per point)
  if (weeksPerPoint <= 2) return 80;

  // Slow progression
  // 0.33-0.5 CTL points per week (2-3 weeks per point)
  if (weeksPerPoint <= 3) return 70;

  // Very slow progression
  // < 0.25 CTL points per week (> 4 weeks per point)
  return 60;
}

/**
 * Score recovery frequency
 */
function scoreRecoveryFrequency(phases: DetectedPhase[]): number {
  const recoveryPhases = phases.filter(p => p.phase === 'recovery');
  if (phases.length < 8) return 80; // Not enough data

  const expectedRecoveryWeeks = phases.reduce((sum, p) => sum + p.durationWeeks, 0) / 4;
  const actualRecoveryWeeks = recoveryPhases.reduce((sum, p) => sum + p.durationWeeks, 0);

  const ratio = actualRecoveryWeeks / expectedRecoveryWeeks;
  if (ratio < 0.5) return 60; // Insufficient recovery
  if (ratio > 2) return 70; // Too much recovery
  return 90; // Appropriate recovery
}

/**
 * Calculate recovery score
 */
function calculateRecoveryScore(
  weeklyMetrics: WeeklyMetrics[],
  phases: DetectedPhase[]
): { overall: number; management: RecoveryManagement } {
  const management = analyzeRecoveryManagement(weeklyMetrics, phases);
  return {
    overall: management.tsbManagement.score,
    management
  };
}

/**
 * Analyze recovery management
 */
function analyzeRecoveryManagement(
  weeklyMetrics: WeeklyMetrics[],
  phases: DetectedPhase[]
): RecoveryManagement {
  const recoveryPhases = phases.filter(p => p.phase === 'recovery');
  const totalWeeks = weeklyMetrics.length;

  const avgRecoveryInterval = recoveryPhases.length > 1 ?
    totalWeeks / recoveryPhases.length : totalWeeks;

  const tsbValues = weeklyMetrics.map(w => w.avgTSB);
  const avgTSB = tsbValues.reduce((sum, v) => sum + v, 0) / tsbValues.length;
  const minTSB = Math.min(...tsbValues);
  const maxTSB = Math.max(...tsbValues);

  const overreachingEpisodes = tsbValues.filter(v => v < -30).length;
  const adequateRecoveryPeriods = tsbValues.filter(v => v > 15).length;

  let tsbScore = 70;
  if (avgTSB >= -10 && avgTSB <= 10) tsbScore += 10; // Good average
  if (overreachingEpisodes === 0) tsbScore += 10; // No overreaching
  else if (overreachingEpisodes > totalWeeks * 0.1) tsbScore -= 20; // Too much overreaching
  if (adequateRecoveryPeriods >= totalWeeks * 0.2) tsbScore += 10; // Adequate recovery
  tsbScore = Math.max(0, Math.min(100, tsbScore));

  const isAdequate = avgRecoveryInterval <= 5 && overreachingEpisodes < totalWeeks * 0.1;

  const recommendations: string[] = [];
  if (overreachingEpisodes > 0) {
    recommendations.push('Reduce frequency of overreaching episodes');
  }
  if (avgRecoveryInterval > 5) {
    recommendations.push('Incorporate more frequent recovery weeks');
  }
  if (adequateRecoveryPeriods < totalWeeks * 0.2) {
    recommendations.push('Allow more time for recovery (TSB > 15)');
  }

  return {
    recoveryWeeksCount: recoveryPhases.length,
    avgRecoveryWeekInterval: avgRecoveryInterval,
    isAdequate,
    tsbManagement: {
      avgTSB,
      tsbRange: { min: minTSB, max: maxTSB },
      overreachingEpisodes,
      adequateRecoveryPeriods,
      score: tsbScore
    },
    recommendations
  };
}

/**
 * Calculate performance score
 */
function calculatePerformanceScore(
  phases: DetectedPhase[],
  personalRecords: PersonalRecord[],
  weeklyMetrics: WeeklyMetrics[]
): { overall: number; correlation: PerformanceCorrelation } {
  const correlation = analyzePerformanceCorrelation(phases, personalRecords, weeklyMetrics);
  return {
    overall: correlation.performanceScore,
    correlation
  };
}

/**
 * Analyze performance correlation
 */
function analyzePerformanceCorrelation(
  phases: DetectedPhase[],
  personalRecords: PersonalRecord[],
  weeklyMetrics: WeeklyMetrics[]
): PerformanceCorrelation {
  const totalPRs = personalRecords.length;

  const prsByPhase: Record<TrainingPhase, number> = {
    base: 0,
    build: 0,
    peak: 0,
    recovery: 0,
    transition: 0,
    taper: 0
  };

  for (const pr of personalRecords) {
    const prDate = pr.timestamp.split('T')[0];
    const phase = phases.find(p => prDate >= p.startDate && prDate <= p.endDate);
    if (phase) {
      prsByPhase[phase.phase]++;
    }
  }

  const fitnessGain = weeklyMetrics.length > 0 ?
    weeklyMetrics[weeklyMetrics.length - 1].avgCTL - weeklyMetrics[0].avgCTL : 0;

  const peakFitness = Math.max(...weeklyMetrics.map(w => w.avgCTL));

  const peakPerformancePhase = (Object.entries(prsByPhase) as Array<[TrainingPhase, number]>)
    .reduce((max, [phase, count]) => count > max[1] ? [phase, count] : max, ['base' as TrainingPhase, 0])[0];

  const effectivePhases = (Object.entries(prsByPhase) as Array<[TrainingPhase, number]>)
    .filter(([_, count]) => count > 0)
    .map(([phase, _]) => phase);

  let performanceScore = 60;
  if (totalPRs > 0) performanceScore += 20;
  if (fitnessGain > 10) performanceScore += 10;
  if (effectivePhases.length >= 2) performanceScore += 10;
  performanceScore = Math.max(0, Math.min(100, performanceScore));

  return {
    totalPRs,
    prsByPhase,
    fitnessGain,
    peakFitness,
    performanceScore,
    peakPerformancePhase,
    effectivePhases
  };
}

/**
 * Calculate phase balance
 */
function calculatePhaseBalance(
  phases: DetectedPhase[],
  totalWeeks: number,
  _targetModel?: PeriodizationModel
): PhaseBalance {
  const phaseCounts: Record<TrainingPhase, number> = {
    base: 0,
    build: 0,
    peak: 0,
    recovery: 0,
    transition: 0,
    taper: 0
  };

  for (const phase of phases) {
    phaseCounts[phase.phase] += phase.durationWeeks;
  }

  const baseRatio = (phaseCounts.base / totalWeeks) * 100;
  const buildRatio = (phaseCounts.build / totalWeeks) * 100;
  const peakRatio = (phaseCounts.peak / totalWeeks) * 100;
  const recoveryRatio = (phaseCounts.recovery / totalWeeks) * 100;
  const transitionRatio = (phaseCounts.transition / totalWeeks) * 100;
  const taperRatio = (phaseCounts.taper / totalWeeks) * 100;

  // Calculate balance score
  let balanceScore = 70;
  if (baseRatio >= 30 && baseRatio <= 50) balanceScore += 15; // Good base ratio
  if (buildRatio >= 20 && buildRatio <= 40) balanceScore += 10; // Good build ratio
  if (recoveryRatio >= 10 && recoveryRatio <= 25) balanceScore += 5; // Good recovery ratio
  balanceScore = Math.max(0, Math.min(100, balanceScore));

  const recommendations: string[] = [];
  if (baseRatio < 30) recommendations.push('Increase base phase duration for better foundation');
  if (buildRatio < 20) recommendations.push('Add more build phase training for fitness gains');
  if (recoveryRatio < 10) recommendations.push('Incorporate more recovery weeks');

  return {
    totalWeeks,
    baseRatio,
    buildRatio,
    peakRatio,
    recoveryRatio,
    transitionRatio,
    taperRatio,
    balanceScore,
    recommendations
  };
}

/**
 * Identify strengths and weaknesses
 */
function identifyStrengthsWeaknesses(analysis: {
  structureScore: StructureScore;
  progressionAnalysis: any;
  recoveryAnalysis: any;
  performanceAnalysis: any;
  formManagementScore?: FormManagementScore;
  phaseBalance: PhaseBalance;
}): {
  strengths: string[];
  weaknesses: string[];
  criticalIssues: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const criticalIssues: string[] = [];

  // Structure
  if (analysis.structureScore.overall >= 80) {
    strengths.push('Well-structured training phases');
  } else if (analysis.structureScore.overall < 60) {
    weaknesses.push('Poor phase structure and transitions');
  }

  // Progression
  if (analysis.progressionAnalysis.volumeProgression.isProgressive) {
    strengths.push('Progressive volume increase');
  }
  if (analysis.progressionAnalysis.volumeProgression.rapidIncreases.length > 0) {
    criticalIssues.push(`${analysis.progressionAnalysis.volumeProgression.rapidIncreases.length} rapid volume increases detected`);
  }

  // Recovery
  if (analysis.recoveryAnalysis.management.isAdequate) {
    strengths.push('Adequate recovery frequency');
  } else {
    weaknesses.push('Insufficient recovery periods');
  }
  if (analysis.recoveryAnalysis.management.tsbManagement.overreachingEpisodes > 0) {
    criticalIssues.push('Overreaching episodes detected');
  }

  // Performance
  if (analysis.performanceAnalysis.correlation.totalPRs > 5) {
    strengths.push('Strong performance gains');
  }

  // Form management (optional)
  if (analysis.formManagementScore) {
    const formScore = analysis.formManagementScore;
    if (formScore.overall >= 80) {
      strengths.push('Excellent form management');
    } else if (formScore.overall < 60) {
      weaknesses.push('Poor form management practices');
    }

    if (formScore.metrics.inappropriateOverreaching > 2) {
      criticalIssues.push('Overreaching in inappropriate phases detected');
    }

    if (formScore.taperEffectivenessScore < 50) {
      weaknesses.push('Ineffective taper execution');
    }
  }

  return { strengths, weaknesses, criticalIssues };
}

/**
 * Calculate form management score
 *
 * Evaluates TSB management effectiveness including:
 * - TSB balance appropriateness for each phase
 * - Overreaching frequency and placement
 * - Taper effectiveness
 * - Recovery timing
 *
 * Returns undefined if form metrics are not available (backward compatible)
 */
function calculateFormManagementScore(
  phases: DetectedPhase[],
  _weeklyMetrics: WeeklyMetrics[]
): FormManagementScore | undefined {
  // Check if any phase has form metrics
  const hasFormMetrics = phases.some(p => p.formMetrics !== undefined);
  if (!hasFormMetrics) {
    return undefined; // Backward compatible: no form data available
  }

  // TSB balance score: evaluate if TSB ranges are appropriate for phase types
  let tsbBalanceScore = 100;
  let totalTSBDeviation = 0;
  const phasesWithForm = phases.filter(p => p.formMetrics);

  for (const phase of phasesWithForm) {
    const form = phase.formMetrics!;
    const optimalTSB = getOptimalTSBForPhase(phase.phase);

    // Calculate deviation from optimal
    const deviation = Math.abs(form.avgTSB - optimalTSB);
    totalTSBDeviation += deviation;

    // Penalize significant deviations
    if (deviation > 15) tsbBalanceScore -= 15;
    else if (deviation > 10) tsbBalanceScore -= 10;
    else if (deviation > 5) tsbBalanceScore -= 5;
  }

  const avgTSBDeviation = phasesWithForm.length > 0 ? totalTSBDeviation / phasesWithForm.length : 0;
  tsbBalanceScore = Math.max(0, Math.min(100, tsbBalanceScore));

  // Overreaching management score
  let overreachingManagementScore = 100;
  let inappropriateOverreaching = 0;

  for (const phase of phasesWithForm) {
    const form = phase.formMetrics!;

    // Overreaching is expected in build phases, not in base/recovery
    if (form.overreachingDays > 0) {
      if (phase.phase === 'base' || phase.phase === 'recovery' || phase.phase === 'transition') {
        inappropriateOverreaching++;
        overreachingManagementScore -= 20;
      } else if (phase.phase === 'build') {
        // Moderate overreaching in build is acceptable
        if (form.overreachingDays > 14) {
          overreachingManagementScore -= 10; // Too much overreaching
        }
      }
    }
  }

  overreachingManagementScore = Math.max(0, Math.min(100, overreachingManagementScore));

  // Taper effectiveness score
  let taperEffectivenessScore = 75; // Default neutral
  let taperQuality = 0;

  for (let i = 1; i < phases.length; i++) {
    const prevPhase = phases[i - 1];
    const currPhase = phases[i];

    // Check if transitioning to peak/taper from build
    if ((currPhase.phase === 'peak' || currPhase.phase === 'taper') &&
        (prevPhase.phase === 'build' || prevPhase.phase === 'base')) {

      if (prevPhase.formMetrics && currPhase.formMetrics) {
        const tsbIncrease = currPhase.formMetrics.avgTSB - prevPhase.formMetrics.avgTSB;

        if (tsbIncrease > 10) {
          taperEffectivenessScore = 95; // Excellent taper
          taperQuality = tsbIncrease;
        } else if (tsbIncrease > 5) {
          taperEffectivenessScore = 85; // Good taper
          taperQuality = tsbIncrease;
        } else if (tsbIncrease < -5) {
          taperEffectivenessScore = 40; // Poor taper (TSB decreased)
          taperQuality = tsbIncrease;
        } else {
          taperEffectivenessScore = 60; // Minimal taper
          taperQuality = tsbIncrease;
        }
      }
    }
  }

  // Recovery timing score
  let recoveryTimingScore = 80;
  let recoveryGaps = 0;

  // Check for missing recovery after extended build phases
  for (let i = 0; i < phases.length - 1; i++) {
    const phase = phases[i];
    const nextPhase = phases[i + 1];

    if ((phase.phase === 'build' || phase.phase === 'peak') &&
        phase.durationWeeks >= 6 &&
        nextPhase.phase !== 'recovery' &&
        nextPhase.phase !== 'taper') {

      if (phase.formMetrics) {
        // Check if TSB was very negative at end of phase
        if (phase.formMetrics.minTSB < -25) {
          recoveryGaps++;
          recoveryTimingScore -= 15;
        }
      }
    }
  }

  recoveryTimingScore = Math.max(0, Math.min(100, recoveryTimingScore));

  // Overall form management score (weighted average)
  const overall = Math.round(
    tsbBalanceScore * 0.30 +
    overreachingManagementScore * 0.25 +
    taperEffectivenessScore * 0.25 +
    recoveryTimingScore * 0.20
  );

  // Generate recommendations
  const recommendations: string[] = [];
  if (avgTSBDeviation > 10) {
    recommendations.push('Adjust training load to achieve more appropriate TSB ranges for each phase');
  }
  if (inappropriateOverreaching > 0) {
    recommendations.push('Avoid overreaching during base and recovery phases');
  }
  if (taperEffectivenessScore < 70) {
    recommendations.push('Improve taper execution by reducing volume 40-60% before peak events');
  }
  if (recoveryGaps > 0) {
    recommendations.push('Schedule recovery weeks after extended build phases (especially when TSB < -25)');
  }

  return {
    overall,
    tsbBalanceScore,
    overreachingManagementScore,
    taperEffectivenessScore,
    recoveryTimingScore,
    metrics: {
      avgTSBDeviation,
      inappropriateOverreaching,
      taperQuality,
      recoveryGaps
    },
    recommendations
  };
}

/**
 * Get optimal TSB range for a phase type
 */
function getOptimalTSBForPhase(phase: TrainingPhase): number {
  switch (phase) {
    case 'base':
      return 0; // Neutral to slightly negative
    case 'build':
      return -10; // Productive training stress
    case 'peak':
      return 15; // Fresh for performance
    case 'taper':
      return 18; // Optimal race readiness
    case 'recovery':
      return 20; // Fresh and recovered
    case 'transition':
      return 10; // Neutral maintenance
    default:
      return 0;
  }
}

// Helper functions

function isLogicalTransition(from: TrainingPhase, to: TrainingPhase): boolean {
  const valid: Record<TrainingPhase, TrainingPhase[]> = {
    base: ['build', 'recovery', 'transition'],
    build: ['peak', 'taper', 'recovery', 'build'],
    peak: ['taper', 'recovery', 'transition'],
    taper: ['peak', 'recovery', 'transition'],
    recovery: ['base', 'build', 'transition'],
    transition: ['base', 'build']
  };
  return valid[from]?.includes(to) ?? false;
}

function getMinPhaseLength(phase: TrainingPhase, model: any): number {
  return model?.phaseCharacteristics[phase]?.typicalDuration.min || 2;
}

function getMaxPhaseLength(phase: TrainingPhase, model: any): number {
  return model?.phaseCharacteristics[phase]?.typicalDuration.max || 16;
}

function getGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

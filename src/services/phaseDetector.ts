/**
 * Training Phase Detection Service
 *
 * Implements hybrid phase detection algorithm combining:
 * - Volume-based detection (hours/distance per week)
 * - Intensity-based detection (HR zone distribution)
 * - TSS-based detection (CTL/ATL/TSB trends)
 *
 * Uses weighted voting with confidence scoring.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  WeeklyMetrics,
  DetectedPhase,
  TrainingPhase,
  TrendDirection,
  PhaseDetectionConfig
} from '../types/periodization.js';
import type { PersonalRecord } from '../types/personalRecords.js';
import type { FormZone } from '../types/fatigue-freshness.js';
import { DEFAULT_PHASE_THRESHOLDS } from '../constants/periodizationModels.js';
import { FormZoneClassifier } from './formZoneClassifier.js';

/**
 * Phase detection result from single method
 */
interface PhaseDetectionResult {
  phase: TrainingPhase;
  confidence: number;
  reasoning: string;
}

/**
 * Detect training phases using hybrid algorithm
 */
export function detectPhases(
  weeklyMetrics: WeeklyMetrics[],
  personalRecords: PersonalRecord[] = [],
  config: PhaseDetectionConfig = DEFAULT_PHASE_THRESHOLDS
): DetectedPhase[] {
  if (weeklyMetrics.length < config.minPhaseWeeks) {
    return [];
  }

  // Step 1: Run individual detection methods
  const volumePhases = detectPhasesByVolume(weeklyMetrics, config);
  const intensityPhases = detectPhasesByIntensity(weeklyMetrics);
  const tssPhases = detectPhasesByTSS(weeklyMetrics);

  // Step 2: Combine using weighted voting
  const hybridPhases = combineDetectionMethods(
    weeklyMetrics,
    volumePhases,
    intensityPhases,
    tssPhases,
    config
  );

  // Step 3: Validate and merge adjacent phases
  const validatedPhases = validatePhaseTransitions(hybridPhases, config.minPhaseWeeks);

  // Step 4: Enrich with performance metrics
  const enrichedPhases = enrichWithPerformanceMetrics(validatedPhases, weeklyMetrics, personalRecords);

  // Step 5: Add HR zone profiles
  const phasesWithHR = addHRZoneProfiles(enrichedPhases, weeklyMetrics);

  // Step 6: Add form metrics (optional, backward compatible)
  const finalPhases = addFormMetrics(phasesWithHR, weeklyMetrics);

  return finalPhases;
}

/**
 * Detect phases based on volume trends
 */
function detectPhasesByVolume(
  weeklyMetrics: WeeklyMetrics[],
  config: PhaseDetectionConfig
): Map<number, PhaseDetectionResult> {
  const phaseMap = new Map<number, PhaseDetectionResult>();

  for (let i = 0; i < weeklyMetrics.length; i++) {
    const week = weeklyMetrics[i];
    const volumeHours = week.totalDuration / 3600;

    // Calculate trend (look at previous 2-4 weeks)
    const trendWindow = Math.min(4, i);
    let trend: TrendDirection = 'stable';
    let confidence = 60;

    if (trendWindow >= 2) {
      const previousVolumes = weeklyMetrics
        .slice(Math.max(0, i - trendWindow), i)
        .map(w => w.totalDuration / 3600);

      const avgPrevious = previousVolumes.reduce((sum, v) => sum + v, 0) / previousVolumes.length;
      const changePercent = ((volumeHours - avgPrevious) / avgPrevious) * 100;

      if (changePercent > 10) {
        trend = 'increasing';
        confidence = 70;
      } else if (changePercent < -10) {
        trend = 'decreasing';
        confidence = 70;
      }
    }

    // Classify phase based on volume level and trend
    let phase: TrainingPhase;
    let reasoning: string;

    if (volumeHours < config.volumeThresholds.low) {
      // Low volume (< 3 hours)
      phase = 'recovery';
      reasoning = `Very low volume (${volumeHours.toFixed(1)}h), ${trend} trend`;
      confidence += 10;
    } else if (volumeHours < config.volumeThresholds.medium) {
      // Medium volume (3-6 hours)
      if (trend === 'decreasing') {
        phase = 'taper';
        reasoning = `Medium volume (${volumeHours.toFixed(1)}h) with decreasing trend`;
        confidence += 5;
      } else if (trend === 'increasing') {
        phase = 'build';
        reasoning = `Medium volume (${volumeHours.toFixed(1)}h) with increasing trend`;
      } else {
        phase = 'peak';
        reasoning = `Medium volume (${volumeHours.toFixed(1)}h), stable`;
      }
    } else if (volumeHours < config.volumeThresholds.high) {
      // Medium-high volume (6-10 hours)
      if (trend === 'increasing') {
        phase = 'build';
        reasoning = `Medium-high volume (${volumeHours.toFixed(1)}h) building`;
        confidence += 5;
      } else if (trend === 'decreasing') {
        phase = 'peak';
        reasoning = `Medium-high volume (${volumeHours.toFixed(1)}h), tapering`;
      } else {
        phase = 'build';
        reasoning = `Medium-high volume (${volumeHours.toFixed(1)}h), maintaining`;
      }
    } else {
      // Very high volume (> 10 hours)
      if (trend === 'increasing') {
        phase = 'base';
        reasoning = `Very high volume (${volumeHours.toFixed(1)}h), building base`;
        confidence += 10;
      } else {
        phase = 'build';
        reasoning = `Very high volume (${volumeHours.toFixed(1)}h), ${trend}`;
      }
    }

    phaseMap.set(i, { phase, confidence, reasoning });
  }

  return phaseMap;
}

/**
 * Detect phases based on intensity (HR zone distribution)
 */
function detectPhasesByIntensity(
  weeklyMetrics: WeeklyMetrics[]
): Map<number, PhaseDetectionResult> {
  const phaseMap = new Map<number, PhaseDetectionResult>();

  for (let i = 0; i < weeklyMetrics.length; i++) {
    const week = weeklyMetrics[i];
    const zones = week.hrZoneDistribution;

    if (!zones) {
      // No HR data, default to low confidence guess
      phaseMap.set(i, {
        phase: 'transition',
        confidence: 30,
        reasoning: 'No HR zone data available'
      });
      continue;
    }

    let phase: TrainingPhase;
    let confidence = 65;
    let reasoning: string;

    // Calculate polarization index (low intensity + high intensity)
    const lowIntensity = zones.zone1Percentage + zones.zone2Percentage;
    const moderateIntensity = zones.zone3Percentage;
    const highIntensity = zones.zone4Percentage + zones.zone5Percentage;

    // Peak phase: High intensity work (check first for priority)
    if (highIntensity > 25 || zones.zone5Percentage > 8) {
      phase = 'peak';
      reasoning = `High intensity emphasis (${highIntensity.toFixed(0)}% Z4-5)`;
      confidence = 75;
    }
    // Base phase: 80%+ in Zone 1-2
    else if (lowIntensity >= 80 && highIntensity < 10) {
      phase = 'base';
      reasoning = `High aerobic emphasis (${lowIntensity.toFixed(0)}% Z1-2)`;
      confidence = 75;
    }
    // Recovery: Very low intensity
    else if (zones.zone1Percentage >= 70 && highIntensity < 5) {
      phase = 'recovery';
      reasoning = `Very easy emphasis (${zones.zone1Percentage.toFixed(0)}% Z1)`;
      confidence = 75;
    }
    // Build phase: Balanced with some intensity
    else if (lowIntensity >= 50 && highIntensity >= 10 && highIntensity <= 25) {
      phase = 'build';
      reasoning = `Balanced intensity (${lowIntensity.toFixed(0)}% Z1-2, ${highIntensity.toFixed(0)}% Z4-5)`;
      confidence = 70;
    }
    // Taper: Moderate intensity, controlled
    else if (moderateIntensity > 30 && highIntensity >= 8 && highIntensity <= 20) {
      phase = 'taper';
      reasoning = `Moderate controlled intensity (${moderateIntensity.toFixed(0)}% Z3)`;
      confidence = 65;
    }
    // Default to build for mixed intensity
    else {
      phase = 'build';
      reasoning = `Mixed intensity distribution`;
      confidence = 50;
    }

    phaseMap.set(i, { phase, confidence, reasoning });
  }

  return phaseMap;
}

/**
 * Detect phases based on TSS trends (CTL/ATL/TSB)
 */
function detectPhasesByTSS(
  weeklyMetrics: WeeklyMetrics[]
): Map<number, PhaseDetectionResult> {
  const phaseMap = new Map<number, PhaseDetectionResult>();

  // Use default thresholds
  const mediumTSS = 300;
  const highTSS = 500;
  const lowTSS = 150;

  for (let i = 0; i < weeklyMetrics.length; i++) {
    const week = weeklyMetrics[i];
    const tss = week.avgWeeklyTSS;
    const ctl = week.avgCTL;
    const tsb = week.avgTSB;

    // Calculate CTL trend
    const trendWindow = Math.min(4, i);
    let ctlTrend: TrendDirection = 'stable';
    let confidence = 65;

    if (trendWindow >= 2) {
      const previousCTL = weeklyMetrics
        .slice(Math.max(0, i - trendWindow), i)
        .map(w => w.avgCTL);

      const avgPreviousCTL = previousCTL.reduce((sum, v) => sum + v, 0) / previousCTL.length;
      const ctlChange = ctl - avgPreviousCTL;

      if (ctlChange > 3) {
        ctlTrend = 'increasing';
        confidence = 70;
      } else if (ctlChange < -3) {
        ctlTrend = 'decreasing';
        confidence = 70;
      }
    }

    let phase: TrainingPhase;
    let reasoning: string;

    // Recovery: Very low TSS (< 150) - always recovery regardless of TSB (check first for priority)
    if (tss < lowTSS) {
      phase = 'recovery';
      reasoning = `Recovery needed (TSS ${tss.toFixed(0)}, very low load)`;
      confidence += 10;
    }
    // Recovery: Overreaching or very high TSB
    else if (tsb >= 25 || tsb < -30) {
      phase = 'recovery';
      reasoning = `Recovery needed (TSB ${tsb.toFixed(1)})`;
      confidence += 5;
    }
    // Taper: Low-medium TSS, CTL stable/decreasing, TSB positive
    else if ((ctlTrend === 'stable' || ctlTrend === 'decreasing') && tsb > 5 && tsb < 25 && tss < mediumTSS) {
      phase = 'taper';
      reasoning = `Freshening up (TSB ${tsb.toFixed(1)}↑)`;
      confidence += 10;
    }
    // Base phase: Low-medium TSS, building CTL (or stable if early), TSB neutral to slightly negative
    else if (
      tss < mediumTSS &&
      (ctlTrend === 'increasing' || (trendWindow < 2 && tsb >= -15 && tsb <= 10)) &&
      tsb >= -15 &&
      tsb <= 10
    ) {
      phase = 'base';
      reasoning = `Building fitness (CTL ${ctl.toFixed(1)}${ctlTrend === 'increasing' ? '↑' : ''}, TSB ${tsb.toFixed(1)})`;
      confidence += 10;
    }
    // Build phase: Medium-high TSS, CTL increasing (or stable if early), TSB negative (productive fatigue)
    else if (
      tss >= mediumTSS &&
      (ctlTrend === 'increasing' || trendWindow < 2) &&
      tsb >= -30 &&
      tsb < 5
    ) {
      phase = 'build';
      reasoning = `Intensifying training (CTL ${ctl.toFixed(1)}${ctlTrend === 'increasing' ? '↑' : ''}, TSB ${tsb.toFixed(1)})`;
      confidence += 10;
    }
    // Peak phase: High TSS, CTL stable/peak, TSB managed
    else if (
      tss >= highTSS &&
      ctlTrend === 'stable' &&
      tsb > -20 &&
      tsb < 10
    ) {
      phase = 'peak';
      reasoning = `Peak load (CTL ${ctl.toFixed(1)}, TSS ${tss.toFixed(0)})`;
      confidence += 10;
    }
    // Default to build
    else {
      phase = 'build';
      reasoning = `Active training (CTL ${ctl.toFixed(1)}, TSB ${tsb.toFixed(1)})`;
      confidence = 55;
    }

    phaseMap.set(i, { phase, confidence, reasoning });
  }

  return phaseMap;
}

/**
 * Combine detection methods using weighted voting
 */
function combineDetectionMethods(
  weeklyMetrics: WeeklyMetrics[],
  volumePhases: Map<number, PhaseDetectionResult>,
  intensityPhases: Map<number, PhaseDetectionResult>,
  tssPhases: Map<number, PhaseDetectionResult>,
  config: PhaseDetectionConfig
): DetectedPhase[] {
  const phases: DetectedPhase[] = [];
  const weights = config.confidenceWeights;

  let currentPhase: TrainingPhase | null = null;
  let phaseStartWeek = 0;
  let phaseWeeks: WeeklyMetrics[] = [];

  for (let i = 0; i < weeklyMetrics.length; i++) {
    const week = weeklyMetrics[i];

    // Get votes from each method
    const volumeVote = volumePhases.get(i)!;
    const intensityVote = intensityPhases.get(i)!;
    const tssVote = tssPhases.get(i)!;

    // Calculate weighted scores for each phase type
    const phaseScores = new Map<TrainingPhase, number>();

    for (const vote of [volumeVote, intensityVote, tssVote]) {
      const currentScore = phaseScores.get(vote.phase) || 0;
      let weight = 0;

      if (vote === volumeVote) weight = weights.volume;
      else if (vote === intensityVote) weight = weights.intensity;
      else if (vote === tssVote) weight = weights.tss;

      phaseScores.set(vote.phase, currentScore + vote.confidence * weight);
    }

    // Select phase with highest weighted score
    let bestPhase: TrainingPhase = 'transition';
    let bestScore = 0;

    for (const [phase, score] of phaseScores) {
      if (score > bestScore) {
        bestScore = score;
        bestPhase = phase;
      }
    }

    // consensusConfidence would be used for additional confidence scoring
    // const totalWeight = weights.volume + weights.intensity + weights.tss;
    // const consensusConfidence = Math.min(100, (bestScore / totalWeight));

    // Check if phase changed
    if (currentPhase !== bestPhase) {
      // Save previous phase if it exists and meets minimum length
      if (currentPhase !== null && phaseWeeks.length >= config.minPhaseWeeks) {
        phases.push(createDetectedPhase(currentPhase, phaseWeeks, {
          volumeVote: volumePhases.get(phaseStartWeek)!,
          intensityVote: intensityPhases.get(phaseStartWeek)!,
          tssVote: tssPhases.get(phaseStartWeek)!
        }));
      } else if (currentPhase !== null && phaseWeeks.length > 0) {
        // Phase too short, merge with previous if possible
        if (phases.length > 0) {
          const lastPhase = phases[phases.length - 1];
          const lastWeeks = weeklyMetrics.slice(
            weeklyMetrics.indexOf(phaseWeeks[0]) - (lastPhase.durationWeeks),
            weeklyMetrics.indexOf(phaseWeeks[0])
          );
          phaseWeeks = [...lastWeeks, ...phaseWeeks];
        }
      }

      // Start new phase
      currentPhase = bestPhase;
      phaseStartWeek = i;
      phaseWeeks = [week];
    } else {
      // Continue current phase
      phaseWeeks.push(week);
    }

    // Handle last phase
    if (i === weeklyMetrics.length - 1) {
      if (phaseWeeks.length >= config.minPhaseWeeks) {
        // Phase meets minimum length requirement
        phases.push(createDetectedPhase(currentPhase!, phaseWeeks, {
          volumeVote: volumePhases.get(phaseStartWeek)!,
          intensityVote: intensityPhases.get(phaseStartWeek)!,
          tssVote: tssPhases.get(phaseStartWeek)!
        }));
      } else if (phaseWeeks.length > 0) {
        // Last phase is too short, try to merge with previous phase
        if (phases.length > 0) {
          const lastPhase = phases[phases.length - 1];
          // Find the weeks that belong to the last phase
          const lastPhaseStartIdx = weeklyMetrics.findIndex(w => w.weekStart === lastPhase.startDate);
          const lastPhaseWeeks = weeklyMetrics.slice(lastPhaseStartIdx, lastPhaseStartIdx + lastPhase.durationWeeks);
          const allWeeks = [...lastPhaseWeeks, ...phaseWeeks];

          // Replace last phase with merged phase (keep phase with higher confidence)
          const currentVote = volumePhases.get(phaseStartWeek)!;
          phases[phases.length - 1] = createDetectedPhase(
            lastPhase.confidence >= currentVote.confidence ? lastPhase.phase : currentPhase!,
            allWeeks,
            {
              volumeVote: volumePhases.get(lastPhaseStartIdx)!,
              intensityVote: intensityPhases.get(lastPhaseStartIdx)!,
              tssVote: tssPhases.get(lastPhaseStartIdx)!
            }
          );
        } else {
          // No previous phase to merge with, create phase anyway
          phases.push(createDetectedPhase(currentPhase!, phaseWeeks, {
            volumeVote: volumePhases.get(phaseStartWeek)!,
            intensityVote: intensityPhases.get(phaseStartWeek)!,
            tssVote: tssPhases.get(phaseStartWeek)!
          }));
        }
      }
    }
  }

  return phases;
}

/**
 * Create detected phase object from weekly metrics
 */
function createDetectedPhase(
  phase: TrainingPhase,
  weeks: WeeklyMetrics[],
  votes: {
    volumeVote: PhaseDetectionResult;
    intensityVote: PhaseDetectionResult;
    tssVote: PhaseDetectionResult;
  }
): DetectedPhase {
  const startDate = weeks[0].weekStart;
  const endDate = weeks[weeks.length - 1].weekEnd;

  // Calculate volume metrics
  const totalVolume = weeks.reduce((sum, w) => sum + w.totalDuration, 0);
  const avgWeeklyVolume = totalVolume / weeks.length / 3600; // hours

  const totalDistance = weeks.reduce((sum, w) => sum + w.totalDistance, 0);
  const avgWeeklyDistance = totalDistance / weeks.length / 1000; // km

  // Calculate volume trend
  const firstHalfVolume = weeks.slice(0, Math.floor(weeks.length / 2))
    .reduce((sum, w) => sum + w.totalDuration, 0) / Math.floor(weeks.length / 2);
  const secondHalfVolume = weeks.slice(Math.floor(weeks.length / 2))
    .reduce((sum, w) => sum + w.totalDuration, 0) / (weeks.length - Math.floor(weeks.length / 2));

  const volumeChange = ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100;
  let volumeTrend: TrendDirection = 'stable';
  if (volumeChange > 10) volumeTrend = 'increasing';
  else if (volumeChange < -10) volumeTrend = 'decreasing';

  // Calculate TSS metrics
  const avgWeeklyTSS = weeks.reduce((sum, w) => sum + w.avgWeeklyTSS, 0) / weeks.length;
  const avgCTL = weeks.reduce((sum, w) => sum + w.avgCTL, 0) / weeks.length;
  const avgATL = weeks.reduce((sum, w) => sum + w.avgATL, 0) / weeks.length;
  const avgTSB = weeks.reduce((sum, w) => sum + w.avgTSB, 0) / weeks.length;

  // CTL gain: difference between last week and first week
  const startCTL = weeks[0].avgCTL;
  const endCTL = weeks[weeks.length - 1].avgCTL;
  const ctlGain = endCTL - startCTL;

  // Intensity trend
  const firstHalfTSS = weeks.slice(0, Math.floor(weeks.length / 2))
    .reduce((sum, w) => sum + w.avgWeeklyTSS, 0) / Math.floor(weeks.length / 2);
  const secondHalfTSS = weeks.slice(Math.floor(weeks.length / 2))
    .reduce((sum, w) => sum + w.avgWeeklyTSS, 0) / (weeks.length - Math.floor(weeks.length / 2));

  const tssChange = ((secondHalfTSS - firstHalfTSS) / firstHalfTSS) * 100;
  let intensityTrend: TrendDirection = 'stable';
  if (tssChange > 10) intensityTrend = 'increasing';
  else if (tssChange < -10) intensityTrend = 'decreasing';

  // Calculate confidence
  const volumeConfidence = votes.volumeVote.confidence;
  const intensityConfidence = votes.intensityVote.confidence;
  const tssConfidence = votes.tssVote.confidence;
  const durationConfidence = Math.min(100, (weeks.length / 4) * 100); // 4 weeks = 100% confidence

  const overallConfidence = (
    volumeConfidence * 0.30 +
    intensityConfidence * 0.40 +
    tssConfidence * 0.30
  ) * (durationConfidence / 100);

  return {
    phase,
    startDate,
    endDate,
    durationWeeks: weeks.length,
    avgWeeklyVolume,
    avgWeeklyDistance,
    volumeTrend,
    volumeChange,
    avgWeeklyTSS,
    tssTrend: intensityTrend,
    avgCTL,
    ctlGain,
    avgATL,
    avgTSB,
    intensityTrend,
    confidence: Math.round(overallConfidence),
    detectionMethod: 'hybrid',
    confidenceFactors: {
      volumeConfidence: Math.round(volumeConfidence),
      intensityConfidence: Math.round(intensityConfidence),
      tssConfidence: Math.round(tssConfidence),
      durationConfidence: Math.round(durationConfidence)
    }
  };
}

/**
 * Validate phase transitions and merge inappropriate phases
 */
function validatePhaseTransitions(
  phases: DetectedPhase[],
  minPhaseWeeks: number
): DetectedPhase[] {
  if (phases.length <= 1) return phases;

  const validated: DetectedPhase[] = [];
  let currentPhase = phases[0];

  for (let i = 1; i < phases.length; i++) {
    const nextPhase = phases[i];

    // Check if transition is logical
    const isValidTransition = isLogicalTransition(currentPhase.phase, nextPhase.phase);

    if (!isValidTransition || currentPhase.durationWeeks < minPhaseWeeks) {
      // Merge phases - keep the one with higher confidence
      if (currentPhase.confidence >= nextPhase.confidence) {
        // Extend current phase
        currentPhase = {
          ...currentPhase,
          endDate: nextPhase.endDate,
          durationWeeks: currentPhase.durationWeeks + nextPhase.durationWeeks
        };
      } else {
        // Replace with next phase
        currentPhase = {
          ...nextPhase,
          startDate: currentPhase.startDate,
          durationWeeks: currentPhase.durationWeeks + nextPhase.durationWeeks
        };
      }
    } else {
      // Valid transition
      validated.push(currentPhase);
      currentPhase = nextPhase;
    }
  }

  validated.push(currentPhase);
  return validated;
}

/**
 * Check if phase transition is logical
 */
function isLogicalTransition(from: TrainingPhase, to: TrainingPhase): boolean {
  const validTransitions: Record<TrainingPhase, TrainingPhase[]> = {
    base: ['build', 'recovery', 'transition'],
    build: ['peak', 'taper', 'recovery', 'build'], // build can repeat
    peak: ['taper', 'recovery', 'transition'],
    taper: ['peak', 'recovery', 'transition'],
    recovery: ['base', 'build', 'transition'],
    transition: ['base', 'build']
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Enrich phases with performance metrics (PRs)
 */
function enrichWithPerformanceMetrics(
  phases: DetectedPhase[],
  _weeklyMetrics: WeeklyMetrics[],
  personalRecords: any[]
): DetectedPhase[] {
  return phases.map(phase => {
    const prsInPhase = personalRecords.filter(pr => {
      const prDate = pr.timestamp.split('T')[0];
      return prDate >= phase.startDate && prDate <= phase.endDate;
    });

    if (prsInPhase.length === 0) {
      return phase;
    }

    const prDetails = prsInPhase.map(pr => ({
      categoryId: pr.category.id,
      categoryName: pr.category.name,
      improvement: 0, // Would need historical data to calculate
      activityId: pr.activityId,
      date: pr.timestamp.split('T')[0]
    }));

    return {
      ...phase,
      performanceMetrics: {
        prsAchieved: prsInPhase.length,
        prDetails,
        efficiencyTrend: 'stable' as TrendDirection
      }
    };
  });
}

/**
 * Add HR zone profiles to phases
 */
function addHRZoneProfiles(
  phases: DetectedPhase[],
  weeklyMetrics: WeeklyMetrics[]
): DetectedPhase[] {
  return phases.map(phase => {
    // Find weeks in this phase
    const phaseWeeks = weeklyMetrics.filter(w =>
      w.weekStart >= phase.startDate && w.weekEnd <= phase.endDate
    );

    // Calculate average HR zone distribution
    const weeksWithHR = phaseWeeks.filter(w => w.hrZoneDistribution);
    if (weeksWithHR.length === 0) {
      return phase;
    }

    const avgZones = {
      zone1Percentage: 0,
      zone2Percentage: 0,
      zone3Percentage: 0,
      zone4Percentage: 0,
      zone5Percentage: 0
    };

    for (const week of weeksWithHR) {
      const zones = week.hrZoneDistribution!;
      avgZones.zone1Percentage += zones.zone1Percentage;
      avgZones.zone2Percentage += zones.zone2Percentage;
      avgZones.zone3Percentage += zones.zone3Percentage;
      avgZones.zone4Percentage += zones.zone4Percentage;
      avgZones.zone5Percentage += zones.zone5Percentage;
    }

    const count = weeksWithHR.length;
    avgZones.zone1Percentage /= count;
    avgZones.zone2Percentage /= count;
    avgZones.zone3Percentage /= count;
    avgZones.zone4Percentage /= count;
    avgZones.zone5Percentage /= count;

    // Find dominant zones (top 2)
    const zoneValues = [
      { zone: 1, percentage: avgZones.zone1Percentage },
      { zone: 2, percentage: avgZones.zone2Percentage },
      { zone: 3, percentage: avgZones.zone3Percentage },
      { zone: 4, percentage: avgZones.zone4Percentage },
      { zone: 5, percentage: avgZones.zone5Percentage }
    ];
    zoneValues.sort((a, b) => b.percentage - a.percentage);
    const dominantZones = zoneValues.slice(0, 2).map(z => z.zone);

    return {
      ...phase,
      hrZoneProfile: {
        ...avgZones,
        dominantZones
      }
    };
  });
}

/**
 * Add form (TSB) metrics to phases
 *
 * Enriches detected phases with form tracking data including:
 * - Average, min, max TSB values
 * - Form zone distribution
 * - Overreaching episodes
 *
 * This function is optional and maintains backward compatibility.
 */
function addFormMetrics(
  phases: DetectedPhase[],
  weeklyMetrics: WeeklyMetrics[]
): DetectedPhase[] {
  const classifier = new FormZoneClassifier();

  return phases.map(phase => {
    // Find weeks in this phase
    const phaseWeeks = weeklyMetrics.filter(w =>
      w.weekStart >= phase.startDate && w.weekEnd <= phase.endDate
    );

    if (phaseWeeks.length === 0) {
      return phase; // No metrics available, return unchanged
    }

    // Calculate TSB statistics
    const tsbValues = phaseWeeks.map(w => w.avgTSB);
    const avgTSB = tsbValues.reduce((sum, v) => sum + v, 0) / tsbValues.length;
    const minTSB = Math.min(...tsbValues);
    const maxTSB = Math.max(...tsbValues);

    // Calculate TSB trend
    const firstHalfTSB = tsbValues.slice(0, Math.floor(tsbValues.length / 2));
    const secondHalfTSB = tsbValues.slice(Math.floor(tsbValues.length / 2));

    const avgFirstHalf = firstHalfTSB.reduce((sum, v) => sum + v, 0) / firstHalfTSB.length;
    const avgSecondHalf = secondHalfTSB.reduce((sum, v) => sum + v, 0) / secondHalfTSB.length;

    let tsbTrend: TrendDirection = 'stable';
    const tsbChange = avgSecondHalf - avgFirstHalf;
    if (tsbChange > 3) tsbTrend = 'increasing';
    else if (tsbChange < -3) tsbTrend = 'decreasing';

    // Calculate form zone distribution
    const zoneCounts: Record<FormZone, number> = {
      overreached: 0,
      fatigued: 0,
      productive_training: 0,
      maintenance: 0,
      optimal_race: 0,
      fresh: 0
    };

    let overreachingDays = 0;

    for (const week of phaseWeeks) {
      // Classify each week's TSB into zone
      const zoneInfo = classifier.classifyFormZone(week.avgTSB, week.avgCTL);
      zoneCounts[zoneInfo.zone]++;

      // Count overreaching days (approximate using weeks * 7)
      if (week.avgTSB < -30) {
        overreachingDays += 7; // Conservative estimate
      }
    }

    // Calculate zone distribution percentages
    const totalWeeks = phaseWeeks.length;
    const zoneDistribution = {
      overreached: (zoneCounts.overreached / totalWeeks) * 100,
      fatigued: (zoneCounts.fatigued / totalWeeks) * 100,
      productiveTraining: (zoneCounts.productive_training / totalWeeks) * 100,
      maintenance: (zoneCounts.maintenance / totalWeeks) * 100,
      optimalRace: (zoneCounts.optimal_race / totalWeeks) * 100,
      fresh: (zoneCounts.fresh / totalWeeks) * 100
    };

    // Find dominant zone
    const dominantZone = (Object.entries(zoneCounts) as Array<[FormZone, number]>)
      .reduce((max, [zone, count]) => count > max[1] ? [zone, count] : max, ['maintenance' as FormZone, 0])[0];

    return {
      ...phase,
      formMetrics: {
        avgTSB,
        minTSB,
        maxTSB,
        tsbTrend,
        zoneDistribution,
        dominantZone,
        overreachingDays
      }
    };
  });
}

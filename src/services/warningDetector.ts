/**
 * Training Warning Detection Service
 *
 * Detects potential training issues and risks:
 * - Rapid volume increases
 * - Chronic fatigue
 * - Insufficient recovery
 * - Monotonous training
 * - Overreaching/overtraining
 */

import type {
  TrainingWarning,
  DetectedPhase,
  WeeklyMetrics,
  EffectivenessAnalysis
} from '../types/periodization.js';

/**
 * Detect all training warnings
 */
export function detectWarnings(
  weeklyMetrics: WeeklyMetrics[],
  phases: DetectedPhase[],
  effectiveness: EffectivenessAnalysis
): TrainingWarning[] {
  const warnings: TrainingWarning[] = [];

  warnings.push(...detectVolumeWarnings(weeklyMetrics));
  warnings.push(...detectFatigueWarnings(weeklyMetrics));
  warnings.push(...detectRecoveryWarnings(weeklyMetrics, phases));
  warnings.push(...detectMonotonyWarnings(weeklyMetrics));
  warnings.push(...detectStructureWarnings(phases, effectiveness));
  warnings.push(...detectFormWarnings(phases)); // Form-specific warnings

  return warnings.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Detect rapid volume increases
 */
function detectVolumeWarnings(weeklyMetrics: WeeklyMetrics[]): TrainingWarning[] {
  const warnings: TrainingWarning[] = [];

  for (let i = 1; i < weeklyMetrics.length; i++) {
    const prevVolume = weeklyMetrics[i - 1].totalDuration / 3600;
    const currVolume = weeklyMetrics[i].totalDuration / 3600;

    if (prevVolume === 0) continue;

    const increase = ((currVolume - prevVolume) / prevVolume) * 100;

    if (increase > 25) {
      warnings.push({
        type: 'rapid_volume_increase',
        severity: 'critical',
        title: 'Rapid Volume Increase Detected',
        description: `Training volume increased by ${increase.toFixed(0)}% in week of ${weeklyMetrics[i].weekStart}`,
        detectedAt: weeklyMetrics[i].weekStart,
        metrics: {
          increase,
          previousVolume: prevVolume,
          currentVolume: currVolume
        },
        recommendations: [
          'Reduce volume to previous level',
          'Increase gradually (max 10% per week)',
          'Monitor for injury signs',
          'Consider extra recovery day'
        ]
      });
    } else if (increase > 15) {
      warnings.push({
        type: 'rapid_volume_increase',
        severity: 'warning',
        title: 'High Volume Increase',
        description: `Training volume increased by ${increase.toFixed(0)}% in week of ${weeklyMetrics[i].weekStart}`,
        detectedAt: weeklyMetrics[i].weekStart,
        metrics: { increase, previousVolume: prevVolume, currentVolume: currVolume },
        recommendations: [
          'Monitor recovery closely',
          'Avoid further rapid increases',
          'Ensure adequate sleep and nutrition'
        ]
      });
    }
  }

  return warnings;
}

/**
 * Detect chronic fatigue
 */
function detectFatigueWarnings(weeklyMetrics: WeeklyMetrics[]): TrainingWarning[] {
  const warnings: TrainingWarning[] = [];

  // Check for prolonged negative TSB
  let consecutiveNegativeWeeks = 0;

  for (const week of weeklyMetrics) {
    if (week.avgTSB < 0) {
      consecutiveNegativeWeeks++;
    } else {
      if (consecutiveNegativeWeeks >= 8) {
        warnings.push({
          type: 'chronic_fatigue',
          severity: 'critical',
          title: 'Chronic Fatigue Detected',
          description: `TSB negative for ${consecutiveNegativeWeeks} consecutive weeks`,
          metrics: { consecutiveWeeks: consecutiveNegativeWeeks },
          recommendations: [
            'Schedule immediate recovery week',
            'Reduce training load by 40-50%',
            'Monitor for overtraining symptoms',
            'Consider medical consultation if symptoms persist'
          ]
        });
      } else if (consecutiveNegativeWeeks >= 6) {
        warnings.push({
          type: 'chronic_fatigue',
          severity: 'warning',
          title: 'Extended Negative TSB',
          description: `TSB negative for ${consecutiveNegativeWeeks} weeks`,
          metrics: { consecutiveWeeks: consecutiveNegativeWeeks },
          recommendations: [
            'Plan recovery week soon',
            'Reduce intensity this week',
            'Prioritize sleep'
          ]
        });
      }
      consecutiveNegativeWeeks = 0;
    }
  }

  // Check for overreaching
  const overreachingWeeks = weeklyMetrics.filter(w => w.avgTSB < -30);
  if (overreachingWeeks.length > 0) {
    warnings.push({
      type: 'overreaching',
      severity: 'critical',
      title: 'Overreaching Episodes Detected',
      description: `${overreachingWeeks.length} weeks with TSB < -30 detected`,
      metrics: {
        overreachingWeeks: overreachingWeeks.length,
        minTSB: Math.min(...overreachingWeeks.map(w => w.avgTSB))
      },
      recommendations: [
        'Immediate recovery required',
        'Reduce training load significantly',
        'Monitor resting heart rate',
        'Watch for illness/injury signs',
        'Consider medical evaluation'
      ]
    });
  }

  return warnings;
}

/**
 * Detect insufficient recovery
 */
function detectRecoveryWarnings(
  weeklyMetrics: WeeklyMetrics[],
  phases: DetectedPhase[]
): TrainingWarning[] {
  const warnings: TrainingWarning[] = [];

  const recoveryPhases = phases.filter(p => p.phase === 'recovery');
  const totalWeeks = weeklyMetrics.length;

  // Check recovery frequency
  if (totalWeeks >= 12 && recoveryPhases.length === 0) {
    warnings.push({
      type: 'insufficient_recovery',
      severity: 'critical',
      title: 'No Recovery Weeks Detected',
      description: `${totalWeeks} weeks of training without recovery phase`,
      recommendations: [
        'Schedule recovery week immediately',
        'Reduce volume by 40-60%',
        'Focus on easy aerobic work',
        'Incorporate recovery weeks every 3-4 weeks'
      ]
    });
  } else if (totalWeeks >= 16) {
    const avgInterval = totalWeeks / (recoveryPhases.length || 1);
    if (avgInterval > 6) {
      warnings.push({
        type: 'insufficient_recovery',
        severity: 'warning',
        title: 'Infrequent Recovery Periods',
        description: `Average ${avgInterval.toFixed(1)} weeks between recovery phases`,
        metrics: { avgInterval, recoveryWeeks: recoveryPhases.length },
        recommendations: [
          'Increase recovery frequency to every 3-4 weeks',
          'Monitor fatigue levels closely',
          'Consider scheduling recovery week soon'
        ]
      });
    }
  }

  // Check for detraining (too much recovery)
  const recentWeeks = weeklyMetrics.slice(-4);
  const avgRecentTSB = recentWeeks.reduce((sum, w) => sum + w.avgTSB, 0) / recentWeeks.length;
  const avgRecentTSS = recentWeeks.reduce((sum, w) => sum + w.avgWeeklyTSS, 0) / recentWeeks.length;

  if (avgRecentTSB > 25 && avgRecentTSS < 150) {
    warnings.push({
      type: 'detraining',
      severity: 'warning',
      title: 'Possible Detraining',
      description: 'Extended period of low training load',
      metrics: { avgTSB: avgRecentTSB, avgTSS: avgRecentTSS },
      recommendations: [
        'Consider resuming training if recovered',
        'Start with base-building phase',
        'Progressive volume increase'
      ]
    });
  }

  return warnings;
}

/**
 * Detect monotonous training
 */
function detectMonotonyWarnings(weeklyMetrics: WeeklyMetrics[]): TrainingWarning[] {
  const warnings: TrainingWarning[] = [];

  if (weeklyMetrics.length < 4) return warnings;

  // Check volume variability
  const recentVolumes = weeklyMetrics.slice(-8).map(w => w.totalDuration / 3600);
  const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
  const variance = recentVolumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / recentVolumes.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avgVolume) * 100; // Coefficient of variation

  if (cv < 10 && avgVolume > 3) {
    warnings.push({
      type: 'monotonous_training',
      severity: 'info',
      title: 'Low Training Variability',
      description: 'Training volume very consistent with little variation',
      metrics: { coefficientOfVariation: cv, avgVolume },
      recommendations: [
        'Incorporate varied training loads',
        'Include recovery weeks',
        'Add intensity variation',
        'Consider periodization approach'
      ]
    });
  }

  return warnings;
}

/**
 * Detect structure-related warnings
 */
function detectStructureWarnings(
  phases: DetectedPhase[],
  effectiveness: EffectivenessAnalysis
): TrainingWarning[] {
  const warnings: TrainingWarning[] = [];

  // Missing base phase
  const hasBase = phases.some(p => p.phase === 'base');
  const hasBuild = phases.some(p => p.phase === 'build');
  const hasPeak = phases.some(p => p.phase === 'peak');

  if ((hasBuild || hasPeak) && !hasBase) {
    warnings.push({
      type: 'missing_base_phase',
      severity: 'warning',
      title: 'Missing Base Phase',
      description: 'High-intensity training without adequate aerobic foundation',
      recommendations: [
        'Consider adding base-building phase',
        'Focus on aerobic development',
        'Build volume before intensity'
      ]
    });
  }

  // Inadequate taper
  const latestPhase = phases[phases.length - 1];
  if (latestPhase.phase === 'peak' && latestPhase.durationWeeks > 4) {
    warnings.push({
      type: 'inadequate_taper',
      severity: 'warning',
      title: 'Extended Peak Phase',
      description: `Peak phase duration (${latestPhase.durationWeeks} weeks) exceeds recommended 2-4 weeks`,
      recommendations: [
        'Consider taper or recovery phase',
        'High-intensity work should be limited',
        'Risk of burnout increases'
      ]
    });
  }

  // Poor phase balance
  if (effectiveness.phaseBalance.balanceScore < 60) {
    warnings.push({
      type: 'poor_phase_balance',
      severity: 'info',
      title: 'Suboptimal Phase Distribution',
      description: 'Training phase distribution not aligned with periodization principles',
      metrics: {
        balanceScore: effectiveness.phaseBalance.balanceScore,
        baseRatio: effectiveness.phaseBalance.baseRatio,
        buildRatio: effectiveness.phaseBalance.buildRatio
      },
      recommendations: effectiveness.phaseBalance.recommendations
    });
  }

  return warnings;
}

/**
 * Detect form-specific warnings
 *
 * Analyzes form (TSB) metrics to detect:
 * - Prolonged overreaching
 * - Extended fresh periods (detraining risk)
 * - Insufficient recovery between build phases
 * - Poor taper execution
 *
 * This function is optional and only runs if form metrics are available.
 */
function detectFormWarnings(phases: DetectedPhase[]): TrainingWarning[] {
  const warnings: TrainingWarning[] = [];

  // Check if form metrics are available
  const hasFormMetrics = phases.some(p => p.formMetrics !== undefined);
  if (!hasFormMetrics) {
    return warnings; // No form data, return empty (backward compatible)
  }

  // Detect prolonged overreaching (TSB < -30 for 10+ days)
  for (const phase of phases) {
    if (!phase.formMetrics) continue;

    const { overreachingDays, avgTSB, minTSB } = phase.formMetrics;

    if (overreachingDays >= 10) {
      warnings.push({
        type: 'overreaching',
        severity: overreachingDays >= 21 ? 'critical' : 'warning',
        title: 'Prolonged Overreaching Detected',
        description: `${overreachingDays} days of overreaching (TSB < -30) in ${phase.phase} phase (${phase.startDate} to ${phase.endDate})`,
        detectedAt: phase.startDate,
        metrics: {
          overreachingDays,
          avgTSB,
          minTSB
        },
        recommendations: [
          'Immediate recovery period recommended',
          'Reduce training volume by 50-60%',
          'Focus on easy aerobic activities only',
          'Monitor for overtraining symptoms',
          'Consider medical evaluation if symptoms persist'
        ]
      });
    }
  }

  // Detect extended fresh periods (TSB > 25 for 14+ days, potential detraining)
  for (const phase of phases) {
    if (!phase.formMetrics) continue;

    const { zoneDistribution, avgTSB } = phase.formMetrics;
    const freshPercentage = zoneDistribution.fresh;

    // If phase spent >70% in fresh zone and avgTSB > 25
    if (freshPercentage > 70 && avgTSB > 25 && phase.durationWeeks >= 2) {
      const daysInPhase = phase.durationWeeks * 7;

      warnings.push({
        type: 'detraining',
        severity: 'warning',
        title: 'Extended Fresh Period - Detraining Risk',
        description: `TSB remained very high (>${avgTSB.toFixed(1)}) for ${daysInPhase} days during ${phase.phase} phase`,
        detectedAt: phase.startDate,
        metrics: {
          avgTSB,
          daysInFreshZone: Math.round((freshPercentage / 100) * daysInPhase),
          phaseWeeks: phase.durationWeeks
        },
        recommendations: [
          'Resume training if fully recovered',
          'Gradually increase training load',
          'Start with base-building activities',
          'Monitor fitness metrics for detraining signs'
        ]
      });
    }
  }

  // Detect insufficient recovery between build phases
  for (let i = 0; i < phases.length - 1; i++) {
    const phase = phases[i];
    const nextPhase = phases[i + 1];

    if (!phase.formMetrics || !nextPhase.formMetrics) continue;

    // Build phase followed by another build without recovery
    if (phase.phase === 'build' && nextPhase.phase === 'build') {
      const endTSB = phase.formMetrics.minTSB; // Use min as proxy for end state
      const startTSB = nextPhase.formMetrics.avgTSB;

      // If TSB didn't recover significantly between build phases
      if (endTSB < -15 && startTSB < -10) {
        warnings.push({
          type: 'insufficient_recovery',
          severity: 'warning',
          title: 'Insufficient Recovery Between Build Phases',
          description: `Build phase transitioned to another build without adequate recovery (TSB remained at ${startTSB.toFixed(1)})`,
          detectedAt: nextPhase.startDate,
          metrics: {
            previousPhaseTSB: endTSB,
            currentPhaseTSB: startTSB,
            tsbRecovery: startTSB - endTSB
          },
          recommendations: [
            'Schedule recovery week between consecutive build phases',
            'Allow TSB to return to positive range (>5)',
            'Reduce volume by 40-50% for recovery',
            'Monitor cumulative fatigue carefully'
          ]
        });
      }
    }
  }

  // Detect poor taper execution (TSB not rising before peak)
  for (let i = 1; i < phases.length; i++) {
    const prevPhase = phases[i - 1];
    const currPhase = phases[i];

    if (!prevPhase.formMetrics || !currPhase.formMetrics) continue;

    // Check if transitioning to peak/taper
    if ((currPhase.phase === 'peak' || currPhase.phase === 'taper') &&
        (prevPhase.phase === 'build' || prevPhase.phase === 'base')) {

      const tsbChange = currPhase.formMetrics.avgTSB - prevPhase.formMetrics.avgTSB;

      // TSB should increase during taper
      if (tsbChange < 3) {
        warnings.push({
          type: 'inadequate_taper',
          severity: tsbChange < -5 ? 'critical' : 'warning',
          title: 'Poor Taper Execution',
          description: `TSB ${tsbChange < 0 ? 'decreased' : 'increased minimally'} during taper to ${currPhase.phase} phase`,
          detectedAt: currPhase.startDate,
          metrics: {
            previousTSB: prevPhase.formMetrics.avgTSB,
            currentTSB: currPhase.formMetrics.avgTSB,
            tsbChange,
            expectedIncrease: 10
          },
          recommendations: [
            'Reduce training volume by 40-60%',
            'Maintain intensity but reduce duration',
            'Target TSB range of 10-20 for peak performance',
            'Ensure adequate rest before key events'
          ]
        });
      }
    }
  }

  return warnings;
}

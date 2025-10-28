/**
 * Service for generating actionable sleep recommendations
 *
 * This service handles:
 * - Creating personalized sleep recommendations
 * - Prioritizing recommendations based on impact
 * - Providing specific, actionable guidance
 */

import type {
  SleepPerformanceCorrelation,
  OptimalSleepPattern,
  SleepDebt,
  PoorSleepImpact,
  SleepTrend,
  RecoveryQuality,
} from '../types/sleep-correlation.js';
import { SLEEP_QUALITY_THRESHOLDS, PERFORMANCE_IMPACT } from '../types/sleep-correlation.js';

/**
 * Generate personalized recommendations
 *
 * @param correlations - Correlation analysis
 * @param optimalPattern - Optimal sleep pattern
 * @param sleepDebt - Sleep debt analysis
 * @param poorSleepImpacts - Poor sleep impacts
 * @param sleepTrend - Sleep trend
 * @param recentRecovery - Recent recovery assessments
 * @returns Array of recommendation strings
 */
export function generateRecommendations(
  correlations: SleepPerformanceCorrelation,
  optimalPattern: OptimalSleepPattern,
  sleepDebt: SleepDebt,
  poorSleepImpacts: PoorSleepImpact[],
  sleepTrend: SleepTrend,
  recentRecovery?: RecoveryQuality[]
): string[] {
  const recommendations: string[] = [];

  // Priority 1: Address critical sleep debt
  if (sleepDebt.currentDebtMinutes > SLEEP_QUALITY_THRESHOLDS.CRITICAL_SLEEP_DEBT) {
    recommendations.push(
      `PRIORITY: Reduce critical sleep debt (${Math.floor(sleepDebt.currentDebtMinutes / 60)}h accumulated). ` +
      `Target ${Math.floor(optimalPattern.optimalDurationMinutes / 60)}+ hours nightly for the next ${sleepDebt.estimatedRecoveryNights} nights.`
    );
  }

  // Priority 2: Address declining trend
  if (sleepTrend.trendDirection === 'declining' && Math.abs(sleepTrend.changeRate) > 30) {
    recommendations.push(
      'URGENT: Your sleep is declining rapidly. Identify and address causes: ' +
      'schedule changes, stress, environmental factors, or lifestyle habits.'
    );
  }

  // Duration recommendations
  recommendations.push(...generateDurationRecommendations(sleepTrend, optimalPattern));

  // Quality recommendations
  recommendations.push(...generateQualityRecommendations(correlations, optimalPattern));

  // Consistency recommendations
  recommendations.push(...generateConsistencyRecommendations(sleepTrend));

  // Recovery recommendations
  if (recentRecovery && recentRecovery.length > 0) {
    recommendations.push(...generateRecoveryRecommendations(recentRecovery));
  }

  // Impact-specific recommendations
  if (poorSleepImpacts.length > 0) {
    recommendations.push(...generateImpactSpecificRecommendations(poorSleepImpacts));
  }

  // General optimization
  recommendations.push(...generateGeneralOptimizations(correlations, sleepTrend));

  return recommendations;
}

/**
 * Generate sleep duration recommendations
 */
function generateDurationRecommendations(
  sleepTrend: SleepTrend,
  optimalPattern: OptimalSleepPattern
): string[] {
  const recommendations: string[] = [];

  const optimalHours = Math.floor(optimalPattern.optimalDurationMinutes / 60);

  if (sleepTrend.avgDurationMinutes < SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN) {
    const deficit = SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MIN - sleepTrend.avgDurationMinutes;

    recommendations.push(
      `Increase sleep duration by ${Math.round(deficit)} minutes. ` +
      `Target ${optimalHours} hours nightly. ` +
      'Tip: Move bedtime earlier by 15 minutes per week until target is reached.'
    );
  } else if (sleepTrend.avgDurationMinutes > SLEEP_QUALITY_THRESHOLDS.OPTIMAL_DURATION_MAX) {
    recommendations.push(
      'You may be oversleeping. While individual needs vary, excessive sleep (>9 hours) ' +
      'can sometimes indicate underlying issues or reduce sleep quality. Consider evaluation if this persists.'
    );
  }

  if (sleepTrend.insufficientSleepDays > 10) {
    recommendations.push(
      `Reduce nights with <7 hours sleep (currently ${sleepTrend.insufficientSleepDays} days). ` +
      'Prioritize sleep on training days and before important events.'
    );
  }

  return recommendations;
}

/**
 * Generate sleep quality recommendations
 */
function generateQualityRecommendations(
  correlations: SleepPerformanceCorrelation,
  optimalPattern: OptimalSleepPattern
): string[] {
  const recommendations: string[] = [];

  if (Math.abs(correlations.deepSleepCorrelation) >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD) {
    recommendations.push(
      `Deep sleep is strongly linked to your performance (${optimalPattern.optimalDeepSleepPercent.toFixed(1)}% optimal). ` +
      'Enhance deep sleep: avoid alcohol, keep room cool (60-67°F), exercise regularly (but not close to bedtime).'
    );
  }

  if (Math.abs(correlations.remSleepCorrelation) >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD) {
    recommendations.push(
      `Optimize REM sleep (target ${optimalPattern.optimalRemSleepPercent.toFixed(1)}%): ` +
      'maintain consistent sleep schedule, manage stress, avoid late caffeine and heavy meals.'
    );
  }

  if (correlations.sleepQualityCorrelation >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD) {
    recommendations.push(
      `Sleep quality significantly impacts your performance (target score: ${optimalPattern.optimalSleepScore}). ` +
      'Focus on: sleep environment (dark, quiet, cool), wind-down routine, limiting screen time before bed.'
    );
  }

  return recommendations;
}

/**
 * Generate consistency recommendations
 */
function generateConsistencyRecommendations(sleepTrend: SleepTrend): string[] {
  const recommendations: string[] = [];

  if (sleepTrend.consistencyScore < 60) {
    recommendations.push(
      'Improve sleep consistency for better results. ' +
      'Keep bedtime and wake time within 30 minutes daily, including weekends. ' +
      'Consistent schedules strengthen circadian rhythms and improve sleep quality.'
    );
  }

  if (sleepTrend.meetsRecommendationPercent < 50) {
    recommendations.push(
      'Focus on meeting basic sleep recommendations more consistently: ' +
      '7-9 hours duration, quality score >70, minimal awakenings. ' +
      'Start with one area and build habits gradually.'
    );
  }

  return recommendations;
}

/**
 * Generate recovery-specific recommendations
 */
function generateRecoveryRecommendations(recentRecovery: RecoveryQuality[]): string[] {
  const recommendations: string[] = [];

  const poorRecoveryDays = recentRecovery.filter(r => r.status === 'poor').length;

  if (poorRecoveryDays >= 3) {
    recommendations.push(
      `${poorRecoveryDays} recent days with poor recovery. ` +
      'Reduce training intensity until recovery improves. ' +
      'Prioritize sleep, nutrition, and stress management.'
    );
  }

  // Check if low sleep contribution to recovery
  const avgSleepContribution = recentRecovery.reduce((sum, r) => sum + r.sleepContribution, 0) / recentRecovery.length;

  if (avgSleepContribution < 60) {
    recommendations.push(
      'Sleep is not adequately supporting recovery (contribution <60%). ' +
      'Address sleep quality issues: consider sleep study if problems persist.'
    );
  }

  const needRestDays = recentRecovery.filter(r => r.recommendedIntensity === 'rest').length;

  if (needRestDays >= 2) {
    recommendations.push(
      `Your body has signaled need for rest ${needRestDays} times recently. ` +
      'Listen to recovery signals - overtraining can lead to injury and performance decline.'
    );
  }

  return recommendations;
}

/**
 * Generate impact-specific recommendations
 */
function generateImpactSpecificRecommendations(poorSleepImpacts: PoorSleepImpact[]): string[] {
  const recommendations: string[] = [];

  const recentImpacts = poorSleepImpacts.slice(0, 3);

  if (recentImpacts.some(i => i.severity === 'high')) {
    recommendations.push(
      'Recent poor sleep has severely impacted performance. ' +
      'Prevent recurrence: identify triggers (stress, schedule, habits) and create preventive strategies.'
    );
  }

  // Identify patterns in affected metrics
  const affectedMetrics = recentImpacts.flatMap(i => i.affectedMetrics);
  const uniqueMetrics = [...new Set(affectedMetrics)];

  if (uniqueMetrics.includes('pace') || uniqueMetrics.includes('power')) {
    recommendations.push(
      'Poor sleep particularly affects your intensity metrics. ' +
      'On low-sleep days, focus on volume/technique work rather than high-intensity efforts.'
    );
  }

  if (uniqueMetrics.includes('body_battery')) {
    recommendations.push(
      'Body Battery frequently depleted after poor sleep. ' +
      'Build in more recovery time, reduce daily stressors, consider naps (20-30 min) if possible.'
    );
  }

  return recommendations;
}

/**
 * Generate general optimization recommendations
 */
function generateGeneralOptimizations(
  correlations: SleepPerformanceCorrelation,
  sleepTrend: SleepTrend
): string[] {
  const recommendations: string[] = [];

  if (correlations.isSignificant && correlations.sampleSize < PERFORMANCE_IMPACT.OPTIMAL_SAMPLE_SIZE) {
    recommendations.push(
      `Continue tracking for ${PERFORMANCE_IMPACT.OPTIMAL_SAMPLE_SIZE - correlations.sampleSize} more days ` +
      'to strengthen analysis confidence and identify seasonal patterns.'
    );
  }

  if (sleepTrend.avgSleepScore < SLEEP_QUALITY_THRESHOLDS.GOOD_SLEEP_SCORE) {
    recommendations.push(
      'Create a sleep optimization plan: ' +
      '1) Establish consistent schedule, ' +
      '2) Optimize environment (dark, cool, quiet), ' +
      '3) Develop wind-down routine, ' +
      '4) Review nutrition and hydration timing.'
    );
  }

  // Always include actionable next step
  recommendations.push(
    'Track your progress: Monitor how sleep changes affect performance over the next 2-4 weeks. ' +
    'Small, consistent improvements compound over time.'
  );

  return recommendations;
}

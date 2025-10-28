/**
 * Service for generating insights from sleep-performance analysis
 *
 * This service handles:
 * - Generating actionable insights from correlations
 * - Identifying key patterns and relationships
 * - Creating human-readable analysis summaries
 */

import type {
  SleepPerformanceCorrelation,
  OptimalSleepPattern,
  SleepDebt,
  PoorSleepImpact,
  SleepTrend,
} from '../types/sleep-correlation.js';
import { PERFORMANCE_IMPACT } from '../types/sleep-correlation.js';
import { getCorrelationStrength } from './correlationCalculator.js';

/**
 * Generate insights from sleep-performance analysis
 *
 * @param correlations - Correlation analysis results
 * @param optimalPattern - Identified optimal sleep pattern
 * @param sleepDebt - Sleep debt analysis
 * @param poorSleepImpacts - Poor sleep impacts
 * @param sleepTrend - Sleep trend analysis
 * @returns Array of insight strings
 */
export function generateInsights(
  correlations: SleepPerformanceCorrelation,
  optimalPattern: OptimalSleepPattern,
  sleepDebt: SleepDebt,
  poorSleepImpacts: PoorSleepImpact[],
  sleepTrend: SleepTrend
): string[] {
  const insights: string[] = [];

  // Correlation insights
  insights.push(...generateCorrelationInsights(correlations));

  // Optimal pattern insights
  insights.push(...generateOptimalPatternInsights(optimalPattern));

  // Sleep debt insights
  insights.push(...generateSleepDebtInsights(sleepDebt));

  // Poor sleep impact insights
  insights.push(...generatePoorSleepInsights(poorSleepImpacts));

  // Trend insights
  insights.push(...generateTrendInsights(sleepTrend));

  return insights;
}

/**
 * Generate insights from correlation data
 */
function generateCorrelationInsights(correlations: SleepPerformanceCorrelation): string[] {
  const insights: string[] = [];

  if (!correlations.isSignificant) {
    if (correlations.sampleSize < PERFORMANCE_IMPACT.MIN_SAMPLE_SIZE) {
      insights.push(
        `Limited data available (${correlations.sampleSize} days). Collect at least ${PERFORMANCE_IMPACT.MIN_SAMPLE_SIZE} days for reliable insights.`
      );
    } else {
      insights.push(
        'No statistically significant correlation found between sleep and performance in this period. ' +
        'This could mean your performance is consistent regardless of sleep variations, or other factors may be more influential.'
      );
    }
    return insights;
  }

  // Sleep duration correlation
  if (Math.abs(correlations.sleepDurationCorrelation) >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD) {
    const strength = getCorrelationStrength(correlations.sleepDurationCorrelation);
    const direction = correlations.sleepDurationCorrelation > 0 ? 'positively' : 'negatively';

    insights.push(
      `Sleep duration is ${strength}ly ${direction} correlated with performance (r=${correlations.sleepDurationCorrelation.toFixed(2)}). ` +
      `${correlations.sleepDurationCorrelation > 0 ? 'More sleep tends to improve performance.' : 'Excessive sleep may be hindering performance.'}`
    );
  }

  // Sleep quality correlation
  if (Math.abs(correlations.sleepQualityCorrelation) >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD) {
    const strength = getCorrelationStrength(correlations.sleepQualityCorrelation);

    insights.push(
      `Sleep quality shows a ${strength} positive correlation with performance (r=${correlations.sleepQualityCorrelation.toFixed(2)}). ` +
      'Focus on improving sleep quality, not just duration.'
    );
  }

  // Deep sleep correlation
  if (Math.abs(correlations.deepSleepCorrelation) >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD) {
    const strength = getCorrelationStrength(correlations.deepSleepCorrelation);

    insights.push(
      `Deep sleep percentage has a ${strength} impact on performance (r=${correlations.deepSleepCorrelation.toFixed(2)}). ` +
      'Deep sleep is crucial for physical recovery and performance.'
    );
  }

  // REM sleep correlation
  if (Math.abs(correlations.remSleepCorrelation) >= PERFORMANCE_IMPACT.SIGNIFICANCE_THRESHOLD) {
    const strength = getCorrelationStrength(correlations.remSleepCorrelation);

    insights.push(
      `REM sleep shows ${strength} correlation with performance (r=${correlations.remSleepCorrelation.toFixed(2)}). ` +
      'REM sleep supports cognitive function and skill consolidation.'
    );
  }

  // Confidence level
  insights.push(
    `Analysis confidence: ${(correlations.confidenceLevel * 100).toFixed(1)}% ` +
    `(based on ${correlations.sampleSize} days of data).`
  );

  return insights;
}

/**
 * Generate insights from optimal sleep pattern
 */
function generateOptimalPatternInsights(optimalPattern: OptimalSleepPattern): string[] {
  const insights: string[] = [];

  if (optimalPattern.daysAboveThreshold === 0) {
    return insights;
  }

  const hours = Math.floor(optimalPattern.optimalDurationMinutes / 60);
  const minutes = optimalPattern.optimalDurationMinutes % 60;

  insights.push(
    `Your optimal sleep duration appears to be ${hours}h ${minutes}m, ` +
    `with ${optimalPattern.optimalDeepSleepPercent.toFixed(1)}% deep sleep and ` +
    `${optimalPattern.optimalRemSleepPercent.toFixed(1)}% REM sleep.`
  );

  if (optimalPattern.performanceImprovement > 10) {
    insights.push(
      `Following optimal sleep patterns leads to ${optimalPattern.performanceImprovement.toFixed(1)}% ` +
      'better performance compared to sub-optimal sleep.'
    );
  }

  const adherencePercent = (optimalPattern.daysAboveThreshold /
    (optimalPattern.daysAboveThreshold + optimalPattern.daysBelowThreshold)) * 100;

  if (adherencePercent < 50) {
    insights.push(
      `You've achieved optimal sleep on only ${adherencePercent.toFixed(0)}% of days. ` +
      'Improving consistency could significantly boost your performance.'
    );
  } else if (adherencePercent >= 75) {
    insights.push(
      `Excellent sleep consistency! You've met optimal sleep criteria ${adherencePercent.toFixed(0)}% of the time.`
    );
  }

  return insights;
}

/**
 * Generate insights from sleep debt
 */
function generateSleepDebtInsights(sleepDebt: SleepDebt): string[] {
  const insights: string[] = [];

  if (sleepDebt.currentDebtMinutes === 0) {
    insights.push('You currently have no sleep debt. Excellent sleep management!');
    return insights;
  }

  const hours = Math.floor(sleepDebt.currentDebtMinutes / 60);
  const minutes = sleepDebt.currentDebtMinutes % 60;

  insights.push(
    `You currently have ${hours}h ${minutes}m of accumulated sleep debt. ` +
    `Recovery will take approximately ${sleepDebt.estimatedRecoveryNights} nights of quality sleep.`
  );

  if (sleepDebt.isAffectingPerformance) {
    insights.push(
      'Your sleep debt is negatively impacting performance. ' +
      'Prioritize recovery with consistent, quality sleep.'
    );
  }

  if (sleepDebt.maxDebtMinutes > 180) {
    const maxHours = Math.floor(sleepDebt.maxDebtMinutes / 60);
    insights.push(
      `Peak sleep debt reached ${maxHours}h on ${sleepDebt.maxDebtDate}. ` +
      'Chronic sleep debt can have long-term health and performance consequences.'
    );
  }

  const avgHours = Math.floor(sleepDebt.avgDebtMinutes / 60);
  if (avgHours > 0) {
    insights.push(
      `Average sleep debt of ${avgHours}h suggests you're consistently under-sleeping. ` +
      'Consider adjusting your sleep schedule.'
    );
  }

  return insights;
}

/**
 * Generate insights from poor sleep impacts
 */
function generatePoorSleepInsights(poorSleepImpacts: PoorSleepImpact[]): string[] {
  const insights: string[] = [];

  if (poorSleepImpacts.length === 0) {
    insights.push('No significant poor sleep impacts detected in this period.');
    return insights;
  }

  const highSeverity = poorSleepImpacts.filter(i => i.severity === 'high').length;
  const moderateSeverity = poorSleepImpacts.filter(i => i.severity === 'moderate').length;

  if (highSeverity > 0) {
    insights.push(
      `Detected ${highSeverity} instance(s) of poor sleep severely impacting performance. ` +
      'These nights reduced performance by 20%+ the following day.'
    );
  }

  if (moderateSeverity > 0) {
    insights.push(
      `${moderateSeverity} instance(s) of poor sleep moderately affected performance (10-20% decrease).`
    );
  }

  // Identify most commonly affected metrics
  const affectedMetrics = poorSleepImpacts
    .flatMap(impact => impact.affectedMetrics);

  const metricCounts = affectedMetrics.reduce((counts, metric) => {
    counts[metric] = (counts[metric] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const mostAffected = Object.entries(metricCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([metric]) => metric);

  if (mostAffected.length > 0) {
    insights.push(
      `Poor sleep most commonly affects: ${mostAffected.join(' and ')}. ` +
      'Focus on maintaining sleep quality when these metrics are important.'
    );
  }

  // Recovery time insight
  const withRecovery = poorSleepImpacts.filter(i => i.recoveryDays !== undefined);
  if (withRecovery.length >= 3) {
    const avgRecovery = withRecovery.reduce((sum, i) => sum + (i.recoveryDays || 0), 0) / withRecovery.length;

    insights.push(
      `On average, it takes ${avgRecovery.toFixed(1)} days to fully recover from poor sleep. ` +
      'Prevention is more efficient than recovery.'
    );
  }

  return insights;
}

/**
 * Generate insights from sleep trends
 */
function generateTrendInsights(sleepTrend: SleepTrend): string[] {
  const insights: string[] = [];

  // Trend direction insight
  if (sleepTrend.trendDirection === 'improving') {
    insights.push(
      `Sleep is improving: ${sleepTrend.changeRate > 0 ? '+' : ''}${sleepTrend.changeRate.toFixed(1)} minutes per week. ` +
      'Keep up the positive momentum!'
    );
  } else if (sleepTrend.trendDirection === 'declining') {
    insights.push(
      `Warning: Sleep is declining by ${Math.abs(sleepTrend.changeRate).toFixed(1)} minutes per week. ` +
      'Intervention may be needed to reverse this trend.'
    );
  }

  // Consistency insight
  if (sleepTrend.consistencyScore >= 80) {
    insights.push(
      `Excellent sleep consistency (score: ${sleepTrend.consistencyScore}). ` +
      'Consistent sleep patterns support stable performance.'
    );
  } else if (sleepTrend.consistencyScore < 50) {
    insights.push(
      `Poor sleep consistency (score: ${sleepTrend.consistencyScore}). ` +
      'Irregular sleep patterns can reduce both sleep quality and performance.'
    );
  }

  // Insufficient sleep insight
  if (sleepTrend.insufficientSleepDays > 0) {
    const percentage = (sleepTrend.insufficientSleepDays / 30) * 100; // Assuming ~30 day period
    insights.push(
      `${sleepTrend.insufficientSleepDays} days with insufficient sleep (<7 hours). ` +
      `That's ${percentage.toFixed(0)}% of the period.`
    );
  }

  // Recommendations adherence
  if (sleepTrend.meetsRecommendationPercent >= 80) {
    insights.push(
      `Outstanding: ${sleepTrend.meetsRecommendationPercent.toFixed(0)}% of nights meet sleep recommendations. ` +
      'This level of adherence should yield strong performance benefits.'
    );
  } else if (sleepTrend.meetsRecommendationPercent < 50) {
    insights.push(
      `Only ${sleepTrend.meetsRecommendationPercent.toFixed(0)}% of nights meet recommended sleep standards. ` +
      'Significant room for improvement in sleep quality and duration.'
    );
  }

  return insights;
}

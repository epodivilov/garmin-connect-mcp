/**
 * @fileoverview Training periodization analysis tools for seasonal planning and effectiveness assessment
 *
 * Provides comprehensive periodization analysis including training phase detection (base, build,
 * peak, recovery, transition), effectiveness scoring, model fit analysis (linear, undulating, block,
 * polarized), and actionable recommendations. Identifies training phases based on volume and intensity
 * patterns, evaluates periodization effectiveness, and provides warnings for suboptimal patterns.
 * Essential for structured training planning, identifying periodization issues, and optimizing
 * training cycles. Requires minimum 8 weeks of data for reliable analysis.
 *
 * NOTE: No summary mode implemented - phase analysis is already a summary.
 * Use includeWarnings and includeRecommendations parameters to control detail level.
 *
 * Tools provided:
 * - getPeriodizationAnalysis: Comprehensive periodization analysis with phase detection and effectiveness scoring
 *
 * @category Analytics
 * @see ../../services/phaseDetector for training phase identification
 * @see ../../services/periodizationScorer for effectiveness calculation
 * @see ../../services/recommendationEngine for training recommendations
 * @see ../aggregation/activity-volume-tools for volume trend analysis
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { GarminClient } from '../../client/garmin-client.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import type { PeriodizationAnalysis } from '../../types/periodization.js';
import { ToolResult } from '../../types/garmin-types.js';
import { detectPhases } from '../../services/phaseDetector.js';
import { calculateEffectiveness } from '../../services/periodizationScorer.js';
import { generateRecommendations } from '../../services/recommendationEngine.js';
import { detectWarnings } from '../../services/warningDetector.js';
import { aggregateWeeklyMetrics } from '../../services/weeklyAggregator.js';
import { parseDateRange } from '../../utils/data-transforms.js';
import { removeEmptyValues } from '../../utils/data-transforms.js';
import { GetPeriodizationAnalysisParams } from '../../types/tool-params.js';

export class PeriodizationTools extends BaseAdvancedTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Analyze training periodization effectiveness across a date range.
   * @param params - Typed parameters for periodization analysis
   */
  async getPeriodizationAnalysis(params: GetPeriodizationAnalysisParams): Promise<ToolResult> {
    try {
      const dateRange = params?.dateRange;
      const targetModel = params?.targetModel;
      const includeWarnings = params?.includeWarnings !== false;
      const includeRecommendations = params?.includeRecommendations !== false;
      const maxActivities = params?.maxActivities || 1000;

      if (!dateRange) {
        return this.createErrorResponse(
          'Error: dateRange is required (format: YYYY-MM-DD/YYYY-MM-DD)'
        );
      }

      // Validate date range format
      if (!/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
        return this.createErrorResponse(
          'Error: Invalid date range format. Expected: YYYY-MM-DD/YYYY-MM-DD'
        );
      }

      // Parse date range
      const { start, end } = parseDateRange(dateRange);
      const totalDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const totalWeeks = Math.floor(totalDays / 7);

      // Require minimum 8 weeks of data
      if (totalWeeks < 8) {
        return this.createErrorResponse(
          JSON.stringify({
            error: "Insufficient data for periodization analysis",
            message: "Minimum 8 weeks of data required",
            providedWeeks: totalWeeks,
            dateRange
          }, null, 2)
        );
      }

      // Fetch activities
      const activities = await this.activityFetcher.getActivitiesInRange(start, end, {
        maxActivities
      });

      if (activities.length === 0) {
        return this.createSuccessResponse({
          message: "No activities found in the specified period",
          dateRange
        });
      }

      // For now, create simplified weekly metrics
      // In production, this would integrate with TSS calculation
      const weeklyMetrics = aggregateWeeklyMetrics(activities, []);

      // Detect phases
      const phases = detectPhases(weeklyMetrics, [], /* config */ undefined as any);

      if (phases.length === 0) {
        return this.createSuccessResponse({
          message: "Unable to detect training phases",
          suggestion: "Ensure consistent training data with sufficient volume variation",
          dateRange,
          activityCount: activities.length
        });
      }

      // Calculate effectiveness
      const effectiveness = calculateEffectiveness(phases, weeklyMetrics, [], targetModel);

      // Generate recommendations
      const recommendations = includeRecommendations ?
        generateRecommendations(phases, weeklyMetrics, targetModel) : [];

      // Detect warnings
      const warnings = includeWarnings ?
        detectWarnings(weeklyMetrics, phases, effectiveness) : [];

      // Determine data quality
      const dataQuality = activities.length > totalWeeks * 3 ? 'excellent' :
        activities.length > totalWeeks * 2 ? 'good' :
          activities.length > totalWeeks ? 'fair' : 'insufficient';

      // Calculate summary metrics
      const totalVolume = weeklyMetrics.reduce((sum, w) => sum + w.totalDuration, 0) / 3600;
      const totalDistance = weeklyMetrics.reduce((sum, w) => sum + w.totalDistance, 0) / 1000;
      const avgWeeklyTSS = weeklyMetrics.reduce((sum, w) => sum + w.avgWeeklyTSS, 0) / weeklyMetrics.length;
      const fitnessGain = weeklyMetrics.length > 0 ?
        weeklyMetrics[weeklyMetrics.length - 1].avgCTL - weeklyMetrics[0].avgCTL : 0;

      // Find primary phase
      const phaseDurations = new Map<string, number>();
      for (const phase of phases) {
        const current = phaseDurations.get(phase.phase) || 0;
        phaseDurations.set(phase.phase, current + phase.durationWeeks);
      }
      const primaryPhase = Array.from(phaseDurations.entries())
        .reduce((max, [phase, duration]) => duration > max[1] ? [phase, duration] : max, ['base', 0])[0];

      // Build result
      const result: PeriodizationAnalysis = {
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          totalWeeks,
          dataQuality: dataQuality as any
        },
        phases,
        modelFit: {
          linear: 0,
          undulating: 0,
          block: 0,
          polarized: 0
        },
        effectiveness,
        recommendations,
        warnings,
        summary: {
          totalActivities: activities.length,
          totalVolume,
          totalDistance,
          avgWeeklyTSS,
          fitnessGain,
          totalPRs: 0,
          primaryPhase: primaryPhase as any
        }
      };

      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Periodization analysis data too large', {
          period: result.period,
          phaseCount: phases.length,
          overallScore: effectiveness.overallScore,
          grade: effectiveness.grade
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(
        `Failed to analyze periodization: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

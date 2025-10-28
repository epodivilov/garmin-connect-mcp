/**
 * @fileoverview Training stress balance (TSB) calculation and tracking tools
 *
 * Provides Training Stress Score (TSS) calculations, Chronic Training Load (CTL), Acute Training
 * Load (ATL), and Training Stress Balance (TSB) monitoring. Uses HR-based TRIMP method when heart
 * rate data is available, falls back to duration-based estimates. Essential for quantifying training
 * load, monitoring fitness progression (CTL), tracking fatigue (ATL), and assessing form/readiness
 * (TSB). Supports time-series analysis for historical tracking and trend identification.
 *
 * Tools provided:
 * - getTrainingStressBalance: Calculate TSS, CTL, ATL, and TSB for a specific date with historical context
 *
 * @category Tracking
 * @see ../../utils/tss-calculator for TSS calculation algorithms
 * @see ../tracking/fatigue-freshness-tools for comprehensive form/freshness analysis
 * @see ../aggregation/activity-volume-tools for volume-based load tracking
 */

import { GarminClient } from '../../client/garmin-client.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import {
  TrainingStressBalanceResult,
  ActivityTSS,
  TSSCalculationOptions
} from '../../types/training-stress.js';
import { ToolResult } from '../../types/garmin-types.js';
import {
  calculateActivityTSS,
  aggregateDailyTSS,
  calculateTrainingStressBalance,
  fillMissingDates
} from '../../utils/tss-calculator.js';
import { removeEmptyValues } from '../../utils/data-transforms.js';
import { createSummary } from '../../utils/summary-helpers.js';
import { logger } from '../../utils/logger.js';
import { GetTrainingStressBalanceParams } from '../../types/tool-params.js';
import { GARMIN_API_DELAY_MS } from '../../constants/apiConfig.js';

export class TrainingStressTools extends BaseAdvancedTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Get training stress balance (TSB), chronic training load (CTL), and acute training load (ATL) for a specific date.
   *
   * Supports summary mode using 'trainingStress' preset which excludes time-series
   * data while preserving current CTL/ATL/TSB values and summary statistics.
   *
   * @param params - Typed parameters for training stress balance retrieval
   */
  async getTrainingStressBalance(params: GetTrainingStressBalanceParams): Promise<ToolResult> {
    const dateStr = params?.date;
    const days = params?.days || 90;
    const includeTimeSeries = params?.includeTimeSeries !== false;
    const restingHR = params?.restingHR;
    const maxHR = params?.maxHR;
    const thresholdHR = params?.thresholdHR;
    const useSummary = params?.includeSummaryOnly ?? params?.summary ?? false;

    try {
      // Parse target date
      const targetDate = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(targetDate.getTime())) {
        throw new Error('Invalid date format. Expected: YYYY-MM-DD');
      }

      // Validate days parameter
      if (days < 7 || days > 365) {
        throw new Error('Days must be between 7 and 365');
      }

      // Calculate date range (need historical data for CTL/ATL calculation)
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day to include all activities on target date
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0); // Set to start of day

      // Fetch activities in the date range
      const activities = await this.activityFetcher.getActivitiesInRange(startDate, endDate);

      if (activities.length === 0) {
        return this.createSuccessResponse({
          message: "No activities found in the specified period",
          period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days
          }
        });
      }

      // Calculate TSS for each activity
      const options: TSSCalculationOptions = {
        restingHR,
        maxHR,
        thresholdHR
      };

      const activityTSSList: ActivityTSS[] = [];
      let activitiesWithHR = 0;
      let activitiesEstimated = 0;

      for (const activity of activities) {
        try {
          // Get detailed activity data if needed
          const detailedActivity = await this.garminClient.getActivity({
            activityId: activity.activityId
          });

          if (!detailedActivity) continue;

          const activityTSS = calculateActivityTSS(detailedActivity, options);
          activityTSSList.push(activityTSS);

          if (activityTSS.calculationMethod === 'hr-trimp') {
            activitiesWithHR++;
          } else {
            activitiesEstimated++;
          }

          // Small delay between API calls (GARMIN_API_DELAY_MS)
          await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));

        } catch (error) {
          logger.error(`Error processing activity ${activity.activityId}:`, error);
          continue;
        }
      }

      // Aggregate into daily TSS
      const dailyTSS = aggregateDailyTSS(activityTSSList);

      // Fill missing dates with zero TSS
      const filledDailyTSS = fillMissingDates(dailyTSS, startDate, endDate);

      // Calculate CTL, ATL, TSB
      const { current, timeSeries } = calculateTrainingStressBalance(
        filledDailyTSS,
        targetDate,
        { includeTimeSeries, lookbackDays: 7 }
      );

      // Calculate summary statistics
      const totalTSS = dailyTSS.reduce((sum, day) => sum + day.totalTSS, 0);
      const daysWithActivities = dailyTSS.filter(day => day.activityCount > 0).length;
      const averageDailyTSS = daysWithActivities > 0
        ? Math.round((totalTSS / daysWithActivities) * 10) / 10
        : 0;

      // Prepare result
      const result: TrainingStressBalanceResult = {
        currentDate: targetDate.toISOString().split('T')[0],
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days
        },
        current,
        timeSeries: includeTimeSeries ? timeSeries : undefined,
        summary: {
          totalActivities: activityTSSList.length,
          totalTSS,
          averageDailyTSS,
          activitiesWithHR,
          activitiesEstimated
        }
      };

      let cleanedData = removeEmptyValues(result);

      // Apply summary mode if requested
      if (useSummary) {
        const summaryResult = createSummary(cleanedData, {
          preset: 'trainingStress',
          includeMetadata: false
        });
        cleanedData = summaryResult.data as typeof cleanedData;
      }

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Training stress balance data too large', {
          currentDate: result.currentDate,
          current: {
            ctl: result.current.ctl,
            atl: result.current.atl,
            tsb: result.current.tsb,
            formStatus: result.current.formStatus
          },
          summary: result.summary
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(
        `Failed to get training stress balance: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

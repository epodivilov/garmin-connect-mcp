/**
 * @fileoverview Daily health and activity summary tools for unified overview retrieval
 *
 * Provides a consolidated daily overview combining sleep quality, activity summaries, and
 * key health metrics in a single request. Essential for daily check-ins, quick status
 * assessments, and trend monitoring without multiple API calls. Gracefully handles partial
 * data availability if individual services are temporarily unavailable.
 *
 * Tools provided:
 * - getDailyOverview: Retrieve unified daily summary with sleep, activities, and health metrics
 *
 * @category Basic
 * @see ../../client/garmin-client for Garmin Connect API integration
 * @see ../basic/sleep-tools for detailed sleep analysis
 * @see ../basic/activity-tools for full activity history
 * @see ../basic/health-tools for comprehensive health metrics
 */

import { GarminClient } from '../../client/garmin-client.js';
import { DailyOverview, ActivitySummary, HealthMetrics, ToolResult } from '../../types/garmin-types.js';
import { secondsToMinutes, gramsToKg, formatActivityType, removeEmptyValues } from '../../utils/data-transforms.js';
import { formatError } from '../../utils/response-helpers.js';
import { logger } from '../../utils/logger.js';
import { BaseDirectTool } from '../base/BaseDirectTool.js';
import { GetDailyOverviewParams } from '../../types/tool-params.js';
import { IActivity } from 'garmin-connect/dist/garmin/types/activity.js';

export class OverviewTools extends BaseDirectTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Retrieve comprehensive daily summary to understand overall health and training status
   *
   * Provides a unified view of sleep quality, daily activities, and key health metrics
   * in a single request. Essential for daily check-ins, identifying trends, and making
   * training decisions. Gracefully handles partial data availability if individual
   * services are temporarily unavailable.
   *
   * @param params - Daily overview retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @returns MCP tool result with daily overview containing sleep, activities, and health data
   * @throws Error if all data sources fail (individual failures are handled gracefully)
   *
   * @example
   * // Get today's overview
   * const result = await overviewTools.getDailyOverview({});
   *
   * @example
   * // Get overview for specific date
   * const result = await overviewTools.getDailyOverview({
   *   date: '2025-10-15'
   * });
   *
   * @see getSleepData for detailed sleep analysis
   * @see getActivities for full activity history with pagination
   * @see getHealthMetrics for detailed health metrics
   */
  async getDailyOverview(params: GetDailyOverviewParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();
    const dateString = date.toISOString().split('T')[0];

    try {
      const overview: DailyOverview = {
        date: dateString,
        hints: []
      };

      // Fetch sleep summary
      try {
        const sleepData = await this.garminClient.getSleepData(date);
        if (sleepData?.dailySleepDTO) {
          const sleep = sleepData.dailySleepDTO;
          overview.sleep = {
            totalSleep: secondsToMinutes(sleep.sleepTimeSeconds) || 0,
            sleepScore: sleep.sleepScores?.overall?.value,
            quality: sleep.sleepScores?.overall?.qualifierKey
          };
          overview.hints!.push("Use get_sleep_data(date, summary=true) for detailed sleep analysis");
        }
      } catch (error) {
        logger.error('Sleep data fetch failed:', error);
      }

      // Fetch activities summary
      try {
        const activities = await this.garminClient.getActivities(0, 10);
        const todayActivities = activities.filter((activity: IActivity) => {
          const activityDate = new Date(activity.startTimeLocal).toISOString().split('T')[0];
          return activityDate === dateString;
        });

        if (todayActivities.length > 0) {
          overview.activities = todayActivities.map((activity: IActivity): ActivitySummary => ({
            id: activity.activityId?.toString(),
            type: formatActivityType(activity.activityType?.typeKey || 'unknown'),
            name: activity.activityName || 'Untitled Activity',
            duration: secondsToMinutes(activity.duration) || 0,
            distance: activity.distance,
            calories: activity.calories
          }));
          overview.hints!.push("Use get_activities_list(date) for full activity details and pagination");
        }
      } catch (error) {
        logger.error('Activities fetch failed:', error);
      }

      // Fetch basic health metrics
      try {
        const healthMetrics: HealthMetrics = {};

        // Steps data
        try {
          const stepsData = await this.garminClient.getSteps(date);
          if (typeof stepsData === 'number') {
            healthMetrics.steps = stepsData;
          }
        } catch (error) {
          logger.error('Steps data fetch failed:', error);
        }

        // Heart rate data
        try {
          const hrData = await this.garminClient.getHeartRate(date);
          if (hrData && typeof hrData === 'object') {
            healthMetrics.restingHR = hrData.restingHeartRate;
          }
        } catch (error) {
          logger.error('Heart rate data fetch failed:', error);
        }

        // Weight data
        try {
          const weightData = await this.garminClient.getDailyWeightData(date);
          if (weightData?.totalAverage?.weight) {
            healthMetrics.weight = gramsToKg(weightData.totalAverage.weight);
          }
        } catch (error) {
          logger.error('Weight data fetch failed:', error);
        }

        if (Object.keys(healthMetrics).length > 0) {
          overview.health = healthMetrics;
          overview.hints!.push("Use get_health_metrics(date, metrics=[...]) for detailed health data");
        }
      } catch (error) {
        logger.error('Health metrics fetch failed:', error);
      }

      // Clean up empty values and validate size
      const cleanedOverview = removeEmptyValues(overview);

      if (!this.validateResponseSize(cleanedOverview)) {
        // Fallback to minimal overview
        const minimalOverview = {
          date: dateString,
          sleep: overview.sleep,
          activitiesCount: overview.activities?.length || 0,
          stepsCount: overview.health?.steps,
          hints: [
            "Data too large for overview. Use specific tools:",
            "get_sleep_data(date) - Sleep details",
            "get_activities_list(date) - Activities list",
            "get_health_metrics(date) - Health metrics"
          ]
        };
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(minimalOverview, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(cleanedOverview, null, 2)
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'fetch daily overview', error instanceof Error ? error : 'Unknown error'));
    }
  }
}
/**
 * @fileoverview Heart rate zone distribution analysis tools for training intensity monitoring
 *
 * Provides comprehensive heart rate zone analysis for individual activities and aggregated
 * periods (weekly, monthly, custom ranges). Calculates time spent in each HR zone (1-5) with
 * percentages, identifies dominant zones, and supports custom zone configuration. Essential for
 * understanding training intensity distribution, implementing polarized/pyramidal training
 * approaches, and ensuring proper zone balance (e.g., 80/20 rule).
 *
 * NOTE: No summary mode implemented - zone distribution is already a summary.
 * Use includeVisualization and includeActivityBreakdown parameters to control detail level.
 *
 * Tools provided:
 * - getActivityHRZones: Analyze HR zone distribution for a single activity
 * - getAggregatedHRZones: Aggregate HR zone distribution across multiple activities in a period
 *
 * @category Analytics
 * @see ../../utils/hr-zone-calculator for zone calculation algorithms
 * @see ../aggregation/activity-volume-tools for volume-based training load
 * @see ../tracking/training-stress-tools for TSS-based intensity measurement
 */

import { GarminClient } from '../../client/garmin-client.js';
import {
  ActivityHRZones,
  AggregatedHRZones,
  HRZoneAggregationOptions,
  HRZoneTime
} from '../../types/hr-zones.js';
import { ToolResult } from '../../types/garmin-types.js';
import {
  createHRZoneConfig,
  calculateZoneDistribution,
  mergeZoneDistributions,
  findDominantZone,
  createVisualizationData,
  parseActivityHRData
} from '../../utils/hr-zone-calculator.js';
import {
  getISOWeekRange,
  getMonthRange,
  parseDateRange,
  formatActivityType
} from '../../utils/data-transforms.js';
import { removeEmptyValues } from '../../utils/data-transforms.js';
import { logger } from '../../utils/logger.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import {
  GetActivityHRZonesParams,
  GetAggregatedHRZonesParams
} from '../../types/tool-params.js';
import { ProcessedActivity } from '../../types/garmin-types.js';
import { GARMIN_API_DELAY_MS } from '../../constants/apiConfig.js';

export class HRZoneTools extends BaseAdvancedTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Analyze heart rate zone distribution for a single activity to assess training intensity
   *
   * Calculates time spent in each HR zone (1-5) with percentages and identifies dominant
   * zone. Essential for verifying workout intensity matches intended training goals and
   * ensuring proper execution of zone-specific workouts. Supports custom zone configuration.
   *
   * @param params - Activity HR zone retrieval parameters
   * @param params.activityId - Unique identifier of the activity
   * @param params.maxHR - Custom maximum heart rate for zone calculation (optional, defaults to activity max or 185)
   * @param params.customZones - Custom zone ranges as percentage of max HR (optional)
   * @returns MCP tool result with HR zone distribution or error message
   * @throws Error if activity ID is invalid, not found, or Garmin API is unavailable
   *
   * @example
   * // Analyze zones for an activity
   * const result = await hrZoneTools.getActivityHRZones({
   *   activityId: 12345678901
   * });
   *
   * @example
   * // Use custom max HR and zones
   * const result = await hrZoneTools.getActivityHRZones({
   *   activityId: 12345678901,
   *   maxHR: 190,
   *   customZones: {
   *     zone1: { min: 0, max: 60 },
   *     zone2: { min: 60, max: 70 },
   *     zone3: { min: 70, max: 80 },
   *     zone4: { min: 80, max: 90 },
   *     zone5: { min: 90, max: 100 }
   *   }
   * });
   *
   * @see getAggregatedHRZones for multi-activity zone analysis
   */
  async getActivityHRZones(params: GetActivityHRZonesParams): Promise<ToolResult> {
    const activityId = params?.activityId;
    const customMaxHR = params?.maxHR;
    const customZones = params?.customZones;

    if (!activityId) {
      return this.createErrorResponse("Error: activityId is required");
    }

    try {
      // Fetch activity details
      const activity = await this.garminClient.getActivity({ activityId });

      if (!activity) {
        return this.createSuccessResponse({
          activityId,
          message: `No activity found with ID: ${activityId}`
        });
      }

      // Parse HR data from activity
      const { hrData, averageHR, maxHR: activityMaxHR } = parseActivityHRData(activity);

      // Determine max HR for zone calculation
      const maxHR = customMaxHR || activityMaxHR || 185;

      // Create zone configuration
      const zoneConfig = createHRZoneConfig(maxHR, customZones);

      // Check if activity has HR data
      const hasHRData = hrData.length > 0 || (averageHR && averageHR > 0);

      if (!hasHRData) {
        return this.createSuccessResponse({
          activityId,
          activityName: activity.activityName,
          activityType: activity.activityType?.typeKey,
          hasHRData: false,
          message: "This activity does not contain heart rate data"
        });
      }

      // Calculate zone distribution
      const duration = activity.duration || 0;
      const zoneDistribution = calculateZoneDistribution(hrData, duration, zoneConfig);

      // Calculate total time in zones
      const totalTimeInZones = zoneDistribution.reduce(
        (sum, zone) => sum + zone.timeSeconds,
        0
      );

      // Create response
      const result: ActivityHRZones = {
        activityId,
        activityName: activity.activityName || 'Unnamed Activity',
        activityType: activity.activityType?.typeKey || 'unknown',
        startTimeLocal: activity.startTimeLocal,
        duration,
        zoneDistribution,
        summary: {
          totalTimeInZones,
          averageHR,
          maxHR: activityMaxHR,
          dominantZone: findDominantZone(zoneDistribution)
        },
        hasHRData: true
      };

      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Activity HR zone data too large', {
          activityId,
          activityName: activity.activityName,
          hasHRData: true
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get activity HR zones: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Aggregate heart rate zone distribution over a period to analyze training intensity patterns
   *
   * Calculates cumulative time in each HR zone across multiple activities. Essential for
   * implementing polarized training (80/20 rule), pyramidal distribution, or threshold-based
   * approaches. Supports weekly, monthly, or custom date ranges with activity-type breakdown.
   *
   * @param params - Aggregated HR zone retrieval parameters
   * @param params.periodType - Period type: 'weekly', 'monthly', or 'custom'
   * @param params.year - Target year (required for weekly/monthly)
   * @param params.week - ISO week number 1-53 (required for weekly)
   * @param params.month - Month number 1-12 (required for monthly)
   * @param params.dateRange - Date range in YYYY-MM-DD/YYYY-MM-DD format (required for custom)
   * @param params.maxHR - Custom maximum heart rate for zone calculation (optional, default: 185)
   * @param params.customZones - Custom zone ranges as percentage of max HR (optional)
   * @param params.includeActivityBreakdown - Include per-activity-type breakdown (default: true)
   * @param params.includeVisualization - Include visualization data (labels, values, colors) (default: true)
   * @param params.maxActivities - Maximum activities to process (default: 1000)
   * @param params.activityTypes - Filter by specific activity types (e.g., ['running', 'cycling'])
   * @returns MCP tool result with aggregated HR zone distribution or error message
   * @throws Error if period parameters are invalid or Garmin API is unavailable
   *
   * @example
   * // Analyze current week's HR zone distribution
   * const result = await hrZoneTools.getAggregatedHRZones({
   *   periodType: 'weekly'
   * });
   *
   * @example
   * // Verify polarized training (80/20 rule) for running only
   * const result = await hrZoneTools.getAggregatedHRZones({
   *   periodType: 'monthly',
   *   year: 2025,
   *   month: 10,
   *   activityTypes: ['running']
   * });
   *
   * @see getActivityHRZones for single activity zone analysis
   */
  async getAggregatedHRZones(params: GetAggregatedHRZonesParams): Promise<ToolResult> {
    const periodType = params?.periodType || 'custom';
    const year = params?.year;
    const week = params?.week;
    const month = params?.month;
    const dateRange = params?.dateRange;
    const customMaxHR = params?.maxHR;
    const customZones = params?.customZones;

    const options: HRZoneAggregationOptions = {
      includeActivityBreakdown: params?.includeActivityBreakdown !== false,
      includeVisualization: params?.includeVisualization !== false,
      maxActivities: params?.maxActivities || 1000,
      activityTypes: params?.activityTypes,
      customZoneConfig: customMaxHR ? { maxHR: customMaxHR, zones: customZones } : undefined
    };

    try {
      // Determine date range based on period type
      let start: Date;
      let end: Date;
      let periodLabel: string;

      if (periodType === 'weekly') {
        if (!year || !week) {
          throw new Error('year and week are required for weekly period');
        }
        const weekRange = getISOWeekRange(year, week);
        start = weekRange.start;
        end = weekRange.end;
        periodLabel = `Week ${week}, ${year}`;
      } else if (periodType === 'monthly') {
        if (!year || !month) {
          throw new Error('year and month are required for monthly period');
        }
        const monthRange = getMonthRange(year, month);
        start = monthRange.start;
        end = monthRange.end;
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        periodLabel = `${monthNames[month - 1]} ${year}`;
      } else {
        // Custom range
        if (!dateRange) {
          throw new Error('dateRange is required for custom period (format: YYYY-MM-DD/YYYY-MM-DD)');
        }
        const parsed = parseDateRange(dateRange);
        start = parsed.start;
        end = parsed.end;
        periodLabel = `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`;
      }

      // Get activities in the date range
      let activities;
      try {
        activities = await this.activityFetcher.getActivitiesInRange(start, end, options);
      } catch (error) {
        // If fetching fails, return empty result instead of error
        // This allows graceful degradation for aggregated queries
        logger.error('Error fetching activities for HR zones:', error);
        return this.createSuccessResponse({
          period: {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            type: periodType,
            label: periodLabel
          },
          totalActivities: 0,
          message: "No activities found in the specified period"
        });
      }

      if (activities.length === 0) {
        return this.createSuccessResponse({
          period: {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            type: periodType,
            label: periodLabel
          },
          totalActivities: 0,
          message: "No activities found in the specified period"
        });
      }

      // Process activities and calculate HR zone distributions
      const result = await this.processActivitiesForZones(
        activities,
        start,
        end,
        periodType,
        periodLabel,
        options
      );

      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Aggregated HR zone data too large', {
          period: result.period,
          totalActivities: result.totalActivities,
          activitiesWithHR: result.activitiesWithHR
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get aggregated HR zones: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Process activities and calculate HR zone distributions
   */
  private async processActivitiesForZones(
    activities: ProcessedActivity[],
    start: Date,
    end: Date,
    periodType: string,
    periodLabel: string,
    options: HRZoneAggregationOptions
  ): Promise<AggregatedHRZones> {
    // Determine max HR for zone calculation
    const maxHR = options.customZoneConfig?.maxHR || 185;
    const zoneConfig = createHRZoneConfig(maxHR, options.customZoneConfig?.zones);

    const allDistributions: HRZoneTime[][] = [];
    const byActivityType: Record<string, {
      activityCount: number;
      totalDuration: number;
      distributions: HRZoneTime[][];
    }> = {};
    let activitiesWithHR = 0;
    let totalDuration = 0;

    // Process each activity
    for (const activity of activities) {
      try {
        // Get detailed activity data
        const detailedActivity = await this.garminClient.getActivity({
          activityId: activity.activityId
        });

        if (!detailedActivity) continue;

        // Parse HR data
        const { hrData, averageHR } = parseActivityHRData(detailedActivity);
        const hasHRData = hrData.length > 0 || (averageHR && averageHR > 0);

        if (!hasHRData) continue;

        activitiesWithHR++;
        const duration = detailedActivity.duration || 0;
        totalDuration += duration;

        // Calculate zone distribution for this activity
        const zoneDistribution = calculateZoneDistribution(hrData, duration, zoneConfig);
        allDistributions.push(zoneDistribution);

        // Group by activity type if requested
        if (options.includeActivityBreakdown) {
          const activityType = formatActivityType(
            detailedActivity.activityType?.typeKey || 'unknown'
          );

          if (!byActivityType[activityType]) {
            byActivityType[activityType] = {
              activityCount: 0,
              totalDuration: 0,
              distributions: []
            };
          }

          byActivityType[activityType].activityCount++;
          byActivityType[activityType].totalDuration += duration;
          byActivityType[activityType].distributions.push(zoneDistribution);
        }

        // Small delay between API calls (GARMIN_API_DELAY_MS)
        await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));

      } catch (error) {
        logger.error(`Error processing activity ${activity.activityId}:`, error);
        continue;
      }
    }

    // Merge all zone distributions
    const aggregatedZoneDistribution = mergeZoneDistributions(allDistributions, zoneConfig);

    // Prepare result
    const result: AggregatedHRZones = {
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        type: periodType as 'weekly' | 'monthly' | 'custom',
        label: periodLabel
      },
      totalActivities: activities.length,
      activitiesWithHR,
      totalDuration,
      zoneDistribution: aggregatedZoneDistribution
    };

    // Add activity type breakdown if requested
    if (options.includeActivityBreakdown && Object.keys(byActivityType).length > 0) {
      result.byActivityType = {};
      for (const [type, data] of Object.entries(byActivityType)) {
        result.byActivityType[type] = {
          activityCount: data.activityCount,
          totalDuration: data.totalDuration,
          zoneDistribution: mergeZoneDistributions(data.distributions, zoneConfig)
        };
      }
    }

    // Add visualization data if requested
    if (options.includeVisualization) {
      result.visualization = createVisualizationData(aggregatedZoneDistribution);
    }

    return result;
  }
}

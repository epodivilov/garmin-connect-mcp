/**
 * @fileoverview Health and wellness metrics retrieval tools for daily health tracking
 *
 * Provides access to comprehensive health metrics including steps, heart rate, weight, and
 * body composition. Essential for monitoring daily wellness, tracking recovery indicators,
 * and identifying correlations between health markers and training. Supports flexible metric
 * selection to optimize response sizes and gracefully handles individual metric failures.
 *
 * Tools provided:
 * - getHealthMetrics: Retrieve aggregated health metrics with flexible metric selection
 * - getStepsData: Get detailed step count and distance data
 * - getHeartRateData: Retrieve comprehensive heart rate statistics and time-series data
 * - getWeightData: Access body composition including weight, BMI, body fat, and muscle mass
 *
 * @category Basic
 * @see ../../client/garmin-client for Garmin Connect API integration
 * @see ../basic/sleep-tools for sleep quality metrics
 * @see ../tracking/hrv-tools for heart rate variability tracking
 */

import { GarminClient } from '../../client/garmin-client.js';
import { gramsToKg, removeEmptyValues } from '../../utils/data-transforms.js';
import { formatError } from '../../utils/response-helpers.js';
import { logger } from '../../utils/logger.js';
import { BaseDirectTool } from '../base/BaseDirectTool.js';
import { ToolResult } from '../../types/garmin-types.js';
import {
  GetHealthMetricsParams,
  GetStepsDataParams,
  GetHeartRateDataParams,
  GetWeightDataParams,
  GetHydrationDataParams
} from '../../types/tool-params.js';

export class HealthTools extends BaseDirectTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Retrieve aggregated health metrics to monitor daily wellness and recovery
   *
   * Provides a flexible way to access multiple health metrics in a single request.
   * Essential for tracking daily health trends, monitoring recovery indicators, and
   * identifying correlations between different health markers. Gracefully handles
   * individual metric failures.
   *
   * @param params - Health metrics retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @param params.metrics - Array of specific metrics to include: ['steps', 'weight', 'heart_rate', 'stress', 'body_battery']
   * @returns MCP tool result with requested health metrics or error message
   * @throws Error if all requested metrics fail to retrieve
   *
   * @example
   * // Get all available health metrics
   * const result = await healthTools.getHealthMetrics({});
   *
   * @example
   * // Get specific metrics only
   * const result = await healthTools.getHealthMetrics({
   *   date: '2025-10-15',
   *   metrics: ['steps', 'heart_rate']
   * });
   *
   * @see getStepsData for detailed step analysis
   * @see getHeartRateData for detailed heart rate data
   * @see getWeightData for complete body composition
   */
  async getHealthMetrics(params: GetHealthMetricsParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();
    const requestedMetrics = params?.metrics || ["steps", "weight", "heart_rate", "stress", "body_battery", "hydration"];
    const dateString = date.toISOString().split('T')[0];

    try {
      const healthData: {
        date: string;
        metrics: Record<string, unknown>;
        hints?: string[];
      } = {
        date: dateString,
        metrics: {}
      };

      const hints: string[] = [];
      let hasData = false;

      // Fetch steps data if requested
      if (requestedMetrics.includes("steps")) {
        try {
          const stepsData = await this.garminClient.getDailyStepsData(date);
          if (stepsData) {
            const goalProgress = stepsData.stepGoal > 0
              ? Math.round((stepsData.totalSteps / stepsData.stepGoal) * 100)
              : 0;

            healthData.metrics.steps = {
              steps: stepsData.totalSteps,
              goal: stepsData.stepGoal,
              goalProgress: `${goalProgress}%`,
              distanceKm: Math.round((stepsData.totalDistance / 1000) * 100) / 100
            };
            hints.push("Use get_steps_data(date) for detailed step analysis");
            hasData = true;
          }
        } catch (error) {
          logger.error('Steps data fetch failed:', error);
          // Individual metric failures are handled gracefully
        }
      }

      // Fetch heart rate data if requested
      if (requestedMetrics.includes("heart_rate")) {
        try {
          const hrData = await this.garminClient.getHeartRate(date);
          if (hrData && typeof hrData === 'object') {
            healthData.metrics.heart_rate = {
              restingHR: hrData.restingHeartRate,
              maxHR: hrData.maxHeartRate,
              minHR: hrData.minHeartRate,
              lastSevenDaysAvg: hrData.lastSevenDaysAvgRestingHeartRate
            };
            hints.push("Use get_heart_rate_data(date) for detailed HR analysis");
            hasData = true;
          }
        } catch (error) {
          logger.error('Heart rate data fetch failed:', error);
          // Individual metric failures are handled gracefully
        }
      }

      // Fetch weight data if requested
      if (requestedMetrics.includes("weight")) {
        try {
          const weightData = await this.garminClient.getDailyWeightData(date);
          if (weightData?.totalAverage?.weight) {
            healthData.metrics.weight = {
              weightKg: gramsToKg(weightData.totalAverage.weight),
              bmi: weightData.totalAverage.bmi,
              bodyFat: weightData.totalAverage.bodyFat,
              muscleMass: weightData.totalAverage.muscleMass
            };
            hints.push("Use get_weight_data(date) for complete body composition");
            hasData = true;
          }
        } catch (error) {
          logger.error('Weight data fetch failed:', error);
          // Individual metric failures are handled gracefully
        }
      }

      // Fetch hydration data if requested
      if (requestedMetrics.includes("hydration")) {
        try {
          // garmin-connect library returns hydration in ounces (already converted from ML)
          const hydrationOz = await this.garminClient.getDailyHydration(date);
          if (hydrationOz !== null && hydrationOz !== undefined && hydrationOz > 0) {
            // Convert ounces to milliliters (1 oz = 29.5735 ml)
            const hydrationMl = Math.round(hydrationOz * 29.5735 * 10) / 10;

            healthData.metrics.hydration = {
              valueInMilliliters: hydrationMl,
              valueInOunces: hydrationOz
            };
            hints.push("Use get_hydration_data(date) for detailed hydration tracking");
            hasData = true;
          }
        } catch (error) {
          logger.error('Hydration data fetch failed:', error);
          // Individual metric failures are handled gracefully
        }
      }

      // Note: Stress and body battery data are not available through getSteps()
      // as the garmin-connect library returns Promise<number> for step count only
      if (requestedMetrics.includes("stress") || requestedMetrics.includes("body_battery")) {
        logger.info('Stress and body battery data not available: requires different API endpoints than getSteps()');
      }

      // If no data was retrieved at all, this might be a complete failure
      if (!hasData && Object.keys(healthData.metrics).length === 0) {
        return this.createErrorResponse(`No health data could be retrieved for ${dateString}. All requested services may be unavailable.`);
      }

      // Add hints if we have data
      if (hasData) {
        healthData.hints = hints;
      }

      // Clean up empty values
      const cleanedData = removeEmptyValues(healthData);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createErrorResponse(JSON.stringify({
          date: dateString,
          error: "Data too large - try requesting specific metrics",
          availableMetrics: ["steps", "weight", "heart_rate", "stress", "body_battery", "hydration"]
        }, null, 2));
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(cleanedData, null, 2)
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'fetch health metrics', error instanceof Error ? error : 'Unknown error'));
    }
  }

  /**
   * Retrieve detailed step count and distance data to track daily movement
   *
   * Provides step count, goal progress, and distance metrics for assessing daily
   * activity levels. Essential for monitoring general activity, identifying sedentary
   * days, and tracking progress toward step goals.
   *
   * Uses 'steps' preset for summary mode with basic counts and goal progress.
   *
   * @param params - Steps data retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @param params.includeSummaryOnly - Return only key metrics (steps, goal progress, distance)
   * @param params.summary - [DEPRECATED: Use includeSummaryOnly] Legacy summary flag
   * @returns MCP tool result with steps data or error message
   * @throws Error if Garmin API is unavailable
   *
   * @example
   * // Get today's steps in summary format
   * const result = await healthTools.getStepsData({
   *   includeSummaryOnly: true
   * });
   *
   * @see getHealthMetrics for combined health metrics including steps
   */
  async getStepsData(params: GetStepsDataParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();
    // includeSummaryOnly takes precedence over deprecated summary parameter
    const useSummary = params?.includeSummaryOnly ?? params?.summary ?? false;

    try {
      // Use the new getDailyStepsData method to get rich step data
      const stepsData = await this.garminClient.getDailyStepsData(date);

      if (!stepsData) {
        return {
          content: [{
            type: "text" as const,
            text: `No steps data available for ${date.toDateString()}`
          }]
        };
      }

      // Calculate goal progress percentage
      const goalProgress = stepsData.stepGoal > 0
        ? Math.round((stepsData.totalSteps / stepsData.stepGoal) * 100)
        : 0;

      // Convert distance from meters to kilometers
      const distanceKm = stepsData.totalDistance / 1000;

      let processedData: Record<string, unknown>;

      if (useSummary) {
        // Summary mode: create a simplified flat structure
        processedData = {
          date: stepsData.calendarDate,
          steps: stepsData.totalSteps,
          goalProgress: `${goalProgress}%`,
          distanceKm: Math.round(distanceKm * 100) / 100
        };
      } else {
        // Detailed mode: include all data
        processedData = {
          date: stepsData.calendarDate,
          steps: {
            total: stepsData.totalSteps,
            goal: stepsData.stepGoal,
            goalProgress: goalProgress,
            goalProgressPercent: `${goalProgress}%`
          },
          distance: {
            meters: stepsData.totalDistance,
            kilometers: Math.round(distanceKm * 100) / 100
          }
        };
      }

      const cleanedData = removeEmptyValues(processedData);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(cleanedData, null, 2)
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'get steps data', error instanceof Error ? error : 'Unknown error'));
    }
  }

  /**
   * Retrieve detailed heart rate data to monitor cardiovascular health and recovery
   *
   * Provides resting heart rate, daily min/max, and time-series data for tracking
   * cardiovascular fitness and recovery. Resting heart rate is a key indicator of
   * fitness improvements and recovery status. Time-series data enables detailed analysis.
   *
   * Uses 'heartRate' preset for summary mode excluding time-series data.
   *
   * @param params - Heart rate data retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @param params.includeSummaryOnly - Return only summary statistics (resting, max, min)
   * @param params.summary - [DEPRECATED: Use includeSummaryOnly] Legacy summary flag
   * @returns MCP tool result with heart rate data or error message
   * @throws Error if Garmin API is unavailable
   *
   * @example
   * // Get summary heart rate stats
   * const result = await healthTools.getHeartRateData({
   *   includeSummaryOnly: true
   * });
   *
   * @example
   * // Get detailed time-series data
   * const result = await healthTools.getHeartRateData({
   *   date: '2025-10-15'
   * });
   *
   * @see getHealthMetrics for combined health metrics including heart rate
   */
  async getHeartRateData(params: GetHeartRateDataParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();
    // includeSummaryOnly takes precedence over deprecated summary parameter
    const useSummary = params?.includeSummaryOnly ?? params?.summary ?? false;

    try {
      const hrData = await this.garminClient.getHeartRate(date);

      // garmin-connect library getHeartRate() returns Promise<HeartRate>
      if (!hrData || typeof hrData !== 'object') {
        return {
          content: [{
            type: "text" as const,
            text: `No heart rate data available for ${date.toDateString()}`
          }]
        };
      }
      let processedData: Record<string, unknown>;

      if (useSummary) {
        // Summary mode: create a simplified flat structure
        processedData = {
          date: date.toISOString().split('T')[0],
          restingHR: hrData.restingHeartRate,
          maxHR: hrData.maxHeartRate,
          minHR: hrData.minHeartRate,
          lastSevenDaysAvgRestingHR: hrData.lastSevenDaysAvgRestingHeartRate
        };
      } else {
        processedData = {
          date: date.toISOString().split('T')[0],
          summary: {
            restingHR: hrData.restingHeartRate,
            maxHR: hrData.maxHeartRate,
            minHR: hrData.minHeartRate,
            lastSevenDaysAvgRestingHR: hrData.lastSevenDaysAvgRestingHeartRate
          }
        };

        // Add time series data if available and not too large
        if (hrData.heartRateValues && Array.isArray(hrData.heartRateValues) && hrData.heartRateValues.length > 0) {
          if (hrData.heartRateValues.length < 200) {
            processedData.timeSeries = {
              values: hrData.heartRateValues,
              descriptors: hrData.heartRateValueDescriptors,
              sampleCount: hrData.heartRateValues.length
            };
          } else {
            processedData.timeSeries = {
              sampleCount: hrData.heartRateValues.length,
              note: "Time series data too large - use summary=true or request smaller date range"
            };
          }
        }
      }

      const cleanedData = removeEmptyValues(processedData);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(cleanedData, null, 2)
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'get heart rate data', error instanceof Error ? error : 'Unknown error'));
    }
  }

  /**
   * Retrieve comprehensive body composition data to track physical changes
   *
   * Provides weight and detailed body composition metrics including BMI, body fat,
   * muscle mass, and other wellness indicators. Essential for tracking long-term
   * physical changes, monitoring nutrition impacts, and assessing training effects
   * on body composition.
   *
   * @param params - Weight data retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @returns MCP tool result with body composition data or error message
   * @throws Error if Garmin API is unavailable or no weight data exists
   *
   * @example
   * // Get today's weight and body composition
   * const result = await healthTools.getWeightData({});
   *
   * @see getHealthMetrics for combined health metrics including weight
   */
  async getWeightData(params: GetWeightDataParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();

    try {
      const weightData = await this.garminClient.getDailyWeightData(date);

      if (!weightData?.totalAverage?.weight) {
        return {
          content: [{
            type: "text" as const,
            text: `No weight data available for ${date.toDateString()}`
          }]
        };
      }

      const avg = weightData.totalAverage;
      const processedData = {
        date: date.toISOString().split('T')[0],
        weight: {
          weightKg: gramsToKg(avg.weight),
          bmi: avg.bmi,
          bodyFat: avg.bodyFat,
          bodyWater: avg.bodyWater,
          boneMass: avg.boneMass,
          muscleMass: avg.muscleMass,
          physiqueRating: avg.physiqueRating,
          visceralFat: avg.visceralFat,
          metabolicAge: avg.metabolicAge
        }
      };

      const cleanedData = removeEmptyValues(processedData);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(cleanedData, null, 2)
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'get weight data', error instanceof Error ? error : 'Unknown error'));
    }
  }

  /**
   * Retrieve daily hydration data to track water intake
   *
   * Provides water intake volume in both milliliters and ounces for monitoring
   * daily hydration status. Essential for tracking hydration compliance, identifying
   * dehydration patterns, and correlating hydration with performance and recovery.
   *
   * @param params - Hydration data retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @returns MCP tool result with hydration data or error message
   * @throws Error if Garmin API is unavailable or no hydration data exists
   *
   * @example
   * // Get today's hydration
   * const result = await healthTools.getHydrationData({});
   *
   * @example
   * // Get hydration for specific date
   * const result = await healthTools.getHydrationData({
   *   date: '2025-10-15'
   * });
   *
   * @see getHealthMetrics for combined health metrics including hydration
   */
  async getHydrationData(params: GetHydrationDataParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();

    try {
      // garmin-connect library returns hydration in ounces (already converted from ML)
      const hydrationOz = await this.garminClient.getDailyHydration(date);

      if (hydrationOz === null || hydrationOz === undefined || hydrationOz === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `No hydration data available for ${date.toDateString()}`
          }]
        };
      }

      // Convert ounces to milliliters (1 oz = 29.5735 ml)
      const hydrationMl = Math.round(hydrationOz * 29.5735 * 10) / 10;

      const processedData = {
        date: date.toISOString().split('T')[0],
        hydration: {
          valueInMilliliters: hydrationMl,
          valueInOunces: hydrationOz,
          unit: "ml" as const
        }
      };

      const cleanedData = removeEmptyValues(processedData);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(cleanedData, null, 2)
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'get hydration data', error instanceof Error ? error : 'Unknown error'));
    }
  }
}
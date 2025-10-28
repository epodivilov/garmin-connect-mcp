/**
 * @fileoverview Sport-specific performance progression analysis tools
 *
 * Provides comprehensive sport-specific progress analysis including pace/power trends,
 * efficiency metrics by HR zone, and statistical trend analysis. Automatically detects
 * available metrics (pace for running/swimming, power for cycling) and provides regression
 * analysis, moving averages, and efficiency recommendations. Essential for tracking
 * performance improvements, identifying training effectiveness, and making data-driven
 * training decisions.
 *
 * NOTE: No summary mode implemented - analysis results are already optimized.
 * Use includeEfficiency parameter to control detail level.
 *
 * Tools provided:
 * - getSportProgress: Comprehensive analysis combining pace/power trends and efficiency metrics
 * - getPaceTrends: Analyze pace progression with moving averages and regression for running/swimming
 * - getPowerTrends: Analyze power progression including normalized power and power-to-weight for cycling
 * - getEfficiencyMetrics: Analyze training efficiency by HR zone showing pace/power relative to heart rate
 *
 * @category Analytics
 * @see ../../services/pace-analyzer for pace trend calculations
 * @see ../../services/power-analyzer for power trend calculations
 * @see ../../services/efficiency-analyzer for efficiency-by-zone analysis
 * @see ../analytics/hr-zone-tools for HR zone distribution analysis
 */

import { GarminClient } from '../../client/garmin-client.js';
import { ProgressQuery } from '../../types/progress.js';
import { ToolResult } from '../../types/garmin-types.js';
import { analyzePaceTrend } from '../../services/pace-analyzer.js';
import { analyzePowerTrend } from '../../services/power-analyzer.js';
import { calculateEfficiencyByZone } from '../../services/efficiency-analyzer.js';
import { fetchActivityMetrics, calculateAggregateStats } from '../../services/data-aggregator.js';
import { removeEmptyValues } from '../../utils/data-transforms.js';
import { logger } from '../../utils/logger.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import {
  GetSportProgressParams,
  GetPaceTrendsParams,
  GetPowerTrendsParams,
  GetEfficiencyMetricsParams
} from '../../types/tool-params.js';

export class SportProgressTools extends BaseAdvancedTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Get comprehensive sport-specific progress analysis including pace/power trends and efficiency metrics.
   * @param params - Typed parameters for sport progress analysis
   */
  async getSportProgress(params: GetSportProgressParams): Promise<ToolResult> {
    try {
      const dateRange = params?.dateRange;
      const sport = params?.sport;
      const minDuration = params?.minDuration;
      const maxActivities = params?.maxActivities || 1000;
      const includeEfficiency = params?.includeEfficiency !== false;

      if (!dateRange) {
        return this.createErrorResponse("Error: dateRange is required (format: YYYY-MM-DD/YYYY-MM-DD)");
      }

      // Validate date range format
      if (!/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
        return this.createErrorResponse("Error: Invalid date range format. Expected: YYYY-MM-DD/YYYY-MM-DD");
      }

      const query: ProgressQuery = {
        dateRange,
        sport,
        minDuration,
        maxActivities,
        includeEfficiency
      };

      // Fetch activity metrics
      const dataPoints = await fetchActivityMetrics(this.garminClient, query);

      if (dataPoints.length === 0) {
        return this.createSuccessResponse({
          message: "No activities found matching the specified criteria",
          dateRange,
          sport: sport || 'all'
        });
      }

      // Calculate aggregate statistics
      const stats = calculateAggregateStats(dataPoints);

      // Determine analysis type based on available data
      let paceAnalysis;
      let powerAnalysis;
      let efficiencyAnalysis;

      // Check for pace data (running/swimming)
      const hasPaceData = dataPoints.some(p => p.pace !== undefined);
      if (hasPaceData) {
        try {
          paceAnalysis = await analyzePaceTrend(this.garminClient, query);
        } catch (error) {
          logger.error('Pace analysis failed:', error);
        }
      }

      // Check for power data (cycling)
      const hasPowerData = dataPoints.some(p => p.averagePower !== undefined);
      if (hasPowerData) {
        try {
          powerAnalysis = await analyzePowerTrend(this.garminClient, query);
        } catch (error) {
          logger.error('Power analysis failed:', error);
        }
      }

      // Efficiency analysis if requested and HR data available
      const hasHRData = dataPoints.some(p => p.averageHR !== undefined);
      if (includeEfficiency && hasHRData) {
        try {
          efficiencyAnalysis = await calculateEfficiencyByZone(this.garminClient, query);
        } catch (error) {
          logger.error('Efficiency analysis failed:', error);
        }
      }

      // Build result
      const result = {
        dateRange,
        sport: sport || 'all',
        activityCount: dataPoints.length,
        summary: stats,
        paceAnalysis,
        powerAnalysis,
        efficiencyAnalysis
      };

      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Progress analysis data too large', {
          dateRange,
          activityCount: dataPoints.length,
          hasPaceAnalysis: !!paceAnalysis,
          hasPowerAnalysis: !!powerAnalysis,
          hasEfficiencyAnalysis: !!efficiencyAnalysis
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get sport progress: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Analyze pace trends for running or swimming activities with moving averages and regression analysis.
   * @param params - Typed parameters for pace trends analysis
   */
  async getPaceTrends(params: GetPaceTrendsParams): Promise<ToolResult> {
    try {
      const dateRange = params?.dateRange;
      const sport = params?.sport || 'running';
      const minDuration = params?.minDuration;
      const maxActivities = params?.maxActivities || 1000;

      if (!dateRange) {
        return this.createErrorResponse("Error: dateRange is required (format: YYYY-MM-DD/YYYY-MM-DD)");
      }

      const query: ProgressQuery = {
        dateRange,
        sport,
        minDuration,
        maxActivities
      };

      const result = await analyzePaceTrend(this.garminClient, query);
      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Pace trend data too large', {
          period: result.period,
          activityCount: result.activityCount,
          sport: result.sport
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get pace trends: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Analyze power trends for cycling activities including normalized power and power-to-weight ratio.
   * @param params - Typed parameters for power trends analysis
   */
  async getPowerTrends(params: GetPowerTrendsParams): Promise<ToolResult> {
    try {
      const dateRange = params?.dateRange;
      const sport = params?.sport || 'cycling';
      const minDuration = params?.minDuration;
      const maxActivities = params?.maxActivities || 1000;
      const weight = params?.weight; // kg

      if (!dateRange) {
        return this.createErrorResponse("Error: dateRange is required (format: YYYY-MM-DD/YYYY-MM-DD)");
      }

      const query: ProgressQuery = {
        dateRange,
        sport,
        minDuration,
        maxActivities,
        weight
      };

      const result = await analyzePowerTrend(this.garminClient, query);
      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Power trend data too large', {
          period: result.period,
          activityCount: result.activityCount,
          sport: result.sport
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get power trends: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Analyze training efficiency by HR zone, showing pace or power relative to heart rate.
   * @param params - Typed parameters for efficiency metrics analysis
   */
  async getEfficiencyMetrics(params: GetEfficiencyMetricsParams): Promise<ToolResult> {
    try {
      const dateRange = params?.dateRange;
      const sport = params?.sport;
      const minDuration = params?.minDuration;
      const maxActivities = params?.maxActivities || 1000;
      const customMaxHR = params?.maxHR;

      if (!dateRange) {
        return this.createErrorResponse("Error: dateRange is required (format: YYYY-MM-DD/YYYY-MM-DD)");
      }

      const query: ProgressQuery = {
        dateRange,
        sport,
        minDuration,
        maxActivities,
        customMaxHR
      };

      const result = await calculateEfficiencyByZone(this.garminClient, query);
      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Efficiency metrics data too large', {
          period: result.period,
          activityCount: result.activityCount,
          sport: result.sport
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get efficiency metrics: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

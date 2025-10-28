/**
 * @fileoverview Training volume aggregation tools for workload monitoring and periodization planning
 *
 * Provides comprehensive training volume analysis across flexible time periods including weekly,
 * monthly, and custom date ranges. Aggregates duration, distance, elevation, and calories with
 * optional activity-type breakdown. Essential for monitoring training load, tracking volume trends,
 * planning progressive overload, and implementing periodization strategies. Supports trend comparison
 * with previous periods and daily breakdowns for detailed progression analysis.
 *
 * NOTE: No summary mode implemented - data is already aggregated.
 * Use includeActivityBreakdown and includeTrends parameters to control detail level.
 *
 * Tools provided:
 * - getWeeklyVolume: Aggregate training volume for a specific ISO week with optional trends
 * - getMonthlyVolume: Aggregate training volume for a calendar month with optional trends
 * - getCustomRangeVolume: Aggregate training volume over any date range with optional daily breakdown
 *
 * @category Aggregation
 * @see ../../utils/activity-fetcher for efficient batch activity retrieval
 * @see ../analytics/periodization-tools for training phase detection
 * @see ../tracking/training-stress-tools for TSS-based load analysis
 */

import { GarminClient } from '../../client/garmin-client.js';
import {
  WeeklyVolumeResult,
  MonthlyVolumeResult,
  CustomRangeVolumeResult,
  VolumeMetrics,
  ActivityTypeBreakdown,
  VolumeAggregationOptions,
  ProcessedActivity,
  ToolResult
} from '../../types/garmin-types.js';
import {
  secondsToMinutes,
  metersToKm,
  removeEmptyValues,
  getISOWeek,
  getISOWeekRange,
  getMonthRange,
  parseDateRange,
  formatActivityType
} from '../../utils/data-transforms.js';
import { logger } from '../../utils/logger.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import {
  GetWeeklyVolumeParams,
  GetMonthlyVolumeParams,
  GetCustomRangeVolumeParams
} from '../../types/tool-params.js';

export class ActivityVolumeTools extends BaseAdvancedTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Aggregate weekly training volume to track training load patterns
   *
   * Calculates total training volume for a specific week including duration, distance,
   * elevation, and calories. Essential for monitoring training consistency, identifying
   * volume trends, and planning progressive overload. Supports activity-type breakdown
   * for multi-sport athletes.
   *
   * @param params - Weekly volume retrieval parameters
   * @param params.year - Target year (defaults to current year)
   * @param params.week - ISO week number 1-53 (defaults to current week)
   * @param params.includeActivityBreakdown - Include per-activity-type breakdown (default: true)
   * @param params.includeTrends - Include comparison with previous week (default: false)
   * @param params.maxActivities - Maximum activities to process (default: 1000)
   * @param params.activityTypes - Filter by specific activity types (e.g., ['running', 'cycling'])
   * @returns MCP tool result with weekly volume metrics or error message
   * @throws Error if date range is invalid or Garmin API is unavailable
   *
   * @example
   * // Get current week's volume with trends
   * const result = await volumeTools.getWeeklyVolume({
   *   includeTrends: true
   * });
   *
   * @example
   * // Get specific week for single sport
   * const result = await volumeTools.getWeeklyVolume({
   *   year: 2025,
   *   week: 42,
   *   activityTypes: ['running']
   * });
   *
   * @see getMonthlyVolume for monthly aggregation
   * @see getCustomRangeVolume for custom date ranges
   */
  async getWeeklyVolume(params: GetWeeklyVolumeParams): Promise<ToolResult> {
    const year = params?.year || new Date().getFullYear();
    const week = params?.week || getISOWeek(new Date()).week;
    const options: VolumeAggregationOptions = {
      includeActivityBreakdown: params?.includeActivityBreakdown !== false,
      includeTrends: params?.includeTrends === true,
      maxActivities: params?.maxActivities || 1000,
      activityTypes: params?.activityTypes
    };

    try {
      // Get week date range
      const { start, end } = getISOWeekRange(year, week);

      // Get activities for the week
      const activities = await this.activityFetcher.getActivitiesInRange(start, end, options);

      // Calculate metrics
      const metrics = this.calculateVolumeMetrics(activities);
      const byActivityType = this.calculateActivityTypeBreakdown(activities);

      // Prepare result
      const result: WeeklyVolumeResult = {
        year,
        week,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        metrics,
        byActivityType: options.includeActivityBreakdown ? byActivityType : {}
      };

      // Add trends if requested
      if (options.includeTrends) {
        const previousWeek = week === 1 ? 52 : week - 1;
        const previousYear = week === 1 ? year - 1 : year;
        result.trends = await this.calculateWeeklyTrends(year, week, previousYear, previousWeek, options);
      }

      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Weekly volume data too large', {
          year,
          week,
          totalActivities: activities.length,
          totalDuration: secondsToMinutes(metrics.duration),
          totalDistance: metersToKm(metrics.distance)
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get weekly volume: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Aggregate monthly training volume to analyze longer-term training trends
   *
   * Calculates total training volume for a specific month including duration, distance,
   * elevation, and calories. Essential for tracking monthly training patterns, identifying
   * periodization cycles, and planning training blocks. Supports activity-type breakdown
   * and trend comparison with previous month.
   *
   * @param params - Monthly volume retrieval parameters
   * @param params.year - Target year (defaults to current year)
   * @param params.month - Month number 1-12 (defaults to current month)
   * @param params.includeActivityBreakdown - Include per-activity-type breakdown (default: true)
   * @param params.includeTrends - Include comparison with previous month (default: false)
   * @param params.maxActivities - Maximum activities to process (default: 1000)
   * @param params.activityTypes - Filter by specific activity types (e.g., ['running', 'cycling'])
   * @returns MCP tool result with monthly volume metrics or error message
   * @throws Error if month is invalid or Garmin API is unavailable
   *
   * @example
   * // Get current month's volume with trends
   * const result = await volumeTools.getMonthlyVolume({
   *   includeTrends: true
   * });
   *
   * @see getWeeklyVolume for weekly aggregation
   * @see getCustomRangeVolume for custom date ranges
   */
  async getMonthlyVolume(params: GetMonthlyVolumeParams): Promise<ToolResult> {
    const year = params?.year || new Date().getFullYear();
    const month = params?.month || new Date().getMonth() + 1;
    const options: VolumeAggregationOptions = {
      includeActivityBreakdown: params?.includeActivityBreakdown !== false,
      includeTrends: params?.includeTrends === true,
      maxActivities: params?.maxActivities || 1000,
      activityTypes: params?.activityTypes
    };

    try {
      // Validate month
      if (month < 1 || month > 12) {
        throw new Error('Month must be between 1 and 12');
      }

      // Get month date range
      const { start, end } = getMonthRange(year, month);

      // Get activities for the month
      const activities = await this.activityFetcher.getActivitiesInRange(start, end, options);

      // Calculate metrics
      const metrics = this.calculateVolumeMetrics(activities);
      const byActivityType = this.calculateActivityTypeBreakdown(activities);

      // Prepare result
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const result: MonthlyVolumeResult = {
        year,
        month,
        monthName: monthNames[month - 1],
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        metrics,
        byActivityType: options.includeActivityBreakdown ? byActivityType : {}
      };

      // Add trends if requested
      if (options.includeTrends) {
        const previousMonth = month === 1 ? 12 : month - 1;
        const previousYear = month === 1 ? year - 1 : year;
        result.trends = await this.calculateMonthlyTrends(year, month, previousYear, previousMonth, options);
      }

      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Monthly volume data too large', {
          year,
          month: monthNames[month - 1],
          totalActivities: activities.length,
          totalDuration: secondsToMinutes(metrics.duration),
          totalDistance: metersToKm(metrics.distance)
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get monthly volume: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Aggregate training volume over a custom date range for flexible analysis periods
   *
   * Calculates total training volume for any date range up to 365 days. Essential for
   * analyzing training camps, race preparation periods, or arbitrary time frames.
   * Supports daily breakdown for detailed progression analysis within the range.
   *
   * @param params - Custom range volume retrieval parameters
   * @param params.dateRange - Date range in YYYY-MM-DD/YYYY-MM-DD format (max 365 days)
   * @param params.includeActivityBreakdown - Include per-activity-type breakdown (default: true)
   * @param params.includeDailyBreakdown - Include day-by-day breakdown (default: false)
   * @param params.maxActivities - Maximum activities to process (default: 1000)
   * @param params.activityTypes - Filter by specific activity types (e.g., ['running', 'cycling'])
   * @returns MCP tool result with custom range volume metrics or error message
   * @throws Error if date range format is invalid, exceeds 365 days, or Garmin API is unavailable
   *
   * @example
   * // Get volume for training camp
   * const result = await volumeTools.getCustomRangeVolume({
   *   dateRange: '2025-09-01/2025-09-14',
   *   includeDailyBreakdown: true
   * });
   *
   * @see getWeeklyVolume for weekly aggregation
   * @see getMonthlyVolume for monthly aggregation
   */
  async getCustomRangeVolume(params: GetCustomRangeVolumeParams): Promise<ToolResult> {
    const dateRange = params?.dateRange;
    const options: VolumeAggregationOptions = {
      includeActivityBreakdown: params?.includeActivityBreakdown !== false,
      includeDailyBreakdown: params?.includeDailyBreakdown === true,
      maxActivities: params?.maxActivities || 1000,
      activityTypes: params?.activityTypes
    };

    if (!dateRange) {
      return this.createErrorResponse("Error: dateRange is required (format: YYYY-MM-DD/YYYY-MM-DD)");
    }

    try {
      // Parse date range
      const { start, end } = parseDateRange(dateRange);

      // Check maximum range (1 year)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        throw new Error('Date range cannot exceed 365 days');
      }

      // Get activities for the range
      const activities = await this.activityFetcher.getActivitiesInRange(start, end, options);

      // Calculate metrics
      const metrics = this.calculateVolumeMetrics(activities);
      const byActivityType = this.calculateActivityTypeBreakdown(activities);

      // Prepare result
      const result: CustomRangeVolumeResult = {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        periodDays: daysDiff + 1,
        metrics,
        byActivityType: options.includeActivityBreakdown ? byActivityType : {}
      };

      // Add daily breakdown if requested
      if (options.includeDailyBreakdown) {
        result.dailyBreakdown = this.calculateDailyBreakdown(activities, start, end);
      }

      const cleanedData = removeEmptyValues(result);

      // Validate response size
      if (!this.validateResponseSize(cleanedData)) {
        return this.createSizeErrorResponse('Custom range volume data too large', {
          startDate: result.startDate,
          endDate: result.endDate,
          periodDays: result.periodDays,
          totalActivities: activities.length,
          totalDuration: secondsToMinutes(metrics.duration),
          totalDistance: metersToKm(metrics.distance)
        });
      }

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(`Failed to get custom range volume: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Calculate breakdown by activity type
   */
  private calculateActivityTypeBreakdown(activities: ProcessedActivity[]): ActivityTypeBreakdown {
    const breakdown: ActivityTypeBreakdown = {};

    for (const activity of activities) {
      const type = formatActivityType(activity.activityType);

      if (!breakdown[type]) {
        breakdown[type] = {
          duration: 0,
          distance: 0,
          activityCount: 0,
          calories: 0,
          elevationGain: 0
        };
      }

      breakdown[type].duration += activity.duration || 0;
      breakdown[type].distance += activity.distance || 0;
      breakdown[type].activityCount += 1;
      breakdown[type].calories += activity.calories || 0;
      breakdown[type].elevationGain += activity.elevationGain || 0;
    }

    return breakdown;
  }

  /**
   * Calculate daily breakdown for custom ranges
   */
  private calculateDailyBreakdown(
    activities: ProcessedActivity[],
    start: Date,
    end: Date
  ): Array<{ date: string; metrics: VolumeMetrics }> {
    const dailyBreakdown: Array<{ date: string; metrics: VolumeMetrics }> = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayActivities = activities.filter(activity =>
        activity.startTimeLocal.startsWith(dateStr)
      );

      const metrics = this.calculateVolumeMetrics(dayActivities);
      dailyBreakdown.push({ date: dateStr, metrics });

      current.setDate(current.getDate() + 1);
    }

    return dailyBreakdown;
  }

  /**
   * Calculate monthly trends
   */
  private async calculateMonthlyTrends(
    currentYear: number,
    currentMonth: number,
    previousYear: number,
    previousMonth: number,
    options: VolumeAggregationOptions
  ) {
    try {
      const { start: prevStart, end: prevEnd } = getMonthRange(previousYear, previousMonth);
      const prevActivities = await this.activityFetcher.getActivitiesInRange(prevStart, prevEnd, options);
      const prevMetrics = this.calculateVolumeMetrics(prevActivities);

      const { start: currStart, end: currEnd } = getMonthRange(currentYear, currentMonth);
      const currActivities = await this.activityFetcher.getActivitiesInRange(currStart, currEnd, options);
      const currMetrics = this.calculateVolumeMetrics(currActivities);

      return {
        durationChangePercent: this.calculatePercentChange(prevMetrics.duration, currMetrics.duration),
        distanceChangePercent: this.calculatePercentChange(prevMetrics.distance, currMetrics.distance),
        activityCountChange: currMetrics.activityCount - prevMetrics.activityCount
      };
    } catch (error) {
      logger.error('Error calculating monthly trends:', error);
      return undefined;
    }
  }

  /**
   * Calculate percentage change between two values
   */
  private calculatePercentChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100 * 100) / 100;
  }

  /**
   * Calculate volume metrics from activities
   */
  private calculateVolumeMetrics(activities: ProcessedActivity[]): VolumeMetrics {
    return activities.reduce((metrics, activity) => ({
      duration: metrics.duration + (activity.duration || 0),
      distance: metrics.distance + (activity.distance || 0),
      activityCount: metrics.activityCount + 1,
      calories: metrics.calories + (activity.calories || 0),
      elevationGain: metrics.elevationGain + (activity.elevationGain || 0)
    }), {
      duration: 0,
      distance: 0,
      activityCount: 0,
      calories: 0,
      elevationGain: 0
    });
  }

  /**
   * Calculate weekly trends
   */
  private async calculateWeeklyTrends(
    currentYear: number,
    currentWeek: number,
    previousYear: number,
    previousWeek: number,
    options: VolumeAggregationOptions
  ) {
    try {
      const { start: prevStart, end: prevEnd } = getISOWeekRange(previousYear, previousWeek);
      const prevActivities = await this.activityFetcher.getActivitiesInRange(prevStart, prevEnd, options);
      const prevMetrics = this.calculateVolumeMetrics(prevActivities);

      const { start: currStart, end: currEnd } = getISOWeekRange(currentYear, currentWeek);
      const currActivities = await this.activityFetcher.getActivitiesInRange(currStart, currEnd, options);
      const currMetrics = this.calculateVolumeMetrics(currActivities);

      return {
        durationChangePercent: this.calculatePercentChange(prevMetrics.duration, currMetrics.duration),
        distanceChangePercent: this.calculatePercentChange(prevMetrics.distance, currMetrics.distance),
        activityCountChange: currMetrics.activityCount - prevMetrics.activityCount
      };
    } catch (error) {
      logger.error('Error calculating weekly trends:', error);
      return undefined;
    }
  }
}
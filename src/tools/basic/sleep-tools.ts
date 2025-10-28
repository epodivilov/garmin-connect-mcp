/**
 * @fileoverview Sleep data retrieval and analysis tools for Garmin Connect
 *
 * Provides access to comprehensive sleep metrics including sleep stages (deep, light, REM),
 * quality scores, physiological measurements (HRV, resting HR), and sleep timing. Essential
 * for understanding recovery, identifying sleep issues, and correlating sleep with training
 * performance. Supports flexible data retrieval with summary mode and field filtering to
 * optimize response sizes.
 *
 * Tools provided:
 * - getSleepData: Retrieve detailed sleep metrics with optional summary or field filtering
 * - getSleepDuration: Get total sleep duration for quick tracking
 *
 * @category Basic
 * @see ../../client/garmin-client for Garmin Connect API integration
 * @see ../correlation/sleep-correlation-tools for sleep-performance correlation analysis
 * @see ../basic/health-tools for related health metrics (heart rate, steps)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { GarminClient } from '../../client/garmin-client.js';
import { formatError } from '../../utils/response-helpers.js';
import { BaseDirectTool } from '../base/BaseDirectTool.js';
import { GetSleepDataParams, GetSleepDurationParams } from '../../types/tool-params.js';
import { ToolResult } from '../../types/garmin-types.js';
import { SleepData } from 'garmin-connect/dist/garmin/types/sleep.js';
import { createSummary } from '../../utils/summary-helpers.js';

export class SleepTools extends BaseDirectTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Retrieve comprehensive sleep data to analyze sleep quality and recovery
   *
   * Enables analysis of sleep patterns, sleep stages (deep/light/REM), and recovery metrics.
   * Essential for understanding rest quality, identifying sleep issues, and correlating
   * sleep with training performance. Supports filtering to reduce response size.
   *
   * @param params - Sleep data retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @param params.includeSummaryOnly - Return only key metrics (duration, stages, quality) for faster analysis
   * @param params.summary - [DEPRECATED: Use includeSummaryOnly] Legacy summary flag
   * @param params.fields - Specific fields to include (e.g., ['dailySleepDTO', 'avgOvernightHrv'])
   * @returns MCP tool result with sleep data or error message
   * @throws Error if date format is invalid or Garmin API is unavailable
   *
   * @example
   * // Get summary sleep data for today
   * const result = await sleepTools.getSleepData({ includeSummaryOnly: true });
   *
   * @example
   * // Get specific fields for analysis
   * const result = await sleepTools.getSleepData({
   *   date: '2025-10-15',
   *   fields: ['dailySleepDTO', 'avgOvernightHrv']
   * });
   *
   * @see getSleepDuration for simple sleep duration retrieval
   */
  async getSleepData(params: GetSleepDataParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();
    // includeSummaryOnly takes precedence over deprecated summary parameter
    const useSummary = params?.includeSummaryOnly ?? params?.summary ?? false;
    const requestedFields = params?.fields;

    try {
      const sleepData = await this.garminClient.getSleepData(date);

      // Filter and process data based on parameters
      let processedData: SleepData | Partial<SleepData> | Record<string, unknown> = sleepData;

      if (useSummary) {
        // Use the standardized summary system with 'sleep' preset
        const summaryResult = createSummary(sleepData, {
          preset: 'sleep',
          includeMetadata: false,
        });
        // Add the date field from parameter (not in API response)
        processedData = {
          date: date.toISOString().split('T')[0],
          ...summaryResult.data,
        };
      } else if (requestedFields && Array.isArray(requestedFields)) {
        // Return only requested fields
        const filtered: Record<string, unknown> = {};
        const dataRecord = sleepData as unknown as Record<string, unknown>;
        for (const field of requestedFields) {
          if (field in sleepData) {
            filtered[field] = dataRecord[field];
          }
        }
        processedData = filtered;
      }

      // Validate response size
      if (!this.validateResponseSize(processedData)) {
        // If still too large, force summary mode
        const dailyDTO = sleepData.dailySleepDTO;
        processedData = {
          date: date.toISOString().split('T')[0],
          sleepTimeSeconds: dailyDTO?.sleepTimeSeconds,
          sleepQuality: dailyDTO?.sleepQualityTypePK,
          warning: "Data too large - showing summary only. Use 'summary: true' or 'fields' parameter to control output size."
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `Sleep data for ${date.toDateString()}:\n\n${JSON.stringify(processedData, null, 2)}`
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'get sleep data', error instanceof Error ? error : 'Unknown error'));
    }
  }

  /**
   * Retrieve total sleep duration for quick sleep tracking
   *
   * Provides a simple sleep duration metric without detailed breakdowns. Useful for
   * quick sleep tracking, trend analysis, and identifying insufficient sleep days.
   * Returns duration in both minutes and hours for convenience.
   *
   * @param params - Sleep duration retrieval parameters
   * @param params.date - Target date in YYYY-MM-DD format (defaults to today)
   * @returns MCP tool result with sleep duration or error message
   * @throws Error if date format is invalid or Garmin API is unavailable
   *
   * @example
   * // Get today's sleep duration
   * const result = await sleepTools.getSleepDuration({});
   *
   * @see getSleepData for detailed sleep metrics including sleep stages
   */
  async getSleepDuration(params: GetSleepDurationParams): Promise<ToolResult> {
    const date = params?.date ? new Date(params.date) : new Date();

    try {
      const duration = await this.garminClient.getSleepDuration(date);

      // Handle different data formats that might be returned
      let durationText: string;
      if (typeof duration === 'number') {
        durationText = `${duration} minutes`;
      } else if (typeof duration === 'object' && duration !== null) {
        // If it's an object, try to extract duration information
        const obj = duration as any;
        if (obj.sleepTimeSeconds) {
          const minutes = Math.round(obj.sleepTimeSeconds / 60);
          durationText = `${minutes} minutes (${Math.round(minutes / 60 * 100) / 100} hours)`;
        } else if (obj.totalSleepTimeSeconds) {
          const minutes = Math.round(obj.totalSleepTimeSeconds / 60);
          durationText = `${minutes} minutes (${Math.round(minutes / 60 * 100) / 100} hours)`;
        } else if (obj.duration) {
          durationText = `${obj.duration} minutes`;
        } else {
          // If we can't parse it, show the full object as JSON
          durationText = `Raw data: ${JSON.stringify(duration, null, 2)}`;
        }
      } else {
        durationText = `${duration}`;
      }

      return {
        content: [{
          type: "text" as const,
          text: `Sleep duration for ${date.toDateString()}: ${durationText}`
        }]
      };

    } catch (error) {
      return this.createErrorResponse(formatError('api', 'get sleep duration', error instanceof Error ? error : 'Unknown error'));
    }
  }
}

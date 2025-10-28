/**
 * @fileoverview Base class for direct Garmin API tools requiring minimal data processing
 *
 * Provides shared functionality for tools that make straightforward Garmin Connect API calls
 * without complex aggregation or activity fetching. Direct tools prioritize simplicity and
 * immediate data retrieval over advanced analytics.
 *
 * Subclasses:
 * - SleepTools: Sleep data and duration retrieval
 * - HealthTools: Steps, heart rate, weight metrics
 * - ActivityTools: Activity lists and detailed activity data
 * - OverviewTools: Daily health and activity summaries
 *
 * @category Base
 * @see BaseAdvancedTool for tools requiring activity aggregation and complex calculations
 * @see ../../utils/response-helpers for shared response formatting utilities
 */

/**
 * Base abstract class for Direct Tools that make straightforward Garmin API calls.
 *
 * Direct Tools include:
 * - SleepTools (sleep data, sleep duration)
 * - HealthTools (steps, heart rate, weight)
 * - ActivityTools (activities list, activity details)
 * - OverviewTools (daily overview aggregation)
 *
 * This base class provides:
 * - Shared GarminClient instance
 * - Common error and success response formatting
 * - Response size validation
 *
 * Unlike BaseAdvancedTool, Direct Tools:
 * - Don't need ActivityFetcher (make direct API calls)
 * - Don't use createSizeErrorResponse (simpler response patterns)
 * - Only need basic response helpers
 */

import type { GarminClient } from '../../client/garmin-client.js';
import type { ToolResult } from '../../types/garmin-types.js';
import {
  createSuccessResponse,
  createErrorResponse,
  validateResponseSize,
} from '../../utils/response-helpers.js';

/**
 * Abstract base class for tools that make direct Garmin API calls.
 *
 * Subclasses should:
 * 1. Call super(garminClient) in constructor
 * 2. Use protected helper methods for response formatting
 * 3. Implement tool-specific logic for API calls
 *
 * @example
 * ```typescript
 * class SleepTools extends BaseDirectTool {
 *   async getSleepData(date: string): Promise<ToolResult> {
 *     try {
 *       const data = await this.garminClient.getSleep(date);
 *       return this.createSuccessResponse(data);
 *     } catch (error) {
 *       return this.createErrorResponse(`Failed to fetch sleep data: ${error}`);
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseDirectTool {
  /**
   * Shared Garmin API client instance.
   * Readonly to prevent accidental modification by subclasses.
   */
  protected readonly garminClient: GarminClient;

  /**
   * Creates a new BaseDirectTool instance.
   *
   * @param garminClient - Authenticated Garmin Connect client
   */
  constructor(garminClient: GarminClient) {
    this.garminClient = garminClient;
  }

  /**
   * Creates a successful tool response with formatted data.
   *
   * Delegates to shared utility for consistent response formatting across all tools.
   *
   * @param data - Response data to return (will be JSON stringified)
   * @param hints - Optional user-friendly hints to include in response
   * @returns Formatted success ToolResult
   *
   * @example
   * ```typescript
   * return this.createSuccessResponse(
   *   { steps: 10000, calories: 2500 },
   *   ['Daily step goal achieved!']
   * );
   * ```
   */
  protected createSuccessResponse(data: unknown, hints?: string[]): ToolResult {
    return createSuccessResponse(data, hints);
  }

  /**
   * Creates an error response with formatted message.
   *
   * Delegates to shared utility for consistent error formatting across all tools.
   *
   * @param message - Error message to return
   * @returns Formatted error ToolResult
   *
   * @example
   * ```typescript
   * return this.createErrorResponse('Failed to fetch data: Network timeout');
   * ```
   */
  protected createErrorResponse(message: string): ToolResult {
    return createErrorResponse(message);
  }

  /**
   * Validates that response data doesn't exceed token limits.
   *
   * Useful for tools that return potentially large datasets and need to check
   * size before formatting response.
   *
   * @param data - Data to validate
   * @param maxTokens - Optional custom token limit (defaults to utility's limit)
   * @returns true if data size is acceptable, false if too large
   *
   * @example
   * ```typescript
   * if (!this.validateResponseSize(activities)) {
   *   return this.createErrorResponse('Too many activities, please narrow date range');
   * }
   * ```
   */
  protected validateResponseSize(data: unknown, maxTokens?: number): boolean {
    return validateResponseSize(data, maxTokens);
  }
}

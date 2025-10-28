/**
 * @fileoverview Base class for advanced analytics tools requiring activity aggregation and complex calculations
 *
 * Provides shared functionality for tools that perform sophisticated data analysis, including
 * batch activity retrieval, multi-metric aggregation, and statistical calculations. Advanced tools
 * prioritize comprehensive analysis over simple data retrieval.
 *
 * Subclasses:
 * - ActivityVolumeTools: Training volume aggregation and trends
 * - HRZoneTools: Heart rate zone distribution analysis
 * - SportProgressTools: Sport-specific performance progression
 * - PeriodizationTools: Training phase detection and effectiveness
 * - PersonalRecordsTools: PR tracking and detection
 * - TrainingStressTools: TSS, CTL, ATL calculations
 * - FatigueFreshnessTools: Form/freshness analysis and predictions
 *
 * @category Base
 * @see BaseDirectTool for simple data retrieval tools
 * @see ../../utils/activity-fetcher for efficient batch activity retrieval
 * @see ../../utils/response-helpers for shared response formatting utilities
 */

/**
 * Base class for advanced MCP tools that perform complex operations
 * requiring activity fetching, aggregation, and calculations.
 *
 * Advanced tools share common patterns:
 * - ActivityFetcher usage for efficient batch retrieval
 * - Response size validation to ensure MCP compatibility
 * - Standardized error/success response creation
 *
 * @abstract
 * @example
 * ```typescript
 * class MyAdvancedTool extends BaseAdvancedTool {
 *   async execute(params: MyParams): Promise<ToolResult> {
 *     try {
 *       const activities = await this.activityFetcher.fetchActivities({
 *         maxActivities: params.limit
 *       });
 *
 *       const result = this.processData(activities);
 *
 *       if (!this.validateResponseSize(result)) {
 *         return this.createSizeErrorResponse('Response too large', { count: result.length });
 *       }
 *
 *       return this.createSuccessResponse(result);
 *     } catch (error) {
 *       return this.createErrorResponse(`Failed: ${error.message}`);
 *     }
 *   }
 * }
 * ```
 */

import type { GarminClient } from '../../client/garmin-client.js';
import { ActivityFetcher } from '../../utils/activity-fetcher.js';
import type { ToolResult } from '../../types/garmin-types.js';
import {
  createSizeErrorResponse as utilCreateSizeErrorResponse,
  validateResponseSize as utilValidateResponseSize,
  createSuccessResponse as utilCreateSuccessResponse,
  createErrorResponse as utilCreateErrorResponse,
} from '../../utils/response-helpers.js';

/**
 * Abstract base class for advanced tools.
 *
 * Provides shared functionality for tools that perform complex operations
 * with activities, health metrics, and training data.
 */
export abstract class BaseAdvancedTool {
  /**
   * Garmin Connect client instance for API operations.
   * @protected
   */
  protected readonly garminClient: GarminClient;

  /**
   * Activity fetcher for efficient batch retrieval of activities.
   * @protected
   */
  protected readonly activityFetcher: ActivityFetcher;

  /**
   * Initializes the base advanced tool with required dependencies.
   *
   * @param garminClient - Authenticated Garmin Connect client instance
   */
  constructor(garminClient: GarminClient) {
    this.garminClient = garminClient;
    this.activityFetcher = new ActivityFetcher(garminClient);
  }

  /**
   * Creates a standardized error response for oversized data.
   *
   * Used when response data exceeds MCP token limits. Returns a summary
   * of the data instead of the full payload.
   *
   * @param message - Error message describing the size issue
   * @param summary - Summary object to return instead of full data
   * @returns ToolResult with isError=true and summary data
   * @protected
   */
  protected createSizeErrorResponse<T extends Record<string, unknown>>(message: string, summary: T): ToolResult {
    return utilCreateSizeErrorResponse(message, summary);
  }

  /**
   * Validates that response data size is within MCP token limits.
   *
   * Checks the serialized JSON size against a maximum token threshold
   * to prevent MCP protocol errors.
   *
   * @param data - Data object to validate
   * @param maxTokens - Optional custom token limit (default: 180000)
   * @returns true if data size is acceptable, false if too large
   * @protected
   */
  protected validateResponseSize(data: unknown, maxTokens?: number): boolean {
    return utilValidateResponseSize(data, maxTokens);
  }

  /**
   * Creates a standardized success response.
   *
   * @param data - Response data to return
   * @param hints - Optional usage hints for the client
   * @returns ToolResult with isError=false and formatted content
   * @protected
   */
  protected createSuccessResponse(data: unknown, hints?: string[]): ToolResult {
    return utilCreateSuccessResponse(data, hints);
  }

  /**
   * Creates a standardized error response.
   *
   * @param message - Error message to return
   * @returns ToolResult with isError=true and error message
   * @protected
   */
  protected createErrorResponse(message: string): ToolResult {
    return utilCreateErrorResponse(message);
  }
}

import { ToolResult } from '../types/garmin-types.js';

/**
 * Create a success response with optional hints
 * @template T - The type of the response data
 * @param data - The response data to be returned
 * @param hints - Optional array of hint strings to include in the response
 * @returns ToolResult containing the formatted response
 */
export const createSuccessResponse = <T>(data: T, hints?: string[]): ToolResult => {
  const response: T & { hints?: string[] } = data as T & { hints?: string[] };
  if (hints && hints.length > 0) {
    response.hints = hints;
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify(response, null, 2)
    }]
  };
};

export const createErrorResponse = (message: string): ToolResult => {
  return {
    content: [{
      type: "text",
      text: `Error: ${message}`
    }],
    isError: true
  };
};

/**
 * Format error messages using standard patterns for consistent user experience
 *
 * @param type - Error category: 'api', 'validation', 'notFound'
 * @param context - Specific operation or parameter involved
 * @param details - Error instance, validation reason, or resource identifier
 * @returns Formatted error message string
 */
export function formatError(
  type: 'api' | 'validation' | 'notFound',
  context: string,
  details: Error | string | number
): string {
  switch (type) {
    case 'api': {
      const errorMessage = details instanceof Error ? details.message : String(details);
      return `Failed to ${context}: ${errorMessage}`;
    }
    case 'validation': {
      const reason = details instanceof Error ? details.message : String(details);
      return `Invalid ${context}: ${reason}`;
    }
    case 'notFound': {
      const identifier = details instanceof Error ? details.message : String(details);
      const resource = context.charAt(0).toUpperCase() + context.slice(1);
      return `${resource} not found: ${identifier}`;
    }
  }
}

/**
 * Validate response size against token limit
 * @template T - The type of the data to validate
 * @param data - The data to check the size of
 * @param maxTokens - Maximum allowed tokens (default: 20000)
 * @returns True if the response size is within the limit
 */
export const validateResponseSize = <T>(data: T, maxTokens: number = 20000): boolean => {
  const jsonString = JSON.stringify(data, null, 2);
  const estimatedTokens = Math.ceil(jsonString.length / 4);
  return estimatedTokens <= maxTokens;
};

export const createResourceLink = (
  uri: string,
  name: string,
  description: string
): ToolResult['content'][0] => ({
  type: "resource_link",
  uri,
  name,
  description
});

/**
 * Create a standardized error response for oversized data
 *
 * Used when aggregated data exceeds MCP response size limits.
 * Returns a summary with the error message and actionable suggestions.
 *
 * @template T - The type of the summary object, must be a record with string keys
 * @param message - Error message describing the size issue
 * @param summary - Summary object containing key metrics (e.g., date range, activity count)
 * @returns ToolResult with isError: true
 *
 * @example
 * ```typescript
 * return createSizeErrorResponse('Weekly volume data too large', {
 *   summary: {
 *     year: 2025,
 *     week: 10,
 *     totalActivities: 150,
 *     totalDuration: 2400,
 *     totalDistance: 500
 *   }
 * });
 * ```
 */
export const createSizeErrorResponse = <T extends Record<string, unknown>>(message: string, summary: T): ToolResult => {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        error: message,
        summary,
        suggestion: "Try reducing the date range, using activity type filters, or disabling detailed breakdowns"
      }, null, 2)
    }],
    isError: true
  };
};
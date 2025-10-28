/**
 * Summary System Type Definitions
 *
 * This module provides a unified type system for creating summarized versions
 * of data across the Garmin Connect MCP server. It supports multiple strategies
 * for controlling which fields are included/excluded and how arrays are handled.
 */

/**
 * Strategy for determining which fields to include in the summary.
 *
 * - `preset`: Use a predefined preset configuration (e.g., 'sleep', 'activity')
 * - `include`: Explicitly specify which fields to include
 * - `exclude`: Explicitly specify which fields to exclude
 */
export type SummaryStrategy = 'preset' | 'include' | 'exclude';

/**
 * Configuration options for creating a summary.
 *
 * @example
 * ```typescript
 * // Using a preset
 * const options: SummaryOptions = {
 *   preset: 'sleep',
 *   includeMetadata: true
 * };
 *
 * // Using include strategy
 * const options: SummaryOptions = {
 *   includeFields: ['activityId', 'activityName', 'duration'],
 *   preserveNesting: false
 * };
 *
 * // Using exclude strategy with array limits
 * const options: SummaryOptions = {
 *   excludeFields: ['detailedStats', 'rawData'],
 *   arrayLimits: {
 *     'activities': 10,
 *     'hrSamples': 5
 *   }
 * };
 * ```
 */
export interface SummaryOptions {
  /**
   * Name of the preset to use (strategy: 'preset')
   */
  preset?: string;

  /**
   * List of field paths to include (strategy: 'include')
   * Use dot notation for nested fields: 'user.profile.name'
   */
  includeFields?: string[];

  /**
   * List of field paths to exclude (strategy: 'exclude')
   * Use dot notation for nested fields: 'stats.detailed'
   */
  excludeFields?: string[];

  /**
   * Whether to preserve original nesting structure
   * - true: Keep nested objects intact
   * - false: Flatten to top-level object
   * @default true
   */
  preserveNesting?: boolean;

  /**
   * Limits for array fields
   * Map of field path to maximum array length
   * Arrays exceeding the limit will be truncated
   *
   * @example
   * ```typescript
   * arrayLimits: {
   *   'activities': 10,        // Limit activities array to 10 items
   *   'sleep.hrSamples': 5    // Limit hrSamples to 5 items
   * }
   * ```
   */
  arrayLimits?: Record<string, number>;

  /**
   * Whether to include metadata about the summary
   * Metadata includes: strategy used, fields included/excluded, original size
   * @default false
   */
  includeMetadata?: boolean;
}

/**
 * Metadata about how a summary was created.
 * Useful for debugging and understanding what was filtered out.
 */
export interface SummaryMetadata {
  /**
   * The strategy used to create the summary
   */
  strategy: SummaryStrategy;

  /**
   * Name of the preset (if strategy is 'preset')
   */
  preset?: string;

  /**
   * List of fields that were included
   */
  includedFields?: string[];

  /**
   * List of fields that were excluded
   */
  excludedFields?: string[];

  /**
   * Whether nesting was preserved
   */
  preserveNesting: boolean;

  /**
   * Array limits that were applied
   */
  arrayLimits?: Record<string, number>;

  /**
   * Approximate size of original data in bytes
   */
  originalSize?: number;

  /**
   * Approximate size of summary data in bytes
   */
  summarySize?: number;

  /**
   * Reduction percentage (0-100)
   */
  reduction?: number;
}

/**
 * Predefined preset configuration for common summary types.
 *
 * Presets provide a convenient way to apply consistent summarization
 * across different tools and use cases.
 *
 * @example
 * ```typescript
 * const sleepPreset: SummaryPreset = {
 *   name: 'sleep',
 *   description: 'Summary format for sleep data',
 *   includeFields: [
 *     'dailySleepDTO.sleepTimeSeconds',
 *     'dailySleepDTO.deepSleepSeconds',
 *     'dailySleepDTO.remSleepSeconds'
 *   ],
 *   preserveNesting: true,
 *   arrayLimits: {
 *     'sleepLevels': 0  // Exclude sleep level arrays
 *   }
 * };
 * ```
 */
export interface SummaryPreset {
  /**
   * Unique name for the preset
   */
  name: string;

  /**
   * Human-readable description of what this preset does
   */
  description: string;

  /**
   * Fields to include (can be empty if using excludeFields)
   */
  includeFields?: string[];

  /**
   * Fields to exclude (can be empty if using includeFields)
   */
  excludeFields?: string[];

  /**
   * Whether to preserve nesting
   */
  preserveNesting: boolean;

  /**
   * Array limits for this preset
   */
  arrayLimits?: Record<string, number>;
}

/**
 * Result of creating a summary, including the summarized data
 * and optional metadata about the summarization process.
 *
 * @template T - Type of the summarized data
 *
 * @example
 * ```typescript
 * const result: SummaryResult<SleepData> = createSummary(sleepData, {
 *   preset: 'sleep',
 *   includeMetadata: true
 * });
 *
 * console.log(result.data);      // Summarized sleep data
 * console.log(result.metadata);  // How the summary was created
 * ```
 */
export interface SummaryResult<T> {
  /**
   * The summarized data
   */
  data: T;

  /**
   * Metadata about the summary (if includeMetadata was true)
   */
  metadata?: SummaryMetadata;
}

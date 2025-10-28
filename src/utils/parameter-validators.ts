/**
 * Parameter validation utilities for MCP tools
 *
 * Provides consistent validation and error handling for common parameter types
 * used across Garmin Connect MCP tools. All validators include detailed error
 * messages with parameter names, received values, and expected formats.
 *
 * @module parameter-validators
 */

import { parseDateRange } from './data-transforms.js';

/**
 * Custom error class for parameter validation failures
 *
 * Provides structured error information including the parameter name,
 * received value, and expected format to help users correct their inputs.
 *
 * @example
 * ```typescript
 * throw new ValidationError(
 *   'date',
 *   'invalid-date',
 *   'YYYY-MM-DD format',
 *   'Date must be in YYYY-MM-DD format, e.g., "2025-10-13"'
 * );
 * ```
 */
export class ValidationError extends Error {
  public readonly parameterName: string;
  public readonly receivedValue: unknown;
  public readonly expectedFormat: string;

  constructor(
    parameterName: string,
    receivedValue: unknown,
    expectedFormat: string,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';
    this.parameterName = parameterName;
    this.receivedValue = receivedValue;
    this.expectedFormat = expectedFormat;
  }
}

/**
 * Validates and parses a date string in YYYY-MM-DD format
 *
 * @param date - Date string to validate (optional, defaults to today)
 * @returns Parsed Date object
 * @throws {ValidationError} If date format is invalid or date is not a valid calendar date
 *
 * @example
 * ```typescript
 * // Valid usage
 * const today = validateDate(); // Returns today's date
 * const specific = validateDate('2025-10-13'); // Returns parsed date
 *
 * // Invalid usage
 * validateDate('10/13/2025'); // Throws: Expected YYYY-MM-DD format
 * validateDate('2025-02-30'); // Throws: Invalid date (Feb 30 doesn't exist)
 * validateDate(''); // Throws: Date cannot be empty
 * ```
 */
export function validateDate(date?: string): Date {
  // Default to today if not provided
  if (date === undefined || date === null) {
    return new Date();
  }

  // Check for empty string
  if (typeof date !== 'string' || date.trim() === '') {
    throw new ValidationError(
      'date',
      date,
      'YYYY-MM-DD',
      'Date cannot be empty. Expected format: YYYY-MM-DD (e.g., "2025-10-13")'
    );
  }

  // Validate format using regex
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new ValidationError(
      'date',
      date,
      'YYYY-MM-DD',
      `Invalid date format: "${date}". Expected YYYY-MM-DD (e.g., "2025-10-13")`
    );
  }

  // Parse and validate the date is valid
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(
      'date',
      date,
      'YYYY-MM-DD',
      `Invalid date: "${date}". Date is not a valid calendar date`
    );
  }

  // Verify the parsed date matches the input (catches invalid dates like 2025-02-30)
  const formatted = parsed.toISOString().split('T')[0];
  if (formatted !== date) {
    throw new ValidationError(
      'date',
      date,
      'YYYY-MM-DD',
      `Invalid date: "${date}". Date is not a valid calendar date`
    );
  }

  return parsed;
}

/**
 * Validates and parses a date range, supporting both string and object formats
 *
 * Supports two input formats:
 * 1. String: "YYYY-MM-DD/YYYY-MM-DD" (e.g., "2025-01-01/2025-12-31")
 * 2. Object: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 *
 * @param dateRange - Date range to validate (string or object format)
 * @param options - Validation options
 * @param options.maxDays - Maximum number of days allowed in the range (optional)
 * @returns Object with parsed start and end Date objects
 * @throws {ValidationError} If format is invalid, dates are invalid, or range exceeds maxDays
 *
 * @example
 * ```typescript
 * // String format
 * const range1 = validateDateRange('2025-01-01/2025-12-31');
 * // Returns: { start: Date, end: Date }
 *
 * // Object format
 * const range2 = validateDateRange({ start: '2025-01-01', end: '2025-12-31' });
 *
 * // With max days constraint
 * const range3 = validateDateRange('2025-01-01/2025-01-31', { maxDays: 30 });
 * // Valid: 31 days <= 30 days max
 *
 * // Invalid usage
 * validateDateRange('2025-01-01'); // Throws: Missing end date
 * validateDateRange('2025-12-31/2025-01-01'); // Throws: Start after end
 * validateDateRange('2025-01-01/2026-01-01', { maxDays: 365 }); // Throws: Exceeds max
 * ```
 */
export function validateDateRange(
  dateRange: string | { start: string; end: string },
  options?: { maxDays?: number }
): { start: Date; end: Date } {
  let startStr: string;
  let endStr: string;
  let start: Date;
  let end: Date;

  // Handle both string and object formats
  if (typeof dateRange === 'string') {
    // Use existing parseDateRange for string format
    try {
      const parsed = parseDateRange(dateRange);
      start = parsed.start;
      end = parsed.end;
      // Extract string representations for error messages
      startStr = start.toISOString().split('T')[0];
      endStr = end.toISOString().split('T')[0];
    } catch (error) {
      throw new ValidationError(
        'dateRange',
        dateRange,
        'YYYY-MM-DD/YYYY-MM-DD or {start: YYYY-MM-DD, end: YYYY-MM-DD}',
        error instanceof Error ? error.message : 'Invalid date range format'
      );
    }
  } else if (typeof dateRange === 'object' && dateRange !== null) {
    startStr = dateRange.start;
    endStr = dateRange.end;

    if (!startStr || !endStr) {
      throw new ValidationError(
        'dateRange',
        dateRange,
        '{start: YYYY-MM-DD, end: YYYY-MM-DD}',
        'Both start and end dates are required in date range object'
      );
    }

    // Validate individual dates
    start = validateDate(startStr);
    end = validateDate(endStr);

    // Validate start is before or equal to end
    if (start > end) {
      throw new ValidationError(
        'dateRange',
        { start: startStr, end: endStr },
        'start <= end',
        `Start date (${startStr}) must be before or equal to end date (${endStr})`
      );
    }
  } else {
    throw new ValidationError(
      'dateRange',
      dateRange,
      'YYYY-MM-DD/YYYY-MM-DD or {start: YYYY-MM-DD, end: YYYY-MM-DD}',
      'Date range must be a string (YYYY-MM-DD/YYYY-MM-DD) or object ({start, end})'
    );
  }

  // Check max days constraint if provided (applies to both formats)
  if (options?.maxDays !== undefined) {
    // Calculate days difference (inclusive, so we add 1)
    const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff > options.maxDays) {
      throw new ValidationError(
        'dateRange',
        { start: startStr, end: endStr },
        `max ${options.maxDays} days`,
        `Date range spans ${daysDiff} days, exceeding maximum of ${options.maxDays} days`
      );
    }
  }

  return { start, end };
}

/**
 * Validates an array of activity types
 *
 * Activity types are sport identifiers used to filter activities
 * (e.g., 'running', 'cycling', 'swimming').
 *
 * @param activityTypes - Array of activity type strings (optional)
 * @returns Validated array or undefined if not provided
 * @throws {ValidationError} If not an array, contains empty strings, or contains non-strings
 *
 * @example
 * ```typescript
 * // Valid usage
 * validateActivityTypes(['running', 'cycling']); // Returns: ['running', 'cycling']
 * validateActivityTypes(undefined); // Returns: undefined
 * validateActivityTypes([]); // Returns: []
 *
 * // Invalid usage
 * validateActivityTypes(['running', '']); // Throws: Contains empty string
 * validateActivityTypes(['running', 123]); // Throws: Contains non-string
 * validateActivityTypes('running'); // Throws: Not an array
 * ```
 */
export function validateActivityTypes(activityTypes?: string[]): string[] | undefined {
  if (activityTypes === undefined || activityTypes === null) {
    return undefined;
  }

  if (!Array.isArray(activityTypes)) {
    throw new ValidationError(
      'activityTypes',
      activityTypes,
      'string[]',
      'Activity types must be an array of strings (e.g., ["running", "cycling"])'
    );
  }

  // Empty array is valid
  if (activityTypes.length === 0) {
    return [];
  }

  // Validate each element is a non-empty string
  for (let i = 0; i < activityTypes.length; i++) {
    const type = activityTypes[i];
    if (typeof type !== 'string') {
      throw new ValidationError(
        'activityTypes',
        activityTypes,
        'string[]',
        `Activity type at index ${i} must be a string, got ${typeof type}`
      );
    }
    if (type.trim() === '') {
      throw new ValidationError(
        'activityTypes',
        activityTypes,
        'string[] (non-empty strings)',
        `Activity type at index ${i} cannot be empty`
      );
    }
  }

  return activityTypes;
}

/**
 * Validates a sport type string
 *
 * Sport types are identifiers for specific sports (e.g., 'running', 'cycling').
 * Similar to activity types but used in different contexts.
 *
 * @param sport - Sport type string (optional)
 * @returns Validated string or undefined if not provided
 * @throws {ValidationError} If not a string or is an empty string
 *
 * @example
 * ```typescript
 * // Valid usage
 * validateSport('running'); // Returns: 'running'
 * validateSport(undefined); // Returns: undefined
 *
 * // Invalid usage
 * validateSport(''); // Throws: Sport cannot be empty
 * validateSport('  '); // Throws: Sport cannot be empty
 * validateSport(123); // Throws: Must be a string
 * ```
 */
export function validateSport(sport?: string): string | undefined {
  if (sport === undefined || sport === null) {
    return undefined;
  }

  if (typeof sport !== 'string') {
    throw new ValidationError(
      'sport',
      sport,
      'string',
      `Sport must be a string (e.g., "running", "cycling"), got ${typeof sport}`
    );
  }

  if (sport.trim() === '') {
    throw new ValidationError(
      'sport',
      sport,
      'non-empty string',
      'Sport cannot be empty. Provide a sport type like "running", "cycling", etc.'
    );
  }

  return sport;
}

/**
 * Validates a maximum activities count parameter
 *
 * Ensures the value is a positive integer within reasonable bounds to prevent
 * excessive API calls or memory usage.
 *
 * @param max - Maximum activities count (optional)
 * @param defaultValue - Default value to use if max is undefined (optional)
 * @returns Validated number or undefined/default if not provided
 * @throws {ValidationError} If not a positive integer or exceeds bounds (1-5000)
 *
 * @example
 * ```typescript
 * // Valid usage
 * validateMaxActivities(100); // Returns: 100
 * validateMaxActivities(undefined, 1000); // Returns: 1000 (default)
 * validateMaxActivities(undefined); // Returns: undefined
 * validateMaxActivities(1); // Returns: 1 (minimum)
 * validateMaxActivities(5000); // Returns: 5000 (maximum)
 *
 * // Invalid usage
 * validateMaxActivities(0); // Throws: Must be >= 1
 * validateMaxActivities(-5); // Throws: Must be >= 1
 * validateMaxActivities(10000); // Throws: Must be <= 5000
 * validateMaxActivities(100.5); // Throws: Must be an integer
 * validateMaxActivities('100'); // Throws: Must be a number
 * ```
 */
export function validateMaxActivities(
  max?: number,
  defaultValue?: number
): number | undefined {
  if (max === undefined || max === null) {
    return defaultValue;
  }

  if (typeof max !== 'number') {
    throw new ValidationError(
      'maxActivities',
      max,
      'number (positive integer)',
      `Maximum activities must be a number, got ${typeof max}`
    );
  }

  if (isNaN(max) || !isFinite(max)) {
    throw new ValidationError(
      'maxActivities',
      max,
      'number (positive integer)',
      'Maximum activities must be a valid number'
    );
  }

  if (!Number.isInteger(max)) {
    throw new ValidationError(
      'maxActivities',
      max,
      'integer',
      `Maximum activities must be an integer, got ${max}`
    );
  }

  if (max < 1) {
    throw new ValidationError(
      'maxActivities',
      max,
      'positive integer (>= 1)',
      `Maximum activities must be at least 1, got ${max}`
    );
  }

  if (max > 5000) {
    throw new ValidationError(
      'maxActivities',
      max,
      'positive integer (<= 5000)',
      `Maximum activities cannot exceed 5000, got ${max}. Use smaller batches to avoid excessive API calls.`
    );
  }

  return max;
}

/**
 * Validates a boolean flag parameter
 *
 * Ensures the value is strictly a boolean type (true/false), not truthy/falsy values.
 * Useful for optional flags where undefined has different semantics from false.
 *
 * @param flag - Boolean flag (optional)
 * @param defaultValue - Default value to use if flag is undefined (optional)
 * @returns Validated boolean or undefined/default if not provided
 * @throws {ValidationError} If not a boolean type (rejects truthy/falsy non-booleans)
 *
 * @example
 * ```typescript
 * // Valid usage
 * validateBooleanFlag(true); // Returns: true
 * validateBooleanFlag(false); // Returns: false
 * validateBooleanFlag(undefined, true); // Returns: true (default)
 * validateBooleanFlag(undefined); // Returns: undefined
 *
 * // Invalid usage
 * validateBooleanFlag(1); // Throws: Must be boolean, not truthy value
 * validateBooleanFlag(0); // Throws: Must be boolean, not falsy value
 * validateBooleanFlag('true'); // Throws: Must be boolean, not string
 * validateBooleanFlag(null); // Throws: Must be boolean, not null
 * ```
 */
export function validateBooleanFlag(
  flag?: boolean,
  defaultValue?: boolean
): boolean | undefined {
  if (flag === undefined) {
    return defaultValue;
  }

  if (typeof flag !== 'boolean') {
    throw new ValidationError(
      'flag',
      flag,
      'boolean',
      `Flag must be a boolean (true or false), got ${typeof flag}: ${flag}`
    );
  }

  return flag;
}

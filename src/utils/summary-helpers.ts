/**
 * Summary System Utilities
 *
 * Provides functions for creating and managing summarized versions of data.
 * This enables consistent data reduction across all tools in the MCP server.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  SummaryOptions,
  SummaryPreset,
  SummaryResult,
  SummaryStrategy,
  SummaryMetadata,
} from '../types/summary-types.js';

/**
 * Registry of predefined summary presets.
 * New presets can be registered using `registerPreset()`.
 */
export const SUMMARY_PRESETS: Record<string, SummaryPreset> = {
  sleep: {
    name: 'sleep',
    description: 'Summary format for sleep data',
    includeFields: [
      'calendarDate',
      'dailySleepDTO.sleepTimeSeconds',
      'dailySleepDTO.napTimeSeconds',
      'dailySleepDTO.sleepStartTimestampGMT',
      'dailySleepDTO.sleepEndTimestampGMT',
      'dailySleepDTO.sleepStartTimestampLocal',
      'dailySleepDTO.sleepEndTimestampLocal',
      'dailySleepDTO.unmeasurableSleepSeconds',
      'dailySleepDTO.deepSleepSeconds',
      'dailySleepDTO.lightSleepSeconds',
      'dailySleepDTO.remSleepSeconds',
      'dailySleepDTO.awakeSleepSeconds',
      'dailySleepDTO.sleepQualityTypePK',
      'dailySleepDTO.averageSpO2Value',
      'dailySleepDTO.lowestSpO2Value',
      'dailySleepDTO.highestSpO2Value',
      'dailySleepDTO.averageRespirationValue',
      'dailySleepDTO.lowestRespirationValue',
      'dailySleepDTO.highestRespirationValue',
      'dailySleepDTO.sleepScores',
      'restingHeartRate',
      'avgOvernightHrv',
    ],
    preserveNesting: true,
    arrayLimits: {
      sleepLevels: 0,
      wellnessEpochRespirationDataDTOList: 0,
      wellnessEpochSPO2DataDTOList: 0,
    },
  },

  activity: {
    name: 'activity',
    description: 'Summary format for single activity',
    includeFields: [
      'activityId',
      'activityName',
      'activityType.typeKey',
      'startTimeLocal',
      'duration',
      'distance',
      'calories',
      'averageHR',
      'maxHR',
      'averageSpeed',
      'maxSpeed',
      'elevationGain',
      'elevationLoss',
      'avgPower',
      'maxPower',
      'normalizedPower',
      'trainingEffect',
      'aerobicTrainingEffect',
      'anaerobicTrainingEffect',
    ],
    preserveNesting: false,
  },

  activityList: {
    name: 'activityList',
    description: 'Summary format for activity lists',
    includeFields: [
      'activityId',
      'activityName',
      'activityType.typeKey',
      'startTimeLocal',
      'duration',
      'distance',
      'calories',
      'averageHR',
      'maxHR',
    ],
    preserveNesting: false,
  },

  steps: {
    name: 'steps',
    description: 'Summary format for steps data',
    includeFields: [
      'calendarDate',
      'totalSteps',
      'totalDistance',
      'stepGoal',
      'dailyStepGoal',
      'wellnessDataDaysDTO.*.wellnessDataDTO.activeKilocalories',
      'wellnessDataDaysDTO.*.wellnessDataDTO.bmrKilocalories',
      'wellnessDataDaysDTO.*.wellnessDataDTO.totalKilocalories',
      'wellnessDataDaysDTO.*.wellnessDataDTO.moderateIntensityMinutes',
      'wellnessDataDaysDTO.*.wellnessDataDTO.vigorousIntensityMinutes',
    ],
    preserveNesting: true,
  },

  heartRate: {
    name: 'heartRate',
    description: 'Summary format for heart rate data',
    includeFields: [
      'userProfileId',
      'calendarDate',
      'startTimestampGMT',
      'endTimestampGMT',
      'startTimestampLocal',
      'endTimestampLocal',
      'maxHeartRate',
      'minHeartRate',
      'restingHeartRate',
      'lastSevenDaysAvgRestingHeartRate',
      'heartRateValueDescriptors',
      'heartRateValues',
    ],
    preserveNesting: true,
    arrayLimits: {
      heartRateValues: 0,
    },
  },

  trainingStress: {
    name: 'trainingStress',
    description: 'Summary format for training stress balance',
    includeFields: [
      'date',
      'tsb',
      'ctl',
      'atl',
      'currentForm',
      'trend',
      'recommendations',
      'timeSeries.*.date',
      'timeSeries.*.tss',
      'timeSeries.*.ctl',
      'timeSeries.*.atl',
      'timeSeries.*.tsb',
    ],
    preserveNesting: true,
    arrayLimits: {
      'timeSeries': 30, // Limit time series to last 30 days
    },
  },
};

/**
 * Creates a summarized version of data based on the provided options.
 *
 * This is the main entry point for the summary system. It supports three strategies:
 * 1. Preset: Use a predefined configuration
 * 2. Include: Explicitly specify which fields to include
 * 3. Exclude: Explicitly specify which fields to exclude
 *
 * @template T - Type of the input data
 * @param data - The data to summarize
 * @param options - Configuration options for the summary
 * @returns Summary result with data and optional metadata
 *
 * @example
 * ```typescript
 * // Using a preset
 * const result = createSummary(sleepData, {
 *   preset: 'sleep',
 *   includeMetadata: true
 * });
 *
 * // Using include strategy
 * const result = createSummary(activityData, {
 *   includeFields: ['activityId', 'activityName', 'duration'],
 *   preserveNesting: false
 * });
 *
 * // Using exclude strategy
 * const result = createSummary(healthData, {
 *   excludeFields: ['rawSamples', 'detailedStats'],
 *   arrayLimits: { 'measurements': 10 }
 * });
 * ```
 */
export function createSummary<T>(
  data: T,
  options: SummaryOptions = {}
): SummaryResult<T> {
  const originalSize = calculateSize(data);

  // Determine strategy and apply preset if needed
  const { strategy, effectiveOptions } = resolveStrategy(options);

  // Create the summary based on strategy
  let summaryData: T;
  if (strategy === 'include') {
    summaryData = extractFields(data, effectiveOptions.includeFields || [], {
      preserveNesting: effectiveOptions.preserveNesting ?? true,
      arrayLimits: effectiveOptions.arrayLimits,
    }) as T;
  } else if (strategy === 'exclude') {
    summaryData = excludeFields(data, effectiveOptions.excludeFields || [], {
      arrayLimits: effectiveOptions.arrayLimits,
    }) as T;
  } else {
    // Should not happen if resolveStrategy works correctly
    summaryData = data;
  }

  const summarySize = calculateSize(summaryData);
  const reduction =
    originalSize > 0 ? ((originalSize - summarySize) / originalSize) * 100 : 0;

  // Build result
  const result: SummaryResult<T> = {
    data: summaryData,
  };

  // Add metadata if requested
  if (options.includeMetadata) {
    const metadata: SummaryMetadata = {
      strategy,
      preserveNesting: effectiveOptions.preserveNesting ?? true,
      originalSize,
      summarySize,
      reduction: Math.round(reduction * 10) / 10,
    };

    // If a preset was used, include its name in metadata
    if (options.preset) {
      metadata.preset = options.preset;
    }

    if (effectiveOptions.includeFields) {
      metadata.includedFields = effectiveOptions.includeFields;
    }

    if (effectiveOptions.excludeFields) {
      metadata.excludedFields = effectiveOptions.excludeFields;
    }

    if (effectiveOptions.arrayLimits) {
      metadata.arrayLimits = effectiveOptions.arrayLimits;
    }

    result.metadata = metadata;
  }

  return result;
}

/**
 * Resolves the strategy and effective options from user options.
 * Handles preset expansion and strategy determination.
 *
 * @param options - User-provided options
 * @returns Strategy and effective options to use
 */
function resolveStrategy(options: SummaryOptions): {
  strategy: SummaryStrategy;
  effectiveOptions: SummaryOptions;
} {
  // If preset is specified, use preset strategy
  if (options.preset) {
    const preset = getPreset(options.preset);
    if (!preset) {
      throw new Error(`Unknown preset: ${options.preset}`);
    }

    // Determine the actual strategy based on what the preset defines
    const actualStrategy: SummaryStrategy = preset.includeFields
      ? 'include'
      : preset.excludeFields
      ? 'exclude'
      : 'include';

    return {
      strategy: actualStrategy,
      effectiveOptions: {
        includeFields: preset.includeFields,
        excludeFields: preset.excludeFields,
        preserveNesting: preset.preserveNesting,
        arrayLimits: {
          ...preset.arrayLimits,
          ...options.arrayLimits, // Allow override
        },
      },
    };
  }

  // If includeFields is specified, use include strategy
  if (options.includeFields && options.includeFields.length > 0) {
    return {
      strategy: 'include',
      effectiveOptions: options,
    };
  }

  // If excludeFields is specified, use exclude strategy
  if (options.excludeFields !== undefined) {
    return {
      strategy: 'exclude',
      effectiveOptions: options,
    };
  }

  // Default: include strategy with empty fields (returns empty object)
  return {
    strategy: 'include',
    effectiveOptions: {
      includeFields: [],
      preserveNesting: options.preserveNesting ?? true,
      arrayLimits: options.arrayLimits,
    },
  };
}

/**
 * Extracts specified fields from data.
 * Supports nested paths using dot notation and wildcard patterns.
 *
 * @param data - Source data
 * @param fields - Array of field paths to extract
 * @param options - Extraction options
 * @returns Object containing only the specified fields
 */
export function extractFields(
  data: any,
  fields: string[],
  options: {
    preserveNesting?: boolean;
    arrayLimits?: Record<string, number>;
  } = {}
): any {
  const preserveNesting = options.preserveNesting ?? true;
  const arrayLimits = options.arrayLimits || {};

  if (!data || typeof data !== 'object') {
    return data;
  }

  const result: any = preserveNesting ? {} : {};

  for (const fieldPath of fields) {
    const value = getNestedValue(data, fieldPath);

    if (value !== undefined) {
      // Apply array limits if applicable
      const limitedValue = applyArrayLimit(value, fieldPath, arrayLimits);

      if (preserveNesting) {
        // Check if path contains wildcard
        if (fieldPath.includes('.*')) {
          // For wildcard paths, handle specially
          setNestedValueWithWildcard(result, fieldPath, limitedValue);
        } else {
          setNestedValue(result, fieldPath, limitedValue);
        }
      } else {
        // Flatten: use last segment as key
        const key = fieldPath.split('.').filter(p => p !== '*').pop() || fieldPath;
        result[key] = limitedValue;
      }
    }
  }

  return result;
}

/**
 * Excludes specified fields from data.
 * Supports nested paths using dot notation.
 *
 * @param data - Source data
 * @param fields - Array of field paths to exclude
 * @param options - Exclusion options
 * @returns Object with specified fields removed
 */
function excludeFields(
  data: any,
  fields: string[],
  options: {
    arrayLimits?: Record<string, number>;
  } = {}
): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const arrayLimits = options.arrayLimits || {};

  // Deep clone to avoid mutating original
  let result = JSON.parse(JSON.stringify(data));

  // Remove excluded fields
  for (const fieldPath of fields) {
    deleteNestedValue(result, fieldPath);
  }

  // Apply array limits
  result = applyArrayLimitsRecursive(result, arrayLimits);

  return result;
}

/**
 * Gets a nested value from an object using dot notation path.
 * Supports wildcards (*) for array elements.
 *
 * @param obj - Source object
 * @param path - Dot-notation path (e.g., 'user.profile.name' or 'items.*.id')
 * @returns The value at the path, or undefined if not found
 *
 * @example
 * ```typescript
 * const data = { user: { profile: { name: 'John' } } };
 * getNestedValue(data, 'user.profile.name'); // 'John'
 *
 * const data2 = { items: [{ id: 1 }, { id: 2 }] };
 * getNestedValue(data2, 'items.*.id'); // [1, 2]
 * ```
 */
export function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle wildcard for arrays
    if (part === '*') {
      if (!Array.isArray(current)) {
        return undefined;
      }

      // Get remaining path
      const remainingPath = parts.slice(i + 1).join('.');

      if (remainingPath) {
        // Recursively get values from array elements
        return current
          .map((item) => getNestedValue(item, remainingPath))
          .filter((v) => v !== undefined);
      } else {
        // Return the array itself
        return current;
      }
    }

    current = current[part];
  }

  return current;
}

/**
 * Sets a nested value in an object using dot notation path.
 * Creates intermediate objects as needed.
 *
 * @param obj - Target object (mutated in place)
 * @param path - Dot-notation path
 * @param value - Value to set
 *
 * @example
 * ```typescript
 * const obj = {};
 * setNestedValue(obj, 'user.profile.name', 'John');
 * // obj is now { user: { profile: { name: 'John' } } }
 * ```
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (part === '*') {
      // Cannot set with wildcard in path
      throw new Error('Cannot use wildcard (*) when setting values');
    }

    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }

    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart === '*') {
    throw new Error('Cannot use wildcard (*) as final path segment');
  }

  current[lastPart] = value;
}

/**
 * Sets a nested value with wildcard support.
 * Handles paths like 'splits.*.distance' by setting the entire structure.
 *
 * @param obj - Target object (mutated in place)
 * @param path - Dot-notation path with wildcard
 * @param value - Value to set (should be from wildcard extraction)
 */
function setNestedValueWithWildcard(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  const wildcardIndex = parts.indexOf('*');

  if (wildcardIndex === -1) {
    // No wildcard, use regular setter
    setNestedValue(obj, path, value);
    return;
  }

  // Get the base path (before wildcard)
  const basePath = parts.slice(0, wildcardIndex).join('.');

  // Set the value at the base path
  if (basePath) {
    let current = obj;
    const baseParts = basePath.split('.');

    for (let i = 0; i < baseParts.length - 1; i++) {
      const part = baseParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const lastBasePart = baseParts[baseParts.length - 1];
    if (!current[lastBasePart]) {
      current[lastBasePart] = {};
    }

    // Get the remaining path after wildcard
    const remainingPath = parts.slice(wildcardIndex + 1).join('.');
    if (remainingPath) {
      // Value should be an object with the remaining path
      current[lastBasePart][remainingPath] = value;
    } else {
      // Value is the array itself
      current[lastBasePart] = value;
    }
  } else {
    // Wildcard at the root
    const remainingPath = parts.slice(1).join('.');
    if (remainingPath) {
      obj[remainingPath] = value;
    } else {
      // This shouldn't happen but handle it
      Object.assign(obj, value);
    }
  }
}

/**
 * Deletes a nested value from an object using dot notation path.
 *
 * @param obj - Target object (mutated in place)
 * @param path - Dot-notation path
 */
function deleteNestedValue(obj: any, path: string): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (!current[part]) {
      return; // Path doesn't exist
    }

    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  delete current[lastPart];
}

/**
 * Applies array limit to a value if it's an array.
 *
 * @param value - Value to limit
 * @param path - Path of the value (for looking up limit)
 * @param limits - Map of path to limit
 * @returns Limited value
 */
function applyArrayLimit(
  value: any,
  path: string,
  limits: Record<string, number>
): any {
  if (!Array.isArray(value)) {
    return value;
  }

  const limit = limits[path];
  if (limit === undefined) {
    return value;
  }

  if (limit === 0) {
    return []; // Exclude array entirely
  }

  return value.slice(0, limit);
}

/**
 * Recursively applies array limits to all arrays in an object.
 *
 * @param obj - Object to process
 * @param limits - Map of path to limit
 * @param currentPath - Current path (for recursion)
 * @returns Object with array limits applied
 */
function applyArrayLimitsRecursive(
  obj: any,
  limits: Record<string, number>,
  currentPath: string = ''
): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    const limit = limits[currentPath];

    let limitedArray = obj;
    if (limit !== undefined) {
      limitedArray = limit === 0 ? [] : obj.slice(0, limit);
    }

    // Recursively process array elements
    return limitedArray.map((item, index) =>
      applyArrayLimitsRecursive(item, limits, `${currentPath}[${index}]`)
    );
  }

  // Process object properties
  const result: any = {};
  for (const key in obj) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    result[key] = applyArrayLimitsRecursive(obj[key], limits, newPath);
  }

  return result;
}

/**
 * Gets all available field paths in an object.
 * Useful for debugging and understanding data structure.
 *
 * @param obj - Object to analyze
 * @param maxDepth - Maximum depth to traverse (default: 10)
 * @returns Array of all field paths in dot notation
 *
 * @example
 * ```typescript
 * const data = {
 *   user: { name: 'John', profile: { age: 30 } },
 *   items: [{ id: 1 }]
 * };
 * getAllFieldPaths(data);
 * // Returns: ['user', 'user.name', 'user.profile', 'user.profile.age', 'items', 'items.*', 'items.*.id']
 * ```
 */
export function getAllFieldPaths(obj: any, maxDepth: number = 10): string[] {
  const paths: string[] = [];

  function traverse(current: any, currentPath: string, depth: number): void {
    if (depth >= maxDepth) {
      return;
    }

    if (!current || typeof current !== 'object') {
      return;
    }

    if (Array.isArray(current)) {
      // Add array itself
      if (currentPath) {
        paths.push(currentPath);
      }

      // Process first element as representative
      if (current.length > 0) {
        const wildcardPath = currentPath ? `${currentPath}.*` : '*';
        paths.push(wildcardPath); // Add the wildcard path
        traverse(current[0], wildcardPath, depth + 1);
      }
    } else {
      // Process object properties
      for (const key in current) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        paths.push(newPath);
        traverse(current[key], newPath, depth + 1);
      }
    }
  }

  traverse(obj, '', 0);
  return paths;
}

/**
 * Gets a list of all available preset names.
 *
 * @returns Array of preset names
 */
export function getAvailablePresets(): string[] {
  return Object.keys(SUMMARY_PRESETS);
}

/**
 * Gets a preset configuration by name.
 *
 * @param name - Name of the preset
 * @returns Preset configuration, or undefined if not found
 */
export function getPreset(name: string): SummaryPreset | undefined {
  return SUMMARY_PRESETS[name];
}

/**
 * Registers a new preset or updates an existing one.
 *
 * @param preset - Preset configuration to register
 */
export function registerPreset(preset: SummaryPreset): void {
  SUMMARY_PRESETS[preset.name] = preset;
}

/**
 * Calculates approximate size of data in bytes.
 * Uses JSON stringification for simplicity.
 *
 * @param data - Data to measure
 * @returns Approximate size in bytes
 */
function calculateSize(data: any): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    // Fallback: rough estimate
    return JSON.stringify(data).length;
  }
}

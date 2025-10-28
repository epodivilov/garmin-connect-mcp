/**
 * Garmin Workout API Types
 *
 * Type definitions for creating and managing structured workouts via Garmin Connect API.
 * Based on the Garmin Connect workout structure and API requirements.
 *
 * @example
 * ```typescript
 * const workout: WorkoutPayload = {
 *   workoutName: "5x1000m Intervals",
 *   sportType: SPORT_TYPE_MAPPING.running,
 *   workoutSegments: [
 *     {
 *       segmentOrder: 1,
 *       sportType: SPORT_TYPE_MAPPING.running,
 *       workoutSteps: [
 *         {
 *           type: "ExecutableStepDTO",
 *           stepId: null,
 *           stepOrder: 1,
 *           stepType: STEP_TYPE_MAPPING.warmup,
 *           endCondition: {
 *             conditionType: END_CONDITION_TYPE_MAPPING.time,
 *             conditionTypeValue: 600 // 10 minutes
 *           },
 *           targetType: TARGET_TYPE_MAPPING["no target"]
 *         }
 *       ]
 *     }
 *   ]
 * };
 * ```
 */

/**
 * Sport type mapping for Garmin workouts
 * Contains sportTypeId, sportTypeKey, and displayOrder for each supported sport
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const SPORT_TYPE_MAPPING = {
  running: {
    sportTypeId: 1,
    sportTypeKey: 'running',
    displayOrder: 1,
  },
  cycling: {
    sportTypeId: 2,
    sportTypeKey: 'cycling',
    displayOrder: 2,
  },
  swimming: {
    sportTypeId: 5,
    sportTypeKey: 'lap_swimming',
    displayOrder: 5,
  },
  other: {
    sportTypeId: 4,
    sportTypeKey: 'other',
    displayOrder: 4,
  },
} as const;

export type SportType = typeof SPORT_TYPE_MAPPING[keyof typeof SPORT_TYPE_MAPPING];
export type SportTypeName = keyof typeof SPORT_TYPE_MAPPING;

/**
 * Step type mapping for workout steps
 * Defines different types of steps in a workout (warmup, interval, recovery, etc.)
 */
export const STEP_TYPE_MAPPING = {
  warmup: {
    stepTypeId: 1,
    stepTypeKey: 'warmup',
    displayOrder: 1,
  },
  cooldown: {
    stepTypeId: 2,
    stepTypeKey: 'cooldown',
    displayOrder: 2,
  },
  interval: {
    stepTypeId: 3,
    stepTypeKey: 'interval',
    displayOrder: 3,
  },
  recovery: {
    stepTypeId: 4,
    stepTypeKey: 'recovery',
    displayOrder: 4,
  },
  rest: {
    stepTypeId: 5,
    stepTypeKey: 'rest',
    displayOrder: 5,
  },
  repeat: {
    stepTypeId: 6,
    stepTypeKey: 'repeat',
    displayOrder: 6,
  },
} as const;

export type StepType = typeof STEP_TYPE_MAPPING[keyof typeof STEP_TYPE_MAPPING];
export type StepTypeName = keyof typeof STEP_TYPE_MAPPING;

/**
 * Target type mapping for workout intensity targets
 * Defines how intensity is measured (no target, power, cadence, heart rate, speed, pace)
 */
export const TARGET_TYPE_MAPPING = {
  'no target': {
    workoutTargetTypeId: 1,
    workoutTargetTypeKey: 'no.target',
    displayOrder: 1,
  },
  power: {
    workoutTargetTypeId: 2,
    workoutTargetTypeKey: 'power.zone',
    displayOrder: 2,
  },
  cadence: {
    workoutTargetTypeId: 3,
    workoutTargetTypeKey: 'cadence.zone',
    displayOrder: 3,
  },
  'heart rate': {
    workoutTargetTypeId: 4,
    workoutTargetTypeKey: 'heart.rate.zone',
    displayOrder: 4,
  },
  speed: {
    workoutTargetTypeId: 5,
    workoutTargetTypeKey: 'speed.zone',
    displayOrder: 5,
  },
  pace: {
    workoutTargetTypeId: 6,
    workoutTargetTypeKey: 'pace.zone',
    displayOrder: 6,
  },
} as const;

export type TargetType = typeof TARGET_TYPE_MAPPING[keyof typeof TARGET_TYPE_MAPPING];
export type TargetTypeName = keyof typeof TARGET_TYPE_MAPPING;

/**
 * End condition type mapping for workout step duration
 * Defines how a step ends (time, distance, lap button press, iterations)
 */
export const END_CONDITION_TYPE_MAPPING = {
  time: {
    conditionTypeId: 2,
    conditionTypeKey: 'time',
    displayOrder: 2,
    displayable: true,
  },
  distance: {
    conditionTypeId: 3,
    conditionTypeKey: 'distance',
    displayOrder: 3,
    displayable: true,
  },
  'lap.button': {
    conditionTypeId: 1,
    conditionTypeKey: 'lap.button',
    displayOrder: 1,
    displayable: true,
  },
  iterations: {
    conditionTypeId: 7,
    conditionTypeKey: 'iterations',
    displayOrder: 7,
    displayable: true,
  },
} as const;

export type EndConditionType = typeof END_CONDITION_TYPE_MAPPING[keyof typeof END_CONDITION_TYPE_MAPPING];
export type EndConditionTypeName = keyof typeof END_CONDITION_TYPE_MAPPING;

/**
 * Distance unit mapping for distance-based end conditions
 * Includes conversion factors to meters (base unit)
 */
export const DISTANCE_UNIT_MAPPING = {
  m: {
    unitId: 2,
    unitKey: 'm',
    factor: 1,
  },
  km: {
    unitId: 3,
    unitKey: 'km',
    factor: 1000,
  },
  mile: {
    unitId: 4,
    unitKey: 'mile',
    factor: 1609.344,
  },
} as const;

export type DistanceUnit = typeof DISTANCE_UNIT_MAPPING[keyof typeof DISTANCE_UNIT_MAPPING];
export type DistanceUnitName = keyof typeof DISTANCE_UNIT_MAPPING;

/**
 * End condition for a workout step
 * Defines when a step should end (by time, distance, lap button, or iterations)
 *
 * Note: This is just the condition type. The value is stored in endConditionValue
 * on the step level to match Garmin API format.
 *
 * @example
 * ```typescript
 * const endCondition = END_CONDITION_TYPE_MAPPING.time;
 * const endConditionValue = 600; // 10 minutes in seconds
 * ```
 */
export type EndCondition = EndConditionType;

/**
 * Helper type for end condition data with value
 * Used by factories to return both condition type and value
 */
export interface EndConditionData {
  endCondition: EndCondition;
  endConditionValue: number;
  preferredEndConditionUnit?: DistanceUnit;
}

/**
 * Target for a workout step
 * Defines intensity target (no target, power, cadence, heart rate, speed, pace)
 *
 * Uses discriminated unions to ensure type safety - each target type
 * has the correct required/optional fields.
 *
 * @example No target
 * ```typescript
 * {
 *   targetType: TARGET_TYPE_MAPPING["no target"]
 * }
 * ```
 *
 * @example Heart rate zone target
 * ```typescript
 * {
 *   targetType: TARGET_TYPE_MAPPING["heart rate"],
 *   targetValueOne: 140, // bpm
 *   targetValueTwo: 160  // bpm
 * }
 * ```
 *
 * @example Pace target (min/km converted to m/s)
 * ```typescript
 * {
 *   targetType: TARGET_TYPE_MAPPING.pace,
 *   targetValueOne: 3.33, // ~5:00 min/km in m/s
 *   targetValueTwo: 3.57  // ~4:40 min/km in m/s
 * }
 * ```
 */
export type Target =
  | {
      // No target - open pace/effort
      targetType: typeof TARGET_TYPE_MAPPING['no target'];
      targetValueOne?: never;
      targetValueTwo?: never;
      zoneNumber?: never;
    }
  | {
      // Zone-based target (power, cadence, heart rate, speed, pace)
      // Can specify either zone number OR custom range (targetValueOne/Two)
      targetType:
        | typeof TARGET_TYPE_MAPPING['power']
        | typeof TARGET_TYPE_MAPPING['cadence']
        | typeof TARGET_TYPE_MAPPING['heart rate']
        | typeof TARGET_TYPE_MAPPING['speed']
        | typeof TARGET_TYPE_MAPPING['pace'];
      // Either use zone number OR custom values, not both
      targetValueOne?: number;
      targetValueTwo?: number;
      zoneNumber?: number;
    };

/**
 * Executable workout step (warmup, interval, recovery, cooldown, rest)
 * Represents a single actionable step in a workout
 *
 * Note: This structure matches the Garmin API format exactly.
 * endCondition contains only the type, while endConditionValue is a separate field.
 */
export interface ExecutableStep {
  type: 'ExecutableStepDTO';
  stepId: number; // Auto-generated sequential ID
  stepOrder: number;
  childStepId?: number | null;
  description?: string | null;
  stepType: StepType;
  endCondition: EndCondition; // Only the condition type
  endConditionValue: number; // Separate value field (seconds, meters, etc.)
  endConditionCompare?: number | null;
  endConditionZone?: number | null;
  preferredEndConditionUnit?: DistanceUnit | null; // For distance conditions
  targetType: TargetType;
  targetValueOne?: number | null;
  targetValueTwo?: number | null;
  zoneNumber?: number | null;
  exerciseName?: string | null;
  strokeType?: string | null;
  equipmentType?: string | null;
  category?: string | null;
  // Secondary target fields are optional (not sent to API unless specified)
  secondaryTargetType?: TargetType;
  secondaryTargetValueOne?: number;
  secondaryTargetValueTwo?: number;
  secondaryZoneNumber?: number;
}

/**
 * Repeat step (for intervals)
 * Contains child steps that should be repeated
 *
 * @example 5x1000m intervals
 * ```typescript
 * {
 *   type: "RepeatGroupDTO",
 *   stepType: STEP_TYPE_MAPPING.repeat,
 *   numberOfIterations: 5,
 *   smartRepeat: false,
 *   workoutSteps: [
 *     // 1000m work step
 *     { ...intervalStep },
 *     // 400m recovery step
 *     { ...recoveryStep }
 *   ]
 * }
 * ```
 */
export interface RepeatStep {
  type: 'RepeatGroupDTO';
  stepId: number | null;
  stepOrder: number;
  numberOfIterations: number;
  smartRepeat: boolean;
  childStepId: number;
  stepType: StepType;
  workoutSteps: WorkoutStep[];
}

/**
 * Union type for all possible workout steps
 */
export type WorkoutStep = ExecutableStep | RepeatStep;

/**
 * Workout segment containing steps
 * A workout can have multiple segments (e.g., different sports in a multisport workout)
 */
export interface WorkoutSegment {
  segmentOrder: number;
  sportType: SportType;
  workoutSteps: WorkoutStep[];
}

/**
 * Complete workout payload for Garmin API
 * Top-level structure for creating a workout
 *
 * This structure matches the Garmin Connect web interface format exactly.
 *
 * @example Simple running workout
 * ```typescript
 * const workout: WorkoutPayload = {
 *   workoutName: "Easy Run",
 *   description: "30 minute easy run",
 *   sportType: SPORT_TYPE_MAPPING.running,
 *   subSportType: null,
 *   estimatedDistanceUnit: { unitKey: null },
 *   workoutSegments: [{ ... }],
 *   avgTrainingSpeed: 3.0,
 *   estimatedDurationInSecs: 0,
 *   estimatedDistanceInMeters: 0,
 *   estimateType: null,
 *   isWheelchair: false
 * };
 * ```
 */
export interface WorkoutPayload {
  // Server-managed IDs - optional (omit when creating new workouts)
  workoutId?: number;
  ownerId?: number;

  // Core required fields
  workoutName: string;
  sportType: SportType;
  subSportType: null; // Always null for basic workouts
  workoutSegments: WorkoutSegment[];

  // Required metadata
  description?: string; // Optional description

  // Required Garmin fields
  estimatedDistanceUnit: { unitKey: string | null };
  avgTrainingSpeed: number; // Average training speed (m/s)
  estimatedDurationInSecs: number;
  estimatedDistanceInMeters: number;
  estimateType: null; // Always null for manual workouts
  isWheelchair: boolean; // false for normal workouts

  // Server-managed timestamps - optional
  updatedDate?: string;
  createdDate?: string;

  // Optional training plan fields
  trainingPlanId?: number;
  atpPlanId?: number;

  // Optional pool configuration (swimming)
  poolLength?: number;
  poolLengthUnit?: DistanceUnit;

  // Optional metadata
  workoutProvider?: string;
  workoutSourceId?: number;
  consumer?: string;
  workoutNameI18nKey?: string;
  descriptionI18nKey?: string;
}

/**
 * Garmin API response after workout creation/update
 */
export interface WorkoutResponse {
  workoutId: number;
  ownerId: number;
  workoutName: string;
  description: string | null;
  updatedDate: string;
  createdDate: string;
  sportType: SportType;
}

/**
 * Precision constants for pace conversions
 */
export const PACE_PRECISION = 4; // Default precision for pace calculations (4 decimal places)
export const GARMIN_PACE_PRECISION = 2; // Garmin API typically uses 2 decimal places

/**
 * Pace conversion utilities
 * Converts between min/km and m/s (Garmin API uses m/s for pace targets)
 */
export interface PaceConversion {
  minPerKm: number;  // Pace in minutes per kilometer
  metersPerSec: number; // Pace in meters per second (Garmin format)
}

/**
 * Structured pace value with both representations
 */
export interface PaceValue {
  minPerKm: number;      // Pace in min/km (e.g., 5.0 = 5:00/km)
  metersPerSec: number;  // Pace in m/s (Garmin format)
  formatted: string;     // Human-readable (e.g., "5:00")
}

/**
 * Helper function to convert pace from min/km to m/s
 *
 * **Precision Guidance:**
 * - Default (4 decimals): Best for internal calculations and round-trip conversions
 * - Garmin API (2 decimals): Use GARMIN_PACE_PRECISION when sending to Garmin API
 * - Higher precision reduces rounding errors in round-trip conversions
 *
 * **Garmin API Requirements:**
 * - Garmin API expects pace in meters per second (m/s)
 * - Use 2 decimal places when sending to Garmin API for consistency
 *
 * @param minPerKm - Pace in minutes per kilometer (e.g., 5.0 for 5:00/km)
 * @param precision - Number of decimal places to round to (default: 4)
 * @returns Pace in meters per second
 *
 * @example
 * ```typescript
 * // Default precision (4 decimals) - best for calculations
 * const pace = paceMinKmToMetersPerSec(5.0);
 * // Returns 3.3333 m/s
 *
 * // Garmin API precision (2 decimals)
 * const garminPace = paceMinKmToMetersPerSec(5.0, GARMIN_PACE_PRECISION);
 * // Returns 3.33 m/s
 * ```
 */
export function paceMinKmToMetersPerSec(minPerKm: number, precision: number = PACE_PRECISION): number {
  if (minPerKm <= 0) {
    throw new Error('Pace must be positive');
  }
  if (precision < 0 || !Number.isInteger(precision)) {
    throw new Error('Precision must be a non-negative integer');
  }
  const result = 1000 / (minPerKm * 60);
  // Use Math.round for consistent rounding instead of toFixed
  const multiplier = Math.pow(10, precision);
  return Math.round(result * multiplier) / multiplier;
}

/**
 * Helper function to convert pace from m/s to min/km
 *
 * **Precision Guidance:**
 * - Default (4 decimals): Best for internal calculations and round-trip conversions
 * - Higher precision reduces rounding errors in round-trip conversions
 *
 * @param metersPerSec - Pace in meters per second
 * @param precision - Number of decimal places to round to (default: 4)
 * @returns Pace in minutes per kilometer
 *
 * @example
 * ```typescript
 * // Default precision (4 decimals)
 * const pace = paceMetersPerSecToMinKm(3.3333);
 * // Returns 5.0 (5:00/km)
 *
 * // Lower precision
 * const pace2 = paceMetersPerSecToMinKm(3.33, GARMIN_PACE_PRECISION);
 * // Returns 5.01 min/km
 * ```
 */
export function paceMetersPerSecToMinKm(metersPerSec: number, precision: number = PACE_PRECISION): number {
  if (metersPerSec <= 0) {
    throw new Error('Pace must be positive');
  }
  if (precision < 0 || !Number.isInteger(precision)) {
    throw new Error('Precision must be a non-negative integer');
  }
  const result = 1000 / (metersPerSec * 60);
  // Use Math.round for consistent rounding instead of toFixed
  const multiplier = Math.pow(10, precision);
  return Math.round(result * multiplier) / multiplier;
}

/**
 * Create a structured pace value from min/km
 *
 * @param minPerKm - Pace in minutes per kilometer
 * @param precision - Precision for m/s conversion (default: PACE_PRECISION)
 * @returns Complete pace value with both representations
 *
 * @example
 * ```typescript
 * const pace = createPaceValue(5.0);
 * // Returns { minPerKm: 5.0, metersPerSec: 3.3333, formatted: "5:00" }
 * ```
 */
export function createPaceValue(minPerKm: number, precision: number = PACE_PRECISION): PaceValue {
  return {
    minPerKm,
    metersPerSec: paceMinKmToMetersPerSec(minPerKm, precision),
    formatted: formatPace(minPerKm),
  };
}

/**
 * Create a structured pace value from m/s
 *
 * @param metersPerSec - Pace in meters per second
 * @param precision - Precision for min/km conversion (default: PACE_PRECISION)
 * @returns Complete pace value with both representations
 *
 * @example
 * ```typescript
 * const pace = createPaceValueFromMetersPerSec(3.3333);
 * // Returns { minPerKm: 5.0, metersPerSec: 3.3333, formatted: "5:00" }
 * ```
 */
export function createPaceValueFromMetersPerSec(
  metersPerSec: number,
  precision: number = PACE_PRECISION
): PaceValue {
  const minPerKm = paceMetersPerSecToMinKm(metersPerSec, precision);
  return {
    minPerKm,
    metersPerSec,
    formatted: formatPace(minPerKm),
  };
}

/**
 * Helper function to format pace as MM:SS string
 *
 * @param minPerKm - Pace in minutes per kilometer
 * @returns Formatted pace string (e.g., "5:00")
 *
 * @example
 * ```typescript
 * const formatted = formatPace(5.5); // 5.5 min/km
 * // Returns "5:30"
 * ```
 */
export function formatPace(minPerKm: number): string {
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Helper function to parse pace string (MM:SS) to decimal minutes
 *
 * @param paceStr - Pace string in MM:SS format (e.g., "5:30")
 * @returns Pace in decimal minutes (e.g., 5.5)
 *
 * @example
 * ```typescript
 * const pace = parsePace("5:30");
 * // Returns 5.5
 * ```
 */
export function parsePace(paceStr: string): number {
  const match = paceStr.match(/^(\d+):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid pace format: ${paceStr}. Expected MM:SS`);
  }
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) {
    throw new Error(`Invalid seconds in pace: ${seconds}. Must be 0-59`);
  }
  return minutes + seconds / 60;
}

/**
 * Type guard to check if a step is an ExecutableStep
 */
export function isExecutableStep(step: WorkoutStep): step is ExecutableStep {
  return step.type === 'ExecutableStepDTO';
}

/**
 * Type guard to check if a step is a RepeatStep
 */
export function isRepeatStep(step: WorkoutStep): step is RepeatStep {
  return step.type === 'RepeatGroupDTO';
}

/**
 * Validates that a workout payload has correct structure
 *
 * Uses nullish coalescing (== null) to check for both null and undefined,
 * following the project's null handling pattern.
 *
 * @param workout - Workout payload to validate
 * @returns true if valid, throws error otherwise
 *
 * @throws {Error} If workout structure is invalid
 */
export function validateWorkoutPayload(workout: WorkoutPayload): boolean {
  // Check required fields using nullish coalescing
  if (workout.workoutName == null || workout.workoutName.trim() === '') {
    throw new Error('Workout name is required');
  }

  if (workout.sportType == null) {
    throw new Error('Sport type is required');
  }

  if (workout.workoutSegments == null || workout.workoutSegments.length === 0) {
    throw new Error('Workout must have at least one segment');
  }

  // Validate each segment
  for (const segment of workout.workoutSegments) {
    if (segment.workoutSteps == null || segment.workoutSteps.length === 0) {
      throw new Error(`Segment ${segment.segmentOrder} must have at least one step`);
    }

    // Validate segment order is positive
    if (segment.segmentOrder < 1) {
      throw new Error(`Invalid segment order: ${segment.segmentOrder}`);
    }

    // Validate each step
    validateSteps(segment.workoutSteps);
  }

  return true;
}

/**
 * Validates an array of workout steps
 */
function validateSteps(steps: WorkoutStep[]): void {
  const stepOrders = new Set<number>();

  for (const step of steps) {
    // Check for duplicate step orders
    if (stepOrders.has(step.stepOrder)) {
      throw new Error(`Duplicate step order: ${step.stepOrder}`);
    }
    stepOrders.add(step.stepOrder);

    // Validate step order is positive
    if (step.stepOrder < 1) {
      throw new Error(`Invalid step order: ${step.stepOrder}`);
    }

    if (isExecutableStep(step)) {
      validateExecutableStep(step);
    } else if (isRepeatStep(step)) {
      validateRepeatStep(step);
    } else {
      throw new Error(`Unknown step type: ${(step as any).type}`);
    }
  }
}

/**
 * Validates an executable step
 *
 * Uses new validateEndCondition() and validateTarget() functions with
 * exhaustiveness checking and improved error messages.
 */
function validateExecutableStep(step: ExecutableStep): void {
  // Validate end condition exists
  if (step.endCondition == null) {
    throw new Error(`Step ${step.stepOrder} must have an end condition`);
  }

  // Validate end condition value exists
  if (step.endConditionValue == null) {
    throw new Error(`Step ${step.stepOrder} must have an end condition value`);
  }

  // Validate end condition using new Garmin API format (separate value and unit)
  validateEndCondition(
    step.endCondition,
    step.endConditionValue,
    step.preferredEndConditionUnit,
    step.stepOrder
  );

  // Validate target type exists
  if (step.targetType == null) {
    throw new Error(`Step ${step.stepOrder} must have a target type`);
  }

  // Build target object for validation
  const target: Target = {
    targetType: step.targetType,
    targetValueOne: step.targetValueOne ?? undefined,
    targetValueTwo: step.targetValueTwo ?? undefined,
    zoneNumber: step.zoneNumber ?? undefined,
  } as Target;

  // Validate target using discriminated union validation
  validateTarget(target, step.stepOrder);
}

/**
 * Validates a repeat step
 *
 * Uses nullish coalescing (== null) to check for both null and undefined.
 */
function validateRepeatStep(step: RepeatStep): void {
  // Validate iterations
  if (step.numberOfIterations == null || step.numberOfIterations < 1) {
    throw new Error(`Repeat step ${step.stepOrder} must have at least 1 iteration`);
  }

  // Validate child steps
  if (step.workoutSteps == null || step.workoutSteps.length === 0) {
    throw new Error(`Repeat step ${step.stepOrder} must have at least one child step`);
  }

  // Recursively validate child steps
  validateSteps(step.workoutSteps);
}

/**
 * Validates an end condition with exhaustiveness checking (new Garmin API format)
 *
 * In the new format, endCondition is just the type, with value as a separate field.
 * This matches the Garmin API structure exactly.
 *
 * @param condition - The end condition type
 * @param value - The end condition value (seconds, meters, iterations, etc.)
 * @param distanceUnit - Optional distance unit (required for distance conditions)
 * @param stepOrder - Step order for error messages
 * @throws {Error} If condition is invalid or improperly structured
 */
export function validateEndCondition(
  condition: EndCondition,
  value: number,
  distanceUnit: DistanceUnit | null | undefined,
  stepOrder: number
): void {
  const conditionKey = condition.conditionTypeKey;

  switch (conditionKey) {
    case 'time':
      if (value == null) {
        throw new Error(`Step ${stepOrder}: Time condition requires a value (seconds)`);
      }
      if (value <= 0) {
        throw new Error(`Step ${stepOrder}: Time value must be positive`);
      }
      if (distanceUnit !== undefined && distanceUnit !== null) {
        throw new Error(`Step ${stepOrder}: Time condition should not have distanceUnit`);
      }
      break;

    case 'distance':
      if (value == null) {
        throw new Error(`Step ${stepOrder}: Distance condition requires a value`);
      }
      if (value <= 0) {
        throw new Error(`Step ${stepOrder}: Distance value must be positive`);
      }
      if (distanceUnit == null) {
        throw new Error(`Step ${stepOrder}: Distance condition requires a distance unit`);
      }
      break;

    case 'lap.button':
      // Lap button can have value of 1 (for Garmin API)
      if (value !== 1) {
        throw new Error(`Step ${stepOrder}: Lap button condition should have value of 1`);
      }
      if (distanceUnit !== undefined && distanceUnit !== null) {
        throw new Error(`Step ${stepOrder}: Lap button condition should not have distanceUnit`);
      }
      break;

    case 'iterations':
      if (value == null) {
        throw new Error(`Step ${stepOrder}: Iterations condition requires a value`);
      }
      if (value <= 0 || !Number.isInteger(value)) {
        throw new Error(`Step ${stepOrder}: Iterations value must be a positive integer`);
      }
      if (distanceUnit !== undefined && distanceUnit !== null) {
        throw new Error(`Step ${stepOrder}: Iterations condition should not have distanceUnit`);
      }
      break;

    default: {
      // Exhaustiveness check - TypeScript will error if we missed a case
      const _exhaustiveCheck: never = conditionKey;
      throw new Error(`Step ${stepOrder}: Unknown condition type: ${_exhaustiveCheck}`);
    }
  }
}

/**
 * Heart rate zone configuration for validating zone-based targets
 */
export interface HeartRateZoneConfig {
  maxHR: number;
  zones: HeartRateZone[];
}

/**
 * Heart rate zone definition
 */
export interface HeartRateZone {
  zoneNumber: number;
  minHR: number;  // bpm
  maxHR: number;  // bpm
  name?: string;
}

/**
 * Power zone configuration for validating power-based targets
 */
export interface PowerZoneConfig {
  ftp: number;  // Functional Threshold Power in watts
  zones: PowerZone[];
}

/**
 * Power zone definition
 */
export interface PowerZone {
  zoneNumber: number;
  minPower: number;  // watts
  maxPower: number;  // watts
  name?: string;
}

/**
 * Standard HR zones based on % of max HR (Garmin default)
 *
 * Zone 1: 50-60% (Recovery)
 * Zone 2: 60-70% (Aerobic/Easy)
 * Zone 3: 70-80% (Tempo)
 * Zone 4: 80-90% (Threshold)
 * Zone 5: 90-100% (VO2 Max)
 */
export const STANDARD_HR_ZONES = [
  { zoneNumber: 1, minPercent: 50, maxPercent: 60, name: 'Recovery' },
  { zoneNumber: 2, minPercent: 60, maxPercent: 70, name: 'Aerobic/Easy' },
  { zoneNumber: 3, minPercent: 70, maxPercent: 80, name: 'Tempo' },
  { zoneNumber: 4, minPercent: 80, maxPercent: 90, name: 'Threshold' },
  { zoneNumber: 5, minPercent: 90, maxPercent: 100, name: 'VO2 Max' },
] as const;

/**
 * Standard power zones based on % of FTP (Functional Threshold Power)
 *
 * Zone 1: <55% (Active Recovery)
 * Zone 2: 55-75% (Endurance)
 * Zone 3: 75-90% (Tempo)
 * Zone 4: 90-105% (Lactate Threshold)
 * Zone 5: 105-120% (VO2 Max)
 * Zone 6: >120% (Anaerobic Capacity)
 */
export const STANDARD_POWER_ZONES = [
  { zoneNumber: 1, minPercent: 0, maxPercent: 55, name: 'Active Recovery' },
  { zoneNumber: 2, minPercent: 55, maxPercent: 75, name: 'Endurance' },
  { zoneNumber: 3, minPercent: 75, maxPercent: 90, name: 'Tempo' },
  { zoneNumber: 4, minPercent: 90, maxPercent: 105, name: 'Lactate Threshold' },
  { zoneNumber: 5, minPercent: 105, maxPercent: 120, name: 'VO2 Max' },
  { zoneNumber: 6, minPercent: 120, maxPercent: 200, name: 'Anaerobic Capacity' },
] as const;

/**
 * Calculate absolute HR zones from max HR using standard percentages
 *
 * @param maxHR - Maximum heart rate in bpm
 * @returns HeartRateZoneConfig with absolute bpm values
 *
 * @example
 * ```typescript
 * const zones = calculateAbsoluteHRZones(185);
 * // Returns zones with absolute bpm values
 * // Zone 1: 93-111 bpm, Zone 2: 111-130 bpm, etc.
 * ```
 */
export function calculateAbsoluteHRZones(maxHR: number): HeartRateZoneConfig {
  if (maxHR <= 0 || maxHR > 250) {
    throw new Error('Max HR must be between 1 and 250 bpm');
  }

  return {
    maxHR,
    zones: STANDARD_HR_ZONES.map((zone) => ({
      zoneNumber: zone.zoneNumber,
      minHR: Math.round((zone.minPercent / 100) * maxHR),
      maxHR: Math.round((zone.maxPercent / 100) * maxHR),
      name: zone.name,
    })),
  };
}

/**
 * Calculate absolute power zones from FTP using standard percentages
 *
 * @param ftp - Functional Threshold Power in watts
 * @returns PowerZoneConfig with absolute watt values
 *
 * @example
 * ```typescript
 * const zones = calculateAbsolutePowerZones(250);
 * // Returns zones with absolute watt values
 * // Zone 1: 0-138W, Zone 2: 138-188W, etc.
 * ```
 */
export function calculateAbsolutePowerZones(ftp: number): PowerZoneConfig {
  if (ftp <= 0 || ftp > 1000) {
    throw new Error('FTP must be between 1 and 1000 watts');
  }

  return {
    ftp,
    zones: STANDARD_POWER_ZONES.map((zone) => ({
      zoneNumber: zone.zoneNumber,
      minPower: Math.round((zone.minPercent / 100) * ftp),
      maxPower: Math.round((zone.maxPercent / 100) * ftp),
      name: zone.name,
    })),
  };
}

/**
 * Get target values for a specific heart rate zone
 *
 * @param zoneNumber - Zone number (1-5)
 * @param zoneConfig - Heart rate zone configuration
 * @returns Min and max HR for the zone
 *
 * @example
 * ```typescript
 * const config = calculateAbsoluteHRZones(185);
 * const zone3 = getZoneTargetValues(3, config);
 * // Returns { min: 130, max: 148 }
 * ```
 */
export function getZoneTargetValues(
  zoneNumber: number,
  zoneConfig: HeartRateZoneConfig
): { min: number; max: number } {
  const zone = zoneConfig.zones.find((z) => z.zoneNumber === zoneNumber);
  if (!zone) {
    throw new Error(`Zone ${zoneNumber} not found in configuration`);
  }
  return { min: zone.minHR, max: zone.maxHR };
}

/**
 * Validate a heart rate zone configuration
 *
 * @param config - Zone configuration to validate
 * @throws {Error} If configuration is invalid
 *
 * @example
 * ```typescript
 * const config = calculateAbsoluteHRZones(185);
 * validateHeartRateZoneConfig(config); // passes
 * ```
 */
export function validateHeartRateZoneConfig(config: HeartRateZoneConfig): void {
  if (config.maxHR <= 0 || config.maxHR > 250) {
    throw new Error('Max HR must be between 1 and 250 bpm');
  }

  if (config.zones.length === 0) {
    throw new Error('Zone configuration must have at least one zone');
  }

  // Validate each zone
  for (const zone of config.zones) {
    if (zone.zoneNumber <= 0) {
      throw new Error(`Zone number must be positive: ${zone.zoneNumber}`);
    }
    if (zone.minHR < 0 || zone.minHR >= config.maxHR) {
      throw new Error(`Invalid minHR for zone ${zone.zoneNumber}: ${zone.minHR}`);
    }
    if (zone.maxHR <= zone.minHR || zone.maxHR > config.maxHR) {
      throw new Error(`Invalid maxHR for zone ${zone.zoneNumber}: ${zone.maxHR}`);
    }
  }

  // Validate zones don't overlap and are in order
  const sortedZones = [...config.zones].sort((a, b) => a.zoneNumber - b.zoneNumber);
  for (let i = 1; i < sortedZones.length; i++) {
    const prevZone = sortedZones[i - 1];
    const currZone = sortedZones[i];
    if (currZone.minHR < prevZone.maxHR) {
      throw new Error(`Zones ${prevZone.zoneNumber} and ${currZone.zoneNumber} overlap`);
    }
  }
}

/**
 * Validate a power zone configuration
 *
 * @param config - Zone configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validatePowerZoneConfig(config: PowerZoneConfig): void {
  if (config.ftp <= 0 || config.ftp > 1000) {
    throw new Error('FTP must be between 1 and 1000 watts');
  }

  if (config.zones.length === 0) {
    throw new Error('Zone configuration must have at least one zone');
  }

  // Validate each zone
  for (const zone of config.zones) {
    if (zone.zoneNumber <= 0) {
      throw new Error(`Zone number must be positive: ${zone.zoneNumber}`);
    }
    if (zone.minPower < 0) {
      throw new Error(`Invalid minPower for zone ${zone.zoneNumber}: ${zone.minPower}`);
    }
    if (zone.maxPower <= zone.minPower) {
      throw new Error(`Invalid maxPower for zone ${zone.zoneNumber}: ${zone.maxPower}`);
    }
  }

  // Validate zones don't overlap and are in order
  const sortedZones = [...config.zones].sort((a, b) => a.zoneNumber - b.zoneNumber);
  for (let i = 1; i < sortedZones.length; i++) {
    const prevZone = sortedZones[i - 1];
    const currZone = sortedZones[i];
    if (currZone.minPower < prevZone.maxPower) {
      throw new Error(`Zones ${prevZone.zoneNumber} and ${currZone.zoneNumber} overlap`);
    }
  }
}

/**
 * Validates a target with exhaustiveness checking and optional zone configuration
 *
 * This function ensures XOR validation: either use zone number OR custom range (not both).
 * Uses discriminated union pattern with TypeScript exhaustiveness checking.
 *
 * @param target - The target to validate
 * @param stepOrder - Step order for error messages
 * @param zoneConfig - Optional zone configuration for validating zone numbers
 * @throws {Error} If target is invalid or improperly structured
 */
export function validateTarget(
  target: Target,
  stepOrder: number,
  zoneConfig?: HeartRateZoneConfig
): void {
  const targetKey = target.targetType.workoutTargetTypeKey;

  switch (targetKey) {
    case 'no.target':
      // No target should not have any values
      if (target.targetValueOne !== undefined) {
        throw new Error(`Step ${stepOrder}: No target should not have targetValueOne`);
      }
      if (target.targetValueTwo !== undefined) {
        throw new Error(`Step ${stepOrder}: No target should not have targetValueTwo`);
      }
      if (target.zoneNumber !== undefined) {
        throw new Error(`Step ${stepOrder}: No target should not have zoneNumber`);
      }
      break;

    case 'power.zone':
    case 'cadence.zone':
    case 'heart.rate.zone':
    case 'speed.zone':
    case 'pace.zone': {
      // XOR validation: either zoneNumber OR (targetValueOne AND targetValueTwo), not both
      const hasZone = target.zoneNumber != null;
      const hasCustomRange = target.targetValueOne != null && target.targetValueTwo != null;

      if (!hasZone && !hasCustomRange) {
        throw new Error(
          `Step ${stepOrder}: ${targetKey} requires either zone number or custom range (targetValueOne/Two)`
        );
      }

      if (hasZone && hasCustomRange) {
        throw new Error(
          `Step ${stepOrder}: ${targetKey} cannot have both zone number and custom range - use one or the other`
        );
      }

      // Validate zone number if provided
      if (hasZone) {
        if (target.zoneNumber! <= 0 || !Number.isInteger(target.zoneNumber!)) {
          throw new Error(`Step ${stepOrder}: Zone number must be a positive integer`);
        }

        // Validate against zone config if provided (heart rate zones)
        if (targetKey === 'heart.rate.zone' && zoneConfig) {
          const zone = zoneConfig.zones.find((z) => z.zoneNumber === target.zoneNumber);
          if (!zone) {
            throw new Error(
              `Step ${stepOrder}: Invalid zone number ${target.zoneNumber} for heart rate zones`
            );
          }
        }
      }

      // Validate custom range if provided
      if (hasCustomRange) {
        if (target.targetValueOne! <= 0) {
          throw new Error(`Step ${stepOrder}: targetValueOne must be positive`);
        }
        if (target.targetValueTwo! <= 0) {
          throw new Error(`Step ${stepOrder}: targetValueTwo must be positive`);
        }
        if (target.targetValueOne! >= target.targetValueTwo!) {
          throw new Error(
            `Step ${stepOrder}: targetValueOne must be less than targetValueTwo (range: ${target.targetValueOne} - ${target.targetValueTwo})`
          );
        }
      }
      break;
    }

    default: {
      // Exhaustiveness check - TypeScript will error if we missed a case
      const _exhaustiveCheck: never = targetKey;
      throw new Error(`Step ${stepOrder}: Unknown target type: ${_exhaustiveCheck}`);
    }
  }
}

/**
 * Helper to create a zone-based target
 *
 * @example
 * ```typescript
 * const hrZone3 = createZoneTarget(TARGET_TYPE_MAPPING["heart rate"], 3);
 * ```
 */
export function createZoneTarget(targetType: TargetType, zoneNumber: number): Target {
  if (targetType.workoutTargetTypeKey === 'no.target') {
    throw new Error('Cannot create zone target for "no target" type');
  }
  return {
    targetType,
    zoneNumber,
  } as Target;
}

/**
 * Helper to create a custom range target
 *
 * @example
 * ```typescript
 * const paceRange = createCustomRangeTarget(
 *   TARGET_TYPE_MAPPING.pace,
 *   paceMinKmToMetersPerSec(5.0),
 *   paceMinKmToMetersPerSec(5.5)
 * );
 * ```
 */
export function createCustomRangeTarget(
  targetType: TargetType,
  valueOne: number,
  valueTwo: number
): Target {
  if (targetType.workoutTargetTypeKey === 'no.target') {
    throw new Error('Cannot create custom range target for "no target" type');
  }
  return {
    targetType,
    targetValueOne: valueOne,
    targetValueTwo: valueTwo,
  } as Target;
}

/**
 * Helper to create a "no target" target
 *
 * @example
 * ```typescript
 * const openPace = createNoTarget();
 * ```
 */
export function createNoTarget(): Target {
  return {
    targetType: TARGET_TYPE_MAPPING['no target'],
  };
}

/**
 * Distance conversion helper
 *
 * @param value - Distance value
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @returns Converted distance value
 *
 * @example
 * ```typescript
 * const meters = convertDistance(5, DISTANCE_UNIT_MAPPING.km, DISTANCE_UNIT_MAPPING.m);
 * // Returns 5000
 * ```
 */
export function convertDistance(
  value: number,
  fromUnit: DistanceUnit,
  toUnit: DistanceUnit
): number {
  if (value < 0) {
    throw new Error('Distance must be non-negative');
  }
  const meters = value * fromUnit.factor;
  return meters / toUnit.factor;
}

/**
 * Complete workout response from Garmin API
 * Extended version with all workout details (used for scheduling)
 */
export interface WorkoutDetail extends WorkoutResponse {
  subSportType: null;
  trainingPlanId: null;
  author: null;
  sharedWithUsers: null;
  estimatedDurationInSecs: number;
  estimatedDistanceInMeters: number;
  workoutSegments: WorkoutSegment[];
  poolLength: null;
  poolLengthUnit: null;
  locale: null;
  workoutProvider: null;
  workoutSourceId: null;
  uploadTimestamp: null;
  atpPlanId: null;
  consumer: null;
  consumerName: null;
  consumerImageURL: null;
  consumerWebsiteURL: null;
  workoutNameI18nKey: null;
  descriptionI18nKey: null;
  avgTrainingSpeed: number;
  estimateType: null;
  estimatedDistanceUnit: {
    unitId: number | null;
    unitKey: string | null;
    factor: number | null;
  };
  workoutThumbnailUrl: null;
  isSessionTransitionEnabled: null;
  shared: boolean;
}

/**
 * Payload for scheduling a workout to calendar
 * Based on Garmin Connect API format
 *
 * @example
 * ```typescript
 * const schedulePayload: WorkoutSchedulePayload = {
 *   workoutScheduleId: Date.now(),
 *   workout: workoutDetail,
 *   calendarDate: "2025-10-13",
 *   createdDate: "2025-10-12",
 *   ownerId: 106284771,
 *   newName: null,
 *   consumer: null,
 *   atpPlanTypeId: null,
 *   associatedActivityId: null,
 *   priority: null,
 *   associatedActivityDateTime: null,
 *   tpType: null,
 *   nameChanged: false,
 *   protected: false,
 *   race: false,
 *   itp: false
 * };
 * ```
 */
export interface WorkoutSchedulePayload {
  workoutScheduleId: number;
  workout: WorkoutDetail;
  calendarDate: string; // YYYY-MM-DD format
  createdDate: string; // YYYY-MM-DD format
  ownerId: number;
  newName: null;
  consumer: null;
  atpPlanTypeId: null;
  associatedActivityId: null;
  priority: null;
  associatedActivityDateTime: null;
  tpType: null;
  nameChanged: boolean;
  protected: boolean;
  race: boolean;
  itp: boolean;
}

/**
 * Response from scheduling a workout to calendar
 */
export interface WorkoutScheduleResponse {
  workoutScheduleId: number;
  calendarDate: string;
  workoutId: number;
  success: boolean;
  message?: string;
}

/**
 * Scheduled workout information from calendar
 * Contains workout metadata and schedule details
 */
export interface ScheduledWorkout {
  workoutScheduleId: number;
  workoutId: number;
  workoutName: string;
  calendarDate: string; // YYYY-MM-DD format
  sportType: SportType;
  estimatedDurationInSecs: number;
  estimatedDistanceInMeters: number;
  description?: string;
}

/**
 * Response from delete/unschedule operations
 */
export interface DeleteResponse {
  success: boolean;
  message: string;
}

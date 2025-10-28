/**
 * WorkoutBuilder Service
 *
 * Provides a fluent builder pattern for creating Garmin Connect workout payloads.
 * Simplifies workout creation by managing step ordering, validation, and repeat blocks.
 *
 * @example Basic workout with warmup, intervals, and cooldown
 * ```typescript
 * const workout = new WorkoutBuilder("5x1000m Intervals", "running")
 *   .addWarmup(EndConditionFactory.time(10 * 60)) // 10 min
 *   .startRepeat(5)
 *   .addInterval(
 *     EndConditionFactory.distance(1000, "m"),
 *     TargetFactory.pace(4.5, 5.0) // 4:30-5:00 pace
 *   )
 *   .addRecovery(
 *     EndConditionFactory.distance(400, "m"),
 *     TargetFactory.hrZone(2)
 *   )
 *   .endRepeat()
 *   .addCooldown(EndConditionFactory.time(5 * 60))
 *   .build();
 * ```
 */

import type {
  WorkoutPayload,
  WorkoutStep,
  ExecutableStep,
  RepeatStep,
  EndConditionData,
  Target,
  SportType,
  SportTypeName,
  StepType,
  DistanceUnitName,
} from '../types/workout.js';

import {
  SPORT_TYPE_MAPPING,
  STEP_TYPE_MAPPING,
  TARGET_TYPE_MAPPING,
  END_CONDITION_TYPE_MAPPING,
  DISTANCE_UNIT_MAPPING,
  paceMinKmToMetersPerSec,
  validateWorkoutPayload,
} from '../types/workout.js';

/**
 * Factory for creating end conditions with type safety and convenience
 * Returns EndConditionData with separated value field for Garmin API format
 */
export class EndConditionFactory {
  /**
   * Create a time-based end condition
   * @param seconds - Duration in seconds
   * @returns Time-based end condition data
   *
   * @example
   * ```typescript
   * const tenMinutes = EndConditionFactory.time(10 * 60);
   * ```
   */
  static time(seconds: number): EndConditionData {
    if (seconds <= 0) {
      throw new Error('Duration must be positive');
    }
    return {
      endCondition: END_CONDITION_TYPE_MAPPING.time,
      endConditionValue: seconds,
    };
  }

  /**
   * Create a distance-based end condition
   * @param value - Distance value
   * @param unit - Distance unit (m, km, mile)
   * @returns Distance-based end condition data
   *
   * @example
   * ```typescript
   * const oneKm = EndConditionFactory.distance(1, "km");
   * const oneMile = EndConditionFactory.distance(1, "mile");
   * ```
   */
  static distance(value: number, unit: DistanceUnitName = 'm'): EndConditionData {
    if (value <= 0) {
      throw new Error('Distance must be positive');
    }
    const distanceUnit = DISTANCE_UNIT_MAPPING[unit];
    if (!distanceUnit) {
      throw new Error(`Invalid distance unit: ${unit}`);
    }
    return {
      endCondition: END_CONDITION_TYPE_MAPPING.distance,
      endConditionValue: value,
      preferredEndConditionUnit: distanceUnit,
    };
  }

  /**
   * Create a lap button end condition (user-controlled)
   * @returns Lap button end condition data
   *
   * @example
   * ```typescript
   * const userControlled = EndConditionFactory.lapButton();
   * ```
   */
  static lapButton(): EndConditionData {
    return {
      endCondition: END_CONDITION_TYPE_MAPPING['lap.button'],
      endConditionValue: 1, // Garmin expects 1 for lap button
    };
  }
}

/**
 * Factory for creating targets with type safety and convenience
 */
export class TargetFactory {
  /**
   * Create a "no target" target (open pace/effort)
   * @returns No target
   *
   * @example
   * ```typescript
   * const openPace = TargetFactory.noTarget();
   * ```
   */
  static noTarget(): Target {
    return {
      targetType: TARGET_TYPE_MAPPING['no target'],
    };
  }

  /**
   * Create a heart rate zone target
   * @param zoneNumber - HR zone number (1-5)
   * @returns Heart rate zone target
   *
   * @example
   * ```typescript
   * const zone3 = TargetFactory.hrZone(3);
   * ```
   */
  static hrZone(zoneNumber: number): Target {
    if (zoneNumber < 1 || !Number.isInteger(zoneNumber)) {
      throw new Error('Zone number must be a positive integer');
    }
    return {
      targetType: TARGET_TYPE_MAPPING['heart rate'],
      zoneNumber,
    };
  }

  /**
   * Create a custom heart rate range target
   * @param minBpm - Minimum heart rate in bpm
   * @param maxBpm - Maximum heart rate in bpm
   * @returns Custom heart rate target
   *
   * @example
   * ```typescript
   * const hr140to160 = TargetFactory.hrRange(140, 160);
   * ```
   */
  static hrRange(minBpm: number, maxBpm: number): Target {
    if (minBpm <= 0 || maxBpm <= 0) {
      throw new Error('Heart rate must be positive');
    }
    if (minBpm >= maxBpm) {
      throw new Error('Min heart rate must be less than max');
    }
    return {
      targetType: TARGET_TYPE_MAPPING['heart rate'],
      targetValueOne: minBpm,
      targetValueTwo: maxBpm,
    };
  }

  /**
   * Create a pace target in min/km (converted to m/s for Garmin API)
   * @param minMinPerKm - Minimum pace in min/km (e.g., 5.0 for 5:00/km)
   * @param maxMinPerKm - Maximum pace in min/km
   * @returns Pace target in m/s
   *
   * @example
   * ```typescript
   * const pace4to5 = TargetFactory.pace(4.0, 5.0); // 4:00-5:00 min/km
   * ```
   */
  static pace(minMinPerKm: number, maxMinPerKm: number): Target {
    if (minMinPerKm <= 0 || maxMinPerKm <= 0) {
      throw new Error('Pace must be positive');
    }
    if (minMinPerKm >= maxMinPerKm) {
      throw new Error('Min pace must be faster (lower) than max pace');
    }
    // Convert min/km to m/s (faster pace = higher m/s)
    // Note: min pace in min/km = max pace in m/s
    const maxMetersPerSec = paceMinKmToMetersPerSec(minMinPerKm);
    const minMetersPerSec = paceMinKmToMetersPerSec(maxMinPerKm);
    return {
      targetType: TARGET_TYPE_MAPPING.pace,
      targetValueOne: minMetersPerSec,
      targetValueTwo: maxMetersPerSec,
    };
  }

  /**
   * Create a power zone target (for cycling)
   * @param zoneNumber - Power zone number (1-6)
   * @returns Power zone target
   *
   * @example
   * ```typescript
   * const zone4 = TargetFactory.powerZone(4);
   * ```
   */
  static powerZone(zoneNumber: number): Target {
    if (zoneNumber < 1 || !Number.isInteger(zoneNumber)) {
      throw new Error('Zone number must be a positive integer');
    }
    return {
      targetType: TARGET_TYPE_MAPPING.power,
      zoneNumber,
    };
  }

  /**
   * Create a custom power range target
   * @param minWatts - Minimum power in watts
   * @param maxWatts - Maximum power in watts
   * @returns Custom power target
   *
   * @example
   * ```typescript
   * const power200to250 = TargetFactory.powerRange(200, 250);
   * ```
   */
  static powerRange(minWatts: number, maxWatts: number): Target {
    if (minWatts <= 0 || maxWatts <= 0) {
      throw new Error('Power must be positive');
    }
    if (minWatts >= maxWatts) {
      throw new Error('Min power must be less than max power');
    }
    return {
      targetType: TARGET_TYPE_MAPPING.power,
      targetValueOne: minWatts,
      targetValueTwo: maxWatts,
    };
  }

  /**
   * Create a cadence range target
   * @param minRpm - Minimum cadence in rpm
   * @param maxRpm - Maximum cadence in rpm
   * @returns Cadence target
   *
   * @example
   * ```typescript
   * const cadence80to90 = TargetFactory.cadence(80, 90);
   * ```
   */
  static cadence(minRpm: number, maxRpm: number): Target {
    if (minRpm <= 0 || maxRpm <= 0) {
      throw new Error('Cadence must be positive');
    }
    if (minRpm >= maxRpm) {
      throw new Error('Min cadence must be less than max cadence');
    }
    return {
      targetType: TARGET_TYPE_MAPPING.cadence,
      targetValueOne: minRpm,
      targetValueTwo: maxRpm,
    };
  }
}

/**
 * WorkoutBuilder - Fluent builder for creating workout payloads
 *
 * Manages step ordering, validation, and repeat blocks automatically.
 * Provides a simple, chainable API for workout creation.
 */
export class WorkoutBuilder {
  private workoutName: string;
  private sportType: SportType;
  private description: string | undefined = undefined;
  private steps: WorkoutStep[] = [];
  private currentStepOrder = 1;

  // Repeat state management
  private repeatStack: Array<{
    startStepOrder: number;
    repetitions: number;
    childSteps: WorkoutStep[];
    childStepOrder: number;
  }> = [];

  /**
   * Create a new workout builder
   * @param name - Workout name
   * @param sport - Sport type
   *
   * @example
   * ```typescript
   * const builder = new WorkoutBuilder("Morning Run", "running");
   * ```
   */
  constructor(name: string, sport: SportTypeName) {
    if (!name || name.trim() === '') {
      throw new Error('Workout name is required');
    }
    const sportType = SPORT_TYPE_MAPPING[sport];
    if (!sportType) {
      throw new Error(`Invalid sport type: ${sport}`);
    }
    this.workoutName = name.trim();
    this.sportType = sportType;
  }

  /**
   * Set workout description
   * @param description - Workout description
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.setDescription("Easy recovery run");
   * ```
   */
  setDescription(description: string): this {
    this.description = description.trim() || undefined;
    return this;
  }

  /**
   * Add a warmup step
   * @param endConditionData - When the warmup ends (with separated value)
   * @param target - Optional intensity target
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addWarmup(EndConditionFactory.time(10 * 60));
   * builder.addWarmup(
   *   EndConditionFactory.time(10 * 60),
   *   TargetFactory.hrZone(2)
   * );
   * ```
   */
  addWarmup(endConditionData: EndConditionData, target?: Target): this {
    return this.addExecutableStep(STEP_TYPE_MAPPING.warmup, endConditionData, target);
  }

  /**
   * Add a cooldown step
   * @param endConditionData - When the cooldown ends (with separated value)
   * @param target - Optional intensity target
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addCooldown(EndConditionFactory.time(5 * 60));
   * ```
   */
  addCooldown(endConditionData: EndConditionData, target?: Target): this {
    return this.addExecutableStep(STEP_TYPE_MAPPING.cooldown, endConditionData, target);
  }

  /**
   * Add an interval step
   * @param endConditionData - When the interval ends (with separated value)
   * @param target - Optional intensity target
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addInterval(
   *   EndConditionFactory.distance(1000, "m"),
   *   TargetFactory.pace(4.0, 4.5)
   * );
   * ```
   */
  addInterval(endConditionData: EndConditionData, target?: Target): this {
    return this.addExecutableStep(STEP_TYPE_MAPPING.interval, endConditionData, target);
  }

  /**
   * Add a recovery step
   * @param endConditionData - When the recovery ends (with separated value)
   * @param target - Optional intensity target
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addRecovery(
   *   EndConditionFactory.distance(400, "m"),
   *   TargetFactory.hrZone(2)
   * );
   * ```
   */
  addRecovery(endConditionData: EndConditionData, target?: Target): this {
    return this.addExecutableStep(STEP_TYPE_MAPPING.recovery, endConditionData, target);
  }

  /**
   * Add a rest step
   * @param endConditionData - When the rest ends (with separated value)
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addRest(EndConditionFactory.time(60)); // 1 min rest
   * ```
   */
  addRest(endConditionData: EndConditionData): this {
    return this.addExecutableStep(STEP_TYPE_MAPPING.rest, endConditionData);
  }

  /**
   * Start a repeat block
   * @param repetitions - Number of times to repeat
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder
   *   .startRepeat(5)
   *   .addInterval(...)
   *   .addRecovery(...)
   *   .endRepeat();
   * ```
   */
  startRepeat(repetitions: number): this {
    if (repetitions < 1 || !Number.isInteger(repetitions)) {
      throw new Error('Repetitions must be a positive integer');
    }
    this.repeatStack.push({
      startStepOrder: this.currentStepOrder,
      repetitions,
      childSteps: [],
      childStepOrder: 1,
    });
    return this;
  }

  /**
   * End the current repeat block
   * @returns this builder for chaining
   *
   * @throws {Error} If no repeat block is open
   *
   * @example
   * ```typescript
   * builder
   *   .startRepeat(5)
   *   .addInterval(...)
   *   .endRepeat();
   * ```
   */
  endRepeat(): this {
    const repeatState = this.repeatStack.pop();
    if (!repeatState) {
      throw new Error('No repeat block to end');
    }

    if (repeatState.childSteps.length === 0) {
      throw new Error('Repeat block must contain at least one step');
    }

    const repeatStep: RepeatStep = {
      type: 'RepeatGroupDTO',
      stepId: 0, // Will be set by assignStepIds() in build()
      stepOrder: this.currentStepOrder++,
      numberOfIterations: repeatState.repetitions,
      smartRepeat: false,
      childStepId: 1, // Fixed for repeat groups
      stepType: STEP_TYPE_MAPPING.repeat,
      workoutSteps: repeatState.childSteps,
    };

    // Add to parent or main steps
    if (this.repeatStack.length > 0) {
      const parent = this.repeatStack[this.repeatStack.length - 1];
      parent.childSteps.push(repeatStep);
    } else {
      this.steps.push(repeatStep);
    }

    return this;
  }

  /**
   * Convenience method: Add interval + recovery repeat block
   * @param repetitions - Number of repetitions
   * @param intervalEnd - Interval end condition data
   * @param intervalTarget - Interval target
   * @param recoveryEnd - Recovery end condition data
   * @param recoveryTarget - Optional recovery target
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addIntervalRepeat(
   *   5,
   *   EndConditionFactory.distance(1000, "m"),
   *   TargetFactory.pace(4.0, 4.5),
   *   EndConditionFactory.distance(400, "m"),
   *   TargetFactory.hrZone(2)
   * );
   * ```
   */
  addIntervalRepeat(
    repetitions: number,
    intervalEnd: EndConditionData,
    intervalTarget: Target,
    recoveryEnd: EndConditionData,
    recoveryTarget?: Target
  ): this {
    return this.startRepeat(repetitions)
      .addInterval(intervalEnd, intervalTarget)
      .addRecovery(recoveryEnd, recoveryTarget)
      .endRepeat();
  }

  /**
   * Convenience method: Add easy run (time-based, no target)
   * @param minutes - Duration in minutes
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addEasyRun(30); // 30 minute easy run
   * ```
   */
  addEasyRun(minutes: number): this {
    return this.addInterval(EndConditionFactory.time(minutes * 60));
  }

  /**
   * Convenience method: Add tempo run (time-based, HR zone 3-4)
   * @param minutes - Duration in minutes
   * @param zone - Optional HR zone (default: 3)
   * @returns this builder for chaining
   *
   * @example
   * ```typescript
   * builder.addTempoRun(20); // 20 min tempo in zone 3
   * builder.addTempoRun(20, 4); // 20 min tempo in zone 4
   * ```
   */
  addTempoRun(minutes: number, zone: number = 3): this {
    return this.addInterval(EndConditionFactory.time(minutes * 60), TargetFactory.hrZone(zone));
  }

  /**
   * Build the final workout payload
   * @returns Complete workout payload ready for Garmin API
   *
   * @throws {Error} If workout structure is invalid
   * @throws {Error} If repeat blocks are not closed
   *
   * @example
   * ```typescript
   * const workout = builder.build();
   * ```
   */
  build(): WorkoutPayload {
    // Check for unclosed repeat blocks
    if (this.repeatStack.length > 0) {
      throw new Error(`${this.repeatStack.length} unclosed repeat block(s)`);
    }

    // Check for at least one step
    if (this.steps.length === 0) {
      throw new Error('Workout must have at least one step');
    }

    // Assign sequential stepId to all steps
    this.assignStepIds(this.steps);

    const payload: WorkoutPayload = {
      workoutName: this.workoutName,
      description: this.description,
      sportType: this.sportType,
      subSportType: null, // Required by Garmin API
      workoutSegments: [
        {
          segmentOrder: 1,
          sportType: this.sportType,
          workoutSteps: this.steps,
        },
      ],
      // Required Garmin API fields
      estimatedDistanceUnit: { unitKey: null },
      avgTrainingSpeed: 3.0,
      estimatedDurationInSecs: 0,
      estimatedDistanceInMeters: 0,
      estimateType: null,
      isWheelchair: false,
    };

    // Validate before returning
    validateWorkoutPayload(payload);

    return payload;
  }

  /**
   * Recursively assign sequential stepId to all steps
   */
  private assignStepIds(steps: WorkoutStep[], startId = 1): number {
    let currentId = startId;
    for (const step of steps) {
      if (step.type === 'ExecutableStepDTO') {
        step.stepId = currentId++;
      } else if (step.type === 'RepeatGroupDTO') {
        // Repeat groups get stepId too
        step.stepId = currentId++;
        // Recursively assign to child steps starting from 1
        this.assignStepIds(step.workoutSteps, 1);
      }
    }
    return currentId;
  }

  /**
   * Private helper: Add an executable step
   */
  private addExecutableStep(
    stepType: StepType,
    endConditionData: EndConditionData,
    target?: Target
  ): this {
    const resolvedTarget = target || TargetFactory.noTarget();

    const step: ExecutableStep = {
      type: 'ExecutableStepDTO',
      stepId: 0, // Will be set by assignStepIds() in build()
      stepOrder: 0, // Will be set below
      childStepId: null,
      description: null,
      stepType,
      // Garmin API format: endCondition is just the type, value is separate
      endCondition: endConditionData.endCondition,
      endConditionValue: endConditionData.endConditionValue,
      endConditionCompare: null,
      endConditionZone: null,
      preferredEndConditionUnit: endConditionData.preferredEndConditionUnit ?? null,
      targetType: resolvedTarget.targetType,
      targetValueOne: resolvedTarget.targetValueOne ?? null,
      targetValueTwo: resolvedTarget.targetValueTwo ?? null,
      zoneNumber: resolvedTarget.zoneNumber ?? null,
      exerciseName: null,
      strokeType: null,
      equipmentType: null,
      category: null,
    };

    // Add to current repeat block or main steps
    if (this.repeatStack.length > 0) {
      const currentRepeat = this.repeatStack[this.repeatStack.length - 1];
      step.stepOrder = currentRepeat.childStepOrder++;
      currentRepeat.childSteps.push(step);
    } else {
      step.stepOrder = this.currentStepOrder++;
      this.steps.push(step);
    }

    return this;
  }
}

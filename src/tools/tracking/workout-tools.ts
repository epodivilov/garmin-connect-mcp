/**
 * @fileoverview Garmin Connect workout creation and scheduling tools
 *
 * Provides tools for creating structured running workouts and scheduling them to the Garmin
 * Connect calendar. Supports complex workout structures including warmup, intervals, recovery,
 * cooldown, rest, and repeat blocks. Enables time-based, distance-based, and lap-button
 * durations with pace zones, HR zones, or no-target intensity control. Handles input validation,
 * workout payload building, API communication, and error transformation for user-friendly
 * responses. Essential for programmatic workout creation and automated training plan deployment.
 *
 * Tools provided:
 * - createRunningWorkout: Create structured running workout with steps (warmup, interval, recovery, cooldown, repeat)
 * - scheduleWorkout: Schedule a workout to a specific date in Garmin Connect calendar
 *
 * @category Tracking
 * @see ../../services/workoutBuilder for workout structure building
 * @see ../../client/garmin-client for Garmin Connect API integration
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { GarminClient } from '../../client/garmin-client.js';
import { WorkoutBuilder, EndConditionFactory, TargetFactory } from '../../services/workoutBuilder.js';
import type { EndConditionData, Target, DistanceUnitName } from '../../types/workout.js';
import { ToolResult } from '../../types/garmin-types.js';
import { logger } from '../../utils/logger.js';
import {
  CreateRunningWorkoutParams,
  ScheduleWorkoutParams,
  DeleteWorkoutParams,
  UnscheduleWorkoutParams,
  UpdateWorkoutParams,
  GetScheduledWorkoutsParams,
} from '../../types/tool-params.js';

/**
 * Input schema types for MCP tool
 */
interface StepDuration {
  type: 'time' | 'distance' | 'lap_button';
  value?: number;
  unit?: DistanceUnitName;
}

interface StepTarget {
  type: 'pace' | 'hr_zone' | 'no_target';
  minValue?: number;
  maxValue?: number;
  zone?: number;
}

interface WorkoutStepInput {
  type: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest' | 'repeat';
  duration: StepDuration;
  target?: StepTarget;
  numberOfRepetitions?: number;
  childSteps?: WorkoutStepInput[];
}

interface CreateRunningWorkoutArgs {
  name: string;
  description?: string;
  steps: WorkoutStepInput[];
}

interface ScheduleWorkoutArgs {
  workoutId: number;
  date: string; // YYYY-MM-DD format
}

/**
 * WorkoutTools class providing MCP tool implementations for workout creation
 */
export class WorkoutTools {
  constructor(private garminClient: GarminClient) {}

  /**
   * Create a running workout in Garmin Connect
   *
   * Validates input, builds workout payload, and uploads to Garmin API.
   * Returns workout ID on success or user-friendly error messages on failure.
   *
   * @param params - Typed parameters for workout creation
   * @returns MCP tool response with workout ID or error
   */
  async createRunningWorkout(params: CreateRunningWorkoutParams): Promise<ToolResult> {
    try {
      // Task 3: Input Validation
      const validated = this.validateInput(params);

      // Task 4: Build Workout
      const builder = new WorkoutBuilder(validated.name, 'running');

      if (validated.description) {
        builder.setDescription(validated.description);
      }

      // Process steps
      this.buildSteps(builder, validated.steps);

      const payload = builder.build();

      // Task 5: Upload to Garmin API
      const response = await this.garminClient.createWorkout(payload);

      // Return success response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            workoutId: response.workoutId,
            workoutName: response.workoutName,
            message: `Successfully created workout "${response.workoutName}"`,
            createdDate: response.createdDate,
          }, null, 2)
        }]
      };

    } catch (error) {
      logger.error('Failed to create running workout:', error);

      // Transform error to user-friendly message
      const errorMessage = this.transformError(error);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Task 3: Validate input arguments
   *
   * Validates name, steps array, and each step's structure.
   * Returns validated data or throws descriptive errors.
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateInput(args: any): CreateRunningWorkoutArgs {
    // Validate name
    if (!args.name || typeof args.name !== 'string' || args.name.trim() === '') {
      throw new Error('Workout name is required and must be a non-empty string');
    }

    // Validate description (optional)
    if (args.description !== undefined && typeof args.description !== 'string') {
      throw new Error('Description must be a string');
    }

    // Validate steps array
    if (!Array.isArray(args.steps) || args.steps.length === 0) {
      throw new Error('Steps array is required and must contain at least one step');
    }

    // Validate each step
    // Intentional 'any' for runtime validation before type conversion
    args.steps.forEach((step: any, index: number) => {
      this.validateStep(step, index);
    });

    return {
      name: args.name.trim(),
      description: args.description?.trim(),
      steps: args.steps
    };
  }

  /**
   * Validate a single step
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateStep(step: any, index: number): void {
    const stepPrefix = `Step ${index + 1}`;

    // Validate step type
    const validTypes = ['warmup', 'interval', 'recovery', 'cooldown', 'rest', 'repeat'];
    if (!step.type || !validTypes.includes(step.type)) {
      throw new Error(`${stepPrefix}: type must be one of ${validTypes.join(', ')}`);
    }

    // Validate duration (not required for repeat blocks)
    if (step.type !== 'repeat') {
      if (!step.duration || typeof step.duration !== 'object') {
        throw new Error(`${stepPrefix}: duration is required and must be an object`);
      }

      this.validateDuration(step.duration, stepPrefix);
    }

    // Validate target (optional, but if present must be valid)
    if (step.target !== undefined) {
      this.validateTarget(step.target, stepPrefix);
    }

    // Validate repeat-specific fields
    if (step.type === 'repeat') {
      if (!step.numberOfRepetitions || typeof step.numberOfRepetitions !== 'number' ||
          step.numberOfRepetitions < 1 || !Number.isInteger(step.numberOfRepetitions)) {
        throw new Error(`${stepPrefix}: numberOfRepetitions is required and must be a positive integer for repeat blocks`);
      }

      if (!Array.isArray(step.childSteps) || step.childSteps.length === 0) {
        throw new Error(`${stepPrefix}: childSteps array is required and must contain at least one step for repeat blocks`);
      }

      // Recursively validate child steps
      // Intentional 'any' for runtime validation before type conversion
      step.childSteps.forEach((childStep: any, childIndex: number) => {
        this.validateStep(childStep, childIndex);
      });
    }
  }

  /**
   * Validate duration object
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateDuration(duration: any, stepPrefix: string): void {
    const validTypes = ['time', 'distance', 'lap_button'];
    if (!duration.type || !validTypes.includes(duration.type)) {
      throw new Error(`${stepPrefix}: duration.type must be one of ${validTypes.join(', ')}`);
    }

    // Time-based: requires value in seconds
    if (duration.type === 'time') {
      if (typeof duration.value !== 'number' || duration.value <= 0) {
        throw new Error(`${stepPrefix}: duration.value must be a positive number (seconds) for time-based duration`);
      }
    }

    // Distance-based: requires value and unit
    if (duration.type === 'distance') {
      if (typeof duration.value !== 'number' || duration.value <= 0) {
        throw new Error(`${stepPrefix}: duration.value must be a positive number for distance-based duration`);
      }

      const validUnits = ['m', 'km', 'mile'];
      if (!duration.unit || !validUnits.includes(duration.unit)) {
        throw new Error(`${stepPrefix}: duration.unit must be one of ${validUnits.join(', ')} for distance-based duration`);
      }
    }

    // Lap button: no value required
    if (duration.type === 'lap_button') {
      // No additional validation needed
    }
  }

  /**
   * Validate target object
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateTarget(target: any, stepPrefix: string): void {
    const validTypes = ['pace', 'hr_zone', 'no_target'];
    if (!target.type || !validTypes.includes(target.type)) {
      throw new Error(`${stepPrefix}: target.type must be one of ${validTypes.join(', ')}`);
    }

    // Pace target: requires minValue and maxValue
    if (target.type === 'pace') {
      if (typeof target.minValue !== 'number' || target.minValue <= 0) {
        throw new Error(`${stepPrefix}: target.minValue must be a positive number (min/km) for pace target`);
      }
      if (typeof target.maxValue !== 'number' || target.maxValue <= 0) {
        throw new Error(`${stepPrefix}: target.maxValue must be a positive number (min/km) for pace target`);
      }
      if (target.minValue >= target.maxValue) {
        throw new Error(`${stepPrefix}: target.minValue must be less than target.maxValue (faster pace has lower value)`);
      }
    }

    // HR zone target: requires zone number
    if (target.type === 'hr_zone') {
      if (typeof target.zone !== 'number' || target.zone < 1 || !Number.isInteger(target.zone)) {
        throw new Error(`${stepPrefix}: target.zone must be a positive integer for hr_zone target`);
      }
    }

    // No target: no additional validation needed
  }

  /**
   * Task 4: Build workout steps using WorkoutBuilder
   */
  private buildSteps(builder: WorkoutBuilder, steps: WorkoutStepInput[]): void {
    for (const step of steps) {
      this.buildStep(builder, step);
    }
  }

  /**
   * Build a single step
   */
  private buildStep(builder: WorkoutBuilder, step: WorkoutStepInput): void {
    if (step.type === 'repeat') {
      // Handle repeat block
      builder.startRepeat(step.numberOfRepetitions!);

      // Build child steps
      for (const childStep of step.childSteps!) {
        this.buildStep(builder, childStep);
      }

      builder.endRepeat();
    } else {
      // Handle executable step
      const endCondition = this.createEndCondition(step.duration);
      const target = step.target ? this.createTarget(step.target) : undefined;

      switch (step.type) {
        case 'warmup':
          builder.addWarmup(endCondition, target);
          break;
        case 'interval':
          builder.addInterval(endCondition, target);
          break;
        case 'recovery':
          builder.addRecovery(endCondition, target);
          break;
        case 'cooldown':
          builder.addCooldown(endCondition, target);
          break;
        case 'rest':
          builder.addRest(endCondition);
          break;
      }
    }
  }

  /**
   * Task 4: Create EndConditionData from duration input
   */
  private createEndCondition(duration: StepDuration): EndConditionData {
    switch (duration.type) {
      case 'time':
        return EndConditionFactory.time(duration.value!);
      case 'distance':
        return EndConditionFactory.distance(duration.value!, duration.unit!);
      case 'lap_button':
        return EndConditionFactory.lapButton();
      default:
        throw new Error(`Unknown duration type: ${(duration as any).type}`);
    }
  }

  /**
   * Task 4: Create Target from target input
   */
  private createTarget(target: StepTarget): Target {
    switch (target.type) {
      case 'pace':
        return TargetFactory.pace(target.minValue!, target.maxValue!);
      case 'hr_zone':
        return TargetFactory.hrZone(target.zone!);
      case 'no_target':
        return TargetFactory.noTarget();
      default:
        throw new Error(`Unknown target type: ${(target as any).type}`);
    }
  }

  /**
   * Schedule a workout to a specific date in Garmin Connect calendar
   *
   * Validates input, schedules the workout, and returns confirmation.
   * Returns schedule ID on success or user-friendly error messages on failure.
   *
   * @param params - Typed parameters for workout scheduling
   * @returns MCP tool response with schedule confirmation or error
   */
  async scheduleWorkout(params: ScheduleWorkoutParams): Promise<ToolResult> {
    try {
      // Validate input
      const validated = this.validateScheduleInput(params);

      // Parse date
      const date = new Date(validated.date);

      // Schedule workout
      const response = await this.garminClient.scheduleWorkout(
        validated.workoutId,
        date
      );

      // Return success response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            workoutScheduleId: response.workoutScheduleId,
            workoutId: response.workoutId,
            calendarDate: response.calendarDate,
            message: response.message,
          }, null, 2)
        }]
      };

    } catch (error) {
      logger.error('Failed to schedule workout:', error);

      // Transform error to user-friendly message
      const errorMessage = this.transformScheduleError(error);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Validate schedule workout input arguments
   *
   * Validates workoutId and date format.
   * Returns validated data or throws descriptive errors.
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateScheduleInput(args: any): ScheduleWorkoutArgs {
    // Validate workoutId
    if (!args.workoutId || typeof args.workoutId !== 'number' || args.workoutId <= 0) {
      throw new Error('workoutId is required and must be a positive number');
    }

    // Validate date
    if (!args.date || typeof args.date !== 'string') {
      throw new Error('date is required and must be a string in YYYY-MM-DD format');
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(args.date)) {
      throw new Error('date must be in YYYY-MM-DD format (e.g., "2025-10-13")');
    }

    // Validate date is parseable
    const parsedDate = new Date(args.date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date: ${args.date}`);
    }

    // Check if date is in the past (optional warning)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      logger.warn(`Scheduling workout for past date: ${args.date}`);
    }

    return {
      workoutId: args.workoutId,
      date: args.date
    };
  }

  /**
   * Transform scheduling errors to user-friendly messages
   */
  private transformScheduleError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Validation errors
      if (message.includes('required') || message.includes('must be') ||
          message.includes('format') || message.includes('Invalid date')) {
        return `Validation error: ${message}`;
      }

      // Workout not found
      if (message.includes('not found')) {
        return `Workout not found: The specified workout ID does not exist. Please verify the workout ID.`;
      }

      // Authentication errors
      if (message.includes('authentication') || message.includes('login')) {
        return `Authentication error: Unable to connect to Garmin Connect. Please check your credentials.`;
      }

      // Garmin API errors
      if (message.includes('Bad request')) {
        return `Garmin API error: Invalid scheduling data. Please check the workout ID and date.`;
      }

      if (message.includes('server error') || message.includes('503')) {
        return `Garmin service error: The Garmin Connect service is temporarily unavailable. Please try again later.`;
      }

      // Generic error
      return message;
    }

    return 'An unknown error occurred while scheduling the workout';
  }

  /**
   * Task 5: Transform errors to user-friendly messages
   */
  private transformError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Validation errors (from our validation or WorkoutBuilder)
      if (message.includes('required') || message.includes('must be') ||
          message.includes('invalid') || message.includes('Step ')) {
        return `Validation error: ${message}`;
      }

      // Garmin API errors
      if (message.includes('Bad request')) {
        return `Garmin API error: The workout structure is invalid. Please check your step configuration.`;
      }

      if (message.includes('authentication') || message.includes('login')) {
        return `Authentication error: Unable to connect to Garmin Connect. Please check your credentials.`;
      }

      if (message.includes('server error') || message.includes('503')) {
        return `Garmin service error: The Garmin Connect service is temporarily unavailable. Please try again later.`;
      }

      // Generic error
      return message;
    }

    return 'An unknown error occurred while creating the workout';
  }

  /**
   * Delete a workout from Garmin Connect library
   *
   * Permanently removes a workout from the user's workout library.
   * The workout cannot be recovered after deletion.
   *
   * @param params - Typed parameters for workout deletion
   * @returns MCP tool response with deletion confirmation or error
   */
  async deleteWorkout(params: DeleteWorkoutParams): Promise<ToolResult> {
    try {
      // Validate input
      const validated = this.validateDeleteInput(params);

      // Delete workout via Garmin API
      const response = await this.garminClient.deleteWorkout(validated.workoutId);

      // Return success response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            workoutId: validated.workoutId,
            message: response.message,
          }, null, 2)
        }]
      };

    } catch (error) {
      logger.error('Failed to delete workout:', error);

      // Transform error to user-friendly message
      const errorMessage = this.transformDeleteError(error);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Unschedule a workout from a specific date in calendar
   *
   * Removes a scheduled workout from the calendar without deleting it
   * from the library. The workout remains available for future scheduling.
   *
   * @param params - Typed parameters for workout unscheduling
   * @returns MCP tool response with unschedule confirmation or error
   */
  async unscheduleWorkout(params: UnscheduleWorkoutParams): Promise<ToolResult> {
    try {
      // Validate input
      const validated = this.validateUnscheduleInput(params);

      // Parse date
      const date = new Date(validated.date);

      // Unschedule workout via Garmin API
      const response = await this.garminClient.unscheduleWorkout(
        validated.workoutId,
        date
      );

      // Return success response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            workoutId: validated.workoutId,
            date: validated.date,
            message: response.message,
          }, null, 2)
        }]
      };

    } catch (error) {
      logger.error('Failed to unschedule workout:', error);

      // Transform error to user-friendly message
      const errorMessage = this.transformUnscheduleError(error);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Update an existing workout in Garmin Connect
   *
   * Updates workout name, description, or steps. At least one field must be provided.
   * If steps are provided, they completely replace the existing steps.
   *
   * @param params - Typed parameters for workout update
   * @returns MCP tool response with updated workout details or error
   */
  async updateWorkout(params: UpdateWorkoutParams): Promise<ToolResult> {
    try {
      // Validate input
      const validated = this.validateUpdateInput(params);

      // Get current workout to preserve fields not being updated
      // We need the full workout structure for the PUT request
      const builder = new WorkoutBuilder(
        validated.name || 'Updated Workout',
        'running'
      );

      if (validated.description) {
        builder.setDescription(validated.description);
      }

      // Build steps if provided
      if (validated.steps) {
        this.buildSteps(builder, validated.steps);
      }

      const payload = builder.build();

      // Update workout via Garmin API
      const response = await this.garminClient.updateWorkout(
        validated.workoutId,
        payload
      );

      // Return success response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            workoutId: response.workoutId,
            workoutName: response.workoutName,
            message: `Successfully updated workout "${response.workoutName}"`,
            updatedDate: response.updatedDate,
          }, null, 2)
        }]
      };

    } catch (error) {
      logger.error('Failed to update workout:', error);

      // Transform error to user-friendly message
      const errorMessage = this.transformUpdateError(error);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Get scheduled workouts from Garmin Connect calendar
   *
   * Retrieves all workouts scheduled within the specified date range.
   * Defaults to the current week (Monday to Sunday).
   *
   * @param params - Typed parameters for getting scheduled workouts
   * @returns MCP tool response with list of scheduled workouts or error
   */
  async getScheduledWorkouts(params: GetScheduledWorkoutsParams): Promise<ToolResult> {
    try {
      // Validate input and calculate date range
      const validated = this.validateGetScheduledInput(params);

      // Parse dates
      const startDate = new Date(validated.startDate);
      const endDate = new Date(validated.endDate);

      // Get scheduled workouts via Garmin API
      const workouts = await this.garminClient.getScheduledWorkouts(startDate, endDate);

      // Format response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            startDate: validated.startDate,
            endDate: validated.endDate,
            count: workouts.length,
            workouts: workouts.map(w => ({
              workoutScheduleId: w.workoutScheduleId,
              workoutId: w.workoutId,
              workoutName: w.workoutName,
              date: w.calendarDate,
              sportType: w.sportType?.sportTypeKey || 'unknown',
              estimatedDuration: w.estimatedDurationInSecs
                ? `${Math.floor(w.estimatedDurationInSecs / 60)} minutes`
                : 'N/A',
              estimatedDistance: w.estimatedDistanceInMeters
                ? `${(w.estimatedDistanceInMeters / 1000).toFixed(2)} km`
                : 'N/A',
              description: w.description || 'No description',
            })),
          }, null, 2)
        }]
      };

    } catch (error) {
      logger.error('Failed to get scheduled workouts:', error);

      // Transform error to user-friendly message
      const errorMessage = this.transformGetScheduledError(error);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Validate delete workout input
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateDeleteInput(args: any): { workoutId: string } {
    if (!args.workoutId || typeof args.workoutId !== 'string') {
      throw new Error('workoutId is required and must be a string');
    }

    return {
      workoutId: args.workoutId,
    };
  }

  /**
   * Validate unschedule workout input
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateUnscheduleInput(args: any): { workoutId: number; date: string } {
    // Validate workoutId
    if (!args.workoutId || typeof args.workoutId !== 'number' || args.workoutId <= 0) {
      throw new Error('workoutId is required and must be a positive number');
    }

    // Validate date
    if (!args.date || typeof args.date !== 'string') {
      throw new Error('date is required and must be a string in YYYY-MM-DD format');
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(args.date)) {
      throw new Error('date must be in YYYY-MM-DD format (e.g., "2025-10-13")');
    }

    // Validate date is parseable
    const parsedDate = new Date(args.date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date: ${args.date}`);
    }

    return {
      workoutId: args.workoutId,
      date: args.date,
    };
  }

  /**
   * Validate update workout input
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateUpdateInput(args: any): {
    workoutId: number;
    name?: string;
    description?: string;
    steps?: WorkoutStepInput[];
  } {
    // Validate workoutId
    if (!args.workoutId || typeof args.workoutId !== 'number' || args.workoutId <= 0) {
      throw new Error('workoutId is required and must be a positive number');
    }

    // At least one field must be provided
    if (!args.name && !args.description && !args.steps) {
      throw new Error('At least one field (name, description, or steps) must be provided for update');
    }

    // Validate name if provided
    if (args.name !== undefined) {
      if (typeof args.name !== 'string' || args.name.trim() === '') {
        throw new Error('name must be a non-empty string');
      }
    }

    // Validate description if provided
    if (args.description !== undefined && typeof args.description !== 'string') {
      throw new Error('description must be a string');
    }

    // Validate steps if provided
    if (args.steps !== undefined) {
      if (!Array.isArray(args.steps) || args.steps.length === 0) {
        throw new Error('steps must be a non-empty array');
      }

      // Validate each step
      // Intentional 'any' for runtime validation before type conversion
      args.steps.forEach((step: any, index: number) => {
        this.validateStep(step, index);
      });
    }

    return {
      workoutId: args.workoutId,
      name: args.name?.trim(),
      description: args.description?.trim(),
      steps: args.steps,
    };
  }

  /**
   * Validate get scheduled workouts input and calculate date range
   *
   * Intentional 'any' for runtime validation before type conversion
   */
  private validateGetScheduledInput(args: any): { startDate: string; endDate: string } {
    let startDate: string;
    let endDate: string;

    // If dates not provided, default to current week (Monday to Sunday)
    if (!args.startDate || !args.endDate) {
      const today = new Date();
      const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...

      // Calculate Monday of current week
      const monday = new Date(today);
      const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days
      monday.setDate(today.getDate() + daysToMonday);

      // Calculate Sunday of current week
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      startDate = monday.toISOString().split('T')[0];
      endDate = sunday.toISOString().split('T')[0];
    } else {
      startDate = args.startDate;
      endDate = args.endDate;
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate)) {
      throw new Error('startDate must be in YYYY-MM-DD format (e.g., "2025-10-13")');
    }
    if (!datePattern.test(endDate)) {
      throw new Error('endDate must be in YYYY-MM-DD format (e.g., "2025-10-13")');
    }

    // Validate dates are parseable
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (isNaN(parsedStart.getTime())) {
      throw new Error(`Invalid startDate: ${startDate}`);
    }
    if (isNaN(parsedEnd.getTime())) {
      throw new Error(`Invalid endDate: ${endDate}`);
    }

    // Validate start date is before or equal to end date
    if (parsedStart > parsedEnd) {
      throw new Error('startDate must be before or equal to endDate');
    }

    return {
      startDate,
      endDate,
    };
  }

  /**
   * Transform delete errors to user-friendly messages
   */
  private transformDeleteError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Validation errors
      if (message.includes('required') || message.includes('must be')) {
        return `Validation error: ${message}`;
      }

      // Workout not found
      if (message.includes('not found')) {
        return `Workout not found: The specified workout ID does not exist. Please verify the workout ID.`;
      }

      // Authentication errors
      if (message.includes('authentication') || message.includes('login')) {
        return `Authentication error: Unable to connect to Garmin Connect. Please check your credentials.`;
      }

      // Garmin API errors
      if (message.includes('server error') || message.includes('503')) {
        return `Garmin service error: The Garmin Connect service is temporarily unavailable. Please try again later.`;
      }

      // Generic error
      return message;
    }

    return 'An unknown error occurred while deleting the workout';
  }

  /**
   * Transform unschedule errors to user-friendly messages
   */
  private transformUnscheduleError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Validation errors
      if (message.includes('required') || message.includes('must be') ||
          message.includes('format') || message.includes('Invalid date')) {
        return `Validation error: ${message}`;
      }

      // Scheduled workout not found
      if (message.includes('not found')) {
        return `Scheduled workout not found: No workout is scheduled on the specified date. Please verify the workout ID and date.`;
      }

      // Authentication errors
      if (message.includes('authentication') || message.includes('login')) {
        return `Authentication error: Unable to connect to Garmin Connect. Please check your credentials.`;
      }

      // Garmin API errors
      if (message.includes('server error') || message.includes('503')) {
        return `Garmin service error: The Garmin Connect service is temporarily unavailable. Please try again later.`;
      }

      // Generic error
      return message;
    }

    return 'An unknown error occurred while unscheduling the workout';
  }

  /**
   * Transform update errors to user-friendly messages
   */
  private transformUpdateError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Validation errors
      if (message.includes('required') || message.includes('must be') ||
          message.includes('invalid') || message.includes('Step ')) {
        return `Validation error: ${message}`;
      }

      // Workout not found
      if (message.includes('not found')) {
        return `Workout not found: The specified workout ID does not exist. Please verify the workout ID.`;
      }

      // Garmin API errors
      if (message.includes('Bad request')) {
        return `Garmin API error: The workout structure is invalid. Please check your workout configuration.`;
      }

      if (message.includes('authentication') || message.includes('login')) {
        return `Authentication error: Unable to connect to Garmin Connect. Please check your credentials.`;
      }

      if (message.includes('server error') || message.includes('503')) {
        return `Garmin service error: The Garmin Connect service is temporarily unavailable. Please try again later.`;
      }

      // Generic error
      return message;
    }

    return 'An unknown error occurred while updating the workout';
  }

  /**
   * Transform get scheduled errors to user-friendly messages
   */
  private transformGetScheduledError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Validation errors
      if (message.includes('required') || message.includes('must be') ||
          message.includes('format') || message.includes('Invalid date')) {
        return `Validation error: ${message}`;
      }

      // Authentication errors
      if (message.includes('authentication') || message.includes('login')) {
        return `Authentication error: Unable to connect to Garmin Connect. Please check your credentials.`;
      }

      // User profile error
      if (message.includes('profile ID')) {
        return `User profile error: Unable to retrieve user information. Please try again.`;
      }

      // Garmin API errors
      if (message.includes('server error') || message.includes('503')) {
        return `Garmin service error: The Garmin Connect service is temporarily unavailable. Please try again later.`;
      }

      // Generic error
      return message;
    }

    return 'An unknown error occurred while retrieving scheduled workouts';
  }

  /**
   * Get detailed information about a specific workout
   *
   * Retrieves complete workout details including steps, targets, and configuration.
   *
   * @param workoutId - ID of the workout to retrieve (string format)
   * @returns MCP tool response with workout details or error
   */
  async getWorkoutDetail(workoutId: string): Promise<ToolResult> {
    try {
      // Validate input
      if (!workoutId || typeof workoutId !== 'string') {
        throw new Error('workoutId is required and must be a string');
      }

      // Get workout details via Garmin API
      const details = await this.garminClient.getWorkoutDetail(workoutId);

      // Return success response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            workoutId,
            details,
          }, null, 2)
        }]
      };

    } catch (error) {
      logger.error('Failed to get workout details:', error);

      // Transform error to user-friendly message
      const errorMessage = this.transformGetWorkoutDetailError(error);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: errorMessage
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Transform get workout detail errors to user-friendly messages
   */
  private transformGetWorkoutDetailError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      // Validation errors
      if (message.includes('required') || message.includes('must be')) {
        return `Validation error: ${message}`;
      }

      // Workout not found
      if (message.includes('not found')) {
        return `Workout not found: The specified workout ID does not exist. Please verify the workout ID.`;
      }

      // Authentication errors
      if (message.includes('authentication') || message.includes('login')) {
        return `Authentication error: Unable to connect to Garmin Connect. Please check your credentials.`;
      }

      // Garmin API errors
      if (message.includes('server error') || message.includes('503')) {
        return `Garmin service error: The Garmin Connect service is temporarily unavailable. Please try again later.`;
      }

      // Generic error
      return message;
    }

    return 'An unknown error occurred while retrieving workout details';
  }
}

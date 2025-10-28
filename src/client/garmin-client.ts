import GarminConnectLib from "garmin-connect";
import { GarminClientConfig, DailyStepsData } from '../types/garmin-types.js';
import type { WorkoutPayload, WorkoutResponse, WorkoutScheduleResponse, DeleteResponse, ScheduledWorkout, SportType } from '../types/workout.js';
import { SPORT_TYPE_MAPPING } from '../types/workout.js';
import { DebugLogger } from '../utils/debug-logger.js';

const GarminConnect = GarminConnectLib.GarminConnect;

// Calendar item from Garmin API response
interface ICalendarItem {
  itemType: string;
  workoutId?: number;
  date: string;
  workoutScheduleId?: number;
  // Nested workout object containing workout details
  workout?: {
    workoutId?: number;
    ownerId?: number;
    workoutName?: string;
    description?: string;
    sportType?: {
      sportTypeId: number;
      sportTypeKey: string;
    };
    estimatedDurationInSecs?: number;
    estimatedDistanceInMeters?: number;
  };
}

// Extended interface for internal Garmin Connect client methods
interface ExtendedGarminClient {
  client: {
    get: (url: string) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
    put: (url: string, data: unknown) => Promise<unknown>;
  };
  addWorkout: (payload: WorkoutPayload) => Promise<unknown>;
  deleteWorkout: (workout: { workoutId: string }) => Promise<unknown>;
  getUserProfile: () => Promise<{ profileId: number }>;
  post: (url: string, data: unknown) => Promise<unknown>;
}

export class GarminClient {
  private client: InstanceType<typeof GarminConnect> | null = null;
  private config: GarminClientConfig;
  private isAuthenticated = false;
  private debugLogger: DebugLogger;

  constructor(config: GarminClientConfig) {
    this.config = config;
    this.debugLogger = new DebugLogger();
  }

  /**
   * Extract HTTP status code from error message
   *
   * Attempts to parse common HTTP status codes from error messages.
   * Returns null if no status code is found.
   *
   * @param error - Error object or message
   * @returns HTTP status code or null
   */
  private extractHttpStatus(error: unknown): number | null {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Common patterns for HTTP status codes in error messages
    const patterns = [
      /\b(\d{3})\b/,        // Generic 3-digit status code
      /status[:\s]+(\d{3})/i, // "status: 404" or "status 404"
      /code[:\s]+(\d{3})/i,   // "code: 404" or "code 404"
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match && match[1]) {
        const status = parseInt(match[1], 10);
        // Validate it's a real HTTP status code (100-599)
        if (status >= 100 && status < 600) {
          return status;
        }
      }
    }

    return null;
  }

  /**
   * Enhance error message with HTTP method, URL, and status
   *
   * Adds diagnostic information to error messages to aid debugging.
   *
   * @param error - Original error
   * @param method - HTTP method
   * @param url - Request URL
   * @returns Enhanced error message
   */
  private enhanceErrorMessage(error: unknown, method: string, url: string): string {
    const originalMessage = error instanceof Error ? error.message : String(error);
    const status = this.extractHttpStatus(error);

    const parts = [
      `${method} ${url}`,
    ];

    if (status !== null) {
      parts.push(`(HTTP ${status})`);
    }

    parts.push(`- ${originalMessage}`);

    return parts.join(' ');
  }

  async initialize(): Promise<InstanceType<typeof GarminConnect>> {
    if (this.client && this.isAuthenticated) {
      return this.client;
    }

    if (!this.config.username || !this.config.password) {
      throw new Error(
        "GARMIN_USERNAME and GARMIN_PASSWORD environment variables are required"
      );
    }

    this.client = new GarminConnect({
      username: this.config.username,
      password: this.config.password,
    });

    try {
      await this.client.login();
      this.isAuthenticated = true;
    } catch (error) {
      this.isAuthenticated = false;
      throw new Error(`Failed to authenticate with Garmin Connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return this.client;
  }

  private async retryWithReauth<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Check if the error indicates an authentication issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('login page') ||
          errorMessage.includes('not valid JSON') ||
          errorMessage.includes('Unexpected token') ||
          errorMessage.includes('401') ||
          errorMessage.includes('403')) {

        // Reset authentication state and try to login again
        this.isAuthenticated = false;
        this.client = null;

        // Re-initialize the client
        await this.initialize();

        // Retry the operation once
        return await operation();
      }

      // If it's not an auth error, rethrow
      throw error;
    }
  }

  async getSleepData(date: Date) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getSleepData(date);
    });
  }

  async getSleepDuration(date: Date) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getSleepDuration(date);
    });
  }

  async getActivities(start: number = 0, limit: number = 20) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getActivities(start, limit);
    });
  }

  async getActivity(activity: { activityId: number }) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getActivity(activity);
    });
  }

  async getSteps(date: Date) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getSteps(date);
    });
  }

  /**
   * Get detailed daily steps data including goal, distance, and step count.
   * This method calls the Garmin API directly to access the full data structure
   * that the library's getSteps() method doesn't expose.
   */
  async getDailyStepsData(date: Date): Promise<DailyStepsData> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      // Format date as YYYY-MM-DD
      const dateString = date.toISOString().split('T')[0];

      // Call the API directly using the same endpoint as getSteps()
      // The endpoint returns an array of daily step data
      const response = await (client as unknown as ExtendedGarminClient).client.get(
        `https://connectapi.garmin.com/usersummary-service/stats/steps/daily/${dateString}/${dateString}`
      );

      if (!Array.isArray(response) || response.length === 0) {
        throw new Error(`No steps data available for ${dateString}`);
      }

      // Find the data for the requested date
      const dayData = response.find((day: unknown) => {
        const record = day as Record<string, unknown>;
        return record.calendarDate === dateString;
      });

      if (!dayData) {
        throw new Error(`No steps data found for ${dateString}`);
      }

      const data = dayData as Record<string, unknown>;
      return {
        calendarDate: data.calendarDate as string,
        stepGoal: (data.stepGoal as number) || 0,
        totalDistance: (data.totalDistance as number) || 0,
        totalSteps: (data.totalSteps as number) || 0
      };
    });
  }

  async getHeartRate(date: Date) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getHeartRate(date);
    });
  }

  async getDailyWeightData(date: Date) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getDailyWeightData(date);
    });
  }

  async getDailyHydration(date: Date) {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getDailyHydration(date);
    });
  }

  async getUserProfile() {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();
      return await client.getUserProfile();
    });
  }

  /**
   * Creates a new workout in Garmin Connect
   *
   * @param payload - Complete workout definition in Garmin API format
   * @returns Workout response with ID from Garmin API
   * @throws Error if upload fails or authentication required
   *
   * @example
   * ```typescript
   * const workout = new WorkoutBuilder('5K Run', 'running')
   *   .addWarmup(EndConditionFactory.time(600))
   *   .addInterval(EndConditionFactory.distance(5000, 'm'))
   *   .build();
   *
   * const response = await client.createWorkout(workout);
   * console.log(`Created workout ID: ${response.workoutId}`);
   * ```
   */
  async createWorkout(payload: WorkoutPayload): Promise<WorkoutResponse> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      try {
        // Use the built-in addWorkout method from garmin-connect library
        // Payload is already in correct Garmin API format from WorkoutBuilder
        const response = await (client as unknown as ExtendedGarminClient).addWorkout(payload);

        // Validate response structure
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response from Garmin API: response is not an object');
        }

        const resp = response as Record<string, unknown>;
        if (!resp.workoutId) {
          throw new Error('Invalid response from Garmin API: missing workout ID');
        }

        return response as WorkoutResponse;
      } catch (error) {
        // Enhance error messages with more context
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for specific HTTP error codes
        if (errorMessage.includes('400')) {
          throw new Error(`Bad request: Invalid workout payload. ${errorMessage}`);
        }
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          // Let retryWithReauth handle authentication errors
          throw error;
        }
        if (errorMessage.includes('500')) {
          throw new Error(`Garmin server error: ${errorMessage}`);
        }
        if (errorMessage.includes('503')) {
          throw new Error(`Garmin service unavailable: ${errorMessage}`);
        }

        // Re-throw with context for other errors
        throw new Error(`Failed to create workout: ${errorMessage}`);
      }
    });
  }

  /**
   * Schedules a workout to a specific date in Garmin Connect calendar
   *
   * Uses Garmin Connect API to add an existing workout to the calendar.
   * The workout must already exist (created via createWorkout).
   *
   * @param workoutId - ID of the workout to schedule
   * @param date - Date to schedule the workout for
   * @returns Schedule response with confirmation
   * @throws Error if scheduling fails or workout not found
   *
   * @example
   * ```typescript
   * const response = await client.scheduleWorkout(1354294595, new Date('2025-10-13'));
   * console.log(`Scheduled workout on ${response.calendarDate}`);
   * ```
   */
  async scheduleWorkout(workoutId: number, date: Date): Promise<WorkoutScheduleResponse> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      try {
        // Format date as YYYY-MM-DD
        const calendarDate = date.toISOString().split('T')[0];

        // Use the schedule endpoint (matches library style: connectapi.garmin.com)
        // Discovered through reverse engineering - Garmin API only needs workoutId and date
        const scheduleUrl = `https://connectapi.garmin.com/workout-service/schedule/${workoutId}`;
        const payload = {
          date: calendarDate
        };

        // Send schedule request using client.post (same pattern as addWorkout)
        await (client as unknown as ExtendedGarminClient).post(scheduleUrl, payload);

        // Generate schedule ID for tracking
        const workoutScheduleId = Date.now();

        // Return success response
        return {
          workoutScheduleId,
          calendarDate,
          workoutId,
          success: true,
          message: `Workout scheduled successfully for ${calendarDate}`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for specific HTTP error codes
        if (errorMessage.includes('404')) {
          throw new Error(`Workout not found: ${workoutId}`);
        }
        if (errorMessage.includes('400')) {
          throw new Error(`Bad request: Invalid scheduling data. ${errorMessage}`);
        }
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          // Let retryWithReauth handle authentication errors
          throw error;
        }
        if (errorMessage.includes('500')) {
          throw new Error(`Garmin server error: ${errorMessage}`);
        }
        if (errorMessage.includes('503')) {
          throw new Error(`Garmin service unavailable: ${errorMessage}`);
        }

        // Re-throw with context for other errors
        throw new Error(`Failed to schedule workout: ${errorMessage}`);
      }
    });
  }

  /**
   * Deletes a workout from Garmin Connect library
   *
   * Uses the library's built-in deleteWorkout method to remove a workout.
   * The workout is permanently deleted from the user's workout library.
   *
   * @param workoutId - ID of the workout to delete (string format)
   * @returns Delete response with confirmation
   * @throws Error if deletion fails or workout not found
   *
   * @example
   * ```typescript
   * const response = await client.deleteWorkout("1354294595");
   * console.log(response.message); // "Workout deleted successfully"
   * ```
   */
  async deleteWorkout(workoutId: string): Promise<DeleteResponse> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      try {
        // Use the built-in deleteWorkout method from garmin-connect library
        await (client as unknown as ExtendedGarminClient).deleteWorkout({ workoutId });

        return {
          success: true,
          message: `Workout ${workoutId} deleted successfully`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for specific HTTP error codes
        if (errorMessage.includes('404')) {
          throw new Error(`Workout not found: ${workoutId}`);
        }
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          // Let retryWithReauth handle authentication errors
          throw error;
        }
        if (errorMessage.includes('500')) {
          throw new Error(`Garmin server error: ${errorMessage}`);
        }
        if (errorMessage.includes('503')) {
          throw new Error(`Garmin service unavailable: ${errorMessage}`);
        }

        // Re-throw with context for other errors
        throw new Error(`Failed to delete workout: ${errorMessage}`);
      }
    });
  }

  /**
   * Unschedules a workout from a specific date in Garmin Connect calendar
   *
   * Removes a scheduled workout from the calendar without deleting the workout
   * from the library. The workout remains available for future scheduling.
   *
   * @param workoutId - ID of the workout to unschedule
   * @param date - Date from which to unschedule the workout
   * @returns Delete response with confirmation
   * @throws Error if unscheduling fails or workout not found
   *
   * @example
   * ```typescript
   * const response = await client.unscheduleWorkout(1354294595, new Date('2025-10-13'));
   * console.log(response.message); // "Workout unscheduled from 2025-10-13"
   * ```
   */
  async unscheduleWorkout(workoutId: number, date: Date): Promise<DeleteResponse> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      // Format date as YYYY-MM-DD
      const calendarDate = date.toISOString().split('T')[0];

      // Use the DELETE endpoint with workoutId and date parameter
      const unscheduleUrl = `https://connectapi.garmin.com/workout-service/schedule/${workoutId}?date=${calendarDate}`;

      try {
        // Log request if debug enabled
        this.debugLogger.logRequest('DELETE', unscheduleUrl, { workoutId, date: calendarDate });

        // Send unschedule request using client.delete
        const response = await (client as unknown as ExtendedGarminClient).client.delete(unscheduleUrl);

        // Log response if debug enabled
        this.debugLogger.logResponse('DELETE', unscheduleUrl, 200, response);

        return {
          success: true,
          message: `Workout ${workoutId} unscheduled from ${calendarDate}`,
        };
      } catch (error) {
        // Log error if debug enabled
        this.debugLogger.logError('DELETE', unscheduleUrl, error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        const status = this.extractHttpStatus(error);

        // Check for specific HTTP error codes
        if (status === 404 || errorMessage.includes('404')) {
          throw new Error(`Scheduled workout not found: ${workoutId} on ${calendarDate}. ${this.enhanceErrorMessage(error, 'DELETE', unscheduleUrl)}`);
        }
        if (status === 401 || status === 403 || errorMessage.includes('401') || errorMessage.includes('403')) {
          // Let retryWithReauth handle authentication errors
          throw error;
        }
        if (status === 500 || errorMessage.includes('500')) {
          throw new Error(`Garmin server error: ${this.enhanceErrorMessage(error, 'DELETE', unscheduleUrl)}`);
        }
        if (status === 503 || errorMessage.includes('503')) {
          throw new Error(`Garmin service unavailable: ${this.enhanceErrorMessage(error, 'DELETE', unscheduleUrl)}`);
        }

        // Re-throw with enhanced error context
        throw new Error(`Failed to unschedule workout: ${this.enhanceErrorMessage(error, 'DELETE', unscheduleUrl)}`);
      }
    });
  }

  /**
   * Updates an existing workout in Garmin Connect
   *
   * Uses PUT request to update workout details including name, description, and steps.
   * The workout must already exist (use workoutId from creation).
   *
   * @param workoutId - ID of the workout to update
   * @param payload - Complete workout payload with updated fields
   * @returns Updated workout response
   * @throws Error if update fails or workout not found
   *
   * @example
   * ```typescript
   * const workout = new WorkoutBuilder("Updated 5K", "running")
   *   .setDescription("New description")
   *   .addWarmup(EndConditionFactory.time(600))
   *   .build();
   *
   * const response = await client.updateWorkout(1354294595, workout);
   * console.log(`Updated: ${response.workoutName}`);
   * ```
   */
  async updateWorkout(workoutId: number, payload: WorkoutPayload): Promise<WorkoutResponse> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      try {
        // Use the PUT endpoint to update the workout
        const updateUrl = `https://connectapi.garmin.com/workout-service/workout/${workoutId}`;

        // Ensure workoutId is in the payload
        const updatePayload = {
          ...payload,
          workoutId,
        };

        // Send update request using client.put
        const response = await (client as unknown as ExtendedGarminClient).client.put(
          updateUrl,
          updatePayload
        );

        // Validate response structure
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response from Garmin API: response is not an object');
        }

        const resp = response as Record<string, unknown>;
        if (!resp.workoutId) {
          throw new Error('Invalid response from Garmin API: missing workout ID');
        }

        return response as WorkoutResponse;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for specific HTTP error codes
        if (errorMessage.includes('404')) {
          throw new Error(`Workout not found: ${workoutId}`);
        }
        if (errorMessage.includes('400')) {
          throw new Error(`Bad request: Invalid workout payload. ${errorMessage}`);
        }
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          // Let retryWithReauth handle authentication errors
          throw error;
        }
        if (errorMessage.includes('500')) {
          throw new Error(`Garmin server error: ${errorMessage}`);
        }
        if (errorMessage.includes('503')) {
          throw new Error(`Garmin service unavailable: ${errorMessage}`);
        }

        // Re-throw with context for other errors
        throw new Error(`Failed to update workout: ${errorMessage}`);
      }
    });
  }

  /**
   * Gets scheduled workouts for a date range from Garmin Connect calendar
   *
   * Uses the calendar-service API to retrieve scheduled workouts.
   * This approach is more robust than workout-service as it handles deleted workouts gracefully.
   *
   * @param startDate - Start date of the range
   * @param endDate - End date of the range
   * @returns Array of scheduled workouts with details
   * @throws Error if retrieval fails
   *
   * @example
   * ```typescript
   * // Get this week's scheduled workouts
   * const monday = new Date('2025-10-13');
   * const sunday = new Date('2025-10-19');
   * const workouts = await client.getScheduledWorkouts(monday, sunday);
   * console.log(`${workouts.length} workouts scheduled this week`);
   * ```
   */
  async getScheduledWorkouts(startDate: Date, endDate: Date): Promise<ScheduledWorkout[]> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      // Calculate months between startDate and endDate
      const months: { year: number; month: number }[] = [];

      // Get start of month for startDate
      const currentDate = new Date(startDate);
      currentDate.setDate(1); // First day of month
      currentDate.setHours(0, 0, 0, 0);

      // Iterate through months
      while (currentDate <= endDate) {
        months.push({
          year: currentDate.getFullYear(),
          month: currentDate.getMonth()  // JavaScript months are 0-based (0=January, 9=October)
        });

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Fetch calendar data for each month
      const allWorkouts: ScheduledWorkout[] = [];
      for (const { year, month } of months) {
        try {
          // Use calendar endpoint
          const calendarData = await (client as unknown as ExtendedGarminClient).client.get(
            `https://connectapi.garmin.com/calendar-service/year/${year}/month/${month}`
          );

          // API returns an object with calendarItems array
          // Intentional any for API response data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items: ICalendarItem[] = (calendarData as any)?.calendarItems || [];

          // Filter items with itemType === 'workout'
          const workouts = items.filter(
            (item): item is ICalendarItem =>
              item.itemType === 'workout' && !!item.workoutId
          );

          // Filter by date range
          const filteredWorkouts = workouts.filter((workout) => {
            const workoutDate = new Date(workout.date);
            return workoutDate >= startDate && workoutDate <= endDate;
          });

          // Map to ScheduledWorkout format
          const mappedWorkouts: ScheduledWorkout[] = filteredWorkouts.map((workout) => {
            // Map API sportType to proper SportType with displayOrder
            let sportType: SportType;
            if (workout.workout?.sportType && workout.workout.sportType.sportTypeKey) {
              // Try to match to known sport types
              const key = workout.workout.sportType.sportTypeKey as keyof typeof SPORT_TYPE_MAPPING;
              if (key in SPORT_TYPE_MAPPING) {
                sportType = SPORT_TYPE_MAPPING[key];
              } else {
                // Default to 'other' if unknown
                sportType = SPORT_TYPE_MAPPING.other;
              }
            } else {
              // Default to 'other' if no sportType provided
              sportType = SPORT_TYPE_MAPPING.other;
            }

            return {
              workoutScheduleId: workout.workoutScheduleId || 0,
              workoutId: workout.workout?.workoutId || workout.workoutId || 0,
              workoutName: workout.workout?.workoutName || 'Unnamed Workout',
              calendarDate: workout.date,
              sportType,
              estimatedDurationInSecs: workout.workout?.estimatedDurationInSecs || 0,
              estimatedDistanceInMeters: workout.workout?.estimatedDistanceInMeters || 0,
              description: workout.workout?.description,
            };
          });

          allWorkouts.push(...mappedWorkouts);
        } catch (error) {
          // Log error and continue to next month
          this.debugLogger.logError('GET', `calendar-service/year/${year}/month/${month}`, error);
        }
      }

      return allWorkouts;
    });
  }

  /**
   * Gets detailed information about a specific workout
   *
   * Uses the library's built-in getWorkoutDetail method to retrieve complete
   * workout information including steps, targets, and scheduling details.
   *
   * @param workoutId - ID of the workout to retrieve (string format)
   * @returns Complete workout details from Garmin API
   * @throws Error if retrieval fails or workout not found
   *
   * @example
   * ```typescript
   * const details = await client.getWorkoutDetail("1354294595");
   * console.log(`Workout: ${details.workoutName}`);
   * console.log(`Steps: ${details.workoutSegments.length}`);
   * ```
   */
  async getWorkoutDetail(workoutId: string): Promise<unknown> {
    return await this.retryWithReauth(async () => {
      const client = await this.initialize();

      try {
        // Use the built-in getWorkoutDetail method from garmin-connect library
        const response = await (client as unknown as ExtendedGarminClient & {
          getWorkoutDetail: (workout: { workoutId: string }) => Promise<unknown>;
        }).getWorkoutDetail({ workoutId });

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for specific HTTP error codes
        if (errorMessage.includes('404')) {
          throw new Error(`Workout not found: ${workoutId}`);
        }
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          // Let retryWithReauth handle authentication errors
          throw error;
        }
        if (errorMessage.includes('500')) {
          throw new Error(`Garmin server error: ${errorMessage}`);
        }
        if (errorMessage.includes('503')) {
          throw new Error(`Garmin service unavailable: ${errorMessage}`);
        }

        // Re-throw with context for other errors
        throw new Error(`Failed to get workout details: ${errorMessage}`);
      }
    });
  }
}
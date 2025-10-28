import { describe, it, expect, beforeEach } from 'vitest';
import { GarminClient } from '../../src/client/garmin-client.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

describe('GarminClient - Get Scheduled Workouts', () => {
  let mockClient: GarminClient;

  beforeEach(() => {
    mockClient = createMockGarminClient();
  });

  describe('getScheduledWorkouts - Success Cases', () => {
    it('should retrieve scheduled workouts within date range', async () => {
      const startDate = new Date('2025-10-13');
      const endDate = new Date('2025-10-15');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(mockClient.getScheduledWorkouts).toHaveBeenCalledWith(startDate, endDate);
      expect(mockClient.getScheduledWorkouts).toHaveBeenCalledTimes(1);
    });

    it('should return workouts with correct structure', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      const workout = result[0];
      expect(workout).toHaveProperty('workoutId');
      expect(workout).toHaveProperty('workoutName');
      expect(workout).toHaveProperty('calendarDate');
      expect(workout).toHaveProperty('sportType');
      expect(workout).toHaveProperty('estimatedDurationInSecs');
      expect(workout).toHaveProperty('estimatedDistanceInMeters');
    });

    it('should filter workouts by date range', async () => {
      const startDate = new Date('2025-10-13');
      const endDate = new Date('2025-10-13'); // Same day

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      // Should only return workout on 2025-10-13
      expect(result.length).toBe(1);
      expect(result[0].calendarDate).toBe('2025-10-13');
    });

    it('should return empty array when no workouts in range', async () => {
      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getScheduledWorkouts - Date Handling', () => {
    it('should handle single month date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle multi-month date range', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-11-30');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle same day range', async () => {
      const date = new Date('2025-10-13');

      const result = await mockClient.getScheduledWorkouts(date, date);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].calendarDate).toBe('2025-10-13');
    });

    it('should handle leap year dates', async () => {
      const startDate = new Date('2024-02-28');
      const endDate = new Date('2024-03-01');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getScheduledWorkouts - Workout Details', () => {
    it('should include workout ID', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      expect(result[0].workoutId).toBeDefined();
      expect(typeof result[0].workoutId).toBe('number');
    });

    it('should include workout name', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      expect(result[0].workoutName).toBeDefined();
      expect(typeof result[0].workoutName).toBe('string');
    });

    it('should include sport type information', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      expect(result[0].sportType).toBeDefined();
      expect(result[0].sportType).toHaveProperty('sportTypeId');
      expect(result[0].sportType).toHaveProperty('sportTypeKey');
    });

    it('should include estimated duration', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      expect(result[0].estimatedDurationInSecs).toBeDefined();
      expect(typeof result[0].estimatedDurationInSecs).toBe('number');
    });

    it('should include estimated distance', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      expect(result[0].estimatedDistanceInMeters).toBeDefined();
      expect(typeof result[0].estimatedDistanceInMeters).toBe('number');
    });
  });

  describe('getScheduledWorkouts - Error Handling', () => {
    it('should handle API failure gracefully', async () => {
      const failingClient = createFailingMockGarminClient();

      await expect(
        failingClient.getScheduledWorkouts(new Date('2025-10-13'), new Date('2025-10-15'))
      ).rejects.toThrow('Failed to retrieve scheduled workouts');
    });

    it('should propagate error message', async () => {
      const failingClient = createFailingMockGarminClient();

      try {
        await failingClient.getScheduledWorkouts(new Date('2025-10-13'), new Date('2025-10-15'));
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to retrieve scheduled workouts');
      }
    });
  });

  describe('getScheduledWorkouts - Edge Cases', () => {
    it('should handle year boundaries', async () => {
      const startDate = new Date('2025-12-31');
      const endDate = new Date('2026-01-01');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle past dates', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle future dates', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const result = await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getScheduledWorkouts - Mock Verification', () => {
    it('should be called with correct parameters', async () => {
      const startDate = new Date('2025-10-13');
      const endDate = new Date('2025-10-15');

      await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(mockClient.getScheduledWorkouts).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should be callable multiple times', async () => {
      const startDate = new Date('2025-10-13');
      const endDate = new Date('2025-10-15');

      await mockClient.getScheduledWorkouts(startDate, endDate);
      await mockClient.getScheduledWorkouts(startDate, endDate);
      await mockClient.getScheduledWorkouts(startDate, endDate);

      expect(mockClient.getScheduledWorkouts).toHaveBeenCalledTimes(3);
    });
  });

  describe('getScheduledWorkouts - Nested Field Extraction', () => {
    it('should extract fields from nested workout object', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      expect(result.length).toBeGreaterThan(0);
      const workout = result[0];

      // Fields should be extracted from nested workout object
      expect(workout.workoutName).toBeDefined();
      expect(workout.description).toBeDefined();
      expect(workout.sportType).toBeDefined();
      expect(workout.estimatedDurationInSecs).toBeDefined();
      expect(workout.estimatedDistanceInMeters).toBeDefined();
    });

    it('should handle missing workout object with fallback values', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-20'),
        new Date('2025-10-20')
      );

      // Should still return a workout even without nested object
      expect(result.length).toBeGreaterThan(0);
      const workout = result[0];

      // Should use fallback values
      expect(workout.workoutName).toBe('Unnamed Workout');
      expect(workout.estimatedDurationInSecs).toBe(0);
      expect(workout.estimatedDistanceInMeters).toBe(0);
      expect(workout.description).toBeUndefined();
    });

    it('should handle partial workout data with defaults', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-21'),
        new Date('2025-10-21')
      );

      expect(result.length).toBeGreaterThan(0);
      const workout = result[0];

      // Should have name from nested object
      expect(workout.workoutName).toBe('Partial Workout');

      // Should use defaults for missing fields
      expect(workout.estimatedDurationInSecs).toBe(0);
      expect(workout.estimatedDistanceInMeters).toBe(0);
      expect(workout.sportType.sportTypeKey).toBe('other'); // Default sport type
    });

    it('should use workoutScheduleId from API when available', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      const workout = result[0];
      expect(workout.workoutScheduleId).toBeDefined();
      expect(typeof workout.workoutScheduleId).toBe('number');
    });

    it('should prioritize nested workoutId over top-level', async () => {
      const result = await mockClient.getScheduledWorkouts(
        new Date('2025-10-13'),
        new Date('2025-10-15')
      );

      const workout = result[0];
      expect(workout.workoutId).toBeDefined();
      expect(workout.workoutId).toBe(111111111);
    });
  });
});

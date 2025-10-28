import { describe, it, expect, beforeEach } from 'vitest';
import { GarminClient } from '../../src/client/garmin-client.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';
import { mockWorkoutScheduleResponse } from '../mocks/garmin-data.js';

describe('GarminClient - Workout Scheduling', () => {
  let mockClient: GarminClient;

  beforeEach(() => {
    mockClient = createMockGarminClient();
  });

  describe('scheduleWorkout - Success Cases', () => {
    it('should successfully schedule a workout with valid inputs', async () => {
      const workoutId = 123456789;
      const date = new Date('2025-10-13');

      const result = await mockClient.scheduleWorkout(workoutId, date);

      expect(result).toBeDefined();
      expect(result.workoutId).toBe(workoutId);
      expect(result.calendarDate).toBe('2025-10-13');
      expect(result.success).toBe(true);
      expect(mockClient.scheduleWorkout).toHaveBeenCalledWith(workoutId, date);
      expect(mockClient.scheduleWorkout).toHaveBeenCalledTimes(1);
    });

    it('should return workoutScheduleId in response', async () => {
      const result = await mockClient.scheduleWorkout(123456789, new Date('2025-10-13'));

      expect(result.workoutScheduleId).toBeDefined();
      expect(typeof result.workoutScheduleId).toBe('number');
      expect(result.workoutScheduleId).toBe(mockWorkoutScheduleResponse.workoutScheduleId);
    });

    it('should include success message in response', async () => {
      const date = new Date('2025-10-13');
      const result = await mockClient.scheduleWorkout(123456789, date);

      expect(result.message).toBeDefined();
      expect(result.message).toContain('scheduled successfully');
      expect(result.message).toContain('2025-10-13');
    });

    it('should handle different workout IDs correctly', async () => {
      const workoutId1 = 111111111;
      const workoutId2 = 222222222;
      const date = new Date('2025-10-13');

      const result1 = await mockClient.scheduleWorkout(workoutId1, date);
      const result2 = await mockClient.scheduleWorkout(workoutId2, date);

      expect(result1.workoutId).toBe(workoutId1);
      expect(result2.workoutId).toBe(workoutId2);
      expect(mockClient.scheduleWorkout).toHaveBeenCalledTimes(2);
    });

    it('should handle different dates correctly', async () => {
      const workoutId = 123456789;
      const date1 = new Date('2025-10-13');
      const date2 = new Date('2025-10-20');

      const result1 = await mockClient.scheduleWorkout(workoutId, date1);
      const result2 = await mockClient.scheduleWorkout(workoutId, date2);

      expect(result1.calendarDate).toBe('2025-10-13');
      expect(result2.calendarDate).toBe('2025-10-20');
    });
  });

  describe('scheduleWorkout - Date Handling', () => {
    it('should format date correctly as YYYY-MM-DD', async () => {
      const result = await mockClient.scheduleWorkout(123456789, new Date('2025-10-13T15:30:00Z'));

      expect(result.calendarDate).toBe('2025-10-13');
      expect(result.calendarDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle dates in different months', async () => {
      const januaryDate = new Date('2025-01-15');
      const decemberDate = new Date('2025-12-31');

      const result1 = await mockClient.scheduleWorkout(123456789, januaryDate);
      const result2 = await mockClient.scheduleWorkout(123456789, decemberDate);

      expect(result1.calendarDate).toBe('2025-01-15');
      expect(result2.calendarDate).toBe('2025-12-31');
    });

    it('should handle future dates', async () => {
      const futureDate = new Date('2026-06-15');
      const result = await mockClient.scheduleWorkout(123456789, futureDate);

      expect(result.calendarDate).toBe('2026-06-15');
      expect(result.success).toBe(true);
    });

    it('should preserve time zone information in date conversion', async () => {
      // Create date with specific time to test date extraction
      const dateWithTime = new Date('2025-10-13T23:59:59.999Z');
      const result = await mockClient.scheduleWorkout(123456789, dateWithTime);

      // Should only use date part, not time
      expect(result.calendarDate).toBe('2025-10-13');
    });
  });

  describe('scheduleWorkout - Error Handling', () => {
    it('should handle API failure gracefully', async () => {
      const failingClient = createFailingMockGarminClient();

      await expect(
        failingClient.scheduleWorkout(123456789, new Date('2025-10-13'))
      ).rejects.toThrow('Failed to schedule workout');
    });

    it('should propagate error message', async () => {
      const failingClient = createFailingMockGarminClient();

      try {
        await failingClient.scheduleWorkout(123456789, new Date('2025-10-13'));
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to schedule workout');
      }
    });
  });

  describe('scheduleWorkout - Mock Verification', () => {
    it('should be called with correct parameters', async () => {
      const workoutId = 123456789;
      const date = new Date('2025-10-13');

      await mockClient.scheduleWorkout(workoutId, date);

      expect(mockClient.scheduleWorkout).toHaveBeenCalledWith(workoutId, date);
    });

    it('should be callable multiple times', async () => {
      const workoutId = 123456789;
      const date = new Date('2025-10-13');

      await mockClient.scheduleWorkout(workoutId, date);
      await mockClient.scheduleWorkout(workoutId, date);
      await mockClient.scheduleWorkout(workoutId, date);

      expect(mockClient.scheduleWorkout).toHaveBeenCalledTimes(3);
    });

    it('should support custom mock implementations', async () => {
      const customResponse = {
        workoutScheduleId: 9999999999999,
        workoutId: 999,
        calendarDate: '2025-12-25',
        success: true,
        message: 'Custom scheduled workout',
      };

      (mockClient.scheduleWorkout as any).mockResolvedValueOnce(customResponse);

      const result = await mockClient.scheduleWorkout(999, new Date('2025-12-25'));

      expect(result.workoutScheduleId).toBe(9999999999999);
      expect(result.workoutId).toBe(999);
      expect(result.calendarDate).toBe('2025-12-25');
    });
  });

  describe('scheduleWorkout - Edge Cases', () => {
    it('should handle scheduling on the same date multiple times', async () => {
      const date = new Date('2025-10-13');

      const result1 = await mockClient.scheduleWorkout(111, date);
      const result2 = await mockClient.scheduleWorkout(222, date);

      expect(result1.calendarDate).toBe(result2.calendarDate);
      expect(result1.workoutId).not.toBe(result2.workoutId);
      expect(mockClient.scheduleWorkout).toHaveBeenCalledTimes(2);
    });

    it('should handle leap year dates', async () => {
      const leapYearDate = new Date('2024-02-29');
      const result = await mockClient.scheduleWorkout(123456789, leapYearDate);

      expect(result.calendarDate).toBe('2024-02-29');
      expect(result.success).toBe(true);
    });

    it('should handle month boundaries', async () => {
      const endOfMonth = new Date('2025-01-31');
      const startOfMonth = new Date('2025-02-01');

      const result1 = await mockClient.scheduleWorkout(123456789, endOfMonth);
      const result2 = await mockClient.scheduleWorkout(123456789, startOfMonth);

      expect(result1.calendarDate).toBe('2025-01-31');
      expect(result2.calendarDate).toBe('2025-02-01');
    });

    it('should handle year boundaries', async () => {
      const endOfYear = new Date('2025-12-31');
      const startOfYear = new Date('2026-01-01');

      const result1 = await mockClient.scheduleWorkout(123456789, endOfYear);
      const result2 = await mockClient.scheduleWorkout(123456789, startOfYear);

      expect(result1.calendarDate).toBe('2025-12-31');
      expect(result2.calendarDate).toBe('2026-01-01');
    });
  });

  describe('scheduleWorkout - Type Safety', () => {
    it('should accept valid number workoutId', async () => {
      const result = await mockClient.scheduleWorkout(123456789, new Date('2025-10-13'));

      expect(typeof result.workoutId).toBe('number');
      expect(result.workoutId).toBe(123456789);
    });

    it('should accept valid Date object', async () => {
      const date = new Date('2025-10-13');
      const result = await mockClient.scheduleWorkout(123456789, date);

      expect(result.calendarDate).toBe('2025-10-13');
    });

    it('should return valid WorkoutScheduleResponse type', async () => {
      const result = await mockClient.scheduleWorkout(123456789, new Date('2025-10-13'));

      // Verify required properties
      expect(result).toHaveProperty('workoutScheduleId');
      expect(result).toHaveProperty('workoutId');
      expect(result).toHaveProperty('calendarDate');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');

      // Verify types
      expect(typeof result.workoutScheduleId).toBe('number');
      expect(typeof result.workoutId).toBe('number');
      expect(typeof result.calendarDate).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });
  });

  describe('scheduleWorkout - Integration', () => {
    it('should work alongside createWorkout', async () => {
      const workoutPayload = {
        workoutName: 'Test',
        sportType: { sportTypeId: 1, sportTypeKey: 'running' },
        workoutSegments: [],
      };

      // Create workout first
      const createResult = await mockClient.createWorkout(workoutPayload);

      // Then schedule it
      const scheduleResult = await mockClient.scheduleWorkout(
        createResult.workoutId,
        new Date('2025-10-13')
      );

      expect(scheduleResult.workoutId).toBe(createResult.workoutId);
      expect(mockClient.createWorkout).toHaveBeenCalledTimes(1);
      expect(mockClient.scheduleWorkout).toHaveBeenCalledTimes(1);
    });

    it('should work alongside other GarminClient methods', async () => {
      // Call other methods to ensure no interference
      await mockClient.getUserProfile();
      await mockClient.getActivities();

      // Call scheduleWorkout
      const result = await mockClient.scheduleWorkout(123456789, new Date('2025-10-13'));

      // Verify all calls succeeded
      expect(mockClient.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockClient.getActivities).toHaveBeenCalledTimes(1);
      expect(mockClient.scheduleWorkout).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it('should maintain state across multiple schedule calls', async () => {
      const result1 = await mockClient.scheduleWorkout(111, new Date('2025-10-13'));
      const result2 = await mockClient.scheduleWorkout(222, new Date('2025-10-14'));
      const result3 = await mockClient.scheduleWorkout(333, new Date('2025-10-15'));

      expect(result1.workoutId).toBe(111);
      expect(result2.workoutId).toBe(222);
      expect(result3.workoutId).toBe(333);
      expect(mockClient.scheduleWorkout).toHaveBeenCalledTimes(3);
    });
  });

  describe('scheduleWorkout - Response Structure', () => {
    it('should return all required response fields', async () => {
      const result = await mockClient.scheduleWorkout(123456789, new Date('2025-10-13'));

      expect(result).toHaveProperty('workoutScheduleId');
      expect(result).toHaveProperty('workoutId');
      expect(result).toHaveProperty('calendarDate');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    it('should return success flag as true', async () => {
      const result = await mockClient.scheduleWorkout(123456789, new Date('2025-10-13'));

      expect(result.success).toBe(true);
    });

    it('should return formatted message with date', async () => {
      const date = new Date('2025-10-13');
      const result = await mockClient.scheduleWorkout(123456789, date);

      expect(result.message).toMatch(/scheduled/i);
      expect(result.message).toMatch(/successfully/i);
      expect(result.message).toContain('2025-10-13');
    });
  });
});

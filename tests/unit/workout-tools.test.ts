/**
 * Unit tests for WorkoutTools
 *
 * Tests MCP tool for creating running workouts, including:
 * - Input validation
 * - Workout building logic
 * - API error handling
 * - Success and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkoutTools } from '../../src/tools/tracking/workout-tools.js';
import { GarminClient } from '../../src/client/garmin-client.js';
import type { WorkoutResponse, WorkoutScheduleResponse } from '../../src/types/workout.js';

// Mock GarminClient
vi.mock('../../src/client/garmin-client.js');

describe('WorkoutTools', () => {
  let workoutTools: WorkoutTools;
  let mockGarminClient: GarminClient;

  beforeEach(() => {
    // Create mock client with all workout methods
    mockGarminClient = {
      createWorkout: vi.fn(),
      scheduleWorkout: vi.fn(),
      deleteWorkout: vi.fn(),
      unscheduleWorkout: vi.fn(),
      updateWorkout: vi.fn(),
      getScheduledWorkouts: vi.fn(),
    } as unknown as GarminClient;

    workoutTools = new WorkoutTools(mockGarminClient);
  });

  describe('Input Validation', () => {
    it('should reject missing name', async () => {
      const args = {
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Workout name is required');
    });

    it('should reject empty name', async () => {
      const args = {
        name: '   ',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Workout name is required');
    });

    it('should reject non-string name', async () => {
      const args = {
        name: 123,
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Workout name is required');
    });

    it('should reject missing steps array', async () => {
      const args = {
        name: 'Test Workout'
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Steps array is required');
    });

    it('should reject empty steps array', async () => {
      const args = {
        name: 'Test Workout',
        steps: []
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Steps array is required');
    });

    it('should reject invalid step type', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{ type: 'invalid_type', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Step 1');
      expect(result.content[0].text).toContain('type must be one of');
    });

    it('should reject missing duration for non-repeat step', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval' }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('duration is required');
    });

    it('should reject invalid duration type', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'invalid_duration' } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('duration.type must be one of');
    });

    it('should reject time duration without value', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'time' } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('duration.value must be a positive number');
    });

    it('should reject distance duration without unit', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'distance', value: 1000 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('duration.unit must be one of');
    });

    it('should reject invalid target type', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{
          type: 'interval',
          duration: { type: 'time', value: 1800 },
          target: { type: 'invalid_target' }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('target.type must be one of');
    });

    it('should reject pace target without minValue', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{
          type: 'interval',
          duration: { type: 'time', value: 1800 },
          target: { type: 'pace', maxValue: 5.0 }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('target.minValue must be a positive number');
    });

    it('should reject pace target with invalid range', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{
          type: 'interval',
          duration: { type: 'time', value: 1800 },
          target: { type: 'pace', minValue: 5.0, maxValue: 4.0 }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('target.minValue must be less than target.maxValue');
    });

    it('should reject hr_zone target without zone', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{
          type: 'interval',
          duration: { type: 'time', value: 1800 },
          target: { type: 'hr_zone' }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('target.zone must be a positive integer');
    });

    it('should reject repeat without numberOfRepetitions', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{
          type: 'repeat',
          childSteps: [{ type: 'interval', duration: { type: 'time', value: 300 } }]
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('numberOfRepetitions is required');
    });

    it('should reject repeat without childSteps', async () => {
      const args = {
        name: 'Test Workout',
        steps: [{
          type: 'repeat',
          numberOfRepetitions: 5
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('childSteps array is required');
    });
  });

  describe('Success Cases', () => {
    it('should create simple easy run', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 123,
        ownerId: 456,
        workoutName: '30 Minute Easy Run',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: '30 Minute Easy Run',
        steps: [{
          type: 'interval',
          duration: { type: 'time', value: 1800 },
          target: { type: 'no_target' }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.workoutId).toBe(123);
      expect(response.workoutName).toBe('30 Minute Easy Run');
    });

    it('should create workout with description', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 124,
        ownerId: 456,
        workoutName: 'Easy Run',
        description: 'Recovery run',
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: 'Easy Run',
        description: 'Recovery run',
        steps: [{
          type: 'interval',
          duration: { type: 'time', value: 1800 }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
    });

    it('should create interval workout with warmup and cooldown', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 125,
        ownerId: 456,
        workoutName: '5x1000m Intervals',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: '5x1000m Intervals',
        steps: [
          { type: 'warmup', duration: { type: 'time', value: 600 } },
          {
            type: 'repeat',
            numberOfRepetitions: 5,
            childSteps: [
              {
                type: 'interval',
                duration: { type: 'distance', value: 1000, unit: 'm' },
                target: { type: 'pace', minValue: 4.0, maxValue: 4.5 }
              },
              {
                type: 'recovery',
                duration: { type: 'distance', value: 400, unit: 'm' }
              }
            ]
          },
          { type: 'cooldown', duration: { type: 'time', value: 300 } }
        ]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.workoutId).toBe(125);
    });

    it('should handle lap button duration', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 126,
        ownerId: 456,
        workoutName: 'Fartlek',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: 'Fartlek',
        steps: [{
          type: 'interval',
          duration: { type: 'lap_button' }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
    });

    it('should handle HR zone target', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 127,
        ownerId: 456,
        workoutName: 'Tempo Run',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: 'Tempo Run',
        steps: [{
          type: 'interval',
          duration: { type: 'time', value: 1200 },
          target: { type: 'hr_zone', zone: 4 }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
    });

    it('should handle distance units (km)', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 128,
        ownerId: 456,
        workoutName: '5K Run',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: '5K Run',
        steps: [{
          type: 'interval',
          duration: { type: 'distance', value: 5, unit: 'km' }
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
    });

    it('should handle rest steps', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 129,
        ownerId: 456,
        workoutName: 'Intervals with Rest',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: 'Intervals with Rest',
        steps: [
          { type: 'interval', duration: { type: 'time', value: 300 } },
          { type: 'rest', duration: { type: 'time', value: 60 } },
          { type: 'interval', duration: { type: 'time', value: 300 } }
        ]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
    });
  });

  describe('API Error Handling', () => {
    it('should handle authentication errors', async () => {
      vi.mocked(mockGarminClient.createWorkout).mockRejectedValue(
        new Error('authentication failed')
      );

      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication error');
    });

    it('should handle bad request errors', async () => {
      vi.mocked(mockGarminClient.createWorkout).mockRejectedValue(
        new Error('Bad request: Invalid workout payload')
      );

      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin API error');
    });

    it('should handle service unavailable errors', async () => {
      vi.mocked(mockGarminClient.createWorkout).mockRejectedValue(
        new Error('Garmin service unavailable: 503')
      );

      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin service error');
    });

    it('should handle unknown errors', async () => {
      vi.mocked(mockGarminClient.createWorkout).mockRejectedValue(
        new Error('Something went wrong')
      );

      const args = {
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Something went wrong');
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested repeat blocks', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 130,
        ownerId: 456,
        workoutName: 'Nested Repeats',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: 'Nested Repeats',
        steps: [{
          type: 'repeat',
          numberOfRepetitions: 3,
          childSteps: [{
            type: 'repeat',
            numberOfRepetitions: 2,
            childSteps: [{
              type: 'interval',
              duration: { type: 'time', value: 120 }
            }]
          }]
        }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
    });

    it('should trim whitespace from name and description', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 131,
        ownerId: 456,
        workoutName: 'Test Workout',
        description: 'Test description',
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: '  Test Workout  ',
        description: '  Test description  ',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();

      const payload = vi.mocked(mockGarminClient.createWorkout).mock.calls[0][0];
      expect(payload.workoutName).toBe('Test Workout');
      expect(payload.description).toBe('Test description');
    });

    it('should handle multiple step types in sequence', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 132,
        ownerId: 456,
        workoutName: 'Complex Workout',
        description: null,
        updatedDate: '2025-01-15T10:00:00Z',
        createdDate: '2025-01-15T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(mockResponse);

      const args = {
        name: 'Complex Workout',
        steps: [
          { type: 'warmup', duration: { type: 'time', value: 600 } },
          { type: 'interval', duration: { type: 'time', value: 300 } },
          { type: 'recovery', duration: { type: 'time', value: 120 } },
          { type: 'rest', duration: { type: 'time', value: 60 } },
          { type: 'interval', duration: { type: 'time', value: 300 } },
          { type: 'cooldown', duration: { type: 'time', value: 300 } }
        ]
      };

      const result = await workoutTools.createRunningWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
    });
  });

  describe('scheduleWorkout - Input Validation', () => {
    it('should reject missing workoutId', async () => {
      const args = {
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
    });

    it('should reject non-number workoutId', async () => {
      const args = {
        workoutId: 'invalid',
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
    });

    it('should reject negative workoutId', async () => {
      const args = {
        workoutId: -123,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
    });

    it('should reject missing date', async () => {
      const args = {
        workoutId: 123456789
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('date is required');
    });

    it('should reject non-string date', async () => {
      const args = {
        workoutId: 123456789,
        date: 12345
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('date is required');
    });

    it('should reject invalid date format (MM-DD-YYYY)', async () => {
      const args = {
        workoutId: 123456789,
        date: '10-13-2025'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('date must be in YYYY-MM-DD format');
    });

    it('should reject invalid date format (DD/MM/YYYY)', async () => {
      const args = {
        workoutId: 123456789,
        date: '13/10/2025'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('date must be in YYYY-MM-DD format');
    });

    it('should reject invalid date string', async () => {
      const args = {
        workoutId: 123456789,
        date: '2025-13-32'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid date');
    });

    it('should reject malformed date string', async () => {
      const args = {
        workoutId: 123456789,
        date: 'not-a-date'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('date must be in YYYY-MM-DD format');
    });
  });

  describe('scheduleWorkout - Success Cases', () => {
    it('should successfully schedule a workout', async () => {
      const mockResponse: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2025-10-13',
        success: true,
        message: 'Workout scheduled successfully for 2025-10-13',
      };

      vi.mocked(mockGarminClient.scheduleWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.scheduleWorkout).toHaveBeenCalledOnce();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.workoutId).toBe(123456789);
      expect(response.calendarDate).toBe('2025-10-13');
      expect(response.workoutScheduleId).toBe(1234567890123);
    });

    it('should include success message in response', async () => {
      const mockResponse: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2025-10-13',
        success: true,
        message: 'Workout scheduled successfully for 2025-10-13',
      };

      vi.mocked(mockGarminClient.scheduleWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      const response = JSON.parse(result.content[0].text);
      expect(response.message).toContain('scheduled successfully');
      expect(response.message).toContain('2025-10-13');
    });

    it('should handle different dates', async () => {
      const mockResponse1: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2025-10-13',
        success: true,
        message: 'Workout scheduled successfully for 2025-10-13',
      };

      const mockResponse2: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890124,
        workoutId: 123456789,
        calendarDate: '2025-10-20',
        success: true,
        message: 'Workout scheduled successfully for 2025-10-20',
      };

      vi.mocked(mockGarminClient.scheduleWorkout)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result1 = await workoutTools.scheduleWorkout({ workoutId: 123456789, date: '2025-10-13' });
      const result2 = await workoutTools.scheduleWorkout({ workoutId: 123456789, date: '2025-10-20' });

      const response1 = JSON.parse(result1.content[0].text);
      const response2 = JSON.parse(result2.content[0].text);

      expect(response1.calendarDate).toBe('2025-10-13');
      expect(response2.calendarDate).toBe('2025-10-20');
    });

    it('should handle future dates', async () => {
      const mockResponse: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2026-06-15',
        success: true,
        message: 'Workout scheduled successfully for 2026-06-15',
      };

      vi.mocked(mockGarminClient.scheduleWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        date: '2026-06-15'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.calendarDate).toBe('2026-06-15');
    });
  });

  describe('scheduleWorkout - API Error Handling', () => {
    it('should handle workout not found errors', async () => {
      vi.mocked(mockGarminClient.scheduleWorkout).mockRejectedValue(
        new Error('Workout not found: 123456789')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Workout not found');
    });

    it('should handle authentication errors', async () => {
      vi.mocked(mockGarminClient.scheduleWorkout).mockRejectedValue(
        new Error('authentication failed')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication error');
    });

    it('should handle bad request errors', async () => {
      vi.mocked(mockGarminClient.scheduleWorkout).mockRejectedValue(
        new Error('Bad request: Invalid scheduling data')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin API error');
    });

    it('should handle service unavailable errors', async () => {
      vi.mocked(mockGarminClient.scheduleWorkout).mockRejectedValue(
        new Error('Garmin service unavailable: 503')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin service error');
    });

    it('should handle unknown errors', async () => {
      vi.mocked(mockGarminClient.scheduleWorkout).mockRejectedValue(
        new Error('Something went wrong')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Something went wrong');
    });
  });

  describe('scheduleWorkout - Edge Cases', () => {
    it('should handle leap year dates', async () => {
      const mockResponse: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2024-02-29',
        success: true,
        message: 'Workout scheduled successfully for 2024-02-29',
      };

      vi.mocked(mockGarminClient.scheduleWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        date: '2024-02-29'
      };

      const result = await workoutTools.scheduleWorkout(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.calendarDate).toBe('2024-02-29');
    });

    it('should handle month boundaries', async () => {
      const mockResponse1: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2025-01-31',
        success: true,
        message: 'Workout scheduled successfully for 2025-01-31',
      };

      const mockResponse2: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890124,
        workoutId: 123456789,
        calendarDate: '2025-02-01',
        success: true,
        message: 'Workout scheduled successfully for 2025-02-01',
      };

      vi.mocked(mockGarminClient.scheduleWorkout)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result1 = await workoutTools.scheduleWorkout({ workoutId: 123456789, date: '2025-01-31' });
      const result2 = await workoutTools.scheduleWorkout({ workoutId: 123456789, date: '2025-02-01' });

      const response1 = JSON.parse(result1.content[0].text);
      const response2 = JSON.parse(result2.content[0].text);

      expect(response1.calendarDate).toBe('2025-01-31');
      expect(response2.calendarDate).toBe('2025-02-01');
    });

    it('should handle year boundaries', async () => {
      const mockResponse1: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2025-12-31',
        success: true,
        message: 'Workout scheduled successfully for 2025-12-31',
      };

      const mockResponse2: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890124,
        workoutId: 123456789,
        calendarDate: '2026-01-01',
        success: true,
        message: 'Workout scheduled successfully for 2026-01-01',
      };

      vi.mocked(mockGarminClient.scheduleWorkout)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result1 = await workoutTools.scheduleWorkout({ workoutId: 123456789, date: '2025-12-31' });
      const result2 = await workoutTools.scheduleWorkout({ workoutId: 123456789, date: '2026-01-01' });

      const response1 = JSON.parse(result1.content[0].text);
      const response2 = JSON.parse(result2.content[0].text);

      expect(response1.calendarDate).toBe('2025-12-31');
      expect(response2.calendarDate).toBe('2026-01-01');
    });

    it('should handle scheduling multiple workouts on same date', async () => {
      const mockResponse1: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 111,
        calendarDate: '2025-10-13',
        success: true,
        message: 'Workout scheduled successfully for 2025-10-13',
      };

      const mockResponse2: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890124,
        workoutId: 222,
        calendarDate: '2025-10-13',
        success: true,
        message: 'Workout scheduled successfully for 2025-10-13',
      };

      vi.mocked(mockGarminClient.scheduleWorkout)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result1 = await workoutTools.scheduleWorkout({ workoutId: 111, date: '2025-10-13' });
      const result2 = await workoutTools.scheduleWorkout({ workoutId: 222, date: '2025-10-13' });

      const response1 = JSON.parse(result1.content[0].text);
      const response2 = JSON.parse(result2.content[0].text);

      expect(response1.workoutId).toBe(111);
      expect(response2.workoutId).toBe(222);
      expect(response1.calendarDate).toBe(response2.calendarDate);
    });
  });

  describe('scheduleWorkout - Integration with createWorkout', () => {
    it('should work alongside createWorkout', async () => {
      const createMockResponse: WorkoutResponse = {
        workoutId: 123456789,
        ownerId: 456,
        workoutName: 'Test Workout',
        description: null,
        updatedDate: '2025-10-12T12:00:00Z',
        createdDate: '2025-10-12T12:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      const scheduleMockResponse: WorkoutScheduleResponse = {
        workoutScheduleId: 1234567890123,
        workoutId: 123456789,
        calendarDate: '2025-10-13',
        success: true,
        message: 'Workout scheduled successfully for 2025-10-13',
      };

      vi.mocked(mockGarminClient.createWorkout).mockResolvedValue(createMockResponse);
      vi.mocked(mockGarminClient.scheduleWorkout).mockResolvedValue(scheduleMockResponse);

      // First create a workout
      const createResult = await workoutTools.createRunningWorkout({
        name: 'Test Workout',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      });

      const createResponse = JSON.parse(createResult.content[0].text);

      // Then schedule it
      const scheduleResult = await workoutTools.scheduleWorkout({
        workoutId: createResponse.workoutId,
        date: '2025-10-13'
      });

      const scheduleResponse = JSON.parse(scheduleResult.content[0].text);

      expect(mockGarminClient.createWorkout).toHaveBeenCalledOnce();
      expect(mockGarminClient.scheduleWorkout).toHaveBeenCalledOnce();
      expect(scheduleResponse.workoutId).toBe(createResponse.workoutId);
    });
  });

  describe('deleteWorkout - Input Validation', () => {
    it('should reject missing workoutId', async () => {
      const args = {};

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
    });

    it('should reject non-string workoutId', async () => {
      const args = {
        workoutId: 123456
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
      expect(result.content[0].text).toContain('must be a string');
    });

    it('should reject empty workoutId', async () => {
      const args = {
        workoutId: ''
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
    });
  });

  describe('deleteWorkout - Success Cases', () => {
    it('should successfully delete a workout', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockResolvedValue({
        success: true,
        message: 'Workout 123456789 deleted successfully',
      });

      const args = {
        workoutId: '123456789'
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.deleteWorkout).toHaveBeenCalledWith('123456789');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.workoutId).toBe('123456789');
      expect(response.message).toContain('deleted successfully');
    });

    it('should return success message with workoutId', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockResolvedValue({
        success: true,
        message: 'Workout ABC123 deleted successfully',
      });

      const args = {
        workoutId: 'ABC123'
      };

      const result = await workoutTools.deleteWorkout(args);

      const response = JSON.parse(result.content[0].text);
      expect(response.workoutId).toBe('ABC123');
      expect(response.message).toContain('ABC123');
    });

    it('should call garminClient with correct parameters', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockResolvedValue({
        success: true,
        message: 'Workout deleted',
      });

      const args = {
        workoutId: 'test-workout-id'
      };

      await workoutTools.deleteWorkout(args);

      expect(mockGarminClient.deleteWorkout).toHaveBeenCalledOnce();
      expect(mockGarminClient.deleteWorkout).toHaveBeenCalledWith('test-workout-id');
    });
  });

  describe('deleteWorkout - API Error Handling', () => {
    it('should handle workout not found (404)', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockRejectedValue(
        new Error('Workout not found: 123456789')
      );

      const args = {
        workoutId: '123456789'
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Workout not found');
    });

    it('should handle authentication errors (401)', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockRejectedValue(
        new Error('authentication failed')
      );

      const args = {
        workoutId: '123456789'
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication error');
    });

    it('should handle authentication errors (403)', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockRejectedValue(
        new Error('login page detected')
      );

      const args = {
        workoutId: '123456789'
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication error');
    });

    it('should handle server errors (500)', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockRejectedValue(
        new Error('Garmin server error: 500 Internal Server Error')
      );

      const args = {
        workoutId: '123456789'
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin service error');
    });

    it('should handle service unavailable (503)', async () => {
      vi.mocked(mockGarminClient.deleteWorkout).mockRejectedValue(
        new Error('Garmin service unavailable: 503')
      );

      const args = {
        workoutId: '123456789'
      };

      const result = await workoutTools.deleteWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin service error');
    });
  });

  describe('unscheduleWorkout - Input Validation', () => {
    it('should reject missing workoutId', async () => {
      const args = {
        date: '2025-10-13'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
    });

    it('should reject non-number workoutId', async () => {
      const args = {
        workoutId: 'invalid',
        date: '2025-10-13'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
      expect(result.content[0].text).toContain('must be a positive number');
    });

    it('should reject missing date', async () => {
      const args = {
        workoutId: 123456789
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('date is required');
    });

    it('should reject invalid date format', async () => {
      const args = {
        workoutId: 123456789,
        date: '10-13-2025'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('date must be in YYYY-MM-DD format');
    });

    it('should reject invalid date string', async () => {
      const args = {
        workoutId: 123456789,
        date: '2025-13-40'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid date');
    });
  });

  describe('unscheduleWorkout - Success Cases', () => {
    it('should successfully unschedule a workout', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout).mockResolvedValue({
        success: true,
        message: 'Workout 123456789 unscheduled from 2025-10-13',
      });

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.unscheduleWorkout).toHaveBeenCalledOnce();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.workoutId).toBe(123456789);
      expect(response.date).toBe('2025-10-13');
    });

    it('should return success message', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout).mockResolvedValue({
        success: true,
        message: 'Workout unscheduled successfully',
      });

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      const response = JSON.parse(result.content[0].text);
      expect(response.message).toBeDefined();
      expect(response.message).toContain('unscheduled');
    });

    it('should handle different dates (past/future)', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout)
        .mockResolvedValueOnce({
          success: true,
          message: 'Workout unscheduled from 2025-01-01',
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Workout unscheduled from 2026-12-31',
        });

      const result1 = await workoutTools.unscheduleWorkout({ workoutId: 123, date: '2025-01-01' });
      const result2 = await workoutTools.unscheduleWorkout({ workoutId: 123, date: '2026-12-31' });

      const response1 = JSON.parse(result1.content[0].text);
      const response2 = JSON.parse(result2.content[0].text);

      expect(response1.date).toBe('2025-01-01');
      expect(response2.date).toBe('2026-12-31');
    });
  });

  describe('unscheduleWorkout - API Error Handling', () => {
    it('should handle scheduled workout not found (404)', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout).mockRejectedValue(
        new Error('Scheduled workout not found: 123456789 on 2025-10-13')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Scheduled workout not found');
    });

    it('should handle authentication errors', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout).mockRejectedValue(
        new Error('authentication failed')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication error');
    });

    it('should handle server errors', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout).mockRejectedValue(
        new Error('Garmin server error: 500')
      );

      const args = {
        workoutId: 123456789,
        date: '2025-10-13'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin service error');
    });
  });

  describe('unscheduleWorkout - Edge Cases', () => {
    it('should handle leap year dates', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout).mockResolvedValue({
        success: true,
        message: 'Workout unscheduled from 2024-02-29',
      });

      const args = {
        workoutId: 123456789,
        date: '2024-02-29'
      };

      const result = await workoutTools.unscheduleWorkout(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.date).toBe('2024-02-29');
    });

    it('should handle month boundaries', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout)
        .mockResolvedValueOnce({
          success: true,
          message: 'Workout unscheduled',
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Workout unscheduled',
        });

      const result1 = await workoutTools.unscheduleWorkout({ workoutId: 123, date: '2025-01-31' });
      const result2 = await workoutTools.unscheduleWorkout({ workoutId: 123, date: '2025-02-01' });

      expect(result1.isError).toBeUndefined();
      expect(result2.isError).toBeUndefined();
    });

    it('should handle year boundaries', async () => {
      vi.mocked(mockGarminClient.unscheduleWorkout)
        .mockResolvedValueOnce({
          success: true,
          message: 'Workout unscheduled',
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Workout unscheduled',
        });

      const result1 = await workoutTools.unscheduleWorkout({ workoutId: 123, date: '2025-12-31' });
      const result2 = await workoutTools.unscheduleWorkout({ workoutId: 123, date: '2026-01-01' });

      expect(result1.isError).toBeUndefined();
      expect(result2.isError).toBeUndefined();
    });
  });

  describe('updateWorkout - Input Validation', () => {
    it('should reject missing workoutId', async () => {
      const args = {
        name: 'Updated Workout'
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('workoutId is required');
    });

    it('should reject when no fields provided', async () => {
      const args = {
        workoutId: 123456789
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('At least one field');
    });

    it('should reject invalid step structure', async () => {
      const args = {
        workoutId: 123456789,
        steps: [{ type: 'invalid_type' }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('type must be one of');
    });
  });

  describe('updateWorkout - Success Cases', () => {
    it('should successfully update name only', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 123456789,
        ownerId: 456,
        workoutName: 'Updated Name',
        description: null,
        updatedDate: '2025-10-20T10:00:00Z',
        createdDate: '2025-10-12T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.updateWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        name: 'Updated Name',
        // Need to provide steps since WorkoutBuilder requires at least one step
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.updateWorkout).toHaveBeenCalledOnce();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.workoutName).toBe('Updated Name');
    });

    it('should successfully update description only', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 123456789,
        ownerId: 456,
        workoutName: 'Workout',
        description: 'Updated description',
        updatedDate: '2025-10-20T10:00:00Z',
        createdDate: '2025-10-12T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.updateWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        description: 'Updated description',
        // Need to provide steps since WorkoutBuilder requires at least one step
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBeUndefined();
    });

    it('should successfully update steps only', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 123456789,
        ownerId: 456,
        workoutName: 'Workout',
        description: null,
        updatedDate: '2025-10-20T10:00:00Z',
        createdDate: '2025-10-12T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.updateWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBeUndefined();
    });

    it('should successfully update all fields', async () => {
      const mockResponse: WorkoutResponse = {
        workoutId: 123456789,
        ownerId: 456,
        workoutName: 'New Name',
        description: 'New description',
        updatedDate: '2025-10-20T10:00:00Z',
        createdDate: '2025-10-12T10:00:00Z',
        sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 }
      };

      vi.mocked(mockGarminClient.updateWorkout).mockResolvedValue(mockResponse);

      const args = {
        workoutId: 123456789,
        name: 'New Name',
        description: 'New description',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.workoutName).toBe('New Name');
    });
  });

  describe('updateWorkout - API Error Handling', () => {
    it('should handle workout not found', async () => {
      vi.mocked(mockGarminClient.updateWorkout).mockRejectedValue(
        new Error('Workout not found: 123456789')
      );

      const args = {
        workoutId: 123456789,
        name: 'Updated',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Workout not found');
    });

    it('should handle bad request errors', async () => {
      vi.mocked(mockGarminClient.updateWorkout).mockRejectedValue(
        new Error('Bad request: Invalid workout payload')
      );

      const args = {
        workoutId: 123456789,
        name: 'Updated',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin API error');
    });

    it('should handle authentication errors', async () => {
      vi.mocked(mockGarminClient.updateWorkout).mockRejectedValue(
        new Error('authentication failed')
      );

      const args = {
        workoutId: 123456789,
        name: 'Updated',
        steps: [{ type: 'interval', duration: { type: 'time', value: 1800 } }]
      };

      const result = await workoutTools.updateWorkout(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication error');
    });
  });

  describe('getScheduledWorkouts - Input Validation', () => {
    it('should use default date range when no dates provided', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue([]);

      const args = {};

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBeUndefined();
      expect(mockGarminClient.getScheduledWorkouts).toHaveBeenCalledOnce();
    });

    it('should reject invalid date format', async () => {
      const args = {
        startDate: '10-13-2025',
        endDate: '10-19-2025'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be in YYYY-MM-DD format');
    });

    it('should reject when startDate > endDate', async () => {
      const args = {
        startDate: '2025-10-19',
        endDate: '2025-10-13'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('startDate must be before or equal to endDate');
    });
  });

  describe('getScheduledWorkouts - Success Cases', () => {
    it('should successfully retrieve with default range', async () => {
      const mockWorkouts = [
        {
          workoutScheduleId: 1,
          workoutId: 100,
          workoutName: 'Test Workout',
          calendarDate: '2025-10-15',
          sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 },
          estimatedDurationInSecs: 1800,
          estimatedDistanceInMeters: 5000,
          description: 'Test'
        }
      ];

      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue(mockWorkouts);

      const args = {};

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.count).toBe(1);
      expect(response.workouts).toHaveLength(1);
    });

    it('should successfully retrieve with custom range', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue([]);

      const args = {
        startDate: '2025-10-13',
        endDate: '2025-10-19'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.startDate).toBe('2025-10-13');
      expect(response.endDate).toBe('2025-10-19');
    });

    it('should return empty array when no workouts', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue([]);

      const args = {
        startDate: '2025-10-13',
        endDate: '2025-10-19'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.count).toBe(0);
      expect(response.workouts).toHaveLength(0);
    });

    it('should format workout data correctly', async () => {
      const mockWorkouts = [
        {
          workoutScheduleId: 1,
          workoutId: 100,
          workoutName: 'Test Workout',
          calendarDate: '2025-10-15',
          sportType: { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 },
          estimatedDurationInSecs: 3600,
          estimatedDistanceInMeters: 10000,
          description: 'Long run'
        }
      ];

      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue(mockWorkouts);

      const args = {
        startDate: '2025-10-13',
        endDate: '2025-10-19'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      const response = JSON.parse(result.content[0].text);
      const workout = response.workouts[0];
      expect(workout.estimatedDuration).toContain('60 minutes');
      expect(workout.estimatedDistance).toContain('10.00 km');
    });
  });

  describe('getScheduledWorkouts - API Error Handling', () => {
    it('should handle authentication errors', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockRejectedValue(
        new Error('authentication failed')
      );

      const args = {
        startDate: '2025-10-13',
        endDate: '2025-10-19'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication error');
    });

    it('should handle user profile errors', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockRejectedValue(
        new Error('Unable to retrieve user profile ID')
      );

      const args = {
        startDate: '2025-10-13',
        endDate: '2025-10-19'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User profile error');
    });

    it('should handle server errors', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockRejectedValue(
        new Error('Garmin server error: 500')
      );

      const args = {
        startDate: '2025-10-13',
        endDate: '2025-10-19'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Garmin service error');
    });
  });

  describe('getScheduledWorkouts - Edge Cases', () => {
    it('should handle single day range', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue([]);

      const args = {
        startDate: '2025-10-13',
        endDate: '2025-10-13'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBeUndefined();
    });

    it('should handle large date ranges', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue([]);

      const args = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBeUndefined();
    });

    it('should calculate Monday-Sunday correctly', async () => {
      vi.mocked(mockGarminClient.getScheduledWorkouts).mockResolvedValue([]);

      // Test default date range calculation
      const args = {};

      const result = await workoutTools.getScheduledWorkouts(args);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      // Verify that startDate and endDate are provided
      expect(response.startDate).toBeDefined();
      expect(response.endDate).toBeDefined();
      // Verify format
      expect(response.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(response.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

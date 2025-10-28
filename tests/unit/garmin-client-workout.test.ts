import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GarminClient } from '../../src/client/garmin-client.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';
import { mockWorkoutResponse } from '../mocks/garmin-data.js';
import type { WorkoutPayload } from '../../src/types/workout.js';

describe('GarminClient - Workout Upload', () => {
  let mockClient: GarminClient;

  const validWorkoutPayload: WorkoutPayload = {
    workoutName: 'Test Workout',
    sportType: {
      sportTypeId: 1,
      sportTypeKey: 'running',
    },
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: {
          sportTypeId: 1,
          sportTypeKey: 'running',
        },
        workoutSteps: [
          {
            type: 'WorkoutStep',
            stepId: null,
            stepOrder: 1,
            stepType: {
              stepTypeId: 1,
              stepTypeKey: 'warmup',
            },
            endCondition: {
              conditionTypeKey: 'time',
              conditionTypeId: 2,
              value: 600,
            },
            targetType: {
              workoutTargetTypeId: 1,
              workoutTargetTypeKey: 'no.target',
            },
            secondaryTargetType: null,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockClient = createMockGarminClient();
  });

  describe('createWorkout - Success Cases', () => {
    it('should successfully create a workout with valid payload', async () => {
      const result = await mockClient.createWorkout(validWorkoutPayload);

      expect(result).toEqual(mockWorkoutResponse);
      expect(result.workoutId).toBe(123456789);
      expect(mockClient.createWorkout).toHaveBeenCalledWith(validWorkoutPayload);
      expect(mockClient.createWorkout).toHaveBeenCalledTimes(1);
    });

    it('should return workout ID in response', async () => {
      const result = await mockClient.createWorkout(validWorkoutPayload);

      expect(result.workoutId).toBe(123456789);
      expect(typeof result.workoutId).toBe('number');
    });

    it('should include owner information in response', async () => {
      const result = await mockClient.createWorkout(validWorkoutPayload);

      expect(result.owner).toBeDefined();
      expect(result.owner?.userId).toBe(987654321);
      expect(result.owner?.displayName).toBe('Test User');
    });

    it('should include workout name in response', async () => {
      const result = await mockClient.createWorkout(validWorkoutPayload);

      expect(result.workoutName).toBe('Test Workout');
    });

    it('should include timestamps in response', async () => {
      const result = await mockClient.createWorkout(validWorkoutPayload);

      expect(result).toHaveProperty('createdDate');
      expect(result).toHaveProperty('updatedDate');
      expect(typeof result.createdDate).toBe('string');
      expect(typeof result.updatedDate).toBe('string');
    });
  });

  describe('createWorkout - Error Handling', () => {
    it('should handle API failure gracefully', async () => {
      const failingClient = createFailingMockGarminClient();

      await expect(failingClient.createWorkout(validWorkoutPayload)).rejects.toThrow(
        'Failed to create workout'
      );
    });

    it('should propagate error message', async () => {
      const failingClient = createFailingMockGarminClient();

      try {
        await failingClient.createWorkout(validWorkoutPayload);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to create workout');
      }
    });
  });

  describe('createWorkout - Mock Verification', () => {
    it('should be called with correct payload', async () => {
      await mockClient.createWorkout(validWorkoutPayload);

      expect(mockClient.createWorkout).toHaveBeenCalledWith(validWorkoutPayload);
    });

    it('should be callable multiple times', async () => {
      await mockClient.createWorkout(validWorkoutPayload);
      await mockClient.createWorkout(validWorkoutPayload);
      await mockClient.createWorkout(validWorkoutPayload);

      expect(mockClient.createWorkout).toHaveBeenCalledTimes(3);
    });

    it('should support custom mock implementations', async () => {
      const customResponse = {
        workoutId: 999,
        workoutName: 'Custom Workout',
        owner: {
          userId: 111,
          displayName: 'Custom User',
        },
      };

      (mockClient.createWorkout as any).mockResolvedValueOnce(customResponse);

      const result = await mockClient.createWorkout(validWorkoutPayload);

      expect(result.workoutId).toBe(999);
      expect(result.workoutName).toBe('Custom Workout');
    });
  });

  describe('createWorkout - Edge Cases', () => {
    it('should handle workout with complex structure', async () => {
      const complexPayload: WorkoutPayload = {
        ...validWorkoutPayload,
        description: 'Complex interval workout with repeats',
        workoutSegments: [
          {
            segmentOrder: 1,
            sportType: {
              sportTypeId: 1,
              sportTypeKey: 'running',
            },
            workoutSteps: [
              {
                type: 'WorkoutRepeatStep',
                stepId: null,
                stepOrder: 1,
                numberOfIterations: 5,
                repeatType: {
                  repeatTypeId: 1,
                  repeatTypeKey: 'repeat_until_steps_cmplt',
                },
                workoutSteps: [
                  {
                    type: 'WorkoutStep',
                    stepId: null,
                    stepOrder: 1,
                    stepType: {
                      stepTypeId: 3,
                      stepTypeKey: 'interval',
                    },
                    endCondition: {
                      conditionTypeKey: 'distance',
                      conditionTypeId: 3,
                      value: 1000,
                    },
                    targetType: {
                      workoutTargetTypeId: 4,
                      workoutTargetTypeKey: 'pace.zone',
                    },
                    secondaryTargetType: null,
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = await mockClient.createWorkout(complexPayload);

      expect(result).toEqual(mockWorkoutResponse);
      expect(mockClient.createWorkout).toHaveBeenCalledWith(complexPayload);
    });

    it('should handle workout with minimal required fields', async () => {
      const minimalPayload: WorkoutPayload = {
        workoutName: 'Simple Run',
        sportType: {
          sportTypeId: 1,
          sportTypeKey: 'running',
        },
        workoutSegments: [
          {
            segmentOrder: 1,
            sportType: {
              sportTypeId: 1,
              sportTypeKey: 'running',
            },
            workoutSteps: [
              {
                type: 'WorkoutStep',
                stepId: null,
                stepOrder: 1,
                stepType: {
                  stepTypeId: 6,
                  stepTypeKey: 'lap.button',
                },
                endCondition: {
                  conditionTypeKey: 'lap.button',
                  conditionTypeId: 1,
                },
                targetType: {
                  workoutTargetTypeId: 1,
                  workoutTargetTypeKey: 'no.target',
                },
                secondaryTargetType: null,
              },
            ],
          },
        ],
      };

      const result = await mockClient.createWorkout(minimalPayload);

      expect(result).toEqual(mockWorkoutResponse);
    });

    it('should handle workout with multiple segments', async () => {
      const multiSegmentPayload: WorkoutPayload = {
        workoutName: 'Multi-Sport Workout',
        sportType: {
          sportTypeId: 1,
          sportTypeKey: 'running',
        },
        workoutSegments: [
          {
            segmentOrder: 1,
            sportType: {
              sportTypeId: 1,
              sportTypeKey: 'running',
            },
            workoutSteps: [
              {
                type: 'WorkoutStep',
                stepId: null,
                stepOrder: 1,
                stepType: {
                  stepTypeId: 1,
                  stepTypeKey: 'warmup',
                },
                endCondition: {
                  conditionTypeKey: 'time',
                  conditionTypeId: 2,
                  value: 300,
                },
                targetType: {
                  workoutTargetTypeId: 1,
                  workoutTargetTypeKey: 'no.target',
                },
                secondaryTargetType: null,
              },
            ],
          },
          {
            segmentOrder: 2,
            sportType: {
              sportTypeId: 1,
              sportTypeKey: 'running',
            },
            workoutSteps: [
              {
                type: 'WorkoutStep',
                stepId: null,
                stepOrder: 1,
                stepType: {
                  stepTypeId: 5,
                  stepTypeKey: 'cooldown',
                },
                endCondition: {
                  conditionTypeKey: 'time',
                  conditionTypeId: 2,
                  value: 300,
                },
                targetType: {
                  workoutTargetTypeId: 1,
                  workoutTargetTypeKey: 'no.target',
                },
                secondaryTargetType: null,
              },
            ],
          },
        ],
      };

      const result = await mockClient.createWorkout(multiSegmentPayload);

      expect(result).toEqual(mockWorkoutResponse);
    });
  });

  describe('createWorkout - Type Safety', () => {
    it('should accept valid WorkoutPayload type', async () => {
      // This test verifies TypeScript compilation
      const payload: WorkoutPayload = validWorkoutPayload;
      const result = await mockClient.createWorkout(payload);

      expect(result).toEqual(mockWorkoutResponse);
    });

    it('should return valid WorkoutResponse type', async () => {
      const result = await mockClient.createWorkout(validWorkoutPayload);

      // Verify required properties
      expect(result).toHaveProperty('workoutId');
      expect(result).toHaveProperty('workoutName');

      // Verify types
      expect(typeof result.workoutId).toBe('number');
      expect(typeof result.workoutName).toBe('string');
    });
  });

  describe('createWorkout - Integration', () => {
    it('should work alongside other GarminClient methods', async () => {
      // Call other methods to ensure no interference
      await mockClient.getUserProfile();

      // Call createWorkout
      const result = await mockClient.createWorkout(validWorkoutPayload);

      // Verify both calls succeeded
      expect(mockClient.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockClient.createWorkout).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkoutResponse);
    });

    it('should maintain state across multiple calls', async () => {
      const result1 = await mockClient.createWorkout(validWorkoutPayload);
      const result2 = await mockClient.createWorkout(validWorkoutPayload);

      expect(result1).toEqual(mockWorkoutResponse);
      expect(result2).toEqual(mockWorkoutResponse);
      expect(mockClient.createWorkout).toHaveBeenCalledTimes(2);
    });
  });
});

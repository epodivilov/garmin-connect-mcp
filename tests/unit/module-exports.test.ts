import { describe, it, expect } from 'vitest';

describe('Module Exports', () => {
  describe('garmin-types.ts exports', () => {
    it('should export all workout types and functions', async () => {
      const garminTypes = await import('../../src/types/garmin-types.js');

      // Verify workout type exports
      expect(garminTypes.SPORT_TYPE_MAPPING).toBeDefined();
      expect(garminTypes.STEP_TYPE_MAPPING).toBeDefined();
      expect(garminTypes.TARGET_TYPE_MAPPING).toBeDefined();
      expect(garminTypes.END_CONDITION_TYPE_MAPPING).toBeDefined();
      expect(garminTypes.DISTANCE_UNIT_MAPPING).toBeDefined();

      // Verify function exports
      expect(typeof garminTypes.paceMinKmToMetersPerSec).toBe('function');
      expect(typeof garminTypes.paceMetersPerSecToMinKm).toBe('function');
      expect(typeof garminTypes.formatPace).toBe('function');
      expect(typeof garminTypes.parsePace).toBe('function');
      expect(typeof garminTypes.isExecutableStep).toBe('function');
      expect(typeof garminTypes.isRepeatStep).toBe('function');
      expect(typeof garminTypes.validateWorkoutPayload).toBe('function');
      expect(typeof garminTypes.convertDistance).toBe('function');
    });

    it('should export workout type definitions', async () => {
      // This test verifies that TypeScript types are properly exported
      // by attempting to use them in type annotations
      const { SPORT_TYPE_MAPPING, STEP_TYPE_MAPPING } = await import('../../src/types/garmin-types.js');

      type SportType = typeof SPORT_TYPE_MAPPING[keyof typeof SPORT_TYPE_MAPPING];
      type StepType = typeof STEP_TYPE_MAPPING[keyof typeof STEP_TYPE_MAPPING];

      const sport: SportType = SPORT_TYPE_MAPPING.running;
      const step: StepType = STEP_TYPE_MAPPING.warmup;

      expect(sport).toBeDefined();
      expect(step).toBeDefined();
    });
  });

  describe('workout.ts direct import', () => {
    it('should export all workout types and functions', async () => {
      const workoutTypes = await import('../../src/types/workout.js');

      // Verify all exports are accessible
      expect(workoutTypes.SPORT_TYPE_MAPPING).toBeDefined();
      expect(workoutTypes.STEP_TYPE_MAPPING).toBeDefined();
      expect(workoutTypes.TARGET_TYPE_MAPPING).toBeDefined();
      expect(workoutTypes.END_CONDITION_TYPE_MAPPING).toBeDefined();
      expect(workoutTypes.DISTANCE_UNIT_MAPPING).toBeDefined();

      expect(typeof workoutTypes.paceMinKmToMetersPerSec).toBe('function');
      expect(typeof workoutTypes.paceMetersPerSecToMinKm).toBe('function');
      expect(typeof workoutTypes.formatPace).toBe('function');
      expect(typeof workoutTypes.parsePace).toBe('function');
      expect(typeof workoutTypes.isExecutableStep).toBe('function');
      expect(typeof workoutTypes.isRepeatStep).toBe('function');
      expect(typeof workoutTypes.validateWorkoutPayload).toBe('function');
      expect(typeof workoutTypes.convertDistance).toBe('function');
    });
  });
});

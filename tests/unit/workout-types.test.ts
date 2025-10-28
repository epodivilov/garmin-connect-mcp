import { describe, it, expect } from 'vitest';
import {
  SPORT_TYPE_MAPPING,
  STEP_TYPE_MAPPING,
  TARGET_TYPE_MAPPING,
  END_CONDITION_TYPE_MAPPING,
  DISTANCE_UNIT_MAPPING,
  PACE_PRECISION,
  GARMIN_PACE_PRECISION,
  STANDARD_HR_ZONES,
  STANDARD_POWER_ZONES,
  paceMinKmToMetersPerSec,
  paceMetersPerSecToMinKm,
  formatPace,
  parsePace,
  isExecutableStep,
  isRepeatStep,
  validateWorkoutPayload,
  convertDistance,
  validateEndCondition,
  validateTarget,
  createZoneTarget,
  createCustomRangeTarget,
  createNoTarget,
  createPaceValue,
  createPaceValueFromMetersPerSec,
  calculateAbsoluteHRZones,
  calculateAbsolutePowerZones,
  getZoneTargetValues,
  validateHeartRateZoneConfig,
  validatePowerZoneConfig,
  type WorkoutPayload,
  type ExecutableStep,
  type RepeatStep,
  type EndCondition,
  type Target,
  type HeartRateZoneConfig,
  type PowerZoneConfig,
} from '../../src/types/workout.js';

describe('workout-types', () => {
  describe('Constants and Mappings', () => {
    it('should have correct sport type mapping', () => {
      expect(SPORT_TYPE_MAPPING.running.sportTypeId).toBe(1);
      expect(SPORT_TYPE_MAPPING.running.sportTypeKey).toBe('running');
      expect(SPORT_TYPE_MAPPING.cycling.sportTypeId).toBe(2);
      expect(SPORT_TYPE_MAPPING.cycling.sportTypeKey).toBe('cycling');
    });

    it('should have correct step type mapping', () => {
      expect(STEP_TYPE_MAPPING.warmup.stepTypeId).toBe(1);
      expect(STEP_TYPE_MAPPING.warmup.stepTypeKey).toBe('warmup');
      expect(STEP_TYPE_MAPPING.interval.stepTypeId).toBe(3);
      expect(STEP_TYPE_MAPPING.repeat.stepTypeId).toBe(6);
    });

    it('should have correct target type mapping', () => {
      expect(TARGET_TYPE_MAPPING['no target'].workoutTargetTypeId).toBe(1);
      expect(TARGET_TYPE_MAPPING['no target'].workoutTargetTypeKey).toBe('no.target');
      expect(TARGET_TYPE_MAPPING.pace.workoutTargetTypeId).toBe(6);
      expect(TARGET_TYPE_MAPPING['heart rate'].workoutTargetTypeKey).toBe('heart.rate.zone');
    });

    it('should have correct end condition type mapping', () => {
      expect(END_CONDITION_TYPE_MAPPING.time.conditionTypeId).toBe(2);
      expect(END_CONDITION_TYPE_MAPPING.distance.conditionTypeId).toBe(3);
      expect(END_CONDITION_TYPE_MAPPING['lap.button'].conditionTypeId).toBe(1);
      expect(END_CONDITION_TYPE_MAPPING.iterations.conditionTypeId).toBe(7);
    });

    it('should have correct distance unit mapping with conversion factors', () => {
      expect(DISTANCE_UNIT_MAPPING.m.factor).toBe(1);
      expect(DISTANCE_UNIT_MAPPING.km.factor).toBe(1000);
      expect(DISTANCE_UNIT_MAPPING.mile.factor).toBe(1609.344);
    });
  });

  describe('Pace Conversion', () => {
    describe('paceMinKmToMetersPerSec', () => {
      it('should convert 5:00/km to m/s correctly with default precision', () => {
        const result = paceMinKmToMetersPerSec(5.0);
        expect(result).toBe(3.3333);
      });

      it('should convert 4:00/km to m/s correctly', () => {
        const result = paceMinKmToMetersPerSec(4.0);
        expect(result).toBe(4.1667);
      });

      it('should convert 6:30/km to m/s correctly', () => {
        const result = paceMinKmToMetersPerSec(6.5);
        expect(result).toBe(2.5641);
      });

      it('should use 2 decimal precision for Garmin API', () => {
        const result = paceMinKmToMetersPerSec(5.0, GARMIN_PACE_PRECISION);
        expect(result).toBe(3.33);
      });

      it('should throw error for zero pace', () => {
        expect(() => paceMinKmToMetersPerSec(0)).toThrow('Pace must be positive');
      });

      it('should throw error for negative pace', () => {
        expect(() => paceMinKmToMetersPerSec(-5)).toThrow('Pace must be positive');
      });
    });

    describe('paceMetersPerSecToMinKm', () => {
      it('should convert 3.33 m/s to ~5:00/km', () => {
        const result = paceMetersPerSecToMinKm(3.33);
        expect(result).toBeCloseTo(5.0, 1);
      });

      it('should convert 4.17 m/s to ~4:00/km', () => {
        const result = paceMetersPerSecToMinKm(4.17);
        expect(result).toBeCloseTo(4.0, 1);
      });

      it('should throw error for zero pace', () => {
        expect(() => paceMetersPerSecToMinKm(0)).toThrow('Pace must be positive');
      });

      it('should throw error for negative pace', () => {
        expect(() => paceMetersPerSecToMinKm(-3)).toThrow('Pace must be positive');
      });
    });

    describe('formatPace', () => {
      it('should format 5.0 as "5:00"', () => {
        expect(formatPace(5.0)).toBe('5:00');
      });

      it('should format 5.5 as "5:30"', () => {
        expect(formatPace(5.5)).toBe('5:30');
      });

      it('should format 4.75 as "4:45"', () => {
        expect(formatPace(4.75)).toBe('4:45');
      });

      it('should format 10.083 as "10:05"', () => {
        expect(formatPace(10 + 5 / 60)).toBe('10:05');
      });
    });

    describe('parsePace', () => {
      it('should parse "5:00" to 5.0', () => {
        expect(parsePace('5:00')).toBe(5.0);
      });

      it('should parse "5:30" to 5.5', () => {
        expect(parsePace('5:30')).toBe(5.5);
      });

      it('should parse "4:45" to 4.75', () => {
        expect(parsePace('4:45')).toBe(4.75);
      });

      it('should throw error for invalid format', () => {
        expect(() => parsePace('5-30')).toThrow('Invalid pace format');
        expect(() => parsePace('5')).toThrow('Invalid pace format');
        expect(() => parsePace('abc')).toThrow('Invalid pace format');
      });

      it('should throw error for invalid seconds', () => {
        expect(() => parsePace('5:60')).toThrow('Invalid seconds in pace');
        expect(() => parsePace('5:99')).toThrow('Invalid seconds in pace');
      });
    });

    describe('round-trip conversion', () => {
      it('should maintain high accuracy with default precision (4 decimals)', () => {
        const originalPace = 5.0;
        const metersPerSec = paceMinKmToMetersPerSec(originalPace);
        const backToMinKm = paceMetersPerSecToMinKm(metersPerSec);
        // With 4 decimal precision, expect accuracy within 0.001
        expect(backToMinKm).toBeCloseTo(originalPace, 3);
      });

      it('should maintain accuracy with various paces', () => {
        const paces = [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 7.0];
        for (const pace of paces) {
          const metersPerSec = paceMinKmToMetersPerSec(pace);
          const backToMinKm = paceMetersPerSecToMinKm(metersPerSec);
          // With 4 decimal precision, expect accuracy within 0.001
          expect(backToMinKm).toBeCloseTo(pace, 3);
        }
      });

      it('should allow custom precision parameter', () => {
        const pace = paceMinKmToMetersPerSec(5.5, 3);
        expect(pace).toBe(3.030);
      });

      it('should throw error for invalid precision', () => {
        expect(() => paceMinKmToMetersPerSec(5.0, -1)).toThrow('Precision must be a non-negative integer');
        expect(() => paceMinKmToMetersPerSec(5.0, 2.5)).toThrow('Precision must be a non-negative integer');
      });
    });

    describe('Pace Conversion Precision (Issue #4)', () => {
      it('should use 4 decimal places by default', () => {
        const pace = paceMinKmToMetersPerSec(5.0);
        expect(pace).toBe(3.3333);
        expect(PACE_PRECISION).toBe(4);
      });

      it('should use Math.round instead of toFixed', () => {
        // toFixed would give 3.33 for 2 decimals, Math.round should give consistent results
        const pace1 = paceMinKmToMetersPerSec(5.0, 2);
        expect(pace1).toBe(3.33);

        const pace2 = paceMinKmToMetersPerSec(4.99, 2);
        expect(pace2).toBe(3.34);
      });

      it('should handle edge cases with Math.round', () => {
        // Test rounding behavior
        const pace1 = paceMinKmToMetersPerSec(5.0, 0);
        expect(pace1).toBe(3);

        const pace2 = paceMinKmToMetersPerSec(5.0, 1);
        expect(pace2).toBe(3.3);
      });

      it('should provide GARMIN_PACE_PRECISION constant', () => {
        expect(GARMIN_PACE_PRECISION).toBe(2);
        const garminPace = paceMinKmToMetersPerSec(5.0, GARMIN_PACE_PRECISION);
        expect(garminPace).toBe(3.33);
      });
    });

    describe('PaceValue helpers (Issue #4)', () => {
      it('should create pace value from min/km', () => {
        const pace = createPaceValue(5.0);
        expect(pace.minPerKm).toBe(5.0);
        expect(pace.metersPerSec).toBe(3.3333);
        expect(pace.formatted).toBe('5:00');
      });

      it('should create pace value from m/s', () => {
        const pace = createPaceValueFromMetersPerSec(3.3333);
        expect(pace.minPerKm).toBeCloseTo(5.0, 3);
        expect(pace.metersPerSec).toBe(3.3333);
        expect(pace.formatted).toBe('5:00');
      });

      it('should respect custom precision in helpers', () => {
        const pace1 = createPaceValue(5.0, 2);
        expect(pace1.metersPerSec).toBe(3.33);

        const pace2 = createPaceValueFromMetersPerSec(3.33, 2);
        expect(pace2.minPerKm).toBe(5.01);
      });
    });
  });

  describe('Distance Conversion', () => {
    it('should convert kilometers to meters', () => {
      const result = convertDistance(5, DISTANCE_UNIT_MAPPING.km, DISTANCE_UNIT_MAPPING.m);
      expect(result).toBe(5000);
    });

    it('should convert meters to kilometers', () => {
      const result = convertDistance(5000, DISTANCE_UNIT_MAPPING.m, DISTANCE_UNIT_MAPPING.km);
      expect(result).toBe(5);
    });

    it('should convert miles to meters', () => {
      const result = convertDistance(1, DISTANCE_UNIT_MAPPING.mile, DISTANCE_UNIT_MAPPING.m);
      expect(result).toBeCloseTo(1609.344, 2);
    });

    it('should convert miles to kilometers', () => {
      const result = convertDistance(1, DISTANCE_UNIT_MAPPING.mile, DISTANCE_UNIT_MAPPING.km);
      expect(result).toBeCloseTo(1.609, 2);
    });

    it('should return same value for same unit', () => {
      const result = convertDistance(1000, DISTANCE_UNIT_MAPPING.m, DISTANCE_UNIT_MAPPING.m);
      expect(result).toBe(1000);
    });

    it('should throw error for negative distance', () => {
      expect(() => convertDistance(-100, DISTANCE_UNIT_MAPPING.m, DISTANCE_UNIT_MAPPING.km)).toThrow(
        'Distance must be non-negative'
      );
    });
  });

  describe('Type Guards', () => {
    const executableStep: ExecutableStep = {
      type: 'ExecutableStepDTO',
      stepId: null,
      stepOrder: 1,
      childStepId: null,
      description: 'Test step',
      stepType: STEP_TYPE_MAPPING.warmup,
      endCondition: END_CONDITION_TYPE_MAPPING.time,
      endConditionValue: 600,
      preferredEndConditionUnit: null,
      targetType: TARGET_TYPE_MAPPING['no target'],
      targetValueOne: null,
      targetValueTwo: null,
      zoneNumber: null,
      endConditionCompare: null,
      exerciseName: null,
      strokeType: null,
      equipmentType: null,
      category: null,
    };

    const repeatStep: RepeatStep = {
      type: 'RepeatGroupDTO',
      stepId: null,
      stepOrder: 2,
      numberOfIterations: 5,
      smartRepeat: false,
      childStepId: 1,
      stepType: STEP_TYPE_MAPPING.repeat,
      workoutSteps: [executableStep],
    };

    describe('isExecutableStep', () => {
      it('should return true for ExecutableStep', () => {
        expect(isExecutableStep(executableStep)).toBe(true);
      });

      it('should return false for RepeatStep', () => {
        expect(isExecutableStep(repeatStep)).toBe(false);
      });
    });

    describe('isRepeatStep', () => {
      it('should return true for RepeatStep', () => {
        expect(isRepeatStep(repeatStep)).toBe(true);
      });

      it('should return false for ExecutableStep', () => {
        expect(isRepeatStep(executableStep)).toBe(false);
      });
    });
  });

  describe('Null Handling Consistency', () => {
    describe('WorkoutPayload null handling', () => {
      it('should accept description as null (required but nullable)', () => {
        const workout: WorkoutPayload = {
          workoutName: 'Test Workout',
          description: null,
          sportType: SPORT_TYPE_MAPPING.running,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  type: 'ExecutableStepDTO',
                  stepId: null,
                  stepOrder: 1,
                  childStepId: null,
                  description: 'Warmup',
                  stepType: STEP_TYPE_MAPPING.warmup,
                  endCondition: END_CONDITION_TYPE_MAPPING.time,
                  endConditionValue: 600,
                  preferredEndConditionUnit: null,
                  targetType: TARGET_TYPE_MAPPING['no target'],
                  targetValueOne: null,
                  targetValueTwo: null,
                  zoneNumber: null,
                  endConditionCompare: null,
                  exerciseName: null,
                  strokeType: null,
                  equipmentType: null,
                  category: null,
                },
              ],
            },
          ],
        };
        expect(validateWorkoutPayload(workout)).toBe(true);
      });

      it('should allow optional fields to be omitted', () => {
        const workout: WorkoutPayload = {
          workoutName: 'Test Workout',
          description: null,
          sportType: SPORT_TYPE_MAPPING.running,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  type: 'ExecutableStepDTO',
                  stepId: null,
                  stepOrder: 1,
                  childStepId: null,
                  description: 'Warmup',
                  stepType: STEP_TYPE_MAPPING.warmup,
                  endCondition: END_CONDITION_TYPE_MAPPING.time,
                  endConditionValue: 600,
                  preferredEndConditionUnit: null,
                  targetType: TARGET_TYPE_MAPPING['no target'],
                  targetValueOne: null,
                  targetValueTwo: null,
                  zoneNumber: null,
                  endConditionCompare: null,
                  exerciseName: null,
                  strokeType: null,
                  equipmentType: null,
                  category: null,
                },
              ],
            },
          ],
        };
        // workoutId, ownerId, timestamps, etc. are all omitted
        expect(workout.workoutId).toBeUndefined();
        expect(workout.ownerId).toBeUndefined();
        expect(validateWorkoutPayload(workout)).toBe(true);
      });
    });

    describe('Nullish coalescing validation', () => {
      it('should catch null values with nullish coalescing', () => {
        const invalidWorkout = {
          workoutName: 'Test',
          description: null,
          sportType: null,
          workoutSegments: [],
        } as any;

        expect(() => validateWorkoutPayload(invalidWorkout)).toThrow('Sport type is required');
      });

      it('should catch undefined values with nullish coalescing', () => {
        const invalidWorkout = {
          workoutName: 'Test',
          description: null,
          sportType: undefined,
          workoutSegments: [],
        } as any;

        expect(() => validateWorkoutPayload(invalidWorkout)).toThrow('Sport type is required');
      });
    });
  });

  describe('Workout Validation', () => {
    const validWorkout: WorkoutPayload = {
      workoutName: 'Test Workout',
      description: null,
      sportType: SPORT_TYPE_MAPPING.running,
      workoutSegments: [
        {
          segmentOrder: 1,
          sportType: SPORT_TYPE_MAPPING.running,
          workoutSteps: [
            {
              type: 'ExecutableStepDTO',
              stepId: null,
              stepOrder: 1,
              childStepId: null,
              description: 'Warmup',
              stepType: STEP_TYPE_MAPPING.warmup,
              endCondition: END_CONDITION_TYPE_MAPPING.time,
              endConditionValue: 600,
              preferredEndConditionUnit: null,
              targetType: TARGET_TYPE_MAPPING['no target'],
              targetValueOne: null,
              targetValueTwo: null,
              zoneNumber: null,
              endConditionCompare: null,
              exerciseName: null,
              strokeType: null,
              equipmentType: null,
              category: null,
            },
          ],
        },
      ],
    };

    describe('validateWorkoutPayload', () => {
      it('should validate a correct workout', () => {
        expect(validateWorkoutPayload(validWorkout)).toBe(true);
      });

      it('should throw error for missing workout name', () => {
        const invalid = { ...validWorkout, workoutName: '' };
        expect(() => validateWorkoutPayload(invalid)).toThrow('Workout name is required');
      });

      it('should throw error for missing sport type', () => {
        const invalid = { ...validWorkout, sportType: undefined as any };
        expect(() => validateWorkoutPayload(invalid)).toThrow('Sport type is required');
      });

      it('should throw error for empty segments', () => {
        const invalid = { ...validWorkout, workoutSegments: [] };
        expect(() => validateWorkoutPayload(invalid)).toThrow('at least one segment');
      });

      it('should throw error for segment without steps', () => {
        const invalid = {
          ...validWorkout,
          workoutSegments: [{ segmentOrder: 1, sportType: SPORT_TYPE_MAPPING.running, workoutSteps: [] }],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('at least one step');
      });

      it('should throw error for invalid segment order', () => {
        const invalid = {
          ...validWorkout,
          workoutSegments: [
            { ...validWorkout.workoutSegments[0], segmentOrder: 0 },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('Invalid segment order');
      });
    });

    describe('step validation', () => {
      it('should throw error for duplicate step orders', () => {
        const invalid: WorkoutPayload = {
          ...validWorkout,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                validWorkout.workoutSegments[0].workoutSteps[0],
                { ...validWorkout.workoutSegments[0].workoutSteps[0], stepOrder: 1 },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('Duplicate step order');
      });

      it('should throw error for invalid step order', () => {
        const invalid: WorkoutPayload = {
          ...validWorkout,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                { ...validWorkout.workoutSegments[0].workoutSteps[0], stepOrder: 0 },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('Invalid step order');
      });

      it('should throw error for missing end condition', () => {
        const invalid: WorkoutPayload = {
          ...validWorkout,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  ...validWorkout.workoutSegments[0].workoutSteps[0],
                  endCondition: undefined as any,
                },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('must have an end condition');
      });

      it('should throw error for lap button with value', () => {
        const invalid: WorkoutPayload = {
          ...validWorkout,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  ...validWorkout.workoutSegments[0].workoutSteps[0],
                  endCondition: END_CONDITION_TYPE_MAPPING['lap.button'],
                  endConditionValue: 100,
                },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('should have value of 1');
      });

      it('should throw error for time condition without value', () => {
        const invalid: WorkoutPayload = {
          ...validWorkout,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  ...validWorkout.workoutSegments[0].workoutSteps[0],
                  endCondition: END_CONDITION_TYPE_MAPPING.time,
                  endConditionValue: null as any,
                },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('must have an end condition value');
      });

      it('should throw error for distance condition without unit', () => {
        const invalid: WorkoutPayload = {
          ...validWorkout,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  ...validWorkout.workoutSegments[0].workoutSteps[0],
                  endCondition: END_CONDITION_TYPE_MAPPING.distance,
                  endConditionValue: 1000,
                  preferredEndConditionUnit: null,
                },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('requires a distance unit');
      });
    });

    describe('repeat step validation', () => {
      it('should validate repeat step with children', () => {
        const workout: WorkoutPayload = {
          workoutName: 'Intervals',
          sportType: SPORT_TYPE_MAPPING.running,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  type: 'RepeatGroupDTO',
                  stepId: null,
                  stepOrder: 1,
                  numberOfIterations: 5,
                  smartRepeat: false,
                  childStepId: 1,
                  stepType: STEP_TYPE_MAPPING.repeat,
                  workoutSteps: [
                    {
                      type: 'ExecutableStepDTO',
                      stepId: null,
                      stepOrder: 1,
                      childStepId: null,
                      description: 'Interval',
                      stepType: STEP_TYPE_MAPPING.interval,
                      endCondition: END_CONDITION_TYPE_MAPPING.distance,
                      endConditionValue: 1000,
                      preferredEndConditionUnit: DISTANCE_UNIT_MAPPING.m,
                      targetType: TARGET_TYPE_MAPPING['no target'],
                      targetValueOne: null,
                      targetValueTwo: null,
                      zoneNumber: null,
                      endConditionCompare: null,
                      exerciseName: null,
                      strokeType: null,
                      equipmentType: null,
                      category: null,
                    },
                  ],
                },
              ],
            },
          ],
        };
        expect(validateWorkoutPayload(workout)).toBe(true);
      });

      it('should throw error for repeat step with zero iterations', () => {
        const invalid: WorkoutPayload = {
          workoutName: 'Intervals',
          sportType: SPORT_TYPE_MAPPING.running,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  type: 'RepeatGroupDTO',
                  stepId: null,
                  stepOrder: 1,
                  numberOfIterations: 0,
                  smartRepeat: false,
                  childStepId: 1,
                  stepType: STEP_TYPE_MAPPING.repeat,
                  workoutSteps: [validWorkout.workoutSegments[0].workoutSteps[0]],
                },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('at least 1 iteration');
      });

      it('should throw error for repeat step without child steps', () => {
        const invalid: WorkoutPayload = {
          workoutName: 'Intervals',
          sportType: SPORT_TYPE_MAPPING.running,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  type: 'RepeatGroupDTO',
                  stepId: null,
                  stepOrder: 1,
                  numberOfIterations: 5,
                  smartRepeat: false,
                  childStepId: 1,
                  stepType: STEP_TYPE_MAPPING.repeat,
                  workoutSteps: [],
                },
              ],
            },
          ],
        };
        expect(() => validateWorkoutPayload(invalid)).toThrow('at least one child step');
      });
    });

    describe('complex workout validation', () => {
      it('should validate a complete interval workout', () => {
        const workout: WorkoutPayload = {
          workoutName: '5x1000m Intervals',
          description: '5 intervals at threshold pace',
          sportType: SPORT_TYPE_MAPPING.running,
          workoutSegments: [
            {
              segmentOrder: 1,
              sportType: SPORT_TYPE_MAPPING.running,
              workoutSteps: [
                {
                  type: 'ExecutableStepDTO',
                  stepId: null,
                  stepOrder: 1,
                  childStepId: null,
                  description: 'Warmup',
                  stepType: STEP_TYPE_MAPPING.warmup,
                  endCondition: END_CONDITION_TYPE_MAPPING.time,
                  endConditionValue: 600,
                  preferredEndConditionUnit: null,
                  targetType: TARGET_TYPE_MAPPING['no target'],
                  targetValueOne: null,
                  targetValueTwo: null,
                  zoneNumber: null,
                  endConditionCompare: null,
                  exerciseName: null,
                  strokeType: null,
                  equipmentType: null,
                  category: null,
                },
                {
                  type: 'RepeatGroupDTO',
                  stepId: null,
                  stepOrder: 2,
                  numberOfIterations: 5,
                  smartRepeat: false,
                  childStepId: 1,
                  stepType: STEP_TYPE_MAPPING.repeat,
                  workoutSteps: [
                    {
                      type: 'ExecutableStepDTO',
                      stepId: null,
                      stepOrder: 1,
                      childStepId: null,
                      description: '1000m work',
                      stepType: STEP_TYPE_MAPPING.interval,
                      endCondition: END_CONDITION_TYPE_MAPPING.distance,
                      endConditionValue: 1000,
                      preferredEndConditionUnit: DISTANCE_UNIT_MAPPING.m,
                      targetType: TARGET_TYPE_MAPPING.pace,
                      // For pace: slower pace (4.2 min/km) = smaller m/s, faster pace (4.0 min/km) = larger m/s
                      // So targetValueOne (min) should be 4.2, targetValueTwo (max) should be 4.0
                      targetValueOne: paceMinKmToMetersPerSec(4.2), // slower = smaller m/s
                      targetValueTwo: paceMinKmToMetersPerSec(4.0), // faster = larger m/s
                      zoneNumber: null,
                      endConditionCompare: null,
                      exerciseName: null,
                      strokeType: null,
                      equipmentType: null,
                      category: null,
                    },
                    {
                      type: 'ExecutableStepDTO',
                      stepId: null,
                      stepOrder: 2,
                      childStepId: null,
                      description: '400m recovery',
                      stepType: STEP_TYPE_MAPPING.recovery,
                      endCondition: END_CONDITION_TYPE_MAPPING.distance,
                      endConditionValue: 400,
                      preferredEndConditionUnit: DISTANCE_UNIT_MAPPING.m,
                      targetType: TARGET_TYPE_MAPPING['no target'],
                      targetValueOne: null,
                      targetValueTwo: null,
                      zoneNumber: null,
                      endConditionCompare: null,
                      exerciseName: null,
                      strokeType: null,
                      equipmentType: null,
                      category: null,
                    },
                  ],
                },
                {
                  type: 'ExecutableStepDTO',
                  stepId: null,
                  stepOrder: 3,
                  childStepId: null,
                  description: 'Cooldown',
                  stepType: STEP_TYPE_MAPPING.cooldown,
                  endCondition: END_CONDITION_TYPE_MAPPING.time,
                  endConditionValue: 600,
                  preferredEndConditionUnit: null,
                  targetType: TARGET_TYPE_MAPPING['no target'],
                  targetValueOne: null,
                  targetValueTwo: null,
                  zoneNumber: null,
                  endConditionCompare: null,
                  exerciseName: null,
                  strokeType: null,
                  equipmentType: null,
                  category: null,
                },
              ],
            },
          ],
        };
        expect(validateWorkoutPayload(workout)).toBe(true);
      });
    });
  });

  describe('Discriminated Unions Validation (Issue #3)', () => {
    describe('validateEndCondition', () => {
      it('should validate time condition', () => {
        const condition: EndCondition = END_CONDITION_TYPE_MAPPING.time;
        expect(() => validateEndCondition(condition, 600, null, 1)).not.toThrow();
      });

      it('should validate distance condition', () => {
        const condition: EndCondition = END_CONDITION_TYPE_MAPPING.distance;
        expect(() => validateEndCondition(condition, 1000, DISTANCE_UNIT_MAPPING.m, 1)).not.toThrow();
      });

      it('should validate lap button condition', () => {
        const condition: EndCondition = END_CONDITION_TYPE_MAPPING['lap.button'];
        expect(() => validateEndCondition(condition, 1, null, 1)).not.toThrow();
      });

      it('should validate iterations condition', () => {
        const condition: EndCondition = END_CONDITION_TYPE_MAPPING.iterations;
        expect(() => validateEndCondition(condition, 5, null, 1)).not.toThrow();
      });

      it('should reject time condition without value', () => {
        const condition = END_CONDITION_TYPE_MAPPING.time;
        expect(() => validateEndCondition(condition, null as any, null, 1)).toThrow('Time condition requires a value');
      });

      it('should reject distance condition without unit', () => {
        const condition = END_CONDITION_TYPE_MAPPING.distance;
        expect(() => validateEndCondition(condition, 1000, null, 1)).toThrow('Distance condition requires a distance unit');
      });

      it('should reject lap button with value', () => {
        const condition = END_CONDITION_TYPE_MAPPING['lap.button'];
        expect(() => validateEndCondition(condition, 100, null, 1)).toThrow('Lap button condition should have value of 1');
      });

      it('should reject iterations with non-integer', () => {
        const condition = END_CONDITION_TYPE_MAPPING.iterations;
        expect(() => validateEndCondition(condition, 5.5, null, 1)).toThrow('Iterations value must be a positive integer');
      });

      it('should reject negative values', () => {
        const condition = END_CONDITION_TYPE_MAPPING.time;
        expect(() => validateEndCondition(condition, -100, null, 1)).toThrow('Time value must be positive');
      });
    });

    describe('validateTarget', () => {
      it('should validate no target', () => {
        const target: Target = {
          targetType: TARGET_TYPE_MAPPING['no target'],
        };
        expect(() => validateTarget(target, 1)).not.toThrow();
      });

      it('should validate zone-based target', () => {
        const target: Target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: 3,
        };
        expect(() => validateTarget(target, 1)).not.toThrow();
      });

      it('should validate custom range target', () => {
        const target: Target = {
          targetType: TARGET_TYPE_MAPPING.pace,
          targetValueOne: 3.0,
          targetValueTwo: 3.5,
        };
        expect(() => validateTarget(target, 1)).not.toThrow();
      });

      it('should reject zone target with both zone and custom range (XOR violation)', () => {
        const target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: 3,
          targetValueOne: 140,
          targetValueTwo: 160,
        } as any;
        expect(() => validateTarget(target, 1)).toThrow('cannot have both zone number and custom range');
      });

      it('should reject zone target with neither zone nor custom range', () => {
        const target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
        } as any;
        expect(() => validateTarget(target, 1)).toThrow('requires either zone number or custom range');
      });

      it('should reject invalid custom range (valueOne >= valueTwo)', () => {
        const target = {
          targetType: TARGET_TYPE_MAPPING.pace,
          targetValueOne: 3.5,
          targetValueTwo: 3.0,
        } as any;
        expect(() => validateTarget(target, 1)).toThrow('targetValueOne must be less than targetValueTwo');
      });

      it('should reject negative zone number', () => {
        const target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: -1,
        } as any;
        expect(() => validateTarget(target, 1)).toThrow('Zone number must be a positive integer');
      });

      it('should reject non-integer zone number', () => {
        const target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: 3.5,
        } as any;
        expect(() => validateTarget(target, 1)).toThrow('Zone number must be a positive integer');
      });

      it('should validate against HR zone config', () => {
        const zoneConfig: HeartRateZoneConfig = {
          maxHR: 185,
          zones: [
            { zoneNumber: 1, minHR: 50, maxHR: 100 },
            { zoneNumber: 2, minHR: 100, maxHR: 130 },
            { zoneNumber: 3, minHR: 130, maxHR: 150 },
          ],
        };

        const validTarget: Target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: 2,
        };
        expect(() => validateTarget(validTarget, 1, zoneConfig)).not.toThrow();

        const invalidTarget = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: 10,
        } as any;
        expect(() => validateTarget(invalidTarget, 1, zoneConfig)).toThrow('Invalid zone number 10');
      });

      it('should reject no target with values', () => {
        const target = {
          targetType: TARGET_TYPE_MAPPING['no target'],
          targetValueOne: 100,
        } as any;
        expect(() => validateTarget(target, 1)).toThrow('No target should not have targetValueOne');
      });
    });

    describe('Helper Functions', () => {
      it('should create zone target', () => {
        const target = createZoneTarget(TARGET_TYPE_MAPPING['heart rate'], 3);
        expect(target.targetType).toBe(TARGET_TYPE_MAPPING['heart rate']);
        expect(target.zoneNumber).toBe(3);
        expect(target.targetValueOne).toBeUndefined();
        expect(target.targetValueTwo).toBeUndefined();
      });

      it('should create custom range target', () => {
        const target = createCustomRangeTarget(TARGET_TYPE_MAPPING.pace, 3.0, 3.5);
        expect(target.targetType).toBe(TARGET_TYPE_MAPPING.pace);
        expect(target.targetValueOne).toBe(3.0);
        expect(target.targetValueTwo).toBe(3.5);
        expect(target.zoneNumber).toBeUndefined();
      });

      it('should create no target', () => {
        const target = createNoTarget();
        expect(target.targetType).toBe(TARGET_TYPE_MAPPING['no target']);
        expect(target.targetValueOne).toBeUndefined();
        expect(target.targetValueTwo).toBeUndefined();
        expect(target.zoneNumber).toBeUndefined();
      });

      it('should reject creating zone target for "no target" type', () => {
        expect(() => createZoneTarget(TARGET_TYPE_MAPPING['no target'], 3)).toThrow(
          'Cannot create zone target for "no target" type'
        );
      });

      it('should reject creating custom range target for "no target" type', () => {
        expect(() => createCustomRangeTarget(TARGET_TYPE_MAPPING['no target'], 3.0, 3.5)).toThrow(
          'Cannot create custom range target for "no target" type'
        );
      });
    });

    describe('Exhaustiveness Checking', () => {
      it('should use all valid end condition types in validation', () => {
        // This test ensures we handle all condition types
        const types = [
          END_CONDITION_TYPE_MAPPING.time,
          END_CONDITION_TYPE_MAPPING.distance,
          END_CONDITION_TYPE_MAPPING['lap.button'],
          END_CONDITION_TYPE_MAPPING.iterations,
        ];

        for (const type of types) {
          const condition: EndCondition = type;
          if (type.conditionTypeKey === 'lap.button') {
            expect(() => validateEndCondition(condition, 1, null, 1)).not.toThrow();
          } else if (type.conditionTypeKey === 'distance') {
            expect(() => validateEndCondition(condition, 1000, DISTANCE_UNIT_MAPPING.m, 1)).not.toThrow();
          } else {
            expect(() => validateEndCondition(condition, 600, null, 1)).not.toThrow();
          }
        }
      });

      it('should use all valid target types in validation', () => {
        // This test ensures we handle all target types
        const types = [
          { type: TARGET_TYPE_MAPPING['no target'], hasValues: false },
          { type: TARGET_TYPE_MAPPING.power, hasValues: true },
          { type: TARGET_TYPE_MAPPING.cadence, hasValues: true },
          { type: TARGET_TYPE_MAPPING['heart rate'], hasValues: true },
          { type: TARGET_TYPE_MAPPING.speed, hasValues: true },
          { type: TARGET_TYPE_MAPPING.pace, hasValues: true },
        ];

        for (const { type, hasValues } of types) {
          let target: Target;
          if (hasValues) {
            target = { targetType: type, zoneNumber: 3 };
          } else {
            target = { targetType: type };
          }
          expect(() => validateTarget(target, 1)).not.toThrow();
        }
      });
    });
  });

  describe('Custom Zone Configuration (Issue #5)', () => {
    describe('Standard zones', () => {
      it('should provide standard HR zones', () => {
        expect(STANDARD_HR_ZONES).toHaveLength(5);
        expect(STANDARD_HR_ZONES[0]).toMatchObject({
          zoneNumber: 1,
          minPercent: 50,
          maxPercent: 60,
          name: 'Recovery',
        });
        expect(STANDARD_HR_ZONES[4]).toMatchObject({
          zoneNumber: 5,
          minPercent: 90,
          maxPercent: 100,
          name: 'VO2 Max',
        });
      });

      it('should provide standard power zones', () => {
        expect(STANDARD_POWER_ZONES).toHaveLength(6);
        expect(STANDARD_POWER_ZONES[0]).toMatchObject({
          zoneNumber: 1,
          minPercent: 0,
          maxPercent: 55,
          name: 'Active Recovery',
        });
        expect(STANDARD_POWER_ZONES[5]).toMatchObject({
          zoneNumber: 6,
          minPercent: 120,
          maxPercent: 200,
          name: 'Anaerobic Capacity',
        });
      });
    });

    describe('calculateAbsoluteHRZones', () => {
      it('should calculate absolute HR zones from max HR', () => {
        const config = calculateAbsoluteHRZones(185);
        expect(config.maxHR).toBe(185);
        expect(config.zones).toHaveLength(5);

        // Zone 1: 50-60% of 185 = 93-111 bpm
        expect(config.zones[0]).toMatchObject({
          zoneNumber: 1,
          minHR: 93,
          maxHR: 111,
          name: 'Recovery',
        });

        // Zone 5: 90-100% of 185 = 167-185 bpm
        expect(config.zones[4]).toMatchObject({
          zoneNumber: 5,
          minHR: 167,
          maxHR: 185,
          name: 'VO2 Max',
        });
      });

      it('should reject invalid max HR', () => {
        expect(() => calculateAbsoluteHRZones(0)).toThrow('Max HR must be between 1 and 250');
        expect(() => calculateAbsoluteHRZones(300)).toThrow('Max HR must be between 1 and 250');
        expect(() => calculateAbsoluteHRZones(-50)).toThrow('Max HR must be between 1 and 250');
      });
    });

    describe('calculateAbsolutePowerZones', () => {
      it('should calculate absolute power zones from FTP', () => {
        const config = calculateAbsolutePowerZones(250);
        expect(config.ftp).toBe(250);
        expect(config.zones).toHaveLength(6);

        // Zone 1: 0-55% of 250 = 0-138W
        expect(config.zones[0]).toMatchObject({
          zoneNumber: 1,
          minPower: 0,
          maxPower: 138,
          name: 'Active Recovery',
        });

        // Zone 4: 90-105% of 250 = 225-263W
        expect(config.zones[3]).toMatchObject({
          zoneNumber: 4,
          minPower: 225,
          maxPower: 263,
          name: 'Lactate Threshold',
        });
      });

      it('should reject invalid FTP', () => {
        expect(() => calculateAbsolutePowerZones(0)).toThrow('FTP must be between 1 and 1000');
        expect(() => calculateAbsolutePowerZones(1500)).toThrow('FTP must be between 1 and 1000');
        expect(() => calculateAbsolutePowerZones(-100)).toThrow('FTP must be between 1 and 1000');
      });
    });

    describe('getZoneTargetValues', () => {
      it('should get target values for a specific zone', () => {
        const config = calculateAbsoluteHRZones(185);
        const zone3 = getZoneTargetValues(3, config);

        // Zone 3: 70-80% of 185 = 130-148 bpm
        expect(zone3.min).toBe(130);
        expect(zone3.max).toBe(148);
      });

      it('should throw error for non-existent zone', () => {
        const config = calculateAbsoluteHRZones(185);
        expect(() => getZoneTargetValues(10, config)).toThrow('Zone 10 not found');
      });
    });

    describe('validateHeartRateZoneConfig', () => {
      it('should validate a valid HR zone config', () => {
        const config = calculateAbsoluteHRZones(185);
        expect(() => validateHeartRateZoneConfig(config)).not.toThrow();
      });

      it('should reject invalid max HR', () => {
        const config: HeartRateZoneConfig = {
          maxHR: 0,
          zones: [{ zoneNumber: 1, minHR: 50, maxHR: 100 }],
        };
        expect(() => validateHeartRateZoneConfig(config)).toThrow('Max HR must be between');
      });

      it('should reject empty zones', () => {
        const config: HeartRateZoneConfig = {
          maxHR: 185,
          zones: [],
        };
        expect(() => validateHeartRateZoneConfig(config)).toThrow('must have at least one zone');
      });

      it('should reject invalid zone numbers', () => {
        const config: HeartRateZoneConfig = {
          maxHR: 185,
          zones: [{ zoneNumber: 0, minHR: 50, maxHR: 100 }],
        };
        expect(() => validateHeartRateZoneConfig(config)).toThrow('Zone number must be positive');
      });

      it('should reject invalid HR ranges', () => {
        const config: HeartRateZoneConfig = {
          maxHR: 185,
          zones: [{ zoneNumber: 1, minHR: 100, maxHR: 50 }],
        };
        expect(() => validateHeartRateZoneConfig(config)).toThrow('Invalid maxHR');
      });

      it('should reject overlapping zones', () => {
        const config: HeartRateZoneConfig = {
          maxHR: 185,
          zones: [
            { zoneNumber: 1, minHR: 50, maxHR: 110 },
            { zoneNumber: 2, minHR: 100, maxHR: 130 }, // overlaps with zone 1
          ],
        };
        expect(() => validateHeartRateZoneConfig(config)).toThrow('overlap');
      });
    });

    describe('validatePowerZoneConfig', () => {
      it('should validate a valid power zone config', () => {
        const config = calculateAbsolutePowerZones(250);
        expect(() => validatePowerZoneConfig(config)).not.toThrow();
      });

      it('should reject invalid FTP', () => {
        const config: PowerZoneConfig = {
          ftp: 0,
          zones: [{ zoneNumber: 1, minPower: 0, maxPower: 100 }],
        };
        expect(() => validatePowerZoneConfig(config)).toThrow('FTP must be between');
      });

      it('should reject empty zones', () => {
        const config: PowerZoneConfig = {
          ftp: 250,
          zones: [],
        };
        expect(() => validatePowerZoneConfig(config)).toThrow('must have at least one zone');
      });

      it('should reject invalid power ranges', () => {
        const config: PowerZoneConfig = {
          ftp: 250,
          zones: [{ zoneNumber: 1, minPower: 100, maxPower: 50 }],
        };
        expect(() => validatePowerZoneConfig(config)).toThrow('Invalid maxPower');
      });

      it('should reject overlapping zones', () => {
        const config: PowerZoneConfig = {
          ftp: 250,
          zones: [
            { zoneNumber: 1, minPower: 0, maxPower: 150 },
            { zoneNumber: 2, minPower: 140, maxPower: 200 }, // overlaps with zone 1
          ],
        };
        expect(() => validatePowerZoneConfig(config)).toThrow('overlap');
      });
    });

    describe('Integration with validateTarget', () => {
      it('should validate zone targets with custom HR zone config', () => {
        const zoneConfig = calculateAbsoluteHRZones(185);

        const target1: Target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: 3,
        };
        expect(() => validateTarget(target1, 1, zoneConfig)).not.toThrow();

        const target2: Target = {
          targetType: TARGET_TYPE_MAPPING['heart rate'],
          zoneNumber: 10, // invalid
        };
        expect(() => validateTarget(target2, 1, zoneConfig)).toThrow('Invalid zone number 10');
      });

      it('should work with zone-based helper functions', () => {
        const zoneConfig = calculateAbsoluteHRZones(185);
        const zone3Values = getZoneTargetValues(3, zoneConfig);

        // Create custom range target using zone values
        const target = createCustomRangeTarget(
          TARGET_TYPE_MAPPING['heart rate'],
          zone3Values.min,
          zone3Values.max
        );

        expect(() => validateTarget(target, 1)).not.toThrow();
        expect(target.targetValueOne).toBe(130);
        expect(target.targetValueTwo).toBe(148);
      });
    });
  });
});

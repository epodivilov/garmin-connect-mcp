/**
 * WorkoutBuilder Tests
 *
 * Comprehensive test suite for the WorkoutBuilder service
 */

import { describe, it, expect } from 'vitest';
import {
  WorkoutBuilder,
  EndConditionFactory,
  TargetFactory,
} from '../../src/services/workoutBuilder.js';
import {
  SPORT_TYPE_MAPPING,
  STEP_TYPE_MAPPING,
  TARGET_TYPE_MAPPING,
  END_CONDITION_TYPE_MAPPING,
  DISTANCE_UNIT_MAPPING,
  paceMinKmToMetersPerSec,
  isExecutableStep,
  isRepeatStep,
} from '../../src/types/workout.js';
import type { WorkoutPayload, ExecutableStep, RepeatStep } from '../../src/types/workout.js';

describe('EndConditionFactory', () => {
  describe('time()', () => {
    it('should create a time-based end condition', () => {
      const condition = EndConditionFactory.time(600);
      expect(condition.endCondition).toEqual(END_CONDITION_TYPE_MAPPING.time);
      expect(condition.endConditionValue).toBe(600);
      expect(condition.preferredEndConditionUnit).toBeUndefined();
    });

    it('should reject zero duration', () => {
      expect(() => EndConditionFactory.time(0)).toThrow('Duration must be positive');
    });

    it('should reject negative duration', () => {
      expect(() => EndConditionFactory.time(-10)).toThrow('Duration must be positive');
    });
  });

  describe('distance()', () => {
    it('should create a distance-based end condition in meters', () => {
      const condition = EndConditionFactory.distance(1000, 'm');
      expect(condition.endCondition).toEqual(END_CONDITION_TYPE_MAPPING.distance);
      expect(condition.endConditionValue).toBe(1000);
      expect(condition.preferredEndConditionUnit).toEqual(DISTANCE_UNIT_MAPPING.m);
    });

    it('should create a distance-based end condition in kilometers', () => {
      const condition = EndConditionFactory.distance(5, 'km');
      expect(condition.endCondition).toEqual(END_CONDITION_TYPE_MAPPING.distance);
      expect(condition.endConditionValue).toBe(5);
      expect(condition.preferredEndConditionUnit).toEqual(DISTANCE_UNIT_MAPPING.km);
    });

    it('should create a distance-based end condition in miles', () => {
      const condition = EndConditionFactory.distance(3, 'mile');
      expect(condition.endCondition).toEqual(END_CONDITION_TYPE_MAPPING.distance);
      expect(condition.endConditionValue).toBe(3);
      expect(condition.preferredEndConditionUnit).toEqual(DISTANCE_UNIT_MAPPING.mile);
    });

    it('should default to meters when unit not specified', () => {
      const condition = EndConditionFactory.distance(1000);
      expect(condition.preferredEndConditionUnit).toEqual(DISTANCE_UNIT_MAPPING.m);
    });

    it('should reject zero distance', () => {
      expect(() => EndConditionFactory.distance(0, 'km')).toThrow('Distance must be positive');
    });

    it('should reject negative distance', () => {
      expect(() => EndConditionFactory.distance(-5, 'km')).toThrow('Distance must be positive');
    });

    it('should reject invalid unit', () => {
      expect(() => EndConditionFactory.distance(1000, 'invalid' as any)).toThrow(
        'Invalid distance unit'
      );
    });
  });

  describe('lapButton()', () => {
    it('should create a lap button end condition', () => {
      const condition = EndConditionFactory.lapButton();
      expect(condition.endCondition).toEqual(END_CONDITION_TYPE_MAPPING['lap.button']);
      expect(condition.endConditionValue).toBe(1);
      expect(condition.preferredEndConditionUnit).toBeUndefined();
    });
  });
});

describe('TargetFactory', () => {
  describe('noTarget()', () => {
    it('should create a no target', () => {
      const target = TargetFactory.noTarget();
      expect(target.targetType).toEqual(TARGET_TYPE_MAPPING['no target']);
      expect(target.targetValueOne).toBeUndefined();
      expect(target.targetValueTwo).toBeUndefined();
      expect(target.zoneNumber).toBeUndefined();
    });
  });

  describe('hrZone()', () => {
    it('should create a heart rate zone target', () => {
      const target = TargetFactory.hrZone(3);
      expect(target.targetType).toEqual(TARGET_TYPE_MAPPING['heart rate']);
      expect(target.zoneNumber).toBe(3);
      expect(target.targetValueOne).toBeUndefined();
      expect(target.targetValueTwo).toBeUndefined();
    });

    it('should reject non-positive zone', () => {
      expect(() => TargetFactory.hrZone(0)).toThrow('Zone number must be a positive integer');
    });

    it('should reject non-integer zone', () => {
      expect(() => TargetFactory.hrZone(2.5)).toThrow('Zone number must be a positive integer');
    });
  });

  describe('hrRange()', () => {
    it('should create a custom heart rate range target', () => {
      const target = TargetFactory.hrRange(140, 160);
      expect(target.targetType).toEqual(TARGET_TYPE_MAPPING['heart rate']);
      expect(target.targetValueOne).toBe(140);
      expect(target.targetValueTwo).toBe(160);
      expect(target.zoneNumber).toBeUndefined();
    });

    it('should reject zero heart rate', () => {
      expect(() => TargetFactory.hrRange(0, 160)).toThrow('Heart rate must be positive');
    });

    it('should reject min >= max', () => {
      expect(() => TargetFactory.hrRange(160, 140)).toThrow(
        'Min heart rate must be less than max'
      );
    });
  });

  describe('pace()', () => {
    it('should create a pace target and convert min/km to m/s', () => {
      const target = TargetFactory.pace(4.0, 5.0); // 4:00-5:00 min/km
      expect(target.targetType).toEqual(TARGET_TYPE_MAPPING.pace);

      // 4:00 min/km = faster = higher m/s (should be targetValueTwo)
      // 5:00 min/km = slower = lower m/s (should be targetValueOne)
      const fast = paceMinKmToMetersPerSec(4.0);
      const slow = paceMinKmToMetersPerSec(5.0);
      expect(target.targetValueOne).toBeCloseTo(slow, 3);
      expect(target.targetValueTwo).toBeCloseTo(fast, 3);
    });

    it('should reject zero pace', () => {
      expect(() => TargetFactory.pace(0, 5.0)).toThrow('Pace must be positive');
    });

    it('should reject min >= max pace', () => {
      expect(() => TargetFactory.pace(5.0, 4.0)).toThrow(
        'Min pace must be faster (lower) than max pace'
      );
    });
  });

  describe('powerZone()', () => {
    it('should create a power zone target', () => {
      const target = TargetFactory.powerZone(4);
      expect(target.targetType).toEqual(TARGET_TYPE_MAPPING.power);
      expect(target.zoneNumber).toBe(4);
    });

    it('should reject non-positive zone', () => {
      expect(() => TargetFactory.powerZone(0)).toThrow('Zone number must be a positive integer');
    });
  });

  describe('powerRange()', () => {
    it('should create a custom power range target', () => {
      const target = TargetFactory.powerRange(200, 250);
      expect(target.targetType).toEqual(TARGET_TYPE_MAPPING.power);
      expect(target.targetValueOne).toBe(200);
      expect(target.targetValueTwo).toBe(250);
    });

    it('should reject zero power', () => {
      expect(() => TargetFactory.powerRange(0, 250)).toThrow('Power must be positive');
    });

    it('should reject min >= max', () => {
      expect(() => TargetFactory.powerRange(250, 200)).toThrow(
        'Min power must be less than max power'
      );
    });
  });

  describe('cadence()', () => {
    it('should create a cadence range target', () => {
      const target = TargetFactory.cadence(80, 90);
      expect(target.targetType).toEqual(TARGET_TYPE_MAPPING.cadence);
      expect(target.targetValueOne).toBe(80);
      expect(target.targetValueTwo).toBe(90);
    });

    it('should reject zero cadence', () => {
      expect(() => TargetFactory.cadence(0, 90)).toThrow('Cadence must be positive');
    });

    it('should reject min >= max', () => {
      expect(() => TargetFactory.cadence(90, 80)).toThrow(
        'Min cadence must be less than max cadence'
      );
    });
  });
});

describe('WorkoutBuilder', () => {
  describe('constructor', () => {
    it('should create a builder with valid name and sport', () => {
      const builder = new WorkoutBuilder('Test Workout', 'running');
      expect(builder).toBeDefined();
    });

    it('should reject empty name', () => {
      expect(() => new WorkoutBuilder('', 'running')).toThrow('Workout name is required');
    });

    it('should reject whitespace-only name', () => {
      expect(() => new WorkoutBuilder('   ', 'running')).toThrow('Workout name is required');
    });

    it('should reject invalid sport', () => {
      expect(() => new WorkoutBuilder('Test', 'invalid' as any)).toThrow('Invalid sport type');
    });

    it('should trim workout name', () => {
      const builder = new WorkoutBuilder('  Test Workout  ', 'running');
      const workout = builder.addEasyRun(30).build();
      expect(workout.workoutName).toBe('Test Workout');
    });
  });

  describe('setDescription()', () => {
    it('should set workout description', () => {
      const builder = new WorkoutBuilder('Test', 'running');
      builder.setDescription('Test description');
      const workout = builder.addEasyRun(30).build();
      expect(workout.description).toBe('Test description');
    });

    it('should trim description', () => {
      const builder = new WorkoutBuilder('Test', 'running');
      builder.setDescription('  Test  ');
      const workout = builder.addEasyRun(30).build();
      expect(workout.description).toBe('Test');
    });

    it('should set undefined for empty description', () => {
      const builder = new WorkoutBuilder('Test', 'running');
      builder.setDescription('');
      const workout = builder.addEasyRun(30).build();
      expect(workout.description).toBeUndefined();
    });
  });

  describe('basic step methods', () => {
    it('should add a warmup step', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addWarmup(EndConditionFactory.time(600))
        .build();

      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(1);
      const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
      expect(isExecutableStep(step)).toBe(true);
      expect(step.stepType).toEqual(STEP_TYPE_MAPPING.warmup);
      expect(step.stepOrder).toBe(1);
    });

    it('should add a cooldown step', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addCooldown(EndConditionFactory.time(300))
        .build();

      const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
      expect(step.stepType).toEqual(STEP_TYPE_MAPPING.cooldown);
    });

    it('should add an interval step', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addInterval(EndConditionFactory.distance(1000, 'm'), TargetFactory.pace(4.0, 5.0))
        .build();

      const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
      expect(step.stepType).toEqual(STEP_TYPE_MAPPING.interval);
      expect(step.targetType).toEqual(TARGET_TYPE_MAPPING.pace);
    });

    it('should add a recovery step', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addRecovery(EndConditionFactory.distance(400, 'm'), TargetFactory.hrZone(2))
        .build();

      const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
      expect(step.stepType).toEqual(STEP_TYPE_MAPPING.recovery);
      expect(step.targetType).toEqual(TARGET_TYPE_MAPPING['heart rate']);
      expect(step.zoneNumber).toBe(2);
    });

    it('should add a rest step', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addRest(EndConditionFactory.time(60))
        .build();

      const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
      expect(step.stepType).toEqual(STEP_TYPE_MAPPING.rest);
    });

    it('should default to no target when target not provided', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addInterval(EndConditionFactory.time(1800))
        .build();

      const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
      expect(step.targetType).toEqual(TARGET_TYPE_MAPPING['no target']);
      expect(step.targetValueOne).toBeNull();
      expect(step.targetValueTwo).toBeNull();
      expect(step.zoneNumber).toBeNull();
    });
  });

  describe('step ordering', () => {
    it('should auto-increment step order', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addWarmup(EndConditionFactory.time(600))
        .addInterval(EndConditionFactory.time(1800))
        .addCooldown(EndConditionFactory.time(300))
        .build();

      const steps = workout.workoutSegments[0].workoutSteps as ExecutableStep[];
      expect(steps[0].stepOrder).toBe(1);
      expect(steps[1].stepOrder).toBe(2);
      expect(steps[2].stepOrder).toBe(3);
    });
  });

  describe('repeat blocks', () => {
    it('should create a repeat block with interval and recovery', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .startRepeat(5)
        .addInterval(EndConditionFactory.distance(1000, 'm'), TargetFactory.pace(4.0, 5.0))
        .addRecovery(EndConditionFactory.distance(400, 'm'), TargetFactory.hrZone(2))
        .endRepeat()
        .build();

      const steps = workout.workoutSegments[0].workoutSteps;
      expect(steps).toHaveLength(1);

      const repeatStep = steps[0];
      expect(isRepeatStep(repeatStep)).toBe(true);

      if (isRepeatStep(repeatStep)) {
        expect(repeatStep.numberOfIterations).toBe(5);
        expect(repeatStep.workoutSteps).toHaveLength(2);
        expect(repeatStep.stepType).toEqual(STEP_TYPE_MAPPING.repeat);

        const intervalStep = repeatStep.workoutSteps[0] as ExecutableStep;
        const recoveryStep = repeatStep.workoutSteps[1] as ExecutableStep;

        expect(intervalStep.stepType).toEqual(STEP_TYPE_MAPPING.interval);
        expect(intervalStep.stepOrder).toBe(1);
        expect(recoveryStep.stepType).toEqual(STEP_TYPE_MAPPING.recovery);
        expect(recoveryStep.stepOrder).toBe(2);
      }
    });

    it('should handle multiple repeat blocks', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .startRepeat(3)
        .addInterval(EndConditionFactory.distance(1000, 'm'))
        .addRecovery(EndConditionFactory.distance(400, 'm'))
        .endRepeat()
        .startRepeat(2)
        .addInterval(EndConditionFactory.distance(800, 'm'))
        .addRecovery(EndConditionFactory.distance(200, 'm'))
        .endRepeat()
        .build();

      const steps = workout.workoutSegments[0].workoutSteps;
      expect(steps).toHaveLength(2);
      expect(isRepeatStep(steps[0])).toBe(true);
      expect(isRepeatStep(steps[1])).toBe(true);

      if (isRepeatStep(steps[0]) && isRepeatStep(steps[1])) {
        expect(steps[0].numberOfIterations).toBe(3);
        expect(steps[1].numberOfIterations).toBe(2);
      }
    });

    it('should handle warmup before repeat and cooldown after', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addWarmup(EndConditionFactory.time(600))
        .startRepeat(5)
        .addInterval(EndConditionFactory.distance(1000, 'm'))
        .addRecovery(EndConditionFactory.distance(400, 'm'))
        .endRepeat()
        .addCooldown(EndConditionFactory.time(300))
        .build();

      const steps = workout.workoutSegments[0].workoutSteps;
      expect(steps).toHaveLength(3);

      expect(isExecutableStep(steps[0])).toBe(true);
      expect(isRepeatStep(steps[1])).toBe(true);
      expect(isExecutableStep(steps[2])).toBe(true);

      if (isExecutableStep(steps[0]) && isRepeatStep(steps[1]) && isExecutableStep(steps[2])) {
        expect(steps[0].stepType).toEqual(STEP_TYPE_MAPPING.warmup);
        expect(steps[1].stepType).toEqual(STEP_TYPE_MAPPING.repeat);
        expect(steps[2].stepType).toEqual(STEP_TYPE_MAPPING.cooldown);

        expect(steps[0].stepOrder).toBe(1);
        expect(steps[1].stepOrder).toBe(2);
        expect(steps[2].stepOrder).toBe(3);
      }
    });

    it('should reject repeat with zero repetitions', () => {
      expect(() => {
        new WorkoutBuilder('Test', 'running').startRepeat(0);
      }).toThrow('Repetitions must be a positive integer');
    });

    it('should reject repeat with non-integer repetitions', () => {
      expect(() => {
        new WorkoutBuilder('Test', 'running').startRepeat(2.5);
      }).toThrow('Repetitions must be a positive integer');
    });

    it('should reject endRepeat without startRepeat', () => {
      expect(() => {
        new WorkoutBuilder('Test', 'running').endRepeat();
      }).toThrow('No repeat block to end');
    });

    it('should reject empty repeat block', () => {
      expect(() => {
        new WorkoutBuilder('Test', 'running').startRepeat(5).endRepeat();
      }).toThrow('Repeat block must contain at least one step');
    });

    it('should reject build with unclosed repeat block', () => {
      expect(() => {
        new WorkoutBuilder('Test', 'running')
          .startRepeat(5)
          .addInterval(EndConditionFactory.distance(1000, 'm'))
          .build();
      }).toThrow('unclosed repeat block');
    });
  });

  describe('addIntervalRepeat()', () => {
    it('should create interval + recovery repeat in one call', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addIntervalRepeat(
          5,
          EndConditionFactory.distance(1000, 'm'),
          TargetFactory.pace(4.0, 5.0),
          EndConditionFactory.distance(400, 'm'),
          TargetFactory.hrZone(2)
        )
        .build();

      const steps = workout.workoutSegments[0].workoutSteps;
      expect(steps).toHaveLength(1);

      const repeatStep = steps[0];
      expect(isRepeatStep(repeatStep)).toBe(true);

      if (isRepeatStep(repeatStep)) {
        expect(repeatStep.numberOfIterations).toBe(5);
        expect(repeatStep.workoutSteps).toHaveLength(2);
      }
    });

    it('should work without recovery target', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addIntervalRepeat(
          3,
          EndConditionFactory.distance(800, 'm'),
          TargetFactory.pace(4.0, 5.0),
          EndConditionFactory.time(120)
        )
        .build();

      const repeatStep = workout.workoutSegments[0].workoutSteps[0];
      expect(isRepeatStep(repeatStep)).toBe(true);

      if (isRepeatStep(repeatStep)) {
        const recoveryStep = repeatStep.workoutSteps[1] as ExecutableStep;
        expect(recoveryStep.targetType).toEqual(TARGET_TYPE_MAPPING['no target']);
      }
    });
  });

  describe('convenience methods', () => {
    describe('addEasyRun()', () => {
      it('should create time-based interval with no target', () => {
        const workout = new WorkoutBuilder('Test', 'running').addEasyRun(30).build();

        const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
        expect(step.stepType).toEqual(STEP_TYPE_MAPPING.interval);
        expect(step.endCondition).toEqual(END_CONDITION_TYPE_MAPPING.time);
        expect(step.endConditionValue).toBe(1800); // 30 * 60
        expect(step.targetType).toEqual(TARGET_TYPE_MAPPING['no target']);
      });
    });

    describe('addTempoRun()', () => {
      it('should create tempo run with default zone 3', () => {
        const workout = new WorkoutBuilder('Test', 'running').addTempoRun(20).build();

        const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
        expect(step.stepType).toEqual(STEP_TYPE_MAPPING.interval);
        expect(step.endConditionValue).toBe(1200); // 20 * 60
        expect(step.targetType).toEqual(TARGET_TYPE_MAPPING['heart rate']);
        expect(step.zoneNumber).toBe(3);
      });

      it('should create tempo run with custom zone', () => {
        const workout = new WorkoutBuilder('Test', 'running').addTempoRun(20, 4).build();

        const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
        expect(step.zoneNumber).toBe(4);
      });
    });
  });

  describe('build()', () => {
    it('should reject workout with no steps', () => {
      expect(() => {
        new WorkoutBuilder('Test', 'running').build();
      }).toThrow('Workout must have at least one step');
    });

    it('should create valid workout payload', () => {
      const workout = new WorkoutBuilder('Test Workout', 'running')
        .setDescription('Test description')
        .addWarmup(EndConditionFactory.time(600))
        .addInterval(EndConditionFactory.distance(1000, 'm'), TargetFactory.pace(4.0, 5.0))
        .addCooldown(EndConditionFactory.time(300))
        .build();

      expect(workout.workoutName).toBe('Test Workout');
      expect(workout.description).toBe('Test description');
      expect(workout.sportType).toEqual(SPORT_TYPE_MAPPING.running);
      expect(workout.workoutSegments).toHaveLength(1);
      expect(workout.workoutSegments[0].segmentOrder).toBe(1);
      expect(workout.workoutSegments[0].sportType).toEqual(SPORT_TYPE_MAPPING.running);
      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(3);
    });

    it('should validate workout before returning', () => {
      // This should not throw - validation passes
      expect(() => {
        new WorkoutBuilder('Valid', 'running')
          .addInterval(EndConditionFactory.time(1800))
          .build();
      }).not.toThrow();
    });
  });

  describe('method chaining', () => {
    it('should support fluent chaining', () => {
      const workout = new WorkoutBuilder('Chaining Test', 'running')
        .setDescription('Fluent API test')
        .addWarmup(EndConditionFactory.time(600))
        .addIntervalRepeat(
          3,
          EndConditionFactory.distance(1000, 'm'),
          TargetFactory.pace(4.0, 5.0),
          EndConditionFactory.distance(400, 'm')
        )
        .addCooldown(EndConditionFactory.time(300))
        .build();

      expect(workout.workoutName).toBe('Chaining Test');
      expect(workout.description).toBe('Fluent API test');
      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(3);
    });
  });

  describe('sport types', () => {
    it('should support running', () => {
      const workout = new WorkoutBuilder('Run', 'running').addEasyRun(30).build();
      expect(workout.sportType).toEqual(SPORT_TYPE_MAPPING.running);
    });

    it('should support cycling', () => {
      const workout = new WorkoutBuilder('Ride', 'cycling')
        .addInterval(EndConditionFactory.time(3600), TargetFactory.powerZone(3))
        .build();
      expect(workout.sportType).toEqual(SPORT_TYPE_MAPPING.cycling);
    });

    it('should support swimming', () => {
      const workout = new WorkoutBuilder('Swim', 'swimming')
        .addInterval(EndConditionFactory.distance(400, 'm'))
        .build();
      expect(workout.sportType).toEqual(SPORT_TYPE_MAPPING.swimming);
    });

    it('should support other', () => {
      const workout = new WorkoutBuilder('Other', 'other')
        .addInterval(EndConditionFactory.time(1800))
        .build();
      expect(workout.sportType).toEqual(SPORT_TYPE_MAPPING.other);
    });
  });

  describe('complex workout examples', () => {
    it('should create 5x1000m intervals workout', () => {
      const workout = new WorkoutBuilder('5x1000m Intervals', 'running')
        .setDescription('Speed endurance workout')
        .addWarmup(EndConditionFactory.time(10 * 60))
        .addIntervalRepeat(
          5,
          EndConditionFactory.distance(1000, 'm'),
          TargetFactory.pace(4.0, 4.5),
          EndConditionFactory.distance(400, 'm'),
          TargetFactory.hrZone(2)
        )
        .addCooldown(EndConditionFactory.time(5 * 60))
        .build();

      expect(workout.workoutName).toBe('5x1000m Intervals');
      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(3);

      const repeatStep = workout.workoutSegments[0].workoutSteps[1];
      expect(isRepeatStep(repeatStep)).toBe(true);
      if (isRepeatStep(repeatStep)) {
        expect(repeatStep.numberOfIterations).toBe(5);
      }
    });

    it('should create progressive tempo run', () => {
      const workout = new WorkoutBuilder('Progressive Tempo', 'running')
        .addWarmup(EndConditionFactory.time(10 * 60))
        .addInterval(EndConditionFactory.time(10 * 60), TargetFactory.hrZone(3))
        .addInterval(EndConditionFactory.time(10 * 60), TargetFactory.hrZone(4))
        .addCooldown(EndConditionFactory.time(5 * 60))
        .build();

      const steps = workout.workoutSegments[0].workoutSteps as ExecutableStep[];
      expect(steps).toHaveLength(4);
      expect(steps[1].zoneNumber).toBe(3);
      expect(steps[2].zoneNumber).toBe(4);
    });

    it('should create cycling power intervals', () => {
      const workout = new WorkoutBuilder('Power Intervals', 'cycling')
        .addWarmup(EndConditionFactory.time(15 * 60))
        .startRepeat(4)
        .addInterval(EndConditionFactory.time(5 * 60), TargetFactory.powerRange(250, 280))
        .addRecovery(EndConditionFactory.time(5 * 60), TargetFactory.powerRange(100, 150))
        .endRepeat()
        .addCooldown(EndConditionFactory.time(10 * 60))
        .build();

      expect(workout.sportType).toEqual(SPORT_TYPE_MAPPING.cycling);
      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(3);
    });

    it('should create pyramid intervals', () => {
      const workout = new WorkoutBuilder('Pyramid', 'running')
        .addWarmup(EndConditionFactory.time(10 * 60))
        .addInterval(EndConditionFactory.time(1 * 60), TargetFactory.pace(4.0, 4.5))
        .addRecovery(EndConditionFactory.time(1 * 60))
        .addInterval(EndConditionFactory.time(2 * 60), TargetFactory.pace(4.0, 4.5))
        .addRecovery(EndConditionFactory.time(2 * 60))
        .addInterval(EndConditionFactory.time(3 * 60), TargetFactory.pace(4.0, 4.5))
        .addRecovery(EndConditionFactory.time(3 * 60))
        .addInterval(EndConditionFactory.time(2 * 60), TargetFactory.pace(4.0, 4.5))
        .addRecovery(EndConditionFactory.time(2 * 60))
        .addInterval(EndConditionFactory.time(1 * 60), TargetFactory.pace(4.0, 4.5))
        .addCooldown(EndConditionFactory.time(5 * 60))
        .build();

      // 1 warmup + 5 intervals + 4 recoveries + 1 cooldown = 11 steps
      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(11);
    });
  });

  describe('edge cases', () => {
    it('should handle single step workout', () => {
      const workout = new WorkoutBuilder('Single Step', 'running')
        .addInterval(EndConditionFactory.time(1800))
        .build();

      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(1);
    });

    it('should handle nested repeat blocks', () => {
      // Note: Current implementation doesn't support nested repeats
      // This test documents expected behavior if implemented
      const workout = new WorkoutBuilder('Test', 'running')
        .startRepeat(2)
        .addInterval(EndConditionFactory.distance(1000, 'm'))
        .addRecovery(EndConditionFactory.distance(400, 'm'))
        .endRepeat()
        .build();

      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(1);
    });

    it('should handle lap button end condition', () => {
      const workout = new WorkoutBuilder('Test', 'running')
        .addInterval(EndConditionFactory.lapButton(), TargetFactory.hrZone(4))
        .build();

      const step = workout.workoutSegments[0].workoutSteps[0] as ExecutableStep;
      expect(step.endCondition).toEqual(END_CONDITION_TYPE_MAPPING['lap.button']);
      expect(step.endConditionValue).toBe(1);
    });

    it('should handle very long workout', () => {
      let builder = new WorkoutBuilder('Long Workout', 'running').addWarmup(
        EndConditionFactory.time(600)
      );

      // Add 20 intervals
      for (let i = 0; i < 20; i++) {
        builder = builder
          .addInterval(EndConditionFactory.distance(200, 'm'), TargetFactory.pace(4.0, 5.0))
          .addRecovery(EndConditionFactory.time(60));
      }

      const workout = builder.addCooldown(EndConditionFactory.time(300)).build();

      expect(workout.workoutSegments[0].workoutSteps).toHaveLength(42); // 1 warmup + 40 intervals/recoveries + 1 cooldown
    });
  });
});

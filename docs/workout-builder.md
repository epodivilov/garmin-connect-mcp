# WorkoutBuilder Service

The WorkoutBuilder service provides a fluent builder pattern for creating Garmin Connect workout payloads. It simplifies workout creation by automatically managing step ordering, validation, and repeat blocks.

## Features

- **Fluent Builder Pattern**: Method chaining for intuitive workout construction
- **Type Safety**: Full TypeScript support with discriminated unions
- **Auto-Management**: Automatic step ordering and validation
- **Repeat Blocks**: Easy creation of interval repeat patterns
- **Factory Methods**: Convenient factories for end conditions and targets
- **Pace Conversion**: Automatic conversion between min/km and m/s
- **Comprehensive Validation**: Built-in validation before payload creation

## Quick Start

```typescript
import { WorkoutBuilder, EndConditionFactory, TargetFactory } from './services/workoutBuilder.js';

// Create a simple 30-minute easy run
const easyRun = new WorkoutBuilder('Easy Run', 'running')
  .addWarmup(EndConditionFactory.time(5 * 60))
  .addEasyRun(30)
  .addCooldown(EndConditionFactory.time(5 * 60))
  .build();
```

## Core Classes

### WorkoutBuilder

Main builder class for creating workout payloads.

**Constructor:**
```typescript
new WorkoutBuilder(name: string, sport: SportTypeName)
```

**Parameters:**
- `name`: Workout name
- `sport`: Sport type (`"running"`, `"cycling"`, `"swimming"`, `"other"`)

### EndConditionFactory

Factory for creating end conditions with type safety.

**Static Methods:**

#### time(seconds: number)
Create a time-based end condition.

```typescript
const tenMinutes = EndConditionFactory.time(10 * 60);
```

#### distance(value: number, unit?: DistanceUnitName)
Create a distance-based end condition.

```typescript
const oneKm = EndConditionFactory.distance(1, 'km');
const oneMile = EndConditionFactory.distance(1, 'mile');
const thousandMeters = EndConditionFactory.distance(1000); // defaults to meters
```

#### lapButton()
Create a lap button end condition (user-controlled).

```typescript
const userControlled = EndConditionFactory.lapButton();
```

### TargetFactory

Factory for creating intensity targets with type safety.

**Static Methods:**

#### noTarget()
Create a "no target" target (open pace/effort).

```typescript
const openPace = TargetFactory.noTarget();
```

#### hrZone(zoneNumber: number)
Create a heart rate zone target (1-5).

```typescript
const zone3 = TargetFactory.hrZone(3);
```

#### hrRange(minBpm: number, maxBpm: number)
Create a custom heart rate range.

```typescript
const hr140to160 = TargetFactory.hrRange(140, 160);
```

#### pace(minMinPerKm: number, maxMinPerKm: number)
Create a pace target (automatically converts min/km to m/s).

```typescript
const pace4to5 = TargetFactory.pace(4.0, 5.0); // 4:00-5:00 min/km
```

#### powerZone(zoneNumber: number)
Create a power zone target (1-6, for cycling).

```typescript
const zone4 = TargetFactory.powerZone(4);
```

#### powerRange(minWatts: number, maxWatts: number)
Create a custom power range.

```typescript
const power200to250 = TargetFactory.powerRange(200, 250);
```

#### cadence(minRpm: number, maxRpm: number)
Create a cadence target.

```typescript
const cadence80to90 = TargetFactory.cadence(80, 90);
```

## WorkoutBuilder Methods

### Basic Step Methods

#### addWarmup(endCondition, target?)
Add a warmup step.

```typescript
builder.addWarmup(EndConditionFactory.time(10 * 60));
builder.addWarmup(
  EndConditionFactory.time(10 * 60),
  TargetFactory.hrZone(2)
);
```

#### addCooldown(endCondition, target?)
Add a cooldown step.

```typescript
builder.addCooldown(EndConditionFactory.time(5 * 60));
```

#### addInterval(endCondition, target?)
Add an interval step.

```typescript
builder.addInterval(
  EndConditionFactory.distance(1000, 'm'),
  TargetFactory.pace(4.0, 4.5)
);
```

#### addRecovery(endCondition, target?)
Add a recovery step.

```typescript
builder.addRecovery(
  EndConditionFactory.distance(400, 'm'),
  TargetFactory.hrZone(2)
);
```

#### addRest(endCondition)
Add a rest step.

```typescript
builder.addRest(EndConditionFactory.time(60)); // 1 min rest
```

### Repeat Block Methods

#### startRepeat(repetitions)
Start a repeat block.

```typescript
builder
  .startRepeat(5)
  .addInterval(...)
  .addRecovery(...)
  .endRepeat();
```

#### endRepeat()
End the current repeat block.

**Important:** Must have a matching `startRepeat()` call.

#### addIntervalRepeat(repetitions, intervalEnd, intervalTarget, recoveryEnd, recoveryTarget?)
Convenience method to create interval + recovery repeat in one call.

```typescript
builder.addIntervalRepeat(
  5,
  EndConditionFactory.distance(1000, 'm'),
  TargetFactory.pace(4.0, 4.5),
  EndConditionFactory.distance(400, 'm'),
  TargetFactory.hrZone(2)
);
```

### Convenience Methods

#### addEasyRun(minutes)
Add an easy run (time-based interval with no target).

```typescript
builder.addEasyRun(30); // 30 minute easy run
```

#### addTempoRun(minutes, zone?)
Add a tempo run (time-based interval with HR zone target).

```typescript
builder.addTempoRun(20); // 20 min tempo in zone 3 (default)
builder.addTempoRun(20, 4); // 20 min tempo in zone 4
```

### Configuration Methods

#### setDescription(description)
Set workout description.

```typescript
builder.setDescription('Speed endurance workout');
```

### Build Method

#### build()
Build and validate the workout payload.

```typescript
const workout = builder.build();
```

**Returns:** `WorkoutPayload` ready for Garmin API

**Throws:**
- If workout has no steps
- If repeat blocks are not closed
- If validation fails

## Usage Examples

### 1. Simple Easy Run

```typescript
const easyRun = new WorkoutBuilder('Easy 30 min', 'running')
  .addEasyRun(30)
  .build();
```

### 2. Interval Workout with Warmup and Cooldown

```typescript
const intervals = new WorkoutBuilder('5x1000m Intervals', 'running')
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
```

### 3. Progressive Tempo Run

```typescript
const tempoRun = new WorkoutBuilder('Progressive Tempo', 'running')
  .addWarmup(EndConditionFactory.time(10 * 60))
  .addInterval(EndConditionFactory.time(10 * 60), TargetFactory.hrZone(3))
  .addInterval(EndConditionFactory.time(10 * 60), TargetFactory.hrZone(4))
  .addCooldown(EndConditionFactory.time(5 * 60))
  .build();
```

### 4. Cycling Power Intervals

```typescript
const powerIntervals = new WorkoutBuilder('Power Intervals', 'cycling')
  .addWarmup(EndConditionFactory.time(15 * 60))
  .startRepeat(4)
  .addInterval(
    EndConditionFactory.time(5 * 60),
    TargetFactory.powerRange(250, 280)
  )
  .addRecovery(
    EndConditionFactory.time(5 * 60),
    TargetFactory.powerRange(100, 150)
  )
  .endRepeat()
  .addCooldown(EndConditionFactory.time(10 * 60))
  .build();
```

### 5. Pyramid Intervals

```typescript
const pyramid = new WorkoutBuilder('Pyramid', 'running')
  .addWarmup(EndConditionFactory.time(10 * 60))
  // Build up
  .addInterval(EndConditionFactory.time(1 * 60), TargetFactory.pace(4.0, 4.5))
  .addRecovery(EndConditionFactory.time(1 * 60))
  .addInterval(EndConditionFactory.time(2 * 60), TargetFactory.pace(4.0, 4.5))
  .addRecovery(EndConditionFactory.time(2 * 60))
  .addInterval(EndConditionFactory.time(3 * 60), TargetFactory.pace(4.0, 4.5))
  // Build down
  .addRecovery(EndConditionFactory.time(2 * 60))
  .addInterval(EndConditionFactory.time(2 * 60), TargetFactory.pace(4.0, 4.5))
  .addRecovery(EndConditionFactory.time(1 * 60))
  .addInterval(EndConditionFactory.time(1 * 60), TargetFactory.pace(4.0, 4.5))
  .addCooldown(EndConditionFactory.time(5 * 60))
  .build();
```

### 6. User-Controlled Fartlek

```typescript
const fartlek = new WorkoutBuilder('Fartlek', 'running')
  .addWarmup(EndConditionFactory.time(10 * 60))
  .startRepeat(8)
  .addInterval(
    EndConditionFactory.lapButton(), // User presses lap to end
    TargetFactory.pace(3.5, 4.5)
  )
  .addRecovery(
    EndConditionFactory.lapButton(), // User presses lap to end
    TargetFactory.hrZone(2)
  )
  .endRepeat()
  .addCooldown(EndConditionFactory.time(5 * 60))
  .build();
```

## Supported Sport Types

- `running`: Running activities
- `cycling`: Cycling activities
- `swimming`: Swimming activities (lap swimming)
- `other`: Other activity types

## Distance Units

- `m`: Meters
- `km`: Kilometers
- `mile`: Miles

## Heart Rate Zones

Standard 5-zone model:
- Zone 1: Recovery (50-60% max HR)
- Zone 2: Aerobic/Easy (60-70% max HR)
- Zone 3: Tempo (70-80% max HR)
- Zone 4: Threshold (80-90% max HR)
- Zone 5: VO2 Max (90-100% max HR)

## Power Zones

Standard 6-zone model for cycling:
- Zone 1: Active Recovery (<55% FTP)
- Zone 2: Endurance (55-75% FTP)
- Zone 3: Tempo (75-90% FTP)
- Zone 4: Lactate Threshold (90-105% FTP)
- Zone 5: VO2 Max (105-120% FTP)
- Zone 6: Anaerobic Capacity (>120% FTP)

## Pace Conversion

The builder automatically converts pace from min/km to m/s (required by Garmin API):

```typescript
// Input: 4:00-5:00 min/km
TargetFactory.pace(4.0, 5.0)

// Converts to:
// targetValueOne: 3.33 m/s (slower = 5:00/km)
// targetValueTwo: 4.17 m/s (faster = 4:00/km)
```

**Note:** Faster pace in min/km (lower value) = higher m/s value.

## Validation

The builder performs automatic validation:

1. **Structure Validation:**
   - Workout must have at least one step
   - All repeat blocks must be closed
   - Step orders must be unique and positive

2. **End Condition Validation:**
   - Time values must be positive
   - Distance values must be positive with valid units
   - Lap button conditions have no value
   - Iterations must be positive integers

3. **Target Validation:**
   - HR zones must be positive integers
   - Custom ranges: min < max
   - Pace values must be positive
   - Power values must be positive
   - XOR validation: either zone OR custom range, not both

## Error Handling

Common errors and solutions:

### "Workout name is required"
Provide a non-empty workout name.

### "Invalid sport type"
Use one of: `"running"`, `"cycling"`, `"swimming"`, `"other"`

### "Workout must have at least one step"
Add at least one step before calling `build()`.

### "N unclosed repeat block(s)"
Call `endRepeat()` for each `startRepeat()`.

### "No repeat block to end"
Don't call `endRepeat()` without a matching `startRepeat()`.

### "Repeat block must contain at least one step"
Add steps inside repeat block before calling `endRepeat()`.

### "Duration/Distance must be positive"
Use positive values for time and distance.

### "Min pace must be faster (lower) than max pace"
For pace targets, lower min/km value = faster pace.

## Best Practices

1. **Use Factories**: Always use `EndConditionFactory` and `TargetFactory` for type safety
2. **Chain Methods**: Take advantage of method chaining for cleaner code
3. **Validate Early**: The builder validates on `build()`, but factories validate immediately
4. **Close Repeats**: Always close repeat blocks before building
5. **Meaningful Names**: Use descriptive workout names for easy identification
6. **Add Descriptions**: Set descriptions to document workout purpose
7. **Zone-Based Training**: Use HR zones for training intensity control
8. **Warmup/Cooldown**: Include proper warmup and cooldown in structured workouts

## TypeScript Types

All types are fully documented and exported from `src/types/workout.ts`:

- `WorkoutPayload`: Complete workout structure
- `WorkoutSegment`: Segment containing steps
- `WorkoutStep`: Union of ExecutableStep and RepeatStep
- `ExecutableStep`: Single workout step
- `RepeatStep`: Repeat block with child steps
- `EndCondition`: Step end condition (time, distance, etc.)
- `Target`: Intensity target (HR, pace, power, etc.)
- `SportType`: Sport type definition
- `StepType`: Step type definition
- `TargetType`: Target type definition
- `DistanceUnit`: Distance unit definition

## Testing

The WorkoutBuilder has comprehensive test coverage (>99%):

```bash
pnpm test:run tests/unit/workoutBuilder.test.ts
```

Test coverage includes:
- Factory methods validation
- Basic step creation
- Step ordering
- Repeat blocks
- Convenience methods
- Error handling
- Edge cases
- Complex workout examples

## Related Documentation

- [Workout Types](../src/types/workout.ts) - Type definitions and validation
- [Type Tests](../tests/unit/workout-types.test.ts) - Type system tests
- [Builder Tests](../tests/unit/workoutBuilder.test.ts) - Builder tests

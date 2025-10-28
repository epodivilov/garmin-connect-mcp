export const mockSleepData = {
  dailySleepDTO: {
    sleepTimeSeconds: 28800, // 8 hours
    totalSleepTimeSeconds: 30600, // 8.5 hours
    deepSleepSeconds: 7200, // 2 hours
    lightSleepSeconds: 18000, // 5 hours
    remSleepSeconds: 3600, // 1 hour
    awakeDuringSleepSeconds: 1800, // 30 minutes
    sleepStartTimestampGMT: 1698019200000, // timestamp
    sleepEndTimestampGMT: 1698049800000, // timestamp
    sleepQualityTypePK: 1,
    sleepScores: {
      overall: {
        value: 85,
        qualifierKey: 'GOOD'
      },
      deepPercentage: { value: 25 },
      lightPercentage: { value: 62.5 },
      remPercentage: { value: 12.5 }
    },
    averageSpO2Value: 96.5,
    lowestSpO2Value: 94,
    highestSpO2Value: 98,
    averageRespirationValue: 14.2,
    lowestRespirationValue: 12,
    highestRespirationValue: 18,
    awakeCount: 2,
    avgSleepStress: 15,
    sleepScoreFeedback: "Your sleep was good last night.",
    sleepScoreInsight: "You had adequate deep sleep recovery."
  },
  wellnessEpochSummaryDTO: {
    startTimeInSeconds: 1698019200,
    durationInSeconds: 30600
  }
};

export const mockActivitiesData = [
  {
    activityId: 12345678901,
    activityName: "Morning Run",
    description: "Easy morning run in the park",
    activityType: {
      typeKey: "running",
      typeId: 1,
      parentTypeId: 17
    },
    startTimeLocal: "2025-01-15T07:00:00.000",
    startTimeGMT: "2025-01-15T15:00:00.000",
    duration: 2400, // 40 minutes
    elapsedDuration: 2460, // 41 minutes
    movingDuration: 2380, // 39.67 minutes
    distance: 5000, // 5km
    calories: 320,
    averageHR: 150,
    maxHR: 175,
    averageSpeed: 2.08, // m/s
    maxSpeed: 3.2,
    elevationGain: 50,
    elevationLoss: 45,
    minElevation: 100,
    maxElevation: 150,
    steps: 5200,
    averageRunningCadenceInStepsPerMinute: 175,
    maxRunningCadenceInStepsPerMinute: 185,
    averageBikingCadenceInRevPerMinute: null,
    maxBikingCadenceInRevPerMinute: null,
    aerobicTrainingEffect: 3.2,
    anaerobicTrainingEffect: 1.1,
    trainingEffectLabel: "Maintaining",
    vO2MaxValue: 45.2,
    avgVerticalOscillation: 8.5,
    avgGroundContactTime: 245,
    avgStrideLength: 0.96,
    avgVerticalRatio: 7.2,
    avgGroundContactBalance: 51.5,
    startLatitude: 40.7128,
    startLongitude: -74.0060,
    endLatitude: 40.7130,
    endLongitude: -74.0058,
    locationName: "Central Park, New York",
    hasPolyline: true,
    lapCount: 5,
    hasSplits: true,
    minActivityLapDuration: 480, // 8 minutes
    manufacturer: "Garmin",
    deviceId: 123456,
    privacy: { typeKey: "private" },
    favorite: false,
    pr: true, // personal record
    activityTrainingLoad: 85,
    splitSummaries: [
      {
        splitType: "INTERVAL_ACTIVE",
        duration: 1200,
        distance: 2500,
        averageSpeed: 2.1,
        maxSpeed: 2.5,
        totalAscent: 25,
        elevationLoss: 20,
        averageHR: 148,
        maxHR: 165,
        calories: 160,
        noOfSplits: 1
      },
      {
        splitType: "INTERVAL_ACTIVE",
        duration: 1200,
        distance: 2500,
        averageSpeed: 2.0,
        maxSpeed: 2.3,
        totalAscent: 25,
        elevationLoss: 25,
        averageHR: 152,
        maxHR: 170,
        calories: 160,
        noOfSplits: 1
      }
    ]
  }
];

export const mockStepsData = {
  data: {
    steps: 8542,
    distance: 6234, // meters
    calories: 245,
    activeTime: 3600, // 1 hour in seconds
    bmrCalories: 1650,
    totalCalories: 1895,
    averageHR: 75,
    maxHR: 145,
    minHR: 52,
    averageStress: 32,
    maxStress: 75,
    restStressDuration: 21600, // 6 hours
    activityStressDuration: 3600, // 1 hour
    lowStressDuration: 14400, // 4 hours
    mediumStressDuration: 7200, // 2 hours
    highStressDuration: 3600, // 1 hour
    stressQualifier: "BALANCED",
    restStressPercentage: 43,
    activityStressPercentage: 7,
    lowStressPercentage: 29,
    mediumStressPercentage: 14,
    highStressPercentage: 7,
    bodyBatteryChargedValue: 15,
    bodyBatteryDrainedValue: 45,
    bodyBatteryHighestValue: 95,
    bodyBatteryLowestValue: 25,
    bodyBatteryMostRecentValue: 65,
    floorsClimbed: 12,
    floorsDescended: 8,
    intensityMinutesGoal: 150,
    moderateIntensityMinutes: 45,
    vigorousIntensityMinutes: 25,
    intensityMinutesGoalMet: true,
    averageSpo2: 96.2,
    lowSpo2: 94,
    highSpo2: 98,
    averageRespiration: 14.5,
    lowestRespiration: 12,
    highestRespiration: 18,
    heartRateValues: [65, 68, 72, 75, 78, 82], // sample values
    timeOffsetHeartRateSamples: [0, 3600, 7200, 10800, 14400, 18000],
    stressValuesArray: [25, 30, 35, 40, 45, 50],
    timeOffsetStressValuesArray: [0, 3600, 7200, 10800, 14400, 18000],
    bodyBatteryValuesArray: [95, 85, 75, 65, 55, 50],
    timeOffsetBodyBatteryValuesArray: [0, 3600, 7200, 10800, 14400, 18000]
  }
};

// Daily steps data matching Garmin API response format (DailyStepsData)
export const mockDailyStepsData = {
  calendarDate: "2025-01-15",
  stepGoal: 10000,
  totalDistance: 6234, // meters
  totalSteps: 8542
};

export const mockHeartRateData = {
  data: {
    maxHR: 165,
    minHR: 48,
    restingHR: 55,
    lastSevenDaysAvgRestingHR: 57,
    heartRateValues: [55, 58, 62, 65, 68, 72, 75, 78, 82, 85],
    timeOffsetHeartRateSamples: [0, 3600, 7200, 10800, 14400, 18000, 21600, 25200, 28800, 32400]
  }
};

// Alternative format: data returned directly matching HeartRate interface
export const mockHeartRateDataDirect = {
  userProfilePK: 12345,
  calendarDate: "2025-01-15",
  maxHeartRate: 165,
  minHeartRate: 48,
  restingHeartRate: 55,
  lastSevenDaysAvgRestingHeartRate: 57,
  heartRateValues: [[55, 58, 62], [65, 68, 72], [75, 78, 82, 85]], // HeartRateEntry[][] format
  heartRateValueDescriptors: [
    { zone: 1, description: "Recovery" },
    { zone: 2, description: "Base" },
    { zone: 3, description: "Aerobic" }
  ]
};

export const mockWeightData = {
  totalAverage: {
    weight: 75500, // grams (75.5 kg)
    bmi: 23.2,
    bodyFat: 12.8,
    bodyWater: 62.1,
    boneMass: 3.2,
    muscleMass: 38.4,
    physiqueRating: 7,
    visceralFat: 4,
    metabolicAge: 28
  }
};

export const mockUserProfile = {
  motivation: "Stay healthy and improve fitness",
  bio: "Running enthusiast and fitness tracker"
};

// Workout creation response data
export const mockWorkoutResponse = {
  workoutId: 123456789,
  workoutName: 'Test Workout',
  owner: {
    userId: 987654321,
    displayName: 'Test User',
  },
  createdDate: '2025-10-12T12:00:00.000Z',
  updatedDate: '2025-10-12T12:00:00.000Z',
};

// Workout detail response data (for scheduling)
export const mockWorkoutDetail = {
  workoutId: 123456789,
  workoutName: 'Test Workout',
  description: 'Test workout description',
  sportType: {
    sportTypeId: 1,
    sportTypeKey: 'running',
  },
  owner: {
    userId: 987654321,
    displayName: 'Test User',
  },
  createdDate: '2025-10-12T12:00:00.000Z',
  updatedDate: '2025-10-12T12:00:00.000Z',
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

// Workout schedule response data
export const mockWorkoutScheduleResponse = {
  workoutScheduleId: 1234567890123,
  workoutId: 123456789,
  calendarDate: '2025-10-13',
  success: true,
  message: 'Workout scheduled successfully for 2025-10-13',
};

// Scheduled workouts data (from calendar API)
// Matches the actual API structure with nested workout object
export const mockScheduledWorkouts = [
  {
    workoutScheduleId: 0,
    workoutId: 111111111,
    workoutName: '5K Easy Run',
    calendarDate: '2025-10-13',
    sportType: { sportTypeId: 1, sportTypeKey: 'running' },
    estimatedDurationInSecs: 1800,
    estimatedDistanceInMeters: 5000,
    description: 'Easy paced 5K run',
  },
  {
    workoutScheduleId: 0,
    workoutId: 222222222,
    workoutName: 'Interval Training',
    calendarDate: '2025-10-15',
    sportType: { sportTypeId: 1, sportTypeKey: 'running' },
    estimatedDurationInSecs: 2400,
    estimatedDistanceInMeters: 8000,
    description: '5x1000m intervals',
  },
];

// Calendar items with nested workout structure (actual API format)
export const mockCalendarItems = [
  {
    itemType: 'workout',
    workoutId: 111111111,
    date: '2025-10-13',
    workoutScheduleId: 1444480121,
    workout: {
      workoutId: 111111111,
      ownerId: 987654321,
      workoutName: '5K Easy Run',
      description: 'Easy paced 5K run',
      sportType: {
        sportTypeId: 1,
        sportTypeKey: 'running',
      },
      estimatedDurationInSecs: 1800,
      estimatedDistanceInMeters: 5000,
    },
  },
  {
    itemType: 'workout',
    workoutId: 222222222,
    date: '2025-10-15',
    workoutScheduleId: 1444480122,
    workout: {
      workoutId: 222222222,
      ownerId: 987654321,
      workoutName: 'Interval Training',
      description: '5x1000m intervals',
      sportType: {
        sportTypeId: 1,
        sportTypeKey: 'running',
      },
      estimatedDurationInSecs: 2400,
      estimatedDistanceInMeters: 8000,
    },
  },
  // Edge case: Missing workout object
  {
    itemType: 'workout',
    workoutId: 333333333,
    date: '2025-10-20',
    workoutScheduleId: 1444480123,
    // No workout object - should fall back to defaults
  },
  // Edge case: Partial workout data
  {
    itemType: 'workout',
    workoutId: 444444444,
    date: '2025-10-21',
    workoutScheduleId: 1444480124,
    workout: {
      workoutId: 444444444,
      workoutName: 'Partial Workout',
      // Missing description, sportType, duration, distance
    },
  },
];
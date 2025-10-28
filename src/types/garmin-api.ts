/**
 * Type definitions for Garmin Connect API responses
 *
 * These interfaces define the structure of data returned by the Garmin Connect API.
 * They are based on actual API responses and provide type safety for our services.
 *
 * Note: Garmin API is not officially documented, so these types are derived from
 * observed responses and may not be exhaustive.
 */

/**
 * Sleep scores breakdown from Garmin API
 */
export interface GarminSleepScores {
  overall?: {
    value?: number;
    qualifierKey?: string;
  };
  sleepQuality?: {
    value?: number;
    qualifierKey?: string;
  };
  sleepRecovery?: {
    value?: number;
    qualifierKey?: string;
  };
  sleepRestlessness?: {
    value?: number;
    qualifierKey?: string;
  };
}

/**
 * Daily sleep summary from Garmin API
 */
export interface GarminDailySleepDTO {
  // Sleep durations (in seconds)
  deepSleepSeconds?: number;
  lightSleepSeconds?: number;
  remSleepSeconds?: number;
  awakeSleepSeconds?: number;

  // Sleep quality metrics
  sleepScores?: GarminSleepScores;
  sleepQualityTypePK?: number | null;

  // Physiological metrics
  avgSleepStress?: number;
  averageSpO2Value?: number;
  averageHeartRate?: number;
  averageRespirationValue?: number;
  hrvValue?: number;

  // Sleep timing
  sleepStartTimestampGMT?: number | null;
  sleepEndTimestampGMT?: number | null;
  sleepStartTimestampLocal?: number | null;
  sleepEndTimestampLocal?: number | null;

  // Interruptions
  awakeDuration?: number | null;
  awakeningsCount?: number | null;

  // Validation
  validation?: string;
  retro?: boolean;

  // Auto-sleep detection
  autoSleepStartTimestampGMT?: number | null;
  autoSleepEndTimestampGMT?: number | null;
}

/**
 * Wellness epoch summary from Garmin API
 */
export interface GarminWellnessEpochSummaryDTO {
  averageHeartRate?: number;
  lowestHeartRate?: number;
  highestHeartRate?: number;
  restingHeartRate?: number;
  hrvValue?: number;
  averageStressLevel?: number;
  maxStressLevel?: number;
}

/**
 * Complete sleep data response from Garmin API
 */
export interface GarminSleepDataResponse {
  dailySleepDTO?: GarminDailySleepDTO;
  wellnessEpochSummaryDTO?: GarminWellnessEpochSummaryDTO;
  sleepMovement?: Array<{
    startGMT?: string | number;
    endGMT?: string | number;
    activityLevel?: number;
  }>;
  sleepLevels?: Array<{
    startGMT?: string | number;
    endGMT?: string | number;
    level?: string;
  }>;
  remSleepData?: boolean;
  sleepRestlessMoments?: number;
}

/**
 * Activity data from Garmin API
 */
export interface GarminActivity {
  // Activity identification
  activityId?: number;
  activityName?: string;
  activityType?: {
    typeId?: number;
    typeKey?: string;
    parentTypeId?: number;
  };

  // Timing
  startTimeLocal?: string;
  startTimeGMT?: string;
  duration?: number;
  movingDuration?: number;
  elapsedDuration?: number;

  // Distance and speed
  distance?: number;
  averageSpeed?: number;
  maxSpeed?: number;

  // Heart rate (note: Garmin API uses both 'averageHR' and 'avgHR')
  averageHR?: number;
  maxHR?: number;
  avgHR?: number;

  // Power (cycling/running)
  avgPower?: number;
  averagePower?: number;
  maxPower?: number;
  normPower?: number;

  // Elevation
  elevationGain?: number;
  elevationLoss?: number;
  totalElevation?: number;
  minElevation?: number;
  maxElevation?: number;

  // Training metrics
  trainingStressScore?: number;
  aerobicTrainingEffect?: number;
  anaerobicTrainingEffect?: number;
  intensityMinutesGoal?: number;

  // Performance
  vo2MaxValue?: number;
  avgVerticalSpeed?: number;

  // Cadence
  averageRunningCadenceInStepsPerMinute?: number;
  maxRunningCadenceInStepsPerMinute?: number;

  // Temperature
  maxTemperature?: number;
  minTemperature?: number;
  avgTemperature?: number;

  // Calories
  calories?: number;
  bmrCalories?: number;
  activeKilocalories?: number;
}

/**
 * Activity split/lap data from Garmin API
 * Contains detailed per-lap metrics for an activity
 */
export interface GarminActivitySplit {
  // Split identification
  lapIndex?: number;
  splitType?: string;

  // Timing
  duration?: number; // seconds
  movingDuration?: number; // seconds
  elapsedDuration?: number; // seconds
  startTimeGMT?: string;
  startTimeLocal?: string;

  // Distance and speed (meters, meters/second)
  distance?: number;
  averageSpeed?: number;
  maxSpeed?: number;

  // Heart rate (bpm)
  averageHR?: number;
  maxHR?: number;
  avgHR?: number;

  // Power (watts)
  avgPower?: number;
  averagePower?: number;
  maxPower?: number;
  normPower?: number;

  // Running dynamics
  averageRunningCadenceInStepsPerMinute?: number;
  maxRunningCadenceInStepsPerMinute?: number;
  avgVerticalOscillation?: number; // millimeters
  avgGroundContactTime?: number; // milliseconds
  avgStrideLength?: number; // meters
  avgVerticalRatio?: number; // percentage

  // Elevation (meters)
  elevationGain?: number;
  elevationLoss?: number;
  totalElevation?: number;
  minElevation?: number;
  maxElevation?: number;

  // Calories
  calories?: number;

  // Location
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
}

/**
 * Activity detail metric from Garmin API
 * Contains time-series data points for various metrics during an activity
 */
export interface GarminActivityMetric {
  // Metric identification
  metricType?: string;
  metricsIndex?: number;

  // Timing
  startTimeGMT?: string;
  startTimeLocal?: string;
  duration?: number; // seconds

  // Metric values
  averageValue?: number;
  maxValue?: number;
  minValue?: number;
  totalValue?: number;

  // Time series data (optional, for detailed metrics)
  samples?: Array<{
    timestamp?: string;
    value?: number;
  }>;
}

/**
 * Detailed activity data from Garmin API
 * Extends GarminActivity with additional fields from the activity details endpoint
 */
export interface GarminActivityDetail extends GarminActivity {
  // Activity metadata
  description?: string;
  privacy?: {
    typeKey?: string;
    typeId?: number;
  };
  favorite?: boolean;
  pr?: boolean; // Personal Record
  timeZoneId?: number;
  locationName?: string;

  // Lap/split information
  lapCount?: number;
  hasSplits?: boolean;
  minActivityLapDuration?: number; // seconds
  hasPolyline?: boolean;
  splitSummaries?: GarminActivitySplit[];

  // Device information
  manufacturer?: string;
  deviceId?: number;

  // Training load and effect
  activityTrainingLoad?: number;
  trainingEffectLabel?: string;

  // Running dynamics (extended)
  avgVerticalOscillation?: number; // millimeters
  avgGroundContactTime?: number; // milliseconds
  avgStrideLength?: number; // meters
  avgVerticalRatio?: number; // percentage
  avgGroundContactBalance?: number; // percentage

  // Cycling cadence (revolutions per minute)
  averageBikingCadenceInRevPerMinute?: number;
  maxBikingCadenceInRevPerMinute?: number;

  // Location
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;

  // Steps (for activities with step counting)
  steps?: number;

  // Detailed metrics (time-series data)
  activityDetailMetrics?: GarminActivityMetric[];
}

/**
 * Heart rate data response from Garmin API
 * Contains heart rate measurements over time
 */
export interface GarminHeartRateResponse {
  // Summary metrics (bpm)
  restingHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  averageHeartRate?: number;

  // Time series data
  heartRateValues?: Array<{
    timestamp?: number; // milliseconds since epoch
    timestampGMT?: string;
    heartRate?: number; // bpm
  }>;

  // Daily summary
  date?: string;
  calendarDate?: string;
}

/**
 * Weight data response from Garmin API
 * Contains body weight and composition measurements
 */
export interface GarminWeightResponse {
  // Weight (grams or kilograms depending on API version)
  weight?: number;
  bmi?: number;

  // Body composition
  bodyFatPercentage?: number;
  bodyWaterPercentage?: number;
  boneMass?: number; // kilograms
  muscleMass?: number; // kilograms

  // Measurement metadata
  timestamp?: number; // milliseconds since epoch
  timestampGMT?: string;
  date?: string;
  calendarDate?: string;

  // Source information
  sourceType?: string;
  deviceId?: number;
}

/**
 * Daily summary/stats from Garmin API
 */
export interface GarminDailySummary {
  // Body Battery
  bodyBatteryValue?: number;
  endBodyBattery?: number;
  bodyBatteryChargedValue?: number;
  bodyBatteryDrainedValue?: number;

  // Stress
  averageStressLevel?: number;
  avgStress?: number;
  maxStressLevel?: number;
  stressQualifier?: string;

  // Steps and activity
  totalSteps?: number;
  dailyStepGoal?: number;
  totalKilocalories?: number;
  activeKilocalories?: number;

  // Heart rate
  restingHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;

  // Other metrics
  floorsAscended?: number;
  floorsDescended?: number;
  intensityMinutesGoal?: number;
  vigorousIntensityMinutes?: number;
  moderateIntensityMinutes?: number;
}

/**
 * Wellness data response (Body Battery, Stress, etc.)
 */
export interface GarminWellnessData {
  bodyBattery?: number;
  bodyBatteryValue?: number;
  endBodyBattery?: number;
  stress?: number;
  averageStressLevel?: number;
  avgStress?: number;
}

/**
 * @fileoverview Typed parameter interfaces for all MCP tools
 *
 * This file contains comprehensive TypeScript interfaces for tool parameters,
 * providing type safety, validation constraints, and detailed documentation
 * for all MCP tool methods in the Garmin Connect integration.
 *
 * Organization:
 * - Common parameter interfaces (reusable across tools)
 * - Basic health & activity tools
 * - Aggregation tools (volume tracking)
 * - Analytics tools (HR zones, progress, PRs, periodization)
 * - Tracking tools (training stress, fatigue/freshness, HRV)
 * - Correlation tools (sleep-performance)
 * - Workout tools (creation and scheduling)
 *
 * Naming convention: {ToolMethodName}Params
 * Example: getSleepData -> GetSleepDataParams
 *
 * @module types/tool-params
 */

// ============================================================================
// Common Parameter Interfaces
// ============================================================================

/**
 * Common date parameter in YYYY-MM-DD format
 * @pattern ^\\d{4}-\\d{2}-\\d{2}$
 * @example "2025-10-13"
 */
export interface DateParam {
  /**
   * Date in YYYY-MM-DD format
   * @default Today's date
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  date?: string;
}

/**
 * Common date range parameter
 * @pattern ^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$
 * @example "2025-01-01/2025-12-31"
 */
export interface DateRangeParam {
  /**
   * Date range in format YYYY-MM-DD/YYYY-MM-DD
   * @pattern ^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$
   * @example "2025-01-01/2025-12-31"
   */
  dateRange: string;
}

/**
 * Common summary mode parameter
 * @deprecated Use includeSummaryOnly instead
 */
export interface SummaryParam {
  /**
   * Return only summary data instead of detailed breakdown
   * @default false
   * @deprecated Use includeSummaryOnly instead for consistency
   */
  summary?: boolean;

  /**
   * Return only summary data instead of detailed breakdown
   * @default false
   */
  includeSummaryOnly?: boolean;
}

/**
 * Common activity filtering parameters
 */
export interface ActivityFilterParams {
  /**
   * Filter by specific activity types
   * @example ["running", "cycling"]
   */
  activityTypes?: string[];

  /**
   * Maximum number of activities to process
   * @default 1000
   * @minimum 1
   * @maximum 2000
   */
  maxActivities?: number;
}

/**
 * Common pagination parameters
 */
export interface PaginationParams {
  /**
   * Starting index for pagination
   * @default 0
   * @minimum 0
   */
  start?: number;

  /**
   * Maximum number of items to return
   * @minimum 1
   */
  limit?: number;
}

/**
 * Common heart rate zone configuration
 */
export interface HRZoneConfig {
  /**
   * Minimum heart rate as percentage of max HR
   * @minimum 0
   * @maximum 100
   */
  min: number;

  /**
   * Maximum heart rate as percentage of max HR
   * @minimum 0
   * @maximum 100
   */
  max: number;
}

/**
 * Custom heart rate zones for all 5 zones
 */
export interface CustomHRZones {
  zone1?: HRZoneConfig;
  zone2?: HRZoneConfig;
  zone3?: HRZoneConfig;
  zone4?: HRZoneConfig;
  zone5?: HRZoneConfig;
}

// ============================================================================
// Basic Health & Activity Tools
// ============================================================================

/**
 * Parameters for getDailyOverview tool
 */
export type GetDailyOverviewParams = DateParam;

/**
 * Parameters for getSleepData tool
 */
export interface GetSleepDataParams extends DateParam, SummaryParam {
  /**
   * Specific fields to include in the response
   * @example ["dailySleepDTO", "wellnessEpochSummaryDTO"]
   */
  fields?: string[];
}

/**
 * Parameters for getSleepDuration tool
 */
export type GetSleepDurationParams = DateParam;

/**
 * Parameters for getHealthMetrics tool
 */
export interface GetHealthMetricsParams extends DateParam {
  /**
   * Specific metrics to include
   * @default ["steps", "weight", "heart_rate", "stress", "body_battery", "hydration"]
   * @example ["steps", "heart_rate"]
   */
  metrics?: Array<"steps" | "weight" | "heart_rate" | "stress" | "body_battery" | "hydration">;
}

/**
 * Parameters for getStepsData tool
 */
export interface GetStepsDataParams extends DateParam, SummaryParam {}

/**
 * Parameters for getHeartRateData tool
 */
export interface GetHeartRateDataParams extends DateParam, SummaryParam {}

/**
 * Parameters for getWeightData tool
 */
export type GetWeightDataParams = DateParam;

/**
 * Parameters for getHydrationData tool
 */
export type GetHydrationDataParams = DateParam;

/**
 * Parameters for getActivities tool
 */
export interface GetActivitiesParams extends PaginationParams, SummaryParam {
  /**
   * Maximum number of activities to return
   * @default 20
   * @minimum 1
   * @maximum 50
   */
  limit?: number;
}

/**
 * Parameters for getActivityDetails tool
 */
export interface GetActivityDetailsParams {
  /**
   * The unique ID of the activity to retrieve
   */
  activityId: number;
}

// ============================================================================
// Aggregation Tools (Volume Tracking)
// ============================================================================

/**
 * Common parameters for volume aggregation
 */
export interface VolumeAggregationParams extends ActivityFilterParams {
  /**
   * Include breakdown by activity type
   * @default true
   */
  includeActivityBreakdown?: boolean;
}

/**
 * Parameters for getWeeklyVolume tool
 */
export interface GetWeeklyVolumeParams extends VolumeAggregationParams {
  /**
   * Year for the week
   * @default Current year
   * @minimum 2000
   * @maximum 2100
   */
  year?: number;

  /**
   * ISO week number
   * @default Current week
   * @minimum 1
   * @maximum 53
   */
  week?: number;

  /**
   * Include comparison with previous week
   * @default false
   */
  includeTrends?: boolean;
}

/**
 * Parameters for getMonthlyVolume tool
 */
export interface GetMonthlyVolumeParams extends VolumeAggregationParams {
  /**
   * Year for the month
   * @default Current year
   * @minimum 2000
   * @maximum 2100
   */
  year?: number;

  /**
   * Month number (1-12)
   * @default Current month
   * @minimum 1
   * @maximum 12
   */
  month?: number;

  /**
   * Include comparison with previous month
   * @default false
   */
  includeTrends?: boolean;
}

/**
 * Parameters for getCustomRangeVolume tool
 */
export interface GetCustomRangeVolumeParams extends DateRangeParam, VolumeAggregationParams {
  /**
   * Include daily breakdown for the range
   * @default false
   */
  includeDailyBreakdown?: boolean;
}

// ============================================================================
// Analytics Tools - HR Zones
// ============================================================================

/**
 * Parameters for getActivityHRZones tool
 */
export interface GetActivityHRZonesParams {
  /**
   * The unique ID of the activity
   */
  activityId: number;

  /**
   * Custom maximum heart rate for zone calculation
   * @default Activity max HR or 185
   * @minimum 100
   * @maximum 250
   */
  maxHR?: number;

  /**
   * Custom HR zone configuration as percentage of max HR
   */
  customZones?: CustomHRZones;
}

/**
 * Parameters for getAggregatedHRZones tool
 */
export interface GetAggregatedHRZonesParams extends ActivityFilterParams {
  /**
   * Type of period: weekly, monthly, or custom
   * @default "custom"
   */
  periodType?: "weekly" | "monthly" | "custom";

  /**
   * Year (required for weekly/monthly)
   * @minimum 2000
   * @maximum 2100
   */
  year?: number;

  /**
   * ISO week number (required for weekly)
   * @minimum 1
   * @maximum 53
   */
  week?: number;

  /**
   * Month number (required for monthly)
   * @minimum 1
   * @maximum 12
   */
  month?: number;

  /**
   * Date range (required for custom)
   * @pattern ^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$
   */
  dateRange?: string;

  /**
   * Custom maximum heart rate for zone calculation
   * @default 185
   * @minimum 100
   * @maximum 250
   */
  maxHR?: number;

  /**
   * Custom HR zone configuration
   */
  customZones?: CustomHRZones;

  /**
   * Include breakdown by activity type
   * @default true
   */
  includeActivityBreakdown?: boolean;

  /**
   * Include visualization data (labels, values, colors)
   * @default true
   */
  includeVisualization?: boolean;
}

// ============================================================================
// Analytics Tools - Sport Progress
// ============================================================================

/**
 * Common parameters for sport progress analysis
 */
export interface SportProgressParams extends DateRangeParam {
  /**
   * Filter by sport type
   * @example "running", "cycling", "swimming"
   */
  sport?: string;

  /**
   * Minimum activity duration in seconds to include
   * @minimum 0
   */
  minDuration?: number;

  /**
   * Maximum number of activities to analyze
   * @default 1000
   * @minimum 1
   * @maximum 2000
   */
  maxActivities?: number;
}

/**
 * Parameters for getSportProgress tool
 */
export interface GetSportProgressParams extends SportProgressParams {
  /**
   * Include HR zone efficiency analysis
   * @default true
   */
  includeEfficiency?: boolean;
}

/**
 * Parameters for getPaceTrends tool
 */
export interface GetPaceTrendsParams extends SportProgressParams {
  /**
   * Sport type for pace analysis
   * @default "running"
   * @example "running", "swimming"
   */
  sport?: string;
}

/**
 * Parameters for getPowerTrends tool
 */
export interface GetPowerTrendsParams extends SportProgressParams {
  /**
   * Sport type for power analysis
   * @default "cycling"
   */
  sport?: string;

  /**
   * Athlete weight in kg for power-to-weight calculations
   * @minimum 30
   * @maximum 200
   */
  weight?: number;
}

/**
 * Parameters for getEfficiencyMetrics tool
 */
export interface GetEfficiencyMetricsParams extends SportProgressParams {
  /**
   * Custom maximum heart rate for zone calculation
   * @minimum 100
   * @maximum 250
   */
  maxHR?: number;
}

// ============================================================================
// Analytics Tools - Personal Records
// ============================================================================

/**
 * Parameters for getPersonalRecords tool
 */
export interface GetPersonalRecordsParams {
  /**
   * Filter by sport
   * @example "running", "cycling", "swimming"
   */
  sport?: string;

  /**
   * Filter by category type
   */
  categoryType?: "distance" | "duration" | "custom";

  /**
   * Filter by specific category ID
   * @example "5K", "marathon", "30min"
   */
  categoryId?: string;

  /**
   * Minimum quality score to filter PRs
   * @minimum 0
   * @maximum 100
   */
  minQuality?: number;

  /**
   * Include summary statistics
   * @default true
   */
  includeSummary?: boolean;
}

/**
 * Parameters for getPRHistory tool
 */
export interface GetPRHistoryParams {
  /**
   * Category ID (required)
   * @example "5K", "marathon"
   */
  categoryId: string;

  /**
   * Sport type (required for progression analysis)
   */
  sport?: string;

  /**
   * Maximum number of history entries to return
   * @minimum 1
   */
  limit?: number;

  /**
   * Optional date range filter
   * @pattern ^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$
   */
  dateRange?: string;

  /**
   * Include progression analysis with trends
   * @default true
   */
  includeProgression?: boolean;
}

/**
 * Parameters for detectNewPRs tool
 */
export interface DetectNewPRsParams {
  /**
   * Maximum activities to scan
   * @default 1000
   * @minimum 1
   * @maximum 2000
   */
  maxActivities?: number;

  /**
   * Minimum quality score threshold
   * @default 70
   * @minimum 0
   * @maximum 100
   */
  minQuality?: number;

  /**
   * Optional date range
   * @pattern ^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$
   */
  dateRange?: string;

  /**
   * Filter by specific sports
   */
  sports?: string[];

  /**
   * Filter by specific category IDs
   */
  categories?: string[];

  /**
   * Extract segments from splits
   * @default true
   */
  enableSegments?: boolean;
}

/**
 * Parameters for manageCustomPRCategory tool
 */
export interface ManageCustomPRCategoryParams {
  /**
   * Action to perform
   */
  action: "create" | "update" | "delete" | "list";

  /**
   * Category ID (required for create/update/delete)
   */
  id?: string;

  /**
   * Display name (required for create)
   */
  name?: string;

  /**
   * Category type (required for create)
   */
  type?: "distance" | "duration";

  /**
   * Value in meters (distance) or seconds (duration)
   * @minimum 1
   */
  value?: number;

  /**
   * Optional matching tolerance (auto-calculated if not provided)
   * @minimum 1
   */
  tolerance?: number;

  /**
   * Optional sport restriction
   */
  sport?: string;
}

// ============================================================================
// Analytics Tools - Periodization
// ============================================================================

/**
 * Parameters for getPeriodizationAnalysis tool
 */
export interface GetPeriodizationAnalysisParams extends DateRangeParam {
  /**
   * Expected periodization model for comparison
   * Auto-detects if not specified
   */
  targetModel?: "linear" | "undulating" | "block" | "polarized";

  /**
   * Minimum phase length in weeks to detect
   * @default 2
   * @minimum 1
   * @maximum 8
   */
  minPhaseWeeks?: number;

  /**
   * Maximum activities to analyze
   * @default 2000
   * @minimum 1
   * @maximum 5000
   */
  maxActivities?: number;

  /**
   * Include phase transition recommendations
   * @default true
   */
  includeRecommendations?: boolean;

  /**
   * Include training warnings
   * @default true
   */
  includeWarnings?: boolean;
}

// ============================================================================
// Tracking Tools - Training Stress
// ============================================================================

/**
 * Common parameters for TSS calculations
 */
export interface TSSCalculationParams {
  /**
   * Custom resting heart rate for TSS calculation
   * @default 50
   * @minimum 30
   * @maximum 100
   */
  restingHR?: number;

  /**
   * Custom maximum heart rate for TSS calculation
   * @default 185
   * @minimum 100
   * @maximum 250
   */
  maxHR?: number;

  /**
   * Custom threshold heart rate for TSS calculation
   * @default 90% of maxHR
   * @minimum 100
   * @maximum 250
   */
  thresholdHR?: number;
}

/**
 * Parameters for getTrainingStressBalance tool
 */
export interface GetTrainingStressBalanceParams extends DateParam, TSSCalculationParams, SummaryParam {
  /**
   * Number of days of historical data to analyze
   * @default 90
   * @minimum 7
   * @maximum 365
   */
  days?: number;

  /**
   * Include daily time series data showing TSS, CTL, ATL, TSB progression
   * @default true
   */
  includeTimeSeries?: boolean;
}

// ============================================================================
// Tracking Tools - Fatigue & Freshness (Form)
// ============================================================================

/**
 * Parameters for getCurrentFormAnalysis tool
 */
export interface GetCurrentFormAnalysisParams extends DateParam {
  /**
   * Include time series data
   * @default true
   */
  includeTimeSeries?: boolean;

  /**
   * Include future form predictions
   * @default true
   */
  includePredictions?: boolean;

  /**
   * Include performance correlation analysis
   * @default false
   */
  includePerformanceCorrelation?: boolean;

  /**
   * Include HRV/sleep context
   * @default false
   */
  includeContext?: boolean;
}

/**
 * Parameters for getFormHistory tool
 */
export interface GetFormHistoryParams {
  /**
   * Date range in format YYYY-MM-DD/YYYY-MM-DD
   * @pattern ^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$
   */
  dateRange?: string;

  /**
   * Filter by specific form zone
   */
  zone?: "optimal_race" | "fresh" | "maintenance" | "productive_training" | "fatigued" | "overreached";

  /**
   * Number of days to retrieve
   * @default 90
   * @minimum 7
   * @maximum 365
   */
  days?: number;
}

/**
 * Parameters for predictFutureForm tool
 */
export interface PredictFutureFormParams {
  /**
   * Target date for prediction (YYYY-MM-DD)
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  targetDate: string;

  /**
   * Planned daily TSS (or average if array)
   * @minimum 0
   */
  plannedTSS: number;

  /**
   * Whether to maintain current intensity
   * @default true
   */
  maintainIntensity?: boolean;

  /**
   * Specific recovery days (0 TSS)
   */
  recoveryDays?: number[];

  /**
   * Current CTL (optional, will fetch if not provided)
   */
  currentCTL?: number;

  /**
   * Current ATL (optional, will fetch if not provided)
   */
  currentATL?: number;

  /**
   * Current TSB (optional, will fetch if not provided)
   */
  currentTSB?: number;
}

/**
 * Parameters for generateTaperPlan tool
 */
export interface GenerateTaperPlanParams {
  /**
   * Race date (YYYY-MM-DD)
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  raceDate: string;

  /**
   * Taper duration in days
   * @default 14
   * @minimum 7
   * @maximum 28
   */
  taperDuration?: number;

  /**
   * Target TSB for race day
   * @default 17
   * @minimum 5
   * @maximum 30
   */
  targetTSB?: number;

  /**
   * Taper strategy
   * @default "exponential"
   */
  strategy?: "linear" | "exponential" | "step";

  /**
   * Volume reduction percentage
   * @default 50
   * @minimum 20
   * @maximum 80
   */
  volumeReduction?: number;

  /**
   * Maintain intensity during taper
   * @default true
   */
  maintainIntensity?: boolean;

  /**
   * Current CTL (optional, will fetch if not provided)
   */
  currentCTL?: number;

  /**
   * Current ATL (optional, will fetch if not provided)
   */
  currentATL?: number;

  /**
   * Current TSB (optional, will fetch if not provided)
   */
  currentTSB?: number;
}

/**
 * Parameters for analyzeFormPerformance tool
 */
export interface AnalyzeFormPerformanceParams {
  /**
   * Date range in format YYYY-MM-DD/YYYY-MM-DD
   * @default Last 90 days
   * @pattern ^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$
   */
  dateRange?: string;
}

// ============================================================================
// Tracking Tools - HRV & Readiness
// ============================================================================

/**
 * Parameters for getHRVTrends tool
 */
export interface GetHRVTrendsParams {
  /**
   * Start date in YYYY-MM-DD format
   * @default 30 days ago
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  startDate?: string;

  /**
   * End date in YYYY-MM-DD format
   * @default Today
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  endDate?: string;

  /**
   * Sync HRV data from Garmin before analysis
   * @default true
   */
  syncFromGarmin?: boolean;
}

/**
 * Parameters for getReadinessScore tool
 */
export interface GetReadinessScoreParams extends DateParam {
  /**
   * Sync latest data from Garmin before assessment
   * @default true
   */
  syncFromGarmin?: boolean;
}

/**
 * Parameters for getHRVBaseline tool
 */
export interface GetHRVBaselineParams {
  /**
   * Number of recent days to sync
   * @default 28
   * @minimum 14
   * @maximum 90
   */
  days?: number;

  /**
   * Sync HRV data from Garmin before calculation
   * @default true
   */
  syncFromGarmin?: boolean;
}

/**
 * Parameters for getHRVAnomalies tool
 */
export interface GetHRVAnomaliesParams {
  /**
   * Number of recent days to analyze
   * @default 7
   * @minimum 1
   * @maximum 30
   */
  days?: number;

  /**
   * Sync HRV data from Garmin before detection
   * @default true
   */
  syncFromGarmin?: boolean;
}

// ============================================================================
// Correlation Tools - Sleep & Performance
// ============================================================================

/**
 * Parameters for getSleepPerformanceCorrelation tool
 */
export interface GetSleepPerformanceCorrelationParams {
  /**
   * Start date in YYYY-MM-DD format
   * @default 30 days ago
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  startDate?: string;

  /**
   * End date in YYYY-MM-DD format
   * @default Today
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  endDate?: string;

  /**
   * Include daily recovery quality assessments
   * @default true
   */
  includeRecovery?: boolean;

  /**
   * Maximum number of poor sleep impacts to return
   * @default 10
   * @minimum 1
   * @maximum 50
   */
  maxPoorSleepImpacts?: number;
}

/**
 * Parameters for getOptimalSleepPattern tool
 */
export interface GetOptimalSleepPatternParams {
  /**
   * Start date in YYYY-MM-DD format
   * @default 60 days ago
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  startDate?: string;

  /**
   * End date in YYYY-MM-DD format
   * @default Today
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  endDate?: string;
}

/**
 * Parameters for getSleepDebtAnalysis tool
 */
export interface GetSleepDebtAnalysisParams {
  /**
   * Start date in YYYY-MM-DD format
   * @default 30 days ago
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  startDate?: string;

  /**
   * End date in YYYY-MM-DD format
   * @default Today
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  endDate?: string;

  /**
   * Target sleep duration in minutes
   * @default 480 (8 hours)
   * @minimum 360
   * @maximum 600
   */
  targetDuration?: number;
}

/**
 * Parameters for getRecoveryQuality tool
 */
export interface GetRecoveryQualityParams extends DateParam {
  /**
   * Number of recent days to assess
   * @default 7
   * @minimum 1
   * @maximum 30
   */
  days?: number;
}

/**
 * Parameters for detectPoorSleepImpacts tool
 */
export interface DetectPoorSleepImpactsParams {
  /**
   * Start date in YYYY-MM-DD format
   * @default 30 days ago
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  startDate?: string;

  /**
   * End date in YYYY-MM-DD format
   * @default Today
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  endDate?: string;

  /**
   * Maximum number of impacts to return
   * @default 10
   * @minimum 1
   * @maximum 50
   */
  maxImpacts?: number;

  /**
   * Minimum severity to include
   */
  minSeverity?: "low" | "moderate" | "high";
}

// ============================================================================
// Workout Tools
// ============================================================================

/**
 * Duration configuration for workout steps
 */
export interface WorkoutStepDuration {
  /**
   * Duration type
   */
  type: "time" | "distance" | "lap_button";

  /**
   * Duration value (seconds for time, meters for distance)
   * Not required for lap_button
   */
  value?: number;

  /**
   * Distance unit (required for distance type)
   */
  unit?: "m" | "km" | "mile";
}

/**
 * Target configuration for workout steps
 */
export interface WorkoutStepTarget {
  /**
   * Target type
   */
  type: "pace" | "hr_zone" | "no_target";

  /**
   * Minimum pace in min/km (required for pace target)
   */
  minValue?: number;

  /**
   * Maximum pace in min/km (required for pace target)
   */
  maxValue?: number;

  /**
   * HR zone number 1-5 (required for hr_zone target)
   */
  zone?: number;
}

/**
 * Workout step configuration
 */
export interface WorkoutStep {
  /**
   * Step type
   */
  type: "warmup" | "interval" | "recovery" | "cooldown" | "rest" | "repeat";

  /**
   * Duration of the step (not required for repeat blocks)
   */
  duration?: WorkoutStepDuration;

  /**
   * Intensity target (optional)
   */
  target?: WorkoutStepTarget;

  /**
   * Number of repetitions (required for repeat type)
   * @minimum 1
   */
  numberOfRepetitions?: number;

  /**
   * Child steps to repeat (required for repeat type)
   */
  childSteps?: WorkoutStep[];
}

/**
 * Parameters for createRunningWorkout tool
 */
export interface CreateRunningWorkoutParams {
  /**
   * Workout name (required)
   * @minLength 1
   */
  name: string;

  /**
   * Optional workout description
   */
  description?: string;

  /**
   * Array of workout steps (required, at least one step)
   * @minItems 1
   */
  steps: WorkoutStep[];
}

/**
 * Parameters for scheduleWorkout tool
 */
export interface ScheduleWorkoutParams {
  /**
   * ID of the workout to schedule (from create_running_workout response)
   */
  workoutId: number;

  /**
   * Date to schedule workout in YYYY-MM-DD format
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   * @example "2025-10-13"
   */
  date: string;
}

/**
 * Parameters for deleteWorkout tool
 */
export interface DeleteWorkoutParams {
  /**
   * ID of the workout to delete (string format)
   * @example "1354294595"
   */
  workoutId: string;
}

/**
 * Parameters for unscheduleWorkout tool
 */
export interface UnscheduleWorkoutParams {
  /**
   * ID of the workout to unschedule
   */
  workoutId: number;

  /**
   * Date from which to unschedule the workout (YYYY-MM-DD)
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   * @example "2025-10-13"
   */
  date: string;
}

/**
 * Parameters for updateWorkout tool
 */
export interface UpdateWorkoutParams {
  /**
   * ID of the workout to update
   */
  workoutId: number;

  /**
   * New workout name (optional)
   * @minLength 1
   */
  name?: string;

  /**
   * New workout description (optional)
   */
  description?: string;

  /**
   * New workout steps (optional)
   * If provided, replaces all existing steps
   * @minItems 1
   */
  steps?: WorkoutStep[];
}

/**
 * Parameters for getScheduledWorkouts tool
 */
export interface GetScheduledWorkoutsParams {
  /**
   * Start date in YYYY-MM-DD format
   * @default Current week Monday
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  startDate?: string;

  /**
   * End date in YYYY-MM-DD format
   * @default Current week Sunday
   * @pattern ^\\d{4}-\\d{2}-\\d{2}$
   */
  endDate?: string;
}

// ============================================================================
// Type Guards & Utilities
// ============================================================================

/**
 * Type guard to check if a parameter object has a date field
 */
export function hasDateParam(params: unknown): params is DateParam {
  return typeof params === 'object' && params !== null && 'date' in params;
}

/**
 * Type guard to check if a parameter object has a dateRange field
 */
export function hasDateRangeParam(params: unknown): params is DateRangeParam {
  return typeof params === 'object' && params !== null && 'dateRange' in params;
}

/**
 * Type guard to check if a parameter object has summary parameters
 */
export function hasSummaryParam(params: unknown): params is SummaryParam {
  return (
    typeof params === 'object' &&
    params !== null &&
    ('summary' in params || 'includeSummaryOnly' in params)
  );
}

/**
 * Helper to normalize summary parameter (handles deprecated 'summary' field)
 * @param params - Parameter object with potential summary fields
 * @returns The normalized summary boolean value
 */
export function normalizeSummaryParam(params: SummaryParam): boolean {
  return params.includeSummaryOnly ?? params.summary ?? false;
}

export interface GarminClientConfig {
  username: string;
  password: string;
}

export interface DailyOverview {
  date: string;
  sleep?: SleepSummary;
  activities?: ActivitySummary[];
  health?: HealthMetrics;
  hints?: string[];
}

export interface SleepSummary {
  totalSleep: number;        // minutes
  sleepScore?: number;
  quality?: string;
}

export interface ActivitySummary {
  id?: string;
  type: string;
  name: string;
  duration: number;          // minutes
  distance?: number;         // meters
  calories?: number;
}

export interface HealthMetrics {
  steps?: number;
  weight?: number;           // kg
  restingHR?: number;
  bodyBattery?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface ToolResult {
  content: Array<{
    type: "text" | "resource_link";
    text?: string;
    uri?: string;
    name?: string;
    description?: string;
  }>;
  isError?: boolean;
  [x: string]: unknown; // Index signature for MCP SDK compatibility
}

/**
 * Training Volume Aggregation Types
 */

export interface VolumeMetrics {
  duration: number;           // total duration in minutes
  distance: number;           // total distance in kilometers
  activityCount: number;      // number of activities
  calories: number;           // total calories burned
  elevationGain: number;      // total elevation gain in meters
}

export interface ActivityTypeBreakdown {
  [activityType: string]: VolumeMetrics;
}

export interface WeeklyVolumeResult {
  year: number;
  week: number;
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  metrics: VolumeMetrics;
  byActivityType: ActivityTypeBreakdown;
  trends?: {
    durationChangePercent: number;
    distanceChangePercent: number;
    activityCountChange: number;
  };
}

export interface MonthlyVolumeResult {
  year: number;
  month: number;
  monthName: string;
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  metrics: VolumeMetrics;
  byActivityType: ActivityTypeBreakdown;
  trends?: {
    durationChangePercent: number;
    distanceChangePercent: number;
    activityCountChange: number;
  };
}

export interface CustomRangeVolumeResult {
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  periodDays: number;
  metrics: VolumeMetrics;
  byActivityType: ActivityTypeBreakdown;
  dailyBreakdown?: Array<{
    date: string;
    metrics: VolumeMetrics;
  }>;
}

export interface VolumeAggregationOptions {
  includeActivityBreakdown?: boolean;
  includeTrends?: boolean;
  includeDailyBreakdown?: boolean;
  maxActivities?: number;
  activityTypes?: string[];
}

export interface ProcessedActivity {
  activityId: number;
  activityName: string;
  activityType: string;
  startTimeLocal: string;
  duration: number;           // seconds
  distance: number;           // meters
  calories: number;
  elevationGain: number;      // meters
}

/**
 * Daily Steps Data Types
 */

export interface DailyStepsData {
  calendarDate: string;
  stepGoal: number;
  totalDistance: number;      // meters
  totalSteps: number;
}

// Re-export HR zone types for convenience
export * from './hr-zones.js';

// Re-export training stress types for convenience
export * from './training-stress.js';

// Re-export workout types for convenience
export * from './workout.js';
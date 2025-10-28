/**
 * Personal Records Tracking Types
 *
 * Comprehensive type system for tracking personal bests across activities,
 * distances, durations, and sports with quality scoring and progression history.
 */

/**
 * Sport types supported for PR tracking
 */
export type SportType =
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'trail_running'
  | 'virtual_run'
  | 'indoor_cycling'
  | 'pool_swimming'
  | 'open_water'
  | 'other';

/**
 * PR category types
 */
export type PRCategoryType = 'distance' | 'duration' | 'custom';

/**
 * Metric types for PRs
 */
export type PRMetricType = 'time' | 'pace' | 'power' | 'distance' | 'speed';

/**
 * Activity quality assessment
 */
export interface ActivityQuality {
  score: number;              // 0-100
  hasGPS: boolean;
  gpsAccuracy?: number;       // meters (lower is better)
  hasSensorData: boolean;     // HR, power, cadence
  speedAnomalies: boolean;    // Unusual speed spikes
  isIndoor: boolean;
  isVirtual: boolean;
  completionStatus: 'complete' | 'incomplete' | 'paused';
  reasons?: string[];         // Quality issues if any
}

/**
 * PR category definition
 */
export interface PRCategory {
  type: PRCategoryType;
  id: string;                 // e.g., '5K', 'marathon', '30min', 'custom_12km'
  name: string;               // Display name
  value: number;              // meters for distance, seconds for duration
  tolerance: number;          // matching tolerance
  unit: 'meters' | 'seconds';
  isCustom: boolean;
  sport?: SportType;          // Optional sport restriction
  createdAt?: string;         // ISO timestamp for custom categories
}

/**
 * Personal Record
 */
export interface PersonalRecord {
  id: string;                 // Unique PR ID
  sport: SportType;
  category: PRCategory;
  activityId: number;
  activityName: string;
  timestamp: string;          // ISO timestamp
  metricValue: number;        // Time in seconds, pace in sec/km, power in watts, etc.
  metricType: PRMetricType;
  actualDistance?: number;    // Actual activity distance in meters
  actualDuration?: number;    // Actual activity duration in seconds
  quality: ActivityQuality;
  segmentData?: SegmentData;  // If extracted from splits
  metadata: {
    averageHR?: number;
    maxHR?: number;
    averagePower?: number;
    averageCadence?: number;
    elevationGain?: number;
    temperature?: number;
    weatherCondition?: string;
  };
}

/**
 * Segment data extracted from activity splits
 */
export interface SegmentData {
  startTime: number;          // seconds from activity start
  endTime: number;
  distance: number;           // meters
  duration: number;           // seconds
  pace?: number;              // seconds per km
  averageHR?: number;
  averagePower?: number;
  splits?: Array<{
    number: number;
    distance: number;
    duration: number;
    pace?: number;
  }>;
}

/**
 * PR history entry for tracking progression
 */
export interface PRHistoryEntry {
  id: string;
  prId: string;               // Links to PersonalRecord
  sport: SportType;
  categoryId: string;
  timestamp: string;
  metricValue: number;
  metricType: PRMetricType;
  activityId: number;
  activityName: string;
  improvement?: {
    absolute: number;         // Improvement in metric units
    percentage: number;       // Percentage improvement
    daysSincePrevious?: number;
  };
  previousBest?: {
    value: number;
    timestamp: string;
    activityId: number;
  };
}

/**
 * PR query filters
 */
export interface PRQueryFilters {
  sport?: SportType | SportType[];
  categoryType?: PRCategoryType | PRCategoryType[];
  categoryId?: string | string[];
  dateRange?: {
    startDate: string;        // YYYY-MM-DD
    endDate: string;
  };
  minQuality?: number;        // Minimum quality score (0-100)
  includeSegments?: boolean;  // Include segment-extracted PRs
}

/**
 * PR detection options
 */
export interface PRDetectionOptions {
  maxActivities?: number;     // Limit activities to scan (default: 1000)
  minQuality?: number;        // Minimum quality threshold (default: 70)
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  sports?: SportType[];       // Filter by sports
  categories?: string[];      // Specific categories to detect
  enableSegments?: boolean;   // Extract segments from splits (default: true)
  updateHistory?: boolean;    // Update history if new PRs found (default: true)
}

/**
 * PR progression statistics
 */
export interface PRProgression {
  categoryId: string;
  categoryName: string;
  sport: SportType;
  currentPR: PersonalRecord;
  historyCount: number;
  firstPR: {
    value: number;
    timestamp: string;
    activityId: number;
  };
  totalImprovement: {
    absolute: number;
    percentage: number;
  };
  averageImprovement: number; // Per PR improvement
  recentTrend?: {
    last30Days: number;       // PRs in last 30 days
    last90Days: number;
    improving: boolean;       // Trend direction
  };
  milestones: Milestone[];
}

/**
 * Milestone achievements
 */
export interface Milestone {
  type: MilestoneType;
  timestamp: string;
  description: string;
  metricValue: number;
  activityId: number;
}

/**
 * Milestone types
 */
export type MilestoneType =
  | 'first_pr'                // First PR in category
  | 'round_number'            // Round time/pace (e.g., sub-20 5K)
  | 'big_improvement'         // >5% improvement
  | 'streak'                  // Multiple PRs in timeframe
  | 'all_time_best'           // New all-time best
  | 'multi_distance'          // PRs in multiple distances same day
  | 'consistency'             // Multiple PRs in same category
  | 'comeback';               // PR after long break

/**
 * PR summary statistics
 */
export interface PRSummary {
  totalPRs: number;
  prsBySport: Record<SportType, number>;
  prsByCategory: Record<string, number>;
  recentPRs: {
    last7Days: number;
    last30Days: number;
    last90Days: number;
  };
  qualityDistribution: {
    excellent: number;        // 90-100
    good: number;             // 70-89
    fair: number;             // 50-69
    poor: number;             // <50
  };
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    prCount: number;
    lastPR: string;
  }>;
}

/**
 * Notification for new PR
 */
export interface PRNotification {
  id: string;
  timestamp: string;
  type: 'new_pr' | 'milestone' | 'near_pr';
  pr?: PersonalRecord;
  milestone?: Milestone;
  message: string;
  improvement?: {
    absolute: number;
    percentage: number;
  };
  read: boolean;
}

/**
 * Custom PR category input
 */
export interface CustomPRCategoryInput {
  id: string;
  name: string;
  type: 'distance' | 'duration';
  value: number;              // meters or seconds
  tolerance?: number;         // Optional, defaults calculated
  sport?: SportType;          // Optional sport restriction
}

/**
 * PR detection result
 */
export interface PRDetectionResult {
  scannedActivities: number;
  newPRsFound: number;
  updatedPRs: number;
  prsByCategory: Record<string, PersonalRecord>;
  notifications: PRNotification[];
  summary: {
    sports: SportType[];
    categories: string[];
    qualityAverage: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

/**
 * Storage schema for PR data
 */
export interface PRStorageSchema {
  version: number;
  lastUpdated: string;
  personalRecords: Record<string, PersonalRecord>;      // keyed by PR id
  history: Record<string, PRHistoryEntry[]>;            // keyed by categoryId
  customCategories: Record<string, PRCategory>;         // keyed by category id
  notifications: PRNotification[];
}

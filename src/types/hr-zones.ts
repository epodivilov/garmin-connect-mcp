/**
 * Heart Rate Zone Configuration and Distribution Types
 */

/**
 * Standard 5-zone HR model based on percentage of max HR
 */
export interface HRZoneConfig {
  zone1: { min: number; max: number; label: string }; // Recovery
  zone2: { min: number; max: number; label: string }; // Endurance
  zone3: { min: number; max: number; label: string }; // Tempo
  zone4: { min: number; max: number; label: string }; // Threshold
  zone5: { min: number; max: number; label: string }; // Anaerobic
  maxHR: number;
}

/**
 * Time spent in a single HR zone
 */
export interface HRZoneTime {
  zone: number;
  label: string;
  timeSeconds: number;
  timeMinutes: number;
  percentage: number;
  range: string; // e.g., "108-126 bpm"
}

/**
 * Heart rate zone distribution for a single activity
 */
export interface ActivityHRZones {
  activityId: number;
  activityName: string;
  activityType: string;
  startTimeLocal: string;
  duration: number; // total duration in seconds
  zoneDistribution: HRZoneTime[];
  summary: {
    totalTimeInZones: number; // seconds
    averageHR?: number;
    maxHR?: number;
    dominantZone: number; // zone with most time
  };
  hasHRData: boolean;
}

/**
 * Aggregated HR zone distribution across multiple activities
 */
export interface AggregatedHRZones {
  period: {
    startDate: string;
    endDate: string;
    type: 'weekly' | 'monthly' | 'custom';
    label?: string; // e.g., "Week 42, 2025" or "January 2025"
  };
  totalActivities: number;
  activitiesWithHR: number;
  totalDuration: number; // seconds
  zoneDistribution: HRZoneTime[];
  byActivityType?: {
    [activityType: string]: {
      activityCount: number;
      totalDuration: number;
      zoneDistribution: HRZoneTime[];
    };
  };
  visualization?: {
    labels: string[];
    values: number[];
    colors: string[];
  };
}

/**
 * Options for HR zone aggregation
 */
export interface HRZoneAggregationOptions {
  includeActivityBreakdown?: boolean;
  includeVisualization?: boolean;
  maxActivities?: number;
  activityTypes?: string[];
  customZoneConfig?: CustomHRZoneConfig;
}

/**
 * Custom HR zone configuration
 */
export interface CustomHRZoneConfig {
  maxHR: number;
  zones?: {
    zone1?: { min: number; max: number };
    zone2?: { min: number; max: number };
    zone3?: { min: number; max: number };
    zone4?: { min: number; max: number };
    zone5?: { min: number; max: number };
  };
}

/**
 * HR sample data point from activity
 */
export interface HRDataPoint {
  timestamp?: number;
  heartRate: number;
}

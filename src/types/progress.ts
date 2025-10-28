/**
 * Sport-specific Progress Analysis Types
 *
 * Provides comprehensive performance tracking including pace trends,
 * power analysis, and efficiency metrics across different sports.
 */

/**
 * Single activity measurement data point
 */
export interface ProgressDataPoint {
  activityId: number;
  activityName: string;
  activityType: string;
  date: string;                // YYYY-MM-DD
  timestamp: number;           // Unix timestamp for sorting
  /** Duration in seconds (Garmin API format) */
  duration: number;
  /** Distance in meters (Garmin API format) */
  distance?: number;
  /** Pace in seconds per kilometer (running/swimming) */
  pace?: number;
  speed?: number;              // km/h (cycling)
  averageHR?: number;
  maxHR?: number;
  averagePower?: number;       // watts (cycling)
  maxPower?: number;
  normalizedPower?: number;    // NP for cycling
  /** Elevation gain in meters (Garmin API format) */
  elevationGain?: number;
  calories?: number;
}

/**
 * Sport-specific metric definitions
 */
export interface SportMetrics {
  sport: 'running' | 'cycling' | 'swimming' | 'other';
  primaryMetric: 'pace' | 'power' | 'speed';
  unit: string;                // e.g., "min/km", "watts", "km/h"
  improvementDirection: 'lower' | 'higher'; // lower is better for pace, higher for power
}

/**
 * Statistical trend analysis with confidence intervals
 */
export interface TrendAnalysis {
  slope: number;               // Rate of change per day
  intercept: number;
  rSquared: number;            // Goodness of fit (0-1)
  pValue?: number;             // Statistical significance
  isSignificant: boolean;      // p < 0.05
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  interpretation: string;      // Human-readable summary
  projectedImprovement?: {
    thirtyDays: number;
    ninetyDays: number;
  };
}

/**
 * HR zone-based efficiency metrics
 */
export interface EfficiencyMetrics {
  zone: number;
  zoneName: string;
  zoneRange: string;           // e.g., "140-155 bpm"
  activityCount: number;
  averagePace?: number;        // seconds per km
  averagePower?: number;       // watts
  averageSpeed?: number;       // km/h
  efficiencyRatio: number;     // pace/HR or power/HR
  improvement: {
    absolute: number;
    percentage: number;
  };
}

/**
 * Aggregated progress summary
 */
export interface ProgressSummary {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  sport: string;
  activityCount: number;
  totalDistance?: number;      // km
  totalDuration: number;       // seconds
  totalElevation?: number;     // meters

  // Pace analysis (running/swimming)
  paceAnalysis?: {
    current: {
      average: number;         // seconds per km
      best: number;
      recent: number;          // last 7 days average
    };
    trend: TrendAnalysis;
    movingAverages: {
      sevenDay: Array<{ date: string; value: number }>;
      thirtyDay: Array<{ date: string; value: number }>;
    };
  };

  // Power analysis (cycling)
  powerAnalysis?: {
    current: {
      average: number;         // watts
      normalized: number;      // NP
      best: number;
      recent: number;
    };
    trend: TrendAnalysis;
    powerToWeight?: {
      value: number;           // W/kg
      trend: TrendAnalysis;
    };
    peakPower: {
      fiveSecond?: number;
      oneMinute?: number;
      fiveMinute?: number;
      twentyMinute?: number;
    };
  };

  // Efficiency by HR zone
  efficiencyByZone?: EfficiencyMetrics[];

  // Statistical summary
  variability: {
    coefficient: number;       // CV of performance metric
    consistency: 'high' | 'medium' | 'low';
  };
}

/**
 * Query parameters for progress analysis
 */
export interface ProgressQuery {
  dateRange: string;           // YYYY-MM-DD/YYYY-MM-DD
  sport?: string;              // Filter by activity type
  minDuration?: number;        // Minimum activity duration in seconds
  maxActivities?: number;      // Limit number of activities (default: 1000)
  includeEfficiency?: boolean; // Include HR zone efficiency analysis
  customMaxHR?: number;        // For zone calculation
  weight?: number;             // For power-to-weight (kg)
}

/**
 * Pace trend specific result
 */
export interface PaceTrendResult {
  period: {
    startDate: string;
    endDate: string;
  };
  sport: string;
  activityCount: number;
  paceData: Array<{
    activityId: number;
    activityName: string;
    date: string;
    durationSeconds: number;
    durationFormatted: string;
    distanceMeters?: number;
    distanceKm?: number;
    paceSecondsPerKm: number;
    paceFormatted: string;
  }>;
  trend: TrendAnalysis;
  movingAverages: {
    sevenDay: Array<{ date: string; value: number }>;
    thirtyDay: Array<{ date: string; value: number }>;
  };
  summary: {
    bestPace: number;
    worstPace: number;
    averagePace: number;
    recentPace: number;        // last 7 days
    improvement: {
      absolute: number;        // seconds per km
      percentage: number;
    };
  };
}

/**
 * Power trend specific result
 */
export interface PowerTrendResult {
  period: {
    startDate: string;
    endDate: string;
  };
  sport: string;
  activityCount: number;
  powerData: Array<{
    activityId: number;
    activityName: string;
    date: string;
    averagePower: number;
    normalizedPower?: number;
    maxPower?: number;
    duration: number;
  }>;
  trend: TrendAnalysis;
  normalizedPowerTrend?: TrendAnalysis;
  powerToWeightTrend?: TrendAnalysis;
  summary: {
    averagePower: number;
    averageNP?: number;
    peakPower: number;
    recentPower: number;       // last 7 days
    powerToWeight?: number;    // W/kg
    improvement: {
      absolute: number;        // watts
      percentage: number;
    };
  };
}

/**
 * Efficiency analysis result
 */
export interface EfficiencyResult {
  period: {
    startDate: string;
    endDate: string;
  };
  sport: string;
  activityCount: number;
  efficiencyByZone: EfficiencyMetrics[];
  summary: {
    overallEfficiency: number;
    mostEfficientZone: number;
    improvementRate: number;   // % per month
    recommendation: string;
  };
}

/**
 * Moving average calculation options
 */
export interface MovingAverageOptions {
  windowSize: number;          // days
  weightingType: 'simple' | 'exponential';
  minDataPoints?: number;      // minimum required for calculation
}

/**
 * Regression calculation options
 */
export interface RegressionOptions {
  confidenceLevel: number;     // 0.95 for 95% confidence interval
  minDataPoints: number;       // minimum required for regression
  removeOutliers?: boolean;    // filter outliers using IQR method
}

/**
 * Sport type mapping for analysis
 */
export const SPORT_CONFIGS: Record<string, SportMetrics> = {
  running: {
    sport: 'running',
    primaryMetric: 'pace',
    unit: 'min/km',
    improvementDirection: 'lower'
  },
  cycling: {
    sport: 'cycling',
    primaryMetric: 'power',
    unit: 'watts',
    improvementDirection: 'higher'
  },
  swimming: {
    sport: 'swimming',
    primaryMetric: 'pace',
    unit: 'min/100m',
    improvementDirection: 'lower'
  },
  other: {
    sport: 'other',
    primaryMetric: 'speed',
    unit: 'km/h',
    improvementDirection: 'higher'
  }
} as const;

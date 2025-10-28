/**
 * Training Stress Score (TSS) calculation and tracking types
 *
 * TSS is a metric that quantifies training load based on intensity and duration.
 * CTL (Chronic Training Load) represents fitness over 42 days
 * ATL (Acute Training Load) represents fatigue over 7 days
 * TSB (Training Stress Balance) = CTL - ATL represents form/freshness
 */

/**
 * Training Stress Score for a single activity
 */
export interface ActivityTSS {
  activityId: number;
  activityName: string;
  activityType: string;
  startTimeLocal: string;
  duration: number;              // seconds
  tss: number;                   // Training Stress Score
  calculationMethod: 'hr-trimp' | 'duration-estimate';
  confidence: 'high' | 'medium' | 'low';
  details: {
    averageHR?: number;
    maxHR?: number;
    thresholdHR?: number;
    restingHR?: number;
    intensityFactor?: number;
  };
}

/**
 * Daily aggregated TSS
 */
export interface DailyTSS {
  date: string;                  // YYYY-MM-DD
  totalTSS: number;
  activityCount: number;
  activities: Array<{
    activityId: number;
    activityName: string;
    activityType: string;
    tss: number;
    confidence: string;
  }>;
}

/**
 * Training Stress Balance metrics
 */
export interface TrainingStressBalance {
  date: string;                  // YYYY-MM-DD
  ctl: number;                   // Chronic Training Load (42-day fitness)
  atl: number;                   // Acute Training Load (7-day fatigue)
  tsb: number;                   // Training Stress Balance (form)
  formStatus: 'fresh' | 'optimal' | 'neutral' | 'fatigued' | 'overreached';
  formDescription: string;
  recommendation: string;
  trends?: {
    ctlChange: number;           // Change from 7 days ago
    atlChange: number;
    tsbChange: number;
    tsbTrend: 'improving' | 'declining' | 'stable';
  };
}

/**
 * Time series data point for TSS/CTL/ATL/TSB
 */
export interface TrainingStressDataPoint {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

/**
 * Complete training stress balance result
 */
export interface TrainingStressBalanceResult {
  currentDate: string;
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  current: TrainingStressBalance;
  timeSeries?: TrainingStressDataPoint[];
  summary: {
    totalActivities: number;
    totalTSS: number;
    averageDailyTSS: number;
    activitiesWithHR: number;
    activitiesEstimated: number;
  };
}

/**
 * Options for TSS calculation
 */
export interface TSSCalculationOptions {
  restingHR?: number;            // Default: 50 bpm
  maxHR?: number;                // Default: estimated from age or 185
  thresholdHR?: number;          // Default: 90% of maxHR
  includeTimeSeries?: boolean;   // Include historical data points
  days?: number;                 // Days of history (default: 90)
}

/**
 * Form status categories based on TSB value
 */
export const FORM_STATUS = {
  FRESH: { min: 25, label: 'Fresh', description: 'Very high form, possible detraining', color: '#3B82F6' },
  OPTIMAL: { min: 10, max: 25, label: 'Optimal', description: 'Peak readiness for performance', color: '#10B981' },
  NEUTRAL: { min: -10, max: 10, label: 'Neutral', description: 'Maintenance phase', color: '#F59E0B' },
  FATIGUED: { min: -30, max: -10, label: 'Fatigued', description: 'Productive training stress', color: '#EF4444' },
  OVERREACHED: { max: -30, label: 'Overreached', description: 'High injury/illness risk', color: '#991B1B' }
} as const;

/**
 * TSS calculation methods
 */
export const TSS_METHODS = {
  HR_TRIMP: 'hr-trimp',
  DURATION_ESTIMATE: 'duration-estimate'
} as const;

/**
 * Time constants for EWMA calculations
 */
export const TIME_CONSTANTS = {
  CTL: 42,  // Chronic Training Load (fitness)
  ATL: 7    // Acute Training Load (fatigue)
} as const;

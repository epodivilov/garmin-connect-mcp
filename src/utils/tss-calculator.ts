/**
 * Training Stress Score (TSS) Calculator
 *
 * Calculates TSS using HR-based TRIMP method or duration-based estimation.
 * Also handles EWMA calculations for CTL, ATL, and TSB.
 */

import {
  ActivityTSS,
  DailyTSS,
  TrainingStressBalance,
  TrainingStressDataPoint,
  TSSCalculationOptions,
  FORM_STATUS,
  TIME_CONSTANTS
} from '../types/training-stress.js';

/**
 * Type alias for activities that can be used for TSS calculation
 * Can be either a basic activity or detailed activity response
 */
type ActivityForTSS = {
  activityId?: number;
  activityName?: string;
  activityType?: {
    typeKey?: string;
  } | string;
  startTimeLocal?: string;
  duration?: number;
  averageHR?: number;
  maxHR?: number;
};

/**
 * Calculate TSS for an activity using HR data (TRIMP method)
 *
 * Formula:
 * - Intensity Factor (IF) = (avgHR - restingHR) / (thresholdHR - restingHR)
 * - TSS = (duration_hours * IF^2 * 100)
 */
export function calculateTSSFromHR(
  duration: number,            // seconds
  averageHR: number,
  restingHR: number = 50,
  thresholdHR?: number,
  maxHR: number = 185
): { tss: number; intensityFactor: number; confidence: 'high' | 'medium' | 'low' } {
  // Validate inputs
  if (duration <= 0 || averageHR <= 0) {
    return { tss: 0, intensityFactor: 0, confidence: 'low' };
  }

  // Estimate threshold HR if not provided (typically 90% of max HR)
  const effectiveThresholdHR = thresholdHR || Math.round(maxHR * 0.9);

  // Calculate intensity factor
  const hrRange = effectiveThresholdHR - restingHR;
  if (hrRange <= 0) {
    return { tss: 0, intensityFactor: 0, confidence: 'low' };
  }

  const intensityFactor = Math.max(0, (averageHR - restingHR) / hrRange);

  // Calculate TSS
  const durationHours = duration / 3600;
  const tss = Math.round(durationHours * Math.pow(intensityFactor, 2) * 100);

  // Determine confidence based on data quality
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (!thresholdHR) {
    confidence = 'medium'; // Using estimated threshold HR
  }
  if (averageHR < restingHR || averageHR > maxHR * 1.1) {
    confidence = 'low'; // Questionable HR data
  }

  return {
    tss: Math.max(0, tss),
    intensityFactor,
    confidence
  };
}

/**
 * Estimate TSS based on duration and activity type when HR data is unavailable
 *
 * Rough estimates:
 * - Easy: 20-40 TSS/hour
 * - Moderate: 40-70 TSS/hour
 * - Hard: 70-100 TSS/hour
 * - Very hard: 100-150 TSS/hour
 */
export function estimateTSSFromDuration(
  duration: number,            // seconds
  activityType: string
): { tss: number; confidence: 'low' } {
  const durationHours = duration / 3600;

  // Activity type mapping to TSS per hour
  const tssPerHourMap: Record<string, number> = {
    'running': 70,
    'cycling': 60,
    'walking': 30,
    'swimming': 65,
    'strength_training': 40,
    'cardio': 50,
    'hiking': 40,
    'yoga': 20,
    'other': 50
  };

  const tssPerHour = tssPerHourMap[activityType.toLowerCase()] || 50;
  const tss = Math.round(durationHours * tssPerHour);

  return {
    tss: Math.max(0, tss),
    confidence: 'low'
  };
}

/**
 * Calculate TSS for a single activity
 * @param activity - Garmin activity object (basic or detailed)
 * @param options - TSS calculation options (resting HR, max HR, threshold HR)
 * @returns Activity TSS object with calculation details
 */
export function calculateActivityTSS(
  activity: ActivityForTSS,
  options: TSSCalculationOptions = {}
): ActivityTSS {
  const {
    restingHR = 50,
    maxHR = 185,
    thresholdHR
  } = options;

  const activityId = activity.activityId || 0;
  const activityName = activity.activityName || 'Unnamed Activity';

  // Handle both structured activityType object and string type
  const activityTypeRaw = activity.activityType;
  const activityType = typeof activityTypeRaw === 'string'
    ? activityTypeRaw
    : (activityTypeRaw?.typeKey || 'unknown');

  const startTimeLocal = activity.startTimeLocal || new Date().toISOString();
  const duration = activity.duration || 0;
  const averageHR = activity.averageHR;

  let tss: number;
  let calculationMethod: 'hr-trimp' | 'duration-estimate';
  let confidence: 'high' | 'medium' | 'low';
  let intensityFactor: number | undefined;

  // Try HR-based calculation first
  if (averageHR && averageHR > 0) {
    const result = calculateTSSFromHR(duration, averageHR, restingHR, thresholdHR, maxHR);
    tss = result.tss;
    intensityFactor = result.intensityFactor;
    confidence = result.confidence;
    calculationMethod = 'hr-trimp';
  } else {
    // Fall back to duration-based estimation
    const result = estimateTSSFromDuration(duration, activityType);
    tss = result.tss;
    confidence = result.confidence;
    calculationMethod = 'duration-estimate';
  }

  return {
    activityId,
    activityName,
    activityType,
    startTimeLocal,
    duration,
    tss,
    calculationMethod,
    confidence,
    details: {
      averageHR,
      maxHR: activity.maxHR,
      thresholdHR: thresholdHR || Math.round(maxHR * 0.9),
      restingHR,
      intensityFactor
    }
  };
}

/**
 * Aggregate activities by date into daily TSS
 */
export function aggregateDailyTSS(activities: ActivityTSS[]): DailyTSS[] {
  const dailyMap = new Map<string, DailyTSS>();

  for (const activity of activities) {
    const date = activity.startTimeLocal.split('T')[0];

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        totalTSS: 0,
        activityCount: 0,
        activities: []
      });
    }

    const daily = dailyMap.get(date)!;
    daily.totalTSS += activity.tss;
    daily.activityCount++;
    daily.activities.push({
      activityId: activity.activityId,
      activityName: activity.activityName,
      activityType: activity.activityType,
      tss: activity.tss,
      confidence: activity.confidence
    });
  }

  // Sort by date
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate CTL using Exponentially Weighted Moving Average (EWMA)
 *
 * CTL_today = CTL_yesterday + (TSS_today - CTL_yesterday) / timeConstant
 * Time constant for CTL is 42 days
 */
export function calculateCTL(dailyTSS: DailyTSS[], previousCTL: number = 0): number {
  let ctl = previousCTL;

  for (const day of dailyTSS) {
    ctl = ctl + (day.totalTSS - ctl) / TIME_CONSTANTS.CTL;
  }

  return Math.round(ctl * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate ATL using Exponentially Weighted Moving Average (EWMA)
 *
 * ATL_today = ATL_yesterday + (TSS_today - ATL_yesterday) / timeConstant
 * Time constant for ATL is 7 days
 */
export function calculateATL(dailyTSS: DailyTSS[], previousATL: number = 0): number {
  let atl = previousATL;

  for (const day of dailyTSS) {
    atl = atl + (day.totalTSS - atl) / TIME_CONSTANTS.ATL;
  }

  return Math.round(atl * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate TSB (Training Stress Balance)
 *
 * TSB = CTL - ATL
 *
 * Positive TSB = Fresh (more fitness than fatigue)
 * Negative TSB = Fatigued (more fatigue than fitness)
 */
export function calculateTSB(ctl: number, atl: number): number {
  return Math.round((ctl - atl) * 10) / 10; // Round to 1 decimal
}

/**
 * Determine form status from TSB value
 */
export function determineFormStatus(
  tsb: number
): {
  status: 'fresh' | 'optimal' | 'neutral' | 'fatigued' | 'overreached';
  description: string;
  color: string;
} {
  if (tsb > FORM_STATUS.FRESH.min) {
    return {
      status: 'fresh',
      description: FORM_STATUS.FRESH.description,
      color: FORM_STATUS.FRESH.color
    };
  } else if (tsb >= FORM_STATUS.OPTIMAL.min && tsb <= FORM_STATUS.OPTIMAL.max) {
    return {
      status: 'optimal',
      description: FORM_STATUS.OPTIMAL.description,
      color: FORM_STATUS.OPTIMAL.color
    };
  } else if (tsb >= FORM_STATUS.NEUTRAL.min && tsb <= FORM_STATUS.NEUTRAL.max) {
    return {
      status: 'neutral',
      description: FORM_STATUS.NEUTRAL.description,
      color: FORM_STATUS.NEUTRAL.color
    };
  } else if (tsb >= FORM_STATUS.FATIGUED.min && tsb <= FORM_STATUS.FATIGUED.max) {
    return {
      status: 'fatigued',
      description: FORM_STATUS.FATIGUED.description,
      color: FORM_STATUS.FATIGUED.color
    };
  } else {
    return {
      status: 'overreached',
      description: FORM_STATUS.OVERREACHED.description,
      color: FORM_STATUS.OVERREACHED.color
    };
  }
}

/**
 * Generate recommendation based on TSB and form status
 */
export function generateRecommendation(tsb: number, ctl: number, atl: number): string {
  const formStatus = determineFormStatus(tsb);

  switch (formStatus.status) {
    case 'fresh':
      return 'Consider a hard training session or race. You are well-rested but risk detraining if this continues.';
    case 'optimal':
      return 'Great time for a race or high-intensity workout. You have good fitness with manageable fatigue.';
    case 'neutral':
      return 'Maintain current training load. Continue balanced training without major increases.';
    case 'fatigued':
      if (atl > ctl * 1.5) {
        return 'High fatigue detected. Consider a recovery day or reducing training intensity.';
      }
      return 'Normal training fatigue. You are building fitness. Ensure adequate recovery between hard sessions.';
    case 'overreached':
      return 'WARNING: High risk of overtraining. Take immediate rest days and reduce training load significantly.';
    default:
      return 'Continue monitoring your training load and recovery.';
  }
}

/**
 * Calculate complete training stress balance with time series
 */
export function calculateTrainingStressBalance(
  dailyTSS: DailyTSS[],
  targetDate: Date,
  options: { includeTimeSeries?: boolean; lookbackDays?: number } = {}
): {
  current: TrainingStressBalance;
  timeSeries: TrainingStressDataPoint[];
} {
  const { includeTimeSeries = false, lookbackDays = 7 } = options;
  const targetDateStr = targetDate.toISOString().split('T')[0];

  // Sort daily TSS by date
  const sortedDailyTSS = [...dailyTSS].sort((a, b) => a.date.localeCompare(b.date));

  // Calculate CTL, ATL, TSB for each day
  const timeSeries: TrainingStressDataPoint[] = [];
  let ctl = 0;
  let atl = 0;

  for (const day of sortedDailyTSS) {
    // Update CTL and ATL
    ctl = ctl + (day.totalTSS - ctl) / TIME_CONSTANTS.CTL;
    atl = atl + (day.totalTSS - atl) / TIME_CONSTANTS.ATL;
    const tsb = calculateTSB(ctl, atl);

    timeSeries.push({
      date: day.date,
      tss: day.totalTSS,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb
    });
  }

  // Find the target date or use the latest available
  let targetPoint = timeSeries.find(p => p.date === targetDateStr);
  if (!targetPoint && timeSeries.length > 0) {
    targetPoint = timeSeries[timeSeries.length - 1];
  }

  if (!targetPoint) {
    // No data available
    const formStatus = determineFormStatus(0);
    return {
      current: {
        date: targetDateStr,
        ctl: 0,
        atl: 0,
        tsb: 0,
        formStatus: formStatus.status,
        formDescription: formStatus.description,
        recommendation: 'No training data available for analysis.'
      },
      timeSeries: []
    };
  }

  // Calculate trends if we have enough history
  const lookbackDate = new Date(targetDate);
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
  const lookbackDateStr = lookbackDate.toISOString().split('T')[0];
  const lookbackPoint = timeSeries.find(p => p.date === lookbackDateStr);

  let trends;
  if (lookbackPoint) {
    const ctlChange = targetPoint.ctl - lookbackPoint.ctl;
    const atlChange = targetPoint.atl - lookbackPoint.atl;
    const tsbChange = targetPoint.tsb - lookbackPoint.tsb;

    let tsbTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (tsbChange > 2) tsbTrend = 'improving';
    else if (tsbChange < -2) tsbTrend = 'declining';

    trends = {
      ctlChange: Math.round(ctlChange * 10) / 10,
      atlChange: Math.round(atlChange * 10) / 10,
      tsbChange: Math.round(tsbChange * 10) / 10,
      tsbTrend
    };
  }

  const formStatus = determineFormStatus(targetPoint.tsb);
  const recommendation = generateRecommendation(targetPoint.tsb, targetPoint.ctl, targetPoint.atl);

  const current: TrainingStressBalance = {
    date: targetPoint.date,
    ctl: targetPoint.ctl,
    atl: targetPoint.atl,
    tsb: targetPoint.tsb,
    formStatus: formStatus.status,
    formDescription: formStatus.description,
    recommendation,
    trends
  };

  return {
    current,
    timeSeries: includeTimeSeries ? timeSeries : []
  };
}

/**
 * Fill missing dates with zero TSS to ensure continuous time series
 */
export function fillMissingDates(
  dailyTSS: DailyTSS[],
  startDate: Date,
  endDate: Date
): DailyTSS[] {
  const result: DailyTSS[] = [];
  const tssMap = new Map(dailyTSS.map(d => [d.date, d]));

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const existing = tssMap.get(dateStr);

    if (existing) {
      result.push(existing);
    } else {
      result.push({
        date: dateStr,
        totalTSS: 0,
        activityCount: 0,
        activities: []
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
}

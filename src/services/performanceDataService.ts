/**
 * Service for aggregating performance data from Garmin Connect
 *
 * This service handles:
 * - Fetching activities for date ranges
 * - Aggregating daily performance metrics
 * - Calculating training stress scores
 * - Normalizing performance data for correlation analysis
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { GarminClient } from '../client/garmin-client.js';
import type { DailyPerformance } from '../types/sleep-correlation.js';
import type { GarminActivity, GarminDailySummary, GarminWellnessData } from '../types/garmin-api.js';
import { GARMIN_API_DELAY_MS } from '../constants/apiConfig.js';

/**
 * Fetch and aggregate performance data for a date range
 *
 * @param client - Authenticated Garmin Connect client
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of daily performance metrics
 */
export async function fetchPerformanceData(
  client: GarminClient,
  startDate: string,
  endDate: string
): Promise<DailyPerformance[]> {
  try {
    // Fetch all activities in date range
    // Note: Garmin API typically returns recent activities, we filter by date
    const activities = await client.getActivities(0, 1000);

    // Rate limiting: GARMIN_API_DELAY_MS delay between requests
    await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));

    // Filter activities within date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredActivities = (activities as GarminActivity[]).filter((activity) => {
      const activityDate = new Date(activity.startTimeLocal || activity.startTimeGMT || '');
      return activityDate >= start && activityDate <= end;
    });

    // Group activities by date
    const activitiesByDate = groupActivitiesByDate(filteredActivities);

    // Aggregate performance for each date
    const performanceData: DailyPerformance[] = [];

    for (const [dateStr, dayActivities] of Object.entries(activitiesByDate)) {
      const performance = aggregateDailyPerformance(dateStr, dayActivities);
      if (performance) {
        performanceData.push(performance);
      }
    }

    // Fetch body battery and stress data for each date
    for (const performance of performanceData) {
      try {
        await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));
        const wellnessData = await fetchWellnessData(client, performance.date);

        if (wellnessData) {
          performance.endBodyBattery = wellnessData.bodyBattery;
          performance.avgStress = wellnessData.stress;
        }
      } catch {
        // Continue if wellness data not available
      }
    }

    return performanceData.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

/**
 * Group activities by date
 *
 * @param activities - Array of activities
 * @returns Map of date to activities
 */
function groupActivitiesByDate(activities: GarminActivity[]): Record<string, GarminActivity[]> {
  const grouped: Record<string, GarminActivity[]> = {};

  for (const activity of activities) {
    const dateStr = extractActivityDate(activity);
    if (!grouped[dateStr]) {
      grouped[dateStr] = [];
    }
    grouped[dateStr].push(activity);
  }

  return grouped;
}

/**
 * Extract date string from activity
 *
 * @param activity - Activity data
 * @returns Date string (YYYY-MM-DD)
 */
function extractActivityDate(activity: GarminActivity): string {
  const dateTime = activity.startTimeLocal || activity.startTimeGMT || '';
  return new Date(dateTime).toISOString().split('T')[0];
}

/**
 * Aggregate performance metrics for a single day
 *
 * @param date - Date string (YYYY-MM-DD)
 * @param activities - Activities for the day
 * @returns Daily performance metrics
 */
function aggregateDailyPerformance(date: string, activities: GarminActivity[]): DailyPerformance | null {
  if (activities.length === 0) {
    return null;
  }

  interface ActivityTotals {
    duration: number;
    distance: number;
    avgHr: number;
    avgPower: number;
    elevation: number;
    tss: number;
    pace: number;
    hrCount: number;
    powerCount: number;
    paceCount: number;
  }

  const totals = activities.reduce<ActivityTotals>(
    (acc, activity) => {
      const duration = activity.duration || activity.movingDuration || 0;
      const distance = activity.distance || 0;
      const avgHr = activity.averageHR || activity.avgHR || 0;
      const avgPower = activity.avgPower || activity.averagePower || 0;
      const elevation = activity.elevationGain || activity.totalElevation || 0;
      const tss = calculateActivityTSS(activity);

      // Calculate pace if distance and duration available
      let pace = 0;
      if (distance > 0 && duration > 0) {
        // Pace in min/km
        pace = (duration / 60) / (distance / 1000);
      }

      return {
        duration: acc.duration + duration,
        distance: acc.distance + distance,
        avgHr: acc.avgHr + avgHr,
        avgPower: acc.avgPower + avgPower,
        elevation: acc.elevation + elevation,
        tss: acc.tss + tss,
        pace: acc.pace + pace,
        hrCount: acc.hrCount + (avgHr > 0 ? 1 : 0),
        powerCount: acc.powerCount + (avgPower > 0 ? 1 : 0),
        paceCount: acc.paceCount + (pace > 0 ? 1 : 0),
      };
    },
    {
      duration: 0,
      distance: 0,
      avgHr: 0,
      avgPower: 0,
      elevation: 0,
      tss: 0,
      pace: 0,
      hrCount: 0,
      powerCount: 0,
      paceCount: 0,
    }
  );

  const performance: DailyPerformance = {
    date,
    activitiesCount: activities.length,
    totalDurationMinutes: Math.round(totals.duration / 60),
    totalDistanceKm: totals.distance / 1000,
    totalElevationGain: totals.elevation,
  };

  // Add averages if available
  if (totals.hrCount > 0) {
    performance.avgHeartRate = Math.round(totals.avgHr / totals.hrCount);
  }

  if (totals.powerCount > 0) {
    performance.avgPower = Math.round(totals.avgPower / totals.powerCount);
  }

  if (totals.paceCount > 0) {
    performance.avgPace = totals.pace / totals.paceCount;
  }

  if (totals.tss > 0) {
    performance.trainingStressScore = totals.tss;
  }

  return performance;
}

/**
 * Calculate Training Stress Score (TSS) for an activity
 *
 * @param activity - Activity data
 * @returns Estimated TSS
 */
function calculateActivityTSS(activity: GarminActivity): number {
  // If TSS is provided by Garmin, use it
  if (activity.trainingStressScore) {
    return activity.trainingStressScore;
  }

  if (activity.aerobicTrainingEffect) {
    return activity.aerobicTrainingEffect;
  }

  // Estimate TSS from duration and intensity
  const duration = activity.duration || activity.movingDuration || 0;
  const avgHr = activity.averageHR || activity.avgHR || 0;
  const maxHr = activity.maxHR || 190; // Rough estimate

  if (duration === 0) {
    return 0;
  }

  // Simple TSS estimation based on duration and HR intensity
  const durationHours = duration / 3600;
  const intensityFactor = avgHr > 0 ? avgHr / maxHr : 0.7;

  // TSS formula approximation: duration * intensity^2 * 100
  return Math.round(durationHours * Math.pow(intensityFactor, 2) * 100);
}

/**
 * Fetch wellness data (Body Battery, Stress) for a date
 *
 * @param client - Authenticated Garmin Connect client
 * @param date - Date string (YYYY-MM-DD)
 * @returns Wellness metrics or null if unavailable
 */
async function fetchWellnessData(
  client: GarminClient,
  date: string
): Promise<GarminWellnessData | null> {

  try {
    // Try to get daily stats which may include body battery and stress
    // Note: This API may not be directly available, returning null as fallback
    const dailyStats = (await (client as any).getSummary?.(date)) as GarminDailySummary | undefined;

    if (!dailyStats) {
      return null;
    }

    const result: GarminWellnessData = {};

    // Extract body battery if available
    if (dailyStats.bodyBatteryValue !== undefined) {
      result.bodyBattery = dailyStats.bodyBatteryValue;
      result.bodyBatteryValue = dailyStats.bodyBatteryValue;
    } else if (dailyStats.endBodyBattery !== undefined) {
      result.bodyBattery = dailyStats.endBodyBattery;
      result.endBodyBattery = dailyStats.endBodyBattery;
    }

    // Extract stress if available
    if (dailyStats.averageStressLevel !== undefined) {
      result.stress = dailyStats.averageStressLevel;
      result.averageStressLevel = dailyStats.averageStressLevel;
    } else if (dailyStats.avgStress !== undefined) {
      result.stress = dailyStats.avgStress;
      result.avgStress = dailyStats.avgStress;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Calculate average performance metrics for a period
 *
 * @param performanceData - Array of daily performance
 * @returns Average performance metrics
 */
export function calculateAveragePerformance(performanceData: DailyPerformance[]): {
  avgDuration: number;
  avgDistance: number;
  avgPace?: number;
  avgHeartRate?: number;
  avgPower?: number;
  avgTSS?: number;
  avgActivities: number;
} {
  if (performanceData.length === 0) {
    return {
      avgDuration: 0,
      avgDistance: 0,
      avgActivities: 0,
    };
  }

  const totals = performanceData.reduce(
    (acc, day) => ({
      duration: acc.duration + day.totalDurationMinutes,
      distance: acc.distance + day.totalDistanceKm,
      activities: acc.activities + day.activitiesCount,
      pace: acc.pace + (day.avgPace || 0),
      heartRate: acc.heartRate + (day.avgHeartRate || 0),
      power: acc.power + (day.avgPower || 0),
      tss: acc.tss + (day.trainingStressScore || 0),
      paceCount: acc.paceCount + (day.avgPace ? 1 : 0),
      hrCount: acc.hrCount + (day.avgHeartRate ? 1 : 0),
      powerCount: acc.powerCount + (day.avgPower ? 1 : 0),
      tssCount: acc.tssCount + (day.trainingStressScore ? 1 : 0),
    }),
    {
      duration: 0,
      distance: 0,
      activities: 0,
      pace: 0,
      heartRate: 0,
      power: 0,
      tss: 0,
      paceCount: 0,
      hrCount: 0,
      powerCount: 0,
      tssCount: 0,
    }
  );

  const count = performanceData.length;

  return {
    avgDuration: totals.duration / count,
    avgDistance: totals.distance / count,
    avgActivities: totals.activities / count,
    avgPace: totals.paceCount > 0 ? totals.pace / totals.paceCount : undefined,
    avgHeartRate: totals.hrCount > 0 ? totals.heartRate / totals.hrCount : undefined,
    avgPower: totals.powerCount > 0 ? totals.power / totals.powerCount : undefined,
    avgTSS: totals.tssCount > 0 ? totals.tss / totals.tssCount : undefined,
  };
}

/**
 * Calculate composite performance score
 *
 * @param performance - Daily performance metrics
 * @param baseline - Baseline performance for comparison
 * @returns Performance score (0-100)
 */
export function calculatePerformanceScore(
  performance: DailyPerformance,
  baseline?: DailyPerformance
): number {
  let score = 50; // Base score

  // Duration component (0-20 points)
  const durationScore = Math.min(20, (performance.totalDurationMinutes / 60) * 5);
  score += durationScore;

  // Distance component (0-20 points)
  const distanceScore = Math.min(20, performance.totalDistanceKm * 2);
  score += distanceScore;

  // TSS component (0-30 points)
  if (performance.trainingStressScore) {
    const tssScore = Math.min(30, performance.trainingStressScore / 5);
    score += tssScore;
  }

  // Body Battery component (0-15 points)
  if (performance.endBodyBattery) {
    const batteryScore = (performance.endBodyBattery / 100) * 15;
    score += batteryScore;
  }

  // Stress penalty (reduce up to -15 points)
  if (performance.avgStress) {
    const stressPenalty = (performance.avgStress / 100) * 15;
    score -= stressPenalty;
  }

  // Baseline comparison adjustment
  if (baseline) {
    const durationRatio = performance.totalDurationMinutes / (baseline.totalDurationMinutes || 1);
    const distanceRatio = performance.totalDistanceKm / (baseline.totalDistanceKm || 1);

    // Bonus for exceeding baseline (up to +10 points)
    if (durationRatio > 1.1 || distanceRatio > 1.1) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

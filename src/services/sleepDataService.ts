/**
 * Service for fetching and normalizing sleep data from Garmin Connect
 *
 * This service handles:
 * - Fetching sleep data for date ranges
 * - Normalizing Garmin API responses to SleepMetrics format
 * - Calculating sleep stage percentages
 * - Data validation and quality checks
 */

import type { GarminClient } from '../client/garmin-client.js';
import type { SleepMetrics } from '../types/sleep-correlation.js';
import type { GarminSleepDataResponse } from '../types/garmin-api.js';
import { GARMIN_API_DELAY_MS } from '../constants/apiConfig.js';

/**
 * Fetch and normalize sleep data for a date range
 *
 * @param client - Authenticated Garmin Connect client
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of normalized sleep metrics
 */
export async function fetchSleepData(
  client: GarminClient,
  startDate: string,
  endDate: string
): Promise<SleepMetrics[]> {
  const sleepMetrics: SleepMetrics[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Iterate through each date in range
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];

    try {
      // Rate limiting: GARMIN_API_DELAY_MS delay between requests
      if (sleepMetrics.length > 0) {
        await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));
      }

      // Fetch sleep data for the date
      const sleepData = await client.getSleepData(new Date(dateStr));

      if (sleepData && sleepData.dailySleepDTO) {
        const normalized = normalizeSleepData(sleepData, dateStr);
        if (normalized && isValidSleepData(normalized)) {
          sleepMetrics.push(normalized);
        }
      }
    } catch {
      // Continue processing other dates
    }
  }

  return sleepMetrics;
}

/**
 * Normalize raw Garmin sleep data to SleepMetrics format
 *
 * @param rawData - Raw sleep data from Garmin API
 * @param date - Date string (YYYY-MM-DD)
 * @returns Normalized sleep metrics or null if invalid
 */
export function normalizeSleepData(rawData: GarminSleepDataResponse, date: string): SleepMetrics | null {
  try {
    const daily = rawData.dailySleepDTO;
    const wellness = rawData.wellnessEpochSummaryDTO;

    if (!daily) {
      return null;
    }

    // Extract sleep durations (in seconds from API, convert to minutes)
    const deepSleepSeconds = daily.deepSleepSeconds || 0;
    const lightSleepSeconds = daily.lightSleepSeconds || 0;
    const remSleepSeconds = daily.remSleepSeconds || 0;
    const awakeSleepSeconds = daily.awakeSleepSeconds || 0;

    const totalSleepMinutes = Math.round(
      (deepSleepSeconds + lightSleepSeconds + remSleepSeconds) / 60
    );

    // Skip if no meaningful sleep data
    if (totalSleepMinutes === 0) {
      return null;
    }

    // Calculate sleep score (if not provided, estimate from sleep stages)
    const sleepScore = daily.sleepScores?.overall?.value ||
      calculateSleepScore(deepSleepSeconds, lightSleepSeconds, remSleepSeconds, awakeSleepSeconds);

    const metrics: SleepMetrics = {
      date,
      totalSleepMinutes,
      deepSleepMinutes: Math.round(deepSleepSeconds / 60),
      lightSleepMinutes: Math.round(lightSleepSeconds / 60),
      remSleepMinutes: Math.round(remSleepSeconds / 60),
      awakeMinutes: Math.round(awakeSleepSeconds / 60),
      sleepScore,
    };

    // Add optional fields if available
    if (daily.averageSpO2Value) {
      // SpO2 not in our type, but we can add HR and respiration
    }

    if (daily.avgSleepStress) {
      metrics.avgHeartRate = daily.avgSleepStress; // This might be avgHeartRate in some API versions
    }

    if (daily.averageHeartRate) {
      metrics.avgHeartRate = daily.averageHeartRate;
    }

    if (wellness?.averageHeartRate) {
      metrics.avgHeartRate = wellness.averageHeartRate;
    }

    if (daily.averageRespirationValue) {
      metrics.avgRespiration = daily.averageRespirationValue;
    }

    if (daily.awakeDuration) {
      metrics.awakeningsCount = daily.awakeDuration; // Approximate
    }

    if (daily.sleepStartTimestampGMT) {
      metrics.sleepStartTime = new Date(daily.sleepStartTimestampGMT).toISOString();
    }

    if (daily.sleepEndTimestampGMT) {
      metrics.sleepEndTime = new Date(daily.sleepEndTimestampGMT).toISOString();
    }

    // Add HRV if available
    if (wellness?.hrvValue || daily.hrvValue) {
      metrics.hrv = wellness?.hrvValue || daily.hrvValue;
    }

    return metrics;
  } catch {
    return null;
  }
}

/**
 * Calculate estimated sleep score from sleep stages
 *
 * @param deepSeconds - Deep sleep duration in seconds
 * @param lightSeconds - Light sleep duration in seconds
 * @param remSeconds - REM sleep duration in seconds
 * @param awakeSeconds - Awake time in seconds
 * @returns Estimated sleep score (0-100)
 */
function calculateSleepScore(
  deepSeconds: number,
  lightSeconds: number,
  remSeconds: number,
  awakeSeconds: number
): number {
  const totalSleepSeconds = deepSeconds + lightSeconds + remSeconds;

  if (totalSleepSeconds === 0) {
    return 0;
  }

  // Calculate percentages
  const deepPercent = (deepSeconds / totalSleepSeconds) * 100;
  const remPercent = (remSeconds / totalSleepSeconds) * 100;
  const awakePercent = (awakeSeconds / (totalSleepSeconds + awakeSeconds)) * 100;

  // Score components (out of 100)
  let score = 50; // Base score

  // Deep sleep quality (0-25 points)
  if (deepPercent >= 20) score += 25;
  else if (deepPercent >= 15) score += 20;
  else if (deepPercent >= 10) score += 15;
  else score += 10;

  // REM sleep quality (0-25 points)
  if (remPercent >= 25) score += 25;
  else if (remPercent >= 20) score += 20;
  else if (remPercent >= 15) score += 15;
  else score += 10;

  // Awake time penalty (reduce up to -20 points)
  if (awakePercent > 15) score -= 20;
  else if (awakePercent > 10) score -= 15;
  else if (awakePercent > 5) score -= 10;

  // Total sleep duration bonus/penalty (0-20 points)
  const totalHours = totalSleepSeconds / 3600;
  if (totalHours >= 7 && totalHours <= 9) score += 20;
  else if (totalHours >= 6 && totalHours < 7) score += 10;
  else if (totalHours >= 5) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Validate sleep data quality
 *
 * @param metrics - Sleep metrics to validate
 * @returns True if data is valid and usable
 */
export function isValidSleepData(metrics: SleepMetrics): boolean {
  // Must have minimum sleep duration
  if (metrics.totalSleepMinutes < 60) {
    return false;
  }

  // Total sleep should equal sum of stages
  const sumStages = metrics.deepSleepMinutes + metrics.lightSleepMinutes + metrics.remSleepMinutes;
  const difference = Math.abs(sumStages - metrics.totalSleepMinutes);

  // Allow 5% difference for rounding errors
  if (difference > metrics.totalSleepMinutes * 0.05) {
    return false;
  }

  // Sleep score should be in valid range
  if (metrics.sleepScore < 0 || metrics.sleepScore > 100) {
    return false;
  }

  return true;
}

/**
 * Calculate sleep stage percentages
 *
 * @param metrics - Sleep metrics
 * @returns Object with sleep stage percentages
 */
export function calculateSleepStagePercentages(metrics: SleepMetrics): {
  deepPercent: number;
  lightPercent: number;
  remPercent: number;
  awakePercent: number;
} {
  const total = metrics.totalSleepMinutes;

  if (total === 0) {
    return { deepPercent: 0, lightPercent: 0, remPercent: 0, awakePercent: 0 };
  }

  return {
    deepPercent: (metrics.deepSleepMinutes / total) * 100,
    lightPercent: (metrics.lightSleepMinutes / total) * 100,
    remPercent: (metrics.remSleepMinutes / total) * 100,
    awakePercent: (metrics.awakeMinutes / (total + metrics.awakeMinutes)) * 100,
  };
}

/**
 * Get average sleep metrics for a period
 *
 * @param sleepData - Array of sleep metrics
 * @returns Average sleep metrics
 */
export function calculateAverageSleepMetrics(sleepData: SleepMetrics[]): {
  avgDuration: number;
  avgDeepPercent: number;
  avgRemPercent: number;
  avgSleepScore: number;
  avgHeartRate?: number;
  avgHrv?: number;
} {
  if (sleepData.length === 0) {
    return {
      avgDuration: 0,
      avgDeepPercent: 0,
      avgRemPercent: 0,
      avgSleepScore: 0,
    };
  }

  const totals = sleepData.reduce(
    (acc, metrics) => {
      const percentages = calculateSleepStagePercentages(metrics);
      return {
        duration: acc.duration + metrics.totalSleepMinutes,
        deepPercent: acc.deepPercent + percentages.deepPercent,
        remPercent: acc.remPercent + percentages.remPercent,
        sleepScore: acc.sleepScore + metrics.sleepScore,
        heartRate: acc.heartRate + (metrics.avgHeartRate || 0),
        hrv: acc.hrv + (metrics.hrv || 0),
        heartRateCount: acc.heartRateCount + (metrics.avgHeartRate ? 1 : 0),
        hrvCount: acc.hrvCount + (metrics.hrv ? 1 : 0),
      };
    },
    {
      duration: 0,
      deepPercent: 0,
      remPercent: 0,
      sleepScore: 0,
      heartRate: 0,
      hrv: 0,
      heartRateCount: 0,
      hrvCount: 0,
    }
  );

  const count = sleepData.length;

  return {
    avgDuration: totals.duration / count,
    avgDeepPercent: totals.deepPercent / count,
    avgRemPercent: totals.remPercent / count,
    avgSleepScore: totals.sleepScore / count,
    avgHeartRate: totals.heartRateCount > 0 ? totals.heartRate / totals.heartRateCount : undefined,
    avgHrv: totals.hrvCount > 0 ? totals.hrv / totals.hrvCount : undefined,
  };
}

/**
 * Power Analysis Service
 *
 * Analyzes power trends for cycling activities including normalized power,
 * power-to-weight ratio, and peak power analysis.
 */

import { GarminClient } from '../client/garmin-client.js';
import {
  ProgressDataPoint,
  ProgressQuery,
  PowerTrendResult
} from '../types/progress.js';
import { fetchActivityMetrics, filterBySport } from './data-aggregator.js';
import {
  analyzeTrend,
  RegressionDataPoint
} from './regression-analyzer.js';

/**
 * Analyze power trends for cycling activities
 */
export async function analyzePowerTrend(
  garminClient: GarminClient,
  query: ProgressQuery
): Promise<PowerTrendResult> {
  // Fetch activity data
  const allDataPoints = await fetchActivityMetrics(garminClient, query);

  // Filter for power-based sports (cycling)
  let dataPoints = allDataPoints.filter(point =>
    point.averagePower !== undefined || point.normalizedPower !== undefined
  );

  // Apply sport filter if specified
  if (query.sport) {
    dataPoints = filterBySport(dataPoints, query.sport);
  }

  if (dataPoints.length === 0) {
    throw new Error('No power data found for the specified criteria');
  }

  // Determine sport type
  const sportType = determineSportType(dataPoints);

  // Analyze average power trend
  const avgPowerData: RegressionDataPoint[] = dataPoints
    .filter(p => p.averagePower !== undefined)
    .map((point, index) => ({
      x: index,
      y: point.averagePower!
    }));

  const trend = analyzeTrend(
    avgPowerData,
    {
      confidenceLevel: 0.95,
      minDataPoints: 5,
      removeOutliers: true
    },
    'power',
    'higher' // Higher power is better
  );

  // Analyze normalized power trend if available
  const npData: RegressionDataPoint[] = dataPoints
    .filter(p => p.normalizedPower !== undefined)
    .map((point, index) => ({
      x: index,
      y: point.normalizedPower!
    }));

  const normalizedPowerTrend = npData.length >= 5
    ? analyzeTrend(
        npData,
        {
          confidenceLevel: 0.95,
          minDataPoints: 5,
          removeOutliers: true
        },
        'normalized power',
        'higher'
      )
    : undefined;

  // Analyze power-to-weight trend if weight provided
  let powerToWeightTrend: typeof trend | undefined;
  if (query.weight && query.weight > 0) {
    const pwData: RegressionDataPoint[] = dataPoints
      .filter(p => p.averagePower !== undefined)
      .map((point, index) => ({
        x: index,
        y: point.averagePower! / query.weight!
      }));

    powerToWeightTrend = pwData.length >= 5
      ? analyzeTrend(
          pwData,
          {
            confidenceLevel: 0.95,
            minDataPoints: 5,
            removeOutliers: true
          },
          'power-to-weight',
          'higher'
        )
      : undefined;
  }

  // Calculate summary statistics
  const avgPowers = dataPoints
    .map(p => p.averagePower)
    .filter((p): p is number => p !== undefined);
  const avgNPs = dataPoints
    .map(p => p.normalizedPower)
    .filter((p): p is number => p !== undefined);
  const maxPowers = dataPoints
    .map(p => p.maxPower)
    .filter((p): p is number => p !== undefined);

  const averagePower = avgPowers.length > 0
    ? avgPowers.reduce((sum, p) => sum + p, 0) / avgPowers.length
    : 0;

  const averageNP = avgNPs.length > 0
    ? avgNPs.reduce((sum, p) => sum + p, 0) / avgNPs.length
    : undefined;

  const peakPower = maxPowers.length > 0
    ? Math.max(...maxPowers)
    : 0;

  // Calculate recent power (last 7 days)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentPowers = dataPoints
    .filter(p => p.timestamp >= sevenDaysAgo && p.averagePower !== undefined)
    .map(p => p.averagePower!);
  const recentPower = recentPowers.length > 0
    ? recentPowers.reduce((sum, p) => sum + p, 0) / recentPowers.length
    : averagePower;

  // Calculate power-to-weight if weight provided
  const powerToWeight = query.weight && query.weight > 0
    ? averagePower / query.weight
    : undefined;

  // Calculate improvement
  const improvement = {
    absolute: recentPower - averagePower,
    percentage: ((recentPower - averagePower) / averagePower) * 100
  };

  // Parse dates
  const dates = dataPoints.map(p => new Date(p.timestamp));
  const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

  return {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    },
    sport: sportType,
    activityCount: dataPoints.length,
    powerData: dataPoints.map(point => ({
      activityId: point.activityId,
      activityName: point.activityName,
      date: point.date,
      averagePower: point.averagePower || 0,
      normalizedPower: point.normalizedPower,
      maxPower: point.maxPower,
      duration: point.duration
    })),
    trend,
    normalizedPowerTrend,
    powerToWeightTrend,
    summary: {
      averagePower,
      averageNP,
      peakPower,
      recentPower,
      powerToWeight,
      improvement
    }
  };
}

/**
 * Calculate Normalized Power (NP)
 *
 * NP = (Σ(avg30s^4) / n)^0.25
 *
 * This is a weighted average of power that accounts for the physiological
 * demands of variable intensity efforts.
 */
export function calculateNormalizedPower(powerSamples: number[]): number {
  if (powerSamples.length === 0) {
    return 0;
  }

  // Calculate 30-second rolling averages
  const windowSize = 30;
  const rollingAverages: number[] = [];

  for (let i = 0; i < powerSamples.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    const window = powerSamples.slice(windowStart, i + 1);
    const avg = window.reduce((sum, p) => sum + p, 0) / window.length;
    rollingAverages.push(avg);
  }

  // Raise each rolling average to the 4th power
  const fourthPowers = rollingAverages.map(avg => Math.pow(avg, 4));

  // Calculate average of 4th powers
  const avgFourthPower = fourthPowers.reduce((sum, p) => sum + p, 0) / fourthPowers.length;

  // Take 4th root
  return Math.pow(avgFourthPower, 0.25);
}

/**
 * Track power-to-weight ratio over time
 */
export function trackPowerToWeightRatio(
  dataPoints: ProgressDataPoint[],
  weight: number
): Array<{ date: string; powerToWeight: number; power: number }> {
  if (weight <= 0) {
    throw new Error('Weight must be greater than 0');
  }

  return dataPoints
    .filter(p => p.averagePower !== undefined)
    .map(point => ({
      date: point.date,
      powerToWeight: point.averagePower! / weight,
      power: point.averagePower!
    }));
}

/**
 * Detect peak power improvements
 *
 * Tracks max power across different time durations
 */
export function detectPeakPower(dataPoints: ProgressDataPoint[]): {
  fiveSecond?: number;
  oneMinute?: number;
  fiveMinute?: number;
  twentyMinute?: number;
  overall: number;
} {
  const maxPowers = dataPoints
    .map(p => p.maxPower)
    .filter((p): p is number => p !== undefined);

  if (maxPowers.length === 0) {
    return { overall: 0 };
  }

  // For simplicity, we'll use max power from activities
  // In a real implementation, we'd need detailed power data streams
  const overall = Math.max(...maxPowers);

  return {
    overall,
    // These would require detailed power stream data
    fiveSecond: undefined,
    oneMinute: undefined,
    fiveMinute: undefined,
    twentyMinute: undefined
  };
}

/**
 * Calculate Functional Threshold Power (FTP) estimate
 *
 * FTP ≈ 95% of 20-minute best power
 */
export function estimateFTP(twentyMinutePower: number): number {
  return twentyMinutePower * 0.95;
}

/**
 * Calculate power zones based on FTP
 */
export function calculatePowerZones(ftp: number): {
  zone1: { min: number; max: number; label: string };
  zone2: { min: number; max: number; label: string };
  zone3: { min: number; max: number; label: string };
  zone4: { min: number; max: number; label: string };
  zone5: { min: number; max: number; label: string };
  zone6: { min: number; max: number; label: string };
  zone7: { min: number; max: number; label: string };
} {
  return {
    zone1: { min: 0, max: Math.round(ftp * 0.55), label: 'Active Recovery' },
    zone2: { min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.75), label: 'Endurance' },
    zone3: { min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.90), label: 'Tempo' },
    zone4: { min: Math.round(ftp * 0.90), max: Math.round(ftp * 1.05), label: 'Threshold' },
    zone5: { min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.20), label: 'VO2 Max' },
    zone6: { min: Math.round(ftp * 1.20), max: Math.round(ftp * 1.50), label: 'Anaerobic' },
    zone7: { min: Math.round(ftp * 1.50), max: 9999, label: 'Neuromuscular' }
  };
}

/**
 * Determine primary sport type from data points
 */
function determineSportType(dataPoints: ProgressDataPoint[]): string {
  const sportCounts = new Map<string, number>();

  for (const point of dataPoints) {
    const count = sportCounts.get(point.activityType) || 0;
    sportCounts.set(point.activityType, count + 1);
  }

  // Find most common sport
  let maxCount = 0;
  let primarySport = 'unknown';

  for (const [sport, count] of sportCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      primarySport = sport;
    }
  }

  return primarySport;
}

/**
 * Calculate Variability Index (VI)
 *
 * VI = NP / Average Power
 * Indicates how steady the pacing was (1.0 = perfectly steady)
 */
export function calculateVariabilityIndex(
  normalizedPower: number,
  averagePower: number
): number {
  if (averagePower === 0) {
    return 1.0;
  }
  return normalizedPower / averagePower;
}

/**
 * Calculate Intensity Factor (IF)
 *
 * IF = NP / FTP
 * Represents the intensity of the workout relative to threshold
 */
export function calculateIntensityFactor(
  normalizedPower: number,
  ftp: number
): number {
  if (ftp === 0) {
    return 0;
  }
  return normalizedPower / ftp;
}

/**
 * Pace Analysis Service
 *
 * Analyzes pace trends for running and swimming activities with
 * moving averages, regression analysis, and statistical summaries.
 */

import { GarminClient } from '../client/garmin-client.js';
import { formatDuration, formatPace } from '../utils/formatters.js';
import {
  ProgressDataPoint,
  ProgressQuery,
  PaceTrendResult,
  MovingAverageOptions
} from '../types/progress.js';
import { fetchActivityMetrics, filterBySport } from './data-aggregator.js';
import {
  analyzeTrend,
  RegressionDataPoint
} from './regression-analyzer.js';

/**
 * Analyze pace trends for a given sport and date range
 */
export async function analyzePaceTrend(
  garminClient: GarminClient,
  query: ProgressQuery
): Promise<PaceTrendResult> {
  // Fetch activity data
  const allDataPoints = await fetchActivityMetrics(garminClient, query);

  // Filter for pace-based sports (running, swimming)
  let dataPoints = allDataPoints.filter(point => point.pace !== undefined);

  // Apply sport filter if specified
  if (query.sport) {
    dataPoints = filterBySport(dataPoints, query.sport);
  }

  if (dataPoints.length === 0) {
    throw new Error('No pace data found for the specified criteria');
  }

  // Determine sport type
  const sportType = determineSportType(dataPoints);

  // Calculate moving averages
  const sevenDayMA = calculateMovingAverage(dataPoints, {
    windowSize: 7,
    weightingType: 'exponential',
    minDataPoints: 3
  });

  const thirtyDayMA = calculateMovingAverage(dataPoints, {
    windowSize: 30,
    weightingType: 'exponential',
    minDataPoints: 7
  });

  // Perform regression analysis
  const regressionData: RegressionDataPoint[] = dataPoints.map((point, index) => ({
    x: index,
    y: point.pace!
  }));

  const trend = analyzeTrend(
    regressionData,
    {
      confidenceLevel: 0.95,
      minDataPoints: 5,
      removeOutliers: true
    },
    'pace',
    'lower' // Lower pace is better
  );

  // Calculate summary statistics
  const paces = dataPoints.map(p => p.pace!);
  const bestPace = Math.min(...paces);
  const worstPace = Math.max(...paces);
  const averagePace = paces.reduce((sum, p) => sum + p, 0) / paces.length;

  // Calculate recent pace (last 7 days)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentPaces = dataPoints
    .filter(p => p.timestamp >= sevenDaysAgo)
    .map(p => p.pace!);
  const recentPace = recentPaces.length > 0
    ? recentPaces.reduce((sum, p) => sum + p, 0) / recentPaces.length
    : averagePace;

  // Calculate improvement
  const improvement = {
    absolute: averagePace - recentPace, // Negative means slower
    percentage: ((averagePace - recentPace) / averagePace) * 100
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
    paceData: dataPoints.map(point => ({
      activityId: point.activityId,
      activityName: point.activityName,
      date: point.date,
      durationSeconds: point.duration,
      durationFormatted: formatDuration(point.duration),
      distanceMeters: point.distance,
      distanceKm: point.distance ? point.distance / 1000 : undefined,
      paceSecondsPerKm: point.pace!,
      paceFormatted: formatPace(point.pace!)
    })),
    trend,
    movingAverages: {
      sevenDay: sevenDayMA,
      thirtyDay: thirtyDayMA
    },
    summary: {
      bestPace,
      worstPace,
      averagePace,
      recentPace,
      improvement
    }
  };
}

/**
 * Calculate moving average for pace data
 *
 * Supports simple and exponential moving averages
 */
export function calculateMovingAverage(
  dataPoints: ProgressDataPoint[],
  options: MovingAverageOptions
): Array<{ date: string; value: number }> {
  const result: Array<{ date: string; value: number }> = [];

  if (dataPoints.length < (options.minDataPoints || 1)) {
    return result;
  }

  for (let i = 0; i < dataPoints.length; i++) {
    // Get window of data points
    const windowStart = Math.max(0, i - options.windowSize + 1);
    const window = dataPoints.slice(windowStart, i + 1);

    if (window.length < (options.minDataPoints || 1)) {
      continue;
    }

    // Calculate average based on weighting type
    let average: number;

    if (options.weightingType === 'exponential') {
      // Exponential decay weighting (more weight to recent data)
      average = calculateExponentialAverage(window);
    } else {
      // Simple moving average
      const paces = window.map(p => p.pace!).filter(p => p !== undefined);
      average = paces.reduce((sum, p) => sum + p, 0) / paces.length;
    }

    result.push({
      date: dataPoints[i].date,
      value: average
    });
  }

  return result;
}

/**
 * Calculate exponential weighted moving average
 *
 * More recent activities have higher weight
 */
function calculateExponentialAverage(window: ProgressDataPoint[]): number {
  const paces = window.map(p => p.pace!).filter(p => p !== undefined);
  const n = paces.length;

  if (n === 0) return 0;

  // Calculate weights using exponential decay
  const alpha = 2 / (n + 1); // Smoothing factor
  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < n; i++) {
    const weight = Math.pow(1 - alpha, n - 1 - i);
    weightedSum += paces[i] * weight;
    weightSum += weight;
  }

  return weightedSum / weightSum;
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
 * Calculate pace improvement percentage
 */
export function calculatePaceImprovement(
  oldPace: number,
  newPace: number
): { absolute: number; percentage: number } {
  const absolute = oldPace - newPace;
  const percentage = (absolute / oldPace) * 100;

  return { absolute, percentage };
}

/**
 * Detect pace anomalies (outliers)
 */
export function detectPaceAnomalies(
  dataPoints: ProgressDataPoint[]
): ProgressDataPoint[] {
  if (dataPoints.length < 4) {
    return [];
  }

  const paces = dataPoints.map(p => p.pace!).filter(p => p !== undefined);
  const sortedPaces = [...paces].sort((a, b) => a - b);

  // Calculate quartiles
  const q1 = sortedPaces[Math.floor(sortedPaces.length * 0.25)];
  const q3 = sortedPaces[Math.floor(sortedPaces.length * 0.75)];
  const iqr = q3 - q1;

  // Define bounds (using 1.5 * IQR)
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Find anomalies
  return dataPoints.filter(point => {
    const pace = point.pace;
    return pace !== undefined && (pace < lowerBound || pace > upperBound);
  });
}

/**
 * Data Aggregation Service
 *
 * Fetches and aggregates activity data from Garmin Connect with
 * efficient pagination, filtering, and caching.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { GarminClient } from '../client/garmin-client.js';
import { ProgressDataPoint, ProgressQuery } from '../types/progress.js';
import { parseDateRange, isDateInRange, getISOWeek } from '../utils/data-transforms.js';
import { GARMIN_API_DELAY_MS } from '../constants/apiConfig.js';

/**
 * Cache entry for activity data
 */
interface CacheEntry {
  data: any[];
  timestamp: number;
}

/**
 * Simple in-memory cache with TTL
 */
class ActivityCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const activityCache = new ActivityCache();

/**
 * Fetch activities within a date range with pagination
 */
export async function fetchActivitiesByDateRange(
  garminClient: GarminClient,
  startDate: Date,
  endDate: Date,
  options: {
    maxActivities?: number;
    sportFilter?: string;
  } = {}
): Promise<any[]> {
  const maxActivities = options.maxActivities || 1000;
  const cacheKey = `${startDate.toISOString()}-${endDate.toISOString()}-${options.sportFilter || 'all'}`;

  // Check cache first
  const cached = activityCache.get(cacheKey);
  if (cached) {
    return cached.slice(0, maxActivities);
  }

  const activities: any[] = [];
  let currentStart = 0;
  const batchSize = 50;
  let hasMore = true;

  while (hasMore && activities.length < maxActivities) {
    const batch = await garminClient.getActivities(currentStart, batchSize);

    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }

    for (const activity of batch) {
      if (activities.length >= maxActivities) {
        hasMore = false;
        break;
      }

      const activityDate = new Date(activity.startTimeLocal);

      if (isDateInRange(activityDate, startDate, endDate)) {
        // Apply sport filter if specified
        if (options.sportFilter) {
          const activityType = activity.activityType?.typeKey?.toLowerCase() || '';
          if (!activityType.includes(options.sportFilter.toLowerCase())) {
            continue;
          }
        }

        activities.push(activity);
      } else if (activityDate < startDate) {
        // Activities are sorted by date descending, so we can stop
        hasMore = false;
        break;
      }
    }

    if (batch.length < batchSize) {
      hasMore = false;
    }

    currentStart += batchSize;

    // Small delay to avoid overwhelming API (GARMIN_API_DELAY_MS)
    await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));
  }

  // Cache the results
  activityCache.set(cacheKey, activities);

  return activities;
}

/**
 * Extract relevant metrics from activity data
 */
export function extractActivityMetrics(activity: any): ProgressDataPoint | null {
  try {
    const activityType = activity.activityType?.typeKey?.toLowerCase() || 'unknown';
    const startTime = new Date(activity.startTimeLocal);

    // Basic metrics
    const dataPoint: ProgressDataPoint = {
      activityId: activity.activityId,
      activityName: activity.activityName || 'Unnamed Activity',
      activityType,
      date: startTime.toISOString().split('T')[0],
      timestamp: startTime.getTime(),
      duration: activity.duration || 0, // Duration in seconds from Garmin API
      distance: activity.distance, // Distance in meters from Garmin API
      averageHR: activity.averageHR,
      maxHR: activity.maxHR,
      elevationGain: activity.elevationGain,
      calories: activity.calories
    };

    // Calculate pace for running/swimming (seconds per km)
    if (dataPoint.distance && dataPoint.duration && dataPoint.distance > 0) {
      const distanceKm = dataPoint.distance / 1000;
      // Calculate pace in seconds per km (duration is in seconds, distance in meters)
      const paceSecondsPerKm = dataPoint.duration / distanceKm;

      if (activityType.includes('run') || activityType.includes('swim')) {
        dataPoint.pace = paceSecondsPerKm;
      }

      // Calculate speed for cycling (km/h)
      const durationHours = dataPoint.duration / 3600;
      dataPoint.speed = distanceKm / durationHours;
    }

    // Power metrics for cycling
    if (activityType.includes('cycling') || activityType.includes('bike')) {
      dataPoint.averagePower = activity.avgPower || activity.averagePower;
      dataPoint.maxPower = activity.maxPower;
      dataPoint.normalizedPower = activity.normPower || activity.normalizedPower;
    }

    return dataPoint;

  } catch {
    return null;
  }
}

/**
 * Fetch and extract metrics for activities in a date range
 */
export async function fetchActivityMetrics(
  garminClient: GarminClient,
  query: ProgressQuery
): Promise<ProgressDataPoint[]> {
  // Parse date range
  const { start, end } = parseDateRange(query.dateRange);

  // Fetch activities
  const activities = await fetchActivitiesByDateRange(
    garminClient,
    start,
    end,
    {
      maxActivities: query.maxActivities,
      sportFilter: query.sport
    }
  );

  // Extract metrics from each activity
  const dataPoints: ProgressDataPoint[] = [];

  for (const activity of activities) {
    // Fetch detailed activity data if needed for power/HR metrics
    try {
      const detailed = await garminClient.getActivity({ activityId: activity.activityId });
      if (!detailed) continue;

      // Merge detailed data with summary
      const mergedActivity = { ...activity, ...detailed };
      const metrics = extractActivityMetrics(mergedActivity);

      if (metrics) {
        // Apply duration filter if specified
        if (query.minDuration && metrics.duration < query.minDuration) {
          continue;
        }

        dataPoints.push(metrics);
      }

      // Small delay between API calls (GARMIN_API_DELAY_MS)
      await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));

    } catch {
      continue;
    }
  }

  // Sort by timestamp ascending
  dataPoints.sort((a, b) => a.timestamp - b.timestamp);

  return dataPoints;
}

/**
 * Group activities by time period (week, month, year)
 */
export function groupByTimePeriod(
  dataPoints: ProgressDataPoint[],
  period: 'week' | 'month' | 'year'
): Map<string, ProgressDataPoint[]> {
  const grouped = new Map<string, ProgressDataPoint[]>();

  for (const point of dataPoints) {
    const date = new Date(point.timestamp);
    let key: string;

    switch (period) {
      case 'week': {
        // ISO week format: YYYY-Wnn
        const weekNum = getISOWeek(date);
        key = `${weekNum.year}-W${String(weekNum.week).padStart(2, '0')}`;
        break;
      }
      case 'month': {
        // Format: YYYY-MM
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      }
      case 'year': {
        // Format: YYYY
        key = String(date.getFullYear());
        break;
      }
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(point);
  }

  return grouped;
}

/**
 * Filter data points by sport type
 */
export function filterBySport(
  dataPoints: ProgressDataPoint[],
  sport: string
): ProgressDataPoint[] {
  const sportLower = sport.toLowerCase();
  return dataPoints.filter(point =>
    point.activityType.toLowerCase().includes(sportLower)
  );
}

/**
 * Calculate aggregate statistics for a set of data points
 */
export function calculateAggregateStats(dataPoints: ProgressDataPoint[]): {
  count: number;
  totalDistance: number;
  totalDuration: number;
  totalElevation: number;
  averagePace?: number;
  averagePower?: number;
  averageHR?: number;
} {
  if (dataPoints.length === 0) {
    return {
      count: 0,
      totalDistance: 0,
      totalDuration: 0,
      totalElevation: 0
    };
  }

  let totalDistance = 0;
  let totalDuration = 0;
  let totalElevation = 0;
  let paceSum = 0;
  let paceCount = 0;
  let powerSum = 0;
  let powerCount = 0;
  let hrSum = 0;
  let hrCount = 0;

  for (const point of dataPoints) {
    totalDistance += point.distance || 0;
    totalDuration += point.duration;
    totalElevation += point.elevationGain || 0;

    if (point.pace) {
      paceSum += point.pace;
      paceCount++;
    }

    if (point.averagePower) {
      powerSum += point.averagePower;
      powerCount++;
    }

    if (point.averageHR) {
      hrSum += point.averageHR;
      hrCount++;
    }
  }

  return {
    count: dataPoints.length,
    totalDistance: totalDistance / 1000, // Convert to km
    totalDuration,
    totalElevation,
    averagePace: paceCount > 0 ? paceSum / paceCount : undefined,
    averagePower: powerCount > 0 ? powerSum / powerCount : undefined,
    averageHR: hrCount > 0 ? hrSum / hrCount : undefined
  };
}

/**
 * Clear the activity cache
 */
export function clearCache(): void {
  activityCache.clear();
}

import {
  HRZoneConfig,
  HRZoneTime,
  CustomHRZoneConfig,
  HRDataPoint
} from '../types/hr-zones.js';

/**
 * Type alias for activities that contain heart rate data
 * This uses a minimal structural type to be compatible with both:
 * - GarminActivity/GarminActivityDetail interfaces from our types
 * - IActivity from garmin-connect library
 */
type ActivityWithHR = {
  averageHR?: number;
  maxHR?: number;
  avgHR?: number;
  duration?: number;
  activityDetailMetrics?: Array<{
    heartRate?: number;
    directTimestamp?: number;
    elapsedTime?: number;
  }>;
};

/**
 * Default max heart rate if not provided (age-based formula: 220 - age)
 * Using a reasonable default of 185 (approximately age 35)
 */
const DEFAULT_MAX_HR = 185;

/**
 * Standard colors for HR zones
 */
const ZONE_COLORS = [
  '#3B82F6', // Zone 1 - Blue
  '#10B981', // Zone 2 - Green
  '#F59E0B', // Zone 3 - Yellow
  '#F97316', // Zone 4 - Orange
  '#EF4444'  // Zone 5 - Red
];

/**
 * Create HR zone configuration with standard 5-zone model
 */
export function createHRZoneConfig(
  maxHR: number = DEFAULT_MAX_HR,
  customZones?: CustomHRZoneConfig['zones']
): HRZoneConfig {
  // Use custom zones if provided, otherwise use standard percentages
  const zone1 = customZones?.zone1 || { min: 50, max: 60 };
  const zone2 = customZones?.zone2 || { min: 60, max: 70 };
  const zone3 = customZones?.zone3 || { min: 70, max: 80 };
  const zone4 = customZones?.zone4 || { min: 80, max: 90 };
  const zone5 = customZones?.zone5 || { min: 90, max: 100 };

  return {
    zone1: {
      min: Math.round(maxHR * (zone1.min / 100)),
      max: Math.round(maxHR * (zone1.max / 100)),
      label: 'Recovery'
    },
    zone2: {
      min: Math.round(maxHR * (zone2.min / 100)),
      max: Math.round(maxHR * (zone2.max / 100)),
      label: 'Endurance'
    },
    zone3: {
      min: Math.round(maxHR * (zone3.min / 100)),
      max: Math.round(maxHR * (zone3.max / 100)),
      label: 'Tempo'
    },
    zone4: {
      min: Math.round(maxHR * (zone4.min / 100)),
      max: Math.round(maxHR * (zone4.max / 100)),
      label: 'Threshold'
    },
    zone5: {
      min: Math.round(maxHR * (zone5.min / 100)),
      max: Math.round(maxHR * (zone5.max / 100)),
      label: 'Anaerobic'
    },
    maxHR
  };
}

/**
 * Determine which zone a heart rate value belongs to
 */
export function determineHRZone(heartRate: number, config: HRZoneConfig): number {
  if (heartRate <= 0 || !heartRate) return 0; // Invalid or no data

  if (heartRate >= config.zone5.min) return 5;
  if (heartRate >= config.zone4.min) return 4;
  if (heartRate >= config.zone3.min) return 3;
  if (heartRate >= config.zone2.min) return 2;
  if (heartRate >= config.zone1.min) return 1;

  return 0; // Below zone 1
}

/**
 * Calculate zone distribution from HR data points
 * Assumes data points are evenly spaced in time
 */
export function calculateZoneDistribution(
  hrData: HRDataPoint[],
  totalDurationSeconds: number,
  config: HRZoneConfig
): HRZoneTime[] {
  if (!hrData || hrData.length === 0) {
    return createEmptyZoneDistribution(config);
  }

  // Count samples in each zone
  const zoneCounts: Record<number, number> = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  };

  for (const point of hrData) {
    const zone = determineHRZone(point.heartRate, config);
    zoneCounts[zone]++;
  }

  // Calculate time per zone based on sample distribution
  const totalSamples = hrData.length;
  const secondsPerSample = totalDurationSeconds / totalSamples;

  const zoneDistribution: HRZoneTime[] = [];

  for (let zone = 1; zone <= 5; zone++) {
    const zoneConfig = getZoneConfig(zone, config);
    const timeSeconds = Math.round(zoneCounts[zone] * secondsPerSample);
    const timeMinutes = Math.round(timeSeconds / 60);
    const percentage = totalDurationSeconds > 0
      ? Math.round((timeSeconds / totalDurationSeconds) * 100 * 10) / 10
      : 0;

    zoneDistribution.push({
      zone,
      label: zoneConfig.label,
      timeSeconds,
      timeMinutes,
      percentage,
      range: `${zoneConfig.min}-${zoneConfig.max} bpm`
    });
  }

  return zoneDistribution;
}

/**
 * Create empty zone distribution (no HR data)
 */
export function createEmptyZoneDistribution(config: HRZoneConfig): HRZoneTime[] {
  const zoneDistribution: HRZoneTime[] = [];

  for (let zone = 1; zone <= 5; zone++) {
    const zoneConfig = getZoneConfig(zone, config);
    zoneDistribution.push({
      zone,
      label: zoneConfig.label,
      timeSeconds: 0,
      timeMinutes: 0,
      percentage: 0,
      range: `${zoneConfig.min}-${zoneConfig.max} bpm`
    });
  }

  return zoneDistribution;
}

/**
 * Merge multiple zone distributions (for aggregation)
 */
export function mergeZoneDistributions(
  distributions: HRZoneTime[][],
  config: HRZoneConfig
): HRZoneTime[] {
  if (distributions.length === 0) {
    return createEmptyZoneDistribution(config);
  }

  // Sum up time in each zone
  const totalSeconds: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let grandTotalSeconds = 0;

  for (const distribution of distributions) {
    for (const zoneTime of distribution) {
      totalSeconds[zoneTime.zone] += zoneTime.timeSeconds;
      grandTotalSeconds += zoneTime.timeSeconds;
    }
  }

  // Create merged distribution
  const mergedDistribution: HRZoneTime[] = [];

  for (let zone = 1; zone <= 5; zone++) {
    const zoneConfig = getZoneConfig(zone, config);
    const timeSeconds = totalSeconds[zone];
    const timeMinutes = Math.round(timeSeconds / 60);
    const percentage = grandTotalSeconds > 0
      ? Math.round((timeSeconds / grandTotalSeconds) * 100 * 10) / 10
      : 0;

    mergedDistribution.push({
      zone,
      label: zoneConfig.label,
      timeSeconds,
      timeMinutes,
      percentage,
      range: `${zoneConfig.min}-${zoneConfig.max} bpm`
    });
  }

  return mergedDistribution;
}

/**
 * Find dominant zone (zone with most time)
 */
export function findDominantZone(distribution: HRZoneTime[]): number {
  if (!distribution || distribution.length === 0) return 0;

  let maxTime = 0;
  let dominantZone = 0;

  for (const zoneTime of distribution) {
    if (zoneTime.timeSeconds > maxTime) {
      maxTime = zoneTime.timeSeconds;
      dominantZone = zoneTime.zone;
    }
  }

  return dominantZone;
}

/**
 * Create visualization data from zone distribution
 */
export function createVisualizationData(distribution: HRZoneTime[]): {
  labels: string[];
  values: number[];
  colors: string[];
} {
  const labels: string[] = [];
  const values: number[] = [];
  const colors: string[] = [];

  for (const zoneTime of distribution) {
    labels.push(`Zone ${zoneTime.zone}: ${zoneTime.label}`);
    values.push(zoneTime.percentage);
    colors.push(ZONE_COLORS[zoneTime.zone - 1]);
  }

  return { labels, values, colors };
}

/**
 * Helper to get zone configuration
 */
function getZoneConfig(zone: number, config: HRZoneConfig): { min: number; max: number; label: string } {
  switch (zone) {
    case 1: return config.zone1;
    case 2: return config.zone2;
    case 3: return config.zone3;
    case 4: return config.zone4;
    case 5: return config.zone5;
    default: throw new Error(`Invalid zone: ${zone}`);
  }
}

/**
 * Parse HR data from Garmin activity details
 * Handles both time-series HR values and summary stats
 * @param activity - Garmin activity object (basic or detailed)
 * @returns Object containing HR data points and summary statistics
 */
export function parseActivityHRData(activity: ActivityWithHR): {
  hrData: HRDataPoint[];
  averageHR?: number;
  maxHR?: number;
} {
  const hrData: HRDataPoint[] = [];
  let averageHR: number | undefined;
  let maxHR: number | undefined;

  // Check for summary HR stats
  if (activity.averageHR) {
    averageHR = activity.averageHR;
  }
  if (activity.maxHR) {
    maxHR = activity.maxHR;
  }

  // Check for time-series HR data
  if (activity.activityDetailMetrics) {
    const metrics = activity.activityDetailMetrics;

    // HR values are typically in heartRate array
    if (Array.isArray(metrics) && metrics.length > 0) {
      for (const metric of metrics) {
        if (metric.heartRate && metric.heartRate > 0) {
          hrData.push({
            timestamp: metric.directTimestamp || metric.elapsedTime,
            heartRate: metric.heartRate
          });
        }
      }
    }
  }

  // Fallback: if we have average and max but no time series,
  // create synthetic data points for rough estimation
  if (hrData.length === 0 && averageHR && averageHR > 0) {
    // Create synthetic data points based on activity duration
    // This is a fallback for activities without detailed HR data
    const duration = activity.duration || 0;
    if (duration > 0) {
      // Create data points every 5 seconds
      const numPoints = Math.min(Math.floor(duration / 5), 500); // Cap at 500 points
      for (let i = 0; i < numPoints; i++) {
        // Add some variation around average HR (±10 bpm)
        const variation = Math.floor(Math.random() * 20) - 10;
        hrData.push({
          timestamp: i * 5,
          heartRate: Math.max(averageHR + variation, 40)
        });
      }
    }
  }

  return { hrData, averageHR, maxHR };
}

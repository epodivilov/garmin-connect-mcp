/**
 * Efficiency Analysis Service
 *
 * Analyzes training efficiency by comparing performance metrics (pace/power)
 * across different heart rate zones to identify optimal training intensities.
 */

import { GarminClient } from '../client/garmin-client.js';
import {
  ProgressDataPoint,
  ProgressQuery,
  EfficiencyMetrics,
  EfficiencyResult
} from '../types/progress.js';
import { fetchActivityMetrics } from './data-aggregator.js';
import { createHRZoneConfig } from '../utils/hr-zone-calculator.js';
import { HRZoneConfig } from '../types/hr-zones.js';

/**
 * Zone-based activity data
 */
interface ZoneActivity {
  activityId: number;
  zone: number;
  averageHR: number;
  pace?: number;
  power?: number;
  speed?: number;
}

/**
 * Calculate efficiency metrics by HR zone
 */
export async function calculateEfficiencyByZone(
  garminClient: GarminClient,
  query: ProgressQuery
): Promise<EfficiencyResult> {
  // Fetch activity data
  const dataPoints = await fetchActivityMetrics(garminClient, query);

  // Filter activities with HR data
  const activitiesWithHR = dataPoints.filter(p => p.averageHR !== undefined);

  if (activitiesWithHR.length === 0) {
    throw new Error('No activities with heart rate data found');
  }

  // Determine max HR for zone calculation
  const maxHR = query.customMaxHR || estimateMaxHR(activitiesWithHR);

  // Create HR zone configuration
  const zoneConfig = createHRZoneConfig(maxHR);

  // Categorize activities by HR zone
  const zoneActivities = categorizeByZone(activitiesWithHR, zoneConfig);

  // Calculate efficiency for each zone
  const efficiencyByZone = calculateZoneEfficiency(zoneActivities, zoneConfig);

  // Determine sport type
  const sportType = determineSportType(dataPoints);

  // Calculate summary
  const summary = calculateEfficiencySummary(efficiencyByZone);

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
    activityCount: activitiesWithHR.length,
    efficiencyByZone,
    summary
  };
}

/**
 * Calculate pace by HR zone
 */
export function calculatePaceByHRZone(
  dataPoints: ProgressDataPoint[],
  zoneConfig: HRZoneConfig
): Map<number, { averagePace: number; activityCount: number }> {
  const zoneData = new Map<number, { paceSum: number; count: number }>();

  for (const point of dataPoints) {
    if (!point.averageHR || !point.pace) continue;

    const zone = determineZone(point.averageHR, zoneConfig);
    if (zone === 0) continue;

    const data = zoneData.get(zone) || { paceSum: 0, count: 0 };
    data.paceSum += point.pace;
    data.count++;
    zoneData.set(zone, data);
  }

  const result = new Map<number, { averagePace: number; activityCount: number }>();
  for (const [zone, data] of zoneData.entries()) {
    result.set(zone, {
      averagePace: data.paceSum / data.count,
      activityCount: data.count
    });
  }

  return result;
}

/**
 * Calculate power by HR zone
 */
export function calculatePowerByHRZone(
  dataPoints: ProgressDataPoint[],
  zoneConfig: HRZoneConfig
): Map<number, { averagePower: number; activityCount: number }> {
  const zoneData = new Map<number, { powerSum: number; count: number }>();

  for (const point of dataPoints) {
    if (!point.averageHR || !point.averagePower) continue;

    const zone = determineZone(point.averageHR, zoneConfig);
    if (zone === 0) continue;

    const data = zoneData.get(zone) || { powerSum: 0, count: 0 };
    data.powerSum += point.averagePower;
    data.count++;
    zoneData.set(zone, data);
  }

  const result = new Map<number, { averagePower: number; activityCount: number }>();
  for (const [zone, data] of zoneData.entries()) {
    result.set(zone, {
      averagePower: data.powerSum / data.count,
      activityCount: data.count
    });
  }

  return result;
}

/**
 * Compute efficiency ratio (performance per heart beat)
 *
 * For pace: lower HR for same pace = more efficient
 * For power: higher power for same HR = more efficient
 */
export function computeEfficiencyRatio(
  metric: number,
  avgHR: number,
  metricType: 'pace' | 'power' | 'speed'
): number {
  if (avgHR === 0) return 0;

  switch (metricType) {
    case 'pace':
      // Lower pace/HR is better (faster pace, lower HR)
      return avgHR / metric;
    case 'power':
      // Higher power/HR is better
      return metric / avgHR;
    case 'speed':
      // Higher speed/HR is better
      return metric / avgHR;
    default:
      return 0;
  }
}

/**
 * Track efficiency trends over time
 */
export function trackEfficiencyTrends(
  dataPoints: ProgressDataPoint[],
  zoneConfig: HRZoneConfig
): Map<number, Array<{ date: string; efficiency: number }>> {
  const zoneTrends = new Map<number, Array<{ date: string; efficiency: number }>>();

  for (const point of dataPoints) {
    if (!point.averageHR) continue;

    const zone = determineZone(point.averageHR, zoneConfig);
    if (zone === 0) continue;

    let efficiency = 0;
    if (point.pace) {
      efficiency = computeEfficiencyRatio(point.pace, point.averageHR, 'pace');
    } else if (point.averagePower) {
      efficiency = computeEfficiencyRatio(point.averagePower, point.averageHR, 'power');
    } else if (point.speed) {
      efficiency = computeEfficiencyRatio(point.speed, point.averageHR, 'speed');
    }

    if (efficiency === 0) continue;

    if (!zoneTrends.has(zone)) {
      zoneTrends.set(zone, []);
    }

    zoneTrends.get(zone)!.push({
      date: point.date,
      efficiency
    });
  }

  return zoneTrends;
}

/**
 * Categorize activities by HR zone
 */
function categorizeByZone(
  dataPoints: ProgressDataPoint[],
  zoneConfig: HRZoneConfig
): ZoneActivity[] {
  const zoneActivities: ZoneActivity[] = [];

  for (const point of dataPoints) {
    if (!point.averageHR) continue;

    const zone = determineZone(point.averageHR, zoneConfig);
    if (zone === 0) continue;

    zoneActivities.push({
      activityId: point.activityId,
      zone,
      averageHR: point.averageHR,
      pace: point.pace,
      power: point.averagePower,
      speed: point.speed
    });
  }

  return zoneActivities;
}

/**
 * Calculate efficiency metrics for each zone
 */
function calculateZoneEfficiency(
  zoneActivities: ZoneActivity[],
  zoneConfig: HRZoneConfig
): EfficiencyMetrics[] {
  const zones = [1, 2, 3, 4, 5];
  const efficiencyMetrics: EfficiencyMetrics[] = [];

  for (const zone of zones) {
    const zoneData = zoneActivities.filter(a => a.zone === zone);

    if (zoneData.length === 0) continue;

    // Calculate average metrics for zone
    const paces = zoneData.map(a => a.pace).filter((p): p is number => p !== undefined);
    const powers = zoneData.map(a => a.power).filter((p): p is number => p !== undefined);
    const speeds = zoneData.map(a => a.speed).filter((s): s is number => s !== undefined);
    const hrs = zoneData.map(a => a.averageHR);

    const avgHR = hrs.reduce((sum, hr) => sum + hr, 0) / hrs.length;

    const avgPace = paces.length > 0
      ? paces.reduce((sum, p) => sum + p, 0) / paces.length
      : undefined;

    const avgPower = powers.length > 0
      ? powers.reduce((sum, p) => sum + p, 0) / powers.length
      : undefined;

    const avgSpeed = speeds.length > 0
      ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
      : undefined;

    // Calculate efficiency ratio
    let efficiencyRatio = 0;
    if (avgPace) {
      efficiencyRatio = computeEfficiencyRatio(avgPace, avgHR, 'pace');
    } else if (avgPower) {
      efficiencyRatio = computeEfficiencyRatio(avgPower, avgHR, 'power');
    } else if (avgSpeed) {
      efficiencyRatio = computeEfficiencyRatio(avgSpeed, avgHR, 'speed');
    }

    // Get zone info
    const zoneInfo = getZoneInfo(zone, zoneConfig);

    efficiencyMetrics.push({
      zone,
      zoneName: zoneInfo.label,
      zoneRange: `${zoneInfo.min}-${zoneInfo.max} bpm`,
      activityCount: zoneData.length,
      averagePace: avgPace,
      averagePower: avgPower,
      averageSpeed: avgSpeed,
      efficiencyRatio,
      improvement: {
        absolute: 0, // Would need historical comparison
        percentage: 0
      }
    });
  }

  return efficiencyMetrics;
}

/**
 * Calculate efficiency summary
 */
function calculateEfficiencySummary(
  efficiencyByZone: EfficiencyMetrics[]
): {
  overallEfficiency: number;
  mostEfficientZone: number;
  improvementRate: number;
  recommendation: string;
} {
  if (efficiencyByZone.length === 0) {
    return {
      overallEfficiency: 0,
      mostEfficientZone: 0,
      improvementRate: 0,
      recommendation: 'Insufficient data for efficiency analysis'
    };
  }

  // Calculate overall efficiency (weighted average)
  const totalActivities = efficiencyByZone.reduce((sum, z) => sum + z.activityCount, 0);
  const weightedEfficiency = efficiencyByZone.reduce(
    (sum, z) => sum + (z.efficiencyRatio * z.activityCount),
    0
  ) / totalActivities;

  // Find most efficient zone
  const mostEfficient = efficiencyByZone.reduce((max, z) =>
    z.efficiencyRatio > max.efficiencyRatio ? z : max
  );

  // Generate recommendation
  const recommendation = generateEfficiencyRecommendation(mostEfficient.zone, efficiencyByZone);

  return {
    overallEfficiency: weightedEfficiency,
    mostEfficientZone: mostEfficient.zone,
    improvementRate: 0, // Would need historical comparison
    recommendation
  };
}

/**
 * Generate efficiency recommendation based on zone analysis
 */
function generateEfficiencyRecommendation(
  mostEfficientZone: number,
  allZones: EfficiencyMetrics[]
): string {
  const zoneLabels = ['', 'Recovery', 'Endurance', 'Tempo', 'Threshold', 'Anaerobic'];
  const zoneName = zoneLabels[mostEfficientZone] || 'Unknown';

  // Check if training is too concentrated in one zone
  const totalActivities = allZones.reduce((sum, z) => sum + z.activityCount, 0);
  const mostEfficientCount = allZones.find(z => z.zone === mostEfficientZone)?.activityCount || 0;
  const concentration = mostEfficientCount / totalActivities;

  if (concentration > 0.7) {
    return `You're most efficient in ${zoneName} zone, but consider varying intensity. Try incorporating more Zone 2 (easy) and Zone 4 (threshold) training.`;
  }

  if (mostEfficientZone <= 2) {
    return `Strong aerobic efficiency in ${zoneName} zone. Consider adding higher intensity work (Zone 3-4) to build speed while maintaining this base.`;
  }

  if (mostEfficientZone >= 4) {
    return `Good efficiency at higher intensities (${zoneName}). Ensure adequate recovery with more Zone 2 work to support sustained performance.`;
  }

  return `Balanced efficiency across zones with peak in ${zoneName}. Continue current training distribution.`;
}

/**
 * Determine which HR zone a heart rate falls into
 */
function determineZone(hr: number, zoneConfig: HRZoneConfig): number {
  if (hr >= zoneConfig.zone5.min) return 5;
  if (hr >= zoneConfig.zone4.min) return 4;
  if (hr >= zoneConfig.zone3.min) return 3;
  if (hr >= zoneConfig.zone2.min) return 2;
  if (hr >= zoneConfig.zone1.min) return 1;
  return 0; // Below zone 1
}

/**
 * Get zone info from config
 */
function getZoneInfo(
  zone: number,
  zoneConfig: HRZoneConfig
): { min: number; max: number; label: string } {
  switch (zone) {
    case 1: return zoneConfig.zone1;
    case 2: return zoneConfig.zone2;
    case 3: return zoneConfig.zone3;
    case 4: return zoneConfig.zone4;
    case 5: return zoneConfig.zone5;
    default: return { min: 0, max: 0, label: 'Unknown' };
  }
}

/**
 * Estimate max HR from activity data
 */
function estimateMaxHR(dataPoints: ProgressDataPoint[]): number {
  const maxHRs = dataPoints
    .map(p => p.maxHR)
    .filter((hr): hr is number => hr !== undefined);

  if (maxHRs.length === 0) {
    return 185; // Default fallback
  }

  // Take 95th percentile to avoid outliers
  const sorted = maxHRs.sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index];
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

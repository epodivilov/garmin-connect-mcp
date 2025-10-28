/**
 * PR Detector Service
 *
 * Intelligently detects personal records from activity data with quality scoring,
 * distance matching, and segment extraction from splits.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { GarminClient } from '../client/garmin-client.js';
import {
  PersonalRecord,
  PRDetectionOptions,
  PRDetectionResult,
  ActivityQuality,
  PRCategory,
  SegmentData,
  PRMetricType,
  PRNotification
} from '../types/personalRecords.js';
import { PRCategoryService } from './prCategoryService.js';
import {
  classifyActivity
} from '../utils/activityClassifier.js';

/**
 * Activity data for PR detection
 */
interface ActivityData {
  activityId: number;
  activityName: string;
  activityType: string;
  startTimeGMT: string;
  distance?: number;         // meters
  duration: number;          // seconds
  movingDuration?: number;   // seconds
  averageSpeed?: number;     // m/s
  maxSpeed?: number;
  averageHR?: number;
  maxHR?: number;
  averagePower?: number;
  averageCadence?: number;
  elevationGain?: number;
  calories?: number;
  locationName?: string;
  deviceName?: string;
  splits?: any[];
}

export class PRDetector {
  constructor(
    private garminClient: GarminClient,
    private categoryService: PRCategoryService
  ) {}

  /**
   * Detect personal records from recent activities
   */
  async detectPRs(
    options: PRDetectionOptions = {}
  ): Promise<PRDetectionResult> {
    const {
      maxActivities = 1000,
      minQuality = 70,
      dateRange,
      sports,
      categories
    } = options;

    // Fetch activities with pagination
    const activities = await this.fetchActivities(maxActivities, dateRange);

    // Filter by sport if specified
    const filteredActivities = sports
      ? activities.filter(a => {
          const classification = classifyActivity(a.activityType);
          return sports.includes(classification.sport);
        })
      : activities;

    // Group activities by sport
    const activityBySport = this.groupActivitiesBySport(filteredActivities);

    // Detect PRs for each sport
    const allPRs: PersonalRecord[] = [];
    const notifications: PRNotification[] = [];

    for (const [sportKey, sportActivities] of activityBySport.entries()) {
      // Get relevant categories for this sport
      const sportType = sportKey as any;
      let relevantCategories = this.categoryService.getCategoriesBySport(sportType);

      // Filter by specific categories if provided
      if (categories && categories.length > 0) {
        relevantCategories = relevantCategories.filter(cat =>
          categories.includes(cat.id)
        );
      }

      // Detect PRs for each category
      for (const category of relevantCategories) {
        const pr = await this.detectCategoryPR(
          sportActivities,
          category,
          minQuality
        );

        if (pr) {
          allPRs.push(pr);
        }
      }
    }

    // Build result
    const prsByCategory: Record<string, PersonalRecord> = {};
    for (const pr of allPRs) {
      prsByCategory[pr.category.id] = pr;
    }

    const summary = this.buildSummary(allPRs, activities);

    return {
      scannedActivities: activities.length,
      newPRsFound: allPRs.length,
      updatedPRs: 0, // Will be set by history service
      prsByCategory,
      notifications,
      summary
    };
  }

  /**
   * Detect PR for a specific category
   */
  private async detectCategoryPR(
    activities: ActivityData[],
    category: PRCategory,
    minQuality: number
  ): Promise<PersonalRecord | null> {
    const candidates: Array<{
      activity: ActivityData;
      quality: ActivityQuality;
      metricValue: number;
      segmentData?: SegmentData;
    }> = [];

    for (const activity of activities) {
      // Check if activity matches category
      const distance = activity.distance || 0;
      const duration = activity.movingDuration || activity.duration;

      if (!this.categoryService.matchesCategory(distance, duration, category)) {
        continue;
      }

      // Calculate quality score
      const quality = this.calculateQuality(activity);

      if (quality.score < minQuality) {
        continue;
      }

      // Calculate metric value
      const metricValue = this.calculateMetricValue(activity, category);

      if (metricValue === 0) {
        continue;
      }

      candidates.push({
        activity,
        quality,
        metricValue,
        segmentData: undefined // TODO: Extract from splits if enabled
      });
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by metric value (best first)
    const metricType = this.getMetricType(category);
    const isBetterLower = metricType === 'time' || metricType === 'pace';

    candidates.sort((a, b) =>
      isBetterLower
        ? a.metricValue - b.metricValue
        : b.metricValue - a.metricValue
    );

    // Best candidate is the PR
    const best = candidates[0];

    // Determine sport from activity
    const classification = classifyActivity(best.activity.activityType);

    return this.createPRRecord(
      best.activity,
      category,
      classification.sport,
      best.metricValue,
      metricType,
      best.quality,
      best.segmentData
    );
  }

  /**
   * Calculate activity quality score
   */
  private calculateQuality(activity: ActivityData): ActivityQuality {
    let score = 100;
    const reasons: string[] = [];

    // Classify activity
    const classification = classifyActivity(activity.activityType, {
      hasGPS: !!activity.locationName,
      locationName: activity.locationName,
      deviceName: activity.deviceName,
      distance: activity.distance,
      duration: activity.duration
    });

    const hasGPS = !!activity.locationName;
    const hasSensorData =
      (activity.averageHR !== undefined && activity.averageHR > 0) ||
      (activity.averagePower !== undefined && activity.averagePower > 0) ||
      (activity.averageCadence !== undefined && activity.averageCadence > 0);

    // Penalize missing GPS for outdoor activities
    if (!classification.isIndoor && !hasGPS) {
      score -= 15;
      reasons.push('No GPS data for outdoor activity');
    }

    // Penalize missing sensor data
    if (!hasSensorData) {
      score -= 10;
      reasons.push('No heart rate or power data');
    }

    // Check for speed anomalies
    const speedAnomalies = this.detectSpeedAnomalies(activity);
    if (speedAnomalies) {
      score -= 20;
      reasons.push('Unusual speed variations detected');
    }

    // Indoor activities get slight penalty for distance PRs
    if (classification.isIndoor && !classification.isVirtual) {
      score -= 5;
      reasons.push('Indoor activity (may have less accurate distance)');
    }

    // Virtual activities get penalty
    if (classification.isVirtual) {
      score -= 10;
      reasons.push('Virtual activity');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      hasGPS,
      hasSensorData,
      speedAnomalies,
      isIndoor: classification.isIndoor,
      isVirtual: classification.isVirtual,
      completionStatus: 'complete', // Assume complete if in activities list
      reasons: reasons.length > 0 ? reasons : undefined
    };
  }

  /**
   * Detect speed anomalies
   */
  private detectSpeedAnomalies(activity: ActivityData): boolean {
    if (!activity.averageSpeed || !activity.maxSpeed) {
      return false;
    }

    // If max speed is more than 3x average, flag as anomaly
    const ratio = activity.maxSpeed / activity.averageSpeed;
    return ratio > 3;
  }

  /**
   * Calculate metric value for PR
   */
  private calculateMetricValue(
    activity: ActivityData,
    category: PRCategory
  ): number {
    if (category.type === 'distance') {
      // For distance PRs, metric is time
      return activity.movingDuration || activity.duration;
    } else if (category.type === 'duration') {
      // For duration PRs, metric is distance
      return activity.distance || 0;
    }

    return 0;
  }

  /**
   * Get metric type for category
   */
  private getMetricType(category: PRCategory): PRMetricType {
    if (category.type === 'distance') {
      return 'time'; // Time for distance
    } else if (category.type === 'duration') {
      return 'distance'; // Distance for duration
    }

    return 'time';
  }

  /**
   * Create PR record
   */
  private createPRRecord(
    activity: ActivityData,
    category: PRCategory,
    sport: string,
    metricValue: number,
    metricType: PRMetricType,
    quality: ActivityQuality,
    segmentData?: SegmentData
  ): PersonalRecord {
    return {
      id: `pr_${category.id}_${activity.activityId}`,
      sport: sport as any,
      category,
      activityId: activity.activityId,
      activityName: activity.activityName,
      timestamp: activity.startTimeGMT,
      metricValue,
      metricType,
      actualDistance: activity.distance,
      actualDuration: activity.duration,
      quality,
      segmentData,
      metadata: {
        averageHR: activity.averageHR,
        maxHR: activity.maxHR,
        averagePower: activity.averagePower,
        averageCadence: activity.averageCadence,
        elevationGain: activity.elevationGain
      }
    };
  }

  /**
   * Fetch activities with pagination
   */
  private async fetchActivities(
    maxActivities: number,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<ActivityData[]> {
    const activities: ActivityData[] = [];
    const batchSize = 50; // Garmin API limit per request
    let start = 0;

    while (activities.length < maxActivities) {
      const limit = Math.min(batchSize, maxActivities - activities.length);

      try {
        const batch = await this.garminClient.getActivities(start, limit);

        if (!batch || batch.length === 0) {
          break; // No more activities
        }

        // Convert Garmin activities to our ActivityData format
        const converted: ActivityData[] = batch.map((a: any) => ({
          activityId: a.activityId,
          activityName: a.activityName,
          activityType: a.activityType?.typeKey || 'other',
          startTimeGMT: a.startTimeGMT,
          distance: a.distance,
          duration: a.duration,
          movingDuration: a.movingDuration,
          averageSpeed: a.averageSpeed,
          maxSpeed: a.maxSpeed,
          averageHR: a.averageHR,
          maxHR: a.maxHR,
          averagePower: a.avgPower,
          averageCadence: a.averageCadence,
          elevationGain: a.elevationGain,
          calories: a.calories,
          locationName: a.locationName,
          deviceName: a.deviceName,
          splits: a.splits
        }));

        // Filter by date range if provided
        const filtered = dateRange
          ? converted.filter(a => {
              const activityDate = a.startTimeGMT?.split('T')[0];
              return (
                activityDate &&
                activityDate >= dateRange.startDate &&
                activityDate <= dateRange.endDate
              );
            })
          : converted;

        activities.push(...filtered);

        // If we got less than requested, we've reached the end
        if (batch.length < limit) {
          break;
        }

        start += batchSize;
      } catch {
        break;
      }
    }

    return activities;
  }

  /**
   * Group activities by sport
   */
  private groupActivitiesBySport(
    activities: ActivityData[]
  ): Map<string, ActivityData[]> {
    const groups = new Map<string, ActivityData[]>();

    for (const activity of activities) {
      const classification = classifyActivity(activity.activityType);
      const sport = classification.sport;

      if (!groups.has(sport)) {
        groups.set(sport, []);
      }

      groups.get(sport)!.push(activity);
    }

    return groups;
  }

  /**
   * Build summary
   */
  private buildSummary(
    prs: PersonalRecord[],
    _activities: ActivityData[]
  ): PRDetectionResult['summary'] {
    const sports = new Set(prs.map(pr => pr.sport));
    const categories = prs.map(pr => pr.category.id);
    const qualityScores = prs.map(pr => pr.quality.score);
    const timestamps = prs.map(pr => new Date(pr.timestamp).getTime());

    return {
      sports: Array.from(sports),
      categories,
      qualityAverage:
        qualityScores.length > 0
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          : 0,
      dateRange: {
        earliest:
          timestamps.length > 0
            ? new Date(Math.min(...timestamps)).toISOString()
            : new Date().toISOString(),
        latest:
          timestamps.length > 0
            ? new Date(Math.max(...timestamps)).toISOString()
            : new Date().toISOString()
      }
    };
  }
}

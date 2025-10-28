import { GarminClient } from '../client/garmin-client.js';
import { ProcessedActivity } from '../types/garmin-types.js';
import { isDateInRange } from './data-transforms.js';
import { GARMIN_API_DELAY_MS } from '../constants/apiConfig.js';
import { logger } from './logger.js';

/**
 * Options for fetching activities
 */
export interface ActivityFetchOptions {
  /** Maximum number of activities to fetch (default: 1000) */
  maxActivities?: number;
  /** Filter by specific activity types (e.g., ['running', 'cycling']) */
  activityTypes?: string[];
}

/**
 * Utility class for fetching activities from Garmin Connect with efficient pagination
 * and filtering capabilities.
 *
 * Handles:
 * - Efficient pagination in batches of 50 activities
 * - Date range filtering
 * - Activity type filtering
 * - API rate limiting (GARMIN_API_DELAY_MS between batches)
 * - Error handling
 *
 * @example
 * ```typescript
 * const fetcher = new ActivityFetcher(garminClient);
 * const activities = await fetcher.getActivitiesInRange(
 *   new Date('2025-01-01'),
 *   new Date('2025-01-31'),
 *   { maxActivities: 100, activityTypes: ['running'] }
 * );
 * ```
 */
export class ActivityFetcher {
  private static readonly BATCH_SIZE = 50;

  constructor(private garminClient: GarminClient) {}

  /**
   * Fetches activities within a specified date range with efficient pagination.
   *
   * The method:
   * 1. Fetches activities in batches of 50
   * 2. Filters by date range (inclusive)
   * 3. Filters by activity types if specified
   * 4. Stops when maxActivities limit is reached or activities fall outside date range
   * 5. Includes GARMIN_API_DELAY_MS delay between batches to avoid overwhelming the API
   *
   * @param start - Start date (inclusive)
   * @param end - End date (inclusive)
   * @param options - Fetch options (maxActivities, activityTypes)
   * @returns Promise resolving to array of processed activities
   *
   * @throws Error if fetching fails
   */
  async getActivitiesInRange(
    start: Date,
    end: Date,
    options: ActivityFetchOptions = {}
  ): Promise<ProcessedActivity[]> {
    const maxActivities = options.maxActivities || 1000;
    const activities: ProcessedActivity[] = [];
    let currentStart = 0;
    let hasMore = true;

    while (hasMore && activities.length < maxActivities) {
      try {
        const batch = await this.garminClient.getActivities(
          currentStart,
          ActivityFetcher.BATCH_SIZE
        );

        // No more activities available
        if (!batch || batch.length === 0) {
          hasMore = false;
          break;
        }

        // Process and filter activities in the batch
        for (const activity of batch) {
          // Stop if we've reached the limit
          if (activities.length >= maxActivities) {
            hasMore = false;
            break;
          }

          const activityDate = new Date(activity.startTimeLocal);

          // Check if activity is in our date range
          if (isDateInRange(activityDate, start, end)) {
            // Filter by activity type if specified
            if (
              options.activityTypes &&
              !options.activityTypes.includes(activity.activityType?.typeKey)
            ) {
              continue;
            }

            // Add processed activity
            const processedActivity: ProcessedActivity = {
              activityId: activity.activityId,
              activityName: activity.activityName || 'Unnamed Activity',
              activityType: activity.activityType?.typeKey || 'unknown',
              startTimeLocal: activity.startTimeLocal,
              duration: activity.duration || 0,
              distance: activity.distance || 0,
              calories: activity.calories || 0,
              elevationGain: activity.elevationGain || 0,
            };

            activities.push(processedActivity);
          } else if (activityDate < start) {
            // If we've gone beyond our date range (activities are sorted newest first),
            // stop fetching
            hasMore = false;
            break;
          }
        }

        // If we got less than the batch size, we've reached the end
        if (batch.length < ActivityFetcher.BATCH_SIZE) {
          hasMore = false;
        }

        currentStart += ActivityFetcher.BATCH_SIZE;

        // Add a small delay to avoid overwhelming the API
        if (hasMore) {
          await new Promise((resolve) =>
            setTimeout(resolve, GARMIN_API_DELAY_MS)
          );
        }
      } catch (error) {
        logger.error('Error fetching activity batch:', error);
        // Re-throw the error so tools can handle it appropriately
        throw error;
      }
    }

    return activities;
  }
}

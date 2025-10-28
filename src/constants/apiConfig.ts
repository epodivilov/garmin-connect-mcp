/**
 * API Configuration Constants
 *
 * Centralized configuration for API-related settings, including
 * rate limiting delays and request timeouts.
 */

/**
 * Standard delay between Garmin Connect API calls to avoid rate limiting.
 *
 * This delay should be used between sequential API requests to prevent
 * overwhelming the Garmin Connect servers and triggering rate limits.
 *
 * @constant {number}
 * @default 100
 */
export const GARMIN_API_DELAY_MS = 100;

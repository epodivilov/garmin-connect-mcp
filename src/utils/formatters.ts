/**
 * @fileoverview Duration and pace formatting utilities
 *
 * Provides consistent formatting for duration values (seconds -> MM:SS or HH:MM:SS)
 * and pace values (seconds per km/100m -> MM:SS /km or /100m). All formatters
 * expect raw values in seconds and produce human-readable strings with units.
 *
 * @category Utils
 */

/**
 * Format duration in seconds to MM:SS or HH:MM:SS string
 *
 * Automatically chooses format based on duration length:
 * - Under 1 hour: MM:SS (e.g., "50:00")
 * - 1 hour or more: HH:MM:SS (e.g., "1:23:45")
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string like "50:00" or "1:23:45"
 *
 * @example
 * formatDuration(3000) // "50:00"
 * formatDuration(421) // "7:01"
 * formatDuration(3661) // "1:01:01"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace in seconds per km to MM:SS /km string
 *
 * Used for running and other distance-based activities where pace is
 * measured per kilometer. Rounds seconds to nearest whole number.
 *
 * @param secondsPerKm - Pace in seconds per kilometer
 * @returns Formatted string like "7:01 /km"
 *
 * @example
 * formatPace(421) // "7:01 /km"
 * formatPace(300) // "5:00 /km"
 */
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

/**
 * Format swimming pace in seconds per 100m to MM:SS /100m string
 *
 * Swimming activities typically use pace per 100 meters instead of
 * per kilometer. Rounds seconds to nearest whole number.
 *
 * @param secondsPer100m - Pace in seconds per 100 meters
 * @returns Formatted string like "1:45 /100m"
 *
 * @example
 * formatSwimPace(105) // "1:45 /100m"
 * formatSwimPace(90) // "1:30 /100m"
 */
export function formatSwimPace(secondsPer100m: number): string {
  const minutes = Math.floor(secondsPer100m / 60);
  const seconds = Math.round(secondsPer100m % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /100m`;
}

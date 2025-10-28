/**
 * @fileoverview Branded types for duration units to prevent accidental mixing
 *
 * Provides compile-time type safety for duration values by using TypeScript's
 * branded types pattern. This prevents accidentally mixing seconds and minutes
 * values, which can lead to incorrect calculations and user confusion.
 *
 * @category Types
 */

/**
 * Duration value in seconds
 *
 * Branded type to prevent accidental mixing with DurationMinutes.
 * Use `toDurationSeconds()` to construct from a raw number.
 *
 * @example
 * const duration = toDurationSeconds(3600); // 1 hour
 */
export type DurationSeconds = number & { readonly __brand: 'DurationSeconds' };

/**
 * Duration value in minutes
 *
 * Branded type to prevent accidental mixing with DurationSeconds.
 * Use `toDurationMinutes()` to construct from a raw number.
 *
 * @example
 * const duration = toDurationMinutes(60); // 1 hour
 */
export type DurationMinutes = number & { readonly __brand: 'DurationMinutes' };

/**
 * Convert a raw number to DurationSeconds
 *
 * @param value - Duration value in seconds
 * @returns Branded DurationSeconds type
 *
 * @example
 * const activityDuration = toDurationSeconds(2400); // 40 minutes
 */
export const toDurationSeconds = (value: number): DurationSeconds => value as DurationSeconds;

/**
 * Convert a raw number to DurationMinutes
 *
 * @param value - Duration value in minutes
 * @returns Branded DurationMinutes type
 *
 * @example
 * const activityDuration = toDurationMinutes(40); // 40 minutes
 */
export const toDurationMinutes = (value: number): DurationMinutes => value as DurationMinutes;

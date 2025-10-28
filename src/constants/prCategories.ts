/**
 * Standard PR Categories
 *
 * Predefined distance and duration categories for personal record tracking
 * across running, cycling, and swimming sports.
 */

import { PRCategory, SportType } from '../types/personalRecords.js';

/**
 * Standard running distances
 */
export const STANDARD_RUNNING_DISTANCES: PRCategory[] = [
  {
    type: 'distance',
    id: '1km',
    name: '1 Kilometer',
    value: 1000,
    tolerance: 50,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '1mile',
    name: '1 Mile',
    value: 1609,
    tolerance: 50,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '5K',
    name: '5 Kilometers',
    value: 5000,
    tolerance: 50,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '10K',
    name: '10 Kilometers',
    value: 10000,
    tolerance: 100,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '15K',
    name: '15 Kilometers',
    value: 15000,
    tolerance: 150,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: 'half_marathon',
    name: 'Half Marathon',
    value: 21097,
    tolerance: 200,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '25K',
    name: '25 Kilometers',
    value: 25000,
    tolerance: 250,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '30K',
    name: '30 Kilometers',
    value: 30000,
    tolerance: 300,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: 'marathon',
    name: 'Marathon',
    value: 42195,
    tolerance: 400,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '50K',
    name: '50 Kilometers',
    value: 50000,
    tolerance: 500,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '50mile',
    name: '50 Miles',
    value: 80467,
    tolerance: 800,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '100K',
    name: '100 Kilometers',
    value: 100000,
    tolerance: 1000,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  },
  {
    type: 'distance',
    id: '100mile',
    name: '100 Miles',
    value: 160934,
    tolerance: 1600,
    unit: 'meters',
    isCustom: false,
    sport: 'running'
  }
];

/**
 * Standard cycling distances
 */
export const STANDARD_CYCLING_DISTANCES: PRCategory[] = [
  {
    type: 'distance',
    id: '10km_cycling',
    name: '10 Kilometers (Cycling)',
    value: 10000,
    tolerance: 100,
    unit: 'meters',
    isCustom: false,
    sport: 'cycling'
  },
  {
    type: 'distance',
    id: '20km_cycling',
    name: '20 Kilometers (Cycling)',
    value: 20000,
    tolerance: 200,
    unit: 'meters',
    isCustom: false,
    sport: 'cycling'
  },
  {
    type: 'distance',
    id: '40km_cycling',
    name: '40 Kilometers (Cycling)',
    value: 40000,
    tolerance: 400,
    unit: 'meters',
    isCustom: false,
    sport: 'cycling'
  },
  {
    type: 'distance',
    id: '50km_cycling',
    name: '50 Kilometers (Cycling)',
    value: 50000,
    tolerance: 500,
    unit: 'meters',
    isCustom: false,
    sport: 'cycling'
  },
  {
    type: 'distance',
    id: '100km_cycling',
    name: '100 Kilometers (Cycling)',
    value: 100000,
    tolerance: 1000,
    unit: 'meters',
    isCustom: false,
    sport: 'cycling'
  },
  {
    type: 'distance',
    id: '100mile_cycling',
    name: '100 Miles (Cycling)',
    value: 160934,
    tolerance: 1600,
    unit: 'meters',
    isCustom: false,
    sport: 'cycling'
  },
  {
    type: 'distance',
    id: '200km_cycling',
    name: '200 Kilometers (Cycling)',
    value: 200000,
    tolerance: 2000,
    unit: 'meters',
    isCustom: false,
    sport: 'cycling'
  }
];

/**
 * Standard swimming distances
 */
export const STANDARD_SWIMMING_DISTANCES: PRCategory[] = [
  {
    type: 'distance',
    id: '50m_swim',
    name: '50 Meters (Swimming)',
    value: 50,
    tolerance: 5,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '100m_swim',
    name: '100 Meters (Swimming)',
    value: 100,
    tolerance: 5,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '200m_swim',
    name: '200 Meters (Swimming)',
    value: 200,
    tolerance: 10,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '400m_swim',
    name: '400 Meters (Swimming)',
    value: 400,
    tolerance: 20,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '800m_swim',
    name: '800 Meters (Swimming)',
    value: 800,
    tolerance: 40,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '1500m_swim',
    name: '1500 Meters (Swimming)',
    value: 1500,
    tolerance: 75,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '1mile_swim',
    name: '1 Mile (Swimming)',
    value: 1609,
    tolerance: 80,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '5km_swim',
    name: '5 Kilometers (Swimming)',
    value: 5000,
    tolerance: 250,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  },
  {
    type: 'distance',
    id: '10km_swim',
    name: '10 Kilometers (Swimming)',
    value: 10000,
    tolerance: 500,
    unit: 'meters',
    isCustom: false,
    sport: 'swimming'
  }
];

/**
 * Standard duration categories (sport-agnostic)
 */
export const STANDARD_DURATIONS: PRCategory[] = [
  {
    type: 'duration',
    id: '5min',
    name: '5 Minutes',
    value: 300,
    tolerance: 5,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '10min',
    name: '10 Minutes',
    value: 600,
    tolerance: 10,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '15min',
    name: '15 Minutes',
    value: 900,
    tolerance: 15,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '20min',
    name: '20 Minutes',
    value: 1200,
    tolerance: 20,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '30min',
    name: '30 Minutes',
    value: 1800,
    tolerance: 30,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '45min',
    name: '45 Minutes',
    value: 2700,
    tolerance: 45,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '1hour',
    name: '1 Hour',
    value: 3600,
    tolerance: 60,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '90min',
    name: '90 Minutes',
    value: 5400,
    tolerance: 90,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '2hour',
    name: '2 Hours',
    value: 7200,
    tolerance: 120,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '3hour',
    name: '3 Hours',
    value: 10800,
    tolerance: 180,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '4hour',
    name: '4 Hours',
    value: 14400,
    tolerance: 240,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '6hour',
    name: '6 Hours',
    value: 21600,
    tolerance: 360,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '12hour',
    name: '12 Hours',
    value: 43200,
    tolerance: 720,
    unit: 'seconds',
    isCustom: false
  },
  {
    type: 'duration',
    id: '24hour',
    name: '24 Hours',
    value: 86400,
    tolerance: 1440,
    unit: 'seconds',
    isCustom: false
  }
];

/**
 * All standard categories combined
 */
export const ALL_STANDARD_CATEGORIES: PRCategory[] = [
  ...STANDARD_RUNNING_DISTANCES,
  ...STANDARD_CYCLING_DISTANCES,
  ...STANDARD_SWIMMING_DISTANCES,
  ...STANDARD_DURATIONS
];

/**
 * Category lookup by ID
 */
export const CATEGORY_BY_ID = new Map<string, PRCategory>(
  ALL_STANDARD_CATEGORIES.map(cat => [cat.id, cat])
);

/**
 * Get categories by sport
 */
export function getCategoriesBySport(sport: SportType): PRCategory[] {
  const sportMap: Record<SportType, PRCategory[]> = {
    running: [...STANDARD_RUNNING_DISTANCES, ...STANDARD_DURATIONS],
    trail_running: [...STANDARD_RUNNING_DISTANCES, ...STANDARD_DURATIONS],
    virtual_run: [...STANDARD_RUNNING_DISTANCES, ...STANDARD_DURATIONS],
    cycling: [...STANDARD_CYCLING_DISTANCES, ...STANDARD_DURATIONS],
    indoor_cycling: [...STANDARD_CYCLING_DISTANCES, ...STANDARD_DURATIONS],
    swimming: [...STANDARD_SWIMMING_DISTANCES, ...STANDARD_DURATIONS],
    pool_swimming: [...STANDARD_SWIMMING_DISTANCES, ...STANDARD_DURATIONS],
    open_water: [...STANDARD_SWIMMING_DISTANCES, ...STANDARD_DURATIONS],
    other: STANDARD_DURATIONS
  };

  return sportMap[sport] || STANDARD_DURATIONS;
}

/**
 * Unit conversion utilities
 */
export const CONVERSION_FACTORS = {
  METERS_TO_KM: 0.001,
  METERS_TO_MILES: 0.000621371,
  MILES_TO_METERS: 1609.34,
  KM_TO_METERS: 1000,
  SECONDS_TO_MINUTES: 1 / 60,
  SECONDS_TO_HOURS: 1 / 3600,
  MINUTES_TO_SECONDS: 60,
  HOURS_TO_SECONDS: 3600
} as const;

/**
 * Calculate default tolerance for custom distance
 * Rule: 1% of distance, minimum 10m, maximum 1000m
 */
export function calculateDistanceTolerance(meters: number): number {
  const onePct = meters * 0.01;
  return Math.max(10, Math.min(1000, onePct));
}

/**
 * Calculate default tolerance for custom duration
 * Rule: 1% of duration, minimum 5s, maximum 300s
 */
export function calculateDurationTolerance(seconds: number): number {
  const onePct = seconds * 0.01;
  return Math.max(5, Math.min(300, onePct));
}

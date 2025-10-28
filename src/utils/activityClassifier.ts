/**
 * Activity Classifier
 *
 * Classifies activities by sport type and environmental conditions
 * (indoor/outdoor, pool/open water, virtual, etc.)
 */

import { SportType } from '../types/personalRecords.js';

/**
 * Activity classification result
 */
export interface ActivityClassification {
  sport: SportType;
  isIndoor: boolean;
  isVirtual: boolean;
  environment?: 'pool' | 'open_water' | 'road' | 'trail' | 'track';
  confidence: number;         // 0-1, confidence in classification
}

/**
 * Known Garmin activity type strings and their classifications
 */
const ACTIVITY_TYPE_MAP: Record<string, Partial<ActivityClassification>> = {
  // Running
  'running': { sport: 'running', isIndoor: false, isVirtual: false },
  'road_running': { sport: 'running', isIndoor: false, environment: 'road' },
  'street_running': { sport: 'running', isIndoor: false, environment: 'road' },
  'track_running': { sport: 'running', isIndoor: false, environment: 'track' },
  'trail_running': { sport: 'trail_running', isIndoor: false, environment: 'trail' },
  'treadmill_running': { sport: 'running', isIndoor: true, isVirtual: false },
  'indoor_running': { sport: 'running', isIndoor: true, isVirtual: false },
  'virtual_run': { sport: 'virtual_run', isIndoor: true, isVirtual: true },

  // Cycling
  'cycling': { sport: 'cycling', isIndoor: false, isVirtual: false },
  'road_biking': { sport: 'cycling', isIndoor: false, environment: 'road' },
  'mountain_biking': { sport: 'cycling', isIndoor: false, environment: 'trail' },
  'gravel_cycling': { sport: 'cycling', isIndoor: false, environment: 'trail' },
  'indoor_cycling': { sport: 'indoor_cycling', isIndoor: true, isVirtual: false },
  'virtual_ride': { sport: 'indoor_cycling', isIndoor: true, isVirtual: true },
  'cyclocross': { sport: 'cycling', isIndoor: false, environment: 'trail' },

  // Swimming
  'swimming': { sport: 'swimming', isIndoor: false, isVirtual: false },
  'lap_swimming': { sport: 'pool_swimming', isIndoor: true, environment: 'pool' },
  'pool_swimming': { sport: 'pool_swimming', isIndoor: true, environment: 'pool' },
  'open_water_swimming': { sport: 'open_water', isIndoor: false, environment: 'open_water' },
  'open_water': { sport: 'open_water', isIndoor: false, environment: 'open_water' }
};

/**
 * Classify activity based on type string and metadata
 */
export function classifyActivity(
  activityType: string,
  metadata?: {
    hasGPS?: boolean;
    locationName?: string;
    deviceName?: string;
    distance?: number;
    duration?: number;
  }
): ActivityClassification {
  const normalizedType = activityType.toLowerCase().replace(/\s+/g, '_');

  // Check for exact match
  const directMatch = ACTIVITY_TYPE_MAP[normalizedType];
  if (directMatch) {
    return {
      sport: directMatch.sport || 'other',
      isIndoor: directMatch.isIndoor ?? false,
      isVirtual: directMatch.isVirtual ?? false,
      environment: directMatch.environment,
      confidence: 1.0
    };
  }

  // Fuzzy matching based on keywords
  const classification = fuzzyClassify(normalizedType, metadata);

  return classification;
}

/**
 * Fuzzy classification using keywords and heuristics
 */
function fuzzyClassify(
  type: string,
  metadata?: {
    hasGPS?: boolean;
    locationName?: string;
    deviceName?: string;
    distance?: number;
    duration?: number;
  }
): ActivityClassification {
  let sport: SportType = 'other';
  let isIndoor = false;
  let isVirtual = false;
  let environment: ActivityClassification['environment'];
  let confidence = 0.5; // Lower confidence for fuzzy matches

  // Running detection
  if (
    type.includes('run') ||
    type.includes('jog') ||
    type.includes('sprint')
  ) {
    sport = 'running';
    confidence = 0.8;

    if (type.includes('trail') || type.includes('mountain')) {
      sport = 'trail_running';
      environment = 'trail';
    } else if (type.includes('track')) {
      environment = 'track';
    } else if (type.includes('treadmill') || type.includes('indoor')) {
      isIndoor = true;
    } else if (type.includes('virtual')) {
      sport = 'virtual_run';
      isIndoor = true;
      isVirtual = true;
    }
  }

  // Cycling detection
  else if (
    type.includes('cycl') ||
    type.includes('bike') ||
    type.includes('bik')
  ) {
    sport = 'cycling';
    confidence = 0.8;

    if (type.includes('indoor') || type.includes('trainer') || type.includes('spin')) {
      sport = 'indoor_cycling';
      isIndoor = true;
    } else if (type.includes('virtual') || type.includes('zwift')) {
      sport = 'indoor_cycling';
      isIndoor = true;
      isVirtual = true;
    } else if (type.includes('mountain') || type.includes('mtb')) {
      environment = 'trail';
    }
  }

  // Swimming detection
  else if (
    type.includes('swim')
  ) {
    sport = 'swimming';
    confidence = 0.8;

    if (type.includes('pool') || type.includes('lap')) {
      sport = 'pool_swimming';
      environment = 'pool';
      isIndoor = true;
    } else if (type.includes('open') || type.includes('ocean') || type.includes('lake')) {
      sport = 'open_water';
      environment = 'open_water';
      isIndoor = false;
    }
  }

  // Use metadata to refine classification
  if (metadata) {
    // No GPS usually means indoor
    if (metadata.hasGPS === false && !isIndoor) {
      isIndoor = true;
      confidence = Math.max(confidence, 0.7);
    }

    // Location name hints
    if (metadata.locationName) {
      const location = metadata.locationName.toLowerCase();
      if (location.includes('gym') || location.includes('fitness') || location.includes('indoor')) {
        isIndoor = true;
        confidence = Math.max(confidence, 0.8);
      }
      if (location.includes('pool')) {
        sport = 'pool_swimming';
        environment = 'pool';
        isIndoor = true;
        confidence = Math.max(confidence, 0.9);
      }
    }

    // Device name hints
    if (metadata.deviceName) {
      const device = metadata.deviceName.toLowerCase();
      if (device.includes('treadmill') || device.includes('trainer')) {
        isIndoor = true;
        confidence = Math.max(confidence, 0.9);
      }
    }
  }

  return {
    sport,
    isIndoor,
    isVirtual,
    environment,
    confidence
  };
}

/**
 * Determine if activity is suitable for distance-based PRs
 */
export function isSuitableForDistancePR(
  classification: ActivityClassification,
  hasGPS: boolean
): boolean {
  // Indoor activities without GPS are less reliable for distance PRs
  if (classification.isIndoor && !hasGPS) {
    return false;
  }

  // Virtual activities may have less accurate distance
  if (classification.isVirtual) {
    return false;
  }

  // Pool swimming uses lap counting, which is reliable
  if (classification.sport === 'pool_swimming') {
    return true;
  }

  // Otherwise, GPS-based activities are suitable
  return hasGPS;
}

/**
 * Get sport display name
 */
export function getSportDisplayName(sport: SportType): string {
  const displayNames: Record<SportType, string> = {
    running: 'Running',
    trail_running: 'Trail Running',
    virtual_run: 'Virtual Run',
    cycling: 'Cycling',
    indoor_cycling: 'Indoor Cycling',
    swimming: 'Swimming',
    pool_swimming: 'Pool Swimming',
    open_water: 'Open Water Swimming',
    other: 'Other'
  };

  return displayNames[sport] || sport;
}

/**
 * Normalize sport type for PR grouping
 * Groups similar sports together (e.g., all running types)
 */
export function normalizeSportForPR(sport: SportType): SportType {
  const normalizationMap: Record<SportType, SportType> = {
    running: 'running',
    trail_running: 'running',
    virtual_run: 'running',
    cycling: 'cycling',
    indoor_cycling: 'cycling',
    swimming: 'swimming',
    pool_swimming: 'swimming',
    open_water: 'swimming',
    other: 'other'
  };

  return normalizationMap[sport] || sport;
}

/**
 * Periodization Model Definitions
 *
 * Defines characteristics and rules for different periodization models:
 * - Linear: Traditional progressive overload
 * - Undulating: Non-linear with frequent intensity variations
 * - Block: Concentrated training blocks
 * - Polarized: High volume low intensity + low volume high intensity
 */

import type { PeriodizationModelDefinition, TrainingPhase } from '../types/periodization.js';

/**
 * Linear (Traditional) Periodization
 *
 * Progressive volume increase followed by progressive intensity increase.
 * Classic: Base → Build → Peak → Taper → Recovery
 */
export const LINEAR_MODEL: PeriodizationModelDefinition = {
  model: 'linear',
  name: 'Linear Periodization',
  description: 'Traditional progressive model with distinct phases building from base to peak',

  phaseCharacteristics: {
    base: {
      typicalDuration: { min: 8, max: 16 },
      volumeLevel: 'high',
      intensityLevel: 'low',
      hrZoneEmphasis: [1, 2],
      tsbRange: { min: -10, max: 10 }
    },
    build: {
      typicalDuration: { min: 6, max: 12 },
      volumeLevel: 'high',
      intensityLevel: 'medium',
      hrZoneEmphasis: [2, 3],
      tsbRange: { min: -15, max: 5 }
    },
    peak: {
      typicalDuration: { min: 2, max: 4 },
      volumeLevel: 'medium',
      intensityLevel: 'high',
      hrZoneEmphasis: [4, 5],
      tsbRange: { min: -10, max: 10 }
    },
    taper: {
      typicalDuration: { min: 1, max: 3 },
      volumeLevel: 'low',
      intensityLevel: 'medium',
      hrZoneEmphasis: [3, 4],
      tsbRange: { min: 10, max: 25 }
    },
    recovery: {
      typicalDuration: { min: 1, max: 2 },
      volumeLevel: 'low',
      intensityLevel: 'low',
      hrZoneEmphasis: [1, 2],
      tsbRange: { min: 15, max: 35 }
    }
  },

  typicalProgression: ['base', 'build', 'peak', 'taper', 'recovery'],

  effectivenessCriteria: {
    minBasePhaseWeeks: 8,
    minBuildPhaseWeeks: 6,
    minRecoveryWeeks: 1,
    maxVolumeIncreasePerWeek: 10,
    targetTSBBeforePeak: { min: 10, max: 25 }
  }
};

/**
 * Undulating (Non-Linear) Periodization
 *
 * Frequent variation in volume and intensity within and between weeks.
 * More flexible phase boundaries with regular fluctuations.
 */
export const UNDULATING_MODEL: PeriodizationModelDefinition = {
  model: 'undulating',
  name: 'Undulating Periodization',
  description: 'Non-linear model with frequent volume and intensity variations',

  phaseCharacteristics: {
    base: {
      typicalDuration: { min: 4, max: 8 },
      volumeLevel: 'medium',
      intensityLevel: 'low',
      hrZoneEmphasis: [1, 2, 3],
      tsbRange: { min: -15, max: 15 }
    },
    build: {
      typicalDuration: { min: 4, max: 8 },
      volumeLevel: 'medium',
      intensityLevel: 'medium',
      hrZoneEmphasis: [2, 3, 4],
      tsbRange: { min: -20, max: 10 }
    },
    peak: {
      typicalDuration: { min: 2, max: 4 },
      volumeLevel: 'medium',
      intensityLevel: 'high',
      hrZoneEmphasis: [3, 4, 5],
      tsbRange: { min: -10, max: 15 }
    },
    recovery: {
      typicalDuration: { min: 1, max: 1 },
      volumeLevel: 'low',
      intensityLevel: 'low',
      hrZoneEmphasis: [1, 2],
      tsbRange: { min: 10, max: 30 }
    }
  },

  typicalProgression: ['base', 'build', 'recovery', 'build', 'peak', 'recovery'],

  effectivenessCriteria: {
    minBasePhaseWeeks: 4,
    minBuildPhaseWeeks: 4,
    minRecoveryWeeks: 1,
    maxVolumeIncreasePerWeek: 15, // More tolerance for variation
    targetTSBBeforePeak: { min: 5, max: 20 }
  }
};

/**
 * Block Periodization
 *
 * Concentrated blocks focusing on specific adaptations.
 * Each block emphasizes one training quality (endurance, strength, speed).
 */
export const BLOCK_MODEL: PeriodizationModelDefinition = {
  model: 'block',
  name: 'Block Periodization',
  description: 'Concentrated training blocks targeting specific adaptations',

  phaseCharacteristics: {
    base: {
      typicalDuration: { min: 3, max: 6 },
      volumeLevel: 'high',
      intensityLevel: 'low',
      hrZoneEmphasis: [1, 2],
      tsbRange: { min: -15, max: 5 }
    },
    build: {
      typicalDuration: { min: 3, max: 6 },
      volumeLevel: 'medium',
      intensityLevel: 'high',
      hrZoneEmphasis: [3, 4],
      tsbRange: { min: -20, max: 0 }
    },
    peak: {
      typicalDuration: { min: 2, max: 4 },
      volumeLevel: 'low',
      intensityLevel: 'high',
      hrZoneEmphasis: [4, 5],
      tsbRange: { min: -10, max: 10 }
    },
    recovery: {
      typicalDuration: { min: 1, max: 2 },
      volumeLevel: 'low',
      intensityLevel: 'low',
      hrZoneEmphasis: [1, 2],
      tsbRange: { min: 15, max: 30 }
    }
  },

  typicalProgression: ['base', 'recovery', 'build', 'recovery', 'peak', 'recovery'],

  effectivenessCriteria: {
    minBasePhaseWeeks: 3,
    minBuildPhaseWeeks: 3,
    minRecoveryWeeks: 1,
    maxVolumeIncreasePerWeek: 12,
    targetTSBBeforePeak: { min: 5, max: 15 }
  }
};

/**
 * Polarized Periodization
 *
 * 80/20 rule: 80% low intensity (Zone 1-2) + 20% high intensity (Zone 4-5).
 * Avoids moderate intensity "gray zone" training.
 */
export const POLARIZED_MODEL: PeriodizationModelDefinition = {
  model: 'polarized',
  name: 'Polarized Training',
  description: '80/20 model with emphasis on low and high intensity, avoiding moderate zones',

  phaseCharacteristics: {
    base: {
      typicalDuration: { min: 8, max: 16 },
      volumeLevel: 'high',
      intensityLevel: 'low',
      hrZoneEmphasis: [1, 2], // 85-90% in Zone 1-2
      tsbRange: { min: -10, max: 10 }
    },
    build: {
      typicalDuration: { min: 6, max: 12 },
      volumeLevel: 'high',
      intensityLevel: 'medium',
      hrZoneEmphasis: [1, 2, 5], // Low + high intensity
      tsbRange: { min: -15, max: 5 }
    },
    peak: {
      typicalDuration: { min: 3, max: 6 },
      volumeLevel: 'medium',
      intensityLevel: 'medium',
      hrZoneEmphasis: [2, 4, 5], // Maintain low volume, increase high intensity
      tsbRange: { min: -10, max: 10 }
    },
    recovery: {
      typicalDuration: { min: 1, max: 2 },
      volumeLevel: 'low',
      intensityLevel: 'low',
      hrZoneEmphasis: [1],
      tsbRange: { min: 15, max: 30 }
    }
  },

  typicalProgression: ['base', 'build', 'peak', 'recovery'],

  effectivenessCriteria: {
    minBasePhaseWeeks: 8,
    minBuildPhaseWeeks: 6,
    minRecoveryWeeks: 1,
    maxVolumeIncreasePerWeek: 10,
    targetTSBBeforePeak: { min: 10, max: 20 }
  }
};

/**
 * All periodization models
 */
export const PERIODIZATION_MODELS: Record<string, PeriodizationModelDefinition> = {
  linear: LINEAR_MODEL,
  undulating: UNDULATING_MODEL,
  block: BLOCK_MODEL,
  polarized: POLARIZED_MODEL
};

/**
 * Phase characteristics lookup
 */
export const PHASE_DESCRIPTIONS: Record<TrainingPhase, string> = {
  base: 'Foundation building phase with high volume and low intensity',
  build: 'Intensification phase with increased training load and intensity',
  peak: 'Competition phase with high intensity and race-specific work',
  taper: 'Pre-competition reduction in volume while maintaining intensity',
  recovery: 'Regeneration phase with reduced volume and intensity',
  transition: 'Off-season transition between training cycles'
};

/**
 * Default phase detection thresholds
 */
export const DEFAULT_PHASE_THRESHOLDS = {
  minPhaseWeeks: 2,
  volumeThresholds: {
    low: 3,      // < 3 hours per week
    medium: 6,   // 3-6 hours per week
    high: 10     // > 6 hours per week
  },
  intensityThresholds: {
    lowTSS: 150,     // < 150 TSS per week
    mediumTSS: 300,  // 150-300 TSS per week
    highTSS: 500     // > 300 TSS per week
  },
  confidenceWeights: {
    volume: 0.30,
    intensity: 0.40,
    tss: 0.30,
    duration: 1.0 // Used as multiplier for phase length
  }
};

/**
 * HR Zone percentages for polarized training model
 */
export const POLARIZED_ZONE_TARGETS = {
  zone1_2: 0.80,  // 80% in easy/aerobic zones
  zone3: 0.00,    // Avoid tempo zone
  zone4_5: 0.20   // 20% in threshold/VO2max zones
};

/**
 * Safe volume increase guidelines (percentage per week)
 */
export const SAFE_VOLUME_INCREASE = {
  conservative: 5,
  moderate: 10,
  aggressive: 15
};

/**
 * Recovery week frequency recommendations
 */
export const RECOVERY_FREQUENCY = {
  beginner: 3,     // Every 3 weeks
  intermediate: 4, // Every 4 weeks
  advanced: 4      // Every 4-5 weeks
};

/**
 * TSB ranges for form status
 */
export const TSB_RANGES = {
  fresh: { min: 25, description: 'Very fresh, possible detraining' },
  optimal: { min: 10, max: 25, description: 'Optimal form for performance' },
  neutral: { min: -10, max: 10, description: 'Maintenance state' },
  fatigued: { min: -30, max: -10, description: 'Productive training fatigue' },
  overreached: { max: -30, description: 'High risk of overtraining' }
};

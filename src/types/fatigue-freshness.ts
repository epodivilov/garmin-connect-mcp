/**
 * Fatigue and Freshness (Form) Tracking Types
 *
 * Provides comprehensive tracking of training stress balance (TSB/Form),
 * including zone classification, trend analysis, predictions, and performance correlations.
 *
 * Form (TSB) = CTL - ATL
 * - Positive TSB: Fresh/recovered state
 * - Negative TSB: Fatigued state (productive training stress)
 * - TSB around 0: Maintenance/neutral state
 */

/**
 * Form zones based on TSB value
 * Zones are adaptive based on CTL (fitness level)
 */
export type FormZone =
  | 'optimal_race'        // Peak race readiness (TSB 10-25)
  | 'fresh'               // Fresh/recovered (TSB > 25)
  | 'maintenance'         // Neutral maintenance (TSB -5 to 10)
  | 'productive_training' // Productive training load (TSB -20 to -5)
  | 'fatigued'            // Fatigued state (TSB -30 to -20)
  | 'overreached';        // Overreached/high risk (TSB < -30)

/**
 * Form zone information with characteristics
 */
export interface FormZoneInfo {
  zone: FormZone;
  label: string;
  description: string;
  color: string;
  tsbRange: { min: number; max: number };

  // Characteristics
  characteristics: {
    performancePotential: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low';
    injuryRisk: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    recommendedIntensity: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    trainingFocus: string[];
  };

  // Recommendations
  recommendations: {
    workoutTypes: string[];
    intensityGuidance: string;
    volumeGuidance: string;
    recoveryGuidance: string;
  };

  // Warnings
  warnings?: string[];
}

/**
 * Form trend over a specific period
 */
export interface FormTrend {
  period: 'week' | 'two_weeks' | 'month';
  durationDays: number;
  startDate: string;
  endDate: string;

  // Trend metrics
  direction: 'improving' | 'declining' | 'stable';
  slope: number;              // TSB change per day
  velocity: 'rapid' | 'moderate' | 'slow' | 'stable';

  // Statistical measures
  averageTSB: number;
  minTSB: number;
  maxTSB: number;
  volatility: number;         // Standard deviation

  // Zone transitions
  zoneChanges: Array<{
    date: string;
    fromZone: FormZone;
    toZone: FormZone;
    tsbValue: number;
  }>;

  // Trend reversals (inflection points)
  reversals: Array<{
    date: string;
    tsbValue: number;
    previousDirection: 'increasing' | 'decreasing';
    newDirection: 'increasing' | 'decreasing';
  }>;
}

/**
 * Future form prediction
 */
export interface FormPrediction {
  targetDate: string;
  predictedTSB: number;
  predictedZone: FormZone;
  confidence: number;         // 0-100

  // Assumptions
  assumptions: {
    plannedDailyTSS: number[];  // Daily TSS for prediction period
    currentCTL: number;
    currentATL: number;
    currentTSB: number;
  };

  // Prediction details
  details: {
    projectedCTL: number;
    projectedATL: number;
    expectedFatigueDecay: number;
    expectedFitnessDecay: number;
  };

  // Recommendations
  recommendations: string[];
}

/**
 * Taper plan for race preparation
 */
export interface TaperPlan {
  raceDate: string;
  taperStartDate: string;
  taperDuration: number;      // days

  // Current state
  currentState: {
    date: string;
    ctl: number;
    atl: number;
    tsb: number;
    zone: FormZone;
  };

  // Target state
  targetState: {
    targetTSB: number;
    targetZone: FormZone;
    targetCTL: number;          // Maintain fitness
  };

  // Daily taper schedule
  schedule: Array<{
    date: string;
    dayOfTaper: number;
    plannedTSS: number;
    reductionFromPeak: number;  // percentage
    predictedTSB: number;
    predictedZone: FormZone;
    notes: string;
  }>;

  // Taper strategy
  strategy: {
    type: 'linear' | 'exponential' | 'step';
    volumeReduction: number;    // percentage
    intensityMaintenance: boolean;
    criticalWorkouts: string[];
  };

  // Warnings and recommendations
  warnings: string[];
  recommendations: string[];
}

/**
 * Form snapshot for a specific date
 */
export interface FormSnapshot {
  date: string;

  // Training stress metrics
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;

  // Form classification
  zone: FormZone;
  zoneInfo: FormZoneInfo;

  // Daily context
  activityCount: number;
  totalDuration: number;       // seconds
  totalDistance?: number;      // meters

  // Changes from previous day
  changes: {
    tssChange: number;
    ctlChange: number;
    atlChange: number;
    tsbChange: number;
    zoneChanged: boolean;
    previousZone?: FormZone;
  };
}

/**
 * Form history with snapshots
 */
export interface FormHistory {
  snapshots: FormSnapshot[];
  lastUpdated: string;

  // Summary statistics
  summary: {
    totalDays: number;
    dateRange: {
      start: string;
      end: string;
    };

    // Zone distribution
    zoneDistribution: Record<FormZone, {
      days: number;
      percentage: number;
    }>;

    // Averages
    averageTSB: number;
    averageCTL: number;
    averageATL: number;

    // Extremes
    peakFitness: {
      date: string;
      ctl: number;
    };
    maxFatigue: {
      date: string;
      atl: number;
      tsb: number;
    };
    maxFreshness: {
      date: string;
      tsb: number;
    };
  };

  // Metadata
  metadata: {
    version: string;
    createdAt: string;
  };
}

/**
 * Form-performance correlation analysis
 */
export interface FormPerformanceCorrelation {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };

  // Performance by zone
  performanceByZone: Record<FormZone, {
    totalPRs: number;
    prDensity: number;          // PRs per day in this zone
    avgTSB: number;
    daysInZone: number;

    // PR details
    prs: Array<{
      categoryId: string;
      categoryName: string;
      date: string;
      tsb: number;
      improvement: number;      // percentage
    }>;
  }>;

  // Optimal zones
  optimalZones: Array<{
    zone: FormZone;
    score: number;              // 0-100
    reasoning: string;
  }>;

  // TSB correlation
  tsbCorrelation: {
    coefficient: number;        // -1 to 1
    significance: 'strong' | 'moderate' | 'weak' | 'none';
    optimalTSBRange: { min: number; max: number };
  };

  // Insights
  insights: string[];
  recommendations: string[];
}

/**
 * Complete form analysis result
 */
export interface FormAnalysis {
  analysisDate: string;

  // Current state
  current: FormSnapshot;

  // Trends
  trends: {
    week: FormTrend;
    twoWeeks: FormTrend;
    month: FormTrend;
  };

  // Performance correlation
  performanceCorrelation?: FormPerformanceCorrelation;

  // Predictions
  predictions?: {
    nextWeek: FormPrediction;
    twoWeeks: FormPrediction;
  };

  // Training recommendations
  recommendations: {
    immediate: string[];        // Next 1-3 days
    shortTerm: string[];        // Next 1-2 weeks
    longTerm: string[];         // Next month
  };

  // Warnings
  warnings: Array<{
    severity: 'info' | 'warning' | 'critical';
    type: string;
    message: string;
    actionRequired?: string;
  }>;

  // Context
  context: {
    readinessScore?: number;    // From HRV/sleep
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
    recentIllness?: boolean;
    recentInjury?: boolean;
  };
}

/**
 * Form query options
 */
export interface FormQuery {
  date?: string;                // YYYY-MM-DD (defaults to today)
  dateRange?: string;           // YYYY-MM-DD/YYYY-MM-DD
  includeTimeSeries?: boolean;
  includePredictions?: boolean;
  includePerformanceCorrelation?: boolean;
  includeContext?: boolean;     // Include HRV/sleep context

  // Advanced options
  ctlTimeConstant?: number;     // Default: 42 days
  atlTimeConstant?: number;     // Default: 7 days
  customZoneThresholds?: {
    [K in FormZone]?: { min: number; max: number };
  };
}

/**
 * Form storage configuration
 */
export interface FormStorageConfig {
  filePath: string;
  maxRetentionDays: number;
  autoCleanup: boolean;
}

/**
 * Form prediction options
 */
export interface FormPredictionOptions {
  targetDate: string;
  plannedTSS: number | number[];  // Single value or daily values
  maintainIntensity?: boolean;
  recoveryDays?: number[];         // Specific rest days
  currentCTL?: number;
  currentATL?: number;
  currentTSB?: number;
}

/**
 * Taper plan options
 */
export interface TaperPlanOptions {
  raceDate: string;
  taperDuration?: number;         // days (default: 14)
  targetTSB?: number;             // target (default: 15-20)
  strategy?: 'linear' | 'exponential' | 'step';
  volumeReduction?: number;       // percentage (default: 40-60%)
  maintainIntensity?: boolean;    // (default: true)
  currentCTL?: number;
  currentATL?: number;
  currentTSB?: number;
}

/**
 * Form zone classification thresholds
 * Adaptive based on CTL
 */
export interface FormZoneThresholds {
  overreached: { max: number };
  fatigued: { min: number; max: number };
  productiveTraining: { min: number; max: number };
  maintenance: { min: number; max: number };
  optimalRace: { min: number; max: number };
  fresh: { min: number };

  // Adjustment factors based on CTL
  ctlAdjustmentFactors?: {
    lowFitness: number;           // CTL < 40
    moderateFitness: number;      // CTL 40-80
    highFitness: number;          // CTL > 80
  };
}

/**
 * Form recommendation context
 */
export interface FormRecommendationContext {
  currentZone: FormZone;
  currentTSB: number;
  currentCTL: number;
  currentATL: number;

  // Trends
  tsbTrend: 'improving' | 'declining' | 'stable';
  recentZoneChanges: number;

  // External factors
  readinessScore?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  sleepDebt?: number;
  hrvStatus?: 'low' | 'normal' | 'high';

  // Training phase
  trainingPhase?: 'base' | 'build' | 'peak' | 'taper' | 'recovery' | 'transition';

  // Goals
  upcomingRace?: {
    date: string;
    daysUntil: number;
    priority: 'A' | 'B' | 'C';
  };
}

/**
 * Form-based training recommendation
 */
export interface FormTrainingRecommendation {
  date: string;
  currentZone: FormZone;

  // Daily recommendations
  recommendedTSS: { min: number; max: number };
  recommendedIntensity: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  recommendedVolume: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

  // Workout suggestions
  workoutTypes: string[];
  avoidWorkouts: string[];

  // Guidance
  guidance: {
    primary: string;
    secondary: string[];
    cautions: string[];
  };

  // Context-aware adjustments
  adjustments?: {
    sleepAdjustment?: string;
    hrvAdjustment?: string;
    phaseAdjustment?: string;
  };
}

/**
 * Form zone constants with default thresholds
 */
export const DEFAULT_FORM_ZONES: Record<FormZone, Omit<FormZoneInfo, 'zone'>> = {
  optimal_race: {
    label: 'Optimal Race',
    description: 'Peak race readiness - optimal form for performance',
    color: '#10B981',
    tsbRange: { min: 10, max: 25 },
    characteristics: {
      performancePotential: 'very_high',
      injuryRisk: 'very_low',
      recommendedIntensity: 'high',
      trainingFocus: ['quality workouts', 'race-specific efforts', 'intensity maintenance']
    },
    recommendations: {
      workoutTypes: ['race pace', 'threshold intervals', 'short high-intensity', 'technique work'],
      intensityGuidance: 'Maintain intensity with reduced volume',
      volumeGuidance: 'Keep volume low to moderate',
      recoveryGuidance: 'Prioritize quality recovery between key sessions'
    }
  },
  fresh: {
    label: 'Fresh',
    description: 'Very fresh - recovered but risk of detraining if prolonged',
    color: '#3B82F6',
    tsbRange: { min: 25, max: Infinity },
    characteristics: {
      performancePotential: 'high',
      injuryRisk: 'very_low',
      recommendedIntensity: 'moderate',
      trainingFocus: ['resume training', 'gradual load increase', 'technique refinement']
    },
    recommendations: {
      workoutTypes: ['easy aerobic', 'technique work', 'moderate intensity'],
      intensityGuidance: 'Can handle moderate to high intensity',
      volumeGuidance: 'Gradually increase volume',
      recoveryGuidance: 'Well recovered - can increase training load'
    },
    warnings: ['Extended freshness may lead to detraining']
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Neutral maintenance zone - balanced training',
    color: '#F59E0B',
    tsbRange: { min: -5, max: 10 },
    characteristics: {
      performancePotential: 'moderate',
      injuryRisk: 'low',
      recommendedIntensity: 'moderate',
      trainingFocus: ['consistent training', 'mixed intensities', 'steady progression']
    },
    recommendations: {
      workoutTypes: ['mixed training', 'tempo runs', 'steady state', 'intervals'],
      intensityGuidance: 'Balanced intensity distribution',
      volumeGuidance: 'Moderate volume with variety',
      recoveryGuidance: 'Standard recovery protocols'
    }
  },
  productive_training: {
    label: 'Productive Training',
    description: 'Productive training stress - fitness gains occurring',
    color: '#EF4444',
    tsbRange: { min: -20, max: -5 },
    characteristics: {
      performancePotential: 'low',
      injuryRisk: 'moderate',
      recommendedIntensity: 'low',
      trainingFocus: ['aerobic development', 'volume accumulation', 'base building']
    },
    recommendations: {
      workoutTypes: ['easy aerobic', 'long slow distance', 'recovery runs'],
      intensityGuidance: 'Keep intensity low - focus on volume',
      volumeGuidance: 'Can maintain or slightly increase volume',
      recoveryGuidance: 'Monitor recovery markers carefully'
    }
  },
  fatigued: {
    label: 'Fatigued',
    description: 'Significant fatigue - approaching overreaching',
    color: '#DC2626',
    tsbRange: { min: -30, max: -20 },
    characteristics: {
      performancePotential: 'very_low',
      injuryRisk: 'high',
      recommendedIntensity: 'very_low',
      trainingFocus: ['active recovery', 'easy aerobic', 'reduced volume']
    },
    recommendations: {
      workoutTypes: ['easy recovery', 'active rest', 'cross-training'],
      intensityGuidance: 'Very low intensity only',
      volumeGuidance: 'Reduce volume significantly',
      recoveryGuidance: 'Prioritize sleep, nutrition, and recovery'
    },
    warnings: ['High injury risk', 'Consider scheduled recovery week']
  },
  overreached: {
    label: 'Overreached',
    description: 'Severe overreaching - immediate recovery required',
    color: '#991B1B',
    tsbRange: { min: -Infinity, max: -30 },
    characteristics: {
      performancePotential: 'very_low',
      injuryRisk: 'very_high',
      recommendedIntensity: 'very_low',
      trainingFocus: ['complete recovery', 'rest', 'regeneration']
    },
    recommendations: {
      workoutTypes: ['rest', 'very easy recovery', 'active rest only'],
      intensityGuidance: 'No hard training',
      volumeGuidance: 'Minimal volume or complete rest',
      recoveryGuidance: 'Immediate recovery period required'
    },
    warnings: [
      'CRITICAL: Very high injury/illness risk',
      'Consider complete rest for 3-7 days',
      'Monitor for signs of overtraining syndrome'
    ]
  }
} as const;

/**
 * Form trend velocity thresholds (TSB change per day)
 */
export const FORM_TREND_VELOCITY = {
  RAPID: 2.0,      // > 2 TSB/day
  MODERATE: 0.5,   // 0.5-2 TSB/day
  SLOW: 0.2,       // 0.2-0.5 TSB/day
  STABLE: 0.2      // < 0.2 TSB/day
} as const;

/**
 * Time constants for predictions
 */
export const FORM_TIME_CONSTANTS = {
  CTL: 42,         // Chronic Training Load (fitness)
  ATL: 7,          // Acute Training Load (fatigue)
  PREDICTION_CONFIDENCE_DECAY: 0.95  // Per day
} as const;

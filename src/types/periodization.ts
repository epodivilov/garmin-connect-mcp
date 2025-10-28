/**
 * Seasonal Periodization Analysis Types
 *
 * Provides comprehensive analysis of training periodization including phase detection,
 * effectiveness scoring, and recommendations across multiple periodization models.
 */

import type { TrendAnalysis } from './progress.js';

/**
 * Training phase types
 */
export type TrainingPhase =
  | 'base'        // Base/foundation building
  | 'build'       // Build/intensification phase
  | 'peak'        // Peak/competition phase
  | 'recovery'    // Recovery/regeneration phase
  | 'transition'  // Transition/off-season
  | 'taper';      // Pre-competition taper

/**
 * Periodization model types
 */
export type PeriodizationModel =
  | 'linear'      // Traditional linear periodization
  | 'undulating'  // Non-linear/undulating periodization
  | 'block'       // Block periodization
  | 'polarized';  // Polarized training

/**
 * Training trend directions
 */
export type TrendDirection = 'increasing' | 'stable' | 'decreasing';

/**
 * Weekly aggregated metrics for phase detection
 */
export interface WeeklyMetrics {
  weekStart: string;              // YYYY-MM-DD (Monday)
  weekEnd: string;                // YYYY-MM-DD (Sunday)
  weekNumber: number;             // ISO week number
  year: number;

  // Volume metrics
  totalDistance: number;          // meters
  totalDuration: number;          // seconds
  totalElevation: number;         // meters
  activityCount: number;

  // Intensity metrics
  avgWeeklyTSS: number;
  totalTSS: number;
  avgCTL: number;                 // Average CTL for the week
  avgATL: number;
  avgTSB: number;

  // HR zone distribution
  hrZoneDistribution?: {
    zone1Percentage: number;      // Easy/recovery
    zone2Percentage: number;      // Aerobic
    zone3Percentage: number;      // Tempo
    zone4Percentage: number;      // Threshold
    zone5Percentage: number;      // VO2max/Anaerobic
  };

  // Activities breakdown
  activities: Array<{
    activityId: number;
    activityType: string;
    date: string;
    duration: number;
    distance?: number;
    tss: number;
    avgHR?: number;
  }>;
}

/**
 * Detected training phase with metrics
 */
export interface DetectedPhase {
  phase: TrainingPhase;
  startDate: string;              // YYYY-MM-DD
  endDate: string;                // YYYY-MM-DD
  durationWeeks: number;

  // Volume characteristics
  avgWeeklyVolume: number;        // hours
  avgWeeklyDistance: number;      // km
  volumeTrend: TrendDirection;
  volumeChange: number;           // percentage change from previous phase

  // Intensity characteristics
  avgWeeklyTSS: number;
  tssTrend: TrendDirection;
  avgCTL: number;
  ctlGain: number;                // CTL change during phase
  avgATL: number;
  avgTSB: number;
  intensityTrend: TrendDirection;

  // HR zone distribution
  hrZoneProfile?: {
    zone1Percentage: number;
    zone2Percentage: number;
    zone3Percentage: number;
    zone4Percentage: number;
    zone5Percentage: number;
    dominantZones: number[];      // e.g., [1, 2] for base phase
  };

  /**
   * Form (TSB) metrics for phase
   * Optional - added for form tracking integration
   */
  formMetrics?: {
    avgTSB: number;               // Average TSB during phase
    minTSB: number;               // Lowest TSB in phase
    maxTSB: number;               // Highest TSB in phase
    tsbTrend: TrendDirection;     // TSB trend direction

    // Form zone distribution
    zoneDistribution: {
      overreached: number;        // percentage of phase
      fatigued: number;
      productiveTraining: number;
      maintenance: number;
      optimalRace: number;
      fresh: number;
    };

    // Dominant zone for this phase
    dominantZone: 'overreached' | 'fatigued' | 'productive_training' |
                  'maintenance' | 'optimal_race' | 'fresh';

    // Overreaching episodes
    overreachingDays: number;     // Days with TSB < -30
  };

  // Performance metrics
  performanceMetrics?: {
    prsAchieved: number;
    prDetails?: Array<{
      categoryId: string;
      categoryName: string;
      improvement: number;          // percentage
      activityId: number;
      date: string;
    }>;
    avgPaceImprovement?: number;    // percentage
    avgPowerImprovement?: number;   // percentage
    efficiencyTrend: TrendDirection;
  };

  // Detection confidence
  confidence: number;               // 0-100
  detectionMethod: 'volume' | 'intensity' | 'tss' | 'hybrid';
  confidenceFactors: {
    volumeConfidence: number;
    intensityConfidence: number;
    tssConfidence: number;
    durationConfidence: number;     // Phase duration appropriateness
  };
}

/**
 * Periodization model definition
 */
export interface PeriodizationModelDefinition {
  model: PeriodizationModel;
  name: string;
  description: string;

  // Typical phase characteristics
  phaseCharacteristics: {
    [K in TrainingPhase]?: {
      typicalDuration: { min: number; max: number }; // weeks
      volumeLevel: 'low' | 'medium' | 'high';
      intensityLevel: 'low' | 'medium' | 'high';
      hrZoneEmphasis: number[];     // Dominant zones
      tsbRange?: { min: number; max: number };
    };
  };

  // Transition rules
  typicalProgression: TrainingPhase[];

  // Effectiveness criteria
  effectivenessCriteria: {
    minBasePhaseWeeks: number;
    minBuildPhaseWeeks: number;
    minRecoveryWeeks: number;
    maxVolumeIncreasePerWeek: number;  // percentage
    targetTSBBeforePeak: { min: number; max: number };
  };
}

/**
 * Phase balance analysis
 */
export interface PhaseBalance {
  totalWeeks: number;
  baseRatio: number;              // percentage of total time
  buildRatio: number;
  peakRatio: number;
  recoveryRatio: number;
  transitionRatio: number;
  taperRatio: number;

  // Compared to target model
  targetRatios?: {
    base: number;
    build: number;
    peak: number;
    recovery: number;
  };
  balanceScore: number;           // 0-100
  recommendations: string[];
}

/**
 * Volume progression analysis
 */
export interface VolumeProgression {
  isProgressive: boolean;
  avgWeeklyIncrease: number;      // percentage
  isWithinSafeRange: boolean;     // <10% per week
  rapidIncreases: Array<{
    weekStart: string;
    increase: number;             // percentage
    previousWeek: number;         // hours
    currentWeek: number;          // hours
  }>;
  progressionScore: number;       // 0-100
  volumeTrend: TrendAnalysis;
}

/**
 * Recovery management analysis
 */
export interface RecoveryManagement {
  recoveryWeeksCount: number;
  avgRecoveryWeekInterval: number; // weeks between recovery
  isAdequate: boolean;
  tsbManagement: {
    avgTSB: number;
    tsbRange: { min: number; max: number };
    overreachingEpisodes: number;  // TSB < -30
    adequateRecoveryPeriods: number;
    score: number;                 // 0-100
  };
  recommendations: string[];
}

/**
 * Performance correlation analysis
 */
export interface PerformanceCorrelation {
  totalPRs: number;
  prsByPhase: Record<TrainingPhase, number>;
  fitnessGain: number;            // CTL change over period
  peakFitness: number;            // Maximum CTL achieved
  performanceScore: number;       // 0-100

  // Correlation with phase
  peakPerformancePhase?: TrainingPhase;
  effectivePhases: TrainingPhase[];

  // Timing analysis
  prTimingAnalysis?: {
    prsInOptimalTSB: number;      // PRs when TSB 10-25
    prsInFatigued: number;        // PRs when TSB < -10
    prsInFresh: number;           // PRs when TSB > 25
  };
}

/**
 * Structure score components
 */
export interface StructureScore {
  overall: number;                // 0-100

  phaseBalance: {
    score: number;
    hasBasePhase: boolean;
    hasBuildPhase: boolean;
    baseTooBrief: boolean;
    buildTooBrief: boolean;
  };

  phaseTransitions: {
    score: number;
    transitionCount: number;
    smoothTransitions: number;
    abruptTransitions: number;
    logicalSequence: boolean;     // Base→Build→Peak order
  };

  phaseLengths: {
    score: number;
    appropriateLengths: number;
    tooShortPhases: number;
    tooLongPhases: number;
  };
}

/**
 * Form management scoring
 * Optional - added for form tracking integration
 */
export interface FormManagementScore {
  overall: number;                // 0-100
  tsbBalanceScore: number;        // TSB appropriateness for phase types
  overreachingManagementScore: number; // Overreaching frequency and placement
  taperEffectivenessScore: number;     // TSB increase before peak phases
  recoveryTimingScore: number;    // Recovery adequacy based on form

  // Detailed metrics
  metrics: {
    avgTSBDeviation: number;      // How far from optimal for each phase
    inappropriateOverreaching: number; // Overreaching in wrong phases
    taperQuality: number;         // TSB rise quality before peaks
    recoveryGaps: number;         // Missing recovery periods
  };

  recommendations: string[];
}

/**
 * Effectiveness analysis
 */
export interface EffectivenessAnalysis {
  overallScore: number;           // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

  // Component scores
  structureScore: StructureScore;
  progressionScore: {
    overall: number;
    volumeProgression: VolumeProgression;
    ctlGain: number;
    ctlGainScore: number;
    recoveryWeeksScore: number;
  };
  recoveryScore: {
    overall: number;
    management: RecoveryManagement;
  };
  performanceScore: {
    overall: number;
    correlation: PerformanceCorrelation;
  };

  /**
   * Form management scoring
   * Optional - added for form tracking integration
   */
  formManagementScore?: FormManagementScore;

  // Balance analysis
  phaseBalance: PhaseBalance;

  // Strengths and weaknesses
  strengths: string[];
  weaknesses: string[];
  criticalIssues: string[];
}

/**
 * Training phase recommendation
 */
export interface PhaseRecommendation {
  recommendedPhase: TrainingPhase;
  currentPhase?: TrainingPhase;
  confidence: number;             // 0-100
  reasoning: string[];

  // Targets for recommended phase
  targets: {
    durationWeeks: { min: number; max: number };
    weeklyVolume?: { min: number; max: number }; // hours
    weeklyTSS?: { min: number; max: number };
    targetTSB?: { min: number; max: number };
    hrZoneEmphasis?: number[];
    intensityDistribution?: {
      lowIntensity: number;       // percentage
      moderateIntensity: number;
      highIntensity: number;
    };
  };

  // Specific actions
  actions: string[];
  cautions: string[];
}

/**
 * Training warning types
 */
export type WarningType =
  | 'rapid_volume_increase'
  | 'chronic_fatigue'
  | 'insufficient_recovery'
  | 'monotonous_training'
  | 'overreaching'
  | 'detraining'
  | 'missing_base_phase'
  | 'inadequate_taper'
  | 'poor_phase_balance';

/**
 * Training warning severity
 */
export type WarningSeverity = 'info' | 'warning' | 'critical';

/**
 * Training warning
 */
export interface TrainingWarning {
  type: WarningType;
  severity: WarningSeverity;
  title: string;
  description: string;
  detectedAt?: string;            // Date or period
  metrics?: Record<string, number>;
  recommendations: string[];
}

/**
 * Complete periodization analysis result
 */
export interface PeriodizationAnalysis {
  period: {
    startDate: string;
    endDate: string;
    totalWeeks: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'insufficient';
  };

  // Detected phases
  phases: DetectedPhase[];

  // Model detection
  detectedModel?: PeriodizationModel;
  modelConfidence?: number;
  modelFit: Record<PeriodizationModel, number>; // Fit score 0-100 for each model

  // Effectiveness analysis
  effectiveness: EffectivenessAnalysis;

  // Recommendations
  recommendations: PhaseRecommendation[];

  // Warnings
  warnings: TrainingWarning[];

  // Summary
  summary: {
    totalActivities: number;
    totalVolume: number;          // hours
    totalDistance: number;        // km
    avgWeeklyTSS: number;
    fitnessGain: number;          // CTL change
    totalPRs: number;
    primaryPhase: TrainingPhase;  // Most time spent
    adherenceToModel?: number;    // 0-100 if model detected
  };
}

/**
 * Periodization analysis query
 */
export interface PeriodizationQuery {
  dateRange: string;              // YYYY-MM-DD/YYYY-MM-DD
  targetModel?: PeriodizationModel; // Optional: analyze against specific model
  customHRZones?: {
    zone1Max: number;
    zone2Max: number;
    zone3Max: number;
    zone4Max: number;
    zone5Max: number;
  };
  includeWarnings?: boolean;      // Default: true
  includeRecommendations?: boolean; // Default: true
  minActivityDuration?: number;   // Filter short activities (seconds)
  maxActivities?: number;         // Limit activities to scan (default: 1000)
}

/**
 * Phase detection configuration
 */
export interface PhaseDetectionConfig {
  minPhaseWeeks: number;          // Minimum phase length (default: 2)
  volumeThresholds: {
    low: number;                  // hours per week
    medium: number;
    high: number;
  };
  intensityThresholds: {
    lowTSS: number;               // TSS per week
    mediumTSS: number;
    highTSS: number;
  };
  confidenceWeights: {
    volume: number;
    intensity: number;
    tss: number;
    duration: number;
  };
}

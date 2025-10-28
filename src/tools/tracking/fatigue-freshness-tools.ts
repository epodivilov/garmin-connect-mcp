/**
 * @fileoverview Fatigue and freshness (form) analysis tools for training readiness optimization
 *
 * Provides comprehensive form/freshness analysis based on Training Stress Balance (TSB), including
 * current state analysis, zone classification (optimal race, fresh, maintenance, productive training,
 * fatigued, overreached), trend analysis, future predictions, taper plan generation, and performance
 * correlation. Form represents the balance between fitness (CTL) and fatigue (ATL), indicating
 * readiness for peak performance or need for recovery. Essential for race preparation, preventing
 * overtraining, and optimizing training timing.
 *
 * NOTE: No summary mode implemented - tools already return optimized data.
 * Different tools serve different purposes (current analysis vs history vs predictions).
 *
 * Tools provided:
 * - getCurrentFormAnalysis: Comprehensive current form analysis with zone classification, trends, and recommendations
 * - getFormHistory: Retrieve historical form data with optional zone filtering and statistics
 * - predictFutureForm: Predict future form based on planned training load
 * - generateTaperPlan: Generate optimal taper plan for race preparation with day-by-day TSS targets
 * - analyzeFormPerformance: Analyze correlation between form state and performance outcomes (PRs)
 *
 * @category Tracking
 * @see ../../services/formZoneClassifier for form zone classification logic
 * @see ../../services/formPredictor for future form predictions
 * @see ../../services/formPerformanceAnalyzer for performance correlation
 * @see ../tracking/training-stress-tools for TSS, CTL, ATL calculations
 */

import { GarminClient } from '../../client/garmin-client.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import type {
  FormAnalysis,
  FormQuery,
  FormSnapshot,
  FormPredictionOptions,
  TaperPlanOptions,
} from '../../types/fatigue-freshness.js';
import type { TrainingStressDataPoint, ActivityTSS, TSSCalculationOptions } from '../../types/training-stress.js';
import type { PRHistoryEntry } from '../../types/personalRecords.js';
import { ToolResult } from '../../types/garmin-types.js';
import { FormZoneClassifier } from '../../services/formZoneClassifier.js';
import { FormTrendAnalyzer } from '../../services/formTrendAnalyzer.js';
import { FormPredictor } from '../../services/formPredictor.js';
import { FormHistoryStorage } from '../../services/formHistoryStorage.js';
import { FormPerformanceAnalyzer } from '../../services/formPerformanceAnalyzer.js';
import { FormRecommendationEngine } from '../../services/formRecommendationEngine.js';
import { PRStorage } from '../../storage/prStorage.js';
import { removeEmptyValues } from '../../utils/data-transforms.js';
import { logger } from '../../utils/logger.js';
import {
  calculateActivityTSS,
  aggregateDailyTSS,
  fillMissingDates,
  calculateTrainingStressBalance
} from '../../utils/tss-calculator.js';
import {
  GetCurrentFormAnalysisParams,
  GetFormHistoryParams,
  PredictFutureFormParams,
  GenerateTaperPlanParams,
  AnalyzeFormPerformanceParams
} from '../../types/tool-params.js';
import { GARMIN_API_DELAY_MS } from '../../constants/apiConfig.js';

export class FatigueFreshnessTools extends BaseAdvancedTool {
  private zoneClassifier: FormZoneClassifier;
  private trendAnalyzer: FormTrendAnalyzer;
  private predictor: FormPredictor;
  private storage: FormHistoryStorage;
  private performanceAnalyzer: FormPerformanceAnalyzer;
  private recommendationEngine: FormRecommendationEngine;
  private prStorage: PRStorage;

  constructor(garminClient: GarminClient) {
    super(garminClient);
    this.zoneClassifier = new FormZoneClassifier();
    this.trendAnalyzer = new FormTrendAnalyzer(this.zoneClassifier);
    this.predictor = new FormPredictor(this.zoneClassifier);
    this.storage = new FormHistoryStorage();
    this.performanceAnalyzer = new FormPerformanceAnalyzer(this.zoneClassifier);
    this.recommendationEngine = new FormRecommendationEngine(this.zoneClassifier);
    this.prStorage = new PRStorage();
  }

  /**
   * Get current form analysis with trends and recommendations
   * @param params - Typed parameters for current form analysis
   */
  async getCurrentFormAnalysis(params: GetCurrentFormAnalysisParams): Promise<ToolResult> {
    try {
      const query: FormQuery = {
        date: params?.date,
        includeTimeSeries: params?.includeTimeSeries !== false,
        includePredictions: params?.includePredictions !== false,
        includePerformanceCorrelation: params?.includePerformanceCorrelation === true,
        includeContext: params?.includeContext === true,
      };

      const targetDate = query.date || new Date().toISOString().split('T')[0];

      // Get training stress data (CTL/ATL/TSB)
      const tssData = await this.getTrainingStressData(targetDate, 90);

      if (!tssData || tssData.length === 0) {
        return this.createErrorResponse(
          JSON.stringify({
            error: 'No training data available for form analysis',
            suggestion: 'Ensure activities are synced and TSS calculation is working'
          }, null, 2)
        );
      }

      // Get current state
      const currentData = tssData[tssData.length - 1];
      const currentTSB = currentData.tsb;
      const currentCTL = currentData.ctl;
      const currentATL = currentData.atl;

      // Classify form zone
      const zoneInfo = this.zoneClassifier.classifyFormZone(currentTSB, currentCTL);

      // Create form snapshots
      const snapshots = await this.createFormSnapshots(tssData);

      // Create current snapshot
      const currentSnapshot: FormSnapshot = {
        date: targetDate,
        tss: currentData.tss,
        ctl: currentCTL,
        atl: currentATL,
        tsb: currentTSB,
        zone: zoneInfo.zone,
        zoneInfo,
        activityCount: 0, // Would need to calculate from activities
        totalDuration: 0,
        changes: {
          tssChange: tssData.length > 1 ? currentData.tss - tssData[tssData.length - 2].tss : 0,
          ctlChange: tssData.length > 1 ? currentCTL - tssData[tssData.length - 2].ctl : 0,
          atlChange: tssData.length > 1 ? currentATL - tssData[tssData.length - 2].atl : 0,
          tsbChange: tssData.length > 1 ? currentTSB - tssData[tssData.length - 2].tsb : 0,
          zoneChanged: false,
        },
      };

      // Analyze trends
      const trends = this.trendAnalyzer.analyzeMultipleTrends(snapshots);

      // Generate predictions if requested
      let predictions;
      if (query.includePredictions) {
        predictions = {
          nextWeek: this.predictor.predictFutureForm({
            targetDate: this.addDays(targetDate, 7),
            plannedTSS: currentCTL * 0.9, // Assume maintenance TSS
            currentCTL,
            currentATL,
            currentTSB,
          }),
          twoWeeks: this.predictor.predictFutureForm({
            targetDate: this.addDays(targetDate, 14),
            plannedTSS: currentCTL * 0.9,
            currentCTL,
            currentATL,
            currentTSB,
          }),
        };
      }

      // Analyze performance correlation if requested
      let performanceCorrelation;
      if (query.includePerformanceCorrelation) {
        const prHistory = await this.prStorage.getAllHistory();
        const allPRs: PRHistoryEntry[] = [];
        for (const categoryHistory of Object.values(prHistory)) {
          allPRs.push(...categoryHistory);
        }

        if (allPRs.length > 0) {
          const startDate = this.addDays(targetDate, -90);
          performanceCorrelation = this.performanceAnalyzer.analyzeCorrelation(
            snapshots,
            allPRs,
            startDate,
            targetDate
          );
        }
      }

      // Generate recommendations
      const recommendationContext = {
        currentZone: zoneInfo.zone,
        currentTSB,
        currentCTL,
        currentATL,
        tsbTrend: trends.week.direction,
        recentZoneChanges: trends.week.zoneChanges.length,
      };

      const recommendation = this.recommendationEngine.generateRecommendation(recommendationContext);

      // Build analysis result
      const analysis: FormAnalysis = {
        analysisDate: targetDate,
        current: currentSnapshot,
        trends,
        performanceCorrelation,
        predictions,
        recommendations: {
          immediate: [recommendation.guidance.primary],
          shortTerm: recommendation.guidance.secondary,
          longTerm: zoneInfo.recommendations.volumeGuidance
            ? [zoneInfo.recommendations.volumeGuidance]
            : [],
        },
        warnings: recommendation.guidance.cautions.map((msg) => ({
          severity: zoneInfo.zone === 'overreached' ? 'critical' as const :
                    zoneInfo.zone === 'fatigued' ? 'warning' as const :
                    'info' as const,
          type: 'form_status',
          message: msg,
        })),
        context: {},
      };

      // Store snapshot
      await this.storage.addSnapshot(currentSnapshot);

      const cleanedData = removeEmptyValues(analysis);

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(
        `Failed to analyze current form: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get form history with optional filtering
   * @param params - Typed parameters for form history retrieval
   */
  async getFormHistory(params: GetFormHistoryParams): Promise<ToolResult> {
    try {
      const dateRange = params?.dateRange; // YYYY-MM-DD/YYYY-MM-DD
      const zone = params?.zone;
      const days = params?.days || 90;

      let snapshots: FormSnapshot[];

      if (dateRange) {
        const [startDate, endDate] = dateRange.split('/');
        snapshots = await this.storage.getSnapshots(startDate, endDate);
      } else {
        snapshots = await this.storage.getRecentSnapshots(days);
      }

      // Filter by zone if specified
      if (zone) {
        snapshots = snapshots.filter((s) => s.zone === zone);
      }

      // Get storage stats
      const stats = await this.storage.getStats();

      const result = {
        snapshots,
        totalDays: snapshots.length,
        period: {
          start: snapshots[0]?.date || '',
          end: snapshots[snapshots.length - 1]?.date || '',
        },
        summary: {
          averageTSB: stats.averageTSB,
          averageCTL: stats.averageCTL,
          averageATL: stats.averageATL,
          zoneDistribution: stats.zoneDistribution,
        },
      };

      const cleanedData = removeEmptyValues(result);

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(
        `Failed to get form history: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Predict future form based on planned training
   * @param params - Typed parameters for future form prediction
   */
  async predictFutureForm(params: PredictFutureFormParams): Promise<ToolResult> {
    try {
      const options: FormPredictionOptions = {
        targetDate: params.targetDate,
        plannedTSS: params.plannedTSS,
        maintainIntensity: params.maintainIntensity !== false,
        recoveryDays: params.recoveryDays || [],
        currentCTL: params.currentCTL,
        currentATL: params.currentATL,
        currentTSB: params.currentTSB,
      };

      // Get current state if not provided
      if (options.currentCTL === undefined) {
        const tssData = await this.getTrainingStressData(
          new Date().toISOString().split('T')[0],
          90
        );

        if (tssData && tssData.length > 0) {
          const current = tssData[tssData.length - 1];
          options.currentCTL = current.ctl;
          options.currentATL = current.atl;
          options.currentTSB = current.tsb;
        } else {
          throw new Error('Unable to determine current training stress state');
        }
      }

      const prediction = this.predictor.predictFutureForm(options);

      const cleanedData = removeEmptyValues(prediction);

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(
        `Failed to predict future form: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate optimal taper plan for race
   * @param params - Typed parameters for taper plan generation
   */
  async generateTaperPlan(params: GenerateTaperPlanParams): Promise<ToolResult> {
    try {
      const options: TaperPlanOptions = {
        raceDate: params.raceDate,
        taperDuration: params.taperDuration || 14,
        targetTSB: params.targetTSB || 17,
        strategy: params.strategy || 'exponential',
        volumeReduction: params.volumeReduction || 50,
        maintainIntensity: params.maintainIntensity !== false,
        currentCTL: params.currentCTL,
        currentATL: params.currentATL,
        currentTSB: params.currentTSB,
      };

      // Get current state if not provided
      if (options.currentCTL === undefined) {
        const tssData = await this.getTrainingStressData(
          new Date().toISOString().split('T')[0],
          90
        );

        if (tssData && tssData.length > 0) {
          const current = tssData[tssData.length - 1];
          options.currentCTL = current.ctl;
          options.currentATL = current.atl;
          options.currentTSB = current.tsb;
        } else {
          throw new Error('Unable to determine current training stress state');
        }
      }

      const taperPlan = this.predictor.generateTaperPlan(options);

      const cleanedData = removeEmptyValues(taperPlan);

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(
        `Failed to generate taper plan: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Analyze form-performance correlation
   * @param params - Typed parameters for form-performance correlation analysis
   */
  async analyzeFormPerformance(params: AnalyzeFormPerformanceParams): Promise<ToolResult> {
    try {
      const dateRange = params?.dateRange || this.getDefaultDateRange(90);
      const [startDate, endDate] = dateRange.split('/');

      // Get form snapshots
      const tssData = await this.getTrainingStressData(endDate, 90);
      if (!tssData || tssData.length === 0) {
        throw new Error('No training stress data available');
      }

      const snapshots = await this.createFormSnapshots(tssData);

      // Get PR history
      const prHistory = await this.prStorage.getAllHistory();
      const allPRs: PRHistoryEntry[] = [];
      for (const categoryHistory of Object.values(prHistory)) {
        allPRs.push(...categoryHistory);
      }

      if (allPRs.length === 0) {
        return this.createSuccessResponse({
          message: 'No personal records found for correlation analysis',
          suggestion: 'Complete more activities to detect PRs'
        });
      }

      // Analyze correlation
      const correlation = this.performanceAnalyzer.analyzeCorrelation(
        snapshots,
        allPRs,
        startDate,
        endDate
      );

      const cleanedData = removeEmptyValues(correlation);

      return this.createSuccessResponse(cleanedData);

    } catch (error) {
      return this.createErrorResponse(
        `Failed to analyze form-performance correlation: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Add days to date string
   */
  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Create form snapshots from TSS data
   */
  private async createFormSnapshots(
    tssData: TrainingStressDataPoint[]
  ): Promise<FormSnapshot[]> {
    const snapshots: FormSnapshot[] = [];

    for (let i = 0; i < tssData.length; i++) {
      const data = tssData[i];
      const zoneInfo = this.zoneClassifier.classifyFormZone(data.tsb, data.ctl);

      const prevZone = i > 0 ?
        this.zoneClassifier.classifyFormZone(tssData[i - 1].tsb, tssData[i - 1].ctl).zone :
        zoneInfo.zone;

      snapshots.push({
        date: data.date,
        tss: data.tss,
        ctl: data.ctl,
        atl: data.atl,
        tsb: data.tsb,
        zone: zoneInfo.zone,
        zoneInfo,
        activityCount: 0, // Would need actual activity count
        totalDuration: 0,
        changes: {
          tssChange: i > 0 ? data.tss - tssData[i - 1].tss : 0,
          ctlChange: i > 0 ? data.ctl - tssData[i - 1].ctl : 0,
          atlChange: i > 0 ? data.atl - tssData[i - 1].atl : 0,
          tsbChange: i > 0 ? data.tsb - tssData[i - 1].tsb : 0,
          zoneChanged: i > 0 && prevZone !== zoneInfo.zone,
          previousZone: i > 0 ? prevZone : undefined,
        },
      });
    }

    return snapshots;
  }

  /**
   * Get default date range
   */
  private getDefaultDateRange(days: number): string {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`;
  }

  /**
   * Get training stress data using actual TSS calculations
   */
  private async getTrainingStressData(
    endDate: string,
    days: number
  ): Promise<TrainingStressDataPoint[]> {
    try {
      // Parse end date
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new Error('Invalid end date format');
      }

      // Calculate start date
      const start = new Date(end);
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Fetch activities in the date range
      const activities = await this.activityFetcher.getActivitiesInRange(start, end);

      if (activities.length === 0) {
        return [];
      }

      // Calculate TSS for each activity
      const activityTSSList: ActivityTSS[] = [];
      const options: TSSCalculationOptions = {
        restingHR: 50,
        maxHR: 185
      };

      for (const activity of activities) {
        try {
          // Get detailed activity data
          const detailedActivity = await this.garminClient.getActivity({
            activityId: activity.activityId
          });

          if (detailedActivity) {
            const activityTSS = calculateActivityTSS(detailedActivity, options);
            activityTSSList.push(activityTSS);
          }

          // Small delay to avoid overwhelming API (GARMIN_API_DELAY_MS)
          await new Promise(resolve => setTimeout(resolve, GARMIN_API_DELAY_MS));
        } catch (error) {
          logger.error(`Error processing activity ${activity.activityId}:`, error);
          continue;
        }
      }

      // Aggregate into daily TSS
      const dailyTSS = aggregateDailyTSS(activityTSSList);

      // Fill missing dates with zero TSS
      const filledDailyTSS = fillMissingDates(dailyTSS, start, end);

      // Calculate CTL, ATL, TSB for each day
      const { timeSeries } = calculateTrainingStressBalance(
        filledDailyTSS,
        end,
        { includeTimeSeries: true }
      );

      return timeSeries;
    } catch (error) {
      logger.error('Error fetching training stress data:', error);
      return [];
    }
  }
}

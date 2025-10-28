/**
 * @fileoverview Sleep-performance correlation analysis tools for understanding recovery impact
 *
 * Provides comprehensive analysis of relationships between sleep quality and athletic performance,
 * including correlation calculations, optimal sleep pattern identification, sleep debt tracking,
 * recovery quality assessment, and poor sleep impact detection. Analyzes sleep duration, deep sleep,
 * REM sleep, sleep quality scores, and correlates with performance metrics (pace, power, PRs).
 * Essential for optimizing recovery strategies, identifying sleep issues impacting performance,
 * and making data-driven sleep recommendations.
 *
 * NOTE: No summary mode implemented - analysis results are already synthesized.
 * Use includeRecovery parameter to control detail level.
 *
 * Tools provided:
 * - getSleepPerformanceCorrelation: Comprehensive analysis with correlations, patterns, debt, impacts, and recommendations
 * - getOptimalSleepPattern: Identify optimal sleep duration and quality for peak performance
 * - getSleepDebtAnalysis: Track accumulated sleep debt and its impact on performance
 * - getRecoveryQuality: Assess daily recovery quality and readiness to train based on sleep
 * - detectPoorSleepImpacts: Identify specific instances where poor sleep negatively impacted performance
 *
 * @category Correlation
 * @see ../../services/sleepDataService for sleep data retrieval
 * @see ../../services/performanceDataService for performance data retrieval
 * @see ../../services/correlationCalculator for correlation algorithms
 * @see ../basic/sleep-tools for detailed sleep data
 */

import { GarminClient } from '../../client/garmin-client.js';
import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import type { SleepPerformanceAnalysis } from '../../types/sleep-correlation.js';
import type { ToolResult } from '../../types/garmin-types.js';
import { fetchSleepData } from '../../services/sleepDataService.js';
import { fetchPerformanceData } from '../../services/performanceDataService.js';
import { calculateSleepPerformanceCorrelation } from '../../services/correlationCalculator.js';
import { identifyOptimalSleepPattern } from '../../services/patternRecognitionService.js';
import { trackSleepDebt } from '../../services/sleepDebtTracker.js';
import { detectPoorSleepImpacts } from '../../services/sleepImpactDetector.js';
import { assessMultipleDaysRecovery } from '../../services/recoveryQualityService.js';
import { analyzeSleepTrends } from '../../services/sleepTrendAnalyzer.js';
import { generateInsights } from '../../services/sleepInsightGenerator.js';
import { generateRecommendations } from '../../services/sleepRecommendationEngine.js';
import { validateDateRange } from '../../utils/parameter-validators.js';
import {
  GetSleepPerformanceCorrelationParams,
  GetOptimalSleepPatternParams,
  GetSleepDebtAnalysisParams,
  GetRecoveryQualityParams,
  DetectPoorSleepImpactsParams
} from '../../types/tool-params.js';

export class SleepCorrelationTools extends BaseAdvancedTool {
  constructor(garminClient: GarminClient) {
    super(garminClient);
  }

  /**
   * Get Sleep-Performance Correlation Analysis
   *
   * Comprehensive analysis of sleep-performance relationships including correlations,
   * optimal patterns, sleep debt, poor sleep impacts, trends, insights, and recommendations.
   *
   * @param params - Sleep-performance correlation parameters
   * @param params.dateRange - Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 30 days)
   * @param params.includeRecovery - Include daily recovery quality assessments (default: true)
   * @param params.maxPoorSleepImpacts - Maximum number of poor sleep impacts to return (default: 10)
   * @returns MCP tool result with comprehensive sleep-performance analysis or error message
   * @throws Error if date range is invalid or Garmin API is unavailable
   *
   * @example
   * ```typescript
   * // Use default date range (last 30 days)
   * const result = await sleepTools.getSleepPerformanceCorrelation({});
   *
   * // Specify custom date range
   * const result = await sleepTools.getSleepPerformanceCorrelation({
   *   dateRange: '2025-09-01/2025-10-13'
   * });
   * ```
   */
  async getSleepPerformanceCorrelation(params: GetSleepPerformanceCorrelationParams): Promise<ToolResult> {
    try {
      // Calculate default date range (last 30 days)
      const defaultEnd = new Date().toISOString().split('T')[0];
      const defaultStart = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })();
      const defaultRange = `${defaultStart}/${defaultEnd}`;

      // Validate and parse date range
      const { start, end } = validateDateRange(params.startDate && params.endDate ? `${params.startDate}/${params.endDate}` : defaultRange);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const includeRecovery = params.includeRecovery !== false;
      const maxPoorSleepImpacts = params.maxPoorSleepImpacts || 10;

      // Fetch data
      const [sleepData, performanceData] = await Promise.all([
        fetchSleepData(this.garminClient, startDate, endDate),
        fetchPerformanceData(this.garminClient, startDate, endDate),
      ]);

      // Calculate correlations
      const correlations = calculateSleepPerformanceCorrelation(sleepData, performanceData);

      // Identify optimal patterns
      const optimalPattern = identifyOptimalSleepPattern(sleepData, performanceData);

      // Track sleep debt
      const sleepDebt = trackSleepDebt(sleepData, performanceData);

      // Detect poor sleep impacts
      const poorSleepImpacts = detectPoorSleepImpacts(sleepData, performanceData, maxPoorSleepImpacts);

      // Analyze trends
      const sleepTrends = analyzeSleepTrends(sleepData, `${startDate} to ${endDate}`);

      // Assess recovery quality
      const recoveryQuality = includeRecovery ? assessMultipleDaysRecovery(sleepData) : [];

      // Generate insights
      const insights = generateInsights(
        correlations,
        optimalPattern,
        sleepDebt,
        poorSleepImpacts,
        sleepTrends
      );

      // Generate recommendations
      const recommendations = generateRecommendations(
        correlations,
        optimalPattern,
        sleepDebt,
        poorSleepImpacts,
        sleepTrends,
        recoveryQuality
      );

      // Calculate data quality metrics
      const dataQuality = {
        totalDays: Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        daysWithSleepData: sleepData.length,
        daysWithPerformanceData: performanceData.length,
        daysWithBothDatasets: correlations.sampleSize,
        dataCompletenessPercent: 0,
      };

      dataQuality.dataCompletenessPercent = Math.round(
        (dataQuality.daysWithBothDatasets / dataQuality.totalDays) * 100
      );

      const result: SleepPerformanceAnalysis = {
        dateRange: {
          start: startDate,
          end: endDate,
        },
        correlations,
        optimalPattern,
        sleepDebt,
        poorSleepImpacts,
        sleepTrends,
        recoveryQuality,
        insights,
        recommendations,
        dataQuality,
      };

      // Validate response size
      if (!this.validateResponseSize(result)) {
        return this.createSizeErrorResponse('Sleep-performance correlation data too large', {
          dateRange: { start: startDate, end: endDate },
          totalDays: dataQuality.totalDays,
          correlationCount: Object.keys(correlations).length,
        });
      }

      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(`Failed to get sleep-performance correlation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Optimal Sleep Pattern
   *
   * Identify optimal sleep patterns for best athletic performance including
   * sleep duration, deep sleep, REM sleep, and quality scores that correlate
   * with peak performance.
   *
   * @param params - Optimal sleep pattern parameters
   * @param params.dateRange - Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 60 days)
   * @returns MCP tool result with optimal sleep pattern or error message
   * @throws Error if date range is invalid or Garmin API is unavailable
   *
   * @example
   * ```typescript
   * // Use default date range (last 60 days)
   * const result = await sleepTools.getOptimalSleepPattern({});
   *
   * // Specify custom date range
   * const result = await sleepTools.getOptimalSleepPattern({
   *   dateRange: '2025-08-01/2025-10-13'
   * });
   * ```
   */
  async getOptimalSleepPattern(params: GetOptimalSleepPatternParams): Promise<ToolResult> {
    try {
      // Calculate default date range (last 60 days)
      const defaultEnd = new Date().toISOString().split('T')[0];
      const defaultStart = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 60);
        return d.toISOString().split('T')[0];
      })();
      const defaultRange = `${defaultStart}/${defaultEnd}`;

      // Validate and parse date range
      const { start, end } = validateDateRange(params.startDate && params.endDate ? `${params.startDate}/${params.endDate}` : defaultRange);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const [sleepData, performanceData] = await Promise.all([
        fetchSleepData(this.garminClient, startDate, endDate),
        fetchPerformanceData(this.garminClient, startDate, endDate),
      ]);

      const optimalPattern = identifyOptimalSleepPattern(sleepData, performanceData);

      const result = {
        dateRange: { start: startDate, end: endDate },
        optimalPattern,
        dataPoints: sleepData.length,
      };

      // Validate response size
      if (!this.validateResponseSize(result)) {
        return this.createSizeErrorResponse('Optimal sleep pattern data too large', {
          dateRange: { start: startDate, end: endDate },
          dataPoints: sleepData.length,
        });
      }

      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(`Failed to get optimal sleep pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Sleep Debt Analysis
   *
   * Track accumulated sleep debt and analyze its impact on performance.
   * Shows current debt, historical maximum, average debt, and estimated
   * recovery time needed.
   *
   * @param params - Sleep debt analysis parameters
   * @param params.dateRange - Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 30 days)
   * @param params.targetDuration - Target sleep duration in minutes (default: 480 = 8 hours)
   * @returns MCP tool result with sleep debt analysis or error message
   * @throws Error if date range is invalid or Garmin API is unavailable
   *
   * @example
   * ```typescript
   * // Use default date range (last 30 days) and target duration (8 hours)
   * const result = await sleepTools.getSleepDebtAnalysis({});
   *
   * // Specify custom date range and target
   * const result = await sleepTools.getSleepDebtAnalysis({
   *   dateRange: '2025-09-01/2025-10-13',
   *   targetDuration: 420
   * });
   * ```
   */
  async getSleepDebtAnalysis(params: GetSleepDebtAnalysisParams): Promise<ToolResult> {
    try {
      // Calculate default date range (last 30 days)
      const defaultEnd = new Date().toISOString().split('T')[0];
      const defaultStart = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })();
      const defaultRange = `${defaultStart}/${defaultEnd}`;

      // Validate and parse date range
      const { start, end } = validateDateRange(params.startDate && params.endDate ? `${params.startDate}/${params.endDate}` : defaultRange);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const targetDuration = params.targetDuration || 480;

      const [sleepData, performanceData] = await Promise.all([
        fetchSleepData(this.garminClient, startDate, endDate),
        fetchPerformanceData(this.garminClient, startDate, endDate),
      ]);

      const sleepDebt = trackSleepDebt(sleepData, performanceData, targetDuration);

      const result = {
        dateRange: { start: startDate, end: endDate },
        targetDurationMinutes: targetDuration,
        sleepDebt,
      };

      // Validate response size
      if (!this.validateResponseSize(result)) {
        return this.createSizeErrorResponse('Sleep debt analysis data too large', {
          dateRange: { start: startDate, end: endDate },
          targetDurationMinutes: targetDuration,
        });
      }

      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(`Failed to get sleep debt analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Recovery Quality
   *
   * Assess recovery quality and readiness to train based on sleep metrics.
   * Provides recovery scores, training intensity recommendations, and
   * readiness assessments.
   *
   * @param params - Recovery quality parameters
   * @param params.date - Date to assess (YYYY-MM-DD format, default: today)
   * @param params.days - Number of recent days to assess (default: 7)
   * @returns MCP tool result with recovery quality assessment or error message
   * @throws Error if date is invalid or Garmin API is unavailable
   *
   * @example
   * ```typescript
   * // Use default (today, last 7 days)
   * const result = await sleepTools.getRecoveryQuality({});
   *
   * // Using date and days
   * const result = await sleepTools.getRecoveryQuality({
   *   date: '2025-10-13',
   *   days: 14
   * });
   * ```
   */
  async getRecoveryQuality(params: GetRecoveryQualityParams): Promise<ToolResult> {
    try {
      // Just use date/days logic (no dateRange parameter in this tool)
      const endDate = params.date || new Date().toISOString().split('T')[0];
      const days = params.days || 7;

      const date = new Date(endDate);
      date.setDate(date.getDate() - days + 1);
      const startDate = date.toISOString().split('T')[0];

      const sleepData = await fetchSleepData(this.garminClient, startDate, endDate);
      const recoveryQuality = assessMultipleDaysRecovery(sleepData);

      const result = {
        dateRange: { start: startDate, end: endDate },
        recoveryAssessments: recoveryQuality,
        summary: {
          averageRecoveryScore: recoveryQuality.length > 0
            ? Math.round(recoveryQuality.reduce((sum, r) => sum + r.recoveryScore, 0) / recoveryQuality.length)
            : 0,
          daysWithOptimalRecovery: recoveryQuality.filter(r => r.status === 'optimal').length,
          daysWithPoorRecovery: recoveryQuality.filter(r => r.status === 'poor').length,
        },
      };

      // Validate response size
      if (!this.validateResponseSize(result)) {
        return this.createSizeErrorResponse('Recovery quality data too large', {
          dateRange: { start: startDate, end: endDate },
          daysAssessed: recoveryQuality.length,
        });
      }

      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(`Failed to get recovery quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect Poor Sleep Impacts
   *
   * Identify specific instances where poor sleep negatively impacted performance.
   * Shows which nights of poor sleep led to performance decreases and which
   * metrics were affected.
   *
   * @param params - Poor sleep impacts detection parameters
   * @param params.dateRange - Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 30 days)
   * @param params.maxImpacts - Maximum number of impacts to return (default: 10)
   * @param params.minSeverity - Minimum severity to include (low, moderate, high)
   * @returns MCP tool result with poor sleep impacts or error message
   * @throws Error if date range is invalid or Garmin API is unavailable
   *
   * @example
   * ```typescript
   * // Use default date range (last 30 days)
   * const result = await sleepTools.detectPoorSleepImpacts({});
   *
   * // Filter by severity and limit results
   * const result = await sleepTools.detectPoorSleepImpacts({
   *   dateRange: '2025-09-01/2025-10-13',
   *   minSeverity: 'moderate',
   *   maxImpacts: 5
   * });
   * ```
   */
  async detectPoorSleepImpacts(params: DetectPoorSleepImpactsParams): Promise<ToolResult> {
    try {
      // Calculate default date range (last 30 days)
      const defaultEnd = new Date().toISOString().split('T')[0];
      const defaultStart = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })();
      const defaultRange = `${defaultStart}/${defaultEnd}`;

      // Validate and parse date range
      const { start, end } = validateDateRange(params.startDate && params.endDate ? `${params.startDate}/${params.endDate}` : defaultRange);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const maxImpacts = params.maxImpacts || 10;

      const [sleepData, performanceData] = await Promise.all([
        fetchSleepData(this.garminClient, startDate, endDate),
        fetchPerformanceData(this.garminClient, startDate, endDate),
      ]);

      let impacts = detectPoorSleepImpacts(sleepData, performanceData, maxImpacts);

      // Filter by minimum severity if specified
      if (params.minSeverity) {
        const severityOrder = { low: 0, moderate: 1, high: 2 };
        const minLevel = severityOrder[params.minSeverity];

        impacts = impacts.filter(impact => severityOrder[impact.severity] >= minLevel);
      }

      const result = {
        dateRange: { start: startDate, end: endDate },
        impacts,
        summary: {
          totalImpacts: impacts.length,
          highSeverity: impacts.filter(i => i.severity === 'high').length,
          moderateSeverity: impacts.filter(i => i.severity === 'moderate').length,
          lowSeverity: impacts.filter(i => i.severity === 'low').length,
          avgPerformanceDecrease: impacts.length > 0
            ? Math.round(impacts.reduce((sum, i) => sum + i.performanceDecreasePercent, 0) / impacts.length * 10) / 10
            : 0,
        },
      };

      // Validate response size
      if (!this.validateResponseSize(result)) {
        return this.createSizeErrorResponse('Poor sleep impacts data too large', {
          dateRange: { start: startDate, end: endDate },
          totalImpacts: impacts.length,
        });
      }

      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(`Failed to detect poor sleep impacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

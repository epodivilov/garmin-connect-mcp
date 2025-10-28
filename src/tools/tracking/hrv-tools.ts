/**
 * @fileoverview Heart rate variability (HRV) tracking and readiness assessment tools
 *
 * Provides comprehensive HRV monitoring including trend analysis, baseline calculation, anomaly
 * detection, and readiness scoring. Analyzes HRV data from sleep, calculates rolling averages
 * (weekly, monthly), establishes baseline with confidence intervals, detects anomalies (drops
 * below baseline), and combines HRV with other metrics for readiness assessment. Essential for
 * monitoring recovery, detecting overtraining, and optimizing training readiness.
 *
 * Tools provided:
 * - getHRVTrends: Analyze HRV trends with rolling averages and baseline deviations
 * - getReadinessScore: Calculate comprehensive readiness combining HRV, sleep, TSB, RHR, and body battery
 * - getHRVBaseline: Calculate baseline HRV statistics with confidence intervals and weekly patterns
 * - getHRVAnomalies: Detect and analyze HRV anomalies with severity classification and recovery estimates
 *
 * @category Tracking
 * @see ../../services/hrvStorageService for HRV data persistence
 * @see ../../services/hrvBaselineCalculator for baseline calculations
 * @see ../../services/hrvAnomalyDetector for anomaly detection algorithms
 * @see ../../services/readinessScorer for readiness score calculation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseAdvancedTool } from '../base/BaseAdvancedTool.js';
import { HRVStorageService } from '../../services/hrvStorageService.js';
import { HRVBaselineCalculator } from '../../services/hrvBaselineCalculator.js';
import { HRVAnomalyDetector } from '../../services/hrvAnomalyDetector.js';
import { ReadinessScorer } from '../../services/readinessScorer.js';
import type { HRVMeasurement } from '../../types/hrv-tracking.js';
import type { ReadinessInput } from '../../types/readiness.js';
import type { ToolResult } from '../../types/garmin-types.js';
import { validateDateRange } from '../../utils/parameter-validators.js';
import {
  GetHRVTrendsParams,
  GetReadinessScoreParams,
  GetHRVBaselineParams,
  GetHRVAnomaliesParams
} from '../../types/tool-params.js';

/**
 * HRV tracking and readiness assessment tools class
 */
export class HRVTools extends BaseAdvancedTool {
  /**
   * Get HRV Anomalies
   *
   * Detect and analyze HRV anomalies
   */
  async getHRVAnomalies(params: GetHRVAnomaliesParams): Promise<ToolResult> {
    try {
      const days = params.days || 7;
      const syncFromGarmin = params.syncFromGarmin !== false;

      // Initialize services
      const storage = new HRVStorageService();
      const calculator = new HRVBaselineCalculator();
      const detector = new HRVAnomalyDetector();

      // Sync data if requested
      if (syncFromGarmin) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = (() => {
          const date = new Date();
          date.setDate(date.getDate() - days);
          return date.toISOString().split('T')[0];
        })();

        await this.syncHRVData(storage, startDate, endDate);
      }

      // Get measurements and calculate baseline
      const measurements = await storage.getAllMeasurements();
      const baseline = calculator.calculate(measurements);

      if (!baseline) {
        return this.createErrorResponse(
          'Insufficient HRV data for anomaly detection (minimum 14 days required)'
        );
      }

      // Detect anomalies
      const anomalies = detector.detectAnomalies(measurements, baseline, days);
      const hasActiveAnomaly = detector.hasActiveAnomaly(anomalies);
      const mostSevere = detector.getMostSevereAnomaly(anomalies);

      return this.createSuccessResponse({
        anomaliesDetected: anomalies.length,
        hasActiveAnomaly,
        mostSevereAnomaly: mostSevere
          ? {
              date: mostSevere.date,
              severity: mostSevere.severity,
              deviation: Math.round(mostSevere.deviation * 10) / 10,
              consecutiveDaysLow: mostSevere.consecutiveDaysLow,
              estimatedRecoveryDays: mostSevere.estimatedRecoveryDays,
            }
          : undefined,
        anomalies: anomalies.map((a) => ({
          date: a.date,
          value: a.value,
          expectedValue: Math.round(a.expectedValue),
          deviation: Math.round(a.deviation * 10) / 10,
          severity: a.severity,
          consecutiveDaysLow: a.consecutiveDaysLow,
          velocity: {
            value: Math.round(a.velocity.value * 10) / 10,
            classification: a.velocity.classification,
          },
          correlations: a.correlations,
          estimatedRecoveryDays: a.estimatedRecoveryDays,
        })),
        baseline: {
          value: Math.round(baseline.baseline),
          confidenceInterval: {
            lower: Math.round(baseline.confidenceInterval.lower),
            upper: Math.round(baseline.confidenceInterval.upper),
          },
        },
      });
    } catch (error) {
      return this.createErrorResponse(
        `Failed to get HRV anomalies: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get HRV Baseline
   *
   * Calculate baseline HRV statistics
   */
  async getHRVBaseline(params: GetHRVBaselineParams): Promise<ToolResult> {
    try {
      const syncFromGarmin = params.syncFromGarmin !== false;
      const days = params.days || 28;

      // Initialize services
      const storage = new HRVStorageService();
      const calculator = new HRVBaselineCalculator();

      // Sync data if requested
      if (syncFromGarmin) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = (() => {
          const date = new Date();
          date.setDate(date.getDate() - days);
          return date.toISOString().split('T')[0];
        })();

        await this.syncHRVData(storage, startDate, endDate);
      }

      // Calculate baseline
      const measurements = await storage.getAllMeasurements();
      const baseline = calculator.calculate(measurements);

      if (!baseline) {
        return this.createErrorResponse(
          'Insufficient HRV data for baseline calculation (minimum 14 days required)'
        );
      }

      // Get day names for weekly pattern
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      return this.createSuccessResponse({
        baseline: Math.round(baseline.baseline),
        iqr: Math.round(baseline.iqr * 10) / 10,
        confidenceInterval: {
          lower: Math.round(baseline.confidenceInterval.lower),
          upper: Math.round(baseline.confidenceInterval.upper),
        },
        weeklyPattern: baseline.weeklyPattern.map((p) => ({
          dayOfWeek: dayNames[p.dayOfWeek],
          average: Math.round(p.average),
          stdDev: Math.round(p.stdDev * 10) / 10,
        })),
        evolution: baseline.evolution.map((e) => ({
          date: e.date,
          baseline: Math.round(e.baseline),
        })),
        daysAnalyzed: baseline.daysAnalyzed,
        dateRange: baseline.dateRange,
      });
    } catch (error) {
      return this.createErrorResponse(
        `Failed to get HRV baseline: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get HRV Trends
   *
   * Historical HRV trend analysis with rolling averages
   *
   * @example
   * // Use default date range (last 30 days)
   * getHRVTrends({})
   *
   * // Specify custom date range
   * getHRVTrends({ startDate: '2025-09-01', endDate: '2025-10-13' })
   */
  async getHRVTrends(params: GetHRVTrendsParams): Promise<ToolResult> {
    try {
      // Default date range: last 30 days
      const defaultEnd = new Date().toISOString().split('T')[0];
      const defaultStart = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })();
      const defaultRange = `${defaultStart}/${defaultEnd}`;

      // Validate and parse date range from startDate/endDate params
      const dateRangeStr = params.startDate && params.endDate
        ? `${params.startDate}/${params.endDate}`
        : defaultRange;
      const { start, end } = validateDateRange(dateRangeStr);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const syncFromGarmin = params.syncFromGarmin !== false;

      // Initialize services
      const storage = new HRVStorageService();
      const calculator = new HRVBaselineCalculator();

      // Sync data from Garmin if requested
      if (syncFromGarmin) {
        await this.syncHRVData(storage, startDate, endDate);
      }

      // Get data points with rolling averages
      const dataPoints = await storage.getDataPoints(startDate, endDate);

      if (dataPoints.length === 0) {
        return this.createErrorResponse('No HRV data available for the specified date range');
      }

      // Calculate baseline
      const allMeasurements = await storage.getAllMeasurements();
      const baseline = calculator.calculate(allMeasurements);

      // Add baseline deviations to data points
      if (baseline) {
        for (const point of dataPoints) {
          point.baselineDeviation = calculator.calculateDeviation(
            point.value,
            baseline.baseline
          );
        }
      }

      // Get current and calculate trends
      const current = dataPoints[dataPoints.length - 1];
      const weeklyData = dataPoints.slice(-7);
      const monthlyData = dataPoints.slice(-28);

      const weeklyAvg =
        weeklyData.reduce((sum, d) => sum + d.value, 0) / weeklyData.length;
      const monthlyAvg =
        monthlyData.reduce((sum, d) => sum + d.value, 0) / monthlyData.length;

      // Calculate trend direction
      const calculateTrendDirection = (
        recent: number,
        previous: number
      ): 'increasing' | 'decreasing' | 'stable' => {
        const change = ((recent - previous) / previous) * 100;
        if (change > 5) return 'increasing';
        if (change < -5) return 'decreasing';
        return 'stable';
      };

      const weeklyChange = weeklyData.length > 1
        ? ((weeklyAvg - weeklyData[0].value) / weeklyData[0].value) * 100
        : 0;

      const monthlyChange = monthlyData.length > 1
        ? ((monthlyAvg - monthlyData[0].value) / monthlyData[0].value) * 100
        : 0;

      return this.createSuccessResponse({
        dateRange: { start: startDate, end: endDate },
        current: current.value,
        weeklyTrend: {
          average: Math.round(weeklyAvg),
          change: Math.round(weeklyChange * 10) / 10,
          direction: calculateTrendDirection(weeklyAvg, weeklyData[0]?.value || weeklyAvg),
        },
        monthlyTrend: {
          average: Math.round(monthlyAvg),
          change: Math.round(monthlyChange * 10) / 10,
          direction: calculateTrendDirection(monthlyAvg, monthlyData[0]?.value || monthlyAvg),
        },
        baseline: baseline
          ? {
              value: Math.round(baseline.baseline),
              currentDeviation: calculator.calculateDeviation(current.value, baseline.baseline),
            }
          : undefined,
        history: dataPoints.map((d) => ({
          date: d.date,
          value: d.value,
          weeklyAverage: Math.round(d.weeklyAverage),
          monthlyAverage: Math.round(d.monthlyAverage),
          baselineDeviation: d.baselineDeviation
            ? Math.round(d.baselineDeviation * 10) / 10
            : undefined,
        })),
        dataPoints: dataPoints.length,
      });
    } catch (error) {
      return this.createErrorResponse(
        `Failed to get HRV trends: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get Readiness Score
   *
   * Comprehensive readiness assessment combining multiple metrics
   */
  async getReadinessScore(params: GetReadinessScoreParams): Promise<ToolResult> {
    try {
      const date = params.date || new Date().toISOString().split('T')[0];
      const syncFromGarmin = params.syncFromGarmin !== false;

      // Initialize services
      const storage = new HRVStorageService();
      const calculator = new HRVBaselineCalculator();
      const scorer = new ReadinessScorer();

      // Sync HRV data if requested
      if (syncFromGarmin) {
        const weekAgo = new Date(date);
        weekAgo.setDate(weekAgo.getDate() - 7);
        await this.syncHRVData(storage, weekAgo.toISOString().split('T')[0], date);
      }

      // Fetch all required data
      const [sleepData, heartData, hrvMeasurements] = await Promise.all([
        this.garminClient.getSleepData(new Date(date)).catch(() => null),
        this.garminClient.getHeartRate(new Date(date)).catch(() => null),
        storage.getMeasurements(date, date),
      ]);

      // Get HRV baseline
      const allMeasurements = await storage.getAllMeasurements();
      const baseline = calculator.calculate(allMeasurements);

      // Prepare readiness input
      const input: ReadinessInput = {
        date,
        hrv: hrvMeasurements[0]?.value,
        hrvBaseline: baseline?.baseline,
        sleepScore: (sleepData as any)?.sleepScores?.overall?.value,
        restingHeartRate: (heartData as any)?.restingHeartRate,
        restingHeartRateBaseline: 60, // TODO: Calculate from historical data
        bodyBattery: undefined, // Body battery not available from current API methods
        // TSB would come from training stress service if available
      };

      // Calculate readiness score
      const readiness = scorer.calculate(input);

      return this.createSuccessResponse({
        date,
        readiness: {
          overall: readiness.overall,
          metrics: {
            hrv: {
              ...readiness.metrics.hrv,
              score: Math.round(readiness.metrics.hrv.score),
            },
            sleep: {
              ...readiness.metrics.sleep,
              score: Math.round(readiness.metrics.sleep.score),
            },
            trainingStressBalance: {
              ...readiness.metrics.trainingStressBalance,
              score: Math.round(readiness.metrics.trainingStressBalance.score),
            },
            restingHeartRate: {
              ...readiness.metrics.restingHeartRate,
              score: Math.round(readiness.metrics.restingHeartRate.score),
            },
            bodyBattery: {
              ...readiness.metrics.bodyBattery,
              score: Math.round(readiness.metrics.bodyBattery.score),
            },
          },
          recommendation: readiness.recommendation,
          factors: readiness.factors,
        },
      });
    } catch (error) {
      return this.createErrorResponse(
        `Failed to get readiness score: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Helper: Fetch HRV data from Garmin Connect sleep data
   */
  private async fetchHRVFromGarmin(date: string): Promise<number | undefined> {
    try {
      // HRV is typically found in sleep data
      const sleepData = await this.garminClient.getSleepData(new Date(date));
      // Try to extract HRV from various possible fields
      if (typeof sleepData === 'number') return sleepData;
      if ((sleepData as any)?.hrvSummary?.lastNightAvg) return (sleepData as any).hrvSummary.lastNightAvg;
      if ((sleepData as any)?.hrvValue) return (sleepData as any).hrvValue;
      if ((sleepData as any)?.lastNightAvg) return (sleepData as any).lastNightAvg;
      if ((sleepData as any)?.weeklyAvg) return (sleepData as any).weeklyAvg;
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Helper: Sync HRV data from Garmin to local storage
   */
  private async syncHRVData(
    storage: HRVStorageService,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    // Generate date range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    // Fetch HRV for each date
    const promises = dates.map(async (date) => {
      const hrv = await this.fetchHRVFromGarmin(date);
      if (hrv !== undefined) {
        // Also fetch context data
        try {
          const [sleepData, heartData] = await Promise.all([
            this.garminClient.getSleepData(new Date(date)).catch(() => null),
            this.garminClient.getHeartRate(new Date(date)).catch(() => null),
          ]);

          const measurement: HRVMeasurement = {
            date,
            value: hrv,
            quality: 1.0,
            context: {
              sleepScore: (sleepData as any)?.sleepScores?.overall?.value,
              restingHeartRate: (heartData as any)?.restingHeartRate,
              // Note: body battery not available from current API methods
            },
          };

          await storage.addMeasurement(measurement);
        } catch {
          // Store without context
          await storage.addMeasurement({ date, value: hrv });
        }
      }
    });

    await Promise.all(promises);
  }
}

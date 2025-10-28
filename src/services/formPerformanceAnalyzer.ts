/**
 * Form-Performance Correlation Analyzer
 *
 * Analyzes correlation between form (TSB) and performance (PRs).
 * Identifies optimal form zones for peak performance.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  FormPerformanceCorrelation,
  FormZone,
  FormSnapshot,
} from '../types/fatigue-freshness.js';
import type { PRHistoryEntry } from '../types/personalRecords.js';
import { FormZoneClassifier } from './formZoneClassifier.js';

/**
 * Form-Performance Analyzer Service
 */
export class FormPerformanceAnalyzer {
  private zoneClassifier: FormZoneClassifier;

  constructor(zoneClassifier?: FormZoneClassifier) {
    this.zoneClassifier = zoneClassifier || new FormZoneClassifier();
  }

  /**
   * Get zone classifier (for testing)
   */
  getZoneClassifier(): FormZoneClassifier {
    return this.zoneClassifier;
  }

  /**
   * Analyze correlation between form and performance
   */
  analyzeCorrelation(
    formSnapshots: FormSnapshot[],
    prHistory: PRHistoryEntry[],
    startDate: string,
    endDate: string
  ): FormPerformanceCorrelation {
    // Filter data to date range
    const filteredSnapshots = formSnapshots.filter(
      (s) => s.date >= startDate && s.date <= endDate
    );

    const filteredPRs = prHistory.filter((pr) => {
      const prDate = pr.timestamp.split('T')[0];
      return prDate >= startDate && prDate <= endDate;
    });

    if (filteredSnapshots.length === 0 || filteredPRs.length === 0) {
      return this.createEmptyCorrelation(startDate, endDate);
    }

    // Calculate performance by zone
    const performanceByZone = this.calculatePerformanceByZone(
      filteredSnapshots,
      filteredPRs
    );

    // Identify optimal zones
    const optimalZones = this.identifyOptimalZones(performanceByZone);

    // Calculate TSB correlation
    const tsbCorrelation = this.calculateTSBCorrelation(
      filteredSnapshots,
      filteredPRs
    );

    // Generate insights
    const insights = this.generateInsights(
      performanceByZone,
      optimalZones,
      tsbCorrelation
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      optimalZones,
      tsbCorrelation
    );

    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      period: {
        startDate,
        endDate,
        days,
      },
      performanceByZone,
      optimalZones,
      tsbCorrelation,
      insights,
      recommendations,
    };
  }

  /**
   * Find optimal TSB for a specific performance goal
   */
  findOptimalTSBForGoal(
    formSnapshots: FormSnapshot[],
    prHistory: PRHistoryEntry[],
    goal: 'race' | 'training_breakthrough' | 'consistent_performance'
  ): {
    optimalTSBRange: { min: number; max: number };
    optimalZone: FormZone;
    confidence: number;
    supportingData: {
      prCount: number;
      avgImprovement: number;
      successRate: number;
    };
  } {
    // Map PRs to their TSB values
    const prTSBData = this.matchPRsWithFormSnapshots(formSnapshots, prHistory);

    if (prTSBData.length === 0) {
      return {
        optimalTSBRange: { min: 10, max: 25 }, // Default optimal race zone
        optimalZone: 'optimal_race',
        confidence: 0,
        supportingData: {
          prCount: 0,
          avgImprovement: 0,
          successRate: 0,
        },
      };
    }

    // Analyze TSB distribution for PRs
    const tsbValues = prTSBData.map((d) => d.tsb);
    const improvements = prTSBData
      .filter((d) => d.improvement !== undefined)
      .map((d) => Math.abs(d.improvement!));

    const avgTSB = this.calculateMean(tsbValues);
    const stdDevTSB = this.calculateStandardDeviation(tsbValues);

    // Define optimal range based on goal
    let optimalTSBRange: { min: number; max: number };
    let optimalZone: FormZone;

    switch (goal) {
      case 'race':
        // For races, look for TSB in optimal race zone
        optimalTSBRange = {
          min: Math.max(avgTSB - stdDevTSB, 10),
          max: Math.min(avgTSB + stdDevTSB, 25),
        };
        optimalZone = 'optimal_race';
        break;
      case 'training_breakthrough':
        // For training breakthroughs, slightly more fatigued
        optimalTSBRange = {
          min: Math.max(avgTSB - stdDevTSB, -10),
          max: Math.min(avgTSB + stdDevTSB, 10),
        };
        optimalZone = 'maintenance';
        break;
      case 'consistent_performance':
        // For consistent performance, balanced state
        optimalTSBRange = {
          min: Math.max(avgTSB - stdDevTSB * 1.5, -5),
          max: Math.min(avgTSB + stdDevTSB * 1.5, 15),
        };
        optimalZone = 'maintenance';
        break;
    }

    // Calculate confidence
    const prCount = prTSBData.length;
    const confidence = Math.min(100, prCount * 10); // 10% per PR, max 100%

    // Calculate success rate (PRs in optimal range)
    const prsInOptimalRange = prTSBData.filter(
      (d) => d.tsb >= optimalTSBRange.min && d.tsb <= optimalTSBRange.max
    ).length;
    const successRate = (prsInOptimalRange / prCount) * 100;

    const avgImprovement =
      improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0;

    return {
      optimalTSBRange,
      optimalZone,
      confidence,
      supportingData: {
        prCount,
        avgImprovement,
        successRate,
      },
    };
  }

  /**
   * Calculate performance probability by zone
   */
  calculatePerformanceProbability(
    formSnapshots: FormSnapshot[],
    prHistory: PRHistoryEntry[]
  ): Record<FormZone, {
    prProbability: number;
    avgPRsPerWeek: number;
    qualityScore: number;
  }> {
    const performanceByZone = this.calculatePerformanceByZone(
      formSnapshots,
      prHistory
    );

    const result: Record<FormZone, {
      prProbability: number;
      avgPRsPerWeek: number;
      qualityScore: number;
    }> = {} as any;

    for (const [zone, data] of Object.entries(performanceByZone)) {
      const daysInZone = data.daysInZone;
      const totalPRs = data.totalPRs;

      // Calculate PRs per week
      const avgPRsPerWeek = daysInZone > 0 ? (totalPRs / daysInZone) * 7 : 0;

      // Calculate PR probability (percentage chance of PR on any given day)
      const prProbability = daysInZone > 0 ? (totalPRs / daysInZone) * 100 : 0;

      // Quality score based on density and improvement
      const qualityScore = this.calculateQualityScore(data);

      result[zone as FormZone] = {
        prProbability,
        avgPRsPerWeek,
        qualityScore,
      };
    }

    return result;
  }

  /**
   * Calculate performance by zone
   */
  private calculatePerformanceByZone(
    snapshots: FormSnapshot[],
    prHistory: PRHistoryEntry[]
  ): FormPerformanceCorrelation['performanceByZone'] {
    // Initialize zone data
    const zoneData: FormPerformanceCorrelation['performanceByZone'] = {
      optimal_race: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
      fresh: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
      maintenance: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
      productive_training: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
      fatigued: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
      overreached: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
    };

    // Count days in each zone
    for (const snapshot of snapshots) {
      zoneData[snapshot.zone].daysInZone++;
    }

    // Match PRs with form snapshots
    const prTSBData = this.matchPRsWithFormSnapshots(snapshots, prHistory);

    // Aggregate PRs by zone
    const tsbSumByZone: Record<FormZone, number> = {
      optimal_race: 0,
      fresh: 0,
      maintenance: 0,
      productive_training: 0,
      fatigued: 0,
      overreached: 0,
    };

    for (const data of prTSBData) {
      const zone = data.zone;
      zoneData[zone].totalPRs++;
      tsbSumByZone[zone] += data.tsb;

      zoneData[zone].prs.push({
        categoryId: data.pr.categoryId,
        categoryName: data.pr.categoryId, // Would need category name lookup
        date: data.pr.timestamp.split('T')[0],
        tsb: data.tsb,
        improvement: data.improvement || 0,
      });
    }

    // Calculate averages and densities
    for (const zone of Object.keys(zoneData) as FormZone[]) {
      const data = zoneData[zone];

      if (data.totalPRs > 0) {
        data.avgTSB = Math.round((tsbSumByZone[zone] / data.totalPRs) * 10) / 10;
      }

      if (data.daysInZone > 0) {
        data.prDensity = Math.round((data.totalPRs / data.daysInZone) * 1000) / 1000;
      }
    }

    return zoneData;
  }

  /**
   * Match PRs with form snapshots to get TSB values
   */
  private matchPRsWithFormSnapshots(
    snapshots: FormSnapshot[],
    prHistory: PRHistoryEntry[]
  ): Array<{
    pr: PRHistoryEntry;
    tsb: number;
    zone: FormZone;
    improvement?: number;
  }> {
    const snapshotMap = new Map<string, FormSnapshot>();
    for (const snapshot of snapshots) {
      snapshotMap.set(snapshot.date, snapshot);
    }

    const matched: Array<{
      pr: PRHistoryEntry;
      tsb: number;
      zone: FormZone;
      improvement?: number;
    }> = [];

    for (const pr of prHistory) {
      const prDate = pr.timestamp.split('T')[0];
      const snapshot = snapshotMap.get(prDate);

      if (snapshot) {
        matched.push({
          pr,
          tsb: snapshot.tsb,
          zone: snapshot.zone,
          improvement: pr.improvement?.percentage,
        });
      }
    }

    return matched;
  }

  /**
   * Identify optimal zones for performance
   */
  private identifyOptimalZones(
    performanceByZone: FormPerformanceCorrelation['performanceByZone']
  ): FormPerformanceCorrelation['optimalZones'] {
    const zones: FormPerformanceCorrelation['optimalZones'] = [];

    // Score each zone
    for (const [zone, data] of Object.entries(performanceByZone)) {
      const score = this.calculateZoneScore(data);

      zones.push({
        zone: zone as FormZone,
        score,
        reasoning: this.generateZoneReasoning(zone as FormZone, data, score),
      });
    }

    // Sort by score descending
    zones.sort((a, b) => b.score - a.score);

    return zones;
  }

  /**
   * Calculate zone score for optimal performance
   */
  private calculateZoneScore(
    zoneData: FormPerformanceCorrelation['performanceByZone'][FormZone]
  ): number {
    if (zoneData.daysInZone === 0) {
      return 0;
    }

    // Factors:
    // 1. PR density (weight: 50)
    // 2. Total PRs (weight: 30)
    // 3. Days in zone (weight: 20)

    const densityScore = Math.min(zoneData.prDensity * 1000, 50); // Cap at 50
    const totalPRScore = Math.min((zoneData.totalPRs / 10) * 30, 30); // Cap at 30
    const daysScore = Math.min((zoneData.daysInZone / 100) * 20, 20); // Cap at 20

    return Math.round(densityScore + totalPRScore + daysScore);
  }

  /**
   * Calculate quality score for zone performance
   */
  private calculateQualityScore(
    zoneData: FormPerformanceCorrelation['performanceByZone'][FormZone]
  ): number {
    if (zoneData.totalPRs === 0) {
      return 0;
    }

    // Calculate average improvement
    const improvements = zoneData.prs
      .map((pr) => Math.abs(pr.improvement))
      .filter((imp) => !isNaN(imp));

    const avgImprovement =
      improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0;

    // Quality = density * improvement factor
    const improvementFactor = Math.min(avgImprovement / 5, 2); // Cap at 2x
    return Math.round(zoneData.prDensity * 100 * (1 + improvementFactor));
  }

  /**
   * Generate reasoning for zone score
   */
  private generateZoneReasoning(
    zone: FormZone,
    data: FormPerformanceCorrelation['performanceByZone'][FormZone],
    score: number
  ): string {
    if (data.totalPRs === 0) {
      return `No PRs achieved in ${zone} zone`;
    }

    const parts: string[] = [];

    parts.push(`${data.totalPRs} PRs in ${data.daysInZone} days`);
    parts.push(`Density: ${(data.prDensity * 100).toFixed(1)}% per day`);

    if (score >= 70) {
      parts.push('(excellent performance zone)');
    } else if (score >= 50) {
      parts.push('(good performance zone)');
    } else if (score >= 30) {
      parts.push('(moderate performance zone)');
    } else {
      parts.push('(low performance zone)');
    }

    return parts.join(' ');
  }

  /**
   * Calculate TSB correlation with performance
   */
  private calculateTSBCorrelation(
    snapshots: FormSnapshot[],
    prHistory: PRHistoryEntry[]
  ): FormPerformanceCorrelation['tsbCorrelation'] {
    const prTSBData = this.matchPRsWithFormSnapshots(snapshots, prHistory);

    if (prTSBData.length === 0) {
      return {
        coefficient: 0,
        significance: 'none',
        optimalTSBRange: { min: 10, max: 25 },
      };
    }

    // Calculate correlation coefficient (Pearson)
    const tsbValues = prTSBData.map((d) => d.tsb);
    const improvements = prTSBData.map((d) => Math.abs(d.improvement || 0));

    const coefficient = this.calculateCorrelationCoefficient(tsbValues, improvements);

    // Determine significance
    const significance = this.determineSignificance(Math.abs(coefficient));

    // Calculate optimal TSB range (where most PRs occur)
    const avgTSB = this.calculateMean(tsbValues);
    const stdDev = this.calculateStandardDeviation(tsbValues);

    const optimalTSBRange = {
      min: Math.round((avgTSB - stdDev) * 10) / 10,
      max: Math.round((avgTSB + stdDev) * 10) / 10,
    };

    return {
      coefficient: Math.round(coefficient * 1000) / 1000,
      significance,
      optimalTSBRange,
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelationCoefficient(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const meanX = this.calculateMean(x);
    const meanY = this.calculateMean(y);

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;

      numerator += diffX * diffY;
      sumXSquared += diffX * diffX;
      sumYSquared += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  /**
   * Determine correlation significance
   */
  private determineSignificance(absCoefficient: number): 'strong' | 'moderate' | 'weak' | 'none' {
    if (absCoefficient >= 0.7) {
      return 'strong';
    } else if (absCoefficient >= 0.4) {
      return 'moderate';
    } else if (absCoefficient >= 0.2) {
      return 'weak';
    } else {
      return 'none';
    }
  }

  /**
   * Calculate mean
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = this.calculateMean(squaredDiffs);

    return Math.sqrt(variance);
  }

  /**
   * Generate insights from correlation analysis
   */
  private generateInsights(
    performanceByZone: FormPerformanceCorrelation['performanceByZone'],
    optimalZones: FormPerformanceCorrelation['optimalZones'],
    tsbCorrelation: FormPerformanceCorrelation['tsbCorrelation']
  ): string[] {
    const insights: string[] = [];

    // Top performing zone
    if (optimalZones.length > 0 && optimalZones[0].score > 0) {
      const topZone = optimalZones[0];
      insights.push(
        `Best performance in ${topZone.zone} zone with ${performanceByZone[topZone.zone].totalPRs} PRs`
      );
    }

    // TSB correlation
    if (tsbCorrelation.significance !== 'none') {
      insights.push(
        `${tsbCorrelation.significance} correlation (${tsbCorrelation.coefficient}) between TSB and performance`
      );
    }

    // Optimal TSB range
    insights.push(
      `Optimal TSB range: ${tsbCorrelation.optimalTSBRange.min} to ${tsbCorrelation.optimalTSBRange.max}`
    );

    // Zone-specific insights
    const freshPRs = performanceByZone.fresh.totalPRs;
    const optimalPRs = performanceByZone.optimal_race.totalPRs;
    const fatiguedPRs = performanceByZone.fatigued.totalPRs;

    if (optimalPRs > freshPRs * 2) {
      insights.push('Peak performance occurs with optimal race freshness, not excessive rest');
    } else if (freshPRs > optimalPRs) {
      insights.push('Best results achieved when very fresh - consider longer taper');
    }

    if (fatiguedPRs > optimalPRs) {
      insights.push('Achieving PRs while fatigued - strong base fitness');
    }

    return insights;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    optimalZones: FormPerformanceCorrelation['optimalZones'],
    tsbCorrelation: FormPerformanceCorrelation['tsbCorrelation']
  ): string[] {
    const recommendations: string[] = [];

    if (optimalZones.length === 0 || optimalZones[0].score === 0) {
      recommendations.push('Insufficient performance data for specific recommendations');
      return recommendations;
    }

    const topZone = optimalZones[0].zone;

    // Zone-based recommendations
    switch (topZone) {
      case 'optimal_race':
        recommendations.push('Target TSB 10-25 for key performances');
        recommendations.push('Plan taper to reach optimal zone on race day');
        break;
      case 'fresh':
        recommendations.push('Best performance when very fresh (TSB > 25)');
        recommendations.push('Consider longer tapers before important events');
        break;
      case 'maintenance':
        recommendations.push('Perform well in balanced state (TSB -5 to 10)');
        recommendations.push('May not need extensive taper for good performance');
        break;
      case 'productive_training':
        recommendations.push('Achieving results during training load');
        recommendations.push('Can race effectively with moderate fatigue');
        break;
    }

    // TSB-based recommendations
    const { min, max } = tsbCorrelation.optimalTSBRange;
    recommendations.push(`Plan important workouts/races when TSB is ${min} to ${max}`);

    return recommendations;
  }

  /**
   * Create empty correlation result
   */
  private createEmptyCorrelation(
    startDate: string,
    endDate: string
  ): FormPerformanceCorrelation {
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      period: { startDate, endDate, days },
      performanceByZone: {
        optimal_race: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
        fresh: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
        maintenance: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
        productive_training: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
        fatigued: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
        overreached: { totalPRs: 0, prDensity: 0, avgTSB: 0, daysInZone: 0, prs: [] },
      },
      optimalZones: [],
      tsbCorrelation: {
        coefficient: 0,
        significance: 'none',
        optimalTSBRange: { min: 10, max: 25 },
      },
      insights: ['Insufficient data for correlation analysis'],
      recommendations: ['Collect more performance data to analyze patterns'],
    };
  }
}

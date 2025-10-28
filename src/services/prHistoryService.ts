/**
 * PR History Service
 *
 * Tracks personal record progression over time, calculates improvements,
 * and provides history querying with filters.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  PersonalRecord,
  PRHistoryEntry,
  PRQueryFilters,
  PRProgression,
  SportType,
  Milestone
} from '../types/personalRecords.js';
import { PRStorage } from '../storage/prStorage.js';

export class PRHistoryService {
  constructor(private storage: PRStorage) {}

  /**
   * Add a new PR and update history
   */
  async addPR(pr: PersonalRecord): Promise<{
    isNewPR: boolean;
    improvement?: PRHistoryEntry['improvement'];
    previousBest?: PRHistoryEntry['previousBest'];
  }> {
    // Get existing PR for this category
    const allPRs = await this.storage.getAllPRs();
    const existingPR = Object.values(allPRs).find(
      p => p.category.id === pr.category.id && p.sport === pr.sport
    );

    // Check if this is truly a better PR
    const isNewPR = !existingPR || this.isBetterPR(pr, existingPR);

    if (!isNewPR) {
      return { isNewPR: false };
    }

    // Calculate improvement if there's a previous PR
    let improvement: PRHistoryEntry['improvement'];
    let previousBest: PRHistoryEntry['previousBest'];

    if (existingPR) {
      improvement = this.calculateImprovement(pr, existingPR);
      previousBest = {
        value: existingPR.metricValue,
        timestamp: existingPR.timestamp,
        activityId: existingPR.activityId
      };

      // Delete old PR
      await this.storage.deletePR(existingPR.id);
    }

    // Save new PR
    await this.storage.savePR(pr);

    // Add history entry
    const historyEntry: PRHistoryEntry = {
      id: `history_${pr.id}_${Date.now()}`,
      prId: pr.id,
      sport: pr.sport,
      categoryId: pr.category.id,
      timestamp: pr.timestamp,
      metricValue: pr.metricValue,
      metricType: pr.metricType,
      activityId: pr.activityId,
      activityName: pr.activityName,
      improvement,
      previousBest
    };

    await this.storage.addHistoryEntry(historyEntry);

    return { isNewPR, improvement, previousBest };
  }

  /**
   * Get history for a category
   */
  async getCategoryHistory(
    categoryId: string,
    limit?: number
  ): Promise<PRHistoryEntry[]> {
    const history = await this.storage.getCategoryHistory(categoryId);

    if (limit) {
      return history.slice(0, limit);
    }

    return history;
  }

  /**
   * Get all history with optional filters
   */
  async getHistory(filters?: PRQueryFilters): Promise<PRHistoryEntry[]> {
    const allHistory = await this.storage.getAllHistory();
    let entries: PRHistoryEntry[] = [];

    // Flatten history
    for (const categoryHistory of Object.values(allHistory)) {
      entries.push(...categoryHistory);
    }

    // Apply filters
    if (filters) {
      entries = this.applyFilters(entries, filters);
    }

    // Sort by timestamp (newest first)
    entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return entries;
  }

  /**
   * Get progression for a category
   */
  async getProgression(
    categoryId: string,
    sport: SportType
  ): Promise<PRProgression | null> {
    const history = await this.getCategoryHistory(categoryId);
    const sportHistory = history.filter(h => h.sport === sport);

    if (sportHistory.length === 0) {
      return null;
    }

    // Get current PR
    const allPRs = await this.storage.getAllPRs();
    const currentPR = Object.values(allPRs).find(
      p => p.category.id === categoryId && p.sport === sport
    );

    if (!currentPR) {
      return null;
    }

    // Get first PR
    const firstEntry = sportHistory[sportHistory.length - 1];

    // Calculate total improvement
    const totalImprovement = this.calculateTotalImprovement(
      firstEntry.metricValue,
      currentPR.metricValue
    );

    // Calculate average improvement per PR
    const improvements = sportHistory
      .filter(h => h.improvement)
      .map(h => Math.abs(h.improvement!.percentage));

    const averageImprovement =
      improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0;

    // Calculate recent trend
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    const last30Days = sportHistory.filter(
      h => new Date(h.timestamp).getTime() > thirtyDaysAgo
    ).length;

    const last90Days = sportHistory.filter(
      h => new Date(h.timestamp).getTime() > ninetyDaysAgo
    ).length;

    // Determine if improving (has recent PRs)
    const improving = last30Days > 0 || (last90Days > 0 && improvements.length > 0);

    // Extract milestones (will be populated by milestone detector)
    const milestones: Milestone[] = [];

    return {
      categoryId,
      categoryName: currentPR.category.name,
      sport,
      currentPR,
      historyCount: sportHistory.length,
      firstPR: {
        value: firstEntry.metricValue,
        timestamp: firstEntry.timestamp,
        activityId: firstEntry.activityId
      },
      totalImprovement,
      averageImprovement,
      recentTrend: {
        last30Days,
        last90Days,
        improving
      },
      milestones
    };
  }

  /**
   * Get all progressions
   */
  async getAllProgressions(
    filters?: PRQueryFilters
  ): Promise<PRProgression[]> {
    const allPRs = await this.storage.getAllPRs();
    const progressions: PRProgression[] = [];

    for (const pr of Object.values(allPRs)) {
      // Apply filters
      if (filters && !this.matchesPRFilters(pr, filters)) {
        continue;
      }

      const progression = await this.getProgression(pr.category.id, pr.sport);
      if (progression) {
        progressions.push(progression);
      }
    }

    return progressions;
  }

  /**
   * Compare two PRs to determine which is better
   */
  private isBetterPR(newPR: PersonalRecord, existingPR: PersonalRecord): boolean {
    // For time and pace, lower is better
    if (newPR.metricType === 'time' || newPR.metricType === 'pace') {
      return newPR.metricValue < existingPR.metricValue;
    }

    // For distance, power, speed, higher is better
    return newPR.metricValue > existingPR.metricValue;
  }

  /**
   * Calculate improvement between two PRs
   */
  private calculateImprovement(
    newPR: PersonalRecord,
    oldPR: PersonalRecord
  ): PRHistoryEntry['improvement'] {
    const absolute = newPR.metricValue - oldPR.metricValue;
    const percentage = ((newPR.metricValue - oldPR.metricValue) / oldPR.metricValue) * 100;

    // Calculate days since previous
    let daysSincePrevious: number | undefined;
    if (oldPR.timestamp) {
      const daysDiff =
        (new Date(newPR.timestamp).getTime() - new Date(oldPR.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      daysSincePrevious = Math.floor(daysDiff);
    }

    return {
      absolute,
      percentage,
      daysSincePrevious
    };
  }

  /**
   * Apply filters to history entries
   */
  private applyFilters(
    entries: PRHistoryEntry[],
    filters: PRQueryFilters
  ): PRHistoryEntry[] {
    return entries.filter(entry => {
      // Sport filter
      if (filters.sport) {
        const sports = Array.isArray(filters.sport) ? filters.sport : [filters.sport];
        if (!sports.includes(entry.sport)) {
          return false;
        }
      }

      // Category filter
      if (filters.categoryId) {
        const categoryIds = Array.isArray(filters.categoryId)
          ? filters.categoryId
          : [filters.categoryId];
        if (!categoryIds.includes(entry.categoryId)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const entryDate = entry.timestamp.split('T')[0];
        if (
          entryDate < filters.dateRange.startDate ||
          entryDate > filters.dateRange.endDate
        ) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Check if PR matches filters
   */
  private matchesPRFilters(pr: PersonalRecord, filters: PRQueryFilters): boolean {
    // Sport filter
    if (filters.sport) {
      const sports = Array.isArray(filters.sport) ? filters.sport : [filters.sport];
      if (!sports.includes(pr.sport)) {
        return false;
      }
    }

    // Category filter
    if (filters.categoryId) {
      const categoryIds = Array.isArray(filters.categoryId)
        ? filters.categoryId
        : [filters.categoryId];
      if (!categoryIds.includes(pr.category.id)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const prDate = pr.timestamp.split('T')[0];
      if (
        prDate < filters.dateRange.startDate ||
        prDate > filters.dateRange.endDate
      ) {
        return false;
      }
    }

    // Quality filter
    if (filters.minQuality && pr.quality.score < filters.minQuality) {
      return false;
    }

    return true;
  }

  /**
   * Get recent PRs
   */
  async getRecentPRs(days: number = 30): Promise<PRHistoryEntry[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];

    return this.getHistory({
      dateRange: {
        startDate: cutoffDate,
        endDate: new Date().toISOString().split('T')[0]
      }
    });
  }

  /**
   * Get statistics summary
   */
  async getSummary(): Promise<{
    totalPRs: number;
    totalHistory: number;
    prsBySport: Record<SportType, number>;
    recentPRs: {
      last7Days: number;
      last30Days: number;
      last90Days: number;
    };
  }> {
    const allPRs = await this.storage.getAllPRs();
    const allHistory = await this.getHistory();

    const prsBySport: Record<SportType, number> = {} as any;
    for (const pr of Object.values(allPRs)) {
      prsBySport[pr.sport] = (prsBySport[pr.sport] || 0) + 1;
    }

    const now = Date.now();
    const last7 = allHistory.filter(
      h => new Date(h.timestamp).getTime() > now - 7 * 24 * 60 * 60 * 1000
    ).length;
    const last30 = allHistory.filter(
      h => new Date(h.timestamp).getTime() > now - 30 * 24 * 60 * 60 * 1000
    ).length;
    const last90 = allHistory.filter(
      h => new Date(h.timestamp).getTime() > now - 90 * 24 * 60 * 60 * 1000
    ).length;

    return {
      totalPRs: Object.keys(allPRs).length,
      totalHistory: allHistory.length,
      prsBySport,
      recentPRs: {
        last7Days: last7,
        last30Days: last30,
        last90Days: last90
      }
    };
  }

  /**
   * Calculate total improvement between two PRs
   */
  private calculateTotalImprovement(
    firstValue: number,
    currentValue: number
  ): { absolute: number; percentage: number } {
    const absolute = currentValue - firstValue;
    const percentage = ((currentValue - firstValue) / firstValue) * 100;

    return { absolute, percentage };
  }
}

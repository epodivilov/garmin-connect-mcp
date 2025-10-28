/**
 * Form History Storage Service
 *
 * Manages persistent storage of form snapshots with atomic writes,
 * data retention policies, and efficient querying.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { homedir } from 'os';
import type {
  FormSnapshot,
  FormHistory,
  FormStorageConfig,
  FormZone,
} from '../types/fatigue-freshness.js';

const DEFAULT_CONFIG: FormStorageConfig = {
  filePath: `${homedir()}/.garmin-connect-mcp/form-history.json`,
  maxRetentionDays: 365,
  autoCleanup: true,
};

/**
 * Form History Storage Service
 */
export class FormHistoryStorage {
  private config: FormStorageConfig;

  constructor(config: Partial<FormStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load form history from storage
   */
  async load(): Promise<FormHistory> {
    try {
      await this.ensureDirectory();
      const data = await fs.readFile(this.config.filePath, 'utf-8');
      const history = JSON.parse(data) as FormHistory;

      // Validate and apply retention policy
      return this.validateAndCleanHistory(history);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create new history file
        return this.createEmptyHistory();
      }
      throw new Error(
        `Failed to load form history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Save form history with atomic write
   */
  async save(history: FormHistory): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.ensureDirectory();

        // Update metadata
        const updatedHistory: FormHistory = {
          ...history,
          lastUpdated: new Date().toISOString(),
          summary: this.calculateSummary(history.snapshots),
        };

        // Atomic write: write to temp file, then rename
        const tempPath = `${this.config.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(7)}`;
        const data = JSON.stringify(updatedHistory, null, 2);
        await fs.writeFile(tempPath, data, 'utf-8');

        try {
          await fs.rename(tempPath, this.config.filePath);
          return; // Success
        } catch (renameError) {
          // Clean up temp file if rename fails
          try {
            await fs.unlink(tempPath);
          } catch {
            // Ignore cleanup errors
          }
          throw renameError;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this is the last attempt, throw
        if (attempt === maxRetries - 1) {
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10));
      }
    }

    throw new Error(
      `Failed to save form history after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Add or update form snapshot
   */
  async addSnapshot(snapshot: FormSnapshot): Promise<void> {
    const history = await this.load();

    // Remove existing snapshot for the same date
    const filtered = history.snapshots.filter((s) => s.date !== snapshot.date);

    // Add new snapshot
    filtered.push(snapshot);

    // Sort by date ascending
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    // Apply retention policy if enabled
    if (this.config.autoCleanup) {
      const cutoffDate = this.getCutoffDate();
      history.snapshots = filtered.filter((s) => s.date >= cutoffDate);
    } else {
      history.snapshots = filtered;
    }

    await this.save(history);
  }

  /**
   * Add multiple snapshots (batch operation)
   */
  async addSnapshots(snapshots: FormSnapshot[]): Promise<void> {
    const history = await this.load();

    // Deduplicate within the batch itself (keep last occurrence)
    const snapshotMap = new Map<string, FormSnapshot>();
    for (const snapshot of snapshots) {
      snapshotMap.set(snapshot.date, snapshot);
    }
    const deduplicatedSnapshots = Array.from(snapshotMap.values());

    // Get dates of new snapshots
    const newDates = new Set(deduplicatedSnapshots.map((s) => s.date));

    // Remove existing snapshots for the same dates
    const filtered = history.snapshots.filter((s) => !newDates.has(s.date));

    // Add new snapshots
    filtered.push(...deduplicatedSnapshots);

    // Sort by date ascending
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    // Apply retention policy if enabled
    if (this.config.autoCleanup) {
      const cutoffDate = this.getCutoffDate();
      history.snapshots = filtered.filter((s) => s.date >= cutoffDate);
    } else {
      history.snapshots = filtered;
    }

    await this.save(history);
  }

  /**
   * Get snapshots within date range
   */
  async getSnapshots(startDate: string, endDate: string): Promise<FormSnapshot[]> {
    const history = await this.load();
    return history.snapshots.filter(
      (s) => s.date >= startDate && s.date <= endDate
    );
  }

  /**
   * Get snapshot for specific date
   */
  async getSnapshot(date: string): Promise<FormSnapshot | null> {
    const history = await this.load();
    return history.snapshots.find((s) => s.date === date) || null;
  }

  /**
   * Get most recent snapshot
   */
  async getLatestSnapshot(): Promise<FormSnapshot | null> {
    const history = await this.load();
    if (history.snapshots.length === 0) {
      return null;
    }
    return history.snapshots[history.snapshots.length - 1];
  }

  /**
   * Get snapshots by zone
   */
  async getSnapshotsByZone(
    zone: FormZone,
    startDate?: string,
    endDate?: string
  ): Promise<FormSnapshot[]> {
    const history = await this.load();
    let filtered = history.snapshots.filter((s) => s.zone === zone);

    if (startDate) {
      filtered = filtered.filter((s) => s.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((s) => s.date <= endDate);
    }

    return filtered;
  }

  /**
   * Get snapshots where TSB is within range
   */
  async getSnapshotsByTSBRange(
    minTSB: number,
    maxTSB: number,
    startDate?: string,
    endDate?: string
  ): Promise<FormSnapshot[]> {
    const history = await this.load();
    let filtered = history.snapshots.filter(
      (s) => s.tsb >= minTSB && s.tsb <= maxTSB
    );

    if (startDate) {
      filtered = filtered.filter((s) => s.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((s) => s.date <= endDate);
    }

    return filtered;
  }

  /**
   * Get all snapshots (for trend analysis)
   */
  async getAllSnapshots(): Promise<FormSnapshot[]> {
    const history = await this.load();
    return history.snapshots;
  }

  /**
   * Get snapshots for last N days
   */
  async getRecentSnapshots(days: number): Promise<FormSnapshot[]> {
    const history = await this.load();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return history.snapshots.filter(
      (s) => s.date >= startDateStr && s.date <= endDateStr
    );
  }

  /**
   * Delete snapshots older than retention period
   */
  async cleanupOldSnapshots(): Promise<number> {
    const history = await this.load();
    const cutoffDate = this.getCutoffDate();
    const originalCount = history.snapshots.length;

    history.snapshots = history.snapshots.filter((s) => s.date >= cutoffDate);

    await this.save(history);

    return originalCount - history.snapshots.length;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalSnapshots: number;
    dateRange: { start: string; end: string } | null;
    zoneDistribution: Record<FormZone, number>;
    averageTSB: number;
    averageCTL: number;
    averageATL: number;
  }> {
    const history = await this.load();
    const snapshots = history.snapshots;

    if (snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        dateRange: null,
        zoneDistribution: {
          optimal_race: 0,
          fresh: 0,
          maintenance: 0,
          productive_training: 0,
          fatigued: 0,
          overreached: 0,
        },
        averageTSB: 0,
        averageCTL: 0,
        averageATL: 0,
      };
    }

    // Calculate zone distribution
    const zoneDistribution: Record<FormZone, number> = {
      optimal_race: 0,
      fresh: 0,
      maintenance: 0,
      productive_training: 0,
      fatigued: 0,
      overreached: 0,
    };

    let sumTSB = 0;
    let sumCTL = 0;
    let sumATL = 0;

    for (const snapshot of snapshots) {
      zoneDistribution[snapshot.zone]++;
      sumTSB += snapshot.tsb;
      sumCTL += snapshot.ctl;
      sumATL += snapshot.atl;
    }

    return {
      totalSnapshots: snapshots.length,
      dateRange: {
        start: snapshots[0].date,
        end: snapshots[snapshots.length - 1].date,
      },
      zoneDistribution,
      averageTSB: Math.round((sumTSB / snapshots.length) * 10) / 10,
      averageCTL: Math.round((sumCTL / snapshots.length) * 10) / 10,
      averageATL: Math.round((sumATL / snapshots.length) * 10) / 10,
    };
  }

  /**
   * Clear all stored data (for testing)
   */
  async clear(): Promise<void> {
    const history = this.createEmptyHistory();
    await this.save(history);
  }

  /**
   * Calculate summary statistics from snapshots
   */
  private calculateSummary(snapshots: FormSnapshot[]): FormHistory['summary'] {
    if (snapshots.length === 0) {
      return {
        totalDays: 0,
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
        zoneDistribution: {
          optimal_race: { days: 0, percentage: 0 },
          fresh: { days: 0, percentage: 0 },
          maintenance: { days: 0, percentage: 0 },
          productive_training: { days: 0, percentage: 0 },
          fatigued: { days: 0, percentage: 0 },
          overreached: { days: 0, percentage: 0 },
        },
        averageTSB: 0,
        averageCTL: 0,
        averageATL: 0,
        peakFitness: { date: '', ctl: 0 },
        maxFatigue: { date: '', atl: 0, tsb: 0 },
        maxFreshness: { date: '', tsb: 0 },
      };
    }

    // Zone distribution
    const zoneCounts: Record<FormZone, number> = {
      optimal_race: 0,
      fresh: 0,
      maintenance: 0,
      productive_training: 0,
      fatigued: 0,
      overreached: 0,
    };

    let sumTSB = 0;
    let sumCTL = 0;
    let sumATL = 0;

    let peakFitness = snapshots[0];
    let maxFatigue = snapshots[0];
    let maxFreshness = snapshots[0];

    for (const snapshot of snapshots) {
      zoneCounts[snapshot.zone]++;
      sumTSB += snapshot.tsb;
      sumCTL += snapshot.ctl;
      sumATL += snapshot.atl;

      if (snapshot.ctl > peakFitness.ctl) {
        peakFitness = snapshot;
      }

      if (snapshot.atl > maxFatigue.atl) {
        maxFatigue = snapshot;
      }

      if (snapshot.tsb > maxFreshness.tsb) {
        maxFreshness = snapshot;
      }
    }

    const totalDays = snapshots.length;

    const zoneDistribution: FormHistory['summary']['zoneDistribution'] = {
      optimal_race: {
        days: zoneCounts.optimal_race,
        percentage: Math.round((zoneCounts.optimal_race / totalDays) * 100),
      },
      fresh: {
        days: zoneCounts.fresh,
        percentage: Math.round((zoneCounts.fresh / totalDays) * 100),
      },
      maintenance: {
        days: zoneCounts.maintenance,
        percentage: Math.round((zoneCounts.maintenance / totalDays) * 100),
      },
      productive_training: {
        days: zoneCounts.productive_training,
        percentage: Math.round((zoneCounts.productive_training / totalDays) * 100),
      },
      fatigued: {
        days: zoneCounts.fatigued,
        percentage: Math.round((zoneCounts.fatigued / totalDays) * 100),
      },
      overreached: {
        days: zoneCounts.overreached,
        percentage: Math.round((zoneCounts.overreached / totalDays) * 100),
      },
    };

    return {
      totalDays,
      dateRange: {
        start: snapshots[0].date,
        end: snapshots[snapshots.length - 1].date,
      },
      zoneDistribution,
      averageTSB: Math.round((sumTSB / totalDays) * 10) / 10,
      averageCTL: Math.round((sumCTL / totalDays) * 10) / 10,
      averageATL: Math.round((sumATL / totalDays) * 10) / 10,
      peakFitness: {
        date: peakFitness.date,
        ctl: Math.round(peakFitness.ctl * 10) / 10,
      },
      maxFatigue: {
        date: maxFatigue.date,
        atl: Math.round(maxFatigue.atl * 10) / 10,
        tsb: Math.round(maxFatigue.tsb * 10) / 10,
      },
      maxFreshness: {
        date: maxFreshness.date,
        tsb: Math.round(maxFreshness.tsb * 10) / 10,
      },
    };
  }

  /**
   * Create empty history structure
   */
  private createEmptyHistory(): FormHistory {
    return {
      snapshots: [],
      lastUpdated: new Date().toISOString(),
      summary: {
        totalDays: 0,
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
        zoneDistribution: {
          optimal_race: { days: 0, percentage: 0 },
          fresh: { days: 0, percentage: 0 },
          maintenance: { days: 0, percentage: 0 },
          productive_training: { days: 0, percentage: 0 },
          fatigued: { days: 0, percentage: 0 },
          overreached: { days: 0, percentage: 0 },
        },
        averageTSB: 0,
        averageCTL: 0,
        averageATL: 0,
        peakFitness: { date: '', ctl: 0 },
        maxFatigue: { date: '', atl: 0, tsb: 0 },
        maxFreshness: { date: '', tsb: 0 },
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Validate and clean history
   */
  private validateAndCleanHistory(history: FormHistory): FormHistory {
    // Ensure required fields exist
    if (!history.snapshots) {
      history.snapshots = [];
    }
    if (!history.metadata) {
      history.metadata = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      };
    }

    // Apply retention policy if enabled
    if (this.config.autoCleanup) {
      const cutoffDate = this.getCutoffDate();
      history.snapshots = history.snapshots.filter((s) => s.date >= cutoffDate);
    }

    // Recalculate summary
    history.summary = this.calculateSummary(history.snapshots);

    return history;
  }

  /**
   * Get cutoff date for retention policy
   */
  private getCutoffDate(): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.maxRetentionDays);
    return cutoff.toISOString().split('T')[0];
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.config.filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

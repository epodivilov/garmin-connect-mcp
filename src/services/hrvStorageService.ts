/**
 * HRV Storage Service
 *
 * Manages persistent storage of HRV measurements with atomic writes,
 * rolling averages, and data quality tracking.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { homedir } from 'os';
import type {
  HRVMeasurement,
  HRVHistory,
  HRVStorageConfig,
  HRVDataPoint,
} from '../types/hrv-tracking.js';

const DEFAULT_CONFIG: HRVStorageConfig = {
  filePath: `${homedir()}/.garmin-connect-mcp/hrv-history.json`,
  maxRetentionDays: 365,
  minQuality: 0.0,
};

/**
 * HRV Storage Service
 */
export class HRVStorageService {
  private config: HRVStorageConfig;

  constructor(config: Partial<HRVStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load HRV history from storage
   */
  async load(): Promise<HRVHistory> {
    try {
      await this.ensureDirectory();
      const data = await fs.readFile(this.config.filePath, 'utf-8');
      const history = JSON.parse(data) as HRVHistory;

      // Validate and migrate if needed
      return this.validateHistory(history);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create new history file
        return this.createEmptyHistory();
      }
      throw new Error(
        `Failed to load HRV history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Save HRV history with atomic write
   */
  async save(history: HRVHistory): Promise<void> {
    try {
      await this.ensureDirectory();

      // Update metadata
      const updatedHistory: HRVHistory = {
        ...history,
        lastUpdated: new Date().toISOString(),
        quality: this.calculateQualityStats(history.measurements),
      };

      // Atomic write: write to temp file, then rename
      const tempPath = `${this.config.filePath}.tmp`;
      const data = JSON.stringify(updatedHistory, null, 2);
      await fs.writeFile(tempPath, data, 'utf-8');
      await fs.rename(tempPath, this.config.filePath);
    } catch (error) {
      throw new Error(
        `Failed to save HRV history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Add or update HRV measurement
   */
  async addMeasurement(measurement: HRVMeasurement): Promise<void> {
    const history = await this.load();

    // Remove existing measurement for the same date
    const filtered = history.measurements.filter((m) => m.date !== measurement.date);

    // Add new measurement
    filtered.push(measurement);

    // Sort by date ascending
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    // Apply retention policy
    const cutoffDate = this.getCutoffDate();
    const retained = filtered.filter((m) => m.date >= cutoffDate);

    history.measurements = retained;
    await this.save(history);
  }

  /**
   * Get measurements within date range
   */
  async getMeasurements(
    startDate: string,
    endDate: string
  ): Promise<HRVMeasurement[]> {
    const history = await this.load();
    return history.measurements.filter(
      (m) => m.date >= startDate && m.date <= endDate
    );
  }

  /**
   * Get measurements with calculated rolling averages
   */
  async getDataPoints(
    startDate: string,
    endDate: string
  ): Promise<HRVDataPoint[]> {
    const history = await this.load();
    const measurements = history.measurements.filter(
      (m) => m.date >= startDate && m.date <= endDate
    );

    return measurements.map((m, index) => {
      const date = new Date(m.date);
      const dayOfWeek = date.getUTCDay();

      // Calculate rolling averages
      const weeklyAverage = this.calculateRollingAverage(
        history.measurements,
        index,
        7
      );
      const monthlyAverage = this.calculateRollingAverage(
        history.measurements,
        index,
        28
      );

      return {
        ...m,
        dayOfWeek,
        weeklyAverage,
        monthlyAverage,
      };
    });
  }

  /**
   * Get all measurements (for baseline calculation)
   */
  async getAllMeasurements(): Promise<HRVMeasurement[]> {
    const history = await this.load();
    return history.measurements;
  }

  /**
   * Calculate rolling average for a measurement
   */
  private calculateRollingAverage(
    measurements: HRVMeasurement[],
    currentIndex: number,
    windowDays: number
  ): number {
    const startIndex = Math.max(0, currentIndex - windowDays + 1);
    const window = measurements.slice(startIndex, currentIndex + 1);

    if (window.length === 0) {
      return measurements[currentIndex].value;
    }

    const sum = window.reduce((acc, m) => acc + m.value, 0);
    return sum / window.length;
  }

  /**
   * Calculate data quality statistics
   */
  private calculateQualityStats(
    measurements: HRVMeasurement[]
  ): HRVHistory['quality'] {
    const totalDays = measurements.length;
    const withQuality = measurements.filter((m) => m.quality !== undefined);
    const daysWithQuality = withQuality.length;

    let averageQuality = 0;
    if (daysWithQuality > 0) {
      const sum = withQuality.reduce((acc, m) => acc + (m.quality ?? 0), 0);
      averageQuality = sum / daysWithQuality;
    }

    return {
      totalDays,
      daysWithQuality,
      averageQuality,
    };
  }

  /**
   * Create empty history structure
   */
  private createEmptyHistory(): HRVHistory {
    return {
      measurements: [],
      lastUpdated: new Date().toISOString(),
      quality: {
        totalDays: 0,
        daysWithQuality: 0,
        averageQuality: 0,
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Validate and migrate history structure
   */
  private validateHistory(history: HRVHistory): HRVHistory {
    // Ensure required fields exist
    if (!history.measurements) {
      history.measurements = [];
    }
    if (!history.metadata) {
      history.metadata = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      };
    }

    // Recalculate quality stats
    history.quality = this.calculateQualityStats(history.measurements);

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

  /**
   * Clear all stored data (for testing)
   */
  async clear(): Promise<void> {
    const history = this.createEmptyHistory();
    await this.save(history);
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalMeasurements: number;
    dateRange: { start: string; end: string } | null;
    quality: HRVHistory['quality'];
  }> {
    const history = await this.load();
    const measurements = history.measurements;

    if (measurements.length === 0) {
      return {
        totalMeasurements: 0,
        dateRange: null,
        quality: history.quality,
      };
    }

    return {
      totalMeasurements: measurements.length,
      dateRange: {
        start: measurements[0].date,
        end: measurements[measurements.length - 1].date,
      },
      quality: history.quality,
    };
  }
}

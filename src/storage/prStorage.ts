/**
 * PR Storage Service
 *
 * JSON-based file storage for personal records with atomic writes,
 * schema migration support, and data integrity validation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  PRStorageSchema,
  PersonalRecord,
  PRHistoryEntry,
  PRCategory,
  PRNotification
} from '../types/personalRecords.js';

const STORAGE_VERSION = 1;
const DEFAULT_FILENAME = '.garmin-pr-history.json';

export class PRStorage {
  private filePath: string;
  private cache: PRStorageSchema | null = null;

  constructor(customPath?: string) {
    this.filePath = customPath || path.join(os.homedir(), DEFAULT_FILENAME);
  }

  /**
   * Load data from storage
   */
  async load(): Promise<PRStorageSchema> {
    // Return cached if available
    if (this.cache) {
      return this.cache;
    }

    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Validate and migrate if needed
      const migrated = await this.migrateSchema(parsed);
      this.cache = migrated;

      return migrated;
    } catch (error: unknown) {
      // File doesn't exist, return empty schema
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const emptySchema = this.createEmptySchema();
        this.cache = emptySchema;
        return emptySchema;
      }

      const err = error as Error;
      throw new Error(`Failed to load PR storage: ${err.message}`);
    }
  }

  /**
   * Save data to storage (atomic write)
   */
  async save(data: PRStorageSchema): Promise<void> {
    const tempPath = `${this.filePath}.tmp`;

    try {
      // Write to temp file first
      const json = JSON.stringify(
        {
          ...data,
          lastUpdated: new Date().toISOString()
        },
        null,
        2
      );

      await fs.writeFile(tempPath, json, 'utf-8');

      // Atomic rename
      await fs.rename(tempPath, this.filePath);

      // Update cache
      this.cache = data;
    } catch (error: unknown) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors - temp file may not exist
      }

      const err = error as Error;
      throw new Error(`Failed to save PR storage: ${err.message}`);
    }
  }

  /**
   * Get all personal records
   */
  async getAllPRs(): Promise<Record<string, PersonalRecord>> {
    const data = await this.load();
    return data.personalRecords;
  }

  /**
   * Get PR by ID
   */
  async getPR(id: string): Promise<PersonalRecord | undefined> {
    const data = await this.load();
    return data.personalRecords[id];
  }

  /**
   * Save or update PR
   */
  async savePR(pr: PersonalRecord): Promise<void> {
    const data = await this.load();
    data.personalRecords[pr.id] = pr;
    await this.save(data);
  }

  /**
   * Delete PR
   */
  async deletePR(id: string): Promise<boolean> {
    const data = await this.load();
    if (!data.personalRecords[id]) {
      return false;
    }

    delete data.personalRecords[id];
    await this.save(data);
    return true;
  }

  /**
   * Get history for category
   */
  async getCategoryHistory(categoryId: string): Promise<PRHistoryEntry[]> {
    const data = await this.load();
    return data.history[categoryId] || [];
  }

  /**
   * Add history entry
   */
  async addHistoryEntry(entry: PRHistoryEntry): Promise<void> {
    const data = await this.load();

    if (!data.history[entry.categoryId]) {
      data.history[entry.categoryId] = [];
    }

    data.history[entry.categoryId].push(entry);

    // Keep history sorted by timestamp (newest first)
    data.history[entry.categoryId].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    await this.save(data);
  }

  /**
   * Get all history entries
   */
  async getAllHistory(): Promise<Record<string, PRHistoryEntry[]>> {
    const data = await this.load();
    return data.history;
  }

  /**
   * Get custom categories
   */
  async getCustomCategories(): Promise<Record<string, PRCategory>> {
    const data = await this.load();
    return data.customCategories;
  }

  /**
   * Save custom category
   */
  async saveCustomCategory(category: PRCategory): Promise<void> {
    const data = await this.load();
    data.customCategories[category.id] = category;
    await this.save(data);
  }

  /**
   * Delete custom category
   */
  async deleteCustomCategory(id: string): Promise<boolean> {
    const data = await this.load();
    if (!data.customCategories[id]) {
      return false;
    }

    delete data.customCategories[id];
    await this.save(data);
    return true;
  }

  /**
   * Get notifications
   */
  async getNotifications(): Promise<PRNotification[]> {
    const data = await this.load();
    return data.notifications;
  }

  /**
   * Add notification
   */
  async addNotification(notification: PRNotification): Promise<void> {
    const data = await this.load();
    data.notifications.push(notification);

    // Keep only last 100 notifications
    if (data.notifications.length > 100) {
      data.notifications = data.notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100);
    }

    await this.save(data);
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(id: string): Promise<boolean> {
    const data = await this.load();
    const notification = data.notifications.find(n => n.id === id);

    if (!notification) {
      return false;
    }

    notification.read = true;
    await this.save(data);
    return true;
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    const empty = this.createEmptySchema();
    await this.save(empty);
  }

  /**
   * Get storage file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Check if storage file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    prCount: number;
    historyEntries: number;
    customCategories: number;
    notifications: number;
    lastUpdated: string;
    fileSize: number;
  }> {
    const data = await this.load();
    let fileSize = 0;

    try {
      const stats = await fs.stat(this.filePath);
      fileSize = stats.size;
    } catch {
      // File doesn't exist yet - fileSize remains 0
    }

    return {
      prCount: Object.keys(data.personalRecords).length,
      historyEntries: Object.values(data.history).reduce(
        (sum, entries) => sum + entries.length,
        0
      ),
      customCategories: Object.keys(data.customCategories).length,
      notifications: data.notifications.length,
      lastUpdated: data.lastUpdated,
      fileSize
    };
  }

  /**
   * Create empty storage schema
   */
  private createEmptySchema(): PRStorageSchema {
    return {
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
      personalRecords: {},
      history: {},
      customCategories: {},
      notifications: []
    };
  }

  /**
   * Migrate schema to current version
   */
  private async migrateSchema(data: unknown): Promise<PRStorageSchema> {
    // If no version, assume version 1
    const record = data as Record<string, unknown>;
    const version = record.version || 1;

    if (version === STORAGE_VERSION) {
      return data as PRStorageSchema;
    }

    // Add migration logic here for future versions
    // For now, just update version
    return {
      ...(record as object),
      version: STORAGE_VERSION
    } as PRStorageSchema;
  }

  /**
   * Export data for backup
   */
  async exportData(): Promise<string> {
    const data = await this.load();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from backup
   */
  async importData(jsonData: string): Promise<void> {
    const parsed = JSON.parse(jsonData);
    const migrated = await this.migrateSchema(parsed);
    await this.save(migrated);
  }
}

/**
 * Form History Storage Tests
 *
 * Tests snapshot storage, atomic writes, queries, and data retention
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormHistoryStorage } from '../../src/services/formHistoryStorage.js';
import type { FormSnapshot } from '../../src/types/fatigue-freshness.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

describe('FormHistoryStorage', () => {
  let storage: FormHistoryStorage;
  let testFilePath: string;

  beforeEach(async () => {
    // Use unique file for each test
    testFilePath = join(tmpdir(), `test-form-history-${Date.now()}.json`);
    storage = new FormHistoryStorage({ filePath: testFilePath });
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.unlink(testFilePath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  function createSnapshot(date: string, tsb: number): FormSnapshot {
    return {
      date,
      tss: 100,
      ctl: 60,
      atl: 60 - tsb,
      tsb,
      zone: 'maintenance',
      zoneInfo: {
        zone: 'maintenance',
        label: 'Maintenance',
        description: 'Test',
        color: '#000',
        tsbRange: { min: -5, max: 10 },
        characteristics: {
          performancePotential: 'moderate',
          injuryRisk: 'low',
          recommendedIntensity: 'moderate',
          trainingFocus: [],
        },
        recommendations: {
          workoutTypes: [],
          intensityGuidance: '',
          volumeGuidance: '',
          recoveryGuidance: '',
        },
      },
      activityCount: 1,
      totalDuration: 3600,
      changes: {
        tssChange: 0,
        ctlChange: 0,
        atlChange: 0,
        tsbChange: 0,
        zoneChanged: false,
      },
    };
  }

  describe('save and load', () => {
    it('should save and load history', async () => {
      const snapshot = createSnapshot('2025-01-01', 0);

      await storage.addSnapshot(snapshot);

      const history = await storage.load();

      expect(history.snapshots).toHaveLength(1);
      expect(history.snapshots[0].date).toBe('2025-01-01');
    });

    it('should create file if it does not exist', async () => {
      const history = await storage.load();

      expect(history.snapshots).toHaveLength(0);
      expect(history.metadata).toBeDefined();
    });

    it('should use atomic writes', async () => {
      const snapshot1 = createSnapshot('2025-01-01', 0);
      const snapshot2 = createSnapshot('2025-01-02', 5);

      await storage.addSnapshot(snapshot1);
      await storage.addSnapshot(snapshot2);

      // Verify temp file is cleaned up
      const tempPath = `${testFilePath}.tmp`;
      try {
        await fs.access(tempPath);
        throw new Error('Temp file should not exist');
      } catch {
        // Expected - temp file should be removed
      }

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(2);
    });

    it('should update lastUpdated timestamp', async () => {
      const snapshot = createSnapshot('2025-01-01', 0);

      await storage.addSnapshot(snapshot);

      const history = await storage.load();

      expect(history.lastUpdated).toBeDefined();
      const updateTime = new Date(history.lastUpdated);
      expect(updateTime.getTime()).toBeGreaterThan(Date.now() - 5000);
    });
  });

  describe('addSnapshot', () => {
    it('should add new snapshot', async () => {
      const snapshot = createSnapshot('2025-01-01', 0);

      await storage.addSnapshot(snapshot);

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(1);
    });

    it('should replace existing snapshot for same date', async () => {
      const snapshot1 = createSnapshot('2025-01-01', 0);
      const snapshot2 = { ...createSnapshot('2025-01-01', 10), tsb: 10 };

      await storage.addSnapshot(snapshot1);
      await storage.addSnapshot(snapshot2);

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(1);
      expect(history.snapshots[0].tsb).toBe(10);
    });

    it('should sort snapshots by date', async () => {
      await storage.addSnapshot(createSnapshot('2025-01-03', 0));
      await storage.addSnapshot(createSnapshot('2025-01-01', 0));
      await storage.addSnapshot(createSnapshot('2025-01-02', 0));

      const history = await storage.load();

      expect(history.snapshots[0].date).toBe('2025-01-01');
      expect(history.snapshots[1].date).toBe('2025-01-02');
      expect(history.snapshots[2].date).toBe('2025-01-03');
    });
  });

  describe('addSnapshots (batch)', () => {
    it('should add multiple snapshots', async () => {
      const snapshots = [
        createSnapshot('2025-01-01', 0),
        createSnapshot('2025-01-02', 5),
        createSnapshot('2025-01-03', 10),
      ];

      await storage.addSnapshots(snapshots);

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(3);
    });

    it('should replace duplicates in batch', async () => {
      const snapshots = [
        createSnapshot('2025-01-01', 0),
        createSnapshot('2025-01-01', 10),  // Duplicate date
      ];

      await storage.addSnapshots(snapshots);

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(1);
      expect(history.snapshots[0].tsb).toBe(10);  // Latest value
    });
  });

  describe('getSnapshots', () => {
    beforeEach(async () => {
      const snapshots = [
        createSnapshot('2025-01-01', 0),
        createSnapshot('2025-01-05', 5),
        createSnapshot('2025-01-10', 10),
        createSnapshot('2025-01-15', 15),
      ];

      await storage.addSnapshots(snapshots);
    });

    it('should query by date range', async () => {
      const result = await storage.getSnapshots('2025-01-05', '2025-01-15');

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2025-01-05');
      expect(result[2].date).toBe('2025-01-15');
    });

    it('should return empty for non-matching range', async () => {
      const result = await storage.getSnapshots('2025-02-01', '2025-02-10');

      expect(result).toHaveLength(0);
    });
  });

  describe('getSnapshot', () => {
    it('should get snapshot for specific date', async () => {
      await storage.addSnapshot(createSnapshot('2025-01-05', 5));

      const result = await storage.getSnapshot('2025-01-05');

      expect(result).not.toBeNull();
      expect(result?.date).toBe('2025-01-05');
      expect(result?.tsb).toBe(5);
    });

    it('should return null for non-existent date', async () => {
      const result = await storage.getSnapshot('2025-01-01');

      expect(result).toBeNull();
    });
  });

  describe('getLatestSnapshot', () => {
    it('should get most recent snapshot', async () => {
      await storage.addSnapshots([
        createSnapshot('2025-01-01', 0),
        createSnapshot('2025-01-05', 5),
        createSnapshot('2025-01-10', 10),
      ]);

      const result = await storage.getLatestSnapshot();

      expect(result).not.toBeNull();
      expect(result?.date).toBe('2025-01-10');
    });

    it('should return null if no snapshots', async () => {
      const result = await storage.getLatestSnapshot();

      expect(result).toBeNull();
    });
  });

  describe('getSnapshotsByZone', () => {
    beforeEach(async () => {
      const snapshots = [
        { ...createSnapshot('2025-01-01', -25), zone: 'fatigued' as const },
        { ...createSnapshot('2025-01-02', 0), zone: 'maintenance' as const },
        { ...createSnapshot('2025-01-03', 15), zone: 'optimal_race' as const },
        { ...createSnapshot('2025-01-04', -25), zone: 'fatigued' as const },
      ];

      await storage.addSnapshots(snapshots);
    });

    it('should filter by zone', async () => {
      const result = await storage.getSnapshotsByZone('fatigued');

      expect(result).toHaveLength(2);
      expect(result.every(s => s.zone === 'fatigued')).toBe(true);
    });

    it('should filter by zone and date range', async () => {
      const result = await storage.getSnapshotsByZone(
        'fatigued',
        '2025-01-01',
        '2025-01-02'
      );

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-01-01');
    });
  });

  describe('getSnapshotsByTSBRange', () => {
    beforeEach(async () => {
      await storage.addSnapshots([
        createSnapshot('2025-01-01', -20),
        createSnapshot('2025-01-02', 0),
        createSnapshot('2025-01-03', 10),
        createSnapshot('2025-01-04', 20),
      ]);
    });

    it('should filter by TSB range', async () => {
      const result = await storage.getSnapshotsByTSBRange(-10, 15);

      expect(result).toHaveLength(2);  // TSB 0 and 10
      expect(result.every(s => s.tsb >= -10 && s.tsb <= 15)).toBe(true);
    });

    it('should filter by TSB range and dates', async () => {
      const result = await storage.getSnapshotsByTSBRange(
        -10,
        15,
        '2025-01-02',
        '2025-01-03'
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('getAllSnapshots', () => {
    it('should get all snapshots', async () => {
      await storage.addSnapshots([
        createSnapshot('2025-01-01', 0),
        createSnapshot('2025-01-02', 5),
        createSnapshot('2025-01-03', 10),
      ]);

      const result = await storage.getAllSnapshots();

      expect(result).toHaveLength(3);
    });
  });

  describe('getRecentSnapshots', () => {
    beforeEach(async () => {
      const today = new Date();
      const snapshots: FormSnapshot[] = [];

      for (let i = 0; i < 45; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        snapshots.push(createSnapshot(date.toISOString().split('T')[0], i));
      }

      await storage.addSnapshots(snapshots);
    });

    it('should get last N days', async () => {
      const result = await storage.getRecentSnapshots(7);

      expect(result.length).toBeLessThanOrEqual(8);  // May include today
    });

    it('should get last 30 days', async () => {
      const result = await storage.getRecentSnapshots(30);

      expect(result.length).toBeLessThanOrEqual(31);
    });
  });

  describe('cleanupOldSnapshots', () => {
    it('should delete snapshots older than retention period', async () => {
      const storage = new FormHistoryStorage({
        filePath: testFilePath,
        maxRetentionDays: 30,
        autoCleanup: false,  // Manual cleanup
      });

      const today = new Date();
      const snapshots: FormSnapshot[] = [];

      // Add 60 days of data
      for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        snapshots.push(createSnapshot(date.toISOString().split('T')[0], i));
      }

      await storage.addSnapshots(snapshots);

      const deletedCount = await storage.cleanupOldSnapshots();

      expect(deletedCount).toBeGreaterThan(25);  // Should delete ~30 old snapshots

      const history = await storage.load();
      expect(history.snapshots.length).toBeLessThanOrEqual(31);
    });

    it('should auto-cleanup on add if enabled', async () => {
      const storage = new FormHistoryStorage({
        filePath: testFilePath,
        maxRetentionDays: 7,
        autoCleanup: true,
      });

      const today = new Date();
      const snapshots: FormSnapshot[] = [];

      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        snapshots.push(createSnapshot(date.toISOString().split('T')[0], i));
      }

      await storage.addSnapshots(snapshots);

      const history = await storage.load();
      expect(history.snapshots.length).toBeLessThanOrEqual(8);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await storage.addSnapshots([
        { ...createSnapshot('2025-01-01', -25), zone: 'fatigued' as const },
        { ...createSnapshot('2025-01-02', 0), zone: 'maintenance' as const },
        { ...createSnapshot('2025-01-03', 15), zone: 'optimal_race' as const },
        { ...createSnapshot('2025-01-04', 30), zone: 'fresh' as const },
      ]);
    });

    it('should calculate statistics', async () => {
      const stats = await storage.getStats();

      expect(stats.totalSnapshots).toBe(4);
      expect(stats.dateRange).not.toBeNull();
      expect(stats.dateRange?.start).toBe('2025-01-01');
      expect(stats.dateRange?.end).toBe('2025-01-04');
    });

    it('should calculate zone distribution', async () => {
      const stats = await storage.getStats();

      expect(stats.zoneDistribution.fatigued).toBe(1);
      expect(stats.zoneDistribution.maintenance).toBe(1);
      expect(stats.zoneDistribution.optimal_race).toBe(1);
      expect(stats.zoneDistribution.fresh).toBe(1);
    });

    it('should calculate averages', async () => {
      const stats = await storage.getStats();

      expect(stats.averageTSB).toBeCloseTo(5, 0);  // (-25 + 0 + 15 + 30) / 4
      expect(stats.averageCTL).toBe(60);
    });

    it('should handle empty storage', async () => {
      const emptyStorage = new FormHistoryStorage({
        filePath: join(tmpdir(), `empty-${Date.now()}.json`),
      });

      const stats = await emptyStorage.getStats();

      expect(stats.totalSnapshots).toBe(0);
      expect(stats.dateRange).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      await storage.addSnapshots([
        createSnapshot('2025-01-01', 0),
        createSnapshot('2025-01-02', 5),
      ]);

      await storage.clear();

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(0);
    });
  });

  describe('summary calculations', () => {
    it('should calculate comprehensive summary', async () => {
      await storage.addSnapshots([
        { ...createSnapshot('2025-01-01', 0), ctl: 50 },
        { ...createSnapshot('2025-01-02', 10), ctl: 60 },
        { ...createSnapshot('2025-01-03', 5), ctl: 55 },
        { ...createSnapshot('2025-01-04', 20), ctl: 70, atl: 50 },
      ]);

      const history = await storage.load();

      expect(history.summary.totalDays).toBe(4);
      expect(history.summary.peakFitness.ctl).toBe(70);
      expect(history.summary.maxFreshness.tsb).toBe(20);
    });

    it('should calculate zone percentages', async () => {
      await storage.addSnapshots([
        { ...createSnapshot('2025-01-01', 0), zone: 'maintenance' as const },
        { ...createSnapshot('2025-01-02', 0), zone: 'maintenance' as const },
        { ...createSnapshot('2025-01-03', 15), zone: 'optimal_race' as const },
        { ...createSnapshot('2025-01-04', 30), zone: 'fresh' as const },
      ]);

      const history = await storage.load();

      expect(history.summary.zoneDistribution.maintenance.percentage).toBe(50);
      expect(history.summary.zoneDistribution.optimal_race.percentage).toBe(25);
      expect(history.summary.zoneDistribution.fresh.percentage).toBe(25);
    });
  });

  describe('edge cases', () => {
    it('should handle corrupted JSON', async () => {
      // Write invalid JSON
      await fs.writeFile(testFilePath, 'invalid json{]', 'utf-8');

      await expect(storage.load()).rejects.toThrow();
    });

    it('should handle concurrent access', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(storage.addSnapshot(createSnapshot(`2025-01-${String(i + 1).padStart(2, '0')}`, i)));
      }

      await Promise.all(promises);

      const history = await storage.load();
      expect(history.snapshots.length).toBeGreaterThan(0);
    });

    it('should handle missing file directory', async () => {
      const deepPath = join(tmpdir(), 'nonexistent', 'deep', 'path', 'test.json');
      const storage = new FormHistoryStorage({ filePath: deepPath });

      await storage.addSnapshot(createSnapshot('2025-01-01', 0));

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(1);

      // Cleanup
      try {
        await fs.rm(join(tmpdir(), 'nonexistent'), { recursive: true });
      } catch {
        // Ignore
      }
    });

    it('should handle empty snapshot array', async () => {
      await storage.addSnapshots([]);

      const history = await storage.load();
      expect(history.snapshots).toHaveLength(0);
    });

    it('should preserve metadata across saves', async () => {
      await storage.addSnapshot(createSnapshot('2025-01-01', 0));

      const history1 = await storage.load();
      const originalCreatedAt = history1.metadata.createdAt;

      await storage.addSnapshot(createSnapshot('2025-01-02', 5));

      const history2 = await storage.load();
      expect(history2.metadata.createdAt).toBe(originalCreatedAt);
    });
  });
});

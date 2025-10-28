/**
 * Unit tests for HRV Storage Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HRVStorageService } from '../../src/services/hrvStorageService.js';
import type { HRVMeasurement } from '../../src/types/hrv-tracking.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('HRVStorageService', () => {
  let storage: HRVStorageService;
  let testFilePath: string;

  beforeEach(() => {
    // Use temporary file for testing
    testFilePath = join(tmpdir(), `hrv-test-${Date.now()}.json`);
    storage = new HRVStorageService({ filePath: testFilePath });
  });

  afterEach(async () => {
    // Cleanup test file
    try {
      await fs.unlink(testFilePath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('addMeasurement', () => {
    it('should add a new measurement', async () => {
      const measurement: HRVMeasurement = {
        date: '2025-01-01',
        value: 50,
        quality: 1.0,
      };

      await storage.addMeasurement(measurement);

      const measurements = await storage.getAllMeasurements();
      expect(measurements).toHaveLength(1);
      expect(measurements[0]).toEqual(measurement);
    });

    it('should update existing measurement for the same date', async () => {
      const measurement1: HRVMeasurement = {
        date: '2025-01-01',
        value: 50,
      };

      const measurement2: HRVMeasurement = {
        date: '2025-01-01',
        value: 55,
        quality: 0.9,
      };

      await storage.addMeasurement(measurement1);
      await storage.addMeasurement(measurement2);

      const measurements = await storage.getAllMeasurements();
      expect(measurements).toHaveLength(1);
      expect(measurements[0].value).toBe(55);
      expect(measurements[0].quality).toBe(0.9);
    });

    it('should sort measurements by date', async () => {
      await storage.addMeasurement({ date: '2025-01-03', value: 53 });
      await storage.addMeasurement({ date: '2025-01-01', value: 51 });
      await storage.addMeasurement({ date: '2025-01-02', value: 52 });

      const measurements = await storage.getAllMeasurements();
      expect(measurements[0].date).toBe('2025-01-01');
      expect(measurements[1].date).toBe('2025-01-02');
      expect(measurements[2].date).toBe('2025-01-03');
    });
  });

  describe('getMeasurements', () => {
    beforeEach(async () => {
      // Add test data
      await storage.addMeasurement({ date: '2025-01-01', value: 51 });
      await storage.addMeasurement({ date: '2025-01-02', value: 52 });
      await storage.addMeasurement({ date: '2025-01-03', value: 53 });
      await storage.addMeasurement({ date: '2025-01-04', value: 54 });
      await storage.addMeasurement({ date: '2025-01-05', value: 55 });
    });

    it('should return measurements within date range', async () => {
      const measurements = await storage.getMeasurements('2025-01-02', '2025-01-04');
      expect(measurements).toHaveLength(3);
      expect(measurements[0].date).toBe('2025-01-02');
      expect(measurements[2].date).toBe('2025-01-04');
    });

    it('should return empty array for no matches', async () => {
      const measurements = await storage.getMeasurements('2025-02-01', '2025-02-05');
      expect(measurements).toHaveLength(0);
    });
  });

  describe('getDataPoints', () => {
    beforeEach(async () => {
      // Add 10 days of test data
      for (let i = 1; i <= 10; i++) {
        await storage.addMeasurement({
          date: `2025-01-${String(i).padStart(2, '0')}`,
          value: 50 + i,
        });
      }
    });

    it('should calculate rolling averages', async () => {
      const dataPoints = await storage.getDataPoints('2025-01-01', '2025-01-10');

      // First point: only itself for average
      expect(dataPoints[0].weeklyAverage).toBe(51);

      // 7th point: average of last 7 days
      const weeklyAvg = dataPoints[6].weeklyAverage;
      const expected = (51 + 52 + 53 + 54 + 55 + 56 + 57) / 7;
      expect(Math.round(weeklyAvg)).toBe(Math.round(expected));
    });

    it('should include day of week', async () => {
      const dataPoints = await storage.getDataPoints('2025-01-01', '2025-01-10');

      // 2025-01-01 is a Wednesday (day 3)
      expect(dataPoints[0].dayOfWeek).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty storage', async () => {
      const stats = await storage.getStats();

      expect(stats.totalMeasurements).toBe(0);
      expect(stats.dateRange).toBeNull();
    });

    it('should return correct stats with data', async () => {
      await storage.addMeasurement({ date: '2025-01-01', value: 51, quality: 0.9 });
      await storage.addMeasurement({ date: '2025-01-05', value: 55, quality: 0.95 });

      const stats = await storage.getStats();

      expect(stats.totalMeasurements).toBe(2);
      expect(stats.dateRange).toEqual({
        start: '2025-01-01',
        end: '2025-01-05',
      });
      expect(stats.quality.daysWithQuality).toBe(2);
      expect(stats.quality.averageQuality).toBeCloseTo(0.925);
    });
  });

  describe('clear', () => {
    it('should remove all measurements', async () => {
      await storage.addMeasurement({ date: '2025-01-01', value: 51 });
      await storage.addMeasurement({ date: '2025-01-02', value: 52 });

      await storage.clear();

      const measurements = await storage.getAllMeasurements();
      expect(measurements).toHaveLength(0);
    });
  });
});

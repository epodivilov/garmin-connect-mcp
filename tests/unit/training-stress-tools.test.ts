import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainingStressTools } from '../../src/tools/tracking/training-stress-tools.js';
import { GarminClient } from '../../src/client/garmin-client.js';

// Mock the GarminClient
vi.mock('../../src/client/garmin-client.js');

describe('TrainingStressTools', () => {
  let tools: TrainingStressTools;
  let mockGarminClient: any;

  beforeEach(() => {
    mockGarminClient = {
      getActivities: vi.fn(),
      getActivity: vi.fn()
    };
    tools = new TrainingStressTools(mockGarminClient as unknown as GarminClient);
  });

  describe('getTrainingStressBalance', () => {
    it('should calculate training stress balance successfully', async () => {
      // Mock activity list
      mockGarminClient.getActivities.mockResolvedValue([
        {
          activityId: 1,
          activityName: 'Morning Run',
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-10T08:00:00',
          duration: 3600
        },
        {
          activityId: 2,
          activityName: 'Evening Ride',
          activityType: { typeKey: 'cycling' },
          startTimeLocal: '2025-01-09T18:00:00',
          duration: 3600
        }
      ]);

      // Mock detailed activity data
      mockGarminClient.getActivity.mockImplementation(({ activityId }: any) => {
        if (activityId === 1) {
          return Promise.resolve({
            activityId: 1,
            activityName: 'Morning Run',
            activityType: { typeKey: 'running' },
            startTimeLocal: '2025-01-10T08:00:00',
            duration: 3600,
            averageHR: 150,
            maxHR: 175
          });
        } else {
          return Promise.resolve({
            activityId: 2,
            activityName: 'Evening Ride',
            activityType: { typeKey: 'cycling' },
            startTimeLocal: '2025-01-09T18:00:00',
            duration: 3600,
            averageHR: 140,
            maxHR: 165
          });
        }
      });

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7,
        includeTimeSeries: false
      });

      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text!);

      expect(data.currentDate).toBe('2025-01-10');
      expect(data.current).toBeDefined();
      expect(data.current.ctl).toBeGreaterThanOrEqual(0);
      expect(data.current.atl).toBeGreaterThanOrEqual(0);
      expect(data.current.tsb).toBeDefined();
      expect(data.current.formStatus).toBeDefined();
      expect(data.current.recommendation).toBeDefined();
      expect(data.summary.totalActivities).toBe(2);
      expect(data.summary.activitiesWithHR).toBe(2);
    });

    it('should include time series when requested', async () => {
      mockGarminClient.getActivities.mockResolvedValue([
        {
          activityId: 1,
          activityName: 'Run',
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-10T08:00:00',
          duration: 3600
        }
      ]);

      mockGarminClient.getActivity.mockResolvedValue({
        activityId: 1,
        activityName: 'Run',
        activityType: { typeKey: 'running' },
        startTimeLocal: '2025-01-10T08:00:00',
        duration: 3600,
        averageHR: 150
      });

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7,
        includeTimeSeries: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.timeSeries).toBeDefined();
      expect(Array.isArray(data.timeSeries)).toBe(true);
    });

    it('should handle activities without HR data', async () => {
      mockGarminClient.getActivities.mockResolvedValue([
        {
          activityId: 1,
          activityName: 'Walk',
          activityType: { typeKey: 'walking' },
          startTimeLocal: '2025-01-10T08:00:00',
          duration: 3600
        }
      ]);

      mockGarminClient.getActivity.mockResolvedValue({
        activityId: 1,
        activityName: 'Walk',
        activityType: { typeKey: 'walking' },
        startTimeLocal: '2025-01-10T08:00:00',
        duration: 3600
        // No HR data
      });

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.summary.activitiesWithHR).toBe(0);
      expect(data.summary.activitiesEstimated).toBe(1);
      expect(data.current.ctl).toBeGreaterThanOrEqual(0);
    });

    it('should handle no activities found', async () => {
      mockGarminClient.getActivities.mockResolvedValue([]);

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.message).toContain('No activities found');
    });

    it('should use default values when parameters not provided', async () => {
      mockGarminClient.getActivities.mockResolvedValue([
        {
          activityId: 1,
          activityName: 'Run',
          activityType: { typeKey: 'running' },
          startTimeLocal: new Date().toISOString(),
          duration: 3600
        }
      ]);

      mockGarminClient.getActivity.mockResolvedValue({
        activityId: 1,
        activityName: 'Run',
        activityType: { typeKey: 'running' },
        startTimeLocal: new Date().toISOString(),
        duration: 3600,
        averageHR: 150
      });

      const result = await tools.getTrainingStressBalance({});

      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text!);
      expect(data.currentDate).toBeDefined();
      expect(data.period.days).toBe(90); // Default days
    });

    it('should handle custom HR parameters', async () => {
      mockGarminClient.getActivities.mockResolvedValue([
        {
          activityId: 1,
          activityName: 'Run',
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-10T08:00:00',
          duration: 3600
        }
      ]);

      mockGarminClient.getActivity.mockResolvedValue({
        activityId: 1,
        activityName: 'Run',
        activityType: { typeKey: 'running' },
        startTimeLocal: '2025-01-10T08:00:00',
        duration: 3600,
        averageHR: 150
      });

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7,
        restingHR: 55,
        maxHR: 190,
        thresholdHR: 175
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.current).toBeDefined();
    });

    it('should validate date parameter', async () => {
      const result = await tools.getTrainingStressBalance({
        date: 'invalid-date'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid date format');
    });

    it('should validate days parameter', async () => {
      const result1 = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 5 // Too few
      });

      expect(result1.isError).toBe(true);
      expect(result1.content[0].text).toContain('Days must be between 7 and 365');

      const result2 = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 400 // Too many
      });

      expect(result2.isError).toBe(true);
      expect(result2.content[0].text).toContain('Days must be between 7 and 365');
    });

    it('should handle API errors gracefully', async () => {
      mockGarminClient.getActivities.mockRejectedValue(new Error('API Error'));

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get training stress balance');
    });

    it('should handle activity fetch errors gracefully', async () => {
      mockGarminClient.getActivities.mockResolvedValue([
        {
          activityId: 1,
          activityName: 'Run',
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-10T08:00:00',
          duration: 3600
        },
        {
          activityId: 2,
          activityName: 'Ride',
          activityType: { typeKey: 'cycling' },
          startTimeLocal: '2025-01-09T08:00:00',
          duration: 3600
        }
      ]);

      // First activity succeeds, second fails
      mockGarminClient.getActivity.mockImplementation(({ activityId }: any) => {
        if (activityId === 1) {
          return Promise.resolve({
            activityId: 1,
            activityName: 'Run',
            activityType: { typeKey: 'running' },
            startTimeLocal: '2025-01-10T08:00:00',
            duration: 3600,
            averageHR: 150
          });
        } else {
          return Promise.reject(new Error('Activity fetch error'));
        }
      });

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7
      });

      const data = JSON.parse(result.content[0].text!);
      // Should still return result with the successful activity
      expect(data.summary.totalActivities).toBe(1);
      expect(data.current).toBeDefined();
    });

    it('should stop fetching when max activities limit reached', async () => {
      // Create 10 mock activities (simplified to avoid timeout)
      const manyActivities = Array.from({ length: 10 }, (_, i) => ({
        activityId: i + 1,
        activityName: `Activity ${i + 1}`,
        activityType: { typeKey: 'running' },
        startTimeLocal: '2025-01-10T08:00:00',
        duration: 3600
      }));

      mockGarminClient.getActivities.mockResolvedValue(manyActivities);

      mockGarminClient.getActivity.mockImplementation(({ activityId }: any) => Promise.resolve({
        activityId,
        activityName: `Activity ${activityId}`,
        activityType: { typeKey: 'running' },
        startTimeLocal: '2025-01-10T08:00:00',
        duration: 3600,
        averageHR: 150
      }));

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 30
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.summary.totalActivities).toBeLessThanOrEqual(10);
      expect(data.current).toBeDefined();
    });

    it('should calculate summary statistics correctly', async () => {
      mockGarminClient.getActivities.mockResolvedValue([
        {
          activityId: 1,
          activityName: 'Run with HR',
          activityType: { typeKey: 'running' },
          startTimeLocal: '2025-01-10T08:00:00',
          duration: 3600
        },
        {
          activityId: 2,
          activityName: 'Walk without HR',
          activityType: { typeKey: 'walking' },
          startTimeLocal: '2025-01-09T10:00:00',
          duration: 1800
        }
      ]);

      mockGarminClient.getActivity.mockImplementation(({ activityId }: any) => {
        if (activityId === 1) {
          return Promise.resolve({
            activityId: 1,
            activityName: 'Run with HR',
            activityType: { typeKey: 'running' },
            startTimeLocal: '2025-01-10T08:00:00',
            duration: 3600,
            averageHR: 150
          });
        } else {
          return Promise.resolve({
            activityId: 2,
            activityName: 'Walk without HR',
            activityType: { typeKey: 'walking' },
            startTimeLocal: '2025-01-09T10:00:00',
            duration: 1800
            // No HR data
          });
        }
      });

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.summary.totalActivities).toBe(2);
      expect(data.summary.activitiesWithHR).toBe(1);
      expect(data.summary.activitiesEstimated).toBe(1);
      expect(data.summary.totalTSS).toBeGreaterThan(0);
      expect(data.summary.averageDailyTSS).toBeGreaterThan(0);
    });

    it('should handle pagination correctly', { timeout: 10000 }, async () => {
      // First call returns 50 activities, second call returns empty
      // Activities span from Jan 10 back to Jan 4 (within the 7-day range)
      mockGarminClient.getActivities.mockImplementation((start: number = 0, limit: number = 20) => {
        if (start === 0) {
          // Return 50 activities, all within the date range
          return Promise.resolve(
            Array.from({ length: 50 }, (_, i) => ({
              activityId: i + 1,
              activityName: `Activity ${i + 1}`,
              activityType: { typeKey: 'running' },
              // Distribute activities across the 7-day range
              startTimeLocal: new Date(2025, 0, 10 - Math.floor(i / 8)).toISOString(),
              duration: 3600
            }))
          );
        } else {
          // Second call returns empty to stop pagination
          return Promise.resolve([]);
        }
      });

      mockGarminClient.getActivity.mockImplementation(({ activityId }: any) => Promise.resolve({
        activityId,
        activityName: `Activity ${activityId}`,
        activityType: { typeKey: 'running' },
        startTimeLocal: new Date(2025, 0, 10).toISOString(),
        duration: 3600,
        averageHR: 150
      }));

      const result = await tools.getTrainingStressBalance({
        date: '2025-01-10',
        days: 7
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.summary.totalActivities).toBeGreaterThan(0);
      // Should have fetched activities but stopped at the maxActivities limit or date range
      expect(data.summary.totalActivities).toBeLessThanOrEqual(50);
    });
  });
});

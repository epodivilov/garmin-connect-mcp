import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityVolumeTools } from '../../src/tools/aggregation/activity-volume-tools.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

// Mock activity data for volume testing
const mockVolumeActivities = [
  {
    activityId: 1,
    activityName: 'Morning Run',
    activityType: { typeKey: 'running' },
    startTimeLocal: '2024-01-01T07:00:00.000',
    duration: 3600, // 60 minutes
    distance: 10000, // 10km
    calories: 600,
    elevationGain: 200
  },
  {
    activityId: 2,
    activityName: 'Evening Bike',
    activityType: { typeKey: 'cycling' },
    startTimeLocal: '2024-01-02T18:00:00.000',
    duration: 7200, // 120 minutes
    distance: 30000, // 30km
    calories: 800,
    elevationGain: 500
  },
  {
    activityId: 3,
    activityName: 'Strength Training',
    activityType: { typeKey: 'strength_training' },
    startTimeLocal: '2024-01-03T10:00:00.000',
    duration: 2700, // 45 minutes
    distance: 0,
    calories: 300,
    elevationGain: 0
  },
  {
    activityId: 4,
    activityName: 'Weekend Run',
    activityType: { typeKey: 'running' },
    startTimeLocal: '2024-01-06T08:00:00.000', // Changed from 01-07 to 01-06 to ensure it's in week 1
    duration: 2400, // 40 minutes
    distance: 8000, // 8km
    calories: 480,
    elevationGain: 150
  }
];

describe('ActivityVolumeTools', () => {
  let activityVolumeTools: ActivityVolumeTools;
  let mockClient: ReturnType<typeof createMockGarminClient>;

  beforeEach(() => {
    mockClient = createMockGarminClient();

    // Override getActivities to return our volume test data
    mockClient.getActivities = vi.fn().mockImplementation((start: number = 0, limit: number = 50) => {
      const activities = [...mockVolumeActivities];
      return Promise.resolve(activities.slice(start, start + limit));
    });

    activityVolumeTools = new ActivityVolumeTools(mockClient);
  });

  describe('getWeeklyVolume', () => {
    it('should return weekly volume with correct metrics', async () => {
      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1,
        includeActivityBreakdown: true,
        includeTrends: false
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('year', 2024);
      expect(data).toHaveProperty('week', 1);
      expect(data).toHaveProperty('startDate');
      expect(data).toHaveProperty('endDate');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('byActivityType');

      // Check metrics calculations
      const metrics = data.metrics;
      expect(metrics.activityCount).toBe(4);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.distance).toBeGreaterThan(0);
      expect(metrics.calories).toBeGreaterThan(0);
      expect(metrics.elevationGain).toBeGreaterThan(0);

      // Check activity type breakdown
      const breakdown = data.byActivityType;
      expect(breakdown).toHaveProperty('Run');
      expect(breakdown).toHaveProperty('Ride');
      expect(breakdown).toHaveProperty('Strength');
    });

    it('should use default values when no arguments provided', async () => {
      const result = await activityVolumeTools.getWeeklyVolume({});

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('year');
      expect(data).toHaveProperty('week');
      expect(data).toHaveProperty('metrics');
    });

    it('should include trends when requested', async () => {
      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 2,
        includeTrends: true
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      // Trends might be undefined if previous week has no data, which is expected
      if (data.trends) {
        expect(data.trends).toHaveProperty('durationChangePercent');
        expect(data.trends).toHaveProperty('distanceChangePercent');
        expect(data.trends).toHaveProperty('activityCountChange');
      }
    });

    it('should exclude activity breakdown when disabled', async () => {
      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1,
        includeActivityBreakdown: false
      });

      const data = JSON.parse(result.content[0].text!);
      // When activity breakdown is disabled, the empty object is removed by removeEmptyValues
      expect(data).not.toHaveProperty('byActivityType');
    });

    it('should filter by activity types when specified', async () => {
      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1,
        activityTypes: ['running']
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text!);

      // Should only include running activities
      expect(data.metrics.activityCount).toBeLessThanOrEqual(2); // Max 2 running activities in our mock data
      expect(data.byActivityType).toHaveProperty('Run');
      expect(data.byActivityType).not.toHaveProperty('Ride');
    });

    it('should handle errors gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingTools = new ActivityVolumeTools(failingClient);

      const result = await failingTools.getWeeklyVolume({ year: 2024, week: 1 });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Failed to get weekly volume');
    });
  });

  describe('getMonthlyVolume', () => {
    it('should return monthly volume with correct metrics', async () => {
      const result = await activityVolumeTools.getMonthlyVolume({
        year: 2024,
        month: 1,
        includeActivityBreakdown: true
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('year', 2024);
      expect(data).toHaveProperty('month', 1);
      expect(data).toHaveProperty('monthName', 'January');
      expect(data).toHaveProperty('startDate', '2024-01-01');
      expect(data).toHaveProperty('endDate', '2024-01-31');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('byActivityType');

      // Check metrics
      const metrics = data.metrics;
      expect(metrics.activityCount).toBe(4);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.distance).toBeGreaterThan(0);
    });

    it('should validate month range', async () => {
      const result = await activityVolumeTools.getMonthlyVolume({
        year: 2024,
        month: 13 // Invalid month
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Month must be between 1 and 12');
    });

    it('should use default values when no arguments provided', async () => {
      const result = await activityVolumeTools.getMonthlyVolume({});

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('year');
      expect(data).toHaveProperty('month');
      expect(data).toHaveProperty('monthName');
    });

    it('should include trends when requested', async () => {
      const result = await activityVolumeTools.getMonthlyVolume({
        year: 2024,
        month: 2,
        includeTrends: true
      });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text!);

      // Trends might be undefined if previous month has no data
      if (data.trends) {
        expect(data.trends).toHaveProperty('durationChangePercent');
        expect(data.trends).toHaveProperty('distanceChangePercent');
        expect(data.trends).toHaveProperty('activityCountChange');
      }
    });

    it('should handle errors gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingTools = new ActivityVolumeTools(failingClient);

      const result = await failingTools.getMonthlyVolume({ year: 2024, month: 1 });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Failed to get monthly volume');
    });
  });

  describe('getCustomRangeVolume', () => {
    it('should return custom range volume with correct metrics', async () => {
      const result = await activityVolumeTools.getCustomRangeVolume({
        dateRange: '2024-01-01/2024-01-07',
        includeActivityBreakdown: true,
        includeDailyBreakdown: false
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('startDate', '2024-01-01');
      expect(data).toHaveProperty('endDate', '2024-01-07');
      expect(data).toHaveProperty('periodDays', 7);
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('byActivityType');

      // Check metrics
      const metrics = data.metrics;
      expect(metrics.activityCount).toBe(4);
      expect(metrics.duration).toBeGreaterThan(0);
    });

    it('should include daily breakdown when requested', async () => {
      const result = await activityVolumeTools.getCustomRangeVolume({
        dateRange: '2024-01-01/2024-01-03',
        includeDailyBreakdown: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('dailyBreakdown');
      expect(Array.isArray(data.dailyBreakdown)).toBe(true);
      expect(data.dailyBreakdown.length).toBe(3); // 3 days

      // Check daily breakdown structure
      const dailyData = data.dailyBreakdown[0];
      expect(dailyData).toHaveProperty('date');
      expect(dailyData).toHaveProperty('metrics');
      expect(dailyData.metrics).toHaveProperty('duration');
      expect(dailyData.metrics).toHaveProperty('distance');
      expect(dailyData.metrics).toHaveProperty('activityCount');
    });

    it('should require dateRange parameter', async () => {
      const result = await activityVolumeTools.getCustomRangeVolume({});

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('dateRange is required');
    });

    it('should reject date ranges over 365 days', async () => {
      const result = await activityVolumeTools.getCustomRangeVolume({
        dateRange: '2024-01-01/2025-01-02' // Over 365 days
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Date range cannot exceed 365 days');
    });

    it('should handle invalid date range format', async () => {
      const result = await activityVolumeTools.getCustomRangeVolume({
        dateRange: 'invalid-format'
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get custom range volume');
    });

    it('should filter by activity types when specified', async () => {
      const result = await activityVolumeTools.getCustomRangeVolume({
        dateRange: '2024-01-01/2024-01-07',
        activityTypes: ['running']
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.byActivityType).toHaveProperty('Run');
      expect(data.byActivityType).not.toHaveProperty('Ride');
    });

    it('should handle errors gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingTools = new ActivityVolumeTools(failingClient);

      const result = await failingTools.getCustomRangeVolume({
        dateRange: '2024-01-01/2024-01-07'
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Failed to get custom range volume');
    });
  });

  describe('Activity aggregation edge cases', () => {
    it('should handle empty activity list', async () => {
      // Mock empty activity list
      mockClient.getActivities = vi.fn().mockResolvedValue([]);

      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics.activityCount).toBe(0);
      expect(data.metrics.duration).toBe(0);
      expect(data.metrics.distance).toBe(0);
      expect(data.metrics.calories).toBe(0);
      expect(data.metrics.elevationGain).toBe(0);
    });

    it('should handle activities with missing data fields', async () => {
      // Mock activities with missing fields
      const incompleteActivities = [
        {
          activityId: 1,
          activityName: 'Incomplete Activity',
          activityType: { typeKey: 'running' },
          startTimeLocal: '2024-01-01T07:00:00.000'
          // Missing duration, distance, calories, elevationGain
        }
      ];

      mockClient.getActivities = vi.fn().mockResolvedValue(incompleteActivities);

      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics.activityCount).toBe(1);
      expect(data.metrics.duration).toBe(0);
      expect(data.metrics.distance).toBe(0);
      expect(data.metrics.calories).toBe(0);
      expect(data.metrics.elevationGain).toBe(0);
    });

    it('should respect maxActivities limit', async () => {
      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1,
        maxActivities: 2
      });

      // Should process at most 2 activities even though we have 4 in mock data
      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics.activityCount).toBeLessThanOrEqual(2);
    });

    it('should handle activities with unknown activity types', async () => {
      const unknownTypeActivities = [
        {
          activityId: 1,
          activityName: 'Unknown Activity',
          activityType: { typeKey: 'unknown_sport' },
          startTimeLocal: '2024-01-01T07:00:00.000',
          duration: 3600,
          distance: 5000,
          calories: 300,
          elevationGain: 100
        }
      ];

      mockClient.getActivities = vi.fn().mockResolvedValue(unknownTypeActivities);

      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics.activityCount).toBe(1);
      expect(data.byActivityType).toHaveProperty('Unknown Sport');
    });
  });

  describe('Performance and size validation', () => {
    it('should handle large dataset gracefully', async () => {
      // Mock a large number of activities
      const largeActivitySet = Array.from({ length: 100 }, (_, i) => ({
        activityId: i + 1,
        activityName: `Activity ${i + 1}`,
        activityType: { typeKey: 'running' },
        startTimeLocal: '2024-01-01T07:00:00.000',
        duration: 3600,
        distance: 10000,
        calories: 600,
        elevationGain: 200
      }));

      mockClient.getActivities = vi.fn().mockResolvedValue(largeActivitySet);

      const result = await activityVolumeTools.getWeeklyVolume({
        year: 2024,
        week: 1
      });

      expect(result).toHaveProperty('content');
      // Should either return data or a size error response
      if (result.isError) {
        expect(result.content[0].text).toContain('too large');
      } else {
        const data = JSON.parse(result.content[0].text!);
        expect(data).toHaveProperty('metrics');
      }
    });
  });
});
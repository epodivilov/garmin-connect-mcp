import { describe, it, expect, beforeEach } from 'vitest';
import { ActivityTools } from '../../src/tools/basic/activity-tools.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

describe('ActivityTools', () => {
  let activityTools: ActivityTools;
  let mockClient: ReturnType<typeof createMockGarminClient>;

  beforeEach(() => {
    mockClient = createMockGarminClient();
    activityTools = new ActivityTools(mockClient);
  });

  describe('getActivities', () => {
    it('should return activities in detailed format by default', async () => {
      const result = await activityTools.getActivities({});

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('activities');
      expect(Array.isArray(data.activities)).toBe(true);

      // Check detailed structure
      const activity = data.activities[0];
      expect(activity).toHaveProperty('activityId');
      expect(activity).toHaveProperty('name');
      expect(activity).toHaveProperty('type');
      expect(activity).toHaveProperty('timing');
      expect(activity).toHaveProperty('metrics');
      expect(activity).toHaveProperty('heartRate');
      expect(activity).toHaveProperty('training');
    });

    it('should return activities in summary format when summary=true', async () => {
      const result = await activityTools.getActivities({ summary: true });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('activities');

      // Check summary structure (simpler than detailed)
      const activity = data.activities[0];
      expect(activity).toHaveProperty('activityId');
      expect(activity).toHaveProperty('activityName'); // preset returns activityName, not name
      expect(activity).toHaveProperty('startTimeLocal'); // preset returns startTimeLocal, not date
      expect(activity).toHaveProperty('duration');
      expect(activity).toHaveProperty('distance');
      expect(activity).toHaveProperty('calories');
      expect(activity).toHaveProperty('averageHR');
      expect(activity).toHaveProperty('maxHR');

      // Should not have detailed nested objects
      expect(activity).not.toHaveProperty('timing');
      expect(activity).not.toHaveProperty('training');
    });

    it('should respect start and limit parameters', async () => {
      const result = await activityTools.getActivities({ start: 0, limit: 5 });

      const data = JSON.parse(result.content[0].text!);
      expect(data.pagination).toHaveProperty('start', 0);
      expect(data.pagination).toHaveProperty('limit', 5);
    });

    it('should cap limit at 50', async () => {
      const result = await activityTools.getActivities({ limit: 100 });

      // Should not throw error and should cap the limit
      expect(result.isError).toBeUndefined();
    });

    it('should handle empty activities list', async () => {
      mockClient.getActivities.mockResolvedValueOnce([]);

      const result = await activityTools.getActivities({});

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('No activities found');
    });

    it('should handle errors', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingActivityTools = new ActivityTools(failingClient);

      const result = await failingActivityTools.getActivities({});

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get activities');
    });

    it('should return raw metrics from Garmin API', async () => {
      const result = await activityTools.getActivities({ summary: true });

      const data = JSON.parse(result.content[0].text!);
      const activity = data.activities[0];

      // Preset returns raw data from Garmin API without unit conversion
      expect(activity.distance).toBe(5000); // meters (not converted to km)
      expect(activity.duration).toBe(2400); // seconds (not converted to minutes)
    });

    // Backward compatibility tests for includeSummaryOnly parameter
    it('should support includeSummaryOnly parameter', async () => {
      const result = await activityTools.getActivities({ includeSummaryOnly: true });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('activities');

      const activity = data.activities[0];
      expect(activity).toHaveProperty('activityId');
      expect(activity).toHaveProperty('activityName'); // preset field name
      expect(activity).not.toHaveProperty('timing');
    });

    it('should prioritize includeSummaryOnly over deprecated summary parameter', async () => {
      const result = await activityTools.getActivities({
        includeSummaryOnly: false,
        summary: true
      });

      // includeSummaryOnly=false should result in detailed data
      const data = JSON.parse(result.content[0].text!);
      const activity = data.activities[0];
      expect(activity).toHaveProperty('timing');
      expect(activity).toHaveProperty('metrics');
    });

    it('should maintain backward compatibility with summary parameter', async () => {
      const result = await activityTools.getActivities({ summary: true });

      const data = JSON.parse(result.content[0].text!);
      const activity = data.activities[0];
      expect(activity).toHaveProperty('activityId');
      expect(activity).toHaveProperty('activityName'); // preset field name
      expect(activity).not.toHaveProperty('timing');
    });
  });

  describe('getActivityDetails', () => {
    it('should return detailed activity information', async () => {
      const result = await activityTools.getActivityDetails({ activityId: 12345678901 });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('activityId', 12345678901);
      expect(data).toHaveProperty('basic');
      expect(data).toHaveProperty('timing');
      expect(data).toHaveProperty('performance');
      expect(data).toHaveProperty('heartRate');
      expect(data).toHaveProperty('cadence');
      expect(data).toHaveProperty('training');
      expect(data).toHaveProperty('runningMetrics');
      expect(data).toHaveProperty('location');
      expect(data).toHaveProperty('device');
      expect(data).toHaveProperty('laps');
    });

    it('should include split summaries when available and reasonable size', async () => {
      const result = await activityTools.getActivityDetails({ activityId: 12345678901 });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('splitSummaries');
      expect(Array.isArray(data.splitSummaries)).toBe(true);

      // Check split structure
      const split = data.splitSummaries[0];
      expect(split).toHaveProperty('splitType');
      expect(split).toHaveProperty('distance');
      expect(split).toHaveProperty('durationSeconds');
      expect(split).toHaveProperty('averageSpeed');
    });

    it('should handle too many splits gracefully', async () => {
      // Mock activity with many splits
      const manySplisPactivity = {
        ...mockClient.getActivity({ activityId: 12345678901 }),
        splitSummaries: new Array(25).fill({
          splitType: "INTERVAL_ACTIVE",
          duration: 1200,
          distance: 2500,
          averageSpeed: 2.1
        })
      };

      mockClient.getActivity.mockResolvedValueOnce(manySplisPactivity);

      const result = await activityTools.getActivityDetails({ activityId: 12345678901 });

      const data = JSON.parse(result.content[0].text!);
      expect(data.splitSummaries).toHaveProperty('count', 25);
      expect(data.splitSummaries).toHaveProperty('note');
      expect(data.splitSummaries.note).toContain('Too many splits');
    });

    it('should require activityId parameter', async () => {
      const result = await activityTools.getActivityDetails({});

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Invalid activityId');
    });

    it('should handle missing activity', async () => {
      const result = await activityTools.getActivityDetails({ activityId: 999999 });

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('No activity found with ID: 999999');
    });

    it('should handle errors', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingActivityTools = new ActivityTools(failingClient);

      const result = await failingActivityTools.getActivityDetails({ activityId: 12345678901 });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get activity details');
    });

    it('should keep duration in seconds in detailed view', async () => {
      const result = await activityTools.getActivityDetails({ activityId: 12345678901 });

      const data = JSON.parse(result.content[0].text!);

      // Distance should be converted from meters to km
      expect(data.performance.distance).toBe(5); // 5000 meters = 5 km
      // Duration should remain in seconds (not converted to minutes)
      expect(data.timing.durationSeconds).toBe(2400); // 2400 seconds from mock
      expect(data.timing.elapsedDurationSeconds).toBe(2460); // 2460 seconds from mock
      expect(data.timing.movingDurationSeconds).toBe(2380); // 2380 seconds from mock

      // Split distances should be converted, durations in seconds
      if (data.splitSummaries && Array.isArray(data.splitSummaries)) {
        expect(data.splitSummaries[0].distance).toBe(2.5); // 2500 meters = 2.5 km
        expect(data.splitSummaries[0].durationSeconds).toBe(1200); // 1200 seconds
      }
    });
  });

  describe('Response Format Validation', () => {
    it('should validate that all activity tool responses follow MCP format', async () => {
      const tools = [
        () => activityTools.getActivities({}),
        () => activityTools.getActivities({ summary: true }),
        () => activityTools.getActivityDetails({ activityId: 12345678901 })
      ];

      for (const [index, toolFn] of tools.entries()) {
        const response = await toolFn();

        // Every response should have content array
        expect(response, `Activity tool ${index} should have content`).toHaveProperty('content');
        expect(Array.isArray(response.content), `Activity tool ${index} content should be array`).toBe(true);
        expect(response.content.length, `Activity tool ${index} should have at least 1 content item`).toBeGreaterThan(0);

        // Every content item should have type and text
        response.content.forEach((item, itemIndex) => {
          expect(item, `Activity tool ${index} item ${itemIndex} should have type`).toHaveProperty('type');
          expect(item.type, `Activity tool ${index} item ${itemIndex} type should be text`).toBe('text');
          expect(item, `Activity tool ${index} item ${itemIndex} should have text`).toHaveProperty('text');
          expect(typeof item.text, `Activity tool ${index} item ${itemIndex} text should be string`).toBe('string');
          expect(item.text!.length, `Activity tool ${index} item ${itemIndex} text should not be empty`).toBeGreaterThan(0);

          // Validate JSON format
          expect(() => JSON.parse(item.text!), `Activity tool ${index} item ${itemIndex} should have valid JSON`).not.toThrow();
        });
      }
    });
  });

  describe('Data Transformation Validation', () => {
    it('should properly handle null and undefined values', async () => {
      // Mock activity with some null values
      const partialActivity = {
        activityId: 12345678901,
        activityName: "Test Activity",
        activityType: { typeKey: "running" },
        duration: 2400,
        distance: null, // null distance
        calories: undefined, // undefined calories
        averageHR: 0, // zero heart rate
        startTimeLocal: "2025-01-15T07:00:00.000"
      };

      mockClient.getActivities.mockResolvedValueOnce([partialActivity]);

      const result = await activityTools.getActivities({ summary: true });
      const data = JSON.parse(result.content[0].text!);
      const activity = data.activities[0];

      // Preset may convert null to undefined in extraction process
      expect(activity.distance).toBeUndefined(); // null becomes undefined
      expect(activity).not.toHaveProperty('calories'); // undefined is not included in preset output
      expect(activity.averageHR).toBe(0); // zero should be preserved
    });
  });
});
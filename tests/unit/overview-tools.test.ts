import { describe, it, expect, beforeEach } from 'vitest';
import { OverviewTools } from '../../src/tools/basic/overview-tools.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

describe('OverviewTools', () => {
  let overviewTools: OverviewTools;
  let mockClient: ReturnType<typeof createMockGarminClient>;

  beforeEach(() => {
    mockClient = createMockGarminClient();
    overviewTools = new OverviewTools(mockClient);
  });

  describe('getDailyOverview', () => {
    it('should return comprehensive daily overview for a valid date', async () => {
      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.isError).toBeUndefined();

      // Parse the JSON response to verify structure
      const responseText = result.content[0].text;
      expect(responseText).toBeDefined();

      const data = JSON.parse(responseText!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('sleep');
      expect(data).toHaveProperty('activities');
      expect(data).toHaveProperty('health');
      expect(data).toHaveProperty('hints');
    });

    it('should include sleep summary when data is available', async () => {
      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });
      const data = JSON.parse(result.content[0].text!);

      expect(data.sleep).toHaveProperty('totalSleep');
      expect(data.sleep).toHaveProperty('sleepScore');
      expect(data.sleep).toHaveProperty('quality');
      expect(typeof data.sleep.totalSleep).toBe('number');
    });

    it('should include activities summary when data is available', async () => {
      // Import mock data at the top and use it here
      const { mockActivitiesData } = await import('../mocks/garmin-data.js');
      mockClient.getActivities.mockResolvedValueOnce([
        {
          ...mockActivitiesData[0],
          startTimeLocal: '2025-01-15T07:00:00.000'
        }
      ]);

      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });
      const data = JSON.parse(result.content[0].text!);

      expect(Array.isArray(data.activities)).toBe(true);
      expect(data.activities.length).toBeGreaterThan(0);
      expect(data.activities[0]).toHaveProperty('type');
      expect(data.activities[0]).toHaveProperty('name');
      expect(data.activities[0]).toHaveProperty('duration');
    });

    it('should include health metrics when data is available', async () => {
      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });
      const data = JSON.parse(result.content[0].text!);

      expect(data.health).toBeDefined();
      expect(data.health).toHaveProperty('steps', 8542); // getSteps() now returns just the number
      expect(data.health).toHaveProperty('restingHR');
      expect(data.health).toHaveProperty('weight');
      // bodyBattery won't be available since getSteps() returns just a number now
    });

    it('should include helpful hints', async () => {
      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });
      const data = JSON.parse(result.content[0].text!);

      expect(Array.isArray(data.hints)).toBe(true);
      expect(data.hints.length).toBeGreaterThan(0);
      expect(data.hints.some((hint: string) => hint.includes('get_sleep_data'))).toBe(true);
    });

    it('should handle date with no data gracefully', async () => {
      const result = await overviewTools.getDailyOverview({ date: '2025-01-01' });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-01');
    });

    it('should default to today when no date provided', async () => {
      const today = new Date().toISOString().split('T')[0];

      const result = await overviewTools.getDailyOverview({});
      const data = JSON.parse(result.content[0].text!);

      expect(data).toHaveProperty('date', today);
    });

    it('should handle partial data failures gracefully', async () => {
      // Mock one service to fail
      mockClient.getSteps.mockRejectedValueOnce(new Error('Steps service down'));

      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('sleep'); // Should still have sleep data
    });

    it('should filter activities by date correctly', async () => {
      // Import mock data
      const { mockActivitiesData } = await import('../mocks/garmin-data.js');
      // Mock activities from different dates
      mockClient.getActivities.mockResolvedValueOnce([
        {
          ...mockActivitiesData[0],
          startTimeLocal: '2025-01-15T07:00:00.000' // Target date
        },
        {
          ...mockActivitiesData[0],
          startTimeLocal: '2025-01-14T07:00:00.000' // Different date
        }
      ]);

      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });
      const data = JSON.parse(result.content[0].text!);

      // Should only include activity from target date
      expect(Array.isArray(data.activities)).toBe(true);
      expect(data.activities.length).toBe(1);
    });

    it('should handle response size validation', async () => {
      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });
      const responseSize = result.content[0].text!.length;

      // Response should be reasonable size (not trigger fallback to minimal)
      expect(responseSize).toBeLessThan(50000);
      expect(result.content[0].text).not.toContain('Data too large');
    });

    it('should transform data types correctly', async () => {
      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });
      const data = JSON.parse(result.content[0].text!);

      // Sleep duration should be in minutes
      expect(data.sleep.totalSleep).toBe(480); // 8 hours = 480 minutes

      // Weight should be in kg
      expect(data.health.weight).toBe(75.5); // 75500 grams = 75.5 kg

      // Activity duration should be in minutes
      if (data.activities && data.activities.length > 0) {
        expect(typeof data.activities[0].duration).toBe('number');
      }
    });

    it('should handle complete API failure gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingOverviewTools = new OverviewTools(failingClient);

      const result = await failingOverviewTools.getDailyOverview({ date: '2025-01-15' });

      // Overview tools should handle individual service failures gracefully
      // and still return a response with available data
      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      // Data should be minimal due to all services failing
    });
  });
});
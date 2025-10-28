import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverviewTools } from '../../src/tools/basic/overview-tools.js';
import { SleepTools } from '../../src/tools/basic/sleep-tools.js';
import { createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

describe('Error Handling Validation', () => {
  describe('OverviewTools graceful degradation', () => {
    it('should actually handle individual service failures gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const overviewTools = new OverviewTools(failingClient);

      // This should NOT throw an error - should handle failures gracefully
      const result = await overviewTools.getDailyOverview({ date: '2025-01-15' });

      // Verify the response structure is correct
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');

      // Should not have isError flag - this is graceful handling
      expect(result.isError).toBeUndefined();

      // Parse the response to verify it's valid JSON
      expect(() => {
        const data = JSON.parse(result.content[0].text!);
        expect(data).toHaveProperty('date', '2025-01-15');
      }).not.toThrow();
    });
  });

  describe('SleepTools error propagation', () => {
    it('should properly propagate errors from sleep tools', async () => {
      const failingClient = createFailingMockGarminClient();
      const sleepTools = new SleepTools(failingClient);

      // Sleep tools should propagate errors (different behavior than overview)
      const sleepDataResult = await sleepTools.getSleepData({ date: '2025-01-15' });
      expect(sleepDataResult).toHaveProperty('isError', true);
      expect(sleepDataResult.content[0].text).toContain('Failed to get sleep data');

      const sleepDurationResult = await sleepTools.getSleepDuration({ date: '2025-01-15' });
      expect(sleepDurationResult).toHaveProperty('isError', true);
      expect(sleepDurationResult.content[0].text).toContain('Failed to get sleep duration');
    });
  });

  describe('Mock client behavior validation', () => {
    it('should verify that failing mock actually calls the mocked methods', async () => {
      const failingClient = createFailingMockGarminClient();

      // Verify that the mock methods are actually vi.fn() instances
      expect(vi.isMockFunction(failingClient.getSleepData)).toBe(true);
      expect(vi.isMockFunction(failingClient.getActivities)).toBe(true);
      expect(vi.isMockFunction(failingClient.getSteps)).toBe(true);

      // Attempt to call methods and verify they reject
      await expect(failingClient.getSleepData(new Date())).rejects.toThrow('Failed to fetch sleep data');
      await expect(failingClient.getActivities()).rejects.toThrow('Failed to fetch activities');
      await expect(failingClient.getSteps(new Date())).rejects.toThrow('Failed to fetch steps data');

      // Verify methods were called
      expect(failingClient.getSleepData).toHaveBeenCalled();
      expect(failingClient.getActivities).toHaveBeenCalled();
      expect(failingClient.getSteps).toHaveBeenCalled();
    });
  });

  describe('Response format validation', () => {
    it('should validate that all tool responses follow MCP format', async () => {
      const failingClient = createFailingMockGarminClient();
      const overviewTools = new OverviewTools(failingClient);
      const sleepTools = new SleepTools(failingClient);

      const responses = [
        await overviewTools.getDailyOverview({ date: '2025-01-15' }),
        await sleepTools.getSleepData({ date: '2025-01-15' }),
        await sleepTools.getSleepDuration({ date: '2025-01-15' })
      ];

      responses.forEach((response, index) => {
        // Every response should have content array
        expect(response, `Response ${index} should have content`).toHaveProperty('content');
        expect(Array.isArray(response.content), `Response ${index} content should be array`).toBe(true);
        expect(response.content.length, `Response ${index} should have at least 1 content item`).toBeGreaterThan(0);

        // Every content item should have type and text
        response.content.forEach((item, itemIndex) => {
          expect(item, `Response ${index} item ${itemIndex} should have type`).toHaveProperty('type');
          expect(item.type, `Response ${index} item ${itemIndex} type should be text`).toBe('text');
          expect(item, `Response ${index} item ${itemIndex} should have text`).toHaveProperty('text');
          expect(typeof item.text, `Response ${index} item ${itemIndex} text should be string`).toBe('string');
          expect(item.text!.length, `Response ${index} item ${itemIndex} text should not be empty`).toBeGreaterThan(0);
        });
      });
    });
  });
});
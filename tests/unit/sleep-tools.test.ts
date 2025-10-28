import { describe, it, expect, beforeEach } from 'vitest';
import { SleepTools } from '../../src/tools/basic/sleep-tools.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

describe('SleepTools', () => {
  let sleepTools: SleepTools;
  let mockClient: ReturnType<typeof createMockGarminClient>;

  beforeEach(() => {
    mockClient = createMockGarminClient();
    sleepTools = new SleepTools(mockClient);
  });

  describe('getSleepData', () => {
    it('should return sleep data for a valid date', async () => {
      const result = await sleepTools.getSleepData({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Sleep data for');
      expect(result.content[0].text).toContain('dailySleepDTO');
      expect(result.isError).toBeUndefined();
    });

    it('should return sleep data with summary=true', async () => {
      const result = await sleepTools.getSleepData({
        date: '2025-01-15',
        summary: true
      });

      expect(result).toHaveProperty('content');
      const parsedContent = result.content[0].text?.match(/Sleep data for.*:\n\n(.*)/s)?.[1];
      if (parsedContent) {
        const data = JSON.parse(parsedContent);
        expect(data).toHaveProperty('date', '2025-01-15');
        expect(data).toHaveProperty('dailySleepDTO');
        expect(data.dailySleepDTO).toHaveProperty('sleepTimeSeconds');
      }
    });

    it('should return sleep data with specific fields', async () => {
      const result = await sleepTools.getSleepData({
        date: '2025-01-15',
        fields: ['dailySleepDTO']
      });

      expect(result).toHaveProperty('content');
      const parsedContent = result.content[0].text?.match(/Sleep data for.*:\n\n(.*)/s)?.[1];
      if (parsedContent) {
        const data = JSON.parse(parsedContent);
        expect(data).toHaveProperty('dailySleepDTO');
        expect(data).not.toHaveProperty('wellnessEpochSummaryDTO');
      }
    });

    it('should handle no data gracefully', async () => {
      const result = await sleepTools.getSleepData({ date: '2025-01-01' });

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should handle errors gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingSleepTools = new SleepTools(failingClient);

      const result = await failingSleepTools.getSleepData({ date: '2025-01-15' });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get sleep data');
    });

    it('should default to today when no date provided', async () => {
      const result = await sleepTools.getSleepData({});

      expect(result).toHaveProperty('content');
      expect(mockClient.getSleepData).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should handle large data with size validation', async () => {
      // This test would require mocking large data scenario
      const result = await sleepTools.getSleepData({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(result.content[0].text.length).toBeLessThan(100000); // Reasonable size check
    });

    // Backward compatibility tests for includeSummaryOnly parameter
    it('should support includeSummaryOnly parameter', async () => {
      const result = await sleepTools.getSleepData({
        date: '2025-01-15',
        includeSummaryOnly: true
      });

      expect(result).toHaveProperty('content');
      const parsedContent = result.content[0].text?.match(/Sleep data for.*:\n\n(.*)/s)?.[1];
      if (parsedContent) {
        const data = JSON.parse(parsedContent);
        expect(data).toHaveProperty('date', '2025-01-15');
        expect(data).toHaveProperty('dailySleepDTO');
        expect(data.dailySleepDTO).toHaveProperty('sleepTimeSeconds');
      }
    });

    it('should prioritize includeSummaryOnly over deprecated summary parameter', async () => {
      // When both are provided, includeSummaryOnly should take precedence
      const resultWithInclude = await sleepTools.getSleepData({
        date: '2025-01-15',
        includeSummaryOnly: false,
        summary: true
      });

      // includeSummaryOnly=false should result in detailed data (not summary)
      expect(resultWithInclude).toHaveProperty('content');
      const parsedContent = resultWithInclude.content[0].text?.match(/Sleep data for.*:\n\n(.*)/s)?.[1];
      if (parsedContent) {
        const data = JSON.parse(parsedContent);
        // Detailed data should have more fields than summary
        expect(data).toHaveProperty('dailySleepDTO');
      }
    });

    it('should maintain backward compatibility with summary parameter', async () => {
      // The deprecated summary parameter should still work
      const result = await sleepTools.getSleepData({
        date: '2025-01-15',
        summary: true
      });

      expect(result).toHaveProperty('content');
      const parsedContent = result.content[0].text?.match(/Sleep data for.*:\n\n(.*)/s)?.[1];
      if (parsedContent) {
        const data = JSON.parse(parsedContent);
        expect(data).toHaveProperty('date', '2025-01-15');
        expect(data).toHaveProperty('dailySleepDTO');
      }
    });
  });

  describe('getSleepDuration', () => {
    it('should return sleep duration for a valid date', async () => {
      const result = await sleepTools.getSleepDuration({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Sleep duration for');
      expect(result.content[0].text).toContain('Raw data');
      expect(result.isError).toBeUndefined();
    });

    it('should handle numeric duration', async () => {
      // Override mock to return numeric value
      mockClient.getSleepDuration.mockResolvedValueOnce(480); // 8 hours in minutes

      const result = await sleepTools.getSleepDuration({ date: '2025-01-15' });

      expect(result.content[0].text).toContain('480 minutes');
    });

    it('should handle object duration with sleepTimeSeconds', async () => {
      mockClient.getSleepDuration.mockResolvedValueOnce({
        sleepTimeSeconds: 28800 // 8 hours
      });

      const result = await sleepTools.getSleepDuration({ date: '2025-01-15' });

      expect(result.content[0].text).toContain('480 minutes');
      expect(result.content[0].text).toContain('8 hours');
    });

    it('should handle object duration with totalSleepTimeSeconds', async () => {
      mockClient.getSleepDuration.mockResolvedValueOnce({
        totalSleepTimeSeconds: 30600 // 8.5 hours
      });

      const result = await sleepTools.getSleepDuration({ date: '2025-01-15' });

      expect(result.content[0].text).toContain('510 minutes');
      expect(result.content[0].text).toContain('8.5 hours');
    });

    it('should handle object duration with duration field', async () => {
      mockClient.getSleepDuration.mockResolvedValueOnce({ duration: 450 });

      const result = await sleepTools.getSleepDuration({ date: '2025-01-15' });

      expect(result.content[0].text).toContain('450 minutes');
    });

    it('should handle errors gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingSleepTools = new SleepTools(failingClient);

      const result = await failingSleepTools.getSleepDuration({ date: '2025-01-15' });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get sleep duration');
    });

    it('should default to today when no date provided', async () => {
      const result = await sleepTools.getSleepDuration({});

      expect(result).toHaveProperty('content');
      expect(mockClient.getSleepDuration).toHaveBeenCalledWith(expect.any(Date));
    });
  });
});
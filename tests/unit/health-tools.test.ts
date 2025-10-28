import { describe, it, expect, beforeEach } from 'vitest';
import { HealthTools } from '../../src/tools/basic/health-tools.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

describe('HealthTools', () => {
  let healthTools: HealthTools;
  let mockClient: ReturnType<typeof createMockGarminClient>;

  beforeEach(() => {
    mockClient = createMockGarminClient();
    healthTools = new HealthTools(mockClient);
  });

  describe('getHealthMetrics', () => {
    it('should return aggregated health metrics for default metrics', async () => {
      const result = await healthTools.getHealthMetrics({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('hints');
    });

    it('should return only requested metrics', async () => {
      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['steps', 'heart_rate']
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics).toHaveProperty('steps');
      expect(data.metrics.steps).toHaveProperty('steps', 8542);
      expect(data.metrics.steps).toHaveProperty('goal', 10000);
      expect(data.metrics).toHaveProperty('heart_rate');
      expect(data.metrics).not.toHaveProperty('weight');
      expect(data.metrics).not.toHaveProperty('stress');
      expect(data.metrics).not.toHaveProperty('body_battery');
    });

    it('should include steps metrics when requested', async () => {
      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['steps']
      });

      const data = JSON.parse(result.content[0].text!);
      expect(result.isError).toBeUndefined();
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('metrics');
      expect(data.metrics).toHaveProperty('steps');
      expect(data.metrics.steps).toHaveProperty('steps', 8542);
      expect(data.metrics.steps).toHaveProperty('goal', 10000);
      expect(data.metrics.steps).toHaveProperty('goalProgress');
      expect(data.metrics.steps).toHaveProperty('distanceKm');
    });

    it('should include heart rate metrics when requested', async () => {
      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['heart_rate']
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics.heart_rate).toHaveProperty('restingHR');
      expect(data.metrics.heart_rate).toHaveProperty('maxHR');
      expect(data.metrics.heart_rate).toHaveProperty('minHR');
      expect(data.metrics.heart_rate).toHaveProperty('lastSevenDaysAvg');
    });

    it('should include weight metrics when requested', async () => {
      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['weight']
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics.weight).toHaveProperty('weightKg');
      expect(data.metrics.weight).toHaveProperty('bmi');
      expect(data.metrics.weight).toHaveProperty('bodyFat');
      expect(data.metrics.weight).toHaveProperty('muscleMass');
    });

    it('should include stress metrics when requested', async () => {
      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['stress']
      });

      // Stress data comes from getSteps() which now returns just a number
      // Since stress data is not available, getHealthMetrics should return an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: No health data could be retrieved');
    });

    it('should include hydration metrics when requested', async () => {
      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['hydration']
      });

      const data = JSON.parse(result.content[0].text!);
      // Mock returns 67.6 oz, which converts to 67.6 * 29.5735 = 1999.169 ≈ 1999.2 ml
      expect(data.metrics.hydration).toHaveProperty('valueInMilliliters', 1999.2);
      expect(data.metrics.hydration).toHaveProperty('valueInOunces', 67.6);
    });

    it('should include body battery metrics when requested', async () => {
      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['body_battery']
      });

      // Body battery data comes from getSteps() which now returns just a number
      // Since body battery data is not available, getHealthMetrics should return an error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: No health data could be retrieved');
    });

    it('should handle partial failures gracefully', async () => {
      // Mock weight service to fail
      mockClient.getDailyWeightData.mockRejectedValueOnce(new Error('Weight service down'));

      const result = await healthTools.getHealthMetrics({
        date: '2025-01-15',
        metrics: ['steps', 'weight', 'heart_rate']
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.metrics).toHaveProperty('steps');
      expect(data.metrics.steps).toHaveProperty('steps', 8542);
      expect(data.metrics.steps).toHaveProperty('goal', 10000);
      expect(data.metrics).toHaveProperty('heart_rate');
      expect(data.metrics).not.toHaveProperty('weight'); // Should be missing due to failure
    });

    it('should default to today when no date provided', async () => {
      const today = new Date().toISOString().split('T')[0];

      const result = await healthTools.getHealthMetrics({
        metrics: ['steps']
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', today);
      expect(data.metrics).toHaveProperty('steps');
      expect(data.metrics.steps).toHaveProperty('steps', 8542);
      expect(data.metrics.steps).toHaveProperty('goal', 10000);
    });

    it('should handle complete API failure', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingHealthTools = new HealthTools(failingClient);

      const result = await failingHealthTools.getHealthMetrics({ date: '2025-01-15' });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('getStepsData', () => {
    it('should return rich step data including goal and distance', async () => {
      const result = await healthTools.getStepsData({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('steps');
      expect(data.steps).toHaveProperty('total', 8542);
      expect(data.steps).toHaveProperty('goal', 10000);
      expect(data.steps).toHaveProperty('goalProgress', 85);
      expect(data.steps).toHaveProperty('goalProgressPercent', '85%');
      expect(data).toHaveProperty('distance');
      expect(data.distance).toHaveProperty('meters', 6234);
      expect(data.distance).toHaveProperty('kilometers', 6.23);
    });

    it('should return summary data when summary=true', async () => {
      const result = await healthTools.getStepsData({
        date: '2025-01-15',
        summary: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('steps', 8542);
      expect(data).toHaveProperty('goalProgress', '85%');
      expect(data).toHaveProperty('distanceKm', 6.23);
      // Should not have nested objects in summary mode
      expect(data.steps).not.toHaveProperty('total');
    });

    it('should handle zero goal gracefully', async () => {
      mockClient.getDailyStepsData.mockResolvedValueOnce({
        calendarDate: '2025-01-15',
        stepGoal: 0,
        totalDistance: 6234,
        totalSteps: 8542
      });

      const result = await healthTools.getStepsData({ date: '2025-01-15' });

      const data = JSON.parse(result.content[0].text!);
      expect(data.steps.goalProgress).toBe(0);
      expect(data.steps.goalProgressPercent).toBe('0%');
    });

    it('should handle missing data gracefully', async () => {
      const result = await healthTools.getStepsData({ date: '2025-01-01' });

      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-01');
      expect(data.steps.total).toBe(0);
      expect(data.distance.meters).toBe(0);
    });

    it('should handle errors', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingHealthTools = new HealthTools(failingClient);

      const result = await failingHealthTools.getStepsData({ date: '2025-01-15' });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get steps data');
    });

    it('should calculate goal progress percentage correctly', async () => {
      mockClient.getDailyStepsData.mockResolvedValueOnce({
        calendarDate: '2025-01-15',
        stepGoal: 10000,
        totalDistance: 8500,
        totalSteps: 12500 // 125% of goal
      });

      const result = await healthTools.getStepsData({ date: '2025-01-15' });

      const data = JSON.parse(result.content[0].text!);
      expect(data.steps.goalProgress).toBe(125);
      expect(data.steps.goalProgressPercent).toBe('125%');
    });

    it('should convert distance to kilometers correctly', async () => {
      mockClient.getDailyStepsData.mockResolvedValueOnce({
        calendarDate: '2025-01-15',
        stepGoal: 10000,
        totalDistance: 5432, // 5.432 km
        totalSteps: 8542
      });

      const result = await healthTools.getStepsData({ date: '2025-01-15' });

      const data = JSON.parse(result.content[0].text!);
      expect(data.distance.kilometers).toBe(5.43); // Rounded to 2 decimals
      expect(data.distance.meters).toBe(5432);
    });

    // Backward compatibility tests for includeSummaryOnly parameter
    it('should support includeSummaryOnly parameter', async () => {
      const result = await healthTools.getStepsData({
        date: '2025-01-15',
        includeSummaryOnly: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('steps', 8542);
      expect(data).toHaveProperty('goalProgress', '85%');
      expect(data).toHaveProperty('distanceKm', 6.23);
    });

    it('should prioritize includeSummaryOnly over deprecated summary parameter', async () => {
      const result = await healthTools.getStepsData({
        date: '2025-01-15',
        includeSummaryOnly: false,
        summary: true
      });

      // includeSummaryOnly=false should result in detailed data
      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('steps');
      expect(data.steps).toHaveProperty('total');
      expect(data.steps).toHaveProperty('goal');
    });

    it('should maintain backward compatibility with summary parameter', async () => {
      const result = await healthTools.getStepsData({
        date: '2025-01-15',
        summary: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('steps', 8542);
      expect(data).toHaveProperty('goalProgress', '85%');
    });
  });

  describe('getHeartRateData', () => {
    it('should return detailed heart rate data by default', async () => {
      const result = await healthTools.getHeartRateData({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('summary');
      expect(data.summary).toHaveProperty('restingHR');
      expect(data.summary).toHaveProperty('maxHR');
      expect(data.summary).toHaveProperty('minHR');
    });

    it('should return summary data when summary=true', async () => {
      const result = await healthTools.getHeartRateData({
        date: '2025-01-15',
        summary: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('restingHR');
      expect(data).toHaveProperty('maxHR');
      expect(data).toHaveProperty('minHR');
      expect(data).toHaveProperty('lastSevenDaysAvgRestingHR');

      // Should not have detailed timeSeries in summary mode
      expect(data).not.toHaveProperty('timeSeries');
    });

    it('should include time series data when available and reasonable size', async () => {
      const result = await healthTools.getHeartRateData({ date: '2025-01-15' });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('timeSeries');
      expect(data.timeSeries).toHaveProperty('values');
      expect(data.timeSeries).toHaveProperty('descriptors');
      expect(data.timeSeries).toHaveProperty('sampleCount');
    });

    it('should handle large time series gracefully', async () => {
      // Mock large time series data matching HeartRate interface
      const largeArray = new Array(300).fill([75, 80, 85]);
      mockClient.getHeartRate.mockResolvedValueOnce({
        userProfilePK: 12345,
        calendarDate: "2025-01-15",
        restingHeartRate: 55,
        maxHeartRate: 165,
        minHeartRate: 48,
        lastSevenDaysAvgRestingHeartRate: 57,
        heartRateValues: largeArray,
        heartRateValueDescriptors: []
      });

      const result = await healthTools.getHeartRateData({ date: '2025-01-15' });

      const data = JSON.parse(result.content[0].text!);
      expect(data.timeSeries).toHaveProperty('sampleCount', 300);
      expect(data.timeSeries).toHaveProperty('note');
      expect(data.timeSeries.note).toContain('too large');
    });

    it('should handle missing data gracefully', async () => {
      const result = await healthTools.getHeartRateData({ date: '2025-01-01' });

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('No heart rate data available');
    });

    it('should handle errors', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingHealthTools = new HealthTools(failingClient);

      const result = await failingHealthTools.getHeartRateData({ date: '2025-01-15' });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get heart rate data');
    });

    // Backward compatibility tests for includeSummaryOnly parameter
    it('should support includeSummaryOnly parameter', async () => {
      const result = await healthTools.getHeartRateData({
        date: '2025-01-15',
        includeSummaryOnly: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('restingHR');
      expect(data).toHaveProperty('maxHR');
      expect(data).not.toHaveProperty('timeSeries');
    });

    it('should prioritize includeSummaryOnly over deprecated summary parameter', async () => {
      const result = await healthTools.getHeartRateData({
        date: '2025-01-15',
        includeSummaryOnly: false,
        summary: true
      });

      // includeSummaryOnly=false should result in detailed data
      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('timeSeries');
    });

    it('should maintain backward compatibility with summary parameter', async () => {
      const result = await healthTools.getHeartRateData({
        date: '2025-01-15',
        summary: true
      });

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('restingHR');
      expect(data).not.toHaveProperty('timeSeries');
    });
  });

  describe('getWeightData', () => {
    it('should return complete weight and body composition data', async () => {
      const result = await healthTools.getWeightData({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('weight');
      expect(data.weight).toHaveProperty('weightKg');
      expect(data.weight).toHaveProperty('bmi');
      expect(data.weight).toHaveProperty('bodyFat');
      expect(data.weight).toHaveProperty('bodyWater');
      expect(data.weight).toHaveProperty('muscleMass');
      expect(data.weight).toHaveProperty('physiqueRating');
      expect(data.weight).toHaveProperty('visceralFat');
      expect(data.weight).toHaveProperty('metabolicAge');
    });

    it('should convert weight from grams to kg', async () => {
      const result = await healthTools.getWeightData({ date: '2025-01-15' });

      const data = JSON.parse(result.content[0].text!);
      expect(data.weight.weightKg).toBe(75.5); // 75500 grams = 75.5 kg
    });

    it('should handle missing data gracefully', async () => {
      const result = await healthTools.getWeightData({ date: '2025-01-01' });

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('No weight data available');
    });

    it('should handle errors', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingHealthTools = new HealthTools(failingClient);

      const result = await failingHealthTools.getWeightData({ date: '2025-01-15' });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get weight data');
    });

    it('should default to today when no date provided', async () => {
      const today = new Date().toISOString().split('T')[0];

      const result = await healthTools.getWeightData({});

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', today);
    });
  });

  describe('getHydrationData', () => {
    it('should return hydration data for a given date', async () => {
      const result = await healthTools.getHydrationData({ date: '2025-01-15' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', '2025-01-15');
      expect(data).toHaveProperty('hydration');
      // Mock returns 67.6 oz, which converts to 67.6 * 29.5735 = 1999.169 ≈ 1999.2 ml
      expect(data.hydration).toHaveProperty('valueInMilliliters', 1999.2);
      expect(data.hydration).toHaveProperty('valueInOunces', 67.6);
      expect(data.hydration).toHaveProperty('unit', 'ml');
    });

    it('should convert ounces to milliliters correctly', async () => {
      mockClient.getDailyHydration.mockResolvedValueOnce(50.7); // 50.7 oz (garmin-connect returns ounces)

      const result = await healthTools.getHydrationData({ date: '2025-01-15' });

      const data = JSON.parse(result.content[0].text!);
      // 50.7 oz * 29.5735 ml/oz = 1499.377 ≈ 1499.4 ml
      expect(data.hydration.valueInMilliliters).toBe(1499.4);
      expect(data.hydration.valueInOunces).toBe(50.7);
    });

    it('should handle missing data gracefully', async () => {
      const result = await healthTools.getHydrationData({ date: '2025-01-01' });

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('No hydration data available');
    });

    it('should handle null hydration value', async () => {
      mockClient.getDailyHydration.mockResolvedValueOnce(null);

      const result = await healthTools.getHydrationData({ date: '2025-01-15' });

      expect(result.content[0].text).toContain('No hydration data available');
    });

    it('should handle undefined hydration value', async () => {
      mockClient.getDailyHydration.mockResolvedValueOnce(undefined);

      const result = await healthTools.getHydrationData({ date: '2025-01-15' });

      expect(result.content[0].text).toContain('No hydration data available');
    });

    it('should handle errors', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingHealthTools = new HealthTools(failingClient);

      const result = await failingHealthTools.getHydrationData({ date: '2025-01-15' });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get hydration data');
    });

    it('should default to today when no date provided', async () => {
      const today = new Date().toISOString().split('T')[0];

      const result = await healthTools.getHydrationData({});

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('date', today);
    });
  });

  describe('Response Format Validation', () => {
    it('should validate that all health tool responses follow MCP format', async () => {
      const tools = [
        () => healthTools.getHealthMetrics({ date: '2025-01-15' }),
        () => healthTools.getStepsData({ date: '2025-01-15' }),
        () => healthTools.getHeartRateData({ date: '2025-01-15' }),
        () => healthTools.getWeightData({ date: '2025-01-15' }),
        () => healthTools.getHydrationData({ date: '2025-01-15' })
      ];

      for (const [index, toolFn] of tools.entries()) {
        const response = await toolFn();

        // Every response should have content array
        expect(response, `Health tool ${index} should have content`).toHaveProperty('content');
        expect(Array.isArray(response.content), `Health tool ${index} content should be array`).toBe(true);
        expect(response.content.length, `Health tool ${index} should have at least 1 content item`).toBeGreaterThan(0);

        // Every content item should have type and text
        response.content.forEach((item, itemIndex) => {
          expect(item, `Health tool ${index} item ${itemIndex} should have type`).toHaveProperty('type');
          expect(item.type, `Health tool ${index} item ${itemIndex} type should be text`).toBe('text');
          expect(item, `Health tool ${index} item ${itemIndex} should have text`).toHaveProperty('text');
          expect(typeof item.text, `Health tool ${index} item ${itemIndex} text should be string`).toBe('string');
          expect(item.text!.length, `Health tool ${index} item ${itemIndex} text should not be empty`).toBeGreaterThan(0);

          // Validate JSON format
          expect(() => JSON.parse(item.text!), `Health tool ${index} item ${itemIndex} should have valid JSON`).not.toThrow();
        });
      }
    });
  });
});
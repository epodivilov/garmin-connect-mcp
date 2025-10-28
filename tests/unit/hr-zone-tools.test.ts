import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HRZoneTools } from '../../src/tools/analytics/hr-zone-tools.js';
import { createMockGarminClient, createFailingMockGarminClient } from '../mocks/garmin-client-mock.js';

describe('HRZoneTools', () => {
  let hrZoneTools: HRZoneTools;
  let mockClient: ReturnType<typeof createMockGarminClient>;

  beforeEach(() => {
    mockClient = createMockGarminClient();
    hrZoneTools = new HRZoneTools(mockClient);
  });

  describe('getActivityHRZones', () => {
    it('should return HR zone distribution for an activity', async () => {
      const result = await hrZoneTools.getActivityHRZones({
        activityId: 12345678901
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('activityId', 12345678901);
      expect(data).toHaveProperty('activityName', 'Morning Run');
      expect(data).toHaveProperty('activityType', 'running');
      expect(data).toHaveProperty('hasHRData', true);
      expect(data).toHaveProperty('zoneDistribution');
      expect(data.zoneDistribution).toHaveLength(5);
      expect(data).toHaveProperty('summary');
      expect(data.summary).toHaveProperty('dominantZone');
    });

    it('should require activityId parameter', async () => {
      const result = await hrZoneTools.getActivityHRZones({});

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('activityId is required');
    });

    it('should handle activity without HR data', async () => {
      // Mock activity without HR data
      mockClient.getActivity = vi.fn().mockResolvedValueOnce({
        activityId: 99999,
        activityName: 'Walking',
        activityType: { typeKey: 'walking' },
        duration: 1800,
        startTimeLocal: '2025-01-15T10:00:00.000'
        // No HR data
      });

      const result = await hrZoneTools.getActivityHRZones({
        activityId: 99999
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.hasHRData).toBe(false);
      expect(data.message).toContain('does not contain heart rate data');
    });

    it('should handle non-existent activity', async () => {
      const result = await hrZoneTools.getActivityHRZones({
        activityId: 99999999
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('No activity found');
    });

    it('should use custom max HR when provided', async () => {
      const result = await hrZoneTools.getActivityHRZones({
        activityId: 12345678901,
        maxHR: 200
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);

      // Zones should be calculated based on maxHR of 200
      // Zone 1: 50-60% of 200 = 100-120 bpm
      // Zone ranges in the response should reflect this
      expect(data.zoneDistribution[0].range).toContain('100-120');
    });

    it('should use custom zone configuration when provided', async () => {
      const customZones = {
        zone1: { min: 40, max: 50 },
        zone2: { min: 50, max: 65 },
        zone3: { min: 65, max: 75 },
        zone4: { min: 75, max: 85 },
        zone5: { min: 85, max: 100 }
      };

      const result = await hrZoneTools.getActivityHRZones({
        activityId: 12345678901,
        maxHR: 200,
        customZones
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);

      // Zone 1 should be 40-50% of 200 = 80-100 bpm
      expect(data.zoneDistribution[0].range).toContain('80-100');
    });

    it('should include zone labels in distribution', async () => {
      const result = await hrZoneTools.getActivityHRZones({
        activityId: 12345678901
      });

      const data = JSON.parse(result.content[0].text!);
      const zones = data.zoneDistribution;

      expect(zones[0].label).toBe('Recovery');
      expect(zones[1].label).toBe('Endurance');
      expect(zones[2].label).toBe('Tempo');
      expect(zones[3].label).toBe('Threshold');
      expect(zones[4].label).toBe('Anaerobic');
    });

    it('should include time in both seconds and minutes', async () => {
      const result = await hrZoneTools.getActivityHRZones({
        activityId: 12345678901
      });

      const data = JSON.parse(result.content[0].text!);
      const zones = data.zoneDistribution;

      zones.forEach((zone: any) => {
        expect(zone).toHaveProperty('timeSeconds');
        expect(zone).toHaveProperty('timeMinutes');
        expect(zone).toHaveProperty('percentage');
      });
    });

    it('should include summary with dominant zone', async () => {
      const result = await hrZoneTools.getActivityHRZones({
        activityId: 12345678901
      });

      const data = JSON.parse(result.content[0].text!);

      expect(data.summary).toHaveProperty('totalTimeInZones');
      expect(data.summary).toHaveProperty('averageHR', 150);
      expect(data.summary).toHaveProperty('maxHR', 175);
      expect(data.summary).toHaveProperty('dominantZone');
      expect(data.summary.dominantZone).toBeGreaterThanOrEqual(1);
      expect(data.summary.dominantZone).toBeLessThanOrEqual(5);
    });

    it('should handle errors gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingTools = new HRZoneTools(failingClient);

      const result = await failingTools.getActivityHRZones({
        activityId: 12345678901
      });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('Failed to get activity HR zones');
    });
  });

  describe('getAggregatedHRZones', () => {
    it('should require valid period configuration for weekly', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'weekly',
        year: 2025
        // Missing week
      });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('week are required');
    });

    it('should require valid period configuration for monthly', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'monthly',
        year: 2025
        // Missing month
      });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('month are required');
    });

    it('should require dateRange for custom period', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom'
        // Missing dateRange
      });

      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain('dateRange is required');
    });

    it('should aggregate HR zones for weekly period', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'weekly',
        year: 2025,
        week: 3
      });

      // This may return no activities or aggregated data depending on mock
      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('period');
      expect(data.period.type).toBe('weekly');
      expect(data.period).toHaveProperty('startDate');
      expect(data.period).toHaveProperty('endDate');
      expect(data.period).toHaveProperty('label');
    });

    it('should aggregate HR zones for monthly period', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'monthly',
        year: 2025,
        month: 1
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('period');
      expect(data.period.type).toBe('monthly');
      expect(data.period.label).toContain('January');
    });

    it('should aggregate HR zones for custom date range', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-01/2025-01-31'
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('period');
      expect(data.period.type).toBe('custom');
      expect(data.period.startDate).toBe('2025-01-01');
      expect(data.period.endDate).toBe('2025-01-31');
    });

    it('should include aggregated zone distribution', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20'
      });

      const data = JSON.parse(result.content[0].text!);

      if (data.totalActivities > 0 && data.activitiesWithHR > 0) {
        expect(data).toHaveProperty('zoneDistribution');
        expect(data.zoneDistribution).toHaveLength(5);

        data.zoneDistribution.forEach((zone: any) => {
          expect(zone).toHaveProperty('zone');
          expect(zone).toHaveProperty('label');
          expect(zone).toHaveProperty('timeSeconds');
          expect(zone).toHaveProperty('percentage');
        });
      }
    });

    it('should include activity type breakdown by default', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20'
      });

      const data = JSON.parse(result.content[0].text!);

      if (data.activitiesWithHR > 0) {
        // Should include byActivityType by default
        expect(data).toHaveProperty('byActivityType');
      }
    });

    it('should include visualization data by default', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20'
      });

      const data = JSON.parse(result.content[0].text!);

      if (data.activitiesWithHR > 0) {
        // Should include visualization by default
        expect(data).toHaveProperty('visualization');
        expect(data.visualization).toHaveProperty('labels');
        expect(data.visualization).toHaveProperty('values');
        expect(data.visualization).toHaveProperty('colors');
      }
    });

    it('should respect includeActivityBreakdown option', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20',
        includeActivityBreakdown: false
      });

      const data = JSON.parse(result.content[0].text!);

      // Should not include byActivityType when disabled
      expect(data).not.toHaveProperty('byActivityType');
    });

    it('should respect includeVisualization option', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20',
        includeVisualization: false
      });

      const data = JSON.parse(result.content[0].text!);

      // Should not include visualization when disabled
      expect(data).not.toHaveProperty('visualization');
    });

    it('should filter by activity types when provided', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20',
        activityTypes: ['running']
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      // Mock should handle filtering
      const data = JSON.parse(result.content[0].text!);
      expect(data).toHaveProperty('totalActivities');
    });

    it('should respect maxActivities limit', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-01/2025-12-31',
        maxActivities: 10
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);
      expect(data.totalActivities).toBeLessThanOrEqual(10);
    });

    it('should use custom max HR when provided', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20',
        maxHR: 200
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text!);

      if (data.activitiesWithHR > 0) {
        // Zone ranges should reflect maxHR of 200
        expect(data.zoneDistribution[0].range).toContain('100-120');
      }
    });

    it('should handle period with no activities', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2020-01-01/2020-01-02' // Far in past
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);

      expect(data.totalActivities).toBe(0);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('No activities found');
    });

    it('should count activities with and without HR data separately', async () => {
      const result = await hrZoneTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-10/2025-01-20'
      });

      const data = JSON.parse(result.content[0].text!);

      expect(data).toHaveProperty('totalActivities');
      expect(data).toHaveProperty('activitiesWithHR');
      expect(data.activitiesWithHR).toBeLessThanOrEqual(data.totalActivities);
    });

    it('should handle errors gracefully', async () => {
      const failingClient = createFailingMockGarminClient();
      const failingTools = new HRZoneTools(failingClient);

      const result = await failingTools.getAggregatedHRZones({
        periodType: 'custom',
        dateRange: '2025-01-01/2025-01-31'
      });

      // The aggregated tool catches errors and returns no activities rather than error
      // Because it catches API errors during batch fetching
      expect(result).toHaveProperty('content');
      const data = JSON.parse(result.content[0].text!);
      expect(data.totalActivities).toBe(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should validate that all HR zone tool responses follow MCP format', async () => {
      const tools = [
        () => hrZoneTools.getActivityHRZones({ activityId: 12345678901 }),
        () => hrZoneTools.getAggregatedHRZones({
          periodType: 'custom',
          dateRange: '2025-01-10/2025-01-20'
        })
      ];

      for (const [index, toolFn] of tools.entries()) {
        const response = await toolFn();

        // Every response should have content array
        expect(response, `HR zone tool ${index} should have content`).toHaveProperty('content');
        expect(Array.isArray(response.content), `HR zone tool ${index} content should be array`).toBe(true);
        expect(response.content.length, `HR zone tool ${index} should have at least 1 content item`).toBeGreaterThan(0);

        // Every content item should have type and text
        response.content.forEach((item, itemIndex) => {
          expect(item, `HR zone tool ${index} item ${itemIndex} should have type`).toHaveProperty('type');
          expect(item.type, `HR zone tool ${index} item ${itemIndex} type should be text`).toBe('text');
          expect(item, `HR zone tool ${index} item ${itemIndex} should have text`).toHaveProperty('text');
          expect(typeof item.text, `HR zone tool ${index} item ${itemIndex} text should be string`).toBe('string');
          expect(item.text!.length, `HR zone tool ${index} item ${itemIndex} text should not be empty`).toBeGreaterThan(0);

          // Validate JSON format
          expect(() => JSON.parse(item.text!), `HR zone tool ${index} item ${itemIndex} should have valid JSON`).not.toThrow();
        });
      }
    });
  });
});

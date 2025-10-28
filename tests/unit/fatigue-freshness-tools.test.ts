/**
 * Fatigue-Freshness Tools Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { FatigueFreshnessTools } from '../../src/tools/tracking/fatigue-freshness-tools.js';

// Mock Garmin client
const mockGarminClient = {
  getActivities: vi.fn(),
  getActivity: vi.fn(),
} as any;

describe('FatigueFreshnessTools', () => {
  describe('getCurrentFormAnalysis', () => {
    it('should return error when no data available', async () => {
      mockGarminClient.getActivities.mockResolvedValue([]);
      const tools = new FatigueFreshnessTools(mockGarminClient);
      
      const result = await tools.getCurrentFormAnalysis({});
      
      expect(result.isError).toBe(true);
    });
  });

  describe('getFormHistory', () => {
    it('should query history by date range', async () => {
      const tools = new FatigueFreshnessTools(mockGarminClient);
      
      const result = await tools.getFormHistory({
        dateRange: '2025-01-01/2025-01-31',
      });
      
      expect(result.content).toBeDefined();
    });
  });

  describe('predictFutureForm', () => {
    it('should handle missing current state', async () => {
      mockGarminClient.getActivities.mockResolvedValue([]);
      const tools = new FatigueFreshnessTools(mockGarminClient);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const result = await tools.predictFutureForm({
        targetDate: futureDate.toISOString().split('T')[0],
        plannedTSS: 60,
      });
      
      expect(result.isError).toBe(true);
    });
  });

  describe('generateTaperPlan', () => {
    it('should handle missing current state', async () => {
      mockGarminClient.getActivities.mockResolvedValue([]);
      const tools = new FatigueFreshnessTools(mockGarminClient);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      
      const result = await tools.generateTaperPlan({
        raceDate: futureDate.toISOString().split('T')[0],
      });
      
      expect(result.isError).toBe(true);
    });
  });

  describe('analyzeFormPerformance', () => {
    it('should return message when no PRs found', async () => {
      mockGarminClient.getActivities.mockResolvedValue([]);
      const tools = new FatigueFreshnessTools(mockGarminClient);
      
      const result = await tools.analyzeFormPerformance({});
      
      expect(result.content).toBeDefined();
    });
  });
});

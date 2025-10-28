/**
 * Integration tests demonstrating real-world usage of parameter validators
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateDate,
  validateDateRange,
  validateActivityTypes,
  validateSport,
  validateMaxActivities,
  validateBooleanFlag
} from '../parameter-validators.js';

describe('Parameter Validators - Integration Tests', () => {
  describe('Simulating MCP tool parameter validation', () => {
    it('should validate typical activity volume tool parameters', () => {
      // Simulating parameters from getWeeklyVolume tool
      const params = {
        year: 2025,
        week: 42,
        includeActivityBreakdown: true,
        maxActivities: 1000,
        activityTypes: ['running', 'cycling']
      };

      // Validate parameters
      expect(validateBooleanFlag(params.includeActivityBreakdown)).toBe(true);
      expect(validateMaxActivities(params.maxActivities)).toBe(1000);
      expect(validateActivityTypes(params.activityTypes)).toEqual(['running', 'cycling']);
    });

    it('should validate typical sport progress tool parameters', () => {
      // Simulating parameters from getSportProgress tool
      const params = {
        dateRange: '2025-01-01/2025-03-31',
        sport: 'running',
        includeEfficiency: true,
        maxActivities: 500
      };

      // Validate parameters
      const range = validateDateRange(params.dateRange, { maxDays: 365 });
      expect(range.start.toISOString().split('T')[0]).toBe('2025-01-01');
      expect(range.end.toISOString().split('T')[0]).toBe('2025-03-31');

      expect(validateSport(params.sport)).toBe('running');
      expect(validateBooleanFlag(params.includeEfficiency)).toBe(true);
      expect(validateMaxActivities(params.maxActivities)).toBe(500);
    });

    it('should validate sleep data tool parameters', () => {
      // Simulating parameters from getSleepData tool
      const params = {
        date: '2025-10-13',
        summary: false
      };

      // Validate parameters
      const date = validateDate(params.date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(9); // October
      expect(date.getDate()).toBe(13);

      expect(validateBooleanFlag(params.summary)).toBe(false);
    });

    it('should handle optional parameters with defaults', () => {
      // Simulating parameters with optionals
      const params = {
        // date not provided
        // maxActivities not provided
        // activityTypes not provided
      };

      // Validate with defaults
      expect(validateDate(params.date as any)).toBeInstanceOf(Date);
      expect(validateMaxActivities(params.maxActivities, 1000)).toBe(1000);
      expect(validateActivityTypes(params.activityTypes)).toBeUndefined();
    });
  });

  describe('Error handling in tool context', () => {
    it('should provide actionable error for invalid date format', () => {
      try {
        validateDate('10/13/2025');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const ve = error as ValidationError;
        expect(ve.message).toContain('YYYY-MM-DD');
        expect(ve.message).toContain('2025-10-13');
        expect(ve.parameterName).toBe('date');
      }
    });

    it('should provide actionable error for invalid date range', () => {
      try {
        validateDateRange('2025-12-31/2025-01-01');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const ve = error as ValidationError;
        expect(ve.message).toContain('must be before or equal to');
      }
    });

    it('should provide actionable error for exceeding max activities', () => {
      try {
        validateMaxActivities(10000);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const ve = error as ValidationError;
        expect(ve.message).toContain('cannot exceed 5000');
        expect(ve.message).toContain('smaller batches');
      }
    });
  });

  describe('Backward compatibility with existing code', () => {
    it('should work with existing parseDateRange string format', () => {
      const result = validateDateRange('2025-01-01/2025-12-31');
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
    });

    it('should support new object date range format', () => {
      const result = validateDateRange({
        start: '2025-01-01',
        end: '2025-12-31'
      });
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
    });

    it('should preserve undefined optionality', () => {
      // These should return undefined, not throw
      expect(validateSport(undefined)).toBeUndefined();
      expect(validateActivityTypes(undefined)).toBeUndefined();
      expect(validateMaxActivities(undefined)).toBeUndefined();
      expect(validateBooleanFlag(undefined)).toBeUndefined();
    });
  });

  describe('Edge cases in real usage', () => {
    it('should handle single-day date ranges', () => {
      const result = validateDateRange('2025-10-13/2025-10-13');
      expect(result.start.toDateString()).toBe(result.end.toDateString());
    });

    it('should handle empty activity types array', () => {
      const result = validateActivityTypes([]);
      expect(result).toEqual([]);
    });

    it('should handle max activities at boundaries', () => {
      expect(validateMaxActivities(1)).toBe(1);
      expect(validateMaxActivities(5000)).toBe(5000);
    });

    it('should reject activity types with whitespace-only strings', () => {
      expect(() => validateActivityTypes(['running', '   '])).toThrow(ValidationError);
    });
  });

  describe('Comprehensive parameter validation flow', () => {
    it('should validate a complete tool call parameter set', () => {
      // Simulating a complex tool call with all parameter types
      const toolParams = {
        dateRange: '2025-01-01/2025-03-31',
        sport: 'running',
        activityTypes: ['running', 'trail_running'],
        maxActivities: 2000,
        includeEfficiency: true,
        includeTrends: false,
        minDuration: 300
      };

      // Validate all parameters
      const dateRange = validateDateRange(toolParams.dateRange, { maxDays: 365 });
      const sport = validateSport(toolParams.sport);
      const activityTypes = validateActivityTypes(toolParams.activityTypes);
      const maxActivities = validateMaxActivities(toolParams.maxActivities);
      const includeEfficiency = validateBooleanFlag(toolParams.includeEfficiency);
      const includeTrends = validateBooleanFlag(toolParams.includeTrends);

      // Assert all validations passed
      expect(dateRange.start).toBeInstanceOf(Date);
      expect(dateRange.end).toBeInstanceOf(Date);
      expect(sport).toBe('running');
      expect(activityTypes).toEqual(['running', 'trail_running']);
      expect(maxActivities).toBe(2000);
      expect(includeEfficiency).toBe(true);
      expect(includeTrends).toBe(false);
    });
  });
});

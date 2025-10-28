import { describe, it, expect } from 'vitest';
import {
  secondsToMinutes,
  millisecondsToDate,
  gramsToKg,
  metersToKm,
  removeEmptyValues,
  formatActivityType,
  getISOWeek,
  getISOWeekRange,
  getMonthRange,
  parseDateRange,
  isDateInRange
} from '../../src/utils/data-transforms.js';

describe('Data Transforms', () => {
  describe('secondsToMinutes', () => {
    it('should convert seconds to minutes correctly', () => {
      expect(secondsToMinutes(3600)).toBe(60);
      expect(secondsToMinutes(1800)).toBe(30);
      expect(secondsToMinutes(90)).toBe(2); // Rounded
    });

    it('should handle edge cases', () => {
      expect(secondsToMinutes(0)).toBe(0);
      expect(secondsToMinutes(undefined)).toBeUndefined();
      expect(secondsToMinutes(null as any)).toBeUndefined();
    });

    it('should round to nearest minute', () => {
      expect(secondsToMinutes(89)).toBe(1);
      expect(secondsToMinutes(91)).toBe(2);
    });
  });

  describe('millisecondsToDate', () => {
    it('should convert milliseconds to ISO date string', () => {
      const timestamp = 1698019200000; // 2023-10-23
      expect(millisecondsToDate(timestamp)).toBe('2023-10-23');
    });

    it('should handle edge cases', () => {
      expect(millisecondsToDate(undefined)).toBeUndefined();
      expect(millisecondsToDate(null as any)).toBeUndefined();
      expect(millisecondsToDate(0)).toBe('1970-01-01');
    });
  });

  describe('gramsToKg', () => {
    it('should convert grams to kilograms correctly', () => {
      expect(gramsToKg(75500)).toBe(75.5);
      expect(gramsToKg(1000)).toBe(1);
      expect(gramsToKg(2500)).toBe(2.5);
    });

    it('should handle edge cases', () => {
      expect(gramsToKg(0)).toBe(0);
      expect(gramsToKg(undefined)).toBeUndefined();
      expect(gramsToKg(null as any)).toBeUndefined();
    });

    it('should round to 2 decimal places', () => {
      expect(gramsToKg(1234)).toBe(1.23);
      expect(gramsToKg(1235)).toBe(1.24); // Rounded up
    });
  });

  describe('metersToKm', () => {
    it('should convert meters to kilometers correctly', () => {
      expect(metersToKm(5000)).toBe(5);
      expect(metersToKm(1000)).toBe(1);
      expect(metersToKm(2500)).toBe(2.5);
    });

    it('should handle edge cases', () => {
      expect(metersToKm(0)).toBe(0);
      expect(metersToKm(undefined)).toBeUndefined();
      expect(metersToKm(null as any)).toBeUndefined();
    });

    it('should round to 2 decimal places', () => {
      expect(metersToKm(1234)).toBe(1.23);
      expect(metersToKm(1235)).toBe(1.24); // Rounded up
    });

    it('should handle small distances', () => {
      expect(metersToKm(500)).toBe(0.5);
      expect(metersToKm(123)).toBe(0.12);
    });
  });

  describe('removeEmptyValues', () => {
    it('should remove null and undefined values', () => {
      const input = {
        name: 'John',
        age: null,
        email: undefined,
        active: true
      };

      const result = removeEmptyValues(input);
      expect(result).toEqual({
        name: 'John',
        active: true
      });
    });

    it('should remove empty strings', () => {
      const input = {
        name: 'John',
        bio: '',
        location: 'NYC'
      };

      const result = removeEmptyValues(input);
      expect(result).toEqual({
        name: 'John',
        location: 'NYC'
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John',
          email: null,
          settings: {
            theme: 'dark',
            notifications: undefined
          }
        },
        data: null
      };

      const result = removeEmptyValues(input);
      expect(result).toEqual({
        user: {
          name: 'John',
          settings: {
            theme: 'dark'
          }
        }
      });
    });

    it('should handle arrays', () => {
      const input = {
        items: [1, null, 3, undefined, 5, ''],
        tags: ['tag1', '', 'tag2']
      };

      const result = removeEmptyValues(input);
      expect(result).toEqual({
        items: [1, 3, 5],
        tags: ['tag1', 'tag2']
      });
    });

    it('should handle edge cases', () => {
      expect(removeEmptyValues(null)).toBeUndefined();
      expect(removeEmptyValues(undefined)).toBeUndefined();
      expect(removeEmptyValues('')).toBeUndefined();
      expect(removeEmptyValues({})).toBeUndefined();
      expect(removeEmptyValues([])).toEqual([]);
    });

    it('should preserve zero and false values', () => {
      const input = {
        count: 0,
        enabled: false,
        score: 0.0
      };

      const result = removeEmptyValues(input);
      expect(result).toEqual({
        count: 0,
        enabled: false,
        score: 0
      });
    });
  });

  describe('formatActivityType', () => {
    it('should format known activity types', () => {
      expect(formatActivityType('running')).toBe('Run');
      expect(formatActivityType('cycling')).toBe('Ride');
      expect(formatActivityType('walking')).toBe('Walk');
      expect(formatActivityType('swimming')).toBe('Swim');
      expect(formatActivityType('strength_training')).toBe('Strength');
      expect(formatActivityType('cardio')).toBe('Cardio');
    });

    it('should format unknown activity types', () => {
      expect(formatActivityType('rock_climbing')).toBe('Rock Climbing');
      expect(formatActivityType('mountain_biking')).toBe('Mountain Biking');
      expect(formatActivityType('yoga')).toBe('Yoga');
    });

    it('should handle edge cases', () => {
      expect(formatActivityType('')).toBe('');
      expect(formatActivityType('RUNNING')).toBe('RUNNING');
      expect(formatActivityType('multi_sport')).toBe('Multi Sport');
    });

    it('should handle single words', () => {
      expect(formatActivityType('tennis')).toBe('Tennis');
      expect(formatActivityType('golf')).toBe('Golf');
    });
  });

  describe('getISOWeek', () => {
    it('should get correct ISO week for various dates', () => {
      // January 1, 2024 is a Monday and is week 1
      expect(getISOWeek(new Date('2024-01-01'))).toEqual({ year: 2024, week: 1 });

      // January 4, 2024 is a Thursday and should be week 1
      expect(getISOWeek(new Date('2024-01-04'))).toEqual({ year: 2024, week: 1 });

      // December 30, 2023 should be week 52 of 2023
      expect(getISOWeek(new Date('2023-12-30'))).toEqual({ year: 2023, week: 52 });
    });

    it('should handle year boundaries correctly', () => {
      // January 1, 2023 is a Sunday, should be week 52 of 2022
      expect(getISOWeek(new Date('2023-01-01'))).toEqual({ year: 2022, week: 52 });

      // January 2, 2023 is a Monday, should be week 1 of 2023
      expect(getISOWeek(new Date('2023-01-02'))).toEqual({ year: 2023, week: 1 });
    });
  });

  describe('getISOWeekRange', () => {
    it('should get correct date range for ISO week', () => {
      // Week 1 of 2024 (January 1-7, 2024)
      const { start, end } = getISOWeekRange(2024, 1);
      expect(start.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-07');
    });

    it('should handle different years', () => {
      // Week 52 of 2023
      const { start, end } = getISOWeekRange(2023, 52);
      expect(start.toISOString().split('T')[0]).toBe('2023-12-25');
      expect(end.toISOString().split('T')[0]).toBe('2023-12-31');
    });

    it('should handle mid-year weeks', () => {
      // Week 26 of 2024 (around late June)
      const { start, end } = getISOWeekRange(2024, 26);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      // Verify it's a 7-day range
      const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBe(6);
    });
  });

  describe('getMonthRange', () => {
    it('should get correct date range for regular months', () => {
      // January 2024
      const { start, end } = getMonthRange(2024, 1);
      expect(start.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-31');
    });

    it('should handle February in leap year', () => {
      // February 2024 (leap year)
      const { start, end } = getMonthRange(2024, 2);
      expect(start.toISOString().split('T')[0]).toBe('2024-02-01');
      expect(end.toISOString().split('T')[0]).toBe('2024-02-29');
    });

    it('should handle February in non-leap year', () => {
      // February 2023 (non-leap year)
      const { start, end } = getMonthRange(2023, 2);
      expect(start.toISOString().split('T')[0]).toBe('2023-02-01');
      expect(end.toISOString().split('T')[0]).toBe('2023-02-28');
    });

    it('should handle months with 30 days', () => {
      // April 2024
      const { start, end } = getMonthRange(2024, 4);
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(3); // April is month 3 (0-indexed)
      expect(start.getDate()).toBe(1);
      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(3); // April is month 3 (0-indexed)
      expect(end.getDate()).toBe(30); // April has 30 days
    });
  });

  describe('parseDateRange', () => {
    it('should parse valid date range', () => {
      const { start, end } = parseDateRange('2024-01-01/2024-01-31');
      expect(start.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-31');
    });

    it('should handle same start and end date', () => {
      const { start, end } = parseDateRange('2024-01-15/2024-01-15');
      expect(start.toISOString().split('T')[0]).toBe('2024-01-15');
      expect(end.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('should throw error for invalid format', () => {
      expect(() => parseDateRange('2024-01-01')).toThrow('Invalid date range format');
      expect(() => parseDateRange('2024-01-01/')).toThrow('Invalid date range format');
      expect(() => parseDateRange('/2024-01-31')).toThrow('Invalid date range format');
    });

    it('should throw error for invalid dates', () => {
      expect(() => parseDateRange('invalid-date/2024-01-31')).toThrow('Invalid date format');
      expect(() => parseDateRange('2024-01-01/invalid-date')).toThrow('Invalid date format');
      expect(() => parseDateRange('2024-13-01/2024-12-31')).toThrow('Invalid date format');
    });

    it('should throw error when start date is after end date', () => {
      expect(() => parseDateRange('2024-01-31/2024-01-01')).toThrow('Start date must be before or equal to end date');
    });
  });

  describe('isDateInRange', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should return true for dates within range', () => {
      expect(isDateInRange(new Date('2024-01-01'), startDate, endDate)).toBe(true);
      expect(isDateInRange(new Date('2024-01-15'), startDate, endDate)).toBe(true);
      expect(isDateInRange(new Date('2024-01-31'), startDate, endDate)).toBe(true);
    });

    it('should return false for dates outside range', () => {
      expect(isDateInRange(new Date('2023-12-31'), startDate, endDate)).toBe(false);
      expect(isDateInRange(new Date('2024-02-01'), startDate, endDate)).toBe(false);
    });

    it('should handle boundary conditions', () => {
      // Exact start and end dates should be included
      expect(isDateInRange(startDate, startDate, endDate)).toBe(true);
      expect(isDateInRange(endDate, startDate, endDate)).toBe(true);
    });
  });
});
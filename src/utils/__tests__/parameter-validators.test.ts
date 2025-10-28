/**
 * Tests for parameter validation utilities
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

describe('ValidationError', () => {
  it('should create error with all properties', () => {
    const error = new ValidationError(
      'testParam',
      'invalid-value',
      'expected-format',
      'Test error message'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.parameterName).toBe('testParam');
    expect(error.receivedValue).toBe('invalid-value');
    expect(error.expectedFormat).toBe('expected-format');
    expect(error.message).toBe('Test error message');
  });

  it('should handle complex received values', () => {
    const complexValue = { foo: 'bar', nested: { key: 123 } };
    const error = new ValidationError(
      'complexParam',
      complexValue,
      'simple-value',
      'Complex error'
    );

    expect(error.receivedValue).toEqual(complexValue);
  });
});

describe('validateDate', () => {
  it('should return today when date is undefined', () => {
    const result = validateDate(undefined);
    const today = new Date();

    expect(result.toDateString()).toBe(today.toDateString());
  });

  it('should return today when date is null', () => {
    const result = validateDate(null as any);
    const today = new Date();

    expect(result.toDateString()).toBe(today.toDateString());
  });

  it('should parse valid date strings', () => {
    const result = validateDate('2025-10-13');

    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(9); // October (0-indexed)
    expect(result.getDate()).toBe(13);
  });

  it('should validate various valid date formats', () => {
    const validDates = [
      '2025-01-01',
      '2025-12-31',
      '2024-02-29', // Leap year
      '2025-06-15',
    ];

    validDates.forEach(date => {
      expect(() => validateDate(date)).not.toThrow();
    });
  });

  it('should throw on empty string', () => {
    expect(() => validateDate('')).toThrow(ValidationError);
    expect(() => validateDate('')).toThrow('Date cannot be empty');
  });

  it('should throw on whitespace-only string', () => {
    expect(() => validateDate('   ')).toThrow(ValidationError);
    expect(() => validateDate('   ')).toThrow('Date cannot be empty');
  });

  it('should throw on invalid format', () => {
    const invalidFormats = [
      '10/13/2025',      // US format
      '13-10-2025',      // Day-first
      '2025/10/13',      // Wrong separator
      '2025-10-13T00:00:00', // ISO with time
      '20251013',        // No separators
      '2025-10-13 ',     // Trailing space
    ];

    invalidFormats.forEach(date => {
      expect(() => validateDate(date)).toThrow(ValidationError);
      expect(() => validateDate(date)).toThrow(/Invalid date format/);
    });
  });

  it('should throw on invalid calendar dates', () => {
    const invalidDates = [
      '2025-02-30',  // Feb 30 doesn't exist
      '2025-04-31',  // April has 30 days
      '2025-13-01',  // Month 13 doesn't exist
      '2025-00-01',  // Month 0 doesn't exist
      '2025-01-32',  // Day 32 doesn't exist
      '2023-02-29',  // Not a leap year
    ];

    invalidDates.forEach(date => {
      expect(() => validateDate(date)).toThrow(ValidationError);
      expect(() => validateDate(date)).toThrow(/Invalid date/);
    });
  });

  it('should throw on non-string values', () => {
    expect(() => validateDate(123 as any)).toThrow(ValidationError);
    expect(() => validateDate({} as any)).toThrow(ValidationError);
    expect(() => validateDate([] as any)).toThrow(ValidationError);
  });

  it('should include parameter details in error', () => {
    try {
      validateDate('invalid-date');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const ve = error as ValidationError;
      expect(ve.parameterName).toBe('date');
      expect(ve.receivedValue).toBe('invalid-date');
      expect(ve.expectedFormat).toBe('YYYY-MM-DD');
    }
  });
});

describe('validateDateRange', () => {
  describe('string format', () => {
    it('should parse valid string date ranges', () => {
      const result = validateDateRange('2025-01-01/2025-12-31');

      expect(result.start.toISOString().split('T')[0]).toBe('2025-01-01');
      expect(result.end.toISOString().split('T')[0]).toBe('2025-12-31');
    });

    it('should accept single-day ranges', () => {
      const result = validateDateRange('2025-10-13/2025-10-13');

      expect(result.start.toISOString().split('T')[0]).toBe('2025-10-13');
      expect(result.end.toISOString().split('T')[0]).toBe('2025-10-13');
    });

    it('should throw on missing end date', () => {
      expect(() => validateDateRange('2025-01-01')).toThrow(ValidationError);
      expect(() => validateDateRange('2025-01-01/')).toThrow(ValidationError);
    });

    it('should throw on missing start date', () => {
      expect(() => validateDateRange('/2025-12-31')).toThrow(ValidationError);
    });

    it('should throw when start is after end', () => {
      expect(() => validateDateRange('2025-12-31/2025-01-01')).toThrow(ValidationError);
      expect(() => validateDateRange('2025-12-31/2025-01-01')).toThrow(/must be before or equal to/);
    });

    it('should throw on invalid date formats in range', () => {
      expect(() => validateDateRange('invalid/2025-12-31')).toThrow(ValidationError);
      expect(() => validateDateRange('2025-01-01/invalid')).toThrow(ValidationError);
    });
  });

  describe('object format', () => {
    it('should parse valid object date ranges', () => {
      const result = validateDateRange({
        start: '2025-01-01',
        end: '2025-12-31'
      });

      expect(result.start.toISOString().split('T')[0]).toBe('2025-01-01');
      expect(result.end.toISOString().split('T')[0]).toBe('2025-12-31');
    });

    it('should throw on missing start in object', () => {
      expect(() => validateDateRange({ end: '2025-12-31' } as any)).toThrow(ValidationError);
      expect(() => validateDateRange({ end: '2025-12-31' } as any)).toThrow(/start and end dates are required/);
    });

    it('should throw on missing end in object', () => {
      expect(() => validateDateRange({ start: '2025-01-01' } as any)).toThrow(ValidationError);
    });

    it('should throw when start is after end in object', () => {
      expect(() => validateDateRange({
        start: '2025-12-31',
        end: '2025-01-01'
      })).toThrow(ValidationError);
    });
  });

  describe('maxDays constraint', () => {
    it('should allow ranges within max days', () => {
      const result = validateDateRange('2025-01-01/2025-01-31', { maxDays: 31 });
      expect(result).toBeDefined();
    });

    it('should throw when range exceeds max days', () => {
      // 2025-01-01 to 2025-12-31 is 365 days (inclusive)
      expect(() => validateDateRange('2025-01-01/2025-12-31', { maxDays: 364 }))
        .toThrow(ValidationError);
      expect(() => validateDateRange('2025-01-01/2025-12-31', { maxDays: 364 }))
        .toThrow(/exceeding maximum/);
    });

    it('should allow ranges exactly at max days', () => {
      // Jan 1-30 is 30 days inclusive
      const result = validateDateRange('2025-01-01/2025-01-30', { maxDays: 30 });
      expect(result).toBeDefined();
    });

    it('should calculate days correctly (inclusive)', () => {
      // 7 days: Jan 1-7 inclusive (1, 2, 3, 4, 5, 6, 7)
      expect(() => validateDateRange('2025-01-01/2025-01-07', { maxDays: 6 }))
        .toThrow(/spans 7 days/);

      // Should not throw for 7 days max
      expect(() => validateDateRange('2025-01-01/2025-01-07', { maxDays: 7 }))
        .not.toThrow();

      // Single day should be 1 day
      expect(() => validateDateRange('2025-01-01/2025-01-01', { maxDays: 1 }))
        .not.toThrow();
    });
  });

  describe('invalid input types', () => {
    it('should throw on non-string, non-object types', () => {
      expect(() => validateDateRange(123 as any)).toThrow(ValidationError);
      expect(() => validateDateRange(null as any)).toThrow(ValidationError);
      expect(() => validateDateRange([] as any)).toThrow(ValidationError);
    });
  });

  it('should include parameter details in error', () => {
    try {
      validateDateRange('invalid/format');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const ve = error as ValidationError;
      expect(ve.parameterName).toBe('dateRange');
    }
  });
});

describe('validateActivityTypes', () => {
  it('should return undefined for undefined input', () => {
    expect(validateActivityTypes(undefined)).toBeUndefined();
  });

  it('should return undefined for null input', () => {
    expect(validateActivityTypes(null as any)).toBeUndefined();
  });

  it('should return empty array for empty array', () => {
    const result = validateActivityTypes([]);
    expect(result).toEqual([]);
  });

  it('should validate single activity type', () => {
    const result = validateActivityTypes(['running']);
    expect(result).toEqual(['running']);
  });

  it('should validate multiple activity types', () => {
    const result = validateActivityTypes(['running', 'cycling', 'swimming']);
    expect(result).toEqual(['running', 'cycling', 'swimming']);
  });

  it('should throw on non-array input', () => {
    expect(() => validateActivityTypes('running' as any)).toThrow(ValidationError);
    expect(() => validateActivityTypes('running' as any)).toThrow(/must be an array/);
    expect(() => validateActivityTypes({} as any)).toThrow(ValidationError);
    expect(() => validateActivityTypes(123 as any)).toThrow(ValidationError);
  });

  it('should throw on array with non-string elements', () => {
    expect(() => validateActivityTypes(['running', 123] as any)).toThrow(ValidationError);
    expect(() => validateActivityTypes(['running', 123] as any)).toThrow(/index 1 must be a string/);
    expect(() => validateActivityTypes([null] as any)).toThrow(ValidationError);
    expect(() => validateActivityTypes([{}] as any)).toThrow(ValidationError);
  });

  it('should throw on array with empty strings', () => {
    expect(() => validateActivityTypes(['running', ''])).toThrow(ValidationError);
    expect(() => validateActivityTypes(['running', ''])).toThrow(/index 1 cannot be empty/);
    expect(() => validateActivityTypes(['', 'cycling'])).toThrow(ValidationError);
    expect(() => validateActivityTypes(['   '])).toThrow(ValidationError);
  });

  it('should include parameter details in error', () => {
    try {
      validateActivityTypes(['running', '']);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const ve = error as ValidationError;
      expect(ve.parameterName).toBe('activityTypes');
      expect(ve.expectedFormat).toContain('string[]');
    }
  });
});

describe('validateSport', () => {
  it('should return undefined for undefined input', () => {
    expect(validateSport(undefined)).toBeUndefined();
  });

  it('should return undefined for null input', () => {
    expect(validateSport(null as any)).toBeUndefined();
  });

  it('should validate non-empty sport strings', () => {
    expect(validateSport('running')).toBe('running');
    expect(validateSport('cycling')).toBe('cycling');
    expect(validateSport('swimming')).toBe('swimming');
  });

  it('should throw on empty string', () => {
    expect(() => validateSport('')).toThrow(ValidationError);
    expect(() => validateSport('')).toThrow(/cannot be empty/);
  });

  it('should throw on whitespace-only string', () => {
    expect(() => validateSport('   ')).toThrow(ValidationError);
    expect(() => validateSport('   ')).toThrow(/cannot be empty/);
  });

  it('should throw on non-string types', () => {
    expect(() => validateSport(123 as any)).toThrow(ValidationError);
    expect(() => validateSport(123 as any)).toThrow(/must be a string/);
    expect(() => validateSport({} as any)).toThrow(ValidationError);
    expect(() => validateSport([] as any)).toThrow(ValidationError);
  });

  it('should include parameter details in error', () => {
    try {
      validateSport('');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const ve = error as ValidationError;
      expect(ve.parameterName).toBe('sport');
      expect(ve.expectedFormat).toBe('non-empty string');
    }
  });
});

describe('validateMaxActivities', () => {
  it('should return undefined when max is undefined and no default', () => {
    expect(validateMaxActivities(undefined)).toBeUndefined();
  });

  it('should return undefined when max is null and no default', () => {
    expect(validateMaxActivities(null as any)).toBeUndefined();
  });

  it('should return default value when max is undefined', () => {
    expect(validateMaxActivities(undefined, 1000)).toBe(1000);
    expect(validateMaxActivities(null as any, 500)).toBe(500);
  });

  it('should validate positive integers', () => {
    expect(validateMaxActivities(1)).toBe(1);
    expect(validateMaxActivities(100)).toBe(100);
    expect(validateMaxActivities(1000)).toBe(1000);
    expect(validateMaxActivities(5000)).toBe(5000);
  });

  it('should throw on zero', () => {
    expect(() => validateMaxActivities(0)).toThrow(ValidationError);
    expect(() => validateMaxActivities(0)).toThrow(/must be at least 1/);
  });

  it('should throw on negative numbers', () => {
    expect(() => validateMaxActivities(-1)).toThrow(ValidationError);
    expect(() => validateMaxActivities(-100)).toThrow(ValidationError);
  });

  it('should throw on values exceeding maximum (5000)', () => {
    expect(() => validateMaxActivities(5001)).toThrow(ValidationError);
    expect(() => validateMaxActivities(5001)).toThrow(/cannot exceed 5000/);
    expect(() => validateMaxActivities(10000)).toThrow(ValidationError);
  });

  it('should throw on non-integer numbers', () => {
    expect(() => validateMaxActivities(100.5)).toThrow(ValidationError);
    expect(() => validateMaxActivities(100.5)).toThrow(/must be an integer/);
    expect(() => validateMaxActivities(1.1)).toThrow(ValidationError);
  });

  it('should throw on non-number types', () => {
    expect(() => validateMaxActivities('100' as any)).toThrow(ValidationError);
    expect(() => validateMaxActivities('100' as any)).toThrow(/must be a number/);
    expect(() => validateMaxActivities({} as any)).toThrow(ValidationError);
    expect(() => validateMaxActivities([] as any)).toThrow(ValidationError);
  });

  it('should throw on NaN', () => {
    expect(() => validateMaxActivities(NaN)).toThrow(ValidationError);
    expect(() => validateMaxActivities(NaN)).toThrow(/must be a valid number/);
  });

  it('should throw on Infinity', () => {
    expect(() => validateMaxActivities(Infinity)).toThrow(ValidationError);
    expect(() => validateMaxActivities(-Infinity)).toThrow(ValidationError);
  });

  it('should include parameter details in error', () => {
    try {
      validateMaxActivities(10000);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const ve = error as ValidationError;
      expect(ve.parameterName).toBe('maxActivities');
      expect(ve.receivedValue).toBe(10000);
    }
  });
});

describe('validateBooleanFlag', () => {
  it('should return undefined when flag is undefined and no default', () => {
    expect(validateBooleanFlag(undefined)).toBeUndefined();
  });

  it('should return default value when flag is undefined', () => {
    expect(validateBooleanFlag(undefined, true)).toBe(true);
    expect(validateBooleanFlag(undefined, false)).toBe(false);
  });

  it('should validate true', () => {
    expect(validateBooleanFlag(true)).toBe(true);
  });

  it('should validate false', () => {
    expect(validateBooleanFlag(false)).toBe(false);
  });

  it('should throw on truthy non-boolean values', () => {
    expect(() => validateBooleanFlag(1 as any)).toThrow(ValidationError);
    expect(() => validateBooleanFlag(1 as any)).toThrow(/must be a boolean/);
    expect(() => validateBooleanFlag('true' as any)).toThrow(ValidationError);
    expect(() => validateBooleanFlag({} as any)).toThrow(ValidationError);
    expect(() => validateBooleanFlag([] as any)).toThrow(ValidationError);
  });

  it('should throw on falsy non-boolean values', () => {
    expect(() => validateBooleanFlag(0 as any)).toThrow(ValidationError);
    expect(() => validateBooleanFlag('' as any)).toThrow(ValidationError);
    expect(() => validateBooleanFlag(null as any)).toThrow(ValidationError);
  });

  it('should include parameter details in error', () => {
    try {
      validateBooleanFlag('true' as any);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const ve = error as ValidationError;
      expect(ve.parameterName).toBe('flag');
      expect(ve.expectedFormat).toBe('boolean');
    }
  });
});

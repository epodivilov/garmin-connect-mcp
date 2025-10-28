export const secondsToMinutes = (seconds: number | undefined): number | undefined => {
  return seconds !== undefined && seconds !== null ? Math.round(seconds / 60) : undefined;
};

export const millisecondsToDate = (ms: number | undefined): string | undefined => {
  return ms !== undefined && ms !== null ? new Date(ms).toISOString().split('T')[0] : undefined;
};

export const gramsToKg = (grams: number | undefined): number | undefined => {
  return grams !== undefined && grams !== null ? Math.round((grams / 1000) * 100) / 100 : undefined;
};

export const metersToKm = (meters: number | undefined): number | undefined => {
  return meters !== undefined && meters !== null ? Math.round((meters / 1000) * 100) / 100 : undefined;
};

/**
 * Recursively remove empty values from an object
 * @template T - The type of the object to clean
 * @param obj - Object to clean
 * @returns Cleaned object with empty values removed, or undefined if fully empty
 */
export const removeEmptyValues = <T>(obj: T): T | undefined => {
  if (obj === null || obj === undefined || obj === "") return undefined;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    const cleaned = obj.map(removeEmptyValues).filter((item) => item !== undefined && item !== null && item !== "");
    return cleaned as T;
  }

  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanedValue = removeEmptyValues(value);
    if (
      cleanedValue !== undefined &&
      cleanedValue !== null &&
      cleanedValue !== ""
    ) {
      (cleaned as Record<string, unknown>)[key] = cleanedValue;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned as T : undefined;
};

export const formatActivityType = (typeKey: string): string => {
  const typeMap: Record<string, string> = {
    'running': 'Run',
    'cycling': 'Ride',
    'walking': 'Walk',
    'swimming': 'Swim',
    'strength_training': 'Strength',
    'cardio': 'Cardio'
  };

  return typeMap[typeKey] || typeKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Date utility functions for training volume aggregation
 */

/**
 * Get the start and end dates for a given ISO week number and year
 */
export const getISOWeekRange = (year: number, week: number): { start: Date; end: Date } => {
  // ISO week 1 is the first week that contains at least 4 days of January
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
  const jan4Monday = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000);

  const startOfWeek = new Date(jan4Monday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

  return { start: startOfWeek, end: endOfWeek };
};

/**
 * Get the ISO week number for a given date
 * ISO week 1 is the week that contains the first Thursday of the year
 * (or equivalently, the week that contains January 4th)
 */
export const getISOWeek = (date: Date): { year: number; week: number } => {
  const target = new Date(date.getTime());
  const dayNumber = (date.getDay() + 6) % 7; // Convert to Monday = 0
  target.setDate(target.getDate() - dayNumber + 3); // Thursday of the week
  const year = target.getFullYear();

  // Find the Monday of week 1 (the week containing Jan 4)
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // Convert to Monday = 0
  const week1Monday = new Date(jan4.getTime() - jan4Day * 24 * 60 * 60 * 1000);

  // Calculate week number from week 1 Monday
  const daysDiff = (target.getTime() - week1Monday.getTime()) / (24 * 60 * 60 * 1000);
  const weekNumber = 1 + Math.floor(daysDiff / 7);

  return { year, week: weekNumber };
};

/**
 * Get the start and end dates for a given month and year
 */
export const getMonthRange = (year: number, month: number): { start: Date; end: Date } => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // Last day of the month
  return { start, end };
};

/**
 * Get start and end dates for a custom date range string
 */
export const parseDateRange = (range: string): { start: Date; end: Date } => {
  const [startStr, endStr] = range.split('/');
  if (!startStr || !endStr) {
    throw new Error('Invalid date range format. Expected: YYYY-MM-DD/YYYY-MM-DD');
  }

  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Expected: YYYY-MM-DD');
  }

  if (start > end) {
    throw new Error('Start date must be before or equal to end date');
  }

  return { start, end };
};

/**
 * Check if a date falls within a given range
 */
export const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};
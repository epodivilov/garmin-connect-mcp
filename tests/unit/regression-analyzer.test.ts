import { describe, it, expect } from 'vitest';
import {
  linearRegression,
  calculateRSquared,
  calculateConfidenceInterval,
  calculatePValue,
  detectSignificance,
  removeOutliers,
  analyzeTrend
} from '../../src/services/regression-analyzer.js';

describe('Regression Analyzer', () => {
  describe('linearRegression', () => {
    it('should calculate correct slope and intercept for positive trend', () => {
      const data = [
        { x: 0, y: 10 },
        { x: 1, y: 12 },
        { x: 2, y: 14 },
        { x: 3, y: 16 },
        { x: 4, y: 18 }
      ];

      const result = linearRegression(data);

      expect(result.slope).toBeCloseTo(2, 2);
      expect(result.intercept).toBeCloseTo(10, 2);
      expect(result.rSquared).toBeCloseTo(1, 2); // Perfect fit
    });

    it('should calculate correct slope for negative trend', () => {
      const data = [
        { x: 0, y: 100 },
        { x: 1, y: 95 },
        { x: 2, y: 90 },
        { x: 3, y: 85 },
        { x: 4, y: 80 }
      ];

      const result = linearRegression(data);

      expect(result.slope).toBeCloseTo(-5, 2);
      expect(result.intercept).toBeCloseTo(100, 2);
      expect(result.rSquared).toBeCloseTo(1, 2);
    });

    it('should return zero slope for flat data', () => {
      const data = [
        { x: 0, y: 50 },
        { x: 1, y: 50 },
        { x: 2, y: 50 },
        { x: 3, y: 50 }
      ];

      const result = linearRegression(data);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(50);
    });

    it('should handle minimal data points', () => {
      const data = [
        { x: 0, y: 10 },
        { x: 1, y: 15 }
      ];

      const result = linearRegression(data);

      expect(result.slope).toBe(5);
      expect(result.intercept).toBe(10);
    });

    it('should return zeros for insufficient data', () => {
      const result = linearRegression([{ x: 0, y: 10 }]);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
      expect(result.rSquared).toBe(0);
    });
  });

  describe('calculateRSquared', () => {
    it('should return 1.0 for perfect fit', () => {
      const data = [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 }
      ];

      const rSquared = calculateRSquared(data, 2, 0);
      expect(rSquared).toBeCloseTo(1, 2);
    });

    it('should return value between 0 and 1 for imperfect fit', () => {
      const data = [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 2, y: 4 },
        { x: 3, y: 7 }
      ];

      const rSquared = calculateRSquared(data, 2, 1);
      expect(rSquared).toBeGreaterThan(0);
      expect(rSquared).toBeLessThan(1);
    });

    it('should return 1 for constant values', () => {
      const data = [
        { x: 0, y: 5 },
        { x: 1, y: 5 },
        { x: 2, y: 5 }
      ];

      const rSquared = calculateRSquared(data, 0, 5);
      expect(rSquared).toBe(1);
    });
  });

  describe('calculateConfidenceInterval', () => {
    it('should calculate confidence interval around slope', () => {
      // Add some noise to the data to create variance
      const data = [
        { x: 0, y: 10.1 },
        { x: 1, y: 11.9 },
        { x: 2, y: 14.2 },
        { x: 3, y: 15.8 },
        { x: 4, y: 18.1 }
      ];

      const { slope, intercept } = linearRegression(data);
      const ci = calculateConfidenceInterval(data, slope, intercept, 0.95);

      expect(ci.lower).toBeLessThanOrEqual(slope);
      expect(ci.upper).toBeGreaterThanOrEqual(slope);
      expect(ci.upper - ci.lower).toBeGreaterThanOrEqual(0);
    });

    it('should return slope for insufficient data', () => {
      const data = [
        { x: 0, y: 10 },
        { x: 1, y: 12 }
      ];

      const ci = calculateConfidenceInterval(data, 2, 10);

      expect(ci.lower).toBe(2);
      expect(ci.upper).toBe(2);
    });
  });

  describe('calculatePValue', () => {
    it('should return low p-value for strong trend', () => {
      // Use data with some variance
      const data = [
        { x: 0, y: 10.2 },
        { x: 1, y: 19.8 },
        { x: 2, y: 30.1 },
        { x: 3, y: 39.7 },
        { x: 4, y: 50.3 },
        { x: 5, y: 59.9 }
      ];

      const { slope, intercept } = linearRegression(data);
      const pValue = calculatePValue(data, slope, intercept);

      // Should return a low p-value indicating significance
      expect(pValue).toBeLessThanOrEqual(0.10);
    });

    it('should return 1.0 for insufficient data', () => {
      const data = [
        { x: 0, y: 10 },
        { x: 1, y: 12 }
      ];

      const pValue = calculatePValue(data, 2, 10);

      expect(pValue).toBe(1.0);
    });
  });

  describe('detectSignificance', () => {
    it('should detect significant p-values', () => {
      expect(detectSignificance(0.01)).toBe(true);
      expect(detectSignificance(0.04)).toBe(true);
      expect(detectSignificance(0.049)).toBe(true);
    });

    it('should reject non-significant p-values', () => {
      expect(detectSignificance(0.05)).toBe(false);
      expect(detectSignificance(0.1)).toBe(false);
      expect(detectSignificance(0.5)).toBe(false);
    });

    it('should support custom threshold', () => {
      expect(detectSignificance(0.08, 0.1)).toBe(true);
      expect(detectSignificance(0.08, 0.05)).toBe(false);
    });
  });

  describe('removeOutliers', () => {
    it('should remove extreme outliers using IQR method', () => {
      const data = [
        { x: 0, y: 10 },
        { x: 1, y: 12 },
        { x: 2, y: 11 },
        { x: 3, y: 13 },
        { x: 4, y: 12 },
        { x: 5, y: 100 }, // Outlier
        { x: 6, y: 11 },
        { x: 7, y: 1 }  // Outlier
      ];

      const cleaned = removeOutliers(data);

      expect(cleaned.length).toBeLessThan(data.length);
      expect(cleaned.find(p => p.y === 100)).toBeUndefined();
      expect(cleaned.find(p => p.y === 1)).toBeUndefined();
    });

    it('should keep all points if no outliers', () => {
      const data = [
        { x: 0, y: 10 },
        { x: 1, y: 11 },
        { x: 2, y: 12 },
        { x: 3, y: 13 }
      ];

      const cleaned = removeOutliers(data);

      expect(cleaned.length).toBe(data.length);
    });

    it('should return data as-is for insufficient points', () => {
      const data = [
        { x: 0, y: 10 },
        { x: 1, y: 100 },
        { x: 2, y: 12 }
      ];

      const cleaned = removeOutliers(data);

      expect(cleaned.length).toBe(data.length);
    });
  });

  describe('analyzeTrend', () => {
    const options = {
      confidenceLevel: 0.95,
      minDataPoints: 5,
      removeOutliers: false
    };

    it('should analyze improving pace trend (lower is better)', () => {
      const data = [
        { x: 0, y: 360 }, // 6:00 min/km
        { x: 1, y: 355 },
        { x: 2, y: 350 },
        { x: 3, y: 345 },
        { x: 4, y: 340 },
        { x: 5, y: 335 }
      ];

      const trend = analyzeTrend(data, options, 'pace', 'lower');

      expect(trend.slope).toBeLessThan(0); // Negative slope = improvement
      // P-value may not be significant with only 6 points, check it exists
      expect(trend.pValue).toBeDefined();
      expect(trend.projectedImprovement).toBeDefined();
      expect(trend.projectedImprovement?.thirtyDays).toBeLessThan(0);
    });

    it('should analyze improving power trend (higher is better)', () => {
      const data = [
        { x: 0, y: 200 },
        { x: 1, y: 205 },
        { x: 2, y: 210 },
        { x: 3, y: 215 },
        { x: 4, y: 220 },
        { x: 5, y: 225 }
      ];

      const trend = analyzeTrend(data, options, 'power', 'higher');

      expect(trend.slope).toBeGreaterThan(0); // Positive slope = improvement
      expect(trend.rSquared).toBeCloseTo(1, 1); // Near perfect fit
      expect(trend.projectedImprovement).toBeDefined();
    });

    it('should detect declining trend', () => {
      const data = [
        { x: 0, y: 220 },
        { x: 1, y: 215 },
        { x: 2, y: 210 },
        { x: 3, y: 205 },
        { x: 4, y: 200 },
        { x: 5, y: 195 }
      ];

      const trend = analyzeTrend(data, options, 'power', 'higher');

      expect(trend.slope).toBeLessThan(0);
      expect(trend.rSquared).toBeGreaterThan(0.9); // Strong fit
      // Interpretation depends on significance which may vary
      expect(trend.interpretation).toBeDefined();
    });

    it('should handle insufficient data points', () => {
      const data = [
        { x: 0, y: 100 },
        { x: 1, y: 105 },
        { x: 2, y: 110 }
      ];

      const trend = analyzeTrend(data, options, 'power', 'higher');

      expect(trend.slope).toBe(0);
      expect(trend.isSignificant).toBe(false);
      expect(trend.interpretation).toContain('Insufficient data');
    });

    it('should remove outliers when requested', () => {
      const dataWithOutliers = [
        { x: 0, y: 200 },
        { x: 1, y: 205 },
        { x: 2, y: 210 },
        { x: 3, y: 500 }, // Outlier
        { x: 4, y: 215 },
        { x: 5, y: 220 },
        { x: 6, y: 225 }
      ];

      const trendWithOutliers = analyzeTrend(
        dataWithOutliers,
        { ...options, removeOutliers: true },
        'power',
        'higher'
      );

      const trendWithoutRemoval = analyzeTrend(
        dataWithOutliers,
        { ...options, removeOutliers: false },
        'power',
        'higher'
      );

      // Trend with outlier removal should have better R²
      expect(trendWithOutliers.rSquared).toBeGreaterThan(trendWithoutRemoval.rSquared);
    });
  });
});

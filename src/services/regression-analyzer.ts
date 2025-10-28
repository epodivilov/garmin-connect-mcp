/**
 * Statistical Regression Analysis Service
 *
 * Provides linear regression, confidence intervals, and significance testing
 * for performance trend analysis.
 */

import { TrendAnalysis, RegressionOptions } from '../types/progress.js';

/**
 * Data point for regression analysis
 */
export interface RegressionDataPoint {
  x: number; // typically day index or timestamp
  y: number; // metric value (pace, power, etc.)
}

/**
 * Perform linear regression using least squares method
 *
 * Algorithm: y = mx + b
 * - slope (m) = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
 * - intercept (b) = ȳ - m * x̄
 */
export function linearRegression(data: RegressionDataPoint[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  if (data.length < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  const n = data.length;

  // Calculate means
  const xMean = data.reduce((sum, point) => sum + point.x, 0) / n;
  const yMean = data.reduce((sum, point) => sum + point.y, 0) / n;

  // Calculate slope numerator and denominator
  let numerator = 0;
  let denominator = 0;

  for (const point of data) {
    const xDiff = point.x - xMean;
    const yDiff = point.y - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  // Handle case where all x values are the same
  if (denominator === 0) {
    return { slope: 0, intercept: yMean, rSquared: 0 };
  }

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  const rSquared = calculateRSquared(data, slope, intercept);

  return { slope, intercept, rSquared };
}

/**
 * Calculate R-squared (coefficient of determination)
 *
 * R² = 1 - (SS_res / SS_tot)
 * where:
 * - SS_res = Σ(yi - ŷi)² (residual sum of squares)
 * - SS_tot = Σ(yi - ȳ)² (total sum of squares)
 */
export function calculateRSquared(
  data: RegressionDataPoint[],
  slope: number,
  intercept: number
): number {
  if (data.length < 2) {
    return 0;
  }

  const yMean = data.reduce((sum, point) => sum + point.y, 0) / data.length;

  let ssRes = 0; // Residual sum of squares
  let ssTot = 0; // Total sum of squares

  for (const point of data) {
    const predicted = slope * point.x + intercept;
    const residual = point.y - predicted;
    const total = point.y - yMean;

    ssRes += residual * residual;
    ssTot += total * total;
  }

  // Handle case where all y values are the same
  if (ssTot === 0) {
    return 1;
  }

  return Math.max(0, 1 - ssRes / ssTot);
}

/**
 * Calculate confidence interval for regression line
 *
 * Uses standard error of the regression and t-distribution
 */
export function calculateConfidenceInterval(
  data: RegressionDataPoint[],
  slope: number,
  intercept: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  if (data.length < 3) {
    return { lower: slope, upper: slope };
  }

  const n = data.length;

  // Calculate standard error of the slope
  const xMean = data.reduce((sum, point) => sum + point.x, 0) / n;

  let ssRes = 0; // Residual sum of squares
  let ssX = 0; // Sum of squares of x

  for (const point of data) {
    const predicted = slope * point.x + intercept;
    const residual = point.y - predicted;
    const xDiff = point.x - xMean;

    ssRes += residual * residual;
    ssX += xDiff * xDiff;
  }

  // Handle edge case
  if (ssX === 0) {
    return { lower: slope, upper: slope };
  }

  // Standard error of the regression
  const standardError = Math.sqrt(ssRes / (n - 2));

  // Standard error of the slope
  const slopeSE = standardError / Math.sqrt(ssX);

  // t-value for confidence level (approximation for large n)
  // For 95% confidence: t ≈ 1.96, for 90%: t ≈ 1.645
  const tValue = getTValue(confidenceLevel, n - 2);

  // Confidence interval
  const margin = tValue * slopeSE;

  return {
    lower: slope - margin,
    upper: slope + margin
  };
}

/**
 * Get t-value for confidence interval calculation
 * Uses approximation for common confidence levels
 */
function getTValue(confidenceLevel: number, degreesOfFreedom: number): number {
  // Approximations for large sample sizes
  if (confidenceLevel === 0.95) {
    return degreesOfFreedom < 30 ? 2.042 : 1.96;
  } else if (confidenceLevel === 0.90) {
    return degreesOfFreedom < 30 ? 1.697 : 1.645;
  } else if (confidenceLevel === 0.99) {
    return degreesOfFreedom < 30 ? 2.750 : 2.576;
  }

  // Default to 95% confidence
  return degreesOfFreedom < 30 ? 2.042 : 1.96;
}

/**
 * Calculate p-value for slope significance test
 *
 * Tests null hypothesis: slope = 0 (no trend)
 */
export function calculatePValue(
  data: RegressionDataPoint[],
  slope: number,
  intercept: number
): number {
  if (data.length < 3) {
    return 1.0; // Not enough data for significance test
  }

  const n = data.length;
  const xMean = data.reduce((sum, point) => sum + point.x, 0) / n;

  let ssRes = 0;
  let ssX = 0;

  for (const point of data) {
    const predicted = slope * point.x + intercept;
    const residual = point.y - predicted;
    const xDiff = point.x - xMean;

    ssRes += residual * residual;
    ssX += xDiff * xDiff;
  }

  if (ssX === 0 || ssRes === 0) {
    return 1.0;
  }

  // Standard error of the regression
  const standardError = Math.sqrt(ssRes / (n - 2));

  // Standard error of the slope
  const slopeSE = standardError / Math.sqrt(ssX);

  // t-statistic
  const tStat = Math.abs(slope / slopeSE);

  // Approximate p-value using t-distribution
  // For simplicity, use a threshold-based approach
  // Return p-value categories based on t-statistic magnitude
  if (tStat < 1.645) return 0.10; // Not significant at 10%
  if (tStat < 1.96) return 0.08;  // Marginally significant
  if (tStat < 2.576) return 0.03; // Significant at 5%
  if (tStat < 3.291) return 0.01; // Significant at 1%
  return 0.001;                    // Highly significant
}

/**
 * Detect statistical significance (p < 0.05)
 */
export function detectSignificance(pValue: number, threshold: number = 0.05): boolean {
  return pValue < threshold;
}

/**
 * Remove outliers using IQR (Interquartile Range) method
 */
export function removeOutliers(data: RegressionDataPoint[]): RegressionDataPoint[] {
  if (data.length < 4) {
    return data; // Not enough data for outlier detection
  }

  // Sort by y values
  const sortedY = [...data].sort((a, b) => a.y - b.y);

  // Calculate quartiles
  const q1Index = Math.floor(sortedY.length * 0.25);
  const q3Index = Math.floor(sortedY.length * 0.75);

  const q1 = sortedY[q1Index].y;
  const q3 = sortedY[q3Index].y;
  const iqr = q3 - q1;

  // Define bounds
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Filter outliers
  return data.filter(point => point.y >= lowerBound && point.y <= upperBound);
}

/**
 * Analyze trend with full statistical analysis
 */
export function analyzeTrend(
  data: RegressionDataPoint[],
  options: RegressionOptions,
  metricName: string,
  improvementDirection: 'lower' | 'higher'
): TrendAnalysis {
  // Remove outliers if requested
  const cleanData = options.removeOutliers ? removeOutliers(data) : data;

  // Check minimum data points
  if (cleanData.length < options.minDataPoints) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      isSignificant: false,
      confidenceInterval: { lower: 0, upper: 0 },
      interpretation: `Insufficient data points (${cleanData.length} < ${options.minDataPoints})`
    };
  }

  // Perform regression
  const { slope, intercept, rSquared } = linearRegression(cleanData);

  // Calculate confidence interval
  const confidenceInterval = calculateConfidenceInterval(
    cleanData,
    slope,
    intercept,
    options.confidenceLevel
  );

  // Calculate p-value
  const pValue = calculatePValue(cleanData, slope, intercept);
  const isSignificant = detectSignificance(pValue);

  // Calculate projected improvements
  const projectedImprovement = {
    thirtyDays: slope * 30,
    ninetyDays: slope * 90
  };

  // Generate interpretation
  const interpretation = generateInterpretation(
    slope,
    rSquared,
    isSignificant,
    improvementDirection,
    metricName
  );

  return {
    slope,
    intercept,
    rSquared,
    pValue,
    isSignificant,
    confidenceInterval,
    interpretation,
    projectedImprovement
  };
}

/**
 * Generate human-readable interpretation of trend
 */
function generateInterpretation(
  slope: number,
  rSquared: number,
  isSignificant: boolean,
  improvementDirection: 'lower' | 'higher',
  metricName: string
): string {
  if (!isSignificant) {
    return `No significant ${metricName} trend detected (R²=${rSquared.toFixed(3)})`;
  }

  const isImproving =
    (improvementDirection === 'lower' && slope < 0) ||
    (improvementDirection === 'higher' && slope > 0);

  const direction = isImproving ? 'improving' : 'declining';
  const strength = rSquared > 0.7 ? 'strong' : rSquared > 0.4 ? 'moderate' : 'weak';

  const absSlope = Math.abs(slope);
  const slopeStr = absSlope.toFixed(3);

  return `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${metricName} with ${strength} trend (R²=${rSquared.toFixed(3)}, ${slopeStr} per day)`;
}

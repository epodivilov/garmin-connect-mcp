/**
 * Weekly Metrics Aggregation Service
 *
 * Aggregates daily activity data into weekly metrics for periodization analysis.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { WeeklyMetrics } from '../types/periodization.js';
import type { DailyTSS } from '../types/training-stress.js';
import { TIME_CONSTANTS } from '../types/training-stress.js';
import { getISOWeek, getISOWeekRange } from '../utils/data-transforms.js';

/**
 * Aggregate daily data into weekly metrics
 */
export function aggregateWeeklyMetrics(
  activities: any[],
  dailyTSS: DailyTSS[]
): WeeklyMetrics[] {
  if (dailyTSS.length === 0) {
    return [];
  }

  // Group activities by ISO week
  const activityMap = new Map<string, any[]>();

  for (const activity of activities) {
    const date = new Date(activity.startTimeLocal);
    const { year, week } = getISOWeek(date);
    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

    if (!activityMap.has(weekKey)) {
      activityMap.set(weekKey, []);
    }
    activityMap.get(weekKey)!.push(activity);
  }

  // Group TSS data by ISO week
  const tssWeekMap = new Map<string, DailyTSS[]>();

  for (const tss of dailyTSS) {
    const date = new Date(tss.date);
    const { year, week } = getISOWeek(date);
    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

    if (!tssWeekMap.has(weekKey)) {
      tssWeekMap.set(weekKey, []);
    }
    tssWeekMap.get(weekKey)!.push(tss);
  }

  // Convert to WeeklyMetrics - process all weeks that have TSS data
  const weeklyMetrics: WeeklyMetrics[] = [];

  for (const [weekKey, weekTSS] of Array.from(tssWeekMap.entries()).sort()) {
    const [yearStr, weekStr] = weekKey.split('-W');
    const year = parseInt(yearStr);
    const weekNum = parseInt(weekStr);

    const { start, end } = getISOWeekRange(year, weekNum);

    // Get activities for this week (if any)
    const weekActivities = activityMap.get(weekKey) || [];

    // Calculate aggregates from activities
    const totalDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalDuration = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalElevation = weekActivities.reduce((sum, a) => sum + (a.elevationGain || 0), 0);

    // Calculate TSS for this week
    const totalTSS = weekTSS.reduce((sum, d) => sum + d.totalTSS, 0);
    const avgWeeklyTSS = totalTSS;

    // Calculate CTL/ATL/TSB using proper EWMA
    // We need all historical data up to the end of this week
    const weekEndDate = end.toISOString().split('T')[0];
    const historicalTSS = dailyTSS
      .filter(d => d.date <= weekEndDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate EWMA for CTL and ATL
    let ctl = 0;
    let atl = 0;
    for (const day of historicalTSS) {
      ctl = ctl + (day.totalTSS - ctl) / TIME_CONSTANTS.CTL;
      atl = atl + (day.totalTSS - atl) / TIME_CONSTANTS.ATL;
    }

    const avgCTL = Math.round(ctl * 10) / 10;
    const avgATL = Math.round(atl * 10) / 10;
    const avgTSB = Math.round((ctl - atl) * 10) / 10;

    // Map activities to simpler format
    const mappedActivities = weekActivities.map(a => ({
      activityId: a.activityId,
      activityType: a.activityType?.typeKey?.toLowerCase() || 'unknown',
      date: new Date(a.startTimeLocal).toISOString().split('T')[0],
      duration: a.duration || 0,
      distance: a.distance,
      tss: 0, // Would be calculated from activity details
      avgHR: a.averageHR
    }));

    weeklyMetrics.push({
      weekStart: start.toISOString().split('T')[0],
      weekEnd: end.toISOString().split('T')[0],
      weekNumber: weekNum,
      year,
      totalDistance,
      totalDuration,
      totalElevation,
      activityCount: weekActivities.length,
      avgWeeklyTSS,
      totalTSS,
      avgCTL,
      avgATL,
      avgTSB,
      activities: mappedActivities
    });
  }

  return weeklyMetrics;
}

/**
 * Milestone Detector Service
 *
 * Detects achievement milestones from personal records including
 * first PRs, round numbers, big improvements, streaks, and more.
 */

import {
  PersonalRecord,
  PRHistoryEntry,
  Milestone,
  MilestoneType
} from '../types/personalRecords.js';

export class MilestoneDetector {
  /**
   * Detect milestones from a new PR and its history
   */
  detectMilestones(
    pr: PersonalRecord,
    historyCount: number,
    improvement?: PRHistoryEntry['improvement']
  ): Milestone[] {
    const milestones: Milestone[] = [];

    // First PR in category
    if (historyCount === 0) {
      milestones.push(this.createMilestone('first_pr', pr, `First ${pr.category.name} PR!`));
    }

    // Round number milestones
    const roundMilestone = this.detectRoundNumber(pr);
    if (roundMilestone) {
      milestones.push(roundMilestone);
    }

    // Big improvement (>5%)
    if (improvement && Math.abs(improvement.percentage) > 5) {
      const improvementText = this.formatImprovement(pr.metricType, improvement);
      milestones.push(
        this.createMilestone(
          'big_improvement',
          pr,
          `Huge ${improvementText} improvement!`
        )
      );
    }

    // All-time best
    if (historyCount > 0) {
      milestones.push(
        this.createMilestone('all_time_best', pr, `New all-time ${pr.category.name} PR!`)
      );
    }

    return milestones;
  }

  /**
   * Detect streak milestones from recent history
   */
  detectStreakMilestones(
    recentHistory: PRHistoryEntry[],
    categoryId: string
  ): Milestone[] {
    const milestones: Milestone[] = [];

    // Filter by category
    const categoryHistory = recentHistory.filter(
      h => h.categoryId === categoryId
    );

    if (categoryHistory.length >= 3) {
      const latest = categoryHistory[0];
      milestones.push({
        type: 'streak',
        timestamp: latest.timestamp,
        description: `${categoryHistory.length} PRs in a row!`,
        metricValue: categoryHistory.length,
        activityId: latest.activityId
      });
    }

    return milestones;
  }

  /**
   * Detect round number milestones
   */
  private detectRoundNumber(pr: PersonalRecord): Milestone | null {
    if (pr.metricType === 'time') {
      // Check for round times (e.g., sub-20 5K, sub-4 marathon)
      const minutes = Math.floor(pr.metricValue / 60);
      const seconds = pr.metricValue % 60;

      // Round minute marks
      if (seconds < 5 && [15, 20, 30, 40, 60, 90, 120, 180, 240].includes(minutes)) {
        return this.createMilestone(
          'round_number',
          pr,
          `Sub-${minutes} minute ${pr.category.name}!`
        );
      }

      // Special marathon/half marathon times
      if (pr.category.id === 'marathon') {
        const hours = Math.floor(minutes / 60);
        if (seconds < 30 && [3, 3.5, 4].includes(hours)) {
          return this.createMilestone(
            'round_number',
            pr,
            `Sub-${hours} hour marathon!`
          );
        }
      }

      if (pr.category.id === 'half_marathon') {
        const hours = Math.floor(minutes / 60);
        if (seconds < 30 && [1.5, 2].includes(hours)) {
          return this.createMilestone(
            'round_number',
            pr,
            `Sub-${hours} hour half marathon!`
          );
        }
      }
    }

    if (pr.metricType === 'pace') {
      // Check for round pace (e.g., sub-4min/km, sub-5min/km)
      const paceMinutes = Math.floor(pr.metricValue / 60);
      if ([3, 4, 5, 6].includes(paceMinutes)) {
        return this.createMilestone(
          'round_number',
          pr,
          `Sub-${paceMinutes}min/km pace!`
        );
      }
    }

    if (pr.metricType === 'power') {
      // Check for round power numbers
      const roundPowers = [200, 250, 300, 350, 400];
      if (roundPowers.some(p => Math.abs(pr.metricValue - p) < 5)) {
        return this.createMilestone(
          'round_number',
          pr,
          `${Math.round(pr.metricValue)}W average power!`
        );
      }
    }

    return null;
  }

  /**
   * Detect multi-distance PRs (same day)
   */
  detectMultiDistance(prs: PersonalRecord[]): Milestone[] {
    const milestones: Milestone[] = [];

    // Group PRs by date
    const prsByDate = new Map<string, PersonalRecord[]>();
    for (const pr of prs) {
      const date = pr.timestamp.split('T')[0];
      if (!prsByDate.has(date)) {
        prsByDate.set(date, []);
      }
      prsByDate.get(date)!.push(pr);
    }

    // Check for multiple PRs on same day
    for (const dayPRs of prsByDate.values()) {
      if (dayPRs.length >= 2) {
        const categories = dayPRs.map(pr => pr.category.name).join(', ');
        milestones.push({
          type: 'multi_distance',
          timestamp: dayPRs[0].timestamp,
          description: `Multiple PRs in one day: ${categories}`,
          metricValue: dayPRs.length,
          activityId: dayPRs[0].activityId
        });
      }
    }

    return milestones;
  }

  /**
   * Detect comeback milestones (PR after long break)
   */
  detectComeback(
    pr: PersonalRecord,
    daysSincePrevious?: number
  ): Milestone | null {
    if (daysSincePrevious && daysSincePrevious > 180) {
      return this.createMilestone(
        'comeback',
        pr,
        `PR after ${Math.floor(daysSincePrevious / 30)} months!`
      );
    }

    return null;
  }

  /**
   * Detect consistency milestones
   */
  detectConsistency(history: PRHistoryEntry[]): Milestone[] {
    const milestones: Milestone[] = [];

    // 5+ PRs in same category shows consistency
    if (history.length >= 5) {
      const latest = history[0];
      milestones.push({
        type: 'consistency',
        timestamp: latest.timestamp,
        description: `${history.length} total PRs in ${latest.categoryId}`,
        metricValue: history.length,
        activityId: latest.activityId
      });
    }

    return milestones;
  }

  /**
   * Create milestone
   */
  private createMilestone(
    type: MilestoneType,
    pr: PersonalRecord,
    description: string
  ): Milestone {
    return {
      type,
      timestamp: pr.timestamp,
      description,
      metricValue: pr.metricValue,
      activityId: pr.activityId
    };
  }

  /**
   * Format improvement for display
   */
  private formatImprovement(
    _metricType: string,
    improvement: PRHistoryEntry['improvement']
  ): string {
    if (!improvement) {
      return '0%';
    }
    const percentage = Math.abs(improvement.percentage).toFixed(1);
    return `${percentage}%`;
  }
}

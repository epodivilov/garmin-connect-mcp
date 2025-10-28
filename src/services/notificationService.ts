/**
 * Notification Service
 *
 * Generates and manages notifications for personal record achievements,
 * milestones, and near-PR activities.
 */

import {
  PRNotification,
  PersonalRecord,
  PRHistoryEntry,
  Milestone
} from '../types/personalRecords.js';
import { PRStorage } from '../storage/prStorage.js';
import { MilestoneDetector } from './milestoneDetector.js';

export class NotificationService {
  private milestoneDetector: MilestoneDetector;

  constructor(private storage: PRStorage) {
    this.milestoneDetector = new MilestoneDetector();
  }

  /**
   * Generate notification for new PR
   */
  async notifyNewPR(
    pr: PersonalRecord,
    historyCount: number,
    improvement?: PRHistoryEntry['improvement']
  ): Promise<PRNotification[]> {
    const notifications: PRNotification[] = [];

    // Main PR notification
    const prNotification = this.createPRNotification(pr, improvement);
    notifications.push(prNotification);
    await this.storage.addNotification(prNotification);

    // Detect and create milestone notifications
    const milestones = this.milestoneDetector.detectMilestones(
      pr,
      historyCount,
      improvement
    );

    for (const milestone of milestones) {
      const milestoneNotification = this.createMilestoneNotification(
        pr,
        milestone
      );
      notifications.push(milestoneNotification);
      await this.storage.addNotification(milestoneNotification);
    }

    return notifications;
  }

  /**
   * Generate notification for near-PR performance
   */
  async notifyNearPR(
    pr: PersonalRecord,
    _currentValue: number,
    percentageOff: number
  ): Promise<PRNotification> {
    const notification: PRNotification = {
      id: `near_pr_${pr.id}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'near_pr',
      pr,
      message: this.createNearPRMessage(pr, percentageOff),
      read: false
    };

    await this.storage.addNotification(notification);
    return notification;
  }

  /**
   * Get all notifications
   */
  async getNotifications(unreadOnly: boolean = false): Promise<PRNotification[]> {
    const all = await this.storage.getNotifications();

    if (unreadOnly) {
      return all.filter(n => !n.read);
    }

    return all;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<boolean> {
    return this.storage.markNotificationRead(id);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    const notifications = await this.storage.getNotifications();

    for (const notification of notifications) {
      if (!notification.read) {
        await this.storage.markNotificationRead(notification.id);
      }
    }
  }

  /**
   * Create PR notification
   */
  private createPRNotification(
    pr: PersonalRecord,
    improvement?: PRHistoryEntry['improvement']
  ): PRNotification {
    const message = this.createPRMessage(pr, improvement);

    return {
      id: `pr_${pr.id}_${Date.now()}`,
      timestamp: pr.timestamp,
      type: 'new_pr',
      pr,
      message,
      improvement,
      read: false
    };
  }

  /**
   * Create milestone notification
   */
  private createMilestoneNotification(
    pr: PersonalRecord,
    milestone: Milestone
  ): PRNotification {
    return {
      id: `milestone_${milestone.type}_${pr.id}_${Date.now()}`,
      timestamp: milestone.timestamp,
      type: 'milestone',
      pr,
      milestone,
      message: milestone.description,
      read: false
    };
  }

  /**
   * Create PR message
   */
  private createPRMessage(
    pr: PersonalRecord,
    improvement?: PRHistoryEntry['improvement']
  ): string {
    let message = `New ${pr.category.name} PR!`;

    if (pr.metricType === 'time') {
      const formattedTime = this.formatTime(pr.metricValue);
      message += ` ${formattedTime}`;
    } else if (pr.metricType === 'distance') {
      const km = (pr.metricValue / 1000).toFixed(2);
      message += ` ${km}km`;
    } else if (pr.metricType === 'pace') {
      const formattedPace = this.formatPace(pr.metricValue);
      message += ` ${formattedPace}/km`;
    } else if (pr.metricType === 'power') {
      message += ` ${Math.round(pr.metricValue)}W`;
    }

    if (improvement) {
      const improvementText = this.formatImprovement(improvement);
      message += ` (${improvementText})`;
    }

    return message;
  }

  /**
   * Create near-PR message
   */
  private createNearPRMessage(
    pr: PersonalRecord,
    percentageOff: number
  ): string {
    return `Close to ${pr.category.name} PR! Only ${percentageOff.toFixed(1)}% off`;
  }

  /**
   * Format time in seconds to MM:SS or HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format pace in seconds per km to MM:SS
   */
  private formatPace(secondsPerKm: number): string {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format improvement for display
   */
  private formatImprovement(improvement?: PRHistoryEntry['improvement']): string {
    if (!improvement) {
      return 'New PR!';
    }

    const sign = improvement.percentage > 0 ? '+' : '';
    const percentage = Math.abs(improvement.percentage).toFixed(1);

    if (improvement.absolute < 0) {
      // Time improvement (lower is better)
      const seconds = Math.abs(improvement.absolute);
      return `${seconds.toFixed(0)}s faster, ${percentage}% improvement`;
    } else {
      // Distance/power improvement (higher is better)
      return `${sign}${percentage}% improvement`;
    }
  }
}

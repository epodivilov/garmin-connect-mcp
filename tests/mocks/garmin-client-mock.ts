import { vi } from 'vitest';
import { GarminClient } from '../../src/client/garmin-client.js';
import {
  mockSleepData,
  mockActivitiesData,
  mockStepsData,
  mockDailyStepsData,
  mockHeartRateData,
  mockHeartRateDataDirect,
  mockWeightData,
  mockUserProfile,
  mockWorkoutResponse,
  mockWorkoutDetail,
  mockWorkoutScheduleResponse,
  mockScheduledWorkouts,
  mockCalendarItems
} from './garmin-data.js';

export const createMockGarminClient = (): GarminClient => {
  const mockClient = {
    initialize: vi.fn().mockResolvedValue({}),

    getSleepData: vi.fn().mockImplementation((date: Date) => {
      // Return different data based on date for testing
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === '2025-01-01') {
        return Promise.resolve(null); // No data for this date
      }
      return Promise.resolve(mockSleepData);
    }),

    getSleepDuration: vi.fn().mockImplementation((date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === '2025-01-01') {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        hours: 8,
        minutes: 30
      });
    }),

    getActivities: vi.fn().mockImplementation((start: number = 0, limit: number = 20) => {
      const activities = [...mockActivitiesData];
      return Promise.resolve(activities.slice(start, start + limit));
    }),

    getActivity: vi.fn().mockImplementation((activity: { activityId: number }) => {
      if (activity.activityId === 12345678901) {
        return Promise.resolve(mockActivitiesData[0]);
      }
      return Promise.resolve(null);
    }),

    getSteps: vi.fn().mockImplementation((date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === '2025-01-01') {
        return Promise.resolve(0); // Return 0 steps for no data
      }
      return Promise.resolve(mockStepsData.data.steps); // Return just the number like real library
    }),

    getDailyStepsData: vi.fn().mockImplementation((date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === '2025-01-01') {
        return Promise.resolve({
          calendarDate: dateStr,
          stepGoal: 10000,
          totalDistance: 0,
          totalSteps: 0
        });
      }
      return Promise.resolve({
        ...mockDailyStepsData,
        calendarDate: dateStr
      });
    }),

    getHeartRate: vi.fn().mockImplementation((date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === '2025-01-01') {
        return Promise.resolve(null);
      }
      return Promise.resolve(mockHeartRateDataDirect); // Use direct format matching HeartRate interface
    }),

    getDailyWeightData: vi.fn().mockImplementation((date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === '2025-01-01') {
        return Promise.resolve(null);
      }
      return Promise.resolve(mockWeightData);
    }),

    getDailyHydration: vi.fn().mockImplementation((date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === '2025-01-01') {
        return Promise.resolve(0); // No hydration data
      }
      // garmin-connect library returns hydration in ounces (not ml)
      return Promise.resolve(67.6); // 67.6 oz = ~2000 ml
    }),

    getUserProfile: vi.fn().mockResolvedValue(mockUserProfile),

    createWorkout: vi.fn().mockResolvedValue(mockWorkoutResponse),

    scheduleWorkout: vi.fn().mockImplementation((workoutId: number, date: Date) => {
      const calendarDate = date.toISOString().split('T')[0];
      return Promise.resolve({
        ...mockWorkoutScheduleResponse,
        workoutId,
        calendarDate,
        message: `Workout scheduled successfully for ${calendarDate}`,
      });
    }),

    getScheduledWorkouts: vi.fn().mockImplementation((startDate: Date, endDate: Date) => {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      // Filter calendar items by date range (mimicking real implementation)
      const filteredItems = mockCalendarItems.filter(item => {
        return item.itemType === 'workout' && item.date >= start && item.date <= end;
      });

      // Convert calendar items to ScheduledWorkout format (mimicking real implementation)
      const scheduledWorkouts = filteredItems.map(item => {
        // Determine sport type
        const sportTypeKey = item.workout?.sportType?.sportTypeKey || 'other';
        const sportType = {
          sportTypeId: item.workout?.sportType?.sportTypeId || 17,
          sportTypeKey,
          displayOrder: 0 // Simplified for mock
        };

        return {
          workoutScheduleId: item.workoutScheduleId || 0,
          workoutId: item.workout?.workoutId || item.workoutId || 0,
          workoutName: item.workout?.workoutName || 'Unnamed Workout',
          calendarDate: item.date,
          sportType,
          estimatedDurationInSecs: item.workout?.estimatedDurationInSecs || 0,
          estimatedDistanceInMeters: item.workout?.estimatedDistanceInMeters || 0,
          description: item.workout?.description,
        };
      });

      return Promise.resolve(scheduledWorkouts);
    })
  };

  return mockClient as unknown as GarminClient;
};

// Helper to create failing mock client for error testing
export const createFailingMockGarminClient = (): GarminClient => {
  const failingMock = {
    initialize: vi.fn().mockRejectedValue(new Error('Authentication failed')),
    getSleepData: vi.fn().mockRejectedValue(new Error('Failed to fetch sleep data')),
    getSleepDuration: vi.fn().mockRejectedValue(new Error('Failed to fetch sleep duration')),
    getActivities: vi.fn().mockRejectedValue(new Error('Failed to fetch activities')),
    getActivity: vi.fn().mockRejectedValue(new Error('Failed to fetch activity details')),
    getSteps: vi.fn().mockRejectedValue(new Error('Failed to fetch steps data')),
    getDailyStepsData: vi.fn().mockRejectedValue(new Error('Failed to fetch daily steps data')),
    getHeartRate: vi.fn().mockRejectedValue(new Error('Failed to fetch heart rate')),
    getDailyWeightData: vi.fn().mockRejectedValue(new Error('Failed to fetch weight data')),
    getDailyHydration: vi.fn().mockRejectedValue(new Error('Failed to fetch hydration data')),
    getUserProfile: vi.fn().mockRejectedValue(new Error('Failed to fetch user profile')),
    createWorkout: vi.fn().mockRejectedValue(new Error('Failed to create workout')),
    scheduleWorkout: vi.fn().mockRejectedValue(new Error('Failed to schedule workout')),
    getScheduledWorkouts: vi.fn().mockRejectedValue(new Error('Failed to retrieve scheduled workouts'))
  };

  return failingMock as unknown as GarminClient;
};
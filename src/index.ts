#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { GarminClient } from './client/garmin-client.js';
import { SleepTools } from './tools/basic/sleep-tools.js';
import { OverviewTools } from './tools/basic/overview-tools.js';
import { HealthTools } from './tools/basic/health-tools.js';
import { ActivityTools } from './tools/basic/activity-tools.js';
import { ActivityVolumeTools } from './tools/aggregation/activity-volume-tools.js';
import { HRZoneTools } from './tools/analytics/hr-zone-tools.js';
import { TrainingStressTools } from './tools/tracking/training-stress-tools.js';
import { SportProgressTools } from './tools/analytics/sport-progress.js';
import { PersonalRecordsTools } from './tools/analytics/personalRecords.js';
import { PeriodizationTools } from './tools/analytics/periodization-tools.js';
import { FatigueFreshnessTools } from './tools/tracking/fatigue-freshness-tools.js';
import { SleepCorrelationTools } from './tools/correlation/sleep-correlation-tools.js';
import { HRVTools } from './tools/tracking/hrv-tools.js';
import { WorkoutTools } from './tools/tracking/workout-tools.js';

class GarminConnectMCPServer {
  private server: Server;
  private garminClient: GarminClient;
  private sleepTools: SleepTools;
  private overviewTools: OverviewTools;
  private healthTools: HealthTools;
  private activityTools: ActivityTools;
  private activityVolumeTools: ActivityVolumeTools;
  private hrZoneTools: HRZoneTools;
  private trainingStressTools: TrainingStressTools;
  private sportProgressTools: SportProgressTools;
  private personalRecordsTools: PersonalRecordsTools;
  private periodizationTools: PeriodizationTools;
  private fatigueFreshnessTools: FatigueFreshnessTools;
  private sleepCorrelationTools: SleepCorrelationTools;
  private hrvTools: HRVTools;
  private workoutTools: WorkoutTools;

  constructor() {
    this.server = new Server(
      {
        name: "garmin-connect-mcp",
        version: "0.2.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize clients and tools
    const username = process.env.GARMIN_USERNAME;
    const password = process.env.GARMIN_PASSWORD;

    if (!username || !password) {
      throw new Error(
        "GARMIN_USERNAME and GARMIN_PASSWORD environment variables are required"
      );
    }

    this.garminClient = new GarminClient({ username, password });
    this.sleepTools = new SleepTools(this.garminClient);
    this.overviewTools = new OverviewTools(this.garminClient);
    this.healthTools = new HealthTools(this.garminClient);
    this.activityTools = new ActivityTools(this.garminClient);
    this.activityVolumeTools = new ActivityVolumeTools(this.garminClient);
    this.hrZoneTools = new HRZoneTools(this.garminClient);
    this.trainingStressTools = new TrainingStressTools(this.garminClient);
    this.sportProgressTools = new SportProgressTools(this.garminClient);
    this.personalRecordsTools = new PersonalRecordsTools(this.garminClient);
    this.periodizationTools = new PeriodizationTools(this.garminClient);
    this.fatigueFreshnessTools = new FatigueFreshnessTools(this.garminClient);
    this.sleepCorrelationTools = new SleepCorrelationTools(this.garminClient);
    this.hrvTools = new HRVTools(this.garminClient);
    this.workoutTools = new WorkoutTools(this.garminClient);

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_daily_overview",
            description: "Get a comprehensive daily overview including sleep, activities, and health metrics",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
              },
            },
          },
          {
            name: "get_sleep_data",
            description: "Get detailed sleep data for a specific date from Garmin Connect",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                includeSummaryOnly: {
                  type: "boolean",
                  description: "Return only summary data instead of detailed breakdown (default: false)",
                },
                summary: {
                  type: "boolean",
                  description: "[DEPRECATED: Use includeSummaryOnly] Return only summary data instead of detailed breakdown (default: false)",
                },
                fields: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific fields to include (e.g., ['dailySleepDTO', 'wellnessEpochSummaryDTO'])",
                },
              },
            },
          },
          {
            name: "get_sleep_duration",
            description: "Get sleep duration for a specific date from Garmin Connect",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
              },
            },
          },
          {
            name: "get_health_metrics",
            description: "Get aggregated health metrics for a specific date",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                metrics: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["steps", "weight", "heart_rate", "stress", "body_battery", "hydration"]
                  },
                  description: "Specific metrics to include (defaults to all)",
                },
              },
            },
          },
          {
            name: "get_steps_data",
            description: "Get detailed steps and activity data for a specific date",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                includeSummaryOnly: {
                  type: "boolean",
                  description: "Return only summary data instead of detailed breakdown (default: false)",
                },
                summary: {
                  type: "boolean",
                  description: "[DEPRECATED: Use includeSummaryOnly] Return only summary data instead of detailed breakdown (default: false)",
                },
              },
            },
          },
          {
            name: "get_heart_rate_data",
            description: "Get detailed heart rate data for a specific date",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                includeSummaryOnly: {
                  type: "boolean",
                  description: "Return only summary data instead of detailed breakdown (default: false)",
                },
                summary: {
                  type: "boolean",
                  description: "[DEPRECATED: Use includeSummaryOnly] Return only summary data instead of detailed breakdown (default: false)",
                },
              },
            },
          },
          {
            name: "get_weight_data",
            description: "Get weight and body composition data for a specific date",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
              },
            },
          },
          {
            name: "get_hydration_data",
            description: "Get daily hydration (water intake) data for a specific date",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
              },
            },
          },
          {
            name: "get_activities",
            description: "Get list of recent activities with optional filtering and pagination",
            inputSchema: {
              type: "object",
              properties: {
                start: {
                  type: "number",
                  description: "Starting index for pagination (default: 0)",
                  minimum: 0,
                },
                limit: {
                  type: "number",
                  description: "Maximum number of activities to return (max 50, default: 20)",
                  minimum: 1,
                  maximum: 50,
                },
                includeSummaryOnly: {
                  type: "boolean",
                  description: "Return compact summary format instead of detailed data (default: false)",
                },
                summary: {
                  type: "boolean",
                  description: "[DEPRECATED: Use includeSummaryOnly] Return compact summary format instead of detailed data (default: false)",
                },
              },
            },
          },
          {
            name: "get_activity_details",
            description: "Get detailed information for a specific activity",
            inputSchema: {
              type: "object",
              properties: {
                activityId: {
                  type: "number",
                  description: "The unique ID of the activity to retrieve",
                },
              },
              required: ["activityId"],
            },
          },
          {
            name: "get_weekly_volume",
            description: "Get weekly training volume aggregation for a specific week",
            inputSchema: {
              type: "object",
              properties: {
                year: {
                  type: "number",
                  description: "Year (defaults to current year)",
                  minimum: 2000,
                  maximum: 2100,
                },
                week: {
                  type: "number",
                  description: "ISO week number (defaults to current week)",
                  minimum: 1,
                  maximum: 53,
                },
                includeActivityBreakdown: {
                  type: "boolean",
                  description: "Include breakdown by activity type (default: true)",
                },
                includeTrends: {
                  type: "boolean",
                  description: "Include comparison with previous week (default: false)",
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to process (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                activityTypes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by specific activity types (e.g., ['running', 'cycling'])",
                },
              },
            },
          },
          {
            name: "get_monthly_volume",
            description: "Get monthly training volume aggregation for a specific month",
            inputSchema: {
              type: "object",
              properties: {
                year: {
                  type: "number",
                  description: "Year (defaults to current year)",
                  minimum: 2000,
                  maximum: 2100,
                },
                month: {
                  type: "number",
                  description: "Month number 1-12 (defaults to current month)",
                  minimum: 1,
                  maximum: 12,
                },
                includeActivityBreakdown: {
                  type: "boolean",
                  description: "Include breakdown by activity type (default: true)",
                },
                includeTrends: {
                  type: "boolean",
                  description: "Include comparison with previous month (default: false)",
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to process (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                activityTypes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by specific activity types (e.g., ['running', 'cycling'])",
                },
              },
            },
          },
          {
            name: "get_custom_range_volume",
            description: "Get training volume aggregation for a custom date range",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (max 365 days)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                includeActivityBreakdown: {
                  type: "boolean",
                  description: "Include breakdown by activity type (default: true)",
                },
                includeDailyBreakdown: {
                  type: "boolean",
                  description: "Include daily breakdown for the range (default: false)",
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to process (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                activityTypes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by specific activity types (e.g., ['running', 'cycling'])",
                },
              },
              required: ["dateRange"],
            },
          },
          {
            name: "get_activity_hr_zones",
            description: "Get heart rate zone distribution for a single activity. Shows time spent in each HR zone (1-5) with percentages and visualization-ready data.",
            inputSchema: {
              type: "object",
              properties: {
                activityId: {
                  type: "number",
                  description: "The unique ID of the activity",
                },
                maxHR: {
                  type: "number",
                  description: "Custom maximum heart rate for zone calculation (optional, defaults to activity max HR or 185)",
                  minimum: 100,
                  maximum: 250,
                },
                customZones: {
                  type: "object",
                  description: "Custom HR zone configuration as percentage of max HR (optional)",
                  properties: {
                    zone1: {
                      type: "object",
                      properties: {
                        min: { type: "number", minimum: 0, maximum: 100 },
                        max: { type: "number", minimum: 0, maximum: 100 }
                      }
                    },
                    zone2: {
                      type: "object",
                      properties: {
                        min: { type: "number", minimum: 0, maximum: 100 },
                        max: { type: "number", minimum: 0, maximum: 100 }
                      }
                    },
                    zone3: {
                      type: "object",
                      properties: {
                        min: { type: "number", minimum: 0, maximum: 100 },
                        max: { type: "number", minimum: 0, maximum: 100 }
                      }
                    },
                    zone4: {
                      type: "object",
                      properties: {
                        min: { type: "number", minimum: 0, maximum: 100 },
                        max: { type: "number", minimum: 0, maximum: 100 }
                      }
                    },
                    zone5: {
                      type: "object",
                      properties: {
                        min: { type: "number", minimum: 0, maximum: 100 },
                        max: { type: "number", minimum: 0, maximum: 100 }
                      }
                    }
                  }
                },
              },
              required: ["activityId"],
            },
          },
          {
            name: "get_aggregated_hr_zones",
            description: "Get aggregated heart rate zone distribution over a time period (weekly, monthly, or custom date range). Useful for analyzing training intensity distribution.",
            inputSchema: {
              type: "object",
              properties: {
                periodType: {
                  type: "string",
                  description: "Type of period: 'weekly', 'monthly', or 'custom'",
                  enum: ["weekly", "monthly", "custom"],
                },
                year: {
                  type: "number",
                  description: "Year (required for weekly/monthly)",
                  minimum: 2000,
                  maximum: 2100,
                },
                week: {
                  type: "number",
                  description: "ISO week number (required for weekly)",
                  minimum: 1,
                  maximum: 53,
                },
                month: {
                  type: "number",
                  description: "Month number 1-12 (required for monthly)",
                  minimum: 1,
                  maximum: 12,
                },
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (required for custom)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                maxHR: {
                  type: "number",
                  description: "Custom maximum heart rate for zone calculation (optional, defaults to 185)",
                  minimum: 100,
                  maximum: 250,
                },
                customZones: {
                  type: "object",
                  description: "Custom HR zone configuration as percentage of max HR (optional)"
                },
                includeActivityBreakdown: {
                  type: "boolean",
                  description: "Include breakdown by activity type (default: true)",
                },
                includeVisualization: {
                  type: "boolean",
                  description: "Include visualization data (labels, values, colors) (default: true)",
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to process (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                activityTypes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by specific activity types (e.g., ['running', 'cycling'])",
                },
              },
            },
          },
          {
            name: "get_training_stress_balance",
            description: "Get training stress balance (TSB), chronic training load (CTL), and acute training load (ATL) for a specific date. TSB = CTL - ATL indicates form/freshness. Uses HR-based TSS calculation when available, falls back to duration estimates.",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Target date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                days: {
                  type: "number",
                  description: "Number of days of historical data to analyze (default: 90, min: 7, max: 365)",
                  minimum: 7,
                  maximum: 365,
                },
                includeTimeSeries: {
                  type: "boolean",
                  description: "Include daily time series data showing TSS, CTL, ATL, TSB progression (default: true)",
                },
                includeSummaryOnly: {
                  type: "boolean",
                  description: "Return only summary data without time-series (default: false)",
                },
                summary: {
                  type: "boolean",
                  description: "[DEPRECATED: Use includeSummaryOnly] Return only summary data without time-series (default: false)",
                },
                restingHR: {
                  type: "number",
                  description: "Custom resting heart rate for TSS calculation (default: 50 bpm)",
                  minimum: 30,
                  maximum: 100,
                },
                maxHR: {
                  type: "number",
                  description: "Custom maximum heart rate for TSS calculation (default: 185 bpm)",
                  minimum: 100,
                  maximum: 250,
                },
                thresholdHR: {
                  type: "number",
                  description: "Custom threshold heart rate for TSS calculation (default: 90% of maxHR)",
                  minimum: 100,
                  maximum: 250,
                },
              },
            },
          },
          {
            name: "get_sport_progress",
            description: "Get comprehensive sport-specific progress analysis including pace/power trends and efficiency metrics over a date range. Automatically detects available metrics (pace for running/swimming, power for cycling) and provides statistical trend analysis.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                sport: {
                  type: "string",
                  description: "Filter by sport type (e.g., 'running', 'cycling', 'swimming')",
                },
                minDuration: {
                  type: "number",
                  description: "Minimum activity duration in seconds to include",
                  minimum: 0,
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to analyze (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                includeEfficiency: {
                  type: "boolean",
                  description: "Include HR zone efficiency analysis (default: true)",
                },
              },
              required: ["dateRange"],
            },
          },
          {
            name: "get_pace_trends",
            description: "Analyze pace trends for running or swimming activities with moving averages and regression analysis. Shows performance improvements or declines over time.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                sport: {
                  type: "string",
                  description: "Sport type (e.g., 'running', 'swimming', default: 'running')",
                },
                minDuration: {
                  type: "number",
                  description: "Minimum activity duration in seconds",
                  minimum: 0,
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to analyze (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
              },
              required: ["dateRange"],
            },
          },
          {
            name: "get_power_trends",
            description: "Analyze power trends for cycling activities including normalized power and power-to-weight ratio. Tracks improvements in cycling performance over time.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                sport: {
                  type: "string",
                  description: "Sport type (e.g., 'cycling', default: 'cycling')",
                },
                minDuration: {
                  type: "number",
                  description: "Minimum activity duration in seconds",
                  minimum: 0,
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to analyze (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                weight: {
                  type: "number",
                  description: "Athlete weight in kg for power-to-weight calculations",
                  minimum: 30,
                  maximum: 200,
                },
              },
              required: ["dateRange"],
            },
          },
          {
            name: "get_efficiency_metrics",
            description: "Analyze training efficiency by HR zone, showing pace or power relative to heart rate. Identifies optimal training intensities and provides recommendations.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                sport: {
                  type: "string",
                  description: "Filter by sport type",
                },
                minDuration: {
                  type: "number",
                  description: "Minimum activity duration in seconds",
                  minimum: 0,
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum number of activities to analyze (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                maxHR: {
                  type: "number",
                  description: "Custom maximum heart rate for zone calculation",
                  minimum: 100,
                  maximum: 250,
                },
              },
              required: ["dateRange"],
            },
          },
          {
            name: "get_personal_records",
            description: "Get current personal records with optional filters by sport, category type, or quality score. Returns PR details including activity info, quality metrics, and optional summary statistics.",
            inputSchema: {
              type: "object",
              properties: {
                sport: {
                  type: "string",
                  description: "Filter by sport (running, cycling, swimming, etc.)",
                },
                categoryType: {
                  type: "string",
                  description: "Filter by category type (distance, duration, custom)",
                  enum: ["distance", "duration", "custom"],
                },
                categoryId: {
                  type: "string",
                  description: "Filter by specific category ID (e.g., '5K', 'marathon', '30min')",
                },
                minQuality: {
                  type: "number",
                  description: "Minimum quality score (0-100) to filter PRs",
                  minimum: 0,
                  maximum: 100,
                },
                includeSummary: {
                  type: "boolean",
                  description: "Include summary statistics (default: true)",
                },
              },
            },
          },
          {
            name: "get_pr_history",
            description: "Get PR progression history for a specific category showing all-time improvements, timestamps, and achievement milestones.",
            inputSchema: {
              type: "object",
              properties: {
                categoryId: {
                  type: "string",
                  description: "Category ID (required, e.g., '5K', 'marathon')",
                },
                sport: {
                  type: "string",
                  description: "Sport type (required for progression analysis)",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of history entries to return",
                  minimum: 1,
                },
                dateRange: {
                  type: "string",
                  description: "Optional date range filter YYYY-MM-DD/YYYY-MM-DD",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                includeProgression: {
                  type: "boolean",
                  description: "Include progression analysis with trends (default: true)",
                },
              },
              required: ["categoryId"],
            },
          },
          {
            name: "detect_new_prs",
            description: "Scan recent activities to detect new personal records. Automatically analyzes quality, matches to standard categories, and updates PR history. Returns discovered PRs with notifications.",
            inputSchema: {
              type: "object",
              properties: {
                maxActivities: {
                  type: "number",
                  description: "Maximum activities to scan (default: 1000)",
                  minimum: 1,
                  maximum: 2000,
                },
                minQuality: {
                  type: "number",
                  description: "Minimum quality score threshold (default: 70)",
                  minimum: 0,
                  maximum: 100,
                },
                dateRange: {
                  type: "string",
                  description: "Optional date range YYYY-MM-DD/YYYY-MM-DD",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                sports: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by specific sports",
                },
                categories: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by specific category IDs",
                },
                enableSegments: {
                  type: "boolean",
                  description: "Extract segments from splits (default: true)",
                },
              },
            },
          },
          {
            name: "manage_custom_pr_category",
            description: "Create, update, delete, or list custom PR categories for distances/durations not in standard definitions. Useful for specialized training goals.",
            inputSchema: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  description: "Action to perform",
                  enum: ["create", "update", "delete", "list"],
                },
                id: {
                  type: "string",
                  description: "Category ID (required for create/update/delete)",
                },
                name: {
                  type: "string",
                  description: "Display name (required for create)",
                },
                type: {
                  type: "string",
                  description: "Category type (required for create)",
                  enum: ["distance", "duration"],
                },
                value: {
                  type: "number",
                  description: "Value in meters (distance) or seconds (duration)",
                  minimum: 1,
                },
                tolerance: {
                  type: "number",
                  description: "Optional matching tolerance (auto-calculated if not provided)",
                  minimum: 1,
                },
                sport: {
                  type: "string",
                  description: "Optional sport restriction",
                },
              },
              required: ["action"],
            },
          },
          {
            name: "get_periodization_analysis",
            description: "Analyze training periodization effectiveness across a date range. Identifies training phases (base, build, peak, recovery, transition) based on volume and intensity patterns, evaluates effectiveness, and provides recommendations. Requires minimum 8 weeks of training data. Supports linear, undulating, block, and polarized periodization models.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (minimum 8 weeks recommended, maximum 52 weeks)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                targetModel: {
                  type: "string",
                  description: "Expected periodization model for comparison (optional, auto-detects if not specified)",
                  enum: ["linear", "undulating", "block", "polarized"],
                },
                minPhaseWeeks: {
                  type: "number",
                  description: "Minimum phase length in weeks to detect (default: 2, range: 1-8)",
                  minimum: 1,
                  maximum: 8,
                },
                maxActivities: {
                  type: "number",
                  description: "Maximum activities to analyze (default: 2000)",
                  minimum: 1,
                  maximum: 5000,
                },
                includeRecommendations: {
                  type: "boolean",
                  description: "Include phase transition recommendations (default: true)",
                },
                includeWarnings: {
                  type: "boolean",
                  description: "Include training warnings (default: true)",
                },
              },
              required: ["dateRange"],
            },
          },
          {
            name: "get_current_form_analysis",
            description: "Get comprehensive form/freshness analysis including current TSB (Training Stress Balance), trends, zone classification, and training recommendations. Form = CTL - ATL indicates your readiness state. Tracks fatigue vs fitness balance for optimal performance and recovery.",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date in YYYY-MM-DD format (defaults to today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                includeTimeSeries: {
                  type: "boolean",
                  description: "Include time series data (default: true)",
                },
                includePredictions: {
                  type: "boolean",
                  description: "Include future form predictions (default: true)",
                },
                includePerformanceCorrelation: {
                  type: "boolean",
                  description: "Include performance correlation analysis (default: false)",
                },
                includeContext: {
                  type: "boolean",
                  description: "Include HRV/sleep context (default: false)",
                },
              },
            },
          },
          {
            name: "get_form_history",
            description: "Get historical form/freshness data with filtering options. Shows TSB progression over time, zone distribution, and training patterns. Useful for analyzing long-term training trends and recovery patterns.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                zone: {
                  type: "string",
                  description: "Filter by specific form zone",
                  enum: ["optimal_race", "fresh", "maintenance", "productive_training", "fatigued", "overreached"],
                },
                days: {
                  type: "number",
                  description: "Number of days to retrieve (default: 90)",
                  minimum: 7,
                  maximum: 365,
                },
              },
            },
          },
          {
            name: "predict_future_form",
            description: "Predict future form/freshness based on planned training load. Models how your TSB will evolve given specific training plans. Useful for planning training blocks and optimizing race readiness.",
            inputSchema: {
              type: "object",
              properties: {
                targetDate: {
                  type: "string",
                  description: "Target date for prediction (YYYY-MM-DD)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                plannedTSS: {
                  type: "number",
                  description: "Planned daily TSS (or average if array)",
                  minimum: 0,
                },
                maintainIntensity: {
                  type: "boolean",
                  description: "Whether to maintain current intensity (default: true)",
                },
                recoveryDays: {
                  type: "array",
                  items: { type: "number" },
                  description: "Specific recovery days (0 TSS)",
                },
                currentCTL: {
                  type: "number",
                  description: "Current CTL (optional, will fetch if not provided)",
                },
                currentATL: {
                  type: "number",
                  description: "Current ATL (optional, will fetch if not provided)",
                },
                currentTSB: {
                  type: "number",
                  description: "Current TSB (optional, will fetch if not provided)",
                },
              },
              required: ["targetDate", "plannedTSS"],
            },
          },
          {
            name: "generate_taper_plan",
            description: "Generate optimal taper plan for race preparation. Creates day-by-day schedule to reach target TSB/form on race day while maintaining fitness. Supports linear, exponential, and step taper strategies.",
            inputSchema: {
              type: "object",
              properties: {
                raceDate: {
                  type: "string",
                  description: "Race date (YYYY-MM-DD)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                taperDuration: {
                  type: "number",
                  description: "Taper duration in days (default: 14)",
                  minimum: 7,
                  maximum: 28,
                },
                targetTSB: {
                  type: "number",
                  description: "Target TSB for race day (default: 17)",
                  minimum: 5,
                  maximum: 30,
                },
                strategy: {
                  type: "string",
                  description: "Taper strategy (default: exponential)",
                  enum: ["linear", "exponential", "step"],
                },
                volumeReduction: {
                  type: "number",
                  description: "Volume reduction percentage (default: 50)",
                  minimum: 20,
                  maximum: 80,
                },
                maintainIntensity: {
                  type: "boolean",
                  description: "Maintain intensity during taper (default: true)",
                },
                currentCTL: {
                  type: "number",
                  description: "Current CTL (optional, will fetch if not provided)",
                },
                currentATL: {
                  type: "number",
                  description: "Current ATL (optional, will fetch if not provided)",
                },
                currentTSB: {
                  type: "number",
                  description: "Current TSB (optional, will fetch if not provided)",
                },
              },
              required: ["raceDate"],
            },
          },
          {
            name: "analyze_form_performance",
            description: "Analyze correlation between form/freshness state and performance outcomes (PRs). Identifies optimal TSB ranges for peak performance and provides insights on when you perform best.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 90 days)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
              },
            },
          },
          {
            name: "create_running_workout",
            description: "Create a structured running workout in Garmin Connect. Build workouts with warmup, intervals, recovery, cooldown, and repeat blocks. Supports time-based, distance-based, and lap-button durations. Supports pace, HR zone, and no-target intensity controls.",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Workout name (required)",
                  minLength: 1,
                },
                description: {
                  type: "string",
                  description: "Optional workout description",
                },
                steps: {
                  type: "array",
                  description: "Array of workout steps (required, at least one step)",
                  minItems: 1,
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        description: "Step type",
                        enum: ["warmup", "interval", "recovery", "cooldown", "rest", "repeat"],
                      },
                      duration: {
                        type: "object",
                        description: "Duration of the step (not required for repeat blocks)",
                        properties: {
                          type: {
                            type: "string",
                            description: "Duration type",
                            enum: ["time", "distance", "lap_button"],
                          },
                          value: {
                            type: "number",
                            description: "Duration value (seconds for time, meters for distance). Not required for lap_button.",
                          },
                          unit: {
                            type: "string",
                            description: "Distance unit (required for distance type)",
                            enum: ["m", "km", "mile"],
                          },
                        },
                        required: ["type"],
                      },
                      target: {
                        type: "object",
                        description: "Intensity target (optional)",
                        properties: {
                          type: {
                            type: "string",
                            description: "Target type",
                            enum: ["pace", "hr_zone", "no_target"],
                          },
                          minValue: {
                            type: "number",
                            description: "Minimum pace in min/km (required for pace target)",
                          },
                          maxValue: {
                            type: "number",
                            description: "Maximum pace in min/km (required for pace target)",
                          },
                          zone: {
                            type: "number",
                            description: "HR zone number 1-5 (required for hr_zone target)",
                          },
                        },
                        required: ["type"],
                      },
                      numberOfRepetitions: {
                        type: "number",
                        description: "Number of repetitions (required for repeat type)",
                        minimum: 1,
                      },
                      childSteps: {
                        type: "array",
                        description: "Child steps to repeat (required for repeat type)",
                        items: {
                          type: "object",
                        },
                      },
                    },
                    required: ["type"],
                  },
                },
              },
              required: ["name", "steps"],
            },
          },
          {
            name: "schedule_workout",
            description: "Schedule a workout to a specific date in Garmin Connect calendar. Use the workoutId from create_running_workout response.",
            inputSchema: {
              type: "object",
              properties: {
                workoutId: {
                  type: "number",
                  description: "ID of the workout to schedule (from create_running_workout response)",
                },
                date: {
                  type: "string",
                  description: "Date to schedule workout in YYYY-MM-DD format (e.g., '2025-10-13')",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
              },
              required: ["workoutId", "date"],
            },
          },
          {
            name: "delete_workout",
            description: "Delete a workout from Garmin Connect library. The workout is permanently removed and cannot be recovered. Use with caution.",
            inputSchema: {
              type: "object",
              properties: {
                workoutId: {
                  type: "string",
                  description: "ID of the workout to delete (string format, e.g., '1354294595')",
                },
              },
              required: ["workoutId"],
            },
          },
          {
            name: "unschedule_workout",
            description: "Unschedule a workout from a specific date in Garmin Connect calendar. Removes the workout from the calendar without deleting it from the library. The workout remains available for future scheduling.",
            inputSchema: {
              type: "object",
              properties: {
                workoutId: {
                  type: "number",
                  description: "ID of the workout to unschedule",
                },
                date: {
                  type: "string",
                  description: "Date from which to unschedule the workout (YYYY-MM-DD format, e.g., '2025-10-13')",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
              },
              required: ["workoutId", "date"],
            },
          },
          {
            name: "update_workout",
            description: "Update an existing workout in Garmin Connect. Can update name, description, or steps. At least one field must be provided. If steps are provided, they completely replace existing steps.",
            inputSchema: {
              type: "object",
              properties: {
                workoutId: {
                  type: "number",
                  description: "ID of the workout to update",
                },
                name: {
                  type: "string",
                  description: "New workout name (optional)",
                },
                description: {
                  type: "string",
                  description: "New workout description (optional)",
                },
                steps: {
                  type: "array",
                  description: "New workout steps (optional, replaces all existing steps)",
                  items: {
                    type: "object",
                    // Same structure as create_running_workout steps
                  },
                },
              },
              required: ["workoutId"],
            },
          },
          {
            name: "get_scheduled_workouts",
            description: "Get scheduled workouts from Garmin Connect calendar for a date range. Defaults to the current week (Monday to Sunday) if dates not provided. Returns list of scheduled workouts with details.",
            inputSchema: {
              type: "object",
              properties: {
                startDate: {
                  type: "string",
                  description: "Start date in YYYY-MM-DD format (optional, defaults to current week Monday)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                endDate: {
                  type: "string",
                  description: "End date in YYYY-MM-DD format (optional, defaults to current week Sunday)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
              },
            },
          },
          {
            name: "get_workout_detail",
            description: "Get detailed information about a specific workout including steps, targets, and configuration. Use this to retrieve complete workout details from Garmin Connect library.",
            inputSchema: {
              type: "object",
              properties: {
                workoutId: {
                  type: "string",
                  description: "ID of the workout to retrieve (string format, e.g., '1354294595')",
                },
              },
              required: ["workoutId"],
            },
          },
          {
            name: "get_sleep_performance_correlation",
            description: "Analyze correlation between sleep quality and athletic performance over a date range. Provides comprehensive analysis including correlations, optimal patterns, sleep debt, poor sleep impacts, trends, insights, and personalized recommendations.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 30 days)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                includeRecovery: {
                  type: "boolean",
                  description: "Include daily recovery quality assessments (default: true)",
                },
                maxPoorSleepImpacts: {
                  type: "number",
                  description: "Maximum number of poor sleep impacts to return (default: 10)",
                  minimum: 1,
                  maximum: 50,
                },
              },
            },
          },
          {
            name: "get_optimal_sleep_pattern",
            description: "Identify your optimal sleep pattern for best athletic performance. Analyzes sleep duration, deep sleep, REM sleep, and sleep quality scores that correlate with peak performance.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 60 days)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
              },
            },
          },
          {
            name: "get_sleep_debt_analysis",
            description: "Track accumulated sleep debt and analyze its impact on performance. Shows current debt, historical maximum, average debt, and estimated recovery time needed.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 30 days)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                targetDuration: {
                  type: "number",
                  description: "Target sleep duration in minutes (default: 480 = 8 hours)",
                  minimum: 360,
                  maximum: 600,
                },
              },
            },
          },
          {
            name: "get_recovery_quality",
            description: "Assess recovery quality and readiness to train based on sleep metrics. Provides recovery scores, training intensity recommendations, and readiness assessments.",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date to assess (YYYY-MM-DD format, default: today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                days: {
                  type: "number",
                  description: "Number of recent days to assess (default: 7)",
                  minimum: 1,
                  maximum: 30,
                },
              },
            },
          },
          {
            name: "detect_poor_sleep_impacts",
            description: "Identify specific instances where poor sleep negatively impacted performance. Shows which nights of poor sleep led to performance decreases and which metrics were affected.",
            inputSchema: {
              type: "object",
              properties: {
                dateRange: {
                  type: "string",
                  description: "Date range in format YYYY-MM-DD/YYYY-MM-DD (default: last 30 days)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}/\\d{4}-\\d{2}-\\d{2}$",
                },
                maxImpacts: {
                  type: "number",
                  description: "Maximum number of impacts to return (default: 10)",
                  minimum: 1,
                  maximum: 50,
                },
                minSeverity: {
                  type: "string",
                  description: "Minimum severity to include (low, moderate, high)",
                  enum: ["low", "moderate", "high"],
                },
              },
            },
          },
          {
            name: "get_hrv_trends",
            description: "Analyze HRV trends over time with rolling averages and baseline deviations. Shows current HRV, weekly and monthly trends, and historical data points.",
            inputSchema: {
              type: "object",
              properties: {
                startDate: {
                  type: "string",
                  description: "Start date in YYYY-MM-DD format (default: 30 days ago)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                endDate: {
                  type: "string",
                  description: "End date in YYYY-MM-DD format (default: today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                syncFromGarmin: {
                  type: "boolean",
                  description: "Sync HRV data from Garmin before analysis (default: true)",
                },
              },
            },
          },
          {
            name: "get_readiness_score",
            description: "Calculate comprehensive readiness score combining HRV, sleep, training stress balance, resting heart rate, and body battery. Provides training recommendations and identifies factors affecting readiness.",
            inputSchema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  description: "Date to assess (YYYY-MM-DD format, default: today)",
                  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                },
                syncFromGarmin: {
                  type: "boolean",
                  description: "Sync latest data from Garmin before assessment (default: true)",
                },
              },
            },
          },
          {
            name: "get_hrv_baseline",
            description: "Calculate HRV baseline statistics using robust median-based methods. Includes confidence intervals, weekly patterns, and baseline evolution.",
            inputSchema: {
              type: "object",
              properties: {
                days: {
                  type: "number",
                  description: "Number of recent days to sync (default: 28)",
                  minimum: 14,
                  maximum: 90,
                },
                syncFromGarmin: {
                  type: "boolean",
                  description: "Sync HRV data from Garmin before calculation (default: true)",
                },
              },
            },
          },
          {
            name: "get_hrv_anomalies",
            description: "Detect HRV anomalies and classify their severity. Identifies drops below baseline, calculates velocity, tracks consecutive days low, and estimates recovery time.",
            inputSchema: {
              type: "object",
              properties: {
                days: {
                  type: "number",
                  description: "Number of recent days to analyze (default: 7)",
                  minimum: 1,
                  maximum: 30,
                },
                syncFromGarmin: {
                  type: "boolean",
                  description: "Sync HRV data from Garmin before detection (default: true)",
                },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        let result;
        switch (request.params.name) {
          case "get_daily_overview":
            result = await this.overviewTools.getDailyOverview(request.params.arguments || {});
            break;
          case "get_sleep_data":
            result = await this.sleepTools.getSleepData(request.params.arguments || {});
            break;
          case "get_sleep_duration":
            result = await this.sleepTools.getSleepDuration(request.params.arguments || {});
            break;
          case "get_health_metrics":
            result = await this.healthTools.getHealthMetrics(request.params.arguments || {});
            break;
          case "get_steps_data":
            result = await this.healthTools.getStepsData(request.params.arguments || {});
            break;
          case "get_heart_rate_data":
            result = await this.healthTools.getHeartRateData(request.params.arguments || {});
            break;
          case "get_weight_data":
            result = await this.healthTools.getWeightData(request.params.arguments || {});
            break;
          case "get_hydration_data":
            result = await this.healthTools.getHydrationData(request.params.arguments || {});
            break;
          case "get_activities":
            result = await this.activityTools.getActivities(request.params.arguments || {});
            break;
          case "get_activity_details":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.activityTools.getActivityDetails(request.params.arguments as any || {});
            break;
          case "get_weekly_volume":
            result = await this.activityVolumeTools.getWeeklyVolume(request.params.arguments || {});
            break;
          case "get_monthly_volume":
            result = await this.activityVolumeTools.getMonthlyVolume(request.params.arguments || {});
            break;
          case "get_custom_range_volume":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.activityVolumeTools.getCustomRangeVolume(request.params.arguments as any || {});
            break;
          case "get_activity_hr_zones":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.hrZoneTools.getActivityHRZones(request.params.arguments as any || {});
            break;
          case "get_aggregated_hr_zones":
            result = await this.hrZoneTools.getAggregatedHRZones(request.params.arguments || {});
            break;
          case "get_training_stress_balance":
            result = await this.trainingStressTools.getTrainingStressBalance(request.params.arguments || {});
            break;
          case "get_sport_progress":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.sportProgressTools.getSportProgress(request.params.arguments as any || {});
            break;
          case "get_pace_trends":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.sportProgressTools.getPaceTrends(request.params.arguments as any || {});
            break;
          case "get_power_trends":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.sportProgressTools.getPowerTrends(request.params.arguments as any || {});
            break;
          case "get_efficiency_metrics":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.sportProgressTools.getEfficiencyMetrics(request.params.arguments as any || {});
            break;
          case "get_personal_records":
            result = await this.personalRecordsTools.getPersonalRecords(request.params.arguments || {});
            break;
          case "get_pr_history":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.personalRecordsTools.getPRHistory(request.params.arguments as any || {});
            break;
          case "detect_new_prs":
            result = await this.personalRecordsTools.detectNewPRs(request.params.arguments || {});
            break;
          case "manage_custom_pr_category":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.personalRecordsTools.manageCustomPRCategory(request.params.arguments as any || {});
            break;
          case "get_periodization_analysis":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.periodizationTools.getPeriodizationAnalysis(request.params.arguments as any || {});
            break;
          case "get_current_form_analysis":
            result = await this.fatigueFreshnessTools.getCurrentFormAnalysis(request.params.arguments || {});
            break;
          case "get_form_history":
            result = await this.fatigueFreshnessTools.getFormHistory(request.params.arguments || {});
            break;
          case "predict_future_form":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.fatigueFreshnessTools.predictFutureForm(request.params.arguments as any || {});
            break;
          case "generate_taper_plan":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.fatigueFreshnessTools.generateTaperPlan(request.params.arguments as any || {});
            break;
          case "analyze_form_performance":
            result = await this.fatigueFreshnessTools.analyzeFormPerformance(request.params.arguments || {});
            break;
          case "create_running_workout":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.workoutTools.createRunningWorkout(request.params.arguments as any || {});
            break;
          case "schedule_workout":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.workoutTools.scheduleWorkout(request.params.arguments as any || {});
            break;
          case "delete_workout":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.workoutTools.deleteWorkout(request.params.arguments as any || {});
            break;
          case "unschedule_workout":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.workoutTools.unscheduleWorkout(request.params.arguments as any || {});
            break;
          case "update_workout":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.workoutTools.updateWorkout(request.params.arguments as any || {});
            break;
          case "get_scheduled_workouts":
            result = await this.workoutTools.getScheduledWorkouts(request.params.arguments || {});
            break;
          case "get_workout_detail":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.workoutTools.getWorkoutDetail((request.params.arguments as any)?.workoutId || '');
            break;
          case "get_sleep_performance_correlation":
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await this.sleepCorrelationTools.getSleepPerformanceCorrelation(request.params.arguments as any || {});
            break;
          case "get_optimal_sleep_pattern":
            result = await this.sleepCorrelationTools.getOptimalSleepPattern(request.params.arguments || {});
            break;
          case "get_sleep_debt_analysis":
            result = await this.sleepCorrelationTools.getSleepDebtAnalysis(request.params.arguments || {});
            break;
          case "get_recovery_quality":
            result = await this.sleepCorrelationTools.getRecoveryQuality(request.params.arguments || {});
            break;
          case "detect_poor_sleep_impacts":
            result = await this.sleepCorrelationTools.detectPoorSleepImpacts(request.params.arguments || {});
            break;
          case "get_hrv_trends":
            result = await this.hrvTools.getHRVTrends(request.params.arguments || {});
            break;
          case "get_readiness_score":
            result = await this.hrvTools.getReadinessScore(request.params.arguments || {});
            break;
          case "get_hrv_baseline":
            result = await this.hrvTools.getHRVBaseline(request.params.arguments || {});
            break;
          case "get_hrv_anomalies":
            result = await this.hrvTools.getHRVAnomalies(request.params.arguments || {});
            break;
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }

        return result;
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new GarminConnectMCPServer();
server.run().catch(() => {
  // Fatal error - exit process
  // Don't use console.* as it pollutes stdio MCP protocol
  process.exit(1);
});
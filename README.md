# Garmin Connect MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to Garmin Connect data including sleep analytics, health metrics, activities, and training volume analysis. Perfect for building AI-powered fitness insights, training analysis, and health tracking applications.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Setup](#setup)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Advanced Features](#advanced-features)
- [Development](#development)
- [Security](#security)

## Overview

This MCP server connects your AI assistant (Claude Desktop, Claude Code, or any MCP-compatible client) directly to your Garmin Connect account, enabling:

- **Real-time Health Insights**: Access sleep, heart rate, steps, stress, and body battery data
- **Training Analytics**: Aggregate training volume by week, month, or custom date ranges
- **Activity Analysis**: Retrieve detailed activity data with filtering and pagination
- **Multi-metric Summaries**: Get comprehensive daily health overviews

**Tech Stack**: TypeScript, Node.js 20+, MCP SDK, garmin-connect library

## Features

### 🌙 Sleep Analytics
- Detailed sleep stages (deep, light, REM, awake)
- Sleep scores and quality metrics
- Duration and timing analysis
- Summary and detailed modes

### 💪 Health Metrics
- **Steps**: Daily step counts, goals, and progress tracking
- **Heart Rate**: Resting HR, max HR, zones, and time-series data
- **Body Composition**: Weight tracking and body composition
- **Stress & Recovery**: Stress levels and body battery metrics

### 🏃 Activity Tracking
- Recent activity lists with filtering
- Detailed activity information (splits, laps, metrics)
- Activity-specific data (distance, duration, pace, elevation)
- Pagination support for large datasets

### 📊 Training Volume Analysis
- Weekly training aggregation (ISO week standards)
- Monthly training summaries
- Custom date range analysis (up to 365 days)
- Activity type filtering (running, cycling, swimming, etc.)
- Trend analysis (week-over-week, month-over-month)
- Sport-specific breakdowns

## Setup

### Prerequisites

1. **Garmin Connect Account**: Active account with data from a compatible Garmin device
2. **Node.js**: Version 20 or higher
3. **MCP Client**: Claude Desktop, Claude Code, or another MCP-compatible application

### Installation

#### Option 1: Use with npx (Recommended)

No installation required! Configure directly in your MCP client:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "garmin-connect": {
      "command": "npx",
      "args": ["-y", "garmin-connect-mcp"],
      "env": {
        "GARMIN_USERNAME": "your_username",
        "GARMIN_PASSWORD": "your_password"
      }
    }
  }
}
```

**Claude Code** (`.claude/mcp.json` in your project):

```json
{
  "mcpServers": {
    "garmin-connect": {
      "command": "npx",
      "args": ["-y", "garmin-connect-mcp"],
      "env": {
        "GARMIN_USERNAME": "your_username",
        "GARMIN_PASSWORD": "your_password"
      }
    }
  }
}
```

The `-y` flag automatically accepts the npx prompt, ensuring smooth startup.

#### Option 2: Global Installation

Install globally via npm:

```bash
npm install -g garmin-connect-mcp
```

Then configure without npx:

```json
{
  "mcpServers": {
    "garmin-connect": {
      "command": "garmin-connect-mcp",
      "env": {
        "GARMIN_USERNAME": "your_username",
        "GARMIN_PASSWORD": "your_password"
      }
    }
  }
}
```

#### Option 3: Local Development

For development or testing local changes:

```bash
git clone <repository-url>
cd garmin-connect-mcp
pnpm install
pnpm build
```

Configure with absolute path:

```json
{
  "mcpServers": {
    "garmin-connect": {
      "command": "node",
      "args": ["/absolute/path/to/garmin-connect-mcp/dist/index.js"],
      "env": {
        "GARMIN_USERNAME": "your_username",
        "GARMIN_PASSWORD": "your_password"
      }
    }
  }
}
```

Or use a `.env` file:

```json
{
  "mcpServers": {
    "garmin-connect": {
      "command": "node",
      "args": ["/absolute/path/to/garmin-connect-mcp/dist/index.js"],
      "envFile": "/absolute/path/to/garmin-connect-mcp/.env"
    }
  }
}
```

## Available Tools

### Overview Tools

#### `get_daily_overview`
Get a comprehensive daily summary including sleep, activities, and health metrics in one call.

**Parameters:**
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)

**Example:**
```
Show me my daily overview for yesterday
```

**Response includes:**
- Sleep summary (duration, quality, stages)
- Activity summary (count, total duration, distance)
- Health metrics (steps, heart rate, stress, body battery)

---

### Sleep Tools

#### `get_sleep_data`
Get detailed sleep information including sleep stages, movements, and quality metrics.

**Parameters:**
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)
- `summary` (optional): Return only summary data (default: false)
- `fields` (optional): Specific fields to include (e.g., `['dailySleepDTO', 'wellnessEpochSummaryDTO']`)

**Example:**
```
Get my detailed sleep data for 2025-01-15
Show me a sleep summary for last night
```

**Response includes:**
- Total sleep duration
- Sleep stages (deep, light, REM, awake) with durations
- Sleep scores and quality ratings
- Start/end times
- Movement data (when `summary: false`)

#### `get_sleep_duration`
Quick access to total sleep duration for a specific date.

**Parameters:**
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)

**Example:**
```
How many hours did I sleep last night?
```

---

### Health Metrics Tools

#### `get_health_metrics`
Get aggregated health metrics for a specific date.

**Parameters:**
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)
- `metrics` (optional): Array of specific metrics `['steps', 'weight', 'heart_rate', 'stress', 'body_battery']` (defaults to all)

**Example:**
```
What are my health metrics for today?
Show me just my steps and heart rate for yesterday
```

**Response includes:**
- Steps data (count, goal, distance)
- Heart rate (resting, max, zones)
- Stress levels
- Body battery percentage
- Weight and body composition

#### `get_steps_data`
Get detailed step count and activity data.

**Parameters:**
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)
- `summary` (optional): Return only summary data (default: false)

**Example:**
```
Show me my step data for today
How many steps did I take yesterday?
```

**Response includes:**
- Total steps
- Daily goal and progress percentage
- Distance covered
- Active time
- Hourly breakdown (when `summary: false`)

#### `get_heart_rate_data`
Get detailed heart rate measurements and zone data.

**Parameters:**
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)
- `summary` (optional): Return only summary data (default: false)

**Example:**
```
What was my heart rate today?
Show me my heart rate zones for yesterday
```

**Response includes:**
- Resting heart rate
- Maximum heart rate
- Average heart rate
- Heart rate zones and time in each zone
- Time-series measurements (when `summary: false`)

#### `get_weight_data`
Get weight and body composition data.

**Parameters:**
- `date` (optional): Date in `YYYY-MM-DD` format (defaults to today)

**Example:**
```
What's my current weight?
Show me my weight for last week
```

**Response includes:**
- Weight (kg/lbs)
- BMI
- Body fat percentage
- Muscle mass
- Body water percentage

---

### Activity Tools

#### `get_activities`
Get a list of recent activities with optional filtering and pagination.

**Parameters:**
- `start` (optional): Starting index for pagination (default: 0)
- `limit` (optional): Number of activities to return, max 50 (default: 20)
- `summary` (optional): Return compact summary format (default: false)

**Example:**
```
List my last 10 activities
Show me my recent runs
Get activities 20-40 (for pagination)
```

**Response includes:**
- Activity ID and name
- Activity type (running, cycling, swimming, etc.)
- Start time and duration
- Distance, pace, speed
- Calories and elevation gain
- Heart rate data
- Splits and laps (when `summary: false`)

#### `get_activity_details`
Get comprehensive information for a specific activity.

**Parameters:**
- `activityId` (required): The unique ID of the activity

**Example:**
```
Show me details for activity 12345678
Give me the full breakdown of my last run
```

**Response includes:**
- Complete activity metadata
- Detailed splits and laps
- Heart rate zones
- Cadence, power, and other sensor data
- GPS/route information
- Weather conditions

---

### Training Volume Tools

#### `get_weekly_volume`
Get aggregated training volume for a specific ISO week.

**Parameters:**
- `year` (optional): Year (defaults to current year)
- `week` (optional): ISO week number 1-53 (defaults to current week)
- `includeActivityBreakdown` (optional): Include per-sport breakdown (default: true)
- `includeTrends` (optional): Compare with previous week (default: false)
- `maxActivities` (optional): Max activities to process, up to 2000 (default: 1000)
- `activityTypes` (optional): Filter by activity types (e.g., `['running', 'cycling']`)

**Example:**
```
What was my training volume this week?
Show me week 42 of 2024 with trends
Compare my running volume this week vs last week
```

**Response includes:**
- Week number and date range
- Total metrics (duration, distance, calories, elevation)
- Activity count
- Breakdown by activity type
- Week-over-week trends (when `includeTrends: true`)

#### `get_monthly_volume`
Get aggregated training volume for a specific month.

**Parameters:**
- `year` (optional): Year (defaults to current year)
- `month` (optional): Month number 1-12 (defaults to current month)
- `includeActivityBreakdown` (optional): Include per-sport breakdown (default: true)
- `includeTrends` (optional): Compare with previous month (default: false)
- `maxActivities` (optional): Max activities to process, up to 2000 (default: 1000)
- `activityTypes` (optional): Filter by activity types

**Example:**
```
What was my training volume in January?
Show me this month's cycling volume
Compare my training this month vs last month
```

**Response includes:**
- Month name and date range
- Total metrics (duration, distance, calories, elevation)
- Activity count
- Breakdown by activity type
- Month-over-month trends

#### `get_custom_range_volume`
Get training volume for any custom date range (up to 365 days).

**Parameters:**
- `dateRange` (required): Date range as `YYYY-MM-DD/YYYY-MM-DD`
- `includeActivityBreakdown` (optional): Include per-sport breakdown (default: true)
- `includeDailyBreakdown` (optional): Include day-by-day breakdown (default: false)
- `maxActivities` (optional): Max activities to process, up to 2000 (default: 1000)
- `activityTypes` (optional): Filter by activity types

**Example:**
```
What was my training volume from 2025-01-01 to 2025-01-31?
Show me my running volume for the last 90 days
Give me a daily breakdown for the past 2 weeks
```

**Response includes:**
- Date range and period length
- Total metrics across the range
- Activity count
- Breakdown by activity type
- Daily breakdown (when `includeDailyBreakdown: true`)

## Usage Examples

### Quick Health Check
```
What's my daily overview for today?
```

### Sleep Analysis
```
Show me my sleep quality for the past week
Compare my deep sleep from Monday vs Tuesday
```

### Training Insights
```
How much did I run this month?
Compare my weekly volume: this week vs last week
What's my total training time for Q1 2025?
```

### Activity Exploration
```
List my last 20 activities
Show me all my runs from January with heart rate data
What was my fastest 5K in the past 6 months?
```

### Advanced Queries
```
Get my weekly running volume with trends for week 15 of 2025
Show me daily breakdown of cycling for 2025-03-01/2025-03-31
What are my health metrics (just steps and heart rate) for yesterday?
```

## Advanced Features

### Pagination
For large activity lists, use pagination:
```javascript
// Get activities 0-49
get_activities({ start: 0, limit: 50 })

// Get activities 50-99
get_activities({ start: 50, limit: 50 })
```

### Activity Type Filtering
Filter training volume by specific sports:
```javascript
get_weekly_volume({
  activityTypes: ['running', 'cycling'],
  includeTrends: true
})
```

### Trend Analysis
Compare periods to track progress:
```javascript
// Week-over-week comparison
get_weekly_volume({ includeTrends: true })

// Month-over-month comparison
get_monthly_volume({ includeTrends: true })
```

### Summary vs Detailed Modes
Control response size and detail level:
```javascript
// Quick summary
get_sleep_data({ summary: true })

// Full detailed breakdown with time-series
get_sleep_data({ summary: false })
```

### Response Size Management
The server automatically validates response sizes and provides fallback summaries if data exceeds limits. For large date ranges, consider:
- Using `summary: true` mode
- Filtering by specific activity types
- Reducing date ranges
- Disabling detailed breakdowns

## Development

### Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm build            # Build for production
pnpm dev              # Watch mode with auto-rebuild

# Quality Checks
pnpm typecheck        # Run TypeScript type checking
pnpm lint             # Lint code
pnpm lint:fix         # Auto-fix linting issues

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Generate coverage report
```

### Project Structure

```
garmin-connect-mcp/
├── src/
│   ├── client/           # Garmin Connect API client
│   ├── tools/            # MCP tool implementations
│   │   ├── overview-tools.ts
│   │   ├── sleep-tools.ts
│   │   ├── health-tools.ts
│   │   ├── activity-tools.ts
│   │   └── activity-volume-tools.ts
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions
│   └── index.ts          # Main server entry point
├── dist/                 # Built output
└── __tests__/            # Test files
```

### Running Tests

```bash
# Run all tests
pnpm test:run

# Run with coverage
pnpm test:coverage

# Watch mode for development
pnpm test
```

## Security

### Credential Management

**Best Practices:**
- ✅ Use environment variables for credentials
- ✅ Use `.env` files (ensure `.env` is in `.gitignore`)
- ✅ Use MCP configuration `env` or `envFile` options
- ❌ Never hardcode credentials in configuration files
- ❌ Never commit credentials to version control

### Environment Variables

Create a `.env` file in the project root:
```bash
GARMIN_USERNAME=your_username
GARMIN_PASSWORD=your_password
```

### Testing Locally

For local development, use `.mcp.json` (gitignored):
```json
{
  "mcpServers": {
    "garmin-connect": {
      "command": "node",
      "args": ["./dist/index.js"],
      "envFile": ".env"
    }
  }
}
```

### API Rate Limits

The server includes automatic rate limiting and error handling for Garmin Connect API:
- Small delays between batch requests (100ms)
- Graceful error handling for failed requests
- Maximum activity limits to prevent overwhelming the API

## Troubleshooting

### Common Issues

**Authentication Failed**
- Verify credentials in `.env` file
- Check that MCP configuration points to correct `.env` or has correct `env` values
- Ensure Garmin account is active and accessible

**No Data Returned**
- Verify your Garmin device has synced recently
- Check that you're querying dates with actual data
- Ensure your Garmin account has the requested data types

**Response Too Large**
- Use `summary: true` for condensed results
- Reduce date ranges for volume queries
- Filter by specific activity types
- Disable detailed breakdowns (`includeActivityBreakdown: false`)

**Server Not Starting**
- Ensure Node.js version is 20 or higher
- Run `pnpm build` to rebuild after changes
- Check server logs for authentication errors

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`pnpm test:run`)
- Type checking passes (`pnpm typecheck`)
- Code follows existing style guidelines
- New features include tests

## License

MIT

## Version

Current version: 0.1.0

For updates and changelog, see the [releases page](https://github.com/your-repo/releases).

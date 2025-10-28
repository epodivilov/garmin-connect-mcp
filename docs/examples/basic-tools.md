# Basic Tools Examples

Direct API access examples for sleep, activities, health metrics, overview, and workout creation.

## Table of Contents

- [Sleep Tools](#sleep-tools)
  - [Check Last Night's Sleep](#example-check-last-nights-sleep)
  - [Get Sleep Duration Only](#example-get-sleep-duration-only)
  - [Track Sleep Trends](#example-track-sleep-trends)
- [Activity Tools](#activity-tools)
  - [Recent Activity List](#example-recent-activity-list)
  - [Get Activity Details](#example-get-activity-details)
  - [Paginate Through Activities](#example-paginate-through-activities)
- [Health Tools](#health-tools)
  - [Daily Health Snapshot](#example-daily-health-snapshot)
  - [Track Steps Progress](#example-track-steps-progress)
  - [Monitor Heart Rate](#example-monitor-heart-rate)
- [Overview Tools](#overview-tools)
  - [Daily Overview](#example-daily-overview)
- [Workout Tools](#workout-tools)
  - [Create Interval Workout](#example-create-interval-workout)
  - [Schedule Workout to Calendar](#example-schedule-workout-to-calendar)

---

## Sleep Tools

### Example: Check Last Night's Sleep

**Scenario:** Morning routine to review sleep quality and duration.

**MCP Request:**

```json
{
  "tool": "get_sleep_data",
  "parameters": {
    "includeSummaryOnly": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-18\",\"dailySleepDTO\":{\"sleepTimeSeconds\":28800,\"deepSleepSeconds\":6480,\"lightSleepSeconds\":14400,\"remSleepSeconds\":7200,\"awakeSleepSeconds\":720,\"sleepStartTimestampGMT\":1729206000000,\"sleepEndTimestampGMT\":1729234800000,\"sleepQualityTypePK\":85},\"restingHeartRate\":52,\"avgOvernightHrv\":68}"
  }]
}
```

**Interpretation:**

- **Total Sleep:** 28,800 seconds = 8 hours (excellent duration)
- **Deep Sleep:** 6,480 seconds = 1.8 hours (22.5% of total - good)
- **REM Sleep:** 7,200 seconds = 2 hours (25% of total - optimal)
- **Sleep Quality Score:** 85/100 (very good)
- **Resting HR:** 52 bpm (well-recovered)
- **HRV:** 68 ms (good recovery indicator)

**Actions:**
- Quality score 85+ indicates good recovery - safe for moderate-to-high intensity training
- HRV of 68 ms suggests adequate recovery
- Deep sleep at 22.5% is within optimal range (15-25%)

**See also:**
- [Get Sleep Duration Only](#example-get-sleep-duration-only) for quick check
- [Track Sleep Trends](./correlation-tools.md#example-sleep-performance-analysis) for long-term analysis

---

### Example: Get Sleep Duration Only

**Scenario:** Quick check of total sleep time without detailed breakdown.

**MCP Request:**

```json
{
  "tool": "get_sleep_duration",
  "parameters": {
    "date": "2025-10-18"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-18\",\"durationMinutes\":480,\"durationHours\":8}"
  }]
}
```

**Interpretation:**

- **Duration:** 8 hours (meets recommended 7-9 hours for athletes)
- Fast response for quick checks

**Actions:**
- Use this for morning quick checks when you only need total duration
- Compare against your target sleep duration (typically 8 hours for endurance athletes)

**See also:**
- [Check Last Night's Sleep](#example-check-last-nights-sleep) for detailed metrics
- [Sleep Debt Analysis](./correlation-tools.md#example-sleep-debt-tracking) for accumulated deficit

---

### Example: Track Sleep Trends

**Scenario:** Compare sleep quality across multiple days to identify patterns.

**MCP Request:**

```json
{
  "tool": "get_sleep_data",
  "parameters": {
    "date": "2025-10-18",
    "fields": ["dailySleepDTO", "avgOvernightHrv", "restingHeartRate"]
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-18\",\"dailySleepDTO\":{\"sleepTimeSeconds\":28800,\"deepSleepSeconds\":6480,\"remSleepSeconds\":7200,\"sleepQualityTypePK\":85},\"restingHeartRate\":52,\"avgOvernightHrv\":68}"
  }]
}
```

**Interpretation:**

- Requesting specific fields reduces response size
- Focus on key metrics: duration, quality score, HRV, resting HR
- Ideal for building your own tracking spreadsheet

**Actions:**
- Request data for multiple consecutive days (call once per day)
- Track trends: HRV increasing = improving recovery, RHR decreasing = better fitness

**See also:**
- [HRV Trends Analysis](./tracking-tools.md#example-hrv-trends-analysis) for automated trend detection

---

## Activity Tools

### Example: Recent Activity List

**Scenario:** View your last 10 workouts to see recent training.

**MCP Request:**

```json
{
  "tool": "get_activities",
  "parameters": {
    "limit": 10,
    "includeSummaryOnly": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"count\":10,\"pagination\":{\"start\":0,\"limit\":10,\"hasMore\":true},\"activities\":[{\"activityId\":12345678901,\"name\":\"Morning Run\",\"type\":\"running\",\"date\":\"2025-10-18\",\"duration\":45,\"distance\":8.2,\"calories\":520,\"averageHR\":152,\"maxHR\":172},{\"activityId\":12345678902,\"name\":\"Evening Bike\",\"type\":\"cycling\",\"date\":\"2025-10-17\",\"duration\":90,\"distance\":35.5,\"calories\":890,\"averageHR\":138,\"maxHR\":165}]}"
  }]
}
```

**Interpretation:**

- **Activity 1 (Running):**
  - Distance: 8.2 km in 45 min = 5:29 min/km pace
  - Average HR: 152 bpm (moderate intensity)
  - Max HR: 172 bpm (peak effort)

- **Activity 2 (Cycling):**
  - Distance: 35.5 km in 90 min = 23.7 km/h average speed
  - Average HR: 138 bpm (endurance pace)

**Actions:**
- Use `includeSummaryOnly: true` for fast overview
- Check `hasMore: true` to know if more activities exist
- Note `activityId` for detailed analysis with `get_activity_details`

**See also:**
- [Get Activity Details](#example-get-activity-details) for full workout breakdown
- [Paginate Through Activities](#example-paginate-through-activities) for browsing older workouts

---

### Example: Get Activity Details

**Scenario:** Analyze a specific workout with splits and performance metrics.

**MCP Request:**

```json
{
  "tool": "get_activity_details",
  "parameters": {
    "activityId": 12345678901
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"activityId\":12345678901,\"basic\":{\"name\":\"Morning Run\",\"type\":{\"key\":\"running\",\"id\":1},\"locationName\":\"Central Park\"},\"timing\":{\"startTimeLocal\":\"2025-10-18T06:30:00\",\"duration\":45,\"elapsedDuration\":47,\"movingDuration\":45},\"performance\":{\"distance\":8.2,\"calories\":520,\"averageSpeed\":10.93,\"maxSpeed\":15.2,\"elevationGain\":85,\"elevationLoss\":82},\"heartRate\":{\"average\":152,\"max\":172},\"training\":{\"aerobicEffect\":3.8,\"anaerobicEffect\":1.2,\"trainingEffectLabel\":\"Maintaining\",\"vO2MaxValue\":52},\"splitSummaries\":[{\"distance\":1000,\"duration\":330,\"averageSpeed\":10.91,\"averageHR\":148},{\"distance\":1000,\"duration\":325,\"averageSpeed\":11.08,\"averageHR\":152}]}"
  }]
}
```

**Interpretation:**

- **Performance Metrics:**
  - Average pace: 5:29 min/km (calculated from 10.93 km/h speed)
  - Elevation gain: 85m (moderate hills)
  - Training Effect: 3.8 Aerobic (maintaining fitness), 1.2 Anaerobic (minimal)
  - VO2 Max: 52 ml/kg/min (good fitness level)

- **Splits Analysis:**
  - Split 1: 5:30 min/km @ 148 bpm (steady)
  - Split 2: 5:23 min/km @ 152 bpm (slightly faster)
  - Consistent pacing with slight negative split

**Actions:**
- Use splits to analyze pacing strategy
- Training Effect 3.8 = "Maintaining" - good for easy run
- VO2 Max estimate helps track fitness changes over time

**See also:**
- [Sport Progress Analysis](./analytics-tools.md#example-running-progress-analysis) for long-term pace trends
- [HR Zone Distribution](./analytics-tools.md#example-single-activity-hr-zones) for intensity breakdown

---

### Example: Paginate Through Activities

**Scenario:** Browse through your training history in batches.

**MCP Request (Page 1):**

```json
{
  "tool": "get_activities",
  "parameters": {
    "start": 0,
    "limit": 20,
    "includeSummaryOnly": true
  }
}
```

**MCP Request (Page 2):**

```json
{
  "tool": "get_activities",
  "parameters": {
    "start": 20,
    "limit": 20,
    "includeSummaryOnly": true
  }
}
```

**Response (Page 1):**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"count\":20,\"pagination\":{\"start\":0,\"limit\":20,\"hasMore\":true},\"activities\":[...]}"
  }]
}
```

**Interpretation:**

- `start: 0` begins at most recent activity
- `limit: 20` returns 20 activities per page
- `hasMore: true` indicates more activities exist
- Next page: use `start: 20` (skip first 20)

**Actions:**
- Use pagination to avoid response size limits
- Always check `hasMore` to know when to stop
- Keep `includeSummaryOnly: true` for faster loading

**See also:**
- [Weekly Volume Analysis](./aggregation-tools.md#example-weekly-volume-analysis) for aggregated summary

---

## Health Tools

### Example: Daily Health Snapshot

**Scenario:** Get all available health metrics for today.

**MCP Request:**

```json
{
  "tool": "get_health_metrics",
  "parameters": {}
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"metrics\":{\"steps\":{\"steps\":8542,\"goal\":10000,\"goalProgress\":\"85%\",\"distanceKm\":6.4},\"heart_rate\":{\"restingHR\":52,\"maxHR\":172,\"minHR\":48,\"lastSevenDaysAvg\":54},\"weight\":{\"weightKg\":72.5,\"bmi\":22.1,\"bodyFat\":12.5,\"muscleMass\":63.4}},\"hints\":[\"Consider using get_steps_data for detailed step tracking\"]}"
  }]
}
```

**Interpretation:**

- **Steps:** 8,542 / 10,000 (85% of goal) - on track for daily target
- **Distance:** 6.4 km from steps
- **Resting HR:** 52 bpm (well-recovered, typical for trained athletes)
- **7-day avg RHR:** 54 bpm (slightly elevated average - may indicate building fatigue)
- **Weight:** 72.5 kg, BMI 22.1 (healthy range)
- **Body Fat:** 12.5% (athletic range for males)

**Actions:**
- RHR 2 bpm below weekly average = good recovery today
- 85% of step goal - add a walk to hit 10,000
- Body composition stable - nutrition/training balance good

**See also:**
- [Track Steps Progress](#example-track-steps-progress) for detailed step data
- [Monitor Heart Rate](#example-monitor-heart-rate) for HR trends

---

### Example: Track Steps Progress

**Scenario:** Monitor daily step count and distance.

**MCP Request:**

```json
{
  "tool": "get_steps_data",
  "parameters": {
    "includeSummaryOnly": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"steps\":{\"total\":8542,\"goal\":10000,\"goalProgress\":1458,\"goalProgressPercent\":\"85%\"},\"distance\":{\"meters\":6400,\"kilometers\":6.4}}"
  }]
}
```

**Interpretation:**

- **Progress:** 8,542 steps completed, 1,458 steps remaining to goal
- **Distance:** 6.4 km covered (approx. 75 cm per step average)
- **Goal Achievement:** 85% complete

**Actions:**
- Need 1,458 more steps to hit daily goal (~15-minute walk)
- 6.4 km total daily movement contributing to active recovery

**See also:**
- [Daily Health Snapshot](#example-daily-health-snapshot) for comprehensive metrics

---

### Example: Monitor Heart Rate

**Scenario:** Check resting heart rate trends and daily patterns.

**MCP Request:**

```json
{
  "tool": "get_heart_rate_data",
  "parameters": {
    "includeSummaryOnly": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"summary\":{\"restingHR\":52,\"maxHR\":172,\"minHR\":48,\"lastSevenDaysAvgRestingHR\":54}}"
  }]
}
```

**Interpretation:**

- **Today's RHR:** 52 bpm (excellent recovery)
- **7-day avg RHR:** 54 bpm
- **Deviation:** -2 bpm below average (well-rested)
- **Range:** 48-172 bpm (min during sleep, max during activity)

**Actions:**
- RHR 2 bpm below weekly avg = good day for high-intensity training
- RHR consistently above 60 = may indicate overtraining or illness
- Track RHR trends weekly - increasing RHR = need more recovery

**See also:**
- [HRV Trends](./tracking-tools.md#example-hrv-trends-analysis) for advanced recovery tracking
- [Readiness Score](./tracking-tools.md#example-daily-readiness-check) for training recommendations

---

## Overview Tools

### Example: Daily Overview

**Scenario:** Get complete daily summary combining sleep, activities, and health.

**MCP Request:**

```json
{
  "tool": "get_daily_overview",
  "parameters": {
    "date": "2025-10-18"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-18\",\"sleep\":{\"totalSleep\":480,\"sleepScore\":85,\"quality\":\"Excellent\"},\"activities\":[{\"id\":\"12345678901\",\"type\":\"running\",\"name\":\"Morning Run\",\"duration\":45,\"distance\":8.2,\"calories\":520},{\"id\":\"12345678902\",\"type\":\"strength_training\",\"name\":\"Core Workout\",\"duration\":30,\"calories\":180}],\"health\":{\"steps\":12450,\"restingHR\":52,\"weight\":72.5},\"hints\":[\"Great recovery day with 8h sleep and low RHR\",\"2 quality workouts completed\"]}"
  }]
}
```

**Interpretation:**

- **Sleep:** 8 hours, score 85/100 (excellent recovery)
- **Activities:**
  - Run: 8.2 km in 45 min (5:29 pace)
  - Strength: 30 min core work
  - Total calories: 700 burned
- **Health:**
  - 12,450 steps (exceeded 10k goal)
  - RHR 52 bpm (well-recovered)

**Actions:**
- Excellent recovery + 2 quality sessions = productive training day
- High step count despite workouts = good overall activity level
- Low RHR confirms good recovery from training

**See also:**
- [Morning Check-in Pattern](./README.md#pattern-1-daily-check-in) for full routine

---

## Workout Tools

### Example: Create Interval Workout

**Scenario:** Build a structured 5x1000m interval session for threshold training.

**MCP Request:**

```json
{
  "tool": "create_running_workout",
  "parameters": {
    "name": "5x1000m Threshold Intervals",
    "description": "Threshold pace intervals with 2min recovery",
    "steps": [
      {
        "type": "warmup",
        "duration": {
          "type": "time",
          "value": 600
        },
        "target": {
          "type": "no_target"
        }
      },
      {
        "type": "repeat",
        "numberOfRepetitions": 5,
        "childSteps": [
          {
            "type": "interval",
            "duration": {
              "type": "distance",
              "value": 1000,
              "unit": "m"
            },
            "target": {
              "type": "pace",
              "minValue": 4.0,
              "maxValue": 4.2
            }
          },
          {
            "type": "recovery",
            "duration": {
              "type": "time",
              "value": 120
            },
            "target": {
              "type": "no_target"
            }
          }
        ]
      },
      {
        "type": "cooldown",
        "duration": {
          "type": "time",
          "value": 600
        },
        "target": {
          "type": "no_target"
        }
      }
    ]
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"success\":true,\"workoutId\":987654321,\"workoutName\":\"5x1000m Threshold Intervals\",\"message\":\"Workout created successfully\",\"createdDate\":\"2025-10-19\"}"
  }]
}
```

**Interpretation:**

- **Workout Structure:**
  - 10 min easy warmup
  - 5 repetitions of:
    - 1000m @ 4:00-4:12 min/km (threshold pace)
    - 2 min recovery jog
  - 10 min easy cooldown
- **Total Time:** ~45 minutes
- **Workout ID:** 987654321 (use for scheduling)

**Actions:**
- Save `workoutId: 987654321` for scheduling to calendar
- Threshold pace range 4:00-4:12/km allows for fatigue in later intervals
- 2-minute recovery provides adequate but not full recovery (threshold training)

**See also:**
- [Schedule Workout to Calendar](#example-schedule-workout-to-calendar) to add to training plan

---

### Example: Schedule Workout to Calendar

**Scenario:** Add the created workout to next Tuesday's training plan.

**MCP Request:**

```json
{
  "tool": "schedule_workout",
  "parameters": {
    "workoutId": 987654321,
    "date": "2025-10-22"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"success\":true,\"workoutScheduleId\":555444333,\"workoutId\":987654321,\"calendarDate\":\"2025-10-22\",\"message\":\"Workout scheduled successfully to 2025-10-22\"}"
  }]
}
```

**Interpretation:**

- Workout successfully added to calendar for October 22, 2025
- Schedule ID: 555444333 (for future reference/deletion)
- Workout will appear in Garmin Connect calendar and sync to watch

**Actions:**
- Workout will be available on your Garmin device on Oct 22
- Review workout on device before starting
- Edit/delete via Garmin Connect web if needed

**See also:**
- [Create Interval Workout](#example-create-interval-workout) for building workouts
- [Race Taper Planning](./tracking-tools.md#example-race-taper-planning) for scheduling taper workouts

---

## Quick Reference

### Most Used Basic Tools

| Tool | Use Case | Response Time |
|------|----------|---------------|
| `get_sleep_data` | Morning recovery check | < 1 sec |
| `get_activities` | Browse recent workouts | < 1 sec |
| `get_health_metrics` | Daily health snapshot | < 2 sec |
| `get_daily_overview` | Complete day summary | < 3 sec |
| `get_activity_details` | Analyze single workout | < 1 sec |

### Parameter Tips

- Always use `includeSummaryOnly: true` for faster responses
- Use `fields` parameter to request only needed data
- Paginate with `start` and `limit` for large datasets
- Default `date` is today - omit for current data

---

[← Back to Examples Home](./README.md) | [Next: Aggregation Tools →](./aggregation-tools.md)

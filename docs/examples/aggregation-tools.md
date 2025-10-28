# Aggregation Tools Examples

Volume aggregation examples for tracking training load across weekly, monthly, and custom time periods.

## Table of Contents

- [Weekly Volume](#weekly-volume)
  - [Weekly Volume Analysis](#example-weekly-volume-analysis)
  - [Weekly Trends Comparison](#example-weekly-trends-comparison)
  - [Single Sport Weekly Volume](#example-single-sport-weekly-volume)
- [Monthly Volume](#monthly-volume)
  - [Monthly Summary](#example-monthly-summary)
  - [Monthly Training Load](#example-monthly-training-load)
- [Custom Range Volume](#custom-range-volume)
  - [Training Block Analysis](#example-training-block-analysis)
  - [Race Preparation Volume](#example-race-preparation-volume)
  - [Daily Breakdown Tracking](#example-daily-breakdown-tracking)

---

## Weekly Volume

### Example: Weekly Volume Analysis

**Scenario:** Review current week's training load on Sunday to plan next week.

**MCP Request:**

```json
{
  "tool": "get_weekly_volume",
  "parameters": {
    "includeTrends": true,
    "includeActivityBreakdown": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"year\":2025,\"week\":42,\"startDate\":\"2025-10-13\",\"endDate\":\"2025-10-19\",\"metrics\":{\"duration\":420,\"distance\":78.5,\"elevationGain\":1250,\"calories\":4200,\"activities\":7},\"byActivityType\":{\"running\":{\"duration\":180,\"distance\":35.2,\"elevationGain\":450,\"calories\":2100,\"activities\":4},\"cycling\":{\"duration\":210,\"distance\":42.3,\"elevationGain\":720,\"calories\":1950,\"activities\":2},\"strength_training\":{\"duration\":30,\"distance\":0,\"elevationGain\":0,\"calories\":150,\"activities\":1}},\"trends\":{\"durationChange\":15.5,\"distanceChange\":12.3,\"volumeDirection\":\"increasing\"}}"
  }]
}
```

**Interpretation:**

- **Total Volume (Week 42):**
  - Duration: 420 minutes (7 hours)
  - Distance: 78.5 km
  - Elevation: 1,250 m
  - Calories: 4,200
  - Activities: 7 sessions

- **By Sport:**
  - **Running:** 4 sessions, 35.2 km, 3h (43% of time)
  - **Cycling:** 2 sessions, 42.3 km, 3.5h (50% of time)
  - **Strength:** 1 session, 30 min (7% of time)

- **Trends vs Previous Week:**
  - Duration: +15.5% increase
  - Distance: +12.3% increase
  - Volume Direction: Increasing (building phase)

**Actions:**
- 15% volume increase is safe (rule of thumb: <10% per week, but acceptable if coming from rest)
- Good sport distribution: 93% endurance, 7% strength
- Consider adding another strength session for balance
- Next week: hold volume or increase <10% to avoid overtraining

**See also:**
- [Monthly Training Load](#example-monthly-training-load) for bigger picture
- [Weekly Intensity Analysis](./analytics-tools.md#example-weekly-intensity-analysis) for HR zone distribution

---

### Example: Weekly Trends Comparison

**Scenario:** Check if this week's volume is sustainable or trending toward overtraining.

**MCP Request:**

```json
{
  "tool": "get_weekly_volume",
  "parameters": {
    "year": 2025,
    "week": 42,
    "includeTrends": true,
    "includeActivityBreakdown": false
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"year\":2025,\"week\":42,\"startDate\":\"2025-10-13\",\"endDate\":\"2025-10-19\",\"metrics\":{\"duration\":420,\"distance\":78.5,\"elevationGain\":1250,\"calories\":4200,\"activities\":7},\"trends\":{\"durationChange\":15.5,\"distanceChange\":12.3,\"volumeDirection\":\"increasing\"}}"
  }]
}
```

**Interpretation:**

- **Volume Change:** +15.5% duration, +12.3% distance
- **Direction:** Increasing (building fitness)
- **Assessment:**
  - Week 41: ~365 minutes (6h 5min)
  - Week 42: 420 minutes (7h)
  - Increase: 55 minutes (+15.5%)

**Actions:**
- **Safe:** 15% increase acceptable if:
  - Coming from recovery week
  - Week 41 was reduced volume
  - Feeling well-recovered
- **Warning:** If this is 2nd+ consecutive week of 15% increase, risk of overtraining
- **Next Week Plan:**
  - If feeling good: hold at 420 min
  - If fatigued: reduce to 360 min (recovery week)
  - Avoid another 15% jump

**See also:**
- [Training Stress Balance](./tracking-tools.md#example-training-stress-balance) for fatigue monitoring
- [Periodization Analysis](./analytics-tools.md#example-periodization-analysis) for phase planning

---

### Example: Single Sport Weekly Volume

**Scenario:** Track running volume specifically to monitor mileage progression.

**MCP Request:**

```json
{
  "tool": "get_weekly_volume",
  "parameters": {
    "activityTypes": ["running"],
    "includeTrends": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"year\":2025,\"week\":42,\"startDate\":\"2025-10-13\",\"endDate\":\"2025-10-19\",\"metrics\":{\"duration\":180,\"distance\":35.2,\"elevationGain\":450,\"calories\":2100,\"activities\":4},\"trends\":{\"durationChange\":8.5,\"distanceChange\":7.2,\"volumeDirection\":\"stable\"}}"
  }]
}
```

**Interpretation:**

- **Running Only:**
  - 4 runs this week
  - 35.2 km total
  - 3 hours of running
  - Average: 8.8 km per run

- **Trends:**
  - +8.5% duration (safe increase)
  - +7.2% distance
  - Volume Direction: Stable (consistent training)

**Actions:**
- 35 km/week is sustainable base mileage
- 8.5% increase is safe for running volume
- 4 runs/week provides good frequency for adaptation
- Consider adding 5th easy run to increase volume further if training for marathon

**See also:**
- [Running Progress Analysis](./analytics-tools.md#example-running-progress-analysis) for pace trends

---

## Monthly Volume

### Example: Monthly Summary

**Scenario:** End-of-month review to assess overall training load.

**MCP Request:**

```json
{
  "tool": "get_monthly_volume",
  "parameters": {
    "includeActivityBreakdown": true,
    "includeTrends": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"year\":2025,\"month\":10,\"startDate\":\"2025-10-01\",\"endDate\":\"2025-10-31\",\"metrics\":{\"duration\":1680,\"distance\":315.8,\"elevationGain\":5200,\"calories\":16800,\"activities\":28},\"byActivityType\":{\"running\":{\"duration\":720,\"distance\":142.5,\"elevationGain\":1800,\"calories\":8400,\"activities\":16},\"cycling\":{\"duration\":840,\"distance\":169.3,\"elevationGain\":3200,\"calories\":7800,\"activities\":10},\"strength_training\":{\"duration\":120,\"distance\":0,\"elevationGain\":0,\"calories\":600,\"activities\":2}},\"trends\":{\"durationChange\":12.8,\"distanceChange\":10.5,\"volumeDirection\":\"increasing\"}}"
  }]
}
```

**Interpretation:**

- **October 2025 Summary:**
  - Total: 28 hours of training
  - Distance: 315.8 km
  - Activities: 28 sessions (averaging 6.7 per week)

- **Sport Distribution:**
  - Running: 16 sessions, 142.5 km (43% of time)
  - Cycling: 10 sessions, 169.3 km (50% of time)
  - Strength: 2 sessions (7% of time)

- **Monthly Trends:**
  - +12.8% duration vs September
  - +10.5% distance vs September
  - Building volume consistently

**Actions:**
- 28 hours/month is strong training load for amateur athlete
- Running: 142.5 km/month ≈ 35 km/week (good base)
- Cycling: 169 km/month provides excellent cross-training
- Consider adding more strength (currently only 2 sessions/month)
- 12.8% monthly increase sustainable for 2-3 months max

**See also:**
- [Weekly Volume Analysis](#example-weekly-volume-analysis) for week-by-week breakdown
- [Periodization Analysis](./analytics-tools.md#example-periodization-analysis) for training phase assessment

---

### Example: Monthly Training Load

**Scenario:** Compare current month to previous months to identify training cycles.

**MCP Request:**

```json
{
  "tool": "get_monthly_volume",
  "parameters": {
    "year": 2025,
    "month": 10,
    "includeActivityBreakdown": false,
    "includeTrends": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"year\":2025,\"month\":10,\"startDate\":\"2025-10-01\",\"endDate\":\"2025-10-31\",\"metrics\":{\"duration\":1680,\"distance\":315.8,\"elevationGain\":5200,\"calories\":16800,\"activities\":28},\"trends\":{\"durationChange\":12.8,\"distanceChange\":10.5,\"volumeDirection\":\"increasing\"}}"
  }]
}
```

**Interpretation:**

- **Current (October):** 1,680 minutes (28 hours)
- **Previous (September):** ~1,490 minutes (24.8 hours) - calculated from 12.8% increase
- **Trend:** +190 minutes increase month-over-month

**Actions:**
- Increasing trend = building phase (preparing for race or fitness goal)
- 28 hours in October represents high training load
- If continuing to increase in November:
  - Risk: Overtraining if sustaining 3+ months of 10%+ increases
  - Plan: Consider November as peak (maintain 28h), December as recovery (reduce to 20h)
- Monitor recovery metrics (sleep, HRV) closely during high-load months

**See also:**
- [Form/Freshness Tracking](./tracking-tools.md#example-current-form-analysis) to monitor fatigue
- [Recovery Quality](./correlation-tools.md#example-recovery-assessment) for readiness assessment

---

## Custom Range Volume

### Example: Training Block Analysis

**Scenario:** Analyze a 6-week training block before a race.

**MCP Request:**

```json
{
  "tool": "get_custom_range_volume",
  "parameters": {
    "dateRange": "2025-09-01/2025-10-15",
    "includeActivityBreakdown": true,
    "includeDailyBreakdown": false
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":\"2025-09-01/2025-10-15\",\"startDate\":\"2025-09-01\",\"endDate\":\"2025-10-15\",\"metrics\":{\"duration\":1120,\"distance\":210.5,\"elevationGain\":3500,\"calories\":11200,\"activities\":21},\"byActivityType\":{\"running\":{\"duration\":480,\"distance\":95.2,\"elevationGain\":1200,\"calories\":5600,\"activities\":12},\"cycling\":{\"duration\":560,\"distance\":112.8,\"elevationGain\":2200,\"calories\":5200,\"activities\":8},\"strength_training\":{\"duration\":80,\"distance\":0,\"elevationGain\":0,\"calories\":400,\"activities\":1}}}"
  }]
}
```

**Interpretation:**

- **6.5 Week Block (Sep 1 - Oct 15):**
  - Total: 1,120 minutes (18.7 hours)
  - Average: 2.9 hours/week
  - Distance: 210.5 km (32.4 km/week)
  - Activities: 21 sessions (3.2 per week)

- **Sport Mix:**
  - Running: 95.2 km (45% distance), 12 sessions
  - Cycling: 112.8 km (54% distance), 8 sessions
  - Strength: 1 session (80 min)

**Actions:**
- Weekly average: 2.9 hours is moderate training load
- Running: ~8 km per session (good for endurance base)
- Cycling: ~14 km per session (long endurance rides)
- Strength: Only 1 session in 6 weeks - needs improvement
- Good endurance base for upcoming race

**See also:**
- [Periodization Analysis](./analytics-tools.md#example-periodization-analysis) for phase effectiveness
- [Race Preparation Volume](#example-race-preparation-volume) for taper planning

---

### Example: Race Preparation Volume

**Scenario:** Review 12-week marathon training cycle volume distribution.

**MCP Request:**

```json
{
  "tool": "get_custom_range_volume",
  "parameters": {
    "dateRange": "2025-08-01/2025-10-25",
    "activityTypes": ["running"],
    "includeActivityBreakdown": false,
    "includeDailyBreakdown": false
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":\"2025-08-01/2025-10-25\",\"startDate\":\"2025-08-01\",\"endDate\":\"2025-10-25\",\"metrics\":{\"duration\":960,\"distance\":190.5,\"elevationGain\":2400,\"calories\":11200,\"activities\":36}}"
  }]
}
```

**Interpretation:**

- **12-Week Marathon Block:**
  - Total running: 960 minutes (16 hours)
  - Distance: 190.5 km
  - Average: 15.9 km/week (low for marathon training)
  - Activities: 36 runs (3 per week)

**Actions:**
- **Warning:** 190 km over 12 weeks is low for marathon preparation
  - Recommended: 50-80 km/week peak = 600-960 km total
  - Current: 15.9 km/week average
- **Analysis:**
  - May be building from injury or low base
  - Or includes taper period reducing average
- **Recommendation:** Review weekly breakdown to ensure proper build-up

**See also:**
- [Daily Breakdown Tracking](#example-daily-breakdown-tracking) to see weekly pattern
- [Periodization Analysis](./analytics-tools.md#example-periodization-analysis) for phase structure

---

### Example: Daily Breakdown Tracking

**Scenario:** Analyze daily volume distribution to identify rest days and training patterns.

**MCP Request:**

```json
{
  "tool": "get_custom_range_volume",
  "parameters": {
    "dateRange": "2025-10-01/2025-10-15",
    "includeDailyBreakdown": true,
    "includeActivityBreakdown": false
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":\"2025-10-01/2025-10-15\",\"startDate\":\"2025-10-01\",\"endDate\":\"2025-10-15\",\"metrics\":{\"duration\":600,\"distance\":118.5,\"elevationGain\":1800,\"calories\":6000,\"activities\":10},\"dailyBreakdown\":[{\"date\":\"2025-10-01\",\"metrics\":{\"duration\":0,\"distance\":0,\"elevationGain\":0,\"calories\":0,\"activities\":0}},{\"date\":\"2025-10-02\",\"metrics\":{\"duration\":60,\"distance\":12.5,\"elevationGain\":150,\"calories\":600,\"activities\":1}},{\"date\":\"2025-10-03\",\"metrics\":{\"duration\":45,\"distance\":8.2,\"elevationGain\":100,\"calories\":450,\"activities\":1}},{\"date\":\"2025-10-04\",\"metrics\":{\"duration\":90,\"distance\":22.8,\"elevationGain\":350,\"calories\":900,\"activities\":1}}]}"
  }]
}
```

**Interpretation:**

- **Daily Pattern (first 4 days):**
  - Oct 1: Rest day (0 activities)
  - Oct 2: 60 min, 12.5 km (long run)
  - Oct 3: 45 min, 8.2 km (easy run)
  - Oct 4: 90 min, 22.8 km (bike ride)

- **Training Structure:**
  - Rest days interspersed with training
  - Variety in duration (45-90 min sessions)
  - Mix of distances (8-23 km)

**Actions:**
- Good training pattern: rest day followed by progressive loading
- Oct 2-4 shows 3-day progression: long → easy → long
- Use daily breakdown to:
  - Identify optimal rest day frequency
  - Spot consecutive high-load days (fatigue risk)
  - Plan recovery weeks

**See also:**
- [Weekly Volume Analysis](#example-weekly-volume-analysis) for weekly summaries
- [Form History](./tracking-tools.md#example-form-history) for TSB daily tracking

---

## Quick Reference

### Volume Tool Comparison

| Tool | Best For | Time Range | Trends |
|------|----------|------------|--------|
| `get_weekly_volume` | Week-to-week tracking | 7 days | Previous week |
| `get_monthly_volume` | Monthly planning | 30-31 days | Previous month |
| `get_custom_range_volume` | Training blocks | Any range (max 365 days) | None |

### Recommended Parameters

**For Quick Overview:**
```json
{
  "includeActivityBreakdown": false,
  "includeTrends": true,
  "includeDailyBreakdown": false
}
```

**For Detailed Analysis:**
```json
{
  "includeActivityBreakdown": true,
  "includeTrends": true,
  "includeDailyBreakdown": true
}
```

### Volume Increase Guidelines

| Timeframe | Safe Increase | Warning Threshold |
|-----------|---------------|-------------------|
| Week-to-week | <10% | >15% |
| Month-to-month | <15% | >20% |
| Consecutive increases | 2-3 weeks max | 4+ weeks |

---

[← Back to Basic Tools](./basic-tools.md) | [Home](./README.md) | [Next: Analytics Tools →](./analytics-tools.md)

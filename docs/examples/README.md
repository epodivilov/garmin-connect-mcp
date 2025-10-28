# Tool Examples

Practical examples organized by tool category to help you get started with the Garmin Connect MCP Server.

## Quick Navigation

### By Category

1. **[Basic Tools](./basic-tools.md)** - Direct API access examples
   - Sleep data retrieval
   - Activity queries
   - Health metrics
   - Daily overview
   - Workout creation

2. **[Aggregation Tools](./aggregation-tools.md)** - Volume aggregation examples
   - Weekly training volume
   - Monthly summaries
   - Custom date ranges
   - Training load tracking

3. **[Analytics Tools](./analytics-tools.md)** - Performance analysis examples
   - Heart rate zone distribution
   - Sport-specific progress
   - Training periodization
   - Personal records tracking

4. **[Correlation Tools](./correlation-tools.md)** - Multi-metric relationships
   - Sleep-performance correlation
   - Recovery quality assessment
   - Sleep debt analysis
   - Poor sleep impact detection

5. **[Tracking Tools](./tracking-tools.md)** - Trends and predictions
   - HRV tracking and anomaly detection
   - Training stress balance (TSB)
   - Form/freshness analysis
   - Taper planning

### By Use Case

- **Morning Routine:** [Basic Tools](./basic-tools.md#example-morning-check-in) → [Tracking Tools](./tracking-tools.md#example-daily-readiness-check)
- **Weekly Review:** [Aggregation Tools](./aggregation-tools.md#example-weekly-volume-analysis) → [Analytics Tools](./analytics-tools.md#example-weekly-intensity-analysis)
- **Race Preparation:** [Tracking Tools](./tracking-tools.md#example-race-taper-planning)
- **Recovery Monitoring:** [Correlation Tools](./correlation-tools.md#example-recovery-assessment) → [Tracking Tools](./tracking-tools.md#example-hrv-anomaly-detection)
- **Performance Analysis:** [Analytics Tools](./analytics-tools.md#example-running-progress-analysis)

## Example Format

Each example follows this structure:

```markdown
## Example: [Use Case Name]

**Scenario:** Real-world context explaining when to use this

**MCP Request:**
```json
{
  "tool": "tool_name",
  "parameters": { ... }
}
```

**Response:**
```json
{
  "content": [{ "type": "text", "text": "{ ... }" }]
}
```

**Interpretation:**
- Key insights from the response
- Actions you can take based on the data

**See also:** Links to related examples
```

## Getting Started

### For Beginners

Start with **Basic Tools** to understand the foundation:
1. [Get today's sleep data](./basic-tools.md#example-check-last-nights-sleep)
2. [View recent activities](./basic-tools.md#example-recent-activity-list)
3. [Check daily overview](./basic-tools.md#example-daily-overview)

### For Training Analysis

Progress through the categories:
1. **Basic:** Understand your raw data
2. **Aggregation:** Summarize training volume
3. **Analytics:** Analyze trends and patterns
4. **Tracking:** Monitor readiness and plan training

### For Advanced Users

Combine tools for comprehensive insights:
- Use [Form Analysis](./tracking-tools.md#example-current-form-analysis) with [Performance Correlation](./tracking-tools.md#example-form-performance-correlation)
- Combine [Sleep Correlation](./correlation-tools.md#example-sleep-performance-analysis) with [HRV Trends](./tracking-tools.md#example-hrv-trends-analysis)

## Common Patterns

### Pattern 1: Daily Check-in

```typescript
// Morning routine: readiness assessment
1. get_sleep_data (last night)
2. get_readiness_score (today)
3. get_current_form_analysis (training status)
```

**Example:** [Daily Readiness Check](./tracking-tools.md#example-daily-readiness-check)

### Pattern 2: Weekly Review

```typescript
// Sunday review: analyze past week
1. get_weekly_volume (training load)
2. get_aggregated_hr_zones (intensity distribution)
3. detect_new_prs (performance highlights)
```

**Example:** [Weekly Volume Analysis](./aggregation-tools.md#example-weekly-volume-analysis)

### Pattern 3: Race Preparation

```typescript
// Taper for race: optimize readiness
1. generate_taper_plan (structured taper)
2. get_current_form_analysis (daily tracking)
3. get_optimal_sleep_pattern (recovery optimization)
```

**Example:** [Race Taper Planning](./tracking-tools.md#example-race-taper-planning)

## Tips for Using Examples

1. **Copy and adapt:** All examples are ready to use - just update dates and parameters
2. **Check prerequisites:** Some tools require data from other tools (see [API.md Tool Dependencies](../API.md#tool-dependencies))
3. **Start simple:** Begin with Basic Tools before moving to Advanced Analytics
4. **Combine tools:** Most real-world scenarios use multiple tools together
5. **Handle errors:** All examples assume successful responses - add error handling in production

## Quick Reference

### Most Common Examples

| Use Case | Tool | Example Link |
|----------|------|-------------|
| Check last night's sleep | `get_sleep_data` | [Basic Tools](./basic-tools.md#example-check-last-nights-sleep) |
| View recent activities | `get_activities` | [Basic Tools](./basic-tools.md#example-recent-activity-list) |
| Check training readiness | `get_readiness_score` | [Tracking Tools](./tracking-tools.md#example-daily-readiness-check) |
| Analyze weekly volume | `get_weekly_volume` | [Aggregation Tools](./aggregation-tools.md#example-weekly-volume-analysis) |
| Track running progress | `get_sport_progress` | [Analytics Tools](./analytics-tools.md#example-running-progress-analysis) |
| Plan race taper | `generate_taper_plan` | [Tracking Tools](./tracking-tools.md#example-race-taper-planning) |

### Data Freshness

| Tool Category | Data Age | Sync Frequency |
|---------------|----------|----------------|
| Basic Tools | Real-time | Every request |
| Aggregation | Hours-old | Cached 1 hour |
| Analytics | Day-old | Cached 24 hours |
| Correlation | Day-old | Cached 24 hours |
| Tracking (HRV) | Real-time | Synced on request |

## Additional Resources

- **[API Reference](../API.md)** - Complete tool documentation
- **[Common Use Cases](../API.md#common-use-cases)** - Detailed workflow examples
- **[Error Handling](../API.md#error-handling)** - Troubleshooting guide

---

**Note:** All examples use ISO date format (YYYY-MM-DD) and assume successful API responses. In production, always add proper error handling.

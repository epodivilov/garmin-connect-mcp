# Correlation Tools Examples

Sleep-performance correlation examples for understanding recovery impact on training.

## Table of Contents

- [Sleep-Performance Correlation](#sleep-performance-correlation)
  - [Sleep Performance Analysis](#example-sleep-performance-analysis)
  - [Optimal Sleep Pattern](#example-optimal-sleep-pattern)
  - [Sleep Debt Tracking](#example-sleep-debt-tracking)
- [Recovery Assessment](#recovery-assessment)
  - [Recovery Quality Check](#example-recovery-quality-check)
  - [Multi-Day Recovery Tracking](#example-multi-day-recovery-tracking)
- [Poor Sleep Impact Detection](#poor-sleep-impact-detection)
  - [Identify Performance Impacts](#example-identify-performance-impacts)
  - [High-Severity Sleep Issues](#example-high-severity-sleep-issues)

---

## Sleep-Performance Correlation

### Example: Sleep Performance Analysis

**Scenario:** Analyze last 30 days to understand how sleep affects training performance.

**MCP Request:**

```json
{
  "tool": "get_sleep_performance_correlation",
  "parameters": {
    "dateRange": "2025-09-15/2025-10-15",
    "includeRecovery": true,
    "maxPoorSleepImpacts": 10
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":\"2025-09-15/2025-10-15\",\"correlations\":{\"sleepDuration\":{\"coefficient\":0.68,\"strength\":\"moderate\",\"description\":\"Moderate positive correlation: More sleep generally improves performance\"},\"deepSleep\":{\"coefficient\":0.72,\"strength\":\"strong\",\"description\":\"Strong positive correlation: Deep sleep is crucial for recovery\"},\"remSleep\":{\"coefficient\":0.45,\"strength\":\"moderate\",\"description\":\"Moderate positive correlation: REM sleep supports performance\"},\"sleepQuality\":{\"coefficient\":0.58,\"strength\":\"moderate\",\"description\":\"Moderate positive correlation: Higher quality sleep improves outcomes\"}},\"optimalPatterns\":{\"duration\":{\"min\":7.5,\"max\":8.5,\"unit\":\"hours\"},\"deepSleep\":105,\"remSleep\":95,\"qualityScore\":80},\"sleepDebt\":{\"currentDebt\":120,\"averageDebt\":65,\"maxDebt\":180,\"recoveryTimeNeeded\":2},\"poorSleepImpacts\":[{\"date\":\"2025-09-20\",\"sleepQuality\":\"poor\",\"performanceImpact\":\"moderate decline\",\"affectedMetrics\":[\"pace\",\"heart_rate\"],\"severity\":\"moderate\"},{\"date\":\"2025-10-05\",\"sleepQuality\":\"very poor\",\"performanceImpact\":\"significant decline\",\"affectedMetrics\":[\"pace\",\"heart_rate\",\"power\"],\"severity\":\"high\"}],\"trends\":{\"sleepQuality\":\"stable\",\"performanceCorrelation\":\"strengthening\"},\"insights\":[\"Deep sleep has strongest impact on performance\",\"Sleep debt accumulating - prioritize 8+ hour nights\",\"Performance declines significantly after <6.5 hours sleep\"],\"recommendations\":[\"Target 7.5-8.5 hours nightly for optimal performance\",\"Prioritize deep sleep through consistent sleep schedule\",\"Address current sleep debt (2 hours) with recovery nights\",\"Avoid hard workouts after poor sleep nights\"]}"
  }]
}
```

**Interpretation:**

- **Correlation Strengths:**
  - **Deep Sleep:** 0.72 (strongest correlation)
  - **Sleep Duration:** 0.68 (strong)
  - **Sleep Quality:** 0.58 (moderate)
  - **REM Sleep:** 0.45 (moderate)

- **Optimal Sleep Pattern:**
  - Duration: 7.5-8.5 hours
  - Deep Sleep: 105 minutes (25% of 7h sleep)
  - REM Sleep: 95 minutes (22% of 7h sleep)
  - Quality Score: 80+/100

- **Sleep Debt Status:**
  - Current: 120 minutes (2 hours)
  - Average: 65 minutes
  - Maximum reached: 180 minutes (3 hours)
  - Recovery needed: 2 nights of extra sleep

- **Poor Sleep Impacts:**
  - Sep 20: Moderate impact (pace & HR affected)
  - Oct 5: High severity (pace, HR, power all impacted)

**Actions:**
- **Priority #1:** Reduce sleep debt (currently 2 hours)
  - Add 60 min/night for 2 nights (e.g., 9h sleep)
  - Or add 30 min/night for 4 nights
- **Priority #2:** Optimize deep sleep
  - Strongest correlation (0.72) = biggest performance impact
  - Maintain consistent sleep/wake times
  - Avoid alcohol, late meals, screens before bed
- **Training Adjustment:**
  - After poor sleep nights: schedule easy workouts only
  - After optimal sleep (7.5-8.5h): safe for hard sessions
- **Trend:** Sleep-performance correlation strengthening (getting more sensitive to sleep)

**See also:**
- [Optimal Sleep Pattern](#example-optimal-sleep-pattern) for personalized targets
- [Recovery Quality Check](#example-recovery-quality-check) for training readiness

---

### Example: Optimal Sleep Pattern

**Scenario:** Identify your personal optimal sleep metrics for best performance.

**MCP Request:**

```json
{
  "tool": "get_optimal_sleep_pattern",
  "parameters": {
    "dateRange": "2025-08-01/2025-10-15"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"optimal\":{\"duration\":{\"min\":7.5,\"max\":8.5,\"unit\":\"hours\"},\"deepSleepMinutes\":110,\"remSleepMinutes\":100,\"qualityScore\":82},\"analysis\":{\"sampleSize\":45,\"confidenceLevel\":85,\"recommendations\":[\"Aim for 8 hours sleep nightly (middle of 7.5-8.5 range)\",\"Target 110+ minutes deep sleep (26% of total)\",\"Target 100+ minutes REM sleep (24% of total)\",\"Quality scores above 82 correlate with best performances\"]}}"
  }]
}
```

**Interpretation:**

- **Your Optimal Sleep (based on 45 nights):**
  - Duration: 7.5-8.5 hours (sweet spot: 8h)
  - Deep Sleep: 110 minutes (26% of 7h sleep)
  - REM Sleep: 100 minutes (24% of 7h sleep)
  - Quality Score: 82+/100

- **Confidence:** 85% (high - based on 45 sample nights)

- **Sleep Architecture Targets:**
  - Deep: 26% (optimal range: 15-25%, you need slightly more)
  - REM: 24% (optimal range: 20-25%, you're at upper end)
  - Light: 50% (remaining)

**Actions:**
- **Target:** 8 hours sleep per night
  - Minimum: 7.5h (still good performance)
  - Maximum benefit: 8.5h (beyond this, diminishing returns)
  - Below 7.5h: performance decline expected
- **Deep Sleep Focus:**
  - You need more than average (26% vs typical 15-25%)
  - Indicates high training load requiring extra recovery
  - Strategies: earlier bedtime, cooler room, consistent schedule
- **REM Sleep:**
  - 100+ minutes (24%) is high but correlates with your best performances
  - REM supports skill learning, mental recovery
- **Quality Score Benchmark:** 82+
  - Use Garmin's sleep score as guide
  - <82 = suboptimal performance next day

**See also:**
- [Sleep Performance Analysis](#example-sleep-performance-analysis) for correlation details
- [Sleep Debt Tracking](#example-sleep-debt-tracking) to monitor deficit

---

### Example: Sleep Debt Tracking

**Scenario:** Monitor accumulated sleep deficit and impact on performance.

**MCP Request:**

```json
{
  "tool": "get_sleep_debt_analysis",
  "parameters": {
    "targetDuration": 480
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"currentDebt\":150,\"averageDebt\":80,\"maxDebt\":240,\"debtHistory\":[{\"date\":\"2025-10-01\",\"debtMinutes\":60},{\"date\":\"2025-10-02\",\"debtMinutes\":90},{\"date\":\"2025-10-03\",\"debtMinutes\":120},{\"date\":\"2025-10-04\",\"debtMinutes\":150}],\"performanceImpact\":{\"correlation\":-0.62,\"description\":\"Moderate negative correlation: Accumulated debt significantly impacts performance\"},\"recoveryEstimate\":{\"daysNeeded\":3,\"targetSleepPerNight\":530}}"
  }]
}
```

**Interpretation:**

- **Sleep Debt Status:**
  - Current: 150 minutes (2.5 hours)
  - Average: 80 minutes (1h 20min)
  - Peak: 240 minutes (4 hours)
  - Trend: Increasing (60 → 150 over 4 days)

- **Debt Progression:**
  - Oct 1: 1h deficit
  - Oct 2: 1.5h deficit
  - Oct 3: 2h deficit
  - Oct 4: 2.5h deficit
  - Pattern: Accumulating 30 min/day

- **Performance Impact:**
  - Correlation: -0.62 (moderate negative)
  - Meaning: More debt = worse performance

- **Recovery Plan:**
  - Days needed: 3 nights
  - Target: 530 minutes/night (8h 50min)
  - Plan: Sleep 50 min extra for 3 nights

**Actions:**
- **Immediate Action:** Address increasing debt trend
  - Currently accumulating 30 min/day
  - At this rate, will reach critical levels (4+ hours) in 5 days
- **Recovery Protocol (3-day plan):**
  - Night 1: Sleep 8h 50min (50 min extra)
  - Night 2: Sleep 8h 50min (50 min extra)
  - Night 3: Sleep 8h 50min (50 min extra)
  - Total recovery: 150 minutes
- **Alternative (slower recovery):**
  - Sleep 9h nightly for 5 nights (30 min extra each)
- **Training Adjustment:**
  - Next 3 days: Easy workouts only
  - Avoid high-intensity until debt < 60 min

**See also:**
- [Recovery Quality Check](#example-recovery-quality-check) for readiness assessment
- [Identify Performance Impacts](#example-identify-performance-impacts) to see effects of debt

---

## Recovery Assessment

### Example: Recovery Quality Check

**Scenario:** Morning check to determine training intensity for today.

**MCP Request:**

```json
{
  "tool": "get_recovery_quality",
  "parameters": {
    "days": 7
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"recoveryScore\":82,\"readiness\":\"high\",\"recentDays\":[{\"date\":\"2025-10-19\",\"sleepQuality\":85,\"recoveryScore\":82},{\"date\":\"2025-10-18\",\"sleepQuality\":88,\"recoveryScore\":85},{\"date\":\"2025-10-17\",\"sleepQuality\":72,\"recoveryScore\":68},{\"date\":\"2025-10-16\",\"sleepQuality\":90,\"recoveryScore\":88}],\"trainingRecommendation\":{\"intensity\":\"high\",\"rationale\":\"Recovery score 82 indicates excellent readiness. Sleep quality trending upward. Safe for high-intensity or long duration training.\"},\"factors\":{\"sleepDuration\":8.2,\"sleepQuality\":85,\"consistency\":78,\"debt\":45}}"
  }]
}
```

**Interpretation:**

- **Today's Recovery (Oct 19):**
  - Score: 82/100 (high)
  - Readiness: **High**
  - Sleep Quality: 85/100
  - Sleep Duration: 8.2 hours

- **Recent Pattern (7 days):**
  - Oct 16: Score 88 (excellent)
  - Oct 17: Score 68 (moderate dip)
  - Oct 18: Score 85 (recovered)
  - Oct 19: Score 82 (good)
  - Trend: Stable after brief dip

- **Recovery Factors:**
  - Sleep Duration: 8.2h (optimal)
  - Sleep Quality: 85/100 (very good)
  - Consistency: 78% (good)
  - Sleep Debt: 45 min (low)

**Actions:**
- **Today's Training:** High intensity approved
  - Recovery score 82+ = green light for hard workouts
  - Examples: intervals, tempo run, long ride
  - Confidence: High (multiple factors aligned)
- **What enabled high readiness:**
  - Adequate sleep duration (8.2h)
  - High sleep quality (85)
  - Low sleep debt (45 min)
  - Consistent sleep pattern (78%)
- **Comparison:**
  - Oct 17 (score 68): Should have trained easy
  - Oct 19 (score 82): Safe for hard session

**See also:**
- [Daily Readiness Check](./tracking-tools.md#example-daily-readiness-check) for comprehensive readiness
- [Multi-Day Recovery Tracking](#example-multi-day-recovery-tracking) for extended view

---

### Example: Multi-Day Recovery Tracking

**Scenario:** Review 14-day recovery pattern to identify trends.

**MCP Request:**

```json
{
  "tool": "get_recovery_quality",
  "parameters": {
    "date": "2025-10-15",
    "days": 14
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-15\",\"recoveryScore\":75,\"readiness\":\"moderate\",\"recentDays\":[{\"date\":\"2025-10-15\",\"sleepQuality\":78,\"recoveryScore\":75},{\"date\":\"2025-10-14\",\"sleepQuality\":82,\"recoveryScore\":80},{\"date\":\"2025-10-13\",\"sleepQuality\":68,\"recoveryScore\":65},{\"date\":\"2025-10-12\",\"sleepQuality\":85,\"recoveryScore\":83},{\"date\":\"2025-10-11\",\"sleepQuality\":72,\"recoveryScore\":70},{\"date\":\"2025-10-10\",\"sleepQuality\":88,\"recoveryScore\":86},{\"date\":\"2025-10-09\",\"sleepQuality\":65,\"recoveryScore\":62},{\"date\":\"2025-10-08\",\"sleepQuality\":90,\"recoveryScore\":88},{\"date\":\"2025-10-07\",\"sleepQuality\":75,\"recoveryScore\":73},{\"date\":\"2025-10-06\",\"sleepQuality\":80,\"recoveryScore\":78}],\"trainingRecommendation\":{\"intensity\":\"moderate\",\"rationale\":\"Recovery score 75 suggests moderate readiness. Recent variability in sleep quality indicates inconsistent recovery. Recommend moderate-intensity training with caution.\"},\"factors\":{\"sleepDuration\":7.6,\"sleepQuality\":78,\"consistency\":62,\"debt\":85}}"
  }]
}
```

**Interpretation:**

- **14-Day Recovery Pattern:**
  - High variability: 62-88 (26-point range)
  - Good days: Oct 8 (88), Oct 10 (86), Oct 12 (83)
  - Poor days: Oct 9 (62), Oct 13 (65)
  - Current (Oct 15): 75 (moderate)

- **Pattern Analysis:**
  - Wave-like pattern: high → low → high → low
  - Suggests inadequate recovery between hard efforts
  - Consistency score low (62%) confirms irregular pattern

- **Current Factors:**
  - Sleep Duration: 7.6h (slightly low)
  - Sleep Quality: 78/100 (moderate)
  - Consistency: 62% (poor)
  - Sleep Debt: 85 minutes (elevated)

**Actions:**
- **Issue Identified:** Inconsistent recovery pattern
  - Possible causes:
    1. Hard workouts not spaced adequately
    2. Irregular sleep schedule (62% consistency)
    3. Accumulating sleep debt (85 min)
- **Improvement Plan:**
  - **Fix #1:** Improve sleep consistency
    - Set fixed bedtime/wake time (even weekends)
    - Target: 80%+ consistency
  - **Fix #2:** Reduce sleep debt
    - Current: 85 min
    - Add 30 min/night for 3 nights
  - **Fix #3:** Better workout spacing
    - After low-recovery days (62-65): easy training only
    - After high-recovery days (83+): hard workouts OK
    - Don't force hard workouts on poor recovery
- **Training This Week:**
  - Today (75): Moderate intensity OK
  - Monitor daily recovery scores
  - Adjust plan based on daily readiness

**See also:**
- [Sleep Performance Analysis](#example-sleep-performance-analysis) for correlation details
- [Form History](./tracking-tools.md#example-form-history) for training load pattern

---

## Poor Sleep Impact Detection

### Example: Identify Performance Impacts

**Scenario:** Find instances where poor sleep clearly hurt next-day performance.

**MCP Request:**

```json
{
  "tool": "detect_poor_sleep_impacts",
  "parameters": {
    "minSeverity": "moderate"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"impacts\":[{\"sleepDate\":\"2025-10-03\",\"performanceDate\":\"2025-10-04\",\"sleepMetrics\":{\"duration\":5.5,\"quality\":58,\"deepSleep\":45},\"performanceMetrics\":{\"affected\":[\"pace\",\"heart_rate\"],\"decline\":12},\"severity\":\"moderate\",\"description\":\"5.5h sleep (58 quality) resulted in 12% performance decline in next day's run\"},{\"sleepDate\":\"2025-10-10\",\"performanceDate\":\"2025-10-11\",\"sleepMetrics\":{\"duration\":6.0,\"quality\":62,\"deepSleep\":52},\"performanceMetrics\":{\"affected\":[\"pace\",\"heart_rate\",\"power\"],\"decline\":18},\"severity\":\"high\",\"description\":\"6h sleep (62 quality) resulted in 18% performance decline across multiple metrics\"}],\"summary\":{\"totalImpacts\":2,\"bySeverity\":{\"high\":1,\"moderate\":1,\"low\":0}}}"
  }]
}
```

**Interpretation:**

- **Impact #1 (Moderate):**
  - Sleep Night: Oct 3
    - Duration: 5.5 hours (2.5h below optimal)
    - Quality: 58/100 (poor)
    - Deep Sleep: 45 min (low)
  - Performance Day: Oct 4
    - Affected: Pace, Heart Rate
    - Decline: 12%
    - Severity: Moderate

- **Impact #2 (High):**
  - Sleep Night: Oct 10
    - Duration: 6 hours (2h below optimal)
    - Quality: 62/100 (poor)
    - Deep Sleep: 52 min (low)
  - Performance Day: Oct 11
    - Affected: Pace, HR, Power
    - Decline: 18%
    - Severity: High

**Actions:**
- **Pattern Recognition:**
  - <6h sleep consistently causes performance decline
  - Impact severity increases with sleep deficit:
    - 5.5h → 12% decline (moderate)
    - 6.0h → 18% decline (high)
  - Multiple metrics affected = more severe impact
- **Preventive Strategy:**
  - Minimum sleep: 7 hours (to avoid performance impact)
  - Optimal: 7.5-8.5 hours
  - If <6h sleep unavoidable:
    - Schedule easy training only next day
    - Expect 10-20% performance decline
    - Prioritize recovery that night
- **Training Adjustment After Poor Sleep:**
  - Cancel hard workouts
  - Replace with easy aerobic or rest
  - Use as active recovery day

**See also:**
- [High-Severity Sleep Issues](#example-high-severity-sleep-issues) for critical impacts
- [Sleep Debt Tracking](#example-sleep-debt-tracking) for cumulative effects

---

### Example: High-Severity Sleep Issues

**Scenario:** Identify only critical sleep-performance impacts requiring immediate attention.

**MCP Request:**

```json
{
  "tool": "detect_poor_sleep_impacts",
  "parameters": {
    "dateRange": "2025-09-01/2025-10-15",
    "minSeverity": "high",
    "maxImpacts": 5
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"impacts\":[{\"sleepDate\":\"2025-09-12\",\"performanceDate\":\"2025-09-13\",\"sleepMetrics\":{\"duration\":4.5,\"quality\":45,\"deepSleep\":30},\"performanceMetrics\":{\"affected\":[\"pace\",\"heart_rate\",\"power\",\"hrv\"],\"decline\":25},\"severity\":\"high\",\"description\":\"Critical: 4.5h sleep (45 quality) caused 25% performance decline across all metrics\"},{\"sleepDate\":\"2025-10-10\",\"performanceDate\":\"2025-10-11\",\"sleepMetrics\":{\"duration\":6.0,\"quality\":62,\"deepSleep\":52},\"performanceMetrics\":{\"affected\":[\"pace\",\"heart_rate\",\"power\"],\"decline\":18},\"severity\":\"high\",\"description\":\"6h sleep (62 quality) resulted in 18% performance decline across multiple metrics\"}],\"summary\":{\"totalImpacts\":2,\"bySeverity\":{\"high\":2,\"moderate\":0,\"low\":0}}}"
  }]
}
```

**Interpretation:**

- **Critical Impact #1 (Sep 12-13):**
  - Sleep: 4.5 hours (3.5h deficit!)
  - Quality: 45/100 (very poor)
  - Deep Sleep: 30 min (extremely low)
  - Performance Decline: 25% (severe)
  - All metrics affected: pace, HR, power, HRV

- **Critical Impact #2 (Oct 10-11):**
  - Sleep: 6 hours (2h deficit)
  - Quality: 62/100 (poor)
  - Deep Sleep: 52 min (low)
  - Performance Decline: 18% (significant)
  - Multiple metrics affected

**Actions:**
- **Red Flag #1:** Sep 12 (4.5h sleep)
  - **Critical level:** <5h sleep
  - 25% performance decline = training session wasted
  - Should have been rest day or canceled
  - Root cause analysis: Why 4.5h? (travel, stress, schedule)
- **Red Flag #2:** Oct 10 (6h sleep)
  - Still causes high-severity impact
  - Confirms individual need for 7.5-8h minimum
- **Prevention Protocol:**
  - **Mandatory rest if:** <5h sleep
  - **Easy training only if:** 5-6.5h sleep
  - **Moderate intensity OK if:** 6.5-7.5h sleep
  - **High intensity safe if:** 7.5+ hours
- **Immediate Action:**
  - Review calendar for patterns (travel, work stress)
  - Set sleep alerts if <6h projected
  - Plan recovery protocol after poor sleep nights

**See also:**
- [Sleep Performance Analysis](#example-sleep-performance-analysis) for overall correlation
- [Recovery Quality Check](#example-recovery-quality-check) for daily readiness

---

## Quick Reference

### Correlation Tools Overview

| Tool | Primary Use | Key Metric | Action Threshold |
|------|-------------|------------|------------------|
| `get_sleep_performance_correlation` | Overall relationship | Correlation coefficient | <0.5 = weak link |
| `get_optimal_sleep_pattern` | Personal targets | Duration range | Use as benchmark |
| `get_sleep_debt_analysis` | Deficit tracking | Current debt (min) | >120 min = recovery needed |
| `get_recovery_quality` | Daily readiness | Recovery score (0-100) | <70 = easy training |
| `detect_poor_sleep_impacts` | Issue identification | Severity level | High = modify training |

### Sleep Quality Benchmarks

| Metric | Optimal | Acceptable | Poor | Critical |
|--------|---------|------------|------|----------|
| Duration | 7.5-8.5h | 7-9h | 6-7h | <6h |
| Quality Score | 80+ | 70-80 | 60-70 | <60 |
| Deep Sleep % | 20-25% | 15-30% | 10-15% | <10% |
| Sleep Debt | <60 min | 60-120 min | 120-180 min | >180 min |

### Performance Impact Severity

| Severity | Sleep Duration | Quality Score | Performance Decline | Training Recommendation |
|----------|----------------|---------------|---------------------|------------------------|
| Low | 7-7.5h | 70-80 | <5% | All intensities OK |
| Moderate | 6-7h | 60-70 | 5-15% | Easy to moderate only |
| High | 5-6h | 50-60 | 15-25% | Easy or rest |
| Critical | <5h | <50 | >25% | Mandatory rest |

---

[← Back to Analytics Tools](./analytics-tools.md) | [Home](./README.md) | [Next: Tracking Tools →](./tracking-tools.md)

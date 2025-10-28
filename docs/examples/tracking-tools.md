# Tracking Tools Examples

HRV tracking, training stress balance (TSB), form/freshness analysis, and taper planning examples.

## Table of Contents

- [HRV Tools](#hrv-tools)
  - [HRV Trends Analysis](#example-hrv-trends-analysis)
  - [Daily Readiness Check](#example-daily-readiness-check)
  - [HRV Baseline Calculation](#example-hrv-baseline-calculation)
  - [HRV Anomaly Detection](#example-hrv-anomaly-detection)
- [Training Stress Tools](#training-stress-tools)
  - [Training Stress Balance](#example-training-stress-balance)
  - [TSS Time Series](#example-tss-time-series)
- [Form/Freshness Tools](#formfreshness-tools)
  - [Current Form Analysis](#example-current-form-analysis)
  - [Form History Tracking](#example-form-history)
  - [Future Form Prediction](#example-future-form-prediction)
  - [Race Taper Planning](#example-race-taper-planning)
  - [Form-Performance Correlation](#example-form-performance-correlation)

---

## HRV Tools

### Example: HRV Trends Analysis

**Scenario:** Check 30-day HRV trends to assess recovery status.

**MCP Request:**

```json
{
  "tool": "get_hrv_trends",
  "parameters": {
    "syncFromGarmin": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":{\"start\":\"2025-09-19\",\"end\":\"2025-10-19\"},\"current\":{\"value\":68,\"date\":\"2025-10-19\",\"deviationFromBaseline\":2.5},\"trends\":{\"weekly\":{\"average\":67,\"change\":3.2,\"trend\":\"increasing\"},\"monthly\":{\"average\":65,\"change\":5.8,\"trend\":\"increasing\"}},\"dataPoints\":[{\"date\":\"2025-10-19\",\"value\":68,\"quality\":92},{\"date\":\"2025-10-18\",\"value\":66,\"quality\":88},{\"date\":\"2025-10-17\",\"value\":58,\"quality\":85}],\"analysis\":{\"status\":\"good\",\"recommendation\":\"HRV trending upward indicates improving recovery. Current value above baseline suggests good readiness for training.\"}}"
  }]
}
```

**Interpretation:**

- **Current HRV (Oct 19):**
  - Value: 68 ms
  - Baseline: 66.3 ms (calculated from 30-day median)
  - Deviation: +2.5% above baseline (good sign)

- **Trends:**
  - **Weekly:** 67 ms average, +3.2% vs previous week (improving)
  - **Monthly:** 65 ms average, +5.8% vs previous month (improving)
  - **Direction:** Increasing (positive adaptation)

- **Recent Pattern:**
  - Oct 19: 68 ms (high)
  - Oct 18: 66 ms (near baseline)
  - Oct 17: 58 ms (low - possible hard training day)

- **Status:** Good (improving recovery, above baseline)

**Actions:**
- **Positive Trend:** +5.8% monthly increase = excellent adaptation
  - Training load is appropriate
  - Recovery is adequate
  - Fitness improving
- **Today's Status:** 68 ms (above baseline)
  - Safe for high-intensity training
  - Body well-recovered
  - No signs of overtraining
- **Oct 17 Dip:** 58 ms (-12% below baseline)
  - Normal after hard workout or poor sleep
  - Recovered within 2 days (good resilience)
- **Continue Current Approach:** Training/recovery balance working well

**See also:**
- [Daily Readiness Check](#example-daily-readiness-check) for comprehensive assessment
- [HRV Anomaly Detection](#example-hrv-anomaly-detection) for warning signs

---

### Example: Daily Readiness Check

**Scenario:** Morning routine to determine if today is suitable for hard training.

**MCP Request:**

```json
{
  "tool": "get_readiness_score",
  "parameters": {
    "syncFromGarmin": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"readinessScore\":82,\"readinessLevel\":\"high\",\"components\":{\"hrv\":{\"value\":68,\"score\":85,\"status\":\"above baseline\"},\"sleep\":{\"duration\":8.2,\"quality\":85,\"score\":88},\"tsb\":{\"value\":5,\"score\":75,\"status\":\"productive training zone\"},\"restingHR\":{\"value\":52,\"score\":82,\"deviation\":-2},\"bodyBattery\":{\"value\":88,\"score\":88}},\"trainingRecommendation\":{\"intensity\":\"high\",\"rationale\":\"All readiness indicators are strong. HRV above baseline, sleep quality excellent, TSB in productive zone, resting HR below average. Ideal day for high-intensity or long-duration training.\",\"warnings\":[]},\"factors\":{\"positive\":[\"HRV 2.5% above baseline\",\"Sleep quality 85/100\",\"Resting HR 2 bpm below average\",\"Body Battery fully charged (88)\"],\"negative\":[]}}"
  }]
}
```

**Interpretation:**

- **Readiness Score: 82/100 (High)**
  - Level: **High readiness** for training
  - Recommendation: High-intensity or long-duration OK

- **Component Breakdown:**
  - **HRV:** 68 ms, score 85/100 (above baseline +2.5%)
  - **Sleep:** 8.2h duration, 85 quality, score 88/100 (excellent)
  - **TSB:** +5, score 75/100 (productive training zone)
  - **Resting HR:** 52 bpm, score 82/100 (2 bpm below average)
  - **Body Battery:** 88/100 (fully charged)

- **Positive Factors:**
  - All 5 components show green signals
  - No negative factors present
  - Multiple indicators of excellent recovery

**Actions:**
- **Today's Training:** High intensity approved
  - Examples: intervals, tempo run, hill repeats, long ride
  - Confidence level: Very high (82 score, all components positive)
- **What Makes Today Ideal:**
  - HRV above baseline (good autonomic recovery)
  - 8+ hours quality sleep (physical recovery)
  - TSB +5 (balanced fitness/fatigue)
  - Low resting HR (cardiovascular recovery)
  - High body battery (energy reserves)
- **Contrast with Low Readiness Day:**
  - Low readiness (<60): easy training or rest
  - Moderate readiness (60-75): moderate intensity only
  - High readiness (75+): all intensities safe

**See also:**
- [HRV Trends Analysis](#example-hrv-trends-analysis) for HRV context
- [Current Form Analysis](#example-current-form-analysis) for TSB details
- [Recovery Quality](./correlation-tools.md#example-recovery-quality-check) for sleep assessment

---

### Example: HRV Baseline Calculation

**Scenario:** Calculate your personal HRV baseline for reference.

**MCP Request:**

```json
{
  "tool": "get_hrv_baseline",
  "parameters": {
    "days": 28,
    "syncFromGarmin": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"baseline\":{\"median\":66,\"mean\":65.5,\"stdDev\":8.2,\"confidenceInterval\":{\"lower\":62,\"upper\":70}},\"weeklyPattern\":{\"monday\":{\"average\":64,\"sampleSize\":4},\"tuesday\":{\"average\":68,\"sampleSize\":4},\"wednesday\":{\"average\":62,\"sampleSize\":4},\"thursday\":{\"average\":67,\"sampleSize\":4},\"friday\":{\"average\":70,\"sampleSize\":4},\"saturday\":{\"average\":65,\"sampleSize\":4},\"sunday\":{\"average\":63,\"sampleSize\":4}},\"evolution\":{\"firstWeek\":62,\"lastWeek\":68,\"trend\":\"improving\"},\"dataQuality\":{\"totalMeasurements\":28,\"validMeasurements\":28,\"coverage\":100}}"
  }]
}
```

**Interpretation:**

- **28-Day Baseline:**
  - Median: 66 ms (most representative value)
  - Mean: 65.5 ms (average)
  - Std Dev: 8.2 ms (typical variation)
  - Confidence Interval: 62-70 ms (95% of values fall here)

- **Weekly Pattern:**
  - Highest: Friday (70 ms) - best recovery mid-week
  - Lowest: Wednesday (62 ms) - accumulated fatigue
  - Pattern suggests hard training Mon-Wed, recovery Thu-Fri

- **Evolution:**
  - First week: 62 ms
  - Last week: 68 ms
  - Trend: **Improving** (+9.7%)
  - Good adaptation to training

- **Data Quality:** 100% coverage (excellent)

**Actions:**
- **Use Baseline as Reference:** 66 ms
  - Above 70 ms (+6%): Excellent recovery
  - 62-70 ms (±6%): Normal range
  - Below 62 ms (-6%): Reduced recovery, caution advised
  - Below 58 ms (-12%): Significant fatigue, easy training
- **Weekly Pattern Recognition:**
  - Friday HRV highest (70 ms) = best day for hard workout
  - Wednesday lowest (62 ms) = accumulated fatigue, schedule rest or easy day
  - Use pattern to optimize training schedule
- **Improving Trend:** +9.7% over 4 weeks
  - Current training load is appropriate
  - Body adapting well
  - Safe to maintain or slightly increase volume

**See also:**
- [HRV Trends Analysis](#example-hrv-trends-analysis) for daily tracking
- [HRV Anomaly Detection](#example-hrv-anomaly-detection) for deviation alerts

---

### Example: HRV Anomaly Detection

**Scenario:** Check for warning signs of overtraining or illness.

**MCP Request:**

```json
{
  "tool": "get_hrv_anomalies",
  "parameters": {
    "days": 7,
    "syncFromGarmin": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"anomalies\":[{\"date\":\"2025-10-17\",\"value\":58,\"baseline\":66,\"deviation\":-12.1,\"severity\":\"moderate\",\"velocity\":-8,\"consecutiveDaysLow\":1,\"estimatedRecoveryDays\":2,\"possibleCauses\":[\"Hard training session\",\"Insufficient sleep\",\"Travel or stress\"],\"recommendations\":[\"Reduce training intensity for 1-2 days\",\"Prioritize sleep (8+ hours)\",\"Monitor HRV for recovery trend\"]}],\"summary\":{\"totalAnomalies\":1,\"bySeverity\":{\"critical\":0,\"high\":0,\"moderate\":1,\"low\":0},\"currentStatus\":\"caution\"}}"
  }]
}
```

**Interpretation:**

- **Anomaly Detected (Oct 17):**
  - HRV: 58 ms
  - Baseline: 66 ms
  - Deviation: -12.1% (moderate severity)
  - Velocity: -8 ms/day (rapid drop)
  - Duration: 1 day (single occurrence)
  - Recovery estimate: 2 days

- **Severity Assessment:**
  - Moderate (not critical, but noteworthy)
  - Single day occurrence (not chronic)
  - Velocity -8 suggests sudden stress (not gradual decline)

- **Possible Causes:**
  - Hard training session (most likely)
  - Insufficient sleep
  - Travel/stress

- **Current Status:** Caution (monitor closely)

**Actions:**
- **Immediate Response (Oct 17-18):**
  - Day 1-2: Easy training only
  - Prioritize 8+ hours sleep
  - Monitor HRV for recovery
- **Recovery Validation:**
  - Oct 18: Check if HRV rebounds toward baseline
  - Oct 19: Should be back to 62-66 ms range
  - If still low after 2 days: consider rest day
- **Pattern Analysis:**
  - Single-day anomaly (not concerning if isolated)
  - Rapid velocity (-8 ms/day) suggests acute stress (workout, poor sleep)
  - If becomes multi-day pattern: overtraining warning
- **When to Worry:**
  - **Moderate concern:** 2-3 consecutive days below baseline
  - **High concern:** 4+ consecutive days, or deviation >20%
  - **Critical:** Multiple high/critical severity anomalies

**See also:**
- [HRV Trends Analysis](#example-hrv-trends-analysis) for broader context
- [Daily Readiness Check](#example-daily-readiness-check) for recovery status

---

## Training Stress Tools

### Example: Training Stress Balance

**Scenario:** Check current training stress to assess fitness vs fatigue balance.

**MCP Request:**

```json
{
  "tool": "get_training_stress_balance",
  "parameters": {
    "days": 90,
    "includeTimeSeries": false
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"metrics\":{\"tsb\":5,\"ctl\":65,\"atl\":60},\"interpretation\":{\"form\":\"productive-training\",\"description\":\"TSB of +5 indicates productive training zone. Fitness (CTL 65) is slightly higher than fatigue (ATL 60), allowing for quality training while managing fatigue.\",\"trainingRecommendation\":\"Good balance for consistent training. Safe for moderate to high intensity workouts. Monitor for signs of excessive fatigue.\"},\"analysis\":{\"fitnessLevel\":\"moderate\",\"fatigueLevel\":\"moderate\",\"readiness\":\"training-ready\"}}"
  }]
}
```

**Interpretation:**

- **Training Stress Metrics:**
  - **TSB:** +5 (Training Stress Balance)
  - **CTL:** 65 (Chronic Training Load - fitness)
  - **ATL:** 60 (Acute Training Load - fatigue)
  - Formula: TSB = CTL - ATL = 65 - 60 = 5

- **Form Status:** Productive Training Zone
  - TSB range: -10 to +5
  - Optimal for consistent training
  - Balanced fitness and fatigue

- **Fitness/Fatigue Analysis:**
  - Fitness (CTL 65): Moderate level
  - Fatigue (ATL 60): Moderate level
  - Readiness: **Training-ready**

**Actions:**
- **Current Status Interpretation:**
  - TSB +5 = Sweet spot for training
  - Not too fresh (would be wasteful)
  - Not too fatigued (would impair performance)
  - Can absorb quality training load
- **Training Recommendations:**
  - Safe for moderate-to-high intensity
  - Can handle 3-4 quality sessions per week
  - Include recovery days to prevent ATL spike
- **TSB Zones Reference:**
  - **>+15:** Very fresh (race-ready, detraining risk)
  - **0 to +15:** Fresh (good for racing)
  - **-10 to 0:** Productive training (current zone)
  - **-20 to -10:** Fatigued (reduce load soon)
  - **<-20:** Overreached (recovery required)

**See also:**
- [TSS Time Series](#example-tss-time-series) for daily progression
- [Current Form Analysis](#example-current-form-analysis) for detailed form tracking

---

### Example: TSS Time Series

**Scenario:** View daily TSS/CTL/ATL/TSB progression to understand training load pattern.

**MCP Request:**

```json
{
  "tool": "get_training_stress_balance",
  "parameters": {
    "days": 30,
    "includeTimeSeries": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"metrics\":{\"tsb\":5,\"ctl\":65,\"atl\":60},\"interpretation\":{\"form\":\"productive-training\",\"description\":\"TSB of +5 indicates productive training zone.\",\"trainingRecommendation\":\"Good balance for consistent training.\"},\"timeSeries\":[{\"date\":\"2025-09-20\",\"tss\":120,\"ctl\":58,\"atl\":68,\"tsb\":-10},{\"date\":\"2025-09-27\",\"tss\":85,\"ctl\":60,\"atl\":65,\"tsb\":-5},{\"date\":\"2025-10-04\",\"tss\":100,\"ctl\":62,\"atl\":62,\"tsb\":0},{\"date\":\"2025-10-11\",\"tss\":95,\"ctl\":64,\"atl\":61,\"tsb\":3},{\"date\":\"2025-10-18\",\"tss\":90,\"ctl\":65,\"atl\":60,\"tsb\":5}],\"analysis\":{\"fitnessLevel\":\"moderate\",\"fatigueLevel\":\"moderate\",\"readiness\":\"training-ready\"}}"
  }]
}
```

**Interpretation:**

- **30-Day Progression:**
  - **Sep 20:** TSB -10 (fatigued), CTL 58, ATL 68
  - **Sep 27:** TSB -5 (recovering), CTL 60, ATL 65
  - **Oct 4:** TSB 0 (balanced), CTL 62, ATL 62
  - **Oct 11:** TSB +3 (productive), CTL 64, ATL 61
  - **Oct 18:** TSB +5 (productive), CTL 65, ATL 60

- **Trend Analysis:**
  - CTL rising: 58 → 65 (+12% fitness gain)
  - ATL falling: 68 → 60 (-12% fatigue reduction)
  - TSB improving: -10 → +5 (+15 points)
  - Pattern: Recovery from overreaching

**Actions:**
- **Story of Last 30 Days:**
  - Started fatigued (TSB -10) from previous training block
  - Gradual recovery with moderate training load
  - Fitness maintained/improved (CTL 58 → 65)
  - Fatigue dissipated (ATL 68 → 60)
  - Now in optimal training zone (TSB +5)
- **Training Load Pattern:**
  - TSS ranged 85-120 per week (moderate consistency)
  - No extreme spikes (good load management)
  - Steady progression allowing adaptation
- **Next Steps:**
  - Current trajectory excellent
  - Can maintain TSB 0-5 for quality training
  - Avoid pushing TSB below -10 (fatigue accumulation)

**See also:**
- [Training Stress Balance](#example-training-stress-balance) for current status
- [Form History Tracking](#example-form-history) for extended view

---

## Form/Freshness Tools

### Example: Current Form Analysis

**Scenario:** Get comprehensive form assessment with trends and recommendations.

**MCP Request:**

```json
{
  "tool": "get_current_form_analysis",
  "parameters": {
    "includeTimeSeries": true,
    "includePredictions": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"date\":\"2025-10-19\",\"currentForm\":{\"tsb\":5,\"ctl\":65,\"atl\":60,\"zone\":\"productive-training\",\"zoneDescription\":\"Balanced fitness and fatigue, optimal for quality training\"},\"trends\":{\"tsbTrend\":\"increasing\",\"ctlTrend\":\"increasing\",\"direction\":\"building-fitness\"},\"recommendations\":{\"trainingIntensity\":\"moderate\",\"rationale\":\"Current form supports moderate to high intensity training. TSB trending upward indicates improving freshness while maintaining fitness gains.\",\"nextSteps\":[\"Continue current training approach\",\"Monitor for signs of overreaching (TSB <-10)\",\"Plan recovery week when CTL plateaus\"],\"warnings\":[]},\"timeSeries\":[{\"date\":\"2025-10-15\",\"tsb\":0,\"ctl\":62,\"atl\":62,\"zone\":\"productive-training\"},{\"date\":\"2025-10-19\",\"tsb\":5,\"ctl\":65,\"atl\":60,\"zone\":\"productive-training\"}],\"predictions\":[{\"date\":\"2025-10-26\",\"predictedTSB\":8,\"predictedZone\":\"fresh\"},{\"date\":\"2025-11-02\",\"predictedTSB\":10,\"predictedZone\":\"fresh\"}]}"
  }]
}
```

**Interpretation:**

- **Current Form (Oct 19):**
  - TSB: +5 (productive training)
  - CTL: 65 (fitness level)
  - ATL: 60 (fatigue level)
  - Zone: **Productive Training**

- **Trends:**
  - TSB: Increasing (getting fresher)
  - CTL: Increasing (fitness building)
  - Direction: **Building Fitness** (ideal phase)

- **Predictions (assuming current load):**
  - Oct 26 (1 week): TSB +8 (fresh zone)
  - Nov 2 (2 weeks): TSB +10 (fresh zone)

- **Recommendations:**
  - Intensity: Moderate to high OK
  - Continue current approach
  - Monitor for overreaching (TSB <-10)

**Actions:**
- **Optimal Current State:**
  - Building fitness (CTL increasing)
  - Managing fatigue (ATL stable/decreasing)
  - In productive training zone (TSB 0-5)
  - No warnings or concerns
- **Interpretation of Trends:**
  - "Building Fitness" direction confirms training effectiveness
  - TSB increasing = not accumulating excessive fatigue
  - CTL increasing = fitness gains
  - Perfect balance for sustained improvement
- **Prediction Analysis:**
  - Trend toward freshness (TSB → +10)
  - May indicate reduced training load or adaptation
  - Consider if taper is intentional or unintentional
  - If not tapering: increase training load to maintain TSB 0-5

**See also:**
- [Form History Tracking](#example-form-history) for historical patterns
- [Future Form Prediction](#example-future-form-prediction) for custom scenarios

---

### Example: Form History Tracking

**Scenario:** Review 90-day form history to identify training patterns.

**MCP Request:**

```json
{
  "tool": "get_form_history",
  "parameters": {
    "days": 90
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":{\"start\":\"2025-07-21\",\"end\":\"2025-10-19\"},\"history\":[{\"date\":\"2025-07-21\",\"tsb\":-15,\"ctl\":58,\"atl\":73,\"zone\":\"fatigued\",\"tss\":95},{\"date\":\"2025-08-04\",\"tsb\":-8,\"ctl\":60,\"atl\":68,\"zone\":\"productive-training\",\"tss\":100},{\"date\":\"2025-08-18\",\"tsb\":0,\"ctl\":62,\"atl\":62,\"zone\":\"productive-training\",\"tss\":90},{\"date\":\"2025-09-01\",\"tsb\":-12,\"ctl\":64,\"atl\":76,\"zone\":\"fatigued\",\"tss\":115},{\"date\":\"2025-09-15\",\"tsb\":-5,\"ctl\":66,\"atl\":71,\"zone\":\"productive-training\",\"tss\":95},{\"date\":\"2025-09-29\",\"tsb\":3,\"ctl\":67,\"atl\":64,\"zone\":\"productive-training\",\"tss\":85},{\"date\":\"2025-10-13\",\"tsb\":10,\"ctl\":68,\"atl\":58,\"zone\":\"fresh\",\"tss\":50},{\"date\":\"2025-10-19\",\"tsb\":5,\"ctl\":65,\"atl\":60,\"zone\":\"productive-training\",\"tss\":90}],\"zoneDistribution\":{\"productive-training\":{\"days\":52,\"percentage\":57.8},\"fatigued\":{\"days\":22,\"percentage\":24.4},\"fresh\":{\"days\":12,\"percentage\":13.3},\"optimal-race\":{\"days\":4,\"percentage\":4.4}},\"patterns\":{\"averageTSB\":0.2,\"peakCTL\":68,\"trainingConsistency\":82}}"
  }]
}
```

**Interpretation:**

- **90-Day Pattern:**
  - Jul 21: TSB -15 (fatigued) - coming off hard training block
  - Aug 4-18: Recovery to TSB 0 (productive)
  - Sep 1: TSB -12 (fatigued again) - another hard block
  - Sep 15-29: Recovery to TSB +3 (productive)
  - Oct 13: TSB +10 (fresh) - taper or reduced load
  - Oct 19: TSB +5 (productive) - current state

- **Zone Distribution:**
  - Productive Training: 57.8% (52 days) - **majority**
  - Fatigued: 24.4% (22 days)
  - Fresh: 13.3% (12 days)
  - Optimal Race: 4.4% (4 days)

- **Overall Patterns:**
  - Average TSB: +0.2 (balanced)
  - Peak CTL: 68 (current fitness level)
  - Consistency: 82% (good)

**Actions:**
- **Training Cycle Identified:**
  - 3-week build → 1-week recovery (repeating pattern)
  - Build phases push to TSB -12 to -15
  - Recovery phases bring back to TSB 0-5
  - This is undulating periodization (wave-like)
- **Zone Distribution Analysis:**
  - 58% productive training = excellent (target 50-60%)
  - 24% fatigued = acceptable (target <30%)
  - 13% fresh = reasonable (some taper periods)
  - 4% race-ready = indicates 2-3 race days
- **Fitness Progression:**
  - CTL grew from 58 → 68 (+17% over 90 days)
  - Solid fitness gains
  - Managed through fatigue cycles
- **Pattern Sustainability:**
  - 82% consistency indicates reliable training
  - Balance between stress and recovery appropriate
  - Can continue this pattern indefinitely

**See also:**
- [Current Form Analysis](#example-current-form-analysis) for today's status
- [Race Taper Planning](#example-race-taper-planning) for race preparation

---

### Example: Future Form Prediction

**Scenario:** Plan next 2 weeks of training to reach TSB +15 for race.

**MCP Request:**

```json
{
  "tool": "predict_future_form",
  "parameters": {
    "targetDate": "2025-11-02",
    "plannedTSS": 80,
    "recoveryDays": [0, 6]
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"targetDate\":\"2025-11-02\",\"prediction\":{\"tsb\":12,\"ctl\":66,\"atl\":54,\"zone\":\"fresh\",\"zoneDescription\":\"Fresh and rested, good for racing\"},\"dailyPlan\":[{\"date\":\"2025-10-20\",\"plannedTSS\":80,\"predictedTSB\":4,\"predictedCTL\":65,\"predictedATL\":61,\"zone\":\"productive-training\"},{\"date\":\"2025-10-21\",\"plannedTSS\":80,\"predictedTSB\":3,\"predictedCTL\":66,\"predictedATL\":63,\"zone\":\"productive-training\"},{\"date\":\"2025-10-26\",\"plannedTSS\":0,\"predictedTSB\":8,\"predictedCTL\":66,\"predictedATL\":58,\"zone\":\"fresh\"},{\"date\":\"2025-11-02\",\"plannedTSS\":0,\"predictedTSS\":12,\"predictedCTL\":66,\"predictedATL\":54,\"zone\":\"fresh\"}],\"analysis\":{\"fitnessGain\":1,\"fatigueProjection\":\"decreasing\",\"raceReadiness\":\"good\",\"warnings\":[\"TSB slightly below target +15 for optimal race performance\"]}}"
  }]
}
```

**Interpretation:**

- **Target Race Day (Nov 2):**
  - Predicted TSB: +12
  - Predicted CTL: 66 (fitness maintained)
  - Predicted ATL: 54 (low fatigue)
  - Zone: Fresh (good for racing)

- **Daily Progression:**
  - Oct 20-21: 80 TSS (moderate training), TSB 3-4
  - Oct 26: Rest day (recovery day 0 = Sunday), TSB 8
  - Nov 2: Rest day (recovery day 6 = Saturday), TSB 12

- **Analysis:**
  - Fitness: +1 point (minimal change, maintaining)
  - Fatigue: Decreasing (ATL 60 → 54)
  - Race Readiness: Good
  - Warning: TSB +12 vs target +15 (slightly below optimal)

**Actions:**
- **Prediction Assessment:**
  - TSB +12 is good for racing (target +15-20 ideal)
  - Close enough for good performance
  - To reach TSB +15:
    - Reduce planned TSS to 70 (instead of 80)
    - Or add one more rest day mid-week
- **Training Plan (Oct 20 - Nov 2):**
  - Week 1: 6 days @ 80 TSS + 1 rest (Sunday)
  - Week 2: 5 days @ 80 TSS + 2 rest (Wed + Sat)
  - Race Sunday (Nov 2)
- **Fitness Maintenance:**
  - CTL stays at 66 (no fitness loss during taper)
  - This is ideal - maintaining fitness while shedding fatigue
- **Adjustment Options:**
  - Current plan: TSB +12 (good)
  - For TSB +15: Reduce TSS to 70/day
  - For TSB +18: Reduce TSS to 60/day (more aggressive taper)

**See also:**
- [Race Taper Planning](#example-race-taper-planning) for structured taper
- [Current Form Analysis](#example-current-form-analysis) for starting point

---

### Example: Race Taper Planning

**Scenario:** Generate 14-day taper plan for marathon with target TSB +20.

**MCP Request:**

```json
{
  "tool": "generate_taper_plan",
  "parameters": {
    "raceDate": "2025-11-10",
    "taperDuration": 14,
    "targetTSB": 20,
    "strategy": "exponential",
    "maintainIntensity": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"raceDate\":\"2025-11-10\",\"taperPlan\":[{\"date\":\"2025-10-28\",\"plannedTSS\":100,\"volumeReduction\":0,\"predictedTSB\":2,\"predictedCTL\":66,\"predictedATL\":64,\"zone\":\"productive-training\",\"workoutType\":\"maintenance\",\"notes\":\"Begin taper - maintain intensity, reduce volume slightly\"},{\"date\":\"2025-10-31\",\"plannedTSS\":75,\"volumeReduction\":25,\"predictedTSB\":6,\"predictedCTL\":66,\"predictedATL\":60,\"zone\":\"productive-training\",\"workoutType\":\"sharpener\",\"notes\":\"Include short intervals to maintain speed\"},{\"date\":\"2025-11-04\",\"plannedTSS\":50,\"volumeReduction\":50,\"predictedTSB\":12,\"predictedCTL\":65,\"predictedATL\":53,\"zone\":\"fresh\",\"workoutType\":\"sharpener\",\"notes\":\"Final quality session - short and sharp\"},{\"date\":\"2025-11-07\",\"plannedTSS\":30,\"volumeReduction\":70,\"predictedTSB\":17,\"predictedCTL\":64,\"predictedATL\":47,\"zone\":\"fresh\",\"workoutType\":\"recovery\",\"notes\":\"Easy aerobic only\"},{\"date\":\"2025-11-09\",\"plannedTSS\":15,\"volumeReduction\":85,\"predictedTSB\":20,\"predictedCTL\":63,\"predictedATL\":43,\"zone\":\"optimal-race\",\"workoutType\":\"rest\",\"notes\":\"Shakeout run or complete rest\"},{\"date\":\"2025-11-10\",\"plannedTSS\":0,\"volumeReduction\":100,\"predictedTSB\":21,\"predictedCTL\":63,\"predictedATL\":42,\"zone\":\"optimal-race\",\"workoutType\":\"race\",\"notes\":\"RACE DAY\"}],\"projectedRaceDay\":{\"tsb\":21,\"ctl\":63,\"atl\":42,\"zone\":\"optimal-race\",\"readiness\":\"Excellent - optimal freshness for marathon performance\"},\"strategy\":{\"type\":\"exponential\",\"volumeReduction\":85,\"intensityMaintained\":true},\"recommendations\":[\"Follow planned TSS targets to hit race-day TSB +20\",\"Maintain workout intensity but drastically reduce duration\",\"Prioritize sleep (8+ hours) throughout taper\",\"Avoid new activities or excessive cross-training\"],\"warnings\":[]}"
  }]
}
```

**Interpretation:**

- **14-Day Taper Structure (Exponential):**
  - Week 1 (Oct 28-Nov 3):
    - Start: 100 TSS (baseline)
    - Mid: 75 TSS (-25% volume)
    - End: 50 TSS (-50% volume)
  - Week 2 (Nov 4-10):
    - Nov 4: 50 TSS (-50%)
    - Nov 7: 30 TSS (-70%)
    - Nov 9: 15 TSS (-85%)
    - Nov 10: Race day (0 TSS)

- **TSB Progression:**
  - Start (Oct 28): TSB +2 (productive training)
  - Week 1: TSB +6 (getting fresher)
  - Week 2 start: TSB +12 (fresh)
  - Race week: TSB +17-20 (optimal race)
  - **Race Day: TSB +21** (perfect!)

- **Fitness (CTL) Management:**
  - Start: 66
  - Race day: 63 (-4.5%)
  - Minimal fitness loss (excellent)

- **Workout Types:**
  - Oct 28-31: Maintenance (keep body primed)
  - Nov 4: Sharpener (short, fast intervals)
  - Nov 7-9: Recovery/rest (dissipate fatigue)
  - Nov 10: Race

**Actions:**
- **Execute Taper Plan:**
  - Follow TSS targets exactly (100 → 75 → 50 → 30 → 15)
  - Maintain intensity (keep running at race pace for short bursts)
  - Reduce volume progressively (exponential curve)
- **Week 1 (Oct 28 - Nov 3):**
  - Mon-Wed: Normal training but 25% shorter
  - Thu: Include 4x800m @ race pace (sharpener)
  - Fri-Sun: Easy running
- **Week 2 (Nov 4-10):**
  - Mon: Last quality session (6x400m @ 5K pace)
  - Tue-Wed: Easy 30-40 min jogs
  - Thu-Fri: Easy 20-30 min jogs
  - Sat: 15 min shakeout or complete rest
  - Sun: **RACE**
- **Non-Negotiables:**
  - Sleep 8+ hours every night
  - No new foods or activities
  - Stay off feet when not training
  - Trust the taper (resist urge to "get in one more workout")

**See also:**
- [Current Form Analysis](#example-current-form-analysis) to verify starting point
- [Future Form Prediction](#example-future-form-prediction) to model scenarios

---

### Example: Form-Performance Correlation

**Scenario:** Analyze which TSB range produces best race performances.

**MCP Request:**

```json
{
  "tool": "analyze_form_performance",
  "parameters": {
    "dateRange": "2025-01-01/2025-10-15"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":{\"start\":\"2025-01-01\",\"end\":\"2025-10-15\"},\"correlation\":{\"coefficient\":0.74,\"strength\":\"strong\",\"description\":\"Strong positive correlation: Higher TSB (fresher state) significantly improves race performance\"},\"optimalTSB\":{\"range\":{\"min\":15,\"max\":25},\"median\":20,\"confidenceLevel\":88},\"performanceByZone\":{\"optimal-race\":{\"avgPerformance\":102,\"sampleSize\":4,\"bestResults\":3},\"fresh\":{\"avgPerformance\":98,\"sampleSize\":6,\"bestResults\":2},\"productive-training\":{\"avgPerformance\":92,\"sampleSize\":8,\"bestResults\":1},\"fatigued\":{\"avgPerformance\":85,\"sampleSize\":3,\"bestResults\":0}},\"insights\":[\"Best performances occur at TSB 15-25 (optimal race zone)\",\"Performance declines significantly when racing while fatigued (TSB <0)\",\"Sweet spot: TSB around 20 for peak marathon performance\",\"Adequate taper (2+ weeks) consistently produces better results\"],\"recommendations\":[\"Target TSB 18-22 for marathon races\",\"Allow minimum 10-14 days taper to reach optimal TSB\",\"Avoid racing when TSB <10 (predictably poor outcomes)\",\"Consider longer taper (3 weeks) for goal races\"]}"
  }]
}
```

**Interpretation:**

- **Correlation Analysis:**
  - Coefficient: 0.74 (strong positive)
  - Meaning: Higher TSB → Better performance
  - Strength: Strong relationship

- **Optimal TSB Range:**
  - Range: TSB 15-25
  - Median: TSB 20 (sweet spot)
  - Confidence: 88% (high)

- **Performance by Zone:**
  - **Optimal Race (TSB >15):** 102% performance, 3/4 best results
  - **Fresh (TSB 5-15):** 98% performance, 2/6 best results
  - **Productive (TSB -10 to 5):** 92% performance, 1/8 best results
  - **Fatigued (TSB <-10):** 85% performance, 0/3 best results

- **Sample Sizes:**
  - 21 total performances analyzed
  - 4 races in optimal zone
  - Adequate data for conclusions

**Actions:**
- **Race Preparation Strategy:**
  - **Target TSB:** 18-22 for goal marathons
  - **Minimum TSB:** 15 (acceptable performance)
  - **Avoid racing if:** TSB <10 (poor outcomes guaranteed)
- **Taper Duration:**
  - Goal races: 3 weeks taper (reach TSB 20-25)
  - B-races: 10-14 days taper (reach TSB 15-18)
  - Training races: 5-7 days rest (reach TSB 10-12, sub-optimal but learning experience)
- **Performance Expectations:**
  - TSB 20-25: 100-105% of baseline (PR potential)
  - TSB 15-20: 95-100% (solid performance)
  - TSB 10-15: 90-95% (acceptable)
  - TSB <10: <90% (not recommended for goal races)
- **Personal Insight:**
  - Your data shows strong TSB sensitivity (0.74 correlation)
  - Some athletes less affected (correlation 0.4-0.6)
  - Yours is high = taper is critical for you

**See also:**
- [Race Taper Planning](#example-race-taper-planning) to reach optimal TSB
- [Current Form Analysis](#example-current-form-analysis) to check starting point

---

## Quick Reference

### Tracking Tools Overview

| Tool Category | Primary Metric | Action Threshold | Check Frequency |
|---------------|----------------|------------------|-----------------|
| HRV Tools | HRV (ms) | <-10% baseline = caution | Daily (morning) |
| Readiness Score | Score (0-100) | <70 = easy training | Daily (morning) |
| Training Stress | TSB | <-20 = recovery needed | Weekly |
| Form/Freshness | TSB + trends | TSB <-10 = reduce load | Weekly |

### TSB Interpretation Guide

| TSB Range | Zone | Meaning | Training Recommendation |
|-----------|------|---------|------------------------|
| >+15 | Optimal Race | Very fresh, race-ready | Race or reduce volume |
| 0 to +15 | Fresh | Rested, good recovery | All intensities OK |
| -10 to 0 | Productive Training | Balanced stress/recovery | Quality training OK |
| -20 to -10 | Fatigued | High fatigue | Easy training, recovery soon |
| <-20 | Overreached | Excessive fatigue | Immediate recovery required |

### HRV Deviation Interpretation

| Deviation | Meaning | Action |
|-----------|---------|--------|
| >+10% | Excellent recovery | High-intensity OK |
| +5% to +10% | Good recovery | All training OK |
| -5% to +5% | Normal baseline | Normal training |
| -5% to -10% | Slight fatigue | Moderate training |
| -10% to -20% | Moderate fatigue | Easy training only |
| <-20% | Significant fatigue | Rest or very easy |

### Readiness Score Interpretation

| Score | Level | Training Intensity | Examples |
|-------|-------|-------------------|----------|
| 80-100 | High | All intensities | Intervals, tempo, long runs |
| 60-79 | Moderate | Easy to moderate | Easy runs, bike, moderate sessions |
| 40-59 | Low | Easy only | Easy aerobic, recovery pace |
| <40 | Very Low | Rest recommended | Rest day or very light activity |

---

[← Back to Correlation Tools](./correlation-tools.md) | [Home](./README.md)

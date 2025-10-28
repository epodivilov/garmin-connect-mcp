# Analytics Tools Examples

Performance analysis examples for HR zones, sport progress, periodization, and personal records.

## Table of Contents

- [HR Zone Tools](#hr-zone-tools)
  - [Single Activity HR Zones](#example-single-activity-hr-zones)
  - [Weekly Intensity Analysis](#example-weekly-intensity-analysis)
  - [Polarized Training Check](#example-polarized-training-check)
- [Sport Progress Tools](#sport-progress-tools)
  - [Running Progress Analysis](#example-running-progress-analysis)
  - [Cycling Power Trends](#example-cycling-power-trends)
  - [Training Efficiency Analysis](#example-training-efficiency-analysis)
- [Periodization Tools](#periodization-tools)
  - [Periodization Analysis](#example-periodization-analysis)
  - [Training Phase Effectiveness](#example-training-phase-effectiveness)
- [Personal Records Tools](#personal-records-tools)
  - [Current Personal Records](#example-current-personal-records)
  - [5K PR Progression](#example-5k-pr-progression)
  - [Detect New PRs](#example-detect-new-prs)
  - [Manage Custom Categories](#example-manage-custom-categories)

---

## HR Zone Tools

### Example: Single Activity HR Zones

**Scenario:** Analyze intensity distribution for yesterday's interval workout.

**MCP Request:**

```json
{
  "tool": "get_activity_hr_zones",
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
    "text": "{\"activityId\":12345678901,\"activityName\":\"5x1000m Intervals\",\"activityType\":\"running\",\"duration\":2700,\"zoneDistribution\":[{\"zone\":1,\"timeSeconds\":600,\"percentage\":22.2,\"hrRange\":{\"min\":0,\"max\":111}},{\"zone\":2,\"timeSeconds\":540,\"percentage\":20.0,\"hrRange\":{\"min\":111,\"max\":130}},{\"zone\":3,\"timeSeconds\":360,\"percentage\":13.3,\"hrRange\":{\"min\":130,\"max\":148}},{\"zone\":4,\"timeSeconds\":900,\"percentage\":33.3,\"hrRange\":{\"min\":148,\"max\":167}},{\"zone\":5,\"timeSeconds\":300,\"percentage\":11.1,\"hrRange\":{\"min\":167,\"max\":185}}],\"summary\":{\"totalTimeInZones\":2700,\"averageHR\":152,\"maxHR\":178,\"dominantZone\":4},\"visualization\":{\"labels\":[\"Z1\",\"Z2\",\"Z3\",\"Z4\",\"Z5\"],\"values\":[22.2,20.0,13.3,33.3,11.1],\"colors\":[\"#4A90E2\",\"#50C878\",\"#F5A623\",\"#FF6B6B\",\"#9B59B6\"]}}"
  }]
}
```

**Interpretation:**

- **Activity:** 5x1000m Intervals, 45 min duration
- **Zone Distribution:**
  - Zone 1 (Recovery): 10 min (22.2%) - warmup/cooldown
  - Zone 2 (Endurance): 9 min (20.0%) - easy portions
  - Zone 3 (Tempo): 6 min (13.3%) - transition
  - Zone 4 (Threshold): 15 min (33.3%) - **intervals**
  - Zone 5 (Max): 5 min (11.1%) - peak efforts
- **Summary:**
  - Average HR: 152 bpm
  - Max HR: 178 bpm
  - Dominant Zone: 4 (threshold work)

**Actions:**
- **Good workout execution:** 33% in Zone 4 (threshold) is ideal for interval session
- Zone 5 time (11%) suggests some intervals pushed to max - may indicate:
  - Good fitness (hitting high intensities)
  - Or pacing issue (should be threshold, not max)
- 22% Zone 1 confirms adequate warmup/cooldown
- Visualization data ready for charting

**See also:**
- [Weekly Intensity Analysis](#example-weekly-intensity-analysis) for weekly distribution
- [Training Efficiency Analysis](#example-training-efficiency-analysis) for pace/HR relationship

---

### Example: Weekly Intensity Analysis

**Scenario:** Check if this week followed 80/20 polarized training principle.

**MCP Request:**

```json
{
  "tool": "get_aggregated_hr_zones",
  "parameters": {
    "periodType": "weekly",
    "year": 2025,
    "week": 42,
    "includeActivityBreakdown": true,
    "includeVisualization": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"period\":{\"type\":\"weekly\",\"startDate\":\"2025-10-13\",\"endDate\":\"2025-10-19\"},\"zoneDistribution\":[{\"zone\":1,\"totalTimeSeconds\":10800,\"percentage\":75.0},{\"zone\":2,\"totalTimeSeconds\":1440,\"percentage\":10.0},{\"zone\":3,\"totalTimeSeconds\":720,\"percentage\":5.0},{\"zone\":4,\"totalTimeSeconds\":1080,\"percentage\":7.5},{\"zone\":5,\"totalTimeSeconds\":360,\"percentage\":2.5}],\"byActivityType\":{\"running\":{\"zoneDistribution\":[{\"zone\":1,\"totalTimeSeconds\":4320,\"percentage\":60.0},{\"zone\":4,\"totalTimeSeconds\":1080,\"percentage\":15.0},{\"zone\":5,\"totalTimeSeconds\":360,\"percentage\":5.0}]},\"cycling\":{\"zoneDistribution\":[{\"zone\":1,\"totalTimeSeconds\":6480,\"percentage\":85.0}]}},\"summary\":{\"totalActivities\":7,\"totalTimeInZones\":14400,\"averageHR\":138,\"dominantZone\":1,\"polarizationIndex\":77.5},\"visualization\":{\"labels\":[\"Z1\",\"Z2\",\"Z3\",\"Z4\",\"Z5\"],\"values\":[75.0,10.0,5.0,7.5,2.5],\"colors\":[\"#4A90E2\",\"#50C878\",\"#F5A623\",\"#FF6B6B\",\"#9B59B6\"]}}"
  }]
}
```

**Interpretation:**

- **Weekly Distribution (Week 42):**
  - Zone 1: 75.0% (3h) - **easy aerobic**
  - Zone 2: 10.0% (24 min) - moderate
  - Zone 3: 5.0% (12 min) - tempo
  - Zone 4: 7.5% (18 min) - threshold
  - Zone 5: 2.5% (6 min) - max effort

- **Polarization Index:** 77.5% (Zone 1 + Zone 5)
  - Target: 80% for polarized training
  - Current: 77.5% (close to target)

- **By Sport:**
  - Running: 60% Zone 1, 20% Zone 4-5 (more intensity)
  - Cycling: 85% Zone 1 (pure endurance)

**Actions:**
- **Nearly optimal polarization:** 77.5% easy/hard vs 80% target
- **Issue:** 15% in Zones 2-3 (the "grey zone")
  - These moderate intensities are less effective
  - Should be either easy (Z1) or hard (Z4-5)
- **Adjustment:** Push Zone 2-3 runs either easier (Z1) or harder (Z4)
- Running has good intensity mix; cycling is perfect endurance base

**See also:**
- [Polarized Training Check](#example-polarized-training-check) for 80/20 rule validation
- [Running Progress Analysis](#example-running-progress-analysis) for pace development

---

### Example: Polarized Training Check

**Scenario:** Verify adherence to 80/20 training rule over the past month.

**MCP Request:**

```json
{
  "tool": "get_aggregated_hr_zones",
  "parameters": {
    "periodType": "monthly",
    "year": 2025,
    "month": 10,
    "includeActivityBreakdown": false,
    "includeVisualization": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"period\":{\"type\":\"monthly\",\"startDate\":\"2025-10-01\",\"endDate\":\"2025-10-31\"},\"zoneDistribution\":[{\"zone\":1,\"totalTimeSeconds\":72000,\"percentage\":71.4},{\"zone\":2,\"totalTimeSeconds\":12000,\"percentage\":11.9},{\"zone\":3,\"totalTimeSeconds\":8400,\"percentage\":8.3},{\"zone\":4,\"totalTimeSeconds\":6600,\"percentage\":6.5},{\"zone\":5,\"totalTimeSeconds\":2000,\"percentage\":2.0}],\"summary\":{\"totalActivities\":28,\"totalTimeInZones\":100800,\"averageHR\":140,\"dominantZone\":1,\"polarizationIndex\":73.4}}"
  }]
}
```

**Interpretation:**

- **Monthly Distribution (October):**
  - Easy (Z1): 71.4% (20h)
  - Moderate (Z2-3): 20.2% (5.7h)
  - Hard (Z4-5): 8.5% (2.4h)

- **Polarization Index:** 73.4% (Z1 + Z5)
  - **Warning:** Below 80% target
  - Too much time in moderate zones (20%)

- **80/20 Rule Assessment:**
  - Should be: 80% easy, 20% hard
  - Actually: 71.4% easy, 8.5% hard, 20.2% moderate
  - **Problem:** Excessive moderate-intensity training

**Actions:**
- **Issue Identified:** 20% in "no man's land" (Z2-3)
  - This creates fatigue without strong training stimulus
  - Classic mistake: running "medium-hard" instead of easy/hard
- **Fix:**
  - Make easy runs EASIER (slow down to stay in Z1)
  - Make hard workouts HARDER (push to Z4-5)
  - Eliminate Z2-3 runs entirely
- **Target Next Month:**
  - Z1: 80% (22.4h)
  - Z2-3: <5% (1.4h)
  - Z4-5: 15-20% (4.2-5.6h)

**See also:**
- [Training Efficiency Analysis](#example-training-efficiency-analysis) to optimize intensity
- [Periodization Analysis](#example-periodization-analysis) for phase-appropriate intensity

---

## Sport Progress Tools

### Example: Running Progress Analysis

**Scenario:** Analyze 12-week marathon training cycle to track pace improvement.

**MCP Request:**

```json
{
  "tool": "get_sport_progress",
  "parameters": {
    "dateRange": "2025-08-01/2025-10-25",
    "sport": "running",
    "includeEfficiency": true,
    "minDuration": 1200
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"sport\":\"running\",\"dateRange\":\"2025-08-01/2025-10-25\",\"analysis\":{\"pace\":{\"trend\":\"improving\",\"averagePace\":5.2,\"bestPace\":4.15,\"improvement\":8.5},\"efficiency\":{\"byZone\":[{\"zone\":1,\"avgPace\":5.8,\"efficiency\":92},{\"zone\":2,\"avgPace\":5.4,\"efficiency\":85},{\"zone\":3,\"avgPace\":5.0,\"efficiency\":78},{\"zone\":4,\"avgPace\":4.5,\"efficiency\":72},{\"zone\":5,\"avgPace\":4.1,\"efficiency\":65}],\"recommendations\":[\"Zone 1 pace is efficient - continue building aerobic base\",\"Zone 4 efficiency could improve - work on threshold runs\",\"Zone 5 efforts show strong top-end speed\"]}},\"activities\":36}"
  }]
}
```

**Interpretation:**

- **Pace Trends (12 weeks):**
  - Average pace: 5:12 min/km (across all runs)
  - Best pace: 4:09 min/km (fastest run)
  - Improvement: 8.5% faster over 12 weeks
  - Trend: **Improving** (getting faster)

- **Efficiency by Zone:**
  - Zone 1 (5:48/km): 92% efficient - **excellent**
  - Zone 2 (5:24/km): 85% efficient - good
  - Zone 3 (5:00/km): 78% efficient - moderate
  - Zone 4 (4:30/km): 72% efficient - needs work
  - Zone 5 (4:06/km): 65% efficient - expected (max effort)

- **Activities Analyzed:** 36 runs (20+ minutes each)

**Actions:**
- **Strong Progress:** 8.5% improvement in 12 weeks is excellent
- **Aerobic Base:** Zone 1 efficiency at 92% indicates well-developed aerobic system
- **Area for Improvement:** Zone 4 efficiency at 72%
  - Threshold pace is challenging relative to HR
  - Add more threshold runs (4:30/km pace)
- **Race Pace Prediction:**
  - Marathon pace: ~5:00-5:15/km (based on Z2-3 efficiency)
  - Half marathon pace: ~4:30-4:45/km (threshold)

**See also:**
- [5K PR Progression](#example-5k-pr-progression) for race time tracking
- [Training Efficiency Analysis](#example-training-efficiency-analysis) for detailed efficiency

---

### Example: Cycling Power Trends

**Scenario:** Track cycling power development over summer training season.

**MCP Request:**

```json
{
  "tool": "get_power_trends",
  "parameters": {
    "dateRange": "2025-06-01/2025-09-30",
    "sport": "cycling",
    "weight": 72,
    "minDuration": 1800
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"sport\":\"cycling\",\"dateRange\":\"2025-06-01/2025-09-30\",\"analysis\":{\"power\":{\"trend\":\"improving\",\"averagePower\":185,\"normalizedPower\":205,\"powerToWeight\":2.85}},\"activities\":24}"
  }]
}
```

**Interpretation:**

- **Power Metrics (4 months):**
  - Average Power: 185W
  - Normalized Power: 205W (accounting for variability)
  - Power-to-Weight: 2.85 W/kg
  - Trend: **Improving**

- **Cyclist Category (Power-to-Weight):**
  - 2.85 W/kg = Recreational to Cat 4 level
  - Cat 3: 3.0-3.5 W/kg
  - Cat 2: 3.5-4.0 W/kg

**Actions:**
- Power improving over summer training
- 2.85 W/kg is solid for amateur cyclist
- To reach Cat 3 level (3.0+ W/kg):
  - Increase FTP by ~5% (185W → 195W)
  - Or reduce weight by 5% (72kg → 68kg)
- Normalized Power 11% higher than average suggests variable efforts
  - Consider more steady-state training for FTP development

**See also:**
- [Weekly Volume Analysis](./aggregation-tools.md#example-weekly-volume-analysis) for training load

---

### Example: Training Efficiency Analysis

**Scenario:** Identify optimal HR zones for best pace output.

**MCP Request:**

```json
{
  "tool": "get_efficiency_metrics",
  "parameters": {
    "dateRange": "2025-09-01/2025-10-15",
    "sport": "running",
    "minDuration": 1200
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":\"2025-09-01/2025-10-15\",\"sport\":\"running\",\"efficiency\":{\"byZone\":[{\"zone\":1,\"avgPace\":5.9,\"efficiency\":90},{\"zone\":2,\"avgPace\":5.5,\"efficiency\":82},{\"zone\":3,\"avgPace\":5.1,\"efficiency\":75},{\"zone\":4,\"avgPace\":4.6,\"efficiency\":68}],\"recommendations\":[\"Zone 1 shows excellent aerobic efficiency\",\"Zone 2 efficiency declining - avoid grey zone training\",\"Focus on Zone 1 (easy) and Zone 4 (threshold) for best results\"]},\"activities\":18}"
  }]
}
```

**Interpretation:**

- **Efficiency Analysis:**
  - Zone 1: 5:54/km @ 90% efficiency (very good)
  - Zone 2: 5:30/km @ 82% efficiency (moderate)
  - Zone 3: 5:06/km @ 75% efficiency (declining)
  - Zone 4: 4:36/km @ 68% efficiency (challenging)

- **Efficiency Drop Pattern:**
  - Zone 1 → 2: -8% efficiency (small drop)
  - Zone 2 → 3: -7% efficiency (moderate drop)
  - Zone 3 → 4: -7% efficiency (expected)

**Actions:**
- **Optimal Training Zones:** Z1 (90% efficient) and Z4 (68% but expected)
- **Avoid:** Zone 2-3 (moderate intensity)
  - 82-75% efficiency = too hard for aerobic, too easy for threshold
  - Classic "junk miles" - creates fatigue without strong stimulus
- **Training Plan:**
  - 80% of runs in Zone 1 (5:54/km or slower)
  - 20% of runs in Zone 4+ (4:36/km or faster)
  - Eliminate Zone 2-3 runs

**See also:**
- [Polarized Training Check](#example-polarized-training-check) for 80/20 validation
- [Running Progress Analysis](#example-running-progress-analysis) for pace trends

---

## Periodization Tools

### Example: Periodization Analysis

**Scenario:** Evaluate 16-week training block to assess periodization effectiveness.

**MCP Request:**

```json
{
  "tool": "get_periodization_analysis",
  "parameters": {
    "dateRange": "2025-07-01/2025-10-25",
    "includeRecommendations": true,
    "includeWarnings": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":\"2025-07-01/2025-10-25\",\"detectedModel\":\"linear\",\"phases\":[{\"type\":\"base\",\"startDate\":\"2025-07-01\",\"endDate\":\"2025-08-04\",\"weeks\":5,\"volumeChange\":15,\"intensityChange\":5,\"effectiveness\":78},{\"type\":\"build\",\"startDate\":\"2025-08-05\",\"endDate\":\"2025-09-15\",\"weeks\":6,\"volumeChange\":20,\"intensityChange\":25,\"effectiveness\":85},{\"type\":\"peak\",\"startDate\":\"2025-09-16\",\"endDate\":\"2025-10-13\",\"weeks\":4,\"volumeChange\":10,\"intensityChange\":15,\"effectiveness\":72},{\"type\":\"taper\",\"startDate\":\"2025-10-14\",\"endDate\":\"2025-10-25\",\"weeks\":1.7,\"volumeChange\":-40,\"intensityChange\":-20,\"effectiveness\":90}],\"analysis\":{\"overallEffectiveness\":81,\"phaseBalance\":\"good\",\"recommendations\":[\"Base phase could be extended to 6-8 weeks for better aerobic development\",\"Peak phase effectiveness lower - consider reducing volume slightly\",\"Taper is well-executed with appropriate volume reduction\"],\"warnings\":[\"Build phase showed 20% volume increase - monitor recovery closely\",\"Peak phase may have accumulated excessive fatigue\"]}}"
  }]
}
```

**Interpretation:**

- **Detected Model:** Linear periodization (progressive volume/intensity increase)
- **Overall Effectiveness:** 81/100 (good)

- **Phase Breakdown:**
  1. **Base (5 weeks):** Effectiveness 78/100
     - Volume +15%, Intensity +5%
     - Built aerobic foundation
  2. **Build (6 weeks):** Effectiveness 85/100
     - Volume +20%, Intensity +25%
     - Strong fitness gains
  3. **Peak (4 weeks):** Effectiveness 72/100
     - Volume +10%, Intensity +15%
     - Lower effectiveness (possible overreaching)
  4. **Taper (1.7 weeks):** Effectiveness 90/100
     - Volume -40%, Intensity -20%
     - Optimal taper execution

**Actions:**
- **Good Overall Structure:** 81% effectiveness is solid
- **Issue 1:** Base phase too short (5 weeks)
  - Recommendation: 6-8 weeks for better aerobic foundation
  - Rushed into build phase
- **Issue 2:** Peak phase effectiveness low (72%)
  - Accumulated fatigue from aggressive build
  - Warning: 20% volume increase during build may have been excessive
- **Success:** Taper well-executed (90% effectiveness)
  - 40% volume reduction is appropriate
  - Race readiness optimized

**See also:**
- [Form/Freshness Analysis](./tracking-tools.md#example-current-form-analysis) to monitor fatigue
- [Weekly Volume Trends](./aggregation-tools.md#example-weekly-trends-comparison) for phase transitions

---

### Example: Training Phase Effectiveness

**Scenario:** Check if current training phase aligns with goals.

**MCP Request:**

```json
{
  "tool": "get_periodization_analysis",
  "parameters": {
    "dateRange": "2025-08-01/2025-10-15",
    "targetModel": "polarized",
    "minPhaseWeeks": 3
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"dateRange\":\"2025-08-01/2025-10-15\",\"detectedModel\":\"undulating\",\"phases\":[{\"type\":\"build\",\"startDate\":\"2025-08-01\",\"endDate\":\"2025-09-10\",\"weeks\":6,\"volumeChange\":18,\"intensityChange\":22,\"effectiveness\":82},{\"type\":\"recovery\",\"startDate\":\"2025-09-11\",\"endDate\":\"2025-09-24\",\"weeks\":2,\"volumeChange\":-30,\"intensityChange\":-25,\"effectiveness\":88},{\"type\":\"build\",\"startDate\":\"2025-09-25\",\"endDate\":\"2025-10-15\",\"weeks\":3,\"volumeChange\":15,\"intensityChange\":20,\"effectiveness\":79}],\"analysis\":{\"overallEffectiveness\":83,\"phaseBalance\":\"good\",\"recommendations\":[\"Detected undulating model differs from target polarized model\",\"Consider more consistent intensity distribution for true polarized training\",\"Recovery weeks are well-timed and effective\"],\"warnings\":[]}}"
  }]
}
```

**Interpretation:**

- **Target Model:** Polarized (80/20 intensity distribution)
- **Detected Model:** Undulating (alternating build/recovery weeks)
- **Mismatch:** Training doesn't follow polarized approach

- **Phase Pattern:**
  - 6 weeks build → 2 weeks recovery → 3 weeks build
  - Undulating (wave-like) periodization

**Actions:**
- **Model Mismatch:**
  - Planned: Polarized (consistent 80/20 intensity split)
  - Actual: Undulating (alternating hard/easy weeks)
- **Not necessarily bad:** Undulating can be effective (83% overall)
- **To achieve polarized training:**
  - Maintain 80% Zone 1, 20% Zone 4-5 *every week*
  - Avoid intensity fluctuations week-to-week
  - Current approach varies intensity by week (not polarized)
- **Choice:** Either commit to polarized OR embrace undulating model

**See also:**
- [Polarized Training Check](#example-polarized-training-check) for intensity distribution
- [Weekly Intensity Analysis](#example-weekly-intensity-analysis) for weekly patterns

---

## Personal Records Tools

### Example: Current Personal Records

**Scenario:** View all running PRs to identify strengths and weaknesses.

**MCP Request:**

```json
{
  "tool": "get_personal_records",
  "parameters": {
    "sport": "running",
    "includeSummary": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"personalRecords\":[{\"categoryId\":\"5K\",\"categoryName\":\"5 Kilometers\",\"categoryType\":\"distance\",\"sport\":\"running\",\"value\":1230,\"formattedValue\":\"20:30\",\"activityId\":12345678901,\"activityDate\":\"2025-09-15\",\"quality\":88,\"achievements\":[\"Sub-21 minute 5K\"]},{\"categoryId\":\"10K\",\"categoryName\":\"10 Kilometers\",\"categoryType\":\"distance\",\"sport\":\"running\",\"value\":2640,\"formattedValue\":\"44:00\",\"activityId\":12345678902,\"activityDate\":\"2025-08-20\",\"quality\":85},{\"categoryId\":\"half_marathon\",\"categoryName\":\"Half Marathon\",\"categoryType\":\"distance\",\"sport\":\"running\",\"value\":5520,\"formattedValue\":\"1:32:00\",\"activityId\":12345678903,\"activityDate\":\"2025-07-10\",\"quality\":80}],\"summary\":{\"totalPRs\":3,\"bySport\":{\"running\":3},\"byCategory\":{\"5K\":1,\"10K\":1,\"half_marathon\":1},\"recentPRs\":1}}"
  }]
}
```

**Interpretation:**

- **Current PRs:**
  - **5K:** 20:30 (4:06 min/km) - Quality 88/100
  - **10K:** 44:00 (4:24 min/km) - Quality 85/100
  - **Half Marathon:** 1:32:00 (4:22 min/km) - Quality 80/100

- **Pace Analysis:**
  - 5K pace: 4:06/km (fastest)
  - 10K pace: 4:24/km (18 sec/km slower)
  - HM pace: 4:22/km (16 sec/km slower than 5K)

- **Pacing Assessment:**
  - 5K → 10K: 18 sec/km drop (expected ~20-25 sec)
  - 5K → HM: 16 sec/km drop (expected ~30-40 sec)
  - **Finding:** Half marathon pace too fast relative to 5K (endurance issue)

**Actions:**
- **Strength:** 5K time (20:30) is solid
- **Weakness:** Half marathon endurance
  - HM pace should be ~4:36-4:46/km based on 5K (not 4:22)
  - Current HM time likely unsustainable or course-aided
- **Training Focus:**
  - Add more long runs to build half marathon-specific endurance
  - Target sustainable HM pace: 4:40/km (1:38:00 finish)
- **Recent Activity:** 1 new PR in last 30 days (5K)

**See also:**
- [5K PR Progression](#example-5k-pr-progression) for improvement tracking
- [Detect New PRs](#example-detect-new-prs) to scan for recent achievements

---

### Example: 5K PR Progression

**Scenario:** Track 5K improvement over the past year.

**MCP Request:**

```json
{
  "tool": "get_pr_history",
  "parameters": {
    "categoryId": "5K",
    "sport": "running",
    "includeProgression": true
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"category\":{\"id\":\"5K\",\"name\":\"5 Kilometers\",\"type\":\"distance\"},\"history\":[{\"value\":1350,\"formattedValue\":\"22:30\",\"activityId\":11111111111,\"date\":\"2024-11-01\",\"improvement\":null},{\"value\":1290,\"formattedValue\":\"21:30\",\"activityId\":22222222222,\"date\":\"2025-03-15\",\"improvement\":4.4},{\"value\":1260,\"formattedValue\":\"21:00\",\"activityId\":33333333333,\"date\":\"2025-06-20\",\"improvement\":2.3},{\"value\":1230,\"formattedValue\":\"20:30\",\"activityId\":44444444444,\"date\":\"2025-09-15\",\"improvement\":2.4}],\"progression\":{\"totalImprovement\":8.9,\"trend\":\"improving\",\"averageImprovement\":3.0,\"milestones\":[{\"date\":\"2025-03-15\",\"achievement\":\"Broke 22:00 barrier\"},{\"date\":\"2025-09-15\",\"achievement\":\"Sub-21 minute 5K\"}]}}"
  }]
}
```

**Interpretation:**

- **PR History (4 improvements):**
  1. Nov 2024: 22:30 (baseline)
  2. Mar 2025: 21:30 (-4.4%)
  3. Jun 2025: 21:00 (-2.3%)
  4. Sep 2025: 20:30 (-2.4%)

- **Progression Analysis:**
  - Total improvement: 8.9% over 10 months
  - Average improvement: 3.0% per PR
  - Trend: **Improving** (consistent progress)

- **Milestones:**
  - March 2025: Broke 22:00 barrier
  - September 2025: Achieved sub-21 minute 5K

**Actions:**
- **Excellent Progress:** 8.9% improvement in 10 months
- **Consistent Gains:** ~3% improvement per PR (sustainable rate)
- **Pattern:** PR every 3-4 months (good racing frequency)
- **Next Goals:**
  - Short-term: Break 20:00 (2.4% improvement)
  - Realistic timeline: 3-4 months (January 2026)
  - Training: Continue current approach (working well)

**See also:**
- [Running Progress Analysis](#example-running-progress-analysis) for training pace trends
- [Current Personal Records](#example-current-personal-records) for all PRs

---

### Example: Detect New PRs

**Scenario:** Scan last 30 days for any new personal records.

**MCP Request:**

```json
{
  "tool": "detect_new_prs",
  "parameters": {
    "dateRange": "2025-09-15/2025-10-15",
    "minQuality": 75
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"detectedPRs\":[{\"categoryId\":\"5K\",\"categoryName\":\"5 Kilometers\",\"sport\":\"running\",\"value\":1230,\"formattedValue\":\"20:30\",\"activityId\":12345678901,\"activityDate\":\"2025-09-15\",\"quality\":88,\"isNew\":false,\"previousValue\":1260,\"improvement\":2.4},{\"categoryId\":\"30min\",\"categoryName\":\"30 Minutes\",\"sport\":\"running\",\"value\":7250,\"formattedValue\":\"7.25 km\",\"activityId\":12345678902,\"activityDate\":\"2025-10-05\",\"quality\":82,\"isNew\":true}],\"summary\":{\"totalDetected\":2,\"newPRs\":1,\"improvedPRs\":1,\"bySport\":{\"running\":2}}}"
  }]
}
```

**Interpretation:**

- **Detected PRs (2 total):**
  1. **5K:** 20:30 (improved existing PR by 2.4%)
     - Previous: 21:00
     - Quality: 88/100 (high quality)
     - Activity: Sep 15
  2. **30 min:** 7.25 km (new PR category)
     - No previous record
     - Quality: 82/100
     - Activity: Oct 5

- **Summary:**
  - 1 new PR category (30 min)
  - 1 improved existing PR (5K)
  - Both running

**Actions:**
- **Celebration:** 2 PRs in 30 days shows good fitness
- **5K Improvement:** 30 seconds faster (2.4%) is significant
- **30-Minute PR:** 7.25 km = 4:08 min/km pace
  - Excellent tempo pace
  - Slightly faster than 5K PR pace (4:06) - likely segment of longer run
- **Quality Scores:** Both 75+ confirms legitimate efforts (not course-aided)

**See also:**
- [5K PR Progression](#example-5k-pr-progression) for historical context
- [Manage Custom Categories](#example-manage-custom-categories) to create specialized PRs

---

### Example: Manage Custom Categories

**Scenario:** Create a custom 3K PR category for track workouts.

**MCP Request (Create):**

```json
{
  "tool": "manage_custom_pr_category",
  "parameters": {
    "action": "create",
    "id": "3K",
    "name": "3 Kilometers",
    "type": "distance",
    "value": 3000,
    "sport": "running"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"success\":true,\"category\":{\"id\":\"3K\",\"name\":\"3 Kilometers\",\"type\":\"distance\",\"value\":3000,\"sport\":\"running\",\"tolerance\":30},\"message\":\"Custom PR category '3K' created successfully\"}"
  }]
}
```

**MCP Request (List):**

```json
{
  "tool": "manage_custom_pr_category",
  "parameters": {
    "action": "list"
  }
}
```

**Response:**

```json
{
  "content": [{
    "type": "text",
    "text": "{\"categories\":[{\"id\":\"3K\",\"name\":\"3 Kilometers\",\"type\":\"distance\",\"value\":3000,\"sport\":\"running\",\"tolerance\":30},{\"id\":\"12min\",\"name\":\"12 Minutes\",\"type\":\"duration\",\"value\":720,\"tolerance\":10}]}"
  }]
}
```

**Interpretation:**

- **Created:** 3K custom category
  - Distance: 3000 meters
  - Sport: Running only
  - Tolerance: ±30 meters (auto-calculated)

- **Existing Custom Categories:**
  - 3K (distance): 3000m ±30m
  - 12min (duration): 720 seconds ±10s

**Actions:**
- Use custom categories for specialized training goals
- 3K category useful for track sessions (3000m is common distance)
- Tolerance allows matching activities within small variance
- Can now track 3K PRs separately from 5K

**See also:**
- [Detect New PRs](#example-detect-new-prs) to scan for custom category PRs
- [Current Personal Records](#example-current-personal-records) to view all categories

---

## Quick Reference

### Analytics Tools Comparison

| Tool Category | Best For | Time Range | Key Metrics |
|---------------|----------|------------|-------------|
| HR Zone Tools | Intensity analysis | Single activity to monthly | Zone distribution, polarization |
| Sport Progress | Performance trends | 4-16 weeks | Pace, power, efficiency |
| Periodization | Training phase effectiveness | 8-52 weeks | Phase type, volume/intensity changes |
| Personal Records | Achievement tracking | All-time | PR times, progression |

### Recommended Analysis Frequency

| Analysis | Frequency | Purpose |
|----------|-----------|---------|
| Single activity HR zones | After key workouts | Verify workout execution |
| Weekly intensity | Weekly | Check 80/20 adherence |
| Sport progress | Monthly | Track fitness gains |
| Periodization | Every 8-12 weeks | Evaluate training block |
| PR detection | After races/tests | Celebrate achievements |

---

[← Back to Aggregation Tools](./aggregation-tools.md) | [Home](./README.md) | [Next: Correlation Tools →](./correlation-tools.md)

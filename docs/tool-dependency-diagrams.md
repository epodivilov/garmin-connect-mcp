# Tool Dependency Diagrams

This document provides visual representations of dependencies between MCP tools in the Garmin Connect server. These diagrams help understand data flow, tool relationships, and the architectural hierarchy of the system.

## Legend

### Node Shapes
- **Rectangle with rounded corners**: Tool class (e.g., `SleepTools`)
- **Diamond**: Decision point or cross-category dependency
- **Cylinder**: Data storage or service layer

### Arrow Types
- **Solid arrow (→)**: Direct dependency (tool depends on another tool or service)
- **Dashed arrow (⇢)**: Optional or conditional dependency
- **Thick arrow (⇒)**: Data flow direction

### Categories & Colors
- **Basic**: Foundation tools providing raw data access
- **Aggregation**: Tools combining multiple data points
- **Analytics**: Tools performing analysis and calculations
- **Correlation**: Tools finding relationships between metrics
- **Tracking**: Tools monitoring trends over time

---

## 1. High-Level Category Architecture

This diagram shows the overall dependency flow between tool categories.

```mermaid
flowchart TB
    subgraph Basic["🔵 Basic Tools (Foundation)"]
        B1[SleepTools]
        B2[ActivityTools]
        B3[HealthTools]
        B4[OverviewTools]
    end

    subgraph Aggregation["🟢 Aggregation Tools"]
        A1[ActivityVolumeTools]
    end

    subgraph Analytics["🟡 Analytics Tools"]
        AN1[HRZoneTools]
        AN2[SportProgressTools]
        AN3[PeriodizationTools]
        AN4[PersonalRecordsTools]
    end

    subgraph Correlation["🟠 Correlation Tools"]
        C1[SleepCorrelationTools]
    end

    subgraph Tracking["🔴 Tracking Tools"]
        T1[HRVTools]
        T2[TrainingStressTools]
        T3[FatigueFreshnessTools]
        T4[WorkoutTools]
    end

    %% Data flow from Basic to other categories
    Basic ==> Aggregation
    Basic ==> Analytics
    Basic ==> Correlation
    Basic ==> Tracking

    %% Aggregation feeds Analytics
    Aggregation ==> Analytics

    %% Analytics tools feed Tracking
    Analytics ==> Tracking

    %% Correlation depends on multiple sources
    Basic ==> Correlation
    Analytics -.-> Correlation

    %% Tracking tools have complex interdependencies
    T2 --> T3
    Basic -.-> T1

    classDef basicStyle fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef aggregationStyle fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef analyticsStyle fill:#F5A623,stroke:#C17D11,color:#fff
    classDef correlationStyle fill:#FF6B6B,stroke:#CC5555,color:#fff
    classDef trackingStyle fill:#9B59B6,stroke:#7D3C98,color:#fff

    class B1,B2,B3,B4 basicStyle
    class A1 aggregationStyle
    class AN1,AN2,AN3,AN4 analyticsStyle
    class C1 correlationStyle
    class T1,T2,T3,T4 trackingStyle
```

**Key Insights:**
- **Basic tools** are the foundation, providing raw data from Garmin Connect API
- **Aggregation tools** combine basic data across time periods
- **Analytics tools** depend on both basic and aggregation layers
- **Correlation tools** cross-reference multiple data sources
- **Tracking tools** have the most complex interdependencies

---

## 2. Basic Tools Dependencies

Basic tools primarily interact with Garmin Connect API and have minimal interdependencies.

```mermaid
flowchart LR
    subgraph GarminAPI["Garmin Connect API"]
        API[GarminClient]
    end

    subgraph BasicTools["Basic Tools"]
        Sleep[SleepTools]
        Activity[ActivityTools]
        Health[HealthTools]
        Overview[OverviewTools]
    end

    %% Direct API dependencies
    API --> Sleep
    API --> Activity
    API --> Health
    API --> Overview

    %% OverviewTools aggregates other basic tools
    Sleep -.-> Overview
    Activity -.-> Overview
    Health -.-> Overview

    %% Cross-references in documentation
    Sleep -.-> Health
    Health -.-> Sleep

    classDef apiStyle fill:#E8E8E8,stroke:#999,color:#333
    classDef basicStyle fill:#4A90E2,stroke:#2E5C8A,color:#fff

    class API apiStyle
    class Sleep,Activity,Health,Overview basicStyle
```

**Key Insights:**
- All basic tools directly access `GarminClient`
- `OverviewTools` aggregates data from other basic tools
- Minimal interdependencies ensure independent operation
- Tools reference each other for related functionality

---

## 3. Aggregation & Analytics Dependencies

Shows how aggregation and analytics tools build upon basic tools and each other.

```mermaid
flowchart TB
    subgraph Basic["Basic Layer"]
        Activity[ActivityTools]
        Sleep[SleepTools]
        Health[HealthTools]
    end

    subgraph Aggregation["Aggregation Layer"]
        Volume[ActivityVolumeTools]
    end

    subgraph Analytics["Analytics Layer"]
        HRZone[HRZoneTools]
        SportProgress[SportProgressTools]
        Periodization[PeriodizationTools]
        PR[PersonalRecordsTools]
    end

    %% Basic to Aggregation
    Activity --> Volume

    %% Aggregation to Analytics
    Volume --> HRZone
    Volume --> SportProgress
    Volume --> Periodization
    Volume --> PR

    %% Basic to Analytics (direct)
    Activity --> HRZone
    Activity --> SportProgress
    Activity --> PR

    %% Inter-Analytics dependencies
    HRZone -.-> SportProgress
    SportProgress -.-> PR

    %% Services layer (simplified)
    HRZone --> HRZoneCalc[hr-zone-calculator]
    SportProgress --> PaceAnalyzer[pace-analyzer]
    SportProgress --> PowerAnalyzer[power-analyzer]
    SportProgress --> EfficiencyAnalyzer[efficiency-analyzer]
    Periodization --> PhaseDetector[phaseDetector]
    PR --> PRDetector[prDetector]
    PR --> PRStorage[(PRStorage)]

    classDef basicStyle fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef aggregationStyle fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef analyticsStyle fill:#F5A623,stroke:#C17D11,color:#fff
    classDef serviceStyle fill:#E8E8E8,stroke:#999,color:#333
    classDef storageStyle fill:#95A5A6,stroke:#6C7A7B,color:#fff

    class Activity,Sleep,Health basicStyle
    class Volume aggregationStyle
    class HRZone,SportProgress,Periodization,PR analyticsStyle
    class HRZoneCalc,PaceAnalyzer,PowerAnalyzer,EfficiencyAnalyzer,PhaseDetector,PRDetector serviceStyle
    class PRStorage storageStyle
```

**Key Insights:**
- `ActivityVolumeTools` is the central aggregation layer
- Analytics tools depend on both raw activities and aggregated volume
- Each analytics tool has specialized service dependencies
- `PersonalRecordsTools` uses persistent storage
- Sport-specific analysis (pace/power) handled by dedicated services

---

## 4. Correlation Tools Dependencies

Shows how correlation tools cross-reference multiple data sources.

```mermaid
flowchart TB
    subgraph Basic["Basic Data Sources"]
        Sleep[SleepTools]
        Activity[ActivityTools]
        Health[HealthTools]
    end

    subgraph Analytics["Analytics Sources"]
        PR[PersonalRecordsTools]
        SportProgress[SportProgressTools]
    end

    subgraph Correlation["Correlation Analysis"]
        SleepCorr[SleepCorrelationTools]
    end

    subgraph Services["Correlation Services"]
        SleepDataSvc[sleepDataService]
        PerfDataSvc[performanceDataService]
        CorrCalc[correlationCalculator]
        PatternRec[patternRecognitionService]
        SleepDebt[sleepDebtTracker]
        ImpactDetect[sleepImpactDetector]
        RecoveryQual[recoveryQualityService]
    end

    %% Data sources to correlation tool
    Sleep --> SleepCorr
    Activity --> SleepCorr
    Health -.-> SleepCorr
    PR -.-> SleepCorr
    SportProgress -.-> SleepCorr

    %% Correlation tool to services
    SleepCorr --> SleepDataSvc
    SleepCorr --> PerfDataSvc
    SleepCorr --> CorrCalc
    SleepCorr --> PatternRec
    SleepCorr --> SleepDebt
    SleepCorr --> ImpactDetect
    SleepCorr --> RecoveryQual

    classDef basicStyle fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef analyticsStyle fill:#F5A623,stroke:#C17D11,color:#fff
    classDef correlationStyle fill:#FF6B6B,stroke:#CC5555,color:#fff
    classDef serviceStyle fill:#E8E8E8,stroke:#999,color:#333

    class Sleep,Activity,Health basicStyle
    class PR,SportProgress analyticsStyle
    class SleepCorr correlationStyle
    class SleepDataSvc,PerfDataSvc,CorrCalc,PatternRec,SleepDebt,ImpactDetect,RecoveryQual serviceStyle
```

**Key Insights:**
- Correlation tools aggregate data from multiple tool categories
- Heavy reliance on specialized service layer
- Combines basic metrics (sleep) with performance outcomes (PRs, progress)
- Service layer handles complex statistical analysis
- Pattern recognition identifies optimal conditions for performance

---

## 5. Tracking Tools Dependencies

Shows complex interdependencies within tracking tools and their data sources.

```mermaid
flowchart TB
    subgraph Basic["Basic Data"]
        Activity[ActivityTools]
        Sleep[SleepTools]
        Health[HealthTools]
    end

    subgraph Analytics["Analytics Data"]
        PR[PersonalRecordsTools]
    end

    subgraph Tracking["Tracking Tools"]
        HRV[HRVTools]
        TSS[TrainingStressTools]
        Form[FatigueFreshnessTools]
        Workout[WorkoutTools]
    end

    subgraph Services["Tracking Services"]
        HRVStorage[(HRVStorageService)]
        HRVBaseline[HRVBaselineCalculator]
        HRVAnomaly[HRVAnomalyDetector]
        Readiness[ReadinessScorer]
        TSSCalc[tss-calculator]
        FormZone[FormZoneClassifier]
        FormPredict[FormPredictor]
        FormPerf[FormPerformanceAnalyzer]
        FormHistory[(FormHistoryStorage)]
        WorkoutBuilder[WorkoutBuilder]
    end

    %% Basic to Tracking
    Activity --> TSS
    Activity --> Form
    Sleep --> HRV
    Health --> HRV

    %% Analytics to Tracking
    PR --> Form

    %% Inter-Tracking dependencies
    TSS ==> Form
    HRV -.-> Readiness
    TSS -.-> Readiness
    Sleep -.-> Readiness

    %% Tracking to Services
    HRV --> HRVStorage
    HRV --> HRVBaseline
    HRV --> HRVAnomaly
    HRV --> Readiness

    TSS --> TSSCalc

    Form --> FormZone
    Form --> FormPredict
    Form --> FormPerf
    Form --> FormHistory
    Form --> TSSCalc

    Workout --> WorkoutBuilder

    %% Service interdependencies
    HRVBaseline --> HRVAnomaly
    FormHistory --> FormPerf
    PR -.-> FormPerf

    classDef basicStyle fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef analyticsStyle fill:#F5A623,stroke:#C17D11,color:#fff
    classDef trackingStyle fill:#9B59B6,stroke:#7D3C98,color:#fff
    classDef serviceStyle fill:#E8E8E8,stroke:#999,color:#333
    classDef storageStyle fill:#95A5A6,stroke:#6C7A7B,color:#fff

    class Activity,Sleep,Health basicStyle
    class PR analyticsStyle
    class HRV,TSS,Form,Workout trackingStyle
    class HRVBaseline,HRVAnomaly,Readiness,TSSCalc,FormZone,FormPredict,FormPerf,WorkoutBuilder serviceStyle
    class HRVStorage,FormHistory storageStyle
```

**Key Insights:**
- **Critical dependency**: `FatigueFreshnessTools` depends on `TrainingStressTools` (TSS → Form)
- `ReadinessScorer` combines HRV, TSS, and sleep data
- Each tracking tool has dedicated storage and calculation services
- `FormPerformanceAnalyzer` correlates form state with PR achievements
- `WorkoutTools` is independent (workout creation, not analysis)
- HRV baseline calculation feeds anomaly detection

---

## 6. Complete System Dependency Graph (Detailed)

This diagram shows all major dependencies in a single view.

```mermaid
flowchart TB
    subgraph API["Data Source"]
        GC[GarminClient]
    end

    subgraph Basic["🔵 Basic Tools"]
        Sleep[SleepTools]
        Activity[ActivityTools]
        Health[HealthTools]
        Overview[OverviewTools]
    end

    subgraph Aggregation["🟢 Aggregation"]
        Volume[ActivityVolumeTools]
    end

    subgraph Analytics["🟡 Analytics"]
        HRZone[HRZoneTools]
        SportProgress[SportProgressTools]
        Periodization[PeriodizationTools]
        PR[PersonalRecordsTools]
    end

    subgraph Correlation["🟠 Correlation"]
        SleepCorr[SleepCorrelationTools]
    end

    subgraph Tracking["🔴 Tracking"]
        HRV[HRVTools]
        TSS[TrainingStressTools]
        Form[FatigueFreshnessTools]
        Workout[WorkoutTools]
    end

    %% API to Basic
    GC --> Sleep
    GC --> Activity
    GC --> Health
    GC --> Overview

    %% Basic internal
    Sleep -.-> Overview
    Activity -.-> Overview
    Health -.-> Overview

    %% Basic to Aggregation
    Activity --> Volume

    %% Aggregation to Analytics
    Volume --> HRZone
    Volume --> SportProgress
    Volume --> Periodization

    %% Basic to Analytics
    Activity --> HRZone
    Activity --> SportProgress
    Activity --> PR

    %% Analytics internal
    HRZone -.-> SportProgress

    %% Basic to Correlation
    Sleep --> SleepCorr
    Activity --> SleepCorr

    %% Analytics to Correlation
    PR -.-> SleepCorr
    SportProgress -.-> SleepCorr

    %% Basic to Tracking
    Activity --> TSS
    Activity --> Form
    Sleep --> HRV
    Health --> HRV

    %% Tracking internal - CRITICAL
    TSS ==> Form
    HRV -.-> Form
    Sleep -.-> Form

    %% Analytics to Tracking
    PR --> Form

    classDef apiStyle fill:#E8E8E8,stroke:#999,color:#333,stroke-width:3px
    classDef basicStyle fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef aggregationStyle fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef analyticsStyle fill:#F5A623,stroke:#C17D11,color:#fff
    classDef correlationStyle fill:#FF6B6B,stroke:#CC5555,color:#fff
    classDef trackingStyle fill:#9B59B6,stroke:#7D3C98,color:#fff

    class GC apiStyle
    class Sleep,Activity,Health,Overview basicStyle
    class Volume aggregationStyle
    class HRZone,SportProgress,Periodization,PR analyticsStyle
    class SleepCorr correlationStyle
    class HRV,TSS,Form,Workout trackingStyle
```

**Key Insights:**
- **Single entry point**: All tools ultimately depend on `GarminClient`
- **Layered architecture**: Clear progression from Basic → Aggregation → Analytics → Tracking
- **Critical path**: Activity → TSS → Form (training stress analysis chain)
- **Cross-category dependencies**: Correlation and Tracking tools bridge multiple layers
- **Independent tool**: `WorkoutTools` creates workouts but doesn't depend on other analysis tools

---

## How to Read These Diagrams

### Understanding Dependencies

1. **Solid arrows (→)**: Direct, required dependency
   - Example: `ActivityVolumeTools → ActivityTools` means volume tools require activity data

2. **Dashed arrows (⇢)**: Optional or reference relationship
   - Example: `SleepTools ⇢ HealthTools` means tools share related functionality

3. **Thick arrows (⇒)**: Critical data flow
   - Example: `TrainingStressTools ⇒ FatigueFreshnessTools` means TSS is essential for form calculation

### Tool Categories

- **Basic Tools**: Start here for raw data access (sleep, activities, health)
- **Aggregation Tools**: Use for combining data across time periods
- **Analytics Tools**: Use for performance analysis and trends
- **Correlation Tools**: Use for finding relationships between metrics
- **Tracking Tools**: Use for monitoring training load and readiness

### Common Patterns

1. **Data Collection**: Basic Tools → Aggregation Tools
2. **Performance Analysis**: Aggregation Tools → Analytics Tools
3. **Training Load**: Activity Tools → Training Stress Tools → Fatigue/Freshness Tools
4. **Recovery Analysis**: Sleep Tools + HRV Tools → Readiness Assessment
5. **Multi-source Analysis**: Multiple Basic/Analytics Tools → Correlation Tools

---

## Integration Examples

### Example 1: Training Load Monitoring

```
ActivityTools → TrainingStressTools → FatigueFreshnessTools
                                   → FormAnalysis
                                   → TaperPlan
```

### Example 2: Performance Optimization

```
ActivityTools → SportProgressTools → PaceTrends
                                  → EfficiencyMetrics
SleepTools → SleepCorrelationTools → OptimalSleepPattern
```

### Example 3: Readiness Assessment

```
SleepTools ┐
HRVTools   ├→ ReadinessScorer → ReadinessScore
TSSTools   ┘
```

---

## Maintenance Notes

These diagrams are generated from `@see` tags and import statements in the source code. When adding new tools or modifying dependencies:

1. Update the `@see` tags in tool file headers
2. Regenerate diagrams using this template
3. Validate Mermaid syntax in [Mermaid Live Editor](https://mermaid.live)
4. Ensure all dependencies are accurately represented

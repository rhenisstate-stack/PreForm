# PREPFORD NCLEX — PERFORMANCE INTELLIGENCE MASTER AUDIT
## Phase 0: Baseline Discovery, Domain Mapping, Psychometric Boundaries & Implementation Blueprint

**Project:** PrepFord NCLEX Preparation Platform  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Primary Branch:** `feature/dotnet-backend-migration`  
**Baseline HEAD Commit:** `cf405b7`  
**Frameworks:** Next.js 16.4.3 (React 19.3.0, TypeScript 5.7, Tailwind CSS 4, shadcn/ui) | ASP.NET Core 8.0 (`net8.0`, EF Core 8.0.10)  
**Database:** PostgreSQL 18 (default schema `public`)  
**Audit Date:** November 7, 2026  
**Implementation Authority:** PrepFord Product Owner  

---

## 1. Current Architecture

PrepFord NCLEX operates on an enterprise decoupled architecture:
- **Web Tier (`apps/web`):** Next.js 16.4.3 App Router with React 19.3.0, TypeScript 5.7, Tailwind CSS 4, Radix UI primitives, shadcn/ui component library, and Recharts 2.15.0 for data visualization. State and data fetching are handled through TanStack Query (`@tanstack/react-query 5.62.0`) and Next.js Backend-for-Frontend (BFF) route handlers (`src/app/api/...`).
- **Backend Tier (`apps/api`):** ASP.NET Core 8.0 Web API with Entity Framework Core 8.0.10, Npgsql PostgreSQL provider, structured logging, rate limiting, and role-based access control.
- **Gateway & Authentication:** `PrepfordAuthHandler` supports cookie session authentication and HMAC-SHA256 signed gateway requests from the Next.js BFF. Authorization enforces roles (`candidate`, `student`, `admin`, `superadmin`) and user-level ownership checks (`ClaimTypes.NameIdentifier`).
- **Persistence:** Canonical PostgreSQL database (`AppDbContext`) with 18 established EF Core migrations (`0001_CreateProgrammes` through `0018_AddAdminStudyGuideManagement`).

---

## 2. Assessment Data Model

Authoritative performance data resides strictly within the established assessment tables:
1. **`Exams`:** Defines assessment specifications (`Practice`, `CAT`, `MockSimulation`, `DiagnosticReadiness`, `Standalone`), pathway (`rn`, `pn`), target question count, time limit, passing threshold, selection strategy (`Preset`, `DynamicBalanced`, `Hybrid`), and review policy.
2. **`ExamAttempts`:** Records candidate assessment sessions (`InProgress`, `Completed`, `Abandoned`), score percentage, pass status, start/completion timestamps, and immutable server-generated `MetadataSnapshot` (freezing configuration at attempt creation).
3. **`ExamAttemptQuestions`:** Captures exact question membership assigned to an attempt, preserving display order and assignment timestamp to enforce Level 1 exam membership security.
4. **`AttemptResponses`:** Stores candidate answers (`SelectedOptionsJson`), correctness (`IsCorrect`), score awarded (`ScoreAwarded`), explicit grading state (`Graded` vs `Ungraded`), and time spent per item (`TimeSpentSeconds`).
5. **`Questions`:** Single canonical question entity holding stem, difficulty (`Easy`, `Moderate`, `Hard`, `Expert`), cognitive level, clinical judgment step (`Recognize Cues`, `Analyze Cues`, `Prioritize Hypotheses`, `Generate Solutions`, `Take Action`, `Evaluate Outcomes`), client-need association (`ClientNeedId`), and question type key (`QuestionTypeKey`).
6. **`QuestionOptions`:** Multi-option keys with correctness indicators, specific rationales, distractor rationales, and media URLs.

---

## 3. Available Analytics Data

The backend currently exposes basic aggregate statistics via `ILearnerAnalyticsService` and `LearnerAnalyticsController`:
- **Summary Metrics (`GET /api/v1/learner/analytics/summary`):**
  - `TotalCompletedAttempts`: Count of completed attempts.
  - `TotalPracticeQuestions`: Graded responses recorded for candidate.
  - `AverageScorePercent`: Mean score across completed attempts.
  - `OverallPassRate`: Percentage of completed attempts where `Passed == true`.
  - `TotalDurationMinutes`: Cumulative elapsed exam duration.
  - `LastAssessmentDate`: Timestamp of most recent completion.
  - `CurrentReadinessTier`: Categorized as `Very High` (≥75%), `High` (≥65%), `Borderline` (≥55%), `Low` (<55%), or `Unassessed`.
- **Client Needs Mastery (`GET /api/v1/learner/analytics/client-needs`):**
  - Evaluates performance across the canonical 8 NCSBN categories (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PHA`, `RRP`, `PPT`).
  - Reports `TotalAssessedQuestions`, `CorrectCount`, `AccuracyPercent`, `IsLowSample` (<5 questions), and `PerformanceTier`.
- **Topic Mastery (`GET /api/v1/learner/analytics/curriculum`):**
  - Identifies top 10 assessed curriculum topics with lowest accuracy to highlight deficiency areas (total ≥ 3, accuracy < 65%).
- **Readiness Trend (`GET /api/v1/learner/analytics/readiness-trend`):**
  - Chronological list of completed `DiagnosticReadiness` (RAT) or practice attempts with score, tier, and duration.
- **Recommendations (`GET /api/v1/learner/analytics/recommendations`):**
  - Basic in-memory heuristics generating up to 3 static recommendations (weak domain, unassessed domain, full-length simulation).

---

## 4. Missing Analytics Capabilities (Gap Matrix)

| Capability Area | Current State | Required Enterprise State |
|---|---|---|
| **Date & Filter Scoping** | No date range or pathway filtering supported. | Full temporal filtering (`7d`, `30d`, `90d`, `6m`, `all`, custom) and exam-type filtering. |
| **Historical Trends & Distribution** | Flat list of attempts without aggregated trend or distribution analysis. | Longitudinal score & accuracy trend series, score distribution histogram/bands, and completion rate ($Completed/Started$). |
| **Question Type Intelligence** | None. Question type performance is completely unaggregated. | Deep breakdown across all 18 catalogued question types (SATA, single-choice, multiple-choice, matrix, ordered, etc.) showing attempted, correct, accuracy, and sample size. |
| **Difficulty Analytics** | None. Difficulty enum is stored on questions but never analyzed. | Performance aggregated by author-assigned difficulty (`Easy`, `Moderate`, `Hard`, `Expert`). |
| **Question-Level Intelligence & Error Review** | Candidate review is only available inside active/completed attempt modal. | Dedicated performance review table showing answered questions, category, difficulty, user answer vs correct outcome, and rationales (without leaking in-progress or secure exam items). |
| **Recurring Error Detection** | None. | Heuristic clustering detecting recurring failures in specific categories, question formats, or clinical judgment steps. |
| **NGN Clinical Judgment Analysis** | Field `ClinicalJudgmentStep` exists on `Question` but is unaggregated. | Measurement across the 6 NCSBN Clinical Judgment Measurement Model steps. |
| **Longitudinal Attempt Comparison** | None. | Multi-attempt comparison (First vs Latest, Previous vs Current, or selected arbitrary attempts) comparing score, accuracy, category delta, and duration delta. |
| **Readiness Development** | Single readiness tier from latest attempt. | Dedicated RAT progression history clearly distinguishing diagnostic readiness tests from adaptive CAT or practice drills, with transparent methodology. |
| **Personalized Recommendations Engine** | Ephemeral in-memory generation with no persistence or lifecycle. | Rules-based engine with persisted lifecycle (`New`, `InProgress`, `Completed`, `Dismissed`), actionable links, and priority ranking. |
| **Intervention Tracking** | None. | Structured tracking linking recommended learning actions to subsequent learner activity and measuring post-intervention accuracy delta. |
| **Downloadable Performance Reports** | None. No learner performance report generation exists. | High-fidelity downloadable PDF reports and CSV data exports with executive summary, client-needs breakdown, question intelligence, RAT history, recommendations, and methodology disclaimer. |
| **Dedicated RN/PN Experiences** | Only generic dashboard overview; RN and PN views share identical analytics. | Dedicated routes (`/learner/nclex-rn/performance` and `/learner/nclex-pn/performance`), pathway-scoped analytics, and distinct RN vs PN terminology. |

---

## 5. Question Taxonomy

The authoritative question taxonomy is governed by `QuestionTypeRegistry.cs` and `QuestionTypeDefinitions`:
- **Actively Gradable & Deliverable Formats:**
  1. `single-choice`: Single-answer multiple choice.
  2. `multiple-choice`: Multiple-choice item with single or multiple keys.
  3. `sata`: Select All That Apply (multi-select clinical prioritization).
  4. `checkbox`: Form-based checkbox selection.
  5. `image-based`: Single-choice with diagnostic radiograph/visual exhibit.
  6. `multiple-image`: Multi-image comparative visual exhibits.
  7. `true-false`: Binary clinical fact validation.
- **Catalogued Next Generation NCLEX (NGN) Formats:**
  8. `drag-drop`: Interactive clinical priority classification.
  9. `ordering`: Procedural or nursing intervention sequencing.
  10. `case-study`: Multi-part unfolding case study with EHR tabs.
  11. `matrix`: Tabular grid response clinical evaluation.
  12. `tabular`: Data table evaluation for clinical interventions.
  13. `dynamic-lab`: Interactive lab value and trend interpretation.
- **Catalogued Extended/Traditional Formats:**
  14. `matching`: Paired concept matching.
  15. `fill-blank`: Direct text entry.
  16. `numeric`: Dosage calculation and clinical measurement.
  17. `short-answer`: Concise clinical entry.
  18. `essay`: Extended clinical reasoning reflection.

---

## 6. RN vs PN Taxonomy and Clinical Model Differences

1. **Category Terminology:**
   - **NCLEX-RN Category 1:** Safe and Effective Care Environment — **Management of Care** (`MOC`).
   - **NCLEX-PN Category 1:** Safe and Effective Care Environment — **Coordinated Care** (`cat_pn_coord_care` / `MOC` equivalent).
   - **NCLEX-RN Category 6:** Physiological Integrity — **Pharmacological and Parenteral Therapies** (`PHA` / `PPT`).
   - **NCLEX-PN Category 6:** Physiological Integrity — **Pharmacological Therapies** (PN candidates do not manage high-risk parenteral titration).
2. **Clinical Reasoning Model:**
   - **NCLEX-RN (NCJMM 6-Step Cognitive Model):**
     1. Recognize Cues (identify vital sign trends & clinical deviations).
     2. Analyze Cues (link symptoms to acute pathophysiology).
     3. Prioritize Hypotheses (ABCs, Maslow, urgent threat ranking).
     4. Generate Solutions (evidence-based nursing care plan).
     5. Take Action (priority interventions, IV medications).
     6. Evaluate Outcomes (assess response and adjust plan).
   - **NCLEX-PN (Clinical Role Model):**
     1. Focused Data Collection.
     2. Critical Cue Escalation (reporting promptly to RN/MD).
     3. Safe Interventions (med administration within practical nursing scope, wound dressings).
     4. Bedside Monitoring & Comfort Care.
3. **Data Scoping:**
   - Analytics for RN must filter assessments and questions by `Pathway == "rn"` or `"both"`.
   - Analytics for PN must filter assessments and questions by `Pathway == "pn"` or `"both"`.
   - Cross-product pollution must be rejected at the API query boundary.

---

## 7. Existing Scoring Methodology

- **Response-Level Scoring:**
  - Evaluated in `ExamAttemptsController` via `ResponseValidationService` and `GradingSecurityTests`.
  - Gradable questions use `ResponseGradingState.Graded`. Questions without authoritative keys are marked `ResponseGradingState.Ungraded` and excluded from scoring.
  - Multi-select (SATA) enforces exact match of chosen keys against correct keys (`IsCorrect = matchesAll`).
- **Attempt-Level Scoring:**
  - $\text{ScorePercent} = \frac{\sum \text{ScoreAwarded}}{\text{Eligible Graded Questions}} \times 100$, rounded to 1 decimal place.
  - $\text{Passed} = \text{ScorePercent} \ge \text{Exam.PassingScorePercent}$.
  - In-progress attempts mask scores, correct indices, and rationales until completed.
- **Accuracy Calculation:**
  $$\text{Accuracy} = \frac{\text{Correct Graded Responses}}{\text{Total Answered Graded Responses}} \times 100$$
- **Completion Rate:**
  $$\text{Completion Rate} = \frac{\text{Completed Attempts}}{\text{Total Started Attempts}} \times 100$$

---

## 8. CAT Integration Boundaries

- Computerized Adaptive Testing (CAT) ability estimates ($\theta$) and standard errors must be respected as established by the psychometric model in `phase5-adaptive-cat-level-1.md`.
- Performance Intelligence must **never** equate a raw percentage score to an IRT $\theta$ ability estimate.
- Pass probabilities must not be fabricated; readiness tiers (`Very High`, `High`, `Borderline`, `Low`) must use clear, documented thresholds based on verified diagnostic assessment performance.
- When CAT attempts are present, their status and estimated ability tier are reported with clear methodology disclaimers.

---

## 9. Required Database Changes

To support persistent recommendation lifecycles and intervention tracking without ephemeral loss, we add additive EF Core entities to PostgreSQL:
1. **`LearnerPerformanceRecommendation`:**
   - `Id` (GUID string PK)
   - `UserId` (FK to `Users.Id`, indexed)
   - `Pathway` (`rn` | `pn` | `both`)
   - `Category` (`TargetedPractice`, `ConceptReview`, `QuestionFormat`, `ReadinessSimulation`, `Maintenance`)
   - `Priority` (`High`, `Medium`, `Low`)
   - `Title`, `Description`, `Evidence` (contextual explanation based on learner data)
   - `TargetClientNeedCode`, `TargetQuestionTypeKey`
   - `ActionHref`, `SuggestedAction`
   - `Status` (`New`, `InProgress`, `Completed`, `Dismissed`)
   - `CreatedAt`, `UpdatedAt`, `CompletedAt`, `DismissedAt`
2. **`LearnerIntervention`:**
   - `Id` (GUID string PK)
   - `UserId` (FK to `Users.Id`, indexed)
   - `RecommendationId` (FK to `LearnerPerformanceRecommendation.Id`)
   - `ClientNeedCode`, `QuestionTypeKey`
   - `BaselineAccuracyPercent`, `BaselineQuestionsAnswered`
   - `PostInterventionAccuracyPercent`, `PostInterventionQuestionsAnswered`
   - `ActivityCount` (practice attempts or questions completed during intervention)
   - `Status` (`Active`, `Evaluated`, `Archived`)
   - `StartedAt`, `LastEvaluatedAt`

---

## 10. Required API Changes

Extend `LearnerAnalyticsController` (`api/v1/learner/analytics`) and create `LearnerReportsController` (`api/v1/learner/reports`):
1. **`GET /api/v1/learner/analytics/overview`:** Enhanced executive overview accepting `timeRange` (`7d`, `30d`, `90d`, `6m`, `all`), `pathway` (`rn` | `pn`), and `examType`.
2. **`GET /api/v1/learner/analytics/trends`:** Historical performance timeline series (daily/weekly score & accuracy points, completion rate).
3. **`GET /api/v1/learner/analytics/question-intelligence`:** Breakdown by question type, difficulty level, and clinical judgment step.
4. **`GET /api/v1/learner/analytics/question-review`:** Paginated, candidate-safe question review history for completed exams (stem, category, difficulty, learner answer, correctness, time spent, rationales).
5. **`GET /api/v1/learner/analytics/attempt-comparison`:** Compares two attempts (`attemptId1`, `attemptId2`) or First vs Latest.
6. **`GET /api/v1/learner/analytics/recommendations`:** Retrieves active recommendations with filters.
7. **`PATCH /api/v1/learner/analytics/recommendations/{id}/status`:** Updates recommendation lifecycle status (`InProgress`, `Completed`, `Dismissed`).
8. **`GET /api/v1/learner/analytics/interventions`:** Retrieves active and completed learning interventions with before/after accuracy delta.
9. **`POST /api/v1/learner/analytics/interventions/start`:** Starts an intervention from a recommendation.
10. **`GET /api/v1/learner/reports/performance`:** Generates full report data structure.
11. **`GET /api/v1/learner/reports/performance/pdf`:** Secure binary download of styled PDF report.
12. **`GET /api/v1/learner/reports/performance/csv`:** Secure download of RFC 4180 CSV report.

---

## 11. Security & Data Integrity

- **Learner Ownership:** Endpoints strictly authorize the authenticated caller via `ClaimTypes.NameIdentifier`. Non-admin requests for alien user IDs return `403 Forbidden`.
- **Pathway Isolation:** Pathway filters validate the learner's enrolled pathway (`rn`, `pn`), preventing cross-curriculum leakage.
- **In-Flight Exam Protection:** In-progress or abandoned uncompleted attempts never expose correct answer indices or rationales.
- **Audit Logging:** Sensitive actions (generating reports, updating intervention status) generate structured audit logs.
- **No Token/PII Leakage:** Downloads are served directly with authenticated headers; no public static report URLs.

---

## 12. Performance Considerations

- **Optimized EF Core Aggregations:** Database-side projections using `.Select(...)` and grouped aggregates instead of loading entire attempt trees into memory.
- **Date Range Indexing:** Queries leverage existing `ExamAttempts.StartedAt` and `ExamAttempts.CompletedAt` indexes.
- **Streaming Export Responses:** PDF and CSV downloads stream byte buffers directly without disk I/O bottlenecks.

---

## 13. Testing Requirements

- **Backend Unit & Integration Tests:** Accuracy calculations, date filtering, question type aggregation, difficulty breakdown, attempt comparisons, recommendation lifecycle transitions, intervention delta evaluation, and report export formatting.
- **Security Tests:** Rejection of unauthorized cross-learner requests, in-flight answer concealment, pathway segregation.
- **Frontend Vitest Tests:** Rendering dedicated RN/PN Performance Intelligence views, KPI cards, Recharts visualizations, date filtering, attempt comparison modals, recommendation status changes, and PDF download triggers.
- **TypeScript & Build Verification:** Zero TypeScript diagnostic errors (`npm run typecheck`) and successful Turbopack build (`npm run build`).

---

## 14. Implementation Sequence

1. **Subphase A:** Complete Audit deliverable (this document).
2. **Subphase B:** Backend Domain Models, EF Core Migration, DTOs & Enhanced `LearnerAnalyticsService`.
3. **Subphase C:** Backend `LearnerReportsService` for PDF & CSV generation and API Endpoints.
4. **Subphase D:** Next.js BFF API Routes & Typed API Services.
5. **Subphase E:** Performance Intelligence Components (Overview, KPI Cards, Trends Chart, Client-Needs Mastery, Question Intelligence, Attempt Comparison, Recommendations, Interventions, Report Preview & Download).
6. **Subphase F:** Dedicated Dedicated RN & PN Routes (`/learner/nclex-rn/performance`, `/learner/nclex-pn/performance`) & Main Dashboard Compact Overview Cards.
7. **Subphase G:** Full Verification (Unit, Integration, Security, Vitest, Typecheck, Build) & Acceptance Report.

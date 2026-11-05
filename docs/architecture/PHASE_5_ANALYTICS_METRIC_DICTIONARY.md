# PREPFORD NCLEX — PHASE 5 ANALYTICS METRIC DICTIONARY
## Canonical Metric Definitions, Mathematical Formulas, Data Lineage & Governance

**Document File:** `docs/architecture/PHASE_5_ANALYTICS_METRIC_DICTIONARY.md`  
**Phase:** Phase 5 — Analytics, Reporting, Operational Monitoring & Product Readiness  
**Authority:** PrepFord Product Owner  
**Date:** November 5, 2026  
**Status:** CANONICAL REFERENCE — APPROVED  

---

## 1. Governance Principles & Invariants

1. **Authoritative Source:** All metrics derive exclusively from canonical PostgreSQL tables (`Users`, `Examinations`, `Exams`, `ExamAttempts`, `ExamAttemptQuestions`, `AttemptResponses`, `Questions`, `QuestionOptions`, `ClientNeeds`, `Topics`, `AuditLogs`, `UserSessions`).
2. **Attempt Status Discipline:**
   - Score-bearing metrics (average score, pass rate, domain accuracy, question correctness) **MUST ONLY** include attempts with `Status == AttemptStatus.Completed`.
   - In-progress attempts (`AttemptStatus.InProgress`) are included strictly in participation volume and concurrent activity metrics.
   - Abandoned attempts (`AttemptStatus.Abandoned`) are tracked strictly in abandonment and completion rate metrics, never in mastery or readiness calculations.
3. **No Unvalidated Clinical Claims:**
   - Readiness tiers are predictive prep indicators based on historical diagnostic assessment benchmarks; they do NOT constitute official NCSBN NCLEX pass probability guarantees.
4. **Historical Classification Integrity:**
   - Attempt responses map to the question snapshot or version established when the attempt was delivered. If a question's current Client Need is subsequently altered, historical learner attempts retain the classification assigned at examination time.

---

## 2. Learner Analytics Metric Dictionary

### M-LRN-01: Completed Assessment Count
- **Business Meaning:** Total number of examinations finalized by the learner.
- **Formula:** $\text{Count}(a \in \text{ExamAttempts} \mid a.\text{UserId} = u \land a.\text{Status} = \text{Completed})$
- **Data Source:** `public."ExamAttempts"`
- **Applicable Statuses:** `Completed`
- **Applicable Exams:** All (`Practice`, `CAT`, `MockSimulation`, `DiagnosticReadiness`)
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-02: Total Practice Questions Answered
- **Business Meaning:** Total number of question responses submitted across all attempts.
- **Formula:** $\text{Count}(r \in \text{AttemptResponses} \mid r.\text{ExamAttempt}.\text{UserId} = u)$
- **Data Source:** `public."AttemptResponses"` inner joined with `public."ExamAttempts"`
- **Applicable Statuses:** `Completed` (and optionally `InProgress` for lifetime question count)
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-03: Overall Average Score Percent
- **Business Meaning:** Arithmetic mean of finalized percentage scores across completed attempts.
- **Formula:** $\bar{S}_u = \frac{1}{N} \sum_{i=1}^{N} a_i.\text{ScorePercent} \quad \text{where } a_i.\text{Status} = \text{Completed}$
- **Data Source:** `public."ExamAttempts".ScorePercent`
- **Applicable Statuses:** `Completed`
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-04: Overall Pass Rate
- **Business Meaning:** Proportion of completed attempts where the score met or exceeded the examination's passing threshold.
- **Formula:** $\text{PassRate}_u = \left( \frac{\sum [a.\text{Passed} = \text{true}]}{\text{Total Completed Attempts}} \right) \times 100\%$
- **Data Source:** `public."ExamAttempts".Passed`
- **Applicable Statuses:** `Completed`
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-05: Total Study Duration (Minutes)
- **Business Meaning:** Cumulative time spent completing examinations.
- **Formula:** $\sum \max\left(1, \left\lfloor \frac{a.\text{CompletedAt} - a.\text{StartedAt}}{60} \right\rfloor\right) \quad \text{for } a.\text{Status} = \text{Completed}$
- **Data Source:** `public."ExamAttempts".StartedAt`, `CompletedAt`
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-06: Client Needs Category Mastery
- **Business Meaning:** Accuracy percentage across each of the 8 canonical NCSBN Client Needs categories (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PPT`, `RRP`, `PHA`).
- **Formula:** For each category $C \in \{ \text{MOC}, \dots, \text{PHA} \}$:
  $$\text{Accuracy}(C) = \frac{\sum_{r \in R_C} [r.\text{IsCorrect} = \text{true}]}{|R_C|} \times 100\%$$
  where $R_C$ is the set of graded responses submitted by user $u$ on questions classified under Client Need $C$.
- **Data Source:** `AttemptResponses` $\bowtie$ `Questions` $\bowtie$ `ClientNeeds` (or historical question snapshot)
- **Sparse Sample Rule:** If $|R_C| < 5$, flag metric with `isLowSample = true` to prevent misleading confidence.
- **Applicable Statuses:** `Completed` attempts, `ResponseGradingState.Graded`
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-07: Readiness Assessment (RAT) Trajectory & Tiers
- **Business Meaning:** Chronological progression of scores on diagnostic readiness tests (`ExamType.DiagnosticReadiness`), classified into 4 standardized tiers:
  - **Very High:** $\text{Score} \ge 75.0\%$
  - **High:** $65.0\% \le \text{Score} < 75.0\%$
  - **Borderline:** $55.0\% \le \text{Score} < 65.0\%$
  - **Low:** $\text{Score} < 55.0\%$
- **Data Source:** `ExamAttempts` $\bowtie$ `Exams` where `ExamType == DiagnosticReadiness`
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-08: Topic Mastery & Deficiency Areas
- **Business Meaning:** Identifies curriculum topics where the learner has answered $\ge 3$ questions and achieved $< 65.0\%$ accuracy.
- **Formula:**
  $$\text{WeakTopics}_u = \{ T \mid |R_T| \ge 3 \land \text{Accuracy}(T) < 65.0\% \}$$
- **Data Source:** `AttemptResponses` $\bowtie$ `Questions` $\bowtie$ `Topics`
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

### M-LRN-09: Deterministic Study Recommendations
- **Business Meaning:** Rule-based remediation actions directing the learner to specific clinical domains based on empirical assessment gaps.
- **Rules:**
  1. Rank Client Needs by accuracy ascending (where $|R_C| \ge 3$).
  2. If the lowest category is $< 65.0\%$, generate high-priority recommendation: "Targeted Remediation in [Category Name]".
  3. If unassessed categories exist ($|R_C| = 0$), recommend: "Unassessed Domain Practice in [Category Name]".
  4. If all categories $\ge 75.0\%$, recommend: "Full-Length Mock Simulation".
- **Privacy:** Private to learner and authorized admin.
- **Freshness:** Real-time.

---

## 3. Administrative Reporting Metric Dictionary

### M-ADM-01: Total Assessment Volume & Participation
- **Business Meaning:** Aggregate number of assessment attempts started across the platform within a specified date window.
- **Formula:** $\text{Count}(a \in \text{ExamAttempts} \mid a.\text{StartedAt} \in [T_1, T_2])$
- **Data Source:** `public."ExamAttempts"`
- **Privacy:** Restricted to Admin/SuperAdmin.
- **Freshness:** Real-time.

### M-ADM-02: Assessment Completion Rate
- **Business Meaning:** Percentage of started attempts that reached completion.
- **Formula:**
  $$\text{CompletionRate} = \frac{\text{Count}(\text{Status} = \text{Completed})}{\text{Count}(\text{Status} \in \{\text{Completed}, \text{Abandoned}\})} \times 100\%$$
- **Data Source:** `public."ExamAttempts"`
- **Privacy:** Restricted to Admin/SuperAdmin.
- **Freshness:** Real-time.

### M-ADM-03: Assessment Abandonment Rate
- **Business Meaning:** Percentage of finalized attempts that were abandoned prior to submission.
- **Formula:**
  $$\text{AbandonmentRate} = \frac{\text{Count}(\text{Status} = \text{Abandoned})}{\text{Count}(\text{Status} \in \{\text{Completed}, \text{Abandoned}\})} \times 100\%$$
- **Data Source:** `public."ExamAttempts"`
- **Privacy:** Restricted to Admin/SuperAdmin.
- **Freshness:** Real-time.

### M-ADM-04: System-Wide Average Score & Pass Rate
- **Business Meaning:** Benchmark cohort score average and pass percentage across selected examinations and pathways.
- **Formula:** Standard arithmetic mean of `ScorePercent` and ratio of `Passed == true`.
- **Data Source:** `public."ExamAttempts"`
- **Privacy:** Restricted to Admin/SuperAdmin.
- **Freshness:** Real-time.

### M-ADM-05: Score Distribution Histogram
- **Business Meaning:** Distribution of completed attempt scores across standard 10-point decile buckets:
  $[0, 50), [50, 60), [60, 70), [70, 75), [75, 80), [80, 90), [90, 100]$.
- **Data Source:** `public."ExamAttempts"`
- **Privacy:** Restricted to Admin/SuperAdmin.
- **Freshness:** Real-time.

### M-ADM-06: Examination Revision Participation & Pass Comparison
- **Business Meaning:** Compares candidate participation, average score, and pass rate across distinct revisions of an examination family to evaluate blueprint adjustments.
- **Formula:** Grouped by `Exam.ExaminationId` and `Exam.RevisionNumber`.
- **Data Source:** `public."ExamAttempts"` $\bowtie$ `public."Exams"`
- **Privacy:** Restricted to Admin/SuperAdmin.
- **Freshness:** Real-time.

---

## 4. Question Bank Performance Analytics Metric Dictionary

### M-QBN-01: Question Delivery Count
- **Business Meaning:** Number of times a question was assigned to candidate attempts.
- **Formula:** $\text{Count}(q \in \text{ExamAttemptQuestions} \mid q.\text{QuestionId} = Q)$
- **Data Source:** `public."ExamAttemptQuestions"`
- **Privacy:** Restricted to Admin/SuperAdmin/ContentManager.
- **Freshness:** Real-time.

### M-QBN-02: Question Response Count
- **Business Meaning:** Number of times a candidate submitted a response to the question in a completed attempt.
- **Formula:** $\text{Count}(r \in \text{AttemptResponses} \mid r.\text{QuestionId} = Q \land r.\text{ExamAttempt}.\text{Status} = \text{Completed})$
- **Data Source:** `public."AttemptResponses"`
- **Privacy:** Restricted to Admin/SuperAdmin/ContentManager.
- **Freshness:** Real-time.

### M-QBN-03: Question Correct Response Rate (P-Value Indicator)
- **Business Meaning:** Observed proportion of candidate responses that were scored correct.
- **Formula:**
  $$\text{CorrectRate}_Q = \frac{\text{Count}(r.\text{IsCorrect} = \text{true})}{\text{Total Graded Responses}_Q} \times 100\%$$
- **Note:** This represents observed empirical difficulty, not psychometrically calibrated IRT $b$-parameter.
- **Privacy:** Restricted to Admin/SuperAdmin/ContentManager.
- **Freshness:** Real-time.

### M-QBN-04: Distractor Frequency Distribution
- **Business Meaning:** Frequency and percentage with which each incorrect option key was chosen by candidates.
- **Formula:** For each option $k \in \text{QuestionOptions}$:
  $$\text{SelectionFrequency}(k) = \frac{\text{Count}(\text{Option } k \text{ chosen})}{\text{Total Responses}_Q} \times 100\%$$
- **Utility:** Identifies non-functioning distractors (selected $< 5\%$ of the time) or plausible distractors that expose common clinical misconceptions.
- **Privacy:** Restricted to Admin/SuperAdmin/ContentManager. **NEVER EXPOSED TO CANDIDATES**.
- **Freshness:** Real-time.

### M-QBN-05: Average Response Time per Question
- **Business Meaning:** Average seconds spent by candidates answering the question.
- **Formula:**
  $$\bar{T}_Q = \frac{1}{|R_Q|} \sum_{r \in R_Q} r.\text{TimeSpentSeconds}$$
- **Data Source:** `public."AttemptResponses".TimeSpentSeconds`
- **Privacy:** Restricted to Admin/SuperAdmin/ContentManager.
- **Freshness:** Real-time.

---

## 5. Operational Observability Metric Dictionary

### M-OPS-01: Database Response Latency Probe
- **Business Meaning:** Time elapsed in milliseconds executing a lightweight round-trip query against PostgreSQL (`SELECT 1`).
- **Target Thresholds:** Healthy $< 50\text{ms}$; Warning $50-250\text{ms}$; Critical $> 250\text{ms}$.
- **Data Source:** Direct ADO.NET connection timing in health probe.
- **Freshness:** Real-time on demand.

### M-OPS-02: Active User Sessions & Concurrency
- **Business Meaning:** Number of non-revoked, unexpired user sessions active across the platform.
- **Data Source:** `public."UserSessions"` matching session security rules.
- **Freshness:** Real-time.

### M-OPS-03: System Uptime & Process Memory
- **Business Meaning:** Total elapsed server runtime and committed memory working set (MB).
- **Data Source:** `System.Diagnostics.Process.GetCurrentProcess()`.
- **Freshness:** Real-time.

### M-OPS-04: Recent Security & Operational Incident Rate (24 Hours)
- **Business Meaning:** Count of rate-limit rejections, concurrent session limit violations, and security version invalidations in the trailing 24 hours.
- **Data Source:** `public."AuditLogs"`
- **Freshness:** Real-time.

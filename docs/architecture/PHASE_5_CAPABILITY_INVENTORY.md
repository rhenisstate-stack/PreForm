# PREPFORD NCLEX — PHASE 5 PRODUCT CAPABILITY INVENTORY
## Inventory of Analytics, Reporting, Operational Observability & Functional Modules

**Document File:** `docs/architecture/PHASE_5_CAPABILITY_INVENTORY.md`  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Phase 4 Baseline:** `9c8c496` | **Current HEAD:** `78b615b`  
**Date:** November 5, 2026  
**Status:** COMPLETE  

---

## 1. Feature & Capability Inventory Table

| Capability | Existing Evidence | Status | Gap Description | Proposed Phase 5 Action |
| :--- | :--- | :---: | :--- | :--- |
| **Learner Overview Analytics** | `ExamAttemptsController.GetAttempts`, `apps/web/src/app/dashboard/page-client.tsx` | **Partial** | Relies on client `localStorage` and falls back to hardcoded `SAMPLE_BENCHMARK_ATTEMPTS`. Lacks backend aggregated summary endpoint. | Implement `GET /api/v1/learner/analytics/summary` aggregating completed attempts, average score, pass rate, and study time from PostgreSQL. Connect dashboard. |
| **Client Needs Performance Breakdown** | `ClientNeedCategory` enum, `Question.ClientNeedId`, `AttemptResponses` | **Missing** | No endpoint aggregates candidate mastery across the 8 canonical NCSBN categories (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PPT`, `RRP`, `PHA`). | Implement `GET /api/v1/learner/analytics/client-needs` using database-side joins and weighted score calculations. Surface in Learner Dashboard. |
| **Curriculum & Topic Analytics** | `CurriculumController`, `CurriculumService`, `Question.TopicId` | **Missing** | No endpoint correlates learner responses to specific curriculum hierarchy domains and learning topics. | Implement `GET /api/v1/learner/analytics/curriculum` to identify specific weak topics (< 65% score with $\ge 3$ items). |
| **Readiness Trends & Insights** | `ExamType.DiagnosticReadiness`, `ExamAttempts.ScorePercent` | **Partial** | Readiness tiers exist in code comments and client helpers, but time-series progression is not aggregated on the server. | Implement `GET /api/v1/learner/analytics/readiness-trend` delivering chronologically ordered diagnostic attempts with tier trajectory. |
| **Targeted Study Recommendations** | `StudyController`, `SpacedRepetitionService` | **Missing** | Learner dashboard has no rule-based study recommendations based on actual assessment performance. | Implement deterministic rule-based recommendation generator (`GET /api/v1/learner/analytics/recommendations`) directing learners to their lowest-scoring Client Needs. |
| **Admin Overview Metrics** | `apps/web/src/app/admin/page-client.tsx` | **Missing** | Overview page contains hardcoded "TBD" cards and static "94% active study engagements" text. | Implement `GET /api/v1/admin/reports/overview` with real PostgreSQL counts for candidates, questions, active exams, and recent completions. Update UI. |
| **Admin Assessment Reporting** | `ExaminationsController`, `ExamAttempts` table | **Missing** | No administrative endpoint or UI to view system-wide assessment volume, completion rates, pass rates, or score distributions. | Implement `GET /api/v1/admin/reports/assessments` with filters for pathway, exam family, date range, and status. Create Admin Reports page. |
| **Examination Revision Reporting** | `Exams` table, `ExamAttempts.ExamId` | **Missing** | Administrators cannot evaluate candidate performance across specific examination revisions. | Implement `GET /api/v1/admin/reports/examinations/{id}/revisions` aggregating attempts per revision. |
| **Question Bank Performance Analytics** | `public."Questions"`, `public."AttemptResponses"` | **Missing** | Zero insight into item difficulty, delivery count, response count, correct rate, and distractor option distribution. | Implement `GET /api/v1/admin/reports/questions/performance` with distractor breakdown and response rates. Expose in Admin Question Bank. |
| **Report Export Functionality** | None | **Missing** | No CSV export capability for assessment reports or question performance data. | Implement streaming CSV export endpoints (`GET /api/v1/admin/reports/assessments/export`, `GET /api/v1/admin/reports/questions/export`) with RBAC enforcement. |
| **Platform Operational Monitoring** | `HealthController.cs` (`/health/live`, `/health/ready`), `AdminSecurityController` | **Partial** | Liveness and Postgres readiness exist, but comprehensive platform health (database latency, memory, uptime, error rate) is absent. | Implement `GET /api/v1/admin/monitoring/health` providing system uptime, database response time, and recent error counts. Expose in Admin UI. |
| **BFF Gateway Route Handlers** | `apps/web/src/app/api/admin/...` | **Missing** | Next.js BFF has no route handlers for analytics, reporting, or operational health. | Implement BFF route handlers with HMAC authentication forwarding to backend ASP.NET Core API. |
| **Interactive NGN Runtime Delivery** | 11 NGN types catalogued in Question Type Registry | **Deferred** | Explicitly out of scope for Phase 5 per Phase 4 report (requires interactive scoring runtimes). | Preserved as Catalogued/ContractDefined; traditional types remain active. |
| **Item Response Theory (IRT) / Dynamic CAT** | `ExamType.CAT` | **Deferred** | Real-time Rasch theta estimation and variable-length item selection deferred to future CAT phase per ADR-3. | Standard fixed-length and balanced assessments maintained. |

---

## 2. Classification of Findings

### 2.1 In Scope for Phase 5
1. **Learner Analytics Engine:** Summary metrics, Client Needs breakdown, curriculum topic mastery, readiness trend, and deterministic study recommendations.
2. **Administrative Reporting Subsystem:** Executive overview metrics, filterable assessment reports, examination revision performance, and question-bank performance analytics with distractor analysis.
3. **Data Governance & Export:** Streaming CSV export for assessment and question performance reports with strict role-based access control and PII protection.
4. **Operational Monitoring & Observability:** Extended health telemetry, database responsiveness, memory/uptime stats, and administrative operational monitoring.
5. **Frontend Integration:**
   - Eliminate hardcoded sample data (`SAMPLE_BENCHMARK_ATTEMPTS`) and "TBD" placeholders.
   - Upgrade Learner Dashboard with live PostgreSQL-backed analytics.
   - Upgrade Admin Dashboard Overview with live platform metrics.
   - Build Admin Reports & Analytics Studio (`/admin/reports`) with filtering, revision-aware metrics, question performance, and CSV exports.

### 2.2 Deferred to Future Phases (Out of Scope for Phase 5)
1. **Interactive NGN Runtime Scoring Engines:** (Matrix, Dropdown, Highlight, Drag-and-Drop) — requires dedicated client interaction components and complex partial credit scoring algorithms.
2. **Dynamic CAT / IRT Theta Parameter Estimation:** Requires psychometric item calibration and variable-length stopping rules.
3. **Automated AI Question Generation:** Requires prompt engineering and clinical review pipelines.

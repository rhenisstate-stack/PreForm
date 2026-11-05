# PREPFORD NCLEX — PHASE 5 SECURITY & APPLICATION INTEGRITY REVIEW
## Analytics Authorization, Candidate Privacy & Observability Access Boundaries

**Document File:** `docs/architecture/PHASE_5_SECURITY_REVIEW.md`  
**Authority:** PrepFord Application Security Architect & Product Owner  
**Date:** November 5, 2026  
**Status:** APPROVED & AUDITED  

---

## 1. Security Architecture & Threat Model

Analytics systems frequently introduce severe security vulnerabilities, including Insecure Direct Object References (IDOR), unauthorized data aggregation across student cohorts, accidental exposure of hidden examination answer keys or rationales, and Denial of Service (DoS) through unbounded reporting queries. 

Phase 5 addresses these risks with defensive architectural boundaries embedded at the API, database query, and UI layers.

### 1.1 Non-Negotiable Security Invariants
1. **Candidate Data Isolation (IDOR Defense):** A candidate must NEVER be able to query, inspect, or deduce another learner's assessment outcomes or study recommendations by manipulating request parameters.
2. **Concealment of Unreleased Assessment Keys:** Analytics queries never expose live examination answer keys to candidates. Question distractor breakdowns are strictly restricted to educators and administrators (`RequireAdmin`).
3. **Bounded Query Resource Consumption:** Paged queries mandate fixed upper limits (`maxPageSize = 100`). Reporting calculations use database-level projections to prevent memory exhaustion attacks.
4. **Separation of Operational Telemetry from Learner Analytics:** Operational monitoring endpoints (`/api/v1/admin/monitoring/health`) are strictly segregated from learner routes and require administrative privileges.

---

## 2. Access Control & Authorization Enforcement

### 2.1 Role-Based Permission Matrix

| Capability | Target Route | Required Backend Role / Policy | Frontend Auth Guard |
| :--- | :--- | :--- | :--- |
| **Learner Self Analytics** | `/api/v1/learner/analytics/*` | `[Authorize]` (`UserId == claim.Sub`) | Candidate Session |
| **Admin Overview Metrics** | `/api/v1/admin/reports/overview` | `RequireAdmin` (`admin`, `superadmin`, `exam_manager`) | `canViewReports` |
| **Assessment Cohort Reports** | `/api/v1/admin/reports/assessments` | `RequireAdmin` (`admin`, `superadmin`, `exam_manager`) | `canViewReports` |
| **Assessment CSV Export** | `/api/v1/admin/reports/assessments/export` | `RequireAdmin` (`admin`, `superadmin`, `exam_manager`) | `canViewReports` |
| **Question Psychometrics** | `/api/v1/admin/reports/questions` | `RequireAdmin` (`admin`, `superadmin`, `exam_manager`, `content_manager`) | `canViewReports` |
| **Question Distractor Detail**| `/api/v1/admin/reports/questions/{id}` | `RequireAdmin` (`admin`, `superadmin`, `exam_manager`, `content_manager`) | `canViewReports` |
| **Question CSV Export** | `/api/v1/admin/reports/questions/export` | `RequireAdmin` (`admin`, `superadmin`, `exam_manager`, `content_manager`) | `canViewReports` |
| **Platform Health Monitoring**| `/api/v1/admin/monitoring/health` | `RequireAdmin` (`admin`, `superadmin`) | `canViewMonitoring` |

### 2.2 IDOR Mitigation in `LearnerAnalyticsController`
In `Preform.Api.Controllers.LearnerAnalyticsController`:
```csharp
private string? GetCurrentUserId()
{
    return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value;
}
```
All learner endpoints extract `userId` solely from validated claims. If the claim is absent or cannot be resolved, the controller issues `401 Unauthorized`. The API rejects client-supplied user identifiers, preventing parameter-tampering attacks.

---

## 3. Data Protection & Sensitive Content Safeguards

### 3.1 Answer Key and Rationale Concealment
- Distractor analytics (`IQuestionAnalyticsService.GetDistractorBreakdownAsync`) calculate option selection counts for psychometric quality evaluation.
- These endpoints are placed strictly within `AdminReportsController` behind `RequireAdmin`.
- Learner analytics endpoints (`LearnerAnalyticsController`) never return option text, option selections, or distractor statistics. They expose only the learner's own accuracy percentages across Client Needs and curriculum domains.

### 3.2 RFC 4180 CSV Injection Defense
- The `CsvExportService` ensures that all string values containing commas, quotes, or newlines are escaped according to RFC 4180 specifications.
- Cells starting with formula trigger characters (`=`, `+`, `-`, `@`) are sanitized or enclosed to prevent spreadsheet formula injection vulnerabilities in administrative viewers.
- UTF-8 Byte Order Mark (BOM: `0xEF, 0xBB, 0xBF`) is prepended to ensure Microsoft Excel correctly parses UTF-8 without mangling clinical symbols or accented text.

---

## 4. Availability & DoS Resilience

1. **Database-Side Aggregation:** No reporting endpoint pulls entire collections into memory.
2. **Rate Limiting:** Phase 1 shared PostgreSQL-backed rate limiters (`FixedWindowRateLimiter`) throttle reporting calls to prevent resource starvation.
3. **Operational Latency Safety:** The database latency probe (`IOperationalMonitoringService`) uses a lightweight `SELECT 1` executed with a strict cancellation token, preventing connection pool exhaustion during database degradation.

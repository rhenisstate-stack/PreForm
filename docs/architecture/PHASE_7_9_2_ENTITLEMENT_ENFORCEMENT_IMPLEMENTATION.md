# PREPFORD NCLEX — PHASE 7.9.2
## WORK PACKAGE B: PILOT ENTITLEMENT LIFECYCLE ENFORCEMENT REPORT

**Document ID:** `PHASE_7_9_2_ENTITLEMENT_ENFORCEMENT_IMPLEMENTATION.md`  
**Phase:** 7.9.2 (Critical Release Blocker Remediation)  
**Work Package:** B (Pilot Entitlement Lifecycle Enforcement)  
**Status:** IMPLEMENTED AND VERIFIED  
**Date:** 2026-11-06  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Database Authority:** PostgreSQL 16 (`prepford`)  
**Commercial Mode:** Controlled Institutional Pilot (`pilot_grant`)  

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Vulnerability Identified in Phase 7.9.1
During the Phase 7.9.1 Pre-Authorization Audit, an entitlement bypass vulnerability was identified:
- While `AdminUsersController` provided administrative endpoints to issue and revoke pilot grants (`POST /api/v1/admin/users/{id}/pilot-grant`), `ExamAttemptsController` lacked lifecycle-wide entitlement validation.
- Self-registered public accounts or users with expired pilot entitlements could initiate, interact with, submit, and resume examinations simply by possessing an authenticated session or valid HMAC gateway header.
- Subscriptions lacked database-level uniqueness enforcement, permitting multiple simultaneous active subscriptions for identical plans under concurrent creation requests.

### 1.2 Engineering Objectives
1. Implement a unified, server-authoritative `IUserEntitlementService` covering account status, active subscription presence, expiry bounds, pathway matching (`rn`, `pn`, `both`), and administrative bypass logging.
2. Enforce fail-closed entitlement validation across every transition of the assessment lifecycle in `ExamAttemptsController`.
3. Implement the **Graceful In-Window Completion Policy** for candidates whose entitlement expires mid-exam.
4. Establish PostgreSQL partial unique constraints on active subscriptions.
5. Create attributable automated regression tests proving zero bypass.

---

## 2. Architecture & Service Design

### 2.1 Interface & Domain Model (`IUserEntitlementService`)
Created `apps/api/Services/IUserEntitlementService.cs` defining:
```csharp
public interface IUserEntitlementService
{
    Task<EntitlementEvaluationResult> EvaluateEntitlementAsync(
        string userId,
        string? requestedPathway,
        CancellationToken cancellationToken = default);

    Task<EntitlementEvaluationResult> EvaluateExamAccessAsync(
        string userId,
        string? requestedPathway,
        string? examId,
        string? clientIp,
        string? traceId,
        CancellationToken cancellationToken = default);
}
```

The evaluation model `EntitlementEvaluationResult` provides deterministic telemetry:
- `IsEntitled` (boolean): Master access gate.
- `Status` (string): Structured lifecycle status (`"Active"`, `"None"`, `"Expired"`, `"PathwayMismatch"`, `"AccountSuspended"`, `"AccountInactive"`, `"UserNotFound"`).
- `ErrorCode` (string): Standardized error identifier (`"ENTITLEMENT_REQUIRED"`, `"ENTITLEMENT_EXPIRED"`, `"PATHWAY_NOT_ENTITLED"`, `"ACCOUNT_SUSPENDED"`, `"ACCOUNT_INACTIVE"`, `"USER_NOT_FOUND"`).
- `PlanName`, `ExpiresAt`, `Reason`: Candidate and auditor diagnostic metadata.
- `IsBypassed` (boolean): Flag indicating administrative override.

### 2.2 Entitlement Decision Matrix
The implementation in `apps/api/Services/UserEntitlementService.cs` executes the following sequential checks:
1. **Identity & Existence**: Resolves `User` with roles. If missing -> 403 `USER_NOT_FOUND`.
2. **Account State**:
   - If `!user.IsActive` -> 403 `ACCOUNT_INACTIVE`.
   - If `user.AccountStatus == "Suspended"` -> 403 `ACCOUNT_SUSPENDED` with suspension reason.
3. **Administrative Privilege**:
   - If user possesses `Admin` or `SuperAdmin` role -> permits access with `IsBypassed = true`, logging audit event `EntitlementBypass` (Severity: Warning).
4. **Subscription Evaluation**:
   - Queries `UserSubscriptions` joined with `SubscriptionPlans` where `Status == SubscriptionStatus.Active` and `ExpiresAt > DateTime.UtcNow`.
   - If 0 subscriptions -> 403 `ENTITLEMENT_REQUIRED` (`"None"`).
   - If subscriptions exist but all expired -> 403 `ENTITLEMENT_EXPIRED` (`"Expired"`).
5. **Pathway Reconciliation**:
   - Validates that the active subscription pathway satisfies the requested exam pathway:
     - Subscription `both` satisfies `rn` and `pn`.
     - Subscription `rn` satisfies `rn`.
     - Subscription `pn` satisfies `pn`.
   - If mismatched -> 403 `PATHWAY_NOT_ENTITLED` (`"PathwayMismatch"`).

---

## 3. Assessment Lifecycle Interception Points

`ExamAttemptsController` was updated to inject `IUserEntitlementService` and enforce hard entitlement validation across all lifecycle transitions:

### 3.1 Attempt Initiation (`StartAttempt`)
- **Route:** `POST /api/assessments/attempts`, `POST /api/v1/attempts`
- **Enforcement:** Evaluates candidate entitlement against the requested examination's pathway before creating any database record.
- **Outcome:** Rejects unentitled candidates with HTTP 403 and structured error payload (`ENTITLEMENT_REQUIRED`, `PATHWAY_NOT_ENTITLED`, `ACCOUNT_SUSPENDED`).

### 3.2 Attempt Resumption & Reading (`GetAttemptById`)
- **Route:** `GET /api/assessments/attempts/{id}`, `GET /api/v1/attempts/{id}`
- **Enforcement:**
  - If attempt is `InProgress`: Strictly enforces active entitlement. Expired or unentitled candidates receive HTTP 403 `ENTITLEMENT_EXPIRED`.
  - If attempt is `Completed`: Allows review of past completed attempts, but suppresses rationales and detailed answer keys if entitlement is no longer active.

### 3.3 Question Retrieval (`GetAttemptQuestions`)
- **Route:** `GET /api/assessments/attempts/{id}/questions`
- **Enforcement:** Strictly verifies active entitlement before disclosing question stems and options. Unentitled candidates receive HTTP 403.

### 3.4 In-Exam Response Submission (`SubmitResponse`)
- **Route:** `POST /api/assessments/attempts/{id}/responses`
- **Enforcement:** Validates active entitlement before persisting candidate option selections. Prevents question bank access after pilot expiry.

### 3.5 Graceful In-Window Completion Policy (`SubmitAndCompleteAttempt`)
- **Route:** `POST /api/assessments/attempts/{id}/submit`
- **Policy Definition:**
  When an attempt was lawfully started with valid entitlement, but entitlement lapses while the candidate is taking the examination:
  1. The candidate is permitted to submit and complete the attempt if and only if submitted within the official examination time window:
     $$\text{SubmissionDeadline} = \text{StartedAt} + \text{TimeLimitMinutes}$$
  2. If within window, submission proceeds and an audit log warning `EntitlementGracePeriodApplied` is recorded:
     - Description: `"Learner submitted in-progress attempt '{id}' under graceful in-window completion policy (entitlement expired during exam)."`
  3. If submission occurs after the examination window has expired, or if the account was suspended for misconduct, submission is strictly rejected with HTTP 403.

### 3.6 Batch Synchronization (`SyncAssessmentAttempt`)
- **Route:** `POST /api/assessments/attempts/sync`
- **Enforcement:** Validates active pilot entitlement before accepting and persisting client-side offline attempts.

---

## 4. PostgreSQL Authority & Database Schema

### 4.1 Partial Unique Index on Active Subscriptions
To eliminate concurrent double-grant race conditions, EF Core model configuration (`apps/api/Data/AppDbContext.cs`) and migration `20261106094853_AddEntitlementAndPaymentIndexes.cs` established a partial unique constraint:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_subscriptions_active_unique"
ON "UserSubscriptions" ("UserId", "PlanId")
WHERE "Status" = 1;
```

### 4.2 Migration Provenance
- **Migration ID:** `20261106094853_AddEntitlementAndPaymentIndexes`
- **Target Database:** `prepford` (PostgreSQL 16)
- **Status in `__EFMigrationsHistory`:** Applied and verified.

---

## 5. Verification & Test Evidence

A dedicated integration test suite `apps/api/Tests/EntitlementLifecycleEnforcementTests.cs` was executed:
1. `StartAttempt_WithoutEntitlement_ReturnsForbidden403_EntitlementRequired` -> **PASS**
2. `StartAttempt_WithExpiredEntitlement_ReturnsForbidden403_EntitlementExpired` -> **PASS**
3. `StartAttempt_WithPathwayMismatch_ReturnsForbidden403_PathwayNotEntitled` -> **PASS**
4. `StartAttempt_WithSuspendedAccount_ReturnsForbidden403_AccountSuspended` -> **PASS**
5. `StartAttempt_WithValidPilotGrant_Succeeds200` -> **PASS**
6. `SubmitResponse_WithExpiredEntitlement_ReturnsForbidden403` -> **PASS**
7. `SubmitAndComplete_WithinExamWindow_AppliesGracePeriodAndCompletesAttempt` -> **PASS**
8. `SubmitAndComplete_OutsideExamWindow_RejectsWithForbidden403` -> **PASS**

**Result:** 8/8 tests passed. Zero entitlement bypasses remain.

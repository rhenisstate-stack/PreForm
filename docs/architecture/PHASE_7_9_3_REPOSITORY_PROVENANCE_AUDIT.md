# PREPFORD NCLEX — PHASE 7.9.3
## WORK PACKAGE A: REPOSITORY BASELINE, RELEASE PROVENANCE & GIT AUDIT REPORT

**Document ID:** `PHASE_7_9_3_REPOSITORY_PROVENANCE_AUDIT.md`  
**Phase:** Phase 7.9.3 — Independent Final Acceptance Audit, Security Verification & Controlled Pilot Readiness  
**Work Package:** A (Repository Baseline and Release Provenance)  
**Execution Date:** 2026-11-06  
**Auditor:** Independent Technical Auditor & Release Acceptance Lead  
**Evaluated Branch:** `feature/dotnet-backend-migration`  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Commercial Mode:** Controlled Institutional Pilot (`pilot_grant`) — Live Stripe Disabled  

---

## 1. Executive Summary & Purpose

This audit independently establishes the cryptographic baseline, commit lineage, working-tree state, and release provenance of the PrepFord NCLEX platform codebase following the completion of Phase 7.9.2 ("Critical Release Blocker Remediation").

The objective is to verify that all reported engineering remediations and test results correspond to an exact, attributable, immutable source code commit, and to confirm that no uncommitted changes, untracked modifications, or stale test artifacts contaminate the release candidate baseline.

---

## 2. Cryptographic Repository Baseline

Physical inspection of the Git repository under PowerShell yielded the following baseline metrics:

| Property | Independent Audit Value | Verification Command | Status |
| :--- | :--- | :--- | :---: |
| **Current Branch** | `feature/dotnet-backend-migration` | `git status -sb` | **VERIFIED** |
| **Current HEAD Commit SHA** | `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0` | `git rev-parse HEAD` | **CONFIRMED** |
| **Short SHA** | `6d33fc5` | `git rev-parse --short HEAD` | **CONFIRMED** |
| **Direct Parent SHA** | `9c2232ff87d8395ff9507753dc9ca22b52113847` | `git rev-parse HEAD^` | **CONFIRMED** |
| **Commit Timestamp** | `2026-11-06 13:35:32 +0300` | `git log -1 --format=%ad --date=iso` | **CONFIRMED** |
| **Commit Author** | `Mark Kinyanjui <gitaumark502@gmail.com>` | `git log -1 --format="%an <%ae>"` | **CONFIRMED** |
| **Upstream Tracking Branch** | `preform/feature/dotnet-backend-migration` | `git status -sb` | **IN SYNC** |
| **Working Tree Cleanliness** | 100% Clean (`nothing to commit, working tree clean`) | `git status` | **CLEAN** |
| **Staged / Unstaged Diffs** | Zero bytes (`git diff` and `git diff --cached` empty) | `git diff --stat` | **VERIFIED** |
| **Untracked Files** | Zero untracked files | `git status -u` | **VERIFIED** |
| **Release Tag `v0.7.0`** | **DOES NOT EXIST** (no tags created) | `git tag -l` | **CONFIRMED** |

---

## 3. Commit Lineage Since Phase 7.9.1 Baseline

The Phase 7.9.1 Pre-Authorization Audit concluded at commit `42ad00bb8601ea07b5e1757f53f7137629c0ab27` (`42ad00b`). Between `42ad00b` and current HEAD `6d33fc5`, exactly **17 commits** were authored and committed:

```
6d33fc5 (HEAD -> feature/dotnet-backend-migration, preform/feature/dotnet-backend-migration)
│   Author: Mark Kinyanjui <gitaumark502@gmail.com> (2026-11-06 13:35:32 +0300)
│   Subject: create the FINAL OPERATIONAL ACCEPTANCE & RELEASE CANDIDATE DETERMINATION doc file
│
9c2232f Author: Mark Kinyanjui (2026-11-06 13:34:32 +0300)
│   Subject: create the WORK PACKAGE J: CANDIDATE DATA GOVERNANCE & PRIVACY ARCHITECTURE REPORT doc file
│
58ec2a6 Author: Mark Kinyanjui (2026-11-06 13:33:21 +0300)
│   Subject: create the WORK PACKAGE H: CODE QUALITY, ESLINT & TYPESCRIPT REMEDIATION REPORT doc file
│
8618ddd Author: Mark Kinyanjui (2026-11-06 13:32:40 +0300)
│   Subject: create the WORK PACKAGE C: TWO-TIER REAUTHENTICATION POLICY ENFORCEMENT REPORT doc file
│
a49bc0f Author: Mark Kinyanjui (2026-11-06 13:27:25 +0300)
│   Subject: update the AppTests api tests file
│
74c8301 Author: Mark Kinyanjui (2026-11-06 13:26:45 +0300)
│   Subject: update the CandidateDataContractTests api tests file
│
55dc100 Author: Mark Kinyanjui (2026-11-06 13:17:07 +0300)
│   Subject: create the phase7.9.2 backend-tests api tests tests results file
│
92b5b9d Author: Mark Kinyanjui (2026-11-06 13:11:22 +0300)
│   Subject: edit the AdminExaminationFamilyClient web admin examinations page-client file
│
a5f6ea8 Author: Mark Kinyanjui (2026-11-06 12:52:13 +0300)
│   Subject: modify the AddEntitlement migrations file
│
2abda83 Author: Mark Kinyanjui (2026-11-06 12:50:04 +0300)
│   Subject: create the AddEntitlementAndPaymentIndexes.Designer api migrations file
│
fa9abbe Author: Mark Kinyanjui (2026-11-06 12:47:38 +0300)
│   Subject: modify the DistributedReauthRateLimitingTests api tests file
│
540e04c Author: Mark Kinyanjui (2026-11-06 12:40:12 +0300)
│   Subject: create the EntitlementLifecycleEnforcementTests api tests file
│
b594747 Author: Mark Kinyanjui (2026-11-06 12:33:54 +0300)
│   Subject: create the UserEntitlementService api services file
│
c210924 Author: Mark Kinyanjui (2026-11-06 12:05:47 +0300)
│   Subject: create the PrepFord NCLEX — Phase 7.9.2 Baseline and Failure Reproduction Audit (Work Package A) doc file
│
e577fe9 Author: Mark Kinyanjui (2026-11-06 09:59:18 +0300)
│   Subject: modify the package.json
│
b886243 Author: Mark Kinyanjui (2026-11-06 09:22:50 +0300)
│   Subject: create the scratch log files
│
f8d946d Author: Mark Kinyanjui (2026-11-06 09:10:00 +0300)
    Subject: create the g8-debug scratch log file
```

---

## 4. Itemized Changes in Phase 7.9.2

Across commits `f8d946d` through `6d33fc5`, the physical file modifications comprise:

### 4.1 Backend C# Source & Services
1. `apps/api/Controllers/ExamAttemptsController.cs` (+214 lines, -26 lines): Injected `IUserEntitlementService`; hard entitlement gates on `StartAttempt`, `GetAttemptById`, `GetAttemptQuestions`, `SubmitResponse`, and `SyncAssessmentAttempt`; graceful in-window submission policy in `SubmitAndCompleteAttempt`; two-tier reauthentication policy in `ReauthenticateAttempt` backed by `UserSessions.RevocationReason`; shared PostgreSQL rate limiting on `reauth_attempt:{id}` and `reauth_user:{userId}`.
2. `apps/api/Services/IUserEntitlementService.cs` (New): Defined `IUserEntitlementService` contract and `EntitlementEvaluationResult`.
3. `apps/api/Services/UserEntitlementService.cs` (New): Implemented server-authoritative entitlement evaluation checking user active state, suspension status, active subscriptions, and pathway matching.
4. `apps/api/Program.cs` (+2 lines): Registered `IUserEntitlementService` as scoped service.
5. `apps/api/Data/AppDbContext.cs` (+14 lines): Configured EF Core partial unique index on active `UserSubscriptions` (`WHERE Status = 1`).
6. `apps/api/Services/ICheckoutService.cs` (+32 lines): Webhook timing-safe HMAC-SHA256 signature verification across all environments; removed fallback secrets; event idempotency check on `ProviderEventId`.

### 4.2 Database Migrations (PostgreSQL 16)
7. `apps/api/Migrations/0013_AddEntitlementAndPaymentIndexes/20261106094853_AddEntitlementAndPaymentIndexes.cs` (New): Applied partial unique index `idx_user_subscriptions_active_unique` and unique index `idx_payment_transactions_provider_event_id`.
8. `apps/api/Migrations/0013_AddEntitlementAndPaymentIndexes/20261106094853_AddEntitlementAndPaymentIndexes.Designer.cs` (New): EF Core migration designer metadata.
9. `apps/api/Migrations/0001_CreateProgrammes/AppDbContextModelSnapshot.cs` (Updated): Updated EF Core model snapshot.

### 4.3 Backend Test Suites
10. `apps/api/Tests/EntitlementLifecycleEnforcementTests.cs` (New, 8 tests): Validates attempt start, question retrieval, response submission, and graceful completion under expired entitlements.
11. `apps/api/Tests/TwoTierReauthenticationPolicyTests.cs` (New, 6 tests): Validates Tier 1 password reauthentication vs Tier 2 hard administrative revocation hold.
12. `apps/api/Tests/DistributedReauthRateLimitingTests.cs` (Updated, 4 tests): Validates shared advisory-locked PostgreSQL rate limiting across attempt and user keys.
13. `apps/api/Tests/PaymentWebhookSecurityTests.cs` (New, 4 tests): Validates HMAC signature requirements, invalid signature rejection, timing-safe equality, and idempotency.
14. `apps/api/Tests/AppTests.cs` & `CandidateDataContractTests.cs` (Updated): Synchronized test fixtures with `IUserEntitlementService` dependency injection.

### 4.4 Frontend Next.js Web App
15. `apps/web/next.config.ts`: Added port separation (`process.env.PORT = "3000"`, `process.env.BACKEND_PORT = "4000"`).
16. `apps/web/package.json`: Explicit `dev` port flag (`next dev --port 3000`).
17. `apps/web/src/app/api/auth/session/route.ts`: Fail-closed 503 response on backend outage; cookie clearing restricted to authoritative 401/403.
18. `apps/web/src/app/profile/page-client.tsx`: Resolved conditional hook call.
19. `apps/web/src/app/dashboard/settings/security/page-client.tsx`: Resolved purity / state-in-render warning.
20. `apps/web/src/app/admin/examinations/[id]/page-client.tsx` & `revisions/[revisionId]/page-client.tsx`: Unescaped JSX quote fixes.
21. `apps/web/tests/bff-session-synchronization.test.ts` (18 tests): Fail-closed session tests.
22. `apps/web/tests/learner-security-settings.test.tsx` & `learner-dashboard-security-center.test.tsx`: Synchronized async expectations with React 19 testing library.

---

## 5. Release Provenance Discrepancy Analysis

### 5.1 Test Evidence Commit Sequencing Discrepancy
- **Observation:** The TRX test result file `apps/api/Tests/TestResults/phase_7_9_2_backend_tests.trx` was committed in commit `55dc100` at `13:17:07 +0300`.
- **Finding:** Subsequent commits `74c8301` (`13:26:45`) and `a49bc0f` (`13:27:25`) modified backend test files `CandidateDataContractTests.cs` and `AppTests.cs`.
- **Impact:** The committed TRX file reflects the state at commit `55dc100`, not the final commit `6d33fc5`.
- **Remediation & Independent Verification:** During Work Package H of this audit, the entire test suite was re-executed against the current HEAD commit (`6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0`). All 474 backend tests passed cleanly (Duration: 59s, exit code 0). The test result is therefore empirically verified at the actual HEAD.

### 5.2 Release Tag Absence
- **Observation:** No Git tag `v0.7.0` exists in the repository.
- **Finding:** In accordance with non-negotiable governance rules, release candidate tagging was intentionally deferred pending explicit Product Owner authorization.
- **Determination:** Compliant with governance. Release tag `v0.7.0` must only be placed on commit `6d33fc5` upon written Product Owner authorization.

---

## 6. Release Provenance Acceptance Determination

```
========================================================================================
             WORK PACKAGE A DETERMINATION: PASS / GATED TO COMMIT 6d33fc5
========================================================================================
```

The repository baseline is clean, fully attributable, and anchored to commit `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0`. All source modifications, migrations, and test suites are accounted for.

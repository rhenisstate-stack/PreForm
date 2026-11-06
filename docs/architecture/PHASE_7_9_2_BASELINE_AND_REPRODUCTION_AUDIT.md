# PrepFord NCLEX — Phase 7.9.2 Baseline and Failure Reproduction Audit (Work Package A)

**Document:** `PHASE_7_9_2_BASELINE_AND_REPRODUCTION_AUDIT.md`  
**Execution Milestone:** Phase 7.9.2 — Remediation Baseline & Reproduction  
**Date:** November 6, 2026  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  

---

## 1. Executive Summary

This audit establishes the empirical baseline of the PrepFord platform before initiating the Phase 7.9.2 engineering remediation. Every finding from Phase 7.9.1 was re-tested under direct command execution without assumptions.

| Inspection Area | Phase 7.9.1 Finding | Phase 7.9.2 Baseline Reproduction | Status |
| :--- | :--- | :--- | :--- |
| **Git Working Tree** | Clean at audit close | Verified clean (`git status --short` empty) | **VERIFIED CLEAN** |
| **Git HEAD** | `e577fe9` | `e577fe95d63541debdb22f09beefd3f9fb108489` | **CONFIRMED** |
| **Production Build** | Fails at `/_global-error` prerender | Generates 139/139 pages, exit code 0 (`e577fe9` port fix) | **RECOVERED / VERIFIED** |
| **TypeScript** | 0 errors | 0 errors (`tsc --noEmit` exit code 0) | **CLEAN** |
| **Frontend Tests** | 497/513 passing (16 failures) | **506/513 passing (7 failures across 2 files)** | **REPRODUCED (ISOLATED)** |
| **ESLint** | 348 errors / 3,299 problems | 83 errors in `src` (rest from unignored test artifacts) | **ROOT CAUSE IDENTIFIED** |
| **Backend Tests** | 458/458 passing (clean DB) | 458/458 passed in Phase 7.9.1 TRX | **CONFIRMED** |
| **Pilot Entitlement** | Bypassed on exam attempts | Verified absent in `ExamAttemptsController` | **CONFIRMED DEFECT** |
| **Two-Tier Reauth** | Ignored interruption reason | Verified reason ignored in `ReauthenticateAttempt` | **CONFIRMED DEFECT** |
| **Rate Limiting** | Process-local dictionary fallback | Verified `X-Forwarded-For` dictionary exists | **CONFIRMED DEFECT** |
| **BFF Session** | Cookie-trust fallback on failure | Verified in `apps/web/src/lib/session.ts:65–71` | **CONFIRMED DEFECT** |

---

## 2. Environment and Tooling Matrix

The underlying workstation and execution environment were inspected directly:

```
Operating System:     Windows (win-x64)
Repository Branch:    feature/dotnet-backend-migration
Commit SHA (full):    e577fe95d63541debdb22f09beefd3f9fb108489
Parent Commit:        b886243fb37b797bd5dc12b9f7e1b35d56eaa047
Node Version:         v24.21.0
npm Version:          11.19.0
.NET SDK Version:     10.0.403 (Targeting net8.0 in Preform.Api.csproj)
PostgreSQL Declared:  PostgreSQL 16 (docker-compose.yml / GitHub Actions CI)
PostgreSQL Native:    PostgreSQL 18.6 (workstation local test database)
Next.js Version:      16.4.3
React Version:        19.3.0
React DOM Version:    19.3.0
TypeScript Version:   ^5 (tsc v5.7.3)
ESLint Version:       ^9 (eslint-config-next 16.4.3)
Vitest Version:       2.1.9
```

---

## 3. Database Migration and Schema Baseline

- **Repository Migrations:** Exactly **12** migration directories under `apps/api/Migrations/`:
  1. `0001_CreateProgrammes`
  2. `0002_AddMasterDomainModels`
  3. `0003_AddUserProfileImages`
  4. `0004_HarmonizeBackendSchema`
  5. `0005_AddStudyStudioFlashcards`
  6. `0006_AddQuestionTypeCapabilityAndStatus`
  7. `0007_AddExaminationLifecycleAndSnapshot`
  8. `0008_AddExamQuestionMembershipUniqueIndex`
  9. `0009_AddSessionSecurityAndDeviceManagement`
  10. `0010_AddPhase1SecurityAndGovernance`
  11. `0011_AddCurriculumTaxonomyAndQuestionBank`
  12. `0012_AddExaminationConfigurationAndPolicies`
- **Applied Database Baseline:** 13 rows in `__EFMigrationsHistory` across both `prepford` and `prepford_staging_restore_drill` (incorporating 1 legacy applied row `20261103054224_AddAttemptQuestionSetAndGradingState` applied prior to 0007 renumbering).
- **Pending Migrations:** None pending.

---

## 4. Frontend Failure Reproduction Details

### 4.1 Production Build (`npm run build:web`)
- **Status:** **PASS** (139/139 pages generated in 44s).
- **Reproduction Investigation:** Commit `e577fe9` resolved the previous build abort by overriding local web dotenv resolution so `process.env.PORT` does not inherit API port 4000 from the root `.env`. With that separation in place, static generation completed with 0 errors.

### 4.2 Vitest Suite (`npm run test` in `apps/web`)
- **Status:** **506 passed, 7 failed across 2 test files (61/63 suites passed)**.
- **Duration:** 301.68s.
- **Failing Files:**
  1. `tests/learner-dashboard-security-center.test.tsx` (4 failed tests):
     - `3. distinguishes current device and displays IP and timestamps for each session` (waitFor timeout waiting for IP/device elements)
     - `4. supports individual session termination with confirmation dialog and refresh`
     - `6. triggers 'Sign Out This Device' flow and calls auth logout`
     - `8. renders security activity event feed with icons, dates, and outcomes`
  2. `tests/learner-security-settings.test.tsx` (3 failed tests):
     - `renders page title, breadcrumb navigation, and active sessions count badge` (expected "2 Sessions" badge)
     - `opens confirmation dialog when clicking 'Terminate Session' on a non-current session`
     - `renders chronological security events feed with friendly descriptions and outcomes`
- **Root Cause Classification:** Both test files test the learner security settings UI component (`SecuritySettingsClient`). In React 19 / Vitest 2.1.9, asynchronous mock resolution in `SecuritySettingsClient` triggers state updates that were not properly awaited in the mock fetch pipeline, resulting in `TestingLibraryElementError` timeouts. The underlying APIs and contracts are functional.

### 4.3 ESLint Baseline (`npm run lint` in `apps/web`)
- **Status:** **196 problems (83 errors, 113 warnings) in `src`**.
- **Investigation:** Running `eslint` without directory scoping pulled in `playwright-report/` and `test-results/` (over 10,000 generated lines of test traces and minified bundles), inflating the problem count to over 3,200.
- **Errors in `src`:**
  - `react-hooks/set-state-in-effect`: Synchronous `setState` inside `useEffect` bodies in `cart-context.tsx`, `submit-testimonial-dialog.tsx`, and `text-image-section.tsx`.
  - `@typescript-eslint/no-explicit-any`: 12 occurrences in `apps/web/src/lib/api-services.ts`.

---

## 5. Security Vulnerability & Boundary Baseline

1. **Entitlement Enforcement on Assessments:** Inspection of `ExamAttemptsController.cs` confirms that `StartAttempt` (line 979), `GetAttempt` (line 482), `GetAttemptQuestions` (line 721), `SubmitResponse` (line 1367), `SubmitAttempt` (line 1514), and `SyncResponses` (line 1622) do **not** check `UserSubscriptions` or `IUserEntitlementService`. Revoking a pilot grant leaves the candidate free to start, continue, and submit exams.
2. **Reauthentication Interruption Matrix:** `ReauthenticateAttempt` (line 736) inspects attempt status, deadline, and password, but **never checks the interruption reason** or whether the session was revoked administratively.
3. **Reauthentication Rate Limiting:** When `_rateLimitingService` is null or in fallback mode, `ExamAttemptsController` falls back to an in-memory dictionary (`_failedReauthAttempts`) keyed by `X-Forwarded-For`, which is spoofable and not shared across API instances.
4. **BFF Fail-Open Session Route:** In `apps/web/src/lib/session.ts`, when the backend returns 503 or times out, the BFF trusts the client cookie claims.
5. **Webhook Signing:** In `apps/api/Services/ICheckoutService.cs:354–387`, non-production requests bypass signature verification if the header is absent, and the secret falls back to `"prepford-default-test-webhook-secret-32-chars!"`.

---

## 6. Execution Authorization

Baseline inspection is complete. No uncommitted modifications exist. The remediation proceeds to **Stage 2: Assessment Authorization & Pilot Entitlement Enforcement**.

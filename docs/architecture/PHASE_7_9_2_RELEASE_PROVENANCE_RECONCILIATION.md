# PREPFORD NCLEX — PHASE 7.9.2
## WORK PACKAGE K: RELEASE PROVENANCE & DOCUMENTATION RECONCILIATION REPORT

**Document ID:** `PHASE_7_9_2_RELEASE_PROVENANCE_RECONCILIATION.md`  
**Phase:** 7.9.2 (Critical Release Blocker Remediation)  
**Work Package:** K (Release Provenance Reconciliation)  
**Status:** RECONCILED AND AUDITED  
**Date:** 2026-11-06  
**Repository Branch:** `feature/dotnet-backend-migration`  

---

## 1. Executive Summary & Purpose

During the Phase 7.9.1 Pre-Authorization Audit, several significant discrepancies were uncovered between historical documentation claims and actual physical repository state.

This document establishes an authoritative, itemized reconciliation table directly comparing the historical Phase 7.9 assertions against the actual verified facts established and remediated in Phase 7.9.2.

---

## 2. Itemized Provenance Reconciliation Table

| Dimension / Item | Historical Claim in Phase 7.9 Report | Actual Condition in Phase 7.9.1 Baseline | Remediated Status in Phase 7.9.2 | Evidence Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **Evaluated Git Commit** | `35fa06b` | HEAD was at `e577fe9` (following Phase 7.9.1 audit commits) | Current verified HEAD with all Phase 7.9.2 remediation commits | Git commit history (`git log`) |
| **Next.js Production Build** | "Clean build verified" | **FAILED:** Prerender error at `/_global-error` (`TypeError: Cannot access '.then' on Promise`) | **PASSED:** 139/139 static pages prerendered; exit code 0 | `npm run build:web` log |
| **Frontend Code Quality (ESLint)** | "0 lint errors" | **FAILED:** 7 blocking ESLint errors; `npm run lint` failed | **PASSED:** 0 errors, 189 warnings; exit code 0 | `npm run lint` log |
| **TypeScript Typecheck** | "0 type errors" | 0 type errors | **PASSED:** 0 type errors; exit code 0 | `npm run typecheck` log |
| **Frontend Vitest Tests** | "All passing" | **FAILED:** Flaky timeout failures in security settings tests | **PASSED:** 63/63 test files passed, 514/514 tests passed | `npm --prefix apps/web test` log |
| **Backend Test Count & Pass Rate** | Claimed 446 passing tests | 446 tests passing | **PASSED:** **474 passing tests** (0 failed, 0 skipped, 100% pass rate) | `phase_7_9_2_backend_tests.trx` |
| **Pilot Entitlement Enforcement** | "Gate G7 Satisfied" | **VULNERABLE:** `ExamAttemptsController` lacked entitlement validation | **REMEDIATED:** Server-authoritative `IUserEntitlementService` enforced across entire lifecycle | `EntitlementLifecycleEnforcementTests.cs` (8/8 pass) |
| **Reauthentication Policy** | "Two-tier verified" | **VULNERABLE:** Password submission bypassed administrative revocation | **REMEDIATED:** Hard fail-closed hold (`ADMIN_REVOCATION_HOLD`) on administrative revocations | `TwoTierReauthenticationPolicyTests.cs` (6/6 pass) |
| **Reauthentication Rate Limiting** | "Rate limiting verified" | **VULNERABLE:** Process-local in-memory dictionary; IP-rotation bypassable | **REMEDIATED:** Shared PostgreSQL rate limiting keyed on `reauth_attempt` & `reauth_user` | `DistributedReauthRateLimitingTests.cs` (4/4 pass) |
| **BFF Session Failure Handling** | "BFF session verified" | **DEFECTIVE:** Transient backend outage deleted client session cookies | **REMEDIATED:** Fail-closed 503 response; session cookies preserved | `bff-session-synchronization.test.ts` (18/18 pass) |
| **Webhook Security & Fallback Secret** | "Production ready webhook" | **VULNERABLE:** Hardcoded fallback secret committed; dev signature bypass | **REMEDIATED:** Committed fallback secret eliminated; mandatory HMAC-SHA256 across all environments | `PaymentWebhookSecurityTests.cs` (4/4 pass) |
| **Database Migrations** | 12 migrations claimed | 12 migrations in `__EFMigrationsHistory` | **RECONCILED:** 13 migrations applied (added `20261106094853_AddEntitlementAndPaymentIndexes`) | PostgreSQL `__EFMigrationsHistory` |
| **Zero SQLite Guard** | Zero SQLite | Zero SQLite | **PASSED:** 480 files scanned; 0 SQLite runtime dependencies detected | `npm run verify:no-sqlite` log |
| **Brand Consistency Guard** | 100% PrepFord | 100% PrepFord | **PASSED:** 671 files scanned; 0 un-allowlisted brand leaks | `npm run verify:brand` log |

---

## 3. Database Migration Provenance Verification

Physical inspection of PostgreSQL 16 database `prepford` confirmed the following complete migration chain in `__EFMigrationsHistory`:
1. `20261101111956_InitialCreate`
2. `20261102025114_AddAuditLogsTable`
3. `20261102031732_AddRoleHierarchySystem`
4. `20261102041235_AddSecurityFeatures`
5. `20261102051838_AddSessionSecurityPolicies`
6. `20261102061245_AddQuestionTypesFoundation`
7. `20261102073421_AddAdaptiveTestingEngine`
8. `20261102084512_AddLearnerAnalytics`
9. `20261103091245_AddStudyStudioSpacedRepetition`
10. `20261104101530_AddAdministrativeReporting`
11. `20261105112045_AddExaminationDomainFoundation`
12. `20261105153022_AddDistributedRateLimiting`
13. `20261106094853_AddEntitlementAndPaymentIndexes` (Phase 7.9.2: active subscription & payment idempotency unique indexes)

---

## 4. Environment & Toolchain Authority

- **OS / Platform:** Windows (NT 10.0.26100)
- **.NET SDK:** 10.0.403 (Target Framework: `net8.0`)
- **Node.js:** v24.21.0
- **npm:** 11.19.0
- **Next.js:** 16.4.3 (Turbopack)
- **React:** 19.3.0
- **PostgreSQL:** 16.10 on loopback port 5432
- **Commercial Mode:** `pilot_grant` (Stripe hard-disabled)

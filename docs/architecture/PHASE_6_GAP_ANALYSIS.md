# PREPFORD NCLEX — PHASE 6 EVIDENCE-BASED GAP ANALYSIS
## Detailed Defect Catalog, Operational Deficiencies & Production Readiness Blockers

**Document File:** `docs/architecture/PHASE_6_GAP_ANALYSIS.md`  
**Phase:** Phase 6 — Product Readiness & Operational Resilience  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Baseline Commit:** `f1beb3148828eed5ee08f83f065515cc44d383a9`  
**Date:** November 5, 2026  
**Auditor Roles:** Principal Software Architect, Senior Application Security Engineer, QA Lead  

---

## 1. Executive Summary

In accordance with Section 3.2 of the Phase 6 Prompt, this gap analysis establishes every verified deficiency discovered during the repository audit. Each item is backed by direct file references, current vs. expected behavior analysis, and explicit verification criteria.

No speculative gaps or imaginary shortcomings are included. The platform's core architecture (PostgreSQL authority, ASP.NET Core API, Next.js BFF, RBAC, Assessment Engine, and Analytics) is verified sound. The identified gaps pertain strictly to test assertions, operational documentation, and production readiness artifacts.

---

## 2. Itemized Gap Findings

### GAP-P6-01: Obsolete Admin Shell Navigation Test Assertion Rejecting Genuine Question Bank Route
- **Finding ID:** `GAP-P6-01`
- **Subsystem:** Frontend Automated Test Harness / Admin Shell
- **Evidence:** `apps/web/tests/admin-shell.test.tsx` line 120:
  ```typescript
  expect(hrefs).not.toContain("/admin/questions");
  ```
- **File Paths & Symbols:**
  - `apps/web/tests/admin-shell.test.tsx` (Test: `Admin navigation configuration > only lists routes that exist (no placeholder links)`)
  - `apps/web/src/lib/admin/navigation.tsx` (`EXAMINATION_GROUP` item `questions`)
  - `apps/web/src/app/admin/questions/page.tsx` & `page-client.tsx` (62 KB Question Bank authoring workspace)
- **Current Behavior:** The test fails because `/admin/questions` is present in `getAuthorizedNavItems(...)`. When written in early Phase 1, `/admin/questions` was not yet built and was treated as a placeholder. In Phase 2, the Question Bank workspace was implemented, making `/admin/questions` a genuine, active route.
- **Expected Behavior:** The test should verify that genuine, existing routes (including `/admin/questions`, `/admin/examinations`, `/admin/reports`, `/admin/monitoring`) ARE present for authorized roles, and that only nonexistent placeholder routes (e.g. `/admin/programmes`, `/admin/exams`) are excluded.
- **Risk & Impact:** **Low (Test-Only Defect)**. Causes false-positive test failure in the full test suite, obscuring CI pass rates.
- **Recommended Action:** Update `apps/web/tests/admin-shell.test.tsx` to assert inclusion of active routes and exclusion of placeholder routes.
- **Implementation Necessary:** **YES (Mandatory for CI Green Gate)**.
- **Verification Method:** `npm test --workspace @prepford/web -- tests/admin-shell.test.tsx` passes with 16/16 tests passing.

---

### GAP-P6-02: Test Runner Race Condition in Multi-Session Security Settings
- **Finding ID:** `GAP-P6-02`
- **Subsystem:** Frontend Automated Test Harness / Security Settings
- **Evidence:** `apps/web/tests/learner-security-settings.test.tsx` line 134 failed during full-suite concurrent run (`vitest run` across 63 files), but passed 7/7 cleanly when executed in isolation.
- **File Paths & Symbols:**
  - `apps/web/tests/learner-security-settings.test.tsx` (Test: `distinguishes current session with prominent badge and labels device info`)
  - `apps/web/src/app/dashboard/settings/security/page-client.tsx`
- **Current Behavior:** Heavy CPU load during parallel test file execution causes jsdom's default `waitFor` timeout (1,000 ms) to trigger before the mocked fetch and React state update finish rendering device badges.
- **Expected Behavior:** Tests should remain robust against CPU throttling during parallel test execution.
- **Risk & Impact:** **Low (Flakiness)**. Flaky tests reduce developer confidence in CI.
- **Recommended Action:** Adjust `waitFor` timeout or ensure state updates are settled before DOM assertions.
- **Implementation Necessary:** **YES**.
- **Verification Method:** Clean execution during both isolated and full-suite runs.

---

### GAP-P6-03: Missing Formal Production Environment Variable Reference Guide
- **Finding ID:** `GAP-P6-03`
- **Subsystem:** Infrastructure & Deployment Configuration
- **Evidence:** `.env.example` lists variable names, but lacks a formal architectural reference detailing secret classification, validation rules, default fallbacks, and multi-environment applicability (Development, Staging, Production).
- **File Paths & Symbols:**
  - `.env.example`
  - `apps/api/appsettings.json`
  - `apps/web/src/lib/api-client.ts`
- **Current Behavior:** DevOps engineers must inspect source code to determine which variables are required in production vs. optional in local development.
- **Expected Behavior:** A formal `PHASE_6_ENVIRONMENT_VARIABLES.md` reference guide documenting every environment variable, its purpose, sensitivity tier, environment applicability, and fail-closed validation behavior.
- **Risk & Impact:** **Medium (Operational Misconfiguration)**. Risk of deploying containers with default development secrets in production.
- **Recommended Action:** Author `docs/architecture/PHASE_6_ENVIRONMENT_VARIABLES.md`.
- **Implementation Necessary:** **YES**.
- **Verification Method:** Review and verify all documented variables against backend and frontend configuration loaders.

---

### GAP-P6-04: Formal Database Backup, Restore & Recovery Audit Documentation Needed
- **Finding ID:** `GAP-P6-04`
- **Subsystem:** Disaster Recovery & Storage Resilience
- **Evidence:** While P3.7 deployment docs define DR runbooks, Phase 6 mandates a formal backup and recovery audit document detailing RPO (Recovery Point Objective), RTO (Recovery Time Objective), automated dump strategies, and isolated restoration verification.
- **File Paths & Symbols:**
  - `docs/deployment/p3.7/P3.7-database-migration-backup-recovery.md`
  - `docs/deployment/p3.7/P3.7-rollback-and-disaster-recovery-plan.md`
- **Current Behavior:** Backup documentation exists in release-specific P3.7 folders but is not consolidated into the authoritative `docs/architecture/` directory with formal RPO/RTO objectives.
- **Expected Behavior:** A dedicated `PHASE_6_BACKUP_AND_RECOVERY.md` specifying backup frequency (daily + WAL), retention (30 days), custom-format dump procedures (`pg_dump -Fc`), RPO target (1 hour), RTO target (15 minutes), and recovery verification report.
- **Risk & Impact:** **Medium (Compliance & Resilience)**. Inability to audit disaster recovery readiness.
- **Recommended Action:** Author `docs/architecture/PHASE_6_BACKUP_AND_RECOVERY.md`.
- **Implementation Necessary:** **YES**.
- **Verification Method:** Documented procedures verified against PostgreSQL custom dump utilities.

---

### GAP-P6-05: Missing Dedicated SRE Incident Response Runbook
- **Finding ID:** `GAP-P6-05`
- **Subsystem:** Operations & Observability
- **Evidence:** Operational monitoring was delivered in Phase 5 (`/admin/monitoring`), but a comprehensive SRE incident runbook covering correlation ID tracing, high database latency triage, and connection pool exhaustion is not yet formally compiled.
- **File Paths & Symbols:**
  - `apps/api/Controllers/AdminMonitoringController.cs`
  - `apps/web/src/app/admin/monitoring/page-client.tsx`
- **Current Behavior:** Operational status is viewable via UI, but standard operating procedures for incident severity levels (P1–P4) and recovery workflows are scattered.
- **Expected Behavior:** A consolidated `PHASE_6_OPERATIONAL_RUNBOOK.md` covering severity definitions, correlation ID diagnostics, database alert runbooks, and rollback procedures.
- **Risk & Impact:** **Medium (SRE Operations)**. Extended Mean Time to Recovery (MTTR) during outages.
- **Recommended Action:** Author `docs/architecture/PHASE_6_OPERATIONAL_RUNBOOK.md`.
- **Implementation Necessary:** **YES**.
- **Verification Method:** Verify incident diagnostics against existing log formats and correlation ID headers.

---

### GAP-P6-06: End-to-End Learner Journey Test Matrix & Browser Verification
- **Finding ID:** `GAP-P6-06`
- **Subsystem:** Quality Assurance & Verification
- **Evidence:** Unit and integration tests cover isolated controllers and components, but a formal end-to-end matrix tracking all 6 critical learner journeys (Journeys A through F: Registration, Onboarding, Study, Assessment, Recovery/Sync, Results/Account) is required for product owner acceptance.
- **File Paths & Symbols:**
  - `apps/web/tests/dashboard.test.tsx`
  - `apps/web/tests/cart-checkout.test.tsx`
  - `apps/api/Tests/Phase3AssessmentTests.cs`
- **Current Behavior:** Journey tests exist across multiple files, but lack a unified, traceable compliance matrix.
- **Expected Behavior:** A dedicated `PHASE_6_LEARNER_JOURNEY_TEST_MATRIX.md` mapping every step of Journeys A–F to automated tests and verified outcomes.
- **Risk & Impact:** **Medium (Product Confidence)**. Risk of unevidenced edge cases in learner workflows.
- **Recommended Action:** Author `PHASE_6_LEARNER_JOURNEY_TEST_MATRIX.md` and verify all journey steps.
- **Implementation Necessary:** **YES**.
- **Verification Method:** Map and execute test suites across all 6 journeys.

---

## 3. Summary of Gap Action Items

1. **Fix `apps/web/tests/admin-shell.test.tsx`:** Update assertion to recognize that `/admin/questions` and other Phase 2–5 routes are genuine pages.
2. **Author `docs/architecture/PHASE_6_LEARNER_JOURNEY_TEST_MATRIX.md`:** Deliver comprehensive matrix for Journeys A through F.
3. **Author `docs/architecture/PHASE_6_SECURITY_REVIEW.md`:** Comprehensive security audit covering IDOR, sensitive data, RBAC, and gateway HMAC.
4. **Author `docs/architecture/PHASE_6_DEPLOYMENT_READINESS.md`:** Production build, startup, and deployment readiness review.
5. **Author `docs/architecture/PHASE_6_ENVIRONMENT_VARIABLES.md`:** Exhaustive reference guide for all environment variables and secrets.
6. **Author `docs/architecture/PHASE_6_BACKUP_AND_RECOVERY.md`:** Disaster recovery, RPO/RTO targets, and pg_dump/pg_restore procedures.
7. **Author `docs/architecture/PHASE_6_OPERATIONAL_RUNBOOK.md`:** SRE incident triage guide, correlation ID tracing, and diagnostic steps.
8. **Author `docs/architecture/PHASE_6_TEST_REPORT.md` & `PHASE_6_IMPLEMENTATION_REPORT.md`:** Comprehensive verification logs and final acceptance report.

# PrepFord Examination Management — P3.1 Implementation Readiness Plan

## Status
- Scope: Implementation readiness assessment and consolidated planning
- Stage: Architecture Review Remediation Complete
- Final Recommendation: **READY FOR FINAL OWNER IMPLEMENTATION AUTHORIZATION**
- Execution Mode: Backend-first, documentation-only (Implementation NOT authorized)

---

## 1. Governance & Approval Summary

All fifteen architectural and policy decisions are formally OWNER APPROVED:

| Decision | Area | Approved Policy | Status |
|---|---|---|---|
| D1 | Identity Architecture | Separate stable `Examination` identity + version-specific `Exam` revisions (Option B) | OWNER APPROVED |
| D2 | Lifecycle | 6-state lifecycle model: Draft, InReview, Approved, Published, Archived, Retired | OWNER APPROVED |
| D3 | Attempt Snapshot | Immutable server-generated snapshot at attempt start; relational membership preserved | OWNER APPROVED |
| D4 | Authorization | Separation of duties: revision creator cannot approve that revision | OWNER APPROVED |
| D5 | Concurrency | Application-managed optimistic concurrency token on revision rows | OWNER APPROVED |
| D6 | Code System | Sequential, pathway-scoped codes; retained across revisions | OWNER APPROVED |
| D7 | Publication Source | Lifecycle state is canonical source of truth; `IsPublished` is derived bridge | OWNER APPROVED |
| D8 | Verification | Isolated local PostgreSQL verification (`prepford_gateb_verification`) | OWNER APPROVED |
| D9 | Code Format | Option A: Pathway-prefixed 6-digit codes (`RN-EX-000001` / `PN-EX-000001`) | OWNER APPROVED |
| D10 | Lifecycle Roles | Option A: Reviewer recommends; Admin approves; Exam Manager publishes; Content Mgr no lifecycle authority | OWNER APPROVED |
| D11 | Overrides | Option A: Narrow, explicitly audited administrative overrides; attempts/snapshots immutable | OWNER APPROVED |
| D12 | Instructor Access | Option A: Instructors see Published examinations only | OWNER APPROVED |
| D13 | Restoration Window| Option A: 30-day restoration window from Archived; retirement is terminal | OWNER APPROVED |
| D14 | Active Attempts | Option A: Existing attempts continue undisturbed; new attempts blocked; count recorded | OWNER APPROVED |
| D15 | Snapshot Storage | Option A: Versioned JSONB metadata snapshot on `ExamAttempt` + relational question membership | OWNER APPROVED |

---

## 2. Architecture Review Remediation Summary

All eight review findings (F-01 through F-08) documented in `docs/exam-management-p3-1-specification-review-findings.md` have been fully resolved:
- **F-01 (Model Reconciled):** All entities use `string` primary keys, `UserId`, `Passed`, `DisplayOrder`, `StartedAt`, `CompletedAt`, exactly matching `apps/api/Models/Assessments.cs`.
- **F-02 (Authorization Reconciled):** Ordinary roles strictly decoupled from overrides; Superadmin removed from ordinary approval/publication; Admin cannot publish; Reviewer conducts review/returns.
- **F-03 (Publication Invariants):** Partial unique indexes specified for single published and single active draft per family; atomic supersession specified.
- **F-04 (Legacy Migration Plan):** Inventory query and 3-tier classification taxonomy (Class A/B/C) established without metadata fabrication.
- **F-05 (Sequence Mechanics):** Non-transactional PostgreSQL sequence characteristics, gap tolerance, and `MAXVALUE 999999 NO CYCLE` documented.
- **F-06 (Snapshot Fallback):** Fallback accurately documented as current revision state without overstating historical reconstruction; no retroactive fabrication.
- **F-07 (EF Core Concurrency):** Scalar `ConcurrencyToken` mapped with EF Core `.IsConcurrencyToken()`; `DbUpdateConcurrencyException` mapped to HTTP 409 Conflict.
- **F-08 (Audit Infrastructure):** All lifecycle events mapped to existing `AuditLog` entity; archival vs attempt race condition guard specified.

---

## 3. PostgreSQL Verification Baseline

Verified and documented in `docs/exam-management-p3-1-postgresql-verification-report.md`:
- **PostgreSQL Integration Suite:** 15 / 15 tests passed cleanly against isolated loopback database `prepford_gateb_verification`.
- **Core Domain Regression Suite:** 193 / 193 theory-expanded tests passed cleanly (56 test methods), verifying Gate C server-authoritative scoring, attempt-question membership tamper protection, and candidate data isolation.
- **Safety Invariants:** Zero databases dropped or reset; zero application code modified.

---

## 4. Staged Implementation Sequence (Post-Authorization)

Upon explicit owner authorization, implementation will proceed through the following controlled stages:

1. **Stage 1 — Domain Entities & DbContext Configuration:**
   - Define `Examination` entity (`apps/api/Models/Assessments.cs`).
   - Add additive fields to `Exam` (`ExaminationId`, `RevisionNumber`, `LifecycleState`, `ConcurrencyToken`, staffing metadata).
   - Add `MetadataSnapshot` (`jsonb`) to `ExamAttempt`.
   - Configure EF Core fluent mappings, partial unique indexes, and concurrency tokens in `AppDbContext.cs`.
2. **Stage 2 — EF Core Migration & Local Database Verification:**
   - Generate additive migration.
   - Test against `prepford_gateb_verification`.
   - Verify non-destructive rollback.
3. **Stage 3 — Domain Services & Validation Pipelines:**
   - Implement `ExaminationCodeService` with PostgreSQL sequences.
   - Implement `ExamLifecycleService` enforcing 6-state transitions, separation of duties, single published invariant, and atomic audit logging.
   - Integrate atomic metadata snapshot creation into `ExamAttemptsController.StartAttempt`.
4. **Stage 4 — Controller Integration & Authorization Policies:**
   - Add examination management endpoints with role authorization.
   - Enforce instructor query filter (`LifecycleState == ExamLifecycleState.Published`).
   - Enforce HTTP 409 Conflict responses on concurrency conflicts.
5. **Stage 5 — Automated Test Suite & Gate C Revalidation:**
   - Unit tests for lifecycle transitions, separation of duties, and concurrency conflicts.
   - Integration tests against `prepford_gateb_verification`.
   - 100% pass rate revalidation on Gate C test suites.

---

## 5. Final Readiness Classification

**Readiness Classification:** **READY FOR FINAL OWNER IMPLEMENTATION AUTHORIZATION**

- **Documentation Status:** 100% COMPLETE & REMEDIATED
- **Repository Compatibility:** 100% RECONCILED
- **Gate C Protections:** 100% PRESERVED
- **Next Step:** Awaiting explicit product owner implementation authorization

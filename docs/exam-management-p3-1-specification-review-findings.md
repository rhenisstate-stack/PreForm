# PrepFord Examination Management — P3.1 Specification Review Findings Log

**Phase:** P3.1 — Examination Domain Foundation  
**Stage:** Architecture Review Remediation  
**Status:** ALL FINDINGS RESOLVED IN SPECIFICATION SUITE  
**Review Date:** 3 November 2026  
**Implementation Authorization:** NOT GRANTED (Documentation-Only)

---

## 1. Executive Summary

Following an independent architecture review of the Phase P3.1 consolidated implementation specification, eight technical findings (F-01 through F-08) were identified. These findings addressed model type reconciliation, authorization consistency, publication invariants, legacy inventory methodology, sequence mechanics, snapshot fallback claims, EF Core concurrency integration, and audit infrastructure reuse.

All eight findings have been systematically resolved across the entire specification documentation suite without reopening or altering any of the fifteen owner-approved architectural and policy decisions.

---

## 2. Findings Register & Resolution Tracking

### Finding F-01 — Entity Identifier & Property Type Discrepancies
- **Finding ID:** F-01
- **Severity:** High
- **Category:** Existing Model Compatibility
- **Existing Evidence:**
  - `apps/api/Models/Assessments.cs` defines:
    - `Exam.Id`: `string` (UUID string `Guid.NewGuid().ToString()`), NOT `Guid`
    - `ExamAttempt.Id`: `string`, NOT `Guid`
    - `ExamAttempt.UserId`: `string` referencing `User.Id`, NOT `CandidateId`
    - `ExamAttempt.Passed`: `bool`, NOT `IsPassed`
    - `ExamAttempt.StartedAt`: `DateTime`, NOT `StartedAtUtc`
    - `ExamAttempt.CompletedAt`: `DateTime?`, NOT `SubmittedAtUtc`
    - `ExamAttempt.Status`: enum `AttemptStatus`, NOT raw `string`
    - `ExamAttemptQuestion.DisplayOrder`: `int`, NOT `SequenceNumber`
    - `ExamAttemptQuestion.Id`: `string`, NOT `Guid`
  - Previous specification draft proposed `Guid` keys, `CandidateId`, `IsPassed`, `StartedAtUtc`, `SubmittedAtUtc`, and `SequenceNumber`, which would break existing database foreign keys and candidate API contracts.
- **Required Correction:** Reconcile all entity definitions, DTOs, and schema specifications to strictly preserve existing types and property names (`string` primary keys, `UserId`, `Passed`, `DisplayOrder`, `StartedAt`, `CompletedAt`). Ensure all new properties are additive.
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-revision-architecture-specification.md`
  - `docs/exam-management-p3-1-attempt-snapshot-specification.md`
- **Resolution Evidence:** The domain entity models in the consolidated specification and revision specification now strictly reflect `string` IDs, `UserId`, `Passed`, `DisplayOrder`, and existing timestamp names, preserving all Gate C candidate data contracts.
- **Status:** **Resolved**

---

### Finding F-02 — Authorization Matrix Inconsistencies & Overspecification
- **Finding ID:** F-02
- **Severity:** High
- **Category:** Authorization Consistency
- **Existing Evidence:**
  - Approved Decision 2 (D10) establishes: Reviewer recommends or returns; Admin approves; Exam Manager publishes; Content Manager has no examination lifecycle authority by default; Superadmin performs narrow audited overrides.
  - Previous specification table erroneously granted Superadmin ordinary approval authority, granted Admin ordinary publication authority, granted Admin the Reviewer return-for-changes action, and omitted the explicit `RecommendApproval` auditable review event.
- **Required Correction:**
  - Restrict ordinary approval strictly to Admin (creator cannot approve).
  - Restrict ordinary publication strictly to Exam Manager (for Approved revisions).
  - Restrict return-for-changes strictly to Reviewer (with mandatory reason).
  - Add explicit `RecommendApproval` auditable event (`ExamRevisionReviewRecommended`) for Reviewers.
  - Define Superadmin strictly as an exceptional override actor (no ordinary approval or publication).
  - Specify separation-of-duties check using the actual user identity representation (`X-Authenticated-User-Id` / `ClaimTypes.NameIdentifier`).
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-authorization-specification.md`
  - `docs/exam-management-p3-1-lifecycle-specification.md`
- **Resolution Evidence:** The canonical authorization matrix has been corrected across all specifications. Superadmin is removed from ordinary lifecycle flows; Admin cannot publish; Reviewer conducts review, recommendations, and returns; Exam Manager publishes; separation of duties is evaluated against `ClaimTypes.NameIdentifier`.
- **Status:** **Resolved**

---

### Finding F-03 — Revision Publication Invariant & Concurrency Protection
- **Finding ID:** F-03
- **Severity:** High
- **Category:** Revision & Publication Integrity
- **Existing Evidence:**
  - The specification lacked concrete database constraints to enforce:
    1. At most one revision per Examination family may be `Published`.
    2. At most one active `Draft` revision per Examination family may exist at any time.
    3. Publishing a revision must atomically archive the currently published revision.
    4. Restoring an archived revision cannot create a dual-published state.
- **Required Correction:**
  - Specify PostgreSQL partial unique indexes:
    - `CREATE UNIQUE INDEX "IX_Exams_ExaminationId_SinglePublished" ON "Exams" ("ExaminationId") WHERE "LifecycleState" = 4;`
    - `CREATE UNIQUE INDEX "IX_Exams_ExaminationId_ActiveDraft" ON "Exams" ("ExaminationId") WHERE "LifecycleState" = 1;`
  - Specify atomic transition logic during `Publish`: in the same transaction, archive the existing published revision (if any), record active attempts count, update the target revision to `Published`, update `CurrentRevisionId`, and sync `IsPublished`.
  - Specify restoration guard: restore fails with HTTP 422 / 409 if a Published revision already exists for that Examination.
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-revision-architecture-specification.md`
  - `docs/exam-management-p3-1-lifecycle-specification.md`
- **Resolution Evidence:** Partial unique indexes and atomic transition algorithms are fully documented and integrated into the schema specifications and lifecycle invariants.
- **Status:** **Resolved**

---

### Finding F-04 — Legacy Publication Migration & Inventory Strategy
- **Finding ID:** F-04
- **Severity:** Medium
- **Category:** Legacy Publication Migration
- **Existing Evidence:**
  - The previous specification assumed a naive mapping: `IsPublished = true` -> `Published`, `IsPublished = false` -> `Draft`, without verifying actual repository database contents or defining an audit protocol for ambiguous historical records.
- **Required Correction:**
  - Formulate a concrete non-destructive database inventory plan.
  - Classify historical records into: (1) Safely mappable, (2) Requires owner decision, (3) Insufficient evidence.
  - Prohibit fabrication of historical review/approval metadata or timestamps.
  - Define rollback procedures and documentation of legacy records.
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-publication-migration-specification.md`
  - `docs/exam-management-p3-1-implementation-readiness-plan.md`
- **Resolution Evidence:** A non-destructive inventory protocol was executed against local databases (confirming 0 existing legacy exams in local development, but establishing classification rules for shared/staging environments). Clear classification taxonomies and migration safeguards are established.
- **Status:** **Resolved**

---

### Finding F-05 — PostgreSQL Sequence Mechanics & Gapping Policy
- **Finding ID:** F-05
- **Severity:** Medium
- **Category:** Examination Code Allocation
- **Existing Evidence:**
  - The code specification noted sequential allocation but did not address PostgreSQL sequence transactional behavior (e.g. sequence numbers are consumed even when the enclosing transaction aborts), ceiling behavior, or immutability of assigned codes.
- **Required Correction:**
  - Explicitly document that PostgreSQL sequences are non-transactional and that numerical gaps resulting from aborted transactions are acceptable and expected.
  - Specify `MAXVALUE 999999 NO CYCLE` to safely halt allocation if the 6-digit space is exhausted.
  - Specify that `Examination.Pathway` and `Examination.Code` are permanently immutable once assigned.
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-code-specification.md`
- **Resolution Evidence:** Sequence DDL (`CREATE SEQUENCE ... MAXVALUE 999999 NO CYCLE`), gap acceptance rules, and immutability invariants are explicitly documented.
- **Status:** **Resolved**

---

### Finding F-06 — Attempt Snapshot Fallback Claims & Integrity
- **Finding ID:** F-06
- **Severity:** Medium
- **Category:** Attempt Snapshot Integrity
- **Existing Evidence:**
  - The previous specification stated that legacy attempts without a snapshot can be read via fallback logic, but inadvertently implied that dynamic reads reconstruct the exact historical configuration used at attempt start, which is impossible if the historical `Exam` row was subsequently updated.
- **Required Correction:**
  - Clarify that legacy fallback reads the associated `Exam` revision record dynamically and marks the response with `"snapshotSource": "legacy_fallback"`.
  - Explicitly document that the fallback reflects the current record state and cannot guarantee historical reconstruction for modified legacy exams.
  - Maintain the rule that snapshots are never fabricated retroactively.
  - Specify handling for unsupported future `schemaVersion` values.
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-attempt-snapshot-specification.md`
- **Resolution Evidence:** The fallback contract now accurately represents legacy behavior, includes schema version bounds, and protects against data fabrication.
- **Status:** **Resolved**

---

### Finding F-07 — EF Core Optimistic Concurrency Integration
- **Finding ID:** F-07
- **Severity:** Medium
- **Category:** Optimistic Concurrency Control
- **Existing Evidence:**
  - Previous concurrency specification presented raw SQL update snippets without detailing how EF Core entity tracking, `IsConcurrencyToken()`, and `DbUpdateConcurrencyException` integrate with the service layer.
- **Required Correction:**
  - Configure `ConcurrencyToken` on `Exam` entity via EF Core fluent API: `entity.Property(e => e.ConcurrencyToken).IsConcurrencyToken();`.
  - Document service-level token incrementation (`revision.ConcurrencyToken++`).
  - Document `DbUpdateConcurrencyException` catching and mapping to HTTP 409 Conflict.
  - Document client refresh guidance and atomic conflict audit logging.
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-concurrency-specification.md`
- **Resolution Evidence:** Standard EF Core concurrency mapping, transaction lifecycle, and HTTP 409 conflict responses are fully articulated without reliance on raw SQL anti-patterns.
- **Status:** **Resolved**

---

### Finding F-08 — Audit Infrastructure Reuse & Archival Race Protection
- **Finding ID:** F-08
- **Severity:** Medium
- **Category:** Audit & Archival Consistency
- **Existing Evidence:**
  - The previous specification did not align lifecycle audit events with the existing `AuditLog` model schema (`apps/api/Models/Identity.cs`) and did not specify the transaction isolation guard preventing race conditions between archival and attempt initialization.
- **Required Correction:**
  - Map all lifecycle and override audit events directly to the existing `AuditLog` entity (`ActorId`, `Action`, `EntityType`, `EntityId`, `Description`, `Outcome`, `Timestamp`).
  - Specify the transaction boundary guard: attempt creation checks `LifecycleState == ExamLifecycleState.Published` within an active transaction. If an exam is archived concurrently, the attempt start commits after or detects the state change, rejecting new attempt creation cleanly with HTTP 422.
- **Documents Updated:**
  - `docs/exam-management-p3-1-consolidated-implementation-specification.md`
  - `docs/exam-management-p3-1-lifecycle-specification.md`
  - `docs/exam-management-p3-1-authorization-specification.md`
- **Resolution Evidence:** Existing `AuditLog` mapping is specified, structured JSON payload contracts are defined, and the archival/attempt creation race condition guard is explicitly documented.
- **Status:** **Resolved**

---

## 3. Summary of Status Across Documents

| Finding ID | Title | Severity | Impacted Specification Documents | Status |
|---|---|---|---|---|
| F-01 | Entity Identifier & Property Types | High | Consolidated Spec, Revision Spec, Snapshot Spec | **Resolved** |
| F-02 | Authorization Matrix Consistency | High | Consolidated Spec, Authorization Spec, Lifecycle Spec | **Resolved** |
| F-03 | Publication & Draft Invariants | High | Consolidated Spec, Revision Spec, Lifecycle Spec | **Resolved** |
| F-04 | Legacy Publication Migration Inventory | Medium | Consolidated Spec, Publication Migration Spec, Readiness Plan | **Resolved** |
| F-05 | Sequence Allocation Mechanics | Medium | Consolidated Spec, Code Spec | **Resolved** |
| F-06 | Attempt Snapshot Fallback Claims | Medium | Consolidated Spec, Snapshot Spec | **Resolved** |
| F-07 | EF Core Concurrency Integration | Medium | Consolidated Spec, Concurrency Spec | **Resolved** |
| F-08 | AuditLog Schema Reuse & Archival Race | Medium | Consolidated Spec, Lifecycle Spec, Authorization Spec | **Resolved** |

---

## 4. Final Sign-off

All eight findings are completely resolved across the entire specification suite. The specifications are now strictly aligned with the existing PrepFord backend, the EF Core/Npgsql 8.0.10 stack, and the fifteen owner-approved decisions.

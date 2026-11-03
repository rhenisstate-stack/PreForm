# PrepFord Examination Management — P3.1 Implementation Readiness Plan

## Status
- Scope: Implementation readiness assessment and consolidated planning
- Execution mode: Backend-first, documentation-only
- Final recommendation: SPECIFICATIONS COMPLETE & OWNER APPROVED — READY FOR POSTGRESQL PREFLIGHT & IMPLEMENTATION AUTHORIZATION

---

## 1. Approved Owner Decisions Summary

All 15 architectural and policy decisions are formally OWNER APPROVED:

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

## 2. Technical Architecture & Domain Mapping

### 2.1 Stable Identity Model
- `Examination` entity represents the examination family.
- Assigned unique pathway-scoped code (`RN-EX-000001` or `PN-EX-000001`).
- Contains pointers to `CurrentRevisionId` and `SuccessorExaminationId`.

### 2.2 Revision Model
- Existing `Exam` entity functions as the revision row.
- Tracks `RevisionNumber`, `LifecycleState`, `ConcurrencyToken`, and audit metadata.
- Referenced directly by `ExamAttempt.ExamId` to preserve all historical attempt relationships.

### 2.3 Attempt Metadata Snapshot
- Captured atomically at attempt initialization as a PostgreSQL `JSONB` document on `ExamAttempt.MetadataSnapshot`.
- Validated against schema version 1.
- Exact question membership remains in `ExamAttemptQuestion` (preserving Gate C protections).
- Legacy attempts handled via dynamic fallback reader without data fabrication.

### 2.4 State Machine & Authorization
- 6 states, 9 transitions.
- Rejection returns to `Draft` with mandatory reason.
- Creator cannot self-approve (`CreatedBy != ActorId`).
- Instructors view `Published` examinations only.

---

## 3. Implementation Sequence Proposal

1. **Preflight Verification:**
   - Execute non-destructive PostgreSQL preflight checks.
   - Confirm local service, credentials, and `prepford_gateb_verification` isolation guard.
2. **Entity & EF Core Model Configuration:**
   - Add `Examination` entity and update `Exam` revision entity.
   - Configure constraints: `UNIQUE (Code)`, `UNIQUE (ExaminationId, RevisionNumber)`.
   - Configure `MetadataSnapshot` as JSONB on `ExamAttempt`.
3. **Migration Creation & Non-Destructive Local Testing:**
   - Generate EF Core migration.
   - Test against isolated local database `prepford_gateb_verification`.
   - Verify compatibility bridge for `IsPublished`.
4. **Service Layer Implementation:**
   - Implement `ExaminationCodeService` using PostgreSQL sequences.
   - Implement `ExamLifecycleService` enforcing state transitions, separation of duties, and audit logs.
   - Implement optimistic concurrency checking on revision updates.
   - Implement atomic attempt snapshot creation and legacy fallback reader.
5. **Controller & Authorization Integration:**
   - Update admin/exam-manager endpoints.
   - Enforce instructor read filter (`LifecycleState == Published`).
6. **Automated Testing & Gate C Revalidation:**
   - Run unit tests for lifecycle, separation of duties, and concurrency.
   - Run integration tests against `prepford_gateb_verification`.
   - Revalidate Gate C tests to confirm candidate attempt integrity and scoring remains 100% intact.

---

## 4. Status Summary

- **Specifications Readiness:** 100% COMPLETE (`docs/exam-management-p3-1-consolidated-implementation-specification.md` created)
- **Policy Status:** 100% OWNER APPROVED (All 15 decisions approved)
- **Database Verification Readiness:** PROCEEDING TO PREFLIGHT CHECK
- **Next Gate:** Owner Implementation Authorization following PostgreSQL preflight report

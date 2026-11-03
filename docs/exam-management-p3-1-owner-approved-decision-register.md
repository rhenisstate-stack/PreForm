# PrepFord Examination Management — P3.1 Owner-Approved Decision Register

## Approval metadata
- Approval date: 2026-11-03
- Decision authority: PrepFord Product Owner
- Scope: P3.1 examination domain foundation
- Execution mode: Documentation-only / implementation-ready specifications
- Status: OWNER APPROVED (All 15 Architectural & Policy Decisions Resolved)

## Source evidence
- Repository state revalidated in `docs/exam-management-p3-1-revalidation-report.md`
- Existing examination model reviewed in `apps/api/Models/Assessments.cs`
- EF configuration reviewed in `apps/api/Data/AppDbContext.cs`
- Role and authorization conventions reviewed in `apps/api/Program.cs` and `apps/api/Services/RoleHierarchy.cs`
- Outstanding implementation decisions formalized in `docs/exam-management-p3-1-final-owner-decision-register.md`

## Approved decision register

| Decision ID | Owner selection | Status | Approved interpretation | Implementation consequence |
|---|---|---|---|---|
| D1 | Examination identity and revision: Option B | OWNER APPROVED | Separate stable examination identity and version-specific revision model. `ExamAttempt.ExamId` must continue to point to the exact revision used by the candidate. | Add stable `Examination` entity; retain `Exam` as revision entity; enforce foreign key bindings. |
| D2 | Lifecycle: Six states | OWNER APPROVED | Draft, InReview, Approved, Published, Archived, Retired. Rejection returns to Draft with required reason and audit event. No persistent Rejected state. | Implement lifecycle state machine on `Exam`; enforce strict transition guards. |
| D3 | Attempt metadata snapshot: immutable server-generated snapshot | OWNER APPROVED | Snapshot is captured when attempt starts. `ExamAttemptQuestion` remains the exact question-membership authority. | Server-authoritative snapshot generation at attempt start; legacy compatibility fallback. |
| D4 | Authorization: separation of duties | OWNER APPROVED | Creator cannot approve their own revision. Review, approval and publication are distinct capabilities. | Authorization policies enforce separation of duties at the service layer. |
| D5 | Concurrency: application-managed token | OWNER APPROVED | Use an application-managed optimistic concurrency token compatible with EF Core + Npgsql. Not SQL Server `rowversion` semantics. | Add scalar `ConcurrencyToken` to revision row; return HTTP 409 on stale update. |
| D6 | Examination codes: sequential, pathway-scoped | OWNER APPROVED | Codes are sequential and unique within the approved pathway scope. New revision keeps the stable examination code. | Code allocation at stable `Examination` level; database-level uniqueness enforcement. |
| D7 | Publication compatibility: lifecycle as source of truth | OWNER APPROVED | Lifecycle state is authoritative. `IsPublished` may remain only as a temporary compatibility representation if explicitly synchronized. | Add bridge synchronization; migrate read paths to `LifecycleState == Published`. |
| D8 | PostgreSQL verification: dedicated local isolated database | OWNER APPROVED | Use an isolated local PostgreSQL database for integration verification, preserving the existing `PREFORM_GATEB_TEST_CONNECTION_STRING` guard. | Dedicated `prepford_gateb_verification` local database preflight; preserve guard. |
| D9 | Examination code format: Option A | OWNER APPROVED | Pathway-prefixed, zero-padded sequential codes: RN: `RN-EX-000001`, PN: `PN-EX-000001`. Independent sequences per pathway. Codes assigned at stable identity creation, permanent, transaction-safe. | PostgreSQL sequence or atomic counter per pathway; transaction-safe allocation; no fabricated historical codes. |
| D10 | Approval & publication roles: Option A | OWNER APPROVED | Reviewer recommends; Admin approves; Exam Manager publishes. Creator cannot approve own revision. Content Manager has no exam lifecycle approval/publish authority by default. | Role policies: Reviewer (`SubmitReview`), Admin (`Approve`), Exam Manager (`Create`, `Submit`, `Publish`, `Archive`), Content Manager (none by default). |
| D11 | Admin & Superadmin override scope: Option A | OWNER APPROVED | Narrow, explicitly audited administrative overrides. Mandatory reason, actor, previous/new state, timestamp, override operation type logged. Cannot rewrite historical attempts or snapshots, nor alter grading or approve own revision. | Dedicated audited override operations; strict security invariants preventing data rewrite. |
| D12 | Instructor visibility: Option A | OWNER APPROVED | Instructors see Published examinations only. Prohibited from viewing Draft, InReview, Approved, Archived, or Retired examinations. | Authorization queries for Instructor role filter strictly by `LifecycleState == Published`. |
| D13 | Archive restoration window & retirement: Option A | OWNER APPROVED | 30-calendar-day restoration window from Archived -> Published. Retirement is terminal; cannot reactivate. Re-entry requires new Examination identity with explicit successor link. | Time-bound restoration check (<= 30 days); terminal `Retired` state; `SuccessorExaminationId` relationship. |
| D14 | Archiving with active attempts: Option A | OWNER APPROVED | Archiving immediately blocks new attempts; existing in-progress attempts continue under original revision and snapshot. Active attempts count recorded at archival. | No disruption to running attempts; zero modification to attempt questions, grading, or snapshots. |
| D15 | Attempt snapshot storage: Option A | OWNER APPROVED | Versioned JSONB metadata snapshot on `ExamAttempt` (`MetadataSnapshot` column). Preserves relational `ExamAttemptQuestion` exact question membership. Server-authoritative and atomic. | JSONB column on `ExamAttempt`; schema versioned; legacy attempts read without snapshot fabrication. |

## Required interpretation rules

1. Approved direction is binding; missing implementation detail is not a permission to invent product behavior.
2. The owner-approved decisions are not permission to bypass existing repository constraints.
3. The repository must remain backend-first and preserve Gate C candidate integrity guarantees.
4. Documentation defines the consolidated implementation specification; application code changes remain subject to explicit implementation authorization.
5. All seven previously outstanding policy questions are now fully resolved and approved by the project owner.

## Status taxonomy
- `OWNER APPROVED`: selected by project owner and treated as final product policy.
- `IMPLEMENTATION DETAIL SPECIFIED`: technical implementation details fully specified in consolidated specification.
- `DEFERRED`: intentionally postponed to a later phase (e.g., P3.2 exam builder/editor UI).
- `BLOCKED`: cannot safely proceed because repository or environment constraints prevent implementation.

## Architectural constraints that remain strict
- No application-code modification is authorized without the separate implementation authorization gate.
- No migration or database-schema change is executed in this documentation task.
- No changes to Gate B or Gate C behavior are permitted.
- Candidate historical integrity must not be weakened by the new foundation.
- Existing `ExamAttemptQuestion` exact membership behavior remains authoritative.
- Historical records must not be fabricated (no fabricated codes, approval timestamps, or attempt snapshots).

## Final status
The owner has approved all 15 architectural and policy decisions. This document formalizes the complete approval record. Implementation authorization remains pending owner review of the consolidated implementation specification and PostgreSQL preflight.

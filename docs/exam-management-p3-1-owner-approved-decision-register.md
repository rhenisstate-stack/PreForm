# PrepFord Examination Management — P3.1 Owner-Approved Decision Register

## Approval metadata
- Approval date: 2026-11-03
- Decision authority: Project owner
- Scope: P3.1 examination domain foundation
- Execution mode: Documentation-only / implementation-ready specifications
- Status: OWNER APPROVED

## Source evidence
- Repository state revalidated in `docs/exam-management-p3-1-revalidation-report.md`
- Existing examination model reviewed in `apps/api/Models/Assessments.cs`
- EF configuration reviewed in `apps/api/Data/AppDbContext.cs`
- Role and authorization conventions reviewed in `apps/api/Program.cs` and `apps/api/Services/RoleHierarchy.cs`

## Approved decision register

| Decision ID | Owner selection | Status | Approved interpretation | Implementation consequence |
|---|---|---|---|---|
| D1 | Examination identity and revision: Option B | OWNER APPROVED | Separate stable examination identity and version-specific revision model. `ExamAttempt.ExamId` must continue to point to the exact revision used by the candidate. | Revision architecture spec required; existing `Exam` must be evaluated before any table replacement. |
| D2 | Lifecycle: Six states | OWNER APPROVED | Draft, InReview, Approved, Published, Archived, Retired. Rejection returns to Draft with required reason and audit event. No persistent Rejected state. | Lifecycle spec required; `IsPublished` cannot remain an independent source of truth. |
| D3 | Attempt metadata snapshot: immutable server-generated snapshot | OWNER APPROVED | Snapshot is captured when attempt starts. `ExamAttemptQuestion` remains the exact question-membership authority. | Snapshot contract required; historical fallback for legacy attempts. |
| D4 | Authorization: separation of duties | OWNER APPROVED | Creator cannot approve their own revision. Review, approval and publication are distinct capabilities, unless later approved otherwise. | Authorization spec required; reuse existing RBAC and object-level checks. |
| D5 | Concurrency: application-managed token | OWNER APPROVED | Use an application-managed optimistic concurrency token compatible with EF Core + Npgsql. Not SQL Server `rowversion` semantics. | Concurrency spec required; no new dependency. |
| D6 | Examination codes: sequential, pathway-scoped | OWNER APPROVED | Codes are sequential and unique within the approved pathway scope. New revision keeps the stable examination code. | Code spec required; code generation requires DB uniqueness and concurrency-safe allocation. |
| D7 | Publication compatibility: lifecycle as source of truth | OWNER APPROVED | Lifecycle state is authoritative. `IsPublished` may remain only as a temporary compatibility representation if explicitly synchronized. | Publication migration spec required; compatibility mapping required. |
| D8 | PostgreSQL verification: dedicated local isolated database | OWNER APPROVED | Use an isolated local PostgreSQL database for integration verification, preserving the existing `PREFORM_GATEB_TEST_CONNECTION_STRING` guard. | PostgreSQL verification plan required; no weakening of the guard. |

## Required interpretation rules

1. Approved direction is binding; missing implementation detail is not a permission to invent product behavior.
2. The owner-approved decisions are not permission to bypass the existing repository constraints.
3. The repository must remain backend-first and preserve Gate C candidate integrity guarantees.
4. Documentation may define technical recommendations, but the implementation gate remains pending owner review.
5. Any unresolved question must remain tagged as `OWNER APPROVAL REQUIRED` or `IMPLEMENTATION DETAIL REQUIRED`.

## Status taxonomy used throughout this phase
- `OWNER APPROVED`: selected by project owner and treated as final product policy.
- `IMPLEMENTATION DETAIL REQUIRED`: technology implementation is not yet fully specified but the product policy is approved.
- `OWNER APPROVAL REQUIRED`: product behavior remains unresolved.
- `DEFERRED`: intentionally postponed to a later phase.
- `BLOCKED`: cannot safely proceed because repository or environment constraints prevent implementation.

## Architectural constraints that remain strict
- No application-code modification is authorized in this task.
- No migration or database-schema change is authorized in this task.
- No changes to Gate B or Gate C behavior are permitted.
- Candidate historical integrity must not be weakened by the new foundation.
- Existing `ExamAttemptQuestion` exact membership behavior remains authoritative.

## Outstanding implementation-level questions

These are not product-policy reversals; they are technical details that must be confirmed before implementation starts:
- exact `Examination`/`Exam` table boundary for the stable identity and revision model
- exact revision-number strategy and whether numbering resets by stable identity or pathway
- whether a Draft revision may be discarded without preserving audit evidence
- exact override semantics for admin/superadmin transitions
- whether `Exam Manager` or `Content Manager` may both approve and publish, or whether those are split permissions
- exact examination code format string and sequence reset policy
- whether `IsPublished` is removed immediately or retained as a compatibility property during a transition window
- exact local database name, credentials, and verification procedure for the PostgreSQL environment

## Final status
The owner has approved the architecture. This document formalizes the approval. It does not authorize implementation. The next implementation gate remains pending owner review of the consolidated readiness plan.

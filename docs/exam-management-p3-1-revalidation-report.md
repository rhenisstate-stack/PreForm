# PrepFord Examination Management — P3.1 Revalidation Report

## 1. Repository state

### Current branch and repository
- Branch: `feature/dotnet-backend-migration`
- Tracking branch: `preform/feature/dotnet-backend-migration`
- HEAD commit: `18f1412` (`create the phase 3 exam management implementation features`)
- Previous audit reference: `3c0b01a` is no longer current HEAD and must not be treated as the active baseline.
- Working tree status: clean at time of revalidation.
- No staged or unstaged changes were present when the repository was checked.

### Evidence
- `git --no-pager status --short --branch` returned:
  - `## feature/dotnet-backend-migration...preform/feature/dotnet-backend-migration`
- `git --no-pager log --oneline -n 8` showed:
  - `18f1412 create the phase 3 exam management implementation features`
  - `3c0b01a Update the Gate C status sections ...`

### Assessment
The repository is still on the expected feature branch, but the active HEAD is newer than the previously reported baseline. The repository is not at the previously cited audit commit, and the revalidation must therefore be based on the current branch state, not historical status notes.

## 2. Existing domain state

### Current examination model
The authoritative examination domain model in the current repository is the `Exam` entity in `apps/api/Models/Assessments.cs`.

Current properties observed:
- `Id` (GUID string)
- `Title`
- `Description`
- `Pathway` (`string`, required, default `"rn"`)
- `ExamType` (`Practice`, `CAT`, `MockSimulation`, `DiagnosticReadiness`)
- `TimeLimitMinutes`
- `PassingScorePercent`
- `IsPublished`
- `CreatedAt`
- `UpdatedAt`
- `ExamQuestions`
- `Attempts`

Current structure:
- `Exam` does not include an examination lifecycle enum or revision model.
- `Exam` does not include a revision ID, parent identity, or immutable published-version contract.
- `Exam` does not include any approval/review metadata.
- `Exam` does not include a `Version` number, `LifecycleStatus`, `PublishedAt`, `ApprovedAt`, `ArchivedAt`, or `RetiredAt` field.
- `Exam` does not include a stable examination code field or uniqueness constraint in the current model.

### Current attempt model
`ExamAttempt` in the same file contains:
- `Id`
- `UserId`
- `ExamId`
- `Status`
- `ScorePercent`
- `Passed`
- `StartedAt`
- `CompletedAt`
- `Responses`

`ExamAttemptQuestion` captures exact membership for each attempt and is the current historical authority for candidate question membership:
- `ExamAttemptId`
- `QuestionId`
- `DisplayOrder`
- `AssignedAt`

This is an exact attempt-question set, but it is not a full examination revision snapshot. It preserves membership, not the complete operational metadata of the specific examination configuration.

### Current conformance with the proposed P3.1 direction
The current repository does not yet implement:
- stable examination identity separate from mutable configuration
- examination revision model
- lifecycle state machine beyond `IsPublished`
- immutable published revision enforcement
- attempt-level metadata snapshot contract
- explicit authorization matrix for examination review/approval/publish
- PostgreSQL-safe concurrency token strategy for examination edits
- examination code generation and uniqueness policy
- additive schema proposal for the foundation set described by the P3.1 blueprint

### Conclusion
The repository is operationally ready for audit, but it is not ready for P3.1 implementation without explicit owner decisions and a confirmed architecture. The current data model still reflects the original candidate-facing exam-and-attempt structure, not the domain foundation required by the P3.1 blueprint.

## 3. Existing migration and schema state

### Migration chain and relevant current schema
The migration chain currently includes the Gate C work and earlier master-domain additions. Relevant migration files in `apps/api/Migrations` include:
- `20261026120000_CreateProgrammes`
- `20261027150000_AddMasterDomainModels`
- `20261028090000_AddUserProfileImages`
- `20261029100000_HarmonizeBackendSchema`
- `20261031100000_AddStudyStudioFlashcards`
- `20261102060000_AddQuestionTypeCapabilityAndStatus`
- `20261103054224_AddAttemptQuestionSetAndGradingState`

### Current model snapshot and EF configuration
`AppDbContext` configures:
- `Exam` with indexes on `Pathway`, `IsPublished`, and `{ IsPublished, Pathway, UpdatedAt }`
- `ExamAttempt` with indexes on `UserId` and `ExamId`
- `ExamAttemptQuestion` with unique index on `{ ExamAttemptId, QuestionId }`

No lifecycle or revision fields are present in the model snapshot.
No concurrency token is configured for `Exam`.
No examination review/approval fields are configured.
No exam code uniqueness rule appears in the current model.
No migration for P3.1 revision/lifecycle model exists in the current branch.

### Gate C verification status
The relevant Gate C migration is still present and the current repository does contain the examination candidate-integrity protections described in the audit notes:
- `ExamAttemptQuestion` exact membership snapshot
- `ResponseGradingState` enum with `Graded` and `Ungraded`
- `ExamAttempt` connection to `Exam`
- secure server-side grading and attempt integrity patterns already in code

This confirms that Gate C protections are still part of the active repository model. However, the document set shows the historical audit reports are still design documents and not a current implementation of P3.1 policy decisions.

## 4. Test baseline and validation evidence

### Exact commands run
1. Baseline API suite attempt:
   - Command: `cd "C:\Users\gitau\Documents\PREform"; dotnet test apps/api/Tests/Preform.Api.Tests.csproj --nologo`
   - Exit code: `1`
   - Result: failed before project tests could complete because the test environment requires a database connection string and the project is configured to run PostgreSQL integration checks.

2. Focused repository validation with NuGet audit disabled:
   - Command: `cd "C:\Users\gitau\Documents\PREform"; dotnet test apps/api/Tests/Preform.Api.Tests.csproj --nologo --no-restore -p:NuGetAudit=false`
   - Exit code: `1`
   - Result: failed in `PostgresIntegrationTests` due to missing isolated PostgreSQL configuration.

3. Final captured failing output showed:
   - `System.InvalidOperationException: Set PREFORM_GATEB_TEST_CONNECTION_STRING to an isolated loopback PostgreSQL database named prepford_gateb_verification.`

### Interpretation
The backend test suite cannot currently establish a valid isolated PostgreSQL verification environment in this workspace. This is a valid environmental blocker, not a code regression signal. The repository therefore does not currently prove a clean, environment-isolated PostgreSQL regression baseline for P3.1 work.

## 5. Documentation discrepancy assessment

### Existing P3 documentation
The repository contains the current audit and blueprint documents, including:
- `docs/exam-management-p3-stage-0-audit.md`
- `docs/exam-management-p3-domain-blueprint.md`
- `docs/exam-management-p3-api-contract-proposal.md`
- `docs/exam-management-p3-authorization-matrix.md`
- `docs/exam-management-p3-test-strategy.md`
- `docs/exam-management-p3-owner-decisions.md`
- `docs/exam-management-p3-implementation-sequence.md`

These documents make clear that the project is meant to be ready for P3.1 governance decisions. However, they stop short of being approved implementation specifications.

### Material discrepancies between documentation and current code
1. The blueprint proposes a lifecycle model, revision strategy, and code generation policy that the current `Exam` model does not implement.
2. The owner decision documents propose a six-state lifecycle and revision-based metadata changes, but there is no current migration or schema implementing those decisions.
3. The current codebase still marks exam publication using `IsPublished` as a simple boolean; the lifecycle requirements described in the docs require a richer state model.
4. `AppDbContext` still indexes `IsPublished` and not the future lifecycle model.
5. There are no P3.1 decision documents with approved dates and implementation status in the repository under the required filenames.
6. There is no evidence of the required owner approval for the revision architecture, lifecycle state model, snapshot contract, authorization matrix, concurrency design, or code-generation strategy.

### Recommendation
The project is positioned as a design-audit and governance stage, not as a ready P3.1 implementation. The current repository must therefore be treated as a blocking state until owner approval resolves the architecture decisions and an isolated PostgreSQL verification database is established.

## 6. Architectural risks

### 1. Revision identity is unresolved
The current `Exam` entity already serves as the primary candidate-linked examination record. Without an explicit revision model, there is no safe way to guarantee immutable published revisions while allowing future edits.

### 2. Lifecycle model is not yet authoritative
The docs propose a six-state lifecycle, but the actual `Exam` model still uses a single `IsPublished` flag. A code change that uses `IsPublished` and lifecycle state independently would risk conflicting sources of truth.

### 3. Historical metadata snapshot is not implemented
The current Gate C structure protects exact membership, but it does not yet define a complete attempt-level metadata snapshot. This is a material requirement for future candidate result integrity and historical interpretation.

### 4. Authorization boundaries are still design-level, not approved policy
The repo contains role names and normalization logic, but the actual examination-specific permission sets still need explicit approval and enforcement.

### 5. PostgreSQL concurrency strategy is unresolved
The blueprint mentions `RowVersion`, but the project documentation is not yet stable about the final PostgreSQL-compatible mechanism. Without provider-aware design, silent lost updates are a real risk.

### 6. Examination code uniqueness is not approved in code
The proposed examination code policy is documented, but actual implementation and uniqueness scope are still unresolved. This must be approved before creation logic is implemented.

### 7. The environment is not currently ready for isolated PostgreSQL verification
The integration tests fail because the required `PREFORM_GATEB_TEST_CONNECTION_STRING` isolation requirement is not present. This blocks a valid P3.1 regression baseline.

## 7. Proposed implementation impact

If P3.1 implementation proceeds without the required approvals, it would likely require a combination of these changes:
- `Exam` schema expansion and migration work
- new examination lifecycle fields or a revision table
- attempt snapshot model additions
- authorization policy additions or policy updates
- concurrency token implementation
- migration data mapping for `IsPublished` and historical records
- additional tests and PostgreSQL verification

That is a broad and sensitive change set for a foundation phase. Given the repository’s current state, this is not a safe implementation path without explicit direction.

## 8. Stop condition and decision required

### Stop condition triggered
This revalidation satisfies the stop criteria in the P3.1 mandate:
- current repository materially differs from the approved audit assumptions
- examination identity and revision architecture is unresolved
- lifecycle policy is unresolved
- historical snapshot requirements are unresolved
- authorization boundaries are unresolved
- PostgreSQL concurrency strategy is unresolved
- the required database isolation cannot be established in the current environment

### Owner decision required
Before any implementation proceeds, the following must be explicitly approved:
1. Examination identity vs. revision model (Option A, B or C)
2. Lifecycle states and transitions, including rejection/archival/retirement semantics
3. Attempt metadata snapshot contract
4. Examination authorization matrix and self-approval rules
5. PostgreSQL concurrency strategy
6. Examination code format and uniqueness scope
7. Migration strategy and compatibility mapping for `IsPublished`
8. Isolated PostgreSQL verification database and operation policy

### Safe next action
The correct next step is not implementation. The correct next step is owner approval of the architectural decisions above and a clean PostgreSQL verification setup before any schema or code changes are introduced.

## 9. Final revalidation assessment

Status: `BLOCKED` / `OWNER APPROVAL REQUIRED`

The repository revalidation confirms that:
- the branch is the expected feature branch
- the current HEAD is newer than the historical baseline
- current exam domain models still reflect the pre-P3.1 state
- the required P3.1 architecture decisions are not approved in code or in a current migration
- the required database isolation and regression baseline are not present in this environment

Because the stage-0 gate and the required architecture approvals are not in place, implementation should stop here until the required owner decisions are made and the verification environment is established.

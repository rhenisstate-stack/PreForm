# PrepFord Examination Management — P3.1 Revision Architecture Specification

## Status
- Decision ID: D1
- Status: OWNER APPROVED
- Approved model: Option B — stable Examination identity + version-specific revision model
- Execution mode: Documentation-only; no schema or code changes

## Repository evidence
The current repository still uses a single `Exam` entity as the examination configuration record in `apps/api/Models/Assessments.cs`. The entity includes `Id`, `Title`, `Description`, `Pathway`, `ExamType`, `TimeLimitMinutes`, `PassingScorePercent`, `IsPublished`, and candidate relationship data. Current EF configuration in `apps/api/Data/AppDbContext.cs` indexes `IsPublished` and candidate attempt references, but there is no stable identity, revision number, or lifecycle metadata.

The key compatibility constraint is that `ExamAttempt.ExamId` currently points to the revision record that the candidate used. This behavior must be preserved exactly when the new revision design is implemented.

## Approved product direction
The owner approved a separate stable Examination identity and version-specific examination revision model.

The recommended technical interpretation is:
- `Examination` = stable identity across the lifetime of the examination family
- `Exam` (existing entity) = revision record that stores the actual configuration for one version
- `ExamAttempt.ExamId` continues to point to the exact revision used by the candidate

This is the least disruptive model because it preserves the current candidate-references and only adds the missing stable identity layer.

## Recommended minimal-disruption design

### Option B, adapted to the existing repository
Recommended architecture:
1. Create a new stable identity entity, `Examination` (or another approved equivalent), with:
   - `Id` (stable identity key)
   - `Pathway`
   - `Code` (or assigned external identifier)
   - `CreatedAt`
   - `CreatedBy`
   - `CurrentRevisionId` (nullable until first revision exists)
   - `IsDeleted` or archival metadata only if required later
2. Retain the existing `Exam` entity as the revision entity, and extend it with:
   - `ExaminationId` (FK to `Examination`)
   - `RevisionNumber` (positive integer, unique within stable identity)
   - `LifecycleState` (Draft/InReview/Approved/Published/Archived/Retired)
   - `CreatedBy`, `SubmittedBy`, `ReviewedBy`, `ApprovedBy`, `PublishedBy` (or equivalent metadata, if approved in implementation)
   - `PublishedAt`, `ApprovedAt`, `ArchivedAt`, `RetiredAt` as required
   - `IsPublished` retained only as temporary compatibility property until migration window ends
3. Keep `ExamAttempt.ExamId` bound to the revision row, not the stable identity row.

### Why this is the safest mapping
- It preserves the current candidate and assessment logic.
- It avoids forcing the existing `Exam` foreign keys to be repointed immediately.
- It keeps the revision row as the source of truth for the exact configuration used in a candidate attempt.
- It allows a future rename or table formalization without changing the candidate API contract.

## Entity responsibilities

### `Examination` (stable identity)
Purpose:
- Represents the conceptual examination across revisions.
- Controls the stable code, pathway, and family identity.
- Carries the revision lineage across Draft/Published/Archived/Retired states.
- Acts as the canonical grouping entity for future CRUD and duplication work.

Expected fields:
- `Id`
- `Pathway`
- `Code`
- `Title` or `DisplayName` if approved as a stable family field
- `CreatedAt`
- `CurrentRevisionId`
- `LatestPublishedRevisionId` (optional, if later required)

### `Exam` (revision)
Purpose:
- Represents one exact version of the examination configuration.
- Holds the actual title, description, instructions, duration, scoring, and question associations.
- Is the record that candidate attempts and answer calculations should reference.

Expected fields:
- `Id`
- `ExaminationId`
- `RevisionNumber`
- `LifecycleState`
- `CreatedAt`
- `UpdatedAt`
- `PublishedAt`
- `CreatedBy`
- `ApprovedBy`
- `PublishedBy`
- `IsPublished` (temporary compatibility only)

## Current repository compatibility analysis

### Candidate API compatibility
Existing `ExamAttempt` -> `Exam` relationships must stay valid:
- an attempt references one exact revision
- revision immutability is enforced once it is Published
- a new Draft revision cannot silently replace the published record used by active attempts

### Historical integrity
The existing `ExamAttemptQuestion` mechanism remains the exact membership lineage for a candidate attempt and should not be replaced by a stable-identity-only model.

### Existing-data mapping
For current records:
- `Exam` rows with an existing `Id` are treated as the initial revision record for a newly created stable identity.
- The first revision number should be assigned as `1`.
- `ExaminationId` is backfilled only where the stable identity can be established without fabrication.
- For legacy records, `CurrentRevisionId` should be set only after the system can prove the latest revision row is correct.

### Ambiguous historical records
Records with no reliable lineage or review metadata must remain in a conservative status:
- `OWNER APPROVAL REQUIRED` if an existing record cannot be mapped with certainty.

## Relationship model

```text
Examination 1 ────< Exam (revision)
                     │
                     └────< ExamAttempt
ExamAttempt ────> Exam (exact revision used by candidate)
Exam ────< ExamQuestion
ExamAttempt ────< ExamAttemptQuestion
```

## Cardinalities
- `Examination` to `Exam`: 1-to-many
- `Exam` to `ExamAttempt`: 1-to-many
- `Exam` to `ExamQuestion`: 1-to-many
- `ExamAttempt` to `ExamAttemptQuestion`: 1-to-many

## Foreign-key and constraint requirements
- `Exam.ExaminationId` is required for all non-legacy records.
- `ExamAttempt.ExamId` remains required.
- `Exam.ExaminationId` must not be nullable for new records.
- `Exam` should enforce a unique constraint on `(ExaminationId, RevisionNumber)`.
- If a revision is `Published`, it must be immutable except for creation of a new Draft revision.
- Candidate attempts must remain tied to the revision they started with.

## Unique constraints
- `Examination` stable identity: `Id` primary key
- `Exam`: unique `(ExaminationId, RevisionNumber)`
- `Exam`: if a code is assigned, unique `(Pathway, Code)` or stable identity-wide code ID if required by product policy

## Index requirements
- `Exam` index on `ExaminationId, RevisionNumber`
- `Exam` index on `LifecycleState`
- `Exam` index on `PublishedAt` if required
- `Exam` index on `Pathway` if lookup remains required
- `Examination` index on `CurrentRevisionId`

## Migration and rollback considerations
- This is a documentation-only specification; no migration is created in this task.
- Safe migration strategy for implementation would be additive:
  - add `ExaminationId` and `RevisionNumber` to `Exam`
  - backfill stable identity for existing rows
  - add unique constraint and index
  - keep `ExamAttempt.ExamId` untouched
- Rollback must be reversible only with a safe backfill and no attempt data loss.

## Owner decisions still outstanding
The following remains subject to owner approval before implementation:
- exact naming and table ownership of the stable identity model (`Examination` vs a different but equivalent entity name)
- whether a new revision can be created while an earlier Published revision remains current
- whether a revision may be discarded while still Draft
- whether archived or retired revisions may be reopened for a new Draft branch

## Final recommendation
The least disruptive and repository-safe path is to retain the current `Exam` record as the revision record and add a separate examination family entity. This keeps `ExamAttempt.ExamId` valid and preserves candidate history while enabling the approved examination identity and revision model.

## Status summary
- Product policy: OWNER APPROVED
- Technical design: IMPLEMENTATION DETAIL REQUIRED
- Repository-safe minimal approach: RECOMMENDED
- Implementation gate: OWNER REVIEW REQUIRED

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
The owner approved a separate stable Examination identity and version-specific examination revision model (Option B).

The technical interpretation is:
- `Examination` = stable identity across the lifetime of the examination family.
- `Exam` (existing entity) = revision record that stores the actual configuration for one version.
- `ExamAttempt.ExamId` continues to point to the exact revision used by the candidate.

This is the least disruptive model because it preserves existing candidate references and adds the stable identity layer.

## Recommended minimal-disruption design

### Option B, adapted to the existing repository
1. Create a new stable identity entity, `Examination`, with:
   - `Id` (Guid, primary key)
   - `Pathway` (`string` or enum matching domain: "RN", "PN")
   - `Code` (`string`, e.g. `RN-EX-000001`, unique per pathway/globally)
   - `CreatedAt` (`DateTimeUtc`)
   - `CreatedBy` (`string`)
   - `CurrentRevisionId` (`Guid?`, points to active revision)
   - `SuccessorExaminationId` (`Guid?`, for successor links to retired examinations)
2. Retain the existing `Exam` entity as the revision entity, and extend it with:
   - `ExaminationId` (Guid FK to `Examination`)
   - `RevisionNumber` (int, positive integer, unique within `(ExaminationId, RevisionNumber)`)
   - `LifecycleState` (`ExamLifecycleState`: Draft, InReview, Approved, Published, Archived, Retired)
   - `ConcurrencyToken` (`long` or `Guid`, application-managed optimistic concurrency)
   - `CreatedBy`, `SubmittedBy`, `ReviewedBy`, `ApprovedBy`, `PublishedBy`, `ArchivedBy`, `RetiredBy`
   - `PublishedAt`, `ApprovedAt`, `ArchivedAt`, `RetiredAt`
   - `IsPublished` (boolean, derived temporary compatibility property)
3. Keep `ExamAttempt.ExamId` bound to the `Exam` revision row, not the `Examination` stable identity row.

### Why this is the safest mapping
- It preserves current candidate and assessment logic.
- It avoids forcing existing `Exam` foreign keys to be repointed immediately.
- It keeps the revision row as the source of truth for the exact configuration used in a candidate attempt.
- It allows future formalization without breaking candidate API contracts.

## Entity responsibilities

### `Examination` (stable identity)
Purpose:
- Represents the conceptual examination across revisions.
- Controls the stable code (`RN-EX-000001` / `PN-EX-000001`), pathway, and family identity.
- Carries revision lineage across Draft/Published/Archived/Retired states.
- Acts as the canonical grouping entity for exam lists and future duplication work.

### `Exam` (revision)
Purpose:
- Represents one exact version of the examination configuration.
- Holds the actual title, description, instructions, duration, passing score, question associations, and lifecycle state.
- Referenced by candidate attempts (`ExamAttempt.ExamId`).
- Immutability enforced once in `Published` state.

## Relationship model

```text
Examination (stable identity)
  1 ────< Exam (revision: Draft/InReview/Approved/Published/Archived/Retired)
             │
             ├───< ExamQuestion (question membership for revision)
             │
             └───< ExamAttempt (attempts bound to exact revision)
                         │
                         ├───< ExamAttemptQuestion (authoritative relational attempt membership)
                         ├───< AttemptResponse (candidate answers)
                         └───[ MetadataSnapshot (JSONB column) ]
```

## Foreign-key and constraint requirements
- `Exam.ExaminationId` is required for all non-legacy records.
- `ExamAttempt.ExamId` remains required.
- `Exam` enforces a unique constraint on `(ExaminationId, RevisionNumber)`.
- `Examination` enforces a unique constraint on `Code`.
- Once `Exam` is in `Published` state, content modifications are rejected; a new revision must be created in `Draft` state.

## Resolved architectural policies
1. **Revision creation alongside Published:** A new `Draft` revision (e.g., Revision 2) can be created and reviewed while an earlier revision (Revision 1) remains `Published` and active.
2. **Draft discarding:** An unsubmitted `Draft` revision may be discarded/deleted by an authorized author with an audit record, provided it has no candidate attempts.
3. **Archived / Retired branching:** An `Archived` exam can be restored to `Published` within 30 calendar days (Superadmin override). A `Retired` examination cannot be reopened; new work requires a new `Examination` identity linked via `SuccessorExaminationId`.

## Status summary
- Product policy: OWNER APPROVED (Option B)
- Technical design: FULLY SPECIFIED
- Entity mapping: SAFE & COMPATIBLE
- Next gate: Implementation upon owner authorization

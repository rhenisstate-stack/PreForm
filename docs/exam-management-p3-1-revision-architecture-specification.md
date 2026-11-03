# PrepFord Examination Management — P3.1 Revision Architecture Specification

## Status
- Decision ID: D1
- Stage: Architecture Review Remediation
- Status: SPECIFICATION REMEDIATED & COMPLETE
- Approved model: Option B — stable Examination identity + version-specific revision model
- Execution mode: Documentation-only; no schema or code changes executed

## Repository Evidence & Compatibility
The existing PrepFord repository in `apps/api/Models/Assessments.cs` and `apps/api/Data/AppDbContext.cs` defines:
- `Exam` with primary key `public string Id { get; set; } = Guid.NewGuid().ToString();`.
- `ExamAttempt` with primary key `string Id`, foreign key `string ExamId`, and user link `string UserId`.
- `ExamAttemptQuestion` with foreign key `string ExamAttemptId`, `string QuestionId`, and `int DisplayOrder`.

**Key Architectural Invariant:**
`ExamAttempt.ExamId` permanently references the exact `Exam` revision record that the candidate started. This relationship is preserved 100% intact. The new stable identity layer (`Examination`) is introduced additively above `Exam`.

## Additive Domain Model

### 1. `Examination` (Stable Identity Entity)
Represents the examination family over its operational lifetime:
- `Id`: `string` (`text` PK, default `Guid.NewGuid().ToString()`)
- `Pathway`: `string` (max 10, e.g. `"rn"` or `"pn"`)
- `Code`: `string` (max 16, unique index, e.g. `"RN-EX-000001"`)
- `Title`: `string` (max 128)
- `CreatedAt`: `DateTime` (`DateTime.UtcNow`)
- `CreatedBy`: `string` (max 128)
- `CurrentRevisionId`: `string?` (nullable FK to `Exam`)
- `SuccessorExaminationId`: `string?` (nullable FK to `Examination`)

### 2. `Exam` (Revision Entity)
Represents a specific revision of the examination content and configuration:
- Existing columns preserved: `Id`, `Title`, `Description`, `Pathway`, `ExamType`, `TimeLimitMinutes`, `PassingScorePercent`, `IsPublished`, `CreatedAt`, `UpdatedAt`.
- Additive foreign key: `ExaminationId` (`string`, FK to `Examination.Id`, ON DELETE RESTRICT).
- Additive revision number: `RevisionNumber` (`int`, unique within `ExaminationId`).
- Additive lifecycle state: `LifecycleState` (`ExamLifecycleState`: `Draft=1`, `InReview=2`, `Approved=3`, `Published=4`, `Archived=5`, `Retired=6`).
- Additive concurrency token: `ConcurrencyToken` (`long`, configured with `IsConcurrencyToken()`).
- Additive staffing audit trail: `CreatedBy`, `SubmittedBy`, `SubmittedAt`, `ReviewedBy`, `ReviewedAt`, `ApprovedBy`, `ApprovedAt`, `PublishedBy`, `PublishedAt`, `ArchivedBy`, `ArchivedAt`, `RetiredBy`, `RetiredAt`.

## Relationship Cardinalities & Diagram

```text
Examination (Stable Identity)
  1 ────< Exam (Revision Rows: Draft, InReview, Approved, Published, Archived, Retired)
             │
             ├───< ExamQuestion (Question set configured for this revision)
             │
             └───< ExamAttempt (Candidate attempts bound to exact revision row)
                         │
                         ├───< ExamAttemptQuestion (Authoritative relational attempt membership)
                         ├───< AttemptResponse (Candidate answers)
                         └───[ MetadataSnapshot (JSONB metadata snapshot) ]
```

## Revision and Publication Invariants

1. **Belonging Invariant:** Every revision row belongs to exactly one stable `Examination` parent (`Exam.ExaminationId -> Examination.Id`).
2. **Revision Number Uniqueness:** Revision numbers are strictly unique within each stable Examination family (`UNIQUE (ExaminationId, RevisionNumber)`).
3. **Single Active Draft Invariant:** At most one revision per Examination family may be in the `Draft` state at any time. Enforced by PostgreSQL partial unique index:
   ```sql
   CREATE UNIQUE INDEX "IX_Exams_ExaminationId_ActiveDraft" 
   ON public."Exams" ("ExaminationId") 
   WHERE "LifecycleState" = 1;
   ```
4. **Single Published Revision Invariant:** At most one revision per Examination family may be in the `Published` state at any time. Enforced by PostgreSQL partial unique index:
   ```sql
   CREATE UNIQUE INDEX "IX_Exams_ExaminationId_SinglePublished" 
   ON public."Exams" ("ExaminationId") 
   WHERE "LifecycleState" = 4;
   ```
5. **Atomic Archiving of Superseded Revisions:** When an `Approved` revision is published, the domain transaction atomically transitions the existing `Published` revision to `Archived`, records its active in-progress attempt count, updates the target revision to `Published`, and updates `Examination.CurrentRevisionId`.
6. **Restoration Guard Against Dual-Published Inconsistency:** Restoring an `Archived` revision within the 30-day window checks whether another revision is currently `Published`. If so, restoration is blocked (HTTP 422) until the active published revision is archived or retired.
7. **CurrentRevisionId Boundary:** `Examination.CurrentRevisionId` must point to an `Exam` row belonging to the same `ExaminationId`.
8. **Immutability of Published Revisions:** Content updates (`Title`, `Description`, `TimeLimitMinutes`, `PassingScorePercent`, question membership) are permitted only when `LifecycleState == ExamLifecycleState.Draft`.
9. **Attempt Revision Binding:** Existing and historical attempts (`ExamAttempt`) permanently retain `ExamId` referencing the exact revision row used at attempt start.

## Status Summary
- Model Architecture: RECONCILED WITH REPOSITORY (String IDs, existing models preserved)
- Database Invariants: FULLY SPECIFIED (Partial unique indexes, atomic transitions)
- Next Gate: Implementation upon owner authorization

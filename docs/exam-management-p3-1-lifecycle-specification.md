# PrepFord Examination Management — P3.1 Lifecycle Specification

## Status
- Decision IDs: D2, D10, D13, D14
- Stage: Architecture Review Remediation
- Status: SPECIFICATION REMEDIATED & COMPLETE
- Approved states: Draft, InReview, Approved, Published, Archived, Retired

## Canonical Lifecycle Rule
`LifecycleState` is the single authoritative source of truth. `IsPublished` must not remain an independently editable source of truth. It is maintained only as a derived compatibility property synchronized from lifecycle state (`IsPublished = (LifecycleState == ExamLifecycleState.Published)`).

## State Definitions

1. **`Draft` (1):** Initial state of any new revision. Author/Exam Manager can edit content, settings, and question membership. Completely invisible to candidates and instructors. At most one active Draft per Examination family.
2. **`InReview` (2):** Submitted for review. Content is locked against author editing. Reviewer inspects content, records recommendations, or returns to Draft with reason.
3. **`Approved` (3):** Verified and approved by Admin (distinct from creator). Content remains locked. Not candidate-facing.
4. **`Published` (4):** Live and active. Instructors can view. Candidates can start attempts. Completely immutable. At most one revision per Examination family may be Published at any time.
5. **`Archived` (5):** Removed from active circulation. New attempts blocked immediately. Existing in-progress attempts continue undisturbed under original revision and snapshot. Restorable to Published within 30 calendar days (Superadmin override) provided no other revision is published.
6. **`Retired` (6):** Permanent, terminal state. Cannot be reactivated. Preserved indefinitely for historical attempt audits.

## State Transition Validation Matrix

| Action | From State | To State | Authorized Role | Mandatory Validation & Invariants | Audit Event (`AuditLog.Action`) |
|---|---|---|---|---|---|
| `CreateRevision` | None / Published | `Draft` | Exam Manager | Parent `Examination` exists; at most one active `Draft` per Examination; `RevisionNumber = Max + 1` | `ExamRevisionCreated` |
| `SubmitForReview` | `Draft` | `InReview` | Exam Manager | Contains >= 1 question; valid title, pathway, duration; locks editing | `ExamRevisionSubmitted` |
| `RecommendApproval` | `InReview` | `InReview` | Reviewer | Clinical review completed; advisory audit event; does NOT change state | `ExamRevisionReviewRecommended` |
| `ReturnForChanges` | `InReview` | `Draft` | Reviewer | Mandatory non-empty reason; unlocks for author edits | `ExamRevisionReturnedForChanges` |
| `Approve` | `InReview` | `Approved` | Admin | **Separation of duties: `CreatedBy != ActorId`**; content locked | `ExamRevisionApproved` |
| `Publish` | `Approved` | `Published` | Exam Manager | **Atomically archives previous Published revision**; syncs `IsPublished = true` | `ExamRevisionPublished` |
| `Archive` | `Published` | `Archived` | Exam Manager | **Existing attempts continue undisturbed**; new attempts blocked; records active attempt count | `ExamRevisionArchived` |
| `Restore` | `Archived` | `Published` | Superadmin (Override) | **`Now <= ArchivedAt + 30 Days`**; mandatory reason; **no other revision is currently Published** | `ExamRevisionRestored` |
| `Retire` | `Archived` | `Retired` | Exam Manager | **Terminal state**; permanently locks revision | `ExamRevisionRetired` |
| `EmergencyRetire` | `Published` | `Retired` | Superadmin (Override) | Terminal state; mandatory reason; archives active revision | `ExamLifecycleOverride` |

## Lifecycle Invariants & Safeguards

### 1. Separation of Duties
- An actor cannot approve a revision if `string.Equals(revision.CreatedBy, actorId, StringComparison.OrdinalIgnoreCase)`.
- Rejection returns HTTP 403 Forbidden.
- Evaluated against `ClaimTypes.NameIdentifier` (`User.FindFirst(ClaimTypes.NameIdentifier)?.Value` or `X-Authenticated-User-Id`).

### 2. Single Published Revision & Atomic Supersession
- Enforced at the database level by PostgreSQL partial unique index:
  ```sql
  CREATE UNIQUE INDEX "IX_Exams_ExaminationId_SinglePublished" 
  ON public."Exams" ("ExaminationId") 
  WHERE "LifecycleState" = 4;
  ```
- When an `Approved` revision is published:
  - If a revision is already `Published` under that `ExaminationId`:
    1. Query count of active in-progress attempts (`AttemptStatus.InProgress`).
    2. Set superseded revision: `LifecycleState = Archived`, `IsPublished = false`, `ArchivedAt = DateTime.UtcNow`, `ArchivedBy = actorId`.
    3. Record `ExamRevisionArchived` in `AuditLogs` with active attempts count.
  - Set target revision: `LifecycleState = Published`, `IsPublished = true`, `PublishedAt = DateTime.UtcNow`, `PublishedBy = actorId`.
  - Update `Examination.CurrentRevisionId = targetRevision.Id`.
  - All updates commit in a single atomic database transaction.

### 3. Archival vs Attempt Initialization Concurrency Guard
- When an examination is archived:
  - New candidate attempts are blocked immediately.
  - In `ExamAttemptsController.StartAttempt`, the transaction queries `Exam` where `Id == request.ExamId && LifecycleState == ExamLifecycleState.Published`.
  - If archival commits prior to the attempt transaction insert, the attempt query fails and returns HTTP 422 Unprocessable Entity ("Examination is no longer published for new attempts").
  - If an attempt was started prior to archival, it continues under its exact `ExamId` and immutable attempt snapshot without interruption or truncation.

### 4. 30-Day Restoration Window & Terminal Retirement
- Restoration is permitted only if `DateTime.UtcNow <= revision.ArchivedAt.Value.AddDays(30)`.
- Restoration requires that no other revision for that `ExaminationId` is currently `Published`. If one exists, restore is rejected with HTTP 422.
- `Retired` is terminal: no transition out of `Retired` is allowed.
- To revive a retired examination family, create a new `Examination` with `SuccessorExaminationId` set to the retired examination's `Id`.

## Status Summary
- State Machine: RECONCILED & COMPLETE
- Authorization Invariants: STRICTLY ENFORCED
- Database Invariants: PARTIAL UNIQUE INDEXES SPECIFIED
- Next Gate: Implementation upon owner authorization

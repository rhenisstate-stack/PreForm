# PrepFord Examination Management — P3.1 Lifecycle Specification

## Status
- Decision IDs: D2, D13, D14
- Status: OWNER APPROVED
- Approved states: Draft, InReview, Approved, Published, Archived, Retired
- Approved policies:
  - 30-day restoration window from Archived; retirement is terminal (Option A)
  - Archiving preserves existing in-progress attempts; blocks new attempts; records active attempts count (Option A)
  - Rejection returns to Draft with mandatory reason and audit event; no persistent Rejected state

## Canonical lifecycle rule
`LifecycleState` is the single authoritative source of truth. `IsPublished` must not remain an independently editable source of truth. It is maintained only as a derived compatibility flag synchronized from lifecycle state.

## Approved lifecycle state definitions

1. **`Draft`**: Revision is editable by author/Exam Manager. Not visible to candidates or instructors. Initial state of any new revision.
2. **`InReview`**: Revision is submitted for review and locked against casual editing. Reviewer inspects content and recommends approval or returns to Draft with reason.
3. **`Approved`**: Revision is verified and approved by Admin (distinct from creator). Locked against edits. Not yet candidate-facing or instructor-facing.
4. **`Published`**: Revision is live and candidate-facing. Instructors can view. Configuration is completely immutable. Any future changes require creating a new revision.
5. **`Archived`**: Examination is retired from active circulation. New attempts blocked immediately. Existing in-progress attempts continue unaffected. Restorable to Published within 30 calendar days.
6. **`Retired`**: Permanent, terminal lifecycle state. Cannot be reactivated. Preserved indefinitely for historical attempt audits.

## State transition table

| Source State | Action | Target State | Authorized Role | Mandatory Validation & Guards | Audit Event |
|---|---|---|---|---|---|
| *None* | `CreateRevision` | `Draft` | Exam Manager, Admin | Valid parent `Examination`; RevisionNumber sequential | `RevisionCreated` |
| `Draft` | `SubmitForReview` | `InReview` | Exam Manager, Admin | Must contain >= 1 question; valid title, pathway, duration | `RevisionSubmitted` |
| `InReview` | `ReturnForChanges` | `Draft` | Reviewer, Admin | Mandatory non-empty reason required | `RevisionReturnedForChanges` |
| `InReview` | `Approve` | `Approved` | Admin, Superadmin | Separation of duties: `CreatedBy != CurrentActorId` | `RevisionApproved` |
| `Approved` | `Publish` | `Published` | Exam Manager, Admin | Previous published revision under family archived if required | `RevisionPublished` |
| `Published` | `Archive` | `Archived` | Exam Manager, Admin | Captures active in-progress attempts count in audit record | `RevisionArchived` |
| `Archived` | `Restore` | `Published` | Superadmin (Override) | Allowed ONLY within 30 calendar days of `ArchivedAt` | `RevisionRestored` |
| `Archived` | `Retire` | `Retired` | Exam Manager, Admin | Terminal transition; permanently locks revision | `RevisionRetired` |
| `Published` | `Retire` | `Retired` | Superadmin (Override) | Exceptional terminal retirement; requires mandatory reason | `RevisionRetired` |

## Detailed policy rules

### 1. Rejection returns to `Draft`
- Rejection is not a standalone terminal or holding state.
- When a Reviewer returns a revision for changes, the state transitions from `InReview` directly to `Draft`.
- A mandatory reason must be provided by the reviewer.
- An audit event (`RevisionReturnedForChanges`) records reviewer, timestamp, previous state (`InReview`), target state (`Draft`), and the reason string.

### 2. Archiving with active candidate attempts (Decision 6 / D14)
- Archiving immediately prevents any new candidate attempts from being created.
- Existing in-progress candidate attempts are completely unaffected:
  - Candidates continue their attempts without disruption or early cutoff.
  - The attempt remains bound to its exact starting revision and immutable attempt metadata snapshot.
  - Candidates can submit and complete their attempts according to normal attempt duration rules.
  - No change occurs to attempt status, responses, question membership, or grading state.
- The archival action must record the count of active attempts at the moment of archival in the audit event.

### 3. Restoration window & retirement (Decision 5 / D13)
- An `Archived` revision may be restored to `Published` within **30 calendar days** of archival.
- Restoration is restricted to authorized administrative override (Superadmin) and requires a documented reason.
- After 30 calendar days have elapsed, the examination becomes eligible for permanent retirement.
- `Retired` is strictly terminal:
  - A `Retired` examination revision cannot be restored or reactivated.
  - Historical records, attempts, and attempt snapshots remain immutable and accessible for reporting.
  - If a retired examination must be reintroduced, a brand new `Examination` identity must be created, linked to the retired predecessor via an explicit `SuccessorExaminationId` relationship.

## Transition invariants
1. Immutability of Published revisions: Once published, an `Exam` row's content fields cannot be updated. Any update requires creating a new revision (e.g., Revision 2 in `Draft` state).
2. Separation of duties: An actor cannot execute `Approve` on a revision if `CreatedBy == ActorId`.
3. Safe Concurrency: Every lifecycle transition validates the `ConcurrencyToken`.

## Status summary
- Product policy: OWNER APPROVED (Option A for all lifecycle choices)
- State machine: FULLY SPECIFIED (6 states, 9 transitions)
- Next gate: Implementation upon owner authorization

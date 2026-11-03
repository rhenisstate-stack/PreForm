# PrepFord Examination Management — P3.1 Lifecycle Specification

## Status
- Decision ID: D2
- Status: OWNER APPROVED
- Approved states: Draft, InReview, Approved, Published, Archived, Retired
- Rejection behavior: return to Draft with reason + audit event
- Prohibited: persistent Rejected state

## Repository evidence
The current model in `apps/api/Models/Assessments.cs` contains only `IsPublished` and no lifecycle state machine. The repository docs in `docs/exam-management-p3-owner-decisions.md` and `docs/exam-management-p3-domain-blueprint.md` describe a six-state lifecycle, but the actual implementation still treats publication as a simple boolean. The owner-approved decision formalizes the product policy and requires a single authoritative lifecycle representation.

## Canonical lifecycle rule
Lifecycle state is the authoritative source of truth. `IsPublished` must not remain an independently editable source of truth after implementation.

It may exist temporarily as a compatibility representation, but it must be synchronized from lifecycle transitions and treated as derived compatibility data until it is retired.

## Approved lifecycle states
1. `Draft`
2. `InReview`
3. `Approved`
4. `Published`
5. `Archived`
6. `Retired`

## Transition matrix

| Current state | Action | Resulting state | Required permission | Required validation | Required metadata | Audit event |
|---|---|---|---|---|---|---|
| Draft | Submit for review | InReview | create/edit authority or review-initiation authority | revision is valid for submission; no missing required metadata | submitter, timestamp, reason if applicable | `ExaminationSubmittedForReview` |
| InReview | Return for changes | Draft | reviewer or designated review authority | review decision is valid; mandatory reason | reviewer, timestamp, reason | `ExaminationReturnedForChanges` |
| InReview | Approve | Approved | approver authority distinct from creator | creator cannot approve own revision; revision passes checks | approver, timestamp, reason optional | `ExaminationApproved` |
| InReview | Reject | Draft | reviewer or approver authority | rejection reason required | reviewer, timestamp, reason | `ExaminationRejected` |
| Approved | Publish | Published | publication authority, distinct from approval if product policy requires separation | not already published; no stale conflict | publisher, timestamp, reason optional | `ExaminationPublished` |
| Published | Archive | Archived | archive authority | archive permitted for active/complete attempts subject to policy | actor, reason, timestamp | `ExaminationArchived` |
| Archived | Restore | Published or prior approved state | restore authority within allowed window | restore permitted only within policy window | actor, reason, timestamp | `ExaminationRestored` |
| Published | Retire | Retired | retirement authority | retirement must be explicit and auditable | actor, reason, timestamp | `ExaminationRetired` |
| Retired | Reopen | OWNER APPROVAL REQUIRED | OWNER APPROVAL REQUIRED | not recommended without explicit product approval | actor, reason, timestamp | `ExaminationReactivated` or DEFERRED |
| Archived | Retire | Retired | retirement authority | only allowed after restore or explicit policy | actor, reason, timestamp | `ExaminationRetired` |

## Policy clarifications

### 1. Submission withdrawal
Recommended rule:
- A revision may be withdrawn from review while still `InReview` only by an authorized actor.
- Withdrawal should return the revision to `Draft` with a required reason explaining why the submission was withdrawn.
- No automatic withdrawal from `Approved` or `Published` states.
- Status: IMPLEMENTATION DETAIL REQUIRED

### 2. Reviewer return-for-changes
Recommended rule:
- A reviewer may reject and return a revision to `Draft` with explicit reason.
- A return-for-changes action must preserve audit evidence of who rejected, why, and when.
- Status: OWNER APPROVED

### 3. Rejection and resubmission
Recommended rule:
- Rejection is not a new lifecycle state; it is a transition to `Draft` with recorded reason.
- Resubmission re-enters `InReview` after a valid submission action.
- Status: OWNER APPROVED

### 4. Approval and publication separation
Recommended rule:
- `Approved` and `Published` are distinct states.
- Publication is the operation that exposes the revision to candidate access.
- Approval alone does not make the revision candidate-visible.
- Status: OWNER APPROVED

### 5. Whether an approver can also publish
Recommended interpretation:
- The owner approved “separation of duties” but did not approve a single-person approval-and-publish rule.
- Default implementation should require distinct actors for approval and publication unless the owner explicitly approves a combined permission.
- Status: OWNER APPROVAL REQUIRED

### 6. Whether an administrator can override a transition
Recommended interpretation:
- Superadmin override is allowed only for a documented emergency path and must be fully audited.
- Override permission must be explicit and separate from normal operational review/approve/publish actions.
- Status: OWNER APPROVAL REQUIRED

### 7. Archival while candidate attempts are active
Recommended rule:
- A `Published` revision may be archived only if the product policy allows candidate attempts to continue according to a defined expiry policy.
- If active attempts are allowed to continue, the revision may remain accessible for those attempts while being unavailable for new attempts.
- Status: OWNER APPROVAL REQUIRED

### 8. Existing active attempts after archival
Recommended rule:
- Existing attempts remain associated with the exact published revision they started.
- Archived state prevents new attempts but does not invalidate historical attempt results.
- Status: OWNER APPROVED

### 9. Restoration within 30 days
Recommended rule:
- `Archived` revisions may be restored within a defined restore window, defaulting to 30 days unless product policy changes.
- Restore moves the revision back to `Published` if it is still valid, or to a prior approved state if the product prefers a more conservative path.
- Status: IMPLEMENTATION DETAIL REQUIRED

### 10. Behavior after the restoration window
Recommended rule:
- After the restore window, the revision must not be automatically reactivated.
- The project should require explicit retirement or a new revision if the item needs to re-enter lifecycle flow.
- Status: OWNER APPROVAL REQUIRED

### 11. Retirement semantics
Recommended rule:
- `Retired` is terminal for the revision unless a future product approval reopens that process.
- Retired revisions should remain read-only for historical reporting and candidate-result integrity.
- Status: OWNER APPROVED

### 12. Whether retired examinations can ever be restored
Recommended rule:
- Default: No, retired is terminal.
- If the product later approves reactivation, it should be implemented through a new revision, not by reactivating the historical row directly.
- Status: OWNER APPROVAL REQUIRED

## Audit and validation requirements
Every lifecycle transition must log:
- actor identity
- timestamp
- revision identity
- prior state
- new state
- reason (required for rejection, return-to-draft, archive, retirement)
- optional correlation metadata

Failure handling:
- Lifecycle validation must fail server-side and return the normal API error envelope.
- No silent state change is allowed.
- Transactions must keep lifecycle state and audit event together where the current infrastructure supports it.

## Invariants
- New revision records begin in `Draft`.
- `Draft` revisions are editable by authorized administrators.
- `InReview` revisions are not editable through ordinary metadata updates.
- `Approved` revisions cannot be casually modified.
- `Published` revisions are immutable; any substantive change requires a new revision.
- `Archived` revisions are not available for new candidate attempts.
- Retired revisions cannot be restored unless explicit future policy permits it.
- Candidate attempts retain access to the revision used to start the attempt.

## Final recommendation
Use a state machine that treats lifecycle as authoritative and keeps rejection non-persistent. The implementation should not add a seventh state merely to simplify code. Rejection should be a documented transition back to `Draft` with required reason and audit evidence.

## Status summary
- Product policy: OWNER APPROVED
- Technical implementation details: IMPLEMENTATION DETAIL REQUIRED
- Transition design: RECOMMENDED
- Next gate: OWNER REVIEW REQUIRED

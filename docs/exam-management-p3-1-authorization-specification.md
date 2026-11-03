# PrepFord Examination Management — P3.1 Authorization Specification

## Status
- Decision IDs: D4, D10, D11, D12
- Status: OWNER APPROVED
- Approved direction:
  - Separation of duties (creator cannot approve own revision)
  - Role authorities: Reviewer recommends; Admin approves; Exam Manager publishes; Content Manager no exam approval/publish authority by default
  - Narrow, explicitly audited administrative overrides
  - Instructor visibility: Published only

## Repository evidence
The repository uses ASP.NET Core authorization policies and normalizes roles via `apps/api/Services/RoleHierarchy.cs`:
- `superadmin`
- `admin` / `administrator`
- `exam_manager`
- `content_manager`
- `reviewer`
- `instructor`
- `candidate`

Existing global RBAC and authentication infrastructure remain preserved and are not refactored.

## Core authorization principles
1. **Separation of duties:** The creator of an examination revision cannot approve that revision.
2. **Distinct authorities:** Review, approval, and publication are distinct responsibilities assigned to separate roles.
3. **Least privilege:** Roles hold only the permissions strictly necessary for their domain workflow.
4. **Server-authoritative:** All rules are enforced by backend service and domain logic, never relying on UI hiding.
5. **Auditability:** Every lifecycle change and override records actor, timestamp, prior state, new state, and mandatory reason where required.

## Canonical role-action authorization matrix

| Action | Superadmin | Admin | Exam Manager | Content Manager | Reviewer | Instructor | Candidate |
|---|---|---|---|---|---|---|---|
| View Published exam | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed (if assigned/eligible) |
| View Draft / InReview / Approved | Allowed | Allowed | Allowed | Allowed | Allowed (assigned) | **Denied** | **Denied** |
| View Archived / Retired | Allowed | Allowed | Allowed | Allowed | Denied | **Denied** | **Denied** |
| Create revision / exam | Allowed | Allowed | Allowed | Denied* | Denied | Denied | Denied |
| Edit Draft revision | Allowed | Allowed | Allowed | Denied* | Denied | Denied | Denied |
| Submit for review (Draft -> InReview) | Allowed | Allowed | Allowed | Denied* | Denied | Denied | Denied |
| Review / Return for changes (InReview -> Draft) | Allowed | Allowed | Denied | Denied | **Allowed** | Denied | Denied |
| Recommend approval | Allowed | Allowed | Denied | Denied | **Allowed** | Denied | Denied |
| Approve revision (InReview -> Approved) | Allowed** | **Allowed**** | Denied | Denied | Denied | Denied | Denied |
| Publish revision (Approved -> Published) | Allowed | Allowed | **Allowed** | Denied | Denied | Denied | Denied |
| Archive revision (Published -> Archived) | Allowed | Allowed | **Allowed** | Denied | Denied | Denied | Denied |
| Restore revision (Archived -> Published) | **Allowed** (Override) | Denied | Denied | Denied | Denied | Denied | Denied |
| Retire revision (Archived/Published -> Retired) | Allowed | Allowed | **Allowed** | Denied | Denied | Denied | Denied |
| Exceptional lifecycle override | **Allowed** (Audited) | Conditional (Audited) | Denied | Denied | Denied | Denied | Denied |

*\*Content Manager has no examination lifecycle approval, creation, or publication authority by default (Decision 2 / D10). Future content delegation requires explicit owner authorization.*  
*\*\*Admin and Superadmin cannot approve revisions that they personally created (Separation of Duties / D4).*

## Separation-of-duties rules

### Rule 1 — Creator cannot approve own revision (Enforced)
- Evaluated at the service layer prior to executing `Approve`.
- If `Revision.CreatedBy == currentActorId`, the request is rejected with HTTP 403 Forbidden ("Creators cannot approve their own revisions").
- Applies equally to Admin and Superadmin actors.

### Rule 2 — Split approval and publication authority
- **Reviewer:** Conducts review; recommends approval or returns revision to Draft with mandatory reason. Cannot approve or publish.
- **Admin:** Approves revision (moves InReview -> Approved). Cannot approve own creation.
- **Exam Manager:** Manages drafting, submits for review, and publishes approved revisions (moves Approved -> Published). Cannot self-approve.
- **Combined execution constraint:** The same person may approve and publish only if they did not create the revision.

### Rule 3 — Instructor visibility restricted to Published examinations (Enforced)
- Instructors are strictly prohibited from viewing examinations in `Draft`, `InReview`, `Approved`, `Archived`, or `Retired` states.
- All repository queries and API endpoints serving instructors filter strictly by `LifecycleState == ExamLifecycleState.Published`.
- Prevents accidental exposure of unapproved, draft, or retired test items.

## Administrative override scope (Admin & Superadmin)

### Admin permissions
- Approve eligible revisions (subject to creator separation of duties).
- Perform standard administrative lifecycle actions permitted by policy.
- Correct documented administrative errors through controlled, auditable operations.

### Superadmin permissions
- Perform exceptional administrative overrides when normal workflows cannot resolve legitimate operational deadlocks.
- Restore an archived examination within the 30-calendar-day restoration window.
- Resolve exceptional lifecycle inconsistencies through dedicated reason-required operations.

### Strict prohibitions for both Admin and Superadmin
Neither Admin nor Superadmin may:
1. Silently rewrite historical candidate attempts.
2. Alter or replace immutable attempt metadata snapshots.
3. Rewrite historical examination revisions after publication.
4. Bypass audit logging or suppress security events.
5. Alter server-authoritative grading or attempt-question membership.
6. Approve their own created revision.

### Mandatory override audit log fields
Every administrative override must record:
- `ActorId` and `EffectiveRole`
- `TargetExaminationId` and `TargetRevisionId`
- `PreviousState` and `ResultingState`
- `MandatoryReason` (minimum length enforced, non-empty)
- `TimestampUtc`
- `OverrideOperationType`
- `AuditCorrelationId` and client IP/user agent

## Status summary
- Role matrix: OWNER APPROVED (Option A)
- Separation of duties: ENFORCED
- Overrides: NARROW & EXPLICITLY AUDITED
- Instructor access: PUBLISHED ONLY
- Next gate: Implementation upon owner authorization

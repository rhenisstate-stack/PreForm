# PrepFord Examination Management — P3.1 Authorization Specification

## Status
- Decision IDs: D4, D10, D11, D12
- Stage: Architecture Review Remediation
- Status: SPECIFICATION REMEDIATED & COMPLETE
- Scope: Examination management and lifecycle transitions

## Repository Evidence & RBAC Preservations
The existing PrepFord authentication and role resolution systems in `apps/api/Services/RoleHierarchy.cs` and `apps/api/Program.cs` define the canonical normalized roles:
- `superadmin`
- `admin` (and normalized synonym `administrator`)
- `exam_manager`
- `content_manager`
- `reviewer`
- `instructor`
- `candidate`

Existing global authentication schemes, bearer token validation, and role resolution logic are preserved without refactoring.

## Core Authorization Principles
1. **Separation of Duties:** The creator of an examination revision cannot approve that revision.
2. **Distinct Authorities:** Review, approval, and publication are separate responsibilities assigned to distinct roles.
3. **No Ordinary Superadmin Intrusion:** Superadmin performs exceptional audited overrides only; Superadmin does not participate in ordinary review, approval, or publication.
4. **Instructor Boundary:** Instructors are strictly confined to `Published` examinations.
5. **Server-Authoritative Enforcement:** All policy checks are executed in backend domain services, never relying on UI hiding.

## Canonical Authority Matrix

| Action | Superadmin | Admin | Exam Manager | Content Manager | Reviewer | Instructor | Candidate |
|---|---|---|---|---|---|---|---|
| View Published examination | Allowed | Allowed | Allowed | Allowed | Allowed | **Allowed** | Allowed (if eligible) |
| View Draft / InReview / Approved | Allowed (audit) | Allowed | Allowed | Denied* | Allowed (assigned) | **Denied** | **Denied** |
| View Archived / Retired | Allowed (audit) | Allowed | Allowed | Denied* | Denied | **Denied** | **Denied** |
| Create revision (`Draft`) | Denied | Denied | **Allowed** | Denied* | Denied | Denied | Denied |
| Edit Draft revision | Denied | Denied | **Allowed** | Denied* | Denied | Denied | Denied |
| Submit for review (`Draft -> InReview`) | Denied | Denied | **Allowed** | Denied* | Denied | Denied | Denied |
| Review revision content | Denied | Allowed | Allowed | Denied* | **Allowed** | Denied | Denied |
| Recommend approval (Advisory event) | Denied | Denied | Denied | Denied* | **Allowed** | Denied | Denied |
| Return for changes (`InReview -> Draft`) | Denied | Denied | Denied | Denied* | **Allowed** | Denied | Denied |
| Approve revision (`InReview -> Approved`) | Denied** | **Allowed**** | Denied | Denied* | Denied | Denied | Denied |
| Publish revision (`Approved -> Published`)| Denied | Denied | **Allowed** | Denied* | Denied | Denied | Denied |
| Archive revision (`Published -> Archived`) | Denied | Denied | **Allowed** | Denied* | Denied | Denied | Denied |
| Restore revision (`Archived -> Published`) | **Allowed** (Override) | Denied | Denied | Denied* | Denied | Denied | Denied |
| Retire revision (`Archived -> Retired`) | Denied | Denied | **Allowed** | Denied* | Denied | Denied | Denied |
| Exceptional Emergency Override | **Allowed** (Audited) | Denied | Denied | Denied* | Denied | Denied | Denied |

*\*Content Manager has no examination lifecycle creation, review, approval, or publication authority by default (Decision 2 / D10).*  
*\*\*Superadmin does not participate in ordinary approvals (Remediation B).*  
*\*\*\*Admin cannot approve revisions they personally created (Separation of Duties / D4).*

## Separation-of-Duties Enforcement Rule
- Evaluated in `ExamLifecycleService.ApproveAsync(revisionId, user)`:
  - Actor ID is extracted via:
    ```csharp
    var actorId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    ```
  - If `string.Equals(revision.CreatedBy, actorId, StringComparison.OrdinalIgnoreCase)`, the approval request is rejected immediately with **HTTP 403 Forbidden**:
    `"Separation of duties violation: The creator of a revision cannot approve that revision."`
  - Applies equally to any administrative user.

## Reviewer Workflow & Auditable Events
- **Review Action:** The Reviewer inspects revision settings and question membership.
- **Recommend Approval:** When clinical review is satisfied, the Reviewer executes `RecommendApproval`. This emits an auditable event `ExamRevisionReviewRecommended` in `AuditLogs`. It does **not** move the revision to `Approved`; only an Admin can perform `Approve`.
- **Return for Changes:** If revisions are required, the Reviewer executes `ReturnForChanges` providing a mandatory non-empty reason string. This moves `InReview -> Draft` and logs `ExamRevisionReturnedForChanges`.

## Instructor Visibility Guard
- Instructors are strictly prohibited from viewing examinations in `Draft`, `InReview`, `Approved`, `Archived`, or `Retired` states.
- All repository queries and API endpoints serving instructors apply a mandatory database filter:
  ```csharp
  query = query.Where(e => e.LifecycleState == ExamLifecycleState.Published);
  ```

## Administrative Override Scope (Superadmin)
- **Authorized Override Operations:**
  1. `EmergencyRestore`: Restores an `Archived` exam within 30 days when operational deadlocks prevent normal flow.
  2. `EmergencyRetire`: Forces terminal retirement of an archived or compromised published examination.
  3. `DeadlockOverride`: Resolves lifecycle inconsistencies with explicit mandatory audit evidence.
- **Prohibitions:** Superadmin may never:
  - Silently rewrite historical candidate attempts.
  - Alter or replace immutable attempt metadata snapshots.
  - Rewrite published examination revisions.
  - Bypass audit logging.
  - Approve their own revision.

## Status Summary
- Role Matrix: RECONCILED WITH OWNER DECISIONS (Ordinary vs override authorities separated)
- Separation of Duties: STRICTLY ENFORCED
- Instructor Filter: PUBLISHED ONLY
- Next Gate: Implementation upon owner authorization

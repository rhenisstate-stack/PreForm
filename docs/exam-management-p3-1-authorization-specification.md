# PrepFord Examination Management — P3.1 Authorization Specification

## Status
- Decision ID: D4
- Status: OWNER APPROVED
- Approved rule: separation of duties, including creator cannot approve own revision
- Scope: examination management and lifecycle transitions only
- Restricted: do not alter global RBAC or authentication provider

## Repository evidence
The current repository contains role names and hierarchy normalization in `apps/api/Services/RoleHierarchy.cs`, and the authorization policies are referenced from `apps/api/Program.cs`. These files confirm the canonical role set currently used by the app:
- `superadmin`
- `admin`
- `administrator` (normalized synonym)
- `exam_manager`
- `content_manager`
- `reviewer`
- `instructor`
- `candidate`

This repository does not yet apply a dedicated examination-specific policy matrix beyond general role requirements.

## Authorization principle
Use the existing RBAC system and role hierarchy; do not globally redesign it.

Examination authorization must enforce:
- creator cannot approve their own revision
- reviewer and approver are distinct operational authorities unless the owner approves otherwise
- publication is not simply a metadata edit
- candidates can only access eligible published examinations
- server-side checks must remain authoritative; UI hiding is not sufficient

## Recommended action matrix

| Action | Superadmin | Admin | Exam Manager | Content Manager | Reviewer | Instructor | Candidate |
|---|---|---|---|---|---|---|---|
| View management records | Allowed | Allowed | Allowed | Allowed | Conditional | Conditional | Denied |
| Create examination | Allowed | Allowed | Conditional | Allowed | Denied | Denied | Denied |
| Edit Draft | Allowed | Allowed | Conditional | Allowed | Denied | Denied | Denied |
| Submit for review | Allowed | Allowed | Allowed | Allowed | Denied | Denied | Denied |
| Review | Allowed | Allowed | Allowed | Allowed | Allowed | Denied | Denied |
| Reject | Allowed | Allowed | Allowed | Allowed | Conditional | Denied | Denied |
| Approve | Allowed | Allowed | Conditional | Conditional | Denied | Denied | Denied |
| Publish | Allowed | Allowed | Conditional | Conditional | Denied | Denied | Denied |
| Archive | Allowed | Allowed | Allowed | Conditional | Denied | Denied | Denied |
| Restore | Allowed | Allowed | Allowed | Conditional | Denied | Denied | Denied |
| Retire | Allowed | Allowed | Allowed | Conditional | Denied | Denied | Denied |
| Create new revision | Allowed | Allowed | Allowed | Allowed | Denied | Denied | Denied |
| Emergency override | Allowed | Conditional | Denied | Denied | Denied | Denied | Denied |
| Candidate access to published exam | Denied (unless candidate) | Denied | Denied | Denied | Denied | Denied | Allowed if eligible |

## Separation-of-duties rules

### Rule 1 — creator cannot approve own revision
This is a mandatory rule. Implementation must enforce it in the service layer and not rely on UI logic. The creator may submit, revise, and resubmit, but cannot approve or publish their own revision.

### Rule 2 — reviewer and approver are distinct by default
The owner approved separation of duties, which implies that the same actor should not be able to perform all normal lifecycle approvals without explicit product permission.

### Rule 3 — approver may not automatically publish
Default recommendation: publication and approval are separate permission checks. The implementation should treat them as separate capabilities until the owner approves a combined capability.

### Rule 4 — candidate visibility remains restricted to eligible published revisions
Candidate access must remain restricted to the eligible published state only. Archived, Draft, InReview, or Retired states remain ineligible for new attempts unless explicit product policy approves otherwise.

## Role-specific recommendations

### Exam Manager
Appropriate for:
- review
- publish
- retire
- new revision creation
- archive / restore

Status: `Allowed` for operational lifecycle control, but approval/publish separation should remain enforced depending on owner confirmation.

### Content Manager
Appropriate for:
- draft edits
- review initiation
- submission management
- content-oriented lifecycle control

Status: `Conditional` for final approval/publication until absolute role boundaries are confirmed.

### Reviewer
Appropriate for:
- review
- reject or return-to-draft

Status: `Conditional` for final reject/approve depending on owner approval.

### Instructor
Appropriate for:
- read-only visibility if the owner approves broader management visibility

Default recommendation: `Denied` from management operations; instructor visibility is not required for the core P3.1 foundation unless explicitly approved.

### Admin and Superadmin
Appropriate for emergency governance and override flow. They must still obey the same business rules unless the owner approves a narrow emergency override model.

## Least-privilege design
The recommended default least-privilege matrix is:
- `Draft` editing: Content Manager and Admin/Superadmin only
- `Submit` and `Review`: Exam Manager + Content Manager + Reviewer, with reviewer restricted to return-to-draft or reject
- `Approve`: separate approval role or explicit approver permissions
- `Publish`: separate publication role or explicit path from approved revisions
- `Archive`, `Restore`, `Retire`: Exam Manager + Admin/Superadmin

## Required unresolved decisions
These are not product-policy selections already approved; they need explicit owner confirmation:
- Whether `Exam Manager` can approve a revision without a separate approval authority
- Whether `Content Manager` can both review and publish
- Whether `Admin`/`Superadmin` are allowed to override normal review and approval steps for emergency cases
- Whether instructors should be able to view unpublished examinations for academic operations

## Security constraints
- No global RBAC redesign, no new authentication provider, no new custom role names.
- Server-side authorization must enforce all transitions.
- Policy checks must be evaluated against revision identity, lifecycle state, and actor identity.
- Candidate access must remain restricted to the published and eligible revision set.

## Final recommendation
Adopt a least-privilege policy that is already compatible with the repo’s existing role hierarchy and separation-of-duties requirement. The implementation should enforce creator self-approval denial and keep approval/publish authority distinct by default until the owner explicitly approves a merged role path.

## Status summary
- Product policy: OWNER APPROVED
- Implementation detail: OWNER APPROVAL REQUIRED for exact role-specific publish/approve combinations
- Global RBAC: preserved, not refactored
- Next gate: OWNER REVIEW REQUIRED

# PREPFORD — P3.1 FINAL OWNER DECISION REGISTER

**Phase:** P3.1 — Examination Domain Foundation  
**Status:** OWNER APPROVED  
**Decision date:** 3 November 2026  
**Implementation authorization:** NOT GRANTED (Requires subsequent review of consolidated specification and PostgreSQL preflight)

## 1. Purpose

This register resolves the remaining implementation-level decisions identified during P3.1 architecture formalization.

The eight previously approved architectural directions remain approved and must not be reopened without a specific reason:

1. Stable Examination identity + version-specific revisions (Option B).
2. Six-state lifecycle: Draft, InReview, Approved, Published, Archived, Retired.
3. Immutable, server-generated attempt metadata snapshot.
4. Separation of duties: a revision's creator cannot approve that revision.
5. Application-managed optimistic concurrency.
6. Sequential, pathway-scoped examination codes.
7. Lifecycle as the canonical publication source; `IsPublished` is not an independent source of truth.
8. Isolated local PostgreSQL verification.

This document resolves the outstanding policy and implementation choices only.

---

# 2. Outstanding owner decisions

## Decision 1 — Examination code format

**Question:** What format should examination codes use?

### Recommended decision

Use pathway-prefixed, zero-padded sequential codes:

- RN: `RN-EX-000001`
- PN: `PN-EX-000001`

Rules:

- RN and PN maintain independent sequences.
- Codes are assigned when a stable Examination identity is created, not when an individual revision is created.
- All revisions under one Examination identity retain the same code.
- Codes are permanent and never reused, including after archival or retirement.
- Allocation must be transaction-safe under concurrent requests.
- A failed transaction must not leave a partially created examination.
- Existing records must not receive fabricated historical codes.

### Alternatives

- **A:** Separate RN/PN sequences — recommended.
- **B:** One shared sequence across RN and PN.
- **C:** Another owner-defined format.

**Owner decision:** APPROVE A

**Selection:** Option A (Separate RN/PN sequences: `RN-EX-000001` / `PN-EX-000001`)

---

## Decision 2 — Approval and publication authority

**Question:** Which roles can approve and publish examination revisions?

### Recommended decision

Separate review, approval, and publication responsibilities.

| Role | Recommended permissions |
|---|---|
| Exam Manager | Create and manage revisions; submit for review; publish an approved revision |
| Reviewer | Review and recommend approval or return for changes; cannot approve or publish |
| Admin | Approve revisions; cannot approve revisions they created |
| Superadmin | Administrative override under the restrictions in Decision 3 |
| Instructor | View published examinations only |
| Content Manager | No examination lifecycle approval or publication authority by default |
| Candidate | Access only examinations made available to them |

Additional rules:

- Submission moves Draft to InReview.
- Review is a distinct action and must be auditable.
- Approval moves InReview to Approved.
- Publication moves Approved to Published.
- A revision cannot be published before approval.
- The same person may approve and publish only if they did not create the revision.
- A revision returned for changes must return to Draft with a mandatory reason.
- Every lifecycle action records actor, timestamp, previous state, new state, and reason where applicable.

### Alternatives

- **A:** Reviewer recommends; Admin approves; Exam Manager publishes — recommended.
- **B:** Admin both approves and publishes; Exam Manager only manages drafts.
- **C:** Exam Manager approves and publishes, with Reviewer as an optional review role.
- **D:** Another owner-defined role arrangement.

**Owner decision:** APPROVE A

**Selection:** Option A (Reviewer recommends; Admin approves; Exam Manager publishes)

---

## Decision 3 — Admin and Superadmin override scope

**Question:** How much authority should administrators have to bypass normal examination lifecycle rules?

### Recommended decision

Use narrowly scoped, explicitly audited administrative overrides.

**Admin may:**
- Approve eligible revisions, subject to separation of duties.
- Perform normal administrative lifecycle operations permitted by policy.
- Correct documented administrative errors through controlled, auditable operations.

**Superadmin may:**
- Perform exceptional administrative overrides when normal workflows cannot resolve a legitimate operational issue.
- Restore an archived examination within the permitted restoration window.
- Resolve exceptional lifecycle inconsistencies through a dedicated, reason-required operation.

**Neither role may:**
- Silently rewrite historical attempts.
- Change immutable attempt snapshots.
- Rewrite historical examination revisions after publication.
- Bypass audit logging.
- Treat an override as permission to alter server-authoritative grading or attempt membership.
- Approve their own revision.

Every override must capture:
- Actor and effective role.
- Target examination and revision.
- Previous and resulting states.
- Mandatory reason.
- Timestamp.
- Override operation type.
- Relevant audit correlation information.

### Alternatives

- **A:** Narrow, explicitly audited overrides — recommended.
- **B:** Superadmin has unrestricted lifecycle override authority.
- **C:** No lifecycle overrides; all exceptions require a formal new revision/workflow.

**Owner decision:** APPROVE A

**Selection:** Option A (Narrow, explicitly audited overrides)

---

## Decision 4 — Instructor visibility of unpublished examinations

**Question:** Should instructors see examinations that have not been published?

### Recommended decision

Instructors see Published examinations only.

They must not see:
- Draft examinations.
- InReview examinations.
- Approved but unpublished examinations.
- Archived examinations.
- Retired examinations.

Rationale:
- Reduces accidental disclosure of examination content.
- Keeps the instructor experience aligned with operational availability.
- Avoids exposing incomplete or unapproved material.
- Simplifies initial authorization rules.

If future instructor collaboration is needed, introduce a separately approved permission for explicitly assigned review access. Do not infer it from the Instructor role.

### Alternatives

- **A:** Published only — recommended.
- **B:** Published and Approved, read-only.
- **C:** Published plus explicitly assigned Draft/InReview access.
- **D:** All examinations, read-only.

**Owner decision:** APPROVE A

**Selection:** Option A (Published only)

---

## Decision 5 — Archive restoration window and retirement

**Question:** How long should archived examinations remain restorable, and can retired examinations be reactivated?

### Recommended decision

Use a 30-calendar-day restoration window.

Rules:

1. Archiving moves Published to Archived.
2. Archiving prevents new attempts from starting.
3. Existing attempts may continue under their original revision and snapshot.
4. An Archived examination may be restored to Published within 30 calendar days, subject to authorization and audit requirements.
5. After the restoration window, the examination becomes eligible for retirement.
6. Retirement is terminal: a Retired examination cannot be reactivated.
7. If an examination must return after retirement, create a replacement Examination identity and link it to the retired predecessor through an explicit successor relationship.
8. Never rewrite the retired examination's historical records.

The agent must distinguish between automatic retirement and an authorized retirement operation. Automatic state transitions must not be introduced without an explicit implementation specification and audit strategy.

### Alternatives

- **A:** 30-day restoration; retirement terminal — recommended.
- **B:** 60-day restoration; retirement terminal.
- **C:** 90-day restoration; retirement terminal.
- **D:** Archived examinations remain restorable indefinitely.
- **E:** Retired examinations may be reactivated through Superadmin override.

**Owner decision:** APPROVE A

**Selection:** Option A (30-day restoration; retirement terminal)

---

## Decision 6 — Archiving when active attempts exist

**Question:** What happens when an examination has candidates with active attempts?

### Recommended decision

Allow archival without invalidating existing attempts.

Rules:

- Archiving immediately blocks new attempts.
- Existing in-progress attempts remain associated with their exact examination revision.
- Candidates may continue and submit those attempts according to the original attempt rules.
- Archiving must not modify attempt status, responses, question membership, grading state, or metadata snapshots.
- Historical results remain accessible under the applicable candidate and administrative permissions.
- Restoration permits new attempts again only after all normal publication and availability conditions are satisfied.
- The archive operation must record the number of active attempts at the time of archival.

The agent must inspect existing attempt lifecycle and expiration behavior before implementing this policy. It must not invent new timeout or auto-submission rules.

### Alternatives

- **A:** Existing attempts continue; new attempts are blocked — recommended.
- **B:** Archiving is blocked until all active attempts finish.
- **C:** Existing attempts are terminated when the examination is archived.
- **D:** Another owner-defined policy.

**Owner decision:** APPROVE A

**Selection:** Option A (Existing attempts continue; new attempts are blocked)

---

## Decision 7 — Attempt snapshot storage

**Question:** Should immutable attempt metadata be stored as JSONB or normalized relational data?

### Recommended decision

Use a versioned JSONB snapshot for examination metadata, while preserving relational attempt-question membership.

Suggested conceptual structure:

- Snapshot schema version.
- Stable Examination identity.
- Exact revision identity.
- Examination code.
- Title and description as presented at attempt start.
- Pathway and examination type.
- Time limit and applicable attempt configuration.
- Publication/revision reference information.
- Snapshot creation timestamp.
- Any additional examination-level settings proven necessary by the current implementation.

Rules:

- Snapshot creation must be server-authoritative.
- Snapshot must be created atomically with attempt initialization.
- Snapshot must not be client-editable.
- Existing `ExamAttemptQuestion` remains the relational source for assigned question membership.
- The snapshot must not duplicate question content or replace question membership.
- A schema version must allow future snapshot interpretation.
- Historical attempts without snapshots must remain readable through an explicitly documented legacy compatibility path.
- Never fabricate snapshots for historical attempts.

The implementation agent must verify the current serialization conventions, PostgreSQL JSONB support, EF Core configuration, and migration patterns before proposing the final entity mapping.

### Alternatives

- **A:** Versioned JSONB metadata snapshot + relational question membership — recommended.
- **B:** Fully normalized relational snapshot tables.
- **C:** Hybrid JSONB and relational metadata, justified field by field.
- **D:** Another owner-defined design.

**Owner decision:** APPROVE A

**Selection:** Option A (Versioned JSONB metadata snapshot + relational question membership)

---

# 3. Consolidated approval record

The owner has explicitly approved every outstanding decision.

| No. | Decision | Recommended selection | Owner selection | Status |
|---|---|---|---|---|
| 1 | Examination code | A | Option A (Separate RN/PN sequences: `RN-EX-000001` / `PN-EX-000001`) | OWNER APPROVED |
| 2 | Approval/publication roles | A | Option A (Reviewer recommends; Admin approves; Exam Manager publishes) | OWNER APPROVED |
| 3 | Administrative overrides | A | Option A (Narrow, explicitly audited overrides) | OWNER APPROVED |
| 4 | Instructor visibility | A | Option A (Published only) | OWNER APPROVED |
| 5 | Restoration and retirement | A | Option A (30-day restoration; retirement terminal) | OWNER APPROVED |
| 6 | Active attempts during archive | A | Option A (Existing attempts continue; new attempts blocked) | OWNER APPROVED |
| 7 | Snapshot storage | A | Option A (Versioned JSONB snapshot + relational question membership) | OWNER APPROVED |

## 4. Mandatory implementation safeguards

Regardless of the selected options:

1. Preserve all eight previously approved architectural decisions.
2. Preserve Gate C server-authoritative grading and attempt-question membership protections.
3. Do not modify authentication infrastructure or role hierarchy broadly without a separately approved reason.
4. Do not fabricate historical examination revisions, approval events, publication dates, codes, or attempt snapshots.
5. Do not hard-delete examination records with historical attempts.
6. Do not modify existing attempts to make new lifecycle rules easier to implement.
7. Do not weaken, remove, or bypass existing tests.
8. Do not introduce new dependencies without justification and approval.
9. Do not run destructive database operations.
10. Do not target the shared or production `prepford` database during local verification.
11. Do not proceed to P3.2 or subsequent examination phases.
12. Stop and request owner approval whenever implementation requires a policy not covered by this register.

## 5. Approval boundary

Approval of this register authorizes the coding agent to:

- Update the P3.1 decision register and architecture specifications.
- Produce a consolidated, internally consistent implementation specification.
- Update the implementation-readiness report.
- Perform non-destructive PostgreSQL verification preflight.

Approval does **not** authorize:
- Application code changes.
- Entity or DTO modifications.
- Service or controller implementation.
- Authorization policy changes.
- EF Core migrations.
- Database schema or data changes.
- Frontend implementation.
- P3.2 or later work.

A separate explicit implementation authorization will be required after the final specification and PostgreSQL preflight have been reviewed.

---

## 6. Final owner authorization

**Owner:** PrepFord Product Owner

**Decision register status:** OWNER APPROVED

**Selected decisions:** All seven recommended decisions approved (Option A across Decisions 1–7).

**Additional conditions or exceptions:** None.

**Final decision:**

- [x] Approve all seven recommended decisions.
- [ ] Approve with the alternatives or amendments recorded above.
- [ ] Return for further architectural clarification.

**Owner confirmation:** PrepFord Product Owner

**Date:** 3 November 2026

**Implementation authorization:** NOT GRANTED BY THIS DOCUMENT. (Requires subsequent review of consolidated specification and PostgreSQL preflight).

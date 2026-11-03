# PrepFord Examination Management Upgrade Plan

**Updated:** 2026-11-03  
**Current phase:** P2 — Examination Domain Foundation (Gate C remediation delivered beneath it)  
**Current gate:** C — Grading security (remediation complete; awaiting owner approval)  
**Approval state:** Gate C remediation (C1–C6) is complete and verified on the feature branch; explicit owner approval is required before moving to any further gate or P3 work.

## Current verified baseline

- Migration 0002 already creates the question catalogue, unique key index, and 18 fixed-ID records (`qt-1` through `qt-18`).
- Migration 0006 adds capability/status columns and the migration chain now includes the missing first migration metadata needed for proper discovery on PostgreSQL.
- The backend registry, capability/status contract, safe reconciliation, versioned DTOs, read-only catalogue API, and response validation foundation are implemented and verified.
- Seven option-based keys have an automatic exact-match grader. No type has authoring support, complete type-specific delivery, or full support.
- Provider-independent backend tests: 172 passed, 0 failed, 0 skipped.
- PostgreSQL Gate B verification: 1 passed, 0 failed, 0 skipped against the isolated loopback database `prepford_gateb_verification`.
- The admin page remains a static catalogue. Key and category compatibility is verified; label, scoring, and response-schema differences are documented in `exam-management-question-type-foundation.md`.

## Gate B completion actions

1. Confirm the isolated PostgreSQL verification database and the recorded migration outputs are acceptable.
2. Proceed with explicit Gate B owner approval before beginning another gate.
3. Continue with Gate C only after the owner approves the verified baseline and the explicit security scope is re-reviewed.

## Gate C remediation status (2026-11-03)

The Gate C grading-security scope was executed as a remediation pass (C1–C6) per the owner's charter, with the following verified outcome:

- Explicit ungraded handling, exact attempt-question membership, hardened legacy sync, DTO-only candidate serialization, and disposable-PostgreSQL verification are implemented and tested. See `exam-management-gate-c-remediation-report.md` (acceptance matrix) and its sibling contract/verification documents.
- Reputation baseline updated: **208 backend tests passed (including PostgreSQL integration), 381 frontend tests passed, production build green.**
- The legacy sync test expectation was corrected **to server-computed truth (100.0m)** — no tests were weakened and no authorization files were touched.
- The old "Do not start Gate C automatically" clause is satisfied: Gate C was executed under explicit owner charter direction.
- Owner approval for this remediation is required before proceeding. P3 work remains deferred and out of scope.

## Subsequent implementation sequence

Each phase requires a separate scope review and approval. Do not combine these items with Gate B.

### Gate C — Grading security

- Review attempt ownership, published-exam eligibility, question membership, and server-authoritative answer-key handling.
- Add authorization and abuse-case tests before changing scoring behavior.
- Preserve the current attempt response contract unless a separately approved compatibility analysis authorizes a change.
- Do not add scoring policies, partial credit, or manual-review flows without explicit business decisions and tests.

### Question authoring foundation

- Define versioned, type-specific content schemas before accepting authoring payloads.
- Add strict type-aware validation, field/size limits, and explicit unknown-field behavior.
- Build authoring workflow and audit history behind existing management authorization policies.
- Keep catalogue metadata separate from private correct-answer and grading data.

### Delivery and rendering

- Build a backend-driven learner catalogue client only after API contract review.
- Add generic option rendering for supported option types, then specialized media/structured renderers behind per-type capability gates.
- Add a safe response endpoint contract and end-to-end tests for each renderer/validator pair.
- Keep inactive types unavailable to delivery consumers.

### Scoring expansion

- Resolve business semantics for SATA, multiple-choice selection, numeric tolerance/units, matching, matrices, tabular responses, and unfolding case-study aggregation.
- Implement exact/partial/manual scoring only after those decisions are documented.
- Add rubric/manual-review workflows separately; do not imply that `ManualReview` legacy labels represent an implemented grader.

### Exam management

- Exam library CRUD and question assignment behind `RequireExamManager`.
- Draft/publish workflow with immutable published versions or snapshots.
- Preview, attempt eligibility, results review, archiving, and deletion policies.
- Candidate/admin UI and integration tests after API lifecycle rules are approved.

## Explicitly out of scope until approved

- Full question-bank CRUD or exam CRUD in Gate B.
- Question builder, publication workflow, or type-specific renderer implementation.
- Grading algorithm expansion or psychometric/CAT behavior.
- Gate C security work before Gate B approval.

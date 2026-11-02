# PrepFord Examination Management Upgrade Plan

**Updated:** 2026-11-02  
**Current phase:** P2 — Examination Domain Foundation  
**Current gate:** B — Question-Type Foundation  
**Approval state:** Awaiting isolated PostgreSQL verification and Gate B owner approval. Do not start Gate C automatically.

## Current verified baseline

- Migration 0002 already creates the question catalogue, unique key index, and 18 fixed-ID records (`qt-1` through `qt-18`).
- Migration 0006 adds capability/status columns. Its EF discovery metadata is corrected; applying it against PostgreSQL remains unverified.
- The backend registry, capability/status contract, safe reconciliation, versioned DTOs, read-only catalogue API, and response validation foundation are implemented.
- Seven option-based keys have an automatic exact-match grader. No type has authoring support, complete type-specific delivery, or full support.
- Provider-independent backend tests: 172 passed, 0 failed, 0 skipped. PostgreSQL integration tests were not run because their fixture targets the shared `prepford` database and no disposable database is configured.
- The admin page remains a static catalogue. Key and category compatibility is verified; label, scoring, and response-schema differences are documented in `exam-management-question-type-foundation.md`.

## Gate B completion actions

1. Configure a disposable PostgreSQL database for integration verification.
2. Apply migrations through 0006 and confirm the existing `qt-1`–`qt-18` IDs and canonical keys remain unchanged.
3. Run catalogue reconciliation repeatedly; verify missing-row handling, preservation of administrator-managed metadata, duplicate prevention, and transaction rollback.
4. Record the PostgreSQL command/output in `exam-management-testing-report.md`.
5. Obtain explicit Gate B approval before beginning another gate.

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

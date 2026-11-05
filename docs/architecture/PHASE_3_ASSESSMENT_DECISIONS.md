# PREPFORD ARCHITECTURE DECISION RECORD
## Phase 3: Learner Assessment, Readiness Assessment (RAT) & Exam Delivery Integration

**Status:** APPROVED  
**Date:** November 5, 2026  
**Context:** PrepFord NCLEX Preparation Platform  
**Target Backend:** ASP.NET Core 8 / Entity Framework Core 8 / PostgreSQL  
**Target Frontend:** Next.js 16 App Router / React 19 / TypeScript  
**Baseline Commit:** `c632fd9`  

---

### 1. Canonical Storage Architecture & Zero Duplicate Stores

- **Decision:** All learner assessments consume questions directly from `Preform.Api.Models.Question` (`public."Questions"`) established in Phase 2, and persist attempt history exclusively to `ExamAttempts` (`public."ExamAttempts"`), `ExamAttemptQuestions` (`public."ExamAttemptQuestions"`), and `AttemptResponses` (`public."AttemptResponses"`).
- **Invariants:**
  - Zero parallel question tables for Readiness Assessment Tests (RAT), CAT, Practice Tests, or AI-generated assessments.
  - Zero parallel attempt tables for specific assessment modalities.
  - All assessment configurations reuse `Examination` (family header) and `Exam` (versioned revision specifications).
- **Rationale:** Preserves end-to-end data integrity, centralizes analytics and audit logging, and guarantees that question status, taxonomy associations, and revisions remain coherent across the entire platform.

---

### 2. Assessment Types & Readiness Assessment Test (RAT) Configuration

- **Decision:** PrepFord supports standard assessment types using the existing `ExamType` enumeration:
  - `ExamType.Practice` (Practice Examinations & Custom Tests): Customizable or preset question counts, untimed or timed, tutored or non-tutored mode with immediate rationale option.
  - `ExamType.DiagnosticReadiness` (Readiness Assessment Tests - RAT): Comprehensive, timed, fixed-length diagnostic assessments (standard 75 questions or configured count) designed to evaluate NCLEX readiness with high predictive fidelity.
  - `ExamType.CAT` (Computerized Adaptive Testing): Standard fixed-length simulation in Phase 3; dynamic IRT/CAT item selection deferred to future phases.
  - `ExamType.MockSimulation`: Timed full-length simulation of NCLEX testing conditions.
- **RAT Readiness Tiers:** Standardized to match clinical evidence and product expectations:
  - **Very High** ($\ge 75.0\%$): Strong likelihood of passing NCLEX.
  - **High** ($65.0\% - 74.99\%$): Good likelihood; targeted domain remediation recommended.
  - **Borderline** ($55.0\% - 64.99\%$): Moderate risk; comprehensive topic review advised.
  - **Low** ($< 55.0\%$): High risk; extensive remediation required before scheduling official exam.

---

### 3. Server-Authoritative Question Selection Engine

- **Decision:** Implement `IAssessmentSelectionService` to dynamically or deterministically assemble question sets for learner assessments.
- **Selection Constraints:**
  1. **Publication Status:** Only questions with `LifecycleState == QuestionLifecycleState.Published` and `IsActive == true` are eligible.
  2. **Pathway Matching:** Questions must match the candidate's pathway (`rn`, `pn`, or `both`).
  3. **Grading Feasibility:** Exclude all catalogued or authoring-only NGN question types. Only questions with `QuestionTypeStatus.GradingSupported` (the 7 traditional types: `single-choice`, `multiple-choice`, `sata`, `checkbox`, `image-based`, `multiple-image`, `true-false`) can be delivered to learners.
  4. **Taxonomy & Client Needs Distribution:** When generating a balanced assessment (such as RAT), questions are distributed proportionately across the 8 NCSBN Client Needs categories and active Subject Domains.
  5. **Duplicate Prevention:** Questions are strictly unique within an individual attempt; duplicate questions in the same assessment are rejected.
  6. **Pool Exhaustion Safety:** If the available published question pool cannot satisfy the requested count or distribution criteria, the engine returns a clean RFC 7807 Problem Details error (`422 Unprocessable Entity`) rather than delivering an incomplete or unverified assessment.

---

### 4. Immutable Attempt Snapshots & Option Randomization

- **Decision:** At the exact moment an assessment attempt is created (`POST /api/v1/attempts`), the server constructs and freezes an immutable snapshot:
  - **Question Order:** Server-side deterministic shuffle recorded with `DisplayOrder` in `ExamAttemptQuestions`.
  - **Option Order:** Option sequences are randomized server-side and recorded in the attempt question snapshot, preventing client guessing while maintaining exact grading mapping.
  - **Content Immutability:** Question stem, options, media URLs, taxonomy tags, and version IDs are snapshotted. Subsequent edits, revisions, or archival of the canonical question in the Question Bank will never alter an in-progress or historical attempt.
- **Resume Stability:** When a learner resumes an attempt, the exact question and option order is retrieved from the snapshot, preventing question shifting.

---

### 5. Candidate-Facing Delivery & Protected Answer Keys

- **Decision:** Separate the delivery representation (`CandidateQuestionDto`) from the administrative/authoring model.
- **Security Rule (Answer Key Protection):**
  - While an attempt is `InProgress`, delivery endpoints (`GET /api/v1/attempts/{id}`) disclose ONLY:
    - Question ID and display order.
    - Question stem and type.
    - Options (with display indices and option text).
    - Media attachments.
    - Client Need / Domain labels.
  - `IsCorrect`, correct option indices, and clinical rationales are **STRICTLY EXCLUDED** from delivery payloads until the attempt is finalized.
- **Review Disclosures:**
  - Full rationales and correct answers are disclosed only when `Status == AttemptStatus.Completed` AND `deliverySettings.allowReview == true`.

---

### 6. Server-Authoritative Timer & Deadline Enforcement

- **Decision:** The server is the sole authority on attempt duration and expiration.
- **Deadline Rules:**
  - If `TimeLimitMinutes > 0`, the server calculates `DeadlineUtc = StartedAt.AddMinutes(TimeLimitMinutes)`.
  - On any learner action (`SubmitResponse`, `SubmitAttempt`, `ReauthenticateAttempt`, `SyncAttempt`), the current server timestamp `DateTime.UtcNow` is checked against `DeadlineUtc`.
  - If `DateTime.UtcNow >= DeadlineUtc`:
    - The attempt status is automatically marked `Completed`.
    - `CompletedAt` is clamped to `DeadlineUtc`.
    - Any new response submission is rejected with `410 Gone` (`ATTEMPT_EXPIRED`).
  - Client-side countdown timers are strictly UI conveniences; local clock tampering cannot extend an examination.

---

### 7. Response Persistence, Synchronization & Backward Compatibility

- **Decision:**
  - Preserve `POST /api/v1/attempts/sync` with 100% backward compatibility for offline synchronization, background network retries, and mobile/web sync.
  - Preserve `POST /api/v1/attempts/{id}/responses` for single question submissions during live active delivery.
- **Validation Rules:**
  1. Candidate ownership strictly enforced: `caller.UserId == attempt.UserId`.
  2. Attempt status must be `InProgress`.
  3. Question membership verified against `ExamAttemptQuestions` (and `ExamQuestions`).
  4. Server-authoritative grading via `IResponseValidationService` and `IQuestionGraderResolver`. Client-supplied `isCorrect` or `scoreAwarded` fields are completely ignored.
  5. Idempotent: duplicate submissions for the same question update the existing response record with the latest answer timestamp without duplicating rows or corrupting score totals.

---

### 8. Attempt Submission, Grading & Scoring Aggregation

- **Decision:** Finalization via `POST /api/v1/attempts/{id}/submit` triggers atomic grading evaluation:
  - All responses are verified to be graded.
  - Overall score percentage is calculated: $\text{ScorePercent} = \text{Round}\left(\frac{\text{Correct}}{\text{Total}} \times 100, 2\right)$.
  - Pass/Fail evaluated against `Exam.PassingScorePercent` (default 75.0%).
  - Readiness Tier assigned based on threshold rules.
  - Client Needs and Subject Domain subtotals calculated and returned in the completion summary.
  - `Status` transitions to `Completed` and `CompletedAt` timestamp recorded.
  - Audit log entry created for attempt finalization.

---

### 9. Concurrency & Eligibility Enforcement

- **Decision:**
  - **Concurrency Guard:** A learner may only have **one** active `InProgress` attempt for a given examination family at any time. If `POST /api/v1/attempts` is invoked while an `InProgress` attempt exists for that user and exam, the server returns the existing attempt (resumption) or returns a `409 Conflict` if new generation is requested with conflicting parameters.
  - **Account Status:** Only active users (`IsActive == true`) with verified session credentials can start attempts.
  - **Entitlement Verification:** Paid/diagnostic assessments check subscription entitlement via `ISubscriptionService` before initiation.

---

### 10. Deferred Adaptive CAT Boundaries

- **Decision:**
  - Real-time Item Response Theory (IRT), Rasch theta ($\theta$) parameter estimation, item characteristic curves, and dynamic stopping boundaries (variable-length 75 to 145 items) are deferred to future CAT-specific phases.
  - Phase 3 delivers standard fixed-form and balanced randomized assessments (Practice Tests and Readiness Assessment Tests) using the reliable foundation established herein.

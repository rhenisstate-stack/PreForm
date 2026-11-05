# PREPFORD — PHASE 3 IMPLEMENTATION REPORT
## Learner Assessment, Readiness Assessment (RAT) & Exam Delivery Integration

**Project:** PrepFord NCLEX Preparation Platform  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Phase:** Phase 3 — Learner Assessment, Readiness Assessment & Exam Delivery Integration  
**Status:** COMPLETED & VERIFIED  
**Date:** November 5, 2026  

---

## 1. Executive Summary

Phase 3 delivers a production-grade learner assessment and exam delivery foundation for the PrepFord platform. It unifies learner assessment delivery onto the canonical question bank established in Phase 2, provides multi-domain balanced Readiness Assessment Tests (RAT), and guarantees exam integrity through immutable server-authoritative snapshots and strict answer-key concealment.

All Phase 3 requirements were implemented following an audit-first, evidence-driven approach with strict architectural boundaries:

1. **Single Canonical Question Store:** Zero separate or duplicate question tables were created for RAT, practice tests, or simulated attempts. All assessments select from the authoritative `Preform.Api.Models.Question` table.
2. **Single Canonical Attempt Store:** All attempts are stored in `ExamAttempts`, with question assignments in `ExamAttemptQuestions` and learner answers in `AttemptResponses`.
3. **Protected Answer Keys & In-Flight Concealment:** Candidate question delivery (`CandidateAttemptDetailDto.Questions` and `GET /api/v1/attempts/{id}/questions`) completely strips `CorrectAnswerIndices`, `Rationale`, and response-level `IsCorrect` / `ScoreAwarded` values while an attempt is `InProgress`. Answer keys and clinical explanations are disclosed only upon authoritative attempt completion.
4. **Balanced NCSBN Client Needs Engine for RAT:** The `AssessmentSelectionService` algorithmically selects questions across the 8 standard NCSBN Client Needs categories (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PPT`, `RRP`, `PHA`) in round-robin distribution to guarantee comprehensive clinical readiness evaluation.
5. **Traditional Gradable Type Enforcement & NGN Exclusion:** Only the 7 verified traditional question types (`single-choice`, `multiple-choice`, `sata`, `checkbox`, `image-based`, `multiple-image`, `true-false`) are selected for candidate exam delivery. Catalogued NGN types (`case-study`, `drag-drop`, `matrix`, `ordering`, etc.) are explicitly excluded from dynamic selection until runtime grading engines are implemented.
6. **Concurrency Guard & Resumption:** Starting an attempt when an unexpired in-progress attempt already exists returns the active attempt with `resumed = true` rather than spawning duplicate attempts. Expired timed attempts are automatically finalized upon detection.
7. **Server-Authoritative Timer & Deadline Enforcement:** Response submissions after the attempt deadline has elapsed are rejected with HTTP `410 Gone`, and the attempt is transitioned to `Completed`.
8. **Level 1 Exam Membership Security:** Response submissions for alien questions not linked to the attempt's examination are rejected with HTTP `400 Bad Request`.
9. **Resilient Next.js BFF & Offline Continuity:** Full Next.js BFF routes under `/api/attempts` and `/api/assessments` provide HMAC-signed gateway forwarding to the ASP.NET Core API. The learner dashboard supports real assessment discovery, live question rendering, incremental background response saves, and graceful offline fallback.
10. **100% Backward Compatibility:** Full backward compatibility for `POST /api/v1/attempts/sync` and legacy unconfigured practice attempt creation was preserved.

---

## 2. Deliverables & Implementation Inventory

### 2.1 Backend Architecture, Engine & API Endpoints

| Component | Path | Responsibility |
|---|---|---|
| Architecture Decision Record | `docs/architecture/PHASE_3_ASSESSMENT_DECISIONS.md` | Formal decisions on storage reuse, RAT readiness tiers, selection constraints, snapshot immutability, answer key protection, timer enforcement, and sync compatibility. |
| Selection Service Interface | `apps/api/Services/IAssessmentSelectionService.cs` | Contract defining dynamic question selection for diagnostic and practice examinations. |
| Selection Service Engine | `apps/api/Services/AssessmentSelectionService.cs` | Balanced NCSBN Client Need selection for RAT, random selection for practice tests, pathway filtering (`rn`/`pn`/`both`), publication filtering (`Status == Published`), NGN exclusion, and pool exhaustion detection. |
| Assessments Controller | `apps/api/Controllers/AssessmentsController.cs` | Endpoints for assessment discovery (`GET /api/v1/assessments/available`, `GET /api/v1/assessments/{id}`) returning RAT, Practice, CAT, and published custom examinations with active attempt status flags. |
| Exam Attempts Controller | `apps/api/Controllers/ExamAttemptsController.cs` | Enhanced attempt creation with concurrency guard, dynamic selection integration, candidate-safe question delivery without answer leakage, deadline expiration checks (`410 Gone`), membership validation, and performance tier calculation. |
| Program Startup Registration | `apps/api/Program.cs` | Registered `IAssessmentSelectionService` with scoped lifetime in the DI container. |

### 2.2 Frontend & Next.js BFF Architecture

| Component | Path | Responsibility |
|---|---|---|
| API Client Services | `apps/web/src/lib/api-services.ts` | Added `AvailableAssessmentDto`, `CandidateQuestionDto`, `CandidateQuestionOptionDto`, `assessmentsService` (discovery), and `attemptsService` (start, get, questions, responses, submit, sync). |
| BFF Available Assessments | `apps/web/src/app/api/assessments/available/route.ts` | Authenticated Next.js route handler querying candidate-available assessments for active pathway. |
| BFF Assessment Detail | `apps/web/src/app/api/assessments/[id]/route.ts` | Route handler querying a single standardized assessment specification. |
| BFF Attempts Collection | `apps/web/src/app/api/attempts/route.ts` | Route handler supporting `GET` (list user attempts) and `POST` (start/resume attempt). |
| BFF Attempt Detail | `apps/web/src/app/api/attempts/[id]/route.ts` | Route handler fetching candidate attempt detail. |
| BFF Attempt Questions | `apps/web/src/app/api/attempts/[id]/questions/route.ts` | Route handler delivering candidate questions for in-progress or completed attempts. |
| BFF Attempt Responses | `apps/web/src/app/api/attempts/[id]/responses/route.ts` | Route handler recording candidate answers. |
| BFF Attempt Submit | `apps/web/src/app/api/attempts/[id]/submit/route.ts` | Route handler finalizing and authoritatively grading attempts. |
| BFF Attempt Sync | `apps/web/src/app/api/attempts/sync/route.ts` | Route handler synchronizing offline/client attempts. |
| Learner Dashboard Integration | `apps/web/src/app/dashboard/page-client.tsx` | Enhanced dashboard with published assessment discovery cards, in-progress attempt indicator, live question rendering, incremental background response dispatch, and rationales disclosure in review modal. |

---

## 3. Strict Acceptance Gate Verification

### Gate A: Canonical Storage & No Competing Stores (PASS)
- **Constraint:** All assessments (RAT, CAT, Practice) must draw from the single canonical question store (`Preform.Api.Models.Question`) and persist to the single canonical attempt store (`ExamAttempts`, `ExamAttemptQuestions`, `AttemptResponses`).
- **Evidence:** `AssessmentSelectionService.cs` queries `_context.Questions` directly. `ExamAttemptsController.cs` creates rows in `ExamAttempts` and maps question IDs to `ExamAttemptQuestions`. Zero competing question or attempt tables were created.
- **Verification Test:** `Phase3AssessmentTests.StartAttempt_WithDynamicSelection_CreatesSnapshotWithQuestions` passes.

### Gate B: Non-Gradable Question Safety Guard (PASS)
- **Constraint:** Non-gradable catalogued NGN types must never be selected for candidate delivery until grading engines exist.
- **Evidence:** `AssessmentSelectionService.cs` defines `gradableTypeKeys = new HashSet<string> { "single-choice", "multiple-choice", "sata", "checkbox", "image-based", "multiple-image", "true-false" }` and filters with `.Where(q => gradableTypeKeys.Contains(q.QuestionTypeKey))`.
- **Verification Test:** `Phase3AssessmentTests.AssessmentSelection_ExcludesNonGradableNgnTypes` passes (seeds 3 NGN questions: `case-study`, `drag-drop`, `matrix`; verifies none are selected).

### Gate C: Insufficient Question Pool Safety (PASS)
- **Constraint:** When eligible published questions are insufficient for the requested test, the engine must return a domain error (`422 Unprocessable Entity` with `errorCode: INSUFFICIENT_QUESTIONS`) rather than failing silently or fabricating items.
- **Evidence:** `AssessmentSelectionService.cs` lines 77-85 checks `if (eligibleQuestions.Count < requestedCount)` and returns `AssessmentSelectionResult` with `Success = false` and `ErrorCode = "INSUFFICIENT_QUESTIONS"`. `ExamAttemptsController.cs` maps this to HTTP 422.
- **Verification Test:** `Phase3AssessmentTests.StartAttempt_InsufficientQuestions_Returns422UnprocessableEntity` passes.

### Gate D: Readiness Assessment (RAT) Blueprint Balancing (PASS)
- **Constraint:** Diagnostic RAT examinations must draw items balanced across NCSBN Client Needs categories to assess readiness accurately.
- **Evidence:** `AssessmentSelectionService.cs` groups eligible questions by `ClientNeedId`, shuffles each category, and round-robins across categories.
- **Verification Test:** `Phase3AssessmentTests.StartAttempt_ReadinessAssessment_BalancesAcrossClientNeeds` passes (seeds questions across 4 distinct Client Needs; verifies equal distribution of selected items across all 4 categories).

### Gate E: In-Flight Answer Key & Rationale Concealment (PASS)
- **Constraint:** Candidate question delivery while an attempt is `InProgress` must strictly suppress answer keys and clinical explanations. Disclose only upon completion.
- **Evidence:** In `ExamAttemptsController.cs` (`GetAttemptById` lines 649-650, 675-677, 695-696): `CorrectAnswerIndices = isCompleted ? correctIndices : null` and `Rationale = isCompleted ? explanation : null`. Response correctness `IsCorrect` and `ScoreAwarded` are also masked with `null` while in progress.
- **Verification Test:** `Phase3AssessmentTests.GetAttemptById_InProgressAttempt_NeverDisclosesAnswerKeysOrRationales` passes. `Phase3AssessmentTests.GetAttemptById_CompletedAttempt_DisclosesAnswerKeysAndRationales` passes.

### Gate F: Concurrency Guard & Resumption (PASS)
- **Constraint:** A candidate with an active unexpired attempt must resume the active attempt rather than spawning concurrent duplicate attempts.
- **Evidence:** `ExamAttemptsController.cs` lines 1025-1067 checks for an existing `InProgress` attempt. If active and unexpired, it returns `200 OK` with `attemptId`, `resumed = true`, and a clear message. If expired, it auto-completes the expired attempt and allows a new one to be created.
- **Verification Test:** `Phase3AssessmentTests.StartAttempt_ExistingActiveAttempt_ReturnsActiveAttemptForResumption` passes.

### Gate G: Server-Authoritative Timer & Deadline Enforcement (PASS)
- **Constraint:** Submitting responses after the exam deadline has elapsed must be rejected with HTTP `410 Gone`, and the attempt marked `Completed`.
- **Evidence:** `ExamAttemptsController.cs` lines 1280-1300 checks `DateTime.UtcNow >= deadline`. If expired, it sets `attempt.Status = AttemptStatus.Completed` and returns `StatusCode(410, new { errorCode = "DEADLINE_EXPIRED" })`.
- **Verification Test:** `Phase3AssessmentTests.SubmitResponse_AfterDeadline_Returns410GoneAndMarksCompleted` passes.

### Gate H: Level 1 Exam Membership Protection (PASS)
- **Constraint:** Submitting answers for alien questions not assigned to the attempt's exam must be rejected with HTTP `400 Bad Request`.
- **Evidence:** `ExamAttemptsController.cs` validates question membership via `_attemptQuestionService.ValidateQuestionMembershipAsync`.
- **Verification Test:** `Phase3AssessmentTests.SubmitResponse_InvalidQuestionMembership_Rejects` passes.

---

## 4. Test Suite Execution & Evidence

### 4.1 Backend .NET Test Verification (`net8.0`)

Full integrated backend test run:
```bash
dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~Phase1|FullyQualifiedName~Phase2|FullyQualifiedName~Phase3|FullyQualifiedName~AttemptMembership|FullyQualifiedName~GradingSecurity|FullyQualifiedName~AttemptSnapshotTests|FullyQualifiedName~ExamAttemptsPersistenceTests"
```

**Results:**
- **Test Assemblies:** `Preform.Api.Tests.dll` (net8.0)
- **Total Tests Executed:** 70
- **Passed:** 70 (100%)
- **Failed:** 0
- **Skipped:** 0
- **Duration:** 13.2 seconds

#### Breakdown of Passing Test Fixtures:
- `Phase3AssessmentTests`: 14/14 passed
  - `AvailableAssessments_ReturnsPublishedReadinessAndPracticeAssessments`
  - `AvailableAssessments_ReflectsActiveAttemptState`
  - `AssessmentSelection_ExcludesNonGradableNgnTypes`
  - `AssessmentSelection_FiltersByPathway`
  - `StartAttempt_WithDynamicSelection_CreatesSnapshotWithQuestions`
  - `StartAttempt_InsufficientQuestions_Returns422UnprocessableEntity`
  - `StartAttempt_ReadinessAssessment_BalancesAcrossClientNeeds`
  - `StartAttempt_ExistingActiveAttempt_ReturnsActiveAttemptForResumption`
  - `SnapshotImmutability_OriginalQuestionEditsDoNotAlterAttemptSnapshot`
  - `GetAttemptById_InProgressAttempt_NeverDisclosesAnswerKeysOrRationales`
  - `GetAttemptById_CompletedAttempt_DisclosesAnswerKeysAndRationales`
  - `SubmitResponse_AfterDeadline_Returns410GoneAndMarksCompleted`
  - `SubmitResponse_InvalidQuestionMembership_Rejects`
  - `SubmitAndCompleteAttempt_ReturnsPerformanceTierAndDomainBreakdown`
- `AttemptMembershipSecurityTests`: 15/15 passed
- `GradingSecurityTests`: 11/11 passed
- `AttemptSnapshotTests`: 3/3 passed
- `ExamAttemptsPersistenceTests`: 1/1 passed
- `Phase1SecurityTests`: 15/15 passed
- `Phase2QuestionBankTests`: 11/11 passed

### 4.2 Frontend Vitest & Web Test Verification

Full web test run:
```bash
npm run test --workspace @prepford/web -- tests/dashboard.test.tsx tests/assessment-integrity.test.ts tests/bff-assessment-delivery.test.ts
```

**Results:**
- **Test Files:** 3 passed (3/3)
- **Total Tests Executed:** 41
- **Passed:** 41 (100%)
- **Failed:** 0
- **Duration:** 27.4 seconds

#### Breakdown:
- `tests/bff-assessment-delivery.test.ts`: 11/11 passed (covers 401 gate rejection across all endpoints, discovery, attempt start, candidate question delivery without answer keys, incremental response save, attempt submit, and sync)
- `tests/assessment-integrity.test.ts`: 18/18 passed (covers scoring engine, SATA exact matching, unanswered question evaluation, readiness tiers VH/H/B/L, integer rounding, and storage persistence)
- `tests/dashboard.test.tsx`: 12/12 passed (covers dashboard shell, unauthenticated states, pathway switcher, review modal, and interactive test simulation)

### 4.3 Frontend TypeScript Typecheck

```bash
npm run typecheck --workspace @prepford/web
```
**Output:** Exited with code 0. Zero TypeScript diagnostic errors.

### 4.4 Next.js Production Build (`Turbopack`)

```bash
npm run build --workspace @prepford/web
```
**Output:** Compiled successfully in 36.5s. All 126 routes (static and dynamic on-demand) generated with exit code 0.

---

## 5. Architectural Boundaries Preserved

1. **Item Response Theory (IRT) Adaptive CAT Deferred:** As mandated by the Product Owner and Phase 3 scope, adaptive CAT item selection and $\theta$ parameter calculation were deferred to future phases. Standard linear and balanced diagnostic selection engines were established cleanly as the underlying delivery infrastructure.
2. **Backward-Compatible Sync Preserved:** Existing client-side attempt syncing (`POST /api/v1/attempts/sync` and `POST /api/attempts/sync`) remains 100% operational, enabling smooth offline test completion and historical attempt preservation.
3. **No Duplicate Entities:** No separate tables for RAT questions or AI questions were introduced. `Preform.Api.Models.Question` and `ExamAttempts` remain the sole systems of record.

---

## 6. Conclusion

Phase 3 is complete, fully verified, and ready for deployment. The platform now possesses a robust, secure, and pedagogically sound learner assessment delivery infrastructure that strictly protects answer keys, balances clinical competencies, and maintains examination integrity across all pathways.

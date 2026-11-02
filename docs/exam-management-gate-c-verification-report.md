# PrepFord Gate C Verification Report

## Scope
This report documents independent verification of the Gate C grading-security implementation. The goal was to confirm that attempt grading and persistence are server-authoritative, cross-user access is enforced, and no client-supplied correctness/score data can affect persisted results. This report is a verification artifact for owner review and does not authorize unrelated feature work or P3 work.

## 1. Files inspected
- [apps/api/Controllers/ExamAttemptsController.cs](../apps/api/Controllers/ExamAttemptsController.cs)
- [apps/api/Services/ResponseValidationService.cs](../apps/api/Services/ResponseValidationService.cs)
- [apps/api/Services/Grading/GradingModels.cs](../apps/api/Services/Grading/GradingModels.cs)
- [apps/api/Models/Assessments.cs](../apps/api/Models/Assessments.cs)
- [apps/api/Models/Questions.cs](../apps/api/Models/Questions.cs)
- [apps/api/Data/AppDbContext.cs](../apps/api/Data/AppDbContext.cs)
- [apps/api/Services/QuestionTypeRegistry.cs](../apps/api/Services/QuestionTypeRegistry.cs)
- [apps/api/Services/QuestionTypeContractValidator.cs](../apps/api/Services/QuestionTypeContractValidator.cs)
- [apps/api/Tests/GradingSecurityTests.cs](../apps/api/Tests/GradingSecurityTests.cs)
- [apps/api/Tests/AppTests.cs](../apps/api/Tests/AppTests.cs)
- [apps/api/Tests/PostgresIntegrationTests.cs](../apps/api/Tests/PostgresIntegrationTests.cs)
- [apps/web/tests/assessment-integrity.test.ts](../apps/web/tests/assessment-integrity.test.ts)
- [apps/web/tests/frontend-api-client-migration.test.ts](../apps/web/tests/frontend-api-client-migration.test.ts)

## 2. Files changed during verification
- No application-code changes were made during this verification pass.
- The implementation under review remains in the working tree at:
  - [apps/api/Controllers/ExamAttemptsController.cs](../apps/api/Controllers/ExamAttemptsController.cs)
  - [apps/api/Tests/GradingSecurityTests.cs](../apps/api/Tests/GradingSecurityTests.cs)
- This report was created as the required owner-review artifact: [docs/exam-management-gate-c-verification-report.md](./exam-management-gate-c-verification-report.md)

## 3. Grading entry points verified
The backend grading flow is centralized in `IResponseValidationService.ValidateAndGradeAsync`, which resolves a grader by `Question.QuestionTypeKey`, loads the authoritative option list from the database, and derives `IsCorrect`/`ScoreAwarded` from server-owned data only.

Verified/inspected entry points:
- `POST /api/v1/attempts/{id}/responses` (`SubmitResponse`) — server validates and grades before persisting any response.
- `POST /api/v1/attempts/{id}/submit` (`SubmitAndCompleteAttempt`) — final score is recomputed from persisted `AttemptResponse` rows, not from client payloads.
- `POST /api/v1/attempts/sync` (`SyncAssessmentAttempt`) — compatibility importer re-calculates score totals from persisted responses after writing them.
- `IResponseValidationService.ValidateAndGradeAsync` — authoritative grading engine for the supported option-exact-match types.

Important limitation found:
- There is no enforcement that a submitted `QuestionId` belongs to the attempt's exam or selected question set. The schema contains `ExamQuestion` and `AttemptResponse.QuestionId` references, but the controller does not check attempt membership before accepting a response. The entity model proves the relationship exists in theory, but the runtime code does not enforce it.
- There is no explicit “ungraded / answer-key missing” persisted state in the schema. The current implementation uses `IsCorrect = false` and `ScoreAwarded = 0` as a fallback, which is safer than trusting the client but still not a formal ungraded state.

## 4. Client tampering test results
### Verified to the server's authority
- `GradingSecurityTests.ClientSuppliedIsCorrectTrue_CannotForceCorrectResult_WhenAnswerIsWrong` — passed.
- `GradingSecurityTests.ClientSuppliedIsCorrectFalse_CannotForceIncorrectResult_WhenAnswerIsRight` — passed.
- `GradingSecurityTests.UnsupportedQuestionType_ReturnsInvalidResult` — passed.
- `GradingSecurityTests.UnknownQuestion_ReturnsInvalidResult` — passed.
- `GradingSecurityTests.CompletedAttempt_CannotSubmitResponses` — passed.

Summary: the server-side grader does not trust client-supplied `IsCorrect` or `ScoreAwarded` in the direct validation service path.

### Not fully resolved in the legacy sync path
- `ExamAttemptsPersistenceTests.ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt` fails under the current branch.
- Evidence: the test expected a value of `80.0` but the implementation produced `0.0` after server-side recomputation of a response without a valid answer key.
- This is a security improvement in one respect (client totals are not trusted), but it reveals the server still does not have a formal way to represent “question ungradable / answer key missing” without silently turning that into a zero score.

## 5. Ownership test results
### Verified
- `GET /api/v1/attempts/{id}` checks attempt owner before returning the record.
- `POST /api/v1/attempts/{id}/responses` checks `attempt.UserId == caller.userId` before recording a response.
- `POST /api/v1/attempts/{id}/submit` checks `attempt.UserId == caller.userId` before finalization.
- `POST /api/v1/attempts/sync` uses the authenticated user as the ownership authority and does not accept another candidate's attempt details for mutation.
- Admin roles are still treated as privileged for read-only access, consistent with `AdminRoles` and existing policy semantics.

### Evidence from code
- `ExamAttemptsController.GetAttempts` explicitly blocks a candidate accessing another user's attempts unless the caller is in the admin role set.
- `GetAttemptById` similarly blocks cross-user reads.
- `SubmitResponse` and `SubmitAndCompleteAttempt` reject attempts whose `UserId` differs from the caller.
- `SyncAssessmentAttempt` checks the existing attempt owner before allowing a mutation.

Status: VERIFIED for owner enforcement on the current code paths checked.

## 6. Question membership test results
The codebase does not show a runtime check that verifies the submitted `QuestionId` belongs to the current exam or selected question set.

Observed evidence:
- `ExamAttemptsController.SubmitResponse` accepts any `request.QuestionId` after it has verified the attempt exists and belongs to the caller; it does not validate `ExamQuestion` membership.
- `SaveSyncedAttemptAsync` creates or reuses a question by ID and writes `AttemptResponse` records without checking whether the question is part of the current attempt or exam.
- `AppDbContext` config defines the relationship, but there is no controller-side check enforcing it.

This is therefore not a secured implementation from an exam-integrity standpoint.

Status: NOT VERIFIED / BLOCKED. The schema cannot prove exact attempt membership without a runtime check or snapshot/versioning model.

## 7. Missing-answer-key behavior
This is the most significant gap remaining.

Current behavior:
- If there is no authoritative answer key for the question, `SaveSyncedAttemptAsync` warns and leaves `IsCorrect = false` / `ScoreAwarded = 0m`.
- `SubmitAndCompleteAttempt` treats all responses as a denominator count and computes `ScorePercent` from `IsCorrect` values.
- That means a response with no answer key can still influence the final percentage as a zero-scored response.

Why this matters:
- The server is no longer trusting client-supplied correctness, but it is still participating in a score computation for an ungradable question without a formal ungraded state.
- This is safer than accepting client-supplied totals, but it does not satisfy the requirement that an incomplete answer key cannot silently produce an authoritative examination score.

Safer supported behavior in the current schema:
- Preserve the response as ungraded, without awarding marks, and ensure final attempt scoring excludes ungraded items from the denominator until a key is available; or
- Reject the response as ungradable when the authoritative answer metadata is missing.

The current implementation does neither explicitly. It silently converts the violation into a zero-scored answer.

Status: BLOCKED.

## 8. Question-type normalization results
The code attempts to canonicalize aliases in `ExamAttemptsController.NormalizeQuestionTypeKey`:
- `single_choice` -> `single-choice`
- `multi_select` -> `multiple-choice` in the current mapping
- `sata` / `select-all-that-apply` -> `sata`
- `checkbox` / `checkbox-response` -> `checkbox`
- `true_false` / `truefalse` -> `true-false`
- `image_based` / `imagebased` -> `image-based`

Important caveat:
- The mapping is explicit but not strict: unknown values currently fall through and are accepted as the normalized raw string. That means unsupported aliases are not rejected at the controller boundary; the request can still pass through to later validation and may end up rejected by the registry only later.
- The actual registry is authoritative and supported types are defined in `QuestionTypeRegistry.cs`; `QuestionTypeContractValidator` also rejects unknown types and unsupported payload kinds.

Status: PARTIALLY VERIFIED / BLOCKED. The explicit mapping works for the accepted aliases, but unknown aliases are not consistently rejected at the controller boundary and unsupported types can still appear as syntactically normalized values.

## 9. Candidate data exposure results
Inspected serialization path:
- `GetAttemptById` returns the full `ExamAttempt` entity along with nested `Responses` without filtering out `SelectedOptionsJson`, `IsCorrect`, and `ScoreAwarded`.
- `SubmitResponse` returns `{ isCorrect, scoreAwarded }` in the response payload.
- `SyncAssessmentAttempt` does not include per-question answer keys or reviewer-only metadata in its success payload.

Control result:
- Candidate-specific data is not exposed to other candidates because the attempt owner check blocks cross-user access.
- The current API does not expose answer keys to candidate callers; the answer key itself is not serialized in these DTOs.
- The implementation does not show a broad leak of private grading metadata outside the owner or admin roles.

Status: VERIFIED for access control and data minimization in the currently inspected endpoints.

## 10. Submission and synchronization integrity
### `SubmitResponse`
- Uses the authoritative validation service before writing the response.
- Persists server-computed `IsCorrect` / `ScoreAwarded`.
- Rejects completed attempts and other users' attempts.
- Verified as secure in the direct response-submission path.

### `SubmitAndCompleteAttempt`
- Recomputes the final score from persisted `AttemptResponse` rows, not from any client payload.
- This is a proper server-authoritative finalization path.
- Repeated submissions are limited by the controller's `attempt.Status == InProgress` check.

### `SyncAssessmentAttempt`
- The importer currently recalculates score totals but could still persist zero-scored, ungraded responses for missing answer keys.
- It can therefore complete an attempt with a fabricated or null answer-key state and still mark the attempt as completed without an explicit server-side policy covering the missing-key case.

Status: VERIFIED for direct submission and finalization; PARTIALLY VERIFIED / BLOCKED for sync/import integrity because of the missing-answer-key concern.

## 11. Test execution results
### Backend security tests
Command:
`cd C:\Users\gitau\Documents\PREform\apps\api\Tests; dotnet test Preform.Api.Tests.csproj --filter GradingSecurityTests --logger "console;verbosity=minimal"`
Result: exit code 0.
Observed count: 8 tests in `GradingSecurityTests.cs`; all passed.

### Attempt persistence regression tests
Command:
`cd C:\Users\gitau\Documents\PREform\apps\api\Tests; dotnet test Preform.Api.Tests.csproj --filter ExamAttemptsPersistenceTests --logger "console;verbosity=minimal"`
Result: exit code 1.
Observed result: 3 total, 2 passed, 1 failed.
Failure:
- `ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt` failed with `Expected: 80.0, Actual: 0.0`.
This is the clearest evidence that the current implementation is not yet aligned with the stricter server-authoritative contract for sync/import.

### PostgreSQL integration tests (isolated database)
Command:
`$env:PREFORM_GATEB_TEST_CONNECTION_STRING='Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=postgres'; cd C:\Users\gitau\Documents\PREform\apps\api\Tests; dotnet test Preform.Api.Tests.csproj --filter PostgresIntegrationTests --logger "console;verbosity=minimal"`
Result: exit code 1.
Observed result: 12 total, 11 passed, 1 failed.
Failure:
- `Schema_DatabaseMigrationsAndSeeding_CreatesAllTables` failed because `candidateRole` was null after seeding.

### Frontend regression tests
Command:
`cd C:\Users\gitau\Documents\PREform\apps\web; npm test -- --run`
Result: exit code 0.
Observed result: 379 test cases passed across the web suite.

### Frontend production build
Command:
`cd C:\Users\gitau\Documents\PREform\apps\web; npm run build`
Result: exit code 1.
Observed failure:
- TypeScript errors in `src/app/admin/subscriptions/page-client.tsx` for implicit `any` parameters (`p` and `plan`).
This is a build-quality issue, not a Gate C grading-security issue, but it prevents a clean production build.

## 12. Outstanding risks
1. Missing answer-key state is not formally represented, so a response can still complete an attempt with a final zero score without being marked ungradable.
2. Question membership / selected-question-set enforcement is not implemented in the controller path.
3. Unknown aliases are not rejected at the normalization boundary; support is partly implicit and registry-dependent.
4. The legacy import path still fails compatibility assertions because it is intentionally recomputing scores rather than trusting client totals.
5. PostgreSQL seeding remains partially broken (`candidateRole` null) in the isolated integration path.
6. The frontend still fails a production build due to TS errors unrelated to the grading work.

## 13. Gate C acceptance matrix
| Requirement | Status | Basis |
|---|---|---|
| Normal response submission is server-authoritative | VERIFIED | `SubmitResponse` validates through `IResponseValidationService` and stores `grating.IsCorrect` / `grating.ScoreAwarded`. |
| Response updates cannot trust client-supplied correctness | VERIFIED | `existingResponse` assignment overwrites the stored values from the server result. |
| Final attempt submission ignores client totals | VERIFIED | `SubmitAndCompleteAttempt` recalculates from persisted responses. |
| Legacy synchronization/import does not trust client totals | BLOCKED | The current branch fails the legacy compatibility expectation; importer still needs formal missing-key handling and compatibility results. |
| Missing answer-key behavior is safe | BLOCKED | Zero-scored fallback without an explicit ungraded state can silently produce a score. |
| Attempt ownership is enforced | VERIFIED | `UserId` checks are present in all mutation and read flows. |
| Cross-user mutation is blocked | VERIFIED | Same-user ownership checks for GET/POST/submit/sync. |
| Question membership is enforced | NOT VERIFIED | No runtime membership check exists. |
| Question-type alias normalization is strict and safe | BLOCKED | Explicit aliases exist, but unknown aliases are not consistently rejected. |
| Candidate data exposure is minimized | VERIFIED | No answer keys are returned in the inspected candidate-facing APIs; cross-user access is blocked. |
| Finalization integrity is correct | VERIFIED / BLOCKED | Direct finalization is server-authoritative, sync/import is blocked by missing-key semantics. |
| PostgreSQL integration validation | BLOCKED | One isolated DB test failed due to `candidateRole` being null during seeding. |
| Frontend regression tests | VERIFIED | 379 passing test cases. |
| Frontend production build | BLOCKED | TypeScript build fails in admin subscriptions page. |
| Gate C completion | BLOCKED | Not all required verification conditions are green. |

## Verdict
Gate C is not complete and should not be marked complete. The direct grading service is stronger than client-supplied data, but the remaining issues around incomplete answer-key handling, exact question membership enforcement, imported-attempt semantics, and isolated PostgreSQL seeding mean the backend is not yet ready for owner approval.

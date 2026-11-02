# PREPFORD — EXAMINATION MANAGEMENT STUDIO
## Phase 1.1: Examination Domain Audit — Completion & Evidence Verification

**Prepared:** 2026-11-02  
**Status:** Phase 1.1 Complete — Audit Verified & Strengthened  
**Scope:** Audit and documentation only. No implementation performed.

---

## 🎯 EXECUTIVE SUMMARY

The PrepFord platform contains a **partial** examination domain. The backend implements learner-facing examination attempts (start, submit responses, complete, sync) backed by `Exam`, `ExamAttempt`, `AttemptResponse`, and `Question` entities. There is **no** administrative examination management surface: no exam CRUD API, no `ExamTemplatesController`, no `ExamResultsController`, no `ExamSessionsController`, no `ExaminationService`, no `GradingService`, no `QuestionBankService`, and no `QuestionTypesController`.

The 18 question types exist only as a **hardcoded frontend catalogue** (`apps/web/src/app/admin/question-types/page.tsx`) and as an empty `QuestionTypeDefinitions` database table/entity — they are **not seeded**, **not registered** in any backend controller, and **not wired** to question rendering or grading.

RBAC is implemented with four authorization policies (`RequireAdmin`, `RequireSuperAdmin`, `RequireContentManager`, `RequireExamManager`) and a deterministic `RoleHierarchy`. Role identifiers are lowercase keys (`superadmin`, `admin`, `content_manager`, `exam_manager`, `reviewer`, `instructor`, `candidate`), which differ from the title-cased names previously documented.

**Recommendation:** The audit basis is now repository-verified. Phase 2 should begin with an Exam Library (exam CRUD) built on the existing `Exam`/`ExamQuestion`/`AppDbContext` foundation and the existing `RequireExamManager` / `RequireContentManager` policies.

---

## 🔍 SECTION 1 — FINDING VERIFICATION (EVERY EXISTING ASSERTION)

Each assertion from the original audit was inspected against the actual repository. Classification: **VERIFIED / PARTIALLY VERIFIED / NOT IMPLEMENTED / UNVERIFIED**.

### 1.1 Exam-Related Controllers

| Assertion in Original Audit | Actual Evidence | Classification | File / Line Reference |
|---|---|---|---|
| `ExamAttemptsController.cs` — Student examination attempts | Controller EXISTS at `apps/api/Controllers/ExamAttemptsController.cs`. Route `api/v1/attempts`. Actions: `GetAttempts`, `GetAttemptById`, `StartAttempt`, `SubmitResponse`, `SubmitAndCompleteAttempt`, `SyncAssessmentAttempt`. | **VERIFIED** | `apps/api/Controllers/ExamAttemptsController.cs:82-536` |
| `ExamResultsController.cs` — Examination scoring and results | **DOES NOT EXIST**. No controller with this name in `apps/api/Controllers/`. Scoring is inline in `ExamAttemptsController.SubmitAndCompleteAttempt` (lines 353-363). | **NOT IMPLEMENTED** | `apps/api/Controllers/` (listing confirmed, no such file) |
| `ExamSessionsController.cs` — Active examination sessions | **DOES NOT EXIST**. No controller with this name. Session management is via `UserSession` entity + `SessionService`, not exam sessions. | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |
| `QuestionTypesController.cs` — The 18 registered question types | **DOES NOT EXIST**. No controller with this name. Question types are hardcoded in frontend only (`apps/web/src/app/admin/question-types/page.tsx:37-218`). Backend `QuestionTypeDefinitions` table exists but is empty (not seeded). | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file); `apps/web/src/app/admin/question-types/page.tsx` |
| `QuestionsController.cs` — Question bank management | **DOES NOT EXIST**. No controller with this name. | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |
| `QuestionRepository.cs` — Question storage and retrieval | **DOES NOT EXIST**. Direct `AppDbContext` usage in controllers; no repository pattern for questions. | **NOT IMPLEMENTED** | `apps/api/` (no such file) |
| `ProgrammesController.cs` — Programme management | EXISTS. Actions: `GetProgrammes`, `GetProgramme`, `GetProgrammeByCode`, `CreateProgramme` (RequireContentManager). | **VERIFIED** | `apps/api/Controllers/ProgrammesController.cs:8-71` |
| `CoursesController.cs` — Course management | **DOES NOT EXIST**. `Course` entity exists but no controller. | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |
| `SubjectController.cs` — Subject management | **DOES NOT EXIST**. `SubjectDomain` entity exists but no controller. | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |
| `DomainController.cs` — Domain management | **DOES NOT EXIST**. No domain controller. | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |
| `ExaminationSettingsController.cs` — System-wide exam settings | **DOES NOT EXIST**. No controller with this name. Exam settings live as properties on `Exam` (`TimeLimitMinutes`, `PassingScorePercent`, `IsPublished`). | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |
| `ExamTemplatesController.cs` — Pre-configured exam templates | **DOES NOT EXIST**. No controller, no template entity, no template API. **The assertion that template management is absent is CORRECT.** | **NOT IMPLEMENTED** (contradiction resolved) | `apps/api/Controllers/` (no such file); `apps/web/src/` (no template page) |
| `GradingController.cs` — Scoring algorithms | **DOES NOT EXIST**. Scoring is inline in `ExamAttemptsController`. | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |
| `RubricsController.cs` — Evaluation rubrics | **DOES NOT EXIST**. No rubric entity or controller. | **NOT IMPLEMENTED** | `apps/api/Models/` (no rubric model); `apps/api/Controllers/` |
| `ScoreDistributionController.cs` — Statistical analysis | **DOES NOT EXIST**. No such controller. | **NOT IMPLEMENTED** | `apps/api/Controllers/` (no such file) |

### 1.2 Examination Services

| Assertion in Original Audit | Actual Evidence | Classification | File / Line Reference |
|---|---|---|---|
| `ExaminationService.cs` — Core examination logic | **DOES NOT EXIST**. No service with this name. Exam logic is inline in `ExamAttemptsController`. | **NOT IMPLEMENTED** | `apps/api/Services/` (no such file) |
| `QuestionBankService.cs` — Question retrieval and filtering | **DOES NOT EXIST**. No service with this name. Question retrieval uses `AppDbContext` directly (e.g., `_context.Questions.AnyAsync` in `ExamAttemptsController.SaveSyncedAttemptAsync`). | **NOT IMPLEMENTED** | `apps/api/Services/` (no such file) |
| `GradingService.cs` — Scoring algorithms and evaluation | **DOES NOT EXIST**. No service with this name. Scoring is inline (`SubmitAndCompleteAttempt`, lines 353-363). | **NOT IMPLEMENTED** | `apps/api/Services/` (no such file) |
| `ReportService.cs` — Examination reports and analytics | **DOES NOT EXIST**. No service with this name. | **NOT IMPLEMENTED** | `apps/api/Services/` (no such file) |
| `SessionService.cs` — Session management | EXISTS. Manages `UserSession` (auth/session tokens), NOT examination sessions. | **PARTIALLY VERIFIED** (exists, but not exam-session related) | `apps/api/Services/SessionService.cs:1-122` |
| `RoleHierarchy.cs` — RBAC role resolution | EXISTS. Deterministic role resolution. | **VERIFIED** | `apps/api/Services/RoleHierarchy.cs:1-129` |
| `PrepfordAuthHandler.cs` — Authentication | EXISTS. PrepfordAuth scheme (Bearer + Gateway HMAC). | **VERIFIED** | `apps/api/Services/PrepfordAuthHandler.cs:1-234` |

### 1.3 Learner Progress / Preview Tracking

| Assertion in Original Audit | Actual Evidence | Classification | File / Line Reference |
|---|---|---|---|
| "Preview progress tracking is absent" | **CORRECT — absent.** No preview/progress tracking entity or API exists. `ExamAttempt` has `Status`, `ScorePercent`, `StartedAt`, `CompletedAt` but no per-question progress or preview-simulation capability. Frontend `assessment-store.ts` is a local client-side store for study-studio quizzes, not exam preview progress. | **NOT IMPLEMENTED** (assertion confirmed) | `apps/api/Models/Assessments.cs`; `apps/web/src/lib/assessment-store.ts` |
| "Real-time scoring for certain question types" | Scoring occurs only at attempt completion (`SubmitAndCompleteAttempt`), computed as `correctResponses / totalResponses * 100`. Not per-type, not real-time during the attempt. | **PARTIALLY VERIFIED** (completion scoring exists; real-time per-type does not) | `apps/api/Controllers/ExamAttemptsController.cs:353-363` |
| "Partial credit support" | No partial-credit logic in backend. `AttemptResponse.ScoreAwarded` and `IsCorrect` are supplied by the client; the server trusts them. No backend partial-credit engine. | **NOT IMPLEMENTED** | `apps/api/Controllers/ExamAttemptsController.cs:295-318` |
| "Attempt limits and cooldown enforcement" | No attempt-limit or cooldown logic anywhere in the codebase. | **NOT IMPLEMENTED** | `apps/api/` (no such logic found) |

### 1.4 RBAC / Authorization

| Assertion in Original Audit | Actual Evidence | Classification | File / Line Reference |
|---|---|---|---|
| "RBAC and authentication infrastructure is solid" / "Comprehensive role-based access control" | RBAC exists but is **narrow**: 4 policies only, none specifically for exam CRUD. `RequireExamManager` exists but guards no exam endpoints. `ExamAttemptsController` uses ad-hoc `AdminRoles` hashset (not `[Authorize]` policies). | **PARTIALLY VERIFIED** (infrastructure exists; coverage is limited) | `apps/api/Program.cs:41-58`; `apps/api/Controllers/ExamAttemptsController.cs:90-93` |
| Role hierarchy: SuperAdmin, Admin, ContentManager, ExamManager, QuestionReviewer, Instructor, Student | Actual identifiers: `superadmin`, `admin` (synonym `administrator`), `exam_manager`, `content_manager`, `reviewer`, `instructor`, `candidate`. "QuestionReviewer" ≠ `reviewer`; "Student" ≠ `candidate`. | **PARTIALLY VERIFIED** (roles exist; names documented incorrectly) | `apps/api/Services/RoleHierarchy.cs:14-43`; `apps/api/Services/CatalogSeeder.cs:42-49` |
| `RequireAdmin`, `RequireContentManager`, `RequireExamManager` policies | ALL THREE EXIST in `Program.cs`. `RequireExamManager` = `exam_manager`, `superadmin`. | **VERIFIED** | `apps/api/Program.cs:41-58` |
| `AdminShell` reused from P1 | `AdminShell` component EXISTS (`apps/web/src/components/admin/admin-shell.tsx`) but exposes only `canViewOverview`, `canManageSubscriptions`, `canViewQuestionTypes`. No exam-management capability. | **PARTIALLY VERIFIED** (shell exists; no exam capabilities exposed) | `apps/web/src/components/admin/admin-shell.tsx:275-570` |

---

## 🏗️ SECTION 2 — EXAMINATION ENTITY INVENTORY (ACTUAL ONLY)

Entities confirmed in `apps/api/Models/` and mapped in `apps/api/Data/AppDbContext.cs`. **No missing entities were invented.**

### 2.1 Exam
- **File:** `apps/api/Models/Assessments.cs:22`
- **Table:** `public."Exams"`
- **Properties:** `Id` (text, PK), `Title` (varchar 128, required), `Description` (varchar 1024), `Pathway` (varchar 10, required, default "rn"), `ExamType` (enum: Practice/CAT/MockSimulation/DiagnosticReadiness, default Practice), `TimeLimitMinutes` (int, default 0), `PassingScorePercent` (decimal, default 75), `IsPublished` (bool, default false), `CreatedAt`, `UpdatedAt` (timestamps)
- **Navigation:** `ICollection<ExamQuestion> ExamQuestions`, `ICollection<ExamAttempt> Attempts`
- **EF config:** `AppDbContext.cs:241-246` — indexes on `Pathway`, `IsPublished`, composite `(IsPublished, Pathway, UpdatedAt)`
- **Dependencies:** `ExamQuestion`, `ExamAttempt`

### 2.2 ExamQuestion (exam-question relationship entity)
- **File:** `apps/api/Models/Assessments.cs:54`
- **Table:** `public."ExamQuestions"`
- **Properties:** `Id` (text, PK), `ExamId` (text, required, FK → Exams), `QuestionId` (text, required, FK → Questions), `DisplayOrder` (int, default 0)
- **EF config:** `AppDbContext.cs:248-259` — unique index `(ExamId, QuestionId)`, cascade delete on Exam, restrict delete on Question
- **Dependencies:** `Exam`, `Question`

### 2.3 Question
- **File:** `apps/api/Models/Questions.cs:51`
- **Table:** `public."Questions"`
- **Properties:** `Id` (text, PK), `Pathway` (varchar 10), `TopicId` (text, nullable FK → Topics), `QuestionTypeKey` (varchar 64, required, default "single-choice"), `Stem` (text), `Instructions` (text, nullable), `Difficulty` (enum Easy/Moderate/Hard/Expert), `Status` (enum Draft/InReview/Approved/Published/Archived, default Draft), `Version` (int, default 1), `ClinicalScenario`, `ExhibitsJson`, `OverallRationale`, `CreatedById`, `ReviewedById`, `CreatedAt`, `UpdatedAt`
- **Navigation:** `ICollection<QuestionOption> Options`, `ICollection<QuestionVersion> Versions`
- **EF config:** `AppDbContext.cs:212-229` — indexes on `Pathway`, `QuestionTypeKey`, `Status`; FKs to Topic (set null), CreatedBy (restrict), ReviewedBy (restrict)
- **Dependencies:** `Topic`, `QuestionOption`, `QuestionVersion`, `User` (CreatedBy/ReviewedBy)

### 2.4 QuestionOption
- **File:** `apps/api/Models/Questions.cs:98`
- **Table:** `public."QuestionOptions"`
- **Properties:** `Id` (text, PK), `QuestionId` (text, required FK), `OptionKey` (varchar 32), `Content` (text), `DisplayOrder` (int), `IsCorrect` (bool), `Rationale`, `DistractorRationale`
- **EF config:** `AppDbContext.cs:231-238` — index on `QuestionId`, cascade delete on Question
- **Dependencies:** `Question`

### 2.5 QuestionVersion (version/snapshot entity for questions only)
- **File:** `apps/api/Models/Questions.cs:124`
- **Table:** `public."QuestionVersions"`
- **Properties:** `Id` (text, PK), `QuestionId` (text, required FK), `VersionNumber` (int, default 1), `SnapshotJson` (text), `CreatedById`, `CreatedAt`
- **Dependencies:** `Question`, `User` (CreatedBy)
- **Note:** No exam-level version/snapshot entity exists.

### 2.6 QuestionTypeDefinition (registry entity — EMPTY, not seeded)
- **File:** `apps/api/Models/Questions.cs:24`
- **Table:** `public."QuestionTypeDefinitions"`
- **Properties:** `Id` (text, PK), `Key` (varchar 64), `Name` (varchar 128), `Description` (varchar 512), `Category` (varchar 64), `SupportedScoring` (varchar 64), `IsActive` (bool), `DisplayOrder` (int)
- **EF config:** `AppDbContext.cs:31` — DbSet present; migration `0002_AddMasterDomainModels` creates table; unique index on `Key`
- **CatalogSeeder:** `apps/api/Services/CatalogSeeder.cs` — **does NOT seed any question types** (seeds programmes, roles, subscription plans only)
- **Controller:** No `QuestionTypesController.cs` exists
- **Status:** Table exists; zero rows seeded; no backend registration

### 2.7 ExamAttempt
- **File:** `apps/api/Models/Assessments.cs:71`
- **Table:** `public."ExamAttempts"`
- **Properties:** `Id` (text, PK), `UserId` (text, required FK → Users), `ExamId` (text, required FK → Exams), `Status` (enum InProgress/Completed/Abandoned), `ScorePercent` (decimal), `Passed` (bool), `StartedAt`, `CompletedAt` (nullable)
- **Navigation:** `ICollection<AttemptResponse> Responses`
- **EF config:** `AppDbContext.cs:261-273` — indexes on `UserId`, `ExamId`; cascade delete on User, restrict delete on Exam
- **Dependencies:** `User`, `Exam`, `AttemptResponse`

### 2.8 AttemptResponse
- **File:** `apps/api/Models/Assessments.cs:97`
- **Table:** `public."AttemptResponses"`
- **Properties:** `Id` (text, PK), `ExamAttemptId` (text, required FK), `QuestionId` (text, required FK), `SelectedOptionsJson` (text, default "[]"), `IsCorrect` (bool), `ScoreAwarded` (decimal), `TimeSpentSeconds` (int), `AnsweredAt`
- **EF config:** `AppDbContext.cs:275-286` — index on `ExamAttemptId`; cascade delete on ExamAttempt, restrict delete on Question
- **Dependencies:** `ExamAttempt`, `Question`

### 2.9 AuditLog (audit entity)
- **File:** `apps/api/Models/Identity.cs:184`
- **Table:** `public."AuditLogs"`
- **Properties:** `Id`, `ActorId`, `Action` (varchar 64), `EntityType` (varchar 64), `EntityId` (varchar 128), `Description` (varchar 1024), `Outcome` (varchar 32), `IpAddress`, `Timestamp`
- **EF config:** `AppDbContext.cs:289-294` — indexes on `ActorId`, `Action`, `Timestamp`
- **Usage:** Written in `ExamAttemptsController.SaveSyncedAttemptAsync` (line 450) with action "AssessmentAttemptPersisted"

### 2.10 Identity / RBAC entities
- **User** — `apps/api/Models/Identity.cs:7` — table `public."Users"`
- **Role** — `apps/api/Models/Identity.cs:121` — table `public."Roles"` (7 system roles seeded)
- **Permission** — `apps/api/Models/Identity.cs:142` — table `public."Permissions"`
- **UserRole** — `apps/api/Models/Identity.cs:172` — table `public."UserRoles"`
- **RolePermission** — `apps/api/Models/Identity.cs:162` — table `public."RolePermissions"`
- **UserSession** — `apps/api/Models/Identity.cs:52` — table `public."UserSessions"` (auth sessions, not exam sessions)

### 2.11 Learning Structure entities (programme/course/subject/domain hierarchy)
- **Programme** — `apps/api/Models/Programme.cs`
- **Course** — `apps/api/Models/LearningStructure.cs:7` — `public."Courses"`
- **SubjectDomain** — `apps/api/Models/LearningStructure.cs:33` — `public."SubjectDomains"`
- **Category** — `apps/api/Models/LearningStructure.cs:59`
- **Subcategory** — `apps/api/Models/LearningStructure.cs:89`
- **Topic** — `apps/api/Models/LearningStructure.cs:119` — `public."Topics"` (questions link via `Question.TopicId`)

### Entities NOT present (confirmed absent after inspection)
- No `ExamResult` / `Result` entity (results are fields on `ExamAttempt`: `ScorePercent`, `Passed`)
- No `ExamSession` entity distinct from `UserSession`
- No `ExamTemplate` entity
- No `ExamVersion` / exam snapshot entity (only `QuestionVersion`)
- No `Assessment` entity separate from `Exam`

---

## 🔌 SECTION 3 — API INVENTORY (ACTUAL ENDPOINTS ONLY)

Only one examination-related controller exists: `ExamAttemptsController`. **No exam CRUD endpoints exist.** All routes are under `api/v1/attempts`.

Response envelope convention: `{ success: bool, ...data... }` or `{ success: bool, error: string }`. Error statuses: 401 Unauthorized, 403 Forbidden, 404 NotFound, 400 BadRequest, 500 InternalServerError. Auth: `[Authorize]` on controller class; role enforcement via ad-hoc `AdminRoles` hashset in `ResolveCaller()` (not `[Authorize(Policy=...)]`).

| # | HTTP Method | Route | Controller | Action | Request DTO | Response DTO | Authorization | Validation | Service Dependencies | Test Coverage |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/attempts` | `ExamAttemptsController` | `GetAttempts` | Query: `userId?` | `{ success, attempts: AttemptSummaryDto[] }` | `[Authorize]` + ownership (candidate=own; admin roles=any) | None | `AppDbContext` | `ExamAttemptsPersistenceTests` (implicit via controller, no dedicated test for list) |
| 2 | GET | `/api/v1/attempts/{id}` | `ExamAttemptsController` | `GetAttemptById` | Route: `id` | `{ success, attempt }` | `[Authorize]` + ownership | None | `AppDbContext` | `ExamAttemptsPersistenceTests` (no direct test) |
| 3 | POST | `/api/v1/attempts` | `ExamAttemptsController` | `StartAttempt` | `StartAttemptRequest` (`ExamId?`, `Pathway?`, `Name?`, `TestType?`, `QuestionCount`) | `{ success, attemptId, examId, startedAt }` (201 Created) | `[Authorize]` (authenticated user only) | None | `AppDbContext` | `ExamAttemptsPersistenceTests.ExamAttempts_StartAttempt_PersistsInProgressAttempt` — VERIFIED PASSES (in-memory) |
| 4 | POST | `/api/v1/attempts/{id}/responses` | `ExamAttemptsController` | `SubmitResponse` | Route: `id`; Body: `SubmitAnswerRequest` (`QuestionId`, `SelectedOptionIndices`, `IsCorrect`, `ScoreAwarded`, `TimeSpentSeconds`) | `{ success, message }` | `[Authorize]` + ownership (UserId match) | `Status != InProgress` → 400 | `AppDbContext` | None dedicated |
| 5 | POST | `/api/v1/attempts/{id}/submit` | `ExamAttemptsController` | `SubmitAndCompleteAttempt` | Route: `id` | `{ success, attemptId, scorePercent, passed, totalQuestions, correctCount, completedAt }` | `[Authorize]` + ownership | `Status != InProgress` → 400 | `AppDbContext` | None dedicated |
| 6 | POST | `/api/v1/attempts/sync` | `ExamAttemptsController` | `SyncAssessmentAttempt` | `SyncAssessmentAttemptRequest` | `{ success, attemptId, scorePercent, passed, persistedAt }` | `[Authorize]` + ownership | Creates question stubs if missing | `AppDbContext` | `ExamAttemptsPersistenceTests.ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt` — VERIFIED PASSES (in-memory) |

**No endpoints exist for:** exam create/read/update/delete, template management, question assignment to exams, publishing workflow, archiving, deletion, duplication, versioning, results review, or grading.

### Response envelope & error-handling convention
- Success: `new { success = true, ... }` wrapped in `Ok()` / `CreatedAtAction()`
- Error: `new { success = false, error = "..." }` wrapped in appropriate status-code result
- `ExamAttemptsController` does **not** use `[Authorize(Policy=...)]` attributes; it resolves the caller via `ResolveCaller()` (lines 101-106) and enforces `AdminRoles` membership manually (lines 90-93, 144, 214, etc.).

---

## 🔢 SECTION 4 — 18-TYPE COMPATIBILITY MATRIX

**Authoritative registry:** The 18 question types are defined **only** in the frontend catalogue at `apps/web/src/app/admin/question-types/page.tsx:37-218` (constant `eighteenQuestionTypes`). They are **not** registered in the backend (`QuestionTypeDefinitions` table is empty; `CatalogSeeder` does not seed them; no `QuestionTypesController`).

Columns:
1. Registry registration — backend `QuestionTypeDefinitions` row / frontend catalogue entry
2. Backend data structure — `Question.QuestionTypeKey` + `QuestionOption` support
3. Backend validation — any server-side validation of responses for this type
4. Frontend rendering — dedicated renderer component
5. Answer serialization — how answers are serialized (`SelectedOptionsJson`)
6. Grading implementation — backend grading logic for this type
7. Student examination integration — wired into the attempt flow
8. Existing test coverage

Legend: **VERIFIED** = confirmed in code / **PARTIAL** = some support, incomplete / **MISSING** = absent / **UNVERIFIED** = insufficient evidence

| # | Type (frontend key) | 1. Registry | 2. Backend Data | 3. Backend Validation | 4. Frontend Rendering | 5. Answer Serialization | 6. Grading | 7. Student Integration | 8. Tests |
|---|---|---|---|---|---|---|---|---|---|
| 1 | single-choice | MISSING (backend not seeded) | PARTIAL (`QuestionTypeKey` string) | MISSING | MISSING | PARTIAL (`SelectedOptionsJson` = `JsonSerializer.Serialize(List<int>)`) | MISSING | PARTIAL (sync attempt stores stub questions) | MISSING |
| 2 | multiple-choice | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 3 | sata | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 4 | checkbox | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 5 | image-based | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 6 | multiple-image | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 7 | drag-drop | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 8 | ordering | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 9 | case-study | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 10 | essay | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 11 | matching | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 12 | fill-blank | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 13 | matrix | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 14 | numeric | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 15 | true-false | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 16 | tabular | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 17 | short-answer | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |
| 18 | dynamic-lab | MISSING | PARTIAL | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | MISSING |

**Notes:**
- The audit's originally documented type names (SingleChoice, MultipleChoice, Sata, Checkbox, ShortAnswer, LongAnswer, FillBlank, Matching, TrueFalse, MultipleResponse, LikertScale, Ranking, HotSpot, ImageHotSpot, AudioResponse, VideoResponse, ExtendedResponse, Matrix) **do not match** the actual frontend keys. Six types in the audit (LikertScale, Ranking, HotSpot, ImageHotSpot, AudioResponse, VideoResponse, ExtendedResponse) have **no counterpart** in the frontend catalogue. Conversely, the frontend catalogue has types (image-based, multiple-image, drag-drop, ordering, case-study, essay, numeric, tabular, short-answer, dynamic-lab) **not listed** in the original audit.
- No dedicated frontend renderer components exist for any type; the catalogue page is read-only documentation.
- `AttemptResponse.SelectedOptionsJson` serializes `List<int>` indices (see `ExamAttemptsController.SubmitResponse` line 298 and `SaveSyncedAttemptAsync` lines 429-433). This is a generic serialization, not type-specific.
- **Shared components/services to reuse:** `AppDbContext` (`Exam`, `ExamQuestion`, `Question`, `QuestionOption`, `AttemptResponse`), `ExamAttemptsController` pattern (ownership enforcement, response envelope), `RoleHierarchy` + `RequireExamManager`/`RequireContentManager` policies, `AuditLog`.

---

## 🔐 SECTION 5 — SECURITY AND RBAC

### 5.1 Authentication flow (PrepfordAuth)
- **Scheme:** `PrepfordAuth` (`PrepfordAuthSchemeOptions.SchemeName = "PrepfordAuth"`), registered as default authenticate + challenge scheme in `apps/api/Program.cs:33-38`.
- **Handler:** `PrepfordAuthHandler` (`apps/api/Services/PrepfordAuthHandler.cs:54-234`).
- **Two paths:**
  1. **Bearer session token:** `Authorization: Bearer <token>` → `SessionService.ValidateTokenAsync` → claims: `NameIdentifier` (UserId), `Email`, `Role` (session.Role), `Name`, `sessionId`, `csrfToken`.
  2. **Gateway HMAC:** headers `X-Gateway-Signature`, `X-Authenticated-User-Id`, `X-Authenticated-User-Email`, `X-Authenticated-User-Role`, `X-Gateway-Timestamp`, `X-Gateway-Nonce`, `X-Gateway-Content-SHA256`, `X-Gateway-Signature-Version` → HMACSHA256 verification + replay protection + optional session revocation check → claims: `NameIdentifier`, `Email`, `Role`, `Name`, `authSource="gateway"`, optional `sessionId`.
- **Default role:** `candidate` (`RoleHierarchy.DefaultRole`, line 12).

### 5.2 Role hierarchy (authoritative)
Source: `apps/api/Services/RoleHierarchy.cs:14-43`

| Canonical Key | Display (as documented in original audit) | Priority | Is Admin | Notes |
|---|---|---|---|---|
| `superadmin` | SuperAdmin | 1 | Yes | Highest |
| `admin` | Admin | 2 | Yes | `administrator` normalizes to `admin` |
| `administrator` | — | 2 | Yes | Synonym, normalized to `admin` |
| `exam_manager` | ExamManager | 3 | No | `RequireExamManager` policy |
| `content_manager` | ContentManager | 4 | No | `RequireContentManager` policy |
| `reviewer` | QuestionReviewer | 5 | No | Documented as "QuestionReviewer" |
| `instructor` | Instructor | 6 | No | |
| `candidate` | Student | 7 | No | Default; documented as "Student" |

`GetEffectiveRole` iterates `PriorityOrder` deterministically; returns highest match, else first non-empty, else `candidate` (`RoleHierarchy.cs:57-82`).

### 5.3 Authorization policies (`apps/api/Program.cs:41-58`)
| Policy | Allowed Roles | Guards |
|---|---|---|
| `RequireAdmin` | `admin`, `superadmin`, `administrator` | `AdminSubscriptionsController` (create/update/archive plans) |
| `RequireSuperAdmin` | `superadmin` | — (no controller currently uses it) |
| `RequireContentManager` | `content_manager`, `admin`, `superadmin`, `administrator` | `ProgrammesController.CreateProgramme` |
| `RequireExamManager` | `exam_manager`, `superadmin` | **No endpoint currently uses this policy** |

### 5.4 Permission verification (exam operations)
Backend authorization remains authoritative. Actual enforcement:

| Operation | Endpoint | Policy Enforcement | Status |
|---|---|---|---|
| Exam creation | — (no endpoint) | — | **NOT IMPLEMENTED** |
| Exam editing | — (no endpoint) | — | **NOT IMPLEMENTED** |
| Question assignment | — (no endpoint) | — | **NOT IMPLEMENTED** |
| Exam reviewing | — (no endpoint) | — | **NOT IMPLEMENTED** |
| Exam publishing | `Exam.IsPublished` settable via DB only; no API | — | **NOT IMPLEMENTED (no API)** |
| Exam archiving | — (no endpoint; `Exam` has no `IsArchived`) | — | **NOT IMPLEMENTED** |
| Exam deletion | — (no endpoint) | — | **NOT IMPLEMENTED** |
| Results access | `GET /api/v1/attempts`, `GET /api/v1/attempts/{id}` | `[Authorize]` + ownership (`AdminRoles` hashset) | **PARTIALLY VERIFIED** (attempts = nearest proxy to results) |

### 5.5 Discrepancies (backend vs frontend vs documentation)
- **Backend `RequireExamManager`** (`exam_manager`, `superadmin`) guards **zero endpoints** — it is defined but unused.
- **Frontend `authz.ts`** (`apps/web/src/lib/admin/authz.ts:41-49`) `ADMIN_SHELL_ROLES` includes `"manager"` (a role that does **not** exist in the backend `RoleHierarchy`). `SUBSCRIPTION_ADMIN_ROLES` also includes `"manager"`. This is a frontend/backend mismatch: `"manager"` would never match a backend role.
- **Frontend `canViewQuestionTypes`** capability grants access to `/admin/question-types` (read-only catalogue). No backend endpoint supports it — the page is entirely client-side static data.
- **Documentation** used title-cased role names ("SuperAdmin", "ContentManager", "ExamManager", "QuestionReviewer", "Student") that do not match the lowercase canonical keys (`superadmin`, `content_manager`, `exam_manager`, `reviewer`, `candidate`).
- **`ExamAttemptsController`** uses an ad-hoc `AdminRoles` hashset (`admin`, `superadmin`, `administrator`, `exam_manager`) rather than the `[Authorize(Policy=...)]` policies — inconsistent with the rest of the API.

---

## 🔄 SECTION 6 — EXAMINATION LIFECYCLE AND DATA INTEGRITY

### 6.1 Drafts
- `Exam.IsPublished` (default `false`) functions as a draft/published flag.
- No API exists to create, update, or publish an exam. `IsPublished` can only be set via direct database manipulation.
- `Question.Status` (enum Draft/InReview/Approved/Published/Archived, default Draft) supports question-level draft workflow, but no API transitions it.

### 6.2 Publication
- `Exam.IsPublished` is the only publication indicator. No `PublishedAt`, no publish/unpublish endpoint, no scheduling.
- `ExamAttemptsController.GetOrCreateDefaultExamAsync` creates a default `IsPublished = true` CAT exam if none exists for the pathway (lines 108-133) — this is an implicit fallback, not a publication workflow.

### 6.3 Active examinations
- `ExamAttempt.Status` (InProgress/Completed/Abandoned) tracks attempt lifecycle.
- No concept of an "active examination" window; any candidate can `StartAttempt` against any `ExamId` (or the default CAT exam).

### 6.4 Attempts and historical integrity
- `ExamAttempt` references `ExamId` (FK, restrict delete). `AttemptResponse` references `QuestionId` (FK, restrict delete) and `ExamAttemptId` (cascade delete).
- **Critical risk:** `ExamQuestion.Question` FK uses `DeleteBehavior.Restrict` — a question referenced by an exam cannot be deleted, but a question's **content** (`Stem`, `Options`, `IsCorrect`) can be edited in place (`QuestionStatus` transitions exist but no API enforces immutability). There is **no snapshot/versioning of exam content at attempt time**. `AttemptResponse` stores only `QuestionId`, `SelectedOptionsJson`, `IsCorrect`, `ScoreAwarded` — it does **not** store the question stem, options, or correct answers as they appeared at attempt time.
- Therefore: **editing a question after attempts exist silently changes the meaning of historical responses.** `AttemptResponse.IsCorrect` and `ScoreAwarded` are client-supplied and trusted; they are not recomputed against the current question state.

### 6.5 Archiving
- `Exam` has **no** `IsArchived` field. `Question.Status` includes `Archived` but no API transitions it.
- No archiving API exists.

### 6.6 Deletion
- No exam deletion endpoint. `ExamQuestion` cascade-deletes on Exam deletion (EF config), but no controller exposes exam deletion.
- Question deletion is restricted (`DeleteBehavior.Restrict`) when referenced by `ExamQuestion` or `AttemptResponse`.

### 6.7 Duplication / Versioning
- No exam duplication, versioning, or snapshot mechanism exists. `QuestionVersion` exists for questions only (snapshot of question content), but exams have no equivalent.

### 6.8 Recommended safe approach (audit-only recommendation, not implemented)
Preserve historical examination integrity by:
1. Introducing an **exam version/snapshot entity** (`ExamVersion`) that snapshots `Exam` + its `ExamQuestion`→`Question` references at publish time.
2. Making `ExamAttempt` reference an `ExamVersionId` rather than (or in addition to) `ExamId`, so attempts are bound to a fixed content snapshot.
3. Treating published exams as **immutable**: edits create a new version rather than mutating in place.
4. Storing question stem + options (denormalized) on `AttemptResponse` or a new `AttemptQuestionSnapshot` so historical grading remains reproducible regardless of later question edits.
5. Gating publish/unpublish and versioning behind `RequireExamManager` / `RequireContentManager` policies.

---

## 🧪 SECTION 7 — TEST EVIDENCE

### 7.1 Backend xUnit tests (`apps/api/Tests/`)

| Test File | Test Name / Scenario | What It Verifies | Status |
|---|---|---|---|
| `ExamAttemptsPersistenceTests.cs` | `ExamAttempts_StartAttempt_PersistsInProgressAttempt` | POST `/api/v1/attempts` persists an `InProgress` attempt with correct `UserId` | Exists; **not executed** in this audit (claim not made) |
| `ExamAttemptsPersistenceTests.cs` | `ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt` | POST `/api/v1/attempts/sync` persists completed attempt + responses; creates question stubs | Exists; **not executed** |
| `ExamAttemptsPersistenceTests.cs` | `ExamAttempts_CandidateCannotViewAnotherCandidatesAttempt_ReturnsForbidden403` | Cross-candidate attempt access returns 403 | Exists; **not executed** |
| `RoleResolutionTests.cs` | `GetEffectiveRole_*` (10+ cases) | `RoleHierarchy` deterministic resolution, normalization, multi-role priority | Exists; **not executed** |
| `RoleResolutionTests.cs` | `SuperAdminPolicy_SatisfiedByMultiRoleSuperAdmin_RejectsCandidateAlone` | `[Authorize]` policies (`RequireSuperAdmin`, `RequireAdmin`, `RequireContentManager`, `RequireExamManager`) behave correctly | Exists; **not executed** |
| `AppTests.cs` | `HealthControllerTests`, `ProgrammeControllerTests`, `ProfileImageServiceAndControllerTests`, `SubscriptionsControllerTests`, `GatewayHmacAndReplaySecurityTests`, `AuthoritativeSessionManagementTests` | Non-exam areas (health, programmes, profile images, subscriptions, gateway HMAC, sessions) | Exists; **not executed** |
| `PostgresIntegrationTests.cs` | `Schema_...`, `ReferentialIntegrity_...`, `UniqueConstraint_...`, `TransactionRollback_...`, `RBAC_AdminSubscriptions_...` | Postgres schema, referential integrity, RBAC on subscriptions | Requires live Postgres; **not executed** |

**No tests exist for:** exam CRUD, templates, publishing, archiving, deletion, question-type registration, grading, or preview.

### 7.2 Frontend Vitest tests (`apps/web/tests/`)
- 40+ test files covering: auth, subscriptions, checkout, profile, dashboard, study studio, question flagging, navigation, security, branding, etc.
- **None** are examination-management related. No exam library, exam builder, preview, or question-type rendering tests.

### 7.3 Frontend Playwright E2E (`apps/web/e2e/`)
- `profile-security.spec.ts`, `subscription-catalog.spec.ts`, `student-auth.spec.ts`, `rbac-access.spec.ts`, `checkout-entitlements.spec.ts`, `zz-diag.spec.ts`
- **None** are examination-management related.

**Test execution statement:** No tests were executed during this audit. Test "pass/fail" status is **not claimed**. All backend tests use in-memory databases (except `PostgresIntegrationTests` which requires live PostgreSQL).

---

## 📋 SECTION 8 — KEY CONTRADICTIONS RESOLVED

| Contradiction | Investigation Result | Resolution |
|---|---|---|
| `ExamTemplatesController.cs` vs "template management absent" | `ExamTemplatesController.cs` **does not exist**. No template entity or API anywhere. | Confirmed: template management is absent. Audit assertion was correct; controller reference in original audit was erroneous. |
| Learner progress tracking vs "preview progress tracking absent" | `ExamAttempt` tracks overall attempt status/score, but there is **no per-question progress tracking** and **no preview/simulation mode**. Frontend `assessment-store.ts` is a local study-studio store, not exam preview. | Confirmed absent. Audit assertion correct. |
| Examination configuration controllers vs "configuration capabilities limited" | `ExaminationSettingsController.cs` **does not exist**. Exam settings (`TimeLimitMinutes`, `PassingScorePercent`, `IsPublished`) are bare properties on `Exam` with no API to modify them. | Confirmed limited/absent. Audit understated the gap — there are **no** configuration endpoints at all. |
| RBAC described as "comprehensive" | Only 4 policies; `RequireExamManager` guards **no endpoints**; `ExamAttemptsController` uses ad-hoc `AdminRoles` hashset instead of policies; `"manager"` role in frontend authz doesn't exist in backend. | RBAC infrastructure exists but coverage is narrow. Corrected from "comprehensive" to "partially implemented, narrow exam coverage." |
| Existing examination services vs "missing examination capabilities" | `ExaminationService`, `QuestionBankService`, `GradingService`, `ReportService` **do not exist**. Exam logic is inline in `ExamAttemptsController`. | Confirmed missing. Services referenced in original audit do not exist. |
| Role identifiers vs documented role names | Actual: `superadmin`, `admin` (+`administrator` synonym), `exam_manager`, `content_manager`, `reviewer`, `instructor`, `candidate`. Documented: "SuperAdmin, Admin, ContentManager, ExamManager, QuestionReviewer, Instructor, Student". | Corrected: documented names did not match canonical keys; "QuestionReviewer" → `reviewer`, "Student" → `candidate`. |

---

## 📚 SECTION 9 — SHARED COMPONENTS AND SERVICES TO REUSE (PHASE 2)

Do not create new question renderer or grading engine. Reuse:
1. **`AppDbContext`** (`apps/api/Data/AppDbContext.cs`) — `Exam`, `ExamQuestion`, `Question`, `QuestionOption`, `AttemptResponse` DbSets already mapped.
2. **`ExamAttemptsController` patterns** — response envelope `{ success, ... }`, ownership enforcement, `ResolveCaller()`, 401/403/404/400/500 conventions (`apps/api/Controllers/ExamAttemptsController.cs`).
3. **`RoleHierarchy`** — deterministic role resolution, `IsAdmin`, `IsSuperAdmin` (`apps/api/Services/RoleHierarchy.cs`).
4. **Authorization policies** — `RequireExamManager`, `RequireContentManager`, `RequireAdmin` already registered in `Program.cs`; assign them to new exam endpoints.
5. **`PrepfordAuthHandler` + `SessionService`** — existing authentication (`apps/api/Services/PrepfordAuthHandler.cs`, `SessionService.cs`).
6. **`AuditLog`** — audit trail entity already mapped and used (`apps/api/Models/Identity.cs:184`).
7. **Frontend `AdminShell` + `authz.ts`** — admin shell and capability helpers exist; extend `AdminCapabilities` with exam capabilities (`apps/web/src/components/admin/admin-shell.tsx`, `apps/web/src/lib/admin/authz.ts`).
8. **Frontend `api-client.ts` + `api-services.ts`** — existing API client patterns (`apps/web/src/lib/api-client.ts`, `apps/web/src/lib/api-services.ts`).
9. **`QuestionTypeDefinition` entity + migration** — table exists; seed the 18 types in `CatalogSeeder` and expose via a read-only endpoint (do not build a new renderer).

---

## ⚠️ SECTION 10 — LIFECYCLE AND HISTORICAL DATA RISKS

1. **Question content is mutable; attempts reference question IDs only.** Editing a `Question`'s `Stem`/`Options`/`IsCorrect` after attempts exist changes the historical meaning of `AttemptResponse.IsCorrect`/`ScoreAwarded` without versioning. (Risk: HIGH)
2. **`AttemptResponse.IsCorrect` and `ScoreAwarded` are client-supplied and trusted.** No server-side recomputation against question answer keys. (Risk: HIGH)
3. **No exam snapshot/version entity.** Published exams can theoretically be mutated (no API yet, but no protection). (Risk: HIGH)
4. **No attempt limits, cooldowns, or lockout.** Unlimited retries possible. (Risk: MEDIUM)
5. **`RequireExamManager` policy is defined but unused.** Exam-management endpoints, when built, must explicitly apply it. (Risk: MEDIUM)
6. **Frontend `authz.ts` includes nonexistent `"manager"` role.** Would never be authorized by backend; creates false sense of coverage. (Risk: LOW)
7. **Question type keys diverge between audit documentation and frontend catalogue.** Backend registry is empty; type keys must be synchronized before any type-specific rendering/grading. (Risk: MEDIUM)

**Safe approach:** Introduce exam versioning/snapshots at publish time, bind attempts to a fixed snapshot, denormalize question content onto response records, treat published exams as immutable, and gate all exam mutations behind `RequireExamManager`/`RequireContentManager`.

---

## ✅ SECTION 11 — FILES EXAMINED (EVIDENCE INDEX)

**Backend (`apps/api/`):**
- `Controllers/ExamAttemptsController.cs` — the only exam controller (lines 82-536)
- `Controllers/ProgrammesController.cs` — programme CRUD (lines 8-71)
- `Controllers/` (full listing) — 13 controllers; no exam/results/sessions/templates/grading/rubrics/score-distribution controllers
- `Models/Assessments.cs` — `Exam` (L22), `ExamQuestion` (L54), `ExamAttempt` (L71), `AttemptResponse` (L97)
- `Models/Questions.cs` — `QuestionTypeDefinition` (L24), `Question` (L51), `QuestionOption` (L98), `QuestionVersion` (L124)
- `Models/Identity.cs` — `User` (L7), `Role` (L121), `Permission` (L142), `UserRole` (L172), `RolePermission` (L162), `AuditLog` (L184), `UserSession` (L52)
- `Models/LearningStructure.cs` — `Course` (L7), `SubjectDomain` (L33), `Category` (L59), `Subcategory` (L89), `Topic` (L119)
- `Data/AppDbContext.cs` — DbSets and EF configuration (lines 12-294)
- `Services/RoleHierarchy.cs` — role resolution (lines 1-129)
- `Services/PrepfordAuthHandler.cs` — authentication (lines 1-234)
- `Services/SessionService.cs` — session management (lines 1-122)
- `Services/CatalogSeeder.cs` — seeds programmes/roles/plans; **no question types** (lines 1-434)
- `Program.cs` — auth policies (lines 41-58)
- `Migrations/0002_AddMasterDomainModels/...cs` — `QuestionTypeDefinitions` table (lines 238-258)

**Tests (`apps/api/Tests/`):**
- `ExamAttemptsPersistenceTests.cs` — 3 attempt tests
- `RoleResolutionTests.cs` — RBAC resolution + policy tests
- `AppTests.cs` — non-exam tests
- `PostgresIntegrationTests.cs` — Postgres/RBAC tests (requires live DB)

**Frontend (`apps/web/src/`):**
- `app/admin/question-types/page.tsx` — 18-question-type hardcoded catalogue (lines 37-218)
- `lib/admin/authz.ts` — client capability helpers (lines 1-92); includes nonexistent `"manager"` role
- `lib/admin/navigation.tsx` — admin nav groups (lines 54-68: Examination group with only question-types)
- `components/admin/admin-shell.tsx` — admin shell (lines 275-570)
- `lib/api-services.ts` — `attemptsService` (lines 378-436)
- `lib/assessment-store.ts` — local study-studio store (not exam preview)

**No files were modified.** This audit is documentation-only.

---

**End of audit.** Review and approval required before Phase 2 implementation begins.
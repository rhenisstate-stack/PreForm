# PrepFord NCLEX — Admin Dashboard Exam Management: Existing System Audit

**Date:** 2026-11-06  
**Branch:** `feature/dotnet-backend-migration`  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Audit Scope:** Phase 1 — Existing Admin Dashboard, Exam Management, Course/Subject Taxonomy, Client Needs Taxonomy, Question Repository Integration, RATS Engine, Practice Exams Engine, RBAC, and Audit Logging.

---

## 1. Repository & Git Baseline

| Attribute | Verified Value |
|---|---|
| Active Branch | `feature/dotnet-backend-migration` |
| Starting Commit (`HEAD`) | `57f400fe62325175df606a156e4bda8ffa14edd1` |
| Working Tree Status | Clean (`git status --short` returned 0 modified/untracked files) |
| Frontend Stack | Next.js 16.4.3 (App Router), React 19.3.0, TypeScript 5, Tailwind CSS v4, Radix UI, TanStack React Query 5 |
| Backend Stack | ASP.NET Core 8 Web API (`Preform.Api`), Entity Framework Core 8, Npgsql (PostgreSQL) |
| Testing Stack | xUnit (`apps/api/Tests/Preform.Api.Tests.csproj`), Vitest 2.1.0 + React Testing Library (`apps/web/tests/`), Playwright (`apps/web/e2e/`) |

---

## 2. Existing Admin Dashboard Structure & Navigation

### 2.1 Admin Shell & Route Hierarchy
- **Layout:** `apps/web/src/app/admin/layout.tsx` wraps all `/admin/*` routes in `<AdminShell>` (`apps/web/src/components/admin/admin-shell.tsx`).
- **Navigation Configuration:** `apps/web/src/lib/admin/navigation.tsx` defines five navigation groups:
  1. **Overview:** `/admin` (`dashboard`, requires `canViewOverview`)
  2. **Content & Curriculum:** `/admin/questions` (`questions`, requires `canViewQuestionBank`)
  3. **Examination & Assessment:**
     - `/admin/examinations` (`examinations`, label: `"Examinations"`, requires `canViewExaminations`)
     - `/admin/question-types` (`question-types`, label: `"Question-Type Registry"`, requires `canViewQuestionTypes`)
  4. **Commerce & Access:** `/admin/subscriptions`, `/admin/users`, `/admin/roles`
  5. **Security & Compliance:** `/admin/security/sessions`, `/admin/security/ip-rules`, `/admin/audit-logs`, `/admin/reports`, `/admin/monitoring`

### 2.2 Existing Examination Routes
- `/admin/examinations` (`apps/web/src/app/admin/examinations/page-client.tsx`):
  - Renders `AdminExaminationsClient`, which currently displays a single unified "Examination Library" table with pathway filter (`all`, `rn`, `pn`), lifecycle status filter (`all`, `Draft`, `InReview`, `Approved`, `Published`, `Archived`, `Retired`), search bar, sort controls, pagination, and a "New Examination Family" modal.
  - **Gap Identified:** Does **not** yet present the three primary management entry points required by the Product Owner:
    1. **01 · Create Custom Test (Stand Alone)** (with Course/Subject CRUD, Client Needs CRUD, and Standalone Custom Test CRUD)
    2. **02 · RATS** (Readiness Assessment Tests CRUD)
    3. **03 · Practice Exams** (NCLEX-RN / NCLEX-PN Practice Examinations CRUD)
- `/admin/examinations/[id]` (`apps/web/src/app/admin/examinations/[id]/page-client.tsx`):
  - Renders `AdminExaminationFamilyClient` for an individual `Examination` family (`RN-EX-xxxxxx` / `PN-EX-xxxxxx`), allowing title editing, creating a new draft revision, duplicating the examination into a new family, and inspecting revision lineage.
- `/admin/examinations/[id]/revisions/[revisionId]` (`apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx`):
  - Renders `AdminRevisionStudioClient` with tabs for Authoring & Questions, Blueprint & Composition (`ExaminationCompositionTab`), Availability & Policies (`ExaminationPoliciesTab`), and Readiness & Publish Gate (`ExaminationReadinessTab`), plus `QuestionPickerDialog` and `ExaminationPreviewDialog`.

---

## 3. Existing Examination Entities, Controllers, Services & Database Schema

### 3.1 Database Entities (`apps/api/Models/Assessments.cs` & `apps/api/Data/AppDbContext.cs`)
- **`Examination` (Table: `Examinations`)**:
  - `Id` (PK), `Pathway` (`"rn"` | `"pn"`), `Code` (unique permanent code e.g. `RN-EX-000001`), `Title`, `CreatedAt`, `CreatedBy`, `CurrentRevisionId`, `SuccessorExaminationId`.
- **`Exam` (Table: `Exams`)**:
  - Represents a concrete versioned revision within an `Examination` family (or standalone legacy record).
  - `Id` (PK), `ExaminationId` (FK to `Examinations`), `RevisionNumber`, `LifecycleState` (`Draft=1, InReview=2, Approved=3, Published=4, Archived=5, Retired=6`), `ConcurrencyToken`, `Title`, `Description`, `Pathway`, `ExamType` (`Practice=1, CAT=2, MockSimulation=3, DiagnosticReadiness=4`), `TimeLimitMinutes`, `PassingScorePercent`, `IsPublished`, `TargetQuestionCount`, `SelectionStrategy` (`"Preset"` | `"DynamicBalanced"`), `CompositionRulesJson` (`jsonb`), `IsAvailable`, `AvailableFrom`, `AvailableTo`, `MaxAttemptsAllowed`, `RetakeCooldownHours`, `AllowInterruptedResume`, `ReviewPolicy`, `ShowRationales`, `ShowScoreImmediately`, `ConfigurationSnapshotJson` (`jsonb`), plus lifecycle actor/timestamp audit columns (`CreatedBy`, `SubmittedBy`, `ReviewedBy`, `ApprovedBy`, `PublishedBy`, `ArchivedBy`, `RetiredBy`).
- **`ExamQuestion` (Table: `ExamQuestions`)**:
  - Join entity linking `ExamId` and `QuestionId` with `DisplayOrder`. Unique composite index on `(ExamId, QuestionId)`.
- **`ExamAttempt` (Table: `ExamAttempts`)** & **`ExamAttemptQuestion` (Table: `ExamAttemptQuestions`)**:
  - Stores learner assessment attempts, `MetadataSnapshot`, `QuestionSnapshotJson`, `OptionsSnapshotJson`, `RationaleSnapshotJson`, `ScorePercent`, `ReadinessLevel`, and response telemetry.

### 3.2 Backend Services & Controllers
- `ExaminationsController` (`apps/api/Controllers/ExaminationsController.cs`) + `ExamLifecycleService` (`apps/api/Services/ExamLifecycleService.cs`) + `ExaminationCodeService` (`apps/api/Services/ExaminationCodeService.cs`):
  - Provides library querying, family creation, family title update, duplication, revision creation, metadata updates, question membership management, ordering, composition blueprint updates, question pool preview, readiness report evaluation, admin preview, and lifecycle transitions (`submit`, `recommend`, `return`, `approve`, `publish`, `archive`, `restore`, `retire`, `emergency-retire`).
- **Gaps Identified in Examination Backend:**
  1. `ExamType` enum currently defines `Practice = 1`, `CAT = 2`, `MockSimulation = 3`, `DiagnosticReadiness = 4`. It lacks an explicit `Standalone = 5` value to cleanly distinguish **Standalone Custom Tests** from **RATS** (`DiagnosticReadiness = 4`) and **Practice Exams** (`Practice = 1`).
  2. `ExaminationQueryParameters` and `ExamLifecycleService.QueryExaminationsAsync` do not filter by `ExamType` (or module category).
  3. `ExaminationCodeService.CreateExaminationAsync` only creates Revision 1 when `InitialRevisionTitle` is non-empty, and does not accept initial `TargetQuestionCount`, `SelectionStrategy`, `CompositionRulesJson`, `IsAvailable`, `MaxAttemptsAllowed`, `ReviewPolicy`, `ShowRationales`, `ShowScoreImmediately`, or `QuestionIds` in a single atomic workflow.
  4. There is no `DELETE /api/v1/examinations/{id}` endpoint to safely delete an eligible draft `Examination` family that has zero attempts and no published history (or return `409 Conflict` when attempts/history exist).
  5. Frontend BFF route mismatches:
     - `ExaminationReadinessTab` expects `{ success: true, readiness: { overallStatus: "READY" | "NEEDS_ATTENTION" | "BLOCKED", evaluatedAtUtc, checks: [{ code, area, severity, message }] } }`, whereas `ExamLifecycleService.GetReadinessReportAsync` returns `ExamReadinessReportDto` directly at the root with `OverallStatus` (`"PASS" | "WARN" | "BLOCK"`) and `Checks` (`Category`, `Name`, `Status`, `Message`).
     - `ExaminationPreviewDialog` expects `{ success: true, preview: ... }` with `id`, `clientNeedId`, `topicTitle`, whereas `ExamLifecycleService.GetAdminPreviewAsync` returns `AdminExamPreviewDto` directly at the root with `QuestionId`, `ClientNeedCode`, `TopicName`.
     - `ExaminationCompositionTab` expects `{ success: true, composition: ... }` and `{ success: true, preview: ... }` with `clientNeedId`, whereas `GetCompositionAsync` and `GetQuestionPoolPreviewAsync` return the DTOs at the root with `ClientNeedCode`.

---

## 4. Existing Course/Subject & Client Needs Implementations

### 4.1 Database Models (`apps/api/Models/LearningStructure.cs`)
- **`Programme` (`Programmes`)**: `Id`, `Code` (`RN=1`, `PN=2`), `DisplayName`, `Description`, `IsActive`.
- **`Course` (`Courses`)**: `Id`, `ProgrammeId`, `Title`, `Description`, `DisplayOrder`, `IsPublished`, `IsActive`, `CreatedAt`, `UpdatedAt`, `SubjectDomains`.
- **`SubjectDomain` (`SubjectDomains`)**: `Id`, `CourseId`, `Title`, `Description`, `DisplayOrder`, `IsActive`, `CreatedAt`, `UpdatedAt`, `Categories`.
- **`Category` (`Categories`)**, **`Subcategory` (`Subcategories`)**, **`Topic` (`Topics`)**: Hierarchical curriculum nodes under `SubjectDomain`.
- **`ClientNeed` (`ClientNeeds`)**: `Id`, `Code` (unique index), `Name`, `Description`, `DisplayOrder`, `IsActive`, `Pathway` (`"rn"`, `"pn"`, `"both"`), `CreatedAt`, `UpdatedAt`.

### 4.2 Backend Controllers & Services (`CurriculumController`, `ClientNeedsController`, `CurriculumService`)
- `CurriculumController` (`/api/v1/curriculum/courses`, `/api/v1/curriculum/subject-domains`, `/api/v1/curriculum/categories`, `/api/v1/curriculum/subcategories`, `/api/v1/curriculum/topics`, `/api/v1/curriculum/client-needs`) and `ClientNeedsController` (`/api/v1/client-needs`) already implement `GET`, `GET {id}`, `POST`, `PUT {id}`, and `DELETE {id}`.
- **Gaps Identified in Course/Subject & Client Needs:**
  1. `CurriculumService.GetCoursesAsync` and `GetCourseByIdAsync` do not compute `QuestionCount` for courses or subject domains, nor do they expose a `Code` or `Pathway` (`rn` / `pn` / `both`) directly on `CourseDto` / `SubjectDomainDto`.
  2. `CurriculumController` and `ClientNeedsController` require `Permission:content.create` and `Permission:content.edit` for mutations, whereas `exam_manager` in `CatalogSeeder.cs` only has `exams.*` and `content.view`. Granting `exam_manager` taxonomy management permissions (or allowing `exams.create` / `exams.edit` alongside `content.create` / `content.edit`) is required so Exam Managers can manage Course/Subject and Client Needs taxonomies.
  3. Course/Subject and Client Needs mutations in `CurriculumService` do not currently write entries to `AuditLogs`.
  4. Deletion of a `Course`, `SubjectDomain`, or `ClientNeed` checks child hierarchy/question references, but does not check whether any `Exam` revision references that `Course`, `SubjectDomain`, or `ClientNeed` in its `CompositionRulesJson` or `ExamQuestions`.
  5. Next.js BFF routes for `/api/admin/curriculum/courses`, `/api/admin/curriculum/courses/[id]`, `/api/admin/curriculum/subject-domains`, `/api/admin/curriculum/subject-domains/[id]`, `POST /api/admin/client-needs`, and `/api/admin/client-needs/[id]` (`GET`, `PUT`, `DELETE`) are not yet created.

---

## 5. Existing Question Repository Implementation

- **Database Model:** `Question` (`Questions`), `QuestionOption` (`QuestionOptions`), `QuestionVersion` (`QuestionVersions`) in `apps/api/Models/Questions.cs`.
- **Service & Controller:** `QuestionBankService` and `QuestionsController` (`/api/v1/questions`) manage centralized question authoring, versioning, status lifecycle (`Draft=0, InReview=1, Approved=2, Published=3, Rejected=4, Archived=5, Retired=6`), and taxonomy tagging (`TopicId` -> `Subcategory` -> `Category` -> `SubjectDomain` -> `Course`, and `ClientNeedId`).
- **Architectural Separation Verified:** Exam Management references existing questions via `ExamQuestion` (`ExamId`, `QuestionId`, `DisplayOrder`) and dynamic blueprint selection (`AssessmentSelectionService`) without duplicating question records.
- **Enhancement Needed:** `ExamLifecycleService.GetEligibleQuestionsAsync` currently only accepts `pathway` and `search`. Extending it to filter by `clientNeedId`, `courseId`, `subjectDomainId`, `topicId`, `questionType`, and `difficulty` will enable rich Question Repository filtering inside Standalone Custom Tests, RATS, and Practice Exams.

---

## 6. Existing RATS & Practice Exams Assessment Engine

- **Controller & Selection Service:** `AssessmentsController` (`/api/v1/assessments/available`, `/api/v1/assessments/{id}`), `ExamAttemptsController` (`/api/v1/attempts/start`, `/api/v1/attempts/{id}/submit`, etc.), and `AssessmentSelectionService` (`apps/api/Services/AssessmentSelectionService.cs`).
- **RATS Engine:** Uses `ExamType.DiagnosticReadiness` (`4`). `ExamAttemptsController` computes `ReadinessLevel` (`"Very High"`, `"High"`, `"Borderline"`, `"Low"`) and stores attempt history in `ExamAttempts`. `LearnerAnalyticsService` (`GetReadinessTrendAsync`) queries completed `ExamType.DiagnosticReadiness` attempts.
- **Practice Exams Engine:** Uses `ExamType.Practice` (`1`). Supports both `Preset` (fixed `ExamQuestions` list) and `DynamicBalanced` (blueprint-driven selection across Client Needs).
- **Compatibility Requirement:** Extending `CompositionRulesJson` to store RAT-specific readiness classification thresholds (`Low`, `Borderline`, `High`, `VeryHigh`), assessment objectives, Course/Subject mappings, and difficulty distributions will preserve 100% backward compatibility with `AssessmentsController`, `ExamAttemptsController`, and `LearnerAnalyticsService`.

---

## 7. Existing Permissions, RBAC & Audit Logging

- **Permissions Catalog (`apps/api/Security/PermissionsCatalog.cs`):**
  - `exams.view`, `exams.create`, `exams.edit`, `exams.delete`, `exams.publish`, `exams.review`
  - `content.view`, `content.create`, `content.edit`, `content.delete`, `content.approve`, `content.publish`
- **Role Hierarchy (`apps/api/Services/RoleHierarchy.cs`):**
  - `superadmin`, `admin`, `exam_manager`, `content_manager`, `reviewer`, `instructor`, `candidate`.
- **Audit Logging (`apps/api/Models/Identity.cs` — `AuditLog`):**
  - `ExamLifecycleService` and `ExaminationCodeService` log administrative mutations to `AuditLogs`. We will extend audit logging to Course/Subject CRUD, Client Needs CRUD, and examination deletion.

---

## 8. Reconciliation & Reuse Plan (Summary)

| Component | Classification | Action Plan |
|---|---|---|
| `Examination` & `Exam` entities | **Working / Extend** | Reuse as shared examination infrastructure; add `ExamType.Standalone = 5` and support module filtering (`Standalone`, `DiagnosticReadiness` / RAT, `Practice`). |
| `Course`, `SubjectDomain`, `ClientNeed` | **Working / Extend** | Reuse existing tables and `CurriculumService`; add question/exam dependency counts, search/filter/pagination, audit logging, and BFF CRUD routes. |
| `Question` & `ExamQuestion` | **Working** | Reuse centralized Question Repository; enhance `GetEligibleQuestionsAsync` with Course/Subject, Client Needs, difficulty, and format filters. |
| `ExaminationReadinessTab`, `ExaminationPreviewDialog`, `ExaminationCompositionTab` | **Mismatch / Reconcile** | Align BFF response envelopes (`{ success: true, readiness / preview / composition }`) and field aliases so both existing tests and live backend APIs work seamlessly. |
| `/admin/examinations` Landing & Module Workspaces | **Missing / Implement** | Build the 3-card Exam Management Landing Header (`01 · Create Custom Test (Stand Alone)`, `02 · RATS`, `03 · Practice Exams`) and complete module workspaces while preserving all existing Examination Library features and tests. |

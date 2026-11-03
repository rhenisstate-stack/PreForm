# PREPFORD — P3.2 EXAMINATION AUTHORING & ADMINISTRATIVE WORKFLOWS
## Phase 0: Readiness Audit and Controlled Implementation Plan

**Project:** PrepFord NCLEX  
**Phase:** P3.2 — Examination Authoring & Administrative Workflows  
**Mode:** READ-ONLY AUDIT  
**Status:** COMPLETE — IMPLEMENTATION NOT AUTHORIZED  
**Audit Date:** 3 November 2026  
**Auditor:** Senior ASP.NET Core & Next.js Systems Architect  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Current HEAD Commit:** `e317fe3ce5edf0440b765cf30e1cb8019dbce598`

---

## 1. Repository Baseline and Git Status

### 1.1 Working Tree Verification
A strict preflight check was conducted across the active repository before performing any audit actions.

- **Repository Root:** `C:\Users\gitau\Documents\PREform`
- **Active Git Branch:** `feature/dotnet-backend-migration`
- **HEAD Commit Hash:** `e317fe3ce5edf0440b765cf30e1cb8019dbce598`
- **HEAD Commit Subject:** `create PrepFord Examination Management — P3.1 Final Acceptance Audit doc file`
- **Working Tree Cleanliness:** Verified via `git status --short`. The working tree contains zero untracked, unstaged, or modified files (`nothing to commit, working tree clean`).
- **Preceding Commit History:**
  1. `e317fe3` — `create PrepFord Examination Management — P3.1 Final Acceptance Audit doc file`
  2. `8899d64` — `create PrepFord Examination Management — P3.1 Final Implementation Report doc file`
  3. `acc6e85` — `update the ExamAttemptsControllers api controllers file`
  4. `434dbbc` — `update the AttemptSnapshotTests and PostgresIntegrationTests test files`
  5. `630aa5d` — `create PrepFord Examination Management — P3.1 Test Evidence Report doc file`

### 1.2 Isolation & Safety Integrity
- **Database Safety Guard:** The environment has active loopback isolation. Verification database `prepford_gateb_verification` on PostgreSQL 18 (`127.0.0.1:5432`) is verified with EF Core migration `20261103092621_AddExaminationLifecycleAndSnapshot` applied.
- **Codebase Modifications:** Zero application, DTO, migration, test, or frontend code files were altered during this audit.
- **Credential Hygiene:** No secrets, database passwords, API tokens, or session signing keys are exposed in this report.

---

## 2. P3.1 Architecture Summary

Phase P3.1 established the domain foundation for examination management under 15 owner-approved architectural decisions (D1–D15). The implementation was audited and accepted under documented limitations in [`docs/exam-management-p3-1-final-acceptance-audit.md`](file:///c:/Users/gitau/Documents/PREform/docs/exam-management-p3-1-final-acceptance-audit.md).

### 2.1 Core Architectural Principles
1. **Stable Examination Identity (Option B / D2):**
   - Implemented via `Preform.Api.Models.Examination` in [`apps/api/Models/Assessments.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Models/Assessments.cs#L36-L84).
   - Serves as the permanent anchor for an examination family.
   - Holds the pathway (`RN` or `PN`), canonical code, family title, creator, created timestamp, active published revision reference (`CurrentRevisionId`), and lineage successor reference (`SuccessorExaminationId`).
2. **Versioned Revisions (`Exam` Entity / D2):**
   - Each specific revision of an examination is an instance of `Preform.Api.Models.Exam` in [`apps/api/Models/Assessments.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Models/Assessments.cs#L86-L154).
   - Foreign key `ExaminationId` maps the revision to its parent family with `OnDelete: ReferentialAction.Restrict`.
   - `RevisionNumber` is strictly monotonic and unique per examination family (`IX_Exams_ExaminationId_RevisionNumber`).
3. **Six-State Formal Lifecycle (D3):**
   - Governed by `ExamLifecycleState` enum in [`apps/api/Models/Assessments.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Models/Assessments.cs#L14-L21): `Draft` (1), `InReview` (2), `Approved` (3), `Published` (4), `Archived` (5), `Retired` (6).
   - Single published revision per family is enforced by partial unique index `IX_Exams_ExaminationId_SinglePublished` (`WHERE "LifecycleState" = 4`).
   - Single active draft revision per family is enforced by partial unique index `IX_Exams_ExaminationId_ActiveDraft` (`WHERE "LifecycleState" = 1`).
4. **Pathway-Scoped Sequential Code Generation (D1):**
   - Implemented in `Preform.Api.Services.ExaminationCodeService` in [`apps/api/Services/ExaminationCodeService.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Services/ExaminationCodeService.cs#L28-L82).
   - Formatted as `RN-EX-000001` to `RN-EX-999999` and `PN-EX-000001` to `PN-EX-999999`.
   - Backed by dedicated PostgreSQL sequences `exam_code_rn_seq` and `exam_code_pn_seq` with advisory locks (`pg_try_advisory_xact_lock`) and monotonic gap handling.
5. **Application-Managed Optimistic Concurrency (D5):**
   - Implemented via `long ConcurrencyToken` on `Exam` in [`apps/api/Models/Assessments.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Models/Assessments.cs#L119).
   - Bumped on every mutation; verified in `ExamLifecycleService.EnforceConcurrencyAsync` in [`apps/api/Services/ExamLifecycleService.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Services/ExamLifecycleService.cs#L490-L506).
   - Yields HTTP 409 Conflict with structured payload on token collision.
6. **Immutable Attempt Metadata Snapshot (D4):**
   - Captured at candidate attempt initialization in `Preform.Api.Controllers.ExamAttemptsController.StartAttempt` in [`apps/api/Controllers/ExamAttemptsController.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Controllers/ExamAttemptsController.cs#L430-L480).
   - Stored in PostgreSQL `jsonb` column `ExamAttempts.MetadataSnapshot`.
   - Preserves frozen title, code, pathway, revision number, time limit, and passing score percent for lifetime attempt grading integrity.
7. **Strict Separation of Duties (D8):**
   - Enforced in `ExamLifecycleService.ApproveAsync` in [`apps/api/Services/ExamLifecycleService.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Services/ExamLifecycleService.cs#L236-L245).
   - A revision's creator (`Exam.CreatedBy`) cannot approve that revision.
8. **Candidate Data Protection & Gate C Invariants:**
   - Enforced in `CandidateAttemptDetailDto` in [`apps/api/Controllers/ExamAttemptsController.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Controllers/ExamAttemptsController.cs#L94-L122).
   - In-progress attempts mask scores, answer correctness, and metadata snapshot to prevent cheating and information leakage.

---

## 3. Existing API Endpoint Inventory

The current backend API surface exposes 14 endpoints under `Preform.Api.Controllers.ExaminationsController` ([`apps/api/Controllers/ExaminationsController.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Controllers/ExaminationsController.cs)) and assessment attempt endpoints in `ExamAttemptsController` ([`apps/api/Controllers/ExamAttemptsController.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Controllers/ExamAttemptsController.cs)).

### 3.1 Detailed Inventory Table

| # | HTTP Method & Route | Request DTO | Response DTO | Required Roles | Validation & Lifecycle Rules | DB Operations | Audit Behavior | Test Citations | Scope Phase |
|---|---------------------|-------------|--------------|----------------|------------------------------|---------------|----------------|----------------|-------------|
| 1 | `GET /api/v1/examinations` | Query: `pathway` | `{ success: bool, examinations: ExaminationDto[] }` | Authenticated (Any role) | Non-admin roles (Candidate, Instructor) see only published revisions. Instructors see published exams only. | Read `Examinations` + `Exams` | None | `ExaminationLifecycleTests.InstructorAccess_CanOnlyViewPublishedExaminationsAndRevisions` | P3.1 Foundation |
| 2 | `GET /api/v1/examinations/{id}` | Path: `id` | `{ success: bool, examination: ExaminationDto }` | Authenticated (Any role) | Returns 404 if family not found or candidate attempts access to non-published examination. | Read `Examinations` + `Exams` | None | `ExaminationCodeTests.CreateExamination_CreatesStableFamilyAndAuditRecord` | P3.1 Foundation |
| 3 | `POST /api/v1/examinations` | `CreateExaminationRequest` | `{ success: bool, examination: object }` (201 Created) | ExamManager, Admin, SuperAdmin | Validates Pathway (`rn`/`pn`), Title required. Allocates permanent sequential code. Auto-creates Revision 1 in `Draft` state. | Insert `Examinations`, Insert `Exams`, Nextval Postgres sequence | Logs `AuditLog` entry `ExaminationCreated` | `ExaminationCodeTests.AllocateCode_GeneratesFormattedCodeForRNAndPN`, `PostgresIntegrationTests.Postgres_SequenceAllocation...` | P3.1 Foundation |
| 4 | `GET /api/v1/examinations/revisions/{revisionId}` | Path: `revisionId` | `{ success: bool, revision: ExamRevisionDto }` | Authenticated (Any role) | Candidate/Instructor restricted to Published revisions. Returns 404 if not found or unauthorized. | Read `Exams` + `Examination` + `ExamQuestions` count | None | `ExaminationLifecycleTests.InstructorAccess_CanOnlyViewPublishedExaminationsAndRevisions` | P3.1 Foundation |
| 5 | `POST /api/v1/examinations/{id}/revisions` | `CreateRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` (201 Created) | ExamManager, Admin, SuperAdmin | Rejects if an active draft already exists (`IX_Exams_ExaminationId_ActiveDraft`). Computes `RevisionNumber = max + 1`. Creates in `Draft` state. | Insert `Exams` | Logs `AuditLog` entry `ExamRevisionCreated` | `ExaminationLifecycleTests.CreateRevision_SetsDraftStateAndIncrementsRevisionNumber`, `CreateRevision_RejectsSecondDraftWhenActiveDraftExists` | P3.1 Foundation |
| 6 | `POST /api/v1/examinations/revisions/{revisionId}/submit` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | ExamManager, Admin, SuperAdmin | Requires `Draft` state. **Invariant:** Requires `revision.ExamQuestions.Count >= 1`. Verifies `ConcurrencyToken`. | Update `Exams` (`Draft` -> `InReview`, token++) | Logs `AuditLog` entry `ExamRevisionSubmitted` | `ExaminationLifecycleTests.SubmitForReview_RequiresAtLeastOneQuestion`, `SubmitForReview_TransitionsDraftToInReview` | P3.1 Foundation |
| 7 | `POST /api/v1/examinations/revisions/{revisionId}/recommend` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | Reviewer, Admin, SuperAdmin | Requires `InReview` state. Advisory only; leaves revision in `InReview` state. Verifies `ConcurrencyToken`. | Update `Exams` (`ReviewedBy`, `ReviewedAt`, token++) | Logs `AuditLog` entry `ExamRevisionRecommended` | `ExaminationLifecycleTests.RecommendApproval_AdvisoryEventPreservesInReviewState` | P3.1 Foundation |
| 8 | `POST /api/v1/examinations/revisions/{revisionId}/return` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | Reviewer, Admin, SuperAdmin | Requires `InReview` state. Non-empty `Reason` required. Transitions revision back to `Draft`. Verifies `ConcurrencyToken`. | Update `Exams` (`InReview` -> `Draft`, token++) | Logs `AuditLog` entry `ExamRevisionReturned` | `ExaminationLifecycleTests.ReturnForChanges_RequiresReasonAndReturnsToDraft` | P3.1 Foundation |
| 9 | `POST /api/v1/examinations/revisions/{revisionId}/approve` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | Admin, SuperAdmin | Requires `InReview` state. **Separation of Duties:** Creator cannot approve (`CreatedBy != actorId`). Verifies `ConcurrencyToken`. | Update `Exams` (`InReview` -> `Approved`, token++) | Logs `AuditLog` entry `ExamRevisionApproved` | `ExaminationLifecycleTests.Approve_SeparationOfDuties_CreatorCannotApproveOwnRevision`, `Approve_DifferentAdmin_Succeeds` | P3.1 Foundation |
| 10 | `POST /api/v1/examinations/revisions/{revisionId}/publish` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | ExamManager, Admin, SuperAdmin | Requires `Approved` state. Atomically archives previous published revision (if any). Updates `Examination.CurrentRevisionId`. Verifies `ConcurrencyToken`. | Update `Exams` (`Approved` -> `Published`), Update prior `Exams` (`Published` -> `Archived`), Update `Examinations` | Logs `AuditLog` entry `ExamRevisionPublished` | `ExaminationLifecycleTests.Publish_AtomicallyArchivesPreviousPublishedRevisionAndRecordsActiveAttempts`, `PostgresIntegrationTests.Postgres_PartialUniqueIndexes...` | P3.1 Foundation |
| 11 | `POST /api/v1/examinations/revisions/{revisionId}/archive` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | ExamManager, Admin, SuperAdmin | Requires `Published` state. Records count of in-progress attempts. Clears `Examination.CurrentRevisionId` if this revision was active. Verifies `ConcurrencyToken`. | Update `Exams` (`Published` -> `Archived`, token++), Update `Examinations` | Logs `AuditLog` entry `ExamRevisionArchived` | `ExaminationLifecycleTests.Archive_RecordsActiveAttemptsCount` | P3.1 Foundation |
| 12 | `POST /api/v1/examinations/revisions/{revisionId}/restore` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | SuperAdmin ONLY | Requires `Archived` state. Mandatory reason required. Restoration window <= 30 days (`ArchivedAt >= Now - 30d`). Rejects if another revision is currently `Published`. Verifies `ConcurrencyToken`. | Update `Exams` (`Archived` -> `Published`, token++), Update `Examinations.CurrentRevisionId` | Logs `AuditLog` entry `ExamRevisionRestored` | `ExaminationLifecycleTests.Restore_SuperadminOverride_Enforces30DayWindowAndNoDualPublished`, `Restore_RejectsRestorationIfAnotherRevisionIsCurrentlyPublished` | P3.1 Foundation |
| 13 | `POST /api/v1/examinations/revisions/{revisionId}/retire` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | Admin, SuperAdmin | Requires `Archived` state. Terminal transition; cannot be un-retired. Verifies `ConcurrencyToken`. | Update `Exams` (`Archived` -> `Retired`, token++) | Logs `AuditLog` entry `ExamRevisionRetired` | `ExaminationLifecycleTests.Retire_ArchivedToRetired_IsTerminal` | P3.1 Foundation |
| 14 | `POST /api/v1/examinations/revisions/{revisionId}/emergency-retire` | `TransitionRevisionRequest` | `{ success: bool, revision: ExamRevisionDto }` | SuperAdmin ONLY | Requires `Published` state. Mandatory reason required. Terminal emergency bypass. Clears `Examination.CurrentRevisionId`. Verifies `ConcurrencyToken`. | Update `Exams` (`Published` -> `Retired`, token++), Update `Examinations` | Logs `AuditLog` entry `ExamRevisionEmergencyRetired` | `ExaminationLifecycleTests.EmergencyRetire_SuperadminCanRetirePublishedDirectly` | P3.1 Foundation |

---

## 4. Examination Authoring Capability Matrix

The table below contrasts required examination authoring capabilities with their current implementation status in the codebase:

| Capability Area | Specific Capability | Current Status | Relevant Repository Citation | Finding & Architectural Gap |
|-----------------|---------------------|----------------|------------------------------|-----------------------------|
| **Family Identity** | Create Examination Family | Implemented (P3.1) | `ExaminationsController.CreateExamination` ([`apps/api/Controllers/ExaminationsController.cs#L52`](file:///c:/Users/gitau/Documents/PREform/apps/api/Controllers/ExaminationsController.cs#L52)) | Assigns permanent code and initial draft revision. Fully functional. |
| **Family Identity** | Update Examination Title | **MISSING (P3.2)** | None | **GAP:** No endpoint exists to update `Examination.Title` or family-level metadata. |
| **Family Identity** | Soft-Archive / Deactivate Family | **MISSING (P3.2)** | None | **GAP:** No endpoint exists to retire/archive an entire examination family. |
| **Family Identity** | Hard Delete Family Protection | Enforced by DB | EF Core Foreign Key `FK_Exams_Examinations_ExaminationId` ([`AppDbContext.cs#L291`](file:///c:/Users/gitau/Documents/PREform/apps/api/Data/AppDbContext.cs#L291)) | `ReferentialAction.Restrict` prevents accidental deletion of families with revisions. |
| **Revision Creation** | Create New Draft Revision | Implemented (P3.1) | `ExaminationsController.CreateRevision` ([`apps/api/Controllers/ExaminationsController.cs#L107`](file:///c:/Users/gitau/Documents/PREform/apps/api/Controllers/ExaminationsController.cs#L107)) | Creates monotonically incremented revision in `Draft` state; enforces single draft per family via DB index. |
| **Draft Authoring** | Update Draft Revision Metadata (`Title`, `Description`, `ExamType`, `TimeLimitMinutes`, `PassingScorePercent`) | **MISSING (P3.2)** | None | **CRITICAL GAP:** There is NO endpoint to edit a draft's settings. Once created, a revision is completely frozen and cannot be adjusted. |
| **Draft Authoring** | Draft-Only Mutation Guard | Partial | `ExamLifecycleService.SubmitForReviewAsync` checks state | Mutating operations must strictly reject any revision not in `ExamLifecycleState.Draft`. |
| **Question Association** | Attach Question to Draft Revision | **MISSING (P3.2)** | `ExamQuestions` entity exists ([`apps/api/Models/Assessments.cs#L157`](file:///c:/Users/gitau/Documents/PREform/apps/api/Models/Assessments.cs#L157)) | **BLOCKING GAP:** Zero endpoints exist to attach a question to an exam revision. Since `SubmitForReview` requires >= 1 question, drafts created via API can never be submitted without direct DB tampering! |
| **Question Association** | Detach Question from Draft Revision | **MISSING (P3.2)** | `AppDbContext.cs` line 304 | **GAP:** No endpoint exists to delete rows from `ExamQuestions`. |
| **Question Association** | Reorder Questions in Revision | **MISSING (P3.2)** | `ExamQuestion.DisplayOrder` column exists | **GAP:** No endpoint exists to update `DisplayOrder` across questions in a draft revision. |
| **Question Association** | List Questions in Revision | **MISSING (P3.2)** | None | **GAP:** `ExamRevisionDto` only returns `QuestionCount` (int). No endpoint returns the ordered list of questions associated with a revision. |
| **Question Validation** | Pathway Consistency Guard | **MISSING (P3.2)** | None | **GAP:** No validation exists to prevent attaching a PN question to an RN examination revision. |
| **Question Validation** | Question Status Guard | **MISSING (P3.2)** | `QuestionStatus` enum ([`apps/api/Models/Questions.cs#L14`](file:///c:/Users/gitau/Documents/PREform/apps/api/Models/Questions.cs#L14)) | **GAP:** No validation exists to ensure only `Approved` or `Published` questions from the Question Bank can be attached to an exam revision. |
| **Review Pre-flight** | Pre-Submission Validation Check | Partial | Hardcoded exception in `SubmitForReviewAsync` ([`ExamLifecycleService.cs#L158`](file:///c:/Users/gitau/Documents/PREform/apps/api/Services/ExamLifecycleService.cs#L158)) | Validates `ExamQuestions.Count > 0` on submission attempt, but lacks a non-mutating validation/readiness endpoint. |
| **Lifecycle Workflows** | Review, Return, Approve, Publish, Archive, Restore, Retire | Implemented (P3.1) | `ExaminationsController.cs#L117-L217` | All 7 lifecycle transitions are implemented and covered by unit/Postgres tests. |
| **Question Authoring** | Create/Edit Question Stems, Options, Rationales, Exhibits | **DEFERRED (P4)** | `apps/api/Models/Questions.cs` | **OUT OF SCOPE FOR P3.2:** Question authoring belongs to the Question Bank module (P4). P3.2 only associates existing questions. |

---

## 5. Frontend Integration Inventory

A comprehensive inspection of `apps/web` reveals the exact current state of administrative UI integration:

### 5.1 Admin Pages & Layouts
- **Admin Shell:** Located at [`apps/web/src/components/admin/admin-shell.tsx`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/components/admin/admin-shell.tsx) and [`apps/web/src/app/admin/layout.tsx`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/app/admin/layout.tsx).
- **Existing Admin Routes:**
  1. `/admin` — Overview governance dashboard ([`apps/web/src/app/admin/page.tsx`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/app/admin/page.tsx))
  2. `/admin/question-types` — Read-only catalogue of 18 question types ([`apps/web/src/app/admin/question-types/page.tsx`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/app/admin/question-types/page.tsx))
  3. `/admin/subscriptions` — Subscription plan management ([`apps/web/src/app/admin/subscriptions/page.tsx`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/app/admin/subscriptions/page.tsx))
- **Examination Admin Pages:** **ZERO exist.** There is no `/admin/examinations` route, no revision viewer, no authoring editor, and no lifecycle control panel.

### 5.2 Navigation Architecture
In [`apps/web/src/lib/admin/navigation.tsx`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/lib/admin/navigation.tsx#L13-L17), the navigation model states:
> *"Invariant: every href here must correspond to an existing route. Items for modules without backend capability land in this file during their phase (Academics P3, Question Bank P4, Exams P5, Users/Audit P6, Analytics P7). Placeholder pages for nonexistent modules are intentionally not created."*

`EXAMINATION_GROUP` ([`navigation.tsx#L54-L68`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/lib/admin/navigation.tsx#L54-L68)) currently contains only `question-types`. It explicitly omits examination management links because the UI has not yet been built.

### 5.3 Frontend Authorization Capabilities
In [`apps/web/src/lib/admin/authz.ts`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/lib/admin/authz.ts#L75-L82), `AdminCapabilities` is defined as:
```typescript
export interface AdminCapabilities {
  canViewOverview: boolean;
  canManageSubscriptions: boolean;
  canViewQuestionTypes: boolean;
}
```
There are no capability flags for examination authoring (`canManageExaminations`, `canReviewExaminations`, `canPublishExaminations`, `canOverrideExaminations`).

### 5.4 API Client & Services
- **BFF & Client Layer:** [`apps/web/src/lib/api-client.ts`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/lib/api-client.ts) provides HMAC mutual gateway signing with ASP.NET Core.
- **Service Modules in [`apps/web/src/lib/api-services.ts`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/lib/api-services.ts):**
  - `authService`
  - `profileService`
  - `subscriptionAdminService`
  - `checkoutService`
  - `attemptsService`
  - **`examinationsService` is completely MISSING.**
- **Next.js BFF Route Handlers:** No route handlers exist under `apps/web/src/app/api/admin/examinations/*` or `apps/web/src/app/api/examinations/*`.

### 5.5 UI Component Library
The frontend has a fully configured shadcn/UI component set in [`apps/web/src/components/ui/`](file:///c:/Users/gitau/Documents/PREform/apps/web/src/components/ui/):
- `button.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `badge.tsx`, `table` (via command/table primitives), `sheet.tsx`, `skeleton.tsx`, `sonner.tsx` (toast notifications).
These components can be used directly for building the P3.2 examination authoring UI without introducing new third-party dependencies.

---

## 6. Database and Migration Findings

### 6.1 EF Core Entity Configurations
In [`apps/api/Data/AppDbContext.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Data/AppDbContext.cs#L268-L325):
- `modelBuilder.Entity<Examination>`:
  - Key: `Id` (text)
  - Indexes: `Code` (Unique), `(Pathway, Code)` (Unique), `CurrentRevisionId`, `SuccessorExaminationId`.
  - Self-referencing FK: `SuccessorExaminationId` with `DeleteBehavior.Restrict`.
  - Revision reference FK: `CurrentRevisionId` targeting `Exams(Id)` with `DeleteBehavior.SetNull`.
- `modelBuilder.Entity<Exam>`:
  - Key: `Id` (text)
  - Revision uniqueness: `IX_Exams_ExaminationId_RevisionNumber` (Unique).
  - Active draft partial index: `IX_Exams_ExaminationId_ActiveDraft` (`WHERE "LifecycleState" = 1`).
  - Single published partial index: `IX_Exams_ExaminationId_SinglePublished` (`WHERE "LifecycleState" = 4`).
  - Family FK: `ExaminationId` targeting `Examinations(Id)` with `DeleteBehavior.Restrict`.
- `modelBuilder.Entity<ExamQuestion>`:
  - Composite unique index: `IX_ExamQuestions_ExamId_QuestionId` on `(ExamId, QuestionId)`.
  - Parent Exam FK: `ExamId` with `DeleteBehavior.Cascade` (deleting an unreferenced revision cascades to its question links).
  - Question FK: `QuestionId` with `DeleteBehavior.Restrict` (deleting a Question from the bank is blocked if linked to any Exam).
  - Ordering column: `DisplayOrder` (int).
- `modelBuilder.Entity<ExamAttempt>`:
  - JSONB column: `MetadataSnapshot`.
  - Attempt Exam FK: `ExamId` with `DeleteBehavior.Restrict` (deleting an Exam with attempts is permanently blocked).

### 6.2 Existing Migrations
The migration sequence in [`apps/api/Migrations/`](file:///c:/Users/gitau/Documents/PREform/apps/api/Migrations/) consists of 7 numbered steps:
1. `0001_CreateProgrammes`
2. `0002_AddMasterDomainModels`
3. `0003_AddUserProfileImages`
4. `0004_HarmonizeBackendSchema`
5. `0005_AddStudyStudioFlashcards`
6. `0006_AddQuestionTypeCapabilityAndStatus`
7. `0007_AddExaminationLifecycleAndSnapshot` (`20261103092621_AddExaminationLifecycleAndSnapshot.cs`)

### 6.3 Database Sequences
Migration 0007 created two PostgreSQL sequences:
- `exam_code_rn_seq` (min 1, max 999999, increment 1, no cycle)
- `exam_code_pn_seq` (min 1, max 999999, increment 1, no cycle)
Both are active and verified on `prepford_gateb_verification`.

### 6.4 Legacy Record Integrity
- Baseline legacy records in `Exams` with `ExaminationId = NULL` or `LifecycleState = 0` (unmanaged pre-P3.1 records) remain isolated.
- Read operations gracefully fall back to legacy fields without throwing null reference exceptions.
- **Rule:** No legacy backfill should be executed during P3.2 without explicit owner authorization and a dedicated migration script.

---

## 7. Authorization and Security Findings

### 7.1 Role Hierarchy & Policy Enforcement
Role enforcement is managed centrally via `Preform.Api.Services.RoleHierarchy` ([`apps/api/Services/RoleHierarchy.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Services/RoleHierarchy.cs)):
- `superadmin` > `admin` (`administrator`) > `manager` > `content_manager` > `exam_manager` > `reviewer` > `instructor` > `candidate`.
- Normalization: case-insensitive, trimmed, whitespace-collapsed; unknown roles default to `candidate`.

### 7.2 Separation of Duties Matrix
Enforced in `ExamLifecycleService.cs`:

| Operation | Authorized Roles | Creator Allowed? | Specific Enforcement Logic |
|-----------|------------------|------------------|----------------------------|
| **Create Examination** | ExamManager, Admin, SuperAdmin | N/A (Creates new) | `ExaminationsController.CreateExamination` lines 61-67 |
| **Create Revision** | ExamManager, Admin, SuperAdmin | N/A (Creates new) | `ExamLifecycleService.CreateRevisionAsync` lines 105-108 |
| **Submit for Review** | ExamManager, Admin, SuperAdmin | Yes (Author submits) | `ExamLifecycleService.SubmitForReviewAsync` lines 140-141 |
| **Recommend Approval** | Reviewer, Admin, SuperAdmin | Yes (Advisory notes) | `ExamLifecycleService.RecommendApprovalAsync` lines 174-175 |
| **Return for Changes** | Reviewer, Admin, SuperAdmin | Yes (Rejection notes) | `ExamLifecycleService.ReturnForChangesAsync` lines 206-207 |
| **Approve Revision** | Admin, SuperAdmin | **NO (STRICT 403)** | `ExamLifecycleService.ApproveAsync` lines 240-245: `if (revision.CreatedBy == actorId) throw new UnauthorizedAccessException("Separation of duties violation: A revision creator cannot approve their own revision.")` |
| **Publish Revision** | ExamManager, Admin, SuperAdmin | Yes | `ExamLifecycleService.PublishAsync` lines 268-269 |
| **Archive Revision** | ExamManager, Admin, SuperAdmin | Yes | `ExamLifecycleService.ArchiveAsync` lines 314-315 |
| **Restore Revision** | **SuperAdmin ONLY** | N/A | `ExamLifecycleService.RestoreAsync` lines 354-355: `EnforceRole(role, new[] { RoleHierarchy.RoleSuperAdmin }, "RestoreExamRevision")` |
| **Retire Revision** | Admin, SuperAdmin | Yes | `ExamLifecycleService.RetireAsync` lines 410-411 |
| **Emergency Retire** | **SuperAdmin ONLY** | N/A | `ExamLifecycleService.EmergencyRetireAsync` lines 452-453 |
| **Candidate View** | All authenticated | Read-only | Candidates only see `Published` exams; all lifecycle endpoints return 403. |
| **Instructor View** | Instructor | Read-only | Instructors only see `Published` exams; cannot access drafts or reviews. |

---

## 8. Existing Test Evidence

### 8.1 Test Suite Status
The test suites were executed on 3 November 2026:
- **Unit & Functional Test Suite (`Preform.Api.Tests`):**
  - **Passed:** 219
  - **Failed:** 0
  - **Skipped:** 0
  - **Total:** 219 tests (100% pass rate, execution duration: 23s)
- **PostgreSQL Gate B Integration Suite (`prepford_gateb_verification`):**
  - **Passed:** 18
  - **Failed:** 0
  - **Skipped:** 0
  - **Total:** 18 tests (100% pass rate)
- **Consolidated Backend Pass Rate:** 237 / 237 passing (100%).

### 8.2 Breakdown of Relevant Test Classes
1. [`apps/api/Tests/ExaminationLifecycleTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/ExaminationLifecycleTests.cs) (17 tests):
   - `CreateRevision_SetsDraftStateAndIncrementsRevisionNumber`
   - `CreateRevision_RejectsSecondDraftWhenActiveDraftExists`
   - `SubmitForReview_RequiresAtLeastOneQuestion`
   - `SubmitForReview_TransitionsDraftToInReview`
   - `RecommendApproval_AdvisoryEventPreservesInReviewState`
   - `ReturnForChanges_RequiresReasonAndReturnsToDraft`
   - `Approve_SeparationOfDuties_CreatorCannotApproveOwnRevision`
   - `Approve_DifferentAdmin_Succeeds`
   - `Publish_AtomicallyArchivesPreviousPublishedRevisionAndRecordsActiveAttempts`
   - `Archive_RecordsActiveAttemptsCount`
   - `Restore_SuperadminOverride_Enforces30DayWindowAndNoDualPublished`
   - `Restore_RejectsRestorationIfAnotherRevisionIsCurrentlyPublished`
   - `Retire_ArchivedToRetired_IsTerminal`
   - `EmergencyRetire_SuperadminCanRetirePublishedDirectly`
   - `ConcurrencyTokenMismatch_ThrowsDbUpdateConcurrencyExceptionAndLogsConflict`
   - `RoleAuthorization_ContentManagerHasNoLifecycleAuthority`
   - `InstructorAccess_CanOnlyViewPublishedExaminationsAndRevisions`
2. [`apps/api/Tests/ExaminationCodeTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/ExaminationCodeTests.cs) (4 tests):
   - `AllocateCode_GeneratesFormattedCodeForRNAndPN`
   - `AllocateCode_CaseInsensitivePathwayHandling`
   - `AllocateCode_RejectsInvalidPathway`
   - `CreateExamination_CreatesStableFamilyAndAuditRecord`
3. [`apps/api/Tests/AttemptSnapshotTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/AttemptSnapshotTests.cs) (3 tests):
   - `StartAttempt_GeneratesAuthoritativeJsonMetadataSnapshot`
   - `StartAttempt_RejectsNonPublishedExams`
   - `GetAttemptById_ProvidesLegacyFallbackWhenMetadataSnapshotIsNull`
4. [`apps/api/Tests/PostgresIntegrationTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/PostgresIntegrationTests.cs) (14 tests):
   - `Postgres_SequenceAllocation_GeneratesSequentialCodesFromDatabaseSequences`
   - `Postgres_PartialUniqueIndexes_EnforcesSinglePublishedAndSingleDraftPerFamily`
   - `Postgres_AttemptMetadataSnapshot_PersistsAndQueriesJsonb`
   - Plus 11 foundational PostgreSQL schema, RBAC, referential integrity, and error sanitization tests.
5. [`apps/api/Tests/QuestionTypePostgresGateBTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/QuestionTypePostgresGateBTests.cs) (4 tests):
   - Validates catalogue seeding, enum bitmask constraints, and metadata retrieval against PostgreSQL.
6. [`apps/api/Tests/CandidateDataContractTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/CandidateDataContractTests.cs) (4 tests):
   - Validates that in-progress attempts mask scores, answer keys, and internal shapes from candidates.
7. [`apps/api/Tests/AttemptMembershipSecurityTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/AttemptMembershipSecurityTests.cs) (11 tests):
   - Validates question membership validation, foreign question rejection, and cross-user isolation.
8. [`apps/api/Tests/GradingSecurityTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/GradingSecurityTests.cs) (16 tests):
   - Validates server-authoritative grading, explicit `Ungraded` handling, and tampering resistance.
9. [`apps/api/Tests/RoleResolutionTests.cs`](file:///c:/Users/gitau/Documents/PREform/apps/api/Tests/RoleResolutionTests.cs) (8 tests):
   - Validates role normalization, hierarchy inheritance, and superadmin elevation.

---

## 9. Missing Functionality and Defects

The audit identified twelve (12) discrete gaps preventing administrative users from authoring examinations end-to-end:

### 9.1 Backend Gaps
1. **Defect / Blocking Gap — Unsubmittable API Drafts:**
   - In [`apps/api/Services/ExamLifecycleService.cs#L158-L161`](file:///c:/Users/gitau/Documents/PREform/apps/api/Services/ExamLifecycleService.cs#L158-L161), `SubmitForReviewAsync` enforces:
     ```csharp
     if (revision.ExamQuestions.Count == 0)
         throw new InvalidOperationException("Revision must contain at least one question before submission for review.");
     ```
   - Because there is no endpoint to attach questions to an exam revision, every draft created via `POST /api/v1/examinations/{id}/revisions` has `ExamQuestions.Count == 0` and **can never be submitted for review via the API**.
2. **Missing Endpoint — Draft Revision Metadata Update:**
   - No `PUT` or `PATCH` endpoint exists for `/api/v1/examinations/revisions/{revisionId}`.
   - Authors cannot modify title, description, time limit, exam type, or passing score percent once a draft is initialized.
3. **Missing Endpoint — Examination Family Title Update:**
   - No `PATCH /api/v1/examinations/{id}` exists to update the family-level `Title`.
4. **Missing Endpoints — Question Membership Management:**
   - No endpoint to attach a question: `POST /api/v1/examinations/revisions/{revisionId}/questions`
   - No endpoint to detach a question: `DELETE /api/v1/examinations/revisions/{revisionId}/questions/{questionId}`
   - No endpoint to reorder questions: `PUT /api/v1/examinations/revisions/{revisionId}/questions/reorder`
   - No endpoint to list questions in a revision: `GET /api/v1/examinations/revisions/{revisionId}/questions`
5. **Missing Domain Validation — Question Pathway Alignment:**
   - There is no validation check ensuring that questions added to an `RN` exam revision belong to pathway `rn` (or `both`), and not `pn`.
6. **Missing Domain Validation — Question Lifecycle Status Guard:**
   - There is no validation ensuring that attached questions are in `Approved` or `Published` status.
7. **Missing Endpoint — Draft Deletion / Discard:**
   - Authors cannot discard an unwanted draft revision before submission. An abandoned draft permanently blocks creating another draft due to the partial unique index `IX_Exams_ExaminationId_ActiveDraft`.
8. **Missing Validation Pre-flight Endpoint:**
   - Authors have no non-mutating validation check (`GET /api/v1/examinations/revisions/{revisionId}/validate`) to see why a draft is not yet ready for review submission.

### 9.2 Frontend Gaps
9. **Missing UI Pages:**
   - No administrative examination management pages exist under `apps/web/src/app/admin/examinations`.
10. **Missing Navigation Configuration:**
   - `EXAMINATION_GROUP` in `apps/web/src/lib/admin/navigation.tsx` lacks an entry for Examination Management.
11. **Missing Frontend Role Capabilities:**
   - `AdminCapabilities` in `apps/web/src/lib/admin/authz.ts` lacks examination permissions (`canManageExaminations`, etc.).
12. **Missing API Service & BFF Routes:**
   - No `examinationsService` exists in `apps/web/src/lib/api-services.ts`.
   - No Next.js BFF proxy routes exist to securely forward requests to the ASP.NET Core backend.

---

## 10. Recommended P3.2 Implementation Sequence

To resolve these gaps safely without risking regressions or violating architectural boundaries, the implementation of P3.2 must proceed in seven (7) strictly gated, incremental stages:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 1: Backend Draft Metadata Authoring & Validation APIs            │
│ (PUT revision metadata, concurrency checks, draft-state guard)         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Stage 2: Backend Exam Question Membership Management APIs              │
│ (Attach, detach, reorder, list questions; pathway & status validation)  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Stage 3: Backend Family Metadata & Draft Discard Protection            │
│ (PATCH family title, DELETE unsubmitted draft with cleanup)            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Stage 4: Backend Comprehensive Unit & Postgres Integration Tests       │
│ (Verify all new endpoints, concurrency token bump, pathway guards)     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Stage 5: Next.js BFF Route Handlers & Typed API Client Services        │
│ (HMAC gateway signing, session auth, typed DTOs, error mapping)        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Stage 6: Admin Frontend UI Components & Workflows                      │
│ (Family list, revision details, metadata editor, question picker)      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Stage 7: End-to-End Workflow Verification & Final Acceptance Audit    │
│ (Full authoring-to-publish flow, Gate B/C regression verification)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: Backend Draft Metadata Authoring & Validation APIs
- Add DTOs: `UpdateRevisionMetadataRequest` (`Title`, `Description`, `ExamType`, `TimeLimitMinutes`, `PassingScorePercent`, `ConcurrencyToken`).
- Add service method `UpdateRevisionMetadataAsync` in `ExamLifecycleService`.
- Enforce:
  - Revision must be in `Draft` state (`ExamLifecycleState.Draft`). Any other state returns 422 Unprocessable Entity.
  - Concurrency token verification (`EnforceConcurrencyAsync`).
  - Monotonic concurrency token increment on successful update.
  - Passing score percent bounded between 0.0m and 100.0m.
  - Time limit minutes >= 0.
- Add endpoint `PUT /api/v1/examinations/revisions/{revisionId}` in `ExaminationsController`.
- Add endpoint `GET /api/v1/examinations/revisions/{revisionId}/validate` returning validation issues (e.g. question count, empty title, unapproved questions).

### Stage 2: Backend Exam Question Membership Management APIs
- Add DTOs:
  - `AddExamQuestionRequest` (`QuestionId`, `DisplayOrder?`, `ConcurrencyToken`)
  - `RemoveExamQuestionRequest` (`ConcurrencyToken`)
  - `ReorderExamQuestionsRequest` (`QuestionOrders: List<{ QuestionId, DisplayOrder }>`, `ConcurrencyToken`)
  - `ExamQuestionDetailDto` (`Id`, `QuestionId`, `Stem`, `QuestionTypeKey`, `Pathway`, `Difficulty`, `Status`, `DisplayOrder`)
- Add service methods in `ExamLifecycleService`:
  - `AddQuestionToRevisionAsync`: verifies question exists, verifies pathway matches revision pathway (`rn` vs `pn`), verifies question status is `Approved` or `Published`, verifies question is not already attached (enforced by `IX_ExamQuestions_ExamId_QuestionId`), increments `ConcurrencyToken`.
  - `RemoveQuestionFromRevisionAsync`: removes association, adjusts display orders, increments `ConcurrencyToken`.
  - `ReorderQuestionsAsync`: bulk updates display order, increments `ConcurrencyToken`.
  - `GetRevisionQuestionsAsync`: returns ordered question summaries for author inspection.
- Add endpoints to `ExaminationsController`:
  - `GET /api/v1/examinations/revisions/{revisionId}/questions`
  - `POST /api/v1/examinations/revisions/{revisionId}/questions`
  - `DELETE /api/v1/examinations/revisions/{revisionId}/questions/{questionId}`
  - `PUT /api/v1/examinations/revisions/{revisionId}/questions/reorder`

### Stage 3: Backend Family Metadata & Draft Discard Protection
- Add DTO: `UpdateExaminationRequest` (`Title`).
- Add endpoint `PATCH /api/v1/examinations/{id}` to update family title (Admin/ExamManager only).
- Add endpoint `DELETE /api/v1/examinations/revisions/{revisionId}` (Draft discard):
  - Strictly requires `LifecycleState == ExamLifecycleState.Draft`.
  - Strictly requires revision has 0 attempts (`Attempts.Count == 0`).
  - Cannot delete Revision 1 if it is the only revision of the family (must maintain family integrity).
  - Deletes attached `ExamQuestions` (cascade) and removes draft row, freeing up `IX_Exams_ExaminationId_ActiveDraft`.

### Stage 4: Backend Comprehensive Unit & Postgres Integration Tests
- Unit tests in `Preform.Api.Tests`:
  - Draft metadata update happy path & concurrency conflict rejection.
  - Rejection of draft edits when revision is in `InReview`, `Approved`, `Published`, `Archived`, or `Retired`.
  - Question attachment happy path & duplicate rejection.
  - Rejection of question attachment when pathways mismatch (e.g. PN question in RN exam).
  - Rejection of question attachment when question is `Draft` or `Archived`.
  - Question reordering and display order monotonicity.
  - Draft discard happy path and rejection of non-draft deletion.
- Integration tests in `PostgresIntegrationTests.cs`:
  - Verifying question attachment and reordering against real PostgreSQL constraints.
  - Verifying concurrency token bump on question membership mutations.

### Stage 5: Next.js BFF Route Handlers & Typed API Client Services
- Create BFF route handlers under `apps/web/src/app/api/admin/examinations/`:
  - `route.ts` (List, Create family)
  - `[id]/route.ts` (Get family detail, Update title)
  - `[id]/revisions/route.ts` (Create revision)
  - `revisions/[revisionId]/route.ts` (Get revision, Update metadata, Discard draft)
  - `revisions/[revisionId]/questions/route.ts` (List, Add question)
  - `revisions/[revisionId]/questions/[questionId]/route.ts` (Remove question)
  - `revisions/[revisionId]/questions/reorder/route.ts` (Reorder questions)
  - `revisions/[revisionId]/[action]/route.ts` (Submit, recommend, return, approve, publish, archive, restore, retire)
- Use standard `apiClient` with HMAC signing and `verifyAdminAuth()`.
- Add typed `examinationsService` to `apps/web/src/lib/api-services.ts`.

### Stage 6: Admin Frontend UI Components & Workflows
- Update `apps/web/src/lib/admin/navigation.tsx` to add "Examinations" under `EXAMINATION_GROUP`.
- Update `apps/web/src/lib/admin/authz.ts` to add `canManageExaminations` capability.
- Create UI pages under `apps/web/src/app/admin/examinations/`:
  - `page.tsx` — Examination family catalogue table (code, title, pathway, current published revision, status badge, action buttons).
  - `[id]/page.tsx` — Family detail & revision lineage timeline.
  - `[id]/revisions/[revisionId]/page.tsx` — Revision detail & authoring studio:
    - Tab 1: Metadata settings form (Title, Description, Time limit, Pass score percent).
    - Tab 2: Question builder (Question list with drag/order controls, question picker dialog from approved questions).
    - Tab 3: Lifecycle workflow bar (Dynamic action buttons based on state: Submit for Review, Recommend, Return, Approve, Publish, Archive, Restore, Retire).
    - Pre-flight checklist card displaying validation status.

### Stage 7: End-to-End Verification & Gate B Regression Tests
- Verify complete end-to-end authoring flow in test harness:
  - Create family -> Update draft metadata -> Attach approved questions -> Submit for review -> Recommend -> Approve (with creator separation guard) -> Publish.
  - Run full suite of 237+ backend tests to ensure zero regressions against Gate B or Gate C.

---

## 11. Explicit Scope Boundaries

To prevent scope creep and protect existing candidate data and assessment engines, the following boundaries are strictly enforced for P3.2:

### 11.1 STRICTLY PROHIBITED in Phase P3.2
1. **Question Authoring / Question Bank CRUD:**
   - Creating new questions, editing question stems, options, clinical vignettes, exhibits, or rationales is **strictly prohibited**.
   - Question authoring belongs exclusively to Phase P4 (Question Bank Management).
   - In P3.2, authors may ONLY link existing approved questions to an exam revision.
2. **Adaptive CAT Scoring & Psychometrics:**
   - Any modification to CAT item-selection, item response theory (IRT), stopping rules, or difficulty theta estimators is **strictly prohibited**.
3. **Assessment Attempt Synchronization & Grading Changes:**
   - No modifications to `ExamAttemptsController.SubmitResponse`, `SubmitAndCompleteAttempt`, or `SyncAssessmentAttempt`.
   - Server-authoritative grading services in `Preform.Api.Services.Grading` must not be touched.
4. **Candidate Result Analytics:**
   - Cohort reporting, score distribution charts, and candidate performance analytics belong to P7.
5. **Subscription & Checkout Engine Changes:**
   - Monetization and subscription catalog code must remain untouched.
6. **Historical Attempt Snapshot Rewriting:**
   - Existing `MetadataSnapshot` records in `ExamAttempts` are immutable and must never be altered or recalculated.
7. **Production Migrations & Legacy Data Backfills:**
   - No data backfill of unmanaged `Exams` rows (`ExaminationId = NULL`) during P3.2.

---

## 12. Proposed Acceptance Criteria

Phase P3.2 will be considered complete and ready for acceptance when all of the following criteria are proven by evidence:

### 12.1 Backend Acceptance Criteria
- [ ] **AC-B1 (Draft Metadata Editing):** A draft revision can be updated via `PUT /api/v1/examinations/revisions/{revisionId}`. Updating modifies `Title`, `Description`, `ExamType`, `TimeLimitMinutes`, and `PassingScorePercent`, and increments `ConcurrencyToken`.
- [ ] **AC-B2 (Draft State Guard):** Attempting to update metadata on any revision in `InReview`, `Approved`, `Published`, `Archived`, or `Retired` returns HTTP 422 Unprocessable Entity.
- [ ] **AC-B3 (Question Association):** Existing questions can be associated with a draft revision via `POST /api/v1/examinations/revisions/{revisionId}/questions`.
- [ ] **AC-B4 (Pathway Alignment):** Associating a question whose `Pathway` does not match the examination pathway (e.g. PN question in RN exam) returns HTTP 422 Unprocessable Entity.
- [ ] **AC-B5 (Question Status Guard):** Associating a question in `Draft` or `Archived` status returns HTTP 422 Unprocessable Entity.
- [ ] **AC-B6 (Question Detachment & Reordering):** Questions can be removed from a draft revision and reordered via dedicated endpoints, correctly updating `DisplayOrder` and bumping `ConcurrencyToken`.
- [ ] **AC-B7 (Draft Submission Unblocked):** A draft revision with associated questions can be successfully submitted for review via `POST /api/v1/examinations/revisions/{revisionId}/submit` without requiring manual database intervention.
- [ ] **AC-B8 (Draft Discard):** An unsubmitted draft revision with 0 attempts can be safely deleted via `DELETE /api/v1/examinations/revisions/{revisionId}`, cascading to its `ExamQuestions` and unblocking the partial unique index `IX_Exams_ExaminationId_ActiveDraft`.
- [ ] **AC-B9 (Family Title Update):** Family title can be updated via `PATCH /api/v1/examinations/{id}` by authorized administrators.

### 12.2 Frontend Acceptance Criteria
- [ ] **AC-F1 (Admin Catalogue Page):** Administrative users can view all examination families at `/admin/examinations` with pathway filtering, status badges, and revision counts.
- [ ] **AC-F2 (Family Detail & Lineage):** Users can view an examination's full revision history timeline, showing monotonic revision numbers and lifecycle states.
- [ ] **AC-F3 (Authoring Studio Form):** Authors can edit draft settings and see real-time pre-flight validation status.
- [ ] **AC-F4 (Question Builder UI):** Authors can search approved questions, add them to the exam revision, reorder them, and remove them.
- [ ] **AC-F5 (Lifecycle Action Controls):** Authorized users can trigger state transitions (Submit, Recommend, Return, Approve, Publish, Archive, Restore, Retire) via modal confirmation dialogs.
- [ ] **AC-F6 (Separation of Duties in UI):** The "Approve" button is disabled with an explanatory tooltip if the logged-in admin is the revision's creator.

### 12.3 Security & Regression Acceptance Criteria
- [ ] **AC-S1 (Zero Regressions):** All 219 non-Postgres tests and all 18 Postgres integration tests continue to pass (100% pass rate).
- [ ] **AC-S2 (Candidate Data Shielding):** Candidates cannot access draft revisions, question lists, or authoring endpoints (enforced HTTP 403 Forbidden).
- [ ] **AC-S3 (Concurrency Defense):** Outdated concurrency tokens submitted during metadata or question editing return HTTP 409 Conflict.

---

## 13. Risks, Dependencies, and Stop Conditions

### 13.1 Key Risks & Mitigations
1. **Risk: Concurrency Desynchronization during Multi-Author Question Editing:**
   - *Scenario:* Two content managers edit question membership simultaneously on the same draft.
   - *Mitigation:* Require `ConcurrencyToken` in the payload for every question addition, removal, and reordering request. Any stale token triggers HTTP 409 and prompts a client-side reload.
2. **Risk: Foreign or Unapproved Question Leakage into Published Exams:**
   - *Scenario:* A draft question or a PN-specific question is attached to an RN examination.
   - *Mitigation:* Two-tier enforcement: Validate pathway and status during question attachment (`AddQuestionToRevisionAsync`), and re-validate all attached questions during review submission (`SubmitForReviewAsync`).
3. **Risk: Breaking Candidate Attempt Snapshot Integrity:**
   - *Scenario:* Altering `Exam` or `ExamQuestion` models affects how snapshots are generated.
   - *Mitigation:* `ExamAttempt.MetadataSnapshot` is generated strictly at attempt creation and remains decoupled from subsequent revision edits. Verified via `AttemptSnapshotTests`.

### 13.2 Hard Dependencies
- Active PostgreSQL instance with sequences `exam_code_rn_seq` and `exam_code_pn_seq`.
- Existing `Questions` and `QuestionOptions` tables seeded with valid test data.
- Stable `RoleHierarchy` service for actor role resolution.

### 13.3 Mandatory Stop Conditions
Implementation must **IMMEDIATELY STOP** and notify the Product Owner if any of the following occur:
1. Any requirement arises to modify `Questions`, `QuestionOptions`, or `QuestionVersions` schema (violating the P4 Question Bank boundary).
2. Any test regression occurs in the 219 baseline unit tests or 18 PostgreSQL Gate B tests.
3. Any attempt synchronization or grading logic in `ExamAttemptsController` is impacted.
4. Any conflict occurs with the partial unique indexes `IX_Exams_ExaminationId_ActiveDraft` or `IX_Exams_ExaminationId_SinglePublished`.

---

## 14. Executive Audit Verdict

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXECUTIVE AUDIT VERDICT                         │
│                                                                        │
│  PHASE P3.1 FOUNDATIONS:                   VERIFIED & SOLID            │
│  DATABASE SCHEMAS & SEQUENCES:             VERIFIED ON POSTGRESQL 18   │
│  CURRENT TEST SUITES:                      237 / 237 PASSING (100%)    │
│  P3.2 IMPLEMENTATION READINESS:            BLOCKED BY GAPS 1 & 4       │
│  RECOMMENDATION:                           AUTHORIZE STAGES 1 TO 4     │
│                                            (BACKEND-FIRST EXECUTION)   │
└────────────────────────────────────────────────────────────────────────┘
```

The PrepFord repository is in a pristine, verified baseline state. Phase P3.1 domain models, lifecycle transitions, sequential code generation, and candidate data protections operate as designed. 

However, **end-to-end examination authoring is currently impossible via the API** because:
1. Draft revisions cannot have their metadata updated once created.
2. There are no endpoints to associate questions with an exam revision, causing all drafts created via the API to permanently fail review submission.
3. The administrative web interface has zero examination management pages.

**Next Action:** Await explicit Product Owner authorization to begin **Stage 1 (Backend Draft Authoring & Validation APIs)** and **Stage 2 (Exam Question Membership APIs)** under the controlled implementation plan.

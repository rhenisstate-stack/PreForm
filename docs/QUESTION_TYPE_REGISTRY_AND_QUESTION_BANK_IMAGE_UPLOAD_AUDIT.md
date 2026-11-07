# PREPFORD NCLEX — QUESTION TYPE REGISTRY & QUESTION BANK IMAGE UPLOAD
## Phase 0: Existing System Comprehensive Technical Audit

**Document:** `docs/QUESTION_TYPE_REGISTRY_AND_QUESTION_BANK_IMAGE_UPLOAD_AUDIT.md`  
**Execution Date:** 2026-11-07  
**Branch:** `feature/dotnet-backend-migration` @ Commit `449c3d9`  
**Architecture:** Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS / shadcn/ui + ASP.NET Core 8 / EF Core 8 / PostgreSQL  
**Audit Scope:** Question Type Registry subsystem, Question Media binary image storage, Question Bank authoring and editing workflows, RBAC governance, and examination delivery pipeline.

---

## 1. Executive Summary

This technical audit establishes the exact baseline implementation of PrepFord's **Question Type Registry** and **Question Bank Image Upload** subsystems before introducing additive enhancements.

The system is a production-grade multi-tier architecture:
- **Backend API:** ASP.NET Core 8 with PostgreSQL database access through Entity Framework Core 8 (`Preform.Api.dll`).
- **Database:** PostgreSQL in the `public` schema with EF Core migrations through `0015_AddMonetizationManagementSubsystem`.
- **Frontend / BFF:** Next.js 16 App Router (`@prepford/web`) acting as a Backend-For-Frontend (BFF) proxy that verifies user sessions (`verifyAdminAuth`) and proxies requests to ASP.NET Core.

The audit verified that strong foundations exist for both features (binary image storage with SHA-256 deduplication and in-memory catalogue of 18 canonical question types), but critical functional capabilities are missing or incomplete. Specifically:
1. **The Question Type Registry** is read-only at the API level and rendered from a static hardcoded array in the frontend without CRUD capabilities, lifecycle state transitions (activate/deactivate/archive/restore), or dependency-aware deletion protection.
2. **Question Bank Image Upload** has robust backend binary storage (`bytea`) and an option-level image component (`QuestionImageUpload`), but lacks **stem-level image attachment**, **clinical exhibit image integration**, and **learner delivery propagation** (where exam attempts previously hardcoded `mediaUrl = null`).

---

## 2. Architecture & Working Tree Audit

- **Git Branch:** `feature/dotnet-backend-migration`
- **Head Commit:** `449c3d9` (*update the MonetizationManagement api tests file*)
- **Working Tree:** Clean, no uncommitted changes prior to audit.
- **Backend Solution:** `apps/api/Preform.Api.csproj` (Target framework: `net8.0`).
- **Build Status:** Succeeded with CS8601/CS8604/CS8602 compiler warnings in existing attempt controllers; 0 errors.
- **Database Migrations:** 15 existing migrations (`0001_CreateProgrammes` through `0015_AddMonetizationManagementSubsystem`).
- **Model Snapshot:** `apps/api/Migrations/0001_CreateProgrammes/AppDbContextModelSnapshot.cs`.

---

## 3. Question Type Registry Audit

### 3.1 Existing Architecture

The existing Question Type Registry is a **hybrid registry**:
1. **Code-Level Canonical Registry (`apps/api/Services/QuestionTypeRegistry.cs`):**  
   Contains hardcoded descriptors for the **18 canonical NCLEX question types**:
   - Traditional (8): `single-choice`, `multiple-choice`, `sata`, `checkbox`, `essay`, `matching`, `fill-blank`, `numeric`, `true-false`, `short-answer`.
   - Clinical (2): `image-based`, `multiple-image`.
   - NGN (8): `drag-drop`, `ordering`, `case-study`, `matrix`, `tabular`, `dynamic-lab`.
   Descriptors specify `Capabilities` (bitmask `QuestionTypeCapability`), `ImplementationStatus` (`QuestionTypeStatus`), `GradingStrategy`, and `SupportedScoringModes`.

2. **Database Table `QuestionTypeDefinitions` (`apps/api/Models/Questions.cs`):**  
   Table defined with columns:
   - `Id` (text PK, default GUID string)
   - `Key` (varchar 64, unique index)
   - `Name` (varchar 128)
   - `Description` (varchar 512)
   - `Category` (varchar 64)
   - `SupportedScoring` (varchar 64)
   - `CapabilityFlags` (int)
   - `ImplementationStatus` (varchar 32)
   - `IsActive` (boolean)
   - `DisplayOrder` (int)

3. **Database Seeder (`apps/api/Services/QuestionTypeCatalogueSeeder.cs`):**  
   Runs during application startup (`CatalogSeeder.cs`) and performs an idempotent upsert of the 18 canonical question types from `QuestionTypeRegistry.Instance.All`.

4. **Service Layer (`apps/api/Services/QuestionTypeService.cs`):**  
   Implements `IQuestionTypeService`:
   - `GetAllQuestionTypesAsync`: Fetches active records from `QuestionTypeDefinitions`, maps them to `QuestionTypeDto`. Throws `InvalidOperationException` if duplicate keys or unregistered keys exist!
   - `GetQuestionTypeByKeyAsync`: Retrieves single definition if present in `QuestionTypeRegistry`.
   - `ValidateQuestionTypeKeyAsync`: Verifies key is known and active.
   - **Missing:** No Create, Update, Activate, Deactivate, Archive, Restore, or Delete operations exist.

5. **API Controller (`apps/api/Controllers/QuestionTypesController.cs`):**  
   - `GET /api/v1/question-types` (Public metadata endpoint)
   - `GET /api/v1/question-types/{key}`
   - `POST /api/v1/question-types/validate`
   - **Missing:** No administrative management endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).

6. **Frontend Implementation (`apps/web/src/app/admin/question-types/page.tsx`):**  
   - Currently a static presentation page displaying hardcoded `const eighteenQuestionTypes: QuestionTypeCatalogueItem[] = [...]`.
   - Does NOT fetch from the API.
   - Does NOT provide CRUD operations.
   - Does NOT use the application's standard full-page CRUD layout primitives (`FullPageCrudLayout`, `FullPageHeader`, `FullPageActionBar`, `FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`).

### 3.2 Registry Architectural Findings & Governance Needs

1. **System vs. Custom Question Types:**  
   The 18 canonical question types have compiled domain logic, contract validation (`QuestionTypeContractValidator.cs`), candidate rendering (`QuestionTypeRenderer.tsx`), editor configurations (`QuestionTypeEditor.tsx`), and scoring logic.  
   - System-defined types must be protected with `IsSystemDefined = true`.
   - System-defined types must NEVER be deleted through administrative CRUD.
   - Administrators may create custom question types, but they must be flagged as `IsSystemDefined = false` with implementation status `Catalogued`. Dynamic runtime code execution must not be permitted.
2. **Schema Enhancements Required on `QuestionTypeDefinition`:**  
   - `IsSystemDefined` (bool, default false; true for the 18 canonical types).
   - `IsArchived` (bool, default false).
   - `SupportedPathways` (varchar 32, e.g. "both", "rn", "pn").
   - `AdminInstructions` / `CandidateInstructions` (text?).
   - `CreatedAt` / `UpdatedAt` (timestamptz).
3. **Dependency Protection:**  
   - Deletion of custom types must check whether any question in `Questions` references `q.QuestionTypeKey == key`. If references exist, the API must reject with `409 Conflict` and provide usage details.
   - Deactivation must be permitted to prevent authoring new questions while preserving existing questions and exam attempts.

---

## 4. Question Bank Image Upload Audit

### 4.1 Existing Architecture

1. **Binary Storage Entity (`apps/api/Models/Questions.cs`):**  
   - Table `QuestionMedia` in schema `public` created via migration `0014_AddQuestionMediaBinaryStorage`.
   - Stores raw image bytes in PostgreSQL `bytea` (`ImageData`).
   - `FileSizeBytes`, `Sha256Hash`, `ContentType`, `FileName`, `FieldKey`, `QuestionId`, `CreatedById`, `CreatedAt`, `UpdatedAt`.
   - Index on `QuestionId` (foreign key with cascade delete).
   - Index on `Sha256Hash`.

2. **Service Layer (`apps/api/Services/QuestionMediaService.cs`):**  
   - Enforces maximum file size of **5 MB (5,242,880 bytes)**.
   - Magic bytes validation for **PNG**, **JPEG**, **GIF**, and **WebP**; rejects invalid byte streams.
   - Computes SHA-256 hash.
   - Deduplicates identical images for the same question and field key.
   - Generates audit logs on upload and deletion.
   - Supports linking draft media to a question (`AssociateDraftMediaAsync`).

3. **Controller Layer (`apps/api/Controllers/QuestionMediaController.cs`):**  
   - `POST /api/v1/questions/media` (draft upload) and `POST /api/v1/questions/{questionId}/media` (direct upload) — Requires `Permission:content.create`.
   - `GET /api/v1/questions/media/{mediaId}` and `GET /api/v1/questions/{questionId}/media/{mediaId}` — Public to authenticated users, supports ETag conditional requests (`304 Not Modified`), cache-control, and `X-Content-Type-Options: nosniff`.
   - `DELETE /api/v1/questions/media/{mediaId}` — Requires `Permission:content.edit`.
   - `GET /api/v1/questions/{questionId}/media` — Requires `Permission:content.view`.

4. **Frontend Component (`apps/web/src/components/questions/question-image-upload.tsx`):**  
   - Implements drag-and-drop, file browsing, instant preview, replace, remove, and progress states.
   - Validates 5 MB limit and MIME types client-side before network submission.
   - Already integrated in `QuestionTypeEditor.tsx` for option-level exhibits (`option_${opt.optionKey}`).

### 4.2 Critical Deficiencies & Gaps in Image Workflow

1. **Missing Stem Image Upload in Question Bank Editor:**  
   `apps/web/src/app/admin/questions/page-client.tsx` provides inputs for stem, clinical scenario, and instructions, but has NO stem image uploader. Question stems requiring visual exhibits (e.g. ECG strip, CXR radiograph) cannot be uploaded from the primary editor.
2. **Missing `MediaUrl` on `QuestionDetailDto` and Question Requests:**  
   `QuestionDetailDto`, `CreateQuestionRequest`, and `UpdateQuestionRequest` do not expose or accept a top-level `MediaUrl` or `MediaIds`. When `GetQuestionByIdAsync` runs, it does not include `q.Media`, so any stem image attached to a question is never returned to the UI.
3. **Learner Delivery Gap in `ExamAttemptsController.cs`:**  
   In `ExamAttemptsController.cs`:
   - Line 747: `MediaUrl = null,` was hardcoded during non-snapshot question projection.
   - Line 1472: `mediaUrl = (string?)null,` was hardcoded when creating the examination attempt snapshot.  
   Consequently, candidates taking exams never receive stem images even if media is stored in `QuestionMedia`!
4. **Admin Exam Preview Gap in `ExamLifecycleService.cs`:**  
   `AdminExamPreviewQuestionDto` (lines 2780–2865) did not project `MediaUrl` for the stem.
5. **Clinical Exhibits Integration:**  
   Clinical exhibit tabs (`exhibitsJson`) allow text tabs, but do not provide an integrated image attachment mechanism for diagnostic exhibits.

---

## 5. Security & RBAC Audit

1. **Backend RBAC:**
   - Permissions defined in `apps/api/Security/PermissionsCatalog.cs`.
   - Automated policy registration: `Permission:{perm.Key}` for each entry.
   - Current permissions:
     - `content.view`, `content.create`, `content.edit`, `content.review`, `content.publish`, `content.delete`
     - `exams.view`, `exams.create`, `exams.edit`, `exams.delete`, `exams.publish`, `exams.review`
     - `system.settings`, `system.health`
   - Role defaults in `CatalogSeeder.cs`:
     - `superadmin`: `*`
     - `admin`: `users.*`, `roles.*`, `audit_logs.*`, `security.*`, `content.*`, `exams.*`, `subscriptions.*`, `system.health`
     - `content_manager`: `content.*`, `exams.view`, `exams.create`, `exams.edit`, `exams.review`
     - `reviewer`: `content.view`, `content.review`, `content.edit`, `exams.view`, `exams.review`
     - `instructor`: `content.view`, `content.create`, `content.edit`, `exams.view`
2. **Missing Granular Permissions for Question Type Registry:**  
   Add permissions to `PermissionsCatalog.cs`:
   - `question_types.view` ("View Question Types", "Content")
   - `question_types.manage` ("Manage Question Types", "Content")
   Assign to `superadmin`, `admin`, and `content_manager`.

---

## 6. Implementation Strategy & Action Plan

### 6.1 Phase 1 & 2: Question Type Registry Enhancements (Backend & DB)
1. Additive database migration `0016_AddQuestionTypeRegistryGovernance`:
   - Add columns to `QuestionTypeDefinitions`: `IsSystemDefined`, `IsArchived`, `SupportedPathways`, `AdminInstructions`, `CandidateInstructions`, `CreatedAt`, `UpdatedAt`.
   - Update model snapshot.
2. Update `QuestionTypeDefinition` entity in `apps/api/Models/Questions.cs`.
3. Update `QuestionTypeCatalogueSeeder.cs` to ensure canonical 18 types are marked `IsSystemDefined = true`.
4. Extend `QuestionTypeService.cs`:
   - `GetPagedQuestionTypesAsync`: Support pagination, search, category filter, active/inactive/archived filter, custom/system filter, and calculate `UsedByQuestionCount`.
   - `CreateQuestionTypeAsync`: Validate unique slug/key, prevent colliding with canonical types, set `IsSystemDefined = false`, audit log.
   - `UpdateQuestionTypeAsync`: Safe updates (prevent mutating canonical keys, prevent breaking changes if questions exist), audit log.
   - `ActivateQuestionTypeAsync` & `DeactivateQuestionTypeAsync`: Lifecycle transitions, preserve existing questions.
   - `ArchiveQuestionTypeAsync` & `RestoreQuestionTypeAsync`.
   - `DeleteQuestionTypeAsync`: Protected system-type enforcement, dependency check against `Questions` and `ExamAttemptQuestions` (409 Conflict if questions exist).
5. Add endpoints to `QuestionTypesController.cs` under `/api/v1/question-types` with authorization policies and audit logging.
6. Add DTOs in `apps/api/DTOs/QuestionTypeDtos.cs`.

### 6.2 Phase 3 & 4: Question Bank Image Upload Enhancements (Backend & Delivery)
1. Add `MediaUrl` to `QuestionDetailDto`, `CreateQuestionRequest`, and `UpdateQuestionRequest` in `apps/api/DTOs/QuestionBankDtos.cs`.
2. Update `QuestionBankService.cs`:
   - Include `q.Media` in `GetQuestionByIdAsync` and project stem `MediaUrl` (`/api/v1/questions/media/{mediaId}` where `FieldKey == "stem"`).
   - In `CreateQuestionAsync` and `UpdateQuestionAsync`, associate draft stem media (`FieldKey == "stem"`) and synchronize options media.
3. Update `ExamAttemptsController.cs`:
   - Project question stem `MediaUrl` from `Question.Media` (`FieldKey == "stem"`) in `GetAttemptById` and `StartAttempt` snapshots so candidates can view question images.
4. Update `ExamLifecycleService.cs`:
   - Project question stem `MediaUrl` in `AdminExamPreviewQuestionDto`.

### 6.3 Phase 5 & 7: Frontend Full-Page Workspaces
1. **Question Type Registry Workspace (`/admin/question-types`):**
   - Transform `apps/web/src/app/admin/question-types/page.tsx` into a full-page administrative CRUD management interface using `FullPageCrudLayout`, `FullPageHeader`, `FullPageActionBar`, `FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`.
   - Stats overview cards (Total, Active, Inactive, System-defined, Custom, In Use).
   - Full filtering (Search, Category, Status, System/Custom), sorting, pagination.
   - Modal/drawer-free full-page creation, details view, edit, activation/deactivation, archive/restore, and dependency-checked deletion.
   - Top-center shadcn/ui toast notifications (`notify.success`, `notify.error`).
2. **Question Bank Editor (`/admin/questions`):**
   - Embed `QuestionImageUpload` for the **Question Stem** directly within the question authoring/editing form (`page-client.tsx`).
   - Support preview, replace, remove, filename display, and 5 MB validation.
   - Connect stem image to live preview in `QuestionTypeRenderer`.
   - Enhance option images and clinical exhibits tab to support visual exhibits.

### 6.4 Phase 8: Verification & Automated Tests
1. Backend xUnit tests for Question Type CRUD, system-type protection, dependency conflicts (409), activation/deactivation, and image delivery in exam attempts.
2. Frontend Vitest tests for registry CRUD workflows, stem image upload in Question Bank editor, option image associations, and dependency protections.
3. TypeScript typecheck (`tsc --noEmit`) and .NET compilation (`dotnet build`).

---

## 7. Files Identified for Modification & Creation

### Files Requiring Modification:
- `apps/api/Models/Questions.cs` (Add fields to `QuestionTypeDefinition`)
- `apps/api/DTOs/QuestionTypeDtos.cs` (Add CRUD DTOs, query parameters, details DTO with dependency count)
- `apps/api/DTOs/QuestionBankDtos.cs` (Add `MediaUrl` to QuestionDetailDto, CreateQuestionRequest, UpdateQuestionRequest)
- `apps/api/Services/QuestionTypeCatalogueSeeder.cs` (Seed `IsSystemDefined = true` and timestamps)
- `apps/api/Services/QuestionTypeService.cs` (Implement full CRUD, lifecycle methods, dependency validation)
- `apps/api/Controllers/QuestionTypesController.cs` (Add CRUD and lifecycle HTTP endpoints)
- `apps/api/Services/QuestionBankService.cs` (Wire stem media association and projection)
- `apps/api/Controllers/ExamAttemptsController.cs` (Propagate stem `MediaUrl` in attempt delivery and snapshots)
- `apps/api/Services/ExamLifecycleService.cs` (Propagate stem `MediaUrl` in preview DTO)
- `apps/api/Security/PermissionsCatalog.cs` (Add `question_types.*` permissions)
- `apps/api/Services/CatalogSeeder.cs` (Grant question type permissions to default roles)
- `apps/web/src/app/admin/question-types/page.tsx` (Complete full-page CRUD workspace)
- `apps/web/src/app/admin/questions/page-client.tsx` (Add stem image upload, live preview, media state)
- `apps/web/src/lib/api-services.ts` (Add question-type CRUD API client methods)
- `apps/web/src/lib/admin/authz.ts` (Add `canManageQuestionTypes` capability)

### Files Requiring Creation:
- `apps/api/Migrations/0016_AddQuestionTypeRegistryGovernance/20261107120000_AddQuestionTypeRegistryGovernance.cs` (EF Core migration)
- `apps/web/src/app/api/admin/question-types/route.ts` (BFF proxy route for Question Types list and create)
- `apps/web/src/app/api/admin/question-types/[id]/route.ts` (BFF proxy route for GET, PUT, DELETE)
- `apps/web/src/app/api/admin/question-types/[id]/lifecycle/route.ts` (BFF proxy route for activate/deactivate/archive/restore)
- Backend and frontend test files verifying new CRUD and image upload flows.
- Documentation deliverables 1 through 8.

---

## 8. Audit Conclusion

The system is architecturally ready for additive implementation. The baseline builds cleanly, existing tests pass, and PostgreSQL binary image storage is already operational. Proceeding directly to Phase 1 (Question Type Registry Backend & Migration) and Phase 3 (Question Bank Image Upload).

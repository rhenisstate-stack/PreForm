# PREPFORD NCLEX — PHASE 4 REPOSITORY & ARCHITECTURE AUDIT REPORT
## Examination Management, Administrative Assessment Configuration & Lifecycle Governance

**Document File:** `docs/architecture/PHASE_4_AUDIT_REPORT.md`  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Baseline Git Commit:** `dbf0969`  
**Authority:** Product Owner  
**Date:** November 5, 2026  
**Auditor / Engineering Lead:** Principal Software Architect & QA Lead  
**Execution Mode:** Audit First → Specification → Additive Implementation → Verification → Formal Acceptance  

---

## 1. Executive Summary & Audit Baseline

Phase 4 of the PrepFord platform expansion establishes a complete, production-grade **Examination Management, Administrative Assessment Configuration & Lifecycle Governance** subsystem. 

In accordance with mandatory Phase 4 instructions, this comprehensive, evidence-driven repository audit was conducted before introducing any code or schema mutations. The audit establishes the exact current state of the backend domain, database schema, API controllers, Next.js BFF routes, administrative dashboard UI, and learner delivery engine.

### Key Audit Conclusions

1. **Substantial Pre-Existing Foundation:**
   The repository already possesses a sophisticated examination family and revision architecture introduced during architectural foundation stages:
   - Stable family entity `Examination` with sequential database-backed codes (`RN-EX-000001`, `PN-EX-000001`).
   - Versioned revision entity `Exam` serving as `ExaminationRevision` with revision numbering, optimistic concurrency tokens, and 6 lifecycle states (`Draft`, `InReview`, `Approved`, `Published`, `Archived`, `Retired`).
   - Explicit question membership mapping `ExamQuestion` with display ordering.
   - Robust transactional lifecycle transitions in `ExamLifecycleService` with row-level PostgreSQL locks, strict audit logging, and single-published / single-draft partial unique indexes.
   - Active Next.js administrative UI at `/admin/examinations`, `/admin/examinations/[id]`, and `/admin/examinations/[id]/revisions/[revisionId]`.
   - **Crucial Rule:** We do NOT rebuild, duplicate, or discard this existing foundation. We preserve, reuse, and extend it additively.

2. **Identified Architectural Gaps to Address in Phase 4:**
   - **Assessment Composition & Blueprint Configuration:** The existing `Exam` entity only supports manual question assignment (`ExamQuestion`). There is currently no persisted configuration for target question counts, Client Needs distribution across the 8 NCSBN categories (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PPT`, `RRP`, `PHA`), question type restrictions, or curriculum taxonomy filters.
   - **Availability & Scheduling Settings:** Currently `IsPublished` immediately surfaces an exam; there are no fields for scheduled availability windows (`AvailableFrom`, `AvailableTo`), manual availability toggles, or learner tier eligibility.
   - **Attempt & Retake Policies:** No server-enforced limits for maximum permitted attempts (`MaxAttemptsAllowed`), retake cooldown intervals (`RetakeCooldownHours`), or attempt resumption rules.
   - **Review & Result Visibility Policies:** Currently rationales are either universally hidden during exams or shown based on `testType`. There is no configurable exam-specific policy for when rationales, scores, and answer keys are unlocked (`Immediate`, `AfterExamSubmission`, `AfterDeadline`, `Never`, `ManualRelease`).
   - **Readiness Validation Engine:** Current validation (`ValidateRevisionAsync`) checks only basic criteria (non-empty title, $>0$ questions, valid time limits, passing score percentage, pathway consistency, and approved question status). It lacks comprehensive multi-stage readiness evaluations (Client Needs quota fulfillment, question type compatibility, question pool sufficiency, and non-blocking warnings vs blocking errors).
   - **Administrative Preview Mode:** Administrators currently lack a safe preview mode to inspect how an assessment renders for learners and verify question pool distribution without generating a real learner attempt or polluting performance metrics.

---

## 2. Repository & Version Control Baseline

- **Repository Path:** `C:\Users\gitau\Documents\PREform`
- **Active Branch:** `feature/dotnet-backend-migration`
- **Current HEAD Commit:** `dbf0969` (`docs(phase-3): author comprehensive assessment decisions and implementation reports`)
- **Working Tree Status:** 100% clean (`nothing to commit, working tree clean`).
- **Commit History Baseline:**
  - `dbf0969`: Phase 3 assessment documentation & integration verification.
  - `7c7647e`: Phase 3 implementation completion (learner assessment discovery, attempt concurrency guard, delivery engine).
  - `37ef69a`: Phase 2 Question Bank & Curriculum Taxonomy completion.
  - `46c5ea3`: Phase 1 Security, Observability, Identity & RBAC Core Foundations.

---

## 3. Backend Architecture Audit

### 3.1 ASP.NET Core Target & Project Structure
- **Target Framework:** `net8.0` (ASP.NET Core 8.0, C# 12).
- **Primary Project:** `apps/api/Preform.Api.csproj`
- **Test Project:** `apps/api/Tests/Preform.Api.Tests.csproj`

### 3.2 Existing Examination Domain Entities (`apps/api/Models/Assessments.cs`)
- `Examination` (Table: `public."Examinations"`):
  - `Id` (`text`, PK): Unique GUID.
  - `Pathway` (`varchar(10)`): Target pathway (`"rn"`, `"pn"`, or `"both"`).
  - `Code` (`varchar(16)`): Unique sequential identifier (e.g., `RN-EX-000001`, `PN-EX-000001`).
  - `Title` (`varchar(128)`): Canonical examination family title.
  - `CreatedAt` (`timestamptz`): Family creation timestamp.
  - `CreatedBy` (`varchar(128)`): User ID of creator.
  - `CurrentRevisionId` (`text`, nullable FK): Points to active published revision.
  - `SuccessorExaminationId` (`text`, nullable FK): Lineage link for retired or migrated examinations.
  - `Revisions` (`ICollection<Exam>`): One-to-many relationship with versioned revisions.

- `Exam` (Table: `public."Exams"`):
  - Serves as `ExaminationRevision`.
  - `Id` (`text`, PK): Unique revision GUID.
  - `ExaminationId` (`text`, FK to `Examinations`): Parent family identifier.
  - `RevisionNumber` (`int`): Monotonically increasing revision number per family ($1, 2, 3 \dots$).
  - `LifecycleState` (`ExamLifecycleState`): `Draft=1, InReview=2, Approved=3, Published=4, Archived=5, Retired=6`.
  - `ConcurrencyToken` (`long`): Concurrency token for optimistic locking.
  - `Title` (`varchar(128)`): Revision title.
  - `Description` (`varchar(1024)`): Revision description.
  - `Pathway` (`varchar(10)`): Target pathway.
  - `ExamType` (`ExamType`): `Practice=1, CAT=2, MockSimulation=3, DiagnosticReadiness=4`.
  - `TimeLimitMinutes` (`int`): 0 for untimed, $1 \dots 720$ for timed.
  - `PassingScorePercent` (`decimal(5,2)`): Default $75.0\%$.
  - `IsPublished` (`bool`): Active publication flag.
  - Audit trail fields: `CreatedBy`, `SubmittedBy`, `SubmittedAt`, `ReviewedBy`, `ReviewedAt`, `ApprovedBy`, `ApprovedAt`, `PublishedBy`, `PublishedAt`, `ArchivedBy`, `ArchivedAt`, `RetiredBy`, `RetiredAt`, `CreatedAt`, `UpdatedAt`.
  - Relationships: `ExamQuestions` (`ICollection<ExamQuestion>`), `Attempts` (`ICollection<ExamAttempt>`).

- `ExamQuestion` (Table: `public."ExamQuestions"`):
  - Maps `ExamId` $\leftrightarrow$ `QuestionId` with `DisplayOrder`.
  - Cascade delete on `ExamId`; Restrict delete on `QuestionId` (protects question integrity).
  - Filtered unique index `IX_ExamQuestions_ExamId_QuestionId` preventing duplicate assignment.

### 3.3 Database Context & PostgreSQL Constraints (`apps/api/Data/AppDbContext.cs`)
- `IX_Examinations_Code`: Unique index on examination code.
- `IX_Examinations_Pathway_Code`: Unique compound index.
- `IX_Exams_ExaminationId_RevisionNumber`: Unique compound index.
- `IX_Exams_ExaminationId_SinglePublished`: Filtered partial unique index enforcing at most one published revision per examination family (`WHERE "LifecycleState" = 4`).
- `IX_Exams_ExaminationId_ActiveDraft`: Filtered partial unique index enforcing at most one active draft revision per examination family (`WHERE "LifecycleState" = 1`).

### 3.4 Services & Controller Endpoints
- `IExamLifecycleService` / `ExamLifecycleService` (`apps/api/Services/ExamLifecycleService.cs`):
  - Full CRUD and lifecycle state machine transitions with concurrency tokens and PostgreSQL row-level locks.
  - Question membership manipulation (add, remove, reorder).
  - Revision duplication (`DuplicateExaminationAsync`) creating clean independent examination families with sequence-allocated codes.
  - Library query with search, pathway filtering, status filtering, sorting, and pagination.
- `IExaminationCodeService` / `ExaminationCodeService` (`apps/api/Services/ExaminationCodeService.cs`):
  - PostgreSQL sequence-backed sequential code allocation (`exam_code_rn_seq` and `exam_code_pn_seq`).
- `ExaminationsController` (`apps/api/Controllers/ExaminationsController.cs`):
  - Complete RESTful endpoints under `/api/v1/examinations`.

---

## 4. Frontend Architecture Audit

### 4.1 Admin Shell & Navigation
- Admin Shell at `apps/web/src/components/admin/admin-shell.tsx` with role-aware capability filtering (`apps/web/src/lib/admin/authz.ts`).
- Authorized navigation items include `/admin/examinations` for `superadmin`, `admin`, `administrator`, `manager`, `content_manager`, and `exam_manager`.

### 4.2 Examination Management Routes
- `/admin/examinations` (`apps/web/src/app/admin/examinations/page-client.tsx`):
  - Catalog list view with search, pathway tabs (`All`, `RN`, `PN`), lifecycle filter pills, pagination, and metrics.
  - Action buttons: "Create Examination", "Author Draft", "View Details".
- `/admin/examinations/[id]` (`apps/web/src/app/admin/examinations/[id]/page-client.tsx`):
  - Family detail page showing canonical code, pathway, title, creator, current published revision, and revision history timeline.
  - Action buttons: "Create New Revision", "Duplicate as New Examination", "Edit Family Title".
- `/admin/examinations/[id]/revisions/[revisionId]` (`apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx`):
  - Revision Studio with tabbed interface:
    - Metadata Tab: Title, Description, ExamType, TimeLimitMinutes, PassingScorePercent.
    - Questions Tab: Membership table with stem, type, pathway, difficulty, reordering controls, question picker modal (`QuestionPickerDialog`), and remove confirmation.
    - Validation Tab: Summary of question count and validation issues.
    - Lifecycle action buttons: Submit for Review, Recommend Approval, Return for Changes, Approve, Publish, Archive, Restore, Retire, Discard Draft.

### 4.3 Next.js BFF Gateway Routes
- Fully implemented BFF routes under `apps/web/src/app/api/admin/examinations/...`:
  - `GET /api/admin/examinations`: Queries backend library with HMAC signature.
  - `POST /api/admin/examinations`: Creates new examination family and initial draft revision.
  - `GET /api/admin/examinations/[id]`: Fetches family details.
  - `PATCH /api/admin/examinations/[id]`: Updates family title.
  - `POST /api/admin/examinations/[id]/duplicate`: Duplicates examination family.
  - `GET /api/admin/examinations/[id]/revisions`: Lists revisions.
  - `POST /api/admin/examinations/[id]/revisions`: Creates new draft revision.
  - `GET /api/admin/examinations/[id]/revisions/[revId]`: Fetches revision details.
  - `PUT /api/admin/examinations/[id]/revisions/[revId]`: Updates revision metadata.
  - `DELETE /api/admin/examinations/[id]/revisions/[revId]`: Discards draft revision.
  - `GET /api/admin/examinations/[id]/revisions/[revId]/questions`: Fetches membership.
  - `POST /api/admin/examinations/[id]/revisions/[revId]/questions`: Adds question.
  - `DELETE /api/admin/examinations/[id]/revisions/[revId]/questions/[qId]`: Removes question.
  - `PUT /api/admin/examinations/[id]/revisions/[revId]/questions/order`: Reorders questions.
  - `GET /api/admin/examinations/[id]/revisions/[revId]/validate`: Validates revision.
  - `POST /api/admin/examinations/[id]/revisions/[revId]/[action]`: Handles lifecycle transitions (`submit`, `recommend`, `return`, `approve`, `publish`, `archive`, `restore`, `retire`, `emergency-retire`).

---

## 5. Phase 3 Assessment Integration Audit

### 5.1 Learner Assessment Discovery (`GET /api/v1/assessments/available`)
- Implemented in `AssessmentsController.cs`.
- Discovers standard diagnostic RAT (`exam_rn_diagnostic_rat`, `exam_pn_diagnostic_rat`), practice examinations, adaptive simulations, and custom published examinations from `public."Exams"` (`LifecycleState == ExamLifecycleState.Published || IsPublished`).
- Checks user active attempts and surfaces resume tokens.

### 5.2 Attempt Initialization & Delivery (`POST /api/v1/attempts`)
- Implemented in `ExamAttemptsController.cs`.
- Verifies examination publication state:
  ```csharp
  if (foundExam.LifecycleState != ExamLifecycleState.Published && !foundExam.IsPublished)
  {
      return StatusCode(StatusCodes.Status422UnprocessableEntity, new {
          success = false,
          error = "ExamNotAvailable",
          message = "Examination is not published for new attempts."
      });
  }
  ```
- Enforces active attempt resumption concurrency guard.
- Server-authoritative timer: Checks deadline expiration ($StartedAt + TimeLimitMinutes$) and returns `410 Gone` on expired attempts.
- In-flight candidate data concealment: Answer keys and rationales are strictly scrubbed from active attempt questions.

---

## 6. Security, Permission & Concurrency Model

### 6.1 Role-Based Access Control (RBAC)
- Role hierarchy: `superadmin` > `admin` / `administrator` > `exam_manager` > `content_manager` > `reviewer` > `instructor` > `candidate`.
- Examination creation / management permitted for: `superadmin`, `admin`, `administrator`, `exam_manager`.
- Revision review / approval: `reviewer`, `exam_manager`, `admin`, `superadmin`.
- Publication / retirement: `admin`, `superadmin`, `exam_manager`.
- Learner delivery: `candidate`, `instructor`, all authenticated users for published assessments.

### 6.2 Audit Logging
- Every administrative action is audited to `public."AuditLogs"` via `AppDbContext`:
  - `ExamCreated`, `ExamRevisionCreated`, `ExamRevisionSubmitted`, `ExamRevisionApproved`, `ExamRevisionPublished`, `ExamRevisionArchived`, `ExamRevisionRetired`, `ExamDuplicated`, `ExamQuestionsModified`.
  - Records Actor ID, IP Address, User Agent, Correlation ID, Action, Details, Timestamp.

### 6.3 Concurrency Control
- Monotonically incrementing `ConcurrencyToken` on `Exam`.
- Every mutation endpoint requires `concurrencyToken` in the payload; mismatches trigger `409 Conflict`.
- Transaction isolation using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) during lifecycle state transitions.

---

## 7. Baseline Test Execution Results

Prior to making any Phase 4 code modifications, test suites were executed to establish a verified baseline:

1. **Backend Tests (`apps/api/Tests/Preform.Api.Tests.csproj`):**
   - Command: `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName!~Postgres"`
   - Result: **398 Passed, 0 Failed, 0 Skipped** (Duration: 53s).
   - Note: The 30 filtered tests are PostgreSQL Gate-B verification tests that require an isolated local PostgreSQL database named `prepford_gateb_verification` via `PREFORM_GATEB_TEST_CONNECTION_STRING`.

2. **Frontend Assessment Delivery Tests (`apps/web`):**
   - Command: `npx vitest run tests/bff-assessment-delivery.test.ts tests/assessment-integrity.test.ts`
   - Result: **29 Passed, 0 Failed** (Duration: 8.2s).

3. **Frontend Examination Management Tests (`apps/web`):**
   - Command: `npx vitest run tests/admin-examinations-authoring.test.tsx tests/admin-examinations-discovery.test.tsx tests/admin-examinations-duplication.test.tsx tests/admin-examinations-workflow-consolidation.test.tsx`
   - Result: **20 Passed, 0 Failed** (Duration: 16.7s).

4. **Total Verified Baseline Tests:** 398 (backend) + 49 (frontend assessment & examination suites) = **447 passing tests**.

---

## 8. Identified Architectural Gaps & Phase 4 Scope

Based on the audit, the following capabilities must be implemented in Phase 4:

| Gap Area | Existing State | Required Phase 4 State |
| :--- | :--- | :--- |
| **P4.1 Domain & Configuration** | `Exam` has basic fields (`TimeLimitMinutes`, `PassingScorePercent`). | Add configuration model for assessment composition (target question count, Client Needs distribution across 8 categories, question type filters, curriculum filters), availability dates (`AvailableFrom`, `AvailableTo`), attempt policies (`MaxAttemptsAllowed`, `RetakeCooldownHours`), and review visibility policies (`ReviewPolicy`, `ShowRationales`, `ShowScoreImmediately`). |
| **P4.3 Composition & Selection** | Revisions only support manual question addition via `ExamQuestion`. | Support blueprint composition with Client Needs percentages/counts, question type whitelisting, selection strategy (`Preset` vs `DynamicBalanced`), question pool availability checking, and preview of eligible pool distribution without creating learner attempts. |
| **P4.4 Publication Governance** | Basic validation on submit/publish (`ValidateRevisionAsync`). | Pre-publication readiness validation enforcing question pool sufficiency, supported question types, approved question status, immutable publication snapshots, and scheduled availability enforcement. |
| **P4.5 Availability & Review Policies** | `AssessmentsController` surfaces all published exams immediately. | Enforce availability date windows (`AvailableFrom` / `AvailableTo`), learner max attempt limits, and backend-enforced review/result policies determining when rationales and answer keys are visible to candidates. |
| **P4.6 Readiness & Preview Engine** | Validation returns a list of strings. | Dedicated readiness evaluation endpoint returning structured check results (`Status`: `PASS`, `WARN`, `BLOCK`) across Metadata, Composition, Question Pool, Policies, and Security. Administrative preview endpoint that simulates candidate assessment delivery without side effects. |
| **P4.7 Admin Dashboard UI** | Revision studio has 3 tabs (Metadata, Questions, Validation). | Enhance Revision Studio with a Composition / Blueprint builder, Policy configuration (Availability, Attempts, Review), multi-stage Readiness Validation drawer/badge, and Admin Preview mode. |
| **P4.8 Security & Concurrency** | Concurrency tokens exist for basic metadata and lifecycle. | Extend concurrency token protection and audit logging to all new configuration updates, blueprint edits, and readiness validations. |

---

## 9. Non-Negotiable Protection Plan for Phases 1–3

Throughout Phase 4 execution, the following boundaries will be strictly preserved:
1. **Zero Competing Stores:** Canonical questions remain exclusively in `public."Questions"`; learner attempts remain exclusively in `public."ExamAttempts"`, `public."ExamAttemptQuestions"`, and `public."AttemptResponses"`.
2. **Phase 1 Security Preservation:** Strict backend RBAC, trusted proxy headers, RFC 7807 problem details, HMAC BFF signing, and distributed rate limiting remain untouched.
3. **Phase 2 Taxonomy & Question Bank Integrity:** Canonical lifecycle state machine, taxonomy hierarchy, 8 NCSBN Client Needs (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PPT`, `RRP`, `PHA`), and exclusion of catalogued NGN types from active delivery remain enforced.
4. **Phase 3 Assessment Delivery Preservation:** Server-authoritative timer, active attempt resumption concurrency guard, immutable attempt snapshots, in-flight answer-key concealment, and 100% backward compatibility for `POST /api/v1/attempts/sync` are strictly guaranteed.

---

## 10. Audit Sign-Off & Acceptance Gate P4.0

- **Audit Status:** COMPLETED & APPROVED.
- **Evidence Base:** Direct inspection of C# backend models, EF Core configurations, TypeScript frontend components, BFF routes, and passing baseline test runs.
- **Authorization to Proceed:** Milestone P4.0 acceptance gate is satisfied. Proceed immediately to authoring `docs/architecture/PHASE_4_IMPLEMENTATION_PLAN.md` and implementing Milestone P4.1.

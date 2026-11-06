# PrepFord NCLEX — Admin Dashboard Exam Management: Security & RBAC Governance

**Date:** 2026-11-06  
**Branch:** `feature/dotnet-backend-migration`  
**Status:** Security & Authorization Specification

---

## 1. Role-Based Access Control (RBAC) Matrix

All Exam Management actions are governed by server-side ASP.NET Core authorization policies (`PermissionRequirement` / `PermissionAuthorizationHandler`) and Next.js BFF session verification (`verifyAdminAuth`), backed by the canonical permissions in `PermissionsCatalog.cs` and role mappings in `CatalogSeeder.cs` and `RoleHierarchy.cs`.

| Action / Capability | Permission Key | `superadmin` | `admin` | `exam_manager` | `content_manager` | `reviewer` | `instructor` / `candidate` |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View Exam Management Landing & Catalogues | `exams.view` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Course/Subject & Client Needs Taxonomies | `content.view` / `exams.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create / Update / Delete Course or Subject | `content.create` / `content.edit` / `exams.edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create / Update / Delete Client Need Category | `content.create` / `content.edit` / `exams.edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Standalone Test / RAT / Practice Exam | `exams.create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Draft Revision Metadata, Blueprint, Policies & Questions | `exams.edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Duplicate Examination Family | `exams.create` + `exams.edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Eligible Unused Draft Examination | `exams.delete` / `exams.edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit Draft for Review | `exams.edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Review / Recommend / Return to Draft | `exams.review` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Approve Examination Revision | `exams.publish` + Admin | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Publish / Archive / Restore / Retire Examination | `exams.publish` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 2. Multi-Layer Enforcement Architecture

### 2.1 Layer 1 — Frontend UI Gating (`apps/web/src/lib/admin/authz.ts`)
- `getAdminCapabilities(role)` computes deterministic capability flags (`canViewExaminations`, `canManageExaminations`, `canReviewExaminations`, `canApproveExaminations`, `canPublishExaminations`, `canManageCurriculum`).
- Unauthorized roles (`candidate`, `instructor`) receive an immediate **"Access Restricted"** screen and cannot view or invoke administrative controls.
- Reviewers (`reviewer`) see read-only catalogues and review workflow actions (`Recommend Approval`, `Return to Draft`), with mutation buttons (`Create`, `Edit`, `Delete`, `Duplicate`, `Publish`) hidden or disabled.

### 2.2 Layer 2 — Next.js Server-Side BFF Gate (`apps/web/src/lib/session.ts`)
- Every `/api/admin/*` route invokes `verifyAdminAuth(request)` before forwarding any request to the ASP.NET Core backend.
- Missing or expired session tokens fail closed with `401 Unauthorized`.
- Authenticated sessions holding non-admin roles (`candidate`, `instructor`) fail closed with `403 Forbidden`.

### 2.3 Layer 3 — ASP.NET Core 8 Controller & Service Authorization
- Every endpoint on `ExaminationsController`, `CurriculumController`, and `ClientNeedsController` is decorated with `[Authorize]` and policy attributes (`[Authorize(Policy = "Permission:exams.view")]`, `[Authorize(Policy = "Permission:exams.create")]`, `[Authorize(Policy = "Permission:exams.edit")]`, `[Authorize(Policy = "Permission:exams.publish")]`, `[Authorize(Policy = "Permission:content.edit")]`).
- `ExamLifecycleService` additionally performs defence-in-depth principal checks (`HasExamEditPermission`, `HasExamReviewPermission`, `HasExamApprovePermission`, `HasExamPublishPermission`) and writes a `"Denied"` entry to `AuditLogs` if an unauthorized principal attempts a privileged transition.

---

## 3. Audit Logging & Non-Repudiation (`AuditLogs`)

All administrative mutations across Exam Management record structured audit trails in the PostgreSQL `AuditLogs` table:

| Event Category | `Action` Key | `EntityType` | Logged Metadata |
|---|---|---|---|
| Course Created / Updated / Deleted | `CourseCreated` / `CourseUpdated` / `CourseDeleted` | `Course` | Actor ID, Course ID, Title, Programme, Outcome |
| Subject Created / Updated / Deleted | `SubjectDomainCreated` / `SubjectDomainUpdated` / `SubjectDomainDeleted` | `SubjectDomain` | Actor ID, SubjectDomain ID, Course ID, Title, Outcome |
| Client Need Created / Updated / Deleted | `ClientNeedCreated` / `ClientNeedUpdated` / `ClientNeedDeleted` | `ClientNeed` | Actor ID, ClientNeed ID, Code, Name, Pathway, Outcome |
| Examination Family Created / Updated / Deleted | `ExamCreated` / `ExamFamilyUpdated` / `ExamDeleted` | `Examination` | Actor ID, Examination ID, Code (`RN-EX-xxxxxx`), ExamType, Title |
| Examination Duplicated | `ExamDuplicated` | `Examination` | Actor ID, Source Family ID, New Family ID & Code |
| Revision Metadata / Composition Updated | `ExamRevisionMetadataUpdated` / `ExamCompositionUpdated` | `Exam` | Actor ID, Revision ID, ConcurrencyToken, Summary |
| Revision Question Added / Removed / Reordered | `ExamQuestionAdded` / `ExamQuestionRemoved` / `ExamQuestionsReordered` | `Exam` | Actor ID, Revision ID, Question ID(s), DisplayOrder |
| Lifecycle Transitions | `ExamSubmittedForReview`, `ExamApproved`, `ExamPublished`, `ExamArchived`, `ExamRetired` | `Exam` | Actor ID, Revision ID, Previous State → Target State, Reason/Notes |

---

## 4. Data Integrity & Attempt Snapshot Protection

1. **Optimistic Concurrency Control:**
   - Every mutation on an `Exam` revision requires the current `ConcurrencyToken`. Stale writes throw `DbUpdateConcurrencyException`, log a `"Conflict"` audit event, and return `409 Conflict`.
2. **Draft-Only Editability:**
   - Revisions in `InReview`, `Approved`, `Published`, `Archived`, or `Retired` states are immutable (`InvalidOperationException` → `409 Conflict`). Modifying a published examination requires creating a new Draft revision (`POST /api/v1/examinations/{id}/revisions`), leaving the active published revision untouched until the new revision is published.
3. **Attempt & Snapshot Isolation:**
   - Learner attempts (`ExamAttempts` and `ExamAttemptQuestions`) store self-contained JSON snapshots of question stems, options, rationales, and exam configuration at the moment of attempt start/publication. Deleting or modifying draft revisions or deactivating taxonomy nodes never alters historical learner scores, rationales, or readiness trends.

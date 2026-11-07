# System-Wide Full-Page CRUD, Maximum Workspace Utilization & Persistent Shell Audit

**Project:** PrepFord NCLEX  
**Branch:** `feature/dotnet-backend-migration`  
**Standard:** Mandatory System-Wide UI/UX Standard — Full-Page CRUD, Maximum Workspace Utilization & Persistent Admin/Learner Shell  

---

## 1. Executive Summary

This document records the comprehensive audit, compliance classification, architectural reconciliation, and system-wide implementation of the **Full-Page CRUD & Maximum Workspace Utilization Standard** across the PrepFord NCLEX application.

### Core Mandates Enforced
1. **Persistent Application Shell:** All administrative and learner CRUD workflows execute inside the persistent application shell (`AdminShell`, `LearnerDashboardShell`, `StudyStudioShell`), preserving the left sidebar and top navigation bar.
2. **Full-Page CRUD Everywhere:** Every **Create**, **Read/Details**, **Update/Edit**, and **Delete** operation uses a full-page route or full-page workspace view occupying 100% of the content area inside the shell — eliminating modal (`<Dialog>`), drawer (`<Sheet>`), popover (`<Popover>`), and native browser `confirm()` / `alert()` / `prompt()` interfaces for primary CRUD operations.
3. **Maximum Workspace Utilization:** Removed arbitrary width caps (`max-w-7xl mx-auto`, `max-w-6xl mx-auto`, `max-w-[1600px] mx-auto`, `max-w-2xl`, `max-w-xl`, `max-w-lg`, `max-w-md`) across shells and CRUD workspaces in favor of `w-full max-w-none min-w-0 flex-1`.
4. **Top-Center System Notifications:** Standardized `<Toaster position="top-center" richColors closeButton />` across `apps/web/src/app/layout.tsx` and `apps/web/src/components/ui/sonner.tsx`, wired through `@/lib/notifications` (`notify.success`, `notify.error`, `notify.warning`, `notify.info`).
5. **Reusable Full-Page CRUD Infrastructure:** Implemented `apps/web/src/components/ui/full-page-crud.tsx` providing `FullPageCrudLayout`, `FullPageHeader`, `FullPageBreadcrumbs`, `FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`, `FullPageActionBar`, `FullPageLoadingState`, `FullPageErrorState`, and `FullPageEmptyState`.

---

## 2. Application Shell & Notification Infrastructure Audit

| Component / File | Initial State | Classification | Remediation Implemented |
| :--- | :--- | :--- | :--- |
| `apps/web/src/app/layout.tsx` | `<Toaster position="bottom-right" richColors />` | **Non-compliant** | Updated `<Toaster>` to `position="top-center"` for immediate visibility across wide workspaces. |
| `apps/web/src/components/ui/sonner.tsx` | `position="bottom-right"` | **Non-compliant** | Updated default `<Sonner>` position to `position="top-center"`. |
| `apps/web/src/components/admin/admin-shell.tsx` | `<main className="flex-1 p-4 sm:p-6 lg:p-8">` | **Partially compliant** | Enforced `flex-1 w-full max-w-none min-w-0 p-4 sm:p-6 lg:p-8` so child CRUD views expand across the full shell width. |
| `apps/web/src/components/learner/learner-dashboard-shell.tsx` | `<main className="... max-w-[1600px] w-full mx-auto">` | **Partially compliant** | Removed `max-w-[1600px] mx-auto`; updated to `flex-1 w-full max-w-none min-w-0 p-4 sm:p-6 lg:p-8 space-y-8`. |
| `apps/web/src/components/learner/study-studio/study-studio-shell.tsx` | `<main className="... max-w-[1600px] w-full mx-auto">` | **Partially compliant** | Removed `max-w-[1600px] mx-auto`; updated to `flex-1 w-full max-w-none min-w-0 p-4 sm:p-6 lg:p-8 space-y-8`. |
| `apps/web/src/components/ui/full-page-crud.tsx` | Not present | **Missing** | Created reusable full-page CRUD layout primitives (`FullPageCrudLayout`, `FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`, `FullPageHeader`, `FullPageBreadcrumbs`, `FullPageActionBar`). |

---

## 3. System-Wide CRUD Module Audit Matrix

### 3.1 Admin Dashboard Modules

| Module | Primary Route(s) & Files | Initial CRUD Pattern | Width Constraints Found | Initial Classification | Remediation & Full-Page Architecture |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Course / Subject Management** | `/admin/examinations` (`course-subject-management.tsx`) | Used `<Dialog>` modals for Create/Edit Course, Create/Edit Subject, View Details, and Delete confirmation. | Modal `sm:max-w-[600px]` | **Non-compliant** | Converted all Course & Subject Create, Edit, Details/Hierarchy Inspection, and Delete/Deactivate confirmation flows to full-page views (`FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`). |
| **Client Needs Management** | `/admin/examinations` (`client-needs-management.tsx`) | Used `<Dialog>` modals for Create/Edit Category/Subcategory, View Details, and Delete confirmation. | Modal `sm:max-w-[600px]` | **Non-compliant** | Converted all Client Needs Create, Edit, Details Inspection, and Delete/Deactivate confirmation flows to full-page views (`FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`). |
| **Create Custom Test (Stand Alone)** | `/admin/examinations` (`standalone-tests-workspace.tsx`) | Used `<Dialog>` modals for the 6-stage wizard, Question Detail Preview, Examination Preview, and Delete confirmation. | Modal `max-w-5xl`, `max-w-3xl` | **Non-compliant** | Converted the 6-stage Standalone Test Wizard, Question Detail Preview, Full Exam Preview, and Delete/Archive confirmation to full-page views occupying 100% of the workspace. |
| **RATS (Readiness Assessment Tests)** | `/admin/examinations` (`rats-management-workspace.tsx`) | Used `<Dialog>` modals for Create/Edit RAT, Preview RAT, and Delete confirmation. | Modal `max-w-4xl`, `max-w-3xl` | **Non-compliant** | Converted Create/Edit RAT, Preview RAT, and Delete/Archive confirmation to full-page views (`FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`). |
| **Practice Exams** | `/admin/examinations` (`practice-exams-workspace.tsx`) | Used `<Dialog>` modals for Create/Edit Practice Exam, Duplicate, Preview, and Delete confirmation. | Modal `max-w-4xl`, `max-w-3xl` | **Non-compliant** | Converted Create/Edit Practice Exam, Duplicate Practice Exam, Preview Practice Exam, and Delete/Archive confirmation to full-page views. |
| **Examination Library Hub** | `/admin/examinations` (`apps/web/src/app/admin/examinations/page-client.tsx`) | Used `<Dialog>` for Create Examination Family (`isCreateOpen`) and Delete Draft (`deleteTarget`). | `max-w-7xl mx-auto` | **Non-compliant** | Removed `max-w-7xl mx-auto`; converted Create Examination Family and Delete Draft confirmation to full-page workspace views. |
| **Examination Family Lineage** | `/admin/examinations/[id]` (`apps/web/src/app/admin/examinations/[id]/page-client.tsx`) | Used `<Dialog>` for Edit Family Title, Create New Revision, and Duplicate Examination. | `max-w-7xl mx-auto` | **Non-compliant** | Removed `max-w-7xl mx-auto`; converted Edit Family Title, Create New Revision, and Duplicate Examination to full-page views. |
| **Examination Revision Studio** | `/admin/examinations/[id]/revisions/[revisionId]` (`page-client.tsx`, `question-picker-dialog.tsx`, `examination-preview-dialog.tsx`, `duplicate-examination-dialog.tsx`) | Used `<Dialog>` for Question Picker, Examination Preview, Duplicate Examination, Discard Draft, Lifecycle Transition, and Remove Question. | `max-w-7xl mx-auto`, `max-w-2xl` | **Non-compliant** | Removed `max-w-7xl mx-auto` and `max-w-2xl`; converted Question Picker, Examination Preview, Duplicate Examination, Discard Draft, Lifecycle Transition, and Remove Question into full-page workspace views. |
| **Question Repository** | `/admin/questions`, `/admin/questions/create`, `/admin/questions/[id]` (`apps/web/src/app/admin/questions/page-client.tsx`) | Used 4 `<Dialog>` modals (`isEditorOpen`, `isDetailOpen`, `isHistoryOpen`, `isRejectOpen`). | Modal `max-w-4xl`, `max-w-3xl`, `max-w-md` | **Non-compliant** | Converted Create Question, Edit Question, View Question Details, Revision History, Return to Draft/Reject, and Delete/Archive into full-page views and added dedicated `/admin/questions/create` and `/admin/questions/[id]` routes. |
| **Question Types Catalogue** | `/admin/question-types` (`apps/web/src/app/admin/question-types/page.tsx`) | Read-only grid constrained by `mx-auto max-w-7xl`. | `mx-auto max-w-7xl` | **Partially compliant** | Removed `mx-auto max-w-7xl` so the interactive catalogue occupies 100% of the workspace width. |
| **User Management** | `/admin/users`, `/admin/users/create`, `/admin/users/[id]` (`apps/web/src/app/admin/users/page-client.tsx`) | Used 4 `<Dialog>` modals (`detailModalOpen`, `statusModalOpen`, `roleModalOpen`, `createModalOpen`). | Modal `max-w-lg`, `max-w-md` | **Non-compliant** | Converted Create User, View User Details, Change Account Status, and Manage User Roles into full-page CRUD views and added `/admin/users/create` and `/admin/users/[id]` routes. |
| **Role & Permission Management** | `/admin/roles` (`apps/web/src/app/admin/roles/page-client.tsx`) | Used 2 `<Dialog>` modals (`permModalOpen`, `createModalOpen`) and native `confirm()` for deleting a custom role. | Modal `max-w-2xl`, `max-w-md` | **Non-compliant** | Removed native `confirm()`; converted Create Role, Manage Role Permissions, and Delete Custom Role into full-page CRUD views (`FullPageFormLayout`, `FullPageDetailsLayout`, `FullPageDeleteLayout`). |
| **Subscription Management** | `/admin/subscriptions` (`apps/web/src/app/admin/subscriptions/page-client.tsx`) | Used 2 `<Dialog>` modals (`editorOpen` stub, `archiveDialogOpen`) and bottom-right inline toast. | `mx-auto max-w-6xl` | **Non-compliant** | Removed `mx-auto max-w-6xl`; implemented complete full-page Create/Edit Subscription Plan form and full-page Archive/Activate confirmation view with top-center notifications. |
| **IP Access Rules** | `/admin/security/ip-rules` (`apps/web/src/app/admin/security/ip-rules/page-client.tsx`) | Used `<Dialog>` (`createModalOpen`) for Create and native `confirm()` for Delete. | Modal `max-w-md` | **Non-compliant** | Removed native `confirm()`; converted Create IP Rule, Inspect/Edit IP Rule, and Delete IP Rule into full-page CRUD views (`FullPageFormLayout`, `FullPageDeleteLayout`). |
| **Session Security & Device Policies** | `/admin/security/sessions` (`apps/web/src/app/admin/security/sessions/page-client.tsx`) | Used 4 `<Dialog>` modals (`confirmSavePolicyOpen`, `confirmResetPolicyOpen`, `sessionToRevoke`, `userToRevoke`). | `max-w-7xl mx-auto` | **Non-compliant** | Removed `max-w-7xl mx-auto`; converted Save Policy, Reset Policy, Revoke Session, and Revoke All User Sessions into full-page confirmation views. |
| **Audit Logs** | `/admin/audit-logs` (`apps/web/src/app/admin/audit-logs/page-client.tsx`) | Used `<Dialog>` (`inspectModalOpen`) to inspect audit log JSON payloads. | Modal `max-w-2xl` | **Non-compliant** | Converted Audit Event Inspection into a full-page details view (`FullPageDetailsLayout`) displaying metadata and side-by-side state diffs across the full workspace. |
| **Assessment & Question Reports** | `/admin/reports` (`apps/web/src/app/admin/reports/page-client.tsx`) | Used fixed modal overlay (`fixed inset-0 z-50 ... max-w-xl`) for Item Distractor Analysis. | Modal `max-w-xl` | **Non-compliant** | Converted Item Distractor Analysis into a full-page details view inside the workspace while preserving `data-testid="distractor-modal"` for test compatibility. |

### 3.2 Learner-Facing CRUD Modules

| Module | Primary Route(s) & Files | Initial CRUD Pattern | Width Constraints Found | Initial Classification | Remediation & Full-Page Architecture |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Learner Profile & Settings** | `/profile` (`apps/web/src/app/profile/page-client.tsx`) | Full-page cards constrained by `mx-auto max-w-6xl` and `max-w-xl`. | `mx-auto max-w-6xl`, `max-w-xl` | **Partially compliant** | Removed `mx-auto max-w-6xl` and `max-w-xl` so profile forms expand cleanly across the workspace. |
| **Learner Security & Active Sessions** | `/dashboard/settings/security` (`apps/web/src/app/dashboard/settings/security/page-client.tsx`) | Used 2 `<Dialog>` modals (`targetSessionToRevoke`, `confirmRevokeOthersOpen`). | Modal `max-w-md` | **Non-compliant** | Converted single-session revocation and bulk-other-sessions revocation into full-page confirmation views (`FullPageDeleteLayout`). |
| **Learner Flashcards Studio** | `/dashboard/study/flashcards` (`apps/web/src/components/learner/study-studio/study-flashcards-client.tsx`) | Used `fixed inset-0 z-50` overlay for `CreateDeckModal` and `window.confirm()` for card deletion and deck archival. | `max-w-lg` modal, `max-w-3xl` | **Non-compliant** | Removed `window.confirm()` and `fixed inset-0 z-50` modal; converted Create Deck, Delete Card confirmation, and Archive Deck confirmation into full-page workspace views inside `StudyStudioShell`. |

---

## 4. Dedicated Full-Page Examination & Question CRUD Route Tree

All primary examination-management modules and the 18-type Question Repository provide dedicated full-page App Router routes in addition to full-page in-workspace views:

- **Create Custom Test (Stand Alone)**:
  - `/admin/examinations/standalone`
  - `/admin/examinations/standalone/courses`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/delete`
  - `/admin/examinations/standalone/client-needs`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/delete`
  - `/admin/examinations/standalone/tests`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/delete`
- **RATS (Readiness Assessment Tests)**:
  - `/admin/examinations/rats`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/delete`
- **Practice Exams**:
  - `/admin/examinations/practice`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/delete`
- **Question Repository (All 18 Canonical Question Types)**:
  - `/admin/questions`, `/new`, `/[id]`, `/[id]/edit`, `/[id]/delete`
  - `/admin/question-repository`, `/new`, `/[questionId]`, `/[questionId]/edit`, `/[questionId]/delete`

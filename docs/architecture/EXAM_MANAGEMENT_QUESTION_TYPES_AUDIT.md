# PrepFord NCLEX — Examination Management & 18 Canonical Question-Types Audit

## 1. Executive Summary

This document records the authoritative audit and reconciliation of the **18 canonical NCLEX question types** across the PrepFord backend (`apps/api`), database schema, Next.js BFF API routes, administrative Question Repository (`apps/web/src/app/admin/questions` & `apps/web/src/app/admin/question-repository`), Examination Management preview & composition studio, and the learner examination engine (`apps/web/src/app/dashboard/page-client.tsx`).

---

## 2. Authoritative Canonical List of All 18 Question Types

The single source of truth for the 18 question types is `apps/api/Services/QuestionTypeRegistry.cs` (mirrored on the frontend in `apps/web/src/lib/question-types.ts`):

| # | Registry ID | Canonical Key | Display Label | Category | Option-Based | Implementation Status (`QuestionTypeRegistry`) | Scoring Strategy |
|---|---|---|---|---|---|---|---|
| 1 | `qt-1` | `single-choice` | Single Choice (MCQ) | `Traditional` | Yes (1 correct key) | `GradingSupported` | `AutomaticExactMatch` |
| 2 | `qt-2` | `multiple-choice` | Multiple Choice | `Traditional` | Yes (1+ correct keys) | `GradingSupported` | `AutomaticExactMatch` |
| 3 | `qt-3` | `sata` | Select All That Apply (SATA) | `Traditional` | Yes (1+ correct keys) | `GradingSupported` | `AutomaticExactMatch` |
| 4 | `qt-4` | `checkbox` | Multiple True/False (Checkbox) | `Traditional` | Yes (1+ correct keys) | `GradingSupported` | `AutomaticExactMatch` |
| 5 | `qt-5` | `image-based` | Image-Based Question | `Clinical` | Yes (1 correct key + `mediaUrl`) | `GradingSupported` | `AutomaticExactMatch` |
| 6 | `qt-6` | `multiple-image` | Multiple-Image Selection | `Clinical` | Yes (1+ correct keys + `mediaUrl`) | `GradingSupported` | `AutomaticExactMatch` |
| 7 | `qt-7` | `drag-drop` | Drag-and-Drop | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Structured / Rubric |
| 8 | `qt-8` | `ordering` | Ordered Response | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Structured / Sequence |
| 9 | `qt-9` | `case-study` | Unfolding Case Study | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Multi-Step NCJMM |
| 10 | `qt-10` | `essay` | Extended Response (Essay) | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Rubric / Manual Review |
| 11 | `qt-11` | `matching` | Matching | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Paired Term-Definition |
| 12 | `qt-12` | `fill-blank` | Fill-in-the-Blank (Cloze) | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Cloze / Dropdown |
| 13 | `qt-13` | `matrix` | Matrix / Grid | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Row/Column Grid |
| 14 | `qt-14` | `numeric` | Numeric Calculation | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Numeric + Tolerance |
| 15 | `qt-15` | `true-false` | True / False | `Traditional` | Yes (2 options, 1 correct key) | `GradingSupported` | `AutomaticExactMatch` |
| 16 | `qt-16` | `tabular` | Tabular / Cloze Table | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Table Classification |
| 17 | `qt-17` | `short-answer` | Short-Answer | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Keyword Rubric |
| 18 | `qt-18` | `dynamic-lab` | Dynamic Lab Value / Bow-Tie | `NGN` | No (`StructuredContentJson`) | `Catalogued` | Bow-Tie / Lab Trend |

---

## 3. Pre-Implementation Gaps Identified During Audit

1. **Missing `DELETE /api/v1/questions/{id}` Endpoint & Dependency Metadata**:
   - `QuestionsController.cs` and `QuestionBankService.cs` previously supported `GET`, `POST`, `PUT`, and `POST /{id}/status`, but had no `DELETE` endpoint and did not expose `ReferencedByExamCount`, `ReferencedByAttemptCount`, `CanDelete`, or `ReferencedExams` on `QuestionSummaryDto` / `QuestionDetailDto`.
2. **Data Loss Risk on Question Edit (`ExhibitsJson` & `StructuredContentJson`)**:
   - In `QuestionBankService.UpdateQuestionAsync`, `question.ExhibitsJson` and `question.StructuredContentJson` were unconditionally overwritten with `request.ExhibitsJson` / `request.StructuredContentJson`. Meanwhile, `AdminQuestionsClient` (`apps/web/src/app/admin/questions/page-client.tsx`) had no state for `exhibitsJson`, causing any existing `ExhibitsJson` on a question to be wiped to `null` upon saving an edit.
3. **Incomplete Type-Specific Authoring & Preview**:
   - `AdminQuestionsClient` previously rendered a plain option list for 7 types and a raw `<textarea>` for the 11 NGN structured types, without structured visual builders for `drag-drop`, `ordering`, `case-study`, `essay`, `matching`, `fill-blank`, `matrix`, `numeric`, `tabular`, `short-answer`, or `dynamic-lab`, and without option `mediaUrl` inputs for `image-based` and `multiple-image` or an EHR `ExhibitsJson` tab builder.
   - `ExaminationPreviewDialog` previously rendered only `stem` and `options`, omitting `clinicalScenario`, `exhibitsJson`, `structuredContentJson`, and `overallRationale`.
4. **Category Mismatch in `/admin/question-types`**:
   - `apps/web/src/app/admin/question-types/page.tsx` previously labelled `essay`, `matching`, `fill-blank`, `numeric`, and `short-answer` as `"Traditional"` instead of `"NGN"`, diverging from `QuestionTypeRegistry.cs`.
5. **Learner Engine Multi-Select Normalization**:
   - `apps/web/src/app/dashboard/page-client.tsx` checked `sata` and `multiple` for `multi_select`, omitting `checkbox` (`qt-4`) and `multiple-image` (`qt-6`).

---

## 4. Reconciled Architecture & Implementation

1. **Backend (`apps/api`)**:
   - `QuestionBankDtos.cs` & `QuestionBankService.cs`: Added `ReferencedByExamCount`, `ReferencedByAttemptCount`, `CanDelete`, and `ReferencedExams` (`QuestionDependencyExamDto`); preserved existing `ExhibitsJson` and `StructuredContentJson` on `UpdateQuestionAsync` when omitted; implemented `DeleteQuestionAsync` with `ExamQuestions`, `AttemptResponses`, and `ExamAttemptQuestions` dependency protection (`409 Conflict` via `QuestionsController.DeleteQuestion`), plus audit logging and `QuestionStatus.Archived` fallback.
   - `ExaminationDtos.cs` & `ExamLifecycleService.cs`: Enriched `AdminExamPreviewQuestionDto` and `AdminExamPreviewOptionDto` with `QuestionTypeKey`, `Instructions`, `ClinicalScenario`, `ExhibitsJson`, `StructuredContentJson`, `OverallRationale`, and `MediaUrl`.
2. **Frontend Canonical Question-Type Infrastructure (`apps/web`)**:
   - `apps/web/src/lib/question-types.ts`: Canonical registry (`CANONICAL_QUESTION_TYPES`), structured content templates (`getDefaultStructuredContent`), exhibits parser (`parseExhibitsJson`), and field-level validator (`validateQuestionPayload`).
   - `apps/web/src/components/questions/question-type-editor.tsx`: Dedicated type-specific configuration editors for all 18 canonical question types, option `mediaUrl` editors for `image-based` and `multiple-image`, EHR Clinical Exhibits (`exhibitsJson`) tab builder, and synchronized JSON schema inspector.
   - `apps/web/src/components/questions/question-type-renderer.tsx`: Canonical renderer supporting `admin-preview`, `candidate-interactive`, and `candidate-review` modes across all 18 question types.
   - Full-page Question CRUD routes at `/admin/questions`, `/admin/questions/new`, `/admin/questions/[id]`, `/admin/questions/[id]/edit`, `/admin/questions/[id]/delete`, and alias routes under `/admin/question-repository/*`.


---

## 5. Image Upload & Admin Profile Image Integration

### 5.1 Image Upload Integration Across Question Types
- **Dual-Layer Boundary Enforcement:** Enforces maximum image size of 5 MB (`5,242,880` bytes) on both frontend and backend with client-side prevention and server-side magic-byte inspection (supporting PNG, JPEG, WebP, GIF).
- **PostgreSQL Database Persistence:** Added `QuestionMedia` table with `bytea ImageData`, metadata, SHA-256 deduplication, foreign key to `Questions`, and cascade deletion. EF Core migration `0014_AddQuestionMediaBinaryStorage` applies schema changes.
- **Draft Media Association:** Images uploaded during authoring of new questions prior to receiving a persisted `Question.Id` are temporarily stored with `QuestionId = null` and automatically linked to the newly created question by `QuestionBankService.CreateQuestionAsync` or `UpdateQuestionAsync`.
- **Question Editor UI Component:** Created `<QuestionImageUpload>` (`apps/web/src/components/questions/question-image-upload.tsx`), featuring an accessible file input, drag-and-drop zone, instant client-side preview via `URL.createObjectURL`, progress indication, and replace/remove actions conforming to full-page CRUD standards.
- **Learner Exam Delivery:** Enhanced `apps/web/src/app/dashboard/page-client.tsx` and `QuestionTypeRenderer` to render question stem exhibits (`activeQ.mediaUrl`) and option exhibits (`opt.mediaUrl`) during live examinations and post-exam reviews.

### 5.2 Admin Profile Image Fix
- **Root Cause:** In `apps/web/src/components/admin/admin-shell.tsx`, the top navbar `AdminAccountMenu` was hardcoded to display only text initials (`{initial}`), the sidebar was missing avatar rendering, and Next.js BFF lacked an `/api/v1/profile/image` route handler.
- **Remediation:** Integrated `LearnerAvatar` into both `AdminAccountMenu` and `SidebarInner` (expanded and collapsed states), updated `apps/web/src/lib/profile-picture.ts` to normalize URLs, and added `/api/v1/profile/image` BFF proxy routing. Verified with 21 passing automated tests in `apps/web/tests/admin-shell.test.tsx`.

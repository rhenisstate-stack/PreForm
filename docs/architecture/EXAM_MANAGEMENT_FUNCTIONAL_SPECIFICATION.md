# PrepFord NCLEX — Admin Dashboard Exam Management: Functional Specification

**Date:** 2026-11-06  
**Branch:** `feature/dotnet-backend-migration`  
**Status:** Approved Functional Specification (Phase 2)

---

## 1. Executive Summary & Architectural Decisions

The PrepFord NCLEX Admin Dashboard **Exam Management** workspace (`/admin/examinations`) governs the administrative lifecycle of all clinical assessments while preserving a single, centralized **Question Repository** (`Questions` table) and shared examination infrastructure (`Examinations`, `Exams`, `ExamQuestions`, `ExamAttempts`, `ExamAttemptQuestions`, `AuditLogs`).

### 1.1 Three Foundational Architectural Decisions

1. **Decision 1 — Standalone Custom Tests & Taxonomies:**
   - **Course/Subject** (`Courses` & `SubjectDomains`) and **Client Needs** (`ClientNeeds`) are independently manageable taxonomies with their own complete CRUD interfaces, search, filtering, pagination, and dependency-aware deletion/deactivation, **and** are selectable when creating or configuring a Standalone Custom Test, RAT, or Practice Exam.
2. **Decision 2 — RATS Independence:**
   - **RATS** (`ExamType.DiagnosticReadiness = 4`) remain a dedicated assessment category separate from Practice Exams and Standalone Custom Tests, with their own management catalogue, readiness classification thresholds (`Low`, `Borderline`, `High`, `Very High`), assessment objectives, lifecycle, and reporting, while reusing questions from the centralized Question Repository and preserving the existing RAT assessment engine (`AssessmentsController`, `ExamAttemptsController`, `LearnerAnalyticsService`).
3. **Decision 3 — Practice Exams Programme Separation:**
   - **Practice Exams** (`ExamType.Practice = 1`) support independent **NCLEX-RN** (`pathway = "rn"`) and **NCLEX-PN** (`pathway = "pn"`) examination configurations, allowing distinct question distributions, question formats (Traditional vs. NGN), time allocations, attempt limits, rationale visibility policies, duplication, and lifecycle states.

---

## 2. Information Architecture & User Experience

### 2.1 Exam Management Landing Page (`/admin/examinations`)
The Exam Management landing page presents **three primary management modules** at the top of the workspace alongside the unified/filtered Examination Library:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ EXAM MANAGEMENT — 3 Primary Management Modules                                           │
├────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 01 · Create Custom Test    │ 02 · RATS                   │ 03 · Practice Exams           │
│      (Stand Alone)         │      Readiness Assessment   │      Structured NCLEX-RN &    │
│ • Course/Subject CRUD      │      Tests & Configurations │      NCLEX-PN Examinations    │
│ • Client Needs CRUD        │ • 02 · Full CRUD            │ • 03 · Full CRUD              │
│ • Standalone Test CRUD     │ • Readiness Thresholds      │ • Duplicate, Publish, Preview │
└────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

Administrators can switch between:
- **Overview / Unified Examination Library** (default view preserving all existing filters, URL query parameters, and table workflows)
- **Module 01 · Create Custom Test (Stand Alone)**:
  - Sub-area **1A: Course/Subject Management**
  - Sub-area **1B: Client Needs Management**
  - Sub-area **1C: Standalone Custom Test Management** (Catalogue + 6-stage Creation/Configuration Builder)
- **Module 02 · RATS (Readiness Assessment Tests)**:
  - RAT Catalogue + Creation/Configuration Builder (with Readiness Classification Thresholds, Assessment Objectives, Blueprint Quotas, Question Selection, and Governance)
- **Module 03 · Practice Exams**:
  - Practice Exam Catalogue (with RN/PN programme tabs, Traditional/NGN format filters, Blueprint Quotas, Duplication, Preview, and Lifecycle Governance)

---

## 3. Module 01: Create Custom Test (Stand Alone)

### 3.1 Area A — Course/Subject Management
- **Entity Mapping:** `Course` (`Courses`) and `SubjectDomain` (`SubjectDomains`) linked to `Programme` (`RN`, `PN`).
- **Capabilities:**
  - **Create:** Name/Title, Unique Code (auto-generated if omitted or administrator-supplied), Description, Programme (`RN`, `PN`, or `Both`), Display Order, Active Status.
  - **Read (List & Detail):** Search by name/code/description, filter by programme (`all`, `rn`, `pn`, `both`) and status (`all`, `active`, `inactive`), sort, paginate, and inspect associated Subject Domains and attached Question Count.
  - **Update:** Modify name, code, description, programme, display order, and active status.
  - **Delete / Deactivate:** Dependency-aware deletion. If a Course has child Subject Domains, attached Questions, or is referenced in an Exam blueprint, hard deletion is blocked with `409 Conflict` and a clear explanation, offering safe deactivation (`IsActive = false`).

### 3.2 Area B — Client Needs Management
- **Entity Mapping:** `ClientNeed` (`ClientNeeds`).
- **Capabilities:**
  - **Create:** Category Name, Unique Code (e.g., `MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PHA`, `RRP`, `PPT`, or custom codes), Description, Programme Applicability (`rn`, `pn`, `both`), Display Order, Active Status.
  - **Read (List & Detail):** Search by name/code/description, filter by pathway (`all`, `rn`, `pn`, `both`) and status (`all`, `active`, `inactive`), sort, paginate, and view attached Question Count and Exam Blueprint usage count.
  - **Update:** Modify name, code (validated for uniqueness), description, pathway, display order, and active status.
  - **Delete / Deactivate:** Dependency-aware deletion (`409 Conflict` when questions or exam blueprints reference the Client Need; supports safe deactivation via `IsActive = false`).

### 3.3 Area C — Standalone Custom Test Management
- **Entity Mapping:** `Examination` family + `Exam` revision with `ExamType = ExamType.Standalone (5)`.
- **6-Stage Creation & Configuration Workflow:**
  1. **Stage 1 — Basic Test Information:** Test Title, Code (auto-allocated `RN-EX-xxxxxx` / `PN-EX-xxxxxx`), Description/Instructions, Programme (`RN` / `PN`), Status (`Draft`).
  2. **Stage 2 — Course/Subject Selection:** Select one or more Courses / Subject Domains, view available published/approved question counts per course/subject.
  3. **Stage 3 — Client Needs Selection:** Select one or more Client Needs categories and optional target quotas/percentages.
  4. **Stage 4 — Question Selection from Question Repository:** Search and filter repository questions by Course/Subject, Client Needs, Programme, Difficulty (`Easy`, `Moderate`, `Hard`), and Question Type (`single-choice`, `multiple-response`, `sata`, etc.); preview question stem, options, correct answer, and rationale; add/remove/reorder selected questions without duplicating Question records.
  5. **Stage 5 — Exam Settings:** Time Limit (minutes), Passing Score (%), Selection Strategy (`Preset` / `DynamicBalanced`), Max Attempts, Retake Cooldown, Interrupted Resume, Rationale & Score Visibility (`ReviewPolicy`, `ShowRationales`, `ShowScoreImmediately`), Availability Window (`IsAvailable`, `AvailableFrom`, `AvailableTo`).
  6. **Stage 6 — Review, Save & Publish:** Validate configuration, save as Draft, or transition through review/approval/publication.
- **Delete / Archive Protection:** Unused Draft standalone tests with 0 attempts can be deleted (`DELETE /api/v1/examinations/{id}`); tests with learner attempts or publication history return `409 Conflict` and must be Archived or Retired.

---

## 4. Module 02: RATS (Readiness Assessment Tests)

- **Entity Mapping:** `Examination` family + `Exam` revision with `ExamType = ExamType.DiagnosticReadiness (4)`.
- **RAT-Specific Configuration (`CompositionRulesJson` & `Exam` properties):**
  - **Assessment Name, Code & Description**
  - **Programme Applicability:** `NCLEX-RN` (`rn`) or `NCLEX-PN` (`pn`)
  - **Assessment Objectives:** Clinical readiness evaluation goals stored in composition metadata
  - **Readiness Classification Thresholds:** Configurable, non-overlapping percentage bands for:
    - `Low` (e.g., `0% – 54%`)
    - `Borderline` (e.g., `55% – 64%`)
    - `High` (e.g., `65% – 79%`)
    - `Very High` (e.g., `80% – 100%`)
    - Validated on both frontend and backend so ranges are contiguous, non-overlapping, and within `0–100%`.
  - **Subject & Client Needs Coverage:** Course/Subject mappings + Client Needs quotas + Difficulty distribution (`Easy`, `Moderate`, `Hard`).
  - **Question Selection:** Fixed (`Preset`) or dynamic balanced (`DynamicBalanced`) selection from the Question Repository.
  - **Duration, Scoring & Attempt Restrictions:** Time limit, passing/readiness benchmark score, max attempts allowed, retake cooldown hours, rationale disclosure policy.
- **Preservation of Existing RAT Engine:**
  - `AssessmentsController`, `ExamAttemptsController`, `AssessmentSelectionService`, and `LearnerAnalyticsService` continue to serve and grade `ExamType.DiagnosticReadiness` assessments without breaking historical attempts or learner analytics.

---

## 5. Module 03: Practice Exams

- **Entity Mapping:** `Examination` family + `Exam` revision with `ExamType = ExamType.Practice (1)`.
- **Capabilities:**
  - **Create Practice Examination:** Separate `NCLEX-RN` and `NCLEX-PN` configurations, Traditional / NGN question format selection, Course/Subject & Client Needs distribution, difficulty distribution, timed/untimed duration, attempt limits, passing score, rationale review policy.
  - **View & Filter Catalogue:** Filter by Programme (`All`, `NCLEX-RN`, `NCLEX-PN`), Lifecycle Status, and text search.
  - **Update Configuration:** Edit Draft revisions or create a new Draft revision from a Published/Archived examination.
  - **Duplicate Examination:** One-click duplication into a new `Examination` family (`POST /api/v1/examinations/{id}/duplicate`) with a fresh sequential code and copied question memberships.
  - **Preview Examination:** Candidate simulation preview with educator answer key and rationale verification (`ExaminationPreviewDialog`).
  - **Publish / Unpublish (Archive) / Delete:** Full lifecycle state transitions and dependency-aware deletion.

---

## 6. Admin Sidebar Integration & Dedicated Navigation Hierarchy

The Admin Dashboard sidebar (`apps/web/src/lib/admin/navigation.tsx` & `apps/web/src/components/admin/admin-shell.tsx`) exposes the **Examination Management** group with direct navigation to all three primary modules and their sub-modules:

- **Examination Management**
  - **Create Custom Test (Stand Alone)** (`/admin/examinations/standalone`) — collapsible parent section
    - **Course/Subject Management** (`/admin/examinations/standalone/courses`)
    - **Client Needs Management** (`/admin/examinations/standalone/client-needs`)
    - **Standalone Test Management** (`/admin/examinations/standalone/tests`)
  - **RATS (Readiness Assessment Tests)** (`/admin/examinations/rats`)
  - **Practice Exams** (`/admin/examinations/practice`)
  - **Examination Library** (`/admin/examinations`)
  - **Question Bank** (`/admin/questions` & `/admin/question-repository`)
  - **Question-Type Registry** (`/admin/question-types`)

---

## 7. All 18 Canonical Question Types — Complete Administrative CRUD

Administrators can author, view, edit, preview, and delete/archive questions across all **18 canonical NCLEX question types** (`single-choice`, `multiple-choice`, `sata`, `checkbox`, `image-based`, `multiple-image`, `drag-drop`, `ordering`, `case-study`, `essay`, `matching`, `fill-blank`, `matrix`, `numeric`, `true-false`, `tabular`, `short-answer`, `dynamic-lab`) using full-page CRUD workflows (`/admin/questions/*` and `/admin/question-repository/*`), type-specific structured editors (`QuestionTypeEditor`), and live learner/admin preview (`QuestionTypeRenderer`).

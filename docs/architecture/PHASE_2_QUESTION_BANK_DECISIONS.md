# PREPFORD ARCHITECTURE DECISION RECORD
## Phase 2: Curriculum Taxonomy, Question Bank & Question Authoring Foundation

**Status:** APPROVED  
**Date:** November 5, 2026  
**Context:** PrepFord NCLEX Preparation Platform  
**Target Backend:** ASP.NET Core 8 / Entity Framework Core 8 / PostgreSQL  
**Target Frontend:** Next.js 16 App Router / React 19 / TypeScript  

---

### 1. Canonical Question Storage Architecture

- **Decision:** The existing `Preform.Api.Models.Question` entity mapped to `public."Questions"` and `QuestionOption` mapped to `public."QuestionOptions"` are the single, authoritative canonical storage representations for all question content.
- **Rationale:** The repository audit confirms that `Exams`, `ExamQuestions`, `ExamAttemptQuestions`, `AttemptResponses`, and `ExamLifecycleService` already reference `Question`. Introducing a second question model or separate tables for AI questions, RAT questions, or NGN questions would introduce architectural fracture, split reporting, and break exam membership validation.
- **Consolidation Plan:** All question creation, revision, and import will target `Question` directly.

---

### 2. Curriculum Taxonomy & Client Needs Hierarchy

- **Decision:** 
  1. **Preserve Existing Curriculum Hierarchy:** Retain the normalized 6-level taxonomy: `Programme` (RN / PN) → `Course` → `SubjectDomain` → `Category` → `Subcategory` → `Topic`.
  2. **Normalize Client Needs:** Replace the static string array (`NCLEX_CLIENT_NEEDS` in `apps/web/src/lib/assessment-store.ts`) with a normalized relational entity `ClientNeed` (`public."ClientNeeds"`).
  3. **Direct Question Association:** Add `ClientNeedId` foreign key to `Question`, alongside the existing `TopicId`.
- **Validation Rules:**
  - Self-parenting and circular references in taxonomy are strictly rejected.
  - Deletion of taxonomy nodes or Client Needs records referenced by questions is prohibited; deactivation (`IsActive = false`) is used instead to maintain historical integrity.

---

### 3. NCLEX Client Needs Canonical Seed Specification

The authoritative NCSBN Client Needs categories seeded into `ClientNeeds`:
1. `Safe and Effective Care Environment: Management of Care` (Code: `MOC`, Pathway: `both`)
2. `Safe and Effective Care Environment: Safety and Infection Control` (Code: `SIC`, Pathway: `both`)
3. `Health Promotion and Maintenance` (Code: `HPM`, Pathway: `both`)
4. `Psychosocial Integrity` (Code: `PSI`, Pathway: `both`)
5. `Physiological Integrity: Basic Care and Comfort` (Code: `BCC`, Pathway: `both`)
6. `Physiological Integrity: Pharmacological and Parenteral Therapies` (Code: `PPT`, Pathway: `both`)
7. `Physiological Integrity: Reduction of Risk Potential` (Code: `RRP`, Pathway: `both`)
8. `Physiological Integrity: Physiological Adaptation` (Code: `PHA`, Pathway: `both`)

---

### 4. Question Type Strategy & NGN Boundary

- **Decision:** Align strictly with `QuestionTypeRegistry`:
  - **Traditional / Clinical Supported (7 Types):** `single-choice`, `multiple-choice`, `sata`, `checkbox`, `image-based`, `multiple-image`, `true-false`. These have full authoring, delivery, and automated grading support via `IQuestionGraderResolver` and `ResponseValidationService`.
  - **NGN & Extended Formats (11 Types):** `drag-drop`, `ordering`, `case-study`, `matrix`, `tabular`, `dynamic-lab`, `essay`, `matching`, `fill-blank`, `numeric`, `short-answer`.
- **NGN Authoring Foundation:** NGN structured content (case study tabs, exhibits, drop zones, matrix rows/columns) is stored in `StructuredContentJson` and validated against typed schema contracts.
- **Safety Gate:** NGN types with status `Catalogued` or `AuthoringSupported` cannot be published into learner exams that lack grading support; the API and UI enforce this boundary.

---

### 5. Question Versioning & Lifecycle Governance

- **Lifecycle States:** `Draft` (0) → `InReview` (1) → `Approved` (2) → `Published` (3) → `Archived` (4).
- **Allowed Transitions:**
  - `Draft` → `InReview` (submitted by author)
  - `InReview` → `Approved` (approved by reviewer)
  - `InReview` → `Draft` / Rejected (returned with feedback)
  - `Approved` → `Published` (published by authorized publisher)
  - `Published` → `Archived` (retired from future exam selection)
- **Separation of Duties:** Authors cannot approve their own submissions unless explicitly authorized by Super Admin policy.
- **Immutability Invariant:** Once `Published`, question content is frozen. Any subsequent edit generates a new draft version, incrementing `Question.Version` and creating an immutable `QuestionVersion` snapshot.

---

### 6. Historical Assessment Integrity & Compatibility

- **Attempt Snapshot Isolation:** `ExamAttemptQuestions` stores the frozen question ID membership at attempt initialization. `ExamAttempt.MetadataSnapshot` preserves exam configuration.
- **Learner Protection:** Modifying a question in the bank never alters:
  - Previously delivered questions in completed or in-progress attempts.
  - Recorded learner responses in `AttemptResponses`.
  - Calculated historical scores or pass/fail decisions.
  - Historical clinical rationales shown on review.

---

### 7. RBAC & Security Integration

- **Permissions Utilized:**
  - `content.view` — Browse, search, filter question bank and curriculum.
  - `content.create` — Create draft questions and curriculum items.
  - `content.edit` — Update drafts and revise content.
  - `content.review` — Review submissions, request changes, or approve.
  - `content.publish` — Publish approved questions into active status.
  - `content.delete` — Archive questions or deactivate taxonomy records.
- **Audit Logging:** Every state transition (`QuestionCreated`, `QuestionUpdated`, `QuestionSubmitted`, `QuestionApproved`, `QuestionPublished`, `QuestionArchived`, `TaxonomyModified`) generates an immutable audit record with correlation ID and actor identity.

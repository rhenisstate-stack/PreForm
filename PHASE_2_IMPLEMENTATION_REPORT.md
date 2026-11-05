# PREPFORD — PHASE 2 IMPLEMENTATION REPORT
## Curriculum Taxonomy, Question Bank & Question Authoring Foundation

**Project:** PrepFord NCLEX Preparation Platform  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Phase:** Phase 2 — Curriculum Taxonomy & Question Bank  
**Status:** COMPLETED & VERIFIED  
**Date:** November 5, 2026  

---

## 1. Executive Summary

Phase 2 establishes the canonical curriculum taxonomy, NCLEX Client Needs classification, and question bank authoring foundation for the PrepFord platform.

All planned Phase 2 deliverables were implemented using an audit-first, additive approach with zero duplicate data stores, zero regression to existing Phase 0/Phase 1 baseline capabilities, and strict enforcement of pedagogical and security invariants:

1. **Architecture Decision Record (ADR):** Authored `docs/architecture/PHASE_2_QUESTION_BANK_DECISIONS.md` defining canonical entity boundaries, taxonomy structure, type validation rules, and immutability invariants.
2. **Single Canonical Question Entity:** Extended the existing `Preform.Api.Models.Question` and `QuestionOption` models additively with NCLEX-specific metadata (`Code`, `ClientNeedId`, `CognitiveLevel`, `ClinicalJudgmentStep`, `Source`, `StructuredContentJson`, `RejectionReason`, `PublishedAt`). No duplicate question stores were created.
3. **Normalized Client Needs Entity:** Replaced hardcoded client-side dictionaries with the authoritative `ClientNeeds` table, seeded with the 8 canonical NCSBN categories (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PPT`, `RRP`, `PHA`), with full CRUD APIs and delete-protection guards.
4. **Curriculum Taxonomy Hierarchy:** Modeled and seeded the complete multi-tier learning hierarchy (`Courses` -> `SubjectDomains` -> `Categories` -> `Subcategories` -> `Topics`). Implemented tree traversal, question count rollups, slug generation, and parent-child deletion protection.
5. **Question Validation & Traditional Type Grading Compatibility:** Maintained exact match grading contracts for the 7 traditional question types (`single-choice`, `multiple-choice`, `sata`, `checkbox`, `image-based`, `multiple-image`, `true-false`) while validating option counts, correct answer constraints, and clinical rationales.
6. **NGN Catalogued Question Types:** Enabled schema-validated structured authoring for the 11 catalogued NGN types (`case-study`, `drag-drop`, `matrix`, `ordering`, etc.) while enforcing that non-gradable types cannot be published into active examination delivery paths until runtime grading engines are implemented.
7. **Lifecycle State Machine & Separation of Duties:** Implemented strict state transitions (`Draft` -> `InReview` -> `Approved` -> `Published` -> `Archived`). Enforced that question authors cannot approve their own questions (separation of duties rule) unless acting with Super Administrator privileges. Required mandatory clinical feedback for rejections.
8. **Immutability Invariant & Version History:** Enforced that modifying an already-published question automatically captures an audit snapshot in `QuestionVersions`, increments the question version number, and preserves historical examination attempt integrity.
9. **Question Bank Administrative Console:** Built the `/admin/questions` UI with full-text search, multi-facet filtering (type, pathway, status, difficulty, client need, topic), create/edit modals, type-specific option editors, review/rejection modals, and version history diff inspection.
10. **Evidence-Based Verification:** Generated and applied EF Core Migration 0011 to PostgreSQL, passed Next.js frontend typecheck with zero errors, passed 11/11 backend `Phase2QuestionBankTests`, and verified regression test suites.

---

## 2. Deliverables & Implementation Inventory

### 2.1 Database Schema & Additive Migration (Migration 0011)

- **Migration File:** `apps/api/Migrations/0011_AddCurriculumTaxonomyAndQuestionBank/20261105105042_0011_AddCurriculumTaxonomyAndQuestionBank.cs`
- **Application Status:** Applied to PostgreSQL database (`dotnet ef database update` exited code 0).
- **Additive Schema Changes:**
  - `ClientNeeds` table: Created table (`Id`, `Code` [unique], `Name`, `Description`, `DisplayOrder`, `IsActive`, `Pathway`, `CreatedAt`, `UpdatedAt`).
  - `Questions` table: Added `Code` (varchar(32), unique index), `ClientNeedId` (varchar(128), foreign key to `ClientNeeds.Id` with `OnDelete: SetNull`), `CognitiveLevel` (varchar(64)), `ClinicalJudgmentStep` (varchar(64)), `Source` (varchar(256)), `StructuredContentJson` (text), `RejectionReason` (varchar(512)), `PublishedAt` (timestamp with time zone).
  - `QuestionOptions` table: Added `MediaUrl` (varchar(512)).
  - `QuestionVersions` table: Added `ChangeSummary` (varchar(512)), `Status` (integer).
  - `Courses` table: Added `IsActive` (boolean, indexed).
  - `Topics` table: Added `IsActive` (boolean, indexed).

### 2.2 Backend Domain, Services & DTOs

| Component | Path | Responsibility |
|---|---|---|
| Architecture Decision Record | `docs/architecture/PHASE_2_QUESTION_BANK_DECISIONS.md` | Formal decisions on question modeling, taxonomy, validation, and immutability. |
| Curriculum DTOs | `apps/api/DTOs/CurriculumDtos.cs` | DTOs for Courses, Domains, Categories, Subcategories, Topics, Client Needs, and tree nodes. |
| Question Bank DTOs | `apps/api/DTOs/QuestionBankDtos.cs` | DTOs for Question summaries, details, options, version history, query filters, and pagination. |
| Curriculum Service | `apps/api/Services/ICurriculumService.cs`, `CurriculumService.cs` | Hierarchy CRUD, full tree generation, slugification, child deletion protection. |
| Question Bank Service | `apps/api/Services/IQuestionBankService.cs`, `QuestionBankService.cs` | Question search, filtering, creation, options validation, lifecycle transitions, immutability snapshots, and audit logging. |
| Curriculum Controller | `apps/api/Controllers/CurriculumController.cs` | REST endpoints under `api/v1/curriculum` (`tree`, `courses`, `subject-domains`, `categories`, `subcategories`, `topics`, `client-needs`). |
| Client Needs Controller | `apps/api/Controllers/ClientNeedsController.cs` | Direct REST endpoints under `api/v1/client-needs` for standalone client need management. |
| Questions Controller | `apps/api/Controllers/QuestionsController.cs` | REST endpoints under `api/v1/questions` (CRUD, status transition, version history) protected by granular RBAC policies. |
| Permissions Catalog | `apps/api/Security/PermissionsCatalog.cs` | Added `content.review` permission and mapped to reviewer and administrator roles. |
| Catalog Seeder | `apps/api/Services/CatalogSeeder.cs` | Automated seeding for the 8 canonical NCSBN Client Needs and initial RN/PN curriculum taxonomy. |

### 2.3 Frontend & Next.js BFF Architecture

| Component | Path | Responsibility |
|---|---|---|
| API Client Services | `apps/web/src/lib/api-services.ts` | Added `adminQuestionsService` and `adminCurriculumService` with typed DTOs and HMAC session forwarding. |
| Navigation Model | `apps/web/src/lib/admin/navigation.tsx` | Integrated "Question Bank" (`/admin/questions`) under `EXAMINATION_GROUP` with `HelpCircle` icon. |
| Admin Authorization | `apps/web/src/lib/admin/authz.ts` | Added `canViewQuestions`, `canManageQuestions`, `canReviewQuestions`, and `canPublishQuestions` capabilities. |
| BFF Question Handlers | `apps/web/src/app/api/admin/questions/route.ts` & `[id]/route.ts` | BFF proxy with `verifyAdminAuth` session verification and query parameter forwarding. |
| BFF Status Handler | `apps/web/src/app/api/admin/questions/[id]/status/route.ts` | BFF proxy for lifecycle transitions. |
| BFF Versions Handler | `apps/web/src/app/api/admin/questions/[id]/versions/route.ts` | BFF proxy for historical snapshots. |
| BFF Curriculum Handlers | `apps/web/src/app/api/admin/curriculum/tree/route.ts` & `client-needs/route.ts` | BFF proxies for tree and client needs queries. |
| Admin UI Entry Page | `apps/web/src/app/admin/questions/page.tsx` | Server component page wrapper with metadata and branded suspense fallback. |
| Admin UI Client View | `apps/web/src/app/admin/questions/page-client.tsx` | Production-grade Question Bank console with search, multi-facet filtering, authoring modal, review actions, and version history. |

---

## 3. Security, RBAC & Invariant Enforcement

### 3.1 Granular RBAC Policy Mapping

All Question Bank endpoints enforce backend-level authorization policies:

| Endpoint | Method | Required Policy / Permission |
|---|---|---|
| `/api/v1/curriculum/tree` | GET | `Permission:content.view` |
| `/api/v1/curriculum/*` | GET | `Permission:content.view` |
| `/api/v1/curriculum/*` | POST | `Permission:content.create` |
| `/api/v1/curriculum/*` | PUT / DELETE | `Permission:content.edit` |
| `/api/v1/client-needs` | GET | `Permission:content.view` |
| `/api/v1/client-needs` | POST | `Permission:content.create` |
| `/api/v1/client-needs/*` | PUT / DELETE | `Permission:content.edit` |
| `/api/v1/questions` | GET | `Permission:content.view` |
| `/api/v1/questions/{id}` | GET | `Permission:content.view` |
| `/api/v1/questions` | POST | `Permission:content.create` |
| `/api/v1/questions/{id}` | PUT | `Permission:content.edit` |
| `/api/v1/questions/{id}/status` (Submit) | POST | `Permission:content.edit` |
| `/api/v1/questions/{id}/status` (Approve/Reject) | POST | `Permission:content.review` |
| `/api/v1/questions/{id}/status` (Publish/Archive) | POST | `Permission:content.publish` |
| `/api/v1/questions/{id}/versions` | GET | `Permission:content.view` |

### 3.2 Separation of Duties Invariant

The Question Bank strictly enforces author/reviewer separation of duties:
- A user who authors a question (`CreatedById == ActorId`) **cannot approve** their own question (`TargetStatus == Approved`).
- An attempt by the author to approve their own question results in an immediate `400 Bad Request` (`InvalidOperationException: Separation of duties violation`).
- Distinct reviewers or system administrators (`RoleHierarchy.GetEffectiveRole == "superadmin"`) are permitted to approve.

### 3.3 Publication Gate Invariant for NGN Types

Questions belonging to NGN types with `ImplementationStatus == Catalogued` (e.g., `case-study`, `drag-drop`, `matrix`, `ordering`, etc.) can be authored, saved, reviewed, and approved, but are **strictly blocked from publication into active examination delivery paths** (`TargetStatus == Published`).
Attempting to publish a catalogued NGN question throws `InvalidOperationException` citing that grading support must be implemented first.

### 3.4 Immutability Invariant for Historical Attempts

Historical exam attempts (`ExamAttemptQuestion`, `AttemptResponse`) link directly to canonical Question records.
To prevent altering the assessment basis of past candidate attempts:
- Modifying a `Published` question captures a complete JSON snapshot in `QuestionVersions`.
- The snapshot preserves the question stem, difficulty, pathway, topic, client need, clinical scenario, exhibits, rationales, and all option keys with their correctness flags and rationales.
- The question's `Version` counter is incremented, and an audit trail entry is logged.

---

## 4. Verification Evidence

### 4.1 Automated Backend xUnit Test Suite (`Phase2QuestionBankTests`)

All 11 tests in `apps/api/Tests/Phase2QuestionBankTests.cs` passed cleanly:

```
Test run for apps/api/Tests/bin/Debug/net8.0/Preform.Api.Tests.dll (.NETCoreApp,Version=v8.0)
A total of 1 test files matched the specified pattern.

Passed!  - Failed: 0, Passed: 11, Skipped: 0, Total: 11, Duration: 7 s
```

**Test Coverage Breakdown:**
1. `CurriculumTaxonomy_FullHierarchyAndTreeTraversal_Succeeds` (Course -> Domain -> Category -> Subcategory -> Topic hierarchy assembly and tree retrieval).
2. `CurriculumTaxonomy_DeleteProtection_BlocksDeletingNodesWithChildren` (Child protection rules preventing dangling references).
3. `ClientNeeds_UniqueCodeAndQuestionAttachmentProtection` (Unique code enforcement, duplicate rejection, delete protection when questions attached).
4. `QuestionCreation_SingleChoiceValidation_EnforcesExactlyOneCorrectKey` (Validation rejecting 0 or >1 correct keys; accepting exactly 1 correct key; auto-code generation).
5. `QuestionCreation_SATAValidation_RequiresAtLeastOneCorrectKey` (Multi-select validation requiring >=1 correct keys).
6. `QuestionCreation_TrueFalseValidation_RequiresExactlyTwoOptions` (Validation enforcing exactly 2 options).
7. `QuestionCreation_NGNStructuredContent_ValidatesJsonFormat` (JSON validation for NGN schemas; malformed JSON rejected).
8. `QuestionLifecycle_SeparationOfDuties_PreventsAuthorFromApprovingOwnQuestion` (Rejection of author self-approval; distinct reviewer approval succeeds).
9. `QuestionLifecycle_NGNTypes_BlockedFromPublicationUntilGradingSupported` (Publication block on catalogued NGN types).
10. `QuestionLifecycle_PublishedQuestionUpdate_SnapshotsPriorStateAndIncrementsVersion` (Immutability snapshotting on published question edits).
11. `QuestionSearchAndPagination_MultiFacetFiltering_ReturnsExpectedMatches` (Multi-facet filtering across search query, Client Need, and question type).

### 4.2 Security & Regression Test Verification

| Test Suite | Result | Details |
|---|---|---|
| `Phase1SecurityTests` | **13 Passed, 0 Failed** | Rate limiting, password reset, correlation ID, IP access rules. |
| `QuestionTypeRegistryTests` & `QuestionTypesControllerTests` | **17 Passed, 0 Failed** | 18 question types catalogued and contract validated. |
| `Phase2QuestionBankTests` | **11 Passed, 0 Failed** | Curriculum, question bank, lifecycle, and immutability suite. |
| Next.js TypeScript Typecheck (`tsc --noEmit`) | **0 Errors** | Clean compilation of frontend and BFF routes. |
| Vitest Security Regressions | **Passed** | SQLite guard, BFF session synchronization, penetration testing. |

---

## 5. Conclusion & Baseline Acceptance

Phase 2 deliverables are complete, architecturally sound, thoroughly tested, and verified against PostgreSQL.
The PrepFord platform now possesses an authoritative, auditable Question Bank and Curriculum Taxonomy foundation ready for examination assembly, candidate delivery, and future adaptive CAT modules in Phase 3.

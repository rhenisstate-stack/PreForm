# PrepFord NCLEX — Admin Dashboard Exam Management: API Reference

**Date:** 2026-11-06  
**Branch:** `feature/dotnet-backend-migration`  
**Status:** API Contract Reference (ASP.NET Core 8 Web API & Next.js BFF)

---

## 1. Taxonomy Endpoints — Course/Subject & Client Needs

### 1.1 Courses (`/api/v1/curriculum/courses` & BFF `/api/admin/curriculum/courses`)

| Method | Backend Route | BFF Route | Required Permission | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/curriculum/courses` | `/api/admin/curriculum/courses` | `content.view` / `exams.view` | List courses with optional `programmeId`, `pathway`, `activeOnly`, `search` filters. Includes `questionCount` and `subjectDomainCount`. |
| `GET` | `/api/v1/curriculum/courses/{id}` | `/api/admin/curriculum/courses/{id}` | `content.view` / `exams.view` | Inspect course details, programme metadata, and counts. |
| `POST` | `/api/v1/curriculum/courses` | `/api/admin/curriculum/courses` | `content.create` / `exams.create` | Create a new Course (`programmeId` or `pathway`, `title`, `code`, `description`, `displayOrder`, `isPublished`, `isActive`). |
| `PUT` | `/api/v1/curriculum/courses/{id}` | `/api/admin/curriculum/courses/{id}` | `content.edit` / `exams.edit` | Update an existing Course (`title`, `code`, `description`, `programmeId`, `displayOrder`, `isPublished`, `isActive`). |
| `DELETE` | `/api/v1/curriculum/courses/{id}` | `/api/admin/curriculum/courses/{id}` | `content.edit` / `exams.edit` | Dependency-aware delete: returns `200 OK` if unused, or `409 Conflict` if Subject Domains, Questions, or Exam blueprints reference the Course. |

### 1.2 Subject Domains (`/api/v1/curriculum/subject-domains` & BFF `/api/admin/curriculum/subject-domains`)

| Method | Backend Route | BFF Route | Required Permission | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/curriculum/subject-domains` | `/api/admin/curriculum/subject-domains` | `content.view` / `exams.view` | List subject domains with optional `courseId`, `activeOnly`, `search` filters. Includes `questionCount` and `categoryCount`. |
| `GET` | `/api/v1/curriculum/subject-domains/{id}` | `/api/admin/curriculum/subject-domains/{id}` | `content.view` / `exams.view` | Inspect subject domain details. |
| `POST` | `/api/v1/curriculum/subject-domains` | `/api/admin/curriculum/subject-domains` | `content.create` / `exams.create` | Create a Subject Domain (`courseId`, `title`, `code`, `description`, `displayOrder`, `isActive`). |
| `PUT` | `/api/v1/curriculum/subject-domains/{id}` | `/api/admin/curriculum/subject-domains/{id}` | `content.edit` / `exams.edit` | Update a Subject Domain (`title`, `code`, `description`, `courseId`, `displayOrder`, `isActive`). |
| `DELETE` | `/api/v1/curriculum/subject-domains/{id}` | `/api/admin/curriculum/subject-domains/{id}` | `content.edit` / `exams.edit` | Dependency-aware delete: returns `409 Conflict` if Categories, Questions, or Exam blueprints reference the Subject Domain. |

### 1.3 Client Needs (`/api/v1/client-needs` & BFF `/api/admin/client-needs`)

| Method | Backend Route | BFF Route | Required Permission | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/client-needs` | `/api/admin/client-needs` | `content.view` / `exams.view` | List Client Needs categories (`pathway`, `activeOnly`, `search`). Includes `questionCount`. |
| `GET` | `/api/v1/client-needs/{id}` | `/api/admin/client-needs/{id}` | `content.view` / `exams.view` | Inspect a single Client Need category by ID. |
| `POST` | `/api/v1/client-needs` | `/api/admin/client-needs` | `content.create` / `exams.create` | Create a Client Need category (`code`, `name`, `description`, `pathway`, `displayOrder`, `isActive`). Returns `400 Bad Request` on duplicate `code`. |
| `PUT` | `/api/v1/client-needs/{id}` | `/api/admin/client-needs/{id}` | `content.edit` / `exams.edit` | Update a Client Need category (`code`, `name`, `description`, `pathway`, `displayOrder`, `isActive`). |
| `DELETE` | `/api/v1/client-needs/{id}` | `/api/admin/client-needs/{id}` | `content.edit` / `exams.edit` | Dependency-aware delete: returns `409 Conflict` if Questions or Exam blueprints reference the category. |

---

## 2. Shared Examination Endpoints — Standalone Custom Tests, RATS & Practice Exams

All three examination modules (`Standalone = 5`, `DiagnosticReadiness = 4`, `Practice = 1`) use the unified `/api/v1/examinations` and `/api/admin/examinations` endpoints:

| Method | Backend Route | BFF Route | Required Permission | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/examinations` | `/api/admin/examinations` | `exams.view` | Query examination families with `search`, `pathway`, `revisionStatus`, `examType`, `sortBy`, `sortDirection`, `page`, `pageSize`. |
| `POST` | `/api/v1/examinations` | `/api/admin/examinations` | `exams.create` | Create an `Examination` family and its initial `Draft` revision (`pathway`, `title`, `initialRevisionTitle`, `description`, `examType`, `timeLimitMinutes`, `passingScorePercent`, `targetQuestionCount`, `selectionStrategy`, `compositionRulesJson`, `questionIds`, `isAvailable`, `maxAttemptsAllowed`, `reviewPolicy`, `showRationales`, `showScoreImmediately`). |
| `GET` | `/api/v1/examinations/{id}` | `/api/admin/examinations/{id}` | `exams.view` | Retrieve examination family metadata and all revisions. |
| `PATCH` | `/api/v1/examinations/{id}` | `/api/admin/examinations/{id}` | `exams.edit` | Update canonical examination family title. |
| `DELETE` | `/api/v1/examinations/{id}` | `/api/admin/examinations/{id}` | `exams.edit` | Safely delete an eligible unused Draft examination family. Returns `409 Conflict` if attempts or published revisions exist. |
| `POST` | `/api/v1/examinations/{id}/duplicate` | `/api/admin/examinations/{id}/duplicate` | `exams.create` + `exams.edit` | Duplicate an examination into a new independent family with a new sequential code and cloned question memberships. |
| `POST` | `/api/v1/examinations/{id}/revisions` | `/api/admin/examinations/{id}/revisions` | `exams.create` + `exams.edit` | Create a new Draft revision within an existing family. |
| `GET` | `/api/v1/examinations/eligible-questions` | `/api/admin/examinations/eligible-questions` | `exams.view` | Search/filter Question Repository (`pathway`, `search`, `clientNeedId`, `courseId`, `subjectDomainId`, `questionType`, `difficulty`). |
| `GET` / `PUT` | `/api/v1/examinations/revisions/{revisionId}` | `/api/admin/examinations/revisions/{revisionId}` | `exams.view` / `exams.edit` | Get or update Draft revision metadata, timing, scoring, and policies. |
| `DELETE` | `/api/v1/examinations/revisions/{revisionId}` | `/api/admin/examinations/revisions/{revisionId}` | `exams.edit` | Discard an unpublished Draft revision (`?concurrencyToken=N`). |
| `GET` / `POST` | `/api/v1/examinations/revisions/{revisionId}/questions` | `/api/admin/examinations/revisions/{revisionId}/questions` | `exams.view` / `exams.edit` | List or attach Question Repository items to a Draft revision. |
| `DELETE` | `/api/v1/examinations/revisions/{revisionId}/questions/{questionId}` | `/api/admin/examinations/revisions/{revisionId}/questions/{questionId}` | `exams.edit` | Detach a question from a Draft revision. |
| `PUT` | `/api/v1/examinations/revisions/{revisionId}/questions/order` | `/api/admin/examinations/revisions/{revisionId}/questions/order` | `exams.edit` | Reorder question sequence within a Draft revision. |
| `GET` / `PUT` | `/api/v1/examinations/revisions/{revisionId}/composition` | `/api/admin/examinations/revisions/{revisionId}/composition` | `exams.view` / `exams.edit` | Get or update blueprint composition (`clientNeedQuotas`, `allowedQuestionTypes`, `courseIds`, `subjectDomainIds`, `difficultyDistribution`, `readinessThresholds`, `assessmentObjectives`, `randomizeQuestions`). |
| `GET` | `/api/v1/examinations/revisions/{revisionId}/pool-preview` | `/api/admin/examinations/revisions/{revisionId}/pool-preview` | `exams.view` | Verify Question Repository pool sufficiency per Client Need quota. |
| `GET` | `/api/v1/examinations/revisions/{revisionId}/readiness` | `/api/admin/examinations/revisions/{revisionId}/readiness` | `exams.view` | Evaluate multi-stage publication readiness checks (`READY`, `NEEDS_ATTENTION`, `BLOCKED`). |
| `GET` | `/api/v1/examinations/revisions/{revisionId}/preview` | `/api/admin/examinations/revisions/{revisionId}/preview` | `exams.view` | Simulate candidate view with educator answer key and clinical rationales. |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/{action}` | `/api/admin/examinations/revisions/{revisionId}/{action}` | Role-dependent | Execute lifecycle transitions: `submit`, `recommend`, `return`, `approve`, `publish`, `archive`, `restore`, `retire`, `emergency-retire`. |

---

## 3. Question Repository & 18 Question-Type CRUD Endpoints

| Method | Backend Route | BFF Route | Required Permission | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/questions` | `/api/admin/questions` | `content.view` | Paginated query across all 18 canonical question types (`search`, `pathway`, `type`, `status`, `difficulty`, `clientNeedId`, `topicId`). Returns `referencedByExamCount`, `referencedByAttemptCount`, and `canDelete`. |
| `GET` | `/api/v1/questions/{id}` | `/api/admin/questions/{id}` | `content.view` | Full question detail including `exhibitsJson`, `structuredContentJson`, `options` (with `mediaUrl`), and `referencedExams`. |
| `POST` | `/api/v1/questions` | `/api/admin/questions` | `content.create` | Create a canonical question for any of the 18 supported question types. |
| `PUT` | `/api/v1/questions/{id}` | `/api/admin/questions/{id}` | `content.edit` | Update an existing question while preserving omitted `exhibitsJson` and `structuredContentJson` and recording version snapshots on published edits. |
| `DELETE` | `/api/v1/questions/{id}` | `/api/admin/questions/{id}` | `content.edit` | Dependency-protected delete: returns `200 OK` if unreferenced, or `409 Conflict` when referenced by `ExamQuestions`, `AttemptResponses`, or `ExamAttemptQuestions`. |
| `POST` | `/api/v1/questions/{id}/status` | `/api/admin/questions/{id}/status` | Role-dependent | Transition question lifecycle (`Draft`, `InReview`, `Approved`, `Published`, `Archived`). Supports `Archived` as a deactivation fallback when deletion is blocked. |
| `GET` | `/api/v1/questions/{id}/versions` | `/api/admin/questions/{id}/versions` | `content.view` | Retrieve immutable version history snapshots for a question. |

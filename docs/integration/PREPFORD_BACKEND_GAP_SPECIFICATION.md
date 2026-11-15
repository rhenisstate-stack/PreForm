# PrepFord Backend-Owner Gap Specification

**Consumer Application:** PrepFord (`WEBSITE_1` / `https://www.prepford.com/`)  
**Target Remote Host:** `http://108.61.9.189:8008` (`SKEW_LINE_ACTIVE_BACKEND=dotnet`)  
**Author:** PrepFord Frontend Integration Audit  
**Date:** 2026-11-15  

> **IMPORTANT:** Every route, query parameter, header, and DTO listed in this document is **PROPOSED** for implementation by the remote `.NET` backend owner. None of these routes currently exist on `http://108.61.9.189:8008`.

---

## 1. Cross-Cutting Infrastructure & Security Gaps

### GAP-INFRA-01: HTTPS / TLS Termination
- **Business Requirement:** Protect authentication credentials, bearer tokens, session cookies, and learner/admin data in transit.
- **Existing Endpoint:** `http://108.61.9.189:8008` (plain HTTP only; HTTPS on port `8008` fails TLS handshake with `wrong version number`).
- **Missing Functionality:** TLS certificate / HTTPS reverse proxy (e.g., Nginx/Caddy/ALB) with a valid production API hostname.
- **Required Action:** Expose an HTTPS endpoint (e.g., `https://api.prepford.com` or `https://api.skewline...`) and update `SKEW_LINE_DOTNET_BASE_URL` before any production credential transmission.

### GAP-INFRA-02: OpenAPI / Swagger Specification Endpoint
- **Business Requirement:** Allow PrepFord to verify live API contracts, DTOs, query parameters, and authentication requirements without guessing.
- **Existing Endpoint:** None (`/swagger/v1/swagger.json`, `/openapi/v1.json`, `/scalar/v1` all redirect `302 -> /web/restoration/lost`).
- **PROPOSED Endpoint:** `GET /swagger/v1/swagger.json` (or `GET /openapi/v1.json`) returning OpenAPI 3.x JSON (restricted to non-production or authenticated internal access if required).

### GAP-INFRA-03: Application Scoping Contract (`WEBSITE_1` vs. Shared Multi-Tenant Data)
- **Business Requirement:** Isolate PrepFord (`WEBSITE_1`) content and learners from Nurvian (`WEBSITE_2`) while allowing shared academic reference data where permitted.
- **Existing Endpoint:** None verified.
- **Missing Functionality:** Documented application-identification contract (e.g., `X-App-Key: WEBSITE_1` or JWT `app_key` claim + server-side `AppKey` validation).
- **Authorization Requirements:** Never trust a client-supplied application key alone; bind authenticated tokens/sessions to `AppKey = WEBSITE_1` on the server.

---

## 2. Missing Core & Academic Discovery Capabilities

### GAP-AUTH-01: JSON Authentication & Session Endpoints (`PROPOSED`)
1. **Business Requirement:** Authenticate PrepFord learners and admins from the Next.js BFF without scraping MVC HTML forms.
2. **Existing Endpoint:** `/web/auth/absolute/login` (HTML MVC page only).
3. **Missing Functionality:** JSON REST login, session validation, register, logout, and token refresh endpoints.
4. **PROPOSED HTTP Method:** `POST` / `GET`
5. **PROPOSED Endpoint Path:** `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/session`, `POST /api/v1/auth/logout`
6. **Required Query Parameters:** None.
7. **Request DTO (Login):** `{ email: string, password: string, rememberMe?: boolean, clientId?: string }`
8. **Response DTO:** `{ success: boolean, token?: string, sessionId?: string, errorCode?: string, user?: { id, email, displayName, role, pathway, activePlan, appKey } }`
9. **Pagination Behavior:** N/A.
10. **Authentication Requirements:** Public for login/register; Bearer JWT +/or HMAC Gateway headers for session/logout.
11. **Application-Scoping Requirements:** Must validate user entitlement/membership for `WEBSITE_1`.
12. **Authorization Requirements:** Enforce account status, lockout, and concurrent-session policy.
13. **Database Relationship Requirements:** `Users` -> `UserSessions` -> `UserRoles` -> `ApplicationSites (WEBSITE_1)`.
14. **Indexing Considerations:** Unique index on `(AppKey, NormalizedEmail)`, index on `UserSessions(TokenHash)`.
15. **Backward Compatibility Requirements:** Must not break existing MVC cookie login on `/web/auth/absolute/login`.
16. **Required Integration Tests:** Valid login, invalid credentials (`401`), wrong-app isolation (`403`), session check (`200`/`401`).

---

### GAP-ACAD-01: Unified Academic Metadata Discovery (`PROPOSED`)
1. **Business Requirement:** Populate Institution, School, Academic Year, Class/Grade, Subject, Examination Season, Examination Type, Examination Year, Section, and Topic selectors in PrepFord.
2. **Existing Endpoint:** MVC pages exist under `/dashboards/admin/panel/nexus/strata/learning/*`, but no JSON API exists (`302 -> /web/restoration/lost`).
3. **Missing Functionality:** Read-only JSON endpoints returning active academic hierarchy and filterable metadata scoped to `WEBSITE_1`.
4. **PROPOSED HTTP Method:** `GET`
5. **PROPOSED Endpoint Paths:**
   - `GET /api/v1/academic/institutions`
   - `GET /api/v1/academic/schools`
   - `GET /api/v1/academic/academic-years`
   - `GET /api/v1/academic/classes`
   - `GET /api/v1/academic/subjects`
   - `GET /api/v1/academic/exam-seasons`
   - `GET /api/v1/academic/exam-types`
   - `GET /api/v1/academic/topics`
   - (Or unified `GET /api/v1/admin/curriculum/tree` extended with these nodes)
6. **Required Query Parameters:** `institutionId?`, `schoolId?`, `academicYearId?`, `classId?`, `subjectId?`, `examSeasonId?`, `pathway?`, `activeOnly?`, `search?`, `page?`, `pageSize?`.
7. **Request DTO:** Query parameters only.
8. **Response DTO:** `{ success: boolean, items: Array<{ id: string, name: string, code?: string, parentId?: string, pathway?: string, isActive: boolean }>, totalCount: number, page: number, pageSize: number }`
9. **Pagination Behavior:** Default `page=1`, `pageSize=50`, max `pageSize=200`.
10. **Authentication Requirements:** Authenticated user (`Bearer` or HMAC gateway) for learner/admin discovery; public catalog only if explicitly marked public.
11. **Application-Scoping Requirements:** Return shared reference data + `WEBSITE_1`-scoped items; exclude Nurvian-only (`WEBSITE_2`) items.
12. **Authorization Requirements:** Any authenticated `WEBSITE_1` user for read; admin roles for write.
13. **Database Relationship Requirements:** `Institution -> School -> AcademicYear -> Class/Grade -> Subject -> Topic`, plus `ExamSeason` and `ExamType`.
14. **Indexing Considerations:** Composite indexes on `(AppKey, IsActive, Name)` and foreign keys (`InstitutionId`, `SchoolId`, `SubjectId`).
15. **Backward Compatibility Requirements:** Preserve existing `courses`, `subjectDomains`, `clientNeeds` fields if extending `/api/v1/admin/curriculum/tree`.
16. **Required Integration Tests:** Cascading filter tests (`schoolId` filters `subjects`/`examinations`), `WEBSITE_1` isolation test, pagination bounds test.

---

### GAP-EXAM-01: Examination Discovery & Multi-Criteria Filtering (`PROPOSED`)
1. **Business Requirement:** Support server-side examination discovery across Learner Dashboard, Create Test, Practice Exams, Custom Exams, and Admin Exam Management.
2. **Existing Endpoint:** None on remote host (`/api/v1/examinations` and `/api/v1/assessments/available` return `302 -> /web/restoration/lost`).
3. **Missing Functionality:** Server-side filtered, paginated, sorted examination listing with academic metadata attributes.
4. **PROPOSED HTTP Method:** `GET`
5. **PROPOSED Endpoint Paths:**
   - `GET /api/v1/assessments/available` (Learner-scoped published examinations)
   - `GET /api/v1/examinations` (Admin/authoring examination library)
   - `GET /api/v1/examinations/{examinationId}/sections` (Examination sections & topics)
6. **Required Query Parameters:**
   - `institutionId?: string`
   - `schoolId?: string`
   - `academicYearId?: string`
   - `classId?: string`
   - `subjectId?: string`
   - `examSeasonId?: string`
   - `examType?: string | number`
   - `examYear?: number`
   - `pathway?: "rn" | "pn"`
   - `sectionId?: string`
   - `topicId?: string`
   - `search?: string`
   - `sortBy?: "title" | "examYear" | "updatedAt" | "questionCount"`
   - `sortDirection?: "asc" | "desc"`
   - `page?: number`
   - `pageSize?: number`
7. **Request DTO:** Query parameters only.
8. **Response DTO:** `{ success: boolean, items: ExaminationSummaryDto[], totalCount: number, page: number, pageSize: number }`
9. **Pagination Behavior:** Server-side `Skip/Take`, returning `totalCount` and `items`.
10. **Authentication Requirements:** Required (`401` if unauthenticated).
11. **Application-Scoping Requirements:** Strictly scoped to `WEBSITE_1` (plus explicitly shared catalog items).
12. **Authorization Requirements:** Learners only see `Published` + `IsAvailable=true` + entitled pathway examinations; admins see drafts/archived.
13. **Database Relationship Requirements:** `Examination` linked to `School`, `Institution`, `AcademicYear`, `Subject`, `ExamSeason`, `ExamType`, `ExamYear`, `ExamSection`, `Topic`.
14. **Indexing Considerations:** B-tree indexes on `(AppKey, Status, Pathway, ExamYear)`, `(SchoolId)`, `(SubjectId)`, and GIN/trigram index on `Title`.
15. **Backward Compatibility Requirements:** Maintain existing `BackendExaminationLibraryResponseDto` fields (`totalCount`, `examinations`/`items`).
16. **Required Integration Tests:** Single filter, combined filters (`schoolId + subjectId + examYear`), search, sorting, pagination, and learner draft-exclusion (`403`/filtered out).

---

### GAP-QUES-01: Question Discovery & Filtering (`PROPOSED`)
1. **Business Requirement:** Filter questions for Custom Test creation, Question Bank browsing, and Admin Exam Revision authoring while preserving all 18 PrepFord question types and NGN structures.
2. **Existing Endpoint:** None on remote host (`/api/v1/admin/questions` and `/api/v1/examinations/eligible-questions` return `302 -> /web/restoration/lost`).
3. **Missing Functionality:** Filtered question query endpoint supporting examination, section, subject, topic, difficulty, question type, and exam year.
4. **PROPOSED HTTP Method:** `GET`
5. **PROPOSED Endpoint Paths:**
   - `GET /api/v1/questions/discover` (Learner practice/custom test pool — **never** exposes unpublished items, answer keys, or restricted rationales)
   - `GET /api/v1/admin/questions` (Admin question bank)
   - `GET /api/v1/examinations/eligible-questions` (Revision authoring picker)
6. **Required Query Parameters:** `examinationId?`, `sectionId?`, `subjectId?`, `topicId?`, `difficulty?`, `questionType?`, `examYear?`, `pathway?`, `search?`, `page?`, `pageSize?`.
7. **Request DTO:** Query parameters only.
8. **Response DTO:** `{ success: boolean, items: QuestionSummaryDto[], totalCount: number, page: number, pageSize: number }` preserving PrepFord's 18 `QuestionType` discriminators, `options`, `media`, `ngnData`, and scoring config.
9. **Pagination Behavior:** Server-side `page` (default `1`), `pageSize` (default `20`, max `100`), `totalCount`.
10. **Authentication Requirements:** Required (`401` if unauthenticated).
11. **Application-Scoping Requirements:** Strictly scoped to `WEBSITE_1`.
12. **Authorization Requirements:** Learner endpoint MUST strip `correctAnswer` / `rationale` during active exam mode and enforce subscription entitlements.
13. **Database Relationship Requirements:** `Question -> Topic -> ExamSection -> Examination`, `Question -> Subject`, `Question -> ClientNeed`.
14. **Indexing Considerations:** Indexes on `(AppKey, Status, Pathway, QuestionType, Difficulty)`, `(SubjectId, TopicId)`, `(ExaminationId, SectionId)`.
15. **Backward Compatibility Requirements:** Must preserve all 18 question type JSONB schemas used by PrepFord's interactive runner.
16. **Required Integration Tests:** Filter by each parameter, combined filter, entitlement/answer-key redaction for learners, and 18-type DTO serialization.

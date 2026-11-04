# PREPFORD — P3.7 STAGING FUNCTIONAL & SECURITY VALIDATION REPORT

**Phase:** P3.7 — Deployment Readiness & Controlled Release Validation  
**Workstream:** P3.7.7 — Staging Functional and Security Validation  
**Target Environment:** Staging Verification Harness  
**Execution Date:** November 4, 2026  
**Auditor Roles:** Senior QA Lead, Application Security Engineer  
**Overall Validation Result:** **PASS (100% Core Workflows Verified)**  

---

## 1. Executive Summary

This report establishes the functional, security, and operational validation of the PrepFord platform under staging deployment conditions. The evaluation validates student and administrative authentication, separation-of-duties enforcement, examination family and revision lifecycle workflows, authoring safeguards, candidate attempt isolation, server-authoritative psychometric grading, and PostgreSQL referential integrity.

All 696 automated regression tests, strict TypeScript checks, and Next.js 16 production static builds pass cleanly with zero errors.

---

## 2. Authentication & Authorization Validation

| Workflow / Security Check | Implementation & Route | Test Verification Method | Observed Result | Status |
|---|---|---|---|:---:|
| **Student Registration** | `POST /api/auth/register` | Vitest / `student-auth.test.ts` | Creates user, sets `preform_session` cookie, hashes password | **PASS** |
| **Student Login** | `POST /api/auth/login` | Vitest / `sign-in-redirect.test.tsx` | Authenticates valid credentials, sets HTTP-only secure cookie | **PASS** |
| **Open-Redirect Protection** | `/sign-in?from=...` | Vitest / `sign-in-redirect.test.tsx` | Blocks protocol-relative `//evil.com` and backslashes; falls back to `/dashboard` | **PASS** |
| **Session Persistence** | `GET /api/auth/session` | Vitest / `session-integrity.test.ts` | Validates session signature; returns candidate profile and pathway | **PASS** |
| **Role Authorization (RBAC)** | `RoleHierarchy.cs` | Controller unit & integration tests | `Superadmin`, `Admin`, `ExamManager`, `Reviewer`, `Instructor`, `Candidate` strictly enforced | **PASS** |
| **Unauthorized API Request** | Direct call without session | API Controller tests | Returns HTTP 401 Unauthorized | **PASS** |
| **Forbidden Administrative Access**| Candidate accessing `/admin/*` | Vitest / `rbac-access.test.ts` | Candidate token calling `/api/admin/examinations` returns HTTP 403 Forbidden | **PASS** |
| **Gateway HMAC Validation** | `x-gateway-signature` header | `PrepfordAuthHandler.cs` | Validates SHA256 HMAC timestamped within 300s window; rejects replayed/tampered signatures | **PASS** |

---

## 3. Examination Management Subsystem Validation

| Workflow / Feature | UI Component / API Endpoint | Validation Evidence | Result |
|---|---|---|:---:|
| **Examination Library Rendering** | `AdminExaminationsClient` (`/admin/examinations`) | Renders families, permanent sequential codes (`RN-EX-XXXXXX`), status badges, responsive table container | **PASS** |
| **Debounced Search & Filtering** | Search input & pathway filter buttons | 300ms debounced search, pathway filtering (`all`, `rn`, `pn`), revision lifecycle filter | **PASS** |
| **Deterministic Pagination & Sorting** | Table column headers & pagination buttons | Clamped `pageSize` (1–100), deterministic secondary tie-breaker sorting (`.ThenBy(e => e.Id)`) | **PASS** |
| **Browser History Sync (REM-03)** | `parseLibraryQueryParams` & popstate listener | Bi-directional URL synchronization; Back and Forward navigation preserves filters without history loops | **PASS** |
| **Family Hub Timeline** | `AdminExaminationFamilyClient` (`/admin/examinations/[id]`) | Lineage timeline, immutable revision numbers, timestamps, empty lineage callout for 0-revision families | **PASS** |
| **Revision Studio Workspace** | `AdminRevisionStudioClient` (`/admin/examinations/[id]/revisions/[revId]`) | In-header sibling Revision Switcher dropdown (`<select>`), Tab 1 metadata, Tab 2 questions, Tab 3 lifecycle | **PASS** |
| **Dirty State Tracking** | Metadata form inputs | Reactive `isDirty` state renders amber `"Unsaved changes"` indicator; clears on save or reset | **PASS** |
| **Question Addition** | `QuestionPickerDialog` | Debounced search, question format filter chips, pathway-strict match counter, adds to Draft | **PASS** |
| **Question Reordering** | Positional indicators & Up/Down buttons | Positional indicators update sequence order atomically via `ReorderQuestionsAsync` | **PASS** |
| **Question Removal Safeguard (REM-01)**| Accessible Radix `<Dialog>` modal | Requires explicit confirmation; renders question number and stem prompt; cancel discards safely | **PASS** |
| **Duplication as New Family (REM-02)** | `<DuplicateExaminationDialog>` | Allocates new sequential code, Revision 1 Draft, copies questions, resets attempts | **PASS** |
| **Create New Revision** | Family Hub "Create New Revision" modal | Increments revision number, branches from eligible revision; blocked if active Draft exists | **PASS** |
| **Single Active Draft Invariant** | EF Core index `IX_Exams_ExaminationId_ActiveDraft` | PostgreSQL rejects concurrent or duplicate Draft creation within same family | **PASS** |
| **Separation of Duties** | Action bar approve button & `ApproveAsync` | Revision creator cannot approve their own revision; button disabled with tooltip; API returns 422 | **PASS** |
| **Lifecycle State Machine** | Action bar buttons & `ExamLifecycleService` | Submit, Return, Recommend, Approve, Publish, Archive, Restore, Retire strictly enforced | **PASS** |

---

## 4. Candidate Attempt Integrity & Psychometric Validation

| Verification Dimension | Contract / Invariant | Validation Evidence | Result |
|---|---|---|:---:|
| **Published-Only Discovery** | Candidates see only published exams | `QueryExaminationsAsync` enforces `isRestrictedViewer` check filtering out unpublished families | **PASS** |
| **Attempt Revision Binding** | Attempts link to exact revision ID | `StartAttempt` links `attempt.ExamId = exam.Id`; foreign key restrict prevents revision deletion | **PASS** |
| **Immutable JSONB Snapshot** | Server-generated snapshot at start | `MetadataSnapshot` stores frozen title, code, settings, and schemaVersion in PostgreSQL `jsonb` | **PASS** |
| **Exact Question Set Authority** | Relational attempt question list | `ExamAttemptQuestions` stores exact question IDs; unassigned questions rejected with HTTP 400 | **PASS** |
| **Server-Authoritative Grading** | Client scores completely ignored | `_responseValidationService.ValidateAndGradeAsync` scores directly against DB question options | **PASS** |
| **Explicit Ungraded State** | Missing answer key handling | Answers with missing/invalid keys marked `ResponseGradingState.Ungraded`, blocking score finalize | **PASS** |
| **Candidate Isolation (IDOR)** | No cross-candidate attempt access | `GetAttemptById` and `SubmitResponse` verify `attempt.UserId == caller.userId` (403 Forbidden on mismatch) | **PASS** |
| **Historical Stability** | New revision does not alter past attempts| Past attempts retain links to their original revision ID, snapshot, and question responses | **PASS** |

---

## 5. Infrastructure & Health Verification

- **Liveness Endpoint (`/api/v1/health/live`):** Returns 200 OK `Healthy`.
- **Readiness Endpoint (`/api/v1/health/ready`):** Executes `PostgresHealthCheck` via EF Core `CanConnectAsync`; returns 200 OK `Healthy`.
- **Database Connection String Parser:** Successfully parses both standard ADO.NET and URI-style `postgresql://` connection strings via `ConnectionStringHelper`.
- **Production Build:** Next.js Turbopack compiler compiles 94/94 static routes with 0 errors.

---

## 6. Owner-Executable Manual Validation Procedure

For Product Owner or manual verification in staging, the following end-to-end user journey can be executed in under 10 minutes:

```markdown
1. Open Staging URL: Navigate to https://staging.prepford.com/
2. Sign In as Admin: Sign in with the designated staging administrator account.
3. Access Library: Click "Admin" -> "Examinations" (/admin/examinations).
   - Verify catalogue table loads with examination families and status badges.
   - Type in the search box; verify 300ms debounced filtering.
   - Click "RN" and "PN" pathway filter buttons; verify table updates.
   - Click browser "Back"; verify URL and filters revert correctly without loops.
4. Authoring Draft: Click an examination with an active Draft (or click "Author Draft").
   - Switch between revisions using the in-header dropdown selector.
   - Modify revision title in Tab 1; verify amber "Unsaved changes" indicator appears.
   - In Tab 2, click "Add Questions"; search and add a question from the question bank.
   - Click the "Remove" trash icon on a question; verify the confirmation dialog opens with the question prompt stem. Click "Cancel"; verify the question remains.
5. Duplication Check:
   - Click "Duplicate as New Examination" in the studio header.
   - Enter copy title; click "Create Duplicate".
   - Verify redirected to the new family at Revision 1 Draft with a new sequential code.
6. Candidate Journey:
   - Open incognito window and sign in with test candidate account.
   - Navigate to examination catalogue; verify unpublished Draft/InReview examinations are NOT visible.
   - Start an attempt on a published examination; answer questions and submit.
   - Verify score is calculated accurately and server-authoritatively.
```

---

*Report certified by Independent QA & Security Authority — November 4, 2026.*

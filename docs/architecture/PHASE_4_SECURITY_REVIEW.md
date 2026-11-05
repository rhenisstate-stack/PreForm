# PREPFORD NCLEX — PHASE 4 SECURITY & APPLICATION INTEGRITY REVIEW
## Examination Management, Administrative Authorization & Data Protection

**Document File:** `docs/architecture/PHASE_4_SECURITY_REVIEW.md`  
**Authority:** PrepFord Application Security Architect & Product Owner  
**Date:** November 5, 2026  
**Status:** APPROVED & AUDITED  

---

## 1. Security Architecture & Threat Model

Phase 4 examination management operates in a high-stakes clinical certification environment. Security architecture must enforce strict boundaries to prevent unauthorized examination configuration, answer key leakage, assessment tampering, and privilege escalation.

### 1.1 Non-Negotiable Security Invariants
1. **Candidate Data Concealment:** Active assessment candidates must NEVER receive answer keys, correct option flags, or rationales over the wire while an assessment is in progress.
2. **Server-Authoritative Enforcement:** Examination deadlines, availability windows, attempt counts, and retake cooldowns must be enforced exclusively on the backend server.
3. **Separation of Duties:** Authors cannot approve their own examinations where organizational policy requires peer review; only authorized Admins / Superadmins can transition revisions to `Approved`.
4. **Zero Duplicate Storage:** Canonical questions reside solely in `public."Questions"`; learner attempts reside solely in `public."ExamAttempts"`.

---

## 2. Role-Based Access Control (RBAC) & Permission Matrix

### 2.1 Role Hierarchy
PrepFord enforces the following role hierarchy:
`superadmin` > `admin` > `exam_manager` > `content_manager` > `reviewer` > `instructor` > `candidate`.

### 2.2 Examination Permission Matrix

| Operation | Endpoint | Required Permission / Allowed Roles |
| :--- | :--- | :--- |
| **View Catalogue** | `GET /api/v1/examinations` | All authenticated users (learners see published only) |
| **Create Family** | `POST /api/v1/examinations` | `exams.create` (`exam_manager`, `admin`, `superadmin`) |
| **Edit Metadata** | `PUT .../revisions/{id}` | `exams.edit` (`exam_manager`, `admin`, `superadmin`) |
| **Edit Blueprint** | `PUT .../composition` | `exams.edit` (`exam_manager`, `admin`, `superadmin`) |
| **Submit for Review** | `POST .../submit` | `exams.edit` (`exam_manager`, `admin`, `superadmin`) |
| **Recommend Approval**| `POST .../recommend` | `exams.review` (`reviewer`, `admin`, `superadmin`) |
| **Return for Changes**| `POST .../return` | `exams.review` (`reviewer`, `admin`, `superadmin`) |
| **Approve Revision** | `POST .../approve` | `exams.approve` (`admin`, `superadmin` only) |
| **Publish Revision** | `POST .../publish` | `exams.publish` (`exam_manager`, `admin`, `superadmin`) |
| **Archive Revision** | `POST .../archive` | `exams.delete` (`exam_manager`, `admin`, `superadmin`) |
| **Emergency Retire** | `POST .../emergency-retire` | `superadmin` only |
| **Admin Preview** | `GET .../preview` | `exam_manager`, `admin`, `superadmin`, `reviewer`, `instructor` |

---

## 3. Vulnerability Mitigation & Controls

### 3.1 IDOR (Insecure Direct Object Reference) Prevention
- In `ExamAttemptsController`:
  - Every attempt-access endpoint validates caller ownership (`attempt.UserId == caller.userId`).
  - Instructors and administrators can inspect attempts only via authorized administrative reporting endpoints.
- In `ExaminationsController`:
  - Examination families and revisions are verified against the caller's role capabilities.

### 3.2 Mass Assignment & Over-Posting Protections
- Full EF Core entities (`Exam`, `Examination`, `Question`) are never accepted as HTTP request bodies or returned raw as responses.
- Explicit DTO contracts (`UpdateRevisionMetadataRequest`, `UpdateExamCompositionRequest`, `CreateExaminationRequest`) parse and sanitize only permitted properties.

### 3.3 Answer Key & Rationale Protection
- In `ExamAttemptsController.GetAttemptDetail`:
  - When an attempt is `InProgress`, `CorrectAnswerIndices` and `Rationale` are scrubbed and returned as `null`.
  - When an attempt is `Completed`, visibility is governed by `Exam.ReviewPolicy`:
    - `"Never"`: rationales and answers permanently omitted.
    - `"AfterDeadline"`: withheld until the exam time limit has officially elapsed.
    - `"AfterExamSubmission"`: displayed upon attempt submission.

### 3.4 Concurrency Race Conditions & Reauth Limiting
- Optimistic locking via `ConcurrencyToken` prevents lost updates during concurrent administrative editing.
- Transactional locking (`SELECT ... FOR UPDATE`) prevents dual-publishing or concurrent approvals.
- Session reauthentication (`POST /api/v1/attempts/{id}/reauthenticate`) enforces rate limiting (5 failed attempts per 15-minute window).
- Parallel test suite isolation is achieved via xUnit `[Collection("ReauthRateLimitTests")]`, eliminating test race conditions while verifying rate-limit enforcement.

---

## 4. Administrative Audit Logging

Every mutating administrative action is recorded in `public."AuditLogs"` with the following attributes:
- `ActorId`: Authenticated user ID.
- `Action`: e.g. `ExamCreated`, `ExamRevisionSubmitted`, `ExamRevisionApproved`, `ExamRevisionPublished`, `ExamCompositionUpdated`.
- `EntityType`: `Examination` or `Exam`.
- `EntityId`: Family or revision GUID.
- `Outcome`: `Success` or `Failure`.
- `CorrelationId`: Trace ID propagated across BFF and API.
- `Timestamp`: UTC timestamp.

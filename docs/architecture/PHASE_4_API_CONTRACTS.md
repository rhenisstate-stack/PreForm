# PREPFORD NCLEX — PHASE 4 API CONTRACTS & INTEGRATION SPECIFICATION
## Examination Management, Administrative Assessment Configuration & Lifecycle Governance

**Document File:** `docs/architecture/PHASE_4_API_CONTRACTS.md`  
**API Version:** `v1`  
**Base URL:** `/api/v1/examinations`  
**BFF Route Prefix:** `/api/admin/examinations`  
**Authentication:** JWT Bearer (ASP.NET Core API) / Next.js HMAC Signed Gateway BFF  
**Authority:** PrepFord Product Owner  
**Date:** November 5, 2026  

---

## 1. Overview & Architectural Boundaries

Phase 4 introduces authoritative administrative contracts for managing examination families, versioned revisions, assessment composition blueprints, scheduled availability, candidate attempt limits, and review visibility policies.

### 1.1 Invariants
1. **Separation of Concerns:** Administrative examination configuration is completely isolated from learner delivery.
2. **Server-Authoritative Enforcement:** Availability windows, attempt counts, retake cooldowns, and rationale visibility are strictly enforced by the backend (`ExamAttemptsController` and `AssessmentsController`).
3. **Optimistic Concurrency:** All mutating endpoints require `concurrencyToken` in the payload; stale tokens trigger `409 Conflict`.
4. **Candidate Data Concealment:** Candidate assessment attempts never leak answers or rationales in violation of the revision's configured `ReviewPolicy`.

---

## 2. Examination Family Management Endpoints

### 2.1 List Examinations
- **Method / Route:** `GET /api/v1/examinations`
- **Permissions:** `exams.view` (`candidate`, `instructor`, `reviewer`, `content_manager`, `exam_manager`, `admin`, `superadmin`)
- **Query Parameters:**
  - `pathway` (`string?`): Filter by `"rn"`, `"pn"`, or `"both"`.
  - `status` (`string?`): Filter by lifecycle state (`"Draft"`, `"InReview"`, `"Approved"`, `"Published"`, `"Archived"`, `"Retired"`).
  - `search` (`string?`): Substring search against title, code, or description.
  - `page` (`int`, default `1`): 1-based page index.
  - `pageSize` (`int`, default `10`): Items per page (max 100).
  - `sortBy` (`string?`, default `"updatedAt"`): `"title"`, `"code"`, `"createdAt"`, `"updatedAt"`.
  - `sortOrder` (`string?`, default `"desc"`): `"asc"` or `"desc"`.
- **Response `200 OK`:**
  ```json
  {
    "items": [
      {
        "id": "fam_rn_001",
        "code": "RN-EX-000001",
        "title": "NCLEX-RN Comprehensive Licensure Simulator",
        "pathway": "rn",
        "currentRevisionId": "rev_rn_001_v2",
        "currentRevisionNumber": 2,
        "currentRevisionStatus": "Published",
        "targetQuestionCount": 85,
        "timeLimitMinutes": 300,
        "passingScorePercent": 75.0,
        "isAvailable": true,
        "availableFrom": "2026-11-01T00:00:00Z",
        "availableTo": "2026-12-31T23:59:59Z",
        "totalRevisions": 2,
        "createdAt": "2026-10-15T08:00:00Z",
        "updatedAt": "2026-11-05T14:30:00Z"
      }
    ],
    "totalCount": 42,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5,
    "metrics": {
      "totalFamilies": 42,
      "publishedFamilies": 36,
      "draftRevisions": 6,
      "inReviewRevisions": 2
    }
  }
  ```

### 2.2 Create Examination Family & Initial Draft Revision
- **Method / Route:** `POST /api/v1/examinations`
- **Permissions:** `exams.create` (`exam_manager`, `admin`, `superadmin`)
- **Request Body:**
  ```json
  {
    "pathway": "rn",
    "title": "NCLEX-RN Pediatric Clinical Assessment",
    "description": "Comprehensive pediatric nursing assessment",
    "examType": 1,
    "timeLimitMinutes": 120,
    "passingScorePercent": 75.0,
    "targetQuestionCount": 50,
    "selectionStrategy": "Preset",
    "reviewPolicy": "AfterExamSubmission"
  }
  ```
- **Response `201 Created`:** Returns created `ExaminationFamilyDto` with sequential code allocated by PostgreSQL sequence.

### 2.3 Duplicate Examination Family
- **Method / Route:** `POST /api/v1/examinations/{id}/duplicate`
- **Permissions:** `exams.create` (`exam_manager`, `admin`, `superadmin`)
- **Request Body:**
  ```json
  {
    "sourceRevisionId": "rev_rn_001_v2",
    "newTitle": "NCLEX-RN Pediatric Assessment (2027 Edition)"
  }
  ```
- **Response `201 Created`:** Deep-copies blueprint rules and question memberships into a brand-new independent examination family with a freshly allocated sequence code.

---

## 3. Revision Studio & Configuration Endpoints

### 3.1 Get Revision Details
- **Method / Route:** `GET /api/v1/examinations/revisions/{revisionId}`
- **Response `200 OK`:** Full `ExamRevisionDetailDto` including metadata, blueprint rules, and policy configurations.

### 3.2 Update Revision Metadata & Policies
- **Method / Route:** `PUT /api/v1/examinations/revisions/{revisionId}`
- **Permissions:** `exams.edit` (`exam_manager`, `admin`, `superadmin`)
- **Request Body:**
  ```json
  {
    "title": "NCLEX-RN Pediatric Assessment",
    "description": "Updated clinical guidelines",
    "examType": 1,
    "timeLimitMinutes": 120,
    "passingScorePercent": 75.0,
    "isAvailable": true,
    "availableFrom": "2026-11-01T00:00:00Z",
    "availableTo": "2026-12-31T23:59:59Z",
    "maxAttemptsAllowed": 3,
    "retakeCooldownHours": 24,
    "allowInterruptedResume": true,
    "reviewPolicy": "AfterExamSubmission",
    "showRationales": true,
    "showScoreImmediately": true,
    "concurrencyToken": 1
  }
  ```
- **Errors:**
  - `409 Conflict`: Concurrency token mismatch.
  - `422 Unprocessable Entity`: Invalid date window or passing score bounds ($0 \dots 100$).

---

## 4. Assessment Composition & Blueprint Endpoints

### 4.1 Get Revision Composition
- **Method / Route:** `GET /api/v1/examinations/revisions/{revisionId}/composition`
- **Response `200 OK`:**
  ```json
  {
    "revisionId": "rev_comp_123",
    "targetQuestionCount": 10,
    "selectionStrategy": "DynamicBalanced",
    "allowedQuestionTypes": [
      "single-choice",
      "multiple-choice",
      "sata",
      "checkbox",
      "image-based",
      "multiple-image",
      "true-false"
    ],
    "clientNeedQuotas": [
      { "clientNeedId": "MOC", "clientNeedName": "Management of Care", "targetCount": 2, "targetPercentage": 20, "availableCount": 45 },
      { "clientNeedId": "SIC", "clientNeedName": "Safety and Infection Control", "targetCount": 1, "targetPercentage": 10, "availableCount": 38 },
      { "clientNeedId": "HPM", "clientNeedName": "Health Promotion and Maintenance", "targetCount": 1, "targetPercentage": 10, "availableCount": 29 },
      { "clientNeedId": "PSI", "clientNeedName": "Psychosocial Integrity", "targetCount": 1, "targetPercentage": 10, "availableCount": 24 },
      { "clientNeedId": "BCC", "clientNeedName": "Basic Care and Comfort", "targetCount": 1, "targetPercentage": 10, "availableCount": 31 },
      { "clientNeedId": "PPT", "clientNeedName": "Pharmacological and Parenteral Therapies", "targetCount": 2, "targetPercentage": 20, "availableCount": 50 },
      { "clientNeedId": "RRP", "clientNeedName": "Reduction of Risk Potential", "targetCount": 1, "targetPercentage": 10, "availableCount": 40 },
      { "clientNeedId": "PHA", "clientNeedName": "Physiological Adaptation", "targetCount": 1, "targetPercentage": 10, "availableCount": 35 }
    ],
    "concurrencyToken": 1
  }
  ```

### 4.2 Update Revision Composition
- **Method / Route:** `PUT /api/v1/examinations/revisions/{revisionId}/composition`
- **Permissions:** `exams.edit` (`exam_manager`, `admin`, `superadmin`)
- **Rules:**
  - Unsupported question types (e.g. interactive NGN catalog types) are strictly rejected (`422 Unprocessable Entity`).
  - Target count must be $> 0$.
  - Quotas are deterministically normalized to sum to `targetQuestionCount`.

### 4.3 Question Pool Preview
- **Method / Route:** `GET /api/v1/examinations/revisions/{revisionId}/pool-preview`
- **Response `200 OK`:** Evaluates question bank sufficiency per Client Needs category.
  ```json
  {
    "revisionId": "rev_comp_123",
    "pathway": "rn",
    "selectionStrategy": "DynamicBalanced",
    "totalRequiredQuestions": 10,
    "totalAvailableApprovedQuestions": 292,
    "isOverallPoolSufficient": true,
    "items": [
      { "clientNeedId": "MOC", "clientNeedName": "Management of Care", "requiredCount": 2, "availableApprovedQuestions": 45, "isSufficient": true }
    ]
  }
  ```

---

## 5. Readiness Verification & Administrative Preview

### 5.1 Pre-Flight Readiness Report
- **Method / Route:** `GET /api/v1/examinations/revisions/{revisionId}/readiness`
- **Response `200 OK`:**
  ```json
  {
    "revisionId": "rev_comp_123",
    "canPublish": true,
    "overallStatus": "PASS",
    "summary": "Revision satisfies all publication quality gates.",
    "categories": [
      {
        "category": "Metadata",
        "status": "PASS",
        "checks": [
          { "name": "Title presence", "passed": true, "severity": "BLOCK", "message": "Title is configured." },
          { "name": "Passing score", "passed": true, "severity": "BLOCK", "message": "Passing score (75%) within range." }
        ]
      },
      {
        "category": "Composition",
        "status": "PASS",
        "checks": [
          { "name": "Question sufficiency", "passed": true, "severity": "BLOCK", "message": "10 questions assigned or available." }
        ]
      },
      {
        "category": "Policies",
        "status": "PASS",
        "checks": [
          { "name": "Availability window", "passed": true, "severity": "WARN", "message": "Availability window configured." }
        ]
      }
    ]
  }
  ```

### 5.2 Zero-Side-Effect Candidate Preview
- **Method / Route:** `GET /api/v1/examinations/revisions/{revisionId}/preview`
- **Permissions:** `exams.view` (`admin`, `superadmin`, `exam_manager`, `reviewer`, `instructor`)
- **Safety Invariants:**
  - Generates zero records in `ExamAttempts`, `ExamAttemptQuestions`, or `AttemptResponses`.
  - Simulates the candidate assessment UI flow with an educator inspection panel revealing correct options and clinical rationales.

---

## 6. Lifecycle State Machine Transitions

| Action | Route | Target State | Authorized Roles |
| :--- | :--- | :--- | :--- |
| **Submit** | `POST .../revisions/{id}/submit` | `InReview` | Exam Manager, Admin, Superadmin |
| **Recommend** | `POST .../revisions/{id}/recommend` | `InReview` | Reviewer, Admin, Superadmin |
| **Return** | `POST .../revisions/{id}/return` | `Draft` | Reviewer, Admin, Superadmin |
| **Approve** | `POST .../revisions/{id}/approve` | `Approved` | Admin, Superadmin (Separation of duties) |
| **Publish** | `POST .../revisions/{id}/publish` | `Published` | Exam Manager, Admin, Superadmin |
| **Archive** | `POST .../revisions/{id}/archive` | `Archived` | Exam Manager, Admin, Superadmin |
| **Restore** | `POST .../revisions/{id}/restore` | `Approved` | Exam Manager, Admin, Superadmin |
| **Retire** | `POST .../revisions/{id}/retire` | `Retired` | Exam Manager, Admin, Superadmin |
| **Emergency Retire** | `POST .../revisions/{id}/emergency-retire` | `Retired` | Superadmin Only |

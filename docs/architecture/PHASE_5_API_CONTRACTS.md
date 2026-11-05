# PREPFORD NCLEX — PHASE 5 API CONTRACTS & INTEGRATION SPECIFICATION
## Learner Performance Analytics, Administrative Assessment Reporting & Observability

**Document File:** `docs/architecture/PHASE_5_API_CONTRACTS.md`  
**API Version:** `v1`  
**Base URL:** `/api/v1`  
**Authentication:** JWT Bearer (Backend API) / HMAC Signed Next.js BFF Route Handlers  
**Authority:** PrepFord Senior Software Architect  
**Date:** November 5, 2026  
**Status:** IMPLEMENTED & AUDITED  

---

## 1. Learner Analytics Endpoints (`/api/v1/learner/analytics`)

Protected by `[Authorize]`. Ownership is enforced strictly: candidate can only retrieve their own performance records. Manipulating `userId` parameters yields `403 Forbidden`.

### 1.1 Learner Performance Summary
- **Endpoint:** `GET /api/v1/learner/analytics/summary`
- **Permissions:** Authenticated Candidate
- **Response `200 OK`:**
  ```json
  {
    "userId": "cand_001",
    "totalAttempts": 14,
    "completedAttempts": 12,
    "totalQuestionsAnswered": 450,
    "correctQuestionsCount": 324,
    "overallAccuracyPercent": 72.0,
    "totalTimeSpentMinutes": 360,
    "averageScorePercent": 74.5,
    "readinessStatus": "Borderline"
  }
  ```

### 1.2 NCSBN Client Needs Category Mastery
- **Endpoint:** `GET /api/v1/learner/analytics/client-needs`
- **Permissions:** Authenticated Candidate
- **Response `200 OK`:**
  ```json
  [
    {
      "categoryCode": "MOC",
      "categoryName": "Management of Care",
      "questionsAnswered": 42,
      "questionsCorrect": 32,
      "accuracyPercent": 76.2,
      "masteryLevel": "Mastered",
      "hasLowSample": false
    },
    {
      "categoryCode": "PPT",
      "categoryName": "Pharmacological and Parenteral Therapies",
      "questionsAnswered": 3,
      "questionsCorrect": 1,
      "accuracyPercent": 33.3,
      "masteryLevel": "Needs Remediation",
      "hasLowSample": true
    }
  ]
  ```

### 1.3 Curriculum Topic Performance
- **Endpoint:** `GET /api/v1/learner/analytics/curriculum`
- **Permissions:** Authenticated Candidate
- **Response `200 OK`:**
  ```json
  [
    {
      "topicId": "top_cardio",
      "topicName": "Cardiovascular Disorders",
      "questionsAnswered": 25,
      "questionsCorrect": 21,
      "accuracyPercent": 84.0,
      "isDeficient": false
    },
    {
      "topicId": "top_endocrine",
      "topicName": "Endocrine Emergencies",
      "questionsAnswered": 18,
      "questionsCorrect": 9,
      "accuracyPercent": 50.0,
      "isDeficient": true
    }
  ]
  ```

### 1.4 Readiness Trajectory & Trendline
- **Endpoint:** `GET /api/v1/learner/analytics/readiness-trend`
- **Permissions:** Authenticated Candidate
- **Response `200 OK`:**
  ```json
  {
    "attempts": [
      {
        "attemptId": "att_01",
        "examTitle": "RN Comprehensive Readiness Assessment 1",
        "finishedAt": "2026-10-25T14:00:00Z",
        "scorePercent": 68.0,
        "passingThreshold": 75.0,
        "isPassed": false
      },
      {
        "attemptId": "att_02",
        "examTitle": "RN Comprehensive Readiness Assessment 2",
        "finishedAt": "2026-11-02T16:30:00Z",
        "scorePercent": 78.5,
        "passingThreshold": 75.0,
        "isPassed": true
      }
    ],
    "averageScore": 73.3,
    "trajectory": "Improving"
  }
  ```

### 1.5 Targeted Study Recommendations
- **Endpoint:** `GET /api/v1/learner/analytics/recommendations`
- **Permissions:** Authenticated Candidate
- **Response `200 OK`:**
  ```json
  [
    {
      "subject": "Pharmacological and Parenteral Therapies",
      "recommendedAction": "Priority Remediation Needed",
      "reason": "Accuracy is currently 33.3%, which is below the 60% competency threshold.",
      "priority": "High"
    }
  ]
  ```

---

## 2. Administrative Assessment & Reporting Endpoints (`/api/v1/admin/reports`)

Protected by `[Authorize(Policy = "RequireAdmin")]`. Accessible only to authorized educator and administrative roles.

### 2.1 Platform Overview Metrics
- **Endpoint:** `GET /api/v1/admin/reports/overview`
- **Permissions:** `RequireAdmin` (`canViewReports`)
- **Response `200 OK`:**
  ```json
  {
    "totalLearners": 1250,
    "totalExaminations": 18,
    "totalQuestionsInBank": 2400,
    "totalAttemptsInitiated": 4820,
    "totalAttemptsCompleted": 4120,
    "platformCompletionRate": 85.5,
    "platformAverageScore": 72.8
  }
  ```

### 2.2 Assessment Outcome Cohort Report
- **Endpoint:** `GET /api/v1/admin/reports/assessments`
- **Permissions:** `RequireAdmin` (`canViewReports`)
- **Query Parameters:**
  - `examinationId` (`string?`): Filter by specific examination family.
  - `fromDate` (`DateTime?`): Start timestamp filter.
  - `toDate` (`DateTime?`): End timestamp filter.
- **Response `200 OK`:**
  ```json
  {
    "totalAttempts": 4120,
    "completedAttempts": 3800,
    "completionRate": 92.2,
    "averageScore": 74.1,
    "passingRate": 68.5,
    "scoreDistribution": [
      { "bucketLabel": "0-49%", "minScore": 0, "maxScore": 49.99, "count": 180, "percentage": 4.7 },
      { "bucketLabel": "50-59%", "minScore": 50, "maxScore": 59.99, "count": 420, "percentage": 11.1 },
      { "bucketLabel": "60-69%", "minScore": 60, "maxScore": 69.99, "count": 950, "percentage": 25.0 },
      { "bucketLabel": "70-74%", "minScore": 70, "maxScore": 74.99, "count": 850, "percentage": 22.4 },
      { "bucketLabel": "75-79%", "minScore": 75, "maxScore": 79.99, "count": 780, "percentage": 20.5 },
      { "bucketLabel": "80-89%", "minScore": 80, "maxScore": 89.99, "count": 490, "percentage": 12.9 },
      { "bucketLabel": "90-100%", "minScore": 90, "maxScore": 100.0, "count": 130, "percentage": 3.4 }
    ],
    "examinationBreakdowns": [
      {
        "examId": "exam_rn_01",
        "code": "RN-CAT-01",
        "title": "Comprehensive RN CAT Licensure Simulation",
        "totalAttempts": 1800,
        "completedAttempts": 1650,
        "completionRate": 91.7,
        "averageScore": 75.3,
        "passingThreshold": 75.0,
        "passRate": 71.2
      }
    ]
  }
  ```

### 2.3 Assessment Report CSV Export
- **Endpoint:** `GET /api/v1/admin/reports/assessments/export`
- **Permissions:** `RequireAdmin` (`canViewReports`)
- **Query Parameters:** Identical to `/assessments`
- **Response `200 OK`:**
  - Content-Type: `text/csv; charset=utf-8`
  - Header: `Content-Disposition: attachment; filename="assessments-report-{yyyyMMddHHmmss}.csv"`
  - Body: UTF-8 BOM followed by RFC 4180 CSV rows.

### 2.4 Question Bank Item Psychometrics
- **Endpoint:** `GET /api/v1/admin/reports/questions`
- **Permissions:** `RequireAdmin` (`canViewReports`)
- **Query Parameters:**
  - `search` (`string?`): Substring match against question text or ID.
  - `clientNeed` (`string?`): Filter by category code (`MOC`, `PPT`, etc.).
  - `page` (`int`, default `1`): Page number.
  - `pageSize` (`int`, default `20`, max `100`): Items per page.
- **Response `200 OK`:**
  ```json
  {
    "items": [
      {
        "questionId": "q_cardio_101",
        "text": "A nurse is caring for a client with heart failure...",
        "clientNeed": "Physiological Adaptation",
        "curriculumTopic": "Cardiovascular Disorders",
        "difficulty": "Moderate",
        "timesDelivered": 340,
        "timesAnswered": 340,
        "correctCount": 245,
        "correctRate": 72.1,
        "averageTimeSeconds": 68.4
      }
    ],
    "totalCount": 2400,
    "page": 1,
    "pageSize": 20
  }
  ```

### 2.5 Question Distractor Selection Breakdown
- **Endpoint:** `GET /api/v1/admin/reports/questions/{id}`
- **Permissions:** `RequireAdmin` (`canViewReports`)
- **Response `200 OK`:**
  ```json
  {
    "questionId": "q_cardio_101",
    "text": "A nurse is caring for a client with heart failure...",
    "clientNeed": "Physiological Adaptation",
    "curriculumTopic": "Cardiovascular Disorders",
    "difficulty": "Moderate",
    "timesDelivered": 340,
    "timesAnswered": 340,
    "correctCount": 245,
    "correctRate": 72.1,
    "averageTimeSeconds": 68.4,
    "distractors": [
      {
        "optionId": "opt_a",
        "optionText": "Administer furosemide 40 mg IV push",
        "selectionCount": 245,
        "selectionRate": 72.1,
        "isCorrect": true
      },
      {
        "optionId": "opt_b",
        "optionText": "Place the client in the Supine position",
        "selectionCount": 65,
        "selectionRate": 19.1,
        "isCorrect": false
      }
    ]
  }
  ```

### 2.6 Question Psychometrics CSV Export
- **Endpoint:** `GET /api/v1/admin/reports/questions/export`
- **Permissions:** `RequireAdmin` (`canViewReports`)
- **Response `200 OK`:**
  - Content-Type: `text/csv; charset=utf-8`
  - Header: `Content-Disposition: attachment; filename="question-analytics-{yyyyMMddHHmmss}.csv"`

---

## 3. Operational Monitoring Endpoints (`/api/v1/admin/monitoring`)

Protected by `[Authorize(Policy = "RequireAdmin")]`. Accessible only to DevOps/SRE and System Administrators.

### 3.1 Operational Health Diagnostic
- **Endpoint:** `GET /api/v1/admin/monitoring/health`
- **Permissions:** `RequireAdmin` (`canViewMonitoring`)
- **Response `200 OK`:**
  ```json
  {
    "status": "Healthy",
    "databaseLatencyMs": 4.2,
    "activeSessionsCount": 18,
    "serverUptimeSeconds": 86400.0,
    "memoryWorkingSetMb": 184.5,
    "timestamp": "2026-11-05T19:50:00Z"
  }
  ```

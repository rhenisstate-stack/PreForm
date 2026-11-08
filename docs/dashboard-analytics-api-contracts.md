# PREPFORD NCLEX — DASHBOARD ANALYTICS API CONTRACTS
## System-Wide Analytics Endpoints, DTO Schemas & BFF Forwarding Specification

**Document Version:** 1.0.0  
**Effective Date:** November 8, 2026  
**Backend API Version:** ASP.NET Core 8 Web API (`api/v1`)  
**Frontend Gateway:** Next.js 16 App Router BFF (`api/admin/analytics/...` and `api/learner/analytics/...`)  

---

## 1. ARCHITECTURAL CONVENTIONS & ENVELOPE STANDARD

All PrepFord analytics endpoints adhere to RFC 7807 problem details on failure and return a standard JSON envelope on success:

```json
{
  "success": true,
  "data": { ... },
  "calculatedAt": "2026-11-08T12:00:00Z"
}
```

### Filtering & Query Parameters Standard
- `timeRange`: `"today"` | `"7d"` | `"30d"` | `"90d"` | `"1y"` | `"all"` | `"custom"` (default: `"30d"`).
- `fromDate` / `toDate`: ISO 8601 UTC timestamp strings when `timeRange="custom"`.
- `pathway`: `"rn"` | `"pn"` | `"both"` | `"all"`.
- `limit`: Integer for pagination or activity feeds (default: `20`, max: `100`).

---

## 2. ADMINISTRATIVE ECOSYSTEM CONTRACTS

### 2.1 Consolidated Admin Overview
**Endpoint:** `GET /api/v1/analytics/admin/overview`  
**BFF Route:** `GET /api/admin/analytics/overview`  
**Authorization:** `RequireAdmin` (`superadmin`, `admin`, `administrator`)  
**Purpose:** Executive operational intelligence KPI cards with period-over-period delta comparisons where mathematically valid.

**Response Schema (`AdminSystemOverviewDto`):**
```typescript
interface AdminSystemOverviewDto {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    totalRnLearners: number;
    totalPnLearners: number;
    totalExaminations: number;
    examinationAttempts: number;
    completedExaminations: number;
    totalQuestions: number;
    publishedStudyResources: number;
    activeSubscriptions: number;
    netSubscriptionRevenue: number; // in platform currency
    grossCollectedRevenue: number;
    totalRefunds: number;
    pendingOperationalTasks: number; // items in review queues
  };
  deltas: {
    userGrowthPercent?: number | null; // null when prior period unavailable
    attemptsGrowthPercent?: number | null;
    revenueGrowthPercent?: number | null;
    periodLabel: string; // e.g. "vs previous 30 days"
  };
  calculatedAt: string;
}
```

---

### 2.2 User & Learner Growth Analytics
**Endpoint:** `GET /api/v1/analytics/admin/users`  
**BFF Route:** `GET /api/admin/analytics/users`  
**Authorization:** `RequireAdmin`  
**Purpose:** Longitudinal registration growth, pathway distribution, and user engagement trends.

**Response Schema (`AdminUserAnalyticsDto`):**
```typescript
interface AdminUserAnalyticsDto {
  registrationTrends: Array<{
    date: string; // "YYYY-MM-DD"
    label: string; // "Nov 01"
    newUsers: number;
    rnLearners: number;
    pnLearners: number;
    cumulativeTotal: number;
  }>;
  pathwayDistribution: {
    rnCount: number;
    pnCount: number;
    bothCount: number;
    rnPercent: number;
    pnPercent: number;
  };
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    engagementRatePercent: number;
  };
  accountStatusDistribution: {
    active: number;
    suspended: number;
    deactivated: number;
  };
}
```

---

### 2.3 Examination Operations Analytics
**Endpoint:** `GET /api/v1/analytics/admin/examinations`  
**BFF Route:** `GET /api/admin/analytics/examinations`  
**Authorization:** `RequireAdmin` or `RequireExamManager`  
**Purpose:** Examination lifecycle pipeline, attempt volume, completion rates, and pathway distribution.

**Response Schema (`AdminExaminationAnalyticsDto`):**
```typescript
interface AdminExaminationAnalyticsDto {
  lifecycleBreakdown: {
    draft: number;
    inReview: number;
    approved: number;
    published: number;
    archived: number;
    total: number;
  };
  attemptsTimeline: Array<{
    date: string;
    label: string;
    startedAttempts: number;
    completedAttempts: number;
    abandonedAttempts: number;
  }>;
  performanceBenchmarks: {
    totalAttempts: number;
    completedAttempts: number;
    abandonedAttempts: number;
    completionRatePercent: number;
    abandonmentRatePercent: number;
    averageScorePercent: number;
    averageDurationMinutes: number;
  };
  pathwayComparison: {
    rnAttempts: number;
    pnAttempts: number;
    rnCompletedRate: number;
    pnCompletedRate: number;
  };
  topUtilizedExams: Array<{
    examId: string;
    code: string;
    title: string;
    pathway: string;
    attemptCount: number;
    completionRate: number;
    avgScore: number;
  }>;
}
```

---

### 2.4 Academic & Content Analytics
**Endpoint:** `GET /api/v1/analytics/admin/academics`  
**BFF Route:** `GET /api/admin/analytics/academics`  
**Authorization:** `RequireAdmin` or `RequireContentManager`  
**Purpose:** Academic taxonomy coverage, question bank growth, format distribution, and study guide production.

**Response Schema (`AdminAcademicAnalyticsDto`):**
```typescript
interface AdminAcademicAnalyticsDto {
  taxonomyCounts: {
    programmes: number;
    courses: number;
    subjectDomains: number;
    topics: number;
    clientNeeds: number;
  };
  questionBankGrowth: Array<{
    date: string;
    label: string;
    questionsAdded: number;
    cumulativeTotal: number;
  }>;
  questionTypeDistribution: Array<{
    typeKey: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  questionStatusBreakdown: {
    draft: number;
    inReview: number;
    published: number;
    archived: number;
    total: number;
  };
  studyGuidesSummary: {
    totalGuides: number;
    publishedGuides: number;
    draftGuides: number;
    flashcardDecks: number;
    totalFlashcards: number;
  };
}
```

---

### 2.5 Monetization & Revenue Analytics
**Endpoint:** `GET /api/v1/analytics/admin/monetization`  
**BFF Route:** `GET /api/admin/analytics/monetization`  
**Authorization:** `RequireAdmin`  
**Purpose:** Executive financial records (gross sales, refunds, net revenue, subscription distributions, and payment methods).

**Response Schema (`AdminMonetizationAnalyticsDto`):**
```typescript
interface AdminMonetizationAnalyticsDto {
  summary: {
    grossCollected: number;
    totalRefunds: number;
    netRevenue: number;
    currentMonthRevenue: number;
    previousMonthRevenue: number;
    pendingOfflineAmount: number;
    currency: string; // e.g. "USD"
  };
  revenueTimeline: Array<{
    date: string;
    label: string;
    grossSales: number;
    refunds: number;
    netRevenue: number;
  }>;
  subscriptionStatusDistribution: {
    active: number;
    expired: number;
    cancelled: number;
    suspended: number;
    total: number;
  };
  planDistribution: Array<{
    planId: string;
    planName: string;
    pathway: string;
    activeSubscribers: number;
    revenueCollected: number;
    percentage: number;
  }>;
  transactionStatusBreakdown: {
    successful: number;
    pending: number;
    failed: number;
    refunded: number;
  };
}
```

---

### 2.6 Platform Activity & Audit Stream
**Endpoint:** `GET /api/v1/analytics/admin/activity`  
**BFF Route:** `GET /api/admin/analytics/activity`  
**Authorization:** `RequireAdmin`  
**Purpose:** Sanitized activity timeline and category breakdown from `AuditLogs`.

**Response Schema (`AdminPlatformActivityDto`):**
```typescript
interface AdminPlatformActivityDto {
  volumeByCategory: Array<{
    category: "Users" | "Examinations" | "Questions" | "Monetization" | "Security" | "System";
    count: number;
    percentage: number;
  }>;
  activityTrend: Array<{
    date: string;
    label: string;
    totalEvents: number;
  }>;
  recentTimeline: Array<{
    id: string;
    category: string;
    action: string;
    actorName: string;
    actorEmailPreview: string; // masked email e.g. a***@prepford.com
    timestamp: string;
    severity: "Information" | "Warning" | "Critical";
    targetEntitySummary: string;
    moduleLink?: string;
  }>;
}
```

---

## 3. ROLE-SPECIFIC WORKSPACE CONTRACTS

### 3.1 Exam Manager Overview
**Endpoint:** `GET /api/v1/analytics/exams/overview`  
**BFF Route:** `GET /api/admin/analytics/exams/overview`  
**Authorization:** `RequireExamManager`  
**Output:** Role-tailored examination pipeline, pending review/approval tasks, exam attempt volumes, completion benchmarks, and top active examinations.

### 3.2 Content Manager Overview
**Endpoint:** `GET /api/v1/analytics/content/overview`  
**BFF Route:** `GET /api/admin/analytics/content/overview`  
**Authorization:** `RequireContentManager`  
**Output:** Content creation velocity, question bank status, study guide status, draft items awaiting submission, and subject domain coverage.

### 3.3 Reviewer Overview
**Endpoint:** `GET /api/v1/analytics/reviews/overview`  
**BFF Route:** `GET /api/admin/analytics/reviews/overview`  
**Authorization:** `RequireAdmin` or role `reviewer`  
**Output:** Assigned questions and exams awaiting review, completed reviews count, approval vs rejection rates, average turnaround hours, and urgent review queue.

### 3.4 Instructor Overview
**Endpoint:** `GET /api/v1/analytics/instructor/overview`  
**BFF Route:** `GET /api/admin/analytics/instructor/overview`  
**Authorization:** `RequireAdmin` or role `instructor`  
**Output:** Authorized learner cohort size, active student count, cohort score distribution histogram, at-risk students (score < 70% or 0 attempts), and Client Needs category averages.

---

## 4. SEPARATE RN & PN LEARNER DASHBOARD CONTRACTS

### 4.1 NCLEX-RN Learner Overview
**Endpoint:** `GET /api/v1/analytics/learner/rn/overview`  
**BFF Route:** `GET /api/learner/analytics/rn/overview`  
**Authorization:** `Authorize` (RN candidate or authorized staff for target learner)  

**Response Schema (`LearnerDashboardOverviewDto`):**
```typescript
interface LearnerDashboardOverviewDto {
  pathway: "rn" | "pn";
  kpis: {
    totalAssessmentsCompleted: number;
    overallAccuracyPercent: number;
    studyStreakDays: number;
    studyTimeMinutes: number;
    masteredClientNeedsCount: number;
    developingClientNeedsCount: number;
    needsImprovementCount: number;
    currentReadinessTier: string; // "Mastered", "Borderline", "Emerging", "Unassessed"
  };
  scoreTrajectory: Array<{
    date: string;
    label: string;
    scorePercent: number;
    cumulativeAccuracy: number;
    assessmentTitle: string;
    attemptId: string;
  }>;
  domainMastery: Array<{
    categoryCode: string;
    categoryName: string;
    accuracyPercent: number;
    totalAssessedQuestions: number;
    correctCount: number;
    status: "Mastered" | "Developing" | "NeedsImprovement" | "Unassessed";
  }>;
  studyConsistency: {
    streakDays: number;
    activeDaysPastTwoWeeks: number;
    dailyActivity: Array<{
      date: string;
      minutesStudied: number;
      questionsAnswered: number;
      hasActivity: boolean;
    }>;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: "High" | "Medium" | "Low";
    actionHref: string;
    evidenceText: string;
  }>;
}
```

### 4.2 NCLEX-PN Learner Overview
**Endpoint:** `GET /api/v1/analytics/learner/pn/overview`  
**BFF Route:** `GET /api/learner/analytics/pn/overview`  
**Authorization:** `Authorize` (PN candidate or authorized staff for target learner)  
**Differences:** Strict scoping to PN examination records, PN curriculum codes (including Coordinated Care), PN clinical judgment pearls, and isolated PN cohort scores.

---

## 5. SECURITY, AUTHORIZATION & ISOLATION MATRIX

| Endpoint | Gated Backend Policy | Permitted Roles | Unauthorized Status |
| :--- | :--- | :--- | :--- |
| `/api/v1/analytics/admin/overview` | `RequireAdmin` | `superadmin`, `admin`, `administrator` | 403 Forbidden |
| `/api/v1/analytics/admin/users` | `RequireAdmin` | `superadmin`, `admin`, `administrator` | 403 Forbidden |
| `/api/v1/analytics/admin/examinations`| `RequireExamManager` | `superadmin`, `admin`, `exam_manager` | 403 Forbidden |
| `/api/v1/analytics/admin/academics` | `RequireContentManager` | `superadmin`, `admin`, `content_manager` | 403 Forbidden |
| `/api/v1/analytics/admin/monetization`| `RequireAdmin` | `superadmin`, `admin`, `administrator` | 403 Forbidden |
| `/api/v1/analytics/admin/activity` | `RequireAdmin` | `superadmin`, `admin`, `administrator` | 403 Forbidden |
| `/api/v1/analytics/exams/overview` | `RequireExamManager` | `superadmin`, `admin`, `exam_manager` | 403 Forbidden |
| `/api/v1/analytics/content/overview` | `RequireContentManager` | `superadmin`, `admin`, `content_manager` | 403 Forbidden |
| `/api/v1/analytics/reviews/overview` | Policy/Role Check | `superadmin`, `admin`, `reviewer`, `content_manager` | 403 Forbidden |
| `/api/v1/analytics/instructor/overview`| Policy/Role Check | `superadmin`, `admin`, `instructor` | 403 Forbidden |
| `/api/v1/analytics/learner/{pathway}/overview` | Session User Check | Authenticated Learner (own data only) or Admin | 403 Forbidden |

---

## 6. PHASE 1 VERIFICATION & CONTRACT VALIDATION

All DTOs defined here map directly to real fields in Entity Framework Core models (`Users`, `UserSessions`, `Exams`, `ExamAttempts`, `Questions`, `Orders`, `UserSubscriptions`, `AuditLogs`, `SubjectDomains`). No phantom tables or fabricated calculations are required.

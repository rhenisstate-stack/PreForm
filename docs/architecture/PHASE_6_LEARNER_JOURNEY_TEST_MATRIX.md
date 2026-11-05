# PREPFORD NCLEX — PHASE 6 END-TO-END LEARNER JOURNEY TEST MATRIX
## Comprehensive Traceability Matrix Across Journeys A Through F

**Document File:** `docs/architecture/PHASE_6_LEARNER_JOURNEY_TEST_MATRIX.md`  
**Phase:** Phase 6 — Product Readiness & Operational Resilience  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Baseline Commit:** `f1beb3148828eed5ee08f83f065515cc44d383a9`  
**Date:** November 5, 2026  
**Auditor Roles:** Senior Full-Stack Engineer, QA Automation Lead, Application Security Engineer  

---

## 1. Journey Architecture & Testing Methodology

This matrix establishes end-to-end operational traceability for every step of a candidate's lifecycle on the PrepFord NCLEX platform. Verification combines ASP.NET Core integration tests (`apps/api/Tests`), Next.js BFF route tests, and React component tests (`apps/web/tests`).

The server remains strictly authoritative for candidate identity, assessment timing, response persistence, psychometric grading, review policy enforcement, and subscription entitlements.

---

## 2. Journey A — Account Creation, Authentication & Session Security

| Step # | User Journey Action | Target Endpoint / UI Component | Authoritative Validation Rule | Automated Test Coverage | Verified Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **A.1** | Account Registration | `POST /api/auth/register`<br>`SignUpPageClient` | Requires full name (>= 2 words), valid email, password >= 8 chars, pathway selection (`rn` or `pn`). | `auth-validation.test.ts`<br>`Phase1SecurityTests.cs` | **VERIFIED** |
| **A.2** | Duplicate Account Rejection | `POST /api/v1/auth/register` | Database unique constraint on `Email`. Duplicate registration returns `409 Conflict`. | `Phase1SecurityTests.cs`<br>`authentication-upgrade.test.tsx` | **VERIFIED** |
| **A.3** | Credential Login | `POST /api/auth/login`<br>`SignInPageClient` | PBKDF2 password hash verification via `IPasswordHasher<User>`. Returns signed session cookie. | `auth-validation.test.ts`<br>`Phase1SecurityTests.cs` | **VERIFIED** |
| **A.4** | Concurrent Session Enforcement | `SessionSecurityService.CreateOrRotateSessionAsync` | Enforces max concurrent active sessions per user. Exceeding triggers `409 Conflict` with `CONCURRENT_SESSION_LIMIT_EXCEEDED`. | `SessionAccountingLockoutTests.cs`<br>`bff-session-synchronization.test.ts` | **VERIFIED** |
| **A.5** | Pre-Auth Session Lockout Recovery | `POST /api/v1/auth/recover-sessions` | Candidate provides credentials to sweep stale sessions and unblock login without administrative intervention. Rate limited. | `SessionSecurityEngineTests.cs`<br>`authentication-upgrade.test.tsx` | **VERIFIED** |
| **A.6** | Password Recovery Request | `POST /api/auth/forgot-password` | Generates cryptographically secure, time-bounded token (15-min expiry) in `PasswordResetTokens`. | `Phase1SecurityTests.cs`<br>`auth-validation.test.ts` | **VERIFIED** |
| **A.7** | Password Reset Execution | `POST /api/auth/reset-password` | Consumes single-use token, updates password hash, invalidates all prior sessions (`SecurityVersion++`). | `Phase1SecurityTests.cs`<br>`SuspiciousClientDetectionTests.cs` | **VERIFIED** |
| **A.8** | User Logout & Revocation | `POST /api/auth/logout` | Deactivates `UserSession`, marks `RevocationReason = "UserLogout"`, clears session cookie. | `Phase1SecurityTests.cs`<br>`session-integrity.test.ts` | **VERIFIED** |
| **A.9** | Authentication Persistence | `resolveSession` in Next.js BFF | Validates HMAC signature, checks session expiry, and rejects stale security versions. | `bff-session-synchronization.test.ts`<br>`session-integrity.test.ts` | **VERIFIED** |

---

## 3. Journey B — Learner Onboarding & Dashboard Experience

| Step # | User Journey Action | Target Endpoint / UI Component | Authoritative Validation Rule | Automated Test Coverage | Verified Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **B.1** | Dashboard Access Guard | `/dashboard`<br>`DashboardClient` | Unauthenticated visits redirect to `/sign-in?from=/dashboard`. | `dashboard.test.tsx`<br>`sign-in-redirect.test.tsx` | **VERIFIED** |
| **B.2** | Learner Profile Summary | `GET /api/v1/profile` | Returns candidate name, email, pathway, active plan, exam target date, and profile image version. | `dashboard.test.tsx`<br>`profile-security-remediation.test.ts` | **VERIFIED** |
| **B.3** | Honest Zero-State Handling | `DashboardClient` | First-time candidates see zero-state metrics without fabricated scores or false pass-prediction claims. | `dashboard.test.tsx`<br>`learner-analytics.test.tsx` | **VERIFIED** |
| **B.4** | NCSBN Client Needs Mastery | `GET /api/learner/analytics/client-needs` | Displays mastery percentages across all 8 canonical categories. Flags low sample (`< 5` items) with warning badge. | `learner-analytics.test.tsx`<br>`Phase5AnalyticsAndReportingTests.cs` | **VERIFIED** |
| **B.5** | Targeted Study Recommendations | `GET /api/learner/analytics/recommendations` | Dynamically recommends review topics where accuracy is `< 60%`. | `learner-analytics.test.tsx`<br>`Phase5AnalyticsAndReportingTests.cs` | **VERIFIED** |
| **B.6** | Dual Pathway Switcher | `DashboardClient` | Allows toggling between NCLEX-RN and NCLEX-PN domains and study materials seamlessly. | `dashboard.test.tsx` | **VERIFIED** |
| **B.7** | Candidate Data Isolation | `LearnerAnalyticsController` | Invariant: Candidate can only access own analytics (`UserId == caller.userId`). Cross-user requests rejected with `403`. | `Phase5AnalyticsAndReportingTests.cs` | **VERIFIED** |

---

## 4. Journey C — Study Studio & Question Practice

| Step # | User Journey Action | Target Endpoint / UI Component | Authoritative Validation Rule | Automated Test Coverage | Verified Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **C.1** | Curriculum Topic Browsing | `/dashboard/study`<br>`CurriculumController` | Displays structured course hierarchy (Cardiovascular, Pharmacology, etc.) with study guides and notes. | `study-studio.test.tsx`<br>`study-guide.test.tsx` | **VERIFIED** |
| **C.2** | Topic Quizzing Practice | `/dashboard/study/quizzes` | Candidate selects topic, answers practice items, checks response, and reveals clinical rationale. | `study-studio.test.tsx`<br>`Phase2QuestionBankTests.cs` | **VERIFIED** |
| **C.3** | Flashcards & Spaced Repetition | `/dashboard/study/flashcards`<br>`FlashcardService` | SuperMemo SM-2 algorithm calculates repetition intervals (1 day, 6 days, etc.) based on learner rating. | `study-studio.test.tsx`<br>`StudyFlashcardsTests.cs` | **VERIFIED** |
| **C.4** | Question Flagging | `/api/questions/[id]/flag` | Candidate flags ambiguous or challenging items. Optimistically updates UI state and records in DB. | `question-flagging.test.tsx` | **VERIFIED** |

---

## 5. Journey D — Assessment Lifecycle (Start -> Testing -> Submit -> Results)

| Step # | User Journey Action | Target Endpoint / UI Component | Authoritative Validation Rule | Automated Test Coverage | Verified Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **D.1** | Catalogue & Eligibility Check | `GET /api/assessments/available`<br>`AssessmentsController` | Validates active subscription entitlement and availability window before permitting test launch. | `dashboard.test.tsx`<br>`Phase3AssessmentTests.cs` | **VERIFIED** |
| **D.2** | Attempt Start & Config Freezing | `POST /api/attempts`<br>`ExamAttemptsController` | Freezes blueprint quotas, passing score, time limit, and review policy into `AttemptMetadataSnapshot` (JSONB). | `dashboard.test.tsx`<br>`AttemptSnapshotTests.cs` | **VERIFIED** |
| **D.3** | Question Delivery & Key Concealment | `GET /api/attempts/{id}/questions` | Returns assigned questions strictly belonging to attempt. Correct option flags and rationales concealed. | `AttemptMembershipSecurityTests.cs`<br>`CandidateDataContractTests.cs` | **VERIFIED** |
| **D.4** | Real-Time Server-Authoritative Timer | `ExamAttemptsController` | Time limit computed from `StartedAt + TimeLimitMinutes`. Client countdown syncs against authoritative server time. | `Phase3AssessmentTests.cs`<br>`ExamContinuityReauthTests.cs` | **VERIFIED** |
| **D.5** | Question Answering & Persistence | `POST /api/attempts/{id}/responses` | Validates attempt ownership, verifies question set membership, records selected option IDs and duration. | `AttemptMembershipSecurityTests.cs`<br>`Phase3AssessmentTests.cs` | **VERIFIED** |
| **D.6** | Final Attempt Submission | `POST /api/attempts/{id}/submit` | Validates status transition (`InProgress -> Completed`). Prevents duplicate submission. Locks attempt. | `dashboard.test.tsx`<br>`GradingSecurityTests.cs` | **VERIFIED** |
| **D.7** | Server-Side Psychometric Grading | `ExamAttemptsController` | Computes score percentage, compares against `PassingScore`, assigns performance tier (`High`, `Borderline`, `Low`). | `GradingSecurityTests.cs`<br>`Phase3AssessmentTests.cs` | **VERIFIED** |
| **D.8** | Score Display & Policy-Gated Review | `GET /api/attempts/{id}` | Releases rationales and answer keys strictly when configured `ReviewPolicy` permits (Immediate vs Deferred). | `dashboard.test.tsx`<br>`CandidateDataContractTests.cs` | **VERIFIED** |
| **D.9** | Zero Post-Submission Mutation | `ExamAttemptsController` | Subsequent attempts to submit responses or modify completed attempts are rejected with `409 Conflict`. | `Phase3AssessmentTests.cs`<br>`GradingSecurityTests.cs` | **VERIFIED** |

---

## 6. Journey E — Assessment Recovery, Resumption & Interruption Resilience

| Step # | Operational Interruption Scenario | System Defensive Behavior | Authoritative Resolution | Automated Test Coverage | Verified Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **E.1** | Browser Refresh During Active Test | Candidate refreshes browser or closes tab. Attempt remains in `InProgress` state. | Client fetches `/api/attempts/{id}/questions` and resumes from last persisted question state. | `dashboard.test.tsx`<br>`ExamContinuityReauthTests.cs` | **VERIFIED** |
| **E.2** | Transient Network Disconnection | Client loses connectivity while answering questions. | Offline responses buffered locally and synchronized idempotently via `POST /api/v1/attempts/sync`. | `bff-assessment-delivery.test.ts`<br>`security-regressions.test.ts` | **VERIFIED** |
| **E.3** | Concurrent Re-Authentication Guard | Session token expires or IP changes during high-stakes examination. | Non-dismissible `InExamReauthModal` prompts candidate for password without abandoning examination state. | `in-exam-reauth-modal.test.tsx`<br>`ExamContinuityReauthTests.cs` | **VERIFIED** |
| **E.4** | Authoritative Time Expiration | Candidate timer reaches 0 or server detects submission after deadline. | Server marks attempt expired, calculates score from answered questions, and forbids further submissions. | `Phase3AssessmentTests.cs` | **VERIFIED** |
| **E.5** | Duplicate Submission Idempotency | Network glitch triggers double-click or replay of `/submit` request. | Database row-level lock or optimistic token ensures grading executes exactly once. Returns existing result. | `GradingSecurityTests.cs`<br>`Phase3AssessmentTests.cs` | **VERIFIED** |

---

## 7. Journey F — Historical Results, Account Settings & Session Management

| Step # | User Journey Action | Target Endpoint / UI Component | Authoritative Validation Rule | Automated Test Coverage | Verified Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **F.1** | Historical Attempt Review | `GET /api/attempts`<br>`DashboardClient` | Lists completed attempts, scores, dates, and durations. Ownership strictly enforced. | `dashboard.test.tsx`<br>`Phase3AssessmentTests.cs` | **VERIFIED** |
| **F.2** | Profile Settings Update | `PUT /api/v1/profile`<br>`ProfilePageClient` | Updates display name, target exam date, and email notifications. Disallows self-promotion of role or plan. | `profile-security-remediation.test.ts`<br>`profile-image-upload.test.tsx` | **VERIFIED** |
| **F.3** | Profile Picture Upload & Removal | `POST /api/v1/profile/image`<br>`DELETE /api/v1/profile/image` | Validates MIME type, enforces 2MB limit, stores in `UserProfileImages`, updates cache token. | `profile-image-upload.test.tsx`<br>`ProfileImageServiceAndControllerTests.cs` | **VERIFIED** |
| **F.4** | Multi-Session Device Management | `/dashboard/settings/security`<br>`SecuritySettingsClient` | Displays active sessions, identifies current session, displays browser/OS labels and IP address. | `learner-security-settings.test.tsx`<br>`learner-dashboard-security-center.test.tsx` | **VERIFIED** |
| **F.5** | Remote Session Termination | `DELETE /api/security/sessions/{id}` | Allows candidate to terminate specific remote sessions or all other sessions. Writes audit log. | `learner-security-settings.test.tsx`<br>`SessionSecurityEngineTests.cs` | **VERIFIED** |
| **F.6** | Security Event Activity Feed | `GET /api/security/events` | Displays chronological audit trail of logins, session revocations, and password updates for learner. | `learner-security-settings.test.tsx`<br>`SuspiciousClientDetectionTests.cs` | **VERIFIED** |
| **F.7** | Subscription Management & Cart | `/cart`, `/subscriptions`<br>`CartPageClient` | Candidate selects plan, applies valid promo code (`FUTURENURSE`, `CLINICAL20`), and initiates checkout. | `cart-checkout.test.tsx`<br>`promo-code.test.tsx` | **VERIFIED** |
| **F.8** | Production Checkout Refusal | `POST /api/checkout` | In production environment, rejects simulated orders fail-closed until live payment gateway is activated. | `checkout-security.test.ts` | **VERIFIED** |

---

## 8. Learner Journey Verification Conclusion

All 6 critical learner journeys (Journeys A through F) are comprehensively evidenced by automated tests across both backend and frontend. The server-authoritative architecture guarantees candidate data isolation, exam integrity, timer reliability, and secure entitlement enforcement.

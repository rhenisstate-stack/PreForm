# PREPFORD NCLEX — PHASE 7.9.4
## WORK PACKAGE B: CONTROLLED PILOT SCOPE AND OPERATING BOUNDARY SPECIFICATION

**Document ID:** `PHASE_7_9_4_CONTROLLED_PILOT_SCOPE.md`  
**Phase:** Phase 7.9.4 — Controlled Institutional Pilot Authorization, Deployment Governance & Operational Readiness  
**Release Candidate Commit:** `58aa98221ac9b2bd1106a9715749011ddaa90ed3` (Base: `6d33fc5`)  
**Commercial Mode:** Controlled Institutional Pilot (`pilot_grant`)  
**Live Stripe:** Disabled & Uninstalled  
**Authority:** PrepFord Product Owner  
**Date:** 2026-11-06  

---

## 1. Executive Summary & Purpose

The objective of Phase 7.9.4 Work Package B is to explicitly delineate the authorized operating boundaries, eligible audience, functional scope, and explicit operational exclusions for the PrepFord NCLEX Controlled Institutional Pilot.

Under no circumstances may the pilot environment be operated as an unrestricted, open-market commercial platform. All functional capabilities enabled in the pilot must possess verified server-authoritative backend implementations and adhere strictly to institutional governance safeguards.

---

## 2. Institutional Pilot Audience & Eligibility Framework

### 2.1 Participating Institutions
- **Designated Institutions:** `PENDING PRODUCT OWNER DECISION`
  *(The Product Owner must formally specify the legal entity name, jurisdiction, and authorized academic representatives of each participating nursing faculty or healthcare educational institution).*
- **Participating Cohort Specification:** Senior nursing degree (BSN/ADN) or diploma candidates preparing for the NCLEX-RN or NCLEX-PN licensure examinations.
- **Geographic Jurisdiction:** Subject to institutional agreement and hosting region (`PENDING PRODUCT OWNER DECISION`).

### 2.2 Authorized Administrative Roles
Administrative access to candidate records, examinations, and pilot grants is strictly restricted via PostgreSQL role-based authorization policies:
1. **`superadmin`:** Global platform administration, pilot grant issuance, grant revocation, administrative user role elevation, and security incident response.
2. **`admin` / `administrator`:** Institutional candidate management, cohort progress oversight, session review, and audit log inspection.
3. **`exam_manager`:** Examination blueprint scheduling, question set association, attempt monitoring, and scoring oversight.
4. **`content_manager`:** Curriculum taxonomy curation, question bank review, and clinical rationale maintenance.

### 2.3 Candidate Onboarding & Account Approval Method
- **Onboarding Method:** Controlled institutional roster invitation. Candidates are not permitted to gain examination entitlements through public self-service signups.
- **Account Creation:** Candidates register an account using institutional email addresses or unique institutional invitation tokens.
- **Entitlement Issuance:** Authorized platform administrators issue a time-bounded pilot grant via the server-authoritative endpoint:
  ```http
  POST /api/v1/admin/users/{id}/pilot-grant
  ```
- **Duplicate Protection:** Enforced at the database layer via PostgreSQL partial unique index `idx_user_subscriptions_active_unique` on `(UserId, PlanId) WHERE Status = 1`.

### 2.4 Pilot Duration, Start & Stop Criteria
- **Pilot Duration:** `PENDING PRODUCT OWNER DECISION` (Recommended standard: 30 to 60 calendar days per cohort).
- **Pilot Start Conditions:**
  1. Product Owner signs the Phase 7.9.4 Authorization Package.
  2. Participating institution signs the Institutional Pilot Data Processing Agreement (DPA).
  3. Pre-deployment acceptance checklist passes 100%.
  4. Candidate roster is administratively validated.
- **Pilot End Conditions:**
  1. Designated cohort completes scheduled licensure assessments.
  2. Expiration of issued institutional pilot grants (`ExpiresAt` timestamp reached).
  3. Formal pilot completion determination by the Product Owner and Institutional Dean.

---

## 3. Verified Functional Scope

The controlled pilot enables only capabilities that have been empirically verified in the backend and frontend test suites:

| Capability Area | Specific Feature | Implementation Mechanism | Operating Boundary in Pilot |
| :--- | :--- | :--- | :--- |
| **Authentication** | Candidate Login & Password Auth | PBKDF2 password hashing via ASP.NET Core `PasswordHasher<User>` | Single browser session per user; maximum 2 concurrent devices |
| **Session Security** | Bearer Token Validation & Rotation | SHA-256 session tokens stored in PostgreSQL `UserSessions` | 7-day session lifetime; 5-minute activity throttle |
| **Reauthentication** | Two-Tier Reauthentication Policy | Derived strictly from `UserSessions.RevocationReason` | Involuntary disconnects allow password entry; admin holds block candidate override |
| **Rate Limiting** | Distributed Advisory Locking | PostgreSQL `RateLimitBuckets` with `pg_advisory_xact_lock` | Attempt key (`reauth_attempt:{id}`); User key (`reauth_user:{id}`); immune to header spoofing |
| **Pilot Grants** | Complimentary Access Provisioning | `AdminUsersController.IssuePilotGrant` | Grants 30–365 day access to RN or PN pathways; order prefix `pilot_grant_` |
| **Exam Access** | Entitlement Verification | Server-authoritative `IUserEntitlementService` | Checked on `StartAttempt`, `GetAttemptById`, `GetAttemptQuestions`, `SubmitResponse`, `Sync` |
| **Exam Delivery** | NCLEX-RN and NCLEX-PN Exams | `ExamAttemptsController` & `IAttemptQuestionService` | Standard Practice, Readiness Assessment Tests (RAT), and CAT blueprints |
| **Question Types** | Next Generation NCLEX (NGN) Items | Dynamic `QuestionGraderResolver` | Multiple Choice, Extended Multiple Choice, Drag-and-Drop, Matrix/Grid, Dropdown, Bowtie, Trend |
| **In-Window Grace** | Graceful In-Window Completion | `ExamAttemptsController` validation against attempt start | If grant expires during an exam, candidate may submit for scoring within `StartedAt + TimeLimit` |
| **Scoring & Review** | Clinical Rationales & Analytics | Server-side scoring engine with JSONB snapshot blueprints | Item rationales revealed only after exam submission or practice review |
| **Admin Reporting** | Candidate Cohort Export | `AdminReportsController.ExportReportCsv` | Requires `reports:export` permission; scoped to authorized administrators |
| **IP Security** | Access Filtering & Blacklisting | `IpFilteringMiddleware` and `IpAccessRules` table | Dynamic IP blocking of malicious clients |

---

## 4. Explicit Operational Exclusions

Unless separately and explicitly authorized in writing by the Product Owner, the controlled institutional pilot **strictly excludes**:

```
+--------------------------------------------------------------------------------------------------+
|                             EXPLICIT OPERATIONAL PILOT EXCLUSIONS                                |
+--------------------------------------------------------------------------------------------------+
| 1. Public Self-Service Exam Registration: Public users who register without an institutional    |
|    pilot grant cannot start, view, or submit examinations.                                       |
| 2. Live Payment Processing: The Stripe.net SDK is uninstalled. Real credit card billing,         |
|    commercial subscription purchases, and recurring renewals are disabled.                      |
| 3. Commercial Public Marketing: The platform must not be advertised as commercially available   |
|    to individual retail candidates during the institutional pilot.                              |
| 4. Unapproved Institutional Onboarding: No nursing school or candidate cohort may be granted    |
|    access without an executed Institutional Data Processing Agreement (DPA).                    |
| 5. Unapproved Candidate Data Collection: No candidate telemetry outside academic assessment    |
|    and session integrity may be gathered. Tracking scripts and third-party ad pixels are banned.|
| 6. High-Concurrency Stress Claims (> 50 concurrent candidates): Concurrency must remain bounded |
|    to institutional cohort sizes (<= 50 active exam attempts per session).                      |
| 7. Unapproved External Integrations: Third-party Learning Management System (LMS) integrations   |
|    (Canvas, Blackboard, Moodle LTI) are excluded until separate architectural acceptance.       |
| 8. Legacy Data Migration: No unverified candidate records or historical data from previous      |
|    SQLite or legacy platforms may be imported into the pilot database.                          |
+--------------------------------------------------------------------------------------------------+
```

---

## 5. Work Package B Conclusion

The operating boundaries established herein ensure that the PrepFord NCLEX platform operates strictly as a hardened, isolated, and legally protected institutional pilot. Any expansion beyond these boundaries requires separate Product Owner authorization and engineering evaluation.

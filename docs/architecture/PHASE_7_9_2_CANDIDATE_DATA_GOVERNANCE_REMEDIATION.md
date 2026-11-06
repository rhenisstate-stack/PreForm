# PREPFORD NCLEX — PHASE 7.9.2
## WORK PACKAGE J: CANDIDATE DATA GOVERNANCE & PRIVACY ARCHITECTURE REPORT

**Document ID:** `PHASE_7_9_2_CANDIDATE_DATA_GOVERNANCE_REMEDIATION.md`  
**Phase:** 7.9.2 (Critical Release Blocker Remediation)  
**Work Package:** J (Candidate Data Governance Remediation)  
**Status:** DESIGNED AND SPECIFIED  
**Date:** 2026-11-06  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Database Authority:** PostgreSQL 16 (`prepford`)  

---

## 1. Executive Summary & Governance Gap Analysis

### 1.1 Findings from Phase 7.9.1 Audit
During Phase 7.9.1 verification, an audit of candidate data privacy and governance revealed:
1. **Client-Local Consent Tracking:** Cookie and privacy policy acknowledgments were recorded exclusively in browser `localStorage` (`prepford_cookie_consent`). No server-side persistence or attributable candidate audit logs existed to verify consent compliance.
2. **Missing Consent Versioning:** If Terms of Service or Privacy Policies were updated, the system lacked a mechanism to enforce re-consent on subsequent logins.
3. **Undefined Data Retention Lifecycle:** Assessment attempts, candidate responses, and telemetry lacked automated retention, archival, and right-to-erasure (GDPR/FERPA) data anonymization lifecycles.

### 1.2 Engineering & Governance Objectives
1. Design a server-authoritative `CandidateConsents` entity and audit lifecycle.
2. Define a compliant data retention, anonymization, and right-to-erasure specification.
3. Formalize institutional pilot cohort data governance agreements.
4. Document the external legal review boundary requiring Product Owner sign-off.

---

## 2. Server-Authoritative Consent Architecture

### 2.1 Proposed Database Schema (`CandidateConsents`)
To transition consent governance from browser storage to server-authoritative persistence, the following relational schema is specified for PostgreSQL:

```sql
CREATE TABLE IF NOT EXISTS "CandidateConsents" (
    "Id" VARCHAR(128) PRIMARY KEY,
    "UserId" VARCHAR(128) NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "ConsentType" VARCHAR(64) NOT NULL, -- 'TermsOfService', 'PrivacyPolicy', 'PilotDataSharing'
    "Version" VARCHAR(32) NOT NULL,    -- '2026.1', '2026.2'
    "GivenAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    "IpAddress" VARCHAR(45) NULL,
    "UserAgent" VARCHAR(512) NULL,
    "RevokedAt" TIMESTAMP WITH TIME ZONE NULL,
    "RevocationReason" VARCHAR(256) NULL
);

CREATE INDEX "idx_candidate_consents_user_type" 
ON "CandidateConsents" ("UserId", "ConsentType", "Version");
```

### 2.2 Server-Side Enforcement Flow
1. **Authentication Interception:** Upon login (`POST /api/auth/login`), the session pipeline queries active consent records against the current required policy versions (`TERMS_VERSION`, `PRIVACY_VERSION`).
2. **Consent Gating:** If active consent is missing or outdated, the authentication response flags `requiresConsentUpdate: true`, restricting candidate navigation to `/terms-and-conditions` or `/privacy-policy`.
3. **Attributable Submission:** When candidate submits consent (`POST /api/candidate/consent`), a permanent record is written to `CandidateConsents` and an audit entry `CandidateConsentRecorded` is committed to `AuditLogs`.

---

## 3. Data Retention & Anonymization Lifecycle

### 3.1 Retention Schedules

| Data Category | Retention Period | Storage Location | Post-Retention Action |
| :--- | :--- | :--- | :--- |
| **Active Identity & Credentials** | Duration of active pilot enrollment + 1 year | `Users`, `UserRoles` | Scheduled for anonymization |
| **Session & Access Tokens** | 30 days post-expiry | `UserSessions` | Automated daily purge sweep |
| **Audit & Security Logs** | 7 years (compliance window) | `AuditLogs` | Cold storage archival; PII pseudonymized |
| **Assessment & Attempt Records** | 5 years (educational tracking) | `ExamAttempts`, `AttemptResponses` | Candidate PII anonymized; psychometric data retained |
| **Telemetry & Rate Limit Buckets**| 24 hours post-window | `RateLimitBuckets` | Automated hourly purge sweep |

### 3.2 Right-to-Erasure Workflow (Anonymization Policy)
When a candidate exercises their right to data erasure (or an institutional pilot cohort concludes):
1. Candidate account is deactivated and suspended (`AccountStatus = 'Anonymized'`).
2. Personal identifiers in `Users` (`DisplayName`, `Email`, `PasswordHash`, `PictureUrl`) are replaced with cryptographically one-way hashed pseudonyms:
   $$\text{Pseudonym} = \text{HMAC-SHA256}(\text{UserId}, \text{InstitutionalSalt})$$
3. All active and expired sessions in `UserSessions` are permanently deleted.
4. Assessment attempts in `ExamAttempts` and `AttemptResponses` are dissociated from the real individual but preserved for overall question calibration and psychometric item analysis (Item Response Theory difficulty and discrimination indices).

---

## 4. Institutional Pilot Cohort Governance Boundaries

### 4.1 Data Sharing with Nursing Faculty
Under the authorized `pilot_grant` model:
- Participating nursing school deans and faculty may access aggregate cohort analytics (pass probabilities, domain proficiencies).
- Individual candidate item-level performance may only be disclosed to assigned faculty proctors with active `instructor` or `admin` credentials.
- Export of candidate report data (`GET /api/admin/reports/assessments/export`) requires explicit `reports:export` permission and is logged in `AuditLogs`.

### 4.2 Legal Review Boundary (Product Owner Action Required)
The technical governance architecture specified herein is ready for database migration in the next scheduled feature iteration. Final legal policy approval, privacy policy wording updates, and institutional data processing addenda (DPA) must be formally approved by the Product Owner and institutional partners prior to commercial production rollout.

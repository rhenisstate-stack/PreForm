# PREPFORD NCLEX — PHASE 7.9.3
## WORK PACKAGE M: CANDIDATE DATA GOVERNANCE & PRIVACY COMPLIANCE AUDIT

**Document ID:** `PHASE_7_9_3_CANDIDATE_DATA_GOVERNANCE_AUDIT.md`  
**Phase:** Phase 7.9.3 — Independent Final Acceptance Audit, Security Verification & Controlled Pilot Readiness  
**Work Package:** M (Candidate Data Governance)  
**Execution Date:** 2026-11-06  
**Auditor:** Independent Technical Auditor & Privacy Governance Lead  
**Evaluated Branch:** `feature/dotnet-backend-migration` (HEAD: `6d33fc5`)  
**Legal Frameworks Referenced:** GDPR (EU), Kenya Data Protection Act (KDPA 2019), FERPA (US Higher Education)  

---

## 1. Executive Summary & Audit Mandate

A software platform cannot be represented as legally compliant with GDPR, the Kenya Data Protection Act (KDPA 2019), or educational privacy standards merely because technical access controls exist.

Phase 7.9.2 produced `docs/architecture/PHASE_7_9_2_CANDIDATE_DATA_GOVERNANCE_REMEDIATION.md` outlining a proposed server-authoritative consent architecture and data retention lifecycle. This audit physically inspected the codebase to separate **what is actually implemented in software** from **what is merely specified on paper**, mapped all storage locations of sensitive telemetry, and established the outstanding legal boundaries.

---

## 2. Definitive Governance Classification Matrix

| Governance Dimension | Specific Requirement | Actual Technical Status in Codebase | Classification Category |
| :--- | :--- | :--- | :---: |
| **Candidate Consent Storage** | Server-authoritative `CandidateConsents` table | **NOT IMPLEMENTED.** Table does not exist in PostgreSQL. Cookie/terms consent is tracked purely in client browser `localStorage` (`prepford_cookie_consent`). | **DOCUMENTED DESIGN** |
| **Consent Versioning & Gating** | Re-prompt on Terms/Privacy version update | **NOT IMPLEMENTED.** Login pipeline does not check consent version or redirect to consent forms. | **DOCUMENTED DESIGN** |
| **Consent Withdrawal** | User interface affordance to revoke consent | **NOT IMPLEMENTED.** No candidate self-service consent withdrawal route exists. | **DOCUMENTED DESIGN** |
| **Data Retention Schedules** | Automated purge of expired sessions & buckets | **NOT IMPLEMENTED.** No background job (`IHostedService`) purges `UserSessions`, `AuditLogs`, or `RateLimitBuckets`. | **DOCUMENTED DESIGN** |
| **Account Deletion / Erasure** | Right to erasure (GDPR Art. 17 / KDPA Sec. 40) | **NOT IMPLEMENTED.** No candidate deletion endpoint or anonymization pipeline exists in `ProfileController` or `UsersController`. | **DOCUMENTED DESIGN** |
| **PII Minimization (IP & UA)** | Truncation / hashing of client IP and User-Agent | **PARTIAL.** Stored as raw plaintext strings in `UserSessions` and `AuditLogs`. No IP subnet masking (`/24`) is applied. | **IMPLEMENTED TECHNICAL SAFEGUARD (UNMASKED)** |
| **Candidate Data Export** | Right to data portability (GDPR Art. 20) | **ADMIN ONLY.** `AdminReportsController` provides CSV export (`GET .../export`) for administrators with `reports:export` permission. No candidate self-service export exists. | **PARTIALLY IMPLEMENTED (ADMIN ONLY)** |
| **Audit Logging & Attributability** | Immutable log of security & attempt actions | **IMPLEMENTED.** `AuditLogs` records actor ID, action, entity ID, description, timestamp, and client IP. | **IMPLEMENTED TECHNICAL SAFEGUARD** |
| **Role-Based Access Control** | Least-privilege separation of candidate data | **IMPLEMENTED.** Strict ownership checks in `ExamAttemptsController` prevent candidates from accessing other candidates' records. | **IMPLEMENTED TECHNICAL SAFEGUARD** |
| **Cross-Border Transfer Controls** | Restrictions on transferring student records | **NOT IMPLEMENTED.** No geographic geofencing or jurisdictional routing controls are configured in application code. | **OUTSTANDING OPERATIONAL DECISION** |
| **Institutional Data Agreements** | Data Processing Addenda (DPA) with schools | **OUTSTANDING.** Legal contract templates and institutional agreements require Product Owner and university legal signoff. | **OUTSTANDING LEGAL REVIEW** |

---

## 3. Physical Storage Mapping of Sensitive Telemetry

Inspection of PostgreSQL 16 relational tables mapped where sensitive telemetry is physically persisted:

1. **`Users` Table:**
   - Fields: `Email`, `DisplayName`, `PasswordHash`, `PhoneNumber`, `PictureUrl`, `CreatedAt`, `LastLoginAt`.
   - Security: Passwords hashed via PBKDF2 (`PasswordHasher<User>`). Display names and emails stored in plaintext.
2. **`UserSessions` Table:**
   - Fields: `TokenHash`, `LastIpAddress`, `UserAgent`, `DeviceLabel`, `FingerprintHash`.
   - Security: Session tokens hashed via SHA-256. IP addresses and User-Agent strings stored in plaintext raw strings.
3. **`AuditLogs` Table:**
   - Fields: `ActorId`, `Action`, `EntityId`, `Description`, `IpAddress`, `Timestamp`.
   - Security: Append-only relational table. Descriptions contain candidate email addresses, session IDs, and attempt UUIDs.
4. **`ExamAttempts` & `AttemptResponses` Tables:**
   - Fields: `UserId`, `SelectedOptionsJson`, `TimeSpentSeconds`, `ScorePercent`, `AttemptMetadataSnapshot`.
   - Security: Linked by `UserId`. Psychometric response patterns and answer choices are permanently stored.

---

## 4. Distinction of Responsibilities: Technical vs Legal

To ensure legal integrity, the audit establishes four definitive operational boundaries:

### 4.1 Implemented Technical Safeguards
- Strict ownership verification on all attempt routes (candidates cannot read or tamper with other candidates' exams).
- Role-based administrative restrictions on student report exports.
- Cryptographic hashing of passwords and session tokens.
- Permanent audit logging of authentication, session rotation, and reauthentication events.

### 4.2 Documented Governance Designs (Deferred to Post-Pilot)
- Migration of `CandidateConsents` relational table.
- Scheduled background worker jobs to purge expired sessions and audit entries.
- Automated right-to-erasure account pseudonymization pipeline.
- Candidate self-service data portability export.

### 4.3 Outstanding Legal Review (Product Owner Requirement)
- Platform Terms of Service and Privacy Policy must receive formal external legal review before open-market launch.
- Review must confirm compliance with the Kenya Data Protection Act 2019 (Office of the Data Protection Commissioner - ODPC registration) and international candidate jurisdictions.

### 4.4 Outstanding Operational Decisions (Pilot Authorization Boundary)
- For the **Controlled Institutional Pilot**, participating nursing faculties must execute an **Institutional Pilot Data Agreement / Data Processing Addendum (DPA)** consenting to cohort performance tracking, administrative reporting, and educational telemetry collection.
- Candidates participating in the pilot must be informed via institutional onboarding that their examination attempts are accessible to authorized nursing faculty administrators.

---

## 5. Work Package M Audit Determination

```
========================================================================================
             WORK PACKAGE M DETERMINATION: CONDITIONALLY SATISFIED
             (APPROVED FOR CONTROLLED PILOT; LEGAL DPA REQUIRED)
========================================================================================
```

Technical access controls, ownership boundaries, and audit logging are fully verified and sufficient for an authorized institutional pilot. Full statutory privacy compliance (GDPR/KDPA) requires the documented governance migrations, legal DPA execution, and formal policy sign-off prior to commercial public launch.

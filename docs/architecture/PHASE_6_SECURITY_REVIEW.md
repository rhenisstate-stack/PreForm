# PREPFORD NCLEX — PHASE 6 COMPREHENSIVE SECURITY & PRIVACY REVIEW
## Platform-Wide Threat Model, Identity Isolation, Data Protection & Boundary Defense

**Document File:** `docs/architecture/PHASE_6_SECURITY_REVIEW.md`  
**Phase:** Phase 6 — Product Readiness & Operational Resilience  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Baseline Commit:** `f1beb3148828eed5ee08f83f065515cc44d383a9`  
**Date:** November 5, 2026  
**Auditor Roles:** Application Security Engineer, Security Architect, Penetration Tester  

---

## 1. Threat Model & Security Architecture

PrepFord NCLEX handles high-stakes nursing certification assessments and sensitive candidate performance metrics. The security architecture enforces multi-layered defense-in-depth across the API boundary, session layer, database persistence store, and Next.js BFF gateway.

```mermaid
flowchart TD
    subgraph Untrusted External [Candidate Browser]
        Browser["Learner / Admin Browser"]
    end

    subgraph Perimeter [Next.js BFF Gateway]
        RateLimiter["Rate Limiter & Trusted Proxy"]
        SessionValidator["Session Cookie Decryption & Signature Check"]
        BFFSigner["HMAC-SHA256 Gateway Signer (v1 Protocol)"]
    end

    subgraph Core [ASP.NET Core 8 Web API]
        GatewayAuthHandler["PrepfordAuthHandler (Mutual HMAC Verification)"]
        RBAC["Policy & Role Authorizer (RequireAdmin, RoleHierarchy)"]
        DomainControllers["Controllers (Identity Bound via Claims)"]
    end

    subgraph DataStore [Authoritative PostgreSQL]
        PG[("PostgreSQL 16 (Row-Level Locking & Indexes)")]
    end

    Browser -->|HTTPS Request| RateLimiter
    RateLimiter --> SessionValidator
    SessionValidator --> BFFSigner
    BFFSigner -->|Signed Header (Timestamp, Nonce, BodyHash)| GatewayAuthHandler
    GatewayAuthHandler --> RBAC
    RBAC --> DomainControllers
    DomainControllers --> PG
```

---

## 2. Authentication & Session Security Audits

### 2.1 Password Hashing & Storage
- **Algorithm:** ASP.NET Core `PasswordHasher<User>` utilizing PBKDF2 with HMAC-SHA512, 100,000+ iterations, and 128-bit cryptographic salts.
- **Verification:** Tested in `Phase1SecurityTests.cs`. Zero plaintext passwords or reversible ciphers are stored in the database.

### 2.2 Session Security & Device Management
- **Concurrent Session Policy:** Enforces configurable limits (default 2 active sessions per user) via `SessionSecurityService`.
- **Pre-Authentication Lockout Recovery:** When candidate exceeds limit, `/api/v1/auth/recover-sessions` allows credentials-verified recovery to invalidate stale sessions without requiring superadmin intervention.
- **Remote Revocation:** Candidates can terminate specific sessions or all other active sessions via `/dashboard/settings/security`.
- **Atomic Invalidation:** When a password is reset or a user is revoked, `User.SecurityVersion` is incremented, immediately invalidating all active JWT and session cookies across all devices.

### 2.3 Shared Rate Limiting & DoS Protection
- **Implementation:** `ISharedRateLimitingService` backs rate limits into PostgreSQL (`SecurityRateLimits`), ensuring shared enforcement across load-balanced API instances.
- **Thresholds:**
  - Login / Auth Endpoints: 5 attempts per 15-minute window before triggering lockout.
  - Forgot Password: 3 attempts per IP per 15 minutes.
  - Assessment Re-authentication: 5 attempts per attempt per 15 minutes.

---

## 3. Data Isolation & IDOR Defense

### 3.1 Strict Caller Ownership Enforcement
Insecure Direct Object Reference (IDOR) vulnerabilities are prevented across all candidate workflows by enforcing identity ownership on the server:

1. **Learner Analytics (`LearnerAnalyticsController`):**
   - Endpoints extract candidate identity strictly from authenticated claims (`User.FindFirst(ClaimTypes.NameIdentifier)`).
   - Any query parameter attempting to specify a different `userId` is ignored or rejected. Cross-user inspection yields `403 Forbidden`.
2. **Assessment Attempts (`ExamAttemptsController`):**
   - Every attempt retrieval, answer submission, and completion request verifies `attempt.UserId == caller.userId`.
   - Attempts belonging to other candidates return `403 Forbidden` or `404 Not Found`.
3. **Historical Subscriptions & Orders (`CheckoutController`):**
   - Entitlements and orders are queried strictly using caller identity from claims.

### 3.2 Role-Based Access Control (RBAC) Matrix

| Protected Operation | Target Route | Required Backend Role / Policy | Verification Test |
| :--- | :--- | :--- | :--- |
| **Manage Users & Roles** | `/api/v1/admin/users/*` | `superadmin`, `admin` | `AdminUsersControllerTests.cs` |
| **Manage IP Rules** | `/api/v1/admin/security/ip-rules/*` | `superadmin` | `AdminSecurityControllerTests.cs` |
| **Global Session Policy** | `/api/v1/admin/security/session-policy` | `superadmin` | `AdminSecurityControllerTests.cs` |
| **Question Bank Authoring**| `/api/v1/questions/*` | `content_manager`, `admin`, `superadmin` | `Phase2QuestionBankTests.cs` |
| **Approve Exam Revisions** | `/api/v1/examinations/*/approve` | `admin`, `superadmin` (Separation of duties) | `ExaminationConfigurationAndGovernanceTests.cs` |
| **Administrative Reports** | `/api/v1/admin/reports/*` | `RequireAdmin` (`admin`, `exam_manager`, `superadmin`) | `Phase5AnalyticsAndReportingTests.cs` |
| **System Health Diagnostics**| `/api/v1/admin/monitoring/health` | `RequireAdmin` (`admin`, `superadmin`) | `Phase5AnalyticsAndReportingTests.cs` |

---

## 4. Assessment Integrity & Answer-Key Protection

1. **Question Set Membership:** On every response submission, the server queries `ExamAttemptQuestions` to verify that the submitted `QuestionId` is assigned to this specific attempt. Submitting answers to unassigned questions triggers `403 Forbidden`.
2. **Active Answer Key Concealment:** The active test delivery endpoint (`GET /api/v1/attempts/{id}/questions`) sanitizes questions before returning them:
   - `IsCorrect` flags on options are stripped.
   - Rationales, clinical explanations, and correct answer indices are excluded.
3. **Policy-Governed Post-Submission Review:** Rationales are released strictly according to the exam revision's immutable `ReviewPolicy`:
   - `Immediate`: Rationales available upon completion.
   - `Deferred`: Rationales released only after the exam availability window closes.
   - `Never`: Rationales remain permanently withheld.
4. **Distractor Analysis Concealment:** Question psychometrics in `QuestionAnalyticsService` display distractor frequencies to authorized educators only (`RequireAdmin`), never exposing rationales to candidate endpoints.

---

## 5. Application Security & Vulnerability Controls

### 5.1 Mutual Gateway Authentication (BFF to API)
- The Next.js BFF and ASP.NET Core API communicate via a cryptographically signed gateway protocol:
  - Header: `X-Gateway-Signature: HMAC-SHA256(secret, payload)`
  - Payload: `${timestamp}\n${method}\n${path}\n${nonce}\n${bodyHash}\n${userId}\n${email}\n${role}`
  - Timestamp freshness verified within a 300-second window to prevent replay attacks.
  - Body hash verified against SHA-256 digest to prevent man-in-the-middle tampering.
  - Fail-closed production enforcement: If `GATEWAY_SHARED_SECRET` is missing or default in `production`, both services refuse to boot.

### 5.2 Injection & Data Sanitization
- **SQL Injection:** All PostgreSQL data access utilizes Entity Framework Core parameterized LINQ queries or parameterized ADO.NET commands. Zero dynamic SQL concatenation exists.
- **Cross-Site Scripting (XSS):** React automatically encodes output strings. Rich markdown content is sanitized through standard markdown parsers.
- **Spreadsheet Formula Injection:** `CsvExportService` escapes RFC 4180 special characters and sanitizes formula triggers (`=`, `+`, `-`, `@`) in CSV downloads.

### 5.3 Cookie Security Flags
Session cookies are issued with hardened security attributes:
- `HttpOnly: true` (Prevents client-side JavaScript access).
- `SameSite: Lax` (Defends against Cross-Site Request Forgery).
- `Secure: true` in production (Mandates HTTPS transmission).
- `Path: /` (Bounded scope).

### 5.4 Sensitive Data Protection
- Zero password hashes, session secrets, gateway secrets, or internal exception stack traces are returned in API error responses.
- RFC 7807 problem details mask internal database errors and log technical exceptions with unique correlation IDs for SRE inspection.

---

## 6. Security Review Sign-Off

The PrepFord NCLEX platform enforces comprehensive, defense-in-depth security controls across all architectural layers. The platform maintains candidate privacy, protects examination assets, enforces separation of duties, and defends against unauthorized privilege escalation.

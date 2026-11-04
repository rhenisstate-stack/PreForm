# PREPFORD — SESSION SECURITY, DEVICE MANAGEMENT & AUTHENTICATION HARDENING
## Acceptance Verification Matrix

**Document Reference:** `docs/prepford-session-security-acceptance-matrix.md`  
**Application / Repository:** PrepFord Monorepo (`apps/api`, `apps/web`)  
**Baseline Date:** November 4, 2026  
**Status:** PHASE 4 COMPLETE — VERIFIED LEARNER ACTIVE SESSIONS UI, SELF-SERVICE REVOCATION & SECURITY EVENT FEED  
**Branch:** `feature/dotnet-backend-migration`  

---

## 1. Acceptance Matrix Overview

The following matrix tracks all required capabilities across frontend, backend, database, authorization, and automated testing layers. Every capability must satisfy all columns before final sign-off.

### Status Definitions:
- **AUDITED (GAP IDENTIFIED):** Audited in Phase 0; gap documented; awaiting phase implementation.
- **AUDITED (PARTIAL):** Primitive exists in codebase but requires extension or integration.
- **AUDITED (SOUND / VERIFIED):** Pre-existing architecture satisfies requirements and verified.
- **VERIFIED (PHASE 1):** Verified during Phase 1 (Database Migration & Policy Foundation).
- **VERIFIED (PHASE 2):** Verified during Phase 2 (Backend Engine & Atomic Concurrency).
- **VERIFIED (PHASE 3):** Verified during Phase 3 (BFF Integration, Session ID Synchronization & Client Device Identification).
- **VERIFIED (PHASE 4):** Verified during Phase 4 (Learner Active Sessions UI, Self-Service Revocation & Security Event Feed).
- **IN PROGRESS:** Currently undergoing active implementation.
- **VERIFIED:** Implemented, integrated, and verified by passing automated tests across all layers.

---

## 2. Comprehensive Acceptance Matrix

| # | Capability | Frontend | Backend | Database | Authorization | Tests | Status |
|---|---|---|---|---|---|---|---|
| 1 | **Max Concurrent Sessions Limit (Default 2)** | Displays user-friendly session limit error with link to session manager | Atomic transaction & per-user semaphore enforcing active count $\le$ policy limit | Indexed `IX_UserSessions_UserId_Revoked_AbsoluteExpiresAt` | Server-authoritative; client cannot override | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 2 | **Max Sessions Per Client Limit (Default 1)** | Transmits registered `ClientId` via cookie / header | Detects existing session for same client; replaces/rotates without incrementing count | Indexed `IX_UserSessions_ClientId_Revoked_AbsoluteExpiresAt` | Server-authoritative | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 3 | **Third Login Rejection** | Catches `CONCURRENT_SESSION_LIMIT_EXCEEDED`; renders clear explanation | Rejects 3rd login attempt with HTTP 409 Conflict and structured `ErrorCode` payload | Inserts `AuditLog` event `ConcurrentSessionLimitExceeded` | Anonymous endpoint enforcing authenticated policy | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 4 | **Existing Sessions Intact on Rejection** | No impact to active sessions on other browsers | Active sessions remain untouched in PostgreSQL | Session records maintain `Revoked = false` | System integrity | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 5 | **Server-Enforced Idle Timeout (Default 300 min)** | Intercepts 401 response; displays timeout modal or redirect | Evaluates: `CurrentServerTime >= LastActiveAt + IdleTimeout`; marks expired | Column `IdleExpiresAt` on `UserSession` | Protected endpoints | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 6 | **Server-Enforced Absolute Timeout (Default 10080 min)** | Expiry cannot be extended by tab refresh or page reload | Evaluates: `CurrentServerTime >= CreatedAt + AbsoluteTimeout`; rejects expired | Column `AbsoluteExpiresAt` on `UserSession` | Protected endpoints | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 7 | **Qualifying Activity Definition & Throttling** | Learner actions transmit activity | Throttles DB writes to 5-min intervals; extends idle timeout up to absolute limit | Updates `LastActiveAt` and `IdleExpiresAt` | Server middleware / handler | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 8 | **Background Polling Activity Exclusion** | Automatic analytics / ping requests flag non-qualifying header | Skips extending `IdleExpiresAt` on background polling requests (`isQualifyingActivity: false`) | Read-only; no DB write | Handler filter | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 9 | **Registered Client Identifier (`prepford_client_id`)** | Stored in secure, httpOnly, 365-day browser cookie; validated against `^cid_[0-9a-f]{32}$` | Validates format; binds to `UserSession.ClientId` | Column `ClientId` (max 64) in `UserSessions` | BFF & API | `bff-session-synchronization.test.ts` | VERIFIED (PHASE 3) |
| 10 | **Client Device & User-Agent Parsing** | Displays friendly device name (e.g. "Chrome on Windows") | `DeviceDetectionHelper` parses User-Agent header into browser, OS, and device type | Columns `UserAgent` and `DeviceLabel` on `UserSession` | Informational | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 11 | **Privacy-Conscious Fingerprint Check** | Computes client screen / timezone hash (`fingerprint.ts`) | Compares against `FingerprintHash`; logs audit on suspicious mismatch | Column `FingerprintHash` (max 64) on `UserSession` | Risk evaluation | `FingerprintValidationTests.cs` | AUDITED (GAP IDENTIFIED) |
| 12 | **IP Consistency Disabled by Default** | Seamless network transitions | Allows IP changes without terminating session (`EnforceIpConsistency = false`) | Stores `LastIpAddress` on `UserSession` | Network policy | `IpDriftPolicyTests.cs` | AUDITED (GAP IDENTIFIED) |
| 13 | **IP Drift Allowed by Default** | Learner transitions from Wi-Fi to cellular data without logout | Records informational audit log on IP drift (`AllowIpDrift = true`) | Updates `LastIpAddress` in `UserSession` | Informational | `IpDriftAcceptanceTests.cs` | AUDITED (GAP IDENTIFIED) |
| 14 | **Trusted Proxy IP Derivation & Gateway Verification** | Transmits client IP & HMAC headers (`X-Session-Id`, `X-Client-Id`) through Next.js BFF proxy | Validates `X-Session-Id` against PostgreSQL database via `PrepfordAuthHandler` Pathway B | Records derived IP and verifies session state | Infrastructure security | `SessionSecurityEngineTests.cs`, `bff-session-synchronization.test.ts` | VERIFIED (PHASE 3) |
| 15 | **Credential Rotation on Login** | Updates auth cookie with fresh token and backend `sessionId` | Mints new session token; invalidates prior session for same client | Inserts new `UserSession`; revokes prior client session | Prevent session fixation | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 16 | **Credential Rotation on Password Change** | Updates auth cookie with newly issued session token | Revokes all prior sessions; creates single fresh session | Sets `Revoked = true` on old sessions; updates `PasswordHash` | Profile controller | `PasswordChangeRotationTests.cs` | AUDITED (SOUND / VERIFIED) |
| 17 | **Credential Rotation on Password Reset** | Prompts learner to log in with fresh credentials | Revokes all existing user sessions upon password reset completion | Sets `Revoked = true` on all user sessions; logs event | Account recovery | `PasswordResetRevocationTests.cs` | AUDITED (GAP IDENTIFIED) |
| 18 | **Immediate Privilege Invalidation (Role Change)** | Session context refreshes permissions; rejects stale admin routes | Increments `User.SecurityVersion`; rejects requests where `Session.SecurityVersion != User.SecurityVersion` | Column `SecurityVersion` on `User` and `UserSession` | RBAC guard | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 19 | **Account Deactivation Revocation** | Redirects deactivated user to sign-in with account notice | Checks `User.IsActive`; revokes all active sessions immediately | Sets `IsActive = false` on `User`; `Revoked = true` on sessions | Account lifecycle | `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 2) |
| 20 | **Learner Active Sessions View (`/dashboard/settings/security`)** | Responsive cards showing device, browser, OS, IP, active time | `GET /api/v1/security/sessions` returns active sessions for caller | Queries `UserSessions` where `UserId == caller.Id && !Revoked` | Ownership verified | `learner-security-settings.test.tsx`, `LearnerSecurityControllerTests.cs` | VERIFIED (PHASE 4) |
| 21 | **Current Session Identification** | Displays prominent green "Current Device / Session" badge | Flags `isCurrent: true` for the session matching caller's token/claim | Compares `UserSession.Id == callerSessionId` | Ownership verified | `learner-security-settings.test.tsx`, `LearnerSecurityControllerTests.cs` | VERIFIED (PHASE 4) |
| 22 | **Learner Terminate Specific Session** | "Terminate" button with confirmation modal and feedback | `DELETE /api/v1/security/sessions/{sessionId}` revokes target session | Sets `Revoked = true`, `RevokedAt = now`, `Reason = "UserRevoked"` | Ownership verified | `learner-security-settings.test.tsx`, `bff-security-routes.test.ts`, `LearnerSecurityControllerTests.cs` | VERIFIED (PHASE 4) |
| 23 | **Learner Terminate All Other Sessions** | "Log Out Other Sessions" button with confirmation dialog | `POST /api/v1/security/sessions/revoke-others` revokes all except current | Sets `Revoked = true` on all sessions where `Id != currentId` | Ownership verified | `learner-security-settings.test.tsx`, `bff-security-routes.test.ts`, `LearnerSecurityControllerTests.cs` | VERIFIED (PHASE 4) |
| 24 | **Learner Terminate All Sessions** | "Sign Out This Device" / "Log Out Everywhere"; clears local cookies; redirects | `POST /api/v1/security/sessions/revoke-all` revokes all user sessions | Sets `Revoked = true` on all sessions for user | Ownership verified | `bff-security-routes.test.ts`, `LearnerSecurityControllerTests.cs` | VERIFIED (PHASE 4) |
| 25 | **Learner Security Event History** | Displays list of recent logins, password updates, terminations | `GET /api/v1/security/events` returns audit logs for caller | Queries `AuditLogs` where `ActorId == caller.Id` | Ownership verified | `learner-security-settings.test.tsx`, `bff-security-routes.test.ts`, `LearnerSecurityControllerTests.cs` | VERIFIED (PHASE 4) |
| 26 | **Super Admin Session Policy View (`/admin/security/sessions`)** | Form displaying current limits, timeouts, rotation toggles | `GET /api/v1/admin/security/session-policy` returns active policy | Queries `SessionSecurityPolicy` singleton | `RequireSuperAdmin` | `admin-security-dashboard.test.tsx`, `bff-admin-security-routes.test.ts`, `AdminSecurityControllerTests.cs` | VERIFIED (PHASE 5) |
| 27 | **Super Admin Session Policy Update** | Form submission with validation, loading states, and toasts | `PUT /api/v1/admin/security/session-policy` updates policy & version | Updates `SessionSecurityPolicy`; increments `PolicyVersion` | `RequireSuperAdmin` | `admin-security-dashboard.test.tsx`, `bff-admin-security-routes.test.ts`, `AdminSecurityControllerTests.cs` | VERIFIED (PHASE 5) |
| 28 | **Admin Policy Form Validation** | Validates positive integers; ensures `IdleTimeout <= AbsoluteTimeout` | Backend validates input model; rejects invalid ranges with 400 | Constraints on policy model | Validation filters | `admin-security-dashboard.test.tsx`, `bff-admin-security-routes.test.ts`, `AdminSecurityControllerTests.cs` | VERIFIED (PHASE 5) |
| 29 | **Admin Policy Reset to Defaults** | "Reset to Defaults" button restores approved platform defaults | Re-applies canonical defaults (2 sessions, 300m idle, etc.) | Updates `SessionSecurityPolicy` record | `RequireSuperAdmin` | `admin-security-dashboard.test.tsx`, `bff-admin-security-routes.test.ts`, `AdminSecurityControllerTests.cs` | VERIFIED (PHASE 5) |
| 30 | **Admin Active Sessions Monitoring** | Paginated table with user search, status filters, and device tags | `GET /api/v1/admin/security/sessions` returns paginated sessions | Queries `UserSessions` with joins on `Users` | `RequireSuperAdmin` | `admin-security-dashboard.test.tsx`, `bff-admin-security-routes.test.ts`, `AdminSecurityControllerTests.cs` | VERIFIED (PHASE 5) |
| 31 | **Admin Administrative Revocation** | "Revoke" button with required administrative reason input | `POST /api/v1/admin/security/sessions/{id}/revoke` revokes session | Sets `Revoked = true`, `Reason = "AdminRevoked"` | `RequireSuperAdmin` | `admin-security-dashboard.test.tsx`, `bff-admin-security-routes.test.ts`, `AdminSecurityControllerTests.cs` | VERIFIED (PHASE 5) |
| 32 | **Admin Audit Logging Without Secrets** | Redacts tokens, passwords, and secrets from all logs | Inserts sanitized description and outcome into `AuditLogs` | `AuditLogs` entity | System logging | `SessionSecurityEngineTests.cs`, `AdminSecurityControllerTests.cs` | VERIFIED (PHASE 5) |
| 33 | **Examination Answer Preservation on Expiry** | Answers already persisted in DB remain intact upon auth timeout | `AttemptResponses` committed in PostgreSQL are never purged | `AttemptResponses` table | Candidate attempt ownership | `AttemptResponsePreservationTests.cs` | AUDITED (SOUND / VERIFIED) |
| 34 | **Examination Timer Preservation on Expiry** | Timer countdown does not reset or jump forward on reauth | `ExamAttempt.StartedAt` remains unchanged; deadline enforced | `ExamAttempts.StartedAt` immutable | Timer calculation | `ExamTimerPreservationTests.cs` | AUDITED (SOUND / VERIFIED) |
| 35 | **In-Exam Inline Reauthentication Modal** | Modal prompt enters password; avoids page reload or loss of focus | Authenticates credentials; issues new session; retries answer | `UserSessions` created | Candidate auth | `InExamReauthModal.test.tsx` | AUDITED (GAP IDENTIFIED) |
| 36 | **Adaptive CAT Continuity** | Reauthentication does not alter question sequence or item pool | CAT state engine resumes from exact question index | `ExamAttemptQuestions` authority | Assessment engine | `CatContinuityTests.cs` | AUDITED (SOUND / VERIFIED) |
| 37 | **Cross-User Session Isolation** | Candidate cannot see or revoke another candidate's sessions | Ownership checks enforce: `session.UserId == caller.Id` (403 on cross-user revocation) | EF Core query filter | Authorization checks | `LearnerSecurityControllerTests.cs`, `SessionSecurityEngineTests.cs` | VERIFIED (PHASE 4) |
| 38 | **Non-Destructive Database Migration** | Schema updates run via standard EF Core migration pipeline | `0009_AddSessionSecurityAndDeviceManagement` with safe defaults | Adds columns & tables to `public` schema | Database admin | `SessionSecurityPolicyDatabaseTests.cs` | VERIFIED (PHASE 1) |

---

## 3. Phase 2 Verification Sign-Off

All Phase 2 core backend session security engine capabilities, atomic concurrency guarantees, timeout boundaries, activity throttling, security-version checks, and regression tests have been implemented and verified with passing automated tests.

---

## 4. Phase 3 Verification Sign-Off

All Phase 3 BFF integration, session ID synchronization, client identification, gateway HMAC header forwarding, and end-to-end authentication route lifecycle capabilities have been implemented and verified with passing automated tests across both backend xUnit and frontend Vitest suites:
- **Backend Session ID Synchronization:** Authoritative backend PostgreSQL `UserSession.Id` is consumed by the BFF and signed into the `prepford_session` cookie's `sid` claim.
- **Client Identification:** Canonical `prepford_client_id` cookie (`cid_[0-9a-f]{32}`) issued with 1-year lifespan, strictly validated, and bound to backend session records.
- **Gateway Forwarding & Validation:** Canonical HMAC gateway headers (`X-Session-Id`, `X-Client-Id`) forwarded by BFF and strictly validated against live PostgreSQL session records in `PrepfordAuthHandler` (Pathway B).
- **Concurrency & Rotation:** Same-client rotation preserves single-session-per-client semantics; 3rd concurrent session rejections propagate structured HTTP 409 responses to learners.
- **Revocation & Logout:** Logout revokes session records in PostgreSQL and clears cookies; 401 unauthenticated API responses immediately clear expired cookies.
- **Preservation & Continuity:** Assessment answers and CAT exam continuity verified untouched across authentication boundaries.

---

## 5. Phase 4 Verification Sign-Off

All Phase 4 Learner Active Sessions UI, self-service revocation affordances, and user-scoped security event feed capabilities have been implemented and verified with passing automated tests across ASP.NET Core backend and Next.js frontend/BFF suites:
- **Learner Active Sessions UI (`/dashboard/settings/security`):** Fully responsive, WCAG-accessible interface displaying signed-in devices, operating system, browser, relative activity, sign-in timestamp, and safe IP information.
- **Current Session Identification:** Prominent distinctive badge ("Current Device / Session") identifying caller's active session without relying on client-supplied identifiers.
- **Self-Service Revocation with Confirmation:** Interactive confirmation modals for terminating individual remote sessions and "Log Out Other Sessions" while strictly preserving the current session.
- **Security Event History Feed:** User-scoped, sanitized audit history displaying recent sign-ins, device terminations, and password changes with outcomes and timestamps.
- **Server-Authoritative Isolation:** Backend `SecurityController` strictly prevents querying or revoking any session belonging to another learner (returns HTTP 403 and logs unauthorized attempt).
- **All Automated Tests Passing:** 8 new backend xUnit tests (`LearnerSecurityControllerTests.cs`), 12 new BFF Vitest tests (`bff-security-routes.test.ts`), and 7 new UI Vitest tests (`learner-security-settings.test.tsx`), with zero regressions across the 311-test backend and 439-test frontend regression suites.

---

## 6. Phase 5 Verification Sign-Off

All Phase 5 Super Admin session security policy, optimistic concurrency governance, real-time active session monitoring, administrative revocation affordances, and sanitized security event visibility capabilities have been implemented and verified with passing automated tests across ASP.NET Core backend and Next.js frontend/BFF suites:
- **Super Admin Session Security Dashboard (`/admin/security/sessions`):** Fully responsive, tabbed administration interface with real-time security overview metrics (active sessions, distinct learners, expiring soon, 24h revocations, 24h limit rejections, 24h credential rotations).
- **Global Session Security Policy Governance:** Authoritative policy form consuming backend singleton `SessionSecurityPolicy`. Full validation preventing invalid ranges, non-positive limits, and inverted timeout windows (`IdleTimeoutMinutes <= AbsoluteTimeoutMinutes`).
- **Optimistic Concurrency Protection:** Backend and BFF enforce `PolicyVersion` checks returning HTTP 409 Conflict if policy state has evolved concurrently, preventing silent overwrites.
- **Safe Reset to System Platform Defaults:** Confirmation modal restores canonical system defaults (2 concurrent sessions, 1 session per client, 300m idle, 10,080m absolute, same-client rotation enabled) while preserving `PolicyVersion` concurrency semantics.
- **Active Session Monitoring & Search:** Paginated, server-filtered active sessions table supporting query search across learner name, email, IP, and client ID, with status filtering (`all`, `active`, `idle`, `revoked`).
- **Administrative Revocation with Mandatory Audit Reason:** Individual session revocation modal and user-wide revocation modal requiring explicit administrative reason, immediately setting `Revoked = true` in PostgreSQL and terminating access.
- **Administrative Audit Feed:** Tabular visibility into sensitive authentication, session creation, limit rejection, and administrative policy events with actor, target, IP, and outcome metadata, free of tokens or credentials.
- **Strict Super Admin RBAC Enforcement:** Backend `[Authorize(Policy = "RequireSuperAdmin")]` and BFF `isSuperAdmin(session.role)` restrict access to `superadmin` role only; standard administrators, instructors, and learners are strictly rejected with HTTP 403.
- **All Automated Tests Passing:** 9 new backend xUnit tests (`AdminSecurityControllerTests.cs`), 12 new BFF Vitest tests (`bff-admin-security-routes.test.ts`), and 7 new UI Vitest tests (`admin-security-dashboard.test.tsx`), with zero regressions across the 320-test backend and 458-test frontend regression suites.

# PREPFORD — SESSION SECURITY, DEVICE MANAGEMENT & AUTHENTICATION HARDENING
## Phase Zero: Comprehensive Authentication and Session Security Audit

**Document Reference:** `docs/prepford-session-security-audit.md`  
**Application / Repository:** PrepFord Monorepo (`apps/api`, `apps/web`)  
**Audit Baseline Date:** November 4, 2026  
**Active Branch:** `feature/dotnet-backend-migration`  
**Execution Environment:** OpenCode in VS Code (Windows x64)  
**Status:** COMPLETE (Phase 0 Audit) — Gated for Review & Approval  
**Auditor Roles:** Principal Software Architect, Application Security Specialist, Senior ASP.NET Core & Next.js Engineer, PostgreSQL Specialist  

---

## 1. Executive Summary & Scope

An exhaustive architectural audit of PrepFord's authentication, session management, client identification, and examination continuity layers was conducted. PrepFord is a mission-critical NCLEX-RN and NCLEX-PN adaptive test-preparation platform comprising:
- **Backend API:** ASP.NET Core 8 Web API (`apps/api`) with Entity Framework Core 8 and Npgsql PostgreSQL.
- **Frontend & BFF:** Next.js 16 (App Router, React 19, TypeScript) with Tailwind CSS, shadcn/ui primitives, and server-side Route Handlers.
- **Mutual Security:** Custom `PrepfordAuth` authentication scheme supporting both direct `Bearer` session tokens and an HMAC-SHA256 signed mutual gateway between Next.js BFF and ASP.NET Core.

The primary objective of this audit is to design and implement a comprehensive **Session Security, Device Management, and Authentication Hardening System** without rebuilding existing authentication from scratch and without introducing a secondary authentication provider.

### Audit Verdict Summary
1. **Existing Architecture is Sound but Partially Decoupled:**
   The application already features strong primitives: ASP.NET Core PBKDF2 password hashing (`IPasswordHasher<User>`), a PostgreSQL `UserSessions` entity, mutual HMAC-SHA256 BFF gateway signing with replay prevention (`GatewayReplayProtection`), and deterministic RBAC hierarchy (`RoleHierarchy`).
2. **Critical Session Decoupling Gap:**
   While the ASP.NET Core API persists a `UserSession` record into PostgreSQL upon login, the Next.js BFF currently ignores the backend-generated session ID and mints a local in-memory session (`memorySessions` map in `apps/web/src/lib/session.ts`). Consequently, the session ID transmitted in BFF `X-Session-Id` headers does not match the database session record, causing backend revocation and idle-timeout checks to fail open or remain ineffective for BFF traffic.
3. **Missing Session Security Governance:**
   There are currently no concurrent session limits (users can maintain infinite concurrent logins), no per-client session limits, no idle timeout enforcement (only static 7-day or 30-day absolute expiration), no client/device identification cookies, no user-agent parsing, no IP drift policy configuration, no session management UI for learners, and no administrative policy configuration interface.
4. **Examination & CAT Integrity:**
   Examination attempts (`ExamAttempt`), question allocations (`ExamAttemptQuestion`), and submitted answers (`AttemptResponses`) are server-authoritative and relational in PostgreSQL. An authentication expiration during an exam correctly rejects new submissions without destroying already-persisted answers. However, there is no in-exam reauthentication or attempt recovery flow, which can cause learners to lose in-flight UI state if redirected away to `/sign-in`.

---

## 2. Existing Authentication Architecture

### 2.1 Backend ASP.NET Core Authentication (`apps/api`)

The backend is configured in `Program.cs` (lines 43-69) with a custom authentication scheme named `PrepfordAuth` handled by `PrepfordAuthHandler`:

```csharp
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = PrepfordAuthSchemeOptions.SchemeName;
    options.DefaultChallengeScheme = PrepfordAuthSchemeOptions.SchemeName;
})
.AddScheme<PrepfordAuthSchemeOptions, PrepfordAuthHandler>(PrepfordAuthSchemeOptions.SchemeName, null);
```

`PrepfordAuthHandler` supports two distinct authentication pathways in priority order:

1. **Pathway A: Direct Bearer Session Token**
   - **Header:** `Authorization: Bearer prf_sess_<64 hex chars>`
   - **Validation:** Calls `ISessionService.ValidateTokenAsync(token)`.
   - **Mechanism:** Computes SHA-256 hash of the token (`TokenHash`), queries `AppDbContext.UserSessions.Include(s => s.User)` for a record where `TokenHash == hash && !Revoked && ExpiresAt > DateTime.UtcNow && User.IsActive`.
   - **Activity Tracking:** Updates `session.LastActiveAt = DateTime.UtcNow` on every valid Bearer request.
   - **Claims Issued:** `ClaimTypes.NameIdentifier` (UserId), `ClaimTypes.Email`, `ClaimTypes.Role`, `ClaimTypes.Name`, `sessionId`, `csrfToken`.

2. **Pathway B: Mutual Gateway HMAC Authentication (Next.js BFF Proxy)**
   - **Headers:** `X-Gateway-Signature`, `X-Authenticated-User-Id`, `X-Authenticated-User-Email`, `X-Authenticated-User-Role`, `X-Authenticated-User-Name`, `X-Gateway-Timestamp`, `X-Gateway-Nonce`, `X-Gateway-Content-SHA256`, `X-Gateway-Signature-Version`, `X-Session-Id`.
   - **Validation:**
     - Computes HMAC-SHA256 of canonical string: `timestamp\nmethod\ncanonicalPath\nnonce\nbodyHash\nuserId\nemail\nrole`.
     - Validates secret key `GATEWAY_SHARED_SECRET`.
     - Checks timestamp freshness against clock skew ($\le 60\text{ seconds}$).
     - Records and checks nonces in `GatewayReplayProtection` to block replay attacks.
     - Performs fixed-time byte comparison (`CryptographicOperations.FixedTimeEquals`).
     - Performs PostgreSQL revocation check if `X-Session-Id` is supplied:
       ```csharp
       if (!string.IsNullOrWhiteSpace(sessionId))
       {
           using var scope = _serviceProvider.CreateScope();
           var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
           var sessionRecord = await db.UserSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sessionId);
           if (sessionRecord != null && (sessionRecord.Revoked || sessionRecord.ExpiresAt <= DateTime.UtcNow))
           {
               return AuthenticateResult.Fail("Authoritative session has been revoked or expired in datastore.");
           }
       }
       ```
     - Claims Issued: `NameIdentifier`, `Email`, `Role`, `Name`, `authSource = "gateway"`, and optionally `sessionId`.

### 2.2 Frontend & Next.js BFF Authentication (`apps/web`)

1. **Client Forms:**
   - Sign-in form at `/sign-in` submits `POST /api/auth/login`.
   - Sign-up form at `/sign-up` submits `POST /api/auth/register`.
2. **Next.js Route Handlers (BFF):**
   - `apps/web/src/app/api/auth/login/route.ts` validates input via Zod schema `signInSchema`.
   - BFF calls `authService.login({ email, password, rememberMe })`.
   - `authService.login` dispatches an HTTP POST to ASP.NET Core `/api/v1/auth/login`.
   - On success, Next.js calls `createServerSession(...)` in `session.ts`.
   - Next.js issues an HTTP-only cookie named `prepford_session` (and legacy fallback `preform_session`).
   - Cookie attributes: `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, `path: "/"`.
3. **Cookie Payload:**
   - Cryptographically signed using HMAC-SHA256 with `SESSION_SECRET`: `<base64urlPayload>.<base64urlSignature>`.
   - Payload contains: `{ sid, sub, email, role, displayName, csrfToken, iat, exp, expiresAt }`.

---

## 3. Database Inspection & Domain Models

### 3.1 Existing Identity Entities (`apps/api/Models/Identity.cs`)

| Entity | Table Name | Key Fields | Constraints / Indexes |
|---|---|---|---|
| `User` | `"Users"` | `Id`, `Email`, `PasswordHash`, `DisplayName`, `Pathway`, `TargetExamDate`, `ActivePlan`, `EmailNotifications`, `StudyReminders`, `IsActive`, `HasProfileImage`, `ProfileImageUpdatedAt`, `CreatedAt`, `UpdatedAt` | `IX_Users_Email` (Unique), `IX_Users_IsActive` |
| `UserSession` | `"UserSessions"` | `Id`, `UserId`, `Email`, `Role`, `DisplayName`, `TokenHash`, `CsrfToken`, `CreatedAt`, `ExpiresAt`, `LastActiveAt`, `Revoked` | `IX_UserSessions_TokenHash` (Unique), `IX_UserSessions_UserId_Revoked`, `IX_UserSessions_Email_Revoked`, FK to `Users` (Cascade) |
| `Role` | `"Roles"` | `Id`, `Name`, `Description`, `IsSystem`, `CreatedAt` | `IX_Roles_Name` (Unique) |
| `Permission` | `"Permissions"` | `Id`, `Key`, `Name`, `Category` | `IX_Permissions_Key` (Unique) |
| `RolePermission` | `"RolePermissions"` | `RoleId`, `PermissionId` | Composite PK, FK to `Roles`, FK to `Permissions` |
| `UserRole` | `"UserRoles"` | `UserId`, `RoleId`, `AssignedAt` | Composite PK, FK to `Users`, FK to `Roles` |
| `AuditLog` | `"AuditLogs"` | `Id`, `ActorId`, `Action`, `EntityType`, `EntityId`, `Description`, `Outcome`, `IpAddress`, `Timestamp` | `IX_AuditLogs_ActorId`, `IX_AuditLogs_Action`, `IX_AuditLogs_Timestamp` |

### 3.2 Existing Migration History (`apps/api/Migrations`)

The database has 8 applied EF Core migrations:
1. `0001_CreateProgrammes`
2. `0002_AddMasterDomainModels`
3. `0003_AddUserProfileImages`
4. `0004_HarmonizeBackendSchema` (Created `Users`, `UserSessions`, `Roles`, `Permissions`, `AuditLogs`, etc.)
5. `0005_AddStudyStudioFlashcards`
6. `0006_AddQuestionTypeCapabilityAndStatus`
7. `0007_AddExaminationLifecycleAndSnapshot`
8. `0008_AddExamQuestionMembershipUniqueIndex`

**Notice:** All migrations execute against PostgreSQL schema `public` with `__EFMigrationsHistory`. Any new schema modifications must be packaged as an additive, non-destructive migration `0009_AddSessionSecurityAndDeviceManagement`.

---

## 4. Token & Cookie Lifecycle Analysis

### 4.1 Token Issuance
- Upon login, `SessionService.CreateSessionAsync` generates a 256-bit cryptographically secure token:
  `prf_sess_` + 64 lowercase hex characters.
- Token is hashed with SHA-256 (`TokenHash`) and persisted into PostgreSQL `UserSessions`.
- Expiry is set to either 7 days (`rememberMe == false`) or 30 days (`rememberMe == true`).
- `Token` is returned in `AuthResponse { Success = true, Token = token, User = ... }`.

### 4.2 BFF Cookie Creation & The Decoupling Bug
In `apps/web/src/app/api/auth/login/route.ts`:
```typescript
const apiRes = await authService.login({ email, password, rememberMe });
// ...
const serverSession = createServerSession({
  userId,
  email,
  role,
  displayName,
  rememberMe,
});
```
Inside `createServerSession`:
```typescript
const sessionId = `sess_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
// Persisted only in memorySessions.set(sessionId, sessionRecord);
```
**Critical Defect Identified:**
1. The backend `UserSession` in PostgreSQL has `Id = "sess_" + Guid.NewGuid().ToString("N")`.
2. The BFF creates its own independent `sessionId = "sess_" + Date.now() + "_" + randomBytes`.
3. The BFF does NOT record the backend's `UserSession.Id`.
4. When BFF makes authenticated calls to the ASP.NET Core backend, it transmits `X-Session-Id: session.sessionId`.
5. In `PrepfordAuthHandler.cs` (line 226):
   `var sessionRecord = await db.UserSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sessionId);`
   Because `sessionId` does not match the PostgreSQL record, `sessionRecord` is `null`. The revocation and expiration check evaluates to `false`, effectively bypassing server-side database revocation for BFF traffic!
6. If the Next.js process restarts, `memorySessions` is cleared, but cookies remain valid based on HMAC signature alone.

---

## 5. Existing Session Revocation Capability

### 5.1 Current Backend Capabilities
- `ISessionService.RevokeSessionAsync(sessionId)`: Marks `UserSession.Revoked = true`.
- `ISessionService.RevokeAllUserSessionsAsync(userId)`: Marks all sessions for a user as `Revoked = true`.
- `AuthController.Logout` (`POST /api/v1/auth/logout`): Reads caller's `sessionId` claim and revokes it.
- `AuthController.RevokeSession` (`POST /api/v1/auth/revoke-session`):
  - Validates ownership: caller cannot revoke another user's session unless caller holds an administrative role (`superadmin`, `admin`, `administrator`).
  - Supports single session revocation (`request.SessionId`) or all-session revocation (`request.RevokeAll = true`).
- `ProfileController.ChangePassword`: Updates password hash, invokes `RevokeAllUserSessionsAsync(user.Id)`, and creates a single fresh session for the caller.

### 5.2 Current Missing Revocation Capabilities
- No capability to revoke "all other sessions except current".
- No tracking of revocation timestamp (`RevokedAt`) or reason (`RevocationReason`).
- Role/permission mutations do not revoke sessions or increment user security version.
- Account deactivation does not proactively revoke sessions.
- No automatic eviction or cleanup for expired sessions.

---

## 6. Next.js BFF Security & Mutual Gateway Evaluation

### 6.1 Mutual HMAC-SHA256 Gateway Protocol
The BFF communication layer in `apps/web/src/lib/api-client.ts` implements a hardened mutual authentication scheme:
- `createCanonicalGatewayAuthHeaders(...)` produces:
  - `X-Gateway-Timestamp`: Unix epoch seconds.
  - `X-Gateway-Nonce`: 16-byte random hex string.
  - `X-Gateway-Content-SHA256`: SHA-256 digest of request body (or empty body hash).
  - `X-Gateway-Signature-Version`: `"1"`.
  - `X-Gateway-Signature`: HMAC-SHA256 hex digest over canonical string.
- This protocol guarantees request authenticity and integrity between Next.js and ASP.NET Core while preventing replay attacks.
- However, as noted in Section 4, because the BFF's `sessionId` is decoupled from PostgreSQL `UserSessions`, the session-level revocation checks across the gateway are non-functional.

---

## 7. RBAC & Privilege Hierarchy Analysis

### 7.1 Authoritative Hierarchy (`RoleHierarchy.cs`)
PrepFord implements a deterministic descending role hierarchy:
1. `superadmin`
2. `admin` / `administrator` (normalized to `admin`)
3. `exam_manager`
4. `content_manager`
5. `reviewer`
6. `instructor`
7. `candidate` (default)

### 7.2 Authorization Policies
- `RequireAdmin`: `admin`, `superadmin`, `administrator`
- `RequireSuperAdmin`: `superadmin`
- `RequireContentManager`: `content_manager`, `admin`, `superadmin`, `administrator`
- `RequireExamManager`: `exam_manager`, `superadmin`

### 7.3 Privilege Change Invalidation Gap
When a user's role is modified (e.g., from `candidate` to `admin`, or removing `superadmin` privileges):
- The `UserRoles` table is updated in PostgreSQL.
- However, active `UserSessions` retain their old `Role` string in `UserSession.Role`.
- The Next.js session cookie retains the old role in its signed claims.
- The user is neither logged out nor forced to refresh privileges.
- An evicted administrator can continue executing administrative actions until the session token expires days later.

---

## 8. Existing Audit Logging Infrastructure

### 8.1 Database Entity
`AuditLog` records:
- `ActorId`, `Action`, `EntityType`, `EntityId`, `Description`, `Outcome`, `IpAddress`, `Timestamp`.

### 8.2 Currently Audited Events
- `UserRegistered`
- `UserLoginSuccess`
- `UserLoginFailed`
- `RevokeAllUserSessions`
- `ProfileUpdated`
- `PasswordChanged`

### 8.3 Security Audit Gaps
- No audit entries are created when:
  - Concurrent session limit is exceeded.
  - Client session limit is exceeded.
  - An idle timeout expires.
  - An absolute timeout expires.
  - Suspicious client fingerprint or user-agent change is detected.
  - An IP drift occurs.
  - An administrator modifies global session security policy.
  - An administrator revokes a user's session.
- There are no API endpoints or UI components for learners or administrators to query security audit history.

---

## 9. Existing Examination & Adaptive CAT Session Continuity

### 9.1 Relational Architecture in PostgreSQL
- `Examination`: Permanent code (`RN-EX-000001`), pathway (`rn`/`pn`), title, creator.
- `Exam`: Versioned revision with `LifecycleState` (Draft, InReview, Approved, Published, Archived, Retired), `PassingScorePercent`, and `TimeLimitMinutes`.
- `ExamAttempt`: `UserId`, `ExamId`, `Status` (InProgress, Completed, Abandoned), `StartedAt`, `CompletedAt`, `MetadataSnapshot` (frozen jsonb).
- `ExamAttemptQuestion`: Locks the exact relational question membership assigned to this attempt.
- `AttemptResponse`: Stores `SelectedOptionsJson`, `GradingState` (Graded/Ungraded), `ScoreAwarded`, `TimeSpentSeconds`, `AnsweredAt`.

### 9.2 Attempt Lifecycle & Timer Authority
- **Timer Authority:** Server authoritative. Expiration is calculated from `StartedAt + TimeLimitMinutes`.
- **Response Persistence:** When a candidate answers a question, the response is immediately submitted to `POST /api/v1/exam-attempts/{id}/responses` or cached in `localStorage` and synced via `POST /api/v1/exam-attempts/sync`.
- **Session Expiry Impact:**
  - If a learner's authentication session expires while in an examination:
    - Subsequent API calls return HTTP 401 Unauthorized.
    - All previously persisted responses in `AttemptResponses` remain safely committed in PostgreSQL.
    - `StartedAt` is NOT modified.
    - However, if the frontend navigation redirects the candidate to `/sign-in` without preserving attempt context, the candidate experiences UI disruption.
    - Reauthentication must cleanly restore the exact attempt without resetting timer, without altering question order, and without creating duplicate attempts.

---

## 10. Gap Analysis & Missing Functionality

| # | Master Prompt Requirement | Existing Status | Defect / Architectural Gap |
|---|---|---|---|
| 1 | Limit concurrent sessions per user (default 2) | Missing | Any number of concurrent sessions can be created. 3rd login is not rejected. |
| 2 | Limit sessions per registered client (default 1) | Missing | No client registration. Repeated logins from same client create duplicate active sessions. |
| 3 | Idle timeout enforcement (default 300 min) | Missing | No idle timeout. `LastActiveAt` updated but never checked for timeout expiration. |
| 4 | Absolute timeout enforcement (default 10080 min) | Partial | Static 7 or 30-day token expiration exists, but not configurable or coordinated with policy. |
| 5 | Registered client identifier & fingerprint check | Missing | No client ID cookie (`prepford_client_id`), no device fingerprinting or user-agent parsing. |
| 6 | IP address consistency & drift policy | Missing | IP address is not stored on `UserSession`. No policy to differentiate drift from attack. |
| 7 | Rotate credentials on login, password, privilege | Partial | Password change rotates; login creates new session without replacing old; privilege change does not rotate. |
| 8 | Learner active sessions interface (`/dashboard/settings/security`) | Missing | Profile has password change only. No session listing, device details, or revocation controls. |
| 9 | Admin session security policy management (`/admin/security/sessions`) | Missing | No `SessionSecurityPolicy` entity, no admin API, no admin policy UI. |
| 10 | Admin active session monitoring & revocation | Missing | No admin view of active sessions, no filtering, no administrative revocation tools. |
| 11 | Security versioning & privilege change revocation | Missing | No `SecurityVersion` column on `User` or `UserSession`. Privileges stay active after role change. |
| 12 | Examination & CAT continuity during auth expiry | Partial | DB state is safe, but frontend lacks attempt recovery dialog and safe return URL handling. |

---

## 11. Proposed Database Model & Migration Design

To support all authoritative session security policies without duplicate tables, we extend existing models and introduce a single singleton policy entity.

### 11.1 Extend `User` Entity (`apps/api/Models/Identity.cs`)
- `SecurityVersion` (`int`, default `1`): Increments whenever the user's password, roles, or security permissions change. Used for immediate revocation of stale tokens.

### 11.2 Extend `UserSession` Entity (`apps/api/Models/Identity.cs`)
- `ClientId` (`string`, max 64, required): Securely generated random client ID bound to the browser cookie.
- `IdleExpiresAt` (`DateTime`, UTC): Dynamic idle expiration timestamp updated on qualifying activity.
- `AbsoluteExpiresAt` (`DateTime`, UTC): Fixed ceiling timestamp calculated at session creation.
- `RevokedAt` (`DateTime?`, UTC, nullable): Timestamp when the session was invalidated.
- `RevocationReason` (`string?`, max 64, nullable): Machine-readable revocation reason.
- `LastIpAddress` (`string?`, max 64, nullable): Observed client IP address.
- `UserAgent` (`string?`, max 512, nullable): Browser user-agent string.
- `DeviceLabel` (`string?`, max 128, nullable): Human-readable device/browser string (e.g. "Chrome 130 on macOS").
- `FingerprintHash` (`string?`, max 64, nullable): SHA-256 hash of browser fingerprint signals.
- `SecurityVersion` (`int`, default `1`): The user's `SecurityVersion` at the time of session issuance.

### 11.3 New `SessionSecurityPolicy` Entity (`apps/api/Models/Identity.cs`)
- `Id` (`string`, PK, default `"global_policy"`)
- `MaxConcurrentSessions` (`int`, default `2`)
- `MaxSessionsPerClient` (`int`, default `1`)
- `IdleTimeoutMinutes` (`int`, default `300` — 5 hours)
- `AbsoluteTimeoutMinutes` (`int`, default `10080` — 7 days)
- `EnforceFingerprint` (`bool`, default `true`)
- `EnforceIpConsistency` (`bool`, default `false`)
- `AllowIpDrift` (`bool`, default `true`)
- `RotateOnLogin` (`bool`, default `true`)
- `RotateOnPrivilegeChange` (`bool`, default `true`)
- `RotateOnPasswordChange` (`bool`, default `true`)
- `PolicyVersion` (`int`, default `1`)
- `UpdatedAt` (`DateTime`, UTC)
- `UpdatedBy` (`string?`, max 128)
- `IsActive` (`bool`, default `true`)

### 11.4 Indexes & Constraints
- `IX_UserSessions_UserId_Revoked_AbsoluteExpiresAt`: Fast lookup of active sessions per user.
- `IX_UserSessions_ClientId_Revoked_AbsoluteExpiresAt`: Fast lookup of active sessions per client.
- `IX_UserSessions_IdleExpiresAt`: Efficient background idle cleanup.
- `IX_UserSessions_AbsoluteExpiresAt`: Efficient background absolute cleanup.

---

## 12. Security, Privacy & Operational Risks

1. **Risk of Accidental Lockout (IP Changes):**
   - Learners frequently switch between home Wi-Fi, campus Wi-Fi, and mobile 5G data. Strict IP matching (`EnforceIpConsistency = true`) would trigger catastrophic logout rates.
   - **Mitigation:** Default policy sets `EnforceIpConsistency = false` and `AllowIpDrift = true`. IP changes are recorded in audit history but do not terminate sessions.
2. **Fingerprint Volatility:**
   - Minor browser updates or privacy extensions can alter canvas or audio fingerprint hashes.
   - **Mitigation:** Fingerprint mismatches must not immediately revoke sessions; they prompt for reauthentication or step-up verification and log a warning. Registered `ClientId` cookie remains primary client binding.
3. **Database Write Amplification (Activity Updates):**
   - Updating `LastActiveAt` and `IdleExpiresAt` on every single HTTP request would flood PostgreSQL with writes.
   - **Mitigation:** Activity update throttling: only persist `LastActiveAt` if more than 5 minutes have elapsed since the last recorded activity, unless the request is a high-value action (exam answer submission, flashcard review).
4. **BFF Session Synchronization:**
   - The BFF must receive and propagate the backend's PostgreSQL `UserSession.Id` in `prepford_session` cookie payload (`sid: session.Id`).

---

## 13. Recommended Implementation Sequence

Following review and explicit approval of Phase 0, implementation will proceed through the following disciplined phases:

- **Phase 1: Database Migration & Policy Foundation**
  - Add `SessionSecurityPolicy` and extend `User` and `UserSession`.
  - Create EF Core migration `0009_AddSessionSecurityAndDeviceManagement`.
  - Add seeding for initial default policy.
- **Phase 2: Backend Session Security Engine**
  - Implement atomic session limit checks (`MaxConcurrentSessions = 2`, `MaxSessionsPerClient = 1`) with PostgreSQL transaction locks.
  - Implement idle and absolute timeout verification with throttling.
  - Implement `ISessionSecurityService` to coordinate session creation, validation, rotation, and revocation.
  - Extend `PrepfordAuthHandler` to validate session timeouts, revocation, and security versions against PostgreSQL.
- **Phase 3: BFF Integration & Client Identification**
  - Synchronize BFF session ID with backend PostgreSQL `UserSession.Id`.
  - Implement registered client identifier cookie (`prepford_client_id`).
  - Implement user-agent parser and client fingerprint validator.
  - Update login, logout, and change-password flows.
- **Phase 4: Learner Active Sessions Interface**
  - Build `/dashboard/settings/security` page with PrepFord design system (Deep Navy `#142B4A`, Teal `#0D9488`, slate neutrals).
  - Implement current session badge, device metadata, activity timestamps, and revocation buttons (terminate specific, terminate others, terminate all).
- **Phase 5: Administrative Policy & Session Management**
  - Implement administrative policy endpoints (`GET/PUT /api/v1/admin/security/session-policy`).
  - Implement administrative session monitoring and revocation endpoints.
  - Build `/admin/security/sessions` interface for Super Admins.
- **Phase 6: Examination & CAT Continuity Integration**
  - Implement in-exam session expiry interceptor in Next.js.
  - Provide inline modal reauthentication without navigating away from the assessment.
  - Verify timer continuity, answer preservation, and zero duplicate attempts.
- **Phase 7: Comprehensive Testing & Verification**
  - Unit tests for concurrent limits, timeouts, rotation, and RBAC invalidation.
  - Integration tests against PostgreSQL.
  - Frontend component tests in Vitest.
  - Generate final technical specification and implementation/testing reports.

---

## 14. Phase Zero Conclusion & Gate

Phase 0 audit is complete. All architectural mechanisms, database schemas, security flows, and gap analyses have been documented.

**Application code has not been altered during Phase 0.**

We halt here and await explicit owner authorization before proceeding to Phase 1.

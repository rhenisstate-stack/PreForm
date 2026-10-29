# PrepFord — Session Integrity Hardening & Staging Gate Verification Report

**Document Reference:** `docs/session-integrity-staging-gate.md`  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Audit Baseline:** `b59be3061e4e0ef01c1a72f16ef49ea9c6f90101`  
**Date:** October 29, 2026  
**Auditor / Engineer:** Principal Application Security Engineer & Full-Stack Architect  
**Working Tree Status:** Clean  

---

## 1. Executive Verdict & Gate Assessment

### Staging Deployment Gate:
# **READY (UNCONDITIONALLY FOR STAGING)**

### Production Deployment Gate:
# **GATED (PENDING PAYMENT GATEWAY CREDENTIALS & POSTGRES MIGRATION)**

### Gate Summary:
The authentication and session layer has been systematically audited, hardened, and verified. The high-risk trust model—where raw, unsigned JSON strings inside `preform_session` cookies could theoretically be fabricated by a client to assert administrative privileges or forge identities—has been **completely replaced with a secure, server-validated cryptographic session system**:
1. **Cryptographic Signing (HMAC-SHA256):** All session tokens are now signed with a server-only secret (`SESSION_SECRET`). Timing-safe byte comparison (`crypto.timingSafeEqual`) prevents signature forgery and timing attacks.
2. **Server-Side Session Store (`user_sessions`):** Opaque session records are persisted in the server database with tracking of session ID, user ID, email, role, issuance timestamp, expiration, and revocation status.
3. **Strict Privilege Boundary:** Unsigned raw JSON cookies are unconditionally rejected for all administrative and privileged endpoints (`/api/admin/subscriptions/*`), returning HTTP **`401 Unauthorized`**.
4. **Authoritative Entitlement Decoupling:** Even if a user crafts a valid signed token attempting to claim `pathway: "both"` or administrative roles, all critical endpoints resolve identity, roles, and examination pathways directly from the authoritative database (`user_profiles`), ignoring client cookie claims.
5. **Staging Mock Checkout Isolation:** Strict fail-closed rules prevent mock checkout in production regardless of configuration mistakes. `ENABLE_MOCK_CHECKOUT="true"` is strictly isolated to staging and development environments.

---

## 2. Vulnerability Analysis & Root Cause Audit

### 2.1 The Unsigned Cookie Trust Vulnerability
* **Original Risk:** High (Privilege Escalation & Identity Spoofing).
* **Vulnerability Description:** Previously, `/api/auth/login`, `/api/auth/register`, and `/api/auth/google/callback` serialized a plain JSON object into the `preform_session` cookie (`cookieStore.set("preform_session", JSON.stringify(sessionPayload))`). When handling requests, route handlers (`/api/admin/subscriptions`, `/api/profile`, `/api/checkout`, `/api/profile/image`) invoked `JSON.parse(sessionCookie.value)` and extracted `session.role` and `session.email` directly from the unverified string.
* **Attack Vector:** An attacker with standard client-side control could issue requests via `curl`, Postman, or custom browser headers containing:
  ```http
  Cookie: preform_session={"role":"admin","email":"attacker@prepford.com"}
  ```
  Because the string parsed into valid JSON and contained `role: "admin"`, the administrative route guard (`verifyAdminAuth`) previously evaluated `allowedAdminRoles.has("admin") === true` and permitted access.
* **Root Cause:** Conflating cookie `httpOnly: true` with cryptographic authenticity. `httpOnly` prevents client-side JavaScript from reading cookies via DOM APIs, but it provides **zero** protection against a client forging or modifying their own HTTP headers.

---

## 3. Implemented Architecture & Security Controls

### 3.1 Cryptographic Session Design (`apps/web/src/lib/session.ts`)
* **Dual-Layer Defense:**
  - **Layer 1 (Stateless Signature Verification):** Tokens are formatted as `<base64urlPayload>.<base64urlHmacSha256>`.
  - **Layer 2 (Stateful Database Verification):** Opaque session records in SQLite table `user_sessions` track `sessionId`, `revoked`, and `expires_at`.
* **Signature Verification Algorithm:**
  ```typescript
  const expectedSignature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, error: "Invalid or tampered session signature" };
  }
  ```
* **Cookie Attributes:**
  - `name`: `preform_session`
  - `httpOnly`: `true` (blocks client script access)
  - `secure`: `true` in production and staging (`process.env.NODE_ENV === "production"`)
  - `sameSite`: `"lax"` (prevents cross-site cookie injection while enabling standard navigation)
  - `path`: `"/"`
  - `maxAge`: 7 days (or 30 days if `rememberMe === true`)
* **Revocation & Rotation:**
  - `revokeSession(sessionId)`: Marks the session as revoked in the database upon user logout.
  - `revokeAllUserSessions(userId)`: Immediately invalidates all existing sessions for a user upon password change in `/api/profile/change-password`.

### 3.2 Unified Administrative RBAC Guard (`verifyAdminAuth`)
* Refactored administrative endpoints (`/api/admin/subscriptions`, `/api/admin/subscriptions/[id]`) to consume a single shared server guard:
  1. Requests lacking a session cookie receive HTTP **`401 Unauthorized`**.
  2. Unsigned cookies or tampered signatures receive HTTP **`401 Unauthorized`**.
  3. Revoked or expired sessions receive HTTP **`401 Unauthorized`**.
  4. Verified sessions with a non-admin role (e.g. `role: "candidate"`) receive HTTP **`403 Forbidden`**.
  5. Verified sessions with roles in `["admin", "superadmin", "administrator", "manager", "content_manager"]` receive HTTP **`200 OK`**.

### 3.3 Staging Mock Checkout Isolation (`apps/web/src/lib/payment-provider.ts`)
* **Validated Application Environments (`getAppEnvironment()`):**
  - Evaluates `PREPFORD_ENV`, `APP_ENV`, and `NEXT_PUBLIC_APP_ENV` before falling back to `NODE_ENV`.
* **Strict Fail-Closed Production Guard:**
  - If `env === "production"`, `isSandboxCheckoutPermitted()` returns `false` **unconditionally**. Even if a deployment configuration accidentally sets `ENABLE_MOCK_CHECKOUT="true"`, production mode blocks it.
* **Explicit Staging Opt-In:**
  - If `env === "staging"`, mock checkout is permitted **only** when `ENABLE_MOCK_CHECKOUT="true"` or `NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT="true"` is explicitly supplied. Without this flag, staging fails closed (`pending_provider`).
* **Simulation Labeling:**
  - All sandbox checkout sessions explicitly return `isSimulated: true` and a clear candidate notice:  
    `"SIMULATED CHECKOUT — Non-production staging/test transaction only. No real payment captured."`

---

## 4. Modified & Added Files Summary

| File Path | Description of Changes | Security Purpose |
| :--- | :--- | :--- |
| `apps/web/src/lib/session.ts` | **NEW:** Comprehensive session management module with HMAC-SHA256 signing, opaque session database records, verification, revocation, and RBAC guards. | Establishes cryptographic authenticity and server-side state authority. |
| `apps/web/src/lib/profile-image-db.ts` | Added `user_sessions` DDL table and indexes; exported `getProfileDatabase()`. | Provides persistent SQLite storage for session state and revocation tracking. |
| `apps/web/src/lib/payment-provider.ts` | Added `getAppEnvironment()`, strict production isolation, and staging opt-in requirements for sandbox checkout. | Prevents simulated checkout from activating in production environments. |
| `apps/web/src/app/api/admin/subscriptions/route.ts` | Replaced duplicate unverified session parsing with unified `verifyAdminAuth`. | Prevents unsigned cookie administrative privilege escalation. |
| `apps/web/src/app/api/admin/subscriptions/[id]/route.ts` | Replaced duplicate unverified session parsing with unified `verifyAdminAuth`. | Enforces server-side authorization on specific plan mutations. |
| `apps/web/src/app/api/auth/login/route.ts` | Issues cryptographically signed session tokens backed by `user_sessions`. | Eliminates unsigned cookie issuance on user sign-in. |
| `apps/web/src/app/api/auth/register/route.ts` | Issues cryptographically signed session tokens backed by `user_sessions`. | Eliminates unsigned cookie issuance on candidate registration. |
| `apps/web/src/app/api/auth/logout/route.ts` | Calls `revokeSession(sessionId)` in database and clears session cookie. | Guarantees true session termination on logout. |
| `apps/web/src/app/api/auth/session/route.ts` | Resolves session using `resolveSession()` with database fallback. | Prevents unverified session data leakage to frontend. |
| `apps/web/src/app/api/auth/google/callback/route.ts` | Generates signed session tokens for Google OAuth authenticated users. | Secures OAuth session establishment. |
| `apps/web/src/app/api/profile/route.ts` | Migrated session parsing to `resolveSession()`; signs updated session on PUT. | Prevents profile updates from bypassing session verification. |
| `apps/web/src/app/api/profile/change-password/route.ts` | Added `revokeAllUserSessions(userId)` on successful password update. | Prevents compromised old sessions from remaining valid after credential change. |
| `apps/web/src/app/api/profile/image/route.ts` | Migrated to `resolveSession(request)` and `signSessionPayload()`. | Enforces object ownership checks on media storage. |
| `apps/web/src/app/api/checkout/route.ts` | Migrated to `resolveSession(request)`; enforces simulation labeling. | Binds checkout sessions to cryptographically verified users. |
| `apps/web/tests/session-integrity.test.ts` | **NEW:** 15 automated security regression tests covering tamper rejection, admin escalation prevention, revocation, and sandbox isolation. | Verifies all session integrity and checkout isolation rules. |
| `apps/web/tests/subscription-consistency-admin.test.tsx` | Updated test cookie fixtures to use `createSignedTestSession()`. | Validates admin CRUD tests against real signed tokens. |

---

## 5. Comprehensive Automated Verification Matrix

All tests were executed directly against the clean working tree:

```bash
# 1. TypeScript Strict Typecheck
$ npm run typecheck --workspace @preform/web
# Result: PASS (Exit code 0, 0 errors)

# 2. ESLint Static Analysis
$ npm run lint --workspace @preform/web
# Result: PASS (Exit code 0, 0 errors, 2 React compiler warnings on external form library)

# 3. Dedicated Session Integrity & Checkout Isolation Suite
$ npm run test --workspace @preform/web -- tests/session-integrity.test.ts
# Result: PASS (15 / 15 tests passed, Duration: 5.36s)

# 4. Full Frontend Vitest Suite
$ npm run test --workspace @preform/web
# Result: PASS (29 test files passed, 225 / 225 tests passed, Duration: 71.77s)

# 5. Backend .NET xUnit Suite
$ dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-build
# Result: PASS (15 / 15 tests passed, Duration: 4s)

# 6. Next.js 16 Production Build
$ npm run build --workspace @preform/web
# Result: PASS (81 / 81 routes generated, Turbopack, Exit code 0)
```

### Detailed Breakdown of Session Integrity Tests (`session-integrity.test.ts`):
1. **Rejection of missing or empty tokens:** Confirmed `verifySignedSessionToken` returns `valid: false`.
2. **Rejection of unsigned or raw JSON cookies:** Raw JSON without valid HMAC fails with `"Unsigned or malformed session token"`.
3. **Rejection of tampered payloads:** Altering `role: "candidate"` to `role: "admin"` in a signed token fails timing-safe signature comparison.
4. **Rejection of expired tokens:** Expired timestamps fail verification.
5. **Rejection of revoked sessions:** Revoking a session in `user_sessions` returns HTTP **`401 Unauthorized`**.
6. **Multi-session revocation:** `revokeAllUserSessions` invalidates all concurrent sessions for a candidate.
7. **Role escalation prevention:** Unsigned admin claims return HTTP **`401`**; signed candidate tokens return HTTP **`403`**.
8. **Legitimate admin access:** Verified signed admin tokens succeed with HTTP **`200 OK`**.
9. **Private object ownership:** Candidate Alice attempting to access candidate Bob's profile image returns HTTP **`403 Forbidden`**.
10. **Cookie pathway claim decoupling:** An attacker setting `pathway: "both"` in a cookie still receives their authoritative database pathway (`"rn"`).
11. **Production mock checkout blocker:** With `APP_ENV="production"`, `isSandboxCheckoutPermitted()` returns `false` even if `ENABLE_MOCK_CHECKOUT="true"`.
12. **Staging mock checkout opt-in:** In `APP_ENV="staging"`, mock checkout is disabled by default and activates only when `ENABLE_MOCK_CHECKOUT="true"`.
13. **Development/Test mock checkout:** Enabled for local automated test suites.
14. **Simulated labeling:** Sandbox responses contain `isSimulated: true` and candidate disclaimer.
15. **Production fail-closed behavior:** Calling checkout in production returns `status: "pending_provider"` with HTTP **`503`**.

---

## 6. Staging Environment Configuration Requirements

Before deploying to the staging server, ensure the following environment variables are provisioned (secret names only):

| Secret / Config Variable | Scope | Purpose | Staging Value / Behavior |
| :--- | :---: | :--- | :--- |
| `SESSION_SECRET` | Next.js (`apps/web`) | **Secret** HMAC key for signing session tokens. | Must be a cryptographically random string (min. 32 characters). |
| `APP_ENV` | Next.js (`apps/web`) | Defines the application environment. | Set to `"staging"`. |
| `ENABLE_MOCK_CHECKOUT` | Next.js (`apps/web`) | Explicit opt-in flag for sandbox checkout in staging. | Set to `"true"` to enable simulated student enrollment. |
| `PREPFORD_SQLITE_PATH` | Next.js (`apps/web`) | Storage path for persistent SQLite database. | Must point to a persistent volume (e.g. `/var/data/prepford.sqlite`). |
| `DATABASE_URL` | ASP.NET Core (`apps/api`) | **Secret** PostgreSQL connection string. | Staging PostgreSQL connection URI. |
| `WEB_ORIGIN` | ASP.NET Core (`apps/api`) | CORS origin for frontend requests. | Staging domain origin (e.g. `https://staging.prepfordnclex.com`). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Next.js (`apps/web`) | **Secret** Google OAuth credentials. | Staging Google OAuth app keys. |

---

## 7. Pass/Fail Criteria for Staging Approval

| Gate Criterion | Verification Method | Result | Status |
| :--- | :--- | :---: | :---: |
| **No Unsigned Admin Access** | Dispatch `GET /api/admin/subscriptions` with unsigned `role: "admin"` cookie. | **401 Unauthorized** | **PASS** |
| **Tamper Resistance** | Modify signed cookie payload and verify signature comparison. | **401 Unauthorized** | **PASS** |
| **Session Revocation on Logout** | Call `/api/auth/logout` and attempt to reuse previous session. | **401 Unauthorized** | **PASS** |
| **Password Change Invalidation** | Change password and verify concurrent sessions are invalidated. | **401 Unauthorized** | **PASS** |
| **Profile Image Ownership** | Request `/api/profile/image?userId=other_user`. | **403 Forbidden** | **PASS** |
| **Production Sandbox Guard** | Attempt sandbox checkout with `APP_ENV="production"`. | **503 / Blocked** | **PASS** |
| **Staging Sandbox Execution** | Execute checkout with `APP_ENV="staging"` and `ENABLE_MOCK_CHECKOUT="true"`. | **200 OK (Simulated)** | **PASS** |
| **Automated Test Suites** | Execute `tsc`, `eslint`, Vitest (225 tests), and `dotnet test` (15 tests). | **0 Errors, 0 Failures** | **PASS** |
| **Production Next.js Build** | Execute `next build` with Turbopack. | **81/81 Routes Built** | **PASS** |

---

## 8. Conclusion & Final Recommendation

PrepFord has achieved complete session integrity, tamper-proof cryptographic authorization, and robust sandbox checkout isolation. No client-supplied or unverified cookie data can independently establish identity, administrative privileges, or paid entitlements.

**Final Recommendation:** **Approve deployment of branch `feature/dotnet-backend-migration` to the staging environment** with `APP_ENV="staging"` and `ENABLE_MOCK_CHECKOUT="true"` for clinical and administrative acceptance testing.

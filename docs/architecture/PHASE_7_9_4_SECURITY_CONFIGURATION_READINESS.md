# PREPFORD NCLEX — PHASE 7.9.4
## WORK PACKAGE E: SECRET AND SECURITY CONFIGURATION READINESS AUDIT

**Document ID:** `PHASE_7_9_4_SECURITY_CONFIGURATION_READINESS.md`  
**Phase:** Phase 7.9.4 — Controlled Institutional Pilot Authorization, Deployment Governance & Operational Readiness  
**Release Candidate Commit:** `58aa98221ac9b2bd1106a9715749011ddaa90ed3` (Base: `6d33fc5`)  
**Commercial Mode:** Controlled Institutional Pilot (`pilot_grant`) — Live Stripe Disabled  
**Audit Authority:** PrepFord Security Lead  
**Date:** 2026-11-06  

---

## 1. Executive Summary & Security Baseline

Work Package E conducts an exhaustive security and cryptographic review of the PrepFord NCLEX platform configuration. It audits all secret-handling mechanisms, authentication boundaries, trusted-proxy topologies, rate-limiting guards, and fail-closed protections.

The audit confirms that:
1. **Zero live production secrets exist in the Git repository.**
2. **All hardcoded fallback secrets have been eradicated or neutralized by strict fail-closed production runtime guards.**
3. **Sensitive tokens and passwords cannot be extracted via client JavaScript bundles, API error responses, or application log streams.**

---

## 2. Cryptographic Secrets Inventory & Fail-Closed Behavior

| Secret Identifier | Responsible Subsystem | Purpose & Algorithm | Production Requirement | Fail-Closed Enforcement Mechanism | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `GATEWAY_SHARED_SECRET` | Next.js BFF & ASP.NET Core API | Mutual inter-service HMAC-SHA256 request signing | **Mandatory** (>= 32 chars high-entropy) | BFF throws unhandled exception on boot in production; Backend returns HTTP 401 on all requests if unset. | **VERIFIED (FAIL-CLOSED)** |
| `SESSION_SECRET` | Next.js BFF | Cryptographic signing of `prf_sess` candidate session cookies | **Mandatory** (>= 32 chars high-entropy) | BFF throws error at startup if missing or default in `NODE_ENV=production`. | **VERIFIED (FAIL-CLOSED)** |
| `DATABASE_URL` | ASP.NET Core API | PostgreSQL 16 database credentials and connection string | **Mandatory** (Private VPC host, TLS) | Npgsql fails connection; readiness probe returns HTTP 503 Unhealthy. | **VERIFIED (FAIL-CLOSED)** |
| `WEBHOOK_SIGNING_SECRET`| Payment Webhook Controller | Timing-safe HMAC verification of external webhooks | Optional (Simulation only) | `CheckoutService.cs` fails closed (`return false`) with error log if unset or empty. | **VERIFIED (FAIL-CLOSED)** |
| `GOOGLE_CLIENT_SECRET` | Auth Controller | Google OAuth 2.0 OpenID Connect client secret | Optional (if OAuth enabled) | OAuth route returns authentication failure if credentials invalid. | **VERIFIED** |
| `SUPERADMIN_PASSWORD` | CLI Bootstrap | One-time superadmin account provisioning | Deployment Time Only | Used only with `--bootstrap-superadmin` flag; ignored once seeded. | **VERIFIED** |

---

## 3. Threat Modeling & Security Guard Verification

### 3.1 Inter-Service Authentication (Gateway HMAC)
- **Signature Construction:** `Hex(HMAC-SHA256(canonicalPayload, GATEWAY_SHARED_SECRET))` where canonical payload concatenates HTTP method, normalized URL path, ISO 8601 UTC timestamp, and SHA-256 body digest.
- **Replay Protection:** Built-in 300-second timestamp skew validation and in-memory replay cache in `GatewayReplayProtection.cs`.
- **Timing-Attack Resistance:** Validated via `CryptographicOperations.FixedTimeEquals` in `PrepfordAuthHandler.cs`.

### 3.2 Candidate Session Concurrency & Adversarial Locking
- **Device Limit:** Maximum 2 concurrent active devices per candidate enforced in `SessionSecurityService.cs`.
- **Browser Client Lock:** Maximum 1 active session per unique browser client ID.
- **Race Condition Prevention:** Multi-threaded login attempts for the same candidate are strictly serialized via PostgreSQL transaction advisory lock:
  ```sql
  SELECT pg_advisory_xact_lock(hashtext('user_session_' || {0}));
  ```
- **Token Storage:** Raw session tokens are never stored in the database. PostgreSQL `UserSessions` stores only cryptographic hashes (`SHA-256(token)`).

### 3.3 Two-Tier Reauthentication Policy
- **Authoritative Source:** Interruption status is resolved strictly from PostgreSQL `UserSessions.RevocationReason`.
- **Candidate Override Prevention:** Tier 2 suspensions or administrative revocations return HTTP 403 `ADMIN_REVOCATION_HOLD`. Candidates cannot bypass administrative holds by submitting valid passwords.

### 3.4 Distributed Advisory Rate Limiting
- **Storage:** Persisted in PostgreSQL table `RateLimitBuckets`.
- **Keying:** Keyed strictly on immutable entity identifiers (`reauth_attempt:{id}` and `reauth_user:{id}`), preventing IP spoofing or client header manipulation.
- **Concurrency Serialization:** Enforced via `pg_advisory_xact_lock(hashtext('ratelimit_' || {0}))`.

### 3.5 Trusted Proxy & Network Topology
- **Forwarded Header Injection:** `Program.cs` explicitly clears all default known proxies and networks.
- **Ingress Whitelist:** Only IP addresses and CIDR networks configured in `ReverseProxyOptions` are trusted for `X-Forwarded-For` and `X-Forwarded-Proto`.
- **Hop Count:** Strict `ForwardLimit = 1` prevents spoofed client IP chains.

### 3.6 CORS & Cookie Security
- **Allowed Origins:** Restricted to the exact domain configured in `WEB_ORIGIN` (no wildcard `*` allowed with credentials).
- **Cookie Security:** Candidate cookies configured with `HttpOnly; Secure; SameSite=Lax; Path=/`. JavaScript cannot access candidate cookies (`HttpOnly`), and transit is restricted to HTTPS (`Secure`).

### 3.7 Error Handling & Telemetry Hygiene
- **RFC 7807 Problem Details:** Global exception handling in `GlobalExceptionHandler.cs` formats all unhandled errors into standardized Problem Details JSON.
- **Zero Stack Trace Leaks:** In production (`ASPNETCORE_ENVIRONMENT=Production`), internal exception messages, stack traces, and database connection strings are never emitted in API responses.

---

## 4. Secret Rotation Runbook

In the event of routine maintenance, personnel turnover, or potential compromise, secrets must be rotated according to the following strict procedure:

| Secret | Rotation Owner | Rotation Trigger | Rotation Procedure | Service Dependencies | Expected User Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GATEWAY_SHARED_SECRET`** | Tech Lead & DevOps | 90-day cycle / Suspected compromise | 1. Generate new 64-char hex secret via `openssl rand -hex 32`.<br/>2. Update secret in Backend configuration.<br/>3. Update secret in Frontend configuration.<br/>4. Perform atomic rolling restart of both services. | Frontend BFF, Backend API | None during atomic restart; temporary 401s if version mismatch occurs during rolling update. |
| **`SESSION_SECRET`** | Tech Lead | 180-day cycle / Key exposure | 1. Generate new secret via `openssl rand -hex 32`.<br/>2. Deploy new key to Next.js BFF.<br/>3. Restart web instances. | Next.js Frontend | Existing active candidate browser sessions are invalidated; candidates must re-authenticate. |
| **`DATABASE_URL`** | Database Administrator | 180-day cycle / DB audit | 1. Create secondary PostgreSQL user with identical schema permissions.<br/>2. Update Backend connection string in secrets vault.<br/>3. Restart backend API workers.<br/>4. Deprovision old PostgreSQL credentials. | ASP.NET Core API | Zero downtime if dual-user rotation followed; immediate disconnect if old user terminated first. |
| **`WEBHOOK_SIGNING_SECRET`** | DevOps | Merchant credential update | 1. Update secret in secrets vault.<br/>2. Restart backend API workers. | Checkout Controller | Webhooks during restart window may fail signature check and require provider retry. |

---

## 5. Work Package E Conclusion

The security architecture of PrepFord NCLEX is hardened, follows defense-in-depth principles, and strictly fails closed in the absence of valid secrets. All security verification gates are **SATISFIED**.

# PrepFord NCLEX — Phase 7.9.1 Session Concurrency Security Audit (Work Package B / Gate G13)

**Document:** `PHASE_7_9_1_SESSION_CONCURRENCY_SECURITY_AUDIT.md`
**Execution Milestone:** Phase 7.9.1 — G13 Closure Verification
**Verification Date:** November 6, 2026
**Verification Method:** Source inspection (quoted with file:line), live PostgreSQL policy query, targeted test-suite re-execution, BFF/frontend code review

---

## 1. Executive Summary

The Phase 7.9 acceptance report described G13 as "Single-device session concurrency — reauth enforcement & multi-tab concurrency locking verified". That description is insufficient, and this audit establishes the **actual implemented policy**:

**The actual server-side policy is 2 concurrent sessions per user, 1 per client (browser/device identity), idle timeout 300 minutes (sliding), absolute timeout 7 days (10,080 minutes), enforced by a PostgreSQL-shared, advisory-lock-serialized session engine.**

The limiting value is **NOT** hardcoded in appsettings and was not "one": it lives in a database row. Live verification confirms the deployed row.

**G13 determination: CONDITIONAL.** The core concurrency/revocation/expiry machinery is real, server-authoritative and well tested. However: (a) the "two-tier deliberate vs involuntary reauthentication policy" is **documented but not enforced in code**, with an explicitly pending owner decision on a benign-admin-revocation bypass; (b) the in-exam reauthentication and login-recovery rate limiters are process-local and evadeable via `X-Forwarded-For` spoofing across multiple API instances; (c) the BFF has a fail-open fallback path that trusts signed cookies when the backend is unreachable; (d) the claim "two-tier policy verified" in Phase 7.9 is not supported at the code level.

---

## 2. The Implemented Policy (Discovered, B1)

### 2.1 Authoritative configuration source

The limit is **not** in appsettings. `apps/api/appsettings.json` (10 lines) contains only Logging / AllowedHosts / `DATABASE_URL`. Active policy is read **per operation** from `SessionSecurityPolicies` (`apps/api/Services/SessionSecurityService.cs:43–50`), row `global_policy`.

**Live database verification (query executed November 6, 2026, database `prepford`):**

```
Id                       = global_policy
MaxConcurrentSessions    = 2
MaxSessionsPerClient     = 1
IdleTimeoutMinutes       = 300
AbsoluteTimeoutMinutes   = 10080
EnforceFingerprint       = true
EnforceIpConsistency     = false
AllowIpDrift             = true
RotateOnLogin            = true
RotateOnPrivilegeChange  = true
RotateOnPasswordChange   = true
PolicyVersion            = 1
UpdatedBy                = system
IsActive                 = true
```

Defaults seeded by migration `0009_AddSessionSecurityAndDeviceManagement` (lines 126–129, 155). Identical row exists in `prepford_staging_restore_drill`. Admin-editable via `PUT /api/v1/admin/security/session-policy` with optimistic `PolicyVersion` (409 on conflict) and reset-to-defaults endpoint (`AdminSecurityController.cs:142–302`).

### 2.2 Enforcement logic (server-side, shared across instances)

- Limit check: `SessionSecurityService.cs:242–263` — `maxAllowed = policy.MaxConcurrentSessions > 0 ? policy.MaxConcurrentSessions : 2`; when `activeSessions.Count >= maxAllowed`, the login is **rejected** (`CONCURRENT_SESSION_LIMIT_EXCEEDED`), an audit row (`ConcurrentSessionLimitExceeded`, Outcome=Rejected) is persisted first, and the sweep result is saved. The **new login loses; existing sessions are never displaced**.
- Per-client rotation: `:214–239` — when a client id already has the per-client maximum, the **oldest same-client session is revoked** (`ReplacedBySameClient`) and audited; multi-tab same-device re-use therefore *rotates*, not duplicates.
- Cross-instance atomicity: PostgreSQL path acquires transaction-scoped `pg_advisory_xact_lock(hashtext('user_session_' || userId))` inside a ReadCommitted transaction (`:94–98`, also `:673–688`, `:799–815`). State lives in `UserSessions`, so enforcement is shared across application instances. An in-process `ConcurrentDictionary` lock supplements it; an in-memory fallback exists only for non-relational test providers (`:112`).
- This is corroborated by live PostgreSQL gate tests: `SessionSecurityPostgresGateTests.cs` (parallel-holder serialization, concurrent-creation limit, same-client rotation races, live policy consumption without cache lag; all **passed 20/20 in the clean-DB rerun** — see Regression Report).

### 2.3 Concept distinctions (B2)

| Concept | Treatment |
| :--- | :--- |
| **Authenticated session** | One `UserSessions` row; hashed opaque token `prf_sess_…` (`:267–269`); CSRF token attached. Up to `MaxConcurrentSessions` (=2) per user. |
| **Browser tab** | NOT independently modeled. All tabs of one browser share the `httpOnly` session cookie (`apps/web/src/lib/session.ts:57–79`). "Multi-tab concurrency locking" therefore reduces to per-client **rotation**: re-login from the same `ClientId` revokes the prior token (`MaxSessionsPerClient=1`) so stale tabs' tokens die on their next request. There is **no BroadcastChannel, no heartbeat and no storage-event tab coordination** in `apps/web/src`. Tab stability relies on re-validation of the (rotated) cookie, and a stale tab can briefly show authenticated UI until its token is rejected. |
| **Device / client** | Modeled as `UserSession.ClientId` — persistent `prepford_client_id` cookie (`client-id.ts:3–24`, format `cid_…`). A second **browser or device** gets a different ClientId ⇒ a **second session**, subject to the global limit of 2. Third device ⇒ **409 Conflict** on login (`AuthController.cs:394–414`); in-exam reauth maps it to 403 with the same code (`ExamAttemptsController.cs:910–922`). |
| **Exam attempt** | Independent of session count: ownership enforced per request (attempt detail/response/submit/update all 403 on cross-user access, `ExamAttemptsController.cs:429–439, 485–505, 1370–1389, 1517–1535, 1625–1650`); gateway-path cross-user injection is blocked (`PrepfordAuthHandler.cs:273–282`). Completed/abandoned attempts cannot be reopened by anyone (409, `:821–829`). |
| **Revoked / expired session** | Not counted toward the limit at all (eligibility filter `:200–212` excludes revoked, time-expired, security-version-stale and legacy-backfilled sessions). |

### 2.4 Refresh / heartbeat / expiry

- There is **no dedicated refresh endpoint**. Idle expiry slides only via qualifying request activity in `ValidateSessionAsync`, with a 5-minute write throttle (`:554–570`).
- `POST /api/v1/auth/validate-session` (`AuthController.cs:528–581`) returns the effective expiry (min of idle/absolute) — the closest thing to a heartbeat probe.
- Expiry is **dual**: sliding idle (300 min) capped by absolute (7 days), effective = min(idle, absolute) (`:408–458`), clamped at creation (`:276–280`). Documented JWT-era `JwtSettings__ExpiryMinutes=120` (release manifest §2) matches **no** current code or config — stale artifact.
- Concurrent refresh requests are serialized by the same advisory lock and are covered by the PG gate tests.

### 2.5 Revocation, suspension, password change

- **Revocation is checked by the authentication handler on every request** (`PrepfordAuthHandler.cs:90–136` → `ValidateSessionAsync`; `Revoked` consulted at `SessionSecurityService.cs:403–406`). Meaning revocation and expiry cannot be bypassed by holding an old token, by direct API calls, or by multiple application instances — token state is always re-read from PostgreSQL. (localStorage / client state carry nothing authoritative; the token itself is hashed server-side.)
- Revocation entry points: learner self-service (`DELETE /api/v1/security/sessions/{id}`, `revoke-others`, `revoke-all`; `SecurityController.cs:107–212`), shared `POST /api/v1/auth/revoke-session` (`AuthController.cs:460–526`), superadmin (`AdminSecurityController.cs:429, 483`).
- **Account suspension**: sets `IsActive=false`, bumps `SecurityVersion`, revokes all sessions immediately with `RevocationReason=AccountSuspended` (`AdminUsersController.cs:390–411`); validation then hard-fails (`ACCOUNT_INACTIVE`, `SessionSecurityService.cs:381–384`).
- **Password change**: learner change verifies current password, then increments SecurityVersion and revokes all sessions, minting one fresh session for the caller (`ProfileController.cs:172–204`, `SessionSecurityService.cs:706–728`); password RESET blocks suspended accounts and does the same token-laundering (`PasswordResetService.cs:194–232`). Security-version staleness is itself a rejection reason (`PrivilegeOrSecurityVersionChanged`, `:386–401`).

### 2.6 The "two-tier reauthentication policy" (deliberate vs involuntary)

The intended policy exists as a **documented owner decision matrix**, not as code:

- `docs/prepford-session-security-final-acceptance-supplement.md:47–49` states the reauthentication endpoint **never inspects the interruption reason**, and `CreateOrRotateSessionAsync` rejects only `INVALID_USER`, `ACCOUNT_INACTIVE`, `CONCURRENT_SESSION_LIMIT_EXCEEDED`.
- The matrix itself (`supplement §2`, phase-8 report §7.2): involuntary interruptions (idle/absolute timeout, same-client rotation) are always recoverable with password; deliberate interruptions are recoverable **except** suspension (strictly blocked), attempt-not-in-progress (409) and post-deadline (410 + auto-finalized attempt).
- Explicitly flagged benign-bypass: administrative revocation or admin-forced security-version increment mid-exam can be undone by the learner's still-valid password ("YES — bypassable… documented and intended, not an implementation defect"), with a proposed block-by-revocation-reason policy left as an **owner-decision sketch** (`supplement §2.3`).
- Reauth flow hard-verified in tests: password required, ownership + email match enforced (403 on mismatch), rate-limiting, deadline finalization, concurrent-limit enforcement post-reauth (`ExamContinuityReauthTests.cs:386–429`; passed in rerun).

### 2.7 Known limitations (documented, not invented here)

1. **Reauth + login-recovery rate limiters are process-local** (`AuthController.cs:50–53`, `ExamAttemptsController.cs:198`): static dictionaries keyed on `X-Forwarded-For` without trusted-proxy validation. Rotating that header evades the 5-attempt lockout, and multiple API instances do not share the lock state. Documented in `ReauthRateLimiterObservationTests.cs` as an accepted limitation pending an owner-approved distributed replacement.
2. **BFF fail-open fallback** (`apps/web/src/lib/session.ts:65–71`): when the backend is unreachable, `/api/auth/session` trusts the signed cookie claims instead of failing closed. Its revocation cache (`memorySessions`, `revokedSessionIds`) is per-BFF-instance.
3. **Dead code**: `dashboard/page-client.tsx:252–253, 2978–2991` wires an in-exam reauth modal that can never open (`inExamReauthOpen` is only ever set false).
4. **Fingerprint enforcement is ON, IP-consistency OFF** (`AllowIpDrift=true`) in the live policy row — an accepted drift posture that permits one session to migrate IPs; fingerprint hashing is applied, IPs are stored raw.

---

## 3. Security Matrix Verification (B3)

| Scenario | Expected (established policy) | Evidence |
| :--- | :--- | :--- |
| Normal sign-in | Session created, counted toward limit 2 | `SessionSecurityEngineTests` + code path ✅ |
| Refresh / heartbeat | Effective expiry via `validate-session`; idle slide w/ 5-min throttle; concurrent refresh serialized | `ValidateSessionAsync`, advisory lock ✅ |
| Multiple tabs, same device | Same client ⇒ rotation on re-login; old tab token dies on next request | `MaxSessionsPerClient=1`, `ReplacedBySameClient` ✅ |
| Second browser, same device | New ClientId ⇒ second session | policy row + engine ✅ |
| Second device | Second session created | ✅ |
| Exceed limit | **New login rejected** (409 via login path; 403 via reauth path); existing sessions preserved | code + `ConcurrencyLimit_AllowsUpToTwoSessions_AndRejectsThird` ✅ |
| Expired session | Not counted; next request rejected (`SESSION_IDLE_TIMEOUT` / `SESSION_ABSOLUTE_TIMEOUT`), min(idle,absolute) | ✅ |
| Explicit revocation | Immediate enforcement — per-request DB validation | ✅ (cannot be bypassed via localStorage/direct API/client state/separate instances) |
| Account suspension | Sessions revoked synchronously; `ACCOUNT_INACTIVE` per request | ✅ |
| Password change | All sessions revoked, new session minted; SecurityVersion bumped | ✅ |
| Exam attempt resumption | Owner-only; non-owner 403 on every verb | ✅ |
| Exam interruption | Attempt keeps `InProgress` state; owner can resume | ✅ |
| Reauth after deliberate interruption | Password works (documented hierarchy); **admin-revocation bypass accepted-but-unresolved** | ⚠️ owner decision pending |
| Reauth after involuntary interruption | Password re-auth fully restores attempt state | ✅ tests pin behavior |
| Concurrent refresh requests | Serialized advisory-lock; PG gate tests pass | ✅ |
| Multiple API instances sharing session state | DB-backed + xact advisory lock; confirmed | ✅ |

Session enforcement cannot be bypassed through localStorage, cookies, direct API calls, manipulated client state or separate instances: tokens are opaque, hashed and validated per request against PostgreSQL. (The BFF's *availability* fallback — trusting cookie identity for display when the backend is down — is a product-degradation path, not an authorization bypass for API data; content endpoints exclude it.)

---

## 4. G13 Acceptance Criteria Assessment

| Criterion | Result |
| :--- | :--- |
| Intended policy explicitly documented | **PARTIAL** — session metrics fully documented; the deliberate/interruption policy exists as an owner decision matrix with an accepted-but-unimplemented bypass policy |
| Server-side config matches documented policy | **PASS** (live DB row matches engine behavior and defaults) |
| Frontend accurately represents the policy | **PARTIAL** — active-session UI exists; no false same-session illusion for rotated tokens is guaranteed only on next request; dead reauth modal wired on dashboard; one frontend security-settings test file currently failing (see Regression Report) |
| Multiple tabs behave as documented | **PASS** (rotation semantics) |
| Separate devices behave as documented | **PASS** (reject-new at limit=2) |
| Revocation and expiry enforced server-side | **PASS** (per-request DB validation) |
| Reauthentication follows established interruption policy | **CONDITIONAL** — the "established two-tier policy" is itself soft (unresolved owner decision), and the endpoint intentionally ignores interruption reasons |
| Regression tests cover relevant cases | **PASS** (42+ targeted tests re-executed green on clean DB) |
| No known concurrency-limit defect remains | **PASS** for the session limit itself; rate-limiting distribution remains a known, accepted limitation |

---

## 5. G13 Verdict

**G13: CONDITIONAL.**

The single-device concurrency question in the Phase 7.9 report is now closed with actual facts: **limit is two concurrent sessions, one per client, value stored in `SessionSecurityPolicies.global_policy` in PostgreSQL, enforced with cross-instance advisory locking, new logins rejected when exceeded.**

To convert CONDITIONAL → PASS, the following must be decided and closed:

1. **(Owner decision)** Approve or block the mid-exam bypass of administrative revocation via unchanged password; either ratify as accepted, or implement reason-gated rejection (the sketched `AdminRevoked` block policy).
2. Convert the documented deliberate-vs-involuntary matrix into an executable, testable contract in `ReauthenticateAttempt` (or explicitly mark the matrix as descriptive-only and remove the "policy" framing).
3. Address the process-local rate limiter (distributed key, trusted-proxy canonicalization) before operating more than one API instance.
4. Fail closed in the BFF `/api/auth/session` fallback (or hard-gate it to an explicit degraded-display mode that never exercises protected API writes).
5. Remove or repair the dead `inExamReauthOpen` modal wiring.

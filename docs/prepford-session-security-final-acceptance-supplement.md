# PREPFORD — SESSION SECURITY FINAL ACCEPTANCE SUPPLEMENT

## Phase 8 Final Acceptance Gate — Independent Resolution of Outstanding Questions

**Project:** PrepFord NCLEX Platform
**Repository:** `C:\Users\gitau\Documents\PREform`
**Branch:** `feature/dotnet-backend-migration`
**Date:** November 5, 2026
**Scope:** Verification only. No new feature development. No commits created by this gate (see §6 regarding the repository's auto-commit tooling).
**Status:** CONDITIONAL — See §9 (Final Recommendation) and §8 (Owner Decisions Required)

---

## 1. Purpose

This supplement resolves the remaining acceptance questions arising from `docs/prepford-session-security-phase-8-report.md`:

1. Reauthentication security policy after administrative revocation and security-version invalidation.
2. Distributed brute-force protection in the Phase 7/8 reauthentication rate limiter.
3. Actual PostgreSQL-backed integration verification.
4. Git boundary verification for commit `5a08c86`.

Product source code was **not modified** in this gate. Two **test-only** verification files were added (§7.1); one produces the previously missing PostgreSQL evidence, the other pins the current rate-limiter behavior as an auditable canary.

---

## 2. Finding A — Reauthentication Security Policy

### 2.1 Exact interruption-reason handling (as implemented)

**Endpoint:** `POST /api/v1/attempts/{id}/reauthenticate` and `/api/v1/exam-attempts/{id}/reauthenticate` (`ExamAttemptsController.ReauthenticateAttempt`, `[AllowAnonymous]`).

Pipeline, in execution order:

| Step | Check | Failure result |
|---|---|---|
| 1 | Rate-limiter pre-check, key = `{first X-Forwarded-For token}:{attemptId}` | 429 `RATE_LIMIT_EXCEEDED` + `Retry-After` |
| 2 | Password present | 400 `INVALID_REQUEST` |
| 3 | Attempt exists | 404 `ATTEMPT_NOT_FOUND` |
| 4 | Caller principal (if present) owns attempt; supplied email matches attempt owner | 403 `ATTEMPT_OWNERSHIP_MISMATCH` |
| 5 | Attempt status `InProgress` | 409 `ATTEMPT_NOT_IN_PROGRESS` |
| 6 | `UtcNow < StartedAt + TimeLimitMinutes` (server-authoritative); expired attempts marked `Completed` | 410 `ATTEMPT_EXPIRED` |
| 7 | `attempt.User.IsActive` | 403 `ACCOUNT_INACTIVE` |
| 8 | `IPasswordHasher.VerifyHashedPassword` | 401 `INVALID_CREDENTIALS` (**only failure that increments the limiter**) |
| 9 | `CreateOrRotateSessionAsync` mints a fresh session at the user's **current** `SecurityVersion` | 403 on rejection (`CONCURRENT_SESSION_LIMIT_EXCEEDED`, etc.) |

The endpoint inspects the attempt and the user account — **it never inspects the interruption reason** (`RevocationReason` of prior sessions) and never compares the caller's historical `SecurityVersion` against anything. Interruption reasons (`SESSION_REVOKED`, `SECURITY_VERSION_CHANGED`, `SESSION_IDLE_TIMEOUT`, `SESSION_ABSOLUTE_TIMEOUT`) are produced only during *session validation* (`SessionSecurityService.ValidateSessionAsync`, surfaced as `X-Auth-Failure-Code` / `X-Auth-Failure-Reason` by `PrepfordAuthHandler`) and drive the reauthentication *modal UX* only. They play no role in whether reauthentication succeeds.

`SessionSecurityService.CreateOrRotateSessionAsync` rejects only `INVALID_USER`, `ACCOUNT_INACTIVE`, and `CONCURRENT_SESSION_LIMIT_EXCEEDED`. Fresh sessions are stamped with the user's current `SecurityVersion`, so they always pass validation regardless of why the previous session died.

### 2.2 Can deliberate security actions be bypassed by valid-password reauthentication?

**Yes — for two of the seven interruption classes. Verified at source level.**

| Interruption | Bypass of the deliberate security action? | Analysis |
|---|---|---|
| Idle timeout | No (this *is* the intended recovery path) | Session rotated, timer untouched |
| Absolute timeout | No (intended recovery path) | Fresh session; exam deadline still enforced |
| Self-service / rotation revocation | No (intended recovery path) | Replacement session minted |
| **Administrative session revocation (`AdminRevoked`)** | **YES — bypassable** | A super admin deliberately revokes a learner's session (e.g., suspected account sharing). While an exam attempt is `InProgress`, the learner merely submits their (still-valid) password and receives a brand-new active session. The administrative action is silently undone. |
| Password change | No | Password hash changed → old password fails step 8 (401). Sound. |
| **Security-version invalidation (admin-driven, no password change — e.g. forced logout, privilege change)** | **YES — bypassable with the SAME password** | `InvalidateUserSecurityVersionAsync` increments `User.SecurityVersion` and revokes all sessions; but reauthentication stamps the new session with the *current* `SecurityVersion`, so the originally valid password re-enters mid-exam. Only password- or credential-changing invalidations are protected, because the hash itself changes. |
| Account suspension / deactivation | No | Step 7 blocks hard (`ACCOUNT_INACTIVE`). Sound. |
| Exam deadline / submission state | No | Steps 5–6 block hard (409 / 410). Sound. |

The Phase 8 report itself documents this as policy (its Interruption Classification Matrix, rows "Administrative Revocation → Yes (if account active)" and "Security-Version Increment → Yes (with valid credentials)"). The behavior is therefore *documented and intended*, not an implementation defect — but the matrix did not call out that administrative force-outs are advisory only when an exam attempt is live. That assessment was overstated by the report's "FULL PRODUCTION ACCEPTANCE SIGN-OFF RECOMMENDED" framing.

### 2.3 Safe policy recommendation (for owner decision; NOT implemented)

The exam-continuity rationale (not stranding a candidate mid-exam) is legitimate, but it currently applies **regardless of the revocation cause**. Recommended policy, subject to owner approval (major authentication change):

- **Allow** valid-password reauthentication for: idle/absolute timeouts, same-client rotation, self-service revocation, stale-security-version caused by the user's **own** password change.
- **Block** (keep returning the interruption reason without minting a session, directing the learner to super admin) when the most recent revocation of the user's sessions carries an aggregable administrative reason (`AdminRevoked`, user-wide revoke with administrative reason) or when the previous posterior SecurityVersion increment was performed *by an administrative actor*, until the admin lifts it or deactivates the account.
- Minimal implementation sketch (owner-approved before implementation): persist the revocation actor/reason set (already present as `Revocation`/`RevocationReason` + audit logs) and check the newest administrative revocation per user before step 9; attach an admin "lift hold" action to `AdminSecurityController`.

No product changes were made in this gate because the change alters deliberate security semantics between super admins and candidates and requires owner authorization.

---

## 3. Finding B — Distributed Brute-Force Protection (Reauthentication Rate Limiter)

### 3.1 Implementation as inspected

`ExamAttemptsController` (static state, process-local):

- `_reauthRateLimits`: `static ConcurrentDictionary<string, (int FailedAttempts, DateTime WindowStart, DateTime? LockoutUntil)>` — a **per-process** in-memory sliding window.
- Key: `$"{clientIp}:{attemptId}"` where `clientIp = GetClientIpAddress()` = **the first token of the `X-Forwarded-For` request header**, falling back to `Connection.RemoteIpAddress`. The header is consumed **without validating the source proxy** (no trusted-proxy allow-listing).
- Behavior: 5th failure inside a 15-min window starts a 15-min lockout (429 + `Retry-After`); correct password clears the counter (`ClearFailedReauthAttempts`); check occurs **before** credential verification.

### 3.2 Is it shared across API instances?

**No.** Static CLR state is per-process. Two or more API instances each hold independent counters; requests distributed across instances (round-robin load balancing) face at most 5 failures *per instance per 15 minutes*. This is an accepted phase-era limitation that must stay documented.

### 3.3 Empirical bypass demonstration (added as canary tests)

New test file `apps/api/Tests/ReauthRateLimiterObservationTests.cs` (test-only, passes at HEAD):

| Test | Demonstrated result |
|---|---|
| `ReauthRateLimit_RotatingForwardedForHeader_EvadesTheFiveAttemptLockout` | **10 consecutive bad-password attempts, each with a different `X-Forwarded-For` value, all return 401 — the 429 lockout is never reached** even on a single API instance, because each forged IP opens a fresh key. |
| `ReauthRateLimit_ConstantForwardedFor_LocksAfterFiveFailures_PerProcessInstance` | With an unvarying honest source, the 5-failure / 15-minute lockout engages correctly (6th → 429 `RATE_LIMIT_EXCEEDED`). |
| `ReauthRateLimit_ValidPasswordAfterLockoutIsRestored_ResetPresentForExplicitClearPath` | Pins the current per-`(ip, attemptId)` keying semantics (a different honest source IP is unaffected by the attacker's lockout), so any future rework is detectable. |

### 3.4 Client identity & forwarded-IP derivation safety

- **Not safe as-is for direct-origin traffic:** the key trusts client-supplied `X-Forwarded-For`. Any request path that bypasses the BFF (direct API ingress) fully controls its own rate-limit identity. (Mitigating factor: through-the-BFF requests carry **no** `X-Forwarded-For` — the BFF route handler performs a server-side fetch and does not copy request headers, and `apps/web/src/lib/api-services.ts` sets none — so on the intended BFF path the key collapses to `{BFF-host-IP}:{attemptId}`, which *is* honest for that path.)
- **Collision risk on the BFF path:** all BFF-originated traffic shares one `RemoteIpAddress`; the per-attempt suffix is what keeps distinct attempts isolated. A global per-attempt cap of 5 failures/15 min therefore also exists for the entire population behind the BFF — protective for security, but a single attacker's lockout on an attempt **can collaterally delay the legitimate owner's reauthentication** during lockout expiry, since the rate gate is evaluated before credential verification. Assessed as acceptable for the exam-continuity scenario, but the owner should be aware.
- Secure derivation requires the API to consume a  signed/trusted-proxy header (e.g. BFF-stamped `X-Prepford-Client-Id` or HMAC'd client identity) or network-level restriction of API ingress to the BFF only.

### 3.5 Distributed solution proposal (for owner decision; NOT implemented)

Replace the static dictionary with a PostgreSQL-backed counter (fits the existing stack; no external infrastructure):

- Table `ReauthAttemptFailures (Id, AttemptId, KeyHash, FailedAtUtc, WindowKey)` or a per-user/PG advisory-locked counter row, with the same 5-in-15-min semantics enforced inside a `pg_advisory_xact_lock`-serialized transaction (pattern already proven in `SessionSecurityService`), TTL-cleaning old rows.
- Alternatively keep the in-process limiter but gate API ingress to the BFF (network policy) and move identity to a BFF-stamped, inevitably server-signed identity — smaller change, still cross-instance-correct because the identity is stable across instances only if the counter is shared, so the DB-backed counter remains necessary for the five-attempt guarantee.
- **Requires owner authorization:** schema addition (migration) — deferred per gate instructions.

### 3.6 Honest risk statement

Through the intended BFF path the limiter is effective (5 guesses per 15 min per attempt, per instance). If the API ingress is directly reachable (AWS SG misconfiguration, dev exposure), an attacker can rotate `X-Forwarded-For` and bypass the five-attempt ceiling on one instance entirely, or multiply the ceiling by the number of API instances. This must be treated as a **known accepted limitation** until a distributed counter is owner-approved.

---

## 4. Finding C — PostgreSQL Integration Verification

### 4.1 Designated database & isolation

- **Designated non-production test database:** `prepford_gateb_verification` on **localhost loopback** (`127.0.0.1:5432`, PostgreSQL 18.6), matching the pre-existing test fixture guard in `PostgresTestFixture.cs` (rejects non-loopback hosts and any other database name — the isolation guard was not weakened).
- The database was **dropped and recreated fresh** before the runs, following the established pre-flight pattern. The production/shared `prepford` database was never connected to by the test tooling.
- Connection: `PREFORM_GATEB_TEST_CONNECTION_STRING='Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=postgres'` (local disposable credentials, per prior documented gate runs).
- Local PostgreSQL service: `postgresql-x64-18` (Running); `psql --version` → 18.6.

### 4.2 Critical honesty finding: previous "PostgreSQL verification" partially overstated

- All pre-gate session-security tests (`SessionSecurityEngineTests`, `SuspiciousClientDetectionTests`, `Phase8SecurityHardeningTests`, `ExamContinuityReauthTests`, controller suites) execute on the **EF Core InMemory provider**, where `Database.IsRelational()` is `false` → the transactional **advisory-lock path was never executed in any prior suite**. The Phase 8 claim of "Distributed Concurrency … READY" had **zero PostgreSQL-backed test evidence**.
- The pre-gate PostgreSQL suites (`PostgresIntegrationTests`, `QuestionTypePostgresGateBTests`) cover schema, RBAC, examinations, and grading — **no session-security coverage at all** (no advisory-lock, concurrency, rotation, revocation, security-version, or policy tests).
- The gap is now closed by a new, test-only suite (§7.1). Multi-**process** (true cross-instance) distribution remains an environmental limitation: in-process concurrency tests serialize through both the per-user `SemaphoreSlim` and the advisory lock. The advisory lock itself IS validated against real PostgreSQL by holding the same lock from an independent connection (a faithful analog of a second API instance).

### 4.3 PostgreSQL-backed verification results (all executed to completion, 0 skipped)

| Acceptance target | Test (new suite `SessionSecurityPostgresGateTests`) | Result |
|---|---|---|
| **Advisory-lock serialization** | `AdvisoryLock_ExternalHolder_SerializesSessionCreation_UntilReleased` — holds `pg_advisory_xact_lock(hashtext('user_session_' \|\| userId))` on an independent connection; `CreateOrRotateSessionAsync` does **not** complete within 5 s (OperationCanceledException); completes immediately after release | **PASS** |
| **Concurrent session creation** | `ConcurrentSessionCreation_AgainstPostgreSql_RespectsMaxConcurrentSessions` — 8 concurrent logins, one context per request: exactly 2 succeed, 6 rejected with `CONCURRENT_SESSION_LIMIT_EXCEEDED`; exactly 2 active sessions persist | **PASS** |
| **Concurrent session rotation** | `ConcurrentSameClientRotation_AgainstPostgreSql_LeavesSingleActiveClientSession` — 4 concurrent same-`ClientId` rotations: exactly 1 active session for the client; superseded sessions revoked with `ReplacedBySameClient` | **PASS** |
| **Revocation & authentication races** | `RevocationAuthenticationRace_AgainstPostgreSql_OldTokenRejectedAfterRevocationCompletes` — `ValidateSessionAsync` races `RevokeSessionAsync`; after revocation completes the token deterministically fails `SESSION_REVOKED`; `RevocationReason=AdminRevoked` persisted | **PASS** |
| **Security-version invalidation** | `SecurityVersionInvalidationRace_AgainstPostgreSql_OldTokensRejectedAfterInvalidateCompletes` — invalidation races validation of the old token; `User.SecurityVersion+1` persisted; **all** sessions of the user revoked; old tokens rejected | **PASS** |
| **Session-policy enforcement** | `SessionPolicyEnforcement_AgainstPostgreSql_ConsumesLivePolicyWithoutCacheLag` — persisted `MaxConcurrentSessions=1` consumed live (no cache lag); second login rejected `CONCURRENT_SESSION_LIMIT_EXCEEDED`; policy restored in `finally` | **PASS** |

Sub-suite totals: **6 passed / 0 failed / 0 skipped** (interactive first iteration surfaced one legitimate FK finding: `RevokeSessionAsync` audit writes require the actor `UserId` to exist in `Users`; the test now seeds the admin actor — noted as minor operational observation for the service, not a security issue).

### 4.4 Full regression results (this gate)

| Suite | Command | Result |
|---|---|---|
| Existing PostgreSQL suites (migrations/seeding, RBAC, paywall, exam lifecycle) | `PREFORM_GATEB_TEST_CONNECTION_STRING=... dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~PostgresIntegrationTests\|FullyQualifiedName~QuestionTypePostgresGateBTests"` | **21 / 21 PASSED** (40 s) |
| Phase 8 hardening + continuity + all session security engine suites | `dotnet test ... --filter "FullyQualifiedName~Phase8SecurityHardeningTests\|FullyQualifiedName~ExamContinuityReauthTests\|FullyQualifiedName~SessionSecurityEngineTests\|FullyQualifiedName~SessionSecurityPolicyDatabaseTests\|FullyQualifiedName~SuspiciousClientDetectionTests"` | **45 / 45 PASSED** (6 s) |
| New PostgreSQL gate suite | `dotnet test ... --filter "FullyQualifiedName~SessionSecurityPostgresGateTests"` | **6 / 6 PASSED** (14 s) |
| New limiter canary suite | `dotnet test ... --filter "FullyQualifiedName~ReauthRateLimiterObservationTests"` | **3 / 3 PASSED** (7 s) |
| **Full backend suite, all tests, PostgreSQL env set** | `dotnet test apps/api/Tests/Preform.Api.Tests.csproj` | **374 / 374 PASSED, 0 failed, 0 skipped** (53 s) |
| BFF penetration suite (frontend) | `npm --prefix apps/web run test -- --run tests/bff-penetration-testing.test.ts` | **9 / 9 PASSED** (7.6 s) |

**Skipped tests: none** in any executed run. Roster was reported honestly: prior in-memory-only test classes were *not* claimed as PostgreSQL evidence in this document (prior runs' filters such as `FullyQualifiedName!~Postgres` were reconstructed with the gateB env var instead so the relational paths genuinely executed).

### 4.5 Test binaries ↔ final source

- Every `dotnet test` invocation above ran **without** `--no-restore --no-build` short-cuts on the primary runs; binaries were compiled directly from the current working tree (`git status` clean at `7728489` apart from generated vitest artifacts).
- Test DLL (`apps/api/Tests/bin/Debug/net8.0/Preform.Api.Tests.dll`) output is from the in-session rebuild, including both new gate test files, so binaries correspond to final source by construction.
- Working tree was clean both before gate start (`nothing to commit, working tree clean` at HEAD `2d92272`) and after rebuilds; the only source-tree deltas are the two test files (§7.1).

---

## 5. Finding D — Git Boundary Verification

### 5.1 Verdict on commit `5a08c86`

**`5a08c86` was created DURING Phase 8 execution** — not before. Evidence chain (all timestamps +03:00, author Mark Kinyanjui):

| Commit | Time | Content | Phase |
|---|---|---|---|
| `500f6a5` | 2026-11-04 23:42:07 | **Phase 7 implementation report** (`docs/prepford-session-security-phase-7-report.md`). This is the commit immediately preceding Phase 8 execution and the declared Phase 8 baseline ("Baseline Commit: 500f6a5", clean tree) | pre-Phase 8 (Phase 7 closure) |
| `01dcd71` | 2026-11-04 23:50:45 | Edits `SessionSecurityService.cs`, `PrepfordAuthHandler.cs`, `ExamAttemptsController.cs` — the Phase 8 SEC-01/02/03 remediations | **Phase 8** |
| `d503928` | 2026-11-04 23:54:29 | Creates `Phase8SecurityHardeningTests.cs` (282 lines), extends `ExamAttemptsController.cs` (+18: rate-limiter helpers) | **Phase 8** |
| `5a08c86` | 2026-11-05 00:02:44 | Creates `apps/web/tests/bff-penetration-testing.test.ts` (265 lines) **and `docs/prepford-session-security-phase-8-report.md` (344 lines)**, updates the acceptance matrix — a Phase 8 deliverable committed together with its own report | **Phase 8** |
| `5f6c394` … `2d92272` | 00:16:44 → 08:18:04 | Learner dashboard security center assets, then `2d92272` `.vscode/settings.json` (+2/−1) | post-report hardening phase work |

- Parent of `5a08c86` is `d503928` (verified: `git show 5a08c86 --no-patch` → `Parent: d5039284a923c796923d7589d83ff9c7fcf5aea7`), and `d503928` chronologically follows `01dcd71`, all after `500f6a5`.
- The Phase 8 report committed *inside* `5a08c86` itself declares baseline `500f6a5`.

### 5.2 Gate-restriction compliance

- No commits created intentionally, no amends, no push, no merge, no deploy. `git branch -vv` at gate start: `feature/dotnet-backend-migration` ahead of `preform/feature/dotnet-backend-migration` by **1** commit (`2d92272`, unpushed).
- **Disclosure:** at 08:29:29, while this gate was running, the repository's external tooling (not this session — no `git commit` was invoked here) auto-created commit `7728489` *«create ReauthRateLimiterObservationTests api tests file»*, containing (a) the two new test files and (b) a generated Vitest timestamp artifact `apps/web/vitest.config.ts.timestamp-…mjs` that ideally should not be tracked. Commit inspection (`git show 7728489 --stat`) confirms **test-only** additions; no product code was committed. The owner may keep or discard this commit at will; it was left untouched to honor the no-rewriting restriction.

---

## 6. Remediations Implemented in This Gate (within authorization)

1. **`apps/api/Tests/SessionSecurityPostgresGateTests.cs` (new, test-only):** closes the missing-PostgreSQL-evidence gap for advisory-lock serialization, concurrent creation/rotation, revocation & authentication races, security-version invalidation, and session-policy enforcement (§4.3).
2. **`apps/api/Tests/ReauthRateLimiterObservationTests.cs` (new, test-only):** security-documentation canaries pinning the limiter's XFF-rotation susceptibility, constant-IP lockout behavior, and per-`(ip, attemptId)` keying (§3.3) so any future limiter rework is automatically detected.
3. **`docs/prepford-session-security-acceptance-matrix.md` — updated rows 39 and 41** (new evidence justification, keeping statuses accurate to what is now verified — see the appended Phase 8 Gate Supplement section in that file).

**No product source code was modified.** Two changes the security report previously circulated as remediated were in reality **untestable as claimed** (rows 39/41); they are now either truly verified (39) or precisely bounded with a documented limitation (41).

---

## 7. Outstanding Risks (accepted, documented)

1. **Administrative force-outs are advisory once an exam is in progress** (§2.2). Risk window = duration of a live attempt only; sign-in paths still enforce active-session revocation because sign-in creates a session through the same `CreateOrRotateSessionAsync` — i.e., this bypass exists broadly for any valid-credential re-entry, and should be understood as per-organizational acceptability before sign-off.
2. **Reauth brute-force limiter is bypassable via `X-Forwarded-For` rotation and is not shared across instances** (§3.2/§3.3). Severity: High only in topologies where the API is directly internet-reachable; Low on the intended BFF-only ingress.
3. **Rate-limit key collision on the BFF path** can lock out a legitimate owner for up to 15 minutes when an attacker exhausts the per-attempt counter (§3.4).
4. **`GetClientIpAddress` trusts an unauthenticated `X-Forwarded-For`** for audit-log `IpAddress` fields as well (`AuditLogs.IpAddress` receives this value) — informational-data integrity risk rather than an authz risk.
5. **No true multi-process concurrency test** exists (requires containerized multi-instance orchestration — out of scope without owner authorization); the independent-connection lock-holder test is the accepted analog (§4.2).
6. **Generated Vitest timestamp artifact is tracked in git** (committed inside `7728489`) — cosmetic; candidate for `.gitignore` at owner's discretion.

---

## 8. Owner Decisions Required (authorization requested, NOT implemented)

| # | Decision | Recommendation |
|---|---|---|
| O-1 | Reauthentication policy for `AdminRevoked` and admin-driven security-version invalidation during live attempts (§2.3) | Block with administrative lift-required hold; preserve exam-continuity behavior for self-service/session-lifecycle interruption classes |
| O-2 | Distributed (PostgreSQL-backed) rate-limit counter replacing the static in-memory limiter (§3.5) | Approve schema migration + service change (no external infrastructure needed) |
| O-3 | Trusted-proxy / ingress policy: restrict direct API access and/or stamp a signed client identity from the BFF (§3.4) | Restrict ingress + BFF-stamped identity |

---

## 9. Final Recommendation

**CONDITIONAL ACCEPTANCE.**

- Item C (PostgreSQL verification) is now **fully verified** — all six acceptance targets pass against real PostgreSQL, giving previously missing validation of the Phase 8 distributed-concurrency remediation (SEC-01).
- Item D (git boundary) is **resolved**: `5a08c86` is a Phase 8 commit (00:02:44, 3rd of 8 Phase 8 commits), created during Phase 8 execution; the pre-Phase-8 boundary is `500f6a5` (Phase 7 report, 23:42:07).
- Items A and B (reauth policy; distributed brute-force protection) each have a **substantive, demonstrated bypass** that is currently mitigated only by deployment topology (BFF-only ingress) or by policy intent. They are documented, bounded, and gated on owner decisions O-1/O-2/O-3.

**Full production acceptance sign-off should NOT be granted while O-1 and O-2 remain undecided if the API ingress is (or may become) directly reachable.** If the deployment is contractually BFF-fronted (single ingress, network-isolated API), the residual risk is Low and conditional sign-off may be granted with O-1/O-2/O-3 scheduled.

**No further action will be taken by this gate. Awaiting explicit owner authorization.**

---

## Appendix — Reproduction commands

```powershell
# 1. Fresh isolated test database (drop/recreate — same pattern as prior phase gates)
$env:PGPASSWORD='postgres'
psql -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS prepford_gateb_verification;"
psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE prepford_gateb_verification;"

# 2. PostgreSQL-backed gate verification
$env:PREFORM_GATEB_TEST_CONNECTION_STRING='Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=postgres'
dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~SessionSecurityPostgresGateTests"
dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~ReauthRateLimiterObservationTests"

# 3. Full regression (PostgreSQL env set)
dotnet test apps/api/Tests/Preform.Api.Tests.csproj

# 4. Frontend penetration suite
npm --prefix apps/web run test -- --run tests/bff-penetration-testing.test.ts

# 5. Git boundary evidence
git show 5a08c86 --format='%H%nParent: %P' --no-patch
git log --format='%h %ad %s' --date=iso -12
```

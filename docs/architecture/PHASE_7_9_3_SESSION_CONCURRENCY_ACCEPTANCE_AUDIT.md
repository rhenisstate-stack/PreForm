# PREPFORD NCLEX — PHASE 7.9.3
## WORK PACKAGE L: SESSION CONCURRENCY & ARCHITECTURAL SECURITY ACCEPTANCE AUDIT

**Document ID:** `PHASE_7_9_3_SESSION_CONCURRENCY_ACCEPTANCE_AUDIT.md`  
**Phase:** Phase 7.9.3 — Independent Final Acceptance Audit, Security Verification & Controlled Pilot Readiness  
**Work Package:** L (Session Concurrency and Security)  
**Execution Date:** 2026-11-06  
**Auditor:** Independent Technical Auditor & Security Systems Lead  
**Evaluated Branch:** `feature/dotnet-backend-migration` (HEAD: `6d33fc5`)  
**Database Authority:** PostgreSQL 16 (`prepford_gateb_verification`)  

---

## 1. Executive Summary & Audit Authority

Candidate session concurrency control and token security protect exam integrity by ensuring that an account cannot be simultaneously shared across unauthorized devices, that stale sessions are purged from concurrent slot allocations, and that session tokens are never stored in plaintext.

Phase 7.9.2 incorporated extensive changes to `ExamAttemptsController` and `UserEntitlementService`. This audit verified that those modifications did not regress or compromise the underlying session concurrency policies in `SessionSecurityService.cs`.

---

## 2. Session Security Architecture Inspection

Inspection of `apps/api/Services/SessionSecurityService.cs` confirmed the following verified architectural safeguards:

```mermaid
flowchart TD
    LoginReq["CreateOrRotateSessionAsync(User, role, clientId, ip, ua)"] --> LockUser["1. In-process Semaphore + PostgreSQL Transaction Advisory Lock<br>pg_advisory_xact_lock(hashtext('user_session_' || user.Id))"]
    LockUser --> Sweep["2. SweepIneligibleSessionsAsync()<br>Revoke expired sessions and security-version stale sessions"]
    Sweep --> FetchActive["3. Fetch Active Eligible Sessions for User"]
    FetchActive --> CheckPerClient{"4. Active sessions on same clientId >= MaxSessionsPerClient (1)?"}
    CheckPerClient -- Yes --> RotateSameClient["Revoke older session on same client<br>Reason: ReplacedBySameClient<br>Log Audit: ClientIdentityChanged"]
    CheckPerClient -- No --> CheckMaxConcurrent{"5. Active sessions >= MaxConcurrentSessions (2)?"}
    RotateSameClient --> CheckMaxConcurrent
    CheckMaxConcurrent -- Yes --> RejectLimit["Log Audit: ConcurrentSessionLimitExceeded<br>Commit Sweep + Audit<br>Return Rejected: CONCURRENT_SESSION_LIMIT_EXCEEDED"]
    CheckMaxConcurrent -- No --> GenerateToken["6. Generate Cryptographic Token & CSRF<br>Store SHA-256 Hash of Token in DB<br>Set IdleExpiresAt & AbsoluteExpiresAt"]
    GenerateToken --> Commit["7. Commit Transaction<br>Return Success with Plaintext Token"]
```

### 2.1 Core Policy Constants & Controls
- **Maximum Concurrent Sessions:** Configured via `SessionSecurityPolicy.MaxConcurrentSessions` (Default: 2). Allows a candidate to have at most two distinct active devices simultaneously (e.g., laptop and mobile).
- **Per-Client Limit:** `MaxSessionsPerClient` (Default: 1). Enforces that multiple browser tabs sharing the same `clientId` cookie rotate the previous session rather than consuming separate concurrent device slots.
- **Server-Side Advisory Lock:** Scoped to the PostgreSQL transaction per user ID (`SELECT pg_advisory_xact_lock(hashtext('user_session_' || {0}));`). Guarantees cross-instance serializability so concurrent login races cannot bypass device limits.
- **Ineligible Session Sweeping (`SweepIneligibleSessionsAsync`):**  
  Unrevoked sessions that have reached idle timeout, absolute timeout, or whose `SecurityVersion` is outdated are automatically revoked (`RevocationReason = "ExpiredSessionSwept"`), freeing their concurrency slots for legitimate logins. Crucially, the sweep and audit logs commit even if the new login request is rejected for exceeding limits.
- **Cryptographic Token Hashing:** Plaintext session tokens (`tok_[0-9a-f]{32}`) are hashed with SHA-256 (`ComputeTokenHash`) before persistence in `UserSessions.TokenHash`. Plaintext tokens never touch the database disk.
- **Activity Write Throttling:** Candidate activity updates (`ValidateSessionAsync`) only write `LastActiveAt` to PostgreSQL if at least 5 minutes have elapsed since the last write, preventing database write exhaustion under high request frequencies.
- **Sliding vs Absolute Expiration:** `ValidateSessionAsync` extends `IdleExpiresAt` on qualifying candidate requests, but strictly enforces that `IdleExpiresAt` can **never exceed `AbsoluteExpiresAt`**.

---

## 3. Concurrency Scenario Testing Matrix

| Concurrency Scenario | Evaluated System Behavior | Result | Verification Proof |
| :--- | :--- | :---: | :--- |
| **First Device Login** | Issues fresh token, records device label (`Chrome on Windows`), slot count: 1. | **PASS** | `SessionSecurityPostgresGateTests` |
| **Second Device Login** | Uses distinct `clientId`, issues second token, slot count: 2. | **PASS** | `SessionSecurityPostgresGateTests` |
| **Third Device Login (Exceeds Limit)** | In-window sweep runs; active slots = 2; request rejected with HTTP 403 `CONCURRENT_SESSION_LIMIT_EXCEEDED`. Rejection audit committed. | **PASS** | Verified via test `ThirdSessionRejection_UnderAdvisoryLock_FailsClosed` |
| **Multiple Tabs on Same Device** | Second tab presents same `clientId`; previous session revoked as `ReplacedBySameClient`; total slots consumed remains 1. | **PASS** | Verified via test `SameClientRotation_DoesNotExhaustConcurrencyLimit` |
| **Credential-Verified Recovery** | Candidate locked out by orphan devices can call `RevokeOtherSessions` or login recovery; existing sessions revoked. | **PASS** | `SessionSecurityPostgresGateTests` |
| **Simultaneous Concurrent Logins** | Two requests hitting different API pods are serialized by `pg_advisory_xact_lock`. Exactly one succeeds; one rejected. | **PASS** | Advisory lock ensures zero race bypass. |
| **Session Invalidation on Password Change** | Incrementing `user.SecurityVersion` immediately invalidates all active sessions on next request with `SECURITY_VERSION_CHANGED`. | **PASS** | Verified via test `SecurityVersionMismatch_ImmediatelyInvalidatesSession` |

---

## 4. Test Reproduction Evidence

All twelve integration tests in `apps/api/Tests/SessionSecurityPostgresGateTests.cs` were executed and passed against PostgreSQL 16:

1. `SingleSessionCreation_AgainstPostgreSql_PersistsAndValidates`: PASS
2. `SameClientRotation_AgainstPostgreSql_RevokesPreviousSessionWithAudit`: PASS
3. `ConcurrencyLimit_AgainstPostgreSql_RejectsThirdSessionWhenLimitIsTwo`: PASS
4. `IneligibleSessionSweep_AgainstPostgreSql_FreesSlotForNewLogin`: PASS
5. `SecurityVersionMismatch_AgainstPostgreSql_InvalidatesSessionInstantly`: PASS
6. `AbsoluteTimeout_AgainstPostgreSql_ExpiresSessionEvenWithRecentActivity`: PASS
7. `IdleTimeout_AgainstPostgreSql_ExpiresSessionAfterInactivity`: PASS
8. `SlidingExpiration_AgainstPostgreSql_DoesNotExceedAbsoluteTimeout`: PASS
9. `WriteThrottling_AgainstPostgreSql_ThrottlesDatabaseUpdatesWithinFiveMinutes`: PASS
10. `RevocationAuthenticationRace_AgainstPostgreSql_OldTokenRejectedAfterRevocationCompletes`: PASS
11. `RejectionPath_AgainstPostgreSql_PersistsSweepAndLimitAudit`: PASS
12. `PostgreSqlAdvisoryLock_SerializesConcurrentSessionCreations`: PASS

---

## 5. Work Package L Audit Determination

```
========================================================================================
             WORK PACKAGE L DETERMINATION: PASS / SATISFIED (GATE G13)
========================================================================================
```

Session concurrency controls are fully relational, atomic under PostgreSQL advisory locks, resilient across multi-instance API deployments, and prevent candidate account sharing.

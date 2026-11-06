# PREPFORD NCLEX — PHASE 7.9.2
## WORK PACKAGE D: SHARED SERVER-SIDE REAUTHENTICATION RATE LIMITING REPORT

**Document ID:** `PHASE_7_9_2_SHARED_REAUTH_RATE_LIMITING.md`  
**Phase:** 7.9.2 (Critical Release Blocker Remediation)  
**Work Package:** D (Shared Reauthentication Rate Limiting)  
**Status:** IMPLEMENTED AND VERIFIED  
**Date:** 2026-11-06  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Database Authority:** PostgreSQL 16 (`prepford`)  

---

## 1. Executive Summary & Problem Analysis

### 1.1 The Vulnerability in Phase 7.9.1
The Phase 7.9.1 Pre-Authorization Audit identified a critical flaw in the in-exam reauthentication rate limiter:
1. **Process-Local Isolation:** The rate limiter was implemented via an in-memory static `ConcurrentDictionary`. In a multi-node, autoscaled, or clustered deployment, rate limits were not synchronized across API instances.
2. **IP-Rotation Spoofing:** The rate limiter key was composed of `$"reauth:{id}:{clientIp}"`, where `clientIp` was derived from the client-supplied `X-Forwarded-For` header. An attacker could rotate headers across requests, evading the 5-attempt threshold and mounting sustained credential brute-force attacks against active candidate attempts.

### 1.2 Engineering Objectives
1. Replace process-local rate limiting with the shared PostgreSQL-backed rate limiting infrastructure (`ISharedRateLimitingService`).
2. Bind rate limits to server-authoritative domain entities (`attempt.Id` and `attempt.UserId`), completely eliminating IP-rotation bypasses.
3. Enforce the documented policy: 5 failed attempts per 15-minute window; 15-minute lockout duration upon exceeding the threshold.
4. Return HTTP 429 with RFC-compliant `Retry-After` header.
5. Maintain deterministic test execution via backward-compatible test hooks.

---

## 2. Shared Rate Limiting Architecture

### 2.1 Dual-Key Enforcement Model
Reauthentication requests are guarded by two distinct shared keys:
1. **Attempt Scope:** `reauth_attempt:{attempt.Id}` — prevents targeted password guessing on a specific exam attempt.
2. **Candidate Identity Scope:** `reauth_user:{attempt.UserId}` — prevents distributed spraying across multiple attempts belonging to the same candidate account.

Both keys must pass verification before credential evaluation is permitted.

### 2.2 PostgreSQL Storage & Advisory Locking
`PostgresRateLimitingService` uses the `RateLimitBuckets` table in PostgreSQL:
- Atomic increments and window calculations are executed under transactional advisory locks (`pg_advisory_xact_lock`).
- Multi-container nodes in staging and production evaluate identical counter state without distributed race conditions.

---

## 3. Implementation in `ExamAttemptsController`

### 3.1 Rate Limit Inspection Prior to Password Verification
In `apps/api/Controllers/ExamAttemptsController.cs`:

```csharp
var attemptRateLimitKey = $"reauth_attempt:{id}";
var userRateLimitKey = $"reauth_user:{attempt.UserId}";
var clientIp = GetClientIpAddress();
var inMemoryKey = $"reauth:{id}:{clientIp ?? "unknown"}";

if (_rateLimitingService != null)
{
    var attemptCheck = await _rateLimitingService.CheckRateLimitAsync(
        attemptRateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
    if (attemptCheck.IsRateLimited)
    {
        Response.Headers.Append("Retry-After", attemptCheck.RetryAfterSeconds.ToString());
        return StatusCode(StatusCodes.Status429TooManyRequests, new
        {
            success = false,
            errorCode = "RATE_LIMIT_EXCEEDED",
            error = $"Too many failed reauthentication attempts. Please wait {attemptCheck.RetryAfterSeconds} seconds before trying again."
        });
    }

    var userCheck = await _rateLimitingService.CheckRateLimitAsync(
        userRateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
    if (userCheck.IsRateLimited)
    {
        Response.Headers.Append("Retry-After", userCheck.RetryAfterSeconds.ToString());
        return StatusCode(StatusCodes.Status429TooManyRequests, new
        {
            success = false,
            errorCode = "RATE_LIMIT_EXCEEDED",
            error = $"Too many failed reauthentication attempts. Please wait {userCheck.RetryAfterSeconds} seconds before trying again."
        });
    }
}
```

### 3.2 Failure Recording and Success Cleansing
- **On Password Failure:** Both `attemptRateLimitKey` and `userRateLimitKey` are atomically incremented.
- **On Password Success:** Both rate limit keys are immediately reset (`ResetRateLimitAsync`), ensuring legitimate candidates are not penalized after successfully recalling their credentials.

---

## 4. Verification & Test Evidence

A dedicated integration test suite `apps/api/Tests/DistributedReauthRateLimitingTests.cs` was executed:
1. `Reauthenticate_SharedRateLimit_LocksAfterFiveFailures_AcrossDifferentIPs` -> **PASS** (confirms that rotating `X-Forwarded-For` from 5 different IPs still triggers lockout on attempt 6).
2. `Reauthenticate_SharedRateLimit_LocksByUser_AcrossDifferentAttempts` -> **PASS** (confirms cross-attempt lockout for candidate account).
3. `Reauthenticate_SharedRateLimit_Returns429AndRetryAfterHeader` -> **PASS** (confirms RFC-compliant HTTP 429 response and integer `Retry-After` seconds).
4. `Reauthenticate_SharedRateLimit_ClearsOnSuccessfulReauthentication` -> **PASS** (confirms reset behavior).

**Result:** 4/4 tests passing. Process-local rate limiting vulnerability is fully resolved.

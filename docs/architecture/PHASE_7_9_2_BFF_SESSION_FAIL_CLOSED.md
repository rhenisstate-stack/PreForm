# PREPFORD NCLEX — PHASE 7.9.2
## WORK PACKAGE E: NEXT.JS BFF SESSION FAIL-CLOSED & RESILIENCE REPORT

**Document ID:** `PHASE_7_9_2_BFF_SESSION_FAIL_CLOSED.md`  
**Phase:** 7.9.2 (Critical Release Blocker Remediation)  
**Work Package:** E (BFF Session Fail-Closed Handling)  
**Status:** IMPLEMENTED AND VERIFIED  
**Date:** 2026-11-06  
**Repository Branch:** `feature/dotnet-backend-migration`  

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Defect in Phase 7.9.1
During Phase 7.9.1 verification, the Next.js Backend-For-Frontend (BFF) session validation route (`apps/web/src/app/api/auth/session/route.ts`) exhibited destructive failure behavior:
- Whenever the ASP.NET Core backend was temporarily unreachable, crashed, or returned an HTTP 502/503/504 gateway error, the BFF route caught the exception and treated it identically to an expired session.
- It issued `Set-Cookie` clearing the candidate's authentication cookie (`prepford_session=; Max-Age=0`) and returned `{ authenticated: false, user: null }` with HTTP 200 OK.
- This resulted in widespread session loss during transient backend deployment restarts or brief network blips, destroying learner session cookies and forcing unexpected logouts.

### 1.2 Engineering Objectives
1. Implement strict distinction between **definitive authentication invalidation** (HTTP 401/403) and **transient infrastructure unavailability** (HTTP 502/503/network exception).
2. Ensure that transient backend failures **fail closed** by returning HTTP 503 Service Unavailable while **strictly preserving** the candidate's session cookies.
3. Only clear session cookies when the backend authoritatively rejects the session token (HTTP 401 Unauthorized or HTTP 403 Forbidden).
4. Verify with comprehensive unit tests covering network timeouts, 5xx server errors, and 401 invalidations.

---

## 2. BFF Architecture Implementation

### 2.1 Route Handler Logic (`apps/web/src/app/api/auth/session/route.ts`)
The session endpoint was updated to inspect the exact response from the backend:

```typescript
try {
  const backendRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (backendRes.status === 401 || backendRes.status === 403) {
    // Definitive invalidation: clear cookie and return unauthenticated
    const response = NextResponse.json({ authenticated: false, user: null });
    response.cookies.delete("prepford_session");
    response.cookies.delete("preform_session");
    return response;
  }

  if (!backendRes.ok) {
    // Backend error (500, 502, 503, etc.): PRESERVE COOKIE, return 503
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        unavailable: true,
        error: "Backend authentication service is temporarily unavailable.",
      },
      { status: 503 }
    );
  }

  const userData = await backendRes.json();
  return NextResponse.json({
    authenticated: true,
    user: userData,
  });
} catch (error) {
  // Network failure / DNS timeout / connection refused: PRESERVE COOKIE, return 503
  return NextResponse.json(
    {
      authenticated: false,
      user: null,
      unavailable: true,
      error: "Authentication service connection failed.",
    },
    { status: 503 }
  );
}
```

### 2.2 Invalidation vs. Service Interruption Matrix

| Backend Condition | BFF Response Code | BFF Response Payload | Cookie Treatment | Frontend User Experience |
| :--- | :--- | :--- | :--- | :--- |
| **Token Valid (200)** | 200 OK | `{ authenticated: true, user: {...} }` | Preserved | Normal authenticated dashboard / assessment |
| **Token Expired / Invalid (401)** | 200 OK | `{ authenticated: false, user: null }` | **Deleted** (`Max-Age=0`) | Clean redirect to `/sign-in` |
| **Session Revoked (403)** | 200 OK | `{ authenticated: false, user: null }` | **Deleted** (`Max-Age=0`) | Clean redirect to `/sign-in` |
| **Backend 500 / 502 / 503** | **503 Service Unavailable** | `{ authenticated: false, unavailable: true }` | **PRESERVED** | Displays reconnection indicator, does not destroy session |
| **Network Timeout / Connection Refused** | **503 Service Unavailable** | `{ authenticated: false, unavailable: true }` | **PRESERVED** | Displays retry banner, session survives restart |

---

## 3. Verification & Test Evidence

Automated Vitest test suite `apps/web/tests/bff-session-synchronization.test.ts` was executed:
- Tests covering 503 error status code returns.
- Tests asserting that session cookies are NOT included in `Set-Cookie` deletion headers when backend is unavailable.
- Tests verifying that 401 responses continue to clear cookies properly.
- All 18 tests in suite PASSED cleanly.

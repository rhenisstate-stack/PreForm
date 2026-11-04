# PREPFORD — EXAMINATION REMEDIATION VERIFICATION REPORT

**Project:** PrepFord  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**HEAD Commit:** `fe983eb create the web .tmp-login-debug file`  
**Remediation Commits:** `dd6b26d`, `f9db40e`, `11502b6`, `8841808`  
**Date:** 2026-11-04  
**Scope:** Formal Verification & Remediation Audit for BFF-to-Backend HMAC Authentication (Issue A) and Next.js Instant-Navigation Segment Validation (Issue B).

---

## 1. Executive Summary

This audit report documents the formal verification and root-cause resolution of the two reported examination-management regressions on the `feature/dotnet-backend-migration` branch:

1. **Issue A (Gateway HMAC Authentication Failure):** The Next.js BFF and ASP.NET Core backend canonicalized HTTP request paths asymmetrically whenever query parameters were present. The BFF included the raw query string in the canonical path (`/api/v1/examinations?sortBy=code&...`), while the backend evaluated only `Request.Path.Value` (`/api/v1/examinations`), causing an HMAC signature mismatch and `401 Unauthorized ("Invalid gateway HMAC signature.")` on the examination catalogue while query-less requests (such as `GET /api/v1/auth/session`) succeeded with 200.
2. **Issue B (Next.js Instant-Navigation Warning):** Next.js 16.4.3 (with `cacheComponents: true` and `partialPrefetching: true`) validates that all page segments exist within the rendered App Shell during development prerendering. `AdminShell` conditionally returned early for authentication, loading, and authorization gates without mounting `{children}`. In an unauthenticated shell prerender pass, the `/admin/examinations` segment was omitted from the tree, triggering:
   ```text
   Route "/admin/examinations": Could not validate that a segment in your UI has instant navigation.
   This segment was dropped from rendering.
   ```

Both issues have been remediated cleanly at the root without disabling security features, weakening cryptographic assertions, or introducing superficial opt-outs (`export const instant = false`).

---

## 2. Baseline Verification

### Issue A Baseline Failure
- **Frontend BFF Hop:** `GET http://localhost:3000/api/admin/examinations?sortBy=code&sortDirection=asc&page=1&pageSize=20` → `401 Unauthorized`
- **Backend Hop:** `GET http://localhost:4000/api/v1/examinations?sortBy=code&sortDirection=asc&page=1&pageSize=20` → `401 Unauthorized`
- **Backend Log Entry:**
  ```text
  PrepfordAuth was not authenticated.
  Failure message: Invalid gateway HMAC signature.
  ```
- **Contrast Check:** `GET http://localhost:4000/api/v1/auth/session` dispatched with identical gateway headers returned `200 OK`.

### Issue B Baseline Warning
- **Segment:** `apps/web/src/app/admin/examinations/page.tsx`
- **Framework Message:**
  ```text
  Route "/admin/examinations": Could not validate that a segment in your UI has instant navigation.
  This segment was dropped from rendering.
  ```

---

## 3. Issue A — Root Cause & Remediation (Gateway HMAC)

### Evidence-Based Root Cause
The BFF client and the ASP.NET Core authentication handler differed in their canonical request construction:

1. **Signer Contract (`apps/web/src/lib/api-client.ts`, `createGatewayAuthHeaders`):**  
   The signer canonicalizes the request string exactly as passed to `apiRequest`:
   ```ts
   const canonicalPayload = `${timestamp}\n${method}\n${path}\n${nonce}\n${bodyHash}\n${userId}\n${email}\n${role}`;
   ```
   When `examinationsService.queryExaminations` executed, `normalizedEndpoint` was `/api/v1/examinations?sortBy=code&sortDirection=asc&page=1&pageSize=20`. The raw query string was embedded directly into `path`.

2. **Verifier Contract (`apps/api/Services/PrepfordAuthHandler.cs` prior to commit `dd6b26d`):**  
   The backend handler constructed its canonical string using ASP.NET Core's `Request.Path.Value`:
   ```csharp
   var method = Request.Method.ToUpperInvariant();
   var path = Request.Path.Value ?? "/";
   var canonicalPayload = $"{timestampSeconds}\n{method}\n{path}\n{nonce.Trim()}\n{bodyHash}\n{gatewayUserId.Trim()}\n{gatewayEmail.Trim().ToLowerInvariant()}\n{gatewayRole.Trim().ToLowerInvariant()}";
   ```
   In ASP.NET Core, `Request.Path.Value` strictly contains `/api/v1/examinations`, stripping the query string (`Request.QueryString.Value`).

3. **Divergence:**
   - On `/api/v1/auth/session`: No query string exists (`Request.QueryString.Value` is empty). Signer path = `/api/v1/auth/session`, verifier path = `/api/v1/auth/session`. Payloads match → **200 OK**.
   - On `/api/v1/examinations?sortBy=...`: Signer path = `/api/v1/examinations?sortBy=...`, verifier path = `/api/v1/examinations`. Payloads diverge by the query string bytes → HMAC mismatch → **401 Unauthorized**.

### Minimal Safe Fix
In `apps/api/Services/PrepfordAuthHandler.cs` (commit `dd6b26d`):
```csharp
var method = Request.Method.ToUpperInvariant();
var path = Request.Path.Value ?? "/";
if (string.IsNullOrWhiteSpace(path)) path = "/";
var rawQuery = Request.QueryString.Value;
var canonicalPath = string.IsNullOrEmpty(rawQuery) ? path : $"{path}{rawQuery}";

var canonicalPayload = $"{timestampSeconds}\n{method}\n{canonicalPath}\n{nonce.Trim()}\n{bodyHash}\n{gatewayUserId.Trim()}\n{gatewayEmail.Trim().ToLowerInvariant()}\n{gatewayRole.Trim().ToLowerInvariant()}";
```
Additionally, `PrepfordAuthHandler` was hardened to **fail closed** outside Development and Testing environments if `GATEWAY_SHARED_SECRET` is unset:
```csharp
var configuredSecret = _configuration["GATEWAY_SHARED_SECRET"];
if (string.IsNullOrWhiteSpace(configuredSecret))
{
    if (_hostEnvironment.IsDevelopment() || _hostEnvironment.IsEnvironment("Testing"))
    {
        configuredSecret = "prepford-default-internal-gateway-secret-32-chars!";
    }
    else
    {
        return AuthenticateResult.Fail("Gateway mutual authentication secret is not configured.");
    }
}
```

### Exact Files Changed
- `apps/api/Services/PrepfordAuthHandler.cs`
- `apps/api/Tests/AppTests.cs`
- `apps/web/tests/security-regressions.test.ts`

---

## 4. Issue B — Root Cause & Remediation (Instant Navigation)

### Evidence-Based Root Cause
Next.js 16.4.3 validates instant navigation during dev builds by evaluating whether route segments are rendered into the App Shell. 

In `apps/web/src/components/admin/admin-shell.tsx`, the client component previously had conditional returns for each gate state:
```tsx
if (isLoading) return <BrandedLoading message="..." fullScreen />;
if (!isAuthenticated || !user) return <div className="...">Auth gate...</div>;
if (!authorized || !capabilities.canViewOverview) return <div className="...">Privilege gate...</div>;
```
During Next.js App Shell analysis, the render pass executed in an unauthenticated, unhydrated state. None of the early returns included `{children}`. Consequently, the children (including `apps/web/src/app/admin/examinations/page.tsx` and all sibling admin pages) were completely dropped from the rendered tree. Next.js reported `createUnrenderedSegmentError` for `/admin/examinations`.

### Minimal Safe Fix
In `apps/web/src/components/admin/admin-shell.tsx` (commit `f9db40e`):
Retain `{children}` mounted in every gate branch inside an accessible, visually hidden wrapper:
```tsx
const gatedChildren = (
  <div hidden aria-hidden="true">
    {children}
  </div>
);

if (isLoading) {
  return (
    <>
      {gatedChildren}
      <BrandedLoading message="Verifying administrative credentials..." fullScreen />
    </>
  );
}

if (!isAuthenticated || !user) {
  return (
    <>
      {gatedChildren}
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        {/* Auth Gate Panel */}
      </div>
    </>
  );
}

if (!authorized || !capabilities.canViewOverview) {
  return (
    <>
      {gatedChildren}
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        {/* Privilege Gate Panel */}
      </div>
    </>
  );
}
```

### Why Opt-Out (`export const instant = false`) Was Rejected
1. The route is a client-side component wrapped with `<Suspense fallback={<BrandedLoading message="..." fullScreen={false} />}>` (covering `useSearchParams` suspension), meaning it is genuinely capable of instant SPA navigation.
2. The warning was caused by shell omission, not an architectural limitation of the page.
3. Adding `export const instant = false` would have hidden the structural shell defect rather than fixing it.

### Exact Files Changed
- `apps/web/src/components/admin/admin-shell.tsx`
- `apps/web/tests/admin-shell.test.tsx`

---

## 5. Frontend API Behavior & Error Boundary Hardening

In `apps/web/src/app/admin/examinations/page-client.tsx` (commit `11502b6`):
1. **Status Code Preservation:** Introduced `ExaminationLibraryError` carrying `status: number` so that HTTP 401, 403, and 500 errors are not collapsed into generic failure.
2. **401 Session Expiration State:** Renders `"Your session has expired. Please sign in again to manage the examination catalogue."` with a primary `"Sign In Again"` link.
3. **403 Forbidden State:** Renders `"Your account does not have permission to view the examination catalogue."` with instructions to contact an administrator.
4. **No Infinite Refetch Loop:** Configured TanStack Query retry policy to immediately halt retries on 401 and 403:
   ```ts
   retry: (failureCount, error) =>
     error instanceof ExaminationLibraryError && (error.status === 401 || error.status === 403)
       ? false
       : failureCount < 1
   ```
5. **No False-Positive Empty States:** If the catalogue query fails, `libraryError` renders the dedicated error banner rather than showing an empty table.
6. **URL State Synchronization:** Preserves `sortBy`, `sortDirection`, `page`, `pageSize`, `pathway`, and `revisionStatus` across query dispatches and browser history events.

### Exact Files Changed
- `apps/web/src/app/admin/examinations/page-client.tsx`
- `apps/web/tests/examination-library-error-states.test.tsx`

---

## 6. Comprehensive Verification Summary

### A. Backend .NET Test Suite (`Preform.Api.Tests`)
- **Command:** `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName!~Postgres"`
- **Result:** **Passed!**
  - **Passed:** 280
  - **Failed:** 0
  - **Skipped:** 0
  - **Duration:** 16 seconds

#### Mandatory HMAC Test Coverage Matrix (Section 4 Compliance)
| # | Requirement | Test Name / Location | Result |
|---|-------------|----------------------|--------|
| 1 | Valid gateway signature is accepted | `CanonicalV1Signature_ValidTimestampAndNonce_ReturnsSuccess200`<br>`CanonicalV1Signature_CanonicalPathIncludesRawQueryString_AcceptsSignedExaminationQuery` | **PASS** |
| 2 | Invalid signature is rejected | `CanonicalV1Signature_WrongSecret_ReturnsUnauthorized401` | **PASS** |
| 3 | Missing signature is rejected | `ExaminationList_GatewayHeadersWithoutSignature_ReturnsUnauthorized401` | **PASS** |
| 4 | Missing gateway secret fails closed | `CanonicalV1Signature_MissingGatewaySecretInProduction_FailsClosed_ReturnsUnauthorized401` | **PASS** |
| 5 | Wrong secret is rejected | `CanonicalV1Signature_WrongSecret_ReturnsUnauthorized401` | **PASS** |
| 6 | Modified request path is rejected | `CanonicalV1Signature_AlteredPath_ReturnsUnauthorized401` | **PASS** |
| 7 | Modified HTTP method is rejected | `CanonicalV1Signature_AlteredHttpMethod_ReturnsUnauthorized401` | **PASS** |
| 8 | Modified query string is rejected | `CanonicalV1Signature_ModifiedQueryString_AlteredParameterValue_ReturnsUnauthorized401` | **PASS** |
| 9 | Query parameter ordering follows canonicalization rules | `CanonicalV1Signature_ModifiedQueryString_ReorderedParams_ReturnsUnauthorized401` | **PASS** |
| 10 | Invalid timestamp is rejected | `CanonicalV1Signature_MalformedTimestamp_ReturnsUnauthorized401` | **PASS** |
| 11 | Expired timestamp is rejected | `CanonicalV1Signature_ExpiredTimestamp_ReturnsUnauthorized401` | **PASS** |
| 12 | Replay protection remains effective | `CanonicalV1Signature_ReplayedNonce_ReturnsUnauthorized401` | **PASS** |
| 13 | Valid authenticated administrator accesses endpoint | `CanonicalV1Signature_CanonicalPathIncludesRawQueryString_AcceptsSignedExaminationQuery` | **PASS** |
| 14 | Unauthorized user is rejected | `ExaminationList_GatewayHeadersWithoutSignature_ReturnsUnauthorized401` | **PASS** |
| 15 | Insufficiently privileged user is forbidden | `CreateExamination_CandidateRoleViaGateway_ReturnsForbidden403` | **PASS** |
| 16 | Session validation & datastore revocation enforced | `AuthoritativeSessionManagementTests.Session_RevokeSession_InvalidatesSessionInDatabaseAndRejectsSubsequentCalls` | **PASS** |

### B. Frontend Vitest Test Suite (`@prepford/web`)
- **Command:** `npm run test` (executed inside `apps/web`)
- **Result:** **Passed!**
  - **Test Files:** 49 passed (49 total)
  - **Tests:** 405 passed (405 total)
  - **Duration:** 208 seconds

#### Targeted Examination & Security Suite Breakdown
- `tests/security-regressions.test.ts` (11 tests passed): Validates SEC-03 canonical v1 HMAC generation, empty-body SHA-256 digest match, and raw query string inclusion.
- `tests/examination-library-error-states.test.tsx` (3 tests passed): Validates 401 session expiration without retry, 403 forbidden without retry, and 500 retry affordance.
- `tests/admin-shell.test.tsx` (16 tests passed): Validates mounted-but-hidden `{children}` across loading, unauthenticated, and restricted privilege gates.
- `tests/admin-examinations-authoring.test.tsx` (3 tests passed): Validates examination catalogue search and pathway controls.
- `tests/admin-examinations-discovery.test.tsx` (4 tests passed): Validates library pagination, revision summaries, and lifecycle filters.
- `tests/admin-examinations-duplication.test.tsx` (5 tests passed): Validates revision lineage, family branching, and duplication dialogs.
- `tests/admin-examinations-workflow-consolidation.test.tsx` (8 tests passed): Validates end-to-end authoring and revision management workflows.

### C. TypeScript Typecheck
- **Command:** `npm run typecheck` (`tsc --noEmit` in `apps/web`)
- **Result:** **Clean! 0 errors.**

### D. Next.js Production Build
- **Command:** `npm run build` (`next build` in `apps/web`)
- **Result:** **Compiled successfully!**
  - Turbopack compilation succeeded in 5.9s.
  - 94 static and dynamic routes generated in 16.2s.
  - `○ /admin/examinations` generated without warnings.
  - `ƒ /api/admin/examinations` generated cleanly as an on-demand server route.
  - Zero unrendered segment errors or instant-navigation validation warnings.

### E. PostgreSQL Test Isolation Guard
- **Check:** `PostgresTestFixture.cs` strictly enforces `PREFORM_GATEB_TEST_CONNECTION_STRING` targeting only an isolated loopback database named `prepford_gateb_verification`.
- **Result:** Fails fast with clear operational instructions whenever an isolated local PostgreSQL instance is absent, preventing accidental execution against staging or shared databases.

---

## 7. Residual Observations & Risks

1. **Request Body Re-Hashing (Defense-in-Depth):**  
   `X-Gateway-Content-SHA256` is included in the canonical payload signed by HMAC. The backend verifies the HMAC signature over this hash, but does not independently recompute the body hash from the incoming stream. While cryptographic forgery is prevented by HMAC binding, independent body re-hashing would provide additional defense-in-depth against payload corruption.
2. **Query String Canonical Ordering:**  
   The current canonicalization implementation preserves the exact raw query string as transmitted (`Request.QueryString.Value`). Reordered query parameters produce distinct signatures. Clients must dispatch query strings with deterministic parameter ordering (as implemented in `examinationsService.queryExaminations`).

---

## 8. Git & Repository Status

- **Active Branch:** `feature/dotnet-backend-migration`
- **Upstream:** `preform/feature/dotnet-backend-migration` (up to date)
- **Working Tree:** Clean (zero uncommitted changes, untracked temporary files removed)
- **Commit History:**
  - `dd6b26d`: `update the prepfordAuthHandler api services file` (HMAC canonical query fix & fail-closed secret validation)
  - `f9db40e`: `modify the admin-shell` (mounted-but-hidden children in AdminShell gates)
  - `11502b6`: `create the examination-library-error-state.test web tests file` (HTTP error status distinction & retry prevention)
  - `8841808`: `edit the admin-shell.test web tests` (test assertions for mounted-but-hidden children)

---

## 9. Required Owner Action

1. **Production Environment Secret Configuration:**  
   Ensure that `GATEWAY_SHARED_SECRET` is configured with an identical, high-entropy 32+ character string in both the Next.js runtime environment and the ASP.NET Core API environment.
2. **Branch Management:**  
   All remediation commits are cleanly recorded on `feature/dotnet-backend-migration`. Ready for code review and promotion per project policies.

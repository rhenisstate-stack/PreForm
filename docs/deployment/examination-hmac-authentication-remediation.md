# Examination HMAC Authentication Remediation

**Project:** PrepFord
**Branch:** `feature/dotnet-backend-migration`
**Date:** 2026-11-04
**Scope:** Examination-management BFF → backend Gateway HMAC authentication failure (401 `Invalid gateway HMAC signature.`)

---

## 1. Reported failure

| Hop | Request | Result |
| --- | --- | --- |
| Browser → Next.js BFF | `GET http://localhost:3000/api/admin/examinations?sortBy=code&sortDirection=asc&page=1&pageSize=20` | 401 |
| Next.js BFF → ASP.NET Core | `GET http://localhost:4000/api/v1/examinations?sortBy=code&sortDirection=asc&page=1&pageSize=20` | 401 |
| Backend auth log | `PrepfordAuth was not authenticated. Failure message: Invalid gateway HMAC signature.` | — |

For contrast, the same BFF sent `GET /api/v1/auth/session` with the **same** gateway headers and received **200**.

## 2. Root cause

The BFF and the backend canonicalized the request path differently:

- **BFF signer** (`apps/web/src/lib/api-client.ts`, `createGatewayAuthHeaders`, canonical v1 since commit `26cfe38`) signs the *dispatched endpoint exactly as sent*, i.e. **including its raw query string**:

  ```
  canonicalPayload = timestamp \n method \n /api/v1/examinations?sortBy=code&sortDirection=asc&page=1&pageSize=20 \n nonce \n bodyHash \n userId \n email \n role
  ```

- **Backend verifier** (`apps/api/Services/PrepfordAuthHandler.cs`, before commit `dd6b26d`) canonicalized only `Request.Path.Value` — the path **without** the query string:

  ```
  canonicalPayload = timestamp \n method \n /api/v1/examinations \n nonce \n bodyHash \n userId \n email \n role
  ```

Both sides compute `HMACSHA256(secret, canonicalPayload)` with the identical
`GATEWAY_SHARED_SECRET`, exact same timestamp/nonce/body-hash/identity normalization.
The only divergent byte material was the query string. Therefore:

- Any request **without** a query string (`/api/v1/auth/session`) verified successfully → **200**.
- Any request **with** a query string (`/api/v1/examinations?sortBy=…`) produced a
  different canonical byte string than the one signed → signature mismatch → **401
  "Invalid gateway HMAC signature."**

This exactly reproduces the reported symptom pair (session 200, examination list 401)
without implicating the shared secret, clock skew, nonce, or body hashing.

Where the discrepancy entered the repo:

| Commit | Change |
| --- | --- |
| `26cfe38` | BFF signer updated to sign the full dispatched endpoint including the query string (correct) |
| `dd6b26d` | Backend verifier updated to canonicalize `Request.Path.Value + Request.QueryString.Value` and to normalize `gatewayEmail`/`gatewayRole` exactly as the signer does (the fix) |

Between the two commits, every query-bearing authenticated request failed.

## 3. What the fix changed (minimal)

`apps/api/Services/PrepfordAuthHandler.cs` (canonical v1 branch only):

```csharp
// Canonical HTTP method, request path, and raw query string.
var method = Request.Method.ToUpperInvariant();
var path = Request.Path.Value ?? "/";
if (string.IsNullOrWhiteSpace(path)) path = "/";
var rawQuery = Request.QueryString.Value;                       // raw, as-transmitted (leading '?' included)
var canonicalPath = string.IsNullOrEmpty(rawQuery) ? path : $"{path}{rawQuery}";

var canonicalPayload = $"{timestampSeconds}\n{method}\n{canonicalPath}\n{nonce.Trim()}\n{bodyHash}\n{gatewayUserId.Trim()}\n{gatewayEmail.Trim().ToLowerInvariant()}\n{gatewayRole.Trim().ToLowerInvariant()}";
```

The verifier now uses the same deterministic representation as the signer:
path + raw query, in transmission order.

Also shipped to keep the configuration contract honest:

- `dd6b26d` additionally makes the handler **fail closed** when `GATEWAY_SHARED_SECRET` is
  unset outside Development/Testing (previously it silently accepted any signature computed
  with the hard-coded fallback secret). Responses now read
  `Gateway mutual authentication secret is not configured.`
- `f9db40e`-adjacent tests and `11502b6` added regression coverage (see §5).

## 4. Prescribed environment configuration

The fix is canonicalization-related; configuration was already correct in development
(both processes used the documented dev fallback secret). The contract is:

| Variable | Side | Notes |
| --- | --- | --- |
| `GATEWAY_SHARED_SECRET` | Next.js BFF **and** ASP.NET Core | Identical 32+ character secret on both sides. BFF throws at startup in production (`APP_ENV=production`); backend rejects with 401 in Staging/Production if unset. Never hardcode a production secret. |
| `SESSION_SECRET` | Next.js BFF | 32+ characters; signs the admin session cookie. |

Documented prior in `docs/deployment/p3-7-environment-configuration.md`; surfaced in `.env.example`.

## 5. Regression tests added (from commits `dd6b26d`, `26cfe38`, `11502b6`)

Backend (`apps/api/Tests/AppTests.cs` — `GatewayHmacAndReplaySecurityTests`,
`GatewayHmacMissingSecretFailClosedTests`, `AuthoritativeSessionManagementTests`,
plus `CreateProgramme_*` authorization tests):

1. Valid canonical v1 signature accepted (auth reaches controller → 200/404-by-domain).
2. Invalid signature rejected.
3. Missing signature (identity headers only) → 401.
4. Missing `GATEWAY_SHARED_SECRET` in Production → 401 (fail closed).
5. Wrong secret → 401.
6. Signed path ≠ dispatched path → 401.
7. Signed method ≠ dispatched method → 401.
8. Signed query string ≠ dispatched query string → 401.
9. Signed query string with identical params in must-identical raw order; **reordered or altered parameter values → 401** (query bytes are authenticated material).
10. Malformed timestamp → 401.
11. Expired timestamp (± 60 s window) → 401.
12. Replay: reuse of nonce+timestamp pair → 401.
13. Authorized `exam_manager` reaches `GET /api/v1/examinations?sortBy=…` → **200** (the exact failing request from the ticket).
14. Unauthenticated examination request → 401.
15. `candidate` POSTing an examination → 403 (authorization preserved).
16. Bearer-session validation and revocation still enforced (`AuthoritativeSessionManagementTests`, `Session-*` X-Session-Id datastore checks).

Frontend (`apps/web/tests/security-regressions.test.ts`, SEC-03):

- BFF canonical v1 headers bind method, path-with-query, timestamp, nonce, body hash, session id;
- empty-body SHA-256 matches the .NET `PrepfordAuthHandler` constant;
- **query-less and query-bearing canonical paths must produce different signatures** (regression named "examination remediation regression").

## 6. Live verification (real HTTP, port 4000)

Signed probe script (Node, replicating `createCanonicalGatewayAuthHeaders` byte-for-byte):

| Probe | Expected | Actual |
| --- | --- | --- |
| Valid signature over `GET /api/v1/examinations?sortBy=code&sortDirection=asc&page=1&pageSize=20` | 200 | **200** `{"success":true,"items":[],…}` |
| Same signature, reordered query (`pageSize=20&page=1&…`) | 401 | **401** |
| Wrong secret | 401 | **401** |
| Spoofed identity headers without signature | 401 | **401** |
| `GET /api/v1/auth/session` (no query, same scheme) | not signature-rejected | reached controller (session-level response) |

## 7. Constraints honored

- HMAC verification remains mandatory; no anonymous examination access; no authorization attributes removed.
- No scheme replacement, no hardcoded production secret, no secret/token/signature logging.
- Timestamp window (± 60 s) and replay protection unchanged.
- Root cause was documented from code, diffs, and live probes — not inferred from the error message.

## 8. Residual observations (documented, intentionally not changed in this scope)

- `X-Gateway-Content-SHA256` is signed but the backend does not recompute the hash of the
  received body. Because the declared hash is itself HMAC-bound, an attacker cannot forge
  signatures, but defense-in-depth body re-hashing is a candidate future hardening item.
- Primary-header precedence (Bearer first, gateway HMAC second) and gateway-asserted role
  claims are unchanged by design ("backend remains authoritative" for authorization).

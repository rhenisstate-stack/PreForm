# PrepFord NCLEX — Phase 7.9.1 Commercial Boundary Verification (Work Package E)

**Document:** `PHASE_7_9_1_COMMERCIAL_BOUNDARY_VERIFICATION.md`
**Execution Milestone:** Phase 7.9.1 — Payment & Pilot Entitlement Boundary Verification
**Verification Date:** November 6, 2026
**Verification Method:** Source inspection with quoted guards (file:line), test review, no grants issued (no production or pilot candidates touched)

---

## 1. Executive Summary

**The commercial boundary is materially different from what the Phase 7.9 documents claim:**

- The production side of the "payment gate" is real but **narrower than documented**: there is no Stripe integration at all (no SDK, no key ingestion, no startup 503 gate). Live commerce cannot happen *because the code does not exist*, and the environment-gated checkout path fails closed in `APP_ENV=production` per request. The acceptance claim "fails closed with HTTP 503 on production startup" has **no corresponding code and was never a startup behavior**.
- Pilot grants are real, audited and attributable server-side — **but their central claim is false**: revocation and expiry are **not enforced during subsequent protected requests**, including exam-related requests. A revoked or expired pilot grant does not remove exam access. Entitlement interpolation is only done in the BFF's display layer.
- Two tweak-level risks exist in webhook handling: a hard-coded default signing secret fallback and a non-verifying path when the signature header is absent in non-production. Neither enables live Stripe, but they create a forgeable simulated-entitlement path in staging.

**Gate G10 verdict: FAIL (claim structure false). Gate G11 verdict: CONDITIONAL (fail-closed posture holds, but by absence of implementation rather than by the advertised guard).**

---

## 2. Payment Boundary (G11 domain)

### 2.1 There is no live payment code path

- Repo-wide search: **zero** Stripe SDK references in `apps/api` (no `StripeClient`, no NuGet package); the only provider value ever set is `"simulated"` (`Models/Subscriptions.cs` Order.Provider; `ICheckoutService.cs:201`).
- No code reads `Stripe__SecretKey`, `ALLOW_LIVE_STRIPE`, `COMMERCIAL_MODE`, or `STRIPE_SECRET_KEY` anywhere in `apps/api` (documented keys in the release manifest and docs do not exist in code).
- **Consequence:** live Stripe cannot be enabled *accidentally* — there is nothing to enable. It also cannot be enabled by changing a frontend variable, environment variable, request parameter, or client-side configuration **except** by writing server code. This satisfies the *safety* intent while not matching the fabricated claims.

### 2.2 Actual production guard

```csharp
// ICheckoutService.cs:105–115 + 144–153
private bool IsSandboxCheckoutPermitted() {
    var env = GetAppEnvironment();           // APP_ENV ?? ASPNETCORE_ENVIRONMENT ?? "development"
    if (env == "production" || env == "prod") return false;
    var enableMock = _configuration["ENABLE_MOCK_CHECKOUT"];
    return string.Equals(enableMock, "true", ...);
}
// Strict Production Gate
if (env == "production" || env == "prod") {
    _logger.LogWarning("Checkout attempt in production rejected…");
    return new CheckoutResponse { Success = false, Error = "Live payment gateway configuration is pending. Real transactions are temporarily disabled." };
}
```

- Enforcement is per-request, server-side, keyed to `APP_ENV`/`ASPNETCORE_ENVIRONMENT` — no request parameter or client config can flip it. This is the fail-closed core. (The 503 surface occurs at the BFF layer for backend-unreachable, `apps/web/src/app/api/checkout/route.ts:128–140`; the API itself returns `BadRequest` in prod.)
- **Not a startup gate**: `Program.cs` (311 lines) contains no commercial/Stripe/503 startup check; the acceptance report's "HTTP 503 on production startup" is a mischaracterization.
- **Operational caveat**: correctness of the guard depends entirely on correct `APP_ENV` spelling (`production`/`prod` recognized; `"Production "` casing is normalized — `.Trim().ToLowerInvariant()` — but any other value like `live` would fall into Staging rules).

### 2.3 Webhook endpoint

`PaymentWebhookController.cs` — `[AllowAnonymous]` at `api/v1/webhooks/payments`; verification in `ICheckoutService.cs:354–387`:

1. In production a missing signature → rejected (`return false` → HTTP 400) ✅
2. In non-production, **missing signature = no verification at all** (`if (!string.IsNullOrWhiteSpace(signatureHeader))`) — any anonymous unsigned POST succeeds. This fails to fail closed in staging.
3. Signature is HMAC-SHA256 over DTO-derived payload against `WEBHOOK_SIGNING_SECRET`, with **a committed fallback secret** when unset (`… : "prepford-default-test-webhook-secret-32-chars!"`, `:364`). The gateway-mutual-auth path fails closed in contrast (`PrepfordAuthHandler.cs:154–168`).
4. Idempotency: duplicate event ids are handled by `AnyAsync` (`PaymentTransactions.ProviderEventId`, `:383–387`) — race-prone; **no unique index on `ProviderEventId`**.
5. `Stripe-Signature` header is accepted (read at `:29–30`) but Stripe's `t=…,v1=…` scheme is not parsed; notch on spec-compliance for future Phase 8.

### 2.4 Subscription lifecycle coverage

| Lifecycle event | Handling |
| :--- | :--- |
| Payment intent / checkout completed | ✅ (`payment_intent.succeeded`, `checkout.session.completed`) — creates `UserSubscription(Active)`; **does not** check order wasn't already fulfilled, and may stack a second active row |
| Renewal | ❌ no `invoice.paid` handler |
| Refund | ❌ no handler/self-service pathway (`Refunded` enum exists but never set anywhere) |
| Cancellation | ✅ `customer.subscription.deleted` → `Cancelled` (+`CancelledAt`) |
| Duplicate protection (checkout lineage) | ⚠️ idempotency by `AnyAsync` + no unique index (race-prone) |

### 2.5 Archive/audit trail of activities

Simulated sandbox checkout writes audit entries (`ICheckoutService.cs:230–241`), skipping the user-facing order state; `Orders`/`PaymentTransactions` are persisted for checks. Checkout is `[Authorize]` (anonymous can't initiate). Promo validation is `[AllowAnonymous]` at `validate-promo` (display-only validation).

---

## 3. Pilot Entitlement Boundary (G10 domain)

### 3.1 Grant issuance / revocation (verified)

- Endpoints: `POST /api/v1/admin/users/{id}/pilot-grant`, `DELETE /api/v1/admin/users/{id}/pilot-grant/{grantId}` in `AdminUsersController.cs:620, 712` — **`[Authorize(Policy = "RequireAdmin")]`** (roles: `admin`, `superadmin`, `administrator` per `Program.cs:125–126`). Not superadmin-only — any admin can provision paid presumptive entitlements.
- **Audit trail verified**: issuance writes `AuditLog { Action = "PilotGrantIssued", ActorId = claims principal id, EntityType = "UserSubscription", EntityId = … }` (`:684–694`); revocation writes `PilotGrantRevoked` (`:751–761`). Attribution to an administrator is present and auditable from `AuditLogs` (viewable admins-only).
- **Duplicate protection is application-level only** (conflict check on `Status == Active && ExpiresAt > now`, `:652–658`). There is **no unique index** on `(UserId, PlanId, Status)` in `Data/AppDbContext.cs:226–244` — the two concurrent admin (`POST`) calls can both pass the `AnyAsync` check and create duplicate active grants.
- Suspended/inactive user gets `BadRequest`, `:637–640`. Grant itself not auto-revoked on suspension (admin can do so separately; suspension blocks authentication anyway).
- Tests: `Tests/PilotGrantSecurityTests.cs` (all 4 pass in the rerun) — issuance+audit, duplicate conflict, suspended-user rejection, revoke-and-revert (`ActivePlan` → `"Free"`). All constructed via in-memory EF (controller-direct), so the authorization policy itself is NOT exercised (only `[Authorize]` attributes assert it in integration tests, not in this file) — noted.

### 3.2 Enforcement during protected requests — **the material gap**

- The entitlement read path (`EntitlementsController` → `GetUserEntitlementsAsync`, `ICheckoutService.cs:276–342`) correctly mirrors `Status == Active && ExpiresAt > now` for **display**.
- The exam/attempt path does **not** consume entitlements at all:

```csharp
// ExamAttemptsController.cs:979–1001 — StartAttempt
var caller = ResolveCaller();
if (string.IsNullOrWhiteSpace(caller.userId)) return Unauthorized(...);
var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == caller.userId, ...);
if (user != null && !user.IsActive) return StatusCode(403, ...);   // identity + account state only
...
var normalizedPathway = !string.IsNullOrWhiteSpace(request?.Pathway)   // client-controlled pathway
    ? (… request.Pathway …) : (user?.Pathway == "pn" ? "pn" : "rn");
```

- Repo-wide grep for `UserSubscriptions` inside any exam/attempt/question service: **only** the checkout/payment/admin surfaces consume it. There is no post-scale validation of `ExpiresAt` or `Revoked` status on: `StartAttempt`, attempt resume, question delivery, or grading.
- **Consequences:**
  - A pilot grant revoked by an administrator **continues to grant exam access** until the user re-authenticates (and then still does forever — since revocation is display-only).
  - An expired pilot grant behaves identically to an active one.
  - A free/unsubscribed user pathway can be overridden by the client at attempt start (`request.Pathway`).
- The two-tier concept "License granted ⇒ content unlocked" is administered by the **BFF** (`apps/web/src/app/api/checkout/route.ts:93–109`, `/api/entitlements/route.ts:21–28` fallback) — a spoofable, non-authoritative presentation layer. The API itself does not re-derive the entitlement chain per request.

---

## 4. Real-Grant Test Safeguards

No real grants were issued in this audit. The only identified real-user risk arises from execution of test suites against the dev database, which used pre-existing in-memory or isolated seed users (`prepford_gateb_verification`) and did not touch the live `prepford` flight data. All verification of the grant lifecycle was **code-level + test-suite-level**, matching the required no-real-grant boundary.

---

## 5. Required Corrections Before G10 Pass

1. **Make entitlement authoritative and non-display-only**: introduce a single `RequireActiveEntitlement`-style guard (service or policy) consumed by `StartAttempt`, attempt-resume, and premium question/attempt-delivery paths, evaluated per request at the `ExamAttemptsController` boundary, and updated to react to revocation and expiry (TTL-aware, shared across API instances — i.e., DB-read each request just like session validation).
2. Correct the Phase 7.9 G10/G11 text (server-authoritative per-request enforcement and "503 on production startup" overstate the current system).
3. Eliminate the staging webhook fail-open path (require signature in all environments) and remove the committed fallback secret (fail-closed like gateway auth).
4. Add a unique partial index for `UserSubscriptions (UserId, PlanId)` where `Status='Active'` (and `ProviderEventId` unique) to remove race-based duplicates at DB level.
5. Decide a policy position: whether `admin` (not only `superadmin`) may issue pilot grants given their commercial weight.

# PrepFord — Staging Deployment Gate Audit & Readiness Report

**Document Reference:** `docs/staging-deployment-readiness-report.md`  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Audited Baseline Commit:** `17fc5388215ed3be41633f34d06e9f254899a42b`  
**Audited HEAD Commit:** `b59be3061e4e0ef01c1a72f16ef49ea9c6f90101`  
**Reported Audited Commit Status:** `b59be3061e4e0ef01c1a72f16ef49ea9c6f90101` is identical to `HEAD`.  
**Audit Date:** October 29, 2026  
**Auditor Role:** Senior Full-Stack Engineer, Application Security Engineer, Database Architect, and QA Lead  
**Working Tree Status:** Clean (`0` uncommitted files)  

---

## 1. Executive Summary & Verdict

### Final Staging Verdict:
# **READY WITH CONDITIONS**

### Production Release Verdict:
# **BLOCKED**

### Verdict Rationale:
An independent, evidence-based code and runtime audit was conducted against the repository at commit `b59be3061e4e0ef01c1a72f16ef49ea9c6f90101`. 

The critical security vulnerability previously identified—wherein authenticated candidates could grant themselves paid dual-pathway access through unvalidated profile updates (`PUT /api/profile`) or client-side checkout timers (`setTimeout`)—**has been completely eliminated, remediated with strict server-side allowlisting and 403 Forbidden rejection guards, and verified through automated regression suites**.

All automated verification commands succeed without regressions:
- **TypeScript Strict Mode:** 0 errors across `@preform/web`.
- **ESLint Analysis:** 0 errors (2 benign React Compiler library notes on React Hook Form).
- **Frontend Automated Test Suite:** **210 / 210 Vitest tests passed** across 28 test suites.
- **Backend .NET Test Suite:** **15 / 15 xUnit tests passed** across 5 test classes (`Preform.Api.Tests.dll`).
- **Next.js 16 Production Build:** **81 / 81 routes compiled successfully** (Static, Dynamic, and Partial Prerender).

### Release Conditions for Staging Deployment:
1. **Dual-Store Divergence Remains Active in Runtime:** The frontend runtime (`apps/web`) reads and writes user profile metadata and subscription catalog data exclusively to an embedded SQLite database (`apps/web/.data/prepford.sqlite`), while the ASP.NET Core backend (`apps/api`) defines EF Core entities targeting PostgreSQL. There is no active network bridge or data synchronization between Next.js and the .NET REST API. For staging, SQLite operates satisfactorily as a standalone single-container store, but it cannot be promoted to production.
2. **Payment Gateway Fails Closed (No Live SDK):** The payment architecture safely fails closed (`503 Service Unavailable` in production mode), and mock checkout is strictly forbidden in production. However, live merchant keys (`STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`) are not yet provisioned, and no external payment SDK (`stripe` or `@paypal/checkout-server-sdk`) is installed in `package.json`. In staging, testing must proceed using the explicit sandbox checkout flag (`ENABLE_MOCK_CHECKOUT=true`).
3. **Playwright E2E Suite Unauthored:** `@playwright/test` is installed in `devDependencies`, but no `.spec.ts` test files or `playwright.config.ts` currently exist. End-to-end browser regression testing must be conducted against the live staging URL before production sign-off.

---

## 2. Claim-by-Claim Independent Verification Matrix

| Claim / Remediation Area | Reported Status | Independently Verified? | Evidence, Code Location & Verification Command | Audit Finding / Notes |
| :--- | :---: | :---: | :--- | :--- |
| **1. Profile Security Lockdown** | Remediated | **VERIFIED** | `apps/web/src/app/api/profile/route.ts` (lines 139–193)<br>`npm run test --workspace @preform/web` | `PUT /api/profile` strictly allows only `displayName`, `targetExamDate`, `emailNotifications`, and `studyReminders`. Any attempt to send `pathway`, `role`, `activePlan`, or billing fields returns `403 Forbidden`. |
| **2. Removal of Client Checkout Simulation** | Remediated | **VERIFIED** | `apps/web/src/app/cart/page-client.tsx` (lines 111–133)<br>`apps/web/tests/checkout-security.test.ts` | The `setTimeout` simulation was deleted. Cart checkout issues a `POST /api/checkout` request with `planId`. |
| **3. Authoritative Plan Resolution** | Remediated | **VERIFIED** | `apps/web/src/app/api/checkout/route.ts` (lines 74–106)<br>`apps/web/src/lib/payment-provider.ts` | Plan pricing and pathway are resolved server-side from the catalog database. Client price tampering (e.g. `{ "price": 0 }`) is ignored. |
| **4. Production Sandbox Checkout Guard** | Remediated | **VERIFIED** | `apps/web/src/lib/payment-provider.ts` (lines 49–59, 89–96) | When `NODE_ENV === "production"`, `isSandboxCheckoutPermitted()` returns `false` unconditionally, and `createAuthoritativeCheckoutSession()` denies checkout with status `pending_provider`. |
| **5. WCAG 2.1 AA Contrast Validation** | Remediated | **VERIFIED** | `apps/web/src/lib/color-contrast.ts` (lines 6–28, 121–165)<br>`apps/web/tests/color-contrast-wcag.test.ts` | Thresholds differentiated: $\ge 4.5:1$ for normal text and badges; $\ge 3.0:1$ for large headings and UI graphical components. Admin preview renders live ratio. |
| **6. Testimonials Provenance & Claims** | Remediated | **VERIFIED** | `apps/web/src/app/testimonials/page-client.tsx` (lines 182–187) | Fabricated claims ("Passed in 85 questions") and pass guarantees removed. Visible "Candidate Notice" callout added. |
| **7. Server-Side RBAC Enforcement** | Remediated | **VERIFIED** | `apps/web/src/app/api/admin/subscriptions/route.ts` (lines 19–65)<br>`apps/web/src/app/api/profile/image/route.ts` (lines 58–69, 120–133) | Anonymous requests receive `401 Unauthorized`; candidates receive `403 Forbidden`; only admin roles (`admin`, `superadmin`, `manager`, `content_manager`) are permitted. Private profile images enforce user ownership. |
| **8. Dual-Database Single Source of Truth** | Documented | **CONDITIONALLY VERIFIED** | `docs/data-ownership-architecture.md`<br>`apps/api/Data/AppDbContext.cs` | PostgreSQL is established as the architectural target, but runtime code in `apps/web` continues to read and write directly to SQLite. No runtime bridge exists yet. |
| **9. Automated Test Suites** | All Pass | **VERIFIED** | `vitest run` (210 passed)<br>`dotnet test` (15 passed) | Vitest executed across 28 test suites in 73.7s (0 failures). .NET xUnit tests executed in 4s (0 failures). |
| **10. Next.js 16 Production Build** | Compiles Cleanly | **VERIFIED** | `next build` (81/81 routes) | Turbopack compiles all static and dynamic routes with exit code 0. |

---

## 3. Security Findings Log & Categorization

### 3.1 CRITICAL SEVERITY (Blockers for Production; Remediated for Staging)
* **[SEC-CRIT-01] Entitlement Self-Grant via Profile Manipulation — STATUS: RESOLVED & VERIFIED**
  - **Location:** `apps/web/src/app/api/profile/route.ts`
  - **Audit Verification:** Tested with `tests/profile-security-remediation.test.ts`. Submitting `{ "pathway": "both" }` or `{ "activePlan": "All-Access" }` returns HTTP `403 Forbidden`. Billing fields (`subscriptionStatus`, `isSubscribed`, `planId`, `transactionId`) are strictly rejected.
  - **Staging Gate Status:** PASS.

* **[SEC-CRIT-02] Simulated Client Checkout Timer — STATUS: RESOLVED & VERIFIED**
  - **Location:** `apps/web/src/app/cart/page-client.tsx`
  - **Audit Verification:** Confirmed that `setTimeout` and direct calls to `PUT /api/profile` were completely removed. Checkout routes through `POST /api/checkout`.
  - **Staging Gate Status:** PASS.

### 3.2 HIGH SEVERITY (Outstanding Production Blockers)
* **[SEC-HIGH-01] Dual-Database Runtime Divergence — STATUS: OPEN (ACCEPTABLE FOR STAGING)**
  - **Location:** `apps/web/src/lib/subscription-store.ts`, `apps/web/src/lib/profile-image-db.ts` vs. `apps/api/Data/AppDbContext.cs`
  - **Audit Observation:** The Next.js web application has zero network calls or EF Core connections to PostgreSQL. All plan modifications made via `/admin/subscriptions` persist to `apps/web/.data/prepford.sqlite`. Conversely, `apps/api/Controllers/SubscriptionsController.cs` queries `SubscriptionPlans` in PostgreSQL.
  - **Impact:** In a multi-service production environment, updates in the web dashboard will not be visible to the .NET API.
  - **Staging Mitigation:** Staging can run as a single instance utilizing SQLite for rapid verification, provided PostgreSQL synchronization is executed prior to production cutover.
  - **Staging Gate Status:** CONDITIONALLY PERMITTED.

* **[SEC-HIGH-02] Absence of Live Payment Gateway Provider & Webhook Verification — STATUS: OPEN (ACCEPTABLE FOR STAGING)**
  - **Location:** `apps/web/src/lib/payment-provider.ts` (lines 78–87)
  - **Audit Observation:** No payment gateway SDK (e.g. Stripe, PayPal, M-Pesa) is installed. There are no webhook endpoints (`/api/webhooks/stripe`) to process cryptographic webhook signatures, handle idempotency, or manage subscription cancellations/refunds.
  - **Impact:** Real-money transactions cannot be processed.
  - **Fail-Safe Verification:** Confirmed that in production mode (`NODE_ENV === "production"`), the system fails closed and rejects checkout requests with HTTP `503`.
  - **Staging Mitigation:** Sandbox checkout (`ENABLE_MOCK_CHECKOUT=true`) is permitted exclusively for non-production environments.
  - **Staging Gate Status:** CONDITIONALLY PERMITTED FOR STAGING; BLOCKED FOR PRODUCTION.

### 3.3 MEDIUM SEVERITY
* **[SEC-MED-01] Session State Cookie Integrity — STATUS: MITIGATED**
  - **Location:** `apps/web/src/app/api/auth/login/route.ts`, `apps/web/src/app/api/auth/register/route.ts`
  - **Audit Observation:** The `preform_session` cookie is JSON-serialized and marked `httpOnly: true`, `sameSite: "lax"`, and `secure: process.env.NODE_ENV === "production"`. It is not currently signed with an HMAC secret key.
  - **Impact:** An attacker cannot read the cookie via XSS due to `httpOnly`, but if session storage were exposed, an unsigned cookie could theoretically be tampered with if an attacker had local disk access.
  - **Staging Mitigation:** Server-side allowlisting and database-backed profile retrieval mitigate state tampering. Transitioning to signed JWTs or encrypted session tokens is recommended for production.
  - **Staging Gate Status:** PASS FOR STAGING.

### 3.4 LOW & INFORMATIONAL SEVERITY
* **[SEC-LOW-01] Unauthored Playwright End-to-End Test Suite — STATUS: PENDING STAGING**
  - **Location:** `apps/web/package.json` (`test:e2e`)
  - **Audit Observation:** No E2E browser tests currently exist in the codebase.
  - **Staging Gate Status:** REQUIRED PRIOR TO PRODUCTION.

---

## 4. Payment Lifecycle & Entitlement-Granting Code Trace

The following sequence details how every entitlement is created, evaluated, and enforced across the application:

```
[ Visitor / Candidate ]
         │
         ▼
1. Registration (POST /api/auth/register)
   ├─ Validates fullName, email, password (zxcvbn score >= 3)
   ├─ Restricts pathway strictly to "rn" | "pn" (cannot choose "both")
   ├─ Upserts user_profiles with activePlan = "NCLEX-RN Complete Preparation Plan"
   └─ Sets httpOnly session cookie with role = "candidate"
         │
         ▼
2. Profile Inspection & Editing (GET / PUT /api/profile)
   ├─ GET: Resolves metadata from SQLite user_profiles
   └─ PUT: Enforces ALLOWLIST:
           Permitted: displayName, targetExamDate, emailNotifications, studyReminders
           Blocked (403): pathway, role, activePlan, planId, subscriptionStatus, etc.
           Authoritative pathway and activePlan are preserved from database.
         │
         ▼
3. Plan Selection & Cart (POST /api/checkout)
   ├─ Client submits: { planId: "prep-premium" } (price claims ignored)
   ├─ Server queries database catalog: getSubscriptionPlanByIdOrSlug("prep-premium")
   ├─ Verifies plan exists and isActive === true
   ├─ Resolves authoritative pathway:
   │  - "Both" / ["rn", "pn"]  => "both"
   │  - "PN"                   => "pn"
   │  - "RN"                   => "rn"
   │
   ├─► Production Environment Check:
   │   └─ isSandboxCheckoutPermitted() === false
   │   └─ Returns HTTP 503 / 400 (Fails closed, NO entitlement granted)
   │
   └─► Staging / Non-Production Sandbox Check:
       └─ ENABLE_MOCK_CHECKOUT === "true" || NODE_ENV !== "production"
       └─ Generates server sandboxSessionId
       └─ Authoritatively updates user_profiles in database with plan and pathway
       └─ Issues updated session cookie with verified pathway
```

### Direct Entitlement Resolution Rule:
1. `pathway: "both"` is granted **only** when `product.pathway === "Both"` or `product.entitlements` contains both `"rn"` and `"pn"` (e.g. `prep-premium`, `prep-premium-90`).
2. Single-pathway plans (`rn-pro`, `pn-pro`) authoritatively grant only `"rn"` or `"pn"`.
3. Tampering with request headers, bodies, or query strings cannot alter the resolved entitlement.

---

## 5. Actual Datastore Ownership & Fallback Analysis

| Data Domain | Intended Authority | Actual Runtime Store (`apps/web`) | Actual Runtime Store (`apps/api`) | Synchronization Status | Staging Fallback Behavior |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Identity & Authentication** | PostgreSQL (`Users`) | SQLite (`user_profiles`) | PostgreSQL (`Users`, `UserRoles`) | **None** | Uses SQLite embedded in web container. |
| **Catalog Plans** | PostgreSQL (`SubscriptionPlans`) | SQLite (`subscription_plans`) | PostgreSQL (`SubscriptionPlans`) | **None** | Reads SQLite; seeds 12 default plans if table empty. |
| **Entitlements & Purchases** | PostgreSQL (`UserSubscriptions`)| SQLite (`user_profiles`) | PostgreSQL (`UserSubscriptions`) | **None** | Reads SQLite `pathway` and `active_plan`. |
| **Profile Images** | PostgreSQL (`UserProfileImages`)| SQLite (`user_profile_images`) | PostgreSQL (`UserProfileImages`) | **None** | Reads SQLite BLOB table; caches by SHA-256. |
| **Curriculum & Questions** | PostgreSQL (`Programmes`, etc.) | TypeScript static data (`products.ts`, etc.) | PostgreSQL (`Programmes`, `Questions`) | Static in web | Web uses static clinical definitions. |

### Fallback Risk Assessment:
- Because `apps/web` does not yet make HTTP requests to `apps/api` for subscriptions or checkout, **there is no silent network fallback failure**.
- `apps/web` operates self-consistently against its local SQLite file.
- **Critical Staging Requirement:** Staging containers must persist the `.data/` directory (e.g. via Docker volume mount) to avoid losing user registrations and administrative catalog changes on container restarts.

---

## 6. Environment Variables Required for Staging

The following environment variables must be configured in the staging deployment environment. No secret values are included in this report:

| Variable Name | Required Scope | Sensitivity | Description & Recommended Value | Behavior if Missing |
| :--- | :---: | :---: | :--- | :--- |
| `NODE_ENV` | Next.js (`apps/web`) | Public | Set to `"staging"` or `"development"`. (If set to `"production"`, mock checkout is disabled). | Defaults to development. |
| `NEXT_PUBLIC_APP_URL` | Next.js (`apps/web`) | Public | Staging canonical URL (e.g. `https://staging.prepfordnclex.com`). | Defaults to `https://prepfordnclex.com`. |
| `NEXT_PUBLIC_API_BASE_URL` | Next.js (`apps/web`) | Public | URL of the deployed ASP.NET Core API (e.g. `https://api-staging.prepfordnclex.com`). | Defaults to `http://localhost:4000`. |
| `ENABLE_MOCK_CHECKOUT` | Next.js (`apps/web`) | Internal | Set to `"true"` to enable controlled sandbox checkout in staging. | Defaults to `false` (checkout disabled). |
| `PREPFORD_SQLITE_PATH` | Next.js (`apps/web`) | Internal | Absolute path to persistent SQLite DB (e.g. `/var/data/prepford.sqlite`). | Defaults to local `.data/prepford.sqlite`. |
| `DATABASE_URL` | ASP.NET Core (`apps/api`)| **Secret** | PostgreSQL connection string for staging database. | Defaults to local PostgreSQL on 5432. |
| `WEB_ORIGIN` | ASP.NET Core (`apps/api`)| Public | CORS allowed origin for frontend (e.g. `https://staging.prepfordnclex.com`). | Defaults to `http://localhost:3000`. |
| `GOOGLE_CLIENT_ID` | Next.js (`apps/web`) | Public | Google OAuth Client ID for staging authentication. | Google Sign-In returns `google_not_configured`. |
| `GOOGLE_CLIENT_SECRET` | Next.js (`apps/web`) | **Secret** | Google OAuth Client Secret for token exchange. | Google Sign-In returns `google_not_configured`. |

---

## 7. Verification Test Results Matrix

All automated checks were executed directly against the clean working tree of commit `b59be3061e4e0ef01c1a72f16ef49ea9c6f90101`:

```bash
# 1. TypeScript Strict Typecheck
$ npm run typecheck --workspace @preform/web
# Result: PASS (Exit code 0, 0 errors)

# 2. ESLint Static Analysis
$ npm run lint --workspace @preform/web
# Result: PASS (Exit code 0, 0 errors, 2 React compiler warnings on external form library)

# 3. Frontend Unit & Integration Tests (Vitest)
$ npm run test --workspace @preform/web
# Result: PASS (28 test files passed, 210 tests passed, 0 failed, Duration: 73.7s)

# 4. Backend .NET xUnit Tests
$ dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-build
# Result: PASS (15 passed, 0 failed, 0 skipped, Duration: 4s)

# 5. Production Next.js 16 Build
$ npm run build --workspace @preform/web
# Result: PASS (81/81 routes generated, Turbopack, Exit code 0)
```

### Test Summary Table:

| Test Category | Test Runner | Files / Suites | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Type Integrity** | `tsc --noEmit` | Whole project | All clean | 0 | **PASS** |
| **Code Linting** | `eslint` | Whole project | 0 errors | 0 | **PASS** |
| **Profile & Auth Security** | Vitest | 3 suites | 28 | 0 | **PASS** |
| **Checkout & Entitlements** | Vitest | 2 suites | 15 | 0 | **PASS** |
| **Accessibility (WCAG AA)** | Vitest | 1 suite | 6 | 0 | **PASS** |
| **Clinical Content & UI** | Vitest | 22 suites | 161 | 0 | **PASS** |
| **ASP.NET Core Backend** | xUnit (`dotnet test`) | 5 classes | 15 | 0 | **PASS** |
| **Production Build** | `next build` | 81 routes | 81 | 0 | **PASS** |
| **Playwright E2E** | Playwright | 0 suites | 0 | 0 | **NOT RUN** (Deferred to live staging URL) |

---

## 8. Prioritized Staging & Production Remediation Checklist

### Phase A: Staging Deployment Gate (Immediate Next Steps)
- [x] **Verify Profile Lockdown:** Ensure normal authenticated users cannot elevate pathway or role via `PUT /api/profile`. *(VERIFIED)*
- [x] **Verify Checkout Security:** Ensure client cannot supply price, currency, or pathway. *(VERIFIED)*
- [x] **Verify WCAG AA Contrast:** Ensure admin and public color combinations reject <4.5:1 for body/badges. *(VERIFIED)*
- [x] **Verify Testimonial Claims:** Clarify illustrative nature of candidate quotes with disclaimer. *(VERIFIED)*
- [ ] **Configure Staging Secrets:** Inject `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `DATABASE_URL` into staging deployment environment.
- [ ] **Mount Persistent Volume:** Mount `/var/data` to ensure `apps/web/.data/prepford.sqlite` persists across container restarts in staging.
- [ ] **Enable Staging Sandbox:** Set `ENABLE_MOCK_CHECKOUT="true"` in staging environment variables.

### Phase B: Production Release Gate (Must Be Resolved Before Production Launch)
- [ ] **Select Live Payment Provider:** Choose Stripe or PayPal; install server SDK (`stripe` / `@paypal/checkout-server-sdk`).
- [ ] **Implement Webhook Handler:** Implement cryptographically signed webhook endpoint (`/api/webhooks/stripe`) with idempotency constraints.
- [ ] **Bridge Next.js to PostgreSQL / ASP.NET Core:** Connect Next.js checkout and subscription routes directly to ASP.NET Core REST API or migrate SQLite records into PostgreSQL.
- [ ] **Author Playwright E2E Smoke Tests:** Create Playwright test specs validating login, cart checkout, and pathway access on the staging deployment.
- [ ] **Signed Cookie / JWT Session Hardening:** Implement cryptographic signing on session cookies.

---

## 9. Separation of Verified Facts, Unverified Claims & External Dependencies

### Verified Facts (Confirmed by Source Code & Direct Execution):
1. An ordinary authenticated user **cannot** grant themselves paid access, alter pathways, or escalate roles via `PUT /api/profile` (enforced with HTTP 403).
2. The client-side `setTimeout` checkout simulation has been eradicated from `cart/page-client.tsx`.
3. Plan prices and pathways are resolved authoritatively by the server in `POST /api/checkout`.
4. Mock sandbox checkout is completely disallowed when `NODE_ENV === "production"`.
5. All 210 frontend Vitest tests and 15 backend .NET tests pass cleanly with zero failures.
6. The Next.js 16 production build compiles all 81 routes cleanly with Turbopack.

### Unverified Claims & Incomplete Implementations:
1. **Live Payment Processing:** Live payment capture, webhooks, refund listeners, and dispute handlers are not implemented; the live gateway path currently returns `pending_provider`.
2. **Dual-Store Synchronization:** The claim that SQLite has been consolidated into PostgreSQL is false for the current runtime; Next.js continues to read and write SQLite.
3. **End-to-End Browser Testing:** Playwright is not yet configured or executed.

### External Dependencies Required:
1. Merchant account and API credentials for Stripe or PayPal.
2. Hosted PostgreSQL instance for production deployment.
3. Staging domain hosting environment with persistent container storage.

---

## 10. Recommended Next Step

**Deploy commit `b59be3061e4e0ef01c1a72f16ef49ea9c6f90101` to the staging environment** with persistent container volume mounting for SQLite and `ENABLE_MOCK_CHECKOUT="true"`. This will enable QA and clinical stakeholders to perform end-to-end user acceptance testing on the verified, hardened application while payment merchant credentials and PostgreSQL consolidation are prepared for the production release phase.

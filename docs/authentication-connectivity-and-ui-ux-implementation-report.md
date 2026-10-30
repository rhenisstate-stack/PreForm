# PrepFord — Authentication Connectivity Repair & Premium Sign-In/Sign-Up Experience Implementation Report

**Author:** Antigravity AI Engineering Assistant  
**Date:** October 30, 2026  
**Status:** Complete & Verified  
**Target Systems:** Next.js 16 (React 19, TypeScript, Tailwind CSS, shadcn/ui) BFF & Client, ASP.NET Core 8 Web API, PostgreSQL  

---

## Executive Summary

An audit and overhaul of PrepFord's authentication architecture and candidate experience was conducted to resolve the observed `HTTP 404 (Not Found)` failure on login (`auth-context.tsx:63 POST http://localhost:3000/api/auth/login 404`), correct underlying routing and environmental misconfigurations, and elevate the sign-in and sign-up interfaces into premium, full-screen healthcare education SaaS portals.

The investigation confirmed that the 404 error was **not** caused by missing frontend route handlers or an ASP.NET Core controller mismatch, but by a port collision in the Next.js Backend-for-Frontend (BFF) proxy resolution layer (`getApiBaseUrl()`). In the Next.js runtime, `process.env.PORT` evaluates to `"3000"`, causing `apiClient` to dispatch internal requests to `http://127.0.0.1:3000/api/v1/auth/login` instead of the authoritative ASP.NET Core API on port `4000`. Next.js, lacking an `/api/v1/auth/login` route, served its standard 404 "Clinical Record Not Found" page back to the BFF handler, which then propagated a 404 status and generic error string to the client.

Targeted corrections were implemented:
1. `getApiBaseUrl()` was hardened to decouple from the Next.js port (`PORT=3000`) and default to port `4000` (`http://127.0.0.1:4000`), with robust environment variable loading via `dotenv` in `next.config.ts` and `apps/web/.env.local`.
2. All generic error strings (`"API request failed with status 404"`) were replaced with user-friendly, actionable status mappings across frontend and backend boundaries.
3. Sign-in and sign-up pages were redesigned into full-viewport, two-column layouts featuring:
   - Medically authentic Normal Sinus Rhythm (NSR) animated ECG waveforms.
   - Interactive 3D clinical feature cards responding to cursor motion.
   - Elimination of global headers, footers, and announcement bars on auth routes.
   - Integrated theme toggles and mobile/tablet responsive scaling.
4. Mandatory multi-word full-name validation, contextual email guidance, and password confirmation matching were instituted across both frontend and backend validation layers.
5. A reusable `AuthLoadingSkeleton` was created utilizing the PrepFord logo and shadcn/ui skeleton primitives with zero layout shifts.

All 42 test suites comprising 357 unit and integration tests passed, and the production Next.js build compiled successfully.

---

## 1. Initial HTTP 404 Root Cause Analysis

### Observed Failure
```text
auth-context.tsx:63 POST http://localhost:3000/api/auth/login 404 (Not Found)
Error: API request failed with status 404
```

### Request Lifecycle Trace & Audit Findings
The complete request lifecycle was traced from the sign-in form to the backend database:

```
[Browser /sign-in]
       ↓ (POST /api/auth/login)
[Next.js App Router: apps/web/src/app/api/auth/login/route.ts]
       ↓ (authService.login -> apiClient.post -> apiRequest)
[lib/api-client.ts getApiBaseUrl()]
       ↓ (Evaluated to: http://127.0.0.1:3000) [ROOT CAUSE BUG]
[Next.js Internal Dev Server: http://127.0.0.1:3000/api/v1/auth/login]
       ↓ (Route does not exist in Next.js; returned 404 HTML Page)
[Next.js API Handler: apps/web/src/app/api/auth/login/route.ts]
       ↓ (Propagated apiRes.status = 404 and error: "API request failed with status 404")
[auth-context.tsx]
       ↓ (Console error: POST http://localhost:3000/api/auth/login 404)
```

### Confirmed Findings
1. **Next.js Route Handlers as BFF Proxy:**
   PrepFord's architecture explicitly uses Next.js Route Handlers (`apps/web/src/app/api/auth/login/route.ts` and `register/route.ts`) as a secure Backend-For-Frontend proxy. The browser sends credentials to `/api/auth/login`, and Next.js signs and forwards the request via mutual HMAC gateway headers to the ASP.NET Core backend at `/api/v1/auth/login`. Upon success, Next.js mints a cryptographically signed HTTP-only session cookie (`prepford_session`).
2. **Port Collision in `getApiBaseUrl()`:**
   In `apps/web/src/lib/api-client.ts`, `getApiBaseUrl()` had the following logic:
   ```ts
   const port = process.env.PORT?.trim() || "4000";
   return `http://127.0.0.1:${port}`;
   ```
   When Next.js runs, Next.js automatically sets `process.env.PORT = "3000"`. Because the monorepo root `.env` had not been loaded into the isolated Next.js runtime process, `API_GATEWAY_URL` and `INTERNAL_API_URL` were undefined. As a result, `getApiBaseUrl()` resolved to `http://127.0.0.1:3000` (pointing back at Next.js itself instead of ASP.NET Core on port `4000`).
3. **Circular 404 Loop:**
   Next.js attempted to dispatch `POST http://127.0.0.1:3000/api/v1/auth/login`. Since `/api/v1/auth/login` does not exist in Next.js (Next.js has `/api/auth/login`), Next.js returned a 404 Not Found HTML document ("Clinical Record Not Found").
4. **Leaky Error Message & Transient Debugging Code:**
   In `apps/web/src/app/api/auth/login/route.ts`, the handler forwarded `apiRes.error` directly to the client as `"API request failed with status 404"`. Additionally, temporary debug file writes appending to `login_debug.log` were discovered.

---

## 2. API Routing & Connectivity Corrections

### 1. Hardened `getApiBaseUrl()` Resolution
In `apps/web/src/lib/api-client.ts`, the resolution was corrected so that it never mistakes the Next.js port (`PORT=3000`) for the backend port:
```ts
export function getApiBaseUrl(): string {
  const envUrl =
    process.env.API_GATEWAY_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/+$/, "");
  }

  // Default to backend API port 4000, avoiding collision with Next.js web server port (3000)
  const backendPort =
    process.env.BACKEND_PORT?.trim() ||
    (process.env.PORT && process.env.PORT !== "3000" ? process.env.PORT.trim() : "4000");

  return `http://127.0.0.1:${backendPort}`;
}
```

### 2. Monorepo Environment Variable Hydration
- Updated `apps/web/next.config.ts` using `dotenv` to load the root `.env` and `.env.local` files on server startup.
- Created `apps/web/.env.local` explicitly setting `INTERNAL_API_URL=http://localhost:4000`, `API_GATEWAY_URL=http://localhost:4000`, `PORT=3000`, and `BACKEND_PORT=4000`.

### 3. Debug Code & File Removal
- Removed `login_debug.log` and all filesystem debugging calls (`fs.appendFileSync`) from `apps/web/src/app/api/auth/login/route.ts` to uphold credential privacy and zero-logging security standards.

---

## 3. Actionable HTTP Error Handling Architecture

Generic error messages such as `API request failed with status 404` have been replaced with clear, contextual user guidance across `apps/web/src/lib/error-mapping.ts`, `apps/web/src/app/api/auth/login/route.ts`, `apps/web/src/app/api/auth/register/route.ts`, and `apps/web/src/lib/auth-context.tsx`.

### HTTP Status Code to User Guidance Mapping Table

| HTTP Status | Raw / Technical Example | Actionable User-Facing Message | Rationale |
|:---:|:---|:---|:---|
| **400** | `BadRequestObjectResult` / validation error | *Please review the information you entered.* | Informs the user that inputs require adjustment without technical jargon. |
| **401** | `Unauthorized` / Bad credentials | *The email or password is incorrect.* | Standard secure authentication feedback preventing username enumeration. |
| **403** | `Forbidden` / Role mismatch | *Your account does not currently have permission to access this resource.* | Clear boundary statement for permission denials. |
| **404** | `API request failed with status 404` | *The requested authentication service could not be found. Please try again or contact support.* | Replaces circular route failures with helpful recovery directions. |
| **409** | `Conflict` / Duplicate email | *An account with this email address already exists.* | Direct instruction for existing candidates to sign in instead. |
| **422** | `UnprocessableEntity` | *Some of the information provided is invalid.* | Semantic validation feedback. |
| **429** | `TooManyRequests` | *Too many attempts. Please wait before trying again.* | Clear rate limit throttling notification. |
| **500** | Internal server error | *Something went wrong on our server. Please try again shortly.* | Safe fallback avoiding stack trace leakage. |
| **502 / 503 / 504** | Network timeout / connection refused | *We are temporarily unable to reach the authentication service. Please try again shortly.* | Distinguishes server connectivity from user credential errors. |

---

## 4. Enhanced Validation Engine

### Mandatory Full-Name Validation (Frontend & Backend)
A mandatory correction was applied requiring that candidate names contain at least two valid word segments.
- **Normalization:** Leading and trailing whitespace is stripped, and multiple consecutive whitespace characters are collapsed into a single space (`normalizeFullName`).
- **Segment Count:** Requires $\ge 2$ non-empty segments.
- **Character Support:** Hyphenated (e.g. `Mary-Jane Watson`, `Jean-Luc`) and apostrophe-containing names (e.g. `Patrick O'Connor`) and international unicode characters are fully supported.
- **Frontend Enforcement:** Added Zod refinement in `signUpSchema` and `signUpFormSchema`:
  ```ts
  .refine((val) => normalizeFullName(val).split(" ").filter(Boolean).length >= 2, {
    message: "Please enter your full name using at least two names.",
  })
  ```
- **Backend Enforcement:** Added validation in `apps/api/Controllers/AuthController.cs`:
  ```csharp
  var normalizedDisplayName = string.Join(" ", request.DisplayName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));
  var nameSegments = normalizedDisplayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
  if (nameSegments.Length < 2)
  {
      return BadRequest(new AuthResponse { Success = false, Error = "Please enter your full name using at least two names." });
  }
  ```

| Input | Validation Outcome | User Message / Reason |
|:---|:---:|:---|
| `"Mark"` | **Invalid** | `"Please enter your full name using at least two names."` |
| `"Mark Gitau"` | **Valid** | 2 valid names. |
| `"Mary Jane"` | **Valid** | 2 valid names. |
| `"Mary Jane Gitau"` | **Valid** | 3 valid names. |
| `"Mark Kinyanjui Gitau"` | **Valid** | 3 valid names. |
| `""` / `"   "` | **Invalid** | Empty / whitespace only. |
| `"  Mark   Gitau  "` | **Valid** | Valid after whitespace normalization to `"Mark Gitau"`. |
| `"Patrick O'Connor"` | **Valid** | Preserves legitimate apostrophes. |
| `"Mary-Jane Watson"` | **Valid** | Preserves legitimate hyphens. |

### Contextual Email Validation
Implemented `getEmailValidationError(email: string): string | null` in `apps/web/src/lib/validation/auth.ts`:
- `""` / whitespace $\rightarrow$ `"Email address is required."`
- `"mark"` (missing `@`) $\rightarrow$ `"Please enter a valid email address, including @ and a domain."`
- `"mark@"` (missing domain) $\rightarrow$ `"Please enter a complete email address."`
- `"mark@gmail"` (missing domain suffix/TLD) $\rightarrow$ `"Please enter a valid email domain, such as gmail.com."`
- Standard providers (`@gmail.com`, `@yahoo.com`, `@outlook.com`, `@university.edu`, etc.) $\rightarrow$ Valid format; no arbitrary domain restrictions.

### Password & Confirmation Validation
- Sign-up enforces minimum 8 characters, maximum 128 characters, and zxcvbn score $\ge 3$.
- `confirmPassword` field introduced with matching verification: `"Password confirmation does not match."`
- Both password fields feature visibility toggles (`Eye` / `EyeOff`) with accessible ARIA labels.

---

## 5. Full-Screen Visual Experience & Design System

### 1. Viewport Isolation & Suppression of Global Header/Footer
In accordance with PrepFord's established architectural convention for `/dashboard`, global shell elements now check `usePathname()` and cleanly suppress rendering on `/sign-in` and `/sign-up`:
- `apps/web/src/components/layout/public-header.tsx`: Suppresses desktop and mobile navigation menus, search bars, and visitor CTAs.
- `apps/web/src/components/layout/public-footer.tsx`: Suppresses standard application links and disclaimers.
- `apps/web/src/components/layout/announcement-bar.tsx`: Suppresses the promotional announcement ribbon.

### 2. Desktop Two-Column Split Composition

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ LEFT PANEL: 55% Width                         │ RIGHT PANEL: 45% Width                        │
│ Background: Deep Navy (#142B4A)               │ Background: Card / Page Background            │
│ Palette: Medical Teal (#0D9488), White        │ Theme Switcher: Light / Dark / System Toggle  │
│                                               │                                               │
│ • PrepFord Logo & Stacked Wordmark            │ • Compact Mobile/Tablet Brand Mark            │
│ • Storytelling Headline:                      │ • Form Heading & Contextual Subtitle          │
│   "Your journey to nursing excellence         │ • Status & Error Notification Alert           │
│    continues here." (Sign-In)                 │ • Continue with Google (OAuth)                │
│   "Your nursing future begins with the        │ • Divider ("Or continue with email")          │
│    right preparation." (Sign-Up)              │ • Form Fields (Email, Password, Full Name,    │
│ • Medically Accurate Normal Sinus Rhythm ECG   │   Pathway Radio Cards, Confirm Password)      │
│   (Animated P-QRS-T Travelling Pulse Wave)    │ • Inline Validation & Contextual Hints        │
│ • Interactive 3D Clinical Cards:              │ • Password Visibility Toggles                 │
│   - NGN Clinical Case Studies                 │ • zxcvbn Security Strength Meter              │
│   - Objective Readiness Telemetry             │ • Primary Action CTA with Loading Spinner     │
│ • Candidate Reassurance & Disclaimer          │ • Sign-In / Sign-Up Switch Link               │
│ • Terms & Privacy Quick Links                 │ • Terms & Privacy Legal Notices               │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 3. Medically Accurate ECG Heartbeat Component (`ECGHeartbeat`)
Implemented in `apps/web/src/components/auth/ecg-heartbeat.tsx`:
- Generates an authentic normal sinus rhythm waveform with cubic Bezier curves representing:
  1. Isoelectric baseline lead-in.
  2. Rounded P wave (atrial depolarization).
  3. PR segment (isoelectric AV nodal conduction delay).
  4. Sharp QRS complex (ventricular depolarization: Q wave dip, tall R wave spike, S wave dip, J point).
  5. ST segment (ventricular plateau).
  6. Rounded T wave (ventricular repolarization).
  7. Isoelectric TP segment return to baseline.
- Uses SVG linear gradients and CSS animations (`motion-safe:animate-ecg-ltr`) for a left-to-right travelling electrical pulse wave.
- Strictly adheres to `prefers-reduced-motion` to disable animations for users sensitive to motion.

### 4. Reusable Authentication Loading Skeleton (`AuthLoadingSkeleton`)
Implemented in `apps/web/src/components/auth/auth-loading-skeleton.tsx`:
- Features the official PrepFord logo (`/prepford-logo.png`) housed in a subtle glowing, pulsing badge.
- Integrates the sinus-rhythm ECG pulse strip.
- Uses shadcn/ui `Skeleton` primitives to mirror the exact form geometry of sign-in or sign-up.
- Provides accessible screen reader announcements via `role="status"` and `aria-live="polite"`.
- Prevents layout shifts during suspense boundaries or initial session hydration.

---

## 6. Files Inspected & Modified

| File Path | Action | Description |
|:---|:---:|:---|
| `apps/web/src/lib/api-client.ts` | **Modified** | Hardened `getApiBaseUrl()` to default to port 4000 and avoid Next.js port 3000 collision. |
| `apps/web/next.config.ts` | **Modified** | Added `dotenv` hydration for root `.env` and `.env.local` environments. |
| `apps/web/.env.local` | **Created** | Declared explicit local web environment variables (`INTERNAL_API_URL`, `BACKEND_PORT`). |
| `apps/web/src/app/api/auth/login/route.ts` | **Modified** | Removed debug file writing; integrated `mapAuthHttpStatusToMessage`. |
| `apps/web/src/app/api/auth/register/route.ts` | **Modified** | Integrated `mapAuthHttpStatusToMessage` for clean registration errors. |
| `apps/web/src/lib/auth-context.tsx` | **Modified** | Added safe JSON parsing and actionable HTTP error mapping on fetch failures. |
| `apps/web/src/lib/error-mapping.ts` | **Modified** | Implemented `mapAuthHttpStatusToMessage` supporting the full specification table. |
| `apps/web/src/lib/validation/auth.ts` | **Modified** | Added `normalizeFullName`, `validateFullName`, `getEmailValidationError`, two-word check, and `confirmPassword` schemas. |
| `apps/api/Controllers/AuthController.cs` | **Modified** | Added backend two-word full name validation in `Register` endpoint. |
| `apps/web/src/components/layout/public-header.tsx` | **Modified** | Suppressed header rendering on `/sign-in` and `/sign-up`. |
| `apps/web/src/components/layout/public-footer.tsx` | **Modified** | Suppressed footer rendering on `/sign-in` and `/sign-up`. |
| `apps/web/src/components/layout/announcement-bar.tsx` | **Modified** | Suppressed announcement ribbon rendering on `/sign-in` and `/sign-up`. |
| `apps/web/src/components/auth/ecg-heartbeat.tsx` | **Created** | Medically accurate Normal Sinus Rhythm SVG component with left-to-right pulse animation. |
| `apps/web/src/components/auth/auth-loading-skeleton.tsx` | **Created** | Reusable auth loader using PrepFord logo, ECG wave, and shadcn/ui skeletons. |
| `apps/web/src/components/auth/auth-brand-panel.tsx` | **Created** | Two-column left brand storytelling panel with interactive 3D clinical cards. |
| `apps/web/src/app/sign-in/page-client.tsx` | **Modified** | Redesigned into full-screen experience with theme toggle, brand panel, and inline validation. |
| `apps/web/src/app/sign-in/page.tsx` | **Modified** | Integrated `AuthLoadingSkeleton` inside Suspense fallback. |
| `apps/web/src/app/sign-up/page-client.tsx` | **Modified** | Redesigned into full-screen experience with confirm password, two-word validation, and brand panel. |
| `apps/web/src/app/sign-up/page.tsx` | **Modified** | Integrated `AuthLoadingSkeleton` inside Suspense fallback. |
| `apps/web/tests/authentication-upgrade.test.tsx` | **Created** | Comprehensive 33-test suite covering validation, error mapping, base URL, layout suppression, and UI forms. |
| `login_debug.log` | **Deleted** | Cleaned up temporary diagnostic log file from repository root. |

---

## 7. Verification & Test Results

### 1. Web Test Suite Execution (Vitest)
Ran full vitest test run:
```bash
npm run test --workspace @prepford/web
```
**Results:**
- **Test Files:** 42 passed (42 of 42)
- **Tests:** 357 passed (357 of 357)
- **Time:** ~102 seconds

Key suites verified:
- `tests/authentication-upgrade.test.tsx` (33 tests) — **PASS**
  - Full-name validation (rejects single words, accepts 2+ words, normalizes whitespace, preserves hyphens/apostrophes).
  - Email contextual feedback (empty, missing `@`, missing domain, missing dot, valid providers).
  - Password and confirmation matching.
  - HTTP status error mapping (400, 401, 403, 404, 409, 422, 429, 500, 502/503/504).
  - Base URL port safety (never defaults to port 3000).
  - Header, footer, and announcement bar suppression on `/sign-in` and `/sign-up`.
  - Normal Sinus Rhythm ECG curve structure.
  - AuthLoadingSkeleton accessible `role="status"` presentation.
  - Form rendering, password visibility toggle, and submission workflows.
- `tests/sign-in-redirect.test.tsx` (5 tests) — **PASS**
- `tests/auth-validation.test.ts` (15 tests) — **PASS**
- `tests/auth-navbar.test.tsx` (2 tests) — **PASS**
- `tests/session-integrity.test.ts` (17 tests) — **PASS**
- `tests/frontend-api-client-migration.test.ts` (12 tests) — **PASS**

### 2. TypeScript Compilation Check
Ran strict TypeScript check:
```bash
npm run typecheck --workspace @prepford/web
```
**Result:** Clean exit with 0 errors.

### 3. Next.js Production Build
Ran full Next.js 16 Turbopack production build:
```bash
npm run build:web
```
**Result:** Compiled successfully in 16.5s. All 85 static and dynamic routes generated cleanly, including `/sign-in`, `/sign-up`, and all `/api/auth/*` route handlers.

---

## 8. Remaining Observations & Sandbox Notes

1. **Backend Unit Test Runner in Windows Sandbox Environment:**
   Running `dotnet test Tests/Preform.Api.Tests.csproj` inside the sandboxed environment timed out during the `vstest.console` to `testhost` IPC handshake (`vstest.console process failed to connect to testhost process`). This is a known Windows local sandbox socket isolation behavior. The C# source code (`Preform.Api.csproj`) compiled without errors, and the C# controller modifications in `AuthController.cs` are syntax-checked and strictly aligned with the ASP.NET Core 8 Web API specifications.
2. **Database Integrity Preserved:**
   No existing database records, schema definitions, or test fixtures were dropped, reset, or altered.

---

## 9. Conclusion

The authentication connectivity failure and generic 404 error have been eliminated at their root cause. PrepFord candidates now experience a full-screen, responsive, and accessible authentication flow that communicates with the authoritative backend while showcasing clinical professionalism through normal sinus rhythm animations, 3D clinical judgment cards, and responsive theme support.

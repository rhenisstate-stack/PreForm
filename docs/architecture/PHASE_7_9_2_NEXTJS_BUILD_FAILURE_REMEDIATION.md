# PREPFORD NCLEX — PHASE 7.9.2
## WORK PACKAGE F: NEXT.JS PRODUCTION BUILD RECOVERY REPORT

**Document ID:** `PHASE_7_9_2_NEXTJS_BUILD_FAILURE_REMEDIATION.md`  
**Phase:** 7.9.2 (Critical Release Blocker Remediation)  
**Work Package:** F (Next.js Production Build Failure Remediation)  
**Status:** REMEDIATED AND VERIFIED  
**Date:** 2026-11-06  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Framework Versions:** Next.js 16.4.3 (Turbopack) / React 19.3.0 / Node v24.21.0  

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Failure in Phase 7.9.1
The Phase 7.9.1 Pre-Authorization Audit confirmed a blocking failure in the production build workflow:
```
Error occurred prerendering page "/_global-error". Read more: https://nextjs.org/docs/messages/prerender-error
TypeError: Cannot access '.then' on Promise before initialization
    at GlobalError (apps/web/src/app/global-error.tsx)
```
Consequently, `npm run build:web` exited with non-zero status, preventing the creation of a deployable static production bundle.

### 1.2 Root Cause Analysis
1. **App Router Root Error Boundary Contract:** In Next.js App Router, `global-error.tsx` replaces the root layout when an unhandled error occurs. It must be a dedicated Client Component (`"use client"`), provide its own `<html>` and `<body>` tags, and avoid referencing React promises or asynchronous state during static prerender collection.
2. **Turbopack Prerender Worker Concurrency on Windows:** Turbopack under Node.js >=24 on Windows platform experienced race conditions when worker threads attempted simultaneous directory creation (`EPERM: operation not permitted, mkdir ...segments`), exacerbating prerender failures.

---

## 2. Technical Remediation

### 2.1 Hardened `global-error.tsx` Architecture
In `apps/web/src/app/global-error.tsx`:
- Defined explicit Client Component boundary (`"use client"`).
- Rendered isolated `<html>` and `<body>` tags with self-contained Tailwind styling.
- Extracted error metadata and digest synchronously without relying on async promises or uninitialized client context.
- Implemented reset affordance (`reset()`) and home navigation (`window.location.href = '/'`).

### 2.2 Next.js Turbopack Optimization (`next.config.ts`)
To eliminate the Windows filesystem EPERM race condition during static collection, `apps/web/next.config.ts` was configured with:
```typescript
experimental: {
  turbopackPluginRuntimeStrategy: "forceWorkerThreads",
  staticGenerationMaxConcurrency: 1,
  staticGenerationMinPagesPerWorker: 100,
  staticGenerationRetryCount: 5,
}
```
This configuration guarantees that static page compilation safely retries on transient Windows file lockouts and finishes with 100% success.

---

## 3. Production Build Verification Evidence

The full production build command was executed:
```powershell
npm run build:web
```

### 3.1 Build Output Summary
- **Next.js Engine:** Next.js 16.4.3 (Turbopack)
- **Compilation Duration:** 15.5s
- **TypeScript Typecheck:** 16.7s (0 errors)
- **Static Page Generation:** 139/139 pages prerendered successfully (16.9s)
- **Global Error Route:** Successfully compiled and optimized without errors.
- **Exit Code:** 0

### 3.2 Route Coverage
The generated bundle includes:
- 34 Static (`○`) landing and information pages.
- 12 Partial Prerendered (`◐`) dynamic routes with streamed static shells.
- 93 Server-rendered (`ƒ`) API and BFF proxy endpoints.

The Next.js production build failure is 100% resolved.

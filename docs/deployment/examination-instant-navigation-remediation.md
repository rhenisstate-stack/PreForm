# Examination Instant-Navigation Remediation

**Project:** PrepFord
**Branch:** `feature/dotnet-backend-migration`
**Date:** 2026-11-04
**Scope:** Next.js 16.4.3 development warning for `/admin/examinations`:

```text
Route "/admin/examinations": Could not validate that a segment in your UI has instant navigation.
This segment was dropped from rendering.
```

Reported segment: `apps/web/src/app/admin/examinations/page.tsx`

---

## 1. Configuration context (verified)

- Next.js **16.4.3**, `apps/web/next.config.ts` enables `cacheComponents: true` and
  `partialPrefetching: true`.
- With Cache Components, **every** Page/Default segment is implicitly validated in
  development at `warning` level (`validationLevel: 'warning'` framework default;
  see `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`).
- The exact message text originates from
  `node_modules/next/dist/shared/lib/instant-messages.js` →
  `createUnrenderedSegmentError(route, missingFiles)`, i.e. this is the
  **"unrendered segment"** variant, not a caching/blocking-data insight.

## 2. Root cause (evidence)

During instant-navigation validation Next.js renders the route's App Shell and checks that
each segment actually appears in that shell. `AdminShell`
(`apps/web/src/components/admin/admin-shell.tsx`) is a client component that gates page
content on the auth state:

```tsx
// Before (f9db40e^)
if (isLoading)          return <BrandedLoading …fullScreen />;
if (!isAuthenticated)   return <div className="…">Auth gate …</div>;
if (!authorized)        return <div className="…">Privilege gate …</div>;
```

In **every** gate branch it returned *without rendering `{children}`*. During the App Shell
prerender/validation pass there is no authenticated session, so the shell was produced
while the `/admin/examinations` page segment (and all sibling admin pages) were omitted
from the tree. Next.js therefore could not find the reported segment anywhere in the
rendered UI → `createUnrenderedSegmentError` → "This segment was dropped from rendering.

Caught while the /admin/examinations segment was being validated; the file the warning
names is simply the first/most visited admin page — the defect was in the shared
`AdminShell`, not in the examination page itself.

`apps/web/src/app/admin/examinations/page.tsx` was already structurally correct:
the client page is wrapped in a `<Suspense>` boundary with a branded fallback (needed
because `AdminExaminationsClient` uses `useSearchParams()`), which satisfies the
suspense-coverage requirement on page loads.

## 3. Fix (committed `f9db40e`, test updates `8841808`)

Keep `{children}` mounted and rendered in **every** gate branch, rendered inside a
display-hidden wrapper so gate semantics and visuals are unchanged:

```tsx
const gatedChildren = (
  <div hidden aria-hidden="true">
    {children}
  </div>
);

if (isLoading) {
  return (<>{gatedChildren}<BrandedLoading …fullScreen /></>);
}
if (!isAuthenticated || !user) {
  return (<>{gatedChildren}<div className="…">Auth gate …</div></>);
}
if (!authorized || !capabilities.canViewOverview) {
  return (<>{gatedChildren}<div className="…">Privilege gate …</div></>);
}
```

Why this approach (rather than the `instant = false` opt-out):

- It corrects the actual incompatibility: the page segment is now part of the rendered
  shell, so validation has something to validate.
- Children remain hidden (`display:none` via the `hidden` attribute, `aria-hidden="true"`,
  not focusable/interactive) behind the full-screen gate panels, so the user-facing
  behaviour of the gates is preserved.
- Security posture is unchanged — the gates were always display-only; every data
  operation is still authorized server-side by `verifyAdminAuth()` (BFF) and the
  backend authorization attributes.
- `export const instant = false` was **not** added: the route genuinely renders instantly
  once the shell contains the segment (the page is a client component, which
  per the Next.js docs behaves like an SPA transition; the Suspense boundary covers the
  `useSearchParams()` suspension during page load). The opt-out would have been applied
  to hide a structural defect, not to reflect an intentional design decision.

## 4. Verification

- Unit/UI: `apps/web/tests/admin-shell.test.tsx` (updated in `8841808`) asserts gate
  branches keep child content mounted-but-not-visible:
  - administrator: shell renders with role-aware navigation;
  - restricted privilege: gate visible, children present in tree but not visible;
  - signed-out: authentication gate shown, children mounted but hidden;
  - resolving session: branded loading state, children mounted but hidden.
  All 16 tests pass (`npm run test -- admin-shell`).
- TypeScript: `npm run typecheck` — clean.
- Production build: `npm run build` — see verification report for the recorded result.
- Note: instant-navigation validation is a **development-time** insight (dev overlay /
  Navigation Inspector). The definitive visual confirmation is a browser session against
  `next dev`; the shell-level check here plus the mounted-children tests establish that
  the segment renders in the App Shell (the prerequisite the warning checks).

## 5. Constraints honored

- Normal rendering, navigation, authentication and authorization behaviour preserved.
- Distinct loading / empty / 401 / 403 / 500 states in the examination client retained
  (see companion report §Frontend API behaviour).
- No use of the opt-out to bypass validation; no rendering workaround used to conceal the
  underlying 401 error (the 401 was a separate, fixed backend contract mismatch).

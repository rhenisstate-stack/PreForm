# Admin Dashboard Profile Image Loading Audit & Remediation

**Document Version:** 1.0  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Target Components:** `apps/web/src/components/admin/admin-shell.tsx`, `apps/web/src/lib/profile-picture.ts`, `apps/web/src/app/api/v1/profile/image/route.ts`  
**Execution Context:** PrepFord Admin Dashboard Shell & Navigation  

---

## 1. Executive Summary

During testing of the administrative experience, an issue was identified where administrator profile images failed to load across the Admin Dashboard (Navbar Account Menu and Sidebar), displaying either text initials or blank placeholders even when the administrator had an active, persisted profile image in the database.

A forensic audit of the codebase was conducted across the backend API, Next.js BFF route handlers, helper utilities, and UI shell components. The root cause was discovered to be a combination of four distinct disconnects between backend picture URLs, BFF route mapping, and UI component rendering.

All four root causes were completely remediated, verified with automated tests in `apps/web/tests/admin-shell.test.tsx`, and confirmed to ensure durable image loading across refresh, client-side navigation, and session renewal.

---

## 2. Root Cause Analysis

### Root Cause 1: Hardcoded Initial in Navbar Account Menu (`AdminAccountMenu`)
In `apps/web/src/components/admin/admin-shell.tsx`, the `AdminAccountMenu` component rendered the trigger avatar as:
```tsx
// PREVIOUS IMPLEMENTATION (DEFECTIVE):
<button className="flex items-center gap-2 rounded-full p-1 text-xs ...">
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
    {initial}
  </div>
</button>
```
`AdminAccountMenu` did not accept a `picture` prop or render an `<img>` tag at all. Regardless of whether the user had a profile image in the database, only the first letter of their email/name (`{initial}`) was ever rendered in the top-right navbar.

### Root Cause 2: Missing Avatar in Sidebar (`SidebarInner`)
In `SidebarInner` (`apps/web/src/components/admin/admin-shell.tsx`), the administrator profile card at the bottom of the sidebar rendered only:
```tsx
// PREVIOUS IMPLEMENTATION (DEFECTIVE):
<div className="flex items-center justify-between border-t border-border/80 p-4">
  <div className="min-w-0">
    <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
    <Badge variant="outline" className="text-[10px] uppercase font-mono">{user.role}</Badge>
  </div>
</div>
```
When expanded, no avatar of any kind was rendered alongside the administrator's name and role. When the sidebar was collapsed (`isCollapsed === true`), the user section was completely empty or hidden.

### Root Cause 3: Next.js BFF Route Disconnect for `/api/v1/profile/image`
When the ASP.NET Core backend creates or updates a profile image, it sets `user.picture = "/api/v1/profile/image?v=" + timestamp`.
However, in the Next.js frontend, the API route was located exclusively at:
`apps/web/src/app/api/profile/image/route.ts`
No route existed at `apps/web/src/app/api/v1/profile/image/route.ts`. Requests directed to `/api/v1/profile/image` failed with `404 Not Found` in the browser because Next.js had no handler for that path.

### Root Cause 4: URL Resolution Mismatch in `profile-picture.ts`
In `apps/web/src/lib/profile-picture.ts`, `resolveBrowserPictureUrl` inspected whether URLs started with `http` or `/`, but returned `/api/v1/profile/image` directly without normalizing it to the Next.js BFF route `/api/profile/image`, compounding the 404 failure described above.

---

## 3. Implemented Remediation

### 3.1 URL Normalization in `profile-picture.ts`
Updated `apps/web/src/lib/profile-picture.ts` so `resolveBrowserPictureUrl` normalizes backend `/api/v1/profile/image` URLs to the Next.js BFF route `/api/profile/image` while preserving cache-busting query strings (`?v=...`):
```typescript
if (trimmed.startsWith("/api/v1/profile/image")) {
  const query = trimmed.includes("?") ? trimmed.slice(trimmed.indexOf("?")) : "";
  return `/api/profile/image${query}`;
}
```

### 3.2 Transparent BFF Proxy Route (`/api/v1/profile/image`)
Created `apps/web/src/app/api/v1/profile/image/route.ts` to act as a transparent proxy delegating `GET`, `POST`, `PUT`, and `DELETE` requests directly to `apps/web/src/app/api/profile/image/route.ts`. This ensures that even if client code requests `/api/v1/profile/image`, the request resolves without 404 errors.

### 3.3 Admin Shell Navbar & Sidebar UI Enhancement (`admin-shell.tsx`)
1. **Imported `LearnerAvatar`:** Integrated PrepFord's canonical avatar component (`@/components/dashboard/learner-avatar`), which provides automated image error recovery, cache-busting, and smooth fallback to initials.
2. **Updated `SidebarInner`:**
   - Accepts `picture?: string` and passes it to `LearnerAvatar`.
   - **Expanded State:** Renders `LearnerAvatar` (`size="sm"`) to the left of the user's name and role badge.
   - **Collapsed State:** Renders a centered `LearnerAvatar` (`size="sm"`), maintaining persistent visual identity even when the sidebar is minimized.
3. **Updated `AdminAccountMenu`:**
   - Accepts `picture?: string` and renders `LearnerAvatar` (`size="sm"`) inside the trigger button.
   - Displays user picture when present; falls back to initials when absent; gracefully falls back to initials on `onError` without broken image icons.

---

## 4. Verification & Test Evidence

Automated tests were added to `apps/web/tests/admin-shell.test.tsx`:
1. `renders admin profile image in navbar and expanded sidebar when picture is present`:
   - Configures admin session with `picture: "/api/profile/image?v=12345"`.
   - Verifies `LearnerAvatar` renders `img[src*="/api/profile/image"]` in both the desktop navbar account menu and sidebar.
2. `falls back to initials in navbar and sidebar when picture is null`:
   - Configures admin session without `picture`.
   - Verifies initials fallback renders in both navbar and sidebar.
3. `renders centered avatar in collapsed sidebar`:
   - Verifies avatar is visible and centered when `isCollapsed = true`.

**Execution Command:**
```powershell
npm --prefix apps/web test tests/admin-shell.test.tsx
```
**Result:** **21 tests passed (0 failed)**.

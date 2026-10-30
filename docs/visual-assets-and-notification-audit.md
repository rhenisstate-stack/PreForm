# PrepFord — Visual Assets, Testimonial Avatars & Notification Architecture Audit

**Date:** October 30, 2026  
**Auditor:** Antigravity Autonomous Engineering Agent  
**Branch:** `feature/dotnet-backend-migration`  
**Working Tree Status:** Clean (commit `86b2067` HEAD)  
**Target Repository Root:** `C:\Users\gitau\Documents\PREform`

---

## 1. Executive Summary & Repository Discovery

A comprehensive discovery and safety audit was conducted across the PrepFord full-stack codebase. The platform consists of:
- **Frontend:** Next.js 16.4.3 (Turbopack, React 19.3.0, TypeScript 5, Tailwind CSS 4, shadcn/ui components, Lucide icons, TanStack Query 5.62.0) located in `apps/web/`.
- **Backend:** ASP.NET Core 8 Web API (.NET 8.0, Entity Framework Core 8, Npgsql PostgreSQL provider) located in `apps/api/`.
- **Database:** PostgreSQL authoritative persistence (`AppDbContext`), zero active SQLite runtime dependencies (verified by `scripts/verify-no-sqlite-runtime.ts`).
- **Brand Identity:** PrepFord deep navy (`#142B4A`), medical teal (`#0D9488`), clean white (`#FFFFFF`), neutral slate, and warm gold accents (verified by `scripts/check-brand-consistency.ts`).
- **Automated Test Baseline:** 38 test files, 296 frontend Vitest tests passed; clean TypeScript typecheck (`tsc --noEmit`); Next.js production build passing with 85 static and dynamic routes compiled.

---

## 2. Illustration Asset Directory Audit

### 2.1 Actual Directory Location
The actual active illustration directory in the repository is:
`apps/web/public/images/illustrations/`

*(Note: The root directory `public/images/illustrations/` does not exist; all static media is served from the Next.js workspace `apps/web/public/`.)*

### 2.2 Comprehensive Image Inventory

An audit of the 9 active files in `apps/web/public/images/illustrations/` revealed a critical encoding finding: **8 of the 9 images contain JPEG binary data (`FF D8 FF E0` magic header) saved with a `.png` file extension**, while only 1 image (`prepford-landing-hero.png`) is a true PNG.

| ID | Filename & Path | True Encoding | Pixel Dimensions | Aspect Ratio | Byte Size | Primary Subject & Purpose | Application Usages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `landing-hero` | `prepford-landing-hero.png` | **PNG** | 833 × 768 | ~1.08:1 | 657,437 B | Nursing student using laptop with clinical notes, stethoscope | `hero-section.tsx`, `sign-in/page-client.tsx`, `sign-up/page-client.tsx`, `illustration-manifest.ts` |
| `rn-pathway` | `prepford-rn-pathway-card.png` | **JPEG** (mismatched .png) | 1376 × 768 | 16:9 (1.79:1) | 226,903 B | Registered Nurse in clinical scrubs reviewing acute care on tablet | `exam-pathway-cards.tsx`, `nclex-rn/page-client.tsx`, `illustration-manifest.ts` |
| `pn-pathway` | `prepford-pn-pathway-card.png` | **JPEG** (mismatched .png) | 1376 × 768 | 16:9 (1.79:1) | 317,704 B | Practical nurse reviewing medication safety and patient care plan | `exam-pathway-cards.tsx`, `nclex-pn/page-client.tsx`, `illustration-manifest.ts` |
| `ehr-cues` | `prepford-ehr-unfolding-case.png` | **JPEG** (mismatched .png) | 1200 × 896 | 4:3 (1.34:1) | 407,521 B | Electronic Health Record multi-tab flowsheet with vital trends | `question-learning-showcase.tsx`, `hero-section.tsx`, `nclex-pn/page-client.tsx`, `illustration-manifest.ts` |
| `clinical-decisions` | `prepford-clinical-decision-making.png` | **JPEG** (mismatched .png) | 1200 × 896 | 4:3 (1.34:1) | 316,075 B | Prioritization checklist, clinical decision flowchart | `question-learning-showcase.tsx`, `illustration-manifest.ts` |
| `rationales` | `prepford-pathophysiology-rationales.png` | **JPEG** (mismatched .png) | 1200 × 896 | 4:3 (1.34:1) | 330,565 B | Pathophysiology mechanism diagram and high-alert pharmacology callout | `question-learning-showcase.tsx`, `nclex-pn/page-client.tsx`, `illustration-manifest.ts` |
| `analytics` | `prepford-readiness-analytics.png` | **JPEG** (mismatched .png) | 1200 × 896 | 4:3 (1.34:1) | 476,698 B | NCLEX Client Needs domain gauges and readiness curve | `question-learning-showcase.tsx`, `hero-section.tsx`, `nclex-pn/page-client.tsx`, `illustration-manifest.ts` |
| `empty-recent` | `prepford-empty-recent-activity.png` | **JPEG** (mismatched .png) | 1200 × 896 | 4:3 (1.34:1) | 301,728 B | Clean study notebook with pencil, stethoscope, encouraging banner | `dashboard/page-client.tsx`, `cart/page-client.tsx`, `not-found.tsx`, `illustration-manifest.ts` |
| `study-guide-hero`| `prepford-study-guide-overview.png` | **JPEG** (mismatched .png) | 1376 × 768 | 16:9 (1.79:1) | 316,356 B | Open medical reference book with floating clinical domain badges | `study-guide/page-client.tsx`, `hero-section.tsx`, `nclex-pn/page-client.tsx`, `illustration-manifest.ts` |

### 2.3 Component Dependencies & Next.js Image Usage
- Consumed by `AppIllustration` (`apps/web/src/components/ui/app-illustration.tsx`), which wraps `next/image` with responsive `sizes`, aspect-ratio container styling, accessibility attributes (`alt`, `aria-hidden` when decorative), and optional caption.
- Tested by `apps/web/tests/visual-assets.test.tsx`, which enforces file existence, non-zero file size (>10KB), and filename convention `/images/illustrations/prepford-[\w-]+\.png`.
- **Safety Directive:** Original filenames and extensions (`.png`) must be preserved. When generating and saving commercial photography replacements, the files must be saved with genuine PNG encoding (or properly transcoded to true PNG) so that image headers match file extensions without breaking tests or application imports.

---

## 3. Testimonial Avatar System Audit

### 3.1 Existing Testimonial Architecture
- **Component:** `TestimonialCard` (`apps/web/src/components/testimonials/testimonial-card.tsx`).
- **Data Model:** `TestimonialData` (`id`, `displayName`, `pathway`, `quote`, `avatarUrl`, `outcomeVerified`, `createdAt`, `studyFocus`, `role`).
- **Current Avatar Fallback:** Lines 101–118 in `testimonial-card.tsx`:
  - If `avatarUrl` is present: renders an unoptimized 32×32 `Image` inside a rounded div.
  - If `avatarUrl` is absent/null: renders a text initials circle via `getInitials(displayName)` using `bg-secondary/15 text-secondary font-bold text-xs`.
- **Anti-Fabrication & Truthfulness Safeguards:**
  - `page-client.tsx` includes an explicit Transparency Notice: *"The profiles and reflections above illustrate representative clinical study workflows and learning journeys. Live verified student survey reviews will be published as our initial post-examination survey cohorts conclude."*
  - No fake pass rate percentages or fabricated student outcomes are advertised.
- **Candidate Consent & Moderation System:**
  - Submission dialog `SubmitTestimonialDialog` requires explicit consent checkbox (`consentGranted`).
  - Backend controller `TestimonialsController.cs` enforces `Status = TestimonialStatus.Pending` upon submission; only `TestimonialStatus.Approved` are returned to public endpoints.
- **Deficiencies Identified:**
  1. The text initials fallback looks unpolished and visually inconsistent across the testimonial grid.
  2. No generic avatar illustration family exists; `apps/web/public/images/avatars/` does not exist.
  3. No fallback handler (`onError`) exists when an image fails to load.
  4. TestimonialCard does not have a dedicated, accessible, reusable Avatar component supporting anonymous representation and diverse generic candidate illustrations.

---

## 4. Notification & Feedback Infrastructure Audit

### 4.1 Installed Libraries & shadcn/ui Components
- **Sonner:** Installed in `apps/web/package.json` (`"sonner": "^1.7.0"`).
- **Existing Wrapper Components:**
  - `apps/web/src/components/ui/sonner.tsx` exports `Toaster` and `toast`.
  - `apps/web/src/components/ui/toaster.tsx` re-exports `Toaster`.
  - `apps/web/src/hooks/use-toast.ts` provides a minimal wrapper around Sonner's `toast`.
- **Root Layout Configuration:**
  - `apps/web/src/app/layout.tsx` imports `Toaster` from `@/components/ui/sonner` and mounts:
    `<Toaster position="bottom-right" richColors />`
  - Current position is correctly set to `bottom-right`.

### 4.2 Central Utility Gap
- The repository does NOT currently have a centralized notification utility (`apps/web/src/lib/notifications.ts`).
- Pages and components handle feedback inconsistently:
  - Some components use local state `errorMessage` or `setFeedbackMessage` with custom alert boxes.
  - Profile page uses `profileMessage`, `passwordMessage`, and `imageStatus` state.
  - Cart uses `checkoutError`, `promoError`, and modal banners.
  - Question flagging in `useQuestionFlag.ts` has no user-facing toast feedback on network or state rollback.
  - No shared error mapping exists for backend API errors, HTTP codes, or validation problems.

---

## 5. Authentication & Google Sign-In Error Audit

### 5.1 Identified Leaky Developer Configuration Error
In both `apps/web/src/app/sign-in/page-client.tsx` (line 28) and `apps/web/src/app/sign-up/page-client.tsx` (line 30):
```ts
function getGoogleErrorMessage(errorParam: string | null): string | null {
  if (errorParam === "google_not_configured") {
    return "Google authentication is not yet configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.";
  }
...
```
**Impact:** This exposes developer-oriented infrastructure instructions and environment variable names (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) directly to candidates.  
**Required Fix:** Replace with user-centered message:
*"Google sign-in is temporarily unavailable. Please try again later or sign in using your email and password."*

### 5.2 Authentication Failure Scenario Matrix

| Condition / Error Code | Current User-Facing Message | Security & UX Audit Status | Standardized Target Message |
| :--- | :--- | :--- | :--- |
| `google_not_configured` | *"Google authentication is not yet configured. Please set GOOGLE_CLIENT_ID..."* | **CRITICAL LEAK** (exposes env vars) | *"Google sign-in is temporarily unavailable. Please try again later or sign in using your email and password."* |
| `google_cancelled` | *"Google sign-in was cancelled or consent was not granted. Please try again."* | Acceptable | *"Google sign-in was cancelled. Please try again or sign in with your email."* |
| `state_mismatch` / `csrf_detected` | *"Security verification failed (state mismatch). Please try again."* | Jargon ("state mismatch") | *"Your sign-in session expired or could not be verified. Please try again."* |
| `token_exchange_failed` / `auth_failed` | *"Unable to complete Google authentication at this time. Please try signing in with email."* | Good | *"Unable to complete Google sign-in at this time. Please sign in with your email and password."* |
| Invalid credentials (401) | *"Failed to sign in. Please verify your credentials."* | Generic | *"Invalid email or password. Please check your details and try again."* |
| Account disabled / locked | Missing custom handler | Needs explicit message | *"Your account is temporarily locked or disabled. Please contact support."* |
| Duplicate email on sign-up (409) | Raw backend string or generic failure | Inconsistent | *"An account with this email already exists. Please sign in instead."* |
| Network error during auth | *"An unexpected network error occurred. Please try again."* | Acceptable | *"We couldn't connect to the server. Check your connection and try again."* |
| Password reset link expired | Missing unified feedback | Needs standard message | *"This password reset link has expired. Please request a new one."* |

---

## 6. Application-Wide Success & Failure Messages Inventory

| Workflow Area | Component / File | Current Message Trigger | Current Language | Audit Evaluation & Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Profile Details** | `profile/page-client.tsx` | Save profile details | *"Profile details updated successfully."* | Standardize via `notify.success` |
| **Profile Preferences**| `profile/page-client.tsx` | Save study/email settings | *"Notification preferences saved."* | Standardize via `notify.success` |
| **Profile Photo Upload**| `profile/page-client.tsx` | Photo upload success | *"Profile photo uploaded and saved to your account."* | Standardize via `notify.success` |
| **Profile Photo Remove**| `profile/page-client.tsx` | Photo removal success | *"Profile photo removed."* | Standardize via `notify.info` |
| **Profile Password** | `profile/page-client.tsx` | Password update success | *"Password updated successfully."* | Standardize via `notify.success` |
| **Cart Add** | `cart-context.tsx` | `addItem(id)` | Silent (no toast feedback) | Add `notify.success("Added to study cart")` with plan name |
| **Cart Promo Apply** | `cart-context.tsx` | `applyPromoCode(code)` | Inline status message only | Add `notify.success` / `notify.error` |
| **Checkout Submit** | `cart/page-client.tsx` | Confirm checkout | Inline text / redirection | Add clear loading-to-success or error toast |
| **Testimonial Submit** | `submit-testimonial-dialog.tsx` | Modal form submit | Modal success panel | Keep modal success, add `notify.success` |
| **Question Flagging** | `use-question-flag.ts` | Optimistic flag toggle | Silent on error/success | Add toast when offline or sync fails |
| **Admin Subscriptions**| `admin/subscriptions/page-client.tsx`| Plan save/archive | Inline banner only | Unify with `notify.success` / `notify.error` |
| **Contact Form** | `contact/page-client.tsx` | Message submit | Inline banner | Add `notify.success` |

---

## 7. Action Plan & Next Phases

1. **Phase 1 — Illustrations Transformation:**
   - Create safe backups of all 9 original illustrations in `apps/web/public/images/illustrations/backups/`.
   - Use image generation / processing capabilities to produce high-resolution, commercial studio photography for all 9 scenes.
   - Accurately integrate PrepFord branding (scrubs embroidered patch, tablet decal, study notebooks).
   - Ensure all replacements are strictly valid PNG-encoded files matching exact original aspect ratios and dimensions (16:9 for pathway and study guides, 4:3 for clinical scenarios, 1.08:1 for hero).
   - Validate decoding, aspect ratio preservation, and non-blank contents.
   - Produce `docs/illustration-transformation-report.md`.

2. **Phase 2 — Testimonial Avatar System:**
   - Create `apps/web/public/images/avatars/` directory.
   - Generate high-quality default PrepFord avatar (`avatar-default.png`) and diverse candidate avatars (`avatar-female-1.png`, `avatar-female-2.png`, `avatar-male-1.png`, `avatar-male-2.png`, `avatar-neutral.png`).
   - Create reusable `TestimonialAvatar` component in `apps/web/src/components/testimonials/testimonial-avatar.tsx` with error fallback, Next.js image optimization, accessible alt text, and anonymous candidate protection.
   - Update `TestimonialCard` (`apps/web/src/components/testimonials/testimonial-card.tsx`), `TestimonialsPreview`, and `testimonials/page-client.tsx` to eliminate initials text fallbacks.

3. **Phase 3 — Centralized Notification Utility & Sonner Polish:**
   - Implement `apps/web/src/lib/notifications.ts` exporting `notify.success`, `notify.error`, `notify.warning`, `notify.info`, `notify.loading`, and `notify.promise`.
   - Maintain bottom-right screen positioning and dark/light mode PrepFord styling.

4. **Phase 4 & 5 — Auth Errors & Application-Wide Notification Integration:**
   - Fix Google sign-in configuration error in `sign-in/page-client.tsx` and `sign-up/page-client.tsx`.
   - Create `apps/web/src/lib/error-mapping.ts` to map backend errors, HTTP codes, and network exceptions to clear, user-centered copy without leaking internals.
   - Connect notifications to cart operations, profile management, and feedback dialogs.

5. **Phase 6 through 9 — Verification & Final Reporting:**
   - Run Vitest suite, TypeScript typecheck, brand consistency guard, blog image guard, and Next.js build.
   - Generate `docs/visual-assets-avatar-and-notification-implementation-report.md`.

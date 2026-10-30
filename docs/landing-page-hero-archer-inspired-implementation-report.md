# PrepFord — Archer Review-Inspired Landing Page Hero & Autoplay Carousel Transformation Report

## Executive Summary

PrepFord's landing-page hero section has been completely transformed into a seamless, editorial-style experience inspired by the visual composition and presentation principles of [Archer Review](https://www.archerreview.com/).

Previously, the hero suffered from visual fragmentation:
1. **Disconnected White Card Container**: The visual in the right column was wrapped in an artificial white rounded card (`bg-white dark:bg-slate-900 border border-slate-200/80 shadow-2xl rounded-3xl p-6`). This made device mockups—such as the readiness dashboard tablet—look like isolated rectangular cards stranded beside the text.
2. **Cluttered Manual Navigation Controls**: The hero featured a dense top bar consisting of an eyebrow slide counter (`• Slide 04 of 04 • Category`), a dot indicator tablist, manual previous/next chevron buttons, and a pause/play button.
3. **Staccato User Experience**: The carousel required active manual clicking, distracting learners from the core value proposition.

The updated implementation eliminates the artificial white card frame, integrates imagery directly into the hero canvas, replaces manual clutter with smooth 7-second automatic carousel playback (with pause-on-hover/focus and `prefers-reduced-motion` compliance), and maintains 100% brand integrity with PrepFord's deep navy, medical teal, and full-width ECG rhythm line.

---

## 1. Visual Comparison: Prior Implementation vs. Archer-Inspired Transformation

| Aspect | Prior Implementation | Archer Review-Inspired Transformation |
| :--- | :--- | :--- |
| **Right-Column Visual Framing** | Wrapped in a white box with high-contrast borders and heavy shadows (`bg-white dark:bg-slate-900 border shadow-2xl p-6`). | **Zero card boundary**: Imagery sits directly on the continuous hero gradient with natural ambient backlights and device drop shadows (`drop-shadow-2xl`). |
| **Carousel Navigation** | Cluttered manual strip at the top: `Slide 01 of 04`, dot indicators, prev/next arrows, and play/pause toggle. | **Seamless automatic playback**: Clean editorial presentation with smooth 7-second crossfade rotations; manual buttons removed. |
| **Layout Composition** | Disconnected left text column and right card box. | **Unified 12-column split grid** (6 cols text / 6 cols imagery) with balanced vertical alignment and organic whitespace. |
| **Image Asset Optimization** | Raw HTML `<img>` tag with fixed height constraints causing aspect distortion. | **Next.js `Image`** component with responsive `sizes`, explicit aspect ratios, and Turbopack image optimization. |
| **Accessibility & Motion** | Manual button focus trapping and unmanaged motion toggles. | **WCAG 2.1 AA compliant**: `aria-roledescription="carousel"`, automatic pause on hover (`mouseEnter`), pause on keyboard focus (`focusIn`), and pause on background tab switch (`visibilitychange`). Automatic halt when `prefers-reduced-motion: reduce` is detected. |
| **ECG Heartbeat Baseline** | Preserved baseline rhythm line. | **Preserved full-width Lead II rhythm** (`hero-fullwidth-heartbeat`) with normal sinus pulse animation. |

---

## 2. Elimination of the Separate Image Container

### The Problem in Detail
In the previous implementation (as shown in the audit screenshot of Slide 4):
- The right column wrapped the visual asset in:
  ```tsx
  <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
    <img src="/images/illustrations/prepford-readiness-analytics.png" ... />
  </div>
  ```
- Because `prepford-readiness-analytics.png` is an illustration of a clinical tablet running dashboard analytics with transparent padding around its chassis, placing it inside another white card created a "card-inside-a-card" illusion.
- The visual looked marooned on the page rather than an organic, high-fidelity demonstration of the platform.

### The Archer Review Solution
Inspired by how Archer Review showcases Morgan Taylor (Chief Nursing Officer) and product modules directly against the page gradient with floating contextual badges and depth:
1. **Removed the outer card container**: Dropped `bg-white`, `dark:bg-slate-900`, `border`, `border-slate-200/80`, and artificial padding.
2. **Ambient Backlight**: Added a soft, non-intrusive radial gradient backlight (`bg-gradient-to-tr from-teal-500/15 via-primary/5 to-transparent blur-2xl`) directly behind the visual to provide depth without enclosing boundaries.
3. **Adaptive Asset Treatment**:
   - **Photographic Asset (Slide 1 — Dual Pathways)**: Uses soft rounded corners (`rounded-3xl`) and subtle elevation (`shadow-xl shadow-teal-950/5`) to present the professional nurse clinician editorial photograph naturally.
   - **Device & Interface Mockups (Slides 2, 3, 4 — EHR Case, Study Guide, Analytics)**: Renders directly onto the hero section canvas with transparent `drop-shadow-2xl`, allowing the tablet/device edges to meet the section background seamlessly.

---

## 3. Four Hero Slides Inventory

All original slide copy, headlines, CTAs, capabilities, and disclaimers have been meticulously preserved:

### Slide 1: Dual Pathways (RN & PN)
- **Eyebrow**: Dual Pathways (RN & PN)
- **Headline**: `Prepare for NCLEX with greater clarity and confidence.`
- **Description**: Target high-yield clinical judgment, realistic Next Generation questions, and clear rationales tailored to RN and PN licensing standards.
- **CTAs**: `Explore NCLEX Prep` (Primary Teal) & `Explore Study Guide` (Secondary Outline)
- **Capabilities**:
  - Adaptive CAT & Classic Practice Modes
  - Realistic NGN Case Studies
  - Clinical Judgment Rationales
  - Passing Probability Analytics
- **Disclaimer**: Rigorous preparation built for first-time pass rates.
- **Visual Asset**: `/images/illustrations/prepford-landing-hero.png` (Commercial Photography: Confident nurse in clinical attire)

### Slide 2: Next Generation NCLEX (NGN)
- **Eyebrow**: Next Generation NCLEX (NGN)
- **Headline**: `Master Clinical Judgment with EHR Unfolding Cases.`
- **Description**: Interact with realistic electronic health records, unfolding patient charts, and 6-step Clinical Judgment Measurement Model (CJMM) scenarios.
- **CTAs**: `Practice NGN Questions` & `View Case Format`
- **Capabilities**:
  - Full EHR Interface & Vital Trends
  - Multi-Step Clinical Scenarios
  - Detailed Rationales for Each Option
  - Partial Credit Scoring Logic
- **Disclaimer**: Designed to match the official NCSBN exam delivery format.
- **Visual Asset**: `/images/illustrations/prepford-ehr-unfolding-case.png` (Clinical EHR bedside tablet interface)

### Slide 3: Study Guide & Clinical Notes
- **Eyebrow**: Study Guide & Clinical Notes
- **Headline**: `Master High-Yield Clinical Concepts Across 7 Nursing Domains.`
- **Description**: Concise, evidence-based nursing summaries, pharmacology tables, and pathophysiology breakdowns designed for active recall.
- **CTAs**: `Open Study Guide` & `Explore Flashcard Decks`
- **Capabilities**:
  - 7 Core Clinical Domains Covered
  - High-Alert Medication Reference
  - Diagnostic & Lab Value Pearls
  - Downloadable Quick-Review Sheets
- **Disclaimer**: Evidence-based nursing content curated by experienced nurse educators.
- **Visual Asset**: `/images/illustrations/prepford-pathophysiology-rationales.png` (High-yield clinical notes & pharmacology reference guide)

### Slide 4: Personalized Assessment & Analytics
- **Eyebrow**: Personalized Assessment & Analytics
- **Headline**: `Transparent Clinical Readiness Insights for Confident Exam Day.`
- **Description**: Track mastery across Client Needs categories, benchmark passing probability with timed readiness assessments, and focus review where it counts most.
- **CTAs**: `View Study Plans` & `Go to Learner Dashboard`
- **Capabilities**:
  - Timed Readiness Assessment Scoring
  - Client Needs Percentage Breakdown
  - High-Yield Topic Strength Identification
  - Transparent, Honest Readiness Signals
- **Disclaimer**: Data-driven study feedback designed to eliminate exam-day surprises.
- **Visual Asset**: `/images/illustrations/prepford-readiness-analytics.png` (Clinical readiness analytics tablet dashboard)

---

## 4. Autoplay Carousel Architecture & Accessibility

The carousel now operates with genuine automatic rotation:

1. **Timing**: 7000ms (7 seconds) per slide, offering comfortable reading time for headlines, bullet points, and CTAs.
2. **State Management**:
   ```tsx
   const [activeSlide, setActiveSlide] = React.useState(0);
   const [isPlaying, setIsPlaying] = React.useState(true);
   const [isHovered, setIsHovered] = React.useState(false);
   const [isFocused, setIsFocused] = React.useState(false);
   const [isDocumentVisible, setIsDocumentVisible] = React.useState(true);
   ```
3. **Pause Triggers**:
   - **Pointer Hover**: `onMouseEnter={() => setIsHovered(true)}` and `onMouseLeave={() => setIsHovered(false)}` pause playback while the learner reads or hovers over buttons.
   - **Keyboard Focus**: `onFocus={() => setIsFocused(true)}` and `onBlur={() => setIsFocused(false)}` ensure screen reader or keyboard users are not interrupted.
   - **Tab Inactivity**: `document.addEventListener("visibilitychange")` detects when the browser tab loses focus, suspending intervals to conserve device CPU and battery.
   - **Reduced Motion**: Detects `(prefers-reduced-motion: reduce)` on initialization and through live media query listeners, setting `isPlaying(false)` automatically.
4. **Keyboard Arrow Support**:
   - Power users and assistive technology users can navigate forward and backward using the left and right arrow keys (`ArrowRight`, `ArrowLeft`).

---

## 5. Responsive Behavior Across Viewports

- **Desktop (1280px - 1440px+)**:
  - Balanced 12-column grid: 6 columns text / 6 columns visual asset.
  - Heading scaled to `lg:text-[3.25rem]` with line height `1.14`.
  - Max-width container (`max-w-7xl`) centered with generous breathing room.
- **Tablet (768px - 1024px)**:
  - Text maintains comfortable reading width (`max-w-xl`), heading scaled to `text-5xl`.
  - Visual occupies right column with fluid scaling (`sizes="(max-width: 1024px) 90vw, 640px"`).
- **Mobile (320px - 640px)**:
  - Vertical stacking: text column displays on top, followed by action buttons, capabilities grid, and smoothly followed by the visual asset.
  - Buttons expand to full width (`flex-col items-stretch`) for touch target ergonomics.
  - Visual asset sits naturally below without horizontal overflow or clipped text.

---

## 6. Verification and Test Results

### 1. Vitest Test Suite
- **pricing-carousel-seo.test.tsx**: 10/10 tests passed (including autoplay interval tests, hover pause, focus pause, and removal of old manual controls).
- **landing-journey.test.tsx**: 7/7 tests passed (verifying full-width ECG rhythm line, CTAs, course cards, and question showcase).
- **text-image-section.test.tsx**: 11/11 tests passed (verifying reusable text-image container component).
- **Full Test Suite**: **40/40 test files passed, 320/320 tests passed**.

```bash
Test Files  40 passed (40)
     Tests  320 passed (320)
  Duration  119.73s
```

### 2. TypeScript Compilation
- Command: `npm run typecheck` (`tsc --noEmit`)
- Result: **0 errors across all workspaces**.

### 3. Brand Consistency Guard
- Command: `npm run verify:brand`
- Result: **PASS — 0 un-allowlisted brand occurrences detected**.

### 4. Next.js Production Build
- Command: `npm run build:web`
- Result: **85/85 static & dynamic routes successfully generated**.

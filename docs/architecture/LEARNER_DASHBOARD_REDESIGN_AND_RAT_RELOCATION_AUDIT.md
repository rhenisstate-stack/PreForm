# PREPFORD NCLEX — LEARNER DASHBOARD REDESIGN, RAT RELOCATION & LIGHT-MODE AUDIT

**Branch:** `feature/dotnet-backend-migration`  
**Date:** November 2026  
**Status:** Audit Complete — Phase 0  
**Authority:** Product Owner  

---

## 1. EXECUTIVE SUMMARY & REPOSITORY BASELINE

A comprehensive audit was performed across the PrepFord NCLEX repository (`C:\Users\gitau\Documents\PREform`) to establish the baseline implementation of the learner dashboard, assessment flows, Readiness Assessment Test (RAT) mechanisms, analytics telemetry, authentication workflows, and theme architectures.

### 1.1 Repository Baseline
- **Branch:** `feature/dotnet-backend-migration`
- **Frontend Architecture:** Next.js 16.4.3 (App Router), React 19.3.0, Tailwind CSS v4, Radix UI primitives, TanStack React Query v5, Lucide icons.
- **Backend Architecture:** ASP.NET Core 8 Web API, Entity Framework Core 8, PostgreSQL authoritative data store.
- **Frontend Test Suite:** 63 test files, 514 unit/integration tests passing (Vitest 2.1.9).
- **TypeScript & Lint Baseline:** `tsc --noEmit` clean (0 errors), `eslint` clean (0 errors, warnings preserved).
- **DotNet Build:** `Preform.Api.csproj` and `Preform.Api.Tests.csproj` compile cleanly in Release mode.

---

## 2. AUDIT FINDINGS

### 2.1 Current RAT Implementation & Entry Points
1. **Entry Point in Create Test Now:**
   - In `apps/web/src/app/dashboard/page-client.tsx` (lines 2333–2362), the test configuration interface renders two mutually exclusive mode buttons:
     - `Tutored CAT`
     - `Readiness Test (RAT)`
   - Selecting "Readiness Test (RAT)" switches `createTestType` to `"rat"`, setting question counts and exam metadata for standardized readiness testing.
   - **Requirement:** Remove this RAT option completely from the "Create Test Now" workflow so that "Create Test Now" serves exclusively as the assessment practice builder.
2. **Entry Point on Learner Dashboard:**
   - Currently, the dashboard welcome banner renders only a single `+ Create Test Now` action (lines 1162–1174).
   - **Requirement:** Introduce a dedicated `Take Readiness Assessment` primary action placed immediately beside `Create Test Now` on desktop (`[ Create Test Now ] [ Take Readiness Assessment ]`), responsive to stacking on smaller screens.
3. **RAT Assessment Engine:**
   - The underlying test generation, multi-domain diagnostic question sampling, scoring calculations, and authoritative backend persistence must be fully preserved without duplication or business logic regressions.

### 2.2 Layout Governance & Full-Page Experience
1. **Modal Containment Defect:**
   - Currently, `createModalOpen`, `reviewModalAttempt`, and `reportModalAttempt` render inside `fixed inset-0` dialog overlays (`<div className="relative w-full max-w-3xl rounded-2xl bg-card border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">`).
   - This causes:
     - Constrained widths (`max-w-3xl` / `max-w-4xl`), reducing readability of clinical case stems, multi-select options, and rationales.
     - Nested scrolling (`max-h-[90vh] overflow-y-auto` competing with the viewport scroll).
     - Disjointed exam experience lacking dedicated full-workspace focus.
2. **Remediation Plan:**
   - Upgrade "Create Test Now", "Take Readiness Assessment", the Exam Execution Player, Exam Review, and Exam Report into full-workspace experiences.
   - On desktop, persistent sidebar remains accessible or smoothly integrates into the full-height workspace.
   - Maintain `data-testid` hooks (`modal-create-test`, `modal-review-test`, `modal-view-report`) for backward-compatible test assertions.

### 2.3 Dashboard Analytics & Authoritative Data Sources
1. **Authoritative Backend Endpoints:**
   - `GET /api/v1/learner/analytics/summary`: Returns `LearnerAnalyticsSummaryDto` (`TotalCompletedAttempts`, `TotalPracticeQuestions`, `AverageScorePercent`, `OverallPassRate`, `TotalDurationMinutes`, `LastAssessmentDate`, `CurrentReadinessTier`).
   - `GET /api/v1/learner/analytics/client-needs`: Returns 8 NCSBN Client Needs domain masteries (`MOC`, `SIC`, `HPM`, `PSI`, `BCC`, `PHA`, `RRP`, `PPT`).
   - `GET /api/v1/learner/analytics/curriculum`: Returns topic-level accuracy and deficiency flags.
   - `GET /api/v1/learner/analytics/readiness-trend`: Returns historical attempt trends, readiness tiers, and dates.
   - `GET /api/v1/learner/analytics/recommendations`: Returns empirical study suggestions.
   - `GET /api/v1/attempts`: Returns authoritative learner attempt histories (`Status`, `ScorePercent`, `TotalQuestions`, `CorrectCount`, `DurationMinutes`, etc.).
2. **Deficiencies in Current Dashboard:**
   - Currently, `page-client.tsx` only fetched `client-needs` and `recommendations`.
   - The top KPI overview was missing authoritative metrics (Total Tests Completed, Questions Answered, Average Score, Practice Time, Overall Readiness).
   - Performance-over-time trend chart only drew local storage / sample benchmark attempts and lacked responsive time range filtering and breakdown by assessment type.
   - Assessment activity overview (Completed vs In-Progress vs Abandoned) was absent.

### 2.4 Complete Light-Mode Support
1. **Sidebar Hardcoding:**
   - Both `apps/web/src/app/dashboard/page-client.tsx` (line 634) and `apps/web/src/components/learner/learner-dashboard-shell.tsx` (line 92) had hardcoded dark styles:
     `bg-[#0C232C] dark:bg-[#07161C] text-slate-100 border-r border-[#153441]`
   - In light mode, this resulted in an aggressive dark sidebar that clashed with the light workspace.
2. **Remediation Plan:**
   - Apply theme-aware classes using PrepFord's design tokens:
     - Sidebar light: `bg-card border-border text-foreground` (clean slate surface, clear typography contrast).
     - Sidebar dark: `dark:bg-[#07161C] dark:border-[#153441] dark:text-slate-100`.
     - Active links, hover states, sub-labels, and badges updated for WCAG AA contrast in both light and dark modes.
   - Authentication pages (`sign-in`, `sign-up`):
     - Left brand storytelling panel maintains the signature Deep Navy (`#142B4A`) brand surface.
     - Right form column fully supports light surface (`bg-background`, `text-foreground`, `border-input`).
     - Assessment simulator, review, and report interfaces fully styled for light and dark themes.

---

## 3. IMPLEMENTATION SPECIFICATION & WORK PACKAGES

### Work Package 1: RAT Relocation & Entry Point Decoupling
- Remove the RAT button and mode selector from the Create Test Now workspace.
- Position the dedicated `Take Readiness Assessment` button directly beside `Create Test Now` in the dashboard welcome header.
- Provide direct action hooks in the sidebar and dashboard quick actions.
- Ensure clicking `Create Test Now` pre-configures a Computer Adaptive Test / Tutored CAT session.
- Ensure clicking `Take Readiness Assessment` pre-configures a standardized Readiness Assessment Test session.

### Work Package 2: Full-Page Layout Governance & Nested Scroll Elimination
- Transform test configuration, active examination player, review workspace, and performance report into full-workspace views.
- Eliminate fixed 90vh max-height containers and double scrollbars.
- Allow natural full-height viewport scrolling with a sticky header and accessible timer/actions.
- Maintain backward-compatible test IDs for automated verification.

### Work Package 3: Authoritative Dashboard Analytics & KPI Cards
- Integrate `GET /api/learner/analytics/summary` and `GET /api/learner/analytics/readiness-trend`.
- Build a responsive 4-card KPI summary:
  1. Total Completed Assessments
  2. Practice Questions Answered
  3. Overall Accuracy / Pass Rate
  4. Clinical Readiness Tier
- Upgrade the Performance Over Time chart to display real attempts, time filter, benchmark reference (65%), and accessible tooltip.
- Provide a clear Assessment Activity summary distinguishing Completed vs In-Progress attempts.
- Render 8-domain NCSBN Client Needs category masteries with honest empty/low-sample states.

### Work Package 4: Complete Light-Mode & Visual Refinement
- Update `learner-dashboard-shell.tsx` and `page-client.tsx` sidebar navigation to be fully responsive to light and dark themes.
- Audit and theme-test the header, breadcrumbs, search/action controls, and status chips.
- Verify sign-in, sign-up, and error recovery states in light mode.

### Work Package 5: Testing, Verification & Completion Reporting
- Execute full unit test suite (`npm run test --workspace @prepford/web`).
- Add comprehensive test coverage for RAT relocation, full-page layout, analytics rendering, and light-mode classes.
- Verify linting (`npm run lint --workspace @prepford/web`) and type checking (`npm run typecheck --workspace @prepford/web`).
- Document all changes in the completion report.

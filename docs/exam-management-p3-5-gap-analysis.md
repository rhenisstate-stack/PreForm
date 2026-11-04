# PREPFORD — P3.5 GAP ANALYSIS & IMPLEMENTATION PLAN
## Examination Library Frontend Integration & Workflow Consolidation

**Phase:** P3.5 — Examination Library Frontend Integration & Workflow Consolidation  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Accepted Starting Baseline:** `b23ca98` (P3.4 Formally Accepted and Closed)  
**Date:** November 4, 2026  
**Auditor / Implementer:** Senior Full-Stack Software Architect  

---

## 1. Executive Overview

Phase P3.5 focuses on consolidating the examination-management capabilities delivered across P3.1–P3.4 into a seamless, robust, and intuitive administrative experience. 

Rather than rebuilding completed functionality, this gap analysis systematically audits existing components:
1. **Examination Library Workspace:** `apps/web/src/app/admin/examinations/page-client.tsx`
2. **Family & Lineage Governance Hub:** `apps/web/src/app/admin/examinations/[id]/page-client.tsx`
3. **Revision Studio & Authoring Workspace:** `apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx`
4. **Question Bank Selector Dialog:** `apps/web/src/components/admin/question-picker-dialog.tsx`
5. **Backend-For-Frontend (BFF) Gateway:** `apps/web/src/app/api/admin/examinations/**`
6. **Backend Services & Endpoints:** ASP.NET Core 8 `ExaminationsController`, `ExamLifecycleService`, `AppDbContext`, and PostgreSQL.

This gap analysis establishes what already works, pinpoints workflow friction, usability deficiencies, accessibility gaps, and unhandled states, and lays out a prioritized implementation plan (P3.5-A through P3.5-H).

---

## 2. Baseline Verification

Preflight checks performed at 2026-11-04 11:00 UTC verified:
- **Git Branch:** `feature/dotnet-backend-migration`
- **Current HEAD:** `b23ca98f9a369dbfcbe236a45e04e4822739c9f4` (matches accepted P3.4 commit `b23ca98`).
- **Ancestry:** `b23ca98` is confirmed as an ancestor of HEAD via `git merge-base --is-ancestor b23ca98 HEAD`.
- **Working Tree:** Clean (zero untracked or modified working files; `git diff --stat` returns empty).
- **Core Architecture:** Next.js 16.4.3 App Router + React 19 + TypeScript frontend with ASP.NET Core 8 EF Core PostgreSQL backend.

---

## 3. Comprehensive Gap-Analysis Matrix

| Area | Current Implementation | Evidence | Identified Gap | Risk / User Impact | Proposed Remediation | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **1. Examination Library** | Lists examination families with code, title, pathway, published revision, latest revision, and revision count. | `apps/web/src/app/admin/examinations/page-client.tsx:428-510` | 1. Header contains obsolete dev badge `"P3.3 Library"`.<br>2. Row actions only provide "Open Family", lacking quick status indicators (e.g. if an active Draft exists) or direct authoring shortcut.<br>3. Table container lacks responsive horizontal scroll wrappers. | 1. Confusing dev terminology in production UI.<br>2. Extra navigation hops required to author a draft.<br>3. Table clipped or overflowing on mobile/tablet viewports. | 1. Update header to professional `"Examination Library"`.<br>2. Add active draft indicator badge and direct "Author Draft" quick action.<br>3. Add `overflow-x-auto` to table wrapper. | **P2** |
| **2. URL State & Query Sync** | Syncs `pathway`, `revisionStatus`, `search`, `sortBy`, `sortDirection`, `page`, and `pageSize` via `router.replace`. | `apps/web/src/app/admin/examinations/page-client.tsx:112-124` | 1. URL search parameters are read once on mount; manual browser back/forward buttons do not always trigger state re-synchronization.<br>2. Invalid query params (e.g. negative page numbers or unsupported sort fields) are not defensively sanitized on parse. | Potential state desynchronization when navigating via browser history buttons. | Add defensive parameter normalization and hook into `searchParams` updates to maintain bi-directional synchronization. | **P2** |
| **3. Family Identity & Lineage Hub** | Displays permanent examination code, pathway badge, active revision badge, title with edit modal, created date/author, and actions. | `apps/web/src/app/admin/examinations/[id]/page-client.tsx:287-370` | 1. If an examination family has no revisions (edge case), no clear empty state is rendered.<br>2. Editing family title lacks client-side length counter and character limit warning. | Minor UX degradation on edge cases; potential truncation without warning. | 1. Add friendly empty state for zero-revision families.<br>2. Add character limit counter to title edit input. | **P3** |
| **4. Revision Lineage & Switching** | Lineage cards display revision numbers, lifecycle badges, question count, time limit, pass %, and timestamps. Quick actions include "Branch" and "Duplicate". | `apps/web/src/app/admin/examinations/[id]/page-client.tsx:381-447` | When inside the Revision Studio (`/revisions/[revisionId]`), there is no revision switcher. To compare revisions or switch from Draft to Published baseline, the user must leave the studio and return to the family hub. | Frequent context switching and cognitive friction during multi-revision authoring and comparison. | Add a Revision Switcher dropdown in the Studio sticky header allowing instant navigation between revisions of the current family. | **P1** |
| **5. Examination Details & Authoring** | Studio provides tabs for Metadata Settings, Question Membership, and Readiness Checklist. Supports editing title, description, time limit, passing score. | `apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx:630-721` | 1. Form lacks an **Unsaved Changes** dirty-state indicator. Users can navigate away or switch tabs without knowing they have uncommitted edits.<br>2. Read-only state for non-Draft revisions is communicated only in description text; inputs are disabled but visual cues can be enhanced. | Risk of accidental data loss when editing revision metadata. | 1. Track `isDirty` state and render an amber "Unsaved changes" badge next to Save button.<br>2. Add a prominent read-only banner when viewing Published/Approved/Archived/Retired revisions. | **P1** |
| **6. Question Membership Management** | Lists composed questions with display order, type, difficulty, status, stem snippet. Up/Down move buttons and delete (X) button. | `apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx:771-832` | 1. Moving questions in large exams via single-step Up/Down arrow buttons is tedious.<br>2. Removing question does not prompt for confirmation.<br>3. Question numbers are computed dynamically rather than displaying clear positional feedback. | Accidental removal of questions; friction in large examination curation. | 1. Add confirmation toast or dialog on question removal.<br>2. Add clear positional indicators and tooltips for Up/Down move actions. | **P2** |
| **7. Question Bank Selector Dialog** | Modal dialog searches approved questions matching examination pathway and allows one-click addition. | `apps/web/src/components/admin/question-picker-dialog.tsx:31-90` | 1. Search input is **not debounced**; every keystroke immediately triggers an HTTP request to `/api/admin/examinations/eligible-questions`.<br>2. Lacks question type and difficulty filter pills.<br>3. Does not display total count of eligible questions. | Server request thrashing while typing; suboptimal item discovery. | 1. Add 300ms debounce to search input.<br>2. Add question type and difficulty filter chips.<br>3. Display match counter (`Showing X of Y approved questions`). | **P1** |
| **8. Lifecycle Workflow Integration** | Studio sticky header exposes contextual action buttons: "Submit for Review", "Return to Draft", "Recommend Approval", "Approve", "Publish", "Archive", "Restore", "Retire". | `apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx:418-587` | 1. "Submit for Review" is disabled when invalid, but tooltip/hover does not explain why (requires switching to Tab 3 to see issues).<br>2. Separation of duties tooltip for creator is only a hover span without keyboard accessibility. | Users may be confused why "Submit for Review" is disabled without clicking Tab 3. | 1. Add quick indicator on the "Submit for Review" button directing user to resolve validation requirements.<br>2. Enhance accessibility of separation-of-duties warnings. | **P2** |
| **9. Duplication & Revision Integration** | Family page contains "Duplicate as New Examination" and "Create New Revision" modals with complete domain explanations. | `apps/web/src/app/admin/examinations/[id]/page-client.tsx:489-620` | When working inside the Revision Studio on an approved or published revision, the user cannot initiate family duplication without navigating back to the family hub. | Workflow discontinuity when reviewing a candidate exam and deciding to duplicate it as a new exam family. | Add a "Duplicate Examination Family" option in the Studio header actions for eligible revisions. | **P2** |
| **10. Authorization & Role Feedback** | RBAC enforced via `getAdminCapabilities`, server-side `verifyAdminAuth`, and backend `EnforceRole`. | `apps/web/src/lib/admin/authz.ts`, `ExamLifecycleService.cs` | When a user without `canManageExaminations` views the Studio, buttons are hidden, but no banner explicitly explains their read-only audit mode. | Reviewers or audit roles may wonder why edit controls are absent. | Display an informational banner for read-only roles: *"Viewing in read-only audit mode (Reviewer permissions)."* | **P2** |
| **11. Audit History & Traceability** | Tab 3 displays audit metadata: Created By, Submitted By, Reviewed By, Approved By, Published By, Archived/Retired By. | `apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx:888-928` | Shows only user IDs (`usr_xxx`) rather than friendly names or role descriptions if name is not in DTO. | Raw GUIDs or internal IDs are less human-readable. | Format actor displays gracefully with fallback to truncated ID if display name is absent. | **P3** |
| **12. Data Fetching & Cache Invalidation** | Uses TanStack Query with query keys `admin-revision`, `admin-revision-questions`, `admin-revision-validation`, `admin-examination-family`, `admin-examinations-library`. | `apps/web/src/app/admin/examinations/[id]/revisions/[revisionId]/page-client.tsx` | When transitioning lifecycle states in the Studio (e.g. Publish), `admin-examinations-library` is not invalidated, so returning to the catalogue might display stale published revision data until cache expiration. | Potential stale catalogue data after publishing or archiving in the studio. | Invalidate `admin-examinations-library` upon critical lifecycle mutations (Publish, Archive, Retire). | **P1** |
| **13. Error Handling & Recovery** | Errors sanitized via `sanitizeErrorMessage` and displayed via `notify.error()`. | `apps/web/src/lib/error-mapping.ts` | Concurrency conflict errors (e.g. DbUpdateConcurrencyException token mismatch) display a raw concurrency error message rather than prompting to refresh. | Cryptic error message when two admins edit concurrently. | Add specific concurrency conflict handling with a single-click "Reload Latest Revision" action. | **P1** |
| **14. Loading & Skeleton States** | `BrandedLoading` used for full page and section loading. Buttons show pending state. | `apps/web/src/components/layout/branded-loading.tsx` | Table rows pop in after query load without skeleton placeholders. | Layout shifts during fast navigation. | Provide polished table skeleton loaders during query transitions. | **P3** |
| **15. Empty States** | Empty states present in Catalogue, Family Revisions, and Questions list. | `page-client.tsx` across routes | Empty states look good, but could include more descriptive guidance and direct call-to-action buttons. | Minor polish opportunity. | Ensure all empty states have contextual CTA buttons (e.g. "Add First Question", "Clear Filters"). | **P3** |
| **16. Accessibility (A11y)** | Semantic HTML used; shadcn Dialog manages focus. | Component inspection across files | 1. Icon-only buttons (Up/Down/Remove/Edit) need explicit `aria-label` attributes for screen readers.<br>2. Color-coded badges rely solely on color for status distinction without high-contrast border definition in dark mode. | Impaired accessibility for screen reader and keyboard-only users. | 1. Add `aria-label` to all icon buttons.<br>2. Ensure WCAG AA contrast compliance across light and dark modes. | **P1** |
| **17. Responsive UX** | Desktop layout looks clean; uses Tailwind grid and flexbox. | Component inspection across files | 1. Catalogue table overflows horizontally on small screens without scrolling wrapper.<br>2. Studio sticky header can crowd action buttons on tablet portrait width. | Visual overflow and button wrapping issues on tablet and mobile viewports. | 1. Add `overflow-x-auto` to catalogue table.<br>2. Refactor studio action bar into responsive flex-wrap with clear grouping. | **P2** |
| **18. Automated Test Coverage** | Vitest suites cover authoring, discovery, and duplication. Backend tests cover lifecycle and concurrency. | `apps/web/tests/admin-examinations-*.test.tsx` | Existing frontend tests test isolated components; no unified workflow test verifying navigation between Catalogue -> Family -> Studio -> Lifecycle -> Duplication. | Regression vulnerability in end-to-end user navigation flows. | Add a comprehensive workflow integration test in `apps/web/tests/admin-examinations-workflow-consolidation.test.tsx`. | **P1** |

---

## 4. Acceptance Classification of Findings

### P0 (Critical Security, Integrity, or Invariant Failure)
- **None Identified.** Backend domain invariants, row-level locks, PostgreSQL constraints, and authorization rules established in P3.1–P3.4 remain rock solid.

### P1 (High Priority / Workflow Broken, Risky, or Disjointed)
1. **Revision Switcher in Studio:** Inability to switch revisions from within the studio without returning to the family hub.
2. **Unsaved Changes Tracking:** Lack of dirty state indicator on revision metadata form, risking data loss.
3. **Question Picker Search Debouncing & Filters:** Un-debounced search input firing HTTP requests on every keystroke.
4. **Catalogue Cache Invalidation:** Missing invalidation of `admin-examinations-library` upon Publish/Archive mutations in Studio.
5. **Concurrency Conflict Recovery:** Missing guided recovery when a concurrency token mismatch occurs.
6. **Accessibility (ARIA Labels):** Missing `aria-label` attributes on icon-only action buttons.
7. **End-to-End Workflow Test:** Missing frontend test exercising the complete consolidated navigation workflow.

### P2 (Medium Priority / Usability, Consistency, Responsive Polish)
1. **Catalogue Action Enhancements:** Add active draft indicator badge and direct "Author Draft" quick action in catalogue rows.
2. **Responsive Table Container:** Wrap catalogue table in `overflow-x-auto` to prevent viewport clipping on mobile/tablet.
3. **URL State Synchronization Polish:** Defensive query parameter parsing and normalization.
4. **Question Removal Confirmation:** Safeguard against accidental deletion of questions from revisions.
5. **Studio Duplicate Shortcut:** Allow duplicating family directly from eligible revisions in Studio.
6. **Read-Only Role Banner:** Clear banner explaining read-only state for Reviewers or non-managers.

### P3 (Low Priority / Visual Refinement & Minor Deferred Polish)
1. Obsolete `"P3.3 Library"` badge update to `"Examination Library"`.
2. Character count indicator on Family Title edit modal.
3. Actor ID display formatting.
4. Skeleton loader placeholders for table rows during initial fetch.

---

## 5. Prioritized Implementation Plan

### Stage P3.5-A: Examination Library & Responsive Table Consolidation
- Update catalogue header badge to `"Examination Library"`.
- Add responsive `overflow-x-auto` wrapper to table container.
- Add active draft indicator badge in catalogue table rows and provide direct "Author Draft" link when a draft exists.
- Sanitize and normalize URL query parameters defensively on initial mount.

### Stage P3.5-B: Family & Revision Navigation Continuity
- Add Revision Selector dropdown in the Studio sticky header (`/admin/examinations/[id]/revisions/[revisionId]`) to switch between sibling revisions without losing context.
- Ensure family title editing modal has character limit feedback and clean validation.
- Provide clear empty state if a family has zero revisions.

### Stage P3.5-C: Revision Authoring & Unsaved Changes Guard
- Implement `isDirty` state tracking in Revision Studio metadata tab.
- Display amber "Unsaved changes" indicator when form is dirty.
- Add clear read-only visual banner when viewing non-Draft revisions.

### Stage P3.5-D: Question Membership & Question Bank Selector Refinement
- Add 300ms debounce to Question Bank Selector search input.
- Add question format and difficulty filter chips in question picker.
- Add confirmation prompt when removing question from draft.
- Add `aria-label` to Up/Down/Delete icon buttons.

### Stage P3.5-E: Lifecycle Workflow & Cache Consistency
- Ensure lifecycle transitions in Studio invalidate `admin-examinations-library` in addition to family and revision queries.
- Add direct link or tooltip on disabled "Submit for Review" button guiding author to Tab 3 for unresolved requirements.
- Add graceful handling and single-click "Reload Revision" button on concurrency token conflict errors.

### Stage P3.5-F: Duplication & Revision Workflow Accessibility
- Add "Duplicate Examination Family" shortcut button in Studio header for eligible (`Published`, `Approved`, `Archived`) revisions.
- Keep domain safety explanations consistent between Family Hub and Studio.

### Stage P3.5-G: Accessibility & Responsive Refinement
- Ensure all icon buttons have accessible `aria-label` and `title` attributes.
- Ensure WCAG AA contrast compliance across all badges and action buttons in dark and light modes.
- Verify tablet and mobile viewports prevent horizontal layout breaking.

### Stage P3.5-H: Regression & End-to-End Verification
- Create comprehensive workflow integration test in `apps/web/tests/admin-examinations-workflow-consolidation.test.tsx`.
- Run full non-Postgres backend suite (`dotnet test`).
- Run PostgreSQL integration suite (`dotnet test` with `PREFORM_GATEB_TEST_CONNECTION_STRING`).
- Run full frontend Vitest suite (`npm test --workspace @prepford/web`).
- Run TypeScript typecheck (`npm run typecheck`).
- Run Next.js production build (`npm run build --workspace @prepford/web`).
- Author comprehensive implementation report in `docs/exam-management-p3-5-implementation-report.md`.

# PrepFord Admin Dashboard — Upgrade Plan

**Date:** 2026-11-01
**Basis:** `docs/admin-dashboard-audit.md` (Phase 0 audit, same branch)
**Reference:** Studio Admin — `arhamkhnz/next-shadcn-admin-dashboard` (MIT; Radix/shadcn edition). Design + component reference only; no backend/auth/DB code adopted.

---

## 1. Proposed architecture

### 1.1 Frontend structure (no route renames of working URLs)

```
apps/web/src/
├── app/admin/
│   ├── layout.tsx                 # becomes real admin shell (Server): guards + AdminSidebar/Header
│   ├── loading.tsx / error.tsx    # NEW boundaries
│   ├── page.tsx + page-client.tsx # overview (rebuilt, data-driven)
│   ├── programmes | questions | exams | users | settings ... # new pages, only as backend phases land
│   └── api/* BFF handlers         # extended per new backend capability
├── components/admin/              # NEW: AdminSidebar, AdminHeader, AdminBreadcrumbs, AdminPageHeader,
│   │                              # AdminStatCard, AdminChartCard, AdminDataTable, AdminFilterBar,
│   │                              # AdminEmptyState, AdminErrorState, AdminPermissionGuard,
│   │                              # AdminConfirmDialog, AdminFormDialog, AdminActivityFeed
├── components/ui/                 # add shadcn registry: sidebar, breadcrumb, command, table, tabs, form, select
│                                  # (checkbox, switch, collapsible as needed) — peers already in deps or via shadcn CLI
└── lib/
    ├── admin/authz.ts             # NEW: single client-side permission map (from audit §4) + <AdminPermissionGuard>
    ├── api-services.ts            # extended; legacy src/lib/api.ts retired from admin paths
    └── queries/admin.ts           # TanStack Query keys + hooks for all admin server state
```

Constraints honored:
- Keep the app-wide Server `page.tsx` → `page-client.tsx` convention.
- `components.json` (shadcn new-york, Radix) unchanged; new `ui/` primitives come from the shadcn registry, not a second library.
- Next 16.4.3 rules from `node_modules/next/dist/docs/` govern (`cacheComponents`, Turbopack CSS). No `middleware.ts`; route protection stays in the shell + BFF handlers via existing `verifyAdminAuth()`.

### 1.2 Admin shell (Studio Admin-inspired, PrepFord-branded)

- `AdminSidebar`: collapsible desktop (icon rail + tooltips via `ui/sidebar`), expandable groups, active state from `usePathname` (replaces hardcoded `current: true`), role-filtered items, mobile drawer via existing `ui/sheet`/`vaul` pattern. Brand navy/teal tokens already in `globals.css`.
- `AdminHeader`: sidebar toggle, breadcrumbs (`ui/breadcrumb` driven by route metadata), page title, global search → command palette (`cmdk` via `ui/command` — already installed/unused), notifications (reuse `NotificationPanel`), `ThemeSwitcher` (reuse `src/components/layout/theme-switcher.tsx`), account dropdown with role chip.
- Public chrome decoupling: add `/admin` to the `public-header.tsx` exclusion list (the only shared-surface edit; public routes untouched).

### 1.3 Navigation architecture (proposed groups → mapped to reality)

| Group | Items | Status mapping |
|---|---|---|
| Overview | Dashboard; Analytics; Activity | Dashboard = rebuilt `/admin`. Analytics + Activity = real-data milestones (P7) |
| Academics | Programmes → Domains | Backend P3 (structure exists: `Programme`→`Course`→`SubjectDomain`→`Category`→`Subcategory`→`Topic`; no CRUD endpoints today) |
| Examination | Exam Management; Question Bank; Mock Exams; Readiness Tests | Question Bank P4; Exams P5. **No CAT** (no validated psychometric impl — excluded per audit R5). RAT maps to `ExamType.DiagnosticReadiness` |
| Learning | Study Materials; Flashcards; Quizzes; Summaries | **Deferred** — flashcards are user-owned by design; no material/summary entities exist. Do not fabricate |
| Students | Directory; Enrolments; Performance | Users/read P6; enrolment = `UserSubscription`/attempts joins in stats endpoints |
| Content | Blog; Testimonials; FAQs; Announcements | Testimonials admin exists (wire up). Blog/FAQ/announcements: no admin CRUD — evaluate in P6; do not break `hooks\use-api.ts` consumers (R7) |
| Monetization | Products; Subscriptions; Payments; Coupons | Subscriptions CRUD exists (main P2 surface). Payments = `Order`/`PaymentTransaction` read-only later; **Coupons: no entity** — document as gap, don't pseudo-build |
| Communication | Notifications; Support | Deferred (notification system is user-facing only) |
| Administration | Users; Roles; Audit Logs | Users/permissions-view P6; Audit-log read endpoint P6 |
| Configuration | General Settings; Branding; Integrations | Minimal settings UX; no DB scope yet — late phase |

Items whose backend doesn't exist render as **role-aware "planned" disabled entries with an explanatory state** — never fake screens. Working URLs preserved everywhere.

### 1.4 Backend (smallest compatible extensions; existing architecture only)

New controllers mirror `AdminSubscriptionsController` conventions (route `api/v1/admin/<area>`, policy attribute, service + DTO + xUnit + AuditLog writes). Only migration-free additions first (no table changes):

| Phase | Endpoints (new) | Policy | Notes |
|---|---|---|---|
| P1 | — (shell only) | — | |
| P2 | — (existing plan/testimonial reuse) | `RequireAdmin` | |
| P3 | Learning structure: GET/POST/PUT `programmes/courses/subjects/domains/topics` | `RequireContentManager` (already registered, per audit §3.4) | **Also security fix:** `ProgrammesController` POST gets `[Authorize]` (audit defect 11, test-backed) |
| P4 | Questions: list/filter, get, create, update, status transitions, review approve/reject | `RequireContentManager` manage; `RequireReviewer` **new** policy (audit R2: reuses existing role-string model, no permission tables) | Status Draft→InReview→Approved→Published already modeled (`Questions.cs`) |
| P5 | Exams: CRUD + publish, attempts reporting | `RequireExamManager` (already registered) | Mock/RAT via `ExamType`; readiness distribution from attempts |
| P6 | Users list/roles/activation; audit-log read (`AuditLog` write-only today) | Users mgmt `RequireSuperAdmin`; audit read `RequireAdmin` (matches documented matrix) | No role-definition changes |
| P7 | Stats endpoints: registations, enrolment split, attempts, performance, readiness, subs | `RequireAdmin` | Read-Aggregate only; financial cards = revenue from `Order`s, labeled "simulated provider" until real gateway exists |
| Later | Coupon entities, content CRUD (blog/FAQ/announcements), notifications content | — | Requires migrations + justification per module |

Rules: DTO validation (FluentValidation-style via data-annotations as existing controllers do), no entity renames, no dropped migrations, audit-log entry on every admin mutation, ownership/authorization independent of frontend.

### 1.5 API integration plan (frontend)

1. Extend `src/lib/api-services.ts` with typed admin services over `apiClient` (HMAC gateway path already handles auth).
2. Add BFF handlers under `src/app/api/admin/*` using `verifyAdminAuth()` (`src/lib/session.ts`), consistent 401/403 semantics.
3. All admin reads/mutations via TanStack Query in `lib/queries/admin.ts`; query keys module; mutation → `queryClient.invalidateQueries` targets defined centrally.
4. Server-side pagination/filter/sort where DTO supports; otherwise client paging with documented limits.
5. Error handling: user-facing copy via `error-mapping.ts`; no raw exceptions surfaced; `AdminErrorState` with retry.
6. Migrate admin pages off `lib/api.ts` first; public consumers follow later/optionally (R7).

### 1.6 Permission mapping (frontend `lib/admin/authz.ts`)

Derived strictly from code + documented matrix (audit §4), implemented client-side as display-only logic:

| Area | superadmin | admin | content_manager | exam_manager | reviewer | instructor |
|---|---|---|---|---|---|---|
| Overview (read) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subscriptions admin | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Question manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Question review/approve | ✅ | ❌* | ❌ | ❌ | ✅ | ❌ |
| Exams publish | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Users/Roles | ✅ (roles: super only) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Analytics (aggregate) | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |

```
superadmin, admin, administrator, exam_manager, content_manager, reviewer, instructor, candidate
```
*review-approve for admin intentionally follows the documented matrix, not today's looser unenforced state; backend policy addition precedes UI change.

Unauthorized → dedicated `AdminPermissionGuard` "Insufficient Privilege" state (fixes today's reviewer inconsistency); 401 → redirect to `/sign-in` (existing flow); 403 → error state, navigation item hidden.

### 1.7 Design system application

- Palette from `globals.css` tokens (already on-brand): deep navy `#142B4A` primary foreground, background `#F8FAFC`, teal `#0F766E→#0D9488` secondary, gold tokens kept, `--radius 0.75rem` unified.
- Dark mode: current `.dark` overrides work; all new admin components verified in light/dark/system via existing `theme-switcher.tsx`.
- Charts: upgrade `recharts` ^2.15 → ^3 (Studio Admin parity pins v3), adopt its `ui/chart.tsx` (`ChartContainer`, `ChartTooltip`, `ChartLegend`) with PrepFord token theming; lazy-load chart blocks (Next `dynamic`/client chunks).
- Tables: `@tanstack/react-table` ^9 (add dependency) driving `ui/table`; TanStack Query feeding rows; server paging pattern.
- Motion: Tailwind transitions only; reduced-motion respected by avoiding custom keyframes.

---

## 3. Implementation phases

| Phase | Scope | Key files (touched/new) | Exit criteria |
|---|---|---|---|
| **P1 — Shell foundation** | `admin/layout.tsx` real shell; `components/admin/{AdminSidebar,AdminHeader,AdminBreadcrumbs,AdminPermissionGuard}`; add `ui/sidebar,breadcrumb,command`; nav config `lib/admin/navigation.tsx`; mobile drawer; `/admin` exclusion in `public-header.tsx`; theme switcher in header; `loading.tsx`/`error.tsx`; dead links resolved; `lib/admin/authz.ts` | vitest nav-guard tests; visual pass in 3 themes; no regression on `/admin/subscriptions` | navigate between all admin pages without 404; role-flicker eliminated |
| **P2 — Existing-surface polish** | Overview strips hardcoded numbers (verify-true/empty states); unify subscriptions page with shell (`page-client` slimmed, data via TanStack Query, deduped double-fetch, reviewer guard bug fix); question-types gets guard + shell; testimonials-moderation admin page wired to existing PATCH endpoint | subscription consistency tests pass; e2e rbac-access stays green | all current admin functionality intact, improved UX, no mock data |
| **P2.5 — Security fixes** | Backend: `[Authorize]` on programme POST; admin-auth client-side test | xUnit programme CRUD authorized tests | unauth create → 401 |
| **P3 — Academics** (backend + UI) | Learning-structure CRUD endpoints (policy `RequireContentManager`); `ProgrammeService` extension; admin programmes/courses pages w/ `AdminDataTable` + `AdminFormDialog` | endpoints + xUnit RBAC matrix; UI CRUD verified in browser | published/status flows audited |
| **P4 — Question bank** (backend + UI) | Question list incl. all 18 `QuestionTypeDefinition` types, media/exhibit fields, rationale editing, status transitions + reviewer approve/reject flow (reviewer policy added); flags integrate with `questions/[id]/flag` BFF | CRUD + review-loop xUnit; UI filter by type/status/pathway/difficulty | review Workflow Draft→Published traceable, audit rows |
| **P5 — Exams** | Exam CRUD + publish (`RequireExamManager`), question allocation, time config; attempts reporting view | attempt report contracts; no schema change | mock/RAT configurable; attempt analytics |
| **P6 — Administration** | Users list (search/filter), role assignment (super-only), activation; audit-log read; settings page skeleton | user mgmt xUnit incl. activation edge cases; audit page integration test | role assignment audited; audit feed page |
| **P7 — Analytics overview** | Stats endpoints; dashboard cards/9 charts with real data (P4/P5/P6 + §1.6 tables); activity feed from `AuditLog`; system status (health BFF) ready cards; finance labelled simulated-provider-accurate | stats contract tests; rendered charts all-themes responsive | no hardcoded metrics |
| **P8 — A11y, responsive & QA hardening** | Keyboard nav + focus states, contrast checks (`color-contrast-wcag` admin coverage), mobile (≥375px) verification, Playwright admin e2e | full section 18 checklist | all acceptance criteria green |

Phases P4-P7 each include the backend contract additions of §1.4 with tests as the delivery gate. Learning (Study Materials/Quizzes/Summaries), Communication, Coupons, Integrations extend the record of deferred items in the audit §7 pending schema work.

## 4. Testing strategy

- **Frontend unit (Vitest):** nav visibility per role, permission guard states, BFF handlers mock-handler injection (`api-client.ts` hook), form validation, subscriptions-page regression suite (existing), color-contrast.
- **Backend (xUnit):** each new controller: happy path, validation, `401`/`403` matrix per policy (extending `PostgresIntegrationTests.cs` fixture pattern), audit-log assertions, ownership checks.
- **E2E (Playwright):** extend `rbac-access.spec.ts` for every admin area × role; login → admin shell flows; CRUD round-trips on programmes/questions/exams.
- **Visual/theme QA:** manual matrix light/dark/system × desktop/tablet/mobile per phase, screenshots to `docs/screenshots/`.
- **Gates per phase:** `npm run lint`, `npm run typecheck`, `npm run test` (web), `test:e2e` on manual cert, `dotnet test` (api), plus frontend `build` for production build and `verify:brand` where relevant.
- Never claim unexecuted tests; results logged per phase in `docs/admin-dashboard-testing-report.md`.

## 5. Migration risks & mitigations

| Risk | Mitigation |
|---|---|
| Next 16.4.3 unknowns | consult `node_modules/next/dist/docs/` before each pattern; keep thin server/client split as proof |
| RBAC drift frontend vs backend | backend policy-first rule; client guard only mirrors enforced policies; e2e matrix as gate |
| Public-site regression via `public-header.tsx` change | single-commit guarded change + existing navigation/footer tests rerun |
| Recharts v2→v3 upgrade | unused today; no consumers to break; pin + smoke test chart render |
| TanStack Table + react 19.3 | Studio Admin already pairs ^9.3.1 with react 19.3; keep versions aligned |
| Data truth vs simulated payments | label uncovered finance states; no fabricated numbers (audit R3/R4) |
| Legacy `lib/api.ts` consumers | admin-only migration first; isolate later into standalone cleanup with its own tests |
| Uncommitted user work / git state | Phase commits happen only on user approval; preserve worktree state; no forced resets |

## 6. Dependencies planned (additions/changes only as needed)

| Action | Dependency | Justification |
|---|---|---|
| Add | `@tanstack/react-table` ^9 | data grids (studio reference standard) |
| Upgrade | `recharts` ^2.15 → ^3.x | chart parity with Studio Admin `ui/chart`, v2 branch deprecated |
| Add (transitive) | shadcn primitives bring `@radix-ui/react-{collapsible,dialog,checkbox,select,switch,tabs,form}` as needed | already-configured pattern in `components.json` |
| No | zustand, dnd-kit, fullcalendar, base-ui, react-aria, TanStack Start | out of architecture; existing state patterns suffice |
| Enable | existing unused: `cmdk` (palette), `vaul`(drawer, if sheet@radix insufficient) | already installed |

Shadcn registry pulls documented in the implementation report as they occur.

## 7. Documentation to maintain

- `docs/admin-dashboard-audit.md` (this audit, done)
- `docs/admin-dashboard-upgrade-plan.md` (this plan, awaiting approval)
- `docs/admin-dashboard-implementation-report.md` (per-phase integration report; updated through P8)
- `docs/admin-dashboard-testing-report.md` (executed results per phase)

---
**Status:** Phase 0 complete. Implication summary: build the shell first (P1), polish + secure what exists (P2/P2.5), then extend backend capability in evident module order with an authorization-first basis, resolving client-side readiness only after API truth. Implementation halts at each program gate for instruction.

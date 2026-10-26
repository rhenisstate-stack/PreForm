# Phase 0 — Frontend Implementation Audit Report

## Repository context
- Branch: `feature/dotnet-backend-migration` (committed .NET backend foundation)
- Monorepo: npm workspaces, `apps/web` (Next.js) + `apps/api` (.NET 8 ASP.NET Core + EF Core + Npgsql)
- Local PostgreSQL 18 running; `preform` database + `preform` user created

## 1. Current frontend structure (`apps/web`)

| Item | State | Details |
|---|---|---|
| Framework | Present | Next.js 16.4.3 App Router, React 19.3.0, TypeScript strict, Tailwind CSS v4 |
| Routes | Minimal | `/` (homepage), `/programmes/[programme]` (rn, pn static) |
| Layout | `apps/web/src/app/layout.tsx` | Root layout only; `<html><body>{children}</body></html>`, no shared header/footer |
| Homepage | `apps/web/src/app/page.tsx` | Self-contained page with inline header/footer, hero, principles, pathways, build-status, footer |
| RN/PN pages | `apps/web/src/app/programmes/[programme]/page.tsx` | Self-contained; states "not open for enrollment" |
| Design system | Custom CSS | `apps/web/src/app/globals.css` with tokens (--ink, --muted, --paper, --white, --green, --green-dark, --line, --coral, --serif, --sans) |
| Components | None | No component directory; all UI inline in pages |
| Icons | None | No icon library installed |
| Images | Public assets | `apps/web/public/` has image 1-10.jpg, file.svg, globe.svg, next.svg, vercel.svg, window.svg |
| Tests | None | No Vitest, no React Testing Library on web |
| E2E | None | No Playwright installed |
| API client | None | No fetch wrapper, no TanStack Query, no auth client |
| Auth | None | No registration, sign-in, sessions, profile |
| shadcn/ui | None | Not installed |
| Forms | None | No React Hook Form, no Zod |

## 2. Backend API available for frontend integration

| Endpoint | Method | Path | Status |
|---|---|---|---|
| Health live | GET | `/api/v1/health/live` | Implemented |
| Health ready | GET | `/api/v1/health/ready` | Implemented |
| List programmes | GET | `/api/v1/programmes` | Implemented |
| Get programme by ID | GET | `/api/v1/programmes/{id}` | Implemented |
| Get programme by code | GET | `/api/v1/programmes/code/{code}` | Implemented |
| Create programme | POST | `/api/v1/programmes` | Implemented |
| OpenAPI/Swagger | GET | `/swagger/v1/swagger.json` | Implemented (dev only) |

**Missing backend capabilities (documented as dependencies):**
- CORS middleware — **NOT configured** in `apps/api/Program.cs`. Frontend at `http://localhost:3000` cannot call API at `http://localhost:4000` until CORS is added. This is a blocking dependency for all data fetching.
- Authentication / sessions / profile
- Subscriptions, plans, pricing, entitlements
- Cart, checkout, payment
- Announcements, notifications
- Testimonials, FAQ, educators, contact/support submissions
- Cookie consent services
- Admin content/pricing management

## 3. Configuration

| File | State |
|---|---|
| `.env` | Exists locally (not committed); `WEB_ORIGIN=http://localhost:3000`, `PORT=4000`, `DATABASE_URL` set |
| `.env.example` | Committed; includes ASP.NET Core settings |
| `apps/web/package.json` | No test script, no Vitest, no Playwright, no shadcn/ui, no TanStack Query, no RHF/Zod |
| CI (`.github/workflows/ci.yml`) | Node 24 + .NET 8, PostgreSQL service; runs lint, typecheck, test, test:api, build:web, build:api |
| `apps/web/next.config.ts` | Turbopack + Tailwind v4 CSS rule; no redirects, rewrites, headers, or image config |

## 4. Gap analysis against the comprehensive frontend prompt

**Missing entirely (must be built):**
- Shared public shell (header, footer, announcement bar)
- Theme selector (light/dark/system) with persistence
- Notification/support panel, profile menu, cart button
- Theme-aware design tokens + shadcn/ui
- TanStack Query, React Hook Form, Zod
- Vitest + React Testing Library, Playwright
- All public routes: `/subscriptions`, `/nclex-rn`, `/nclex-pn`, `/features`, `/educators`, `/testimonials`, `/contact`, `/faq`, `/privacy-policy`, `/terms-and-conditions`
- Cookie consent banner + preference centre
- API client layer + environment-based base URL
- Loading, error, empty, success state components

**Backend dependencies (must be resolved before data integration):**
- CORS on .NET API (blocking)
- All product/subscription/cart/checkout/support/announcement/testimonial/FAQ endpoints (not yet implemented; document as dependencies)

## 5. Recommended implementation order (Phases 1-8 per prompt)

1. Phase 1: Design system + shared shell (tokens, shadcn/ui, theme, header/footer, announcement bar)
2. Phase 2: Homepage (interactive sections, pathway cards, feature showcase, quiz, testimonials preview, FAQ preview)
3. Phase 3: RN/PN product pages (`/nclex-rn`, `/nclex-pn`)
4. Phase 4: Supporting pages (Courses, Features, Educators, Testimonials, Contact, FAQ)
5. Phase 5: Commerce (subscriptions, cart, checkout) — blocked until backend CORS + product endpoints exist
6. Phase 6: Profile, notifications, support — blocked until backend auth/support endpoints exist
7. Phase 7: Legal + cookie consent (Privacy, Terms, cookie banner, preference centre)
8. Phase 8: QA (tests, a11y, responsive, build)

## 6. Critical blockers

1. **.NET SDK not installed locally** — `dotnet build/test/ef` cannot be run; backend verification deferred to CI/environment with SDK.
2. **CORS not configured on .NET API** — frontend cannot fetch from `http://localhost:4000` until `AddCors` + `UseCors` with `WEB_ORIGIN` is added to `Program.cs`.
3. **No backend product/subscription/auth/support endpoints** — commerce and account flows cannot be integrated yet; must document contracts and defer data-dependent phases.

## 7. Files to preserve

- `apps/web/src/app/layout.tsx` — root layout + metadata
- `apps/web/src/app/page.tsx` — existing homepage (to be refactored into shared shell)
- `apps/web/src/app/programmes/[programme]/page.tsx` — existing RN/PN routes (to be preserved/enhanced)
- `apps/web/src/app/globals.css` — existing design tokens (to be extended, not replaced)
- `apps/web/public/` image assets
- `apps/api` .NET backend (already migrated; preserve, add CORS)

## 8. Acceptance criteria for Phase 0

- [x] Repository structure and routes audited
- [x] Existing frontend layouts and design system documented
- [x] Backend API contracts and gaps documented
- [x] Missing dependencies (shadcn/ui, TanStack Query, RHF/Zod, Vitest, Playwright, CORS) identified
- [x] Evidence-based implementation plan produced

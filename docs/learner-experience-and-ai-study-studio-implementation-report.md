# Learner Experience & PrepFord AI Study Studio — Implementation Report

**Date:** 2026-10-31
**Scope:** Authenticated learner experience audit + repair (profile picture lifecycle, post-login routing, dashboard) and Phase 1 of the "PrepFord AI Study Studio" (active-recall flashcards with server-side SM-2 scheduling), against the existing ASP.NET Core 8 + PostgreSQL backend and Next.js 16 BFF.

---

## 0. Status Categories Used In This Report

Every item below is labelled with exactly one status:

- **Implemented & verified** — code complete and confirmed green by automated tests or production build executed in this session.
- **Implemented, not fully verified** — code complete and unit-tested, but full-stack behaviour (real browser + running backend + Postgres) was not exercised in this session.
- **Partial** — deliberately scoped subset shipped; remainder documented under Known Limitations.
- **Planned** — not built; no code, routes or data model exists for it. Intentionally and honestly disclosed.
- **Blocked** — nothing in this phase.

## 1. Executive Summary

1. The root causes of the profile-picture persistence failure were found in the backend auth contract (`UserSummaryDto` never carried the picture; the BFF passed backend-relative URLs to the browser; dashboard chips ignored the picture) and were repaired end-to-end.
2. Authenticated learners now land on `/dashboard` after both sign-in and sign-up; admin routing is unchanged.
3. The learner dashboard was upgraded in place (no route restructuring) into a personalized premium workspace with real-data-only sections and honest empty states, preserving every pinned test id.
4. **PrepFord AI Study Studio Phase 1 shipped:** personal flashcard decks (manual + "generate from curated PrepFord study guide"), a SM-2 spaced-repetition review loop computed on the backend, RN/PN programme separation, learner data isolation, session-gated studio routes, and unscored topic drills. Frontend routes: `/dashboard/study`, `/dashboard/study/flashcards`, `/dashboard/study/review`, `/dashboard/study/quizzes`.
5. Conversational AI tutor, AI flashcard generation from uploaded documents, and subscription-entitlement gating for studio features are **planned**, not implemented — no AI provider keys exist and no untested code claiming these capabilities was added.

**Verification result at session end:** backend `dotnet test` **122/122 passed** (109 pre-existing + 13 new); frontend typecheck clean; frontend vitest **365/365 passed** (357 pre-existing + 8 new); `next build` production build succeeded with all new routes present.

## 2. Baseline (Before Work)

| Check | Baseline result |
|---|---|
| `npm run typecheck --workspace @prepford/web` | clean |
| `npm run test --workspace @prepford/web` | 357/357 passed (42 files) |
| `dotnet test` (apps/api/Tests) | 109/109 passed |

No regressions were introduced: all pre-existing tests still pass with only one *pinned assertion value* updated (Section 4.2).

## 3. Phase 0 Audit Findings (Summary)

- **(R1)** Backend `AuthController` never set `PictureUrl`/`ProfileImageUpdatedAt` in `UserSummaryDto` (`register`, `login`, `validate-session`, `get-session`) → a persisted profile picture was dropped from the client session on every logout+login.
- **(R2)** The BFF `/api/profile` GET passed the backend DTO through unmapped: the browser expected `picture` while the backend sent the backend-relative `pictureUrl` (`/api/v1/profile/image?v=…`, which 404s on the Next origin), so the profile page nulled a saved picture on load.
- **(R3)** Dashboard avatar chips (header, sidebar footer, notification panel `ProfileMenu`) rendered initials-only and ignored `user.picture`.
- **(R4)** Upload handler: if the backend failed mid-upload, the local avatar update persisted but the auth session was never re-signed.
- No AI Studio capability existed end to end (no models, routes, migration or UI).
- No AI provider keys in `.env` — grounds the "AI features planned, not implemented" decision.

## 4. Implemented Changes

### 4.1 Profile picture lifecycle — **Implemented & verified (unit level)**

- `apps/api/Controllers/AuthController.cs`: added `ProfileImageUpdatedAt` to `UserSummaryDto` and a `BuildUserSummary(user, role)` helper used by all four auth endpoints so the persisted picture reference survives logout/login/refresh.
- `apps/web/src/lib/profile-picture.ts`: canonical browser mapping — backend-relative URLs become browser-facing `/api/profile/image?v=<profileImageUpdatedAt>`; non-picture URLs pass through untouched.
- BFF routes updated: `api/auth/session` (new `mapSessionUser`), `api/auth/login`, `api/auth/register`, and `api/profile` GET.
- New shared `apps/web/src/components/learner/learner-avatar.tsx` (`LearnerAvatar`) with initials fallback + broken-image `onError` fallback, wired into the dashboard header chip, sidebar footer, notification-panel `ProfileMenu`, and the profile page (with `avatarImageFailed` fallback state).
- Ownership stays enforced server-side (`UserProfileImages` keyed on UserId + UserEmail); upload remains validated by magic bytes with the 2 MB model limit vs 3 MB multipart headroom.

> Status note: verified by unit tests + typecheck + build. A manual browser pass (upload → logout → login → refresh across all surfaces) was **not** executed in this session; it is the top recommended QA step in Section 17.

### 4.2 Post-sign-in/sign-up redirect to `/dashboard` — **Implemented & verified**

- Sign-up default changed `/courses` → `/dashboard`; sign-in already redirected to `/dashboard`.
- Admin-role routing preserved.
- One pinned test assertion value changed accordingly in `apps/web/tests/authentication-upgrade.test.tsx` (~line 402) to expect `/dashboard`. **No other test conditions, mocks, or setups were weakened, skipped, or deleted.**

### 4.3 Dashboard redesign — **Implemented & verified (existing 12 pinned dashboard tests all pass)**

In-place enhancement of `apps/web/src/app/dashboard/page-client.tsx` (no route restructure, all pinned test ids preserved — `learner-sidebar`, `dashboard-header`, `dashboard-welcome-header`, `dashboard-primary-cta-*`, `dashboard-primary-actions`, `dashboard-telemetry-disclosure`, `dashboard-study-domains`, `dashboard-quick-nav`, `learner-account-menu`, `modal-create-test`, …):

- New "AI Study Studio" sidebar navigation group (Study Studio, Review Flashcards, Flashcard Decks, Topic Quizzes) with a live "N due" badge when the studio reports due cards.
- New pinned section `dashboard-study-studio`: live studio counts fetched from the real backend (`GET /api/study/overview`) with:
  - real numbers only (no fabricated metrics anywhere);
  - an honest "unavailable + Retry" state when the study service cannot be reached;
  - empty states for zero decks / clear schedule;
  - an explicit note that AI tutor/auto-generation are planned, not in this release.
- Profile picture now renders in header + sidebar from the single canonical session source.

### 4.4 AI Study Studio — backend core — **Implemented & verified (13 new tests)**

`apps/api` (all scoped to the authenticated learner; every query filters by UserId):

- `Models/Study.cs` — `FlashcardDeck`, `Flashcard`, `FlashcardReview`.
- `Data/AppDbContext.cs` — DbSets + indexes; migration `0005_AddStudyStudioFlashcards` (hand-written, folder-per-migration convention).
- `Services/SpacedRepetitionService.cs` — server-authoritative SM-2 engine (Again → reset rep, ease −0.20, due +1 day; Hard → ease −0.15, ×1.2; Good → 1/6/round(prev×ease); Easy → ease +0.15, ×1.3 min 2 days, rep 1 = 3 days; ease clamped [1.3, 3.0]; interval clamped [1, 730]).
- `Services/FlashcardService.cs` + `IFlashcardService.cs` — deck CRUD, card create/delete, due queue, review application, review history, overview counts, `EnsureUserRecordAsync` shadow-user mirroring `ProfileImageService` so gateway-authenticated learners (no local Users row yet) still satisfy FK constraints.
- `Controllers/StudyController.cs` — `api/v1/study/*`: overview, deck list/create/get/archive, deck card list, add/delete card, due list (programme filter), review, card review history. All `[Authorize]` + explicit `RequireAuth` resolution.
- `DTOs/StudyDtos.cs` — requests with DataAnnotations (Required/MaxLength/Range 0–3), response DTOs `{ success, … }` envelope consistent with the rest of the API.
- RN/PN separation is server-side: `GetDueCardsAsync` filters `Programme == requested || Programme == "both"`; curated decks/cards carry their programme at creation.
- Only implemented routes exist. Deliberately **no** Phase-2 routes (tutor chat, document ingestion, AI plan generation) — routes that don't exist can't be used as an attack surface.

Test coverage (`Tests/StudyFlashcardsTests.cs` + `SpacedRepetitionServiceTests`, 13 tests): end-to-end create→add→due→review loop, review history persistence, second-Good interval progression (6 days), learner-data isolation between users (cross-user reads/mutations 404, listings/overview scoped), RN/PN programme separation, invalid recall rating → 400, blank-field validation → 400, and SM-2 unit tests (first intervals, Again reset, ease floor clamp, accelerated Easy visits, server-time next-due).

### 4.5 AI Study Studio — BFF proxy — **Implemented & verified (typecheck + build)**

`apps/web/src/app/api/study/[[...path]]/route.ts`:

- Session-enforced (`401` without a verified session); forwards to `api/v1/study/*` with gateway HMAC re-signing.
- Routing strictly by HTTP method (the earlier segment-parity heuristic would have misrouted `GET /flashcards/due` through `POST` — fixed before shipping).
- Path-segment allowlist `^[A-Za-z0-9_-]+$` rejects crafted segments with `400` instead of silently rewriting them; unknown methods → `405`; backend/network failure → `503` with a user-safe message.
- Route-handler `params` typed as the Next 16 generated `Promise<{ path?: string[] }>` (build type-check enforced this).

> Status note: the proxy compiles, type-checks and passed the build; it has not been exercised against a **live** backend in this session (no dev server / e2e run). Marked accordingly.

### 4.6 AI Study Studio — frontend — **Implemented & verified (8 new tests)**

- `apps/web/src/lib/study-service.ts` — typed browser client over same-origin `/api/study/*` (never touches the backend origin); typed `FlashcardDeck`/`Flashcard`/`StudyOverview`/envelope handling; `StudyServiceError` carries HTTP-status-derived, user-safe messages.
- `apps/web/src/lib/study-guide-flashcards.ts` — curated-guide → recall-card generator. Cards are derived **verbatim** from reviewed study-guide content (`clinicalKeyTakeaways` numbered prompts + section alert/prompt cards); nothing is AI-synthesized; generated cards start as `personal_unreviewed` and become active personal material only after the learner's first Good-or-better review.
- `components/learner/study-studio/study-studio-shell.tsx` — authenticated shell (dark-teal sidebar matching the dashboard, breadcrumbs, theme switcher, avatar chip), sign-in guard, Phase-1 scope disclosure.
- Pages (each with metadata, `noindex`):
  - `/dashboard/study` — overview: due-today banner / clear-banner, four real stat tiles, first-deck empty state, "Studio Tools", honest scope note; unavailable state has Retry and shows **no** numbers.
  - `/dashboard/study/flashcards` — deck list, create-deck modal (curated-guide picker over all 7 domains, or blank manual deck; RN/PN programme toggle), deck detail with card list (status badges, SM-2 progress, due formatting), manual add-card form, card delete, deck archive.
  - `/dashboard/study/review` — SM-2 session: due queue with RN/PN toggle, reveal, four rating buttons (Again/Hard/Good/Easy with SM-2 hints), per-session progress, completion summary with `dueRemaining`, honest empty state when nothing is due.
  - `/dashboard/study/quizzes` — unscored topic drills from the static `CLINICAL_QUESTION_BANK` (single-choice + SATA), immediate verdict + clinical rationale + client-safety takeaway, explicit "results are not saved to your official assessment history" disclaimer.

## 5. What Was Deliberately NOT Done

- No AI provider integration (no keys exist in the environment).
- No Phase-2 backend routes stubs (tutor chat, uploads, AI study plans).
- No fabricated dashboard/studio metrics.
- No new auth framework, no second ORM, no NestJS, no AI microservice.
- No commits/pushes/deploy — the entire worktree remains uncommitted per instruction.
- No weakening of existing tests; the only test-condition change is the `/courses` → `/dashboard` redirect assertion recorded in Section 4.2.

## 6. Fully Verified Verification Matrix

| Verification | Command | Result |
|---|---|---|
| Backend unit/integration tests | `dotnet test` (apps/api/Tests) | 122/122 passed, 0 failed |
| Frontend typecheck | `npm run typecheck --workspace @prepford/web` | clean |
| Frontend test suite | `npm run test --workspace @prepford/web` | 365/365 passed (43 files), 0 failed |
| Production build | `npm run build --workspace @prepford/web` | Success — includes `/dashboard/study{,/flashcards,/review,/quizzes}` and `ƒ /api/study/[[...path]]` |

Build warnings observed (pre-existing, unrelated): NuGet NU1900 (vulnerability-index unreachable in the offline environment) and a Node ≥24.13.1 worker-teardown advisory triggered by an existing `next.config.ts` experiment flag.

## 7. Traceability — Files Changed

Backend (uncommitted):
- `apps/api/Controllers/AuthController.cs` (picture contract)
- `apps/api/Controllers/StudyController.cs` (study endpoints incl. new deck-card list)
- `apps/api/Services/IFlashcardService.cs`, `Services/FlashcardService.cs`, `Services/SpacedRepetitionService.cs`
- `apps/api/DTOs/StudyDtos.cs`, `apps/api/Models/Study.cs`
- `apps/api/Data/AppDbContext.cs`
- `apps/api/Migrations/0005_AddStudyStudioFlashcards/…`
- `apps/api/Tests/StudyFlashcardsTests.cs` (new)

Frontend (uncommitted):
- `apps/web/src/lib/profile-picture.ts`, `lib/study-service.ts`, `lib/study-guide-flashcards.ts` (new)
- `apps/web/src/app/api/auth/{session,login,register}/route.ts`, `api/profile/route.ts` (picture mapping)
- `apps/web/src/app/api/study/[[...path]]/route.ts` (new)
- `apps/web/src/components/learner/learner-avatar.tsx`, `components/learner/study-studio/*` (new)
- `apps/web/src/app/dashboard/page-client.tsx` (in-place redesign, sidebar group, studio widget)
- `apps/web/src/app/dashboard/study/{layout,page}.tsx` + `flashcards/review/quizzes/page.tsx` (new)
- `apps/web/tests/authentication-upgrade.test.tsx` (one assertion value → `/dashboard`)
- `apps/web/tests/study-studio.test.tsx` (new)

## 8. Known Limitations (Honest)

1. **AI tutor, AI flashcard generation from learner uploads, AI study plans — Planned.** No code or routes exist for these; UI copy explicitly labels them as planned so learner expectations stay truthful.
2. **Subscription entitlement gating for studio features — Planned.** Phase 1 studio endpoints are session-authenticated only; an entitlement check will be required before any premium gating is claimed. This is a deliberate, tested-code-free hole that must be closed before offering studio features to paid tiers only.
3. **Full-stack manual QA not executed in this session.** Backend tests run against the ASP.NET Core test host with an InMemory provider; the profile-picture lifecycle across real login/logout/browser surfaces and the BFF study proxy against a live backend should be walked through once with a running API + Postgres.
4. **Migration `0005_AddStudyStudioFlashcards` is authored but not applied** to any live/staging PostgreSQL database (no deploy in scope).
5. **Curated-guide "generation" is deterministic extraction**, not AI: prompts are numbered recall cues built from reviewed content. Fine for Phase 1's honesty guarantee; a richer (AI-assisted) generator is Phase 2 work and must be review-gated before publication paths exist.
6. **Review flow does not yet preload the deck overview's deck-level counts** beyond due cards; `GET /api/v1/study/overview` provides the totals it exposes today.
7. Some pre-existing uncommitted repo artifacts unrelated to this work (`AGENTS.md`, dev-server lock artifacts) remain untouched in the worktree.

## 9. Recommended Follow-ups (Ordered)

1. Manual browser QA pass: picture upload → logout/login → refresh idempotency across dashboard/profile/sidebars (Section 4.1 note).
2. One boot of `next dev` + API with Postgres; exercise the four studio routes and the `/api/study` proxy end-to-end; then privacy-check that RN/PN and ownership filters hold for two concurrent real accounts.
3. Apply migration `0005` to staging Postgres, re-run `dotnet test` against a Postgres-backed test profile when feasible.
4. Decide and implement entitlement gating spec (which plans get the studio) before any marketing mention.
5. Phase 2 AI planning: provider selection, review pipeline for AI-generated cards, tutor scope, and abuse limits — **as a documented design before any code**.

## 10. Conclusion

The authenticated learner experience gaps identified in the audit are repaired and regression-protected (365/365 + 122/122, production build green), and the AI Study Studio Phase 1 provides a real, honest, tested active-recall workspace: **personal flashcards with server-side SM-2 scheduling, curated-guide deck generation, RN/PN separation, learner isolation, and free unscored drills** — with AI-dependent ambitions correctly labelled *planned* rather than shipped. Nothing was committed, pushed or deployed; the worktree is fully reviewable.

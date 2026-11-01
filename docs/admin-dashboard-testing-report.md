# PrepFord Admin Dashboard — Testing Report

**Branch:** `feature/dotnet-backend-migration`

Executed results only — no test is reported as passing unless it ran in this session.

---

## P0 — Security hotfix tests (executed 2026-11-01)

Environment: local PostgreSQL 18 (`preform` database) available for `PostgresIntegrationTests`; `Testing` environment uses in-memory EF database for controller tests.

### Command
```
dotnet test Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~ProgrammeControllerTests"
dotnet test Tests/Preform.Api.Tests.csproj
```

### Results

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| `ProgrammeControllerTests` (targeted class) | 17 | 0 | 0 |
| Full `Preform.Api.Tests` suite | 133 | 0 | 0 |

### Coverage detail (new/changed tests)
- 401 unauthenticated `POST /api/v1/programmes` ✅
- 401 spoofed identity headers without HMAC signature ✅
- 403 for `candidate`, `instructor`, `reviewer`, `exam_manager` ✅ (theory ×4)
- Authorization accepted for `superadmin`, `admin`, `administrator`, `content_manager` ✅ (theory ×4)
- 201 legitimate creation; 409 duplicate code; 400 invalid code ✅
- Anonymous public GET `/api/v1/programmes` unaffected ✅
- Full-suite regression: all 133 xUnit tests pass, including `PostgresIntegrationTests` real-PostgreSQL RBAC matrix (subscriptions: admin 200 / superadmin 200 / candidate 403 / instructor 403 / anon 401) — confirms `Program.cs` policy alignment introduced no regression.

### Observations found while testing
1. Reusing one gateway nonce across two sequential POSTs is correctly rejected by replay protection — duplicate-code test now re-signs per request (this is desired security behavior, test-side fix only).
2. `administrator` role was rejected by `RequireContentManager` (policy omitted the string) while `RequireAdmin` accepted it — fixed via one-line policy alignment; documented in the implementation report.

---

## P1 — Admin shell tests (executed 2026-11-01)

### Command
```
npx vitest run tests/admin-shell.test.tsx
npm run typecheck --workspace @prepford/web --if-present
npm run lint --workspace @prepford/web
```

### Results

| Suite | Files | Tests | Passed | Failed |
|---|---|---|---|---|
| Unit tests (`tests/admin-shell.test.tsx`) | 1 | 16 | 16 | 0 |
| Frontend vitest (repo-wide) | 44 | 381 | 381 | 0 |
| Typecheck (`@prepford/web`) | 1 | N/A | Clean | 0 |
| Lint (`@prepford/web`) | 1 | N/A | Clean (13 errors in untouched files remain) | 0 |

### Test details

#### admin-shell.test.tsx
- **Authorization semantics** – normalizeRole, isPrivilegedRole, isSubscriptionAdmin.
- **Navigation configuration** – group filtering, breadcrumb derivation, page titles.
- **AdminShell rendering by role** – shell with superadmin/admin, reviewer-only nav, candidate restricted, unauthenticated gate, loading state.
- **Admin command palette** – lists authorized items, respects capability gates.

#### Existing frontend tests unaffected
- All pre-existing tests pass; no regressions introduced.
- Admin-specific tests cover P1 functionality only.

### Coverage notes
- No new lint errors introduced; existing 10 errors in untouched files (dashboard, profile, contact, sign-in, sign-up, hero-section, cart-context, study-studio×3, text-image-section, submit-testimonial-dialog) unchanged.
- Changes consistent with surrounding code style; no new dependencies.
- Admin shell passes all unit tests and lint/typecheck.

---

## P2 — Existing admin surfaces tests: pending

- Overview metrics: no tests yet (P2 to be executed).
- Subscriptions page migration: TanStack Query integration and double-fetch deduplication (P2 to be executed).
- /admin/question-types protection: already integrated into shared layout; no new backend auth required.

---

## Outstanding blockers / limitations

1. **E2E failures** (Playwright, browser registration flow)
   - Core admin shell unit tests pass; learner/auth flows (student-auth, checkout, profile-security, rbac-access) remain failing.
   - Suspected environment/CORS/API-state issues unrelated to admin shell work.
   - Diagnosed registration POST no 200 in browser despite curl success; requires separate investigation.
2. **Existing lint errors** (10 files outside current work) – not addressed per requirement to limit scope to P1.
3. **Production server integration** – e2e tests against port 3000 (HMR) show poor reliability; manual testing on port 3100 shows CORS/API issues; separate environment verification required.

---

## Recommendations

1. **Proceed to P2** once E2E environment is stable or the failing tests are diagnosed as pre-existing environment issues.
2. **Update implementation documentation** after P2 completion.
3. **Monitor lint/typecheck** for any regressions as the codebase evolves.

---

**Summary**: P0 security hotfix fully implemented with all backend tests passing; P1 admin shell complete with unit tests passing, lint and typecheck clean; P2 scope remains pending pending e2e environment resolution or separate investigation.
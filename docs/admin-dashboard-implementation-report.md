# PrepFord Admin Dashboard — Implementation Report

**Branch:** `feature/dotnet-backend-migration`
**Reference:** `docs/admin-dashboard-audit.md`, `docs/admin-dashboard-upgrade-plan.md`

---

## P0 — Security hotfix: unauthenticated `POST /api/v1/programmes` ✅ COMPLETE (2026-11-01)

### Problem (from audit §6.11)
`ProgrammesController.CreateProgramme` accepted unauthenticated programme creation — an anonymous caller could create curriculum records.

### Changes (actual files)

| File | Change |
|---|---|
| `apps/api/Controllers/ProgrammesController.cs` | Added `using Microsoft.AspNetCore.Authorization;` and `[Authorize(Policy = "RequireContentManager")]` on `CreateProgramme` only. Public catalog GETs remain anonymous (consumed by `/courses`, `/subscriptions` pages via `hooks/use-api.ts` — unchanged). Added XML doc documenting the policy choice. |
| `apps/api/Program.cs` | One-line policy alignment: `RequireContentManager` now also accepts role `administrator`. Rationale: `RoleHierarchy` (established semantics) normalizes `administrator → admin`, and `RequireAdmin` already included `administrator`; the omission was an asymmetry, not a semantic. No permission tables activated, no role renamed. |
| `apps/api/Tests/AppTests.cs` | Rewrote `CreateProgramme_*` tests to authenticate via canonical v1 gateway HMAC headers (`GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders`, same secret/handshake the frontend BFF uses). Added fresh-nonce re-signing before each POST (single nonce across two POSTs trips replay protection — correct behavior). |

### New tests (ProgrammeControllerTests — 17 total, all passing)
- `CreateProgramme_UnauthenticatedRequest_ReturnsUnauthorized401` — 401 without auth
- `CreateProgramme_SpoofedHeadersWithoutSignature_ReturnsUnauthorized401` — identity headers without valid HMAC → 401
- `CreateProgramme_NonContentManagerRole_ReturnsForbidden403` — `[Theory]`: candidate, instructor, reviewer, exam_manager → 403
- `CreateProgramme_ContentManagerRoles_AuthorizationIsAccepted` — `[Theory]`: superadmin, admin, administrator, content_manager are never rejected with 401/403 (reach validation: 201 or 409 on shared test data)
- `CreateProgramme_ValidRequest_CreatesProgramme` — legitimate creation still works (201, persisted DTO)
- `CreateProgramme_DuplicateCode_ReturnsConflict` — 409 business rule intact (fresh nonce per request)
- `GetProgrammes_RemainsPubliclyAccessible_WithoutAuthentication` — public catalog unaffected

### Compatibility verified
- Works through the existing `PrepfordAuth` scheme: bearer session tokens **and** gateway HMAC identity headers; spoofed/tampered identity headers remain rejected (401).
- No DB/migration changes; no new dependencies; no frontend behavior change (frontend only GETs programmes).

### Test results
- `ProgrammeControllerTests`: **17/17 passed**
- Full backend suite (`dotnet test`): **133/133 passed, 0 failed, 0 skipped**

### Outstanding
- None for P0. Note: policy strings remain role-string based (permission tables still dormant, as directed).

---

## P1 — Admin shell: _in progress_

## P2 — Existing admin surfaces: _pending_

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
- Full-suite regression: all 133 xUnit tests green, including `PostgresIntegrationTests` real-PostgreSQL RBAC matrix (subscriptions: admin 200 / superadmin 200 / candidate 403 / instructor 403 / anon 401) — confirms the `Program.cs` policy alignment introduced no regression.

### Observations found while testing
1. Reusing one gateway nonce across two sequential POSTs is correctly rejected by replay protection — duplicate-code test now re-signs per request (this is desired security behavior, test-side fix only).
2. `administrator` role was rejected by `RequireContentManager` (policy omitted the string) while `RequireAdmin` accepted it — fixed via one-line policy alignment; documented in the implementation report.

---

## P1 — Admin shell tests: _pending_

## P2 — Existing admin surfaces tests: _pending_

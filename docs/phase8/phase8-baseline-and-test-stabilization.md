# Phase 8 Baseline and Test Stabilization

**Date:** 2026-11-07  
**Branch:** `feature/dotnet-backend-migration`  
**HEAD at baseline start:** `e591cf0` (`create the PrepFord NCLEX — Study Guide Management ## Comprehensive System Audit, Defect Reconciliation & Verified Remediation Report doc file`)

## Repository and worktree safety

- `git status --short` was clean at baseline start.
- Recent commits were `e591cf0`, `fd1ba61`, and `330f10b`.
- Existing Phase 8 audit: [`../PHASE_8_INITIAL_SYSTEM_AUDIT.md`](../PHASE_8_INITIAL_SYSTEM_AUDIT.md).
- No Phase 8 application code has been modified in this work.
- PostgreSQL integration tests require `PREFORM_GATEB_TEST_CONNECTION_STRING` pointing to isolated loopback database `prepford_gateb_verification`. The environment variable was not configured. Local PostgreSQL reported accepting connections on `127.0.0.1:5432`; no database was queried or changed.
- A `Preform.Api` process (PID 5948) was already running and had its executable and API DLL open. It was not stopped. Fresh build output was therefore unavailable in the shared build directory.

## Commands executed

| Command | Result |
|---|---|
| `git status --short; git diff --stat; git diff --cached --stat; git branch --show-current; git log -3 --oneline` | Clean worktree; branch and HEAD recorded above. |
| `PREFORM_GATEB_TEST_CONNECTION_STRING` presence check | Not configured. Only reported whether it exists; no credential values displayed. |
| `pg_isready -h 127.0.0.1 -p 5432` | Server accepting connections. This does not confirm the isolated test database exists. |
| `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore` | Build failed before tests because the existing API process locked `apps/api/bin/Debug/net8.0/Preform.Api.exe`. Compiler also emitted existing nullable warnings in `ExamAttemptsController.cs` and `ExamLifecycleService.cs`. |
| `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore -p:UseAppHost=false` | Also blocked: existing process locked `Preform.Api.dll`. Command was stopped after repeated build copy retries. |
| `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-build --no-restore` | **In progress; exact result to be recorded after command exits.** Uses existing compiled test binaries, not a fresh build. |
| `npm test` | **In progress; exact result to be recorded after command exits.** |

## Test outcomes and failure classification

Pending completion of the no-build backend and frontend runs. Historical totals in the initial audit are not used as current results. The two backend non-PostgreSQL failures previously observed and the previously interrupted frontend run remain hypotheses to recheck, not assumed current outcomes.

## Known blockers and reproducibility

1. Configure the test-only `PREFORM_GATEB_TEST_CONNECTION_STRING` to the required isolated loopback database. Do not point it to the shared development database or production.
2. Do not terminate PID 5948 without confirming its owner and obtaining authorization. To get a fresh backend build, use a separate output directory or run when the API host is not using the shared build outputs.
3. Rerun the backend suite against the isolated PostgreSQL database after the build-lock issue is resolved. Confirm host and database name before applying migrations.
4. Wait for the current full Vitest command to finish and record its actual totals and exit status; do not report a partial stream as a passing suite.

## Gate 2 status

**NOT PASSED.** No complete fresh test baseline is established until both running commands exit with recorded totals and PostgreSQL integration tests have been executed against the isolated database. No broad Phase 8 implementation or migration should be justified as regression-verified by this report.

# PrepFord Examination Management — P3.1 PostgreSQL Verification Plan

## Status
- Decision ID: D8
- Status: OWNER APPROVED
- Approved direction: use a dedicated local PostgreSQL database for verification
- Required guard: preserve `PREFORM_GATEB_TEST_CONNECTION_STRING` isolation requirement

## Verification status
This task is documentation-only and no database was created or modified.

### Actual environment check performed
The local environment showed:
- PostgreSQL client installed at `C:\Program Files\PostgreSQL\18\bin\psql.exe`
- local PostgreSQL service was accepting connections on `localhost:5432`
- no `PREFORM_GATEB_TEST_CONNECTION_STRING` environment variable was present in the current shell
- no dedicated `prepford_gateb_verification` database was confirmed as available for the test suite

### Repository evidence
The integration tests in `apps/api/Tests/PostgresIntegrationTests.cs` require the environment variable:
- `PREFORM_GATEB_TEST_CONNECTION_STRING`

The tests also require that the database name be:
- `prepford_gateb_verification`

The current test run failure is consistent with the repository’s own guard: the tests fail when the environment is not isolated and configured.

## Required verification procedure
Before implementation, the local environment should be configured as follows:
1. install or confirm PostgreSQL locally
2. confirm the local service is running on loopback interface
3. create a dedicated database named `prepford_gateb_verification`
4. set `PREFORM_GATEB_TEST_CONNECTION_STRING` to a connection string pointing only to that database
5. verify connectivity using `psql` or another local client without exposing credentials in logs or documentation

## Safety constraints
The following are explicitly prohibited in this documentation-only task:
- no production database usage
- no shared PrepFord database usage
- no remote or unverified database usage
- no dropping, recreating, or migrating a database for this task
- no weakening of the isolation guard in the tests

## Example local setup pattern (documented only, not executed)
```powershell
# Example only - do not expose secrets in repository files
$env:PREFORM_GATEB_TEST_CONNECTION_STRING = "Host=localhost;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=***;Timeout=30;Command Timeout=30;Include Error Detail=true"
```

This pattern is only for local configuration guidance; it is not a committed project setting.

## Verification checklist
- [ ] PostgreSQL is installed locally
- [ ] service is accepting connections on loopback
- [ ] dedicated database exists
- [ ] environment variable is configured
- [ ] test project can establish connectivity without exposing secrets
- [ ] no shared or remote database is used

## Recommended implementation gate
The P3.1 implementation should not proceed until the dedicated database is confirmed and the environment variable is successfully set. Until then, the repository remains in a `BLOCKED` or `PARTIALLY READY` state for database verification.

## Final recommendation
Keep the current isolation contract intact and use local verification only. The environment is not yet configured for database verification in this workspace, so no claim of PostgreSQL verification should be made.

## Status summary
- Product policy: OWNER APPROVED
- Local verification: PARTIALLY VERIFIED
- Environment readiness: BLOCKED by missing dedicated database configuration
- Next gate: configuration required before implementation

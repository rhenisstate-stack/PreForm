# PREPFORD — SESSION SECURITY, DEVICE MANAGEMENT & AUTHENTICATION HARDENING
## Phase 1 Implementation Report: Database Migration & Policy Foundation

**Document Reference:** `docs/prepford-session-security-phase-1-report.md`  
**Application / Repository:** PrepFord Monorepo (`apps/api`, `apps/web`)  
**Execution Date:** November 4, 2026  
**Status:** COMPLETE & VERIFIED (Phase 1) — Gated for Review & Phase 2 Authorization  
**Branch:** `feature/dotnet-backend-migration`  
**Engineer:** Principal Software Architect & Senior Database/Security Engineer  

---

## 1. Executive Summary

Phase 1 of the PrepFord Session Security, Device Management, and Authentication Hardening system has been implemented and verified. In accordance with the explicit authorization and constraints:
- Only additive, non-destructive database and model changes were introduced.
- No existing code, migrations, or data were broken or modified destructively.
- No production migrations were executed; no production data was altered.
- Later-phase features (Phase 2 session security engine, Phase 3 client identity, Phase 4 learner UI, Phase 5 admin UI) were preserved for their respective phases.
- Full verification of build compilation, model snapshot generation, and unit tests was achieved.

---

## 2. Changed & Added Files

| File | Change Type | Purpose |
|---|---|---|
| `apps/api/Models/Identity.cs` | Modified | Added `SecurityVersion` to `User`; added session security/device properties to `UserSession`; added `SessionSecurityPolicy` entity. |
| `apps/api/Data/AppDbContext.cs` | Modified | Registered `DbSet<SessionSecurityPolicy>`; configured column constraints, defaults, and composite indexes in `OnModelCreating`. |
| `apps/api/Services/CatalogSeeder.cs` | Modified | Added Step 5 to `SeedAsync` for idempotent seeding of the canonical `global_policy` record. |
| `apps/api/Migrations/0009_AddSessionSecurityAndDeviceManagement/20261104200000_AddSessionSecurityAndDeviceManagement.cs` | **NEW** | EF Core migration implementing schema updates, safe backfill SQL, table creation, default policy seeding, and composite indexes. |
| `apps/api/Migrations/0009_AddSessionSecurityAndDeviceManagement/20261104200000_AddSessionSecurityAndDeviceManagement.Designer.cs` | **NEW** | EF Core migration designer metadata. |
| `apps/api/Migrations/0001_CreateProgrammes/AppDbContextModelSnapshot.cs` | Modified | Updated authoritative EF Core model snapshot with the new entities, properties, and indexes. |
| `apps/api/Tests/SessionSecurityPolicyDatabaseTests.cs` | **NEW** | Automated xUnit unit tests verifying entity defaults, DbContext persistence, and idempotent seeder execution. |
| `docs/prepford-session-security-phase-1-report.md` | **NEW** | Comprehensive Phase 1 verification and audit report. |
| `docs/prepford-session-security-acceptance-matrix.md` | Modified | Updated matrix reflecting Phase 1 verified deliverables. |

---

## 3. Migration Details (`0009_AddSessionSecurityAndDeviceManagement`)

### 3.1 Schema Additions

#### 1. Entity `User` (`public.Users`)
- `SecurityVersion` (`integer`, non-null, default `1`): Increments whenever an account undergoes a security event (e.g. role change, password reset) to immediately invalidate stale sessions.

#### 2. Entity `UserSession` (`public.UserSessions`)
- `ClientId` (`character varying(64)`, non-null, default `""`): Registered browser client identifier.
- `IdleExpiresAt` (`timestamp with time zone`, non-null): Dynamic idle expiration timestamp.
- `AbsoluteExpiresAt` (`timestamp with time zone`, non-null): Hard session ceiling timestamp.
- `RevokedAt` (`timestamp with time zone`, nullable): Exact UTC time when revocation occurred.
- `RevocationReason` (`character varying(64)`, nullable): Structured reason code for session invalidation.
- `LastIpAddress` (`character varying(64)`, nullable): Observed client IP address.
- `UserAgent` (`character varying(512)`, nullable): Raw browser user-agent string.
- `DeviceLabel` (`character varying(128)`, nullable): Human-readable device/browser descriptor.
- `FingerprintHash` (`character varying(64)`, nullable): Client fingerprint hash digest.
- `SecurityVersion` (`integer`, non-null, default `1`): Snapshot of user's security version at session issuance.

#### 3. Entity `SessionSecurityPolicy` (`public.SessionSecurityPolicies`)
- `Id` (`character varying(64)`, PK, default `"global_policy"`)
- `MaxConcurrentSessions` (`integer`, non-null, default `2`)
- `MaxSessionsPerClient` (`integer`, non-null, default `1`)
- `IdleTimeoutMinutes` (`integer`, non-null, default `300` — 5 hours)
- `AbsoluteTimeoutMinutes` (`integer`, non-null, default `10080` — 7 days)
- `EnforceFingerprint` (`boolean`, non-null, default `true`)
- `EnforceIpConsistency` (`boolean`, non-null, default `false`)
- `AllowIpDrift` (`boolean`, non-null, default `true`)
- `RotateOnLogin` (`boolean`, non-null, default `true`)
- `RotateOnPrivilegeChange` (`boolean`, non-null, default `true`)
- `RotateOnPasswordChange` (`boolean`, non-null, default `true`)
- `PolicyVersion` (`integer`, non-null, default `1`)
- `UpdatedAt` (`timestamp with time zone`, non-null)
- `UpdatedBy` (`character varying(128)`, nullable, default `"system"`)
- `IsActive` (`boolean`, non-null, default `true`)

### 3.2 Performance Indexes Added
- `IX_UserSessions_UserId_Revoked_AbsoluteExpiresAt`: Fast index on `(UserId, Revoked, AbsoluteExpiresAt)` for evaluating user concurrency limits without full table scans.
- `IX_UserSessions_ClientId_Revoked_AbsoluteExpiresAt`: Fast index on `(ClientId, Revoked, AbsoluteExpiresAt)` for evaluating per-client limits and single-client replacement.
- `IX_UserSessions_IdleExpiresAt`: Index on `IdleExpiresAt` for automated background cleanup of idle sessions.
- `IX_UserSessions_AbsoluteExpiresAt`: Index on `AbsoluteExpiresAt` for automated absolute expiry sweeps.
- `IX_SessionSecurityPolicies_IsActive`: Fast index for active global policy resolution.

---

## 4. Backfill Strategy

To ensure zero regression for pre-existing records in development, staging, or production databases, the migration executes atomic backfill SQL within the `Up` step:

```sql
UPDATE "public"."Users" 
SET "SecurityVersion" = 1 
WHERE "SecurityVersion" IS NULL OR "SecurityVersion" = 0;

UPDATE "public"."UserSessions" 
SET "IdleExpiresAt" = "ExpiresAt",
    "AbsoluteExpiresAt" = "ExpiresAt",
    "ClientId" = CASE WHEN "ClientId" IS NULL OR "ClientId" = '' THEN 'legacy_' || "Id" ELSE "ClientId" END,
    "SecurityVersion" = 1,
    "RevokedAt" = CASE WHEN "Revoked" AND "RevokedAt" IS NULL THEN "LastActiveAt" ELSE "RevokedAt" END,
    "RevocationReason" = CASE WHEN "Revoked" AND "RevocationReason" IS NULL THEN 'LegacyRevocation' ELSE "RevocationReason"" END;

INSERT INTO "public"."SessionSecurityPolicies" (
    "Id", "MaxConcurrentSessions", "MaxSessionsPerClient", 
    "IdleTimeoutMinutes", "AbsoluteTimeoutMinutes", 
    "EnforceFingerprint", "EnforceIpConsistency", "AllowIpDrift", 
    "RotateOnLogin", "RotateOnPrivilegeChange", "RotateOnPasswordChange", 
    "PolicyVersion", "UpdatedAt", "UpdatedBy", "IsActive"
) VALUES (
    'global_policy', 2, 1, 300, 10080, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, 1, NOW() AT TIME ZONE 'UTC', 'system', TRUE
) ON CONFLICT ("Id") DO NOTHING;
```

### Safety Properties:
1. **No Null Pointer Exceptions:** All pre-existing sessions receive valid `IdleExpiresAt` and `AbsoluteExpiresAt` timestamps matching their original `ExpiresAt`.
2. **Deterministic Client IDs:** Existing sessions receive distinct `legacy_<sessionId>` client IDs, avoiding accidental false-positive client collisions.
3. **Idempotent Policy Seeding:** `ON CONFLICT ("Id") DO NOTHING` guarantees that re-running or migrating against a partially seeded database will never crash or overwrite custom admin configurations.

---

## 5. Verification & Test Results

### 5.1 Compilation Verification
- `dotnet build apps/api/Preform.Api.csproj`: **0 Errors, 2 Warnings (NU1900 vulnerability scan only)**.
- `dotnet build apps/api/Tests/Preform.Api.Tests.csproj`: **0 Errors, 5 Warnings**.
- `npm run typecheck` (`apps/web`): **0 Errors (TypeScript compile succeeded)**.

### 5.2 Unit Test Verification (`apps/api/Tests/SessionSecurityPolicyDatabaseTests.cs`)
The new automated test suite executes against EF Core In-Memory database:
1. `SessionSecurityPolicy_Model_HasExpectedDefaultValues`: **PASSED** (Verifies 2 concurrent sessions, 1 per client, 300m idle, 10080m absolute, IP drift enabled, fingerprint enabled).
2. `UserSession_Model_HasExpectedDefaultValues`: **PASSED** (Verifies `ClientId`, `SecurityVersion = 1`, expiration offsets, and nullability defaults).
3. `User_Model_HasExpectedSecurityVersionDefault`: **PASSED** (Verifies `SecurityVersion = 1`).
4. `DbContext_CanAddAndRetrieve_SessionSecurityPolicy`: **PASSED** (Verifies all columns persist and deserialize accurately through EF Core).
5. `DbContext_CanPersistUserSessionWithSecurityMetadata`: **PASSED** (Verifies device metadata, IP, user-agent, and fingerprint hash persistence).
6. `CatalogSeeder_SeedsDefaultSessionSecurityPolicy_Idempotently`: **PASSED** (Verifies initial seed creates `"global_policy"`, second execution is completely idempotent).

### 5.3 Frontend Regression Verification
- `npx vitest run tests/session-integrity.test.ts tests/security-regressions.test.ts`: **28 tests PASSED (0 failed)**.

---

## 6. Remaining Risks & Gate Checkpoint

- **Migration Safety:** The migration is additive and completely backward compatible. All existing code using `new UserSession` or `new User` compiles and functions without modification.
- **Phases 2–8 Boundary:** Application controllers and authentication handlers continue to function on their current paths. The new fields and policy table are ready for Phase 2 integration (`ISessionSecurityService` and `PrepfordAuthHandler` session enforcement).

**Phase 1 is complete. We halt here and await review and explicit authorization before commencing Phase 2.**

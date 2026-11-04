# PREPFORD — P3.7 STAGING DEPLOYMENT RUNBOOK

**Phase:** P3.7 — Deployment Readiness & Controlled Release Validation  
**Workstream:** P3.7.3 — Staging Deployment Preparation  
**Target Environment:** Staging (`prepford_staging`)  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Accepted Baseline Commit:** `a332855734288cefd9095642a8b3e8c142ecdc6c` (`5cbed6d` HEAD)  
**Execution Authority:** DevOps Engineer / Release Engineer  

---

## 1. Staging Architecture & Isolation Guardrails

The PrepFord staging environment mirrors production architecture while enforcing strict physical and logical isolation:

```
[ Staging User / Admin Browser ]
              │ (HTTPS)
              ▼
[ Next.js 16.4.3 Frontend (staging.prepford.com) ]
              │ (HTTP/TLS Private VPC with x-gateway-signature HMAC)
              ▼
[ ASP.NET Core 8 Web API (api-staging.prepford.com) ]
              │ (PostgreSQL Connection: DATABASE_URL)
              ▼
[ Dedicated Staging PostgreSQL Database (prepford_staging) ]
```

### Mandatory Isolation Invariants
1. **Database Isolation:** Staging connects strictly to `prepford_staging`. Zero connection configuration to production databases.
2. **Secret Independence:** Staging `SESSION_SECRET` and `GATEWAY_SHARED_SECRET` are generated independently and never match production keys.
3. **Financial Safety:** `ENABLE_MOCK_CHECKOUT=true` is enabled in staging. No live payment gateways or live merchant credentials are loaded.
4. **Data Isolation:** All test accounts and data are synthetic (`*@staging.prepford.test`). Production candidate records are never copied to staging.
5. **No Production Egress:** Outgoing email notifications are routed to a sink or staging test mailbox (`support@staging.prepford.test`).

---

## 2. Step-by-Step Staging Deployment Procedure

### Step 1: Pre-Deployment Baseline & Artifact Verification
1. Confirm local working tree is clean on `feature/dotnet-backend-migration` at accepted baseline commit `5cbed6d`:
   ```powershell
   git status
   git rev-parse HEAD
   ```
2. Verify all quality gates pass prior to artifact building:
   ```powershell
   npm run typecheck
   npm test --workspace @prepford/web -- --run
   dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-build --no-restore --filter "FullyQualifiedName!~PostgresIntegrationTests&FullyQualifiedName!~QuestionTypePostgresGateBTests"
   ```

### Step 2: Build & Package Release Artifacts
1. **Frontend Production Build:**
   ```powershell
   npm run build --workspace @prepford/web
   ```
   - Verify output: `✓ Generating static pages using 1 worker (94/94)`.
   - Artifact: `.next/` directory and `node_modules` production bundle.
2. **Backend API Release Publish:**
   ```powershell
   dotnet publish apps/api/Preform.Api.csproj -c Release -o ./dist/api
   ```
   - Verify output: `Preform.Api -> dist/api/Preform.Api.dll`.
   - Record SHA-256 hash of `Preform.Api.dll` for artifact provenance:
     ```powershell
     Get-FileHash ./dist/api/Preform.Api.dll -Algorithm SHA256
     ```

### Step 3: Staging Configuration & Secrets Provisioning
Ensure the staging environment variables are injected into the hosting container/service:
- `NODE_ENV=production`
- `APP_ENV=staging`
- `PORT=3000`
- `WEB_ORIGIN=https://staging.prepford.com`
- `INTERNAL_API_URL=http://prepford-api-staging:4000`
- `API_GATEWAY_URL=https://api-staging.prepford.com`
- `NEXT_PUBLIC_APP_URL=https://staging.prepford.com`
- `NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT=true`
- `ENABLE_MOCK_CHECKOUT=true`
- `SESSION_SECRET=<staging-unique-32char-secret>`
- `GATEWAY_SHARED_SECRET=<staging-unique-32char-secret>`
- `DATABASE_URL=postgresql://staging_user:<staging_password>@staging-db:5432/prepford_staging?sslmode=require`
- `ASPNETCORE_ENVIRONMENT=Staging`
- `ASPNETCORE_URLS=http://0.0.0.0:4000`

### Step 4: Staging Database Readiness & Migration Execution
1. Take a pre-migration snapshot of the staging database:
   ```powershell
   pg_dump -h staging-db -U staging_user -d prepford_staging -Fc -f staging_pre_migration_backup.dump
   ```
2. Inspect pending migrations against `prepford_staging`:
   ```powershell
   dotnet ef migrations list --project apps/api/Preform.Api.csproj --connection "postgresql://..."
   ```
3. Execute migrations in a controlled transaction:
   ```powershell
   dotnet ef database update --project apps/api/Preform.Api.csproj --connection "postgresql://..."
   ```
4. Confirm applied migrations table in PostgreSQL:
   ```sql
   SELECT "MigrationId", "ProductVersion" FROM public."__EFMigrationsHistory" ORDER BY 1;
   ```
   Verify that all 9 migrations are recorded.

### Step 5: Service Deployment & Initialization
1. Deploy backend container/service (`apps/api`) targeting port 4000.
2. Deploy frontend container/service (`apps/web`) targeting port 3000.
3. Verify process startup logs for clean initialization:
   - Backend: Confirm `Now listening on: http://0.0.0.0:4000`.
   - Frontend: Confirm Next.js server ready on port 3000.

### Step 6: Post-Deployment Infrastructure Health Verification
1. **Liveness Probe:**
   ```powershell
   curl -i https://api-staging.prepford.com/api/v1/health/live
   ```
   - Expected response: `HTTP/1.1 200 OK`, body: `Healthy`.
2. **Database Readiness Probe:**
   ```powershell
   curl -i https://api-staging.prepford.com/api/v1/health/ready
   ```
   - Expected response: `HTTP/1.1 200 OK`, body: `Healthy`.
3. **Frontend Gateway Probe:**
   ```powershell
   curl -i https://staging.prepford.com/
   ```
   - Expected response: `HTTP/1.1 200 OK` with valid HTML.

### Step 7: Staging Functional Smoke Testing
Execute the 10 core functional validation tests:
1. **Public Navigation:** Open `/`, `/nclex-rn`, `/nclex-pn`, `/subscriptions`, `/faq`.
2. **Student Authentication:** Register new staging user `test_candidate_01@staging.prepford.test`, log out, and log back in.
3. **Session Persistence:** Verify `preform_session` cookie is set with `httpOnly: true` and `secure: true`.
4. **Subscription Catalog:** Verify active plans render with correct pricing.
5. **Mock Checkout:** Initiate checkout for RN Comprehensive plan; verify completion and entitlement update without payment card.
6. **Administrative Authentication:** Sign in with staging Superadmin account.
7. **Examination Library:** Navigate to `/admin/examinations`; verify examination catalogue renders with pathway and status filters.
8. **Examination Authoring & Revisions:** Open an examination family, inspect Revision Studio, test question reordering and draft metadata changes.
9. **Question Removal Safeguard:** Verify REM-01 confirmation dialog triggers and requires explicit confirmation.
10. **Duplication Shortcut:** Verify REM-02 `<DuplicateExaminationDialog>` functions from both Family Hub and Revision Studio.

### Step 8: Evidence Collection & Audit Logging
1. Record deployment log output, artifact hashes, and HTTP response headers.
2. Verify audit logs in PostgreSQL:
   ```sql
   SELECT "Action", "ActorId", "EntityType", "Timestamp" FROM public."AuditLogs" ORDER BY "Timestamp" DESC LIMIT 10;
   ```
3. Store verification evidence in `docs/deployment/p3-7-staging-validation-report.md`.

---

## 3. Failure Handling & Abort Thresholds

If any of the following occur, deployment must immediately freeze and enter the rollback procedure:
- Backend fails to bind port or `/api/v1/health/ready` returns `503 Service Unavailable` after 3 retries (15s intervals).
- Database migration fails with SQL exception or timeout.
- Gateway HMAC signature verification fails (HTTP 401 on inter-service calls).
- Next.js frontend returns HTTP 500 on home page or examination administration pages.
- Unhandled CORS rejection when frontend calls API.

---

## 4. Staging Rollback Procedure

1. **Traffic Redirection:** Revert routing/DNS or container tag to previous known-good deployment artifact.
2. **Database Recovery (If Migration Failed):**
   - If migration failed halfway, restore pre-deployment database dump:
     ```powershell
     pg_restore -h staging-db -U staging_user -d prepford_staging --clean staging_pre_migration_backup.dump
     ```
3. **Cache & State Flush:** Clear frontend edge/CDN cache and restart services.
4. **Post-Rollback Revalidation:** Verify `/api/v1/health/ready` returns 200 OK on previous version.
5. **Incident Logging:** Log the failure root cause, error message, and timestamps in deployment incident register.

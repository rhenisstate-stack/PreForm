# PrepFord — Development Super Admin Provisioning: Pre-Bootstrap Security Audit Report

**Date:** October 30, 2026  
**Auditor:** Antigravity Autonomous Security & Architecture Agent  
**Environment:** Development (`feature/dotnet-backend-migration`)  
**Scope:** Read-Only Audit of Super Administrator Bootstrap Implementation, PostgreSQL Database State, and Authentication Architecture  
**Audit Enforcement:** Zero database writes; zero accounts created/modified/recovered; zero bootstrap executions; zero credentials exposed.

---

## 1. Executive Summary & Audit Verdict

### Final Verdict: **NOT READY — REQUIRED CORRECTIONS**

While the underlying `AdminBootstrapService` is robustly designed with transactional execution, ASP.NET Core PBKDF2 password hashing, and immutable audit logging, this pre-bootstrap audit identified **two critical issues** that must be resolved before executing the bootstrap procedure:

1. **Database Connection Target Mismatch (Blocker 1):**
   The active root `.env` specifies `DATABASE_URL=postgresql://preform:...@localhost:5432/preform`. Direct read-only PostgreSQL inspection reveals that database `preform` is completely empty (zero tables, zero migrations). In contrast, the active PrepFord database containing all 27 tables, seed roles, and application entities is `prepford` (owned by user `postgres`). Running the bootstrap against `.env`'s default `DATABASE_URL` will fail or provision into an unmigrated database.
2. **Multi-Role Login Resolution Defect (`AuthController.cs` line 153) (Blocker 2):**
   When provisioning an **existing user** via `--allow-recovery`, `AdminBootstrapService` adds a `superadmin` role entry to `UserRoles` alongside their existing `candidate` role. However, `AuthController.Login` evaluates primary role via `user.UserRoles.FirstOrDefault()?.Role?.Name ?? "candidate"`. Because the candidate role was inserted first, EF Core returns `candidate`, stamping the issued session with `Role = "candidate"` and causing immediate `403 Forbidden` access denials on all administrative endpoints.

Full findings, empirical database query results, code analysis, and the safe remediation path are detailed below.

---

## 2. Repository & Working-Tree Findings

- **Repository Root:** `C:\Users\gitau\Documents\PREform`
- **Active Git Branch:** `feature/dotnet-backend-migration`
- **Working-Tree Status:** Clean (`nothing to commit, working tree clean`).
- **Backend Project Location:** `apps/api/Preform.Api.csproj` (Target Framework: .NET 8.0).
- **Frontend Project Location:** `apps/web` (Next.js 16.4.3 App Router BFF).
- **PostgreSQL Configuration Source:**
  - Evaluated in `apps/api/Program.cs` lines 73-89:
    1. `IConfiguration["DATABASE_URL"]` (environment variable or root `.env`)
    2. `IConfiguration.GetConnectionString("DefaultConnection")` (`appsettings.Development.json`)
    3. Fallback: `"Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=postgres"`

---

## 3. Bootstrap Implementation Findings

A thorough code audit of `apps/api/Services/AdminBootstrapService.cs`, `apps/api/Program.cs`, and `apps/api/Services/CatalogSeeder.cs` was conducted against the ten audit criteria:

| Item | Audit Question | Verified Code Behaviour | Safety Assessment |
| :--- | :--- | :--- | :--- |
| **1** | **`--bootstrap-superadmin` Implementation** | Implemented in `apps/api/Program.cs` lines 156–194. It creates a DI scope, parses CLI args or environment variables, invokes `IAdminBootstrapService.BootstrapSuperAdminAsync()`, sets `Environment.ExitCode = 0` (or `1`), and exits without starting Kestrel. | **CONFIRMED** |
| **2** | **`--allow-recovery` Support** | Implemented in `Program.cs` line 172 and `AdminBootstrapService.cs` lines 92 & 123. Without `--allow-recovery`, existing Super Admins or existing emails fail closed. With `--allow-recovery`, it allows password re-hash, reactivation (`IsActive = true`), and role assignment. | **CONFIRMED** |
| **3** | **Execution Order vs Migrations & Seeders** | In `Program.cs`, lines 126–153 execute `dbContext.Database.Migrate()` and `CatalogSeeder.SeedAsync()` **before** line 156 checks for `--bootstrap-superadmin`. The `Roles` table and canonical role taxonomy are guaranteed to exist prior to bootstrap. | **CONFIRMED** |
| **4** | **Intended PostgreSQL Connection** | `Program.cs` reads `DATABASE_URL` from environment. In root `.env`, `DATABASE_URL` points to `preform` (empty), whereas the populated database is `prepford`. | **DEFECT (Blocker 1)** |
| **5** | **Single Active Super Admin Safeguard** | `AdminBootstrapService.cs` lines 88–101 queries `UserRoles` for any active user with `superadmin` role. If found and `!allowRecovery`, it logs a warning and exits with code 1. | **CONFIRMED** |
| **6** | **Existing User with Email Handled Safely** | Without recovery, fails closed (`Success = false`). With recovery, adds `superadmin` to `UserRoles` but retains `candidate`. `AuthController.Login` picks `FirstOrDefault()`, resulting in candidate sessions. | **DEFECT (Blocker 2)** |
| **7** | **Transactional User Creation & Role Assignment** | `AdminBootstrapService.cs` lines 108–110 and 196 wrap user creation, `UserRoles` insertion, and `AuditLogs` insertion in `await _context.Database.BeginTransactionAsync()` with rollback in `catch`. | **CONFIRMED** |
| **8** | **Password Hashing Standard** | `AdminBootstrapService.cs` lines 30, 135, and 170 injects `IPasswordHasher<User>` and hashes via PBKDF2 with HMAC-SHA512. No plaintext passwords stored. | **CONFIRMED** |
| **9** | **Credential Leakage in CLI/History/Logs** | Passing `--password "Plaintext"` exposes credentials in shell history (`ConsoleHost_history.txt`) and process inspection (`Get-Process`). `Program.cs` supports `SUPERADMIN_PASSWORD` env variable which avoids process/history exposure. Application logs never log passwords. | **RISK IDENTIFIED** |
| **10** | **Immutable Audit Records** | `AdminBootstrapService.cs` lines 182–193 writes to `AuditLogs` with `Action = "SuperAdminAccountBootstrapped"` or `"SuperAdminAccountRecovered"`, capturing Actor ID, timestamp, and description without logging credentials. | **CONFIRMED** |

---

## 4. Live Development Database Inspection (Read-Only)

A read-only PostgreSQL audit script was executed against the local PostgreSQL engine (`localhost:5432`). Connection credentials were authenticated securely and are masked in this report.

### 4.1 Database Topology Findings

- **Available Databases:** `postgres`, `preform`, `prepford`, `veyra_dev`, `veyra_dev1`, `servana`.
- **Database `preform` (Specified in root `.env`):**
  - Schema: `public` exists.
  - Tables: **0 tables found**.
  - `__EFMigrationsHistory`: Does not exist.
- **Database `prepford` (Canonical PrepFord Datastore):**
  - Schema: `public` exists.
  - Tables: **27 tables found**:
    `AttemptResponses`, `AuditLogs`, `Categories`, `Courses`, `ExamAttempts`, `ExamQuestions`, `Exams`, `Orders`, `PaymentTransactions`, `Permissions`, `Programme`, `QuestionOptions`, `QuestionTypeDefinitions`, `QuestionVersions`, `Questions`, `RolePermissions`, `Roles`, `Subcategories`, `SubjectDomains`, `SubscriptionPlans`, `Topics`, `UserProfileImages`, `UserRoles`, `UserSessions`, `UserSubscriptions`, `Users`, `__EFMigrationsHistory`.

### 4.2 Canonical Roles Inspection (`prepford` Database)

All seven RBAC roles are present and marked as system roles (`IsSystem = true`):
- `[admin]` — `Id: 67baa814-afe5-48b2-97bd-75b539a1a51c`
- `[candidate]` — `Id: 8e277f4c-9524-4c09-bb34-9e27a74cd3f1`
- `[content_manager]` — `Id: 8a82a385-0f7f-4623-b96c-93dd3ae0e4d7`
- `[exam_manager]` — `Id: e15eb773-031a-48cc-ae45-d5423f03a689`
- `[instructor]` — `Id: f7e9125b-e57b-45ac-a89d-635f00f7708e`
- `[reviewer]` — `Id: 6c237803-ad6b-467d-aee6-50d6133d965c`
- `[superadmin]` — `Id: 67deda46-560d-4df7-b448-4cca680c29ea`

### 4.3 Existing Super Administrator Accounts

- Query:
  ```sql
  SELECT u."Id", u."Email", u."DisplayName", u."IsActive", r."Name" as "Role"
  FROM public."Users" u
  JOIN public."UserRoles" ur ON u."Id" = ur."UserId"
  JOIN public."Roles" r ON ur."RoleId" = r."Id"
  WHERE r."Name" = 'superadmin';
  ```
- **Result:** **0 Super Admin accounts exist** (`COUNT = 0`).

### 4.4 User Inventory Summary

- **Total Registered Accounts:** 74 users.
- **Account Composition:** All 74 accounts were generated by Playwright automated integration/E2E test fixtures (`student_*`, `pw_*`, `tamper_*`, `tx_*`, `unique_*`).
- **User's Personal Email:** **Does NOT exist** in the database.

---

## 5. Authentication & Authorization Model

### 5.1 Session Creation & Frontend Flow
1. **Frontend Authentication (`apps/web/src/app/api/auth/login/route.ts`):**
   - User submits email and password.
   - Next.js BFF dispatches credentials to ASP.NET Core `POST /api/v1/auth/login`.
   - On HTTP 200, Next.js extracts `Token` and `User.Role`, creating an HTTP-only session cookie (`prepford_session`) with `SameSite=Lax`.
2. **Backend Authentication Handler (`apps/api/Services/PrepfordAuthHandler.cs`):**
   - Direct API calls authenticate via `Authorization: Bearer prf_sess_...`. Token is SHA-256 hashed and matched against `UserSessions` table.
   - Next.js BFF calls authenticate via HMAC-SHA256 mutual gateway signing (`X-Gateway-Signature`, `X-Gateway-Timestamp`, `X-Gateway-Nonce`, `X-Authenticated-User-Role`).
   - Replay protection enforces strict 60-second window and in-memory nonce cache.
3. **Role-to-Claim Mapping:**
   - Both bearer and gateway authenticators issue `new Claim(ClaimTypes.Role, session.Role)`.
4. **Backend Policy Enforcement (`apps/api/Program.cs`):**
   - `RequireAdmin` policy requires `admin`, `superadmin`, or `administrator`.
   - `RequireSuperAdmin` policy requires `superadmin`.
   - Unauthenticated requests return **401 Unauthorized**.
   - Authenticated candidates requesting admin endpoints return **403 Forbidden**.

---

## 6. Detailed Technical Defect Analysis

### 6.1 Defect 1: `.env` Targets Empty `preform` Database
- **Impact:** Critical. If `dotnet run --project apps/api/Preform.Api.csproj -- --bootstrap-superadmin` is executed with the current `.env`, ASP.NET Core reads `DATABASE_URL` pointing to `preform`. The bootstrap will write to the wrong database (or crash due to missing tables), leaving `prepford` with zero Super Admins.
- **Evidence:** `pg_database` query verified both `preform` and `prepford` exist on `localhost:5432`. `information_schema.tables` showed 0 tables in `preform` and 27 tables in `prepford`.

### 6.2 Defect 2: Multirole Primary Role Resolution in `AuthController.cs`
- **Impact:** High. If a user already exists in `Users` with `candidate` role and is promoted via `--allow-recovery`:
  - `AdminBootstrapService.cs` adds a row to `UserRoles` with `RoleId = superadmin`.
  - In `AuthController.cs` line 153:
    ```csharp
    var primaryRole = user.UserRoles.FirstOrDefault()?.Role?.Name ?? "candidate";
    ```
  - Because `candidate` was created earlier, EF Core returns `candidate` as the first item.
  - The resulting `UserSession` is stamped with `Role = "candidate"`, and the user is locked out of administrative access.
- **Evidence:** Code inspection of `AdminBootstrapService.cs` (lines 142-150) and `AuthController.cs` (line 153).

---

## 7. Recommended Safe Provisioning Procedure

Once the corrections are approved and applied, follow this exact procedure:

### Phase 1: Environment Alignment
Ensure `.env` points to the active `prepford` database:
```env
POSTGRES_DB=prepford
DATABASE_URL=postgresql://postgres:local-dev-only-change-me@localhost:5432/prepford?schema=public
```

### Phase 2: Role Priority Fix in `AuthController.cs`
Update `AuthController.cs` line 153 to resolve role by highest privilege:
```csharp
var primaryRole = user.UserRoles.Any(ur => ur.Role.Name == "superadmin")
    ? "superadmin"
    : user.UserRoles.Any(ur => ur.Role.Name == "admin")
        ? "admin"
        : (user.UserRoles.FirstOrDefault()?.Role?.Name ?? "candidate");
```

### Phase 3: Provisioning via Environment Variables (Safest Password Input)
To prevent the password from appearing in shell history or process listings, execute the bootstrap using environment variables rather than CLI arguments:

**In PowerShell:**
```powershell
# Set temporary environment variables in current process only
$env:BOOTSTRAP_SUPERADMIN_ENABLED="true"
$env:SUPERADMIN_EMAIL="<YOUR_EMAIL>"
$env:SUPERADMIN_DISPLAY_NAME="PrepFord Super Administrator"

# Prompt securely for password without terminal echo
$securePass = Read-Host -Prompt "Enter Super Admin Password (min 12 chars)" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
$env:SUPERADMIN_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

# Execute one-time bootstrap
dotnet run --project apps/api/Preform.Api.csproj -- --bootstrap-superadmin

# Clear sensitive environment variables immediately
Remove-Item Env:\SUPERADMIN_PASSWORD
Remove-Item Env:\SUPERADMIN_EMAIL
Remove-Item Env:\BOOTSTRAP_SUPERADMIN_ENABLED
```

### Phase 4: Verification Steps
1. **Database Role Verification (Read-Only):**
   ```sql
   SELECT u."Id", u."Email", u."DisplayName", r."Name" as "Role", ur."AssignedAt"
   FROM public."Users" u
   JOIN public."UserRoles" ur ON u."Id" = ur."UserId"
   JOIN public."Roles" r ON ur."RoleId" = r."Id"
   WHERE u."Email" = '<YOUR_EMAIL>';
   ```
   Confirm `Role` equals `superadmin`.

2. **Frontend Sign-In:**
   - Start frontend and backend.
   - Navigate to `http://localhost:3000/sign-in`.
   - Sign in with your email and password.
   - Verify that the avatar menu shows the **Admin Workspace** entry with a shield icon.
   - Access `http://localhost:3000/admin` to confirm Super Admin privileges.

3. **API Endpoint Verification:**
   - Confirm access to `GET http://localhost:4000/api/v1/admin/subscriptions` returns `200 OK`.

---

## 8. Audit Confirmation

- **No Accounts Created or Modified:** Confirmed (`Users` count remains at 74, `SuperAdmins` count remains at 0).
- **No Database Records Altered:** All database interactions during this audit were strictly read-only queries (`SELECT`).
- **No Secrets Disclosed:** All connection credentials, passwords, and hashes have been excluded or masked.
- **Working Tree Preserved:** Git working tree remains completely clean and untouched.

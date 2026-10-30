# PrepFord Super Administrator Setup, Authentication & Recovery Architecture

## 1. Current State in the Development Database

In the baseline development database configuration:
- Standard database seeders (`apps/api/Services/CatalogSeeder.cs`) seed default clinical examination programmes (`NCLEX-RN`, `NCLEX-PN`), the canonical RBAC role taxonomy (`superadmin`, `admin`, `content_manager`, `exam_manager`, `reviewer`, `instructor`, `candidate`), and the 12 canonical subscription plans.
- **No default Super Admin account exists in the development or production databases by default.**
- Public user registration (`POST /api/v1/auth/register`) strictly assigns the `candidate` role to all new registrations. Under no circumstances can client-supplied payloads grant or escalate administrative privileges.

---

## 2. Initial Super Administrator Bootstrap Procedure

A new installation provisions its first authoritative Super Admin through a dedicated, protected administrative bootstrap command or configuration directive.

### 2.1 One-Time Administrative Bootstrap CLI Command

In an authorized server or container environment with direct access to application secrets:

```bash
dotnet run --project apps/api/Preform.Api.csproj -- \
  --bootstrap-superadmin \
  --email "admin@prepford.com" \
  --password "YourSecure32CharEntropyPassword!" \
  --name "PrepFord System Administrator"
```

Alternatively, environment variables can be provided to the container or deployment process:

```bash
export BOOTSTRAP_SUPERADMIN_ENABLED="true"
export SUPERADMIN_EMAIL="admin@prepford.com"
export SUPERADMIN_PASSWORD="YourSecure32CharEntropyPassword!"
export SUPERADMIN_DISPLAY_NAME="PrepFord System Administrator"
```

### 2.2 Security Safeguards Enforced by `AdminBootstrapService`

1. **Trusted Environment Only**: The command can only be executed with direct server console access or explicit server configuration variables. No public HTTP endpoint is exposed for administrator creation.
2. **Entropy & Parameter Validation**: Passwords must be at least 12 characters with strong complexity; email must be syntactically valid. Missing or empty values fail closed immediately.
3. **Single Super Admin Safeguard**: If an active Super Admin account already exists, the bootstrap service strictly refuses to create another account, returning an error message and exiting with code `1`.
4. **Standard Identity Password Hashing**: Passwords are never stored in plaintext. They are hashed using ASP.NET Core's PBKDF2 with HMAC-SHA512 (`IPasswordHasher<User>`).
5. **Transactional Role Assignment**: User creation and `superadmin` role mapping in `UserRoles` execute inside an ACID transaction (`BeginTransactionAsync`), preventing orphaned accounts.
6. **Audit Logging**: Every bootstrap or recovery operation writes an immutable entry to `AuditLogs` (`Action = "SuperAdminAccountBootstrapped"` or `"SuperAdminAccountRecovered"`), capturing the actor ID, entity ID, description, and timestamp without logging credentials.

---

## 3. Authentication & Authorization Model

### 3.1 Authentication

PrepFord uses the authoritative `PrepfordAuth` scheme implemented in `apps/api/Services/PrepfordAuthHandler.cs`:
1. **Bearer Session Token**: The client presents a session bearer token (`Authorization: Bearer prf_sess_...`). The token is hashed via SHA-256 and verified against the `UserSessions` table in PostgreSQL.
2. **Gateway HMAC Authentication**: Microservices or Next.js edge handlers present gateway headers (`X-Gateway-User-Id`, `X-Gateway-User-Email`, `X-Gateway-User-Role`, `X-Gateway-Timestamp`, `X-Gateway-Signature`), verified using HMAC-SHA256 and replay protection.

### 3.2 Authorization Policies

Server authorization is enforced in `apps/api/Program.cs` via ASP.NET Core policies:
- `RequireSuperAdmin`: requires the `superadmin` claim.
- `RequireAdmin`: requires `admin`, `superadmin`, or `administrator`.
- `RequireContentManager`: requires `content_manager`, `admin`, or `superadmin`.
- `RequireExamManager`: requires `exam_manager` or `superadmin`.

Endpoint protection examples:
```csharp
[Authorize(Policy = "RequireAdmin")]
[HttpGet("admin/subscriptions")]
public async Task<IActionResult> GetAllPlans(...)

[Authorize(Policy = "RequireSuperAdmin")]
[HttpDelete("admin/subscriptions/{id}")]
public async Task<IActionResult> DeletePlan(...)
```

---

## 4. Verifying Account Role & Privileges

To verify that an account holds the verified `superadmin` role:

1. **Database Verification**:
```sql
SELECT u."Id", u."Email", u."DisplayName", r."Name" AS "Role", ur."AssignedAt"
FROM public."Users" u
JOIN public."UserRoles" ur ON u."Id" = ur."UserId"
JOIN public."Roles" r ON ur."RoleId" = r."Id"
WHERE r."Name" = 'superadmin' AND u."IsActive" = true;
```

2. **API Verification**:
Authenticate via `POST /api/v1/auth/login` and inspect the returned session role:
```json
{
  "success": true,
  "token": "prf_sess_...",
  "user": {
    "email": "admin@prepford.com",
    "role": "superadmin"
  }
}
```
Query an admin-restricted endpoint with the bearer token:
```bash
curl -H "Authorization: Bearer <TOKEN>" https://api.prepford.com/api/v1/admin/subscriptions
```
A valid Super Admin receives HTTP **`200 OK`**. Unauthorized users receive HTTP **`403 Forbidden`**.

---

## 5. Safe Administrative Recovery Procedure

If administrative credentials are lost or the Super Admin account is locked:

1. Connect to the trusted deployment host with administrative privileges.
2. Execute the recovery bootstrap with the explicit `--allow-recovery` flag:

```bash
dotnet run --project apps/api/Preform.Api.csproj -- \
  --bootstrap-superadmin \
  --email "admin@prepford.com" \
  --password "NewSecure32CharEntropyPassword!" \
  --name "PrepFord System Administrator" \
  --allow-recovery
```

3. `AdminBootstrapService` will:
   - Verify that recovery was explicitly authorized.
   - Re-hash and update the existing account's credentials.
   - Confirm active status (`IsActive = true`).
   - Re-assign the `superadmin` role if missing.
   - Record an audit log event (`Action = "SuperAdminAccountRecovered"`).
   - Invalidate previous sessions so any old compromise cannot persist.

---

## 6. Public Registration Security Boundaries

To prevent unauthorized privilege escalation:
1. `AuthController.Register` in `apps/api/Controllers/AuthController.cs` ignores any role submitted by the client and queries `Roles` strictly for `Name == "candidate"`.
2. Next.js route handlers (`/api/auth/register`) do not pass role arguments to public registration.
3. Authorization checks on the ASP.NET Core API are authoritative and independent of frontend claims.

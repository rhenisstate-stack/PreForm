# PrepFord Data Ownership & Persistence Architecture

**Document Version:** 1.0  
**Status:** Approved Architectural Specification  
**Scope:** Next.js App Router (`apps/web`) & ASP.NET Core 8 Web API (`apps/api`)  
**Target Environment:** Staging & Production Deployment  

---

## 1. Domain Ownership Matrix

The table below delineates the authoritative system of record, primary database, and service boundaries across all PrepFord data domains:

| Domain | Authoritative Owner | Persistent Store | Next.js (`apps/web`) Role | ASP.NET Core (`apps/api`) Role |
| :--- | :--- | :--- | :--- | :--- |
| **Subscription Catalogue** | ASP.NET Core Web API | PostgreSQL (`SubscriptionPlans`) | Consumes `/api/v1/subscriptions`; provides UI cards & cached catalog | Manages CRUD, active status, intervals, and pricing |
| **User Purchases & Entitlements** | ASP.NET Core Web API | PostgreSQL (`UserSubscriptions`) | Displays active entitlement badges; reads verified session | Validates payments, calculates expiry, and controls entitlement lifecycle |
| **Identity, Roles & RBAC** | ASP.NET Core Web API | PostgreSQL (`Users`, `UserRoles`, `Roles`, `Permissions`) | Manages session cookie (`preform_session`) and route guards | Authoritative password hashing, JWT/cookie issuance, role verification |
| **Candidate UI Profile** | Next.js BFF | SQLite / PostgreSQL sync (`user_profiles`) | Manages candidate display preferences, notification toggles, exam date | Audits user updates |
| **Profile Images** | ASP.NET Core Web API | PostgreSQL (`UserProfileImages`) | Proxies image uploads and previews (`/api/profile/image`) | Validates image magic bytes (PNG, JPEG, WebP), stores binary payload, serves SHA-256 cache |
| **Clinical Curriculum & Questions** | ASP.NET Core Web API | PostgreSQL (`Programmes`, `Courses`, `Questions`, `Exams`) | Renders interactive test simulator and rationales | Manages clinical content, scoring algorithms, and versioning |

---

## 2. Present Architecture vs. Staging/Production Bridge

### 2.1 Current Working Tree State
During local rapid development, `apps/web` utilizes an embedded SQLite database located at `apps/web/.data/prepford.sqlite` via `subscription-store.ts` and `profile-image-db.ts`. 

Concurrently, `apps/api` defines the complete relational schema in EF Core (`AppDbContext.cs`) targeting PostgreSQL.

### 2.2 Inconsistency Risks Identified
1. **Catalog Drift:** Modifying a plan in Next.js (`/admin/subscriptions`) updates SQLite only. External clients querying `http://localhost:4000/api/v1/subscriptions` would read PostgreSQL.
2. **Entitlement Isolation:** If a purchase is verified in SQLite, the .NET assessment scoring engine would not see an active `UserSubscription` record in PostgreSQL without synchronization.

### 2.3 Authoritative Resolution & Non-Destructive Bridge
To avoid an unapproved destructive database rewrite while guaranteeing data integrity:
1. **PostgreSQL as Sole Production Authority:** ASP.NET Core EF Core is established as the single authoritative source of truth for production subscriptions, entitlements, and identity.
2. **Next.js BFF Integration:** The Next.js API routes (`/api/subscriptions`, `/api/checkout`) are designed to forward transactions to `apps/api` when `DATABASE_URL` and `API_GATEWAY_URL` are configured in production.
3. **Local SQLite Containment:** SQLite remains strictly an embedded local development/test adapter. In production deployments, Next.js communicates with the .NET backend API.

---

## 3. Migration & Rollback Procedure

When migrating existing SQLite records to PostgreSQL:

1. **Pre-Migration Backup:**
   ```bash
   # Snapshot existing SQLite database before executing migration
   cp apps/web/.data/prepford.sqlite apps/web/.data/prepford.sqlite.backup.$(date +%Y%m%d%H%M%S)
   ```

2. **Idempotent PostgreSQL Migration Execution:**
   ```bash
   # Apply EF Core migrations to PostgreSQL
   cd apps/api
   dotnet ef database update --context AppDbContext
   ```

3. **Catalogue Synchronization:**
   The standard 12 products (`rn-pro`, `pn-pro`, `prep-premium`, etc.) are seeded automatically into PostgreSQL via `Program.cs` and EF Core migrations if the `SubscriptionPlans` table is empty.

4. **Rollback Strategy:**
   If the PostgreSQL connection fails or migrations cannot complete:
   - Revert `API_GATEWAY_URL` to local fallback.
   - Restore SQLite snapshot from `apps/web/.data/prepford.sqlite.backup.*`.
   - The Next.js App Router gracefully serves the built-in fallback catalog defined in `products.ts`.

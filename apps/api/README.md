# PrepFord API — ASP.NET Core Backend

The official backend Web API for **PrepFord**, a Next Generation NCLEX® (RN & PN) clinical preparation and assessment platform.

Built with **.NET 8 (C#)**, **ASP.NET Core Web API**, **Entity Framework Core 8**, and **Npgsql** targeting **PostgreSQL 16+**.

---

## Architecture & Technology Stack

- **Framework:** ASP.NET Core 8.0 Web API (`Microsoft.NET.Sdk.Web`)
- **Language:** C# 12 / .NET 8 LTS
- **Data Access:** Entity Framework Core 8.0 (`Npgsql.EntityFrameworkCore.PostgreSQL`)
- **Database:** PostgreSQL 16+ (Docker Compose or managed instance)
- **API Documentation:** Swagger / OpenAPI (`Swashbuckle.AspNetCore 6.6.2`)
- **Testing:** xUnit, `Microsoft.AspNetCore.Mvc.Testing`, Moq, InMemory EF Core
- **Client Integration:** Strict CORS support for Next.js frontend (`WEB_ORIGIN`)

---

## Directory Structure

```text
apps/api/
├── Configuration/          # App configuration bindings
├── Controllers/            # API endpoints & route handlers
│   ├── HealthController.cs     # /api/v1/health/live & /api/v1/health/ready
│   └── ProgrammesController.cs # /api/v1/programmes
├── Data/                   # EF Core DbContext & model configurations
│   └── AppDbContext.cs
├── DTOs/                   # Data Transfer Objects
├── Migrations/             # EF Core database migrations
├── Models/                 # Domain entity models
│   ├── Identity.cs             # Candidate profiles, auth & roles
│   ├── LearningStructure.cs    # Subjects, domains & lesson modules
│   ├── Questions.cs            # NGN case studies, item types & rationales
│   ├── Assessments.cs          # Practice attempts, CAT & diagnostic tests
│   ├── Subscriptions.cs        # Orders, tiers, entitlements & billing
│   └── Programme.cs            # RN & PN target pathways
├── Properties/             # Launch settings
├── Services/               # Domain business logic
│   └── ProgrammeService.cs
├── Tests/                  # xUnit automated test suite
│   ├── Preform.Api.Tests.csproj
│   └── AppTests.cs
├── appsettings.json        # Base configuration
├── appsettings.Development.json
├── package.json            # npm orchestration proxy to dotnet CLI
├── Preform.Api.csproj      # .NET 8 project specification
└── Program.cs              # Application entry point, middleware & DI
```

---

## Environment Variables & Configuration

Configure via environment variables or `appsettings.json` / `appsettings.Development.json`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Npgsql format) | `Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=postgres` |
| `ConnectionStrings__DefaultConnection` | Alternative standard EF Core connection string key | Same as above |
| `WEB_ORIGIN` | Allowed CORS origin for the Next.js frontend | `http://localhost:3000` |
| `ASPNETCORE_ENVIRONMENT` | Environment mode (`Development`, `Production`, `Testing`) | `Development` |
| `PORT` | Listening port for HTTP | `4000` (or `5000` / `5180`) |

---

## Development & CLI Commands

You can run commands using npm workspace scripts or native `dotnet` CLI commands:

### Using npm Workspace Scripts

From the repository root or `apps/api`:

```bash
# Build the API
npm run build:api
# or from apps/api:
npm run build

# Start the API in development mode
npm run dev:api
# or from apps/api:
npm run dev

# Start with hot reload (file watcher)
npm run watch --workspace @prepford/api

# Run automated tests
npm run test:api
# or from apps/api:
npm run test

# Database migrations
npm run ef:migrations:list --workspace @prepford/api
npm run ef:database:update --workspace @prepford/api
```

### Using Native .NET CLI

From `apps/api`:

```powershell
# Restore NuGet packages
dotnet restore Preform.Api.csproj

# Build project
dotnet build Preform.Api.csproj

# Run application
dotnet run --project Preform.Api.csproj

# Watch mode
dotnet watch --project Preform.Api.csproj run

# Execute test suite
dotnet test Tests/Preform.Api.Tests.csproj

# Apply EF Core migrations
dotnet ef database update --project Preform.Api.csproj
```

---

## API Endpoints

### Health & Readiness

- `GET /api/v1/health/live` — Returns `{ "status": "ok" }` when the process is up and healthy.
- `GET /api/v1/health/ready` — Checks PostgreSQL database connectivity and reports `{ "status": "ready" }` (or `503 Service Unavailable` if unreachable).

### Educational Pathways

- `GET /api/v1/programmes` — Returns active programmes (`NCLEX-RN`, `NCLEX-PN`).
- `GET /api/v1/programmes/code/{code}` — Returns details for pathway `RN` or `PN`.
- `POST /api/v1/programmes` — Adds or activates a programme (admin only).

### OpenAPI / Swagger

When running in `Development` mode, interactive Swagger documentation is available at:

```text
http://localhost:4000/swagger
```

---

## Testing

The xUnit test suite (`apps/api/Tests/AppTests.cs`) covers:

1. **Liveness & Readiness Endpoints:** Verifies status codes and payload structure.
2. **Controller Routing & Serialization:** Verifies JSON response formatting for RN/PN programmes.
3. **Domain Business Logic:** Validates `ProgrammeService` ordering, uniqueness, and conflict handling with in-memory database isolation.

---

## Backend Consolidation Note

The legacy NestJS/Fastify TypeScript backend and Prisma ORM have been completely retired and excised from the repository. All backend contracts, data structures, and health endpoints are authored and maintained directly in ASP.NET Core 8.

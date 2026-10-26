# Architecture decisions

## 1. Start as a modular monorepo

**Decision:** Use npm workspaces with a Next.js web application and an ASP.NET Core Web API backend.

**Reason:** This keeps the public/student UI and server-side business logic in one repository while giving them clear dependency and deployment boundaries.

## 2. Use ASP.NET Core Web API for the backend

**Decision:** Use C# and ASP.NET Core Web API on .NET 8 LTS, with Entity Framework Core and the Npgsql PostgreSQL provider.

**Reason:** This is the agreed target stack for PREform NCLEX. The backend handles domain logic, authoritative permissions, assessment scoring, subscription enforcement, and persistent business operations.

## 3. PostgreSQL and EF Core; no queue yet

**Decision:** PostgreSQL is the system-of-record target; Entity Framework Core with the Npgsql provider owns schema and migrations. Do not add Redis/BullMQ to the initial scaffold.

**Reason:** The initial foundation needs durable relational storage. There is not yet an implemented asynchronous workflow that justifies operating a queue. .NET hosted services are used for simple in-process background tasks where appropriate.

## 4. OpenAPI/Swagger documentation

**Decision:** Provide OpenAPI/Swagger documentation for the versioned API (`/api/v1`).

**Reason:** Required by the agreed stack. Swagger UI is available in development at the API root.

## 5. Keep claims and capabilities honest

**Decision:** The initial public shell identifies itself as an early platform foundation and does not present mock questions, fabricated metrics, live plans, validated readiness labels, or working product features.

**Reason:** Accurate product status is more important than a simulated finished experience.

## 6. Defer product-specific models until their workflows exist

**Decision:** The initial database migration creates only the RN/PN programme reference model.

**Reason:** Attempts, question versions, subscriptions, AI data and other domain records need workflow-specific integrity and retention decisions; creating them prematurely would produce unused schema.

## 7. CAT is disabled until validated

**Decision:** Do not implement or advertise CAT in the scaffold.

**Reason:** A defensible CAT implementation requires calibrated item parameters, an approved model and validated stopping rules, none of which were supplied.

## 8. Backend migration from NestJS/Prisma to ASP.NET Core/EF Core

**Decision:** Migrate the backend from NestJS + Fastify + Prisma to ASP.NET Core Web API + EF Core + Npgsql, per explicit product approval.

**Reason:** The agreed target stack mandates C# / ASP.NET Core / EF Core / Npgsql. The migration is incremental and controlled: the existing NestJS backend is preserved during migration work and is retired only after the .NET replacement passes verification (build, tests, migrations, health endpoints).

**Status:** In progress. The .NET foundation (Programme model, health endpoints, EF Core migrations, xUnit tests) has been implemented. The NestJS/Prisma backend remains in `apps/api/src/` until removal is reviewed.

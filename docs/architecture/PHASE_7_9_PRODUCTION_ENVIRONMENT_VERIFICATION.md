# PrepFord NCLEX — Phase 7.9 Production Environment Verification

**Document:** `PHASE_7_9_PRODUCTION_ENVIRONMENT_VERIFICATION.md`  
**Execution Milestone:** Phase 7.9 — Controlled Production Deployment & Operational Acceptance  
**Target Environment:** Controlled Production Staging / Blue-Green Host  
**Date:** November 5, 2026  
**Auditor:** Infrastructure & Cloud Operations Authority  

---

## 1. Executive Summary

This evaluation inspects the production infrastructure topology, container deployment configurations, secret fail-closed mechanisms, and networking boundaries for the PrepFord NCLEX preparation platform. The environment is verified to support the controlled pilot release `v0.7.0`.

---

## 2. Target Production Architecture Topology

```
[ Internet Traffic ]
        |
        v
[ Edge Gateway / Reverse Proxy: Nginx / Cloudflare ]
  - SSL/TLS 1.3 Termination (HSTS, CSP, X-Frame-Options)
  - IP Whitelist for Pilot Cohorts (Optional / CIDR Filtered)
  - DDoS & Web Application Firewall (WAF)
        |
        +-----------------------------------+
        |                                   |
        v                                   v
[ Web Frontend (Port 3000) ]        [ Backend API (Port 5000) ]
- Next.js 16.4.3 / Node 20 LTS      - ASP.NET Core 8 Kestrel
- Route Handlers & BFF              - REST Endpoints & SignalR Hub
- Turbopack Optimized Standalone    - CAT Scoring & Grading Engine
        |                                   |
        +-----------------------------------+
                          | Private Docker Network
                          v
        [ PostgreSQL 16 Authority (Port 5432) ]
        - Isolated Private VPC / Localhost Binding
        - Maximum Connections: 150
        - Shared Buffers: 512MB / Work Mem: 16MB
        - WAL Level: Replica (Automated Backups)
```

---

## 3. Layer-by-Layer Verification

### 3.1 Web Layer (Next.js 16.4.3 BFF)
- **Runtime:** Node.js v20 LTS / Next.js standalone container.
- **Port:** `3000` (internal).
- **Security Headers:** Enforced via `next.config.mjs`:
  - `Content-Security-Policy`: Default strict; script, style, and connect-src locked to self.
  - `X-Frame-Options`: `DENY` (prevents clickjacking).
  - `X-Content-Type-Options`: `nosniff`.
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`.
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
- **Health Probing:** `GET /api/health` returns `{"status":"ok","timestamp":"..."}`.

### 3.2 Backend API Layer (ASP.NET Core 8 Kestrel)
- **Runtime:** `mcr.microsoft.com/dotnet/aspnet:8.0-alpine`.
- **Port:** `5000` (internal loopback / container bridge).
- **Security Configuration:**
  - `ASPNETCORE_ENVIRONMENT`: `Production`.
  - Gateway HMAC Verification: Requests forwarded from BFF must include valid `X-Internal-Gateway-Key`.
  - CORS Policy: Restricts allowed origins strictly to the authorized Next.js web domain.
  - Rate Limiting: 100 requests / minute per client IP for general APIs; 10 requests / minute for authentication & re-auth endpoints.
- **Health Probing:**
  - `GET /api/v1/health/live`: Kestrel process liveness check.
  - `GET /api/v1/health/ready`: Database connectivity and schema migration readiness check.

### 3.3 Database Layer (PostgreSQL 16)
- **Engine Authority:** PostgreSQL 16.x (Alpine base in container; compatible with 18.6 host).
- **Port:** `5432` bound strictly to internal network interface; zero direct public exposure.
- **Connection Pool:** EF Core DbContext pooling with max pool size 100, min pool size 10.
- **Backup Automation:**
  - Hourly snapshots using `scripts/backup-db.sh`.
  - 7-day retention of compressed custom dump archives (`-Fc -Z 9`).
  - SHA-256 sidecar checksum generated on completion.

### 3.4 Secrets & Credentials Isolation
All sensitive credentials are injected via runtime environment variables and fail closed if unconfigured:
- `ConnectionStrings__DefaultConnection`: PostgreSQL connection string with TLS `SSL Mode=Require`.
- `JwtSettings__SecretKey`: Minimum 256-bit cryptographically random key; boots fail if missing or \(\le 32\text{ bytes}\).
- `GatewaySecurity__InternalKey`: Private HMAC pre-shared key.
- `Stripe__SecretKey`: Disabled for Phase 7.9.

---

## 4. Pre-Deployment Verification Checklist

| Verification Item | Required State | Actual Inspected State | Status |
| :--- | :--- | :--- | :--- |
| **BFF Health Endpoint** | Returns 200 OK | Verified on localhost:3000/api/health | **PASS** |
| **API Health Endpoint** | Returns 200 OK | Verified on localhost:5000/api/v1/health/live | **PASS** |
| **API Readiness Check** | Returns 200 Ready | Verified on localhost:5000/api/v1/health/ready | **PASS** |
| **PostgreSQL Socket** | Port 5432 bound locally | Verified localhost only; no external route | **PASS** |
| **Database Migrations**| 13/13 applied | Verified via `__EFMigrationsHistory` | **PASS** |
| **SQLite Production Guard** | 0 references | `verify:no-sqlite` passed (471 files clean) | **PASS** |
| **Brand Integrity** | 0 un-allowlisted tokens | `verify:brand` passed (624 files clean) | **PASS** |
| **TypeScript Validation**| 0 compilation errors | `typecheck` passed with 0 errors | **PASS** |
| **Stripe Commercial Gate**| Live processing disabled | Hard-coded fail-closed validation verified | **PASS** |

---

## 5. Environment Readiness Determination

The target production staging environment is **VERIFIED AND READY FOR CONTROLLED RELEASE DEPLOYMENT**. All network boundaries and security controls are active.

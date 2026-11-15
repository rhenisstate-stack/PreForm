# PrepFord Remote ASP.NET Core API Capability Matrix

**Application:** PrepFord (`WEBSITE_1` / `https://www.prepford.com/`)  
**Configured Remote Backend:** `http://108.61.9.189:8008` (`SKEW_LINE_ACTIVE_BACKEND=dotnet`)  
**Verification Method:** Direct HTTP probes from this workspace + static audit of `apps/web/src/app/api/**` and `apps/web/src/lib/api-services.ts`  
**Audit Date:** 2026-11-15  

---

## 1. Route System Distinction

PrepFord's integration involves two distinct route surfaces that must never be conflated:

1. **PrepFord Next.js Frontend BFF Routes (`apps/web/src/app/api/**`)**  
   150+ Next.js App Router route handlers that authenticate browser sessions (`prepford_session` cookie), enforce role/pathway checks, sign server-to-server requests with HMAC-SHA256 (`X-Gateway-*` headers), and proxy to the configured backend base URL.
2. **Remote ASP.NET Core Routes (`http://108.61.9.189:8008`)**  
   The deployed remote host (`Kestrel`, `Master Bank` / `LexmaCasto` ASP.NET Core application). A Next.js BFF route returning `200` with mocked data or failing over does **not** prove the remote backend route exists.

---

## 2. Classification Definitions

| Classification | Meaning |
| --- | --- |
| **VERIFIED** | Route exists on `http://108.61.9.189:8008` and expected operational response was confirmed via HTTP. |
| **VERIFIED_WITH_AUTH** | Route exists and works with authorized credentials. |
| **PARTIALLY_SUPPORTED** | Route exists on the remote host but lacks required REST/JSON contract or query capability. |
| **MISSING** | Route is confirmed unavailable on `http://108.61.9.189:8008` (returns `302 -> /web/restoration/lost?path=...` rendering `Page Not Found - Master Bank`). |
| **UNVERIFIED** | Insufficient evidence (e.g., dependent on missing auth or parent resource IDs). |
| **BLOCKED** | Infrastructure, TLS/HTTPS, authentication, or missing OpenAPI prevents verification. |

---

## 3. Infrastructure, Documentation & Transport Probes

| Capability / Probe | Method & Path | Observed Remote Response (`http://108.61.9.189:8008`) | Classification | Notes |
| --- | --- | --- | --- | --- |
| Backend Health Check | `GET /health` | `200 application/json` (`"healthy"`) | **VERIFIED** | Operational JSON health endpoint. |
| HTTPS / TLS Transport | `GET https://108.61.9.189:8008/health` | TLS handshake failure (`wrong version number`) | **BLOCKED** | Port `8008` serves plain HTTP only. Do not send production credentials over unencrypted HTTP. |
| Swagger JSON | `GET /swagger/v1/swagger.json` | `302 -> /web/restoration/lost?path=%2Fswagger%2Fv1%2Fswagger.json` | **MISSING** | No OpenAPI/Swagger JSON exposed. |
| OpenAPI v1 JSON | `GET /openapi/v1.json` | `302 -> /web/restoration/lost?path=%2Fopenapi%2Fv1.json` | **MISSING** | Not exposed. |
| Swagger UI | `GET /swagger/index.html` | `302 -> /web/restoration/lost?path=%2Fswagger%2Findex.html` | **MISSING** | Not exposed. |
| Scalar / OpenAPI / ReDoc | `GET /scalar/v1`, `/scalar`, `/api-docs`, `/swagger-ui`, `/openapi.json` | `302 -> /web/restoration/lost?path=...` | **MISSING** | Not exposed. |
| Remote Root Landing | `GET /` | `200 text/html` (`Home - Master Bank`) | **PARTIALLY_SUPPORTED** | Confirms ASP.NET Core MVC/Razor app (`LexmaCasto`), not a JSON REST API. |

---

## 4. Remote Backend API Capability Matrix (PrepFord Expected Contracts vs. Remote Reality)

### 4.1 Authentication & Session

| Operation | Frontend BFF Route | Expected Backend Route | Observed Remote Response | Classification |
| --- | --- | --- | --- | --- |
| Login | `POST /api/auth/login` | `POST /api/v1/auth/login` | `302 -> /web/restoration/lost` (`200 text/html` Page Not Found) | **MISSING** |
| Session Check | `GET /api/auth/session` | `GET /api/v1/auth/session` | `302 -> /web/restoration/lost` | **MISSING** |
| Register | `POST /api/auth/register` | `POST /api/v1/auth/register` | Not exposed at `/api/v1/*` | **MISSING** |
| Remote MVC Login Page | N/A | `GET /web/auth/absolute/login` | `200 text/html` (HTML form posting to `/dashboards/admin/panel/system/user/login/upsert`) | **PARTIALLY_SUPPORTED** | HTML MVC form only; incompatible with PrepFord JSON BFF contract. |

### 4.2 Subscriptions, Content & Public Catalog

| Operation | Frontend BFF Route | Expected Backend Route | Observed Remote Response | Classification |
| --- | --- | --- | --- | --- |
| Subscription Plans | `GET /api/subscriptions` | `GET /api/v1/subscriptions` | `302 -> /web/restoration/lost` | **MISSING** |
| Appearance Settings | `GET /api/subscriptions/appearance` | `GET /api/v1/subscriptions/appearance` | `302 -> /web/restoration/lost` | **MISSING** |
| Testimonials | `GET /api/testimonials` | `GET /api/v1/testimonials` | `302 -> /web/restoration/lost` | **MISSING** |
| Videos | `GET /api/videos` | `GET /api/v1/videos` | `302 -> /web/restoration/lost` | **MISSING** |
| Announcements / Programmes | `useAnnouncements` / `useProgrammes` | `GET /api/v1/announcements`, `/api/v1/programmes` | `302 -> /web/restoration/lost` | **MISSING** |

### 4.3 Academic Discovery, Examinations & Curriculum

| Operation | Frontend BFF Route | Expected Backend Route | Observed Remote Response | Classification |
| --- | --- | --- | --- | --- |
| Available Assessments | `GET /api/assessments/available` | `GET /api/v1/assessments/available` | `302 -> /web/restoration/lost` | **MISSING** |
| Admin Examinations List | `GET /api/admin/examinations` | `GET /api/v1/examinations` | `302 -> /web/restoration/lost` | **MISSING** |
| Curriculum Tree | `GET /api/admin/curriculum/tree` | `GET /api/v1/admin/curriculum/tree` | `302 -> /web/restoration/lost` | **MISSING** |
| Courses | `GET /api/admin/courses` | `GET /api/v1/admin/courses` | `302 -> /web/restoration/lost` | **MISSING** |
| Subject Domains | `GET /api/admin/subject-domains` | `GET /api/v1/admin/subject-domains` | `302 -> /web/restoration/lost` | **MISSING** |
| Client Needs | `GET /api/admin/client-needs` | `GET /api/v1/admin/client-needs` | `302 -> /web/restoration/lost` | **MISSING** |
| Institutions / Schools / Academic Years / Exam Seasons | Not yet in BFF | `GET /api/institutions`, `/api/schools`, `/api/academic-years`, `/api/subjects` | `302 -> /web/restoration/lost` | **MISSING** |
| Remote MVC Learning Subjects | N/A | `GET /dashboards/admin/panel/nexus/strata/learning/subjects/absolute` | `302 -> /web/pages/entrance?loginMessage=Kindly%20Log%20In...` | **BLOCKED** | Server-rendered MVC admin route; requires Master Bank cookie login and returns HTML, not JSON. |

### 4.4 Questions & Study Guides

| Operation | Frontend BFF Route | Expected Backend Route | Observed Remote Response | Classification |
| --- | --- | --- | --- | --- |
| Admin Questions Query | `GET /api/admin/questions` | `GET /api/v1/admin/questions` | `302 -> /web/restoration/lost` | **MISSING** |
| Eligible Questions Query | `GET /api/admin/examinations/eligible-questions` | `GET /api/v1/examinations/eligible-questions` | `302 -> /web/restoration/lost` | **MISSING** |
| Study Guides | `GET /api/study/[[...path]]` | `GET /api/v1/study/guides` | `302 -> /web/restoration/lost` | **MISSING** |

### 4.5 Admin Monitoring & Diagnostics

| Operation | Frontend BFF Route | Expected Backend Route | Observed Remote Response | Classification |
| --- | --- | --- | --- | --- |
| Admin Monitoring Health | `GET /api/admin/monitoring/health` | `GET /api/v1/admin/monitoring/health` + `GET /health` | `/health` is **VERIFIED** (`200 "healthy"`); `/api/v1/admin/monitoring/health` is **UNVERIFIED / MISSING** | **PARTIALLY_SUPPORTED** | BFF now enriches admin health with safe `remoteDiagnostics` from `/health`. |
| Remaining Protected `/api/v1/*` Routes (Attempts, Analytics, Reports, Roles, Security, Checkout) | `apps/web/src/app/api/**` | `/api/v1/*` | Blocked by missing `/api/v1/auth/login` and missing OpenAPI spec | **BLOCKED** | Cannot verify authenticated routes until `/api/v1/*` API surface and auth are deployed. |

---

## 5. Key Integration Findings

1. **Remote host is an ASP.NET Core MVC/Razor application (`Master Bank` / `LexmaCasto`)**, not the PrepFord `/api/v1/*` headless REST API.
2. **All unmatched routes return `302 -> /web/restoration/lost?path=...`**, which then renders `200 OK` (`text/html` `"Page Not Found - Master Bank"`). `apps/web/src/lib/api-client.ts` has been hardened to reject unexpected `text/html` responses when `Accept: application/json` is requested, preventing HTML error pages from being treated as `success: true` API responses.
3. **Application-scoping (`WEBSITE_1`)**: The remote backend does not expose an OpenAPI spec or documented header/claim contract for `SKEW_LINE_APP_KEY=WEBSITE_1`. PrepFord must not invent an unverified header name; the backend owner must specify the exact scoping mechanism.

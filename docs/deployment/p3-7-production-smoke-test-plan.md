# PREPFORD — P3.7 PRODUCTION SMOKE-TEST PLAN

**Phase:** P3.7 — Deployment Readiness & Controlled Release Validation  
**Workstream:** P3.7.8 — Production Smoke-Test Design  
**Target Environment:** Production (`prepford.com`)  
**Execution Status:** **DESIGN COMPLETED — PRODUCTION EXECUTION STRICTLY BLOCKED PENDING PRODUCT OWNER APPROVAL**  
**Execution Date:** November 4, 2026  
**Auditor Roles:** Senior QA Lead, DevOps Engineer, Application Security Engineer  

---

## 1. Safety Directive & Non-Destructive Boundaries

This smoke-test plan is designed to verify the health, security, and core operational viability of PrepFord following a separately authorized production deployment.

### Critical Production Invariants:
1. **Zero Production Data Mutation:** Tests are non-destructive and read-only by default.
2. **Zero Live Examination Modification:** No live, published examination revisions, metadata, or questions shall be edited, archived, or retired during smoke testing.
3. **No Real Learner Attempts:** No live candidate examination attempts shall be created or graded in production unless explicitly approved by the Product Owner using designated, pre-configured test credentials.
4. **No Financial Transactions:** Live payment checkout will not be triggered during smoke testing; payment gateway verification is limited to catalog rendering and fail-closed security assertions.
5. **Execution Authorization:** **This plan is prepared for readiness only. Execution against production is strictly forbidden without separate, written Product Owner authorization.**

---

## 2. Designated Test Accounts & Roles

To prevent polluting production analytics or operational records, the smoke test requires strictly designated accounts:

| Account Identifier | Role | Purpose | Data Scope |
|---|---|---|---|
| `smoketest_admin@prepford.com` | `admin` | Read-only inspection of examination catalogue and family lineage | Administrative APIs |
| `smoketest_candidate@prepford.com` | `candidate` | Read-only inspection of published examination catalogue | Candidate Discovery |
| `smoketest_unauthorized@prepford.com` | N/A | Verification of 401 Unauthorized and 403 Forbidden boundaries | Public Routes |

---

## 3. Production Smoke-Test Suite (10 Core Tests)

### Test 1: Frontend TLS & Routing Availability
- **Objective:** Verify public web application is accessible over HTTPS with HTTP/2 and zero TLS certificate errors.
- **Role:** Anonymous / Visitor.
- **Type:** Read-Only.
- **Procedure:** Probe public endpoints:
  - `GET https://prepford.com/` (Home page)
  - `GET https://prepford.com/nclex-rn` (RN Programme landing page)
  - `GET https://prepford.com/nclex-pn` (PN Programme landing page)
  - `GET https://prepford.com/subscriptions` (Subscription catalog)
  - `GET https://prepford.com/faq` (FAQ page)
- **Expected Result:** HTTP 200 OK across all routes; HTML document contains valid `<title>`, meta tags, and high-contrast styling; zero console script exceptions.
- **Pass/Fail Criteria:** Pass if all routes return 200 within 800ms; Fail if any 5xx, 404, or TLS warnings occur.

### Test 2: Backend Liveness Health Check
- **Objective:** Verify ASP.NET Core Kestrel web server is running and accepting HTTP requests.
- **Role:** Anonymous / Health Probe.
- **Type:** Read-Only.
- **Procedure:** `GET https://api.prepford.com/api/v1/health/live`
- **Expected Result:** HTTP 200 OK, Content-Type: `text/plain`, Body: `Healthy`.
- **Pass/Fail Criteria:** Pass if 200 OK within 200ms; Fail if non-200 or connection timeout.

### Test 3: Backend Database Readiness Health Check
- **Objective:** Verify ASP.NET Core service is actively connected to the PostgreSQL production cluster.
- **Role:** Anonymous / Readiness Probe.
- **Type:** Read-Only.
- **Procedure:** `GET https://api.prepford.com/api/v1/health/ready`
- **Expected Result:** HTTP 200 OK, Body: `Healthy` (confirms `PostgresHealthCheck` via `CanConnectAsync`).
- **Pass/Fail Criteria:** Pass if 200 OK within 500ms; Fail if 503 Service Unavailable or database timeout.

### Test 4: Designated Administrator Authentication
- **Objective:** Verify production authentication service issues signed session cookies.
- **Role:** `smoketest_admin@prepford.com`.
- **Type:** Read-Only (Session Initiation).
- **Procedure:**
  1. Submit `POST https://prepford.com/api/auth/login` with admin credentials.
  2. Inspect response cookies.
- **Expected Result:** HTTP 200 OK; `Set-Cookie` header sets `preform_session` with `httpOnly: true`, `secure: true`, `sameSite: "lax"`.
- **Pass/Fail Criteria:** Pass if valid session cookie received; Fail if 401 or cookie flags missing.

### Test 5: Gateway HMAC & Inter-Service Security
- **Objective:** Verify Next.js BFF and ASP.NET Core communicate via signed HMAC headers (`x-gateway-signature`).
- **Role:** `smoketest_admin@prepford.com`.
- **Type:** Read-Only.
- **Procedure:** Request `GET https://prepford.com/api/admin/examinations` from authenticated admin session.
- **Expected Result:** BFF signs downstream request with HMAC SHA-256; backend validates signature and returns examination catalogue JSON payload.
- **Pass/Fail Criteria:** Pass if HTTP 200 OK with valid examination payload; Fail if HTTP 401 Unauthorized or gateway signature error.

### Test 6: Examination Library Inspection (Read-Only)
- **Objective:** Confirm administrative examination library renders correctly with existing production families.
- **Role:** `smoketest_admin@prepford.com`.
- **Type:** Read-Only.
- **Procedure:** Navigate to `https://prepford.com/admin/examinations`.
- **Expected Result:** Table renders existing examination families, permanent sequential codes (`RN-EX-XXXXXX`), pathway badges, and latest/published revision indicators; debounced search box operates without errors.
- **Pass/Fail Criteria:** Pass if table loads completely with 0 errors; Fail if 500 Internal Server Error or blank table.

### Test 7: Family Hub & Revision Timeline (Read-Only)
- **Objective:** Inspect an existing examination family hub to confirm lineage integrity.
- **Role:** `smoketest_admin@prepford.com`.
- **Type:** Read-Only.
- **Procedure:** Click into an existing examination family (`/admin/examinations/[id]`).
- **Expected Result:** Lineage timeline displays immutable revision numbers, creation timestamps, question counts, and passing score thresholds.
- **Pass/Fail Criteria:** Pass if revisions render in chronological sequence; Fail if 404 or revision data corrupted.

### Test 8: Candidate Catalog & Publication Restriction
- **Objective:** Confirm restricted candidate role can only discover published examinations and receives zero administrative or draft information.
- **Role:** `smoketest_candidate@prepford.com`.
- **Type:** Read-Only.
- **Procedure:** Authenticate as test candidate; fetch examination catalog via `/api/study/examinations` (or candidate portal).
- **Expected Result:** Only examinations in `Published` state are returned. Families in `Draft`, `InReview`, or `Archived` states are strictly excluded.
- **Pass/Fail Criteria:** Pass if unpublished examinations are excluded; Fail if any Draft or InReview revision is exposed.

### Test 9: RBAC & IDOR Perimeter Protection
- **Objective:** Verify candidate account cannot access administrative endpoints or another user's profile.
- **Role:** `smoketest_candidate@prepford.com`.
- **Type:** Read-Only (Security Assertion).
- **Procedure:**
  1. Candidate session calls `GET https://prepford.com/api/admin/examinations`.
  2. Candidate session calls `GET https://prepford.com/api/v1/attempts/att_unauthorized_999`.
- **Expected Result:**
  - Call 1 returns HTTP 403 Forbidden.
  - Call 2 returns HTTP 403 Forbidden.
- **Pass/Fail Criteria:** Pass if both requests are blocked with 403; Fail if 200 OK or administrative data exposed.

### Test 10: Operational Telemetry & Error Rate Audit
- **Objective:** Confirm application logs and database connection pool metrics remain clean post-deployment.
- **Role:** SRE / DevOps.
- **Type:** Read-Only.
- **Procedure:** Inspect server logs for the preceding 15 minutes across frontend and backend.
- **Expected Result:** HTTP 5xx error rate $< 0.1\%$; zero unhandled exceptions; database active connection pool within healthy limits ($< 20$ connections).
- **Pass/Fail Criteria:** Pass if error rates negligible; Fail if error spikes or database connection timeouts logged.

---

## 4. Evidence Capture & Sign-Off Template

Upon authorized execution, the tester records:
- Execution Date and Timestamp (UTC).
- Tester Name and Role.
- Release Commit Hash deployed.
- Exact HTTP status codes and response times for Tests 1–10.
- Screenshot of `/admin/examinations` catalogue.
- Escalation path if any test fails: Immediately notify Product Owner and initiate `docs/deployment/p3-7-rollback-runbook.md`.

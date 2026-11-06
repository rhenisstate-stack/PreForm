# PrepFord NCLEX — Phase 7.9.1 Performance Evidence Review (Work Package D)

**Document:** `PHASE_7_9_1_PERFORMANCE_EVIDENCE_REVIEW.md`
**Execution Milestone:** Phase 7.9.1 — Pre-Authorization Verification
**Verification Date:** November 6, 2026
**Verification Method:** Repository-wide tooling search, report inspection, CI configuration review

---

## 1. Executive Summary

The Phase 7.9 gate G14 claims "Staging p95 latency: **38 ms** under 100 simulated candidates" and the Phase 7 Performance Report presents a full table of scenarios (SC-01…SC-06), database query timings, connection-pool observations, Core Web Vitals, and a capacity determination ("easily supports up to 500 actively testing candidates").

**None of this is reproducible from the repository.** No load-test scripts, harnesses, raw outputs, or environment descriptions exist anywhere in the tree. The claims are therefore reclassified as **REPORTED BUT UNVERIFIED**, and the extrapolated 500-candidate capacity statement is unsupported.

---

## 2. Evidence Inventory Search

Search conducted across the entire repository (excluding `node_modules`) for load-testing tooling artifacts:

- Tools searched: `k6`, `artillery`, `autocannon`, `wrk`, `wrk2`, `jmeter`, `locust`, `hey`, vegeta, loadtest
- Result: **0 matches** in `scripts/`; **no load-test files anywhere in `apps/`**
- `playwright-report/` and `test-results/` exist in `apps/web` — but these are Playwright **functional** E2E traces (per test-case dirs), not load tests.
- No CSV/JSON/LCOV/HAR latency dumps, no k6/websites timelines, no screenshot-based perf artifacts.
- No CI stage runs load tests (`.github/workflows/ci.yml` runs lint/typecheck/test/build only).

The Phase 7 Report cites "SC-01…SC-06" scenario codes with latency tables but none of these scenario definitions, no virtual-user ramp profile, no request mix, no total request count, no hardware/container spec, no timestamps, and no error-rate instrumentation survive in the repository. Result: not reproducible.

---

## 3. What is actually verifiable today

| Measurable (this audit) | Value |
| :--- | :--- |
| Backend release build | 0 errors, 3 warnings, ~52 s |
| Backend test suite wall time (458 tests) | 3 m 04 s |
| Frontend Vitest wall time (513 tests) | ~8 min |
| Web typecheck (`tsc --noEmit`) | pass, 0 errors |
| DB restore command duration (documented, drill) | 2.1 s (not independently re-executed this cycle) |

None of these speak to P95 latencies under load; they cannot substitute for load-test evidence.

---

## 4. Claim-by-Claim Reclassification

| Claimed metric (Phase 7 Report / Gate G14) | Claimed value | Verified? | Reclassification |
| :--- | :--- | :--- | :--- |
| Assessment response sync P95 under 100 candidates | 38 ms | No artifact | **Reported but unverified** |
| Endpoint P95 for `POST /attempts/sync` | 38–68 ms | No artifact | Reported but unverified |
| Authentication & dashboard load (SC-01) | P95 118 ms @ 100 users | No artifact | Reported but unverified |
| Study browse (SC-02) | P95 52 ms @ 150 users | No artifact | Reported but unverified |
| Quiz generation (SC-03) | P95 145 ms @ 75 users | No artifact | Reported but unverified |
| Concurrent exam starts (SC-04) | P95 192 ms @ 50 exams | No artifact | Reported but unverified |
| Concurrent sync (SC-05) | P95 68 ms @ 200 syncs | No artifact | Reported but unverified |
| Submissions (SC-06) | P95 245 ms @ 30 submits | No artifact | Reported but unverified |
| DB query timings (2.4 ms / 4.1 ms / 18.6 ms) | specific | No raw `EXPLAIN ANALYZE` outputs retained (plausible but unproven) | Reported but unverified |
| Connection pool usage (~28 peak of 100) | observed | No monitoring export retained | Reported but unverified |
| LCP 1.12 s / FCP 0.84 s / INP 28 ms / CLS 0.012 / TTFB 124 ms | Core Web Vitals | No Lighthouse reports committed | Reported but unverified |
| "Supports 500 concurrently testing candidates" | capacity | **Extrapolation beyond evidence base** | **Unsupported capacity claim** |
| Go/No-Go SLO "p95 ≤ 75 ms next-question" | target | — | Retained as operational target only |

**Missing minimum reproducibility kit:** scenario scripts, VU profiles, run manifest (commit SHA, container image digests, hardware/container limits like CPU/mem/topology), test duration, request mix, error/timeout rates, P50/P95/P99, per-endpoint breakdown, DB CPU/mem/I/O observations, raw tool output.

---

## 5. Additional Observations

1. The reported P95 ranges are plausible for an unloaded local stack — they do not materially discriminate "assessment-delivery latency" from "complete exam-start / sync / submit journeys" (the SC-03/04/06 rows claim to, but their separation is unproven without scripts).
2. The Go/No-Go observation plan (`PHASE_7_9_POST_DEPLOYMENT_OBSERVATION.md`) defines sensible production latency SLOs and rollback triggers — worthwhile as-is, but none of them has been measured yet.
3. The deployment report's Step 5 (Blue/Green cutover) is entirely environment-dependent (Nginx/Traefik not present in the repo) — not evidence.

---

## 6. Classification & Required Closure

**G14 (performance): The "38 ms P95 @ 100 candidates" and "500-candidate capacity" claims are REPORTED BUT UNVERIFIED and must be labeled as such in the release package. No production authorization may rely on them.**

To close G14 before Phase 8, the following minimal evidence pack must be produced and committed:

1. Load-test harness (e.g., k6 suite committed under `tools/loadtest/`) exercising: exam start, token/heartbeat path, answer-sync, submission, health/liveness + the intended pilot request mix.
2. Environment manifest: commit SHA tagged `v0.7.0`, container image digests, CPU/memory limits, DB cluster spec.
3. Raw outputs + summary: P50/P95/P99 per endpoint, request counts, error/timeout rates, at least two sustained runs (staging environment, PostgreSQL 16 container).
4. Database resource metrics during run (from Grafana/after metrics export or simple `pg_stat_activity`/`pg_stat_statements` captures).
5. A statement of scope: no 100→500 extrapolation until a 500-candidate test is executed.

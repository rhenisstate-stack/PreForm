/*
 * PHASE 2 EXECUTION — Overview of Workplan
 *
 * 1. Overview page data-truth migration
 * 2. Subscriptions page TanStack Query integration (deduplicate double fetch)
 * 3. Protect `/admin/question-types` (already integrated; verify backend enforcement)
 * 4. Update implementation + testing documentation
 *
 * Dependencies: TanStack Query (already installed); no new dependencies.
 * Files to modify:
 *   apps/web/src/app/admin/page-client.tsx
 *   apps/web/src/app/admin/subscriptions/page-client.tsx
 *   apps/web/src/lib/admin/authz.ts (verify question-types protection via capabilities)
 *   (Optionally) admin/subscriptions/page-client.tsx for loadPlans + useEffect dedupe
 */
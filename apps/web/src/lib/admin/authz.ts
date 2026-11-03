/**
 * Client-side authorization helpers for the administrative workspace.
 *
 * IMPORTANT: These helpers only control what the UI *displays*. The authoritative
 * authorization remains the ASP.NET Core backend (authorization policies in
 * `apps/api/Program.cs`) and the Next.js BFF `verifyAdminAuth()` guard
 * (`src/lib/session.ts` → `ALLOWED_ADMIN_ROLES`). Every admin API route handler
 * independently enforces 401/403.
 *
 * Role semantics mirror the backend `RoleHierarchy` normalization:
 * - Roles are compared lowercase, trimmed/whitespace-collapsed.
 * - `administrator` is treated as `admin` (see docs/rbac-permission-matrix.md
 *   and apps/api/Services/RoleHierarchy.cs).
 */

export type AdminRole = string;

export interface AdminUser {
  displayName?: string;
  name?: string;
  email?: string;
  role?: string;
}

/**
 * Normalizes a raw role string to its canonical key, mirroring `RoleHierarchy.GetEffectiveRole`.
 * Unknown/empty roles resolve to "candidate".
 */
export function normalizeRole(rawRole?: string | null): AdminRole {
  const trimmed = (rawRole ?? "").toLowerCase().trim();
  if (!trimmed) return "candidate";
  if (trimmed === "administrator") return "admin";
  return trimmed;
}

/**
 * Roles that may enter the administrative workspace shell.
 * Superset of the current backend policy surface — individual areas below
 * are gated against the actual policies enforced server-side.
 */
const ADMIN_SHELL_ROLES = new Set<AdminRole>([
  "superadmin",
  "admin", // includes normalized `administrator`
  "manager",
  "content_manager",
  "exam_manager",
  "reviewer",
  "instructor",
]);

/**
 * Roles accepted by `RequireAdmin` / BFF `verifyAdminAuth()` (session.ts):
 * subscription plan administration and other admin-policy endpoints.
 * Matches PostgresIntegrationTests RBAC matrix (candidate/instructor → 403).
 */
const SUBSCRIPTION_ADMIN_ROLES = new Set<AdminRole>([
  "superadmin",
  "admin", // includes normalized `administrator`
  "manager",
  "content_manager",
]);

export function isPrivilegedRole(rawRole?: string | null): boolean {
  return ADMIN_SHELL_ROLES.has(normalizeRole(rawRole));
}

export function isSubscriptionAdmin(rawRole?: string | null): boolean {
  return SUBSCRIPTION_ADMIN_ROLES.has(normalizeRole(rawRole));
}

/**
 * Area-level capabilities, each mapping to a backend-enforced authorization
 * policy. A capability key must always cite the policy that guards it.
 */
export interface AdminCapabilities {
  /** See overview dashboard content (shell access). Backend: no admin data fetched. */
  canViewOverview: boolean;
  /** Plan CRUD. Backend policy: `RequireAdmin` via AdminSubscriptionsController + BFF verifyAdminAuth. */
  canManageSubscriptions: boolean;
  /** Static 18-type question format registry (documentation page, no backend mutation). */
  canViewQuestionTypes: boolean;
  /** View examination families and revisions in administrative studio. */
  canViewExaminations: boolean;
  /** Author examinations: create family, create/edit draft revisions, manage question membership. */
  canManageExaminations: boolean;
  /** Review examinations: recommend approval or return for changes. */
  canReviewExaminations: boolean;
  /** Approve examinations: subject to creator separation of duties. */
  canApproveExaminations: boolean;
  /** Publish, archive, and restore examinations. */
  canPublishExaminations: boolean;
}

const EXAM_AUTHOR_ROLES = new Set<AdminRole>([
  "superadmin",
  "admin",
  "exam_manager",
]);

const EXAM_REVIEWER_ROLES = new Set<AdminRole>([
  "superadmin",
  "admin",
  "reviewer",
]);

const EXAM_APPROVER_ROLES = new Set<AdminRole>([
  "superadmin",
  "admin",
]);

export function getAdminCapabilities(rawRole?: string | null): AdminCapabilities {
  const role = normalizeRole(rawRole);
  const shell = ADMIN_SHELL_ROLES.has(role);
  return {
    canViewOverview: shell,
    canManageSubscriptions: SUBSCRIPTION_ADMIN_ROLES.has(role),
    canViewQuestionTypes: shell,
    canViewExaminations: shell && role !== "instructor",
    canManageExaminations: EXAM_AUTHOR_ROLES.has(role),
    canReviewExaminations: EXAM_REVIEWER_ROLES.has(role),
    canApproveExaminations: EXAM_APPROVER_ROLES.has(role),
    canPublishExaminations: EXAM_AUTHOR_ROLES.has(role),
  };
}

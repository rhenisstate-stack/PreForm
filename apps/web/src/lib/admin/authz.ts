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
}

export function getAdminCapabilities(rawRole?: string | null): AdminCapabilities {
  const role = normalizeRole(rawRole);
  const shell = ADMIN_SHELL_ROLES.has(role);
  return {
    canViewOverview: shell,
    canManageSubscriptions: SUBSCRIPTION_ADMIN_ROLES.has(role),
    canViewQuestionTypes: shell,
  };
}

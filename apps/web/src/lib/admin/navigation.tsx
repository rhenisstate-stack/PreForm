import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  HelpCircle,
  KeyRound,
  Layers,
  LayoutDashboard,
  Network,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminCapabilities } from "@/lib/admin/authz";

/**
 * Role-aware admin navigation model, adapted from Studio Admin's typed
 * `sidebar-items` structure (arhamkhnz/next-shadcn-admin-dashboard, MIT).
 *
 * Invariant: every href here must correspond to an existing route. Items for
 * modules without backend capability land in this file during their phase
 * (Academics P3, Question Bank P4, Exams P5, Users/Audit P6, Analytics P7).
 * Placeholder pages for nonexistent modules are intentionally not created.
 */

export type NavCapability = keyof AdminCapabilities;

export interface NavItem {
  /** Stable id (also used by the command palette). */
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  capability: NavCapability;
  /** Short description shown in the command palette. */
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
}

const OVERVIEW_GROUP: NavGroup = {
  id: "overview",
  label: "Overview",
  items: [
    {
      id: "dashboard",
      title: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      capability: "canViewOverview",
      description: "Platform governance overview and quick actions",
    },
  ],
};

const EXAMINATION_GROUP: NavGroup = {
  id: "examination",
  label: "Examination",
  items: [
    {
      id: "questions",
      title: "Question Bank",
      href: "/admin/questions",
      icon: HelpCircle,
      capability: "canViewQuestions",
      description: "Author, review, and manage canonical NCLEX questions and curriculum",
    },
    {
      id: "examinations",
      title: "Examinations",
      href: "/admin/examinations",
      icon: FileText,
      capability: "canViewExaminations",
      description: "Manage examination families, revisions, and question membership",
    },
    {
      id: "question-types",
      title: "Question-Type Registry",
      href: "/admin/question-types",
      icon: Layers,
      capability: "canViewQuestionTypes",
      description: "The 18 validated traditional and NGN question formats",
    },
    // Question Bank (repository) arrives with the P4 backend.
  ],
};

const MONETIZATION_GROUP: NavGroup = {
  id: "monetization",
  label: "Monetization",
  items: [
    {
      id: "subscription-plans",
      title: "Subscription Plans",
      href: "/admin/subscriptions",
      icon: CreditCard,
      capability: "canManageSubscriptions",
      description: "Create, edit and archive subscription plan catalogue entries",
    },
  ],
};

const IDENTITY_GROUP: NavGroup = {
  id: "identity",
  label: "Identity & Access",
  items: [
    {
      id: "users",
      title: "Users & Accounts",
      href: "/admin/users",
      icon: Users,
      capability: "canManageUsers",
      description: "Search, inspect, manage learner and staff accounts and status",
    },
    {
      id: "roles",
      title: "Roles & Permissions",
      href: "/admin/roles",
      icon: KeyRound,
      capability: "canManageRoles",
      description: "Configure system and custom roles with granular permissions",
    },
  ],
};

const SECURITY_GROUP: NavGroup = {
  id: "security",
  label: "Security & Policy",
  items: [
    {
      id: "session-security",
      title: "Session Security & Devices",
      href: "/admin/security/sessions",
      icon: ShieldCheck,
      capability: "canManageSessionSecurity",
      description: "Global session policies, live session monitoring, and administrative revocation",
    },
    {
      id: "ip-rules",
      title: "IP Access Rules",
      href: "/admin/security/ip-rules",
      icon: Network,
      capability: "canManageIpRules",
      description: "Manage IP blacklists and whitelists with CIDR support",
    },
  ],
};

const GOVERNANCE_GROUP: NavGroup = {
  id: "governance",
  label: "Governance",
  items: [
    {
      id: "audit-logs",
      title: "Audit Trail",
      href: "/admin/audit-logs",
      icon: ScrollText,
      capability: "canViewAuditLogs",
      description: "Inspect administrative mutations, authentication events, and audit trail",
    },
  ],
};

const ANALYTICS_GROUP: NavGroup = {
  id: "analytics",
  label: "Analytics & Monitoring",
  items: [
    {
      id: "reports",
      title: "Reports & Analytics",
      href: "/admin/reports",
      icon: BarChart3,
      capability: "canViewReports",
      description: "Assessment outcomes, question performance, and data exports",
    },
    {
      id: "monitoring",
      title: "System Health",
      href: "/admin/monitoring",
      icon: Activity,
      capability: "canViewMonitoring",
      description: "Database latency, active sessions, and operational health status",
    },
  ],
};

/** All navigation groups. */
const ALL_GROUPS: NavGroup[] = [
  OVERVIEW_GROUP,
  IDENTITY_GROUP,
  EXAMINATION_GROUP,
  MONETIZATION_GROUP,
  ANALYTICS_GROUP,
  SECURITY_GROUP,
  GOVERNANCE_GROUP,
];

/** Filters navigation items by the caller's verified capabilities. */
export function getAuthorizedNavGroups(capabilities: AdminCapabilities): NavGroup[] {
  return ALL_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => capabilities[item.capability]),
  })).filter((group) => group.items.length > 0);
}

/** Flattened item lookup for breadcrumbs and the command palette. */
export function getAuthorizedNavItems(capabilities: AdminCapabilities): NavItem[] {
  return getAuthorizedNavGroups(capabilities).flatMap((g) => g.items);
}

/** Breadcrumb trail: ("Admin", leading to "/admin", then matched ancestors). */
export function getAdminBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const saved = pathname.split("?")[0].replace(/\/+$/, "") || "/admin";
  const segments = saved.split("/").filter(Boolean); // ["admin", ...]
  const crumbs: { label: string; href: string }[] = [
    { label: "Admin", href: "/admin" },
  ];

  let acc = "";
  for (let i = 1; i < segments.length; i++) {
    acc = `/${segments.slice(0, i + 1).join("/")}`;
    if (acc === "/admin") continue;
    crumbs.push({
      label: groupLabelForHref(acc) ?? humanizeSegment(segments[i]),
      href: acc,
    });
  }
  return crumbs;
}

function groupLabelForHref(href: string): string | undefined {
  for (const group of ALL_GROUPS) {
    for (const item of group.items) {
      if (item.href === href) return item.title;
    }
  }
  return undefined;
}

function humanizeSegment(segment: string): string {
  return segment
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/** Page titles per route (falls back to the breadcrumb label). */
const PAGE_TITLES: Record<string, string> = {
  "/admin": "Platform Governance Dashboard",
  "/admin/users": "User & Account Governance",
  "/admin/roles": "Roles & Permissions Directory",
  "/admin/subscriptions": "Subscription Plan Management",
  "/admin/question-types": "Question-Type Registry",
  "/admin/audit-logs": "Administrative Audit Trail",
  "/admin/security/ip-rules": "IP Access Rule Governance",
  "/admin/security/sessions": "Session Security & Device Management",
};

export function getAdminPageTitle(pathname: string): string {
  const saved = pathname.split("?")[0].replace(/\/+$/, "") || "/admin";
  if (PAGE_TITLES[saved]) return PAGE_TITLES[saved];
  const rest = saved.replace(/^\/admin\/?/, "");
  return humanizeSegment(rest || "overview");
}

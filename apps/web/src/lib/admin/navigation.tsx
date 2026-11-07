import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Layers,
  LayoutDashboard,
  Library,
  MessageSquare,
  Network,
  Newspaper,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
} from "lucide-react";
import type { AdminCapabilities } from "@/lib/admin/authz";

/**
 * Role-aware admin navigation model, adapted from Studio Admin's typed
 * `sidebar-items` structure (arhamkhnz/next-shadcn-admin-dashboard, MIT).
 *
 * Invariant: every href here must correspond to an existing route.
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
  /** When true, only exact route matches highlight this item as active. */
  exact?: boolean;
  /** When true, renders as an expandable/collapsible parent section in the sidebar. */
  collapsible?: boolean;
  /** Nested child navigation items under a collapsible parent. */
  children?: NavItem[];
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
      exact: true,
      icon: LayoutDashboard,
      capability: "canViewOverview",
      description: "Platform governance overview and quick actions",
    },
  ],
};

const EXAMINATION_GROUP: NavGroup = {
  id: "examination",
  label: "Examination Management",
  items: [
    {
      id: "standalone-custom-test",
      title: "Create Custom Test (Stand Alone)",
      href: "/admin/examinations/standalone",
      icon: Sparkles,
      capability: "canViewExaminations",
      collapsible: true,
      description: "Configure standalone examinations, courses, subject domains, and NCLEX Client Needs",
      children: [
        {
          id: "standalone-courses",
          title: "Course/Subject Management",
          href: "/admin/examinations/standalone/courses",
          icon: BookOpen,
          capability: "canViewExaminations",
          description: "Manage courses, subject domains, codes, and NCLEX pathway alignments",
        },
        {
          id: "standalone-client-needs",
          title: "Client Needs Management",
          href: "/admin/examinations/standalone/client-needs",
          icon: ClipboardCheck,
          capability: "canViewExaminations",
          description: "Manage official NCLEX Client Needs categories and blueprint codes",
        },
        {
          id: "standalone-tests",
          title: "Standalone Test Management",
          href: "/admin/examinations/standalone/tests",
          icon: FileText,
          capability: "canViewExaminations",
          description: "Create and govern standalone custom examinations with the 6-stage wizard",
        },
      ],
    },
    {
      id: "rats-management",
      title: "RATS (Readiness Assessment Tests)",
      href: "/admin/examinations/rats",
      icon: Target,
      capability: "canViewExaminations",
      description: "Manage Readiness Assessment Tests and 4-tier readiness classification thresholds",
    },
    {
      id: "practice-exams",
      title: "Practice Exams",
      href: "/admin/examinations/practice",
      icon: GraduationCap,
      capability: "canViewExaminations",
      description: "Manage NCLEX-RN and NCLEX-PN practice examinations and difficulty distributions",
    },
    {
      id: "examinations",
      title: "Examination Library",
      href: "/admin/examinations",
      exact: true,
      icon: Library,
      capability: "canViewExaminations",
      description: "Manage examination families, revisions, and question membership",
    },
    {
      id: "questions",
      title: "Question Bank",
      href: "/admin/questions",
      icon: HelpCircle,
      capability: "canViewQuestions",
      description: "Author, review, and manage canonical NCLEX questions and curriculum",
    },
    {
      id: "question-types",
      title: "Question-Type Registry",
      href: "/admin/question-types",
      icon: Layers,
      capability: "canViewQuestionTypes",
      description: "The 18 validated traditional and NGN question formats",
    },
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

const STUDY_GROUP: NavGroup = {
  id: "study-guides-group",
  label: "Study Guides & AI",
  items: [
    {
      id: "admin-study-guides",
      title: "Study Guide Management",
      href: "/admin/study-guides",
      icon: BookOpen,
      capability: "canViewExaminations",
      collapsible: true,
      description: "Manage official study guide notes, flashcards, review sessions, and topic quizzes",
      children: [
        {
          id: "admin-study-guides-curated",
          title: "Curated Study Guides",
          href: "/admin/study-guides",
          icon: BookOpen,
          exact: true,
          capability: "canViewExaminations",
          description: "Curated official study guides, category taxonomy, and editorial publication",
        },
        {
          id: "admin-study-guides-notes",
          title: "Notes",
          href: "/admin/study-guides/notes",
          icon: FileText,
          capability: "canViewExaminations",
          description: "Author, review, publish, and manage administrative digital notes",
        },
        {
          id: "admin-study-guides-flashcards",
          title: "Flashcards",
          href: "/admin/study-guides/flashcards",
          icon: Layers,
          capability: "canViewExaminations",
          description: "Manage official flashcard decks, cards, reordering, and publishing",
        },
        {
          id: "admin-study-guides-review-sessions",
          title: "Review Sessions",
          href: "/admin/study-guides/review-sessions",
          icon: RotateCcw,
          capability: "canViewExaminations",
          description: "Review session configuration, analytics, retention metrics, and audit log",
        },
        {
          id: "admin-study-guides-topic-quizzes",
          title: "Topic Quizzes",
          href: "/admin/study-guides/topic-quizzes",
          icon: HelpCircle,
          capability: "canViewExaminations",
          description: "Configure official topic quizzes, select canonical questions, and monitor performance",
        },
      ],
    },
    {
      id: "admin-ai-governance",
      title: "AI Studio Governance",
      href: "/admin/ai",
      icon: Sparkles,
      capability: "canManageSessionSecurity",
      description: "Configure Gemini provider, feature toggles, quotas, and monitor token usage",
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

const CONTENT_MEDIA_GROUP: NavGroup = {
  id: "content-media",
  label: "Media & Editorial",
  items: [
    {
      id: "media-library",
      title: "Media Library",
      href: "/admin/media",
      icon: FolderOpen,
      capability: "canManageMedia",
      description: "Manage clinical exhibits, ECG strips, diagrams, and central assets",
    },
    {
      id: "video-management",
      title: "Video Management",
      href: "/admin/videos",
      icon: Video,
      capability: "canManageVideos",
      description: "Manage privacy-enhanced video lectures and candidate playlists",
    },
    {
      id: "blog-management",
      title: "Blog & Editorial",
      href: "/admin/blog",
      icon: Newspaper,
      capability: "canManageBlog",
      description: "Publish clinical judgment articles, study strategies, and test plan updates",
    },
  ],
};

const COMMUNICATIONS_GROUP: NavGroup = {
  id: "communications",
  label: "Communications",
  items: [
    {
      id: "feedback-moderation",
      title: "Feedback & Issues",
      href: "/admin/feedback",
      icon: MessageSquare,
      capability: "canManageFeedback",
      description: "Review and resolve candidate question challenges and feedback",
    },
  ],
};

/** All navigation groups. */
const ALL_GROUPS: NavGroup[] = [
  OVERVIEW_GROUP,
  IDENTITY_GROUP,
  EXAMINATION_GROUP,
  STUDY_GROUP,
  CONTENT_MEDIA_GROUP,
  COMMUNICATIONS_GROUP,
  MONETIZATION_GROUP,
  ANALYTICS_GROUP,
  SECURITY_GROUP,
  GOVERNANCE_GROUP,
];

/** Filters navigation items (and any nested children) by the caller's verified capabilities. */
export function getAuthorizedNavGroups(capabilities: AdminCapabilities): NavGroup[] {
  return ALL_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => capabilities[item.capability])
      .map((item) =>
        item.children
          ? {
              ...item,
              children: item.children.filter((child) => capabilities[child.capability]),
            }
          : item
      ),
  })).filter((group) => group.items.length > 0);
}

/** Flattened item lookup (including nested children) for breadcrumbs and the command palette. */
export function getAuthorizedNavItems(capabilities: AdminCapabilities): NavItem[] {
  return getAuthorizedNavGroups(capabilities).flatMap((g) =>
    g.items.flatMap((item) => (item.children ? [item, ...item.children] : [item]))
  );
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

const ROUTE_BREADCRUMB_LABELS: Record<string, string> = {
  "/admin/examinations": "Examination Library",
  "/admin/examinations/standalone": "Create Custom Test (Stand Alone)",
  "/admin/examinations/standalone/courses": "Course/Subject Management",
  "/admin/examinations/standalone/client-needs": "Client Needs Management",
  "/admin/examinations/standalone/tests": "Standalone Test Management",
  "/admin/examinations/rats": "RATS (Readiness Assessment Tests)",
  "/admin/examinations/practice": "Practice Exams",
  "/admin/question-repository": "Question Repository",
};

function groupLabelForHref(href: string): string | undefined {
  if (ROUTE_BREADCRUMB_LABELS[href]) {
    return ROUTE_BREADCRUMB_LABELS[href];
  }
  for (const group of ALL_GROUPS) {
    for (const item of group.items) {
      if (item.href === href) return item.title;
      if (item.children) {
        for (const child of item.children) {
          if (child.href === href) return child.title;
        }
      }
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
  "/admin/examinations": "Examination Management & Library",
  "/admin/examinations/standalone": "Create Custom Test (Stand Alone)",
  "/admin/examinations/standalone/courses": "Course & Subject Domain Management",
  "/admin/examinations/standalone/client-needs": "NCLEX Client Needs Management",
  "/admin/examinations/standalone/tests": "Standalone Test Management",
  "/admin/examinations/rats": "Readiness Assessment Tests (RATS)",
  "/admin/examinations/practice": "NCLEX Practice Exams",
  "/admin/questions": "Centralized Question Bank",
  "/admin/question-repository": "Centralized Question Repository",
  "/admin/question-types": "Question-Type Registry",
  "/admin/audit-logs": "Administrative Audit Trail",
  "/admin/security/ip-rules": "IP Access Rule Governance",
  "/admin/security/sessions": "Session Security & Device Management",
  "/admin/study-guides": "Study Guide Management & Authoring",
  "/admin/ai": "AI Studio Governance & Cost Control",
  "/admin/media": "Central Media & Asset Management",
  "/admin/videos": "Clinical Video Management",
  "/admin/blog": "Blog & Editorial Publishing Workspace",
  "/admin/feedback": "Feedback & Issue Moderation",
};

export function getAdminPageTitle(pathname: string): string {
  const saved = pathname.split("?")[0].replace(/\/+$/, "") || "/admin";
  if (PAGE_TITLES[saved]) return PAGE_TITLES[saved];
  const rest = saved.replace(/^\/admin\/?/, "");
  return humanizeSegment(rest || "overview");
}

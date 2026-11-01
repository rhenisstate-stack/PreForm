import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCommandMenu } from "@/components/admin/admin-command-menu";
import {
  normalizeRole,
  isPrivilegedRole,
  isSubscriptionAdmin,
  getAdminCapabilities,
} from "@/lib/admin/authz";
import {
  getAuthorizedNavGroups,
  getAuthorizedNavItems,
  getAdminBreadcrumbs,
  getAdminPageTitle,
} from "@/lib/admin/navigation";

/* jsdom lacks scrollIntoView, which cmdk invokes for keyboard navigation. */
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

/* Mutable mock state so individual tests can set role and pathname. */
let mockUser: { role: string; displayName?: string; email?: string } | null = null;
let mockIsLoading = false;
let mockIsAuthenticated = true;
let mockPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: React.ComponentProps<"img"> & { fill?: boolean; priority?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} data-testid="mock-next-image" {...props} />;
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    login: vi.fn(),
    registerUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

describe("Admin authorization semantics (mirror of backend RoleHierarchy/policies)", () => {
  it("normalizes administrator to admin like the backend RoleHierarchy", () => {
    expect(normalizeRole("Administrator")).toBe("admin");
    expect(normalizeRole(" SUPERADMIN ")).toBe("superadmin");
    expect(normalizeRole("exam_manager")).toBe("exam_manager");
    expect(normalizeRole("")).toBe("candidate");
    expect(normalizeRole(undefined)).toBe("candidate");
    expect(normalizeRole(null)).toBe("candidate");
  });

  it("grants shell access to all administrative roles", () => {
    for (const role of ["superadmin", "admin", "administrator", "manager", "content_manager", "exam_manager", "reviewer", "instructor"]) {
      expect(isPrivilegedRole(role), `role: ${role}`).toBe(true);
    }
  });

  it("denies shell access to students", () => {
    expect(isPrivilegedRole("candidate")).toBe(false);
    expect(isPrivilegedRole("")).toBe(false);
    expect(isPrivilegedRole(undefined)).toBe(false);
  });

  it("restricts subscription-plan administration to RequireAdmin-policy roles only", () => {
    // Verified backend authorization semantics (AdminSubscriptionsController
    // RequireAdmin + BFF verifyAdminAuth ALLOWED_ADMIN_ROLES):
    for (const role of ["superadmin", "admin", "administrator", "manager", "content_manager"]) {
      expect(isSubscriptionAdmin(role), `role: ${role}`).toBe(true);
    }
    // P0 regression semantics: these roles must NOT manage subscription plans.
    for (const role of ["reviewer", "instructor", "exam_manager", "candidate"]) {
      expect(isSubscriptionAdmin(role), `role: ${role}`).toBe(false);
    }
  });

  it("builds capabilities per role consistently", () => {
    expect(getAdminCapabilities("superadmin")).toMatchObject({
      canViewOverview: true,
      canManageSubscriptions: true,
      canViewQuestionTypes: true,
    });
    expect(getAdminCapabilities("reviewer")).toMatchObject({
      canViewOverview: true,
      canManageSubscriptions: false,
      canViewQuestionTypes: true,
    });
    expect(getAdminCapabilities("candidate")).toMatchObject({
      canViewOverview: false,
      canManageSubscriptions: false,
      canViewQuestionTypes: false,
    });
  });
});

describe("Admin navigation configuration", () => {
  it("only lists routes that exist (no placeholder links)", () => {
    const hrefs = getAuthorizedNavItems(getAdminCapabilities("superadmin")).map((n) => n.href);
    expect(hrefs).not.toContain("/admin/programmes");
    expect(hrefs).not.toContain("/admin/questions");
    expect(hrefs).not.toContain("/admin/exams");
    expect(hrefs).not.toContain("/admin/users");
    expect(hrefs).not.toContain("/admin/audit-logs");
    expect(hrefs).toEqual(
      expect.arrayContaining(["/admin", "/admin/question-types", "/admin/subscriptions"])
    );
  });

  it("hides capability-gated groups when the role lacks the capability", () => {
    const adminItems = getAuthorizedNavItems(getAdminCapabilities("superadmin"));
    expect(adminItems.some((i) => i.id === "subscription-plans")).toBe(true);

    const reviewerGroups = getAuthorizedNavGroups(getAdminCapabilities("reviewer"));
    const reviewerItems = reviewerGroups.flatMap((g) => g.items);
    expect(reviewerItems.some((i) => i.id === "subscription-plans")).toBe(false);
    // QA/reviewer focus: overview and question types still available.
    expect(reviewerItems.some((i) => i.id === "dashboard")).toBe(true);
    expect(reviewerItems.some((i) => i.id === "question-types")).toBe(true);
  });

  it("derives breadcrumbs and page titles from the pathname", () => {
    expect(getAdminBreadcrumbs("/admin")).toEqual([{ label: "Admin", href: "/admin" }]);
    expect(getAdminBreadcrumbs("/admin/subscriptions")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Subscription Plans", href: "/admin/subscriptions" },
    ]);
    expect(getAdminPageTitle("/admin")).toBe("Platform Governance Dashboard");
    expect(getAdminPageTitle("/admin/subscriptions")).toBe("Subscription Plan Management");
    expect(getAdminPageTitle("/admin/question-types")).toBe("Question-Type Registry");
  });
});

describe("AdminShell rendering by role", () => {
  beforeEach(() => {
    mockUser = { role: "admin", displayName: "Ops Admin", email: "ops@prepford.com" };
    mockIsLoading = false;
    mockIsAuthenticated = true;
    mockPathname = "/admin";
  });

  it("renders the shell with role-aware navigation for administrators", () => {
    render(
      <AdminShell>
        <p>Overview content</p>
      </AdminShell>
    );

    expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Subscription Plans")).toBeInTheDocument();
    expect(screen.getByText("Question-Type Registry")).toBeInTheDocument();
    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getByLabelText("Account menu — Administrator")).toBeInTheDocument();
  });

  it("hides subscription plan navigation for reviewer/instructor (P2 reviewer consistency fix)", () => {
    mockUser = { role: "reviewer", displayName: "Dr Reviewer" };
    render(
      <AdminShell>
        <p>Overview content</p>
      </AdminShell>
    );

    expect(screen.getByRole("navigation", { name: "Admin navigation" })).toBeInTheDocument();
    expect(screen.queryByText("Subscription Plans")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("updates the active navigation item based on the current pathname", () => {
    mockPathname = "/admin/subscriptions";
    render(
      <AdminShell>
        <p>Subscriptions content</p>
      </AdminShell>
    );

    const activeLink = screen.getByRole("link", { name: /Subscription Plans/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");
    const overviewLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(overviewLink).not.toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Subscription Plan Management")).toBeInTheDocument();
  });

  it("renders the Restricted Privilege Level gate for student accounts", () => {
    mockUser = { role: "candidate", displayName: "Jane Student" };
    render(
      <AdminShell>
        <p>Overview content</p>
      </AdminShell>
    );

    expect(screen.getByRole("heading", { name: /Restricted Privilege Level/i })).toBeInTheDocument();
    expect(screen.getByText(/does not hold administrative access/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Admin navigation" })).not.toBeInTheDocument();
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
  });

  it("renders the authentication gate for signed-out visitors", () => {
    mockUser = null;
    mockIsAuthenticated = false;
    render(
      <AdminShell>
        <p>Overview content</p>
      </AdminShell>
    );

    expect(
      screen.getByRole("heading", { name: /Administrative Authentication Required/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign In as Administrator/i })).toHaveAttribute(
      "href",
      "/sign-in"
    );
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
  });

  it("keeps the branded loading state while the session is resolving", () => {
    mockIsLoading = true;
    render(
      <AdminShell>
        <p>Overview content</p>
      </AdminShell>
    );

    // Chrome and page body are withheld until the session resolves.
    expect(screen.queryByText("Overview content")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Admin navigation" })).not.toBeInTheDocument();
  });
});

describe("Admin command palette", () => {
  it("lists only authorized navigation when open", () => {
    const items = getAuthorizedNavItems(getAdminCapabilities("superadmin"));
    render(
      <AdminCommandMenu open onOpenChange={() => {}} navItems={items} />
    );

    expect(screen.getByText("Subscription Plans")).toBeInTheDocument();
    expect(screen.getByText("Switch to Student Workspace")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("omits unauthorized navigation from the palette", () => {
    const items = getAuthorizedNavItems(getAdminCapabilities("exam_manager"));
    render(
      <AdminCommandMenu open onOpenChange={() => {}} navItems={items} />
    );

    expect(screen.queryByText("Subscription Plans")).not.toBeInTheDocument();
    expect(screen.getByText("Question-Type Registry")).toBeInTheDocument();
  });
});

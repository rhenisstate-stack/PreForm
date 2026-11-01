"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/brand";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { formatRoleTitle } from "@/components/layout/personalized-welcome";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { NotificationPanel } from "@/components/layout/notification-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  getAdminCapabilities,
  isPrivilegedRole,
} from "@/lib/admin/authz";
import {
  getAdminBreadcrumbs,
  getAdminPageTitle,
  getAuthorizedNavGroups,
  type NavGroup,
} from "@/lib/admin/navigation";
import { AdminCommandMenu, AdminSearchTrigger } from "@/components/admin/admin-command-menu";

const SIDEBAR_COLLAPSE_KEY = "prepford.admin.sidebar.collapsed";

/**
 * External-store-backed sidebar collapse preference. Persisted in localStorage;
 * `useSyncExternalStore` keeps the client/server snapshot consistent without
 * setState-in-effect.
 */
const sidebarPrefListeners = new Set<() => void>();

function subscribeSidebarPref(callback: () => void) {
  sidebarPrefListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    sidebarPrefListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSidebarPrefSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

function getSidebarPrefServerSnapshot(): boolean {
  return false;
}

function setSidebarPref(value: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(value));
  } catch {
    // Storage unavailable — preference applies for this session only.
  }
  sidebarPrefListeners.forEach((listener) => listener());
}

/* ─────────────────────────────── Navigation ─────────────────────────────── */

interface SidebarNavProps {
  groups: NavGroup[];
  pathname: string;
  collapsed?: boolean;
  onNavigateMobile?: () => void;
}

function isActiveRoute(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  groups,
  pathname,
  collapsed = false,
  onNavigateMobile,
}: SidebarNavProps) {
  return (
    <nav aria-label="Admin navigation" className="flex-1 space-y-4 overflow-y-auto px-2">
      {groups.map((group) => (
        <CollapsibleNavGroup
          key={group.id}
          group={group}
          pathname={pathname}
          collapsed={collapsed}
          onNavigateMobile={onNavigateMobile}
        />
      ))}
    </nav>
  );
}

function defaultGroupExpanded(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isActiveRoute(item.href, pathname));
}

function CollapsibleNavGroup({
  group,
  pathname,
  collapsed,
  onNavigateMobile,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onNavigateMobile?: () => void;
}) {
  // null = derive from the active route; otherwise the user's explicit choice.
  const [userChoice, setUserChoice] = React.useState<boolean | null>(null);
  const expanded = userChoice ?? defaultGroupExpanded(group, pathname);

  return (
    <div>
      {!collapsed && (
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          aria-controls={`admin-nav-group-${group.id}`}
          onClick={() => setUserChoice(!expanded)}
        >
          {group.label}
          <ChevronDown
            aria-hidden="true"
            className={`h-3 w-3 transition-transform motion-safe:duration-200 ${expanded ? "" : "-rotate-90"}`}
          />
        </button>
      )}
      <div
        id={`admin-nav-group-${group.id}`}
        className={`space-y-1 ${expanded ? "" : "hidden"}`}
      >
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(item.href, pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigateMobile}
              title={collapsed ? item.title : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                collapsed ? "justify-center px-2" : ""
              } ${
                active
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
              {collapsed && <span className="sr-only">{item.title}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Sidebar ────────────────────────────────── */

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-3 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      aria-label={collapsed ? "PrepFord Admin Workspace" : undefined}
    >
      <Image
        src={BRAND.logo.assetPath}
        alt={BRAND.logo.alt}
        width={44}
        height={44}
        className="h-11 w-11 rounded-xl object-contain shrink-0"
      />
      {!collapsed && (
        <span>
          <span className="flex flex-col font-serif font-bold tracking-tight leading-[0.95]">
            <span className="text-base text-secondary">Prep</span>
            <span className="text-base text-foreground">Ford</span>
          </span>
          <span className="block text-[10px] font-mono uppercase tracking-widest text-secondary font-semibold mt-0.5">
            Admin Workspace
          </span>
        </span>
      )}
    </Link>
  );
}

interface SidebarInnerProps {
  groups: NavGroup[];
  pathname: string;
  displayName: string;
  roleTitle: string;
  collapsed?: boolean;
  onNavigateMobile?: () => void;
}

function SidebarInner({
  groups,
  pathname,
  displayName,
  roleTitle,
  collapsed = false,
  onNavigateMobile,
}: SidebarInnerProps) {
  return (
    <>
      <SidebarBrand collapsed={collapsed} />
      <div
        className={`rounded-xl bg-muted/45 p-3 ${collapsed ? "hidden" : "space-y-1"}`}
      >
        <p className="text-xs font-semibold text-foreground truncate" title={displayName}>
          {displayName}
        </p>
        <span className="inline-flex items-center gap-1 rounded-sm bg-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
          <ShieldCheck aria-hidden="true" className="h-2.5 w-2.5" />
          {roleTitle}
        </span>
      </div>
      <SidebarNav groups={groups} pathname={pathname} collapsed={collapsed} />
      <div className="mt-auto pt-6">
        <Link
          href="/dashboard"
          onClick={onNavigateMobile}
          className={`flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <BookOpen aria-hidden="true" className="h-3 w-3 shrink-0" />
          {!collapsed && (
            <>
              <span>Switch to Student View</span>
              <ArrowRight aria-hidden="true" className="h-3 w-3" />
            </>
          )}
          {collapsed && <span className="sr-only">Switch to Student View</span>}
        </Link>
      </div>
    </>
  );
}

/* ──────────────────────────────── Shell ─────────────────────────────────── */

export function AdminShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const pathname = usePathname() ?? "/admin";

  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const collapsed = React.useSyncExternalStore(
    subscribeSidebarPref,
    getSidebarPrefSnapshot,
    getSidebarPrefServerSnapshot
  );

  // Global command palette shortcut.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ── Auth gates (display-only; backend remains authoritative) ── */

  if (isLoading) {
    return <BrandedLoading message="Verifying administrative credentials..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
          Administrative Authentication Required
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Please sign in with authorized administrator credentials to access platform governance and curriculum controls.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign In as Administrator
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const roleTitle = formatRoleTitle(user.role);
  const displayName = user.displayName || user.name || "Administrator";
  const capabilities = getAdminCapabilities(user.role);
  const authorized = isPrivilegedRole(user.role);

  if (!authorized || !capabilities.canViewOverview) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-6">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
          Restricted Privilege Level
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Your current account role (<strong>{roleTitle}</strong>) does not hold administrative access to platform governance.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go to Student Workspace
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-input px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  /* ── Authorized shell ── */

  const navGroups = getAuthorizedNavGroups(capabilities);
  const navItems = navGroups.flatMap((g) => g.items);
  const crumbs = getAdminBreadcrumbs(pathname);
  const pageTitle = getAdminPageTitle(pathname);

  const toggleCollapsed = () => {
    setSidebarPref(!collapsed);
  };

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-dvh shrink-0 bg-card p-4 space-y-6 shadow-xs transition-[width] motion-safe:duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarInner
          groups={navGroups}
          pathname={pathname}
          displayName={displayName}
          roleTitle={roleTitle}
          collapsed={collapsed}
        />
      </aside>

      {/* Mobile navigation drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-72 bg-card p-4 flex flex-col gap-6">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Admin navigation menu</SheetTitle>
          </SheetHeader>
          <SidebarInner
            groups={navGroups}
            pathname={pathname}
            displayName={displayName}
            roleTitle={roleTitle}
            collapsed={false}
            onNavigateMobile={() => setIsMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Command palette */}
      <AdminCommandMenu
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        navItems={navItems}
      />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Admin header */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={isMobileOpen}
              onClick={() => setIsMobileOpen(true)}
            >
              <span aria-hidden="true" className="flex flex-col gap-1">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </button>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Breadcrumbs + context */}
            <div className="min-w-0 flex-1">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {crumbs.map((crumb, index) => {
                  const isLast = index === crumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.href}>
                      {index > 0 && <span aria-hidden="true">/</span>}
                      {isLast ? (
                        <span className="text-foreground font-medium" aria-current="page">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                {pageTitle}
              </h1>
            </div>

            {/* Search */}
            <AdminSearchTrigger onOpen={() => setIsCommandOpen(true)} />

            <div className="flex items-center gap-1">
              <NotificationPanel />
              <ThemeSwitcher />
              <AdminAccountMenu
                displayName={displayName}
                email={user.email ?? ""}
                roleTitle={roleTitle}
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminAccountMenu({
  displayName,
  email,
  roleTitle,
}: {
  displayName: string;
  email: string;
  roleTitle: string;
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full bg-muted/60 px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Account menu — ${roleTitle}`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
            {initial}
          </span>
          <span className="hidden md:inline max-w-28 truncate">{displayName}</span>
          <span className="hidden md:inline-flex items-center rounded-sm bg-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
            {roleTitle}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
            <UserRound className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <BookOpen className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
            <span>Student Workspace</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleLogout()}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

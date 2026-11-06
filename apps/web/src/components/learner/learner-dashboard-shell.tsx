"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bell,
  BookOpen,
  ClipboardCheck,
  Compass,
  FileQuestion,
  FileText,
  GraduationCap,
  HeartPulse,
  History,
  Layers,
  Menu,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  UserCheck,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { BRAND } from "@/lib/brand";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

export interface LearnerDashboardShellProps {
  children: React.ReactNode;
  activeNav?: string;
  breadcrumbPageTitle?: string;
}

export function LearnerDashboardShell({
  children,
  activeNav,
  breadcrumbPageTitle,
}: LearnerDashboardShellProps) {
  const pathname = usePathname();
  const auth = useAuth();
  const cart = useCart();

  const user = auth?.user;
  const learnerName = user?.displayName || user?.name || "Nursing Candidate";
  const rawPathway = user?.pathway || "rn";
  const [selectedPathway, setSelectedPathway] = React.useState<"rn" | "pn">(
    rawPathway === "pn" ? "pn" : "rn"
  );
  const activePathway = selectedPathway;
  const pathwayLabel = activePathway === "pn" ? "NCLEX-PN Candidate" : "NCLEX-RN Candidate";

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState<boolean>(false);

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const cartItemCount = cart?.itemCount ?? 0;
  const isSecurityActive = activeNav === "security" || pathname === "/dashboard/settings/security";

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-teal-500/20 selection:text-teal-700 dark:selection:text-teal-300">
      {/* Mobile Sidebar Backdrop */}
      {mobileDrawerOpen && (
        <div
          data-testid="mobile-sidebar-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        data-testid="learner-sidebar"
        aria-label="Learner Workspace Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-card border-r border-border text-foreground dark:bg-[#07161C] dark:border-[#153441] dark:text-slate-100 transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? "w-20" : "w-64"
        } ${mobileDrawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border dark:border-[#153441]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            title="PrepFord Learner Workspace"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo.assetPath}
              alt={BRAND.logo.alt}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-contain shrink-0 bg-muted/60 dark:bg-white/10 p-1 border border-border/60 dark:border-white/10"
            />
            {!sidebarCollapsed && (
              <span className="flex flex-col leading-none">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-600 dark:text-teal-300/70">
                  {BRAND.name}
                </span>
                <span className="text-base font-serif font-bold text-foreground dark:text-white mt-0.5">
                  NCLEX Portal
                </span>
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            data-testid="sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${sidebarCollapsed ? "" : "rotate-180"}`}
            />
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {/* Action: Create Test Now */}
          <div className="px-1">
            <Link
              href="/dashboard"
              data-testid="sidebar-create-test-btn"
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-98 text-slate-950 font-semibold text-sm transition-all shadow-md py-2.5 px-3 ${
                sidebarCollapsed ? "px-2" : ""
              }`}
              title="Create Test Now"
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
              {!sidebarCollapsed && <span>+ Create Test Now</span>}
            </Link>
          </div>

          {/* Group 1: LEARN */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Learn
              </div>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Dashboard"
            >
              <Compass className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              href="/nclex-rn"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="NCLEX-RN"
            >
              <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>NCLEX-RN</span>}
            </Link>
            <Link
              href="/nclex-pn"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="NCLEX-PN"
            >
              <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>NCLEX-PN</span>}
            </Link>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Study Guides"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Study Guides</span>}
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Practice Activities"
            >
              <FileQuestion className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Practice Activities</span>}
            </Link>
          </div>

          {/* Group 1b: AI STUDY STUDIO */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                AI Study Studio
              </div>
            )}
            <Link
              href="/dashboard/study"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="AI Study Studio Overview"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {!sidebarCollapsed && <span>Study Studio</span>}
            </Link>
            <Link
              href="/dashboard/study/review"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Flashcard review session"
            >
              <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Review Flashcards</span>}
            </Link>
            <Link
              href="/dashboard/study/flashcards"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Flashcard decks"
            >
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Flashcard Decks</span>}
            </Link>
            <Link
              href="/dashboard/study/quizzes"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Quick topic drills"
            >
              <FileQuestion className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Topic Quizzes</span>}
            </Link>
          </div>

          {/* Group 2: TEST BANK & ASSESSMENTS */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Test Bank & Assessments
              </div>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Tutored CATs"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              {!sidebarCollapsed && <span>Tutored CATs</span>}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Readiness Assessment Tests (RAT)"
            >
              <HeartPulse className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Readiness Tests (RAT)</span>}
            </Link>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Test-Taking Strategies"
            >
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Test-Taking Strategies</span>}
            </Link>
          </div>

          {/* Group 3: REPORTS */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Reports
              </div>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Previous Tests"
            >
              <History className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Previous Tests</span>}
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Statistics"
            >
              <BarChart2 className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Statistics</span>}
            </Link>
          </div>

          {/* Group 4: ACCOUNT & SETTINGS */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-teal-300/60 font-mono">
                Account
              </div>
            )}
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Profile & Settings"
            >
              <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Profile & Settings</span>}
            </Link>
            <Link
              href="/dashboard/settings/security"
              data-testid="sidebar-nav-security"
              aria-current={isSecurityActive ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSecurityActive
                  ? "text-teal-700 bg-teal-500/10 font-semibold shadow-2xs dark:text-teal-300 dark:bg-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
              }`}
              title="Security & Devices"
            >
              <ShieldCheck
                className={`h-4 w-4 shrink-0 ${isSecurityActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground dark:text-slate-400"}`}
              />
              {!sidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Security & Devices</span>
                  {isSecurityActive && (
                    <span className="text-[10px] bg-teal-500/20 text-teal-700 dark:text-teal-300 font-mono px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
              )}
            </Link>
            <Link
              href="/cart"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Cart"
            >
              <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>Cart</span>
                  {cartItemCount > 0 && (
                    <span className="text-[10px] bg-teal-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                      {cartItemCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              title="Learning Notes"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground dark:text-slate-400" />
              {!sidebarCollapsed && <span>Learning Notes</span>}
            </Link>
          </div>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-border dark:border-[#153441] bg-muted/40 dark:bg-[#0A1D25]">
          <div className="flex items-center gap-3">
            <LearnerAvatar
              picture={user?.picture}
              name={learnerName}
              sizeClassName="h-9 w-9"
              fallbackClassName="bg-teal-600/30 text-teal-700 dark:text-teal-300 border-teal-500/40"
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground dark:text-slate-200 truncate">{learnerName}</p>
                <p className="text-[11px] text-teal-600 dark:text-teal-400/80 truncate font-mono uppercase">
                  {pathwayLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Compact Top Header */}
        <header
          data-testid="dashboard-header"
          className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-card/95 backdrop-blur-md border-b border-border shadow-2xs"
        >
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="mobile-sidebar-toggle"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <nav
              data-testid="dashboard-breadcrumbs"
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/profile" className="hover:text-foreground transition-colors">
                Settings
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium" aria-current="page">
                {breadcrumbPageTitle || "Security & Sessions"}
              </span>
            </nav>
          </div>

          {/* Right: Pathway Switcher, Theme Switcher, Cart & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pathway focus toggles */}
            <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                data-testid="dashboard-pathway-rn"
                aria-pressed={activePathway === "rn"}
                onClick={() => setSelectedPathway("rn")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activePathway === "rn"
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NCLEX-RN
              </button>
              <button
                type="button"
                data-testid="dashboard-pathway-pn"
                aria-pressed={activePathway === "pn"}
                onClick={() => setSelectedPathway("pn")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activePathway === "pn"
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                NCLEX-PN
              </button>
            </div>

            {/* Cart Link */}
            <Link
              href="/cart"
              data-testid="dashboard-cart-link"
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Notifications Bell */}
            <button
              type="button"
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-card" />
            </button>

            {/* Theme switcher */}
            <ThemeSwitcher />

            {/* Learner Avatar Chip */}
            <Link
              href="/profile"
              data-testid="learner-account-menu"
              className="flex items-center gap-2 pl-2 border-l border-border hover:opacity-90 transition-opacity"
            >
              <LearnerAvatar
                picture={user?.picture}
                name={learnerName}
                sizeClassName="h-8 w-8"
                alt={`${learnerName} — profile & settings`}
              />
              <span className="hidden md:inline-block text-xs font-semibold text-foreground max-w-[100px] truncate">
                {learnerName}
              </span>
            </Link>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

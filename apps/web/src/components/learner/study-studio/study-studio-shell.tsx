"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  FileQuestion,
  Layers,
  Menu,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/brand";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

/**
 * Shared authenticated shell for the PrepFord AI Study Studio routes
 * (`/dashboard/study/*`). Mirrors the learner dashboard's persistent dark
 * teal sidebar + compact header so navigation feels continuous.
 */

const STUDY_NAV_ITEMS = [
  { href: "/dashboard/study", label: "Studio Overview", icon: Sparkles, exact: true },
  { href: "/dashboard/study/flashcards", label: "Flashcard Decks", icon: Layers, exact: false },
  { href: "/dashboard/study/review", label: "Review Session", icon: RotateCcw, exact: true },
  { href: "/dashboard/study/quizzes", label: "Topic Quizzes", icon: FileQuestion, exact: true },
] as const;

export function StudyStudioShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();

  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) {
    return <BrandedLoading message="Loading PrepFord AI Study Studio..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div data-testid="study-studio-unauthenticated" className="w-full py-24 px-4 text-center bg-background">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-6">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-3">
          Sign In Required
        </h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-md mx-auto leading-relaxed">
          The AI Study Studio is part of your authenticated learner workspace. Please sign in to access
          your flashcard decks, spaced-repetition review queue and topic drills.
        </p>
        <Link
          href="/sign-in?from=/dashboard/study"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <span>Sign In to Study Studio</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const learnerName = user.displayName || user.name || "Candidate";

  return (
    <div data-testid="study-studio-shell" className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground">
      {/* Mobile drawer backdrop */}
      {mobileDrawerOpen && (
        <div
          data-testid="study-studio-mobile-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Persistent dark teal sidebar (desktop) */}
      <aside
        data-testid="study-studio-sidebar"
        aria-label="Study Studio Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#0C232C] dark:bg-[#07161C] text-slate-100 border-r border-[#153441] transition-transform duration-200 ease-in-out ${
          mobileDrawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand header — returns to the full learner dashboard */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#153441]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label="Back to learner dashboard"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND.logo.assetPath}
              alt={BRAND.logo.alt}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-contain shrink-0 bg-white/10 p-1"
            />
            <span className="flex flex-col leading-none">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300/70">
                {BRAND.name}
              </span>
              <span className="text-sm font-serif font-bold text-white mt-0.5">AI Study Studio</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {/* Back to dashboard */}
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-teal-200 hover:text-white hover:bg-white/5 transition-colors border-b border-[#153441] pb-3"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-teal-400" />
              <span>Learner Dashboard</span>
            </Link>
          </div>

          {/* Study Studio navigation */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-teal-300/60 font-mono">
              AI Study Studio
            </div>
            {STUDY_NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-teal-300 bg-white/10"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-teal-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Curated companion resources */}
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-teal-300/60 font-mono">
              Reference Materials
            </div>
            <Link
              href="/study-guide"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Curated Study Guides</span>
            </Link>
          </div>

          {/* Phase transparency note */}
          <div className="mx-1 rounded-xl border border-teal-500/25 bg-teal-500/10 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal-300 font-mono">
              <ShieldCheck className="h-3.5 w-3.5" />
              Phase 1 Scope
            </div>
            <p className="text-[11px] text-teal-100/80 leading-relaxed">
              Personal flashcards with server-side spaced-repetition scheduling, curated-guide card
              generation and quick topic drills. The context-aware AI tutor and AI auto-generation
              from uploaded documents are planned for a later phase.
            </p>
          </div>
        </div>

        {/* Sidebar footer identity */}
        <div className="p-3 border-t border-[#153441] bg-[#0A1D25]">
          <div className="flex items-center gap-3">
            <LearnerAvatar
              picture={user.picture}
              name={learnerName}
              sizeClassName="h-9 w-9"
              fallbackClassName="bg-teal-600/30 text-teal-300 border-teal-500/40"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{learnerName}</p>
              <p className="text-[11px] text-teal-400/80 truncate font-mono uppercase">
                {user.pathway === "pn" ? "NCLEX-PN" : "NCLEX-RN"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Compact top header */}
        <header
          data-testid="study-studio-header"
          className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-card/95 backdrop-blur-md border-b border-border shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav data-testid="study-studio-breadcrumbs" aria-label="Breadcrumbs" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                <Compass className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">AI Study Studio</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Link
              href="/profile"
              className="flex items-center gap-2 pl-2 border-l border-border hover:opacity-90 transition-opacity"
            >
              <LearnerAvatar
                picture={user.picture}
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

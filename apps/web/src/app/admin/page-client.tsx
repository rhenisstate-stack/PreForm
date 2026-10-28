"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  GraduationCap,
  FileQuestion,
  Layers,
  Award,
  Users,
  History,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { BRAND } from "@/lib/brand";
import { formatRoleTitle } from "@/components/layout/personalized-welcome";

const adminNavItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, current: true },
  { label: "Programmes & Courses", href: "/admin/programmes", icon: GraduationCap, current: false },
  { label: "Question-Type Registry (18)", href: "/admin/question-types", icon: Layers, current: false },
  { label: "Question Repository", href: "/admin/questions", icon: FileQuestion, current: false },
  { label: "Exams & CAT Config", href: "/admin/exams", icon: Award, current: false },
  { label: "Users & RBAC", href: "/admin/users", icon: Users, current: false },
  { label: "Security Audit Logs", href: "/admin/audit-logs", icon: History, current: false },
];

export function AdminOverviewClient() {
  const auth = useAuth();
  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  if (isLoading) {
    return <BrandedLoading message="Verifying administrative credentials..." fullScreen />;
  }

  // Not signed in
  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
          Administrative Authentication Required
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Please sign in with authorized administrator credentials to access platform governance and curriculum controls.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Sign In as Administrator
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Candidate / student role block
  const userRole = (user.role || "").toLowerCase();
  const isPrivileged =
    userRole.includes("admin") ||
    userRole.includes("manager") ||
    userRole.includes("reviewer") ||
    userRole.includes("superadmin");

  if (!isPrivileged) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
          Restricted Privilege Level
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Your current account role (<strong>{formatRoleTitle(user.role)}</strong>) does not hold administrative access to platform governance.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Go to Student Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-input px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Administrative Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card p-4 space-y-6">
        <div className="flex items-center gap-2.5 px-2">
          <Image
            src={BRAND.logo.assetPath}
            alt={BRAND.logo.alt}
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain border border-border"
          />
          <div>
            <span className="font-serif font-bold text-foreground text-lg leading-none">
              {BRAND.name}
            </span>
            <span className="block text-[10px] font-mono uppercase tracking-widest text-secondary font-semibold">
              Admin Workspace
            </span>
          </div>
        </div>

        {/* User Pill */}
        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground truncate">
            {user.displayName || user.name}
          </p>
          <span className="inline-flex items-center gap-1 rounded-sm bg-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
            <ShieldCheck className="h-2.5 w-2.5" />
            {formatRoleTitle(user.role)}
          </span>
        </div>

        {/* Sidebar Nav */}
        <nav className="space-y-1" aria-label="Admin navigation">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  item.current
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            <span>Switch to Student View</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Admin</span>
              <span>/</span>
              <span className="text-foreground font-medium">Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
              Platform Governance Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/question-types"
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground shadow-xs hover:bg-secondary/90 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              View 18 Question Types
            </Link>
            <Link
              href="/admin/questions"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Question Draft
            </Link>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Candidate Cohort</span>
              <Users className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">
              1,280
            </p>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              94% active study engagements
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Question Repository</span>
              <FileQuestion className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">
              2,450
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Across 18 validated question formats
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Review Queue</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">
              14
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
              Awaiting nurse educator approval
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Published Exams</span>
              <Award className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">
              12
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              CAT, Mock, and Diagnostic forms
            </p>
          </div>
        </div>

        {/* Quick Link Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-semibold text-foreground text-lg">
                Curriculum Structure
              </h2>
              <Link href="/admin/programmes" className="text-xs font-semibold text-secondary hover:underline">
                Manage Hierarchy →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Programmes (NCLEX-RN & NCLEX-PN) organize courses, official NCSBN Client Need domains, categories, subcategories, and learning topics.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold font-serif text-foreground">2</p>
                <p className="text-[11px] text-muted-foreground">Programmes (RN/PN)</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold font-serif text-foreground">8</p>
                <p className="text-[11px] text-muted-foreground">Clinical Domains</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-semibold text-foreground text-lg">
                Security & Role-Based Access
              </h2>
              <Link href="/admin/users" className="text-xs font-semibold text-secondary hover:underline">
                Manage Roles →
              </Link>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enforce server-side permissions: Super Admin, Administrator, Content Manager, Exam Manager, Question Reviewer, Instructor, and Student.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold font-serif text-foreground">7</p>
                <p className="text-[11px] text-muted-foreground">Defined System Roles</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold font-serif text-foreground">100%</p>
                <p className="text-[11px] text-muted-foreground">Audit Log Coverage</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Type Registry Showcase Banner */}
        <div className="rounded-2xl border border-secondary/30 bg-linear-to-r from-secondary/10 via-card to-background p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                18 Formats Verified
              </span>
              <h3 className="text-base font-serif font-semibold text-foreground">
                Configurable Question-Type Registry
              </h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl">
              Inspect the 18 question types catalogued for traditional NCLEX and Next Generation NCLEX (NGN) clinical judgment assessments.
            </p>
          </div>
          <Link
            href="/admin/question-types"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            Review Question Types <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}

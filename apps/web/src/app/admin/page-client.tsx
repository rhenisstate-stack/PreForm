"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  FileQuestion,
  Layers,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

/**
 * Admin overview content. The shared admin chrome (sidebar, breadcrumbs,
 * header, auth gates) is provided by `AdminShell` — this component renders
 * only the page body. Metrics become data-driven with explicit unavailable
 * states during P2 (they must not present arbitrary frontend assumptions as
 * production figures).
 */
export function AdminOverviewClient() {
  return (
    <div className="space-y-8">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Candidate Cohort</span>
            <Users className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <p className="text-2xl font-serif font-bold text-foreground">
            1,280
          </p>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            94% active study engagements
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Question Repository</span>
            <FileQuestion className="h-4 w-4 text-primary" aria-hidden="true" />
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
            <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
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
            <Award className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <p className="text-2xl font-serif font-bold text-foreground">
            12
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            CAT, Mock, and Diagnostic forms
          </p>
        </div>
      </div>

      {/* Quick modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <h2 className="font-serif font-semibold text-foreground text-lg">
            Curriculum Structure
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Programmes (NCLEX-RN & NCLEX-PN) organize courses, official NCSBN Client Need domains, categories, subcategories, and learning topics. Programme and course administration arrives with the academic management module.
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
          <h2 className="font-serif font-semibold text-foreground text-lg">
            Security &amp; Role-Based Access
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Server-side authorization is enforced by the ASP.NET Core backend: Super Admin, Administrator, Content Manager, Exam Manager, Question Reviewer, Instructor, and Student. User and audit administration arrives with the administration module.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold font-serif text-foreground">7</p>
              <p className="text-[11px] text-muted-foreground">Defined System Roles</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
              <p className="text-xl font-semibold text-foreground font-serif text-sm pt-2">01</p>
              <p className="text-[11px] text-muted-foreground">Guarded admin endpoints (P0)</p>
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
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Review Question Types <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import type { AuthUser } from "@/lib/auth-context";

interface PersonalizedWelcomeProps {
  user: AuthUser;
  destinationLabel?: string;
  destinationHref?: string;
  onDismiss?: () => void;
}

export function formatRoleTitle(role?: string): string {
  if (!role) return "Candidate";
  const normalized = role.toLowerCase().replace(/[-_]/g, " ");
  switch (normalized) {
    case "super admin":
    case "superadmin":
      return "Super Administrator";
    case "admin":
    case "administrator":
      return "Administrator";
    case "content manager":
      return "Content Manager";
    case "exam manager":
      return "Exam Manager";
    case "question reviewer":
      return "Question Reviewer";
    case "instructor":
      return "Instructor";
    case "student":
    case "candidate":
    default:
      return "Candidate";
  }
}

export function getAuthorizedWorkspace(role?: string): { path: string; label: string; isAdmin: boolean } {
  const normalized = (role || "").toLowerCase();
  if (
    normalized.includes("admin") ||
    normalized.includes("manager") ||
    normalized.includes("reviewer")
  ) {
    return { path: "/admin", label: "Administrator Workspace", isAdmin: true };
  }
  return { path: "/dashboard", label: "Student Study Workspace", isAdmin: false };
}

export function PersonalizedWelcome({
  user,
  destinationLabel,
  destinationHref,
  onDismiss,
}: PersonalizedWelcomeProps) {
  const roleTitle = formatRoleTitle(user.role);
  const workspace = getAuthorizedWorkspace(user.role);
  const effectiveHref = destinationHref || workspace.path;
  const effectiveLabel = destinationLabel || `Open ${workspace.label}`;

  return (
    <section
      aria-label="Welcome banner"
      className="relative overflow-hidden rounded-2xl border border-secondary/20 bg-linear-to-r from-secondary/10 via-card to-background p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 border border-secondary/30 px-3 py-0.5 text-xs font-semibold text-secondary">
              <Sparkles className="h-3.5 w-3.5" />
              Verified Session
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {workspace.isAdmin ? <ShieldCheck className="h-3 w-3 text-secondary" /> : <UserCheck className="h-3 w-3 text-secondary" />}
              {roleTitle}
            </span>
            {user.pathway && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold uppercase text-primary">
                NCLEX-{user.pathway.toUpperCase()}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground tracking-tight">
            Welcome back, {user.displayName || user.name || "Candidate"}.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your {workspace.label} is ready. Track clinical readiness, continue recent learning modules, and review question rationales.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={effectiveHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            {effectiveLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

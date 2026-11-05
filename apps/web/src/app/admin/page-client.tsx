"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  FileQuestion,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Activity,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import type { AdminOverviewMetrics } from "@/lib/api-services";

export function AdminOverviewClient() {
  const { isLoading, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = React.useState<AdminOverviewMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = React.useState(true);
  const [metricsError, setMetricsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    fetch("/api/admin/reports/overview")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted) return;
        if (data && data.success && data.data) {
          setMetrics(data.data);
        } else if (data && data.totalLearners !== undefined) {
          setMetrics(data);
        }
      })
      .catch((err) => {
        if (mounted) setMetricsError(err.message || "Failed to load overview");
      })
      .finally(() => {
        if (mounted) setMetricsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return <BrandedLoading message="Preparing admin workspace..." fullScreen={false} />;
  }

  return (
    <div className="space-y-8">
      {/* Overview Metric Cards - Live PostgreSQL Authoritative Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-overview-metrics">
        {/* Candidate Cohort */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Candidate Cohort</span>
            <Users className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <p className="text-2xl font-serif font-bold text-foreground">
            {metricsLoading ? "..." : (metrics?.totalLearners ?? 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {metricsLoading ? "Calculating..." : `${metrics?.activeLearners ?? 0} active (${metrics?.activeEngagementRate ?? 0}% rate)`}
          </p>
        </div>

        {/* Question Repository */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Question Repository</span>
            <FileQuestion className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <p className="text-2xl font-serif font-bold text-foreground">
            {metricsLoading ? "..." : (metrics?.totalQuestions ?? 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {metricsLoading ? "Checking..." : `${metrics?.publishedQuestions ?? 0} published across formats`}
          </p>
        </div>

        {/* Review Queue */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Review Queue</span>
            <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="text-2xl font-serif font-bold text-foreground">
            {metricsLoading ? "..." : (metrics?.reviewQueueCount ?? 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
            {metrics?.reviewQueueCount === 0 ? "Review queue clear" : "Items in draft or review workflow"}
          </p>
        </div>

        {/* Published Exams */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Exams</span>
            <Award className="h-4 w-4 text-secondary" aria-hidden="true" />
          </div>
          <p className="text-2xl font-serif font-bold text-foreground">
            {metricsLoading ? "..." : (metrics?.publishedExamsCount ?? 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {metricsLoading ? "Calculating..." : `${metrics?.totalCompletedAttempts ?? 0} completed (${metrics?.averageCohortScorePercent ?? 0}% avg)`}
          </p>
        </div>
      </div>

      {/* Quick Access Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-semibold text-foreground text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
              Reports &amp; Analytics Studio
            </h2>
            <Link
              href="/admin/reports"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Open Studio <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Examine system-wide assessment participation, score distributions across 10-point deciles, examination revision comparisons, and item-level distractor performance with CSV export controls.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/admin/reports"
              className="rounded-xl border border-border/80 bg-muted/30 p-3 hover:bg-muted/50 transition-colors text-center"
            >
              <p className="text-sm font-semibold text-foreground">Assessment Reports</p>
              <p className="text-[11px] text-muted-foreground">Pass rates &amp; duration</p>
            </Link>
            <Link
              href="/admin/reports?tab=questions"
              className="rounded-xl border border-border/80 bg-muted/30 p-3 hover:bg-muted/50 transition-colors text-center"
            >
              <p className="text-sm font-semibold text-foreground">Item Analysis</p>
              <p className="text-[11px] text-muted-foreground">Distractor diagnostics</p>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-semibold text-foreground text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" aria-hidden="true" />
              Platform System Health
            </h2>
            <Link
              href="/admin/monitoring"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Open Health <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Monitor real-time database round-trip latency, active candidate session concurrency, committed memory utilization, and trailing 24-hour security incident rates.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold font-serif text-emerald-600 dark:text-emerald-400">PostgreSQL</p>
              <p className="text-[11px] text-muted-foreground">Authoritative Store</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold font-serif text-foreground">8 Domains</p>
              <p className="text-[11px] text-muted-foreground">Client Needs Taxonomy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Layers,
  Plus,
  Palette,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface MonetizationOverviewTabProps {
  onNavigateTab: (tab: string) => void;
  canManagePlans: boolean;
}

export function MonetizationOverviewTab({ onNavigateTab, canManagePlans }: MonetizationOverviewTabProps) {
  // Fetch monetization analytics summary
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["admin-monetization-analytics-summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/monetization/analytics/summary");
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 60 * 1000,
  });

  // Fetch pending authorizations queue
  const {
    data: pendingAuthorizations = [],
    isLoading: isLoadingAuthorizations,
    refetch: refetchAuthorizations,
  } = useQuery({
    queryKey: ["admin-pending-authorizations-preview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/monetization/manual-authorizations?status=PendingVerification&pageSize=5");
      if (!res.ok) return [];
      const json = await res.json();
      return json.authorizations ?? [];
    },
    staleTime: 30 * 1000,
  });

  const isRefreshing = isLoadingAnalytics || isLoadingAuthorizations;

  const handleRefresh = () => {
    refetchAnalytics();
    refetchAuthorizations();
  };

  const grossCollections = analytics?.grossRevenue ?? 0;
  const netRevenue = analytics?.netRevenue ?? 0;
  const activeSubs = analytics?.activeSubscriptionsCount ?? 0;
  const pendingCount = analytics?.pendingVerificationCount ?? pendingAuthorizations.length ?? 0;
  const rnRevenue = analytics?.rnRevenue ?? 0;
  const pnRevenue = analytics?.pnRevenue ?? 0;
  const dualRevenue = analytics?.dualRevenue ?? 0;

  const totalCourseRev = rnRevenue + pnRevenue + dualRevenue || 1;
  const rnPct = Math.round((rnRevenue / totalCourseRev) * 100);
  const pnPct = Math.round((pnRevenue / totalCourseRev) * 100);
  const dualPct = Math.max(0, 100 - rnPct - pnPct);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border">
        <div>
          <h2 className="text-lg font-serif font-semibold text-foreground">
            Monetization Management &amp; Financial Governance
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Centralized control over subscription plans, offline payments authorization, backend entitlements, and revenue ledgers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 rounded-xl text-xs"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Ledger
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onNavigateTab("manual")}
            className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Gross Collections
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-foreground">
              ${grossCollections.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>All-time verified payments</span>
            </p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Net Realized
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-foreground">
              ${netRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Excludes refunds &amp; reversals
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Subscriptions
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-foreground">
              {activeSubs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-blue-500" />
              <span>Current active entitlements</span>
            </p>
          </CardContent>
        </Card>

        {/* Pending Verifications */}
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pending Verification
            </CardTitle>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
              pendingCount > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
            }`}>
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-serif font-bold text-foreground">
                {pendingCount}
              </div>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1.5 py-0">
                  Action Required
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("manual")}
              className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1 font-medium"
            >
              Review queue <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Course Revenue Split & Pending Authorizations Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pathway Breakdown */}
        <Card className="rounded-2xl border-border bg-card shadow-xs lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-serif font-semibold">
              Course Revenue Split
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of collections across NCLEX pathways
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">NCLEX-RN Pathway</span>
                <span className="text-muted-foreground">${rnRevenue.toLocaleString()} ({rnPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${rnPct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">NCLEX-PN Pathway</span>
                <span className="text-muted-foreground">${pnRevenue.toLocaleString()} ({pnPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pnPct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Dual-Access (RN &amp; PN)</span>
                <span className="text-muted-foreground">${dualRevenue.toLocaleString()} ({dualPct}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${dualPct}%` }} />
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onNavigateTab("analytics")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Detailed Revenue Analytics <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Offline Payments Queue Preview */}
        <Card className="rounded-2xl border-border bg-card shadow-xs lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-serif font-semibold">
                Offline Payments Awaiting Verification
              </CardTitle>
              <CardDescription className="text-xs">
                Manual bank transfers, M-Pesa, and cash payments needing verification
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("manual")}
              className="h-8 rounded-xl text-xs"
            >
              View All ({pendingCount})
            </Button>
          </CardHeader>
          <CardContent>
            {pendingAuthorizations.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">Queue Clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All recorded manual payments have been verified and activated.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {pendingAuthorizations.slice(0, 4).map((auth: any) => (
                  <div key={auth.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{auth.userName || auth.userEmail}</span>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {auth.paymentMethod}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        Ref: <span className="font-mono text-foreground font-medium">{auth.transactionReference || "None"}</span> • Plan: {auth.planName}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          ${auth.amount} {auth.currency}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {auth.recordedAt ? new Date(auth.recordedAt).toLocaleDateString() : ""}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onNavigateTab("manual")}
                        className="h-7 px-2.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab("plans")}
          className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors text-left flex items-start gap-3.5 group shadow-xs"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
              Subscription Plans
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Configure catalog pricing, RN/PN course isolation, billing intervals, and feature entitlements.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("appearance")}
          className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors text-left flex items-start gap-3.5 group shadow-xs"
        >
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
              Plan Appearance Editor
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Live responsive preview, typography customization, safe CSS controls, and WCAG AA contrast validation.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("learners")}
          className="p-5 rounded-2xl border border-border bg-card hover:bg-muted/30 transition-colors text-left flex items-start gap-3.5 group shadow-xs"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
              Learner Subscriptions
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Manage learner access lifecycles, extend validity, suspend accounts, and view authoritative entitlements.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

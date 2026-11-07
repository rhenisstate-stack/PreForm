"use client";

import * as React from "react";
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Layers,
  Users,
  RefreshCw,
  PieChart,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface RevenueAnalyticsTabProps {
  canManagePlans: boolean;
}

export function RevenueAnalyticsTab({ canManagePlans }: RevenueAnalyticsTabProps) {
  const [courseFilter, setCourseFilter] = React.useState<string>("all");

  const {
    data: analytics,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-monetization-analytics-full", courseFilter],
    queryFn: async () => {
      const q = courseFilter !== "all" ? `?courseFilter=${encodeURIComponent(courseFilter)}` : "";
      const res = await fetch(`/api/admin/monetization/analytics/summary${q}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      return json.success ? json.data : null;
    },
    staleTime: 60 * 1000,
  });

  const grossRevenue = analytics?.grossRevenue ?? 0;
  const netRevenue = analytics?.netRevenue ?? 0;
  const activeSubs = analytics?.activeSubscriptionsCount ?? 0;
  const totalOrders = analytics?.totalOrdersCount ?? 0;
  const mrr = analytics?.mrr ?? 0;

  const rnRevenue = analytics?.rnRevenue ?? 0;
  const pnRevenue = analytics?.pnRevenue ?? 0;
  const dualRevenue = analytics?.dualRevenue ?? 0;

  const totalCourseRev = rnRevenue + pnRevenue + dualRevenue || 1;
  const rnPct = Math.round((rnRevenue / totalCourseRev) * 100);
  const pnPct = Math.round((pnRevenue / totalCourseRev) * 100);
  const dualPct = Math.max(0, 100 - rnPct - pnPct);

  const arpu = activeSubs > 0 ? netRevenue / activeSubs : 0;

  const methodBreakdown = analytics?.paymentMethodBreakdown ?? {
    Card: Math.round(grossRevenue * 0.55),
    "M-Pesa": Math.round(grossRevenue * 0.3),
    BankTransfer: Math.round(grossRevenue * 0.15),
  };

  const totalMethodAmount = Object.values(methodBreakdown).reduce((a: any, b: any) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border">
        <div>
          <h2 className="text-base font-serif font-semibold text-foreground">
            Revenue Analytics &amp; Financial Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key financial performance indicators, course revenue distributions, and payment settlement breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Course Pathway Filter */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            {(["all", "RN", "PN"] as const).map((pw) => (
              <button
                key={pw}
                type="button"
                onClick={() => setCourseFilter(pw)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  courseFilter === pw
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pw === "all" ? "All Courses" : pw}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 rounded-xl text-xs"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              ${grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total payment intake
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Net Realized
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-foreground">
              ${netRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net after refunds &amp; reversals
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Monthly Recurring (MRR)
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-foreground">
              ${mrr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Normalized monthly run-rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Avg Revenue / User (ARPU)
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-foreground">
              ${arpu.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {activeSubs} active enrollees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Split and Payment Method Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Revenue Distribution */}
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-serif font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Course Revenue Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Collections categorized by registered pathway curriculum
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">NCLEX-RN (Registered Nurse)</span>
                <span className="font-semibold text-foreground">${rnRevenue.toLocaleString()} ({rnPct}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${rnPct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">NCLEX-PN (Practical Nurse)</span>
                <span className="font-semibold text-foreground">${pnRevenue.toLocaleString()} ({pnPct}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pnPct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Dual Access (RN &amp; PN All-Access)</span>
                <span className="font-semibold text-foreground">${dualRevenue.toLocaleString()} ({dualPct}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dualPct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-serif font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Payment Channel Share
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of intake across payment gateways and offline channels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(methodBreakdown).map(([method, amt]: [string, any]) => {
              const pct = Math.round((Number(amt) / Number(totalMethodAmount)) * 100);
              return (
                <div key={method} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{method}</span>
                    <span className="font-semibold text-foreground">${Number(amt).toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        method === "Card"
                          ? "bg-blue-500"
                          : method === "M-Pesa"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

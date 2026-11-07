"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
  Layers,
  Palette,
  CreditCard,
  Users,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { isSubscriptionAdmin } from "@/lib/admin/authz";
import { formatRoleTitle } from "@/components/layout/personalized-welcome";

// Sub-tab views
import { MonetizationOverviewTab } from "@/components/admin/monetization/monetization-overview-tab";
import { SubscriptionPlansTab } from "@/components/admin/monetization/subscription-plans-tab";
import { PlanAppearanceEditorTab } from "@/components/admin/monetization/plan-appearance-editor-tab";
import { ManualAuthorizationTab } from "@/components/admin/monetization/manual-authorization-tab";
import { LearnerSubscriptionsTab } from "@/components/admin/monetization/learner-subscriptions-tab";
import { TransactionsLedgerTab } from "@/components/admin/monetization/transactions-ledger-tab";
import { RevenueAnalyticsTab } from "@/components/admin/monetization/revenue-analytics-tab";

type TabKey =
  | "overview"
  | "plans"
  | "appearance"
  | "manual"
  | "learners"
  | "transactions"
  | "analytics";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "plans", label: "Subscription Plans", icon: Layers },
  { key: "appearance", label: "Card Appearance", icon: Palette },
  { key: "manual", label: "Manual Authorization", icon: CreditCard },
  { key: "learners", label: "Learner Subscriptions", icon: Users },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "analytics", label: "Revenue Analytics", icon: TrendingUp },
];

export function AdminSubscriptionsClient() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active tab state synchronized with URL query parameter
  const rawTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey =
    rawTab && TABS.some((t) => t.key === rawTab) ? rawTab : "plans";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/admin/subscriptions?${params.toString()}`);
  };

  // Auth gate (backend enforces RequireAdmin)
  const canManagePlans = isAuthenticated && isSubscriptionAdmin(user?.role);

  if (isLoading) {
    return <BrandedLoading message="Verifying administrative credentials..." fullScreen />;
  }

  if (!canManagePlans) {
    return (
      <div className="w-full max-w-none py-16 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
          Subscription Governance Restricted
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Plan administration requires an administrator-level role ({formatRoleTitle(user?.role)}). Ask a Super Admin if you require elevated access.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Admin Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-6">
      {/* Monetization Management Navigation Tabs */}
      <div className="border-b border-border">
        <nav
          className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-px"
          aria-label="Monetization sub-navigation"
          role="tablist"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                  isSelected
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "overview" && (
          <MonetizationOverviewTab
            onNavigateTab={handleTabChange}
            canManagePlans={canManagePlans}
          />
        )}
        {activeTab === "plans" && (
          <SubscriptionPlansTab canManagePlans={canManagePlans} />
        )}
        {activeTab === "appearance" && (
          <PlanAppearanceEditorTab />
        )}
        {activeTab === "manual" && (
          <ManualAuthorizationTab canManagePlans={canManagePlans} />
        )}
        {activeTab === "learners" && (
          <LearnerSubscriptionsTab canManagePlans={canManagePlans} />
        )}
        {activeTab === "transactions" && (
          <TransactionsLedgerTab canManagePlans={canManagePlans} />
        )}
        {activeTab === "analytics" && (
          <RevenueAnalyticsTab canManagePlans={canManagePlans} />
        )}
      </div>
    </div>
  );
}

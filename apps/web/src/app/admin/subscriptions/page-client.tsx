"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Plus,
  Edit2,
  Archive,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { isSubscriptionAdmin } from "@/lib/admin/authz";
import { formatRoleTitle } from "@/components/layout/personalized-welcome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FullPageFormLayout,
  FullPageDeleteLayout,
} from "@/components/ui/full-page-crud";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Product } from "@/lib/products";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";

/**
 * Admin subscriptions page using TanStack Query (P2 migration).
 * Integrates with shared admin shell (sidebar, breadcrumbs, auth gates).
 * Access gated by isSubscriptionAdmin (mirrors backend RequireAdmin).
 */
export function AdminSubscriptionsClient() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // TanStack Query state for subscription plans
  const {
    data: plans = [],
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans,
    } = useQuery<Product[]>({
    queryKey: ["admin-subscriptions"],
    queryFn: async (): Promise<Product[]> => {
      const res = await fetch("/api/admin/subscriptions");

      if (!res.ok) {
        throw new Error("Failed to load subscription plans");
      }

      const data: {
        success?: boolean;
        error?: string;
        plans?: Product[] | null;
      } = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error loading plans");
      }

      return data.plans ?? [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Mutation for creating plans
  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Subscription plan created successfully");
      refetchPlans();
      setEditorOpen(false);
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to create subscription plan";
      notify.error(errorMessage);
    },
  });

  // Mutations for updates and deletes
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Subscription plan updated successfully");
      refetchPlans();
      setEditorOpen(false);
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to update subscription plan";
      notify.error(errorMessage);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Subscription plan archived successfully");
      refetchPlans();
    },
    onError: (error) => {
      const errorMessage = error.message || "Failed to archive subscription plan";
      notify.error(errorMessage);
    },
  });

  // Local state
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<Product | null>(null);
  const [planForm, setPlanForm] = React.useState({
    name: "",
    slug: "",
    description: "",
    pathway: "RN" as "RN" | "PN" | "Both",
    planType: "pro",
    price: 59,
    billingInterval: "month",
    featuresText: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [planToArchive, setPlanToArchive] = React.useState<Product | null>(null);

  // Filter state
  const [pathwayFilter, setPathwayFilter] = React.useState<"all" | "RN" | "PN" | "Both">("all");

  // Auth gate (display-only; backend enforces RequireAdmin)
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

  const filteredPlans = plans.filter((p) => {
    if (pathwayFilter === "all") return true;
    return p.pathway === pathwayFilter;
  });

  const isProcessing = isSubmitting || deletePlanMutation.isPending || updatePlanMutation.isPending || createPlanMutation.isPending;

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      slug: "",
      description: "",
      pathway: "RN",
      planType: "pro",
      price: 59,
      billingInterval: "month",
      featuresText: "Full question bank\nDetailed rationales",
    });
    setEditorOpen(true);
  };

  const handleOpenEdit = (plan: Product) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      slug: plan.slug || "",
      description: plan.description || "",
      pathway: plan.pathway,
      planType: plan.planType || "pro",
      price: plan.price,
      billingInterval: plan.billingInterval || "month",
      featuresText: (plan.features || []).join("\n"),
    });
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingPlan(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: planForm.name.trim(),
      slug: planForm.slug.trim(),
      description: planForm.description.trim(),
      pathway: planForm.pathway,
      planType: planForm.planType,
      price: Number(planForm.price),
      billingInterval: planForm.billingInterval,
      features: planForm.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    };

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, updates: payload });
    } else {
      createPlanMutation.mutate(payload);
    }

    setIsSubmitting(false);
  };

  const handleArchive = (plan: Product) => {
    setPlanToArchive(plan);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!planToArchive) return;
    deletePlanMutation.mutate(planToArchive.id);
    setArchiveDialogOpen(false);
    setPlanToArchive(null);
  };

  if (archiveDialogOpen && planToArchive) {
    return (
      <FullPageDeleteLayout
        title="Archive Subscription Plan"
        subtitle="This will deactivate the plan and hide it from customers. Historical purchase records will remain valid."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Subscriptions", onClick: () => setArchiveDialogOpen(false) },
          { label: "Archive Plan" },
        ]}
        recordSummary={
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{planToArchive.name}</div>
            <div className="text-xs text-muted-foreground">
              Slug: {planToArchive.slug} • Pathway: {planToArchive.pathway} • Price: ${planToArchive.price}
            </div>
          </div>
        }
        consequences={[
          "Deactivating this plan hides it from the public subscription catalog.",
          "Existing learner subscriptions and historical purchase records remain intact.",
        ]}
        onBack={() => setArchiveDialogOpen(false)}
        onCancel={() => setArchiveDialogOpen(false)}
        onConfirmDelete={handleArchiveConfirm}
        confirmLabel="Archive & Deactivate"
        isDeleting={isProcessing}
      />
    );
  }

  if (editorOpen) {
    return (
      <FullPageFormLayout
        title={editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
        subtitle={
          editingPlan
            ? "Update the subscription plan details, pricing, and pathway entitlements."
            : "Add a new subscription plan to the platform."
        }
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Subscriptions", onClick: handleCloseEditor },
          { label: editingPlan ? "Edit Plan" : "Create Plan" },
        ]}
        onBack={handleCloseEditor}
        onCancel={handleCloseEditor}
        onSubmit={handleSubmit}
        submitLabel={editingPlan ? "Update Plan" : "Create Plan"}
        isSubmitting={isProcessing}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Plan Name</label>
            <Input
              required
              placeholder="e.g. NCLEX-RN Complete Preparation"
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Slug</label>
            <Input
              required
              placeholder="e.g. rn-pro"
              value={planForm.slug}
              onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium">Description</label>
            <Input
              required
              placeholder="Describe the plan and target candidate cohort..."
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Pathway</label>
            <select
              value={planForm.pathway}
              onChange={(e) => setPlanForm({ ...planForm, pathway: e.target.value as "RN" | "PN" | "Both" })}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="RN">RN</option>
              <option value="PN">PN</option>
              <option value="Both">Both (RN & PN)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Plan Type</label>
            <select
              value={planForm.planType}
              onChange={(e) => setPlanForm({ ...planForm, planType: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Price (USD)</label>
            <Input
              type="number"
              required
              min={1}
              value={planForm.price}
              onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Billing Interval</label>
            <select
              value={planForm.billingInterval}
              onChange={(e) => setPlanForm({ ...planForm, billingInterval: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly (90 Days)</option>
              <option value="year">Annual</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium">Included Features (One per line)</label>
            <textarea
              rows={4}
              value={planForm.featuresText}
              onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
              className="w-full rounded-md border bg-background p-3 text-sm"
            />
          </div>
        </div>
      </FullPageFormLayout>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-6">
      {/* Page header & primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Authoritative source of truth for NCLEX-RN, NCLEX-PN, and All-Access dual-pathway study plans.
        </p>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchPlans()}
            disabled={isLoadingPlans || isProcessing}
            className="h-10 rounded-xl"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoadingPlans ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Error display */}
      {plansError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Error loading subscription plans. Please try again later.
        </div>
      )}

      {/* Loading state */}
      {isLoadingPlans && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading subscription plans...</span>
        </div>
      )}

      {/* Plans grid */}
      {!isLoadingPlans && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-serif font-semibold text-foreground text-lg mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">Slug: {plan.slug}</p>
                  <Badge variant={plan.pathway === "Both" ? "default" : "secondary"} className="text-xs">
                    {plan.pathway}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(plan)}
                    disabled={isProcessing}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(plan)}
                    disabled={isProcessing}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {plan.description}
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">
                    ${plan.price}
                    {plan.originalPrice && plan.originalPrice > plan.price && (
                      <span className="text-muted-foreground line-through ml-1">
                        ${plan.originalPrice}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan Type:</span>
                  <span className="font-medium capitalize">{plan.planType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <Badge variant={plan.isActive ? "default" : "secondary"} className="text-xs">
                    {plan.isActive ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoadingPlans && plans.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No subscription plans found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Get started by creating your first subscription plan.
          </p>
          <Button onClick={handleOpenCreate} className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>
      )}
    </div>
  );
}
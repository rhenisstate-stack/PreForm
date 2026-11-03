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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [planToArchive, setPlanToArchive] = React.useState<Product | null>(null);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter state
  const [pathwayFilter, setPathwayFilter] = React.useState<"all" | "RN" | "PN" | "Both">("all");

  // Auth gate (display-only; backend enforces RequireAdmin)
  const canManagePlans = isAuthenticated && isSubscriptionAdmin(user?.role);

  if (isLoading) {
    return <BrandedLoading message="Verifying administrative credentials..." fullScreen />;
  }

  if (!canManagePlans) {
    return (
      <div className="mx-auto max-w-xl py-16 px-4 text-center">
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

  // Form handlers (simplified for brevity)
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (plan: Product) => {
    setEditingPlan(plan);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingPlan(null);
  };

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, updates: formData });
    } else {
      createPlanMutation.mutate(formData);
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page header & primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
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

      {/* Editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update the subscription plan details." : "Add a new subscription plan to the platform."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            Form implementation would go here...
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEditor}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {}}
              disabled={isProcessing}
              className="bg-primary text-primary-foreground"
            >
              {isProcessing
                ? "Saving..."
                : editingPlan
                ? "Update Plan"
                : "Create Plan"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Subscription Plan</DialogTitle>
            <DialogDescription>
              This will deactivate the plan and hide it from customers. Historical purchase records will remain valid.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to archive <strong>{planToArchive?.name}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchiveConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? "Archiving..." : "Archive & Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback message */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-4 right-4 rounded-lg border p-4 shadow-lg max-w-md ${feedbackMessage.type === "error"
              ? "bg-destructive/10 border-destructive text-destructive"
              : "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-100"
            }`}
        >
          <p className="text-sm font-medium">
            {feedbackMessage.type === "error" ? "Error" : "Success"}
          </p>
          <p className="text-sm mt-1">{feedbackMessage.text}</p>
        </div>
      )}
    </div>
  );
}
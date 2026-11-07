"use client";

import * as React from "react";
import {
  Plus,
  Edit2,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Shield,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FullPageFormLayout,
  FullPageDeleteLayout,
} from "@/components/ui/full-page-crud";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/lib/products";
import { notify } from "@/lib/notifications";
import { checkContrastRatio, isValidHexColor } from "@/lib/color-contrast";

interface SubscriptionPlansTabProps {
  canManagePlans: boolean;
}

export function SubscriptionPlansTab({ canManagePlans }: SubscriptionPlansTabProps) {
  const queryClient = useQueryClient();

  // Load plans from API
  const {
    data: plans = [],
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans,
  } = useQuery<Product[]>({
    queryKey: ["admin-subscriptions"],
    queryFn: async (): Promise<Product[]> => {
      const res = await fetch("/api/admin/subscriptions");
      if (!res.ok) throw new Error("Failed to load subscription plans");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unknown error loading plans");
      return data.plans ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Filter state
  const [pathwayFilter, setPathwayFilter] = React.useState<"all" | "RN" | "PN" | "Both">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "archived">("all");

  // Plan Form State (Create / Edit)
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<Product | null>(null);
  const [planForm, setPlanForm] = React.useState({
    name: "",
    slug: "",
    description: "",
    pathway: "RN" as "RN" | "PN" | "Both",
    planType: "pro",
    price: 59,
    originalPrice: undefined as number | undefined,
    billingInterval: "month",
    featuresText: "",
    badgeText: "",
    displayOrder: 1,
    bgColour: "",
    textColour: "",
    accentColour: "",
  });

  // Archive / Hard Delete / Duplicate states
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [planToArchive, setPlanToArchive] = React.useState<Product | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [planToDelete, setPlanToDelete] = React.useState<Product | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<string | null>(null);

  // Entitlements configuration state
  const [entitlementsModalOpen, setEntitlementsModalOpen] = React.useState(false);
  const [selectedPlanForEntitlements, setSelectedPlanForEntitlements] = React.useState<Product | null>(null);
  const [availableDefinitions, setAvailableDefinitions] = React.useState<any[]>([]);
  const [selectedEntitlementCodes, setSelectedEntitlementCodes] = React.useState<string[]>([]);
  const [isLoadingEntitlements, setIsLoadingEntitlements] = React.useState(false);
  const [isSavingEntitlements, setIsSavingEntitlements] = React.useState(false);

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      notify.success("Subscription plan created successfully");
      refetchPlans();
      setEditorOpen(false);
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to create subscription plan");
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      notify.success("Subscription plan updated successfully");
      refetchPlans();
      setEditorOpen(false);
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to update subscription plan");
    },
  });

  const duplicatePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/subscriptions/${id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to duplicate plan");
      return data;
    },
    onSuccess: () => {
      notify.success("Plan duplicated as draft with version incremented");
      refetchPlans();
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to duplicate plan");
    },
  });

  const archivePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to archive plan");
      return data;
    },
    onSuccess: () => {
      notify.success("Subscription plan archived successfully");
      refetchPlans();
      setArchiveDialogOpen(false);
      setPlanToArchive(null);
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to archive subscription plan");
    },
  });

  const restorePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/subscriptions/${id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to restore plan");
      return data;
    },
    onSuccess: () => {
      notify.success("Subscription plan restored to active status");
      refetchPlans();
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to restore plan");
    },
  });

  const hardDeletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/subscriptions/${id}/hard-delete`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to permanently delete plan");
      }
      return data;
    },
    onSuccess: () => {
      notify.success("Plan deleted permanently");
      refetchPlans();
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      setDeleteErrorMessage(null);
    },
    onError: (err: any) => {
      setDeleteErrorMessage(err.message || "Failed to delete plan");
      notify.error(err.message || "Failed to delete plan");
    },
  });

  const isProcessing =
    createPlanMutation.isPending ||
    updatePlanMutation.isPending ||
    duplicatePlanMutation.isPending ||
    archivePlanMutation.isPending ||
    restorePlanMutation.isPending ||
    hardDeletePlanMutation.isPending;

  // Handlers
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      slug: "",
      description: "",
      pathway: "RN",
      planType: "pro",
      price: 59,
      originalPrice: undefined,
      billingInterval: "month",
      featuresText: "Full question bank\nDetailed clinical rationales\nCAT Readiness assessments",
      badgeText: "",
      displayOrder: plans.length + 1,
      bgColour: "",
      textColour: "",
      accentColour: "",
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
      originalPrice: plan.originalPrice,
      billingInterval: plan.billingInterval || "month",
      featuresText: (plan.features || []).join("\n"),
      badgeText: plan.badgeText || "",
      displayOrder: plan.displayOrder ?? 1,
      bgColour: plan.bgColour || "",
      textColour: plan.textColour || "",
      accentColour: plan.accentColour || "",
    });
    setEditorOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend contrast check if custom colours specified
    if (planForm.bgColour && planForm.textColour) {
      if (isValidHexColor(planForm.bgColour) && isValidHexColor(planForm.textColour)) {
        const ratio = checkContrastRatio(planForm.textColour, planForm.bgColour);
        if (ratio < 3.0) {
          notify.error(`Insufficient color contrast (${ratio.toFixed(2)}:1). Must be >= 3.0:1 for WCAG AA compliance.`);
          return;
        }
      }
    }

    const payload = {
      name: planForm.name.trim(),
      slug: planForm.slug.trim(),
      description: planForm.description.trim(),
      pathway: planForm.pathway,
      planType: planForm.planType,
      price: Number(planForm.price),
      originalPrice: planForm.originalPrice ? Number(planForm.originalPrice) : undefined,
      billingInterval: planForm.billingInterval,
      features: planForm.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      badgeText: planForm.badgeText.trim() || undefined,
      displayOrder: Number(planForm.displayOrder),
      bgColour: planForm.bgColour.trim() || undefined,
      textColour: planForm.textColour.trim() || undefined,
      accentColour: planForm.accentColour.trim() || undefined,
    };

    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, updates: payload });
    } else {
      createPlanMutation.mutate(payload);
    }
  };

  // Open Entitlements Modal
  const handleOpenEntitlements = async (plan: Product) => {
    setSelectedPlanForEntitlements(plan);
    setEntitlementsModalOpen(true);
    setIsLoadingEntitlements(true);
    try {
      // 1. Fetch all available definitions
      const defRes = await fetch("/api/admin/subscriptions/entitlements/definitions");
      const defData = await defRes.json();
      if (defData.success) {
        setAvailableDefinitions(defData.definitions ?? []);
      }

      // 2. Fetch configured entitlements for this plan
      const planEntRes = await fetch(`/api/admin/subscriptions/${plan.id}/entitlements`);
      const planEntData = await planEntRes.json();
      if (planEntData.success && Array.isArray(planEntData.entitlements)) {
        setSelectedEntitlementCodes(planEntData.entitlements);
      } else {
        // Fallback default: match by course pathway
        setSelectedEntitlementCodes([
          "practice_exams",
          "study_guide",
          "flashcards",
          "quizzes",
          plan.pathway === "PN" ? "pn" : "rn",
        ]);
      }
    } catch (err) {
      console.error("Error loading entitlements:", err);
      notify.error("Failed to load entitlement mappings");
    } finally {
      setIsLoadingEntitlements(false);
    }
  };

  const handleToggleEntitlement = (code: string) => {
    setSelectedEntitlementCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSaveEntitlements = async () => {
    if (!selectedPlanForEntitlements) return;
    setIsSavingEntitlements(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${selectedPlanForEntitlements.id}/entitlements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entitlementCodes: selectedEntitlementCodes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update entitlements");
      notify.success("Authoritative feature entitlements saved");
      setEntitlementsModalOpen(false);
    } catch (err: any) {
      notify.error(err.message || "Failed to save entitlements");
    } finally {
      setIsSavingEntitlements(false);
    }
  };

  // Filter plans
  const filteredPlans = plans.filter((p) => {
    if (pathwayFilter !== "all" && p.pathway !== pathwayFilter) return false;
    if (statusFilter === "active" && p.isActive === false) return false;
    if (statusFilter === "archived" && p.isActive !== false) return false;
    return true;
  });

  // Archive full page modal
  if (archiveDialogOpen && planToArchive) {
    return (
      <FullPageDeleteLayout
        title="Archive Subscription Plan"
        subtitle="Deactivating this plan removes it from public purchasing while preserving all existing candidate records and historical transactions."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Subscriptions", onClick: () => setArchiveDialogOpen(false) },
          { label: "Archive Plan" },
        ]}
        recordSummary={
          <div className="space-y-1 text-sm">
            <div className="font-semibold text-foreground">{planToArchive.name}</div>
            <div className="text-xs text-muted-foreground">
              Slug: <span className="font-mono">{planToArchive.slug}</span> • Pathway: {planToArchive.pathway} • Price: ${planToArchive.price}
            </div>
          </div>
        }
        consequences={[
          "Hides this plan from public pricing and checkout.",
          "Existing learner subscriptions remain active until their scheduled expiration.",
          "This plan can be restored to active status at any time.",
        ]}
        onBack={() => setArchiveDialogOpen(false)}
        onCancel={() => setArchiveDialogOpen(false)}
        onConfirmDelete={() => archivePlanMutation.mutate(planToArchive.id)}
        confirmLabel="Archive & Deactivate"
        isDeleting={isProcessing}
      />
    );
  }

  // Create / Edit Full Page Form Layout
  if (editorOpen) {
    return (
      <FullPageFormLayout
        title={editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
        subtitle={
          editingPlan
            ? "Update plan configuration, pathway restrictions, and public pricing."
            : "Register a new subscription tier with authoritative course isolation."
        }
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Subscriptions", onClick: () => setEditorOpen(false) },
          { label: editingPlan ? "Edit Plan" : "Create Plan" },
        ]}
        onBack={() => setEditorOpen(false)}
        onCancel={() => setEditorOpen(false)}
        onSubmit={handleFormSubmit}
        submitLabel={editingPlan ? "Update Plan" : "Create Plan"}
        isSubmitting={isProcessing}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Plan Name</label>
            <Input
              required
              placeholder="e.g. NCLEX-RN Complete Preparation"
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Internal Slug</label>
            <Input
              required
              placeholder="e.g. rn-pro-q1"
              value={planForm.slug}
              onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-foreground">Description</label>
            <Input
              required
              placeholder="Target student cohort and core curriculum offering..."
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Course Pathway</label>
            <select
              value={planForm.pathway}
              onChange={(e) => setPlanForm({ ...planForm, pathway: e.target.value as "RN" | "PN" | "Both" })}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="RN">NCLEX-RN (Registered Nurse)</option>
              <option value="PN">NCLEX-PN (Practical Nurse)</option>
              <option value="Both">Both (RN &amp; PN Dual Access)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Plan Category / Tier</label>
            <select
              value={planForm.planType}
              onChange={(e) => setPlanForm({ ...planForm, planType: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium / All-Access</option>
              <option value="readiness">Readiness Assessment Only</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Selling Price (USD)</label>
            <Input
              type="number"
              required
              min={1}
              step="any"
              value={planForm.price}
              onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Original / Reference Price (USD, optional)</label>
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="e.g. 79 (shown struck through)"
              value={planForm.originalPrice ?? ""}
              onChange={(e) =>
                setPlanForm({
                  ...planForm,
                  originalPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Billing Interval</label>
            <select
              value={planForm.billingInterval}
              onChange={(e) => setPlanForm({ ...planForm, billingInterval: e.target.value })}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="month">Monthly (30 Days)</option>
              <option value="quarter">Quarterly (90 Days)</option>
              <option value="year">Annual (365 Days)</option>
              <option value="one-time">One-time Access</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Badge Text (Optional)</label>
            <Input
              placeholder="e.g. Most Popular, High Yield"
              value={planForm.badgeText}
              onChange={(e) => setPlanForm({ ...planForm, badgeText: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-foreground">Included Features (One per line)</label>
            <textarea
              rows={4}
              value={planForm.featuresText}
              onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
              className="w-full rounded-md border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Full question bank&#10;CAT Readiness exams&#10;AI Study Studio access"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Background Color (Hex, optional)</label>
            <Input
              placeholder="#ffffff"
              value={planForm.bgColour}
              onChange={(e) => setPlanForm({ ...planForm, bgColour: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Text Color (Hex, optional)</label>
            <Input
              placeholder="#1e293b"
              value={planForm.textColour}
              onChange={(e) => setPlanForm({ ...planForm, textColour: e.target.value })}
            />
          </div>
        </div>
      </FullPageFormLayout>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pathway buttons */}
          <div className="inline-flex rounded-xl border border-border p-1 bg-muted/40">
            {(["all", "RN", "PN", "Both"] as const).map((pw) => (
              <button
                key={pw}
                type="button"
                onClick={() => setPathwayFilter(pw)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  pathwayFilter === pw
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pw === "all" ? "All Pathways" : pw}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="inline-flex rounded-xl border border-border p-1 bg-muted/40">
            {(["all", "active", "archived"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all capitalize ${
                  statusFilter === st
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchPlans()}
            disabled={isLoadingPlans || isProcessing}
            className="h-9 rounded-xl text-xs"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoadingPlans ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Plans List / Grid */}
      {isLoadingPlans ? (
        <div className="py-16 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-xs">Loading plans catalog...</p>
        </div>
      ) : plansError ? (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm">
          Failed to load subscription plans. Please refresh or check connection.
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border p-8">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-serif font-semibold text-foreground text-base">No subscription plans found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {pathwayFilter !== "all" || statusFilter !== "all"
              ? "No plans match the selected filters. Try broadening your filter selection."
              : "Get started by adding your first NCLEX-RN or NCLEX-PN subscription plan."}
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="mt-4 rounded-xl bg-primary text-primary-foreground">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const isInactive = plan.isActive === false;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border bg-card p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isInactive
                    ? "border-muted opacity-70 bg-muted/10"
                    : "border-border hover:shadow-md"
                }`}
              >
                <div>
                  {/* Card Header & Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-semibold text-foreground text-base">
                          {plan.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[11px] text-muted-foreground">{plan.slug}</span>
                        <span className="text-muted-foreground">•</span>
                        <Badge
                          variant={plan.pathway === "Both" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {plan.pathway}
                        </Badge>
                        {isInactive && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 px-1.5 py-0 h-4">
                            Archived
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Edit Plan"
                        onClick={() => handleOpenEdit(plan)}
                        disabled={isProcessing}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Duplicate Plan"
                        onClick={() => duplicatePlanMutation.mutate(plan.id)}
                        disabled={isProcessing}
                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {isInactive ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Restore Plan"
                          onClick={() => restorePlanMutation.mutate(plan.id)}
                          disabled={isProcessing}
                          className="h-7 w-7 p-0 rounded-lg text-emerald-600 hover:text-emerald-700"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Archive Plan"
                          onClick={() => {
                            setPlanToArchive(plan);
                            setArchiveDialogOpen(true);
                          }}
                          disabled={isProcessing}
                          className="h-7 w-7 p-0 rounded-lg text-amber-600 hover:text-amber-700"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Configure Entitlements"
                        onClick={() => handleOpenEntitlements(plan)}
                        disabled={isProcessing}
                        className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:text-blue-700"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                    {plan.description}
                  </p>

                  {/* Pricing and Details */}
                  <div className="p-3 rounded-xl bg-muted/40 mb-4 space-y-1.5 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-semibold text-foreground text-sm">
                        ${plan.price}
                        {plan.originalPrice && plan.originalPrice > plan.price && (
                          <span className="text-muted-foreground line-through ml-1.5 text-xs font-normal">
                            ${plan.originalPrice}
                          </span>
                        )}
                        <span className="text-[11px] font-normal text-muted-foreground ml-1">
                          /{plan.billingInterval}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium capitalize text-foreground">{plan.planType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Features:</span>
                      <span className="text-muted-foreground">{(plan.features || []).length} included</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleOpenEntitlements(plan)}
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Shield className="h-3 w-3" />
                    Feature Entitlements
                  </button>

                  {isInactive && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlanToDelete(plan);
                        setDeleteErrorMessage(null);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Permanent Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature Entitlements Modal */}
      <Dialog open={entitlementsModalOpen} onOpenChange={setEntitlementsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Configure Plan Entitlements
            </DialogTitle>
            <DialogDescription className="text-xs">
              Authoritatively assign feature-level access for{" "}
              <strong className="text-foreground">{selectedPlanForEntitlements?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {isLoadingEntitlements ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Loading system entitlement definitions...
            </div>
          ) : (
            <div className="space-y-3 py-2 max-h-[380px] overflow-y-auto pr-1">
              <p className="text-xs text-muted-foreground">
                Toggling these grants determines what candidate capabilities are unlocked on the backend:
              </p>
              {availableDefinitions.length === 0 ? (
                // Fallback default list if no definitions loaded
                [
                  { code: "rn", name: "NCLEX-RN Pathway Content", category: "Pathway" },
                  { code: "pn", name: "NCLEX-PN Pathway Content", category: "Pathway" },
                  { code: "practice_exams", name: "CAT Practice Examinations", category: "Exams" },
                  { code: "custom_tests", name: "Standalone Custom Tests", category: "Exams" },
                  { code: "rats", name: "Readiness Assessment Tests (RATs)", category: "Exams" },
                  { code: "study_guide", name: "NCLEX Study Guide & Notes", category: "Study" },
                  { code: "flashcards", name: "Clinical Flashcards Library", category: "Study" },
                  { code: "spaced_repetition", name: "Spaced Repetition Engine", category: "Study" },
                  { code: "quizzes", name: "Topic & Domain Quizzes", category: "Practice" },
                  { code: "performance_reports", name: "Performance Intelligence Analytics", category: "Analytics" },
                ].map((def) => {
                  const isChecked = selectedEntitlementCodes.includes(def.code);
                  return (
                    <label
                      key={def.code}
                      className="flex items-start gap-3 p-2.5 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEntitlement(def.code)}
                        className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="font-medium text-foreground">{def.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{def.code} • {def.category}</div>
                      </div>
                    </label>
                  );
                })
              ) : (
                availableDefinitions.map((def: any) => {
                  const isChecked = selectedEntitlementCodes.includes(def.code);
                  return (
                    <label
                      key={def.code}
                      className="flex items-start gap-3 p-2.5 rounded-xl border border-border/70 hover:bg-muted/40 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEntitlement(def.code)}
                        className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="font-medium text-foreground">{def.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{def.code} • {def.category}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEntitlementsModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEntitlements}
              disabled={isSavingEntitlements || isLoadingEntitlements}
              className="rounded-xl text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isSavingEntitlements ? "Saving..." : "Save Entitlements"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Guard Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permanent Plan Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attempting permanent deletion for <strong className="text-foreground">{planToDelete?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {deleteErrorMessage ? (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
              <div className="font-semibold">Deletion Blocked</div>
              <p>{deleteErrorMessage}</p>
              <p className="text-muted-foreground mt-1">
                For financial and regulatory compliance, plans with active candidate subscriptions or historical orders cannot be permanently deleted. They must remain archived instead.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              This action is irreversible. The plan will only be deleted if there are zero historical orders and zero candidate subscriptions associated with it.
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteErrorMessage(null);
              }}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
            {!deleteErrorMessage && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => planToDelete && hardDeletePlanMutation.mutate(planToDelete.id)}
                disabled={hardDeletePlanMutation.isPending}
                className="rounded-xl text-xs font-semibold"
              >
                {hardDeletePlanMutation.isPending ? "Checking..." : "Confirm Permanent Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

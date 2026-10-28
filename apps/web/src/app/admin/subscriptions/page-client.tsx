"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Plus,
  Edit2,
  Archive,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { BRAND } from "@/lib/brand";
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
import type { Product } from "@/lib/products";
import { checkContrastRatio, isValidHexColor } from "@/lib/subscription-store";

const adminNavItems = [
  { label: "Overview", href: "/admin", current: false },
  { label: "Subscription Plans", href: "/admin/subscriptions", current: true },
  { label: "Question-Type Registry (18)", href: "/admin/question-types", current: false },
];

export function AdminSubscriptionsClient() {
  const auth = useAuth();
  const user = auth?.user;
  const isLoading = auth?.isLoading ?? true;
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [plans, setPlans] = React.useState<Product[]>([]);
  const [loadingPlans, setLoadingPlans] = React.useState(true);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [planToArchive, setPlanToArchive] = React.useState<Product | null>(null);

  // Form Fields
  const [formName, setFormName] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formAudience, setFormAudience] = React.useState("");
  const [formPathway, setFormPathway] = React.useState<"RN" | "PN" | "Both">("RN");
  const [formPlanType, setFormPlanType] = React.useState<"starter" | "pro" | "premium" | "readiness">("pro");
  const [formPrice, setFormPrice] = React.useState("59");
  const [formOriginalPrice, setFormOriginalPrice] = React.useState("");
  const [formInterval, setFormInterval] = React.useState<"month" | "quarter" | "one-time">("month");
  const [formDurationLabel, setFormDurationLabel] = React.useState("30-Day Monthly Access");
  const [formFeatures, setFormFeatures] = React.useState<string[]>([
    "Full clinical practice question bank",
    "Detailed answer rationales",
    "Readiness assessments included",
  ]);
  const [newFeatureText, setNewFeatureText] = React.useState("");
  const [formPopular, setFormPopular] = React.useState(false);
  const [formBgColour, setFormBgColour] = React.useState("#ffffff");
  const [formAccentColour, setFormAccentColour] = React.useState("#0d9488");
  const [formTextColour, setFormTextColour] = React.useState("#0f172a");
  const [formBadgeText, setFormBadgeText] = React.useState("");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState("1");
  const [formIsActive, setFormIsActive] = React.useState(true);

  // Filter state
  const [pathwayFilter, setPathwayFilter] = React.useState<"all" | "RN" | "PN" | "Both">("all");

  const loadPlans = React.useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/admin/subscriptions");
      const data = await res.json();
      if (res.ok && data.success) {
        setPlans(data.plans || []);
      } else {
        setFeedbackMessage({ type: "error", text: data.error || "Failed to load subscription plans" });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Network error loading subscription plans" });
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      loadPlans();
    }
  }, [isAuthenticated, loadPlans]);

  if (isLoading) {
    return <BrandedLoading message="Verifying administrative credentials..." fullScreen />;
  }

  // Privilege Guard
  const userRole = (user?.role || "").toLowerCase();
  const isPrivileged =
    userRole.includes("admin") ||
    userRole.includes("manager") ||
    userRole.includes("superadmin");

  if (!isAuthenticated || !user || !isPrivileged) {
    return (
      <div className="mx-auto max-w-xl py-20 px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
          Administrative Access Restricted
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Subscription governance requires administrative privileges ({formatRoleTitle(user?.role || "Candidate")}).
        </p>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Sign In with Admin Credentials
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormAudience("");
    setFormPathway("RN");
    setFormPlanType("pro");
    setFormPrice("59");
    setFormOriginalPrice("");
    setFormInterval("month");
    setFormDurationLabel("30-Day Monthly Access");
    setFormFeatures([
      "Full NCLEX practice question bank",
      "Detailed clinical answer rationales",
      "Readiness assessment included",
    ]);
    setNewFeatureText("");
    setFormPopular(false);
    setFormBgColour("#ffffff");
    setFormAccentColour("#0d9488");
    setFormTextColour("#0f172a");
    setFormBadgeText("");
    setFormDisplayOrder(String(plans.length + 1));
    setFormIsActive(true);
    setEditorOpen(true);
  };

  const handleOpenEdit = (plan: Product) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormSlug(plan.slug || plan.id);
    setFormDescription(plan.description);
    setFormAudience(plan.audience || "");
    setFormPathway(plan.pathway);
    setFormPlanType(plan.planType);
    setFormPrice(String(plan.price));
    setFormOriginalPrice(plan.originalPrice ? String(plan.originalPrice) : "");
    setFormInterval(plan.billingInterval);
    setFormDurationLabel(plan.durationLabel || (plan.billingInterval === "quarter" ? "90-Day Quarterly Access" : "30-Day Monthly Access"));
    setFormFeatures(plan.features || []);
    setNewFeatureText("");
    setFormPopular(Boolean(plan.popular));
    setFormBgColour(plan.bgColour || "#ffffff");
    setFormAccentColour(plan.accentColour || "#0d9488");
    setFormTextColour(plan.textColour || "#0f172a");
    setFormBadgeText(plan.badgeText || "");
    setFormDisplayOrder(String(plan.displayOrder || 0));
    setFormIsActive(plan.isActive !== false);
    setEditorOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormFeatures([...formFeatures, newFeatureText.trim()]);
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== index));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFeedbackMessage({ type: "error", text: "Please enter a valid positive price" });
      return;
    }

    const originalPriceNum = formOriginalPrice ? parseFloat(formOriginalPrice) : undefined;
    if (originalPriceNum !== undefined && (isNaN(originalPriceNum) || originalPriceNum <= 0)) {
      setFeedbackMessage({ type: "error", text: "Original price must be positive if provided" });
      return;
    }

    if (formBgColour && !isValidHexColor(formBgColour)) {
      setFeedbackMessage({ type: "error", text: "Background color must be a valid hex color code (e.g. #FFFFFF)" });
      return;
    }

    if (formTextColour && !isValidHexColor(formTextColour)) {
      setFeedbackMessage({ type: "error", text: "Text color must be a valid hex color code (e.g. #0F172A)" });
      return;
    }

    if (formBgColour && formTextColour) {
      const contrast = checkContrastRatio(formBgColour, formTextColour);
      if (contrast < 3.0) {
        setFeedbackMessage({
          type: "error",
          text: `Color contrast (${contrast.toFixed(1)}:1) is below accessible 3.0:1 threshold. Please adjust colors.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim().toLowerCase(),
        description: formDescription.trim(),
        audience: formAudience.trim() || undefined,
        pathway: formPathway,
        planType: formPlanType,
        price: priceNum,
        originalPrice: originalPriceNum,
        currency: "USD",
        billingInterval: formInterval,
        durationLabel: formDurationLabel.trim(),
        features: formFeatures,
        popular: formPopular,
        bgColour: formBgColour,
        accentColour: formAccentColour,
        textColour: formTextColour,
        badgeText: formBadgeText.trim() || undefined,
        displayOrder: parseInt(formDisplayOrder, 10) || 0,
        isActive: formIsActive,
      };

      const url = editingPlan
        ? `/api/admin/subscriptions/${editingPlan.id}`
        : "/api/admin/subscriptions";
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({
          type: "success",
          text: `Plan "${payload.name}" has been successfully ${editingPlan ? "updated" : "created"}.`,
        });
        setEditorOpen(false);
        loadPlans();
      } else {
        setFeedbackMessage({ type: "error", text: data.error || "Save operation failed" });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Network error saving plan" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!planToArchive) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${planToArchive.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({
          type: "success",
          text: `Plan "${planToArchive.name}" has been safely archived/deactivated. Historical purchase records are preserved.`,
        });
        setArchiveDialogOpen(false);
        setPlanToArchive(null);
        loadPlans();
      } else {
        setFeedbackMessage({ type: "error", text: data.error || "Archive operation failed" });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Network error archiving plan" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (pathwayFilter === "all") return true;
    return p.pathway === pathwayFilter;
  });

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-card p-4 space-y-6 shadow-xs border-r border-border/70">
        <div className="flex items-center gap-3 px-2">
          <Image
            src={BRAND.logo.assetPath}
            alt={BRAND.logo.alt}
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain shrink-0"
          />
          <div>
            <span className="flex flex-col font-serif font-bold tracking-tight leading-none -space-y-0.5">
              <span className="text-base text-secondary">Prep</span>
              <span className="text-base text-foreground">Ford</span>
            </span>
            <span className="block text-[10px] font-mono uppercase tracking-widest text-secondary font-semibold mt-1">
              Admin Workspace
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-muted/45 p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground truncate">
            {user.displayName || user.name}
          </p>
          <span className="inline-flex items-center gap-1 rounded-sm bg-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
            <ShieldCheck className="h-2.5 w-2.5" />
            {formatRoleTitle(user.role)}
          </span>
        </div>

        <nav className="space-y-1" aria-label="Admin Navigation">
          {adminNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                item.current
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Governance</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/admin" className="hover:underline">Admin</Link>
              <span>/</span>
              <span className="text-foreground font-medium">Subscription Catalogue</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
              Subscription &amp; Pricing Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Authoritative source of truth for NCLEX-RN, NCLEX-PN, and All-Access dual-pathway study plans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadPlans}
              disabled={loadingPlans}
              className="h-10 rounded-xl"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingPlans ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreate}
              className="h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </div>
        </div>

        {feedbackMessage && (
          <div
            className={`flex items-center gap-2.5 rounded-xl p-4 text-sm font-medium ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Pathway Filter Tabs */}
        <div className="flex items-center gap-2">
          {(["all", "RN", "PN", "Both"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPathwayFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathwayFilter === p
                  ? "bg-secondary text-secondary-foreground shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "all" ? "All Pathways" : p === "Both" ? "Dual All-Access" : `NCLEX-${p}`}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            Showing {filteredPlans.length} plans
          </span>
        </div>

        {/* Plan Cards Grid / Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition-all bg-card ${
                plan.isActive === false
                  ? "opacity-60 border-dashed border-border"
                  : plan.popular
                    ? "ring-2 ring-secondary border-secondary shadow-md"
                    : "border-border/80 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-semibold ${
                      plan.pathway === "Both"
                        ? "border-secondary/40 bg-secondary/10 text-secondary"
                        : "border-primary/40 bg-primary/10 text-primary"
                    }`}
                  >
                    {plan.pathway === "Both" ? "RN & PN Dual" : `NCLEX-${plan.pathway}`}
                  </Badge>

                  <div className="flex items-center gap-1.5">
                    {plan.isActive === false ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Archived
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        Published
                      </Badge>
                    )}
                    {plan.popular && (
                      <Badge className="bg-secondary text-secondary-foreground text-[10px] font-semibold">
                        {plan.badgeText || "Popular"}
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-serif text-xl font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  ID: {plan.id}
                </p>

                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {plan.description}
                </p>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-serif text-3xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    USD / {plan.billingInterval === "quarter" ? "90 days" : plan.billingInterval === "month" ? "month" : "one-time"}
                  </span>
                  {plan.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      ${plan.originalPrice}
                    </span>
                  )}
                </div>

                <ul className="mt-4 space-y-1.5 text-xs text-foreground/80">
                  {plan.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                      <span className="truncate">{f}</span>
                    </li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-[11px] text-muted-foreground italic pl-5">
                      +{plan.features.length - 3} more features
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-border/70 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Order: #{plan.displayOrder || 0}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(plan)}
                    className="h-8 rounded-lg text-xs"
                  >
                    <Edit2 className="mr-1.5 h-3 w-3" />
                    Edit
                  </Button>
                  {plan.isActive !== false && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPlanToArchive(plan);
                        setArchiveDialogOpen(true);
                      }}
                      className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Archive className="mr-1.5 h-3 w-3" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan Editor Modal with Live Preview */}
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editingPlan ? `Edit Subscription Plan: ${editingPlan.name}` : "Create New Subscription Plan"}
              </DialogTitle>
              <DialogDescription>
                Configure plan details, pricing, feature entitlements, and card appearance with real-time accessibility validation.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-4">
              {/* Form Controls */}
              <form id="plan-editor-form" onSubmit={handleSavePlan} className="lg:col-span-7 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Plan Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. NCLEX-RN Complete Preparation"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Slug / Product ID *</label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingPlan)}
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="e.g. rn-pro"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Pathway Scope *</label>
                    <select
                      value={formPathway}
                      onChange={(e) => setFormPathway(e.target.value as "RN" | "PN" | "Both")}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    >
                      <option value="RN">RN (Registered Nurse)</option>
                      <option value="PN">PN (Practical Nurse)</option>
                      <option value="Both">Both (Dual All-Access)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Plan Tier *</label>
                    <select
                      value={formPlanType}
                      onChange={(e) => setFormPlanType(e.target.value as "starter" | "pro" | "premium" | "readiness")}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro (Complete)</option>
                      <option value="premium">Premium (All-Access)</option>
                      <option value="readiness">Readiness Pack</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Interval *</label>
                    <select
                      value={formInterval}
                      onChange={(e) => setFormInterval(e.target.value as "month" | "quarter" | "one-time")}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    >
                      <option value="month">Monthly (30 Days)</option>
                      <option value="quarter">Quarterly (90 Days)</option>
                      <option value="one-time">One-Time Pack</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Amount (USD) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Comparison Price</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formOriginalPrice}
                      onChange={(e) => setFormOriginalPrice(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Display Order</label>
                    <input
                      type="number"
                      min="0"
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Badge Text (Optional)</label>
                  <input
                    type="text"
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    placeholder="e.g. Most Popular for RN"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                  />
                </div>

                {/* Features Tag Editor */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Features List</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      placeholder="Add a clinical feature..."
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <Button type="button" size="sm" onClick={handleAddFeature} className="h-8">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formFeatures.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px]"
                      >
                        <span>{f}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(i)}
                          className="text-destructive hover:underline ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Color Safeguards */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Card Accent / Border</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formAccentColour}
                        onChange={(e) => setFormAccentColour(e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={formAccentColour}
                        onChange={(e) => setFormAccentColour(e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Text Color Code</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formTextColour}
                        onChange={(e) => setFormTextColour(e.target.value)}
                        className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={formTextColour}
                        onChange={(e) => setFormTextColour(e.target.value)}
                        className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPopular}
                      onChange={(e) => setFormPopular(e.target.checked)}
                      className="rounded border-input text-secondary focus:ring-secondary"
                    />
                    <span className="font-semibold">Featured / Recommended</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-input text-secondary focus:ring-secondary"
                    />
                    <span className="font-semibold">Active &amp; Published</span>
                  </label>
                </div>
              </form>

              {/* Live Preview Column */}
              <div className="lg:col-span-5 bg-muted/40 p-4 rounded-2xl flex flex-col items-center justify-center">
                <div className="w-full flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Live Reusable Card Preview
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Public Viewport
                  </Badge>
                </div>

                {/* Reusable Public Card Component Preview */}
                <div
                  className="w-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-lg ring-1 transition-all"
                  style={{
                    backgroundColor: formBgColour || "#ffffff",
                    borderColor: formAccentColour || "#0d9488",
                    color: formTextColour || "#0f172a",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                        {formDurationLabel || "30-Day Monthly Access"}
                      </span>
                      {formBadgeText && (
                        <Badge className="bg-teal-600 text-white font-semibold text-[10px]">
                          {formBadgeText}
                        </Badge>
                      )}
                    </div>

                    <h4 className="mt-4 font-serif text-2xl font-bold leading-tight">
                      {formName || "Plan Title"}
                    </h4>

                    <p className="mt-2 text-xs opacity-75 leading-relaxed">
                      {formDescription || "Plan description goes here..."}
                    </p>

                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="font-serif text-4xl font-bold">
                        ${formPrice || "0"}
                      </span>
                      <span className="text-xs opacity-70">
                        USD / {formInterval === "quarter" ? "90 days" : "month"}
                      </span>
                      {formOriginalPrice && (
                        <span className="text-xs opacity-50 line-through">
                          ${formOriginalPrice}
                        </span>
                      )}
                    </div>

                    <ul className="mt-5 space-y-2 text-xs">
                      {formFeatures.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    <div
                      className="w-full h-11 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
                      style={{
                        backgroundColor: formAccentColour || "#0d9488",
                        color: "#ffffff",
                      }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>Choose {formName || "Plan"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="plan-editor-form"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {isSubmitting ? "Saving Plan..." : editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Archival Confirmation Dialog */}
        <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2 text-destructive">
                <Archive className="h-5 w-5" />
                Archive Subscription Plan
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to archive <strong>{planToArchive?.name}</strong>?
                This will unpublish the plan from public RN/PN course pages. In accordance with historical data safeguards, existing purchases and active entitlements will remain valid and intact.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setArchiveDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleArchiveConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Archiving..." : "Archive & Deactivate Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

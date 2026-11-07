"use client";

import * as React from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  UserCheck,
  CreditCard,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@/lib/notifications";
import type { Product } from "@/lib/products";

interface ManualAuthorizationTabProps {
  canManagePlans: boolean;
}

export function ManualAuthorizationTab({ canManagePlans }: ManualAuthorizationTabProps) {
  const queryClient = useQueryClient();

  // Wizard Dialog State
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Candidate Search State (Step 1)
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchingLearners, setIsSearchingLearners] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [selectedLearner, setSelectedLearner] = React.useState<any | null>(null);

  // Target Plan State (Step 2)
  const [selectedPlan, setSelectedPlan] = React.useState<Product | null>(null);

  // Payment Details (Step 3 & 4)
  const [paymentForm, setPaymentForm] = React.useState({
    paymentMethod: "M-Pesa",
    amount: 59,
    currency: "USD",
    transactionReference: "",
    receiptNumber: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    evidenceUrl: "",
    notes: "",
    autoVerifyAndActivate: true,
  });

  // Verification & Rejection Modals
  const [verifyDialogOpen, setVerifyDialogOpen] = React.useState(false);
  const [selectedAuthForVerify, setSelectedAuthForVerify] = React.useState<any | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [selectedAuthForReject, setSelectedAuthForReject] = React.useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Filters for Pending Queue
  const [statusFilter, setStatusFilter] = React.useState<string>("PendingVerification");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  // Load available subscription plans for Step 2
  const { data: availablePlans = [] } = useQuery<Product[]>({
    queryKey: ["admin-subscriptions"],
    queryFn: async (): Promise<Product[]> => {
      const res = await fetch("/api/admin/subscriptions");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.plans ?? []).filter((p: Product) => p.isActive !== false);
    },
    staleTime: 60 * 1000,
  });

  // Load Authorizations list
  const {
    data: authorizationsData,
    isLoading: isLoadingAuthorizations,
    refetch: refetchAuthorizations,
  } = useQuery({
    queryKey: ["admin-manual-authorizations", statusFilter, methodFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (methodFilter && methodFilter !== "all") params.append("paymentMethod", methodFilter);
      if (searchTerm) params.append("search", searchTerm);
      const res = await fetch(`/api/admin/monetization/manual-authorizations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load authorizations");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const authorizations: any[] = authorizationsData?.authorizations ?? [];
  const totalCount: number = authorizationsData?.totalCount ?? authorizations.length;

  // Search learners effect
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingLearners(true);
      try {
        const res = await fetch(`/api/admin/monetization/learners/search?query=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.learners)) {
            setSearchResults(json.learners);
          }
        }
      } catch (err) {
        console.error("Learner search error:", err);
      } finally {
        setIsSearchingLearners(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Mutations
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/monetization/manual-authorizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record manual payment");
      }
      return data;
    },
    onSuccess: (data: any) => {
      notify.success(data.message || "Manual payment recorded successfully");
      refetchAuthorizations();
      queryClient.invalidateQueries({ queryKey: ["admin-monetization-analytics-summary"] });
      setWizardOpen(false);
      resetWizard();
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to record payment");
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) => {
      const res = await fetch(`/api/admin/monetization/manual-authorizations/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to verify authorization");
      }
      return data;
    },
    onSuccess: (data: any) => {
      notify.success(data.message || "Payment verified and learner subscription activated");
      refetchAuthorizations();
      queryClient.invalidateQueries({ queryKey: ["admin-monetization-analytics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-learner-subscriptions"] });
      setVerifyDialogOpen(false);
      setSelectedAuthForVerify(null);
      setRejectDialogOpen(false);
      setSelectedAuthForReject(null);
      setRejectionReason("");
    },
    onError: (err: any) => {
      notify.error(err.message || "Failed to verify authorization");
    },
  });

  const resetWizard = () => {
    setWizardStep(1);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedLearner(null);
    setSelectedPlan(null);
    setPaymentForm({
      paymentMethod: "M-Pesa",
      amount: 59,
      currency: "USD",
      transactionReference: "",
      receiptNumber: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      evidenceUrl: "",
      notes: "",
      autoVerifyAndActivate: true,
    });
  };

  const handleOpenWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const handleSelectLearner = (learner: any) => {
    setSelectedLearner(learner);
    setWizardStep(2);
  };

  const handleSelectPlan = (plan: Product) => {
    setSelectedPlan(plan);
    setPaymentForm((prev) => ({
      ...prev,
      amount: plan.price,
      currency: plan.currency || "USD",
    }));
    setWizardStep(3);
  };

  const handleSubmitManualPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLearner || !selectedPlan) {
      notify.error("Please complete candidate and plan selection");
      return;
    }
    if (!paymentForm.transactionReference.trim()) {
      notify.error("Transaction reference or deposit code is required");
      return;
    }

    const payload = {
      userId: selectedLearner.id,
      planId: selectedPlan.id,
      paymentMethod: paymentForm.paymentMethod,
      amount: Number(paymentForm.amount),
      currency: paymentForm.currency,
      transactionReference: paymentForm.transactionReference.trim(),
      receiptNumber: paymentForm.receiptNumber.trim() || undefined,
      paymentDate: paymentForm.paymentDate,
      evidenceUrl: paymentForm.evidenceUrl.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
      autoVerifyAndActivate: paymentForm.autoVerifyAndActivate,
    };

    recordPaymentMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Recording Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border">
        <div>
          <h2 className="text-base font-serif font-semibold text-foreground">
            Manual Subscription Authorization &amp; Offline Payment Verification
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record, verify, and atomically activate offline payments for bank wire transfers, M-Pesa, and cash transactions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchAuthorizations()}
            disabled={isLoadingAuthorizations}
            className="h-9 rounded-xl text-xs"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoadingAuthorizations ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenWizard}
            className="h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Offline Payment
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Buttons */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            {(["PendingVerification", "Verified", "Rejected", "all"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === st
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "PendingVerification"
                  ? "Pending Verification"
                  : st === "all"
                  ? "All Statuses"
                  : st}
              </button>
            ))}
          </div>

          {/* Payment Method filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border bg-background text-xs"
          >
            <option value="all">All Payment Methods</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="BankTransfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="DirectDeposit">Direct Deposit</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ref, learner, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* Authorizations Queue Table */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader className="py-3.5 px-5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Manual Payment Queue ({totalCount})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingAuthorizations ? (
            <div className="py-16 text-center text-muted-foreground text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Loading authorizations queue...
            </div>
          ) : authorizations.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-xs">
              <Clock className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="font-medium text-foreground">No records found</p>
              <p className="mt-0.5">There are no offline payment records matching the selected filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Plan &amp; Course</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {authorizations.map((auth: any) => {
                    const isPending = auth.status === "PendingVerification";
                    const isVerified = auth.status === "Verified";
                    const isRejected = auth.status === "Rejected";

                    return (
                      <tr key={auth.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                          {auth.transactionReference || "None"}
                          {auth.receiptNumber && (
                            <div className="text-[10px] text-muted-foreground font-sans">
                              Rcpt: {auth.receiptNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">{auth.userName || "Candidate"}</div>
                          <div className="text-muted-foreground text-[11px]">{auth.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{auth.planName}</div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-0.5">
                            {auth.course || "RN"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="secondary" className="text-[10px]">
                            {auth.paymentMethod}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          ${auth.amount} {auth.currency}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPending && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 text-[10px]">
                              Pending
                            </Badge>
                          )}
                          {isVerified && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 text-[10px]">
                              Verified &amp; Active
                            </Badge>
                          )}
                          {isRejected && (
                            <Badge variant="destructive" className="text-[10px]">
                              Rejected
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                          <div>{auth.recordedBy || "Admin"}</div>
                          <div className="text-[10px]">
                            {auth.recordedAt ? new Date(auth.recordedAt).toLocaleDateString() : ""}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setSelectedAuthForVerify(auth);
                                  setVerifyDialogOpen(true);
                                }}
                                className="h-7 px-2.5 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                              >
                                Verify
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAuthForReject(auth);
                                  setRejectDialogOpen(true);
                                }}
                                className="h-7 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              {isVerified ? `Verified by ${auth.verifiedBy || "SuperAdmin"}` : "Rejected"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Step Offline Payment Recording Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Record Offline Payment &amp; Authorize Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              Step {wizardStep} of 4:{" "}
              {wizardStep === 1 && "Select Candidate Account"}
              {wizardStep === 2 && "Select Target Subscription Plan"}
              {wizardStep === 3 && "Enter Payment & Reference Details"}
              {wizardStep === 4 && "Review & Submit Authorization"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Candidate Lookup */}
          {wizardStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Search Candidate</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by full name, email address, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                    autoFocus
                  />
                </div>
              </div>

              {isSearchingLearners && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                  Searching candidate directory...
                </div>
              )}

              {!isSearchingLearners && searchResults.length > 0 && (
                <div className="border border-border rounded-xl divide-y divide-border/60 max-h-60 overflow-y-auto">
                  {searchResults.map((learner) => (
                    <button
                      key={learner.id}
                      type="button"
                      onClick={() => handleSelectLearner(learner)}
                      className="w-full p-3 text-left hover:bg-muted/40 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">
                          {learner.firstName} {learner.lastName}
                        </div>
                        <div className="text-muted-foreground text-[11px]">{learner.email}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {learner.pathway || "RN"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {!isSearchingLearners && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="p-4 text-center rounded-xl bg-muted/30 text-xs text-muted-foreground">
                  No candidates found matching &quot;{searchQuery}&quot;. Please verify the email or name.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Course & Plan Selection */}
          {wizardStep === 2 && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-muted/40 text-xs flex justify-between items-center">
                <div>
                  <span className="text-muted-foreground">Selected Candidate: </span>
                  <strong className="text-foreground">
                    {selectedLearner?.firstName} {selectedLearner?.lastName} ({selectedLearner?.email})
                  </strong>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWizardStep(1)}
                  className="h-6 text-[11px] text-primary"
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Choose Subscription Plan</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className={`p-3 rounded-xl border text-left transition-all text-xs flex flex-col justify-between ${
                        selectedPlan?.id === plan.id
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-foreground">{plan.name}</div>
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {plan.pathway} Pathway
                        </Badge>
                      </div>
                      <div className="mt-3 font-semibold text-primary">
                        ${plan.price} / {plan.billingInterval}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {wizardStep === 3 && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-md border bg-background text-xs"
                  >
                    <option value="M-Pesa">M-Pesa Mobile Money</option>
                    <option value="BankTransfer">Bank Wire / Transfer</option>
                    <option value="Cash">Cash Deposit</option>
                    <option value="DirectDeposit">Direct Deposit</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Amount Paid (USD)</label>
                  <Input
                    type="number"
                    step="any"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Unique Transaction Reference <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. M-Pesa Code (QHD7289X) or Bank Wire Ref"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="h-8 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Protected by database deduplication index to prevent duplicate credit.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Receipt Number (Optional)</label>
                  <Input
                    placeholder="e.g. REC-2026-0042"
                    value={paymentForm.receiptNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">Payment Date</label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Payment Evidence URL / Reference (Optional)</label>
                <Input
                  placeholder="https://storage... or document tracking number"
                  value={paymentForm.evidenceUrl}
                  onChange={(e) => setPaymentForm({ ...paymentForm, evidenceUrl: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Administrative Notes (Audit log)</label>
                <Input
                  placeholder="e.g. Approved offline registration by Dean / Bursar"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.autoVerifyAndActivate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, autoVerifyAndActivate: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="font-medium text-foreground text-xs">
                  Authorize &amp; Activate Immediately (Atomically unlocks candidate study access)
                </span>
              </label>
            </div>
          )}

          {/* Step 4: Review Summary */}
          {wizardStep === 4 && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="font-semibold text-foreground text-sm border-b pb-2">
                  Authorization Summary
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Candidate:</span>
                  <span className="font-medium text-foreground">
                    {selectedLearner?.firstName} {selectedLearner?.lastName} ({selectedLearner?.email})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium text-foreground">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Course Pathway:</span>
                  <span className="font-medium text-foreground">{selectedPlan?.pathway}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground">{paymentForm.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold text-foreground">${paymentForm.amount} {paymentForm.currency}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Transaction Reference:</span>
                  <span className="font-mono font-medium text-foreground">{paymentForm.transactionReference}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Immediate Activation:</span>
                  <span className="font-medium text-foreground">
                    {paymentForm.autoVerifyAndActivate ? "Yes (Active immediately)" : "No (Enters pending queue)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {wizardStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                className="rounded-xl text-xs"
              >
                Back
              </Button>
            )}
            {wizardStep < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWizardOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
            )}
            {wizardStep === 3 && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!paymentForm.transactionReference.trim()) {
                    notify.error("Transaction reference is required");
                    return;
                  }
                  setWizardStep(4);
                }}
                className="rounded-xl text-xs bg-primary text-primary-foreground font-semibold"
              >
                Review Summary <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
            {wizardStep === 4 && (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitManualPayment}
                disabled={recordPaymentMutation.isPending}
                className="rounded-xl text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {recordPaymentMutation.isPending ? "Recording..." : "Confirm & Authorize"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify & Activate Modal */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Verify &amp; Activate Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirming offline payment verification for <strong className="text-foreground">{selectedAuthForVerify?.userName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-muted/40 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-medium text-foreground">{selectedAuthForVerify?.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium text-foreground">${selectedAuthForVerify?.amount} {selectedAuthForVerify?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-mono font-medium text-foreground">{selectedAuthForVerify?.transactionReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method:</span>
              <span className="font-medium text-foreground">{selectedAuthForVerify?.paymentMethod}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This action creates an authoritative order in the financial ledger, starts the subscription, assigns course entitlements, and updates the candidate’s access status.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVerifyDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                selectedAuthForVerify &&
                verifyPaymentMutation.mutate({ id: selectedAuthForVerify.id, approved: true })
              }
              disabled={verifyPaymentMutation.isPending}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {verifyPaymentMutation.isPending ? "Verifying..." : "Confirm & Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Modal */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Reject Payment Authorization
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rejecting payment reference <strong className="text-foreground">{selectedAuthForReject?.transactionReference}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-xs">
            <label className="font-medium text-foreground">Rejection Reason</label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid bank reference, transaction not found on bank statement..."
              className="w-full rounded-md border bg-background p-2.5 text-xs focus:ring-2 focus:ring-destructive"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                if (!rejectionReason.trim()) {
                  notify.error("Rejection reason is required");
                  return;
                }
                if (selectedAuthForReject) {
                  verifyPaymentMutation.mutate({
                    id: selectedAuthForReject.id,
                    approved: false,
                    reason: rejectionReason.trim(),
                  });
                }
              }}
              disabled={verifyPaymentMutation.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              {verifyPaymentMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

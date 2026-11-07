"use client";

import * as React from "react";
import {
  Users,
  Search,
  Calendar,
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface LearnerSubscriptionsTabProps {
  canManagePlans: boolean;
}

export function LearnerSubscriptionsTab({ canManagePlans }: LearnerSubscriptionsTabProps) {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [pathwayFilter, setPathwayFilter] = React.useState<string>("all");

  // Lifecycle Action Dialog States
  const [extendDialogOpen, setExtendDialogOpen] = React.useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = React.useState(false);
  const [reinstateDialogOpen, setReinstateDialogOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  const [selectedSub, setSelectedSub] = React.useState<any | null>(null);

  // Form Inputs
  const [additionalDays, setAdditionalDays] = React.useState<number>(30);
  const [actionReason, setActionReason] = React.useState<string>("");

  // Load subscriptions query
  const {
    data: subData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-learner-subscriptions", statusFilter, pathwayFilter, searchTerm],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") q.append("status", statusFilter);
      if (pathwayFilter && pathwayFilter !== "all") q.append("pathway", pathwayFilter);
      if (searchTerm) q.append("search", searchTerm);
      const res = await fetch(`/api/admin/monetization/learner-subscriptions?${q.toString()}`);
      if (!res.ok) throw new Error("Failed to load learner subscriptions");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const subscriptions: any[] = subData?.subscriptions ?? [];
  const totalCount: number = subData?.totalCount ?? subscriptions.length;

  // Mutations
  const extendMutation = useMutation({
    mutationFn: async ({ id, days, notes }: { id: string; days: number; notes?: string }) => {
      const res = await fetch(`/api/admin/monetization/learner-subscriptions/${id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalDays: days, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to extend subscription");
      return data;
    },
    onSuccess: (data) => {
      notify.success(data.message || "Subscription extended successfully");
      refetch();
      setExtendDialogOpen(false);
      setSelectedSub(null);
    },
    onError: (err: any) => notify.error(err.message || "Failed to extend"),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/admin/monetization/learner-subscriptions/${id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to suspend subscription");
      return data;
    },
    onSuccess: (data) => {
      notify.success(data.message || "Subscription suspended");
      refetch();
      setSuspendDialogOpen(false);
      setSelectedSub(null);
    },
    onError: (err: any) => notify.error(err.message || "Failed to suspend"),
  });

  const reinstateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/monetization/learner-subscriptions/${id}/reinstate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to reinstate subscription");
      return data;
    },
    onSuccess: (data) => {
      notify.success(data.message || "Subscription reinstated to Active");
      refetch();
      setReinstateDialogOpen(false);
      setSelectedSub(null);
    },
    onError: (err: any) => notify.error(err.message || "Failed to reinstate"),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/admin/monetization/learner-subscriptions/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to cancel subscription");
      return data;
    },
    onSuccess: (data) => {
      notify.success(data.message || "Subscription cancelled");
      refetch();
      setCancelDialogOpen(false);
      setSelectedSub(null);
    },
    onError: (err: any) => notify.error(err.message || "Failed to cancel"),
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border">
        <div>
          <h2 className="text-base font-serif font-semibold text-foreground">
            Learner Subscription Lifecycle Administration
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit learner access grants, manage validity extensions, suspend accounts, and view authoritative entitlement scopes.
          </p>
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
          Refresh Records
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter buttons */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            {(["all", "Active", "Expired", "Suspended", "Cancelled"] as const).map((st) => (
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
                {st === "all" ? "All Statuses" : st}
              </button>
            ))}
          </div>

          {/* Pathway filter */}
          <select
            value={pathwayFilter}
            onChange={(e) => setPathwayFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border bg-background text-xs"
          >
            <option value="all">All Pathways</option>
            <option value="RN">RN Pathway</option>
            <option value="PN">PN Pathway</option>
            <option value="Both">Dual Access (Both)</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search candidate name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader className="py-3.5 px-5 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Enrolled Learners ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Loading learner subscriptions...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-xs">
              <Users className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="font-medium text-foreground">No subscription records found</p>
              <p className="mt-0.5">Try altering the status or pathway filters above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Plan Name</th>
                    <th className="py-3 px-4">Pathway</th>
                    <th className="py-3 px-4">Activated</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4">Days Left</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {subscriptions.map((sub: any) => {
                    const statusStr = sub.status || "Active";
                    const isSuspended = statusStr === "Suspended";
                    const isActive = statusStr === "Active";
                    const isExpired = statusStr === "Expired";
                    const isCancelled = statusStr === "Cancelled";

                    return (
                      <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">{sub.userName || "Candidate"}</div>
                          <div className="text-muted-foreground text-[11px]">{sub.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {sub.planName}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {sub.pathway || "RN"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                          {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                          {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "Lifetime"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          {sub.remainingDays !== undefined ? (
                            <span className={sub.remainingDays <= 3 && isActive ? "text-amber-600 font-bold" : ""}>
                              {sub.remainingDays}d
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {sub.isManual ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Offline / Manual
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Online Checkout
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isActive && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 text-[10px]">
                              Active
                            </Badge>
                          )}
                          {isSuspended && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 text-[10px]">
                              Suspended
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="secondary" className="text-muted-foreground text-[10px]">
                              Expired
                            </Badge>
                          )}
                          {isCancelled && (
                            <Badge variant="destructive" className="text-[10px]">
                              Cancelled
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Extend Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Extend subscription validity"
                              onClick={() => {
                                setSelectedSub(sub);
                                setAdditionalDays(30);
                                setActionReason("");
                                setExtendDialogOpen(true);
                              }}
                              className="h-7 px-2 rounded-lg text-xs text-primary hover:bg-primary/10"
                            >
                              <PlusCircle className="h-3.5 w-3.5 mr-1" />
                              Extend
                            </Button>

                            {/* Suspend / Reinstate Toggle */}
                            {isSuspended ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Reinstate subscription"
                                onClick={() => {
                                  setSelectedSub(sub);
                                  setReinstateDialogOpen(true);
                                }}
                                className="h-7 px-2 rounded-lg text-xs text-emerald-600 hover:bg-emerald-50"
                              >
                                <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                Reinstate
                              </Button>
                            ) : isActive ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Suspend access"
                                onClick={() => {
                                  setSelectedSub(sub);
                                  setActionReason("");
                                  setSuspendDialogOpen(true);
                                }}
                                className="h-7 px-2 rounded-lg text-xs text-amber-600 hover:bg-amber-50"
                              >
                                <PauseCircle className="h-3.5 w-3.5 mr-1" />
                                Suspend
                              </Button>
                            ) : null}

                            {/* Cancel */}
                            {isActive && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Cancel subscription"
                                onClick={() => {
                                  setSelectedSub(sub);
                                  setActionReason("");
                                  setCancelDialogOpen(true);
                                }}
                                className="h-7 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
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

      {/* EXTEND SUBSCRIPTION MODAL */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Extend Learner Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              Grant additional access days to <strong className="text-foreground">{selectedSub?.userName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Additional Days to Add</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 30, 90].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={additionalDays === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdditionalDays(d)}
                    className="h-8 text-xs rounded-lg"
                  >
                    +{d} Days
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                value={additionalDays}
                onChange={(e) => setAdditionalDays(Number(e.target.value))}
                className="h-8 text-xs mt-2"
                placeholder="Or specify custom number of days"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Administrative Reason / Notes</label>
              <Input
                placeholder="e.g. Approved extension for medical leave"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExtendDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                selectedSub &&
                extendMutation.mutate({
                  id: selectedSub.id,
                  days: additionalDays,
                  notes: actionReason.trim() || undefined,
                })
              }
              disabled={extendMutation.isPending}
              className="rounded-xl text-xs bg-primary text-primary-foreground font-semibold"
            >
              {extendMutation.isPending ? "Extending..." : "Confirm Extension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUSPEND SUBSCRIPTION MODAL */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <PauseCircle className="h-5 w-5" />
              Suspend Learner Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Temporarily halts feature access for <strong className="text-foreground">{selectedSub?.userName}</strong> without deleting their records or progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-xs py-2">
            <label className="font-medium text-foreground">Suspension Reason <span className="text-destructive">*</span></label>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Account audit, payment dispute, student leave request..."
              className="w-full rounded-md border bg-background p-2.5 text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSuspendDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!actionReason.trim()) {
                  notify.error("Suspension reason is required");
                  return;
                }
                if (selectedSub) {
                  suspendMutation.mutate({ id: selectedSub.id, reason: actionReason.trim() });
                }
              }}
              disabled={suspendMutation.isPending}
              className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {suspendMutation.isPending ? "Suspending..." : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REINSTATE SUBSCRIPTION MODAL */}
      <Dialog open={reinstateDialogOpen} onOpenChange={setReinstateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Reinstate Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              Restore active study access and feature entitlements for <strong className="text-foreground">{selectedSub?.userName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground py-2">
            The candidate will immediately regain access to their questions bank, CAT examinations, and AI study coach.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReinstateDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => selectedSub && reinstateMutation.mutate(selectedSub.id)}
              disabled={reinstateMutation.isPending}
              className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {reinstateMutation.isPending ? "Reinstating..." : "Confirm Reinstatement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL SUBSCRIPTION MODAL */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              Early termination of access for <strong className="text-foreground">{selectedSub?.userName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-xs py-2">
            <label className="font-medium text-foreground">Cancellation Reason (Optional)</label>
            <Input
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Student passed examination early, refund issued"
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelDialogOpen(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() =>
                selectedSub &&
                cancelMutation.mutate({
                  id: selectedSub.id,
                  reason: actionReason.trim() || undefined,
                })
              }
              disabled={cancelMutation.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

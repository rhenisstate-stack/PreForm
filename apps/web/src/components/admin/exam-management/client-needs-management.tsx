"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ClientNeedItem {
  id: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  pathway: "rn" | "pn" | "both" | string;
  questionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ClientNeedsManagementProps {
  canModify?: boolean;
  onCatalogChanged?: () => void;
}

export function ClientNeedsManagement({
  canModify = true,
  onCatalogChanged,
}: ClientNeedsManagementProps) {
  const [clientNeeds, setClientNeeds] = useState<ClientNeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [pathwayFilter, setPathwayFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "code" | "questions">("order");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Create / Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClientNeedItem | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pathway, setPathway] = useState<"rn" | "pn" | "both">("both");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Details Dialog
  const [detailItem, setDetailItem] = useState<ClientNeedItem | null>(null);

  // Delete / Dependency Protection Dialog
  const [deleteTarget, setDeleteTarget] = useState<ClientNeedItem | null>(null);
  const [deleteConflictError, setDeleteConflictError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadClientNeeds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/client-needs");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to load Client Needs categories.");
      }
      setClientNeeds(Array.isArray(data.clientNeeds) ? data.clientNeeds : []);
    } catch (err: any) {
      setError(err.message || "Failed to load Client Needs categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClientNeeds();
  }, [loadClientNeeds]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pathwayFilter, statusFilter, sortBy]);

  const filteredItems = useMemo(() => {
    return clientNeeds
      .filter((item) => {
        if (pathwayFilter !== "all" && item.pathway !== pathwayFilter && item.pathway !== "both") {
          return false;
        }
        if (statusFilter === "active" && !item.isActive) return false;
        if (statusFilter === "inactive" && item.isActive) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.code.toLowerCase().includes(q) ||
            (item.description || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "code") return a.code.localeCompare(b.code);
        if (sortBy === "questions") return (b.questionCount || 0) - (a.questionCount || 0);
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name);
      });
  }, [clientNeeds, pathwayFilter, statusFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const openCreateDialog = () => {
    setEditingItem(null);
    setCode("");
    setName("");
    setPathway("both");
    setDescription("");
    setDisplayOrder(clientNeeds.length + 1);
    setIsActive(true);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: ClientNeedItem) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setPathway(
      item.pathway === "rn" || item.pathway === "pn" ? item.pathway : "both"
    );
    setDescription(item.description || "");
    setDisplayOrder(item.displayOrder ?? 1);
    setIsActive(item.isActive);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setFormError("Client Needs code is required.");
      return;
    }
    if (!name.trim()) {
      setFormError("Client Needs category name is required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const url = editingItem
        ? `/api/admin/client-needs/${editingItem.id}`
        : "/api/admin/client-needs";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          pathway,
          description: description.trim(),
          displayOrder: Number(displayOrder) || 1,
          isActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.detail || "Failed to save Client Needs category.");
      }

      setDialogOpen(false);
      setBannerMessage({
        type: "success",
        text: editingItem
          ? `Client Needs category "${name.trim()}" updated.`
          : `Client Needs category "${name.trim()}" created.`,
      });
      await loadClientNeeds();
      onCatalogChanged?.();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Client Needs category.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: ClientNeedItem) => {
    setDeleteTarget(item);
    setDeleteConflictError(null);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteConflictError(null);
    try {
      const res = await fetch(`/api/admin/client-needs/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setDeleteConflictError(
          data.error ||
            data.detail ||
            `Cannot delete "${deleteTarget.name}" because questions or examination blueprints reference it. Deactivate it instead.`
        );
        return;
      }

      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.detail || "Failed to delete Client Needs category.");
      }

      setBannerMessage({
        type: "success",
        text: `Client Needs category "${deleteTarget.name}" deleted.`,
      });
      setDeleteTarget(null);
      await loadClientNeeds();
      onCatalogChanged?.();
    } catch (err: any) {
      setDeleteConflictError(err.message || "Failed to delete Client Needs category.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/admin/client-needs/${deleteTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to deactivate Client Needs category.");
      }

      setBannerMessage({
        type: "success",
        text: `Client Needs category "${deleteTarget.name}" has been deactivated while preserving historical questions and exam blueprints.`,
      });
      setDeleteTarget(null);
      await loadClientNeeds();
      onCatalogChanged?.();
    } catch (err: any) {
      setDeleteConflictError(err.message || "Failed to deactivate Client Needs category.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const renderPathwayBadge = (p: string) => {
    const normalized = (p || "both").toLowerCase();
    if (normalized === "rn") {
      return (
        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25">
          NCLEX-RN
        </Badge>
      );
    }
    if (normalized === "pn") {
      return (
        <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25">
          NCLEX-PN
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25">
        NCLEX-RN & PN
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="client-needs-management">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            <ClipboardList className="w-3.5 h-3.5" />
            Classification System 2
          </div>
          <h2 className="text-xl font-bold text-foreground">
            NCLEX Client Needs Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage official NCLEX Client Needs categories and subcategories integrated with the centralized Question Repository.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadClientNeeds}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canModify && (
            <Button
              size="sm"
              onClick={openCreateDialog}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Client Need
            </Button>
          )}
        </div>
      </div>

      {bannerMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-sm ${
            bannerMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-card border border-border rounded-xl p-4">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search Client Needs by code, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <select
            aria-label="Filter Client Needs by Pathway"
            value={pathwayFilter}
            onChange={(e) => setPathwayFilter(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
          >
            <option value="all">All Programmes (RN & PN)</option>
            <option value="rn">NCLEX-RN</option>
            <option value="pn">NCLEX-PN</option>
            <option value="both">Both Programmes</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Filter Client Needs by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Sort Client Needs"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
          >
            <option value="order">Sort by Display Order</option>
            <option value="name">Sort by Name (A–Z)</option>
            <option value="code">Sort by Code</option>
            <option value="questions">Sort by Question Count</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-sm">Loading Client Needs categories...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={loadClientNeeds}>
              Retry
            </Button>
          </div>
        ) : pagedItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                No Client Needs categories found
              </p>
              <p className="text-xs text-muted-foreground">
                Create NCLEX Client Needs categories to classify questions and allocate blueprint quotas.
              </p>
            </div>
            {canModify && (
              <Button size="sm" onClick={openCreateDialog} className="bg-indigo-600 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Client Need
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Programme Scope</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Repository Questions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {pagedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{renderPathwayBadge(item.pathway)}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                      #{item.displayOrder ?? 0}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.questionCount ?? 0} Qs
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailItem(item)}
                          title="View Client Need Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canModify && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                              title="Edit Client Need"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(item)}
                              title="Delete or Deactivate Client Need"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredItems.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Client Needs Category" : "Create Client Needs Category"}
            </DialogTitle>
            <DialogDescription>
              Configure an NCLEX Client Needs classification for question tagging and examination blueprint quotas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cn-code">Category Code *</Label>
                <Input
                  id="cn-code"
                  placeholder="e.g., PHARM-THERAPIES"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cn-pathway">Programme Scope *</Label>
                <select
                  id="cn-pathway"
                  value={pathway}
                  onChange={(e) => setPathway(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="both">Both (NCLEX-RN & NCLEX-PN)</option>
                  <option value="rn">NCLEX-RN Only</option>
                  <option value="pn">NCLEX-PN Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cn-name">Category Name *</Label>
              <Input
                id="cn-name"
                placeholder="e.g., Pharmacological and Parenteral Therapies"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cn-desc">Description</Label>
              <textarea
                id="cn-desc"
                rows={3}
                placeholder="Describe the NCLEX test plan competencies assessed in this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cn-order">Display Order</Label>
                <Input
                  id="cn-order"
                  type="number"
                  min={0}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="cn-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="cn-active" className="cursor-pointer">
                  Active for questions & blueprints
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {saving
                  ? "Saving..."
                  : editingItem
                    ? "Save Changes"
                    : "Create Client Need"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detailItem?.name}</DialogTitle>
            <DialogDescription>
              Code: <span className="font-mono font-semibold">{detailItem?.code}</span>
            </DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {renderPathwayBadge(detailItem.pathway)}
                <Badge variant={detailItem.isActive ? "default" : "secondary"}>
                  {detailItem.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{detailItem.questionCount ?? 0} Linked Questions</Badge>
              </div>
              <p className="text-muted-foreground">
                {detailItem.description || "No description provided."}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete / Dependency Protection Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
              Delete Client Needs Category
            </DialogTitle>
            <DialogDescription>
              Confirm removal of <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}).
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-4 text-sm">
              {((deleteTarget.questionCount ?? 0) > 0 || deleteConflictError) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Historical & Dependency Protection Active
                  </div>
                  <p>
                    {deleteConflictError ||
                      `This Client Needs category is referenced by ${deleteTarget.questionCount ?? 0} question(s) in the Question Repository. Deactivating is recommended to preserve historical examination integrity.`}
                  </p>
                </div>
              )}

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </Button>
                {deleteTarget.isActive && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDeactivateInstead}
                    disabled={deleteSubmitting}
                  >
                    Deactivate Instead
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleExecuteDelete}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? "Processing..." : "Delete Permanently"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

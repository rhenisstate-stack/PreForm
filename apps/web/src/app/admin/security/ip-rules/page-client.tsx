"use client";

import * as React from "react";
import {
  Network,
  Plus,
  RefreshCw,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
  Ban,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import type { AdminIpRuleItem } from "@/lib/api-services";

export function AdminIpRulesClient() {
  const [rules, setRules] = React.useState<AdminIpRuleItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterType, setFilterType] = React.useState("");

  // Create modal
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    ipAddressOrCidr: "",
    ruleType: "Blacklist",
    description: "",
    expiresAt: "",
  });
  const [createLoading, setCreateLoading] = React.useState(false);

  const fetchRules = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("ruleType", filterType);
      const res = await fetch(`/api/admin/security/ip-rules?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.rules) {
        setRules(data.rules);
      }
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to load IP rules"));
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  React.useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleActive = async (rule: AdminIpRuleItem) => {
    try {
      const res = await fetch(`/api/admin/security/ip-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle rule state");
      notify.success(`Rule ${rule.isActive ? "deactivated" : "activated"}`);
      fetchRules();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Update failed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this IP access rule?")) return;
    try {
      const res = await fetch(`/api/admin/security/ip-rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      notify.success("IP rule removed");
      fetchRules();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Delete failed"));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/security/ip-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create IP rule");

      notify.success("IP rule created successfully");
      setCreateModalOpen(false);
      setCreateForm({ ipAddressOrCidr: "", ruleType: "Blacklist", description: "", expiresAt: "" });
      fetchRules();
    } catch (err) {
      notify.error(sanitizeErrorMessage(err, "Failed to create rule"));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            IP Access Rule Governance
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure authoritative IP blacklists and whitelists with CIDR notation support for edge perimeter defense.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRules} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 px-3 rounded-md border bg-background text-sm"
        >
          <option value="">All Rule Types</option>
          <option value="Blacklist">Blacklists Only</option>
          <option value="Whitelist">Whitelists Only</option>
        </select>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left">IP / CIDR Pattern</th>
                <th className="py-3 px-4 text-left">Rule Type</th>
                <th className="py-3 px-4 text-left">Description</th>
                <th className="py-3 px-4 text-left">Expires</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading IP rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No IP access rules have been configured.
                  </td>
                </tr>
              ) : (
                rules.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {r.ipAddressOrCidr}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={r.ruleType === "Blacklist" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {r.ruleType}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                      {r.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={r.isActive ? "default" : "outline"}
                        className={`text-xs cursor-pointer ${
                          r.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""
                        }`}
                        onClick={() => handleToggleActive(r)}
                        title="Click to toggle active state"
                      >
                        {r.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(r.id)}
                        title="Delete Rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Rule Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add IP Access Rule</DialogTitle>
              <DialogDescription>
                Define an individual IP address or a CIDR subnet block to blacklist or whitelist.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">IP Address or CIDR Block</label>
                <Input
                  required
                  placeholder="e.g. 203.0.113.45 or 198.51.100.0/24"
                  value={createForm.ipAddressOrCidr}
                  onChange={(e) => setCreateForm({ ...createForm, ipAddressOrCidr: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Rule Type</label>
                <select
                  value={createForm.ruleType}
                  onChange={(e) => setCreateForm({ ...createForm, ruleType: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="Blacklist">Blacklist (Block Traffic)</option>
                  <option value="Whitelist">Whitelist (Explicitly Trust)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Description / Reason</label>
                <Input
                  placeholder="e.g. Malicious credential stuffing origin, partner VPN"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Expiration Date (Optional)</label>
                <Input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLoading || !createForm.ipAddressOrCidr.trim()}>
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

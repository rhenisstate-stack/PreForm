"use client";

import * as React from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Loader2,
  Calendar,
  Layers,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FullPageDetailsLayout } from "@/components/ui/full-page-crud";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import type { AdminAuditLogItem } from "@/lib/api-services";

interface DetailedAuditLog extends AdminAuditLogItem {
  beforeValueJson?: string | null;
  afterValueJson?: string | null;
}

export function AdminAuditLogsClient() {
  const [logs, setLogs] = React.useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [actionFilter, setActionFilter] = React.useState("");
  const [entityTypeFilter, setEntityTypeFilter] = React.useState("");
  const [correlationIdFilter, setCorrelationIdFilter] = React.useState("");
  const [severityFilter, setSeverityFilter] = React.useState("");
  const [fromFilter, setFromFilter] = React.useState("");
  const [toFilter, setToFilter] = React.useState("");

  // Inspect Modal
  const [selectedLog, setSelectedLog] = React.useState<DetailedAuditLog | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = React.useState(false);
  const [inspectLoading, setInspectLoading] = React.useState(false);
  const [copiedCorrelationId, setCopiedCorrelationId] = React.useState(false);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      if (entityTypeFilter.trim()) params.set("entityType", entityTypeFilter.trim());
      if (correlationIdFilter.trim()) params.set("correlationId", correlationIdFilter.trim());
      if (severityFilter.trim()) params.set("severity", severityFilter.trim());
      if (fromFilter) params.set("from", new Date(fromFilter).toISOString());
      if (toFilter) params.set("to", new Date(toFilter).toISOString());
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load audit logs");
      }
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else {
        notify.error("Error loading logs", { description: data.error || "Unknown error" });
      }
    } catch (err) {
      notify.error("Network Error", { description: sanitizeErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityTypeFilter, correlationIdFilter, severityFilter, fromFilter, toFilter, page, pageSize]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleInspect = async (logId: string) => {
    setInspectLoading(true);
    setInspectModalOpen(true);
    try {
      const res = await fetch(`/api/admin/audit-logs/${encodeURIComponent(logId)}`);
      if (!res.ok) throw new Error("Failed to fetch log details");
      const data = await res.json();
      if (data.success && data.log) {
        setSelectedLog(data.log);
      } else {
        notify.error("Error", { description: data.error || "Unable to inspect log" });
      }
    } catch (err) {
      notify.error("Inspect Failed", { description: sanitizeErrorMessage(err) });
    } finally {
      setInspectLoading(false);
    }
  };

  const handleCopyCorrelationId = (id?: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedCorrelationId(true);
    setTimeout(() => setCopiedCorrelationId(false), 2000);
  };

  const handleResetFilters = () => {
    setActionFilter("");
    setEntityTypeFilter("");
    setCorrelationIdFilter("");
    setSeverityFilter("");
    setFromFilter("");
    setToFilter("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return <Badge className="bg-red-950 text-red-300 border-red-800 font-mono text-xs">CRITICAL</Badge>;
      case "error":
        return <Badge className="bg-rose-900/40 text-rose-300 border-rose-800 font-mono text-xs">ERROR</Badge>;
      case "warning":
        return <Badge className="bg-amber-900/40 text-amber-300 border-amber-800 font-mono text-xs">WARN</Badge>;
      default:
        return <Badge className="bg-blue-900/40 text-blue-300 border-blue-800 font-mono text-xs">INFO</Badge>;
    }
  };

  const formatJson = (raw?: string | null) => {
    if (!raw) return "null";
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  if (inspectModalOpen) {
    return (
      <FullPageDetailsLayout
        title="Audit Event Detail"
        subtitle="Complete forensic record including payload diff and correlation context."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Audit Logs", onClick: () => setInspectModalOpen(false) },
          { label: selectedLog?.action || "Audit Event Detail" },
        ]}
        onBack={() => setInspectModalOpen(false)}
      >
        {inspectLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading record details...
          </div>
        ) : selectedLog ? (
          <div className="space-y-6 text-xs">
            {/* Event Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/40 p-5 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Log ID:</span>
                <span className="font-mono font-medium text-foreground">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Timestamp:</span>
                <span className="font-medium text-foreground">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Action:</span>
                <span className="font-mono font-bold text-primary">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Outcome & Severity:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold uppercase text-foreground">{selectedLog.outcome}</span>
                  {getSeverityBadge(selectedLog.severity)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Entity:</span>
                <span className="font-medium text-foreground">
                  {selectedLog.entityType} ({selectedLog.entityId || "N/A"})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Actor:</span>
                <span className="font-medium text-foreground">
                  {selectedLog.actorName ? `${selectedLog.actorName} (${selectedLog.actorEmail})` : selectedLog.actorEmail || "System"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Client IP:</span>
                <span className="font-mono text-foreground">{selectedLog.ipAddress || "Unknown"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Correlation ID:</span>
                <div className="flex items-center gap-1 font-mono text-foreground">
                  <span>{selectedLog.correlationId || "None"}</span>
                  {selectedLog.correlationId && (
                    <button
                      onClick={() => handleCopyCorrelationId(selectedLog.correlationId)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedCorrelationId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border bg-card p-5 space-y-2">
              <span className="text-muted-foreground block font-medium">Description:</span>
              <div className="bg-background border border-border p-3 rounded text-foreground text-sm">
                {selectedLog.description}
              </div>
            </div>

            {/* User Agent */}
            {selectedLog.userAgent && (
              <div className="rounded-xl border bg-card p-5 space-y-2">
                <span className="text-muted-foreground block font-medium">User Agent:</span>
                <div className="bg-background border border-border p-3 rounded text-[11px] font-mono text-muted-foreground break-all">
                  {selectedLog.userAgent}
                </div>
              </div>
            )}

            {/* Before Value JSON */}
            {selectedLog.beforeValueJson && (
              <div className="rounded-xl border bg-card p-5 space-y-2">
                <span className="text-muted-foreground block font-medium">Before State:</span>
                <pre className="bg-muted p-4 rounded border border-border text-[11px] font-mono text-foreground overflow-x-auto">
                  {formatJson(selectedLog.beforeValueJson)}
                </pre>
              </div>
            )}

            {/* After Value JSON */}
            {selectedLog.afterValueJson && (
              <div className="rounded-xl border bg-card p-5 space-y-2">
                <span className="text-muted-foreground block font-medium">After State:</span>
                <pre className="bg-muted p-4 rounded border border-border text-[11px] font-mono text-foreground overflow-x-auto">
                  {formatJson(selectedLog.afterValueJson)}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </FullPageDetailsLayout>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Audit Trail & Governance Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable forensic record of all administrative, security, identity, and system operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Filter Audit Records
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Action</label>
            <Input
              placeholder="e.g. USER_LOGIN"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-8"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Entity Type</label>
            <Input
              placeholder="e.g. User, Role"
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-8"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Correlation ID</label>
            <Input
              placeholder="Filter by trace ID..."
              value={correlationIdFilter}
              onChange={(e) => {
                setCorrelationIdFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-8 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 text-xs bg-background border border-input rounded-md px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Severities</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Error">Error</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From</label>
            <Input
              type="date"
              value={fromFilter}
              onChange={(e) => {
                setFromFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-8"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <Input
              type="date"
              value={toFilter}
              onChange={(e) => {
                setToFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs h-8"
            />
          </div>
        </div>
        {(actionFilter || entityTypeFilter || correlationIdFilter || severityFilter || fromFilter || toFilter) && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {loading ? "Loading audit events..." : `${total} Total Events Recorded`}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Correlation ID</th>
                <th className="px-4 py-3 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Fetching immutable audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getSeverityBadge(log.severity)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <span className="font-medium text-foreground">{log.entityType}</span>
                      {log.entityId && (
                        <span className="ml-1 text-muted-foreground font-mono">
                          ({log.entityId.length > 8 ? `${log.entityId.substring(0, 8)}...` : log.entityId})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {log.actorEmail ? (
                        <div>
                          <div className="font-medium text-foreground">{log.actorName || log.actorEmail}</div>
                          {log.actorName && <div className="text-[10px] text-muted-foreground">{log.actorEmail}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">System / Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.outcome.toLowerCase() === "success" ? (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                          SUCCESS
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-rose-500 border-rose-500/30 bg-rose-500/10 text-[10px]">
                          FAILURE
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {log.correlationId ? (
                        <span
                          className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground cursor-pointer hover:bg-muted/80"
                          title={log.correlationId}
                          onClick={() => handleCopyCorrelationId(log.correlationId)}
                        >
                          {log.correlationId.length > 12 ? `${log.correlationId.substring(0, 12)}...` : log.correlationId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInspect(log.id)}
                        className="h-7 px-2 text-xs flex items-center gap-1 text-primary hover:text-primary hover:bg-primary/10 ml-auto"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-7 text-xs bg-background border border-input rounded px-1.5 text-foreground focus:outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>records per page</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Users,
  Clock,
  Cpu,
  ShieldAlert,
  RefreshCw,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandedLoading } from "@/components/layout/branded-loading";
import type { OperationalHealth } from "@/lib/api-services";

export function AdminMonitoringClient() {
  const [health, setHealth] = React.useState<OperationalHealth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchHealth = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/monitoring/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.data) {
          setHealth(data.data);
        } else if (data && data.status) {
          setHealth(data);
        }
      })
      .catch((err) => setError(err.message || "Health probe failed"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1 px-3">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Operational Healthy
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 py-1 px-3">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Performance Degraded
          </Badge>
        );
      default:
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1.5 py-1 px-3">
            <XCircle className="h-4 w-4" aria-hidden="true" /> Unhealthy Service
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-monitoring-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-secondary" aria-hidden="true" />
            Platform Observability &amp; Health
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            PostgreSQL connectivity latency, session concurrency accounting, runtime memory, and security incident telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {health && getStatusBadge(health.status)}
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Probe Health
          </Button>
        </div>
      </div>

      {loading ? (
        <BrandedLoading message="Executing live system health probe..." fullScreen={false} />
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-700 dark:text-rose-300 space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Health Probe Error
          </p>
          <p>{error}</p>
        </div>
      ) : health ? (
        <div className="space-y-6">
          {/* Main Health Diagnostic Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Latency */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Database Roundtrip</span>
                <Database className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {health.databaseLatencyMs} ms
              </p>
              <p
                className={`text-xs font-medium flex items-center gap-1 ${
                  health.databaseLatencyMs < 50
                    ? "text-emerald-600 dark:text-emerald-400"
                    : health.databaseLatencyMs < 200
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {health.databaseStatus}
              </p>
            </div>

            {/* Active Sessions */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Active User Sessions</span>
                <Users className="h-4 w-4 text-secondary" aria-hidden="true" />
              </div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {health.totalActiveSessions}
              </p>
              <p className="text-xs text-muted-foreground">
                {health.activeUsers} concurrent active users
              </p>
            </div>

            {/* Process Uptime */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Server Uptime</span>
                <Clock className="h-4 w-4 text-teal-600" aria-hidden="true" />
              </div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {health.serverUptime}
              </p>
              <p className="text-xs text-muted-foreground">ASP.NET Core 8 Web Host</p>
            </div>

            {/* Committed Memory */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Memory Working Set</span>
                <Cpu className="h-4 w-4 text-amber-500" aria-hidden="true" />
              </div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {health.committedMemoryMb} MB
              </p>
              <p className="text-xs text-muted-foreground">Committed process footprint</p>
            </div>
          </div>

          {/* Operational Events & Audit Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="font-serif font-semibold text-foreground text-base flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
                Security &amp; Operational Telemetry (Last 24 Hours)
              </h3>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between py-2 border-b border-border/60 text-xs">
                  <span className="text-muted-foreground">Total Audit Trail Events</span>
                  <span className="font-bold text-foreground">{health.auditEventsLast24Hours}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/60 text-xs">
                  <span className="text-muted-foreground">Security Incidents / Limit Exceeded</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {health.securityIncidentsLast24Hours}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="text-muted-foreground">Last Diagnostic Probe</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(health.checkedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="font-serif font-semibold text-foreground text-base flex items-center gap-2">
                <Server className="h-5 w-5 text-secondary" aria-hidden="true" />
                Architectural Invariants &amp; Integrity
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                PrepFord operational monitoring operates with zero modification to learner assessment attempts or scoring pipelines. Health check probes are read-only and enforce trusted-network isolation.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
                  <p className="text-xs font-semibold text-foreground">RFC 7807</p>
                  <p className="text-[10px] text-muted-foreground">Problem Details</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-center">
                  <p className="text-xs font-semibold text-foreground">HMAC-SHA256</p>
                  <p className="text-[10px] text-muted-foreground">Gateway Signatures</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

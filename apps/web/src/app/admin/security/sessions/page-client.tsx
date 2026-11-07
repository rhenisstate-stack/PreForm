"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Users,
  Laptop,
  Smartphone,
  Tablet,
  Clock,
  MapPin,
  RotateCcw,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Info,
  Sliders,
  History,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FullPageFormLayout,
  FullPageDeleteLayout,
} from "@/components/ui/full-page-crud";
import { useAuth } from "@/lib/auth-context";
import { isSuperAdmin } from "@/lib/admin/authz";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import {
  AdminSecurityMetrics,
  AdminSessionPolicy,
  AdminSessionItem,
  AdminSecurityEvent,
} from "@/lib/api-services";

export function AdminSecuritySessionsClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const superAdmin = isSuperAdmin(user?.role);

  // Active Tab: "sessions" | "policy" | "events"
  const [activeTab, setActiveTab] = React.useState<"sessions" | "policy" | "events">("sessions");

  // Metrics State
  const [metrics, setMetrics] = React.useState<AdminSecurityMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = React.useState(true);

  // Policy State
  const [policy, setPolicy] = React.useState<AdminSessionPolicy | null>(null);
  const [policyForm, setPolicyForm] = React.useState<AdminSessionPolicy | null>(null);
  const [loadingPolicy, setLoadingPolicy] = React.useState(true);
  const [savingPolicy, setSavingPolicy] = React.useState(false);
  const [confirmSavePolicyOpen, setConfirmSavePolicyOpen] = React.useState(false);
  const [confirmResetPolicyOpen, setConfirmResetPolicyOpen] = React.useState(false);
  const [resettingPolicy, setResettingPolicy] = React.useState(false);

  // Sessions Table State
  const [sessions, setSessions] = React.useState<AdminSessionItem[]>([]);
  const [totalSessions, setTotalSessions] = React.useState(0);
  const [sessionsPage, setSessionsPage] = React.useState(1);
  const [sessionsPageSize] = React.useState(15);
  const [sessionsStatus, setSessionsStatus] = React.useState<"all" | "active" | "revoked" | "expired">("all");
  const [sessionsSearch, setSessionsSearch] = React.useState("");
  const [loadingSessions, setLoadingSessions] = React.useState(true);

  // Administrative Revocation State
  const [sessionToRevoke, setSessionToRevoke] = React.useState<AdminSessionItem | null>(null);
  const [revokeReason, setRevokeReason] = React.useState("");
  const [revokingSession, setRevokingSession] = React.useState(false);

  // User-wide Revocation State
  const [userToRevoke, setUserToRevoke] = React.useState<{ userId: string; name: string; email: string } | null>(null);
  const [userRevokeReason, setUserRevokeReason] = React.useState("");
  const [revokingUserSessions, setRevokingUserSessions] = React.useState(false);

  // Security Events Table State
  const [events, setEvents] = React.useState<AdminSecurityEvent[]>([]);
  const [totalEvents, setTotalEvents] = React.useState(0);
  const [eventsPage, setEventsPage] = React.useState(1);
  const [eventsPageSize] = React.useState(15);
  const [loadingEvents, setLoadingEvents] = React.useState(true);

  // Status message
  const [actionFeedback, setActionFeedback] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Metrics
  const fetchMetrics = React.useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const res = await fetch("/api/admin/security/metrics");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setMetrics(data);
      }
    } catch {
      // Ignore background metrics failure
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch Policy
  const fetchPolicy = React.useCallback(async () => {
    try {
      setLoadingPolicy(true);
      const res = await fetch("/api/admin/security/session-policy");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setPolicy(data);
        setPolicyForm(JSON.parse(JSON.stringify(data)));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load policy.";
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setLoadingPolicy(false);
    }
  }, []);

  // Fetch Sessions
  const fetchSessions = React.useCallback(async () => {
    try {
      setLoadingSessions(true);
      const params = new URLSearchParams({
        page: String(sessionsPage),
        pageSize: String(sessionsPageSize),
        status: sessionsStatus,
      });
      if (sessionsSearch.trim()) {
        params.set("search", sessionsSearch.trim());
      }

      const res = await fetch(`/api/admin/security/sessions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load sessions.");
      const data = await res.json();
      if (data.success) {
        setSessions(data.items || []);
        setTotalSessions(data.totalCount || 0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sessions.";
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionsPage, sessionsPageSize, sessionsStatus, sessionsSearch]);

  // Fetch Events
  const fetchEvents = React.useCallback(async () => {
    try {
      setLoadingEvents(true);
      const params = new URLSearchParams({
        page: String(eventsPage),
        pageSize: String(eventsPageSize),
      });

      const res = await fetch(`/api/admin/security/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load security events.");
      const data = await res.json();
      if (data.success) {
        setEvents(data.items || []);
        setTotalEvents(data.totalCount || 0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load events.";
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setLoadingEvents(false);
    }
  }, [eventsPage, eventsPageSize]);

  // Load initial data
  React.useEffect(() => {
    if (!authLoading && isAuthenticated && superAdmin) {
      fetchMetrics();
      fetchPolicy();
      fetchSessions();
      fetchEvents();
    }
  }, [authLoading, isAuthenticated, superAdmin, fetchMetrics, fetchPolicy, fetchSessions, fetchEvents]);

  // Handle Save Policy
  const handleSavePolicy = async () => {
    if (!policyForm || !policy) return;

    if (policyForm.idleTimeoutMinutes > policyForm.absoluteTimeoutMinutes) {
      notify.error("Idle timeout cannot exceed absolute session timeout.");
      return;
    }

    try {
      setSavingPolicy(true);
      const res = await fetch("/api/admin/security/session-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxConcurrentSessions: policyForm.maxConcurrentSessions,
          maxSessionsPerClient: policyForm.maxSessionsPerClient,
          idleTimeoutMinutes: policyForm.idleTimeoutMinutes,
          absoluteTimeoutMinutes: policyForm.absoluteTimeoutMinutes,
          enforceFingerprint: policyForm.enforceFingerprint,
          enforceIpConsistency: policyForm.enforceIpConsistency,
          allowIpDrift: policyForm.allowIpDrift,
          rotateOnLogin: policyForm.rotateOnLogin,
          rotateOnPrivilegeChange: policyForm.rotateOnPrivilegeChange,
          rotateOnPasswordChange: policyForm.rotateOnPasswordChange,
          policyVersion: policy.policyVersion,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update session policy.");
      }

      setConfirmSavePolicyOpen(false);
      setActionFeedback({ type: "success", text: "Global session policy updated and effective immediately." });
      notify.success("Session policy updated successfully.");
      await fetchPolicy();
      await fetchMetrics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update policy.";
      setActionFeedback({ type: "error", text: sanitizeErrorMessage(msg) });
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setSavingPolicy(false);
    }
  };

  // Handle Reset Policy
  const handleResetPolicy = async () => {
    try {
      setResettingPolicy(true);
      const res = await fetch("/api/admin/security/session-policy/reset", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset session policy.");
      }

      setConfirmResetPolicyOpen(false);
      setActionFeedback({ type: "success", text: "Global session policy restored to approved canonical system defaults." });
      notify.success("Policy reset to platform defaults.");
      await fetchPolicy();
      await fetchMetrics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset policy.";
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setResettingPolicy(false);
    }
  };

  // Handle Admin Revoke Single Session
  const handleConfirmRevokeSession = async () => {
    if (!sessionToRevoke) return;

    if (!revokeReason.trim() || revokeReason.trim().length < 3) {
      notify.error("Please provide an administrative reason (at least 3 characters).");
      return;
    }

    try {
      setRevokingSession(true);
      const res = await fetch(`/api/admin/security/sessions/${encodeURIComponent(sessionToRevoke.id)}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke session.");
      }

      setSessionToRevoke(null);
      setRevokeReason("");
      setActionFeedback({ type: "success", text: `Session on "${sessionToRevoke.deviceLabel}" terminated.` });
      notify.success("Session revoked successfully.");
      await fetchSessions();
      await fetchMetrics();
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke session.";
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setRevokingSession(false);
    }
  };

  // Handle Admin Revoke All Sessions for User
  const handleConfirmRevokeUserSessions = async () => {
    if (!userToRevoke) return;

    if (!userRevokeReason.trim() || userRevokeReason.trim().length < 3) {
      notify.error("Please provide an administrative reason (at least 3 characters).");
      return;
    }

    try {
      setRevokingUserSessions(true);
      const res = await fetch(`/api/admin/security/users/${encodeURIComponent(userToRevoke.userId)}/revoke-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: userRevokeReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to terminate user sessions.");
      }

      setUserToRevoke(null);
      setUserRevokeReason("");
      setActionFeedback({ type: "success", text: data.message || "All sessions terminated for user." });
      notify.success(data.message || "All sessions terminated for user.");
      await fetchSessions();
      await fetchMetrics();
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to terminate user sessions.";
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setRevokingUserSessions(false);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    const type = (deviceType || "").toLowerCase();
    if (type === "mobile") return <Smartphone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    if (type === "tablet") return <Tablet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    return <Laptop className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  };

  // Non-SuperAdmin Gate
  if (!authLoading && !superAdmin) {
    return (
      <div className="p-6 w-full max-w-none space-y-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3 text-destructive">
              <ShieldAlert className="h-8 w-8" />
              <CardTitle className="text-xl">Super Administrator Access Required</CardTitle>
            </div>
            <CardDescription className="text-sm mt-2">
              The Session Security Console and Device Management policies are strictly restricted to authorized Super Administrators. Your current assigned role ({user?.role || "standard user"}) does not hold privileged session-security governance rights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button variant="outline">Return to Admin Studio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmSavePolicyOpen) {
    return (
      <FullPageFormLayout
        title="Apply Global Session Policy Changes?"
        subtitle={`You are updating the authoritative session security policy (v${policy?.policyVersion ?? 1} → v${(policy?.policyVersion ?? 1) + 1}). Concurrency checks and new sessions will immediately consume the updated policy thresholds.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Session Security", onClick: () => setConfirmSavePolicyOpen(false) },
          { label: "Apply Policy" },
        ]}
        onBack={() => setConfirmSavePolicyOpen(false)}
        onCancel={() => setConfirmSavePolicyOpen(false)}
        onSubmit={handleSavePolicy}
        submitLabel="Save & Apply Policy"
        isSubmitting={savingPolicy}
      >
        <div className="text-sm text-muted-foreground">
          Confirm applying the updated session timeout and concurrency thresholds across the platform.
        </div>
      </FullPageFormLayout>
    );
  }

  if (confirmResetPolicyOpen) {
    return (
      <FullPageDeleteLayout
        title="Reset Policy to System Defaults?"
        subtitle="This will restore the canonical platform defaults: 2 concurrent sessions, 1 session per client, 300 minutes idle timeout, and 10,080 minutes absolute timeout."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Session Security", onClick: () => setConfirmResetPolicyOpen(false) },
          { label: "Reset Policy" },
        ]}
        recordSummary={
          <div className="text-sm font-medium">
            Global Session Security Policy (v{policy?.policyVersion ?? 1})
          </div>
        }
        consequences={[
          "Restores 2 concurrent sessions, 1 session per client, 300m idle timeout, and 10,080m absolute timeout.",
        ]}
        onBack={() => setConfirmResetPolicyOpen(false)}
        onCancel={() => setConfirmResetPolicyOpen(false)}
        onConfirmDelete={handleResetPolicy}
        confirmLabel="Reset to Defaults"
        isDeleting={resettingPolicy}
      />
    );
  }

  if (sessionToRevoke) {
    return (
      <FullPageFormLayout
        title="Administratively Revoke Session?"
        subtitle={`Target user: ${sessionToRevoke.userDisplayName} (${sessionToRevoke.userEmail}) on device ${sessionToRevoke.deviceLabel}. This device will be immediately signed out and unable to make API calls.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Session Security", onClick: () => setSessionToRevoke(null) },
          { label: "Revoke Session" },
        ]}
        onBack={() => setSessionToRevoke(null)}
        onCancel={() => setSessionToRevoke(null)}
        onSubmit={handleConfirmRevokeSession}
        submitLabel="Confirm Revocation"
        isSubmitting={revokingSession}
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg border bg-muted/30 text-sm">
            Target user: <strong className="text-foreground">{sessionToRevoke.userDisplayName} ({sessionToRevoke.userEmail})</strong> on device <strong className="text-foreground">{sessionToRevoke.deviceLabel}</strong>
          </div>
          <div className="space-y-2">
            <label htmlFor="revoke-reason" className="text-xs font-semibold text-foreground">
              Administrative Reason (Required for Audit Trail)
            </label>
            <textarea
              id="revoke-reason"
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Suspicious concurrent location, credential compromise..."
              className="w-full p-2.5 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </FullPageFormLayout>
    );
  }

  if (userToRevoke) {
    return (
      <FullPageFormLayout
        title="Terminate All Sessions for User?"
        subtitle={`You are about to terminate all active sessions for ${userToRevoke.name} (${userToRevoke.email}). The learner will be logged out everywhere and required to reauthenticate.`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Session Security", onClick: () => setUserToRevoke(null) },
          { label: "Terminate User Sessions" },
        ]}
        onBack={() => setUserToRevoke(null)}
        onCancel={() => setUserToRevoke(null)}
        onSubmit={handleConfirmRevokeUserSessions}
        submitLabel="Terminate All User Sessions"
        isSubmitting={revokingUserSessions}
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg border bg-muted/30 text-sm">
            Target user: <strong className="text-foreground">{userToRevoke.name} ({userToRevoke.email})</strong>
          </div>
          <div className="space-y-2">
            <label htmlFor="user-revoke-reason" className="text-xs font-semibold text-foreground">
              Administrative Reason (Required for Audit Trail)
            </label>
            <textarea
              id="user-revoke-reason"
              rows={3}
              value={userRevokeReason}
              onChange={(e) => setUserRevokeReason(e.target.value)}
              placeholder="e.g. Account security reset, credential rotation..."
              className="w-full p-2.5 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </FullPageFormLayout>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-none min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span>Platform Governance • Super Admin</span>
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground mt-1">
            Session Security & Device Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Authoritative global session limits, idle/absolute timeouts, concurrent login policies, and live session monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchMetrics();
              fetchPolicy();
              fetchSessions();
              fetchEvents();
            }}
            disabled={loadingMetrics || loadingSessions}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loadingMetrics || loadingSessions ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* Action Banner */}
      {actionFeedback && (
        <div
          role="status"
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          )}
          <p className="text-sm font-medium">{actionFeedback.text}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <section aria-labelledby="metrics-heading" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <h2 id="metrics-heading" className="sr-only">Session Security Metrics</h2>

        <Card className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Active Sessions</span>
          <p className="text-2xl font-bold text-foreground">
            {loadingMetrics ? "…" : metrics?.totalActiveSessions ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Currently valid</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Active Learners</span>
          <p className="text-2xl font-bold text-foreground">
            {loadingMetrics ? "…" : metrics?.activeUsersCount ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Distinct accounts</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Expiring Soon</span>
          <p className="text-2xl font-bold text-amber-600">
            {loadingMetrics ? "…" : metrics?.expiringSoonCount ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Within 30m idle / 2h abs</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Revoked (24h)</span>
          <p className="text-2xl font-bold text-muted-foreground">
            {loadingMetrics ? "…" : metrics?.revokedLast24HoursCount ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Terminated sessions</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Limit Rejections (24h)</span>
          <p className="text-2xl font-bold text-destructive">
            {loadingMetrics ? "…" : metrics?.limitRejectionsLast24HoursCount ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Simultaneous 409s</span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Credential Rotations</span>
          <p className="text-2xl font-bold text-primary">
            {loadingMetrics ? "…" : metrics?.securityVersionInvalidationsLast24HoursCount ?? 0}
          </p>
          <span className="text-[11px] text-muted-foreground">SecurityVersion bumps</span>
        </Card>
      </section>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border space-x-8">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "sessions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Active Sessions Monitoring</span>
          {totalSessions > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalSessions}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("policy")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "policy"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Global Security Policy</span>
          {policy && (
            <Badge variant="outline" className="text-xs">
              v{policy.policyVersion}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("events")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "events"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Administrative Audit Feed</span>
        </button>
      </div>

      {/* Tab 1: Active Sessions Monitoring */}
      {activeTab === "sessions" && (
        <section aria-labelledby="sessions-monitoring-heading" className="space-y-4">
          <h2 id="sessions-monitoring-heading" className="sr-only">Active Sessions Table</h2>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {(["all", "active", "revoked", "expired"] as const).map((st) => (
                <Button
                  key={st}
                  variant={sessionsStatus === st ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSessionsStatus(st);
                    setSessionsPage(1);
                  }}
                  className="capitalize text-xs"
                >
                  {st}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search user, device, IP, or email..."
                  value={sessionsSearch}
                  onChange={(e) => {
                    setSessionsSearch(e.target.value);
                    setSessionsPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Learner Identity</th>
                    <th className="py-3 px-4">Client / Device</th>
                    <th className="py-3 px-4">Activity & Timeouts</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingSessions ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading active sessions...</span>
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No sessions match the specified filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{s.userDisplayName}</div>
                          <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                          <Badge variant="outline" className="text-[10px] mt-1 capitalize font-normal">
                            {s.role}
                          </Badge>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            {getDeviceIcon(s.deviceType)}
                            <span>{s.deviceLabel}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Client: <span className="font-mono text-[11px]">{s.clientId.slice(0, 16)}…</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs space-y-0.5">
                          <div>
                            <span className="text-muted-foreground">Last Active: </span>
                            <span className="font-medium text-foreground">{formatDateTime(s.lastActiveAt)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Idle Limit: </span>
                            <span>{formatDateTime(s.idleExpiresAt)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Absolute: </span>
                            <span>{formatDateTime(s.absoluteExpiresAt)}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-xs">
                          {s.lastIpAddress ? (
                            <span className="font-mono">{s.lastIpAddress}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              s.status === "Active"
                                ? "default"
                                : s.status === "Revoked"
                                ? "destructive"
                                : "secondary"
                            }
                            className={`text-xs ${
                              s.status === "Active"
                                ? "bg-emerald-600 text-white"
                                : ""
                            }`}
                          >
                            {s.status}
                          </Badge>
                          {s.revocationReason && (
                            <div className="text-[11px] text-muted-foreground mt-1 max-w-[140px] truncate" title={s.revocationReason}>
                              {s.revocationReason}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          {!s.revoked && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSessionToRevoke(s);
                                  setRevokeReason("Administrative revocation: Security policy compliance review");
                                }}
                                className="text-destructive hover:bg-destructive/10 text-xs h-8"
                              >
                                Revoke
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setUserToRevoke({
                                    userId: s.userId,
                                    name: s.userDisplayName,
                                    email: s.userEmail,
                                  });
                                  setUserRevokeReason("Administrative security reset: terminating all active user devices");
                                }}
                                className="text-xs h-8 text-muted-foreground hover:text-destructive"
                              >
                                Revoke All
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalSessions > sessionsPageSize && (
              <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {Math.min(1 + (sessionsPage - 1) * sessionsPageSize, totalSessions)}–
                  {Math.min(sessionsPage * sessionsPageSize, totalSessions)} of {totalSessions} sessions
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sessionsPage <= 1}
                    onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    Page {sessionsPage} of {Math.ceil(totalSessions / sessionsPageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sessionsPage >= Math.ceil(totalSessions / sessionsPageSize)}
                    onClick={() => setSessionsPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Tab 2: Global Session Security Policy */}
      {activeTab === "policy" && policyForm && (
        <section aria-labelledby="policy-heading" className="space-y-6">
          <h2 id="policy-heading" className="sr-only">Global Session Security Policy</h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Global Session Security Controls</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                These settings govern concurrent session thresholds, device limits, and timeout boundaries platform-wide.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmResetPolicyOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset to Platform Defaults
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmSavePolicyOpen(true)}
                className="text-xs font-medium"
              >
                Save Policy Changes
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Concurrency & Device Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Concurrency & Device Thresholds</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Controls how many simultaneous sessions an individual learner or browser may establish.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="max-concurrent" className="font-medium text-foreground">
                      Maximum Concurrent Sessions per Learner
                    </label>
                    <span className="text-xs text-muted-foreground font-mono">Default: 2</span>
                  </div>
                  <input
                    id="max-concurrent"
                    type="number"
                    min={1}
                    max={10}
                    value={policyForm.maxConcurrentSessions}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, maxConcurrentSessions: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    A third simultaneous login will be rejected with HTTP 409 without terminating active sessions.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="max-per-client" className="font-medium text-foreground">
                      Maximum Sessions per Browser Client
                    </label>
                    <span className="text-xs text-muted-foreground font-mono">Default: 1</span>
                  </div>
                  <input
                    id="max-per-client"
                    type="number"
                    min={1}
                    max={5}
                    value={policyForm.maxSessionsPerClient}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, maxSessionsPerClient: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Logins from the same registered browser client automatically rotate the prior session.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Timeouts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Session Expiration & Inactivity Boundaries</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Server-enforced boundaries ensuring stale or unattended sessions expire reliably.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="idle-timeout" className="font-medium text-foreground">
                      Idle Inactivity Timeout (minutes)
                    </label>
                    <span className="text-xs text-muted-foreground font-mono">Default: 300 (5 hrs)</span>
                  </div>
                  <input
                    id="idle-timeout"
                    type="number"
                    min={15}
                    max={1440}
                    value={policyForm.idleTimeoutMinutes}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, idleTimeoutMinutes: parseInt(e.target.value, 10) || 15 })
                    }
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Session expires if no qualifying activity occurs within this window. Extended on student interaction.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="abs-timeout" className="font-medium text-foreground">
                      Absolute Lifetime Timeout (minutes)
                    </label>
                    <span className="text-xs text-muted-foreground font-mono">Default: 10,080 (7 days)</span>
                  </div>
                  <input
                    id="abs-timeout"
                    type="number"
                    min={60}
                    max={43200}
                    value={policyForm.absoluteTimeoutMinutes}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, absoluteTimeoutMinutes: parseInt(e.target.value, 10) || 60 })
                    }
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Hard session cap regardless of student activity. Reauthentication is required once reached.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Network & Device Consistency */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Network & Environment Drift</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Configures network tolerance to prevent disrupting students studying across Wi-Fi and mobile networks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">Allow IP Drift</span>
                    <p className="text-xs text-muted-foreground">
                      Enables candidates to transition between Wi-Fi and cellular networks without being logged out.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.allowIpDrift}
                    onChange={(e) => setPolicyForm({ ...policyForm, allowIpDrift: e.target.checked })}
                    className="h-4 w-4 text-primary rounded border-input"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">Enforce Strict IP Consistency</span>
                    <p className="text-xs text-muted-foreground">
                      Terminates session immediately upon any IP change (not recommended for mobile nurse candidates).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.enforceIpConsistency}
                    onChange={(e) => setPolicyForm({ ...policyForm, enforceIpConsistency: e.target.checked })}
                    className="h-4 w-4 text-primary rounded border-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Credential Rotation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>Credential & Privilege Rotation</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated invalidation of active sessions following security-sensitive account changes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">Rotate on Password Change</span>
                    <p className="text-xs text-muted-foreground">
                      Revokes all other active sessions when a learner updates their password.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.rotateOnPasswordChange}
                    onChange={(e) => setPolicyForm({ ...policyForm, rotateOnPasswordChange: e.target.checked })}
                    className="h-4 w-4 text-primary rounded border-input"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">Rotate on Privilege Change</span>
                    <p className="text-xs text-muted-foreground">
                      Increments SecurityVersion and invalidates active sessions upon role changes.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.rotateOnPrivilegeChange}
                    onChange={(e) => setPolicyForm({ ...policyForm, rotateOnPrivilegeChange: e.target.checked })}
                    className="h-4 w-4 text-primary rounded border-input"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Tab 3: Administrative Security Events */}
      {activeTab === "events" && (
        <section aria-labelledby="events-heading" className="space-y-4">
          <h2 id="events-heading" className="sr-only">Administrative Audit Events</h2>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingEvents ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading audit logs...</span>
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No administrative security events recorded.
                      </td>
                    </tr>
                  ) : (
                    events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-muted/30 transition-colors text-xs">
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(evt.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">
                          {evt.action}
                        </td>
                        <td className="py-3 px-4">
                          {evt.actorEmail ? (
                            <span className="font-medium text-foreground">{evt.actorEmail}</span>
                          ) : (
                            <span className="text-muted-foreground font-mono">{evt.actorId || "system"}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-md truncate text-muted-foreground" title={evt.description}>
                          {evt.description}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={evt.outcome === "Success" ? "secondary" : "destructive"}
                            className="text-[10px] font-normal"
                          >
                            {evt.outcome}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {evt.ipAddress || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalEvents > eventsPageSize && (
              <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {Math.min(1 + (eventsPage - 1) * eventsPageSize, totalEvents)}–
                  {Math.min(eventsPage * eventsPageSize, totalEvents)} of {totalEvents} events
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={eventsPage <= 1}
                    onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    Page {eventsPage} of {Math.ceil(totalEvents / eventsPageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={eventsPage >= Math.ceil(totalEvents / eventsPageSize)}
                    onClick={() => setEventsPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}

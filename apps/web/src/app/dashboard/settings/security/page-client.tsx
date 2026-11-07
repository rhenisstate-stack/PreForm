"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  LogOut,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FullPageDeleteLayout } from "@/components/ui/full-page-crud";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import {
  BackendLearnerSession,
  BackendSecurityEvent,
} from "@/lib/api-services";
import { LearnerDashboardShell } from "@/components/learner/learner-dashboard-shell";

export function SecuritySettingsClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [sessions, setSessions] = React.useState<BackendLearnerSession[]>([]);
  const [events, setEvents] = React.useState<BackendSecurityEvent[]>([]);
  const [loadingSessions, setLoadingSessions] = React.useState(true);
  const [loadingEvents, setLoadingEvents] = React.useState(true);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);
  const [eventsError, setEventsError] = React.useState<string | null>(null);

  // Revoke target session state
  const [targetSessionToRevoke, setTargetSessionToRevoke] = React.useState<BackendLearnerSession | null>(null);
  const [revokingSession, setRevokingSession] = React.useState(false);

  // Revoke other sessions dialog state
  const [confirmRevokeOthersOpen, setConfirmRevokeOthersOpen] = React.useState(false);
  const [revokingOthers, setRevokingOthers] = React.useState(false);

  // Status message
  const [actionFeedback, setActionFeedback] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch active sessions
  const fetchSessions = React.useCallback(async () => {
    try {
      setLoadingSessions(true);
      setSessionsError(null);
      const res = await fetch("/api/security/sessions");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/sign-in?from=/dashboard/settings/security");
          return;
        }
        throw new Error(`Failed to fetch active sessions (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      } else {
        setSessions([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load active sessions.";
      setSessionsError(sanitizeErrorMessage(msg));
    } finally {
      setLoadingSessions(false);
    }
  }, [router]);

  // Fetch security events
  const fetchEvents = React.useCallback(async () => {
    try {
      setLoadingEvents(true);
      setEventsError(null);
      const res = await fetch("/api/security/events");
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error(`Failed to fetch security events (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load security events.";
      setEventsError(sanitizeErrorMessage(msg));
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in?from=/dashboard/settings/security");
      return;
    }
    if (isAuthenticated) {
      fetchSessions();
      fetchEvents();
    }
  }, [authLoading, isAuthenticated, router, fetchSessions, fetchEvents]);

  // Handle individual session revocation
  const handleConfirmRevokeSession = async () => {
    if (!targetSessionToRevoke) return;

    try {
      setRevokingSession(true);
      setActionFeedback(null);

      const isCurrent = targetSessionToRevoke.isCurrent;
      const res = await fetch(`/api/security/sessions/${encodeURIComponent(targetSessionToRevoke.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to terminate session.");
      }

      setTargetSessionToRevoke(null);

      if (isCurrent) {
        notify.success("Current session terminated. Signing out...");
        await logout();
        router.push("/sign-in");
        return;
      }

      setActionFeedback({
        type: "success",
        text: `Session on "${targetSessionToRevoke.deviceLabel}" has been terminated.`,
      });
      notify.success("Session terminated successfully.");

      await fetchSessions();
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to terminate session.";
      setActionFeedback({ type: "error", text: sanitizeErrorMessage(msg) });
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setRevokingSession(false);
    }
  };

  // Handle revoke all other sessions
  const handleConfirmRevokeOthers = async () => {
    try {
      setRevokingOthers(true);
      setActionFeedback(null);

      const res = await fetch("/api/security/sessions/revoke-others", {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to terminate other sessions.");
      }

      const data = await res.json();
      setConfirmRevokeOthersOpen(false);

      setActionFeedback({
        type: "success",
        text: data.message || "All other active sessions have been terminated. Your current session remains active.",
      });
      notify.success("Other sessions terminated successfully.");

      await fetchSessions();
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to terminate other sessions.";
      setActionFeedback({ type: "error", text: sanitizeErrorMessage(msg) });
      notify.error(sanitizeErrorMessage(msg));
    } finally {
      setRevokingOthers(false);
    }
  };

  // Format relative or date time
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "Unknown";
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

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return "Unknown";
    try {
      // eslint-disable-next-line react-hooks/purity
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 2) return "Active just now";
      if (diffMins < 60) return `Active ${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Active ${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `Active ${diffDays}d ago`;
    } catch {
      return formatDateTime(isoString);
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    const type = (deviceType || "").toLowerCase();
    if (type === "mobile") return <Smartphone className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
    if (type === "tablet") return <Tablet className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
    return <Laptop className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
  };

  const getEventIcon = (action: string) => {
    switch (action) {
      case "UserLoginSuccess":
        return <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
      case "PasswordChanged":
      case "SecurityVersionInvalidated":
        return <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />;
      case "SessionRevoked":
      case "RevokeOtherSessions":
      case "RevokeAllUserSessions":
      case "UserLogout":
        return <LogOut className="h-4 w-4 text-amber-600" aria-hidden="true" />;
      case "ConcurrentSessionLimitExceeded":
        return <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  if (targetSessionToRevoke) {
    return (
      <LearnerDashboardShell activeNav="security" breadcrumbPageTitle="Security & Sessions">
        <FullPageDeleteLayout
          title={targetSessionToRevoke.isCurrent ? "Sign Out Current Device?" : "Terminate Session?"}
          subtitle={
            targetSessionToRevoke.isCurrent
              ? "You are about to sign out of this browser. You will need to log back in to access your dashboard and study materials."
              : `Are you sure you want to terminate the session on ${targetSessionToRevoke.deviceLabel}? That device will be immediately signed out.`
          }
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Security & Sessions", onClick: () => setTargetSessionToRevoke(null) },
            { label: targetSessionToRevoke.isCurrent ? "Sign Out" : "Terminate Session" },
          ]}
          recordSummary={
            <div className="space-y-1 text-sm">
              <div className="font-semibold text-foreground">{targetSessionToRevoke.deviceLabel}</div>
              <div className="text-xs text-muted-foreground">
                IP: {targetSessionToRevoke.lastIpAddress || "Unknown"} • Signed in: {formatDateTime(targetSessionToRevoke.createdAt)}
              </div>
            </div>
          }
          consequences={[
            targetSessionToRevoke.isCurrent
              ? "You will be signed out of this browser and redirected to the sign-in screen."
              : `The session on ${targetSessionToRevoke.deviceLabel} will be immediately invalidated.`,
          ]}
          onBack={() => setTargetSessionToRevoke(null)}
          onCancel={() => setTargetSessionToRevoke(null)}
          onConfirmDelete={handleConfirmRevokeSession}
          confirmLabel={targetSessionToRevoke.isCurrent ? "Sign Out" : "Terminate Session"}
          isDeleting={revokingSession}
        />
      </LearnerDashboardShell>
    );
  }

  if (confirmRevokeOthersOpen) {
    return (
      <LearnerDashboardShell activeNav="security" breadcrumbPageTitle="Security & Sessions">
        <FullPageDeleteLayout
          title="Log Out All Other Sessions?"
          subtitle={`This will immediately sign out all other devices (${otherSessionsCount} session${otherSessionsCount === 1 ? "" : "s"}) signed into your account. Your current device will remain signed in.`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Security & Sessions", onClick: () => setConfirmRevokeOthersOpen(false) },
            { label: "Log Out Other Devices" },
          ]}
          recordSummary={
            <div className="text-sm font-medium">
              {otherSessionsCount} remote active session{otherSessionsCount === 1 ? "" : "s"}
            </div>
          }
          consequences={[
            "All remote devices will be immediately signed out.",
            "Your current browser session remains active.",
          ]}
          onBack={() => setConfirmRevokeOthersOpen(false)}
          onCancel={() => setConfirmRevokeOthersOpen(false)}
          onConfirmDelete={handleConfirmRevokeOthers}
          confirmLabel="Log Out Other Devices"
          isDeleting={revokingOthers}
        />
      </LearnerDashboardShell>
    );
  }

  return (
    <LearnerDashboardShell activeNav="security" breadcrumbPageTitle="Security & Sessions">
      <div className="w-full max-w-none min-w-0 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
              Account Security & Sessions
            </h1>
            <p className="text-muted-foreground mt-1">
              Review active browser sessions, manage signed-in devices, and inspect your security event history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchSessions();
                fetchEvents();
              }}
              disabled={loadingSessions || loadingEvents}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSessions || loadingEvents ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Profile</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Action Banner / Notification */}
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

        {/* Security Overview Metric Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="security-overview-metrics"
        >
          {/* Metric 1: Active Sessions */}
          <Card data-testid="metric-active-sessions" className="border-border">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Sessions
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-foreground">
                    {loadingSessions ? "—" : sessions.length}
                  </span>
                  <span className="text-xs text-muted-foreground">simultaneous</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Monitor className="h-5 w-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>

          {/* Metric 2: Other Devices */}
          <Card data-testid="metric-other-devices" className="border-border">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Other Devices
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-foreground">
                    {loadingSessions ? "—" : otherSessionsCount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {otherSessionsCount === 1 ? "remote login" : "remote logins"}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>

          {/* Metric 3: Current Device */}
          <Card data-testid="metric-current-device" className="border-border">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Device
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                    {loadingSessions
                      ? "Identifying..."
                      : sessions.find((s) => s.isCurrent)?.browser || "This Device"}
                  </span>
                  <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] px-1.5 py-0 font-medium">
                    Active
                  </Badge>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>

          {/* Metric 4: Account Protection Status */}
          <Card data-testid="metric-protection-status" className="border-border">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Protection Status
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Enforced
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                    Guarded
                  </Badge>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Section 1: Active Sessions & Devices */}
      <section aria-labelledby="active-sessions-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 id="active-sessions-heading" className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Active Signed-In Devices</span>
              {!loadingSessions && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {sessions.length} {sessions.length === 1 ? "Session" : "Sessions"}
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              These devices are currently authenticated to your PrepFord account.
            </p>
          </div>

          {otherSessionsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRevokeOthersOpen(true)}
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Log Out Other Sessions ({otherSessionsCount})</span>
            </Button>
          )}
        </div>

        {sessionsError && (
          <div className="p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{sessionsError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSessions}>
              Retry
            </Button>
          </div>
        )}

        {loadingSessions ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-border bg-card animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-muted rounded w-48" />
                  <div className="h-6 bg-muted rounded w-24" />
                </div>
                <div className="h-4 bg-muted rounded w-72" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="text-base font-semibold">No Active Sessions Found</h3>
              <p className="text-sm text-muted-foreground">
                Your account does not have any recorded active sessions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((sess) => (
              <Card
                key={sess.id}
                className={`transition-all border ${
                  sess.isCurrent
                    ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-950/10 shadow-xs"
                    : "hover:border-border/80"
                }`}
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-muted/60 mt-0.5 shrink-0">
                      {getDeviceIcon(sess.deviceType)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-base">
                          {sess.deviceLabel}
                        </span>
                        {sess.isCurrent && (
                          <Badge className="bg-emerald-600 text-white font-medium text-xs">
                            Current Device / Session
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatRelativeTime(sess.lastActiveAt)}</span>
                        </span>
                        <span>•</span>
                        <span>Signed in: {formatDateTime(sess.createdAt)}</span>
                        {sess.lastIpAddress && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>IP: {sess.lastIpAddress}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    {sess.isCurrent ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTargetSessionToRevoke(sess)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        <span>Sign Out This Device</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetSessionToRevoke(sess)}
                        className="text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/40"
                      >
                        <LogOut className="h-4 w-4 mr-1.5" />
                        <span>Terminate Session</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Security Guidance Card */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="p-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Session Security Safeguards</p>
            <p>
              PrepFord automatically protects your account by limiting simultaneous active sessions and expiring idle sessions after prolonged inactivity. If you notice any unfamiliar device or location, terminate that session immediately and update your password.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Security Event History Feed */}
      <section aria-labelledby="security-events-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="security-events-heading" className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Recent Security Events</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Chronological log of recent sign-ins, device terminations, and password changes.
            </p>
          </div>
        </div>

        {eventsError && (
          <div className="p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{eventsError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchEvents}>
              Retry
            </Button>
          </div>
        )}

        {loadingEvents ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-64" />
                <div className="h-3 bg-muted rounded w-40" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-2">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-medium">No Recent Security Events</h3>
              <p className="text-xs text-muted-foreground">
                Security-sensitive events such as sign-ins and password updates will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {events.map((evt) => (
                <div key={evt.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      {getEventIcon(evt.action)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{evt.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDateTime(evt.timestamp)}</span>
                        {evt.ipAddress && (
                          <>
                            <span>•</span>
                            <span>IP: {evt.ipAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={evt.outcome === "Success" ? "secondary" : "destructive"}
                    className="text-xs font-normal shrink-0"
                  >
                    {evt.outcome}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
      </div>
    </LearnerDashboardShell>
  );
}

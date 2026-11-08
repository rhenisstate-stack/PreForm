"use client";

import * as React from "react";
import {
  RotateCcw,
  Sliders,
  BarChart3,
  ListFilter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Settings2,
  RefreshCw,
  Search,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminStudyService,
  StudyReviewConfiguration,
  AdminReviewAnalytics,
  AdminReviewSessionRecord,
  AdminReviewSessionDetail,
} from "@/lib/admin-study-service";
import { notify as toast } from "@/lib/notifications";

export function AdminReviewSessionsClient() {
  const [activeTab, setActiveTab] = React.useState<"analytics" | "sessions" | "config">("analytics");

  // Config State
  const [config, setConfig] = React.useState<StudyReviewConfiguration | null>(null);
  const [isSavingConfig, setIsSavingConfig] = React.useState<boolean>(false);
  const [maxCards, setMaxCards] = React.useState<number>(50);
  const [defaultLimit, setDefaultLimit] = React.useState<number>(20);
  const [enableRn, setEnableRn] = React.useState<boolean>(true);
  const [enablePn, setEnablePn] = React.useState<boolean>(true);
  const [requireSub, setRequireSub] = React.useState<boolean>(false);
  const [minInterval, setMinInterval] = React.useState<number>(1);
  const [defaultEase, setDefaultEase] = React.useState<number>(2.5);

  // Analytics State
  const [analytics, setAnalytics] = React.useState<AdminReviewAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState<boolean>(true);

  // Sessions Log State
  const [sessions, setSessions] = React.useState<AdminReviewSessionRecord[]>([]);
  const [totalSessions, setTotalSessions] = React.useState<number>(0);
  const [loadingSessions, setLoadingSessions] = React.useState<boolean>(true);
  const [sessionSearch, setSessionSearch] = React.useState<string>("");
  const [sessionProgramme, setSessionProgramme] = React.useState<string>("all");
  const [sessionStatus, setSessionStatus] = React.useState<string>("all");
  const [sessionPage, setSessionPage] = React.useState<number>(1);

  // Detail Modal State
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = React.useState<AdminReviewSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState<boolean>(false);

  // Fetch Config
  const fetchConfig = React.useCallback(async () => {
    try {
      const res = await adminStudyService.getReviewConfiguration();
      setConfig(res.config);
      setMaxCards(res.config.maxCardsPerSession);
      setDefaultLimit(res.config.defaultCardLimit);
      setEnableRn(res.config.enableRn);
      setEnablePn(res.config.enablePn);
      setRequireSub(res.config.requireSubscription);
      setMinInterval(res.config.minIntervalDays);
      setDefaultEase(res.config.defaultEaseFactor);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load review configuration");
    }
  }, []);

  // Fetch Analytics
  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await adminStudyService.getReviewAnalytics();
      setAnalytics(res.analytics);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load review analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Fetch Sessions
  const fetchSessions = React.useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await adminStudyService.getReviewSessions({
        search: sessionSearch.trim() || undefined,
        programme: sessionProgramme === "all" ? undefined : sessionProgramme,
        status: sessionStatus === "all" ? undefined : sessionStatus,
        page: sessionPage,
        pageSize: 15,
      });
      setSessions(res.data);
      setTotalSessions(res.total);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load review session records");
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionSearch, sessionProgramme, sessionStatus, sessionPage]);

  React.useEffect(() => {
    fetchConfig();
    fetchAnalytics();
    fetchSessions();
  }, [fetchConfig, fetchAnalytics, fetchSessions]);

  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      const res = await adminStudyService.updateReviewConfiguration({
        maxCardsPerSession: maxCards,
        defaultCardLimit: defaultLimit,
        enableRn,
        enablePn,
        requireSubscription: requireSub,
        minIntervalDays: minInterval,
        defaultEaseFactor: defaultEase,
      });
      setConfig(res.config);
      toast.success("Spaced repetition configuration updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleOpenDetail = async (sessionId: string) => {
    try {
      setSelectedSessionId(sessionId);
      setLoadingDetail(true);
      const res = await adminStudyService.getReviewSession(sessionId);
      setSessionDetail(res.session);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load session details");
      setSelectedSessionId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            Review Sessions & Spaced Repetition Governance
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor real-time SM-2 spaced repetition retention metrics, audit learner sessions, and configure global drill limits.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === "analytics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("analytics")}
            className="text-xs gap-1.5"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Retention Analytics
          </Button>
          <Button
            variant={activeTab === "sessions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("sessions")}
            className="text-xs gap-1.5"
          >
            <ListFilter className="h-3.5 w-3.5" />
            Session Audit Logs
          </Button>
          <Button
            variant={activeTab === "config" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("config")}
            className="text-xs gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Algorithm Parameters
          </Button>
        </div>
      </div>

      {/* TAB 1: RETENTION ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Metric KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Review Sessions</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {analytics?.totalSessions.toLocaleString() ?? "0"}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <span className="text-emerald-600 font-medium">
                  {analytics?.completionRate ?? 0}% completed
                </span>
                <span>({analytics?.abandonedSessions ?? 0} abandoned)</span>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Cards Reviewed</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {analytics?.totalCardsReviewed.toLocaleString() ?? "0"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Avg. session duration: {Math.round((analytics?.averageDurationSeconds ?? 0) / 60)} min
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Overall Accuracy</span>
                <Award className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {analytics?.overallAccuracyPercentage ?? 0}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Based on SM-2 recall ratings &gt;= 3
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Retention Horizon</span>
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {analytics?.schedulingStats.cardsDueToday ?? 0} Due
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {analytics?.schedulingStats.cardsOverdue ?? 0} overdue • {analytics?.schedulingStats.cardsScheduledNext7Days ?? 0} next 7d
              </div>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Programme & Subject Breakdown */}
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-base text-foreground">
                Performance by Program & Subject
              </h3>
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Programme Split
                </div>
                <div className="space-y-2">
                  {analytics?.programmeBreakdown.map((p) => (
                    <div
                      key={p.programme}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/30 text-xs"
                    >
                      <div className="font-semibold uppercase">{p.programme}</div>
                      <div className="text-muted-foreground">{p.sessionCount} sessions</div>
                      <div className="text-muted-foreground">{p.cardsReviewed} cards</div>
                      <Badge variant="outline" className="font-mono">
                        {p.accuracyPercentage}% accuracy
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                  Top Subject Accuracy
                </div>
                <div className="space-y-1.5">
                  {analytics?.subjectBreakdown.map((s) => (
                    <div
                      key={s.subject}
                      className="flex items-center justify-between py-1.5 border-b text-xs"
                    >
                      <span className="font-medium">{s.subject}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{s.sessionCount} sessions</span>
                        <Badge variant="secondary" className="font-mono">
                          {s.accuracyPercentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Difficult Cards Summary */}
            <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Frequently Difficult Clinical Cards
              </h3>
              <p className="text-xs text-muted-foreground">
                Cards triggering consecutive rating &lt;= 2, signaling areas needing study guide reinforcement.
              </p>
              <div className="space-y-2.5">
                {analytics?.frequentlyDifficultCards.map((card) => (
                  <div
                    key={card.cardId}
                    className="p-3 rounded-md border bg-muted/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">{card.deckTitle}</span>
                      <Badge variant="destructive" className="text-xs">
                        {card.failureCount} misses
                      </Badge>
                    </div>
                    <p className="text-foreground line-clamp-2">{card.front}</p>
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px] pt-1">
                      <span className="uppercase">{card.programme}</span>
                      <span>•</span>
                      <span className="capitalize">{card.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by learner name, email, or deck..."
                value={sessionSearch}
                onChange={(e) => {
                  setSessionSearch(e.target.value);
                  setSessionPage(1);
                }}
                className="pl-9 text-xs"
              />
            </div>
            <div>
              <select
                value={sessionProgramme}
                onChange={(e) => {
                  setSessionProgramme(e.target.value);
                  setSessionPage(1);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
              >
                <option value="all">All Programmes</option>
                <option value="rn">NCLEX-RN</option>
                <option value="pn">NCLEX-PN</option>
              </select>
            </div>
            <div>
              <select
                value={sessionStatus}
                onChange={(e) => {
                  setSessionStatus(e.target.value);
                  setSessionPage(1);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Learner</th>
                    <th className="px-4 py-3">Deck / Focus</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Programme</th>
                    <th className="px-4 py-3">Cards (Rev/Total)</th>
                    <th className="px-4 py-3">Accuracy</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingSessions ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                        Loading session records...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                        No review sessions match criteria.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 text-xs">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{s.userName}</div>
                          <div className="text-muted-foreground text-[11px]">{s.userEmail}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate">
                          {s.deckName || s.topicTitle || "All Due Cards"}
                        </td>
                        <td className="px-4 py-3 capitalize font-mono">
                          {s.mode.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="uppercase font-mono text-[11px]">
                            {s.programme}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {s.cardsReviewed} / {s.totalCards}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <Badge
                            variant="secondary"
                            className={
                              s.accuracyPercentage >= 80
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : ""
                            }
                          >
                            {s.accuracyPercentage}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={s.status === "completed" ? "default" : "secondary"}
                            className="capitalize text-[11px]"
                          >
                            {s.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(s.startedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(s.id)}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20 text-xs text-muted-foreground">
              <div>
                Showing {sessions.length} of {totalSessions} total sessions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sessionPage <= 1}
                  onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span>Page {sessionPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sessionPage * 15 >= totalSessions}
                  onClick={() => setSessionPage((p) => p + 1)}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALGORITHM PARAMETERS CONFIG */}
      {activeTab === "config" && (
        <div className="max-w-2xl rounded-lg border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              Spaced Repetition Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjust global SM-2 algorithm defaults, daily limits, and program availability.
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Max Cards Per Drill Session
                </label>
                <Input
                  type="number"
                  min={5}
                  max={200}
                  value={maxCards}
                  onChange={(e) => setMaxCards(Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">Hard cap per single review session</span>
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Default Quick-Drill Card Count
                </label>
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={defaultLimit}
                  onChange={(e) => setDefaultLimit(Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">Pre-filled count for learners</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-foreground block mb-1">
                  SM-2 Initial Ease Factor
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min={1.3}
                  max={3.5}
                  value={defaultEase}
                  onChange={(e) => setDefaultEase(Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">Default 2.5 ease multiplier</span>
              </div>
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Min Interval (Days)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={14}
                  value={minInterval}
                  onChange={(e) => setMinInterval(Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">First repetition interval</span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={enableRn}
                  onChange={(e) => setEnableRn(e.target.checked)}
                  className="rounded border-input h-4 w-4 text-primary"
                />
                <span>Enable Spaced Repetition for NCLEX-RN learners</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={enablePn}
                  onChange={(e) => setEnablePn(e.target.checked)}
                  className="rounded border-input h-4 w-4 text-primary"
                />
                <span>Enable Spaced Repetition for NCLEX-PN learners</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={requireSub}
                  onChange={(e) => setRequireSub(e.target.checked)}
                  className="rounded border-input h-4 w-4 text-primary"
                />
                <span>Require active paid subscription to unlock custom drills</span>
              </label>
            </div>

            {config?.updatedAt && (
              <div className="text-xs text-muted-foreground pt-2">
                Last updated: {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy || "System"}
              </div>
            )}

            <div className="pt-2">
              <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
                {isSavingConfig ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drill-Down Session Details Modal */}
      <Dialog open={!!selectedSessionId} onOpenChange={(open) => !open && setSelectedSessionId(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Session Drilldown & Item Audit
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review individual SM-2 responses, ratings (1 to 5), and resulting ease factor adjustments.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-2">
            {loadingDetail ? (
              <div className="py-8 text-center text-muted-foreground">Loading session details...</div>
            ) : sessionDetail ? (
              <div className="space-y-4">
                {/* Session Header Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Learner</span>
                    <span className="font-semibold">{sessionDetail.userName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Score</span>
                    <span className="font-semibold">
                      {sessionDetail.cardsCorrect} / {sessionDetail.cardsReviewed} ({sessionDetail.accuracyPercentage}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Mode</span>
                    <span className="font-semibold capitalize">{sessionDetail.mode.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Duration</span>
                    <span className="font-semibold">{sessionDetail.durationSeconds}s</span>
                  </div>
                </div>

                {/* Card Item Logs */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Individual Item Repetitions
                  </h4>
                  {sessionDetail.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-md border text-xs space-y-1.5 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {idx + 1}. {item.front}
                        </span>
                        <Badge
                          variant={item.rating >= 3 ? "default" : "destructive"}
                          className="text-[11px] shrink-0"
                        >
                          Rating: {item.rating} ({item.ratingLabel})
                        </Badge>
                      </div>
                      <div className="text-muted-foreground line-clamp-2">{item.back}</div>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t">
                        <span>Response Time: {item.responseTimeMs}ms</span>
                        <span>
                          Ease: {item.easeFactorBefore.toFixed(2)} &rarr; {item.easeFactorAfter.toFixed(2)}
                        </span>
                        <span>
                          Interval: {item.intervalDaysBefore}d &rarr; {item.intervalDaysAfter}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setSelectedSessionId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

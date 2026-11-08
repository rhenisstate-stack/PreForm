"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  adminStudyService,
  AIProviderConfig,
  AIMonitoring,
} from "@/lib/admin-study-service";
import { notify as toast } from "@/lib/notifications";

export function AdminAIGovernanceClient() {
  const [config, setConfig] = React.useState<AIProviderConfig | null>(null);
  const [monitoring, setMonitoring] = React.useState<AIMonitoring | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);

  // Form states
  const [isEnabled, setIsEnabled] = React.useState<boolean>(true);
  const [modelId, setModelId] = React.useState<string>("gemini-1.5-flash");
  const [temperature, setTemperature] = React.useState<number>(0.2);
  const [dailyQuota, setDailyQuota] = React.useState<number>(50);
  const [toggles, setToggles] = React.useState<Record<string, boolean>>({
    notes: true,
    flashcards: true,
    quizzes: true,
    tutor: true,
    plans: true,
    documents: true,
  });

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [confRes, monRes] = await Promise.all([
        adminStudyService.getAIConfiguration(),
        adminStudyService.getAIMonitoring(),
      ]);

      const c = confRes.config;
      setConfig(c);
      setIsEnabled(c.isEnabled);
      setModelId(c.modelId);
      setTemperature(c.temperature);
      setDailyQuota(c.dailyPerUserQuota);
      setToggles(c.featureToggles || {});
      setMonitoring(monRes.monitoring);
    } catch (err: any) {
      toast.error(err.message || "Failed to load AI governance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const res = await adminStudyService.updateAIConfiguration({
        isEnabled,
        modelId,
        temperature,
        dailyPerUserQuota: dailyQuota,
        featureToggles: toggles,
      });

      setConfig(res.config);
      toast.success("AI Studio governance configuration updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: string) => {
    setToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div data-testid="admin-ai-governance-page" className="space-y-6 max-w-6xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-teal-600" />
            <h1 className="font-serif font-bold text-2xl text-foreground">AI Studio Governance & Cost Control</h1>
            <Badge variant="outline" className="text-xs uppercase font-mono">Google Gemini</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage provider model settings, feature toggles, per-user rate limits, and real-time token expenditure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={handleSaveConfig}
            disabled={saving}
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Settings</span>
          </Button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      {monitoring && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requests Today</div>
              <div className="text-2xl font-serif font-bold text-foreground mt-1">{monitoring.totalRequestsToday}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tokens Consumed</div>
              <div className="text-2xl font-serif font-bold text-teal-600 mt-1">{monitoring.totalTokensToday.toLocaleString()}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated Cost</div>
              <div className="text-2xl font-serif font-bold text-foreground mt-1">${monitoring.estimatedCostTodayUsd.toFixed(4)}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Per-User Daily Quota</div>
              <div className="text-2xl font-serif font-bold text-foreground mt-1">{dailyQuota} reqs</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sliders className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* ── Configuration Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Settings */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
          <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-teal-600" />
            <span>Provider & Model Settings</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <span className="font-semibold text-foreground block">Global AI Enablement</span>
                <span className="text-muted-foreground text-[11px]">Toggle entire AI study studio features across platform</span>
              </div>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-teal-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Active Model</label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-xs"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast, high-yield cost efficiency)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep clinical reasoning)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Next-generation speed)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="font-semibold text-foreground">Temperature ({temperature})</label>
                <span className="text-muted-foreground text-[11px]">Lower = more deterministic</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Per-User Daily Quota (Requests)</label>
              <Input
                type="number"
                min={5}
                max={500}
                value={dailyQuota}
                onChange={(e) => setDailyQuota(parseInt(e.target.value) || 50)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
          <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-teal-600" />
            <span>Granular Feature Toggles</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            {[
              { id: "notes", label: "AI Note Assistant", desc: "Summarize notes, extract key takeaways & terminology" },
              { id: "flashcards", label: "AI Flashcard Generator", desc: "Generate editable flashcards from clinical topics" },
              { id: "quizzes", label: "AI Topic Quiz Generator", desc: "Draft practice questions from custom source notes" },
              { id: "tutor", label: "NCLEX Clinical Tutor", desc: "Conversational NCLEX mentoring & clinical scenarios" },
              { id: "plans", label: "AI Study Planner", desc: "Generate milestone-based study schedules by exam date" },
              { id: "documents", label: "Document Ingestion", desc: "Analyze learner-uploaded PDF study guides" },
            ].map((f) => (
              <div
                key={f.id}
                onClick={() => toggleFeature(f.id)}
                className="p-3 rounded-xl border border-border hover:bg-muted/20 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-foreground block">{f.label}</span>
                  <span className="text-[11px] text-muted-foreground">{f.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={toggles[f.id] ?? true}
                  onChange={() => {}}
                  className="h-4 w-4 rounded text-teal-600"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Requests Audit Trail ── */}
      {monitoring && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            <span>Inbound AI Requests Audit Log</span>
          </h3>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Feature</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Tokens (In/Out)</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {monitoring.recentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No AI requests recorded today.
                    </td>
                  </tr>
                ) : (
                  monitoring.recentRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-semibold text-foreground capitalize">{r.feature.replace(/_/g, " ")}</td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">{r.model}</td>
                      <td className="p-3 text-muted-foreground">{r.inputTokens} / {r.outputTokens}</td>
                      <td className="p-3 text-muted-foreground">{r.latencyMs}ms</td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] ${
                            r.status === "success"
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

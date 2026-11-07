"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Save,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  HelpCircle,
  RefreshCw,
  Sliders,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";
import type {
  BackendExamCompositionDto,
  BackendQuestionPoolPreviewDto,
  ClientNeedQuotaItem,
} from "@/lib/api-services";

const CLIENT_NEEDS_MASTER = [
  { id: "MOC", name: "Management of Care" },
  { id: "SIC", name: "Safety and Infection Control" },
  { id: "HPM", name: "Health Promotion and Maintenance" },
  { id: "PSI", name: "Psychosocial Integrity" },
  { id: "BCC", name: "Basic Care and Comfort" },
  { id: "PHA", name: "Pharmacological and Parenteral Therapies" },
  { id: "RRP", name: "Reduction of Risk Potential" },
  { id: "PPT", name: "Physiological Adaptation" },
];

const ALLOWED_TRADITIONAL_TYPES = [
  { key: "single-choice", label: "Single Choice (Multiple Choice)" },
  { key: "multiple-choice", label: "Multiple Choice" },
  { key: "sata", label: "Select All That Apply (SATA)" },
  { key: "checkbox", label: "Multiple True/False (Checkbox)" },
  { key: "image-based", label: "Hot Spot / Image-Based" },
  { key: "multiple-image", label: "Multiple Image Selection" },
  { key: "true-false", label: "Clinical True / False" },
];

const LEGACY_COMPOSITION_TYPE_MAP: Record<string, string> = {
  "multiple-response": "sata",
  "hot-spot": "image-based",
};

function normalizeAllowedTypes(types?: string[]): string[] {
  if (!types || types.length === 0) return ["single-choice", "sata"];
  const mapped = types
    .map((t) => LEGACY_COMPOSITION_TYPE_MAP[t] || t)
    .filter((t) => ALLOWED_TRADITIONAL_TYPES.some((allowed) => allowed.key === t));
  return mapped.length > 0 ? Array.from(new Set(mapped)) : ["single-choice", "sata"];
}

interface ExaminationCompositionTabProps {
  revisionId: string;
  isDraft: boolean;
  concurrencyToken: number;
  onConcurrencyTokenChange?: (token: number) => void;
}

export function ExaminationCompositionTab({
  revisionId,
  isDraft,
  concurrencyToken,
  onConcurrencyTokenChange,
}: ExaminationCompositionTabProps) {
  const queryClient = useQueryClient();

  const [targetQuestionCount, setTargetQuestionCount] = React.useState(10);
  const [selectionStrategy, setSelectionStrategy] = React.useState("Preset");
  const [allowedQuestionTypes, setAllowedQuestionTypes] = React.useState<string[]>([
    "single-choice",
    "sata",
  ]);
  const [quotas, setQuotas] = React.useState<ClientNeedQuotaItem[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Fetch composition
  const {
    data: compositionData,
    isLoading: isLoadingComp,
    refetch: refetchComp,
  } = useQuery({
    queryKey: ["admin", "examination", "composition", revisionId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/composition`);
      if (!res.ok) {
        throw new Error("Failed to load examination composition");
      }
      return res.json() as Promise<{ success: boolean; composition: BackendExamCompositionDto }>;
    },
  });

  // Fetch question pool preview
  const {
    data: poolPreviewData,
    isLoading: isLoadingPool,
    refetch: refetchPool,
  } = useQuery({
    queryKey: ["admin", "examination", "pool-preview", revisionId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/pool-preview`);
      if (!res.ok) {
        throw new Error("Failed to load question pool preview");
      }
      return res.json() as Promise<{ success: boolean; preview: BackendQuestionPoolPreviewDto }>;
    },
  });

  React.useEffect(() => {
    if (compositionData?.composition && !isInitialized) {
      const comp = compositionData.composition;
      setTargetQuestionCount(comp.targetQuestionCount || 10);
      setSelectionStrategy(comp.selectionStrategy || "Preset");
      setAllowedQuestionTypes(normalizeAllowedTypes(comp.allowedQuestionTypes));

      // Merge master client needs with saved quotas
      const mergedQuotas: ClientNeedQuotaItem[] = CLIENT_NEEDS_MASTER.map((cn) => {
        const found = comp.clientNeedQuotas?.find((q) => q.clientNeedId.toUpperCase() === cn.id);
        return {
          clientNeedId: cn.id,
          clientNeedName: cn.name,
          targetCount: found?.targetCount ?? 0,
          targetPercentage: found?.targetPercentage ?? 0,
          availableCount: found?.availableCount ?? 0,
        };
      });

      setQuotas(mergedQuotas);
      setIsInitialized(true);
    }
  }, [compositionData, isInitialized]);

  // Update available count from pool preview when available
  React.useEffect(() => {
    if (poolPreviewData?.preview?.items && isInitialized) {
      setQuotas((prev) =>
        prev.map((q) => {
          const pItem = poolPreviewData.preview.items.find((item) => item.clientNeedId.toUpperCase() === q.clientNeedId.toUpperCase());
          return pItem ? { ...q, availableCount: pItem.availableApprovedQuestions } : q;
        })
      );
    }
  }, [poolPreviewData, isInitialized]);

  const totalQuotaCount = quotas.reduce((sum, q) => sum + (Number(q.targetCount) || 0), 0);
  const countMismatch = selectionStrategy === "DynamicBalanced" && totalQuotaCount !== targetQuestionCount;

  const handleQuotaCountChange = (clientNeedId: string, value: number) => {
    const val = Math.max(0, isNaN(value) ? 0 : value);
    setQuotas((prev) =>
      prev.map((q) => {
        if (q.clientNeedId === clientNeedId) {
          const pct = targetQuestionCount > 0 ? Math.round((val / targetQuestionCount) * 100) : 0;
          return { ...q, targetCount: val, targetPercentage: pct };
        }
        return q;
      })
    );
  };

  const handleToggleQuestionType = (key: string) => {
    if (!isDraft) return;
    setAllowedQuestionTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/examinations/revisions/${encodeURIComponent(revisionId)}/composition`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetQuestionCount: Number(targetQuestionCount),
            selectionStrategy,
            allowedQuestionTypes,
            clientNeedQuotas: quotas.map((q) => ({
              clientNeedId: q.clientNeedId,
              targetCount: Number(q.targetCount) || 0,
              targetPercentage: Number(q.targetPercentage) || 0,
            })),
            concurrencyToken,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update composition");
      }
      return data;
    },
    onSuccess: (data) => {
      notify.success("Examination blueprint and composition saved successfully.");
      if (data.composition?.concurrencyToken) {
        onConcurrencyTokenChange?.(data.composition.concurrencyToken);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "examination", "composition", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "examination", "pool-preview", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "examination", "readiness", revisionId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "examination", "revision", revisionId] });
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err?.message || "Failed to save composition"));
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Curriculum Blueprint & Question Composition
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure target assessment question volumes, candidate selection strategy, and NCSBN Client Needs quotas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchComp();
              refetchPool();
            }}
            disabled={isLoadingComp || isLoadingPool}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoadingComp || isLoadingPool ? "animate-spin" : ""}`} />
            Refresh Pool
          </Button>
          {isDraft && (
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || countMismatch}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save Composition"}
            </Button>
          )}
        </div>
      </div>

      {countMismatch && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Quota Count Mismatch: </span>
            The sum of Client Needs quotas ({totalQuotaCount}) must exactly equal the target question count ({targetQuestionCount}) for Dynamic Balanced selection.
          </div>
        </div>
      )}

      {/* Global Blueprint Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Count */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Target Question Count</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {targetQuestionCount} Questions
            </Badge>
          </Label>
          <Input
            type="number"
            min={1}
            max={300}
            value={targetQuestionCount}
            disabled={!isDraft}
            onChange={(e) => setTargetQuestionCount(Number(e.target.value) || 10)}
            className="text-xs"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Authoritative delivered question count for candidate attempts using this revision.
          </p>
        </div>

        {/* Selection Strategy */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Question Selection Strategy
          </Label>
          <select
            value={selectionStrategy}
            disabled={!isDraft}
            onChange={(e) => setSelectionStrategy(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Preset">Preset (Directly Ordered Questions)</option>
            <option value="DynamicBalanced">Dynamic Balanced (Client Needs Quotas from Pool)</option>
            <option value="Hybrid">Hybrid (Core Preset Items + Dynamic Quotas)</option>
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {selectionStrategy === "Preset" && "Delivers explicitly assigned question items in ordered sequence."}
            {selectionStrategy === "DynamicBalanced" && "Samples randomized approved clinical items adhering strictly to NCSBN blueprint quotas."}
            {selectionStrategy === "Hybrid" && "Combines mandatory core questions with blueprint category distribution."}
          </p>
        </div>
      </div>

      {/* Allowed Question Types */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            Allowed NCLEX Question Types
          </Label>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            NGN question types are catalogued but excluded from active candidate delivery until grading engines activate.
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          {ALLOWED_TRADITIONAL_TYPES.map((type) => {
            const isChecked = allowedQuestionTypes.includes(type.key);
            return (
              <label
                key={type.key}
                onClick={() => handleToggleQuestionType(type.key)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  isChecked
                    ? "border-teal-500/40 bg-teal-50/50 dark:bg-teal-950/20 text-teal-900 dark:text-teal-200"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-70"
                } ${!isDraft ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    isChecked
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span className="font-medium truncate">{type.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* NCSBN 8 Client Needs Blueprint Distribution */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              NCSBN Client Needs Blueprint Quotas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specify item quotas across the 8 official NCSBN client needs categories.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Total Quota Items:{" "}
              <strong className={totalQuotaCount === targetQuestionCount ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {totalQuotaCount}
              </strong>{" "}
              / {targetQuestionCount}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Client Need Category</th>
                <th className="py-2.5 px-3 w-28 text-center">Target Items</th>
                <th className="py-2.5 px-3 w-24 text-center">Ratio (%)</th>
                <th className="py-2.5 px-3 w-32 text-center">Pool Sufficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {quotas.map((q) => {
                const isSufficient = q.availableCount >= q.targetCount;
                return (
                  <tr key={q.clientNeedId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {q.clientNeedName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Category Key: {q.clientNeedId}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={q.targetCount}
                        disabled={!isDraft}
                        onChange={(e) => handleQuotaCountChange(q.clientNeedId, parseInt(e.target.value, 10))}
                        className="w-20 text-center mx-auto text-xs py-1 h-8"
                      />
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                      {targetQuestionCount > 0 ? Math.round(((q.targetCount || 0) / targetQuestionCount) * 100) : 0}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono px-2 py-0.5 ${
                          isSufficient
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {q.availableCount} available / {q.targetCount} req
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

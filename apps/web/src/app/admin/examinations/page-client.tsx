"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Plus,
  Search,
  BookOpen,
  ArrowRight,
  Layers,
  CheckCircle2,
  Clock,
  Archive,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandedLoading } from "@/components/layout/branded-loading";
import { getAdminCapabilities } from "@/lib/admin/authz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BackendExaminationDto } from "@/lib/api-services";
import { notify } from "@/lib/notifications";
import { sanitizeErrorMessage } from "@/lib/error-mapping";

function getStatusBadge(state?: string) {
  switch (state?.toLowerCase()) {
    case "published":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Published</Badge>;
    case "approved":
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">Approved</Badge>;
    case "inreview":
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">In Review</Badge>;
    case "archived":
      return <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30">Archived</Badge>;
    case "retired":
      return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">Retired</Badge>;
    case "draft":
    default:
      return <Badge className="bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30">Draft</Badge>;
  }
}

export function AdminExaminationsClient() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [pathwayFilter, setPathwayFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // Form state
  const [formPathway, setFormPathway] = React.useState<"rn" | "pn">("rn");
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formExamType, setFormExamType] = React.useState(0);
  const [formTimeLimit, setFormTimeLimit] = React.useState(60);
  const [formPassingScore, setFormPassingScore] = React.useState(75.0);

  const capabilities = getAdminCapabilities(user?.role);

  const {
    data: examinations = [],
    isLoading: isLoadingExams,
    error: examsError,
    refetch,
  } = useQuery<BackendExaminationDto[]>({
    queryKey: ["admin-examinations", pathwayFilter],
    queryFn: async (): Promise<BackendExaminationDto[]> => {
      const url = pathwayFilter === "all" ? "/api/admin/examinations" : `/api/admin/examinations?pathway=${pathwayFilter}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load examinations");
      }
      const data = await res.json();
      return data.examinations || [];
    },
    enabled: isAuthenticated && capabilities.canViewExaminations,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/examinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathway: formPathway,
          title: formTitle,
          description: formDescription,
          examType: formExamType,
          timeLimitMinutes: formTimeLimit,
          passingScorePercent: formPassingScore,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create examination family");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Examination family and initial revision created.");
      setIsCreateOpen(false);
      setFormTitle("");
      setFormDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin-examinations"] });
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err.message));
    },
  });

  if (isLoading) {
    return <BrandedLoading message="Verifying administrative credentials..." />;
  }

  if (!isAuthenticated || !capabilities.canViewExaminations) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <ShieldAlert className="h-14 w-14 text-rose-500 mb-4" />
        <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">
          Access Restricted
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
          You do not have administrative permissions to view or govern examinations.
        </p>
        <Link href="/admin">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const filteredExams = examinations.filter((exam) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return exam.code.toLowerCase().includes(q) || exam.title.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-[#142B4A] dark:text-white">
              Examinations
            </h1>
            <Badge variant="outline" className="text-xs uppercase tracking-wider">
              P3.2 Domain
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative examination catalogue, versioned revisions, and question composition.
          </p>
        </div>

        {capabilities.canManageExaminations && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Examination Family
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setPathwayFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              pathwayFilter === "all"
                ? "bg-white dark:bg-slate-800 text-[#142B4A] dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All Pathways
          </button>
          <button
            onClick={() => setPathwayFilter("rn")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              pathwayFilter === "rn"
                ? "bg-white dark:bg-slate-800 text-[#0D9488] dark:text-teal-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            NCLEX-RN
          </button>
          <button
            onClick={() => setPathwayFilter("pn")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              pathwayFilter === "pn"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            NCLEX-PN
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code or title..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Catalogue Table */}
      {isLoadingExams ? (
        <div className="py-12 flex justify-center">
          <BrandedLoading message="Loading examination catalogue..." />
        </div>
      ) : examsError ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
            Failed to load examinations catalogue.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Retry
          </Button>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No examinations found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery
              ? "No examination families matched your search query."
              : "Get started by creating your first examination family."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Pathway</th>
                <th className="py-3 px-4">Active Revision</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Revisions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {filteredExams.map((exam) => (
                <tr
                  key={exam.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-xs text-[#142B4A] dark:text-teal-400">
                    {exam.code}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    {exam.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant="outline"
                      className={`text-xs uppercase font-bold ${
                        exam.pathway === "rn"
                          ? "border-teal-500/30 text-teal-700 dark:text-teal-300 bg-teal-500/10"
                          : "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10"
                      }`}
                    >
                      {exam.pathway.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                    {exam.currentRevision ? (
                      <span>Rev {exam.currentRevision.revisionNumber} ({exam.currentRevision.questionCount} Qs)</span>
                    ) : (
                      <span className="text-slate-400 italic">None published</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(exam.currentRevision?.lifecycleState || "Draft")}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {exam.revisions?.length || 1} revision{(exam.revisions?.length || 1) > 1 ? "s" : ""}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href={`/admin/examinations/${exam.id}`}>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                        Lineage Studio
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Examination Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Examination Family</DialogTitle>
            <DialogDescription>
              Assigns a permanent, sequential examination code and initializes Revision 1 in Draft state.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Pathway</Label>
              <div className="flex gap-4 mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="pathway"
                    checked={formPathway === "rn"}
                    onChange={() => setFormPathway("rn")}
                    className="accent-teal-600"
                  />
                  <span>NCLEX-RN (RN-EX)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="pathway"
                    checked={formPathway === "pn"}
                    onChange={() => setFormPathway("pn")}
                    className="accent-teal-600"
                  />
                  <span>NCLEX-PN (PN-EX)</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="exam-title" className="text-xs font-semibold">
                Examination Family Title
              </Label>
              <Input
                id="exam-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. NCLEX-RN Comprehensive Licensure Simulator"
                className="mt-1"
                maxLength={128}
              />
            </div>

            <div>
              <Label htmlFor="exam-desc" className="text-xs font-semibold">
                Description / Clinical Scope
              </Label>
              <textarea
                id="exam-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Detailed syllabus, client needs categories, and authoring notes..."
                className="w-full mt-1 px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-800 bg-transparent"
                rows={3}
                maxLength={1024}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exam-time" className="text-xs font-semibold">
                  Time Limit (Minutes)
                </Label>
                <Input
                  id="exam-time"
                  type="number"
                  min={0}
                  max={720}
                  value={formTimeLimit}
                  onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                  className="mt-1"
                />
                <span className="text-[10px] text-slate-500">0 for untimed practice</span>
              </div>
              <div>
                <Label htmlFor="exam-pass" className="text-xs font-semibold">
                  Passing Score (%)
                </Label>
                <Input
                  id="exam-pass"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formPassingScore}
                  onChange={(e) => setFormPassingScore(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formTitle.trim() || createMutation.isPending}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white"
            >
              {createMutation.isPending ? "Creating..." : "Create Examination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowRight,
  ShieldAlert,
  Copy,
  GitBranch,
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
import type { BackendExaminationDto, BackendExamRevisionDto } from "@/lib/api-services";
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

export function AdminExaminationFamilyClient({ id }: { id: string }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const capabilities = getAdminCapabilities(user?.role);

  const [isEditFamilyOpen, setIsEditFamilyOpen] = React.useState(false);
  const [familyTitle, setFamilyTitle] = React.useState("");

  // Create New Revision states
  const [isCreateRevisionOpen, setIsCreateRevisionOpen] = React.useState(false);
  const [newRevTitle, setNewRevTitle] = React.useState("");
  const [newRevDescription, setNewRevDescription] = React.useState("");
  const [newRevTimeLimit, setNewRevTimeLimit] = React.useState(60);
  const [newRevPassingScore, setNewRevPassingScore] = React.useState(75.0);
  const [sourceRevisionId, setSourceRevisionId] = React.useState<string>("");
  const [copyQuestions, setCopyQuestions] = React.useState(true);

  // Duplicate Examination states
  const [isDuplicateOpen, setIsDuplicateOpen] = React.useState(false);
  const [duplicateTitle, setDuplicateTitle] = React.useState("");
  const [duplicateSourceRevId, setDuplicateSourceRevId] = React.useState<string>("");

  const {
    data: examination,
    isLoading: isLoadingFamily,
    error: familyError,
  } = useQuery<BackendExaminationDto>({
    queryKey: ["admin-examination-family", id],
    queryFn: async (): Promise<BackendExaminationDto> => {
      const res = await fetch(`/api/admin/examinations/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error("Failed to load examination family");
      }
      const data = await res.json();
      return data.examination;
    },
    enabled: isAuthenticated && capabilities.canViewExaminations,
  });

  const eligibleRevisions = React.useMemo(() => {
    return examination?.revisions?.filter((r) => {
      const state = r.lifecycleState.toLowerCase();
      return state === "published" || state === "approved" || state === "archived";
    }) || [];
  }, [examination?.revisions]);

  React.useEffect(() => {
    if (examination) {
      setFamilyTitle(examination.title);
      setNewRevTitle(`${examination.title} (Rev ${(examination.revisions?.length || 0) + 1})`);
      setDuplicateTitle(`${examination.title} (Copy)`);

      const defaultSource =
        examination.revisions?.find((r) => r.lifecycleState.toLowerCase() === "published") ||
        eligibleRevisions[0];
      if (defaultSource) {
        setSourceRevisionId(defaultSource.id);
        setDuplicateSourceRevId(defaultSource.id);
      }
    }
  }, [examination, eligibleRevisions]);

  const handleSourceRevisionChange = (selectedId: string) => {
    setSourceRevisionId(selectedId);
    if (!selectedId) return;

    const source = eligibleRevisions.find((r) => r.id === selectedId);
    if (source) {
      setNewRevTitle(`${examination?.title || source.title} (Rev ${(examination?.revisions?.length || 0) + 1})`);
      setNewRevDescription(source.description || "");
      setNewRevTimeLimit(source.timeLimitMinutes || 60);
      setNewRevPassingScore(source.passingScorePercent || 75.0);
    }
  };

  const handleOpenCreateRevision = (presetSourceId?: string) => {
    if (presetSourceId) {
      handleSourceRevisionChange(presetSourceId);
    }
    setIsCreateRevisionOpen(true);
  };

  const handleOpenDuplicate = (presetSourceId?: string) => {
    if (presetSourceId) {
      setDuplicateSourceRevId(presetSourceId);
    } else {
      const defaultSource =
        examination?.revisions?.find((r) => r.lifecycleState.toLowerCase() === "published") ||
        eligibleRevisions[0];
      if (defaultSource) setDuplicateSourceRevId(defaultSource.id);
    }
    setDuplicateTitle(`${examination?.title || "Examination"} (Copy)`);
    setIsDuplicateOpen(true);
  };

  const updateFamilyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/examinations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: familyTitle }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update examination family title");
      }
      return res.json();
    },
    onSuccess: () => {
      notify.success("Examination family title updated.");
      setIsEditFamilyOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", id] });
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err.message));
    },
  });

  const createRevisionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/examinations/${encodeURIComponent(id)}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRevTitle.trim(),
          description: newRevDescription.trim(),
          examType: 0,
          timeLimitMinutes: newRevTimeLimit,
          passingScorePercent: newRevPassingScore,
          sourceRevisionId: sourceRevisionId || undefined,
          copyQuestions: Boolean(sourceRevisionId && copyQuestions),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create new draft revision");
      }
      return res.json();
    },
    onSuccess: (data) => {
      notify.success("New draft revision created.");
      setIsCreateRevisionOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-examination-family", id] });
      if (data?.revision?.id) {
        router.push(`/admin/examinations/${encodeURIComponent(id)}/revisions/${encodeURIComponent(data.revision.id)}`);
      }
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err.message));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/examinations/${encodeURIComponent(id)}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: duplicateTitle.trim(),
          sourceRevisionId: duplicateSourceRevId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to duplicate examination");
      }
      return res.json();
    },
    onSuccess: (data) => {
      notify.success(`Examination duplicated as ${data.examinationCode}.`);
      setIsDuplicateOpen(false);
      if (data?.examinationId) {
        router.push(`/admin/examinations/${encodeURIComponent(data.examinationId)}`);
      }
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err.message));
    },
  });

  if (isLoading) {
    return <BrandedLoading message="Verifying credentials..." />;
  }

  if (!isAuthenticated || !capabilities.canViewExaminations) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <ShieldAlert className="h-14 w-14 text-rose-500 mb-4" />
        <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">
          Access Restricted
        </h2>
        <Link href="/admin">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (isLoadingFamily) {
    return (
      <div className="py-16 flex justify-center">
        <BrandedLoading message="Loading examination lineage..." />
      </div>
    );
  }

  if (familyError || !examination) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-12 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">Examination Not Found</h3>
        <p className="text-sm text-rose-700 dark:text-rose-400 mt-1 mb-4">
          The requested examination family could not be found or you do not have permission to view it.
        </p>
        <Link href="/admin/examinations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Back to Catalogue
          </Button>
        </Link>
      </div>
    );
  }

  const hasActiveDraft = examination.revisions?.some(
    (r) => r.lifecycleState.toLowerCase() === "draft"
  );

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Back button */}
      <Link
        href="/admin/examinations"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Examination Catalogue
      </Link>

      {/* Family Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md border border-teal-500/20">
                {examination.code}
              </span>
              <Badge
                variant="outline"
                className={`uppercase font-bold text-xs ${
                  examination.pathway === "rn"
                    ? "border-teal-500/30 text-teal-700 dark:text-teal-300"
                    : "border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                }`}
              >
                {examination.pathway.toUpperCase()}
              </Badge>
              {examination.currentRevision && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  Active: Rev {examination.currentRevision.revisionNumber}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-[#142B4A] dark:text-white">
                {examination.title}
              </h1>
              {capabilities.canManageExaminations && (
                <button
                  onClick={() => setIsEditFamilyOpen(true)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors rounded"
                  title="Edit family title"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Created {new Date(examination.createdAt).toLocaleDateString()} by {examination.createdBy}
            </p>
          </div>

          {capabilities.canManageExaminations && (
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => setIsCreateRevisionOpen(true)}
                disabled={hasActiveDraft}
                className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Draft Revision
              </Button>
              {hasActiveDraft && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  An active draft already exists for this family.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Revision Lineage Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-serif font-bold text-[#142B4A] dark:text-white">
            Revision Lineage ({examination.revisions?.length || 0})
          </h2>
        </div>

        <div className="space-y-3">
          {examination.revisions?.map((rev) => (
            <div
              key={rev.id}
              className={`p-5 rounded-xl border transition-all ${
                rev.id === examination.currentRevisionId
                  ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-500/40 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-[#142B4A] dark:text-white">
                      Revision {rev.revisionNumber}
                    </span>
                    {getStatusBadge(rev.lifecycleState)}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      • {rev.questionCount} Questions
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      • {rev.timeLimitMinutes === 0 ? "Untimed" : `${rev.timeLimitMinutes} mins`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      • Pass: {rev.passingScorePercent}%
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {rev.title}
                  </h3>

                  {rev.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 max-w-2xl">
                      {rev.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>Created: {new Date(rev.createdAt).toLocaleDateString()}</span>
                    {rev.approvedAt && <span>Approved: {new Date(rev.approvedAt).toLocaleDateString()}</span>}
                    {rev.publishedAt && <span>Published: {new Date(rev.publishedAt).toLocaleDateString()}</span>}
                    {rev.archivedAt && <span>Archived: {new Date(rev.archivedAt).toLocaleDateString()}</span>}
                    {rev.retiredAt && <span>Retired: {new Date(rev.retiredAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/examinations/${examination.id}/revisions/${rev.id}`}>
                    <Button
                      variant={rev.lifecycleState.toLowerCase() === "draft" ? "default" : "outline"}
                      size="sm"
                      className={`gap-1.5 text-xs ${
                        rev.lifecycleState.toLowerCase() === "draft"
                          ? "bg-[#0D9488] hover:bg-[#0F766E] text-white"
                          : ""
                      }`}
                    >
                      {rev.lifecycleState.toLowerCase() === "draft" ? "Author Revision" : "View Studio"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Family Title Dialog */}
      <Dialog open={isEditFamilyOpen} onOpenChange={setIsEditFamilyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Examination Family Title</DialogTitle>
            <DialogDescription>
              Updates the family-level stable title across all revision lineages.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label htmlFor="fam-title" className="text-xs font-semibold">
              Family Title
            </Label>
            <Input
              id="fam-title"
              value={familyTitle}
              onChange={(e) => setFamilyTitle(e.target.value)}
              className="mt-1"
              maxLength={128}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFamilyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateFamilyMutation.mutate()}
              disabled={!familyTitle.trim() || updateFamilyMutation.isPending}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white"
            >
              {updateFamilyMutation.isPending ? "Saving..." : "Save Title"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Revision Dialog */}
      <Dialog open={isCreateRevisionOpen} onOpenChange={setIsCreateRevisionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Draft Revision</DialogTitle>
            <DialogDescription>
              Initializes monotonically incremented Revision {(examination.revisions?.length || 0) + 1} under code {examination.code}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="rev-title" className="text-xs font-semibold">
                Revision Title
              </Label>
              <Input
                id="rev-title"
                value={newRevTitle}
                onChange={(e) => setNewRevTitle(e.target.value)}
                className="mt-1"
                maxLength={128}
              />
            </div>

            <div>
              <Label htmlFor="rev-desc" className="text-xs font-semibold">
                Revision Description
              </Label>
              <textarea
                id="rev-desc"
                value={newRevDescription}
                onChange={(e) => setNewRevDescription(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-slate-800 bg-transparent"
                rows={3}
                maxLength={1024}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rev-time" className="text-xs font-semibold">
                  Time Limit (Minutes)
                </Label>
                <Input
                  id="rev-time"
                  type="number"
                  min={0}
                  max={720}
                  value={newRevTimeLimit}
                  onChange={(e) => setNewRevTimeLimit(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rev-pass" className="text-xs font-semibold">
                  Passing Score (%)
                </Label>
                <Input
                  id="rev-pass"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={newRevPassingScore}
                  onChange={(e) => setNewRevPassingScore(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateRevisionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRevisionMutation.mutate()}
              disabled={!newRevTitle.trim() || createRevisionMutation.isPending}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white"
            >
              {createRevisionMutation.isPending ? "Creating..." : "Create Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

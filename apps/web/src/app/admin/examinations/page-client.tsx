"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  Check,
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
import type {
  BackendExaminationLibraryItemDto,
  BackendExaminationLibraryResponseDto,
} from "@/lib/api-services";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // URL Query State initialization
  const initialPathway = searchParams.get("pathway") || "all";
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("revisionStatus") || "all";
  const initialSortBy = searchParams.get("sortBy") || "code";
  const initialSortDir = (searchParams.get("sortDirection") as "asc" | "desc") || "asc";
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialPageSize = Number(searchParams.get("pageSize")) || 20;

  const [pathwayFilter, setPathwayFilter] = React.useState<string>(initialPathway);
  const [revisionStatusFilter, setRevisionStatusFilter] = React.useState<string>(initialStatus);
  const [searchInput, setSearchInput] = React.useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>(initialSearch);
  const [sortBy, setSortBy] = React.useState<string>(initialSortBy);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(initialSortDir);
  const [page, setPage] = React.useState<number>(initialPage);
  const [pageSize, setPageSize] = React.useState<number>(initialPageSize);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // Create Form State
  const [formPathway, setFormPathway] = React.useState<"rn" | "pn">("rn");
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formExamType, setFormExamType] = React.useState(0);
  const [formTimeLimit, setFormTimeLimit] = React.useState(60);
  const [formPassingScore, setFormPassingScore] = React.useState(75.0);

  const capabilities = getAdminCapabilities(user?.role);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Synchronize URL query params on filter/page change
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (pathwayFilter !== "all") params.set("pathway", pathwayFilter);
    if (revisionStatusFilter !== "all") params.set("revisionStatus", revisionStatusFilter);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (sortBy !== "code") params.set("sortBy", sortBy);
    if (sortDirection !== "asc") params.set("sortDirection", sortDirection);
    if (page > 1) params.set("page", page.toString());
    if (pageSize !== 20) params.set("pageSize", pageSize.toString());

    const qs = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/admin/examinations${qs}`, { scroll: false });
  }, [pathwayFilter, revisionStatusFilter, debouncedSearch, sortBy, sortDirection, page, pageSize, router]);

  // Main Discovery Library Query
  const {
    data: libraryData,
    isLoading: isLoadingLibrary,
    isFetching: isFetchingLibrary,
    error: libraryError,
    refetch,
  } = useQuery<BackendExaminationLibraryResponseDto>({
    queryKey: [
      "admin-examinations-library",
      debouncedSearch,
      pathwayFilter,
      revisionStatusFilter,
      sortBy,
      sortDirection,
      page,
      pageSize,
    ],
    queryFn: async (): Promise<BackendExaminationLibraryResponseDto> => {
      const params = new URLSearchParams();
      if (pathwayFilter !== "all") params.set("pathway", pathwayFilter);
      if (revisionStatusFilter !== "all") params.set("revisionStatus", revisionStatusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      params.set("sortBy", sortBy);
      params.set("sortDirection", sortDirection);
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      const res = await fetch(`/api/admin/examinations?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load examination library catalogue");
      }
      return res.json();
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
      queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] });
    },
    onError: (err: any) => {
      notify.error(sanitizeErrorMessage(err.message));
    },
  });

  const handleResetFilters = () => {
    setPathwayFilter("all");
    setRevisionStatusFilter("all");
    setSearchInput("");
    setDebouncedSearch("");
    setSortBy("code");
    setSortDirection("asc");
    setPage(1);
  };

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
          You do not have administrative permissions to view or govern the examination library.
        </p>
        <Link href="/admin">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const items = libraryData?.items || [];
  const pagination = libraryData?.pagination || { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-[#142B4A] dark:text-white">
              Examination Library
            </h1>
            <Badge variant="outline" className="text-xs uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
              P3.3 Discovery
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative discovery catalogue, lifecycle state querying, version lineage, and administrative governance.
          </p>
        </div>

        {capabilities.canManageExaminations && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Examination Family
          </Button>
        )}
      </div>

      {/* Query Control Bar: Search & Pathway & Lifecycle Filters */}
      <div className="bg-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box with Clear Button */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by code (RN-EX-...), title, description..."
              className="pl-9 pr-9 text-sm rounded-lg"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Pathway Segmented Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <button
              onClick={() => { setPathwayFilter("all"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                pathwayFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-[#142B4A] dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All Pathways
            </button>
            <button
              onClick={() => { setPathwayFilter("rn"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                pathwayFilter === "rn"
                  ? "bg-white dark:bg-slate-800 text-[#0D9488] dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              NCLEX-RN
            </button>
            <button
              onClick={() => { setPathwayFilter("pn"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                pathwayFilter === "pn"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              NCLEX-PN
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Lifecycle Filter & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium">Revision Lifecycle:</span>
            {["all", "Draft", "InReview", "Approved", "Published", "Archived", "Retired"].map((st) => (
              <button
                key={st}
                onClick={() => { setRevisionStatusFilter(st); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  revisionStatusFilter === st
                    ? "bg-[#142B4A] text-white dark:bg-slate-700 shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70"
                }`}
              >
                {st === "all" ? "All States" : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="bg-background border border-border text-foreground text-xs rounded-md px-2 py-1"
              >
                <option value="code">Examination Code</option>
                <option value="title">Family Title</option>
                <option value="pathway">Pathway</option>
                <option value="revisions">Revision Count</option>
                <option value="createdat">Creation Date</option>
                <option value="updatedat">Last Updated</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="h-7 text-xs px-2 flex items-center gap-1"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </Button>

            {(debouncedSearch || pathwayFilter !== "all" || revisionStatusFilter !== "all" || sortBy !== "code") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Catalogue Table Presentation */}
      {isLoadingLibrary ? (
        <div className="py-16 flex justify-center">
          <BrandedLoading message="Searching examination library..." fullScreen={false} />
        </div>
      ) : libraryError ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/40">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
            Failed to load examination library catalogue.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No examinations found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {debouncedSearch || pathwayFilter !== "all" || revisionStatusFilter !== "all"
              ? "No examination families matched your current search filters."
              : "No examination families exist in the platform yet."}
          </p>
          {(debouncedSearch || pathwayFilter !== "all" || revisionStatusFilter !== "all") && (
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Clear Search & Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Examination Code</th>
                  <th className="py-3 px-4">Family Title</th>
                  <th className="py-3 px-4">Pathway</th>
                  <th className="py-3 px-4">Published Revision</th>
                  <th className="py-3 px-4">Latest Revision</th>
                  <th className="py-3 px-4 text-center">Revisions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {items.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-xs text-[#142B4A] dark:text-teal-400">
                      {exam.code}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div>{exam.title}</div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                        Created {new Date(exam.createdAt).toLocaleDateString()} by {exam.createdBy}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={`text-xs uppercase font-bold ${
                          exam.pathway.toLowerCase() === "rn"
                            ? "border-teal-500/30 text-teal-700 dark:text-teal-300 bg-teal-500/10"
                            : "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10"
                        }`}
                      >
                        {exam.pathway.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {exam.publishedRevision ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Rev {exam.publishedRevision.revisionNumber}
                          </span>
                          <span className="text-slate-400">
                            ({exam.publishedRevision.questionCount} Qs)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None Published</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {exam.latestRevision ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold">
                            Rev {exam.latestRevision.revisionNumber}
                          </span>
                          {getStatusBadge(exam.latestRevision.lifecycleState)}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No Revisions</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {exam.revisionCount}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/admin/examinations/${exam.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] hover:bg-teal-50 dark:hover:bg-teal-950/30"
                        >
                          Open Family <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {pagination.totalItems}
              </span>{" "}
              examinations
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-background border border-border text-foreground text-xs rounded-md px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="h-8 text-xs px-2.5"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="font-medium px-1">
                  Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="h-8 text-xs px-2.5"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Examination Family Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Examination Family</DialogTitle>
            <DialogDescription>
              Create an authoritative examination family with its foundational revision (Revision 1).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="examPathway">Pathway *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formPathway === "rn" ? "default" : "outline"}
                  onClick={() => setFormPathway("rn")}
                  className={formPathway === "rn" ? "bg-[#0D9488] hover:bg-[#0F766E]" : ""}
                >
                  NCLEX-RN
                </Button>
                <Button
                  type="button"
                  variant={formPathway === "pn" ? "default" : "outline"}
                  onClick={() => setFormPathway("pn")}
                  className={formPathway === "pn" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                >
                  NCLEX-PN
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="examTitle">Examination Title *</Label>
              <Input
                id="examTitle"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. NCLEX-RN Comprehensive Readiness Exam"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="examDescription">Description</Label>
              <textarea
                id="examDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief administrative description of this examination family..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="examTime">Time Limit (mins)</Label>
                <Input
                  id="examTime"
                  type="number"
                  min={0}
                  max={720}
                  value={formTimeLimit}
                  onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="examPass">Passing Standard (%)</Label>
                <Input
                  id="examPass"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formPassingScore}
                  onChange={(e) => setFormPassingScore(Number(e.target.value))}
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
              disabled={createMutation.isPending || !formTitle.trim()}
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

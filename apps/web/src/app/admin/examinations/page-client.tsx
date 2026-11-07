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
  FileSpreadsheet,
  Activity,
  GraduationCap,
} from "lucide-react";
import { StandaloneTestsWorkspace } from "@/components/admin/exam-management/standalone-tests-workspace";
import { RatsManagementWorkspace } from "@/components/admin/exam-management/rats-management-workspace";
import { PracticeExamsWorkspace } from "@/components/admin/exam-management/practice-exams-workspace";
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

/**
 * Error carrying the HTTP status so the catalogue UI can distinguish an
 * authentication failure (401) from an authorization failure (403) from a
 * server fault, instead of collapsing every failure into one generic retry
 * state.
 */
export class ExaminationLibraryError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ExaminationLibraryError";
    this.status = status;
  }
}

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

export function parseLibraryQueryParams(searchParams: URLSearchParams | { get: (key: string) => string | null }) {
  const ALLOWED_PATHWAYS = new Set(["all", "rn", "pn"]);
  const ALLOWED_STATUSES = new Set(["all", "draft", "inreview", "approved", "published", "archived", "retired"]);
  const ALLOWED_SORT_BY = new Set(["code", "title", "pathway", "revisions", "createdat", "updatedat"]);
  const ALLOWED_SORT_DIR = new Set(["asc", "desc"]);

  const rawPathway = (searchParams.get("pathway") || "all").toLowerCase().trim();
  const pathway = ALLOWED_PATHWAYS.has(rawPathway) ? rawPathway : "all";

  const rawStatus = (searchParams.get("revisionStatus") || "all").trim();
  const matchedStatus = Array.from(ALLOWED_STATUSES).find(
    (s) => s.toLowerCase() === rawStatus.toLowerCase()
  );
  // Match original case if one of the known uppercase variants
  let revisionStatus = "all";
  if (matchedStatus) {
    if (matchedStatus === "draft") revisionStatus = "Draft";
    else if (matchedStatus === "inreview") revisionStatus = "InReview";
    else if (matchedStatus === "approved") revisionStatus = "Approved";
    else if (matchedStatus === "published") revisionStatus = "Published";
    else if (matchedStatus === "archived") revisionStatus = "Archived";
    else if (matchedStatus === "retired") revisionStatus = "Retired";
    else revisionStatus = "all";
  }

  const search = searchParams.get("search") || "";

  const rawSortBy = (searchParams.get("sortBy") || "code").toLowerCase().trim();
  const sortBy = ALLOWED_SORT_BY.has(rawSortBy) ? rawSortBy : "code";

  const rawSortDir = (searchParams.get("sortDirection") || "asc").toLowerCase().trim();
  const sortDirection: "asc" | "desc" = ALLOWED_SORT_DIR.has(rawSortDir) ? (rawSortDir as "asc" | "desc") : "asc";

  const rawPage = Number(searchParams.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawPageSize = Number(searchParams.get("pageSize"));
  const pageSize = Number.isInteger(rawPageSize) && rawPageSize > 0 && rawPageSize <= 100 ? rawPageSize : 20;

  return {
    pathway,
    revisionStatus,
    search,
    sortBy,
    sortDirection,
    page,
    pageSize,
  };
}

export function AdminExaminationsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // URL Query State initialization
  const initialParams = React.useMemo(() => parseLibraryQueryParams(searchParams), []);

  const [pathwayFilter, setPathwayFilter] = React.useState<string>(initialParams.pathway);
  const [revisionStatusFilter, setRevisionStatusFilter] = React.useState<string>(initialParams.revisionStatus);
  const [searchInput, setSearchInput] = React.useState<string>(initialParams.search);
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>(initialParams.search);
  const [sortBy, setSortBy] = React.useState<string>(initialParams.sortBy);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(initialParams.sortDirection);
  const [page, setPage] = React.useState<number>(initialParams.page);
  const [pageSize, setPageSize] = React.useState<number>(initialParams.pageSize);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [activeModule, setActiveModule] = React.useState<"library" | "standalone" | "rats" | "practice">("library");

  // Create Form State
  const [formPathway, setFormPathway] = React.useState<"rn" | "pn">("rn");
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formExamType, setFormExamType] = React.useState(0);
  const [formTimeLimit, setFormTimeLimit] = React.useState(60);
  const [formPassingScore, setFormPassingScore] = React.useState(75.0);

  const capabilities = getAdminCapabilities(user?.role);

  // Synchronize local state when searchParams changes (e.g. browser Back / Forward popstate navigation)
  const isNavigatingHistoryRef = React.useRef(false);
  const searchParamsString = searchParams.toString();

  React.useEffect(() => {
    const parsed = parseLibraryQueryParams(searchParams);

    isNavigatingHistoryRef.current = true;
    setPathwayFilter((prev) => (prev !== parsed.pathway ? parsed.pathway : prev));
    setRevisionStatusFilter((prev) => (prev !== parsed.revisionStatus ? parsed.revisionStatus : prev));
    setSortBy((prev) => (prev !== parsed.sortBy ? parsed.sortBy : prev));
    setSortDirection((prev) => (prev !== parsed.sortDirection ? parsed.sortDirection : prev));
    setPage((prev) => (prev !== parsed.page ? parsed.page : prev));
    setPageSize((prev) => (prev !== parsed.pageSize ? parsed.pageSize : prev));

    setSearchInput((prev) => (prev !== parsed.search ? parsed.search : prev));
    setDebouncedSearch((prev) => (prev !== parsed.search ? parsed.search : prev));
  }, [searchParamsString]);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== searchInput) {
          setPage(1); // Reset page on new search
          return searchInput;
        }
        return prev;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Synchronize URL query params on filter/page/sort/search change
  React.useEffect(() => {
    if (isNavigatingHistoryRef.current) {
      isNavigatingHistoryRef.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (pathwayFilter !== "all") params.set("pathway", pathwayFilter);
    if (revisionStatusFilter !== "all") params.set("revisionStatus", revisionStatusFilter);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (sortBy !== "code") params.set("sortBy", sortBy);
    if (sortDirection !== "asc") params.set("sortDirection", sortDirection);
    if (page > 1) params.set("page", page.toString());
    if (pageSize !== 20) params.set("pageSize", pageSize.toString());

    const qs = params.toString() ? `?${params.toString()}` : "";
    const currentQs = searchParams.toString() ? `?${searchParams.toString()}` : "";

    if (qs !== currentQs) {
      const urlHasDifferentSearch = (searchParams.get("search") || "") !== debouncedSearch.trim();
      const onlySearchChanged =
        urlHasDifferentSearch &&
        (searchParams.get("pathway") || "all") === pathwayFilter &&
        (searchParams.get("revisionStatus") || "all") === revisionStatusFilter &&
        (searchParams.get("sortBy") || "code") === sortBy &&
        (searchParams.get("sortDirection") || "asc") === sortDirection &&
        (Number(searchParams.get("page")) || 1) === page &&
        (Number(searchParams.get("pageSize")) || 20) === pageSize;

      if (onlySearchChanged) {
        router.replace(`/admin/examinations${qs}`, { scroll: false });
      } else {
        router.push(`/admin/examinations${qs}`, { scroll: false });
      }
    }
  }, [pathwayFilter, revisionStatusFilter, debouncedSearch, sortBy, sortDirection, page, pageSize, router, searchParams]);

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
        // Preserve the HTTP status: 401 (session expired) and 403 (insufficient
        // role) must not be presented to administrators as a generic transient
        // failure, and 401/403 must not trigger query retries (which would turn
        // an authentication failure into an unbounded refetch loop).
        if (res.status === 401) {
          throw new ExaminationLibraryError("Your session has expired. Please sign in again.", 401);
        }
        if (res.status === 403) {
          throw new ExaminationLibraryError(
            "Your account does not have permission to view the examination catalogue.",
            403
          );
        }
        throw new ExaminationLibraryError("Failed to load examination library catalogue", res.status);
      }
      return res.json();
    },
    enabled: isAuthenticated && capabilities.canViewExaminations,
    retry: (failureCount, error) =>
      error instanceof ExaminationLibraryError && (error.status === 401 || error.status === 403)
        ? false
        : failureCount < 1,
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

  const items: BackendExaminationLibraryItemDto[] = (libraryData?.items && libraryData.items.length > 0
    ? libraryData.items
    : ((libraryData as any)?.examinations as any[]) || []).map((exam: any) => ({
      id: exam.id,
      code: exam.code,
      title: exam.title,
      pathway: exam.pathway,
      createdAt: exam.createdAt,
      createdBy: exam.createdBy,
      currentRevisionId: exam.currentRevisionId,
      successorExaminationId: exam.successorExaminationId,
      revisionCount: exam.revisionCount ?? (exam.revisions?.length || 0),
      publishedRevision: exam.publishedRevision ?? (exam.currentRevision?.lifecycleState?.toLowerCase() === "published" ? exam.currentRevision : null),
      latestRevision: exam.latestRevision ?? exam.currentRevision ?? exam.revisions?.[0],
      currentRevision: exam.currentRevision,
    }));
  const pagination = libraryData?.pagination || { page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length > 0 ? 1 : 0 };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-[#142B4A] dark:text-white">
              Examinations
            </h1>
            <Badge variant="outline" className="text-xs uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
              Examination Library
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative examination library, lifecycle state querying, version lineage, and administrative governance.
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

      {/* Phase 2 Target Information Architecture: Three Primary Examination Management Modules */}
      <div className="space-y-3" data-testid="exam-management-primary-modules">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Primary Examination Management Modules
          </div>
          {activeModule !== "library" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveModule("library")}
              data-testid="return-to-library-btn"
              className="text-xs h-8"
            >
              View Full Examination Library
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Button 1: Create Custom Test (Stand Alone) */}
          <button
            type="button"
            onClick={() => setActiveModule("standalone")}
            data-testid="primary-module-standalone"
            className={`text-left rounded-xl border p-5 transition-all group ${
              activeModule === "standalone"
                ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-sm"
                : "border-slate-200 dark:border-slate-800 bg-card hover:border-indigo-500/40 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                Courses • Client Needs • Tests
              </Badge>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Create Custom Test (Stand Alone)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Manage Course/Subject & Client Needs classifications and assemble standalone custom tests from the Question Repository.
            </p>
          </button>

          {/* Button 2: RATS */}
          <button
            type="button"
            onClick={() => setActiveModule("rats")}
            data-testid="primary-module-rats"
            className={`text-left rounded-xl border p-5 transition-all group ${
              activeModule === "rats"
                ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm"
                : "border-slate-200 dark:border-slate-800 bg-card hover:border-amber-500/40 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Activity className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                Readiness Thresholds
              </Badge>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              RATS
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Manage Readiness Assessment Tests, readiness classification bands (Low, Borderline, High, Very High), and benchmarks.
            </p>
          </button>

          {/* Button 3: Practice Exams */}
          <button
            type="button"
            onClick={() => setActiveModule("practice")}
            data-testid="primary-module-practice"
            className={`text-left rounded-xl border p-5 transition-all group ${
              activeModule === "practice"
                ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/20 shadow-sm"
                : "border-slate-200 dark:border-slate-800 bg-card hover:border-teal-500/40 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-600 dark:text-teal-400">
                NCLEX-RN & NCLEX-PN
              </Badge>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Practice Exams
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              Manage structured NCLEX-RN and NCLEX-PN Practice Examinations, Traditional/NGN item mixes, duplication, and previews.
            </p>
          </button>
        </div>
      </div>

      {activeModule === "standalone" && (
        <StandaloneTestsWorkspace
          canModify={capabilities.canManageExaminations}
          onExamCatalogChanged={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] })
          }
        />
      )}

      {activeModule === "rats" && (
        <RatsManagementWorkspace
          canModify={capabilities.canManageExaminations}
          onExamCatalogChanged={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] })
          }
        />
      )}

      {activeModule === "practice" && (
        <PracticeExamsWorkspace
          canModify={capabilities.canManageExaminations}
          onExamCatalogChanged={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-examinations-library"] })
          }
        />
      )}

      {activeModule === "library" && (
        <>

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
          {libraryError instanceof ExaminationLibraryError && libraryError.status === 401 ? (
            <>
              <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                Your session has expired. Please sign in again to manage the examination catalogue.
              </p>
              <Link
                href="/sign-in"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Sign In Again
              </Link>
            </>
          ) : libraryError instanceof ExaminationLibraryError && libraryError.status === 403 ? (
            <>
              <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                Your account does not have permission to view the examination catalogue.
              </p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-2">
                Contact a super administrator if you believe this is an error.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                Failed to load examination library catalogue.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Retry
              </Button>
            </>
          )}
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
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
                        <div className="flex items-center justify-end gap-1.5">
                          {capabilities.canManageExaminations &&
                            exam.latestRevision?.lifecycleState?.toLowerCase() === "draft" && (
                              <Link
                                href={`/admin/examinations/${encodeURIComponent(exam.id)}/revisions/${encodeURIComponent(exam.latestRevision.id)}`}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs font-semibold text-amber-700 dark:text-amber-300 border-amber-300/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 h-8 px-2.5"
                                  title="Author active draft revision"
                                >
                                  Author Draft
                                </Button>
                              </Link>
                            )}
                          <Link href={`/admin/examinations/${encodeURIComponent(exam.id)}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] hover:bg-teal-50 dark:hover:bg-teal-950/30 h-8 px-2.5"
                            >
                              Open Family <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        </>
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

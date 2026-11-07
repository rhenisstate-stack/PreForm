"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FullPageFormLayout,
  FullPageDetailsLayout,
  FullPageDeleteLayout,
  FullPageActionBar,
} from "@/components/ui/full-page-crud";
import { notify } from "@/lib/notifications";

export interface CourseItem {
  id: string;
  code: string;
  programmeId: string;
  programmeName?: string;
  pathway: "rn" | "pn" | "both" | string;
  title: string;
  description: string;
  displayOrder: number;
  isPublished: boolean;
  isActive: boolean;
  subjectDomainCount?: number;
  questionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectDomainItem {
  id: string;
  code: string;
  courseId: string;
  courseTitle?: string;
  pathway: "rn" | "pn" | "both" | string;
  title: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  categoryCount?: number;
  questionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CourseSubjectManagementProps {
  canModify?: boolean;
  onCatalogChanged?: () => void;
  initialMode?: "list" | "create" | "details" | "edit" | "delete";
  initialEntityId?: string;
}

export function CourseSubjectManagement({
  canModify = true,
  onCatalogChanged,
  initialMode = "list",
  initialEntityId,
}: CourseSubjectManagementProps) {
  const [activeEntityTab, setActiveEntityTab] = useState<"courses" | "subjects">("courses");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectDomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!bannerMessage) return;
    if (bannerMessage.type === "success") {
      notify.success(bannerMessage.text);
    } else {
      notify.error(bannerMessage.text);
    }
  }, [bannerMessage]);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [pathwayFilter, setPathwayFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [parentCourseFilter, setParentCourseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"order" | "title" | "code" | "questions">("order");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Course Create/Edit Modal
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [coursePathway, setCoursePathway] = useState<"rn" | "pn" | "both">("rn");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseOrder, setCourseOrder] = useState(1);
  const [courseActive, setCourseActive] = useState(true);
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseFormError, setCourseFormError] = useState<string | null>(null);

  // Subject Create/Edit Modal
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDomainItem | null>(null);
  const [subjectCourseId, setSubjectCourseId] = useState("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectPathway, setSubjectPathway] = useState<"rn" | "pn" | "both">("rn");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [subjectOrder, setSubjectOrder] = useState(1);
  const [subjectActive, setSubjectActive] = useState(true);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectFormError, setSubjectFormError] = useState<string | null>(null);

  // Details Modal
  const [detailCourse, setDetailCourse] = useState<CourseItem | null>(null);
  const [detailSubject, setDetailSubject] = useState<SubjectDomainItem | null>(null);

  // Delete / Deactivate Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "course" | "subject";
    id: string;
    title: string;
    code: string;
    isActive: boolean;
    questionCount: number;
    childCount: number;
  } | null>(null);
  const [deleteConflictError, setDeleteConflictError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, subjectsRes] = await Promise.all([
        fetch("/api/admin/curriculum/courses"),
        fetch("/api/admin/curriculum/subject-domains"),
      ]);

      const coursesData = await coursesRes.json().catch(() => ({}));
      const subjectsData = await subjectsRes.json().catch(() => ({}));

      if (!coursesRes.ok) {
        throw new Error(coursesData.error || "Failed to load courses.");
      }
      if (!subjectsRes.ok) {
        throw new Error(subjectsData.error || "Failed to load subject domains.");
      }

      setCourses(Array.isArray(coursesData.courses) ? coursesData.courses : []);
      const rawSubjects = Array.isArray(subjectsData.subjectDomains)
        ? subjectsData.subjectDomains
        : Array.isArray(subjectsData.domains)
          ? subjectsData.domains
          : [];
      setSubjects(rawSubjects);
    } catch (err: any) {
      setError(err.message || "Failed to load Course/Subject classifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialMode === "create") {
      setCourseDialogOpen(true);
      return;
    }
    if (loading || !initialEntityId) return;
    const matchedCourse = courses.find((c) => c.id === initialEntityId);
    const matchedSubject = subjects.find((s) => s.id === initialEntityId);
    if (matchedCourse) {
      setActiveEntityTab("courses");
      if (initialMode === "details") setDetailCourse(matchedCourse);
      if (initialMode === "edit") {
        setEditingCourse(matchedCourse);
        setCourseTitle(matchedCourse.title);
        setCourseCode(matchedCourse.code || "");
        setCoursePathway(
          matchedCourse.pathway === "pn" || matchedCourse.pathway === "both"
            ? matchedCourse.pathway
            : "rn"
        );
        setCourseDescription(matchedCourse.description || "");
        setCourseOrder(matchedCourse.displayOrder ?? 1);
        setCourseActive(matchedCourse.isActive);
        setCourseDialogOpen(true);
      }
      if (initialMode === "delete") {
        setDeleteTarget({
          kind: "course",
          id: matchedCourse.id,
          title: matchedCourse.title,
          code: matchedCourse.code,
          isActive: matchedCourse.isActive,
          questionCount: matchedCourse.questionCount ?? 0,
          childCount: matchedCourse.subjectDomainCount ?? 0,
        });
      }
    } else if (matchedSubject) {
      setActiveEntityTab("subjects");
      if (initialMode === "details") setDetailSubject(matchedSubject);
      if (initialMode === "edit") {
        setEditingSubject(matchedSubject);
        setSubjectCourseId(matchedSubject.courseId);
        setSubjectTitle(matchedSubject.title);
        setSubjectCode(matchedSubject.code || "");
        setSubjectPathway(
          matchedSubject.pathway === "pn" || matchedSubject.pathway === "both"
            ? matchedSubject.pathway
            : "rn"
        );
        setSubjectDescription(matchedSubject.description || "");
        setSubjectOrder(matchedSubject.displayOrder ?? 1);
        setSubjectActive(matchedSubject.isActive);
        setSubjectDialogOpen(true);
      }
      if (initialMode === "delete") {
        setDeleteTarget({
          kind: "subject",
          id: matchedSubject.id,
          title: matchedSubject.title,
          code: matchedSubject.code,
          isActive: matchedSubject.isActive,
          questionCount: matchedSubject.questionCount ?? 0,
          childCount: matchedSubject.categoryCount ?? 0,
        });
      }
    }
  }, [initialMode, initialEntityId, loading, courses, subjects]);

  // Reset pagination on filter changes
  useEffect(() => {
    setPage(1);
  }, [activeEntityTab, searchQuery, pathwayFilter, statusFilter, parentCourseFilter, sortBy]);

  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        if (pathwayFilter !== "all" && c.pathway !== pathwayFilter && c.pathway !== "both") {
          return false;
        }
        if (statusFilter === "active" && !c.isActive) return false;
        if (statusFilter === "inactive" && c.isActive) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            c.title.toLowerCase().includes(q) ||
            (c.code || "").toLowerCase().includes(q) ||
            (c.description || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "code") return (a.code || "").localeCompare(b.code || "");
        if (sortBy === "questions") return (b.questionCount || 0) - (a.questionCount || 0);
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.title.localeCompare(b.title);
      });
  }, [courses, pathwayFilter, statusFilter, searchQuery, sortBy]);

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter((s) => {
        if (parentCourseFilter !== "all" && s.courseId !== parentCourseFilter) {
          return false;
        }
        if (pathwayFilter !== "all" && s.pathway !== pathwayFilter && s.pathway !== "both") {
          return false;
        }
        if (statusFilter === "active" && !s.isActive) return false;
        if (statusFilter === "inactive" && s.isActive) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            s.title.toLowerCase().includes(q) ||
            (s.code || "").toLowerCase().includes(q) ||
            (s.courseTitle || "").toLowerCase().includes(q) ||
            (s.description || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "code") return (a.code || "").localeCompare(b.code || "");
        if (sortBy === "questions") return (b.questionCount || 0) - (a.questionCount || 0);
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.title.localeCompare(b.title);
      });
  }, [subjects, parentCourseFilter, pathwayFilter, statusFilter, searchQuery, sortBy]);

  const activeItemsCount =
    activeEntityTab === "courses" ? filteredCourses.length : filteredSubjects.length;
  const totalPages = Math.max(1, Math.ceil(activeItemsCount / pageSize));
  const pagedCourses = filteredCourses.slice((page - 1) * pageSize, page * pageSize);
  const pagedSubjects = filteredSubjects.slice((page - 1) * pageSize, page * pageSize);

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseTitle("");
    setCourseCode("");
    setCoursePathway("rn");
    setCourseDescription("");
    setCourseOrder(courses.length + 1);
    setCourseActive(true);
    setCourseFormError(null);
    setCourseDialogOpen(true);
  };

  const openEditCourse = (c: CourseItem) => {
    setEditingCourse(c);
    setCourseTitle(c.title);
    setCourseCode(c.code || "");
    setCoursePathway(
      c.pathway === "pn" || c.pathway === "both" ? c.pathway : "rn"
    );
    setCourseDescription(c.description || "");
    setCourseOrder(c.displayOrder ?? 1);
    setCourseActive(c.isActive);
    setCourseFormError(null);
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      setCourseFormError("Course name is required.");
      return;
    }
    if (!courseCode.trim()) {
      setCourseFormError("Course code is required.");
      return;
    }

    setCourseSaving(true);
    setCourseFormError(null);
    try {
      const url = editingCourse
        ? `/api/admin/curriculum/courses/${editingCourse.id}`
        : "/api/admin/curriculum/courses";
      const method = editingCourse ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: courseTitle.trim(),
          code: courseCode.trim().toUpperCase(),
          pathway: coursePathway,
          programmeId: coursePathway === "pn" ? "pn" : "rn",
          description: courseDescription.trim(),
          displayOrder: Number(courseOrder) || 1,
          isPublished: true,
          isActive: courseActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.detail || "Failed to save course.");
      }

      setCourseDialogOpen(false);
      setBannerMessage({
        type: "success",
        text: editingCourse
          ? `Course "${courseTitle.trim()}" updated.`
          : `Course "${courseTitle.trim()}" created.`,
      });
      await loadData();
      onCatalogChanged?.();
    } catch (err: any) {
      setCourseFormError(err.message || "Failed to save course.");
    } finally {
      setCourseSaving(false);
    }
  };

  const openCreateSubject = (defaultCourseId?: string) => {
    setEditingSubject(null);
    const chosenCourseId = defaultCourseId || courses[0]?.id || "";
    const parentCourse = courses.find((c) => c.id === chosenCourseId);
    setSubjectCourseId(chosenCourseId);
    setSubjectTitle("");
    setSubjectCode("");
    setSubjectPathway(
      parentCourse?.pathway === "pn" || parentCourse?.pathway === "both"
        ? parentCourse.pathway
        : "rn"
    );
    setSubjectDescription("");
    setSubjectOrder(subjects.length + 1);
    setSubjectActive(true);
    setSubjectFormError(null);
    setSubjectDialogOpen(true);
  };

  const openEditSubject = (s: SubjectDomainItem) => {
    setEditingSubject(s);
    setSubjectCourseId(s.courseId);
    setSubjectTitle(s.title);
    setSubjectCode(s.code || "");
    setSubjectPathway(
      s.pathway === "pn" || s.pathway === "both" ? s.pathway : "rn"
    );
    setSubjectDescription(s.description || "");
    setSubjectOrder(s.displayOrder ?? 1);
    setSubjectActive(s.isActive);
    setSubjectFormError(null);
    setSubjectDialogOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectCourseId) {
      setSubjectFormError("Please select a parent course.");
      return;
    }
    if (!subjectTitle.trim()) {
      setSubjectFormError("Subject domain name is required.");
      return;
    }
    if (!subjectCode.trim()) {
      setSubjectFormError("Subject code is required.");
      return;
    }

    setSubjectSaving(true);
    setSubjectFormError(null);
    try {
      const url = editingSubject
        ? `/api/admin/curriculum/subject-domains/${editingSubject.id}`
        : "/api/admin/curriculum/subject-domains";
      const method = editingSubject ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: subjectCourseId,
          title: subjectTitle.trim(),
          code: subjectCode.trim().toUpperCase(),
          pathway: subjectPathway,
          description: subjectDescription.trim(),
          displayOrder: Number(subjectOrder) || 1,
          isActive: subjectActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.detail || "Failed to save subject domain.");
      }

      setSubjectDialogOpen(false);
      setBannerMessage({
        type: "success",
        text: editingSubject
          ? `Subject "${subjectTitle.trim()}" updated.`
          : `Subject "${subjectTitle.trim()}" created.`,
      });
      await loadData();
      onCatalogChanged?.();
    } catch (err: any) {
      setSubjectFormError(err.message || "Failed to save subject domain.");
    } finally {
      setSubjectSaving(false);
    }
  };

  const confirmDelete = (target: {
    kind: "course" | "subject";
    id: string;
    title: string;
    code: string;
    isActive: boolean;
    questionCount: number;
    childCount: number;
  }) => {
    setDeleteTarget(target);
    setDeleteConflictError(null);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteConflictError(null);
    try {
      const endpoint =
        deleteTarget.kind === "course"
          ? `/api/admin/curriculum/courses/${deleteTarget.id}`
          : `/api/admin/curriculum/subject-domains/${deleteTarget.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setDeleteConflictError(
          data.error ||
            data.detail ||
            `Cannot delete "${deleteTarget.title}" because dependent records reference it. You can safely deactivate it instead.`
        );
        return;
      }

      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.detail || "Deletion failed.");
      }

      setBannerMessage({
        type: "success",
        text: `${deleteTarget.kind === "course" ? "Course" : "Subject"} "${deleteTarget.title}" deleted.`,
      });
      setDeleteTarget(null);
      await loadData();
      onCatalogChanged?.();
    } catch (err: any) {
      setDeleteConflictError(err.message || "Deletion failed.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const endpoint =
        deleteTarget.kind === "course"
          ? `/api/admin/curriculum/courses/${deleteTarget.id}`
          : `/api/admin/curriculum/subject-domains/${deleteTarget.id}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Failed to deactivate record.");
      }

      setBannerMessage({
        type: "success",
        text: `${deleteTarget.kind === "course" ? "Course" : "Subject"} "${deleteTarget.title}" has been deactivated while preserving historical questions and exams.`,
      });
      setDeleteTarget(null);
      await loadData();
      onCatalogChanged?.();
    } catch (err: any) {
      setDeleteConflictError(err.message || "Failed to deactivate.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const renderPathwayBadge = (pathway: string) => {
    const p = (pathway || "rn").toLowerCase();
    if (p === "both") {
      return (
        <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25">
          NCLEX-RN & PN
        </Badge>
      );
    }
    if (p === "pn") {
      return (
        <Badge variant="outline" className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25">
          NCLEX-PN
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25">
        NCLEX-RN
      </Badge>
    );
  };

  return (
    <div className="w-full max-w-none min-w-0 space-y-6" data-testid="course-subject-management">
      {courseDialogOpen ? (
        <FullPageFormLayout
          data-testid="course-fullpage-form"
          eyebrow="Course / Subject Classification System"
          title={editingCourse ? `Edit Course: ${editingCourse.title}` : "Create Nursing Course"}
          description="Configure a nursing course classification for the centralized Question Repository and examination blueprints."
          breadcrumbs={[
            { label: "Exam Management", onClick: () => setCourseDialogOpen(false) },
            { label: "Courses & Subjects", onClick: () => setCourseDialogOpen(false) },
            { label: editingCourse ? "Edit Course" : "Create Course" },
          ]}
          backLabel="Back to Courses & Subjects"
          onBack={() => setCourseDialogOpen(false)}
        >
          <form onSubmit={handleSaveCourse} className="w-full max-w-none space-y-6">
            {courseFormError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
                {courseFormError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="course-code">Course Code *</Label>
                <Input
                  id="course-code"
                  placeholder="e.g., MED-SURG-RN"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-pathway">Programme / Pathway *</Label>
                <select
                  id="course-pathway"
                  value={coursePathway}
                  onChange={(e) => setCoursePathway(e.target.value as any)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                  <option value="both">Both (NCLEX-RN & NCLEX-PN)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-order">Display Order</Label>
                <Input
                  id="course-order"
                  type="number"
                  min={0}
                  value={courseOrder}
                  onChange={(e) => setCourseOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-title">Course Name *</Label>
              <Input
                id="course-title"
                placeholder="e.g., Adult Medical-Surgical Nursing"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-desc">Description</Label>
              <textarea
                id="course-desc"
                rows={4}
                placeholder="Clinical scope and learning objectives for this course..."
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="course-active"
                type="checkbox"
                checked={courseActive}
                onChange={(e) => setCourseActive(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="course-active" className="cursor-pointer">
                Active for new questions & tests
              </Label>
            </div>

            <FullPageActionBar
              onCancel={() => setCourseDialogOpen(false)}
              primaryAction={
                <Button
                  type="submit"
                  disabled={courseSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {courseSaving ? "Saving..." : editingCourse ? "Save Changes" : "Create Course"}
                </Button>
              }
            />
          </form>
        </FullPageFormLayout>
      ) : subjectDialogOpen ? (
        <FullPageFormLayout
          data-testid="subject-fullpage-form"
          eyebrow="Course / Subject Classification System"
          title={editingSubject ? `Edit Subject Domain: ${editingSubject.title}` : "Create Subject Domain"}
          description="Configure a subject domain under a nursing course for granular question and blueprint tagging."
          breadcrumbs={[
            { label: "Exam Management", onClick: () => setSubjectDialogOpen(false) },
            { label: "Courses & Subjects", onClick: () => setSubjectDialogOpen(false) },
            { label: editingSubject ? "Edit Subject Domain" : "Create Subject Domain" },
          ]}
          backLabel="Back to Courses & Subjects"
          onBack={() => setSubjectDialogOpen(false)}
        >
          <form onSubmit={handleSaveSubject} className="w-full max-w-none space-y-6">
            {subjectFormError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
                {subjectFormError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="subject-course">Parent Course *</Label>
                <select
                  id="subject-course"
                  value={subjectCourseId}
                  onChange={(e) => setSubjectCourseId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">Select a course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject-code">Subject Code *</Label>
                <Input
                  id="subject-code"
                  placeholder="e.g., CARDIO-01"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject-pathway">Programme / Pathway *</Label>
                <select
                  id="subject-pathway"
                  value={subjectPathway}
                  onChange={(e) => setSubjectPathway(e.target.value as any)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="rn">NCLEX-RN</option>
                  <option value="pn">NCLEX-PN</option>
                  <option value="both">Both (NCLEX-RN & NCLEX-PN)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="subject-title">Subject Domain Name *</Label>
                <Input
                  id="subject-title"
                  placeholder="e.g., Cardiovascular & Hemodynamic Disorders"
                  value={subjectTitle}
                  onChange={(e) => setSubjectTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject-order">Display Order</Label>
                <Input
                  id="subject-order"
                  type="number"
                  min={0}
                  value={subjectOrder}
                  onChange={(e) => setSubjectOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject-desc">Description</Label>
              <textarea
                id="subject-desc"
                rows={4}
                placeholder="Clinical topics covered under this subject domain..."
                value={subjectDescription}
                onChange={(e) => setSubjectDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="subject-active"
                type="checkbox"
                checked={subjectActive}
                onChange={(e) => setSubjectActive(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="subject-active" className="cursor-pointer">
                Active for new questions & tests
              </Label>
            </div>

            <FullPageActionBar
              onCancel={() => setSubjectDialogOpen(false)}
              primaryAction={
                <Button
                  type="submit"
                  disabled={subjectSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {subjectSaving
                    ? "Saving..."
                    : editingSubject
                      ? "Save Changes"
                      : "Create Subject Domain"}
                </Button>
              }
            />
          </form>
        </FullPageFormLayout>
      ) : detailCourse ? (
        <FullPageDetailsLayout
          data-testid="course-fullpage-details"
          eyebrow="Course Classification Details"
          title={detailCourse.title}
          description={`Course Code: ${detailCourse.code}`}
          badge={
            <div className="flex flex-wrap items-center gap-2">
              {renderPathwayBadge(detailCourse.pathway)}
              <Badge variant={detailCourse.isActive ? "default" : "secondary"}>
                {detailCourse.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          }
          breadcrumbs={[
            { label: "Exam Management", onClick: () => setDetailCourse(null) },
            { label: "Courses & Subjects", onClick: () => setDetailCourse(null) },
            { label: detailCourse.title },
          ]}
          backLabel="Back to Courses & Subjects"
          onBack={() => setDetailCourse(null)}
          actions={
            canModify ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const c = detailCourse;
                    setDetailCourse(null);
                    openEditCourse(c);
                  }}
                >
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  Edit Course
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const cId = detailCourse.id;
                    setDetailCourse(null);
                    openCreateSubject(cId);
                  }}
                  className="bg-indigo-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Subject Domain
                </Button>
              </div>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Course Metadata
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {detailCourse.description || "No description provided."}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Subject Domains</div>
                  <div className="font-bold text-foreground">
                    {detailCourse.subjectDomainCount ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Linked Questions</div>
                  <div className="font-bold text-foreground">
                    {detailCourse.questionCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Linked Subject Domains
                </h3>
                <Badge variant="outline">
                  {subjects.filter((s) => s.courseId === detailCourse.id).length} Domains
                </Badge>
              </div>
              <div className="space-y-2">
                {subjects
                  .filter((s) => s.courseId === detailCourse.id)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
                    >
                      <div>
                        <strong className="font-mono text-indigo-500">{s.code}</strong> —{" "}
                        <span className="font-semibold text-foreground">{s.title}</span>
                      </div>
                      <Badge variant="outline">{s.questionCount ?? 0} Qs</Badge>
                    </div>
                  ))}
                {subjects.filter((s) => s.courseId === detailCourse.id).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No subject domains assigned to this course yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </FullPageDetailsLayout>
      ) : detailSubject ? (
        <FullPageDetailsLayout
          data-testid="subject-fullpage-details"
          eyebrow="Subject Domain Details"
          title={detailSubject.title}
          description={`Subject Code: ${detailSubject.code} • Parent Course: ${detailSubject.courseTitle || "—"}`}
          badge={
            <div className="flex flex-wrap items-center gap-2">
              {renderPathwayBadge(detailSubject.pathway)}
              <Badge variant={detailSubject.isActive ? "default" : "secondary"}>
                {detailSubject.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          }
          breadcrumbs={[
            { label: "Exam Management", onClick: () => setDetailSubject(null) },
            { label: "Courses & Subjects", onClick: () => setDetailSubject(null) },
            { label: detailSubject.title },
          ]}
          backLabel="Back to Courses & Subjects"
          onBack={() => setDetailSubject(null)}
          actions={
            canModify ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const s = detailSubject;
                  setDetailSubject(null);
                  openEditSubject(s);
                }}
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                Edit Subject Domain
              </Button>
            ) : undefined
          }
        >
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Subject Domain Scope
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              {detailSubject.description || "No description provided."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Parent Course</div>
                <div className="font-semibold text-foreground">{detailSubject.courseTitle || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Linked Repository Questions</div>
                <div className="font-semibold text-foreground">{detailSubject.questionCount ?? 0} Qs</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Display Order</div>
                <div className="font-semibold text-foreground">#{detailSubject.displayOrder ?? 1}</div>
              </div>
            </div>
          </div>
        </FullPageDetailsLayout>
      ) : deleteTarget ? (
        <FullPageDeleteLayout
          data-testid="course-subject-fullpage-delete"
          title={`Delete ${deleteTarget.kind === "course" ? "Course" : "Subject Domain"}`}
          description={`Confirm removal or retirement of ${deleteTarget.title} (${deleteTarget.code}).`}
          recordTitle={deleteTarget.title}
          recordSubtitle={`Code: ${deleteTarget.code}`}
          recordMetadata={[
            {
              label: "Entity Type",
              value: deleteTarget.kind === "course" ? "Course" : "Subject Domain",
            },
            {
              label: "Linked Questions",
              value: `${deleteTarget.questionCount} repository question(s)`,
            },
            {
              label: "Child Classifications",
              value: `${deleteTarget.childCount} dependent record(s)`,
            },
            {
              label: "Current Status",
              value: deleteTarget.isActive ? "Active" : "Inactive",
            },
          ]}
          consequences={[
            "Permanent deletion removes this classification record if no dependent questions or child domains exist.",
            "If questions or historical exams reference this classification, hard deletion is blocked and you can safely deactivate it instead.",
          ]}
          dependencyNotice={
            (deleteTarget.questionCount > 0 ||
              deleteTarget.childCount > 0 ||
              deleteConflictError) && (
              <div className="space-y-1.5 text-amber-800 dark:text-amber-300">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Historical & Dependency Protection Active
                </div>
                <p>
                  {deleteConflictError ||
                    `This record is linked to ${deleteTarget.questionCount} repository question(s) and ${deleteTarget.childCount} child classification(s). Deactivating is recommended to preserve historical examination integrity.`}
                </p>
              </div>
            )
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirmDelete={handleExecuteDelete}
          confirmDeleteLabel={deleteSubmitting ? "Processing..." : "Delete Permanently"}
          onArchiveInstead={deleteTarget.isActive ? handleDeactivateInstead : undefined}
          archiveInsteadLabel="Deactivate Instead"
          isSubmitting={deleteSubmitting}
        />
      ) : (
        <>
      {/* Header & Entity Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            Classification System 1
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Course & Subject Domain Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage nursing courses and clinical subject domains linked to the centralized Question Repository.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveEntityTab("courses")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeEntityTab === "courses"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Courses ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveEntityTab("subjects")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeEntityTab === "subjects"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Subject Domains ({subjects.length})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canModify && (
            <>
              <Button
                size="sm"
                onClick={openCreateCourse}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
              >
                <Plus className="w-4 h-4" />
                New Course
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openCreateSubject()}
                disabled={courses.length === 0}
                className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1.5"
              >
                <Layers className="w-4 h-4" />
                New Subject Domain
              </Button>
            </>
          )}
        </div>
      </div>

      {bannerMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-sm ${
            bannerMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-card border border-border rounded-xl p-4">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={
              activeEntityTab === "courses"
                ? "Search courses by name, code, or description..."
                : "Search subjects by name, code, or parent course..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div>
          <select
            aria-label="Filter by Pathway"
            value={pathwayFilter}
            onChange={(e) => setPathwayFilter(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
          >
            <option value="all">All Programmes (RN & PN)</option>
            <option value="rn">NCLEX-RN</option>
            <option value="pn">NCLEX-PN</option>
            <option value="both">Both Programmes</option>
          </select>
        </div>

        {activeEntityTab === "subjects" ? (
          <div>
            <select
              aria-label="Filter by Parent Course"
              value={parentCourseFilter}
              onChange={(e) => setParentCourseFilter(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
            >
              <option value="all">All Parent Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <select
              aria-label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        )}

        <div>
          <select
            aria-label="Sort Classification Records"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
          >
            <option value="order">Sort by Display Order</option>
            <option value="title">Sort by Name (A–Z)</option>
            <option value="code">Sort by Code</option>
            <option value="questions">Sort by Question Count</option>
          </select>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-sm">Loading Course & Subject classifications...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>
              Retry
            </Button>
          </div>
        ) : activeEntityTab === "courses" ? (
          pagedCourses.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No courses found</p>
                <p className="text-xs text-muted-foreground">
                  Create a nursing course to organize subject domains and examination blueprints.
                </p>
              </div>
              {canModify && (
                <Button size="sm" onClick={openCreateCourse} className="bg-indigo-600 text-white">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create First Course
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Course Name</th>
                    <th className="py-3 px-4">Pathway</th>
                    <th className="py-3 px-4">Subjects</th>
                    <th className="py-3 px-4">Questions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {pagedCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {course.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{course.title}</div>
                        {course.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                            {course.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{renderPathwayBadge(course.pathway)}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {course.subjectDomainCount ?? 0} domains
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {course.questionCount ?? 0} Qs
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {course.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailCourse(course)}
                            title="View Course Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canModify && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCreateSubject(course.id)}
                                title="Add Subject Domain to Course"
                              >
                                <Plus className="w-4 h-4 text-indigo-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditCourse(course)}
                                title="Edit Course"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  confirmDelete({
                                    kind: "course",
                                    id: course.id,
                                    title: course.title,
                                    code: course.code,
                                    isActive: course.isActive,
                                    questionCount: course.questionCount ?? 0,
                                    childCount: course.subjectDomainCount ?? 0,
                                  })
                                }
                                title="Delete or Deactivate Course"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : pagedSubjects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Layers className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">No subject domains found</p>
              <p className="text-xs text-muted-foreground">
                Add subject domains under your courses to classify questions and examination sections.
              </p>
            </div>
            {canModify && courses.length > 0 && (
              <Button size="sm" onClick={() => openCreateSubject()} className="bg-indigo-600 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Subject Domain
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Subject Domain</th>
                  <th className="py-3 px-4">Parent Course</th>
                  <th className="py-3 px-4">Pathway</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {pagedSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {subject.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{subject.title}</div>
                      {subject.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                          {subject.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {subject.courseTitle || "—"}
                    </td>
                    <td className="py-3.5 px-4">{renderPathwayBadge(subject.pathway)}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {subject.questionCount ?? 0} Qs
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {subject.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailSubject(subject)}
                          title="View Subject Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canModify && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditSubject(subject)}
                              title="Edit Subject Domain"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                confirmDelete({
                                  kind: "subject",
                                  id: subject.id,
                                  title: subject.title,
                                  code: subject.code,
                                  isActive: subject.isActive,
                                  questionCount: subject.questionCount ?? 0,
                                  childCount: subject.categoryCount ?? 0,
                                })
                              }
                              title="Delete or Deactivate Subject"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {activeItemsCount > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, activeItemsCount)} of {activeItemsCount}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

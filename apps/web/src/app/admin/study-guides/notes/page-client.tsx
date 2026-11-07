"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  Edit3,
  Eye,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
  Sparkles,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  BookOpen,
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
  AdminStudyNote,
  AdminNoteFilterParams,
} from "@/lib/admin-study-service";
import { toast } from "sonner";

export function AdminNotesClient() {
  const [notes, setNotes] = React.useState<AdminStudyNote[]>([]);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [page, setPage] = React.useState<number>(1);
  const [pageSize] = React.useState<number>(15);

  // Filters
  const [search, setSearch] = React.useState<string>("");
  const [programmeFilter, setProgrammeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedTag, setSelectedTag] = React.useState<string>("");

  // Editor Dialog State
  const [isEditorOpen, setIsEditorOpen] = React.useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editorTitle, setEditorTitle] = React.useState<string>("");
  const [editorProgramme, setEditorProgramme] = React.useState<"rn" | "pn" | "both">("rn");
  const [editorStatus, setEditorStatus] = React.useState<string>("Draft");
  const [editorClientNeed, setEditorClientNeed] = React.useState<string>("");
  const [editorTopicTitle, setEditorTopicTitle] = React.useState<string>("");
  const [editorTags, setEditorTags] = React.useState<string>("");
  const [editorContentText, setEditorContentText] = React.useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = React.useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Delete Dialog State
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  const fetchNotes = React.useCallback(async () => {
    try {
      setLoading(true);
      const params: AdminNoteFilterParams = {
        page,
        pageSize,
        search: search.trim() || undefined,
        programme: programmeFilter === "all" ? undefined : programmeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        tag: selectedTag.trim() || undefined,
      };
      const res = await adminStudyService.getNotes(params);
      setNotes(res.data);
      setTotalCount(res.total);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load study notes");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, programmeFilter, statusFilter, selectedTag]);

  React.useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Handle open editor for new or existing note
  const handleOpenEditor = (note?: AdminStudyNote) => {
    if (note) {
      setEditingNoteId(note.id);
      setEditorTitle(note.title);
      setEditorProgramme(note.programme);
      setEditorStatus(note.status);
      setEditorClientNeed(note.clientNeedId || "");
      setEditorTopicTitle(note.topicTitle || "");
      setEditorTags(note.tags.join(", "));
      setEditorContentText(note.contentPlainText || "");
    } else {
      setEditingNoteId(null);
      setEditorTitle("");
      setEditorProgramme("rn");
      setEditorStatus("Draft");
      setEditorClientNeed("");
      setEditorTopicTitle("");
      setEditorTags("");
      setEditorContentText("");
    }
    setIsPreviewMode(false);
    setIsFullScreen(false);
    setIsEditorOpen(true);
  };

  // Rich-text formatting helper
  const applyFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editorContentText.substring(start, end);
    const replacement = `${prefix}${selectedText || "text"}${suffix}`;
    const newContent =
      editorContentText.substring(0, start) +
      replacement +
      editorContentText.substring(end);
    setEditorContentText(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 4)
      );
    }, 10);
  };

  const wordCount = React.useMemo(() => {
    return editorContentText.trim() ? editorContentText.trim().split(/\s+/).length : 0;
  }, [editorContentText]);

  const characterCount = React.useMemo(() => {
    return editorContentText.length;
  }, [editorContentText]);

  // Save note handler
  const handleSaveNote = async (overrideStatus?: string) => {
    if (!editorTitle.trim()) {
      toast.error("Please enter a note title.");
      return;
    }

    try {
      setIsSaving(true);
      const tagsArray = editorTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const statusToSave = overrideStatus || editorStatus;

      const structuredJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: editorContentText }],
          },
        ],
      });

      if (editingNoteId) {
        await adminStudyService.updateNote(editingNoteId, {
          title: editorTitle.trim(),
          contentPlainText: editorContentText,
          contentJson: structuredJson,
          programme: editorProgramme,
          status: statusToSave,
          clientNeedId: editorClientNeed || null,
          topicTitle: editorTopicTitle || null,
          tags: tagsArray,
        });
        toast.success("Note updated successfully");
      } else {
        await adminStudyService.createNote({
          title: editorTitle.trim(),
          contentPlainText: editorContentText,
          contentJson: structuredJson,
          programme: editorProgramme,
          status: statusToSave,
          clientNeedId: editorClientNeed || null,
          topicTitle: editorTopicTitle || null,
          tags: tagsArray,
        });
        toast.success("Note created successfully");
      }

      setIsEditorOpen(false);
      fetchNotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  // Actions
  const handleDuplicate = async (id: string) => {
    try {
      await adminStudyService.duplicateNote(id);
      toast.success("Note duplicated successfully");
      fetchNotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate note");
    }
  };

  const handleArchiveToggle = async (note: AdminStudyNote) => {
    try {
      await adminStudyService.archiveNote(note.id, !note.isArchived);
      toast.success(note.isArchived ? "Note restored" : "Note archived");
      fetchNotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update archive status");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await adminStudyService.publishNote(id);
      toast.success("Note published successfully to Learner Study Studio");
      fetchNotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish note");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await adminStudyService.deleteNote(deleteId);
      toast.success("Note deleted successfully");
      setDeleteId(null);
      fetchNotes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string, isArchived: boolean) => {
    if (isArchived) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Archived</Badge>;
    }
    switch (status.toLowerCase()) {
      case "published":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Published</Badge>;
      case "approved":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Approved</Badge>;
      case "pendingreview":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">Pending Review</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Study Notes Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Author, categorize, review, and publish authoritative NCLEX clinical study notes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenEditor()}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes by title, topic, or content..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div>
          <select
            value={programmeFilter}
            onChange={(e) => {
              setProgrammeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Programmes (RN & PN)</option>
            <option value="rn">NCLEX-RN Only</option>
            <option value="pn">NCLEX-PN Only</option>
            <option value="both">RN & PN Applicable</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="PendingReview">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        <div>
          <Input
            placeholder="Filter by tag..."
            value={selectedTag}
            onChange={(e) => {
              setSelectedTag(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Notes Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title & Details</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Word Count</th>
                <th className="px-4 py-3">Last Edited</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading notes...
                    </div>
                  </td>
                </tr>
              ) : notes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No study notes match the selected criteria.
                  </td>
                </tr>
              ) : (
                notes.map((note) => (
                  <tr key={note.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-foreground truncate">{note.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {note.topicTitle && (
                          <span className="font-medium text-primary">{note.topicTitle}</span>
                        )}
                        {note.tags.length > 0 && (
                          <span className="truncate">
                            {note.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize text-xs font-mono">
                        {note.programme.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(note.status, note.isArchived)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {note.authorName || note.authorEmail || "Admin"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {note.wordCount} words
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(note.lastEditedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditor(note)}
                          title="Edit Note"
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(note.id)}
                          title="Duplicate Note"
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {note.status !== "Published" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(note.id)}
                            title="Publish Note"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveToggle(note)}
                          title={note.isArchived ? "Restore Note" : "Archive Note"}
                          className="h-8 w-8 p-0 text-amber-600"
                        >
                          {note.isArchived ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(note.id)}
                          title="Delete Note"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
            Showing {notes.length} of {totalCount} total notes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs"
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * pageSize >= totalCount}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Comprehensive Rich-Text Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent
          className={`sm:max-w-4xl p-0 gap-0 overflow-hidden flex flex-col ${
            isFullScreen ? "fixed inset-0 sm:max-w-none h-screen rounded-none z-50" : "max-h-[90vh]"
          }`}
        >
          {/* Editor Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {editingNoteId ? "Edit Study Note" : "Create Official Study Note"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Rich clinical content editor with NCLEX taxonomy mapping and instant preview.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="h-8 gap-1 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                {isPreviewMode ? "Edit Mode" : "Preview"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="h-8 w-8 p-0"
              >
                {isFullScreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 border-b text-xs">
            <div className="sm:col-span-2">
              <label className="font-medium text-foreground block mb-1">Note Title *</label>
              <Input
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="e.g., Arterial Blood Gas (ABG) Interpretation & Compensation"
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Programme *</label>
              <select
                value={editorProgramme}
                onChange={(e) => setEditorProgramme(e.target.value as "rn" | "pn" | "both")}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
              >
                <option value="rn">NCLEX-RN</option>
                <option value="pn">NCLEX-PN</option>
                <option value="both">Both (RN & PN)</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Status</label>
              <select
                value={editorStatus}
                onChange={(e) => setEditorStatus(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
              >
                <option value="Draft">Draft</option>
                <option value="PendingReview">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published</option>
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Topic Title</label>
              <Input
                value={editorTopicTitle}
                onChange={(e) => setEditorTopicTitle(e.target.value)}
                placeholder="e.g. Acid-Base Imbalances"
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <label className="font-medium text-foreground block mb-1">Client Needs Category</label>
              <select
                value={editorClientNeed}
                onChange={(e) => setEditorClientNeed(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
              >
                <option value="">Select Category...</option>
                <option value="safe_effective_care">Safe and Effective Care Environment</option>
                <option value="health_promotion">Health Promotion and Maintenance</option>
                <option value="psychosocial">Psychosocial Integrity</option>
                <option value="physiological">Physiological Integrity</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="font-medium text-foreground block mb-1">Tags (comma separated)</label>
              <Input
                value={editorTags}
                onChange={(e) => setEditorTags(e.target.value)}
                placeholder="e.g. Respiratory, Lab Values, High Yield, ABG"
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Formatting Toolbar */}
          {!isPreviewMode && (
            <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/40 text-muted-foreground">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("**", "**")}
                title="Bold (Ctrl+B)"
                className="h-7 w-7 p-0"
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("*", "*")}
                title="Italic (Ctrl+I)"
                className="h-7 w-7 p-0"
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("<u>", "</u>")}
                title="Underline"
                className="h-7 w-7 p-0"
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("~~", "~~")}
                title="Strikethrough"
                className="h-7 w-7 p-0"
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("\n# ", "\n")}
                title="Heading 1"
                className="h-7 w-7 p-0"
              >
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("\n## ", "\n")}
                title="Heading 2"
                className="h-7 w-7 p-0"
              >
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("\n### ", "\n")}
                title="Heading 3"
                className="h-7 w-7 p-0"
              >
                <Heading3 className="h-3.5 w-3.5" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("\n- ")}
                title="Bulleted List"
                className="h-7 w-7 p-0"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("\n1. ")}
                title="Numbered List"
                className="h-7 w-7 p-0"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("\n- [ ] ")}
                title="Checklist"
                className="h-7 w-7 p-0"
              >
                <CheckSquare className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("\n> ")}
                title="Quote"
                className="h-7 w-7 p-0"
              >
                <Quote className="h-3.5 w-3.5" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyFormat("[", "](https://)")}
                title="Insert Hyperlink"
                className="h-7 w-7 p-0"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  applyFormat(
                    "\n| Parameter | Normal Range | Clinical Significance |\n|---|---|---|\n| pH | 7.35 - 7.45 | Acid-base balance |\n"
                  )
                }
                title="Insert Table"
                className="h-7 px-2 text-xs"
              >
                Table
              </Button>
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground pr-2 font-mono">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{characterCount} chars</span>
              </div>
            </div>
          )}

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
            {isPreviewMode ? (
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md border bg-card min-h-[300px] whitespace-pre-wrap font-sans">
                {editorContentText ? (
                  <div>{editorContentText}</div>
                ) : (
                  <p className="text-muted-foreground italic">No content to preview.</p>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={editorContentText}
                onChange={(e) => setEditorContentText(e.target.value)}
                placeholder="Write structured clinical study note content here (supports Markdown, tables, bullets, and clinical rationales)..."
                className="w-full h-full min-h-[320px] resize-none border-0 bg-transparent p-2 text-sm leading-relaxed focus:outline-none focus:ring-0 font-mono"
              />
            )}
          </div>

          {/* Editor Footer */}
          <div className="flex items-center justify-between border-t px-6 py-3 bg-card">
            <div className="text-xs text-muted-foreground">
              Current Status:{" "}
              <span className="font-semibold text-foreground">{editorStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditorOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveNote("Draft")}
                disabled={isSaving}
              >
                Save as Draft
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleSaveNote("Published")}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSaving ? "Saving..." : "Publish to Studio"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Study Note?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The study note will be permanently removed from PostgreSQL.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Archive,
  Bold,
  BookOpen,
  Check,
  CheckSquare,
  Code,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  MoreVertical,
  Palette,
  Pin,
  Plus,
  Quote,
  Redo,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Table as TableIcon,
  Tag,
  Trash2,
  Underline,
  Undo,
} from "lucide-react";
import { studyService, NoteItem, NoteFolder } from "@/lib/study-client-service";
import { aiStudyService, AISummaryResult, AIGeneratedFlashcard } from "@/lib/ai-study-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotesManagerProps {
  initialProgramme?: string;
}

export function NotesManager({ initialProgramme = "rn" }: NotesManagerProps) {
  // Navigation & filter state
  const [activeTab, setActiveTab] = React.useState<"all" | "favourites" | "pinned" | "archived" | "trash">("all");
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [programme, setProgramme] = React.useState<string>(initialProgramme);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [notes, setNotes] = React.useState<NoteItem[]>([]);
  const [folders, setFolders] = React.useState<NoteFolder[]>([]);
  const [selectedNote, setSelectedNote] = React.useState<NoteItem | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Editor state
  const [title, setTitle] = React.useState<string>("");
  const [contentHtml, setContentHtml] = React.useState<string>("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState<string>("");
  const [wordCount, setWordCount] = React.useState<number>(0);
  const [charCount, setCharCount] = React.useState<number>(0);
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "unsaved">("saved");
  const [isReadOnly, setIsReadOnly] = React.useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);

  // Modal states
  const [isNewFolderOpen, setIsNewFolderOpen] = React.useState<boolean>(false);
  const [newFolderName, setNewFolderName] = React.useState<string>("");
  const [isAIDialogOpen, setIsAIDialogOpen] = React.useState<boolean>(false);
  const [aiAction, setAIAction] = React.useState<"summary" | "flashcards" | "quiz">("summary");
  const [aiLoading, setAILoading] = React.useState<boolean>(false);
  const [aiSummaryResult, setAISummaryResult] = React.useState<AISummaryResult | null>(null);
  const [aiFlashcardsResult, setAIFlashcardsResult] = React.useState<AIGeneratedFlashcard[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState<boolean>(false);
  const [noteToDelete, setNoteToDelete] = React.useState<NoteItem | null>(null);

  const editorRef = React.useRef<HTMLDivElement>(null);
  const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch initial data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [foldersRes, notesRes] = await Promise.all([
        studyService.getFolders(programme),
        studyService.getNotes({
          programme: programme === "all" ? undefined : programme,
          folderId: selectedFolderId || undefined,
          isFavourite: activeTab === "favourites" ? true : undefined,
          isPinned: activeTab === "pinned" ? true : undefined,
          isArchived: activeTab === "archived",
          search: searchQuery || undefined,
        }),
      ]);

      setFolders(foldersRes.folders);
      const fetchedNotes = notesRes.result.items;
      setNotes(fetchedNotes);

      if (fetchedNotes.length > 0 && !selectedNote) {
        selectNote(fetchedNotes[0]);
      } else if (fetchedNotes.length === 0) {
        setSelectedNote(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }, [programme, selectedFolderId, activeTab, searchQuery]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selectNote = (note: NoteItem) => {
    setSelectedNote(note);
    setTitle(note.title);
    setTags(note.tags || []);
    setWordCount(note.wordCount || 0);
    setCharCount(note.characterCount || 0);

    let html = "<p>Start typing clinical notes...</p>";
    try {
      const parsed = JSON.parse(note.contentJson);
      html = parsed.html || parsed.contentPlainText || note.contentPlainText || html;
    } catch {
      html = note.contentPlainText || html;
    }
    setContentHtml(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setSaveStatus("saved");
  };

  const handleEditorInput = () => {
    if (!editorRef.current || isReadOnly) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || "";
    setContentHtml(html);

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);
    setSaveStatus("unsaved");

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveCurrentNote(html, text);
    }, 1500);
  };

  const saveCurrentNote = async (htmlToSave?: string, textToSave?: string) => {
    if (!selectedNote) return;
    try {
      setSaveStatus("saving");
      const currentHtml = htmlToSave ?? contentHtml;
      const currentText = textToSave ?? (editorRef.current?.innerText || "");

      const contentJson = JSON.stringify({
        schema: "prepford-note-v1",
        html: currentHtml,
        updatedAt: new Date().toISOString(),
      });

      const updated = await studyService.updateNote(selectedNote.id, {
        title,
        contentJson,
        contentPlainText: currentText,
        tags,
      });

      setSelectedNote(updated.note);
      setNotes((prev) => prev.map((n) => (n.id === updated.note.id ? updated.note : n)));
      setSaveStatus("saved");
    } catch (err: any) {
      setSaveStatus("unsaved");
      toast.error(err.message || "Autosave failed.");
    }
  };

  const handleCreateNewNote = async () => {
    try {
      const created = await studyService.createNote({
        title: "Untitled Clinical Note",
        contentJson: JSON.stringify({
          schema: "prepford-note-v1",
          html: "<p>Start writing your clinical observations, pharmacology notes, or triage guides...</p>",
        }),
        contentPlainText: "Start writing your clinical observations...",
        programme,
        folderId: selectedFolderId,
        tags: [],
      });

      toast.success("New note created.");
      setNotes((prev) => [created.note, ...prev]);
      selectNote(created.note);
    } catch (err: any) {
      toast.error(err.message || "Failed to create note.");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const created = await studyService.createFolder({
        name: newFolderName.trim(),
        programme,
      });
      toast.success(`Folder '${created.folder.name}' created.`);
      setFolders((prev) => [...prev, created.folder]);
      setNewFolderName("");
      setIsNewFolderOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder.");
    }
  };

  const handleTogglePin = async (note: NoteItem) => {
    try {
      const updated = await studyService.togglePinNote(note.id);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated.note : n)));
      if (selectedNote?.id === note.id) setSelectedNote(updated.note);
      toast.success(updated.note.isPinned ? "Note pinned to top." : "Note unpinned.");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle pin.");
    }
  };

  const handleToggleFavourite = async (note: NoteItem) => {
    try {
      const updated = await studyService.toggleFavouriteNote(note.id);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated.note : n)));
      if (selectedNote?.id === note.id) setSelectedNote(updated.note);
      toast.success(updated.note.isFavourite ? "Added to favourites." : "Removed from favourites.");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle favourite.");
    }
  };

  const handleDuplicate = async (note: NoteItem) => {
    try {
      const res = await studyService.duplicateNote(note.id);
      setNotes((prev) => [res.note, ...prev]);
      selectNote(res.note);
      toast.success("Note duplicated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate note.");
    }
  };

  const handleArchive = async (note: NoteItem) => {
    try {
      await studyService.archiveNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (selectedNote?.id === note.id) setSelectedNote(null);
      toast.success("Note archived.");
    } catch (err: any) {
      toast.error(err.message || "Failed to archive note.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      await studyService.deleteNote(noteToDelete.id);
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
      if (selectedNote?.id === noteToDelete.id) setSelectedNote(null);
      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
      toast.success("Note moved to trash.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note.");
    }
  };

  // Editor formatting commands
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    if (isReadOnly) return;
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const insertTable = () => {
    if (isReadOnly) return;
    const tableHtml = `
      <table class="w-full my-4 border-collapse border border-border text-sm">
        <thead>
          <tr class="bg-muted/50">
            <th class="border border-border p-2 text-left font-semibold">Clinical Concept</th>
            <th class="border border-border p-2 text-left font-semibold">Mechanism / Baseline</th>
            <th class="border border-border p-2 text-left font-semibold">Nursing Priority</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-border p-2">Concept 1</td>
            <td class="border border-border p-2">Details</td>
            <td class="border border-border p-2">Intervention</td>
          </tr>
        </tbody>
      </table>
    `;
    applyFormat("insertHTML", tableHtml);
  };

  const insertChecklist = () => {
    if (isReadOnly) return;
    const checklistHtml = `
      <ul class="my-3 space-y-1 list-none pl-2">
        <li class="flex items-center gap-2"><input type="checkbox" class="h-4 w-4 rounded text-teal-600" /> <span>Verify patient identity & allergy wristband</span></li>
        <li class="flex items-center gap-2"><input type="checkbox" class="h-4 w-4 rounded text-teal-600" /> <span>Assess pre-administration vitals</span></li>
      </ul>
    `;
    applyFormat("insertHTML", checklistHtml);
  };

  // AI Assistant Handlers
  const handleTriggerAI = async (action: "summary" | "flashcards" | "quiz") => {
    if (!selectedNote) return;
    const text = editorRef.current?.innerText || "";
    if (text.trim().length < 20) {
      toast.error("Please add more clinical content to the note before using AI assistance.");
      return;
    }

    setAIAction(action);
    setIsAIDialogOpen(true);
    setAILoading(true);
    setAISummaryResult(null);
    setAIFlashcardsResult([]);

    try {
      if (action === "summary") {
        const res = await aiStudyService.summarizeNote(text, "summarize");
        setAISummaryResult(res.result);
      } else if (action === "flashcards") {
        const res = await aiStudyService.generateFlashcards({
          topic: title,
          sourceText: text,
          programme,
          count: 5,
        });
        setAIFlashcardsResult(res.cards);
      }
    } catch (err: any) {
      toast.error(err.message || "AI Assistant temporarily unavailable.");
    } finally {
      setAILoading(false);
    }
  };

  const handleSaveAIFlashcardsToDeck = async () => {
    if (aiFlashcardsResult.length === 0) return;
    try {
      const deckRes = await studyService.createDeck({
        name: `Cards: ${title}`,
        description: `Generated from note: ${title}`,
        programme,
      });

      for (const c of aiFlashcardsResult) {
        await studyService.createCard(deckRes.deck.id, {
          front: c.front,
          back: c.back,
          explanation: c.explanation,
          difficulty: c.difficulty,
          cardStyle: c.cardStyle,
        });
      }

      toast.success(`Saved ${aiFlashcardsResult.length} flashcards to new deck.`);
      setIsAIDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save flashcards to deck.");
    }
  };

  const handleInsertSummaryIntoNote = () => {
    if (!aiSummaryResult || isReadOnly) return;
    const summaryHtml = `
      <div class="my-4 p-4 rounded-xl border border-teal-500/30 bg-teal-500/5">
        <h4 class="font-bold text-teal-800 dark:text-teal-300 text-sm mb-1">AI Clinical Summary</h4>
        <p class="text-xs text-muted-foreground mb-3">${aiSummaryResult.summary}</p>
        <h5 class="font-semibold text-xs text-foreground mb-1">Key Takeaways:</h5>
        <ul class="list-disc pl-4 text-xs space-y-0.5">
          ${aiSummaryResult.keyTakeaways.map((t) => `<li>${t}</li>`).join("")}
        </ul>
      </div>
    `;
    applyFormat("insertHTML", summaryHtml);
    setIsAIDialogOpen(false);
    toast.success("Summary inserted into note.");
  };

  return (
    <div
      data-testid="notes-manager-view"
      className={`flex flex-col lg:flex-row gap-6 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-6" : ""}`}
    >
      {/* ── Left Sidebar: Folders & Note List ── */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            <h2 className="font-serif font-bold text-lg text-foreground">Study Notes</h2>
          </div>
          <Button onClick={handleCreateNewNote} size="sm" className="gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </Button>
        </div>

        {/* Programme selector & Search */}
        <div className="space-y-2">
          <div className="flex rounded-lg bg-muted p-1 text-xs">
            {["rn", "pn", "all"].map((p) => (
              <button
                key={p}
                onClick={() => setProgramme(p)}
                className={`flex-1 py-1 text-center font-medium rounded-md capitalize transition-all ${
                  programme === p ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "all" ? "All Programs" : `NCLEX-${p.toUpperCase()}`}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clinical notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Navigation Filters */}
        <div className="flex flex-wrap gap-1 border-b border-border pb-2 text-xs">
          {[
            { id: "all", label: "All Notes", icon: FileText },
            { id: "favourites", label: "Favourites", icon: Star },
            { id: "pinned", label: "Pinned", icon: Pin },
            { id: "archived", label: "Archive", icon: Archive },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id && !selectedFolderId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSelectedFolderId(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  active ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Folders List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mb-1">
            <span className="font-semibold uppercase tracking-wider">Folders</span>
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setSelectedFolderId(f.id);
                setActiveTab("all");
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                selectedFolderId === f.id
                  ? "bg-teal-500/15 text-teal-800 dark:text-teal-200 font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Folder className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                <span className="truncate">{f.name}</span>
              </span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {f.noteCount}
              </Badge>
            </button>
          ))}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[500px] pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No notes found. Click "New Note" to create one.
            </div>
          ) : (
            notes.map((note) => {
              const selected = selectedNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selected
                      ? "border-teal-500/60 bg-teal-500/5 shadow-xs"
                      : "border-border/70 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="font-semibold text-xs text-foreground line-clamp-1">{note.title}</h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note);
                        }}
                        className={`p-0.5 rounded hover:bg-muted ${note.isPinned ? "text-amber-500" : "text-muted-foreground"}`}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavourite(note);
                        }}
                        className={`p-0.5 rounded hover:bg-muted ${note.isFavourite ? "text-amber-500" : "text-muted-foreground"}`}
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                    {note.contentPlainText || "No additional text content..."}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] uppercase px-1 py-0">
                      {note.programme}
                    </Badge>
                    <span>{new Date(note.lastEditedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Canvas: Rich Text Editor ── */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border bg-card shadow-xs min-h-[600px]">
        {selectedNote ? (
          <>
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-border bg-muted/20">
              <div className="flex items-center gap-1 flex-wrap">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("undo")} title="Undo">
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("redo")} title="Redo">
                  <Redo className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />

                {/* Headings */}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("formatBlock", "<h1>")} title="Heading 1">
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("formatBlock", "<h2>")} title="Heading 2">
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("formatBlock", "<h3>")} title="Heading 3">
                  <Heading3 className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />

                {/* Inline Formatting */}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("bold")} title="Bold">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("italic")} title="Italic">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("underline")} title="Underline">
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-amber-600"
                  onClick={() => applyFormat("hiliteColor", "#fef08a")}
                  title="Highlight"
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />

                {/* Lists & Tools */}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("insertUnorderedList")} title="Bullet List">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("insertOrderedList")} title="Numbered List">
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertChecklist} title="Clinical Checklist">
                  <CheckSquare className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertTable} title="Insert Table">
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat("formatBlock", "<blockquote>")} title="Quote">
                  <Quote className="h-4 w-4" />
                </Button>
              </div>

              {/* Action Buttons: AI & Note Options */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground mr-1 flex items-center gap-1">
                  {saveStatus === "saving" && <RefreshCw className="h-3 w-3 animate-spin text-teal-600" />}
                  {saveStatus === "saved" && <Check className="h-3 w-3 text-emerald-600" />}
                  <span className="capitalize">{saveStatus}</span>
                </span>

                {/* AI Assistant dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Assistant</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs">
                    <DropdownMenuItem onClick={() => handleTriggerAI("summary")} className="gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>Summarize & Takeaways</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTriggerAI("flashcards")} className="gap-2">
                      <Copy className="h-3.5 w-3.5 text-teal-600" />
                      <span>Convert Note to Flashcards</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleTriggerAI("summary")} className="gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                      <span>Simplify Explanations</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Note Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem onClick={() => handleTogglePin(selectedNote)} className="gap-2">
                      <Pin className="h-3.5 w-3.5" />
                      <span>{selectedNote.isPinned ? "Unpin Note" : "Pin Note"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleFavourite(selectedNote)} className="gap-2">
                      <Star className="h-3.5 w-3.5" />
                      <span>{selectedNote.isFavourite ? "Remove Favourite" : "Add to Favourites"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(selectedNote)} className="gap-2">
                      <Copy className="h-3.5 w-3.5" />
                      <span>Duplicate Note</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(selectedNote)} className="gap-2">
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive Note</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setNoteToDelete(selectedNote);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="gap-2 text-rose-600 dark:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Move to Trash</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Note Title & Meta */}
            <div className="p-6 pb-2 border-b border-border/50 space-y-3">
              <Input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus("unsaved");
                  if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                  autosaveTimerRef.current = setTimeout(() => saveCurrentNote(), 1500);
                }}
                placeholder="Note Title..."
                className="font-serif font-bold text-xl sm:text-2xl border-none shadow-none focus-visible:ring-0 p-0 h-auto"
              />

              {/* Tags bar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                {tags.map((t, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 text-[11px] font-normal">
                    <span>{t}</span>
                    <button
                      onClick={() => {
                        const newTags = tags.filter((_, i) => i !== idx);
                        setTags(newTags);
                        saveCurrentNote();
                      }}
                      className="hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                <input
                  type="text"
                  placeholder="+ tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      if (!tags.includes(tagInput.trim())) {
                        const nextTags = [...tags, tagInput.trim()];
                        setTags(nextTags);
                        setTagInput("");
                        saveCurrentNote();
                      }
                    }
                  }}
                  className="bg-transparent text-xs outline-none w-20"
                />
              </div>
            </div>

            {/* Editable Content Area */}
            <div
              ref={editorRef}
              contentEditable={!isReadOnly}
              onInput={handleEditorInput}
              data-testid="notes-editor-canvas"
              className="flex-1 p-6 outline-none text-foreground prose dark:prose-invert max-w-none min-h-[350px] leading-relaxed"
            />

            {/* Bottom Status Bar */}
            <div className="flex items-center justify-between px-6 py-2 border-t border-border/60 text-[11px] text-muted-foreground bg-muted/10">
              <div className="flex items-center gap-4">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
                <span className="capitalize">Program: {selectedNote.programme.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReadOnly(!isReadOnly)}
                  className="hover:text-foreground flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>{isReadOnly ? "Read-Only Mode" : "Editing Mode"}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="font-serif font-bold text-lg text-foreground mb-1">Select or Create a Note</h3>
            <p className="text-xs max-w-sm mb-4 leading-relaxed">
              Organize clinical pearls, pharmacologic drug classes, and triage priority notes with rich formatting and AI assistance.
            </p>
            <Button onClick={handleCreateNewNote} size="sm" className="gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4" />
              <span>Create New Note</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialog: Create Folder ── */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subject Folder</DialogTitle>
            <DialogDescription>Group clinical notes by body system, course, or subject domain.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="e.g. Cardiovascular Pharmacology"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} className="bg-teal-600 hover:bg-teal-700 text-white">
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: AI Assistant Preview ── */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
              <Sparkles className="h-5 w-5" />
              <span>AI Study Studio Assistant</span>
            </DialogTitle>
            <DialogDescription>
              Preview AI-generated clinical learning artifacts. Changes will never overwrite your note without explicit confirmation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {aiLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600" />
                <p>Analyzing clinical note and extracting high-yield takeaways...</p>
              </div>
            ) : aiAction === "summary" && aiSummaryResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                  <h4 className="font-bold text-foreground mb-1 text-sm">Summary</h4>
                  <p className="text-muted-foreground leading-relaxed">{aiSummaryResult.summary}</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                  <h4 className="font-bold text-foreground mb-2 text-sm">Key Clinical Takeaways</h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {aiSummaryResult.keyTakeaways.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>

                {Object.keys(aiSummaryResult.keyTerms || {}).length > 0 && (
                  <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                    <h4 className="font-bold text-foreground mb-2 text-sm">Medical Terminology</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(aiSummaryResult.keyTerms).map(([term, def], i) => (
                        <div key={i} className="p-2 rounded-lg bg-background border border-border/70">
                          <span className="font-semibold text-teal-700 dark:text-teal-300 block">{term}</span>
                          <span className="text-[11px] text-muted-foreground">{def}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : aiAction === "flashcards" && aiFlashcardsResult.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Generated {aiFlashcardsResult.length} high-yield flashcards from this note:
                </p>
                {aiFlashcardsResult.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border bg-card space-y-1.5 text-xs">
                    <div className="font-semibold text-foreground">Q: {c.front}</div>
                    <div className="text-teal-700 dark:text-teal-300">A: {c.back}</div>
                    <div className="text-[11px] text-muted-foreground italic">Why: {c.explanation}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No results generated. Try selecting a different section or expanding the note content.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
              Close
            </Button>
            {aiAction === "summary" && aiSummaryResult && (
              <Button onClick={handleInsertSummaryIntoNote} className="bg-teal-600 hover:bg-teal-700 text-white">
                Insert Summary into Note
              </Button>
            )}
            {aiAction === "flashcards" && aiFlashcardsResult.length > 0 && (
              <Button onClick={handleSaveAIFlashcardsToDeck} className="bg-teal-600 hover:bg-teal-700 text-white">
                Save {aiFlashcardsResult.length} Cards to New Deck
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Delete ── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Note to Trash?</DialogTitle>
            <DialogDescription>
              Are you sure you want to move "{noteToDelete?.title}" to trash? You can restore it later from the trash tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

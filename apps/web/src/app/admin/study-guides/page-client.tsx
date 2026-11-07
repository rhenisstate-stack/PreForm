"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Edit2,
  Folder,
  Globe,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  FileText,
  HelpCircle,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  adminStudyService,
  AdminCategory,
  AdminGuideSummary,
  AdminGuideDetail,
} from "@/lib/admin-study-service";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AdminStudyGuidesClient() {
  const [activeTab, setActiveTab] = React.useState<"guides" | "categories">("guides");
  const [categories, setCategories] = React.useState<AdminCategory[]>([]);
  const [guides, setGuides] = React.useState<AdminGuideSummary[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Category modal
  const [isCatModalOpen, setIsCatModalOpen] = React.useState<boolean>(false);
  const [catSlug, setCatSlug] = React.useState<string>("");
  const [catTitle, setCatTitle] = React.useState<string>("");
  const [catDesc, setCatDesc] = React.useState<string>("");
  const [editingCatId, setEditingCatId] = React.useState<string | null>(null);

  // Guide modal
  const [isGuideModalOpen, setIsGuideModalOpen] = React.useState<boolean>(false);
  const [guideCatId, setGuideCatId] = React.useState<string>("");
  const [guideSlug, setGuideSlug] = React.useState<string>("");
  const [guideTitle, setGuideTitle] = React.useState<string>("");
  const [guideSummary, setGuideSummary] = React.useState<string>("");
  const [guideProgramme, setGuideProgramme] = React.useState<string>("both");
  const [guideTakeaways, setGuideTakeaways] = React.useState<string>("");
  const [guideStatus, setGuideStatus] = React.useState<string>("Draft");
  const [editingGuideId, setEditingGuideId] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, guideRes] = await Promise.all([
        adminStudyService.getCategories(),
        adminStudyService.getGuides(),
      ]);
      setCategories(catRes.categories);
      setGuides(guideRes.guides);
      if (catRes.categories.length > 0 && !guideCatId) {
        setGuideCatId(catRes.categories[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load study guide data.");
    } finally {
      setLoading(false);
    }
  }, [guideCatId]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Category Actions
  const handleSaveCategory = async () => {
    if (!catTitle.trim() || !catSlug.trim()) {
      toast.error("Title and slug are required.");
      return;
    }
    try {
      if (editingCatId) {
        await adminStudyService.updateCategory(editingCatId, {
          title: catTitle.trim(),
          slug: catSlug.trim(),
          description: catDesc.trim(),
        });
        toast.success("Category updated.");
      } else {
        await adminStudyService.createCategory({
          title: catTitle.trim(),
          slug: catSlug.trim(),
          description: catDesc.trim(),
        });
        toast.success("Category created.");
      }
      setIsCatModalOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await adminStudyService.deleteCategory(id);
      toast.success("Category deleted.");
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category.");
    }
  };

  // Guide Actions
  const handleSaveGuide = async () => {
    if (!guideTitle.trim() || !guideSlug.trim() || !guideCatId) {
      toast.error("Category, title, and slug are required.");
      return;
    }

    const takeawaysList = guideTakeaways
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingGuideId) {
        await adminStudyService.updateGuide(editingGuideId, {
          categoryId: guideCatId,
          title: guideTitle.trim(),
          slug: guideSlug.trim(),
          summary: guideSummary.trim(),
          programme: guideProgramme,
          clinicalKeyTakeaways: takeawaysList,
          status: guideStatus,
        });
        toast.success("Guide updated.");
      } else {
        await adminStudyService.createGuide({
          categoryId: guideCatId,
          title: guideTitle.trim(),
          slug: guideSlug.trim(),
          summary: guideSummary.trim(),
          programme: guideProgramme,
          clinicalKeyTakeaways: takeawaysList,
          contentJson: "[]",
          status: guideStatus,
        });
        toast.success("Guide created.");
      }
      setIsGuideModalOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to save guide.");
    }
  };

  const handleTogglePublish = async (guide: AdminGuideSummary) => {
    try {
      if (guide.status === "Published") {
        await adminStudyService.updateGuide(guide.id, { status: "Draft" });
        toast.success("Guide reverted to draft.");
      } else {
        await adminStudyService.publishGuide(guide.id);
        toast.success("Guide published.");
      }
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status.");
    }
  };

  const handleDeleteGuide = async (id: string) => {
    if (!confirm("Are you sure you want to delete this study guide?")) return;
    try {
      await adminStudyService.deleteGuide(id);
      toast.success("Study guide deleted.");
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete guide.");
    }
  };

  return (
    <div data-testid="admin-study-guides-page" className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-600" />
            <h1 className="font-serif font-bold text-2xl text-foreground">Official Study Guide Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Author, categorize, version, and publish peer-reviewed NCLEX clinical study guides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("guides")}
              className={`px-3 py-1.5 font-medium rounded-md transition-all ${
                activeTab === "guides" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
              }`}
            >
              Study Guides ({guides.length})
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-3 py-1.5 font-medium rounded-md transition-all ${
                activeTab === "categories" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground"
              }`}
            >
              Categories ({categories.length})
            </button>
          </div>

          {activeTab === "guides" ? (
            <Button
              onClick={() => {
                setEditingGuideId(null);
                setGuideSlug("");
                setGuideTitle("");
                setGuideSummary("");
                setGuideTakeaways("");
                setGuideStatus("Draft");
                setIsGuideModalOpen(true);
              }}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>New Guide</span>
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingCatId(null);
                setCatSlug("");
                setCatTitle("");
                setCatDesc("");
                setIsCatModalOpen(true);
              }}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>New Category</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 4 Dedicated Administrative Workspaces Navigation Hub ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/study-guides/notes"
          className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <FileText className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-semibold text-sm text-foreground mt-3">Notes Workspace</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Rich-text editor, publication workflow, NCLEX Client Needs, and RN/PN scoping.
          </p>
        </Link>

        <Link
          href="/admin/study-guides/flashcards"
          className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-teal-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Layers className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-semibold text-sm text-foreground mt-3">Flashcards Workspace</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Deck & card authoring, card styles, card reordering, duplication, and transfers.
          </p>
        </Link>

        <Link
          href="/admin/study-guides/review-sessions"
          className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-blue-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <RotateCcw className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-semibold text-sm text-foreground mt-3">Review Sessions</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Global SM-2 settings, real-time retention analytics, and session audit logs.
          </p>
        </Link>

        <Link
          href="/admin/study-guides/topic-quizzes"
          className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-amber-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <HelpCircle className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-semibold text-sm text-foreground mt-3">Topic Quizzes</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Question bank assignment, AI draft generator, passing scores, and attempt analytics.
          </p>
        </Link>
      </div>

      {/* ── Content View ── */}
      {activeTab === "guides" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guides by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadAll} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Title & Summary</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Programme</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Updated</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading guides...
                    </td>
                  </tr>
                ) : guides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No study guides found. Click "New Guide" to author one.
                    </td>
                  </tr>
                ) : (
                  guides
                    .filter((g) => !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((g) => (
                      <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-medium text-foreground">
                          <div className="font-semibold">{g.title}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">{g.summary}</div>
                        </td>
                        <td className="p-3.5 text-muted-foreground">{g.categoryTitle}</td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {g.programme}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={`text-[10px] ${
                              g.status === "Published"
                                ? "bg-emerald-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {g.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {new Date(g.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(g)}
                            className="text-xs h-7"
                          >
                            {g.status === "Published" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingGuideId(g.id);
                              setGuideCatId(g.categoryId);
                              setGuideSlug(g.slug);
                              setGuideTitle(g.title);
                              setGuideSummary(g.summary);
                              setGuideProgramme(g.programme);
                              setGuideStatus(g.status);
                              setIsGuideModalOpen(true);
                            }}
                            className="h-7 w-7"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGuide(g.id)}
                            className="h-7 w-7 text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Categories Table */
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Category Name</th>
                <th className="p-3.5">Slug</th>
                <th className="p-3.5">Published Guides</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 font-semibold text-foreground flex items-center gap-2">
                    <Folder className="h-4 w-4 text-teal-600" />
                    <span>{c.title}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-muted-foreground">{c.slug}</td>
                  <td className="p-3.5 text-muted-foreground">{c.guideCount} guides</td>
                  <td className="p-3.5">
                    <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
                  </td>
                  <td className="p-3.5 text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingCatId(c.id);
                        setCatSlug(c.slug);
                        setCatTitle(c.title);
                        setCatDesc(c.description);
                        setIsCatModalOpen(true);
                      }}
                      className="h-7 w-7"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(c.id)}
                      className="h-7 w-7 text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: Category Edit ── */}
      <Dialog open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCatId ? "Edit Category" : "New Study Guide Category"}</DialogTitle>
            <DialogDescription>Taxonomy category for grouping clinical study guides.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Title</label>
              <Input
                placeholder="e.g. Cardiovascular & Hematology"
                value={catTitle}
                onChange={(e) => {
                  setCatTitle(e.target.value);
                  if (!editingCatId) {
                    setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Slug</label>
              <Input placeholder="cardiovascular-hematology" value={catSlug} onChange={(e) => setCatSlug(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Description</label>
              <Input placeholder="Core concepts and pharmacology for cardiac care" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} className="bg-teal-600 hover:bg-teal-700 text-white">Save Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Guide Edit ── */}
      <Dialog open={isGuideModalOpen} onOpenChange={setIsGuideModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuideId ? "Edit Study Guide" : "New Official Study Guide"}</DialogTitle>
            <DialogDescription>Author peer-reviewed clinical guide with key takeaways and alerts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Category</label>
              <select
                value={guideCatId}
                onChange={(e) => setGuideCatId(e.target.value)}
                className="w-full p-2 rounded-lg border border-border bg-background text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Title</label>
              <Input
                placeholder="e.g. Acute Coronary Syndromes & Nitrates"
                value={guideTitle}
                onChange={(e) => {
                  setGuideTitle(e.target.value);
                  if (!editingGuideId) {
                    setGuideSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Slug</label>
              <Input placeholder="acute-coronary-syndromes-nitrates" value={guideSlug} onChange={(e) => setGuideSlug(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Clinical Summary</label>
              <textarea
                rows={2}
                placeholder="Concise overview of physiological priority and nursing action..."
                value={guideSummary}
                onChange={(e) => setGuideSummary(e.target.value)}
                className="w-full p-2 rounded-lg border border-border bg-background text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Programme</label>
                <select
                  value={guideProgramme}
                  onChange={(e) => setGuideProgramme(e.target.value)}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs"
                >
                  <option value="both">Both (RN & PN)</option>
                  <option value="rn">NCLEX-RN Only</option>
                  <option value="pn">NCLEX-PN Only</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Status</label>
                <select
                  value={guideStatus}
                  onChange={(e) => setGuideStatus(e.target.value)}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Clinical Key Takeaways (one per line)</label>
              <textarea
                rows={4}
                placeholder="Hold nitroglycerin if systolic BP < 90 mmHg.&#10;Verify client has not taken PDE-5 inhibitors in last 24-48 hours.&#10;Obtain 12-lead ECG within 10 minutes of arrival."
                value={guideTakeaways}
                onChange={(e) => setGuideTakeaways(e.target.value)}
                className="w-full p-2 rounded-lg border border-border bg-background text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGuideModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGuide} className="bg-teal-600 hover:bg-teal-700 text-white">Save Guide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

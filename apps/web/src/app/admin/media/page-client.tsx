"use client";

import * as React from "react";
import {
  FolderOpen,
  Upload,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  HardDrive,
  Link2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  mediaService,
  MediaAsset,
  MAX_MEDIA_FILE_BYTES,
  ALLOWED_MEDIA_MIME_TYPES,
} from "@/lib/media-service";
import { toast } from "sonner";
import { MediaPicker } from "@/components/media/media-picker";

export function AdminMediaClient() {
  const [assets, setAssets] = React.useState<MediaAsset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  // Modals
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<MediaAsset | null>(null);
  const [deletingAsset, setDeletingAsset] = React.useState<MediaAsset | null>(null);

  // Edit form state
  const [editAltText, setEditAltText] = React.useState("");
  const [editCaption, setEditCaption] = React.useState("");
  const [editCategory, setEditCategory] = React.useState<MediaAsset["category"]>("general");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const fetchAssets = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await mediaService.getAssets({
        search,
        category: categoryFilter,
        pageSize: 100,
      });
      setAssets(res.assets);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load media assets";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  React.useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Metrics
  const totalAssets = assets.length;
  const totalSizeBytes = assets.reduce((sum, a) => sum + a.fileSizeBytes, 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
  const referencedCount = assets.filter((a) => a.referenceCount > 0).length;
  const unreferencedCount = totalAssets - referencedCount;

  const handleOpenEdit = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setEditAltText(asset.altText);
    setEditCaption(asset.caption || "");
    setEditCategory(asset.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    if (!editAltText.trim()) {
      toast.error("Alt text is required for WCAG accessibility compliance.");
      return;
    }

    setIsSavingEdit(true);
    try {
      await mediaService.updateMetadata(editingAsset.id, {
        altText: editAltText.trim(),
        caption: editCaption.trim() || undefined,
        category: editCategory,
      });
      toast.success("Media metadata updated successfully.");
      setEditingAsset(null);
      fetchAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update asset";
      toast.error(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAsset) return;
    try {
      const res = await mediaService.deleteAsset(deletingAsset.id);
      toast.success(res.message);
      setDeletingAsset(null);
      fetchAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete asset";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-teal-600" />
            Central Media & Asset Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centrally curate, audit, and organize exhibits, diagrams, and figures with referential integrity protection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Asset
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Media Assets
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalAssets}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600">
              <FolderOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Storage Consumed
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalSizeMB} MB</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <HardDrive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actively Referenced
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{referencedCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Link2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Unreferenced / Orphan
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{unreferencedCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and View Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/60">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search assets by name or alt text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Categories</option>
            <option value="question_exhibit">Question Exhibits</option>
            <option value="study_guide">Study Guides</option>
            <option value="blog">Blog Articles</option>
            <option value="video_thumbnail">Video Thumbnails</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="flex items-center gap-1 self-end sm:self-auto border rounded-md p-0.5 bg-muted/40">
          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Grid
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="w-3.5 h-3.5 mr-1" /> List
          </Button>
        </div>
      </div>

      {/* Asset Display */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading media assets...
        </div>
      ) : assets.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-lg border-border/70 p-8">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No media assets found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || categoryFilter !== "all"
              ? "No assets match your search criteria. Try resetting filters."
              : "No media assets have been uploaded yet. Upload your first clinical exhibit or guide illustration."}
          </p>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 bg-teal-600 hover:bg-teal-700 text-white"
            size="sm"
          >
            Upload Asset
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden border-border/60 hover:shadow-md transition-shadow">
              <div className="aspect-video bg-muted/70 relative overflow-hidden flex items-center justify-center border-b border-border/50">
                {asset.contentType.startsWith("image/") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={asset.url}
                    alt={asset.altText}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={asset.referenceCount > 0 ? "default" : "secondary"}
                    className="text-[10px] shadow-sm"
                  >
                    {asset.referenceCount > 0 ? `${asset.referenceCount} ref(s)` : "Orphan"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-foreground truncate" title={asset.fileName}>
                    {asset.fileName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={asset.altText}>
                    {asset.altText}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>{(asset.fileSizeBytes / 1024).toFixed(0)} KB</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                    {asset.category.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleOpenEdit(asset)}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => setDeletingAsset(asset)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">File Name & Alt Text</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">References</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/20">
                    <td className="py-2 px-4 w-16">
                      <div className="w-12 h-10 rounded bg-muted/70 overflow-hidden flex items-center justify-center border">
                        {asset.contentType.startsWith("image/") ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={asset.url}
                            alt={asset.altText}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <p className="font-semibold text-foreground text-xs">{asset.fileName}</p>
                      <p className="text-muted-foreground text-[11px] truncate max-w-md">{asset.altText}</p>
                    </td>
                    <td className="py-2 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {asset.category.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">
                      {(asset.fileSizeBytes / 1024).toFixed(0)} KB
                    </td>
                    <td className="py-2 px-4">
                      <Badge
                        variant={asset.referenceCount > 0 ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {asset.referenceCount} place(s)
                      </Badge>
                    </td>
                    <td className="py-2 px-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleOpenEdit(asset)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => setDeletingAsset(asset)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Media Picker / Upload Modal */}
      <MediaPicker
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSelect={(newAsset) => {
          fetchAssets();
          toast.success(`Asset "${newAsset.fileName}" uploaded to library.`);
        }}
      />

      {/* Edit Metadata Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Media Asset Metadata</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update WCAG alt text, caption, and category taxonomy for this media asset.
            </DialogDescription>
          </DialogHeader>

          {editingAsset && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border">
                <div className="w-16 h-12 rounded bg-background overflow-hidden border shrink-0">
                  {editingAsset.contentType.startsWith("image/") ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={editingAsset.url}
                      alt={editingAsset.altText}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-6 h-6 m-auto text-muted-foreground" />
                  )}
                </div>
                <div className="text-xs overflow-hidden">
                  <p className="font-semibold text-foreground truncate">{editingAsset.fileName}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {(editingAsset.fileSizeBytes / 1024).toFixed(1)} KB • {editingAsset.contentType}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-category" className="text-xs font-semibold">
                  Category
                </Label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as MediaAsset["category"])}
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="question_exhibit">Question Exhibit</option>
                  <option value="study_guide">Study Guide Resource</option>
                  <option value="blog">Blog Editorial Image</option>
                  <option value="video_thumbnail">Video Thumbnail</option>
                  <option value="general">General Asset</option>
                </select>
              </div>

              <div>
                <Label htmlFor="edit-alt" className="text-xs font-semibold">
                  Accessibility Alt Text <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-alt"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-caption" className="text-xs font-semibold">
                  Caption (Optional)
                </Label>
                <Input
                  id="edit-caption"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Usage references list */}
              <div>
                <Label className="text-xs font-semibold">Active Usages ({editingAsset.referenceCount})</Label>
                {editingAsset.usedIn.length > 0 ? (
                  <div className="mt-1 max-h-32 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20 text-xs">
                    {editingAsset.usedIn.map((use, idx) => (
                      <div key={idx} className="flex items-center justify-between text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {use.entityType}: {use.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">{use.entityId}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    This asset is not currently referenced by any live entity.
                  </p>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingAsset(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingEdit}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation & Referential Guard Dialog */}
      <Dialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-bold text-foreground">
                {deletingAsset && deletingAsset.referenceCount > 0
                  ? "Deletion Blocked: Active References Exist"
                  : "Delete Media Asset"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {deletingAsset && deletingAsset.referenceCount > 0 ? (
                <>
                  This media asset is actively referenced by{" "}
                  <strong className="text-foreground">{deletingAsset.referenceCount} entity(ies)</strong>. To prevent
                  broken links in learner exams or study materials, you must remove or replace these references
                  first:
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-foreground">{deletingAsset?.fileName}</strong>? This action cannot be
                  undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deletingAsset && deletingAsset.referenceCount > 0 && (
            <div className="space-y-1.5 border rounded-md p-2 bg-red-50 dark:bg-red-950/30 text-xs max-h-36 overflow-y-auto">
              {deletingAsset.usedIn.map((use, idx) => (
                <div key={idx} className="flex items-center justify-between text-red-900 dark:text-red-200">
                  <span>
                    • {use.entityType}: <em>{use.title}</em>
                  </span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setDeletingAsset(null)}>
              Cancel
            </Button>
            {deletingAsset && deletingAsset.referenceCount === 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
              >
                Permanently Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

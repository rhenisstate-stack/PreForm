"use client";

import * as React from "react";
import {
  Video,
  Plus,
  Search,
  Edit2,
  Trash2,
  Play,
  Clock,
  CheckCircle,
  Eye,
  ShieldCheck,
  Image as ImageIcon,
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
import { LearningVideo, videoService } from "@/lib/video-service";
import { MediaPicker } from "@/components/media/media-picker";
import { notify as toast } from "@/lib/notifications";

export function AdminVideosClient() {
  const [videos, setVideos] = React.useState<LearningVideo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [programmeFilter, setProgrammeFilter] = React.useState<string>("all");

  // Modals
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
  const [editingVideo, setEditingVideo] = React.useState<LearningVideo | null>(null);
  const [deletingVideo, setDeletingVideo] = React.useState<LearningVideo | null>(null);

  // Form State
  const [formData, setFormData] = React.useState<{
    title: string;
    slug: string;
    description: string;
    provider: LearningVideo["provider"];
    externalVideoId: string;
    durationMinutes: number;
    thumbnailUrl: string;
    category: LearningVideo["category"];
    programme: LearningVideo["programme"];
    requiredTier: LearningVideo["requiredTier"];
    isPublished: boolean;
    tags: string;
  }>({
    title: "",
    slug: "",
    description: "",
    provider: "youtube",
    externalVideoId: "",
    durationMinutes: 15,
    thumbnailUrl: "/images/blog/prepford-clinical-judgment-hero.jpg",
    category: "Clinical Judgment",
    programme: "both",
    requiredTier: "free",
    isPublished: true,
    tags: "NCLEX, Clinical Judgment",
  });

  const [isSaving, setIsSaving] = React.useState(false);

  const fetchVideos = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await videoService.getVideos({
        search,
        category: categoryFilter,
        programme: programmeFilter,
      });
      setVideos(res);
    } catch {
      toast.error("Failed to fetch clinical videos");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, programmeFilter]);

  React.useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Metrics
  const totalVideos = videos.length;
  const publishedCount = videos.filter((v) => v.isPublished).length;
  const totalMinutes = videos.reduce((sum, v) => sum + v.durationMinutes, 0);

  const handleOpenCreate = () => {
    setEditingVideo(null);
    setFormData({
      title: "",
      slug: "",
      description: "",
      provider: "youtube",
      externalVideoId: "",
      durationMinutes: 15,
      thumbnailUrl: "/images/blog/prepford-clinical-judgment-hero.jpg",
      category: "Clinical Judgment",
      programme: "both",
      requiredTier: "free",
      isPublished: true,
      tags: "NGN, NCLEX-RN, Nursing",
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (vid: LearningVideo) => {
    setEditingVideo(vid);
    setFormData({
      title: vid.title,
      slug: vid.slug,
      description: vid.description,
      provider: vid.provider,
      externalVideoId: vid.externalVideoId,
      durationMinutes: vid.durationMinutes,
      thumbnailUrl: vid.thumbnailUrl,
      category: vid.category,
      programme: vid.programme,
      requiredTier: vid.requiredTier,
      isPublished: vid.isPublished,
      tags: vid.tags.join(", "),
    });
    setIsEditorOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Video title is required.");
      return;
    }
    if (!formData.externalVideoId.trim()) {
      toast.error("External Video ID is required.");
      return;
    }

    setIsSaving(true);
    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingVideo) {
        await videoService.updateVideo(editingVideo.id, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          provider: formData.provider,
          externalVideoId: formData.externalVideoId.trim(),
          durationMinutes: formData.durationMinutes,
          thumbnailUrl: formData.thumbnailUrl,
          category: formData.category,
          programme: formData.programme,
          requiredTier: formData.requiredTier,
          isPublished: formData.isPublished,
          tags: tagsArray,
        });
        toast.success(`Video "${formData.title}" updated.`);
      } else {
        await videoService.createVideo({
          title: formData.title.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description.trim(),
          provider: formData.provider,
          externalVideoId: formData.externalVideoId.trim(),
          durationMinutes: formData.durationMinutes,
          thumbnailUrl: formData.thumbnailUrl,
          category: formData.category,
          programme: formData.programme,
          requiredTier: formData.requiredTier,
          isPublished: formData.isPublished,
          orderIndex: videos.length + 1,
          tags: tagsArray,
        });
        toast.success(`Video "${formData.title}" created.`);
      }

      setIsEditorOpen(false);
      fetchVideos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save video";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (vid: LearningVideo) => {
    try {
      await videoService.updateVideo(vid.id, { isPublished: !vid.isPublished });
      toast.success(
        !vid.isPublished ? `Published "${vid.title}".` : `Unpublished "${vid.title}".`
      );
      fetchVideos();
    } catch {
      toast.error("Failed to update video status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVideo) return;
    try {
      await videoService.deleteVideo(deletingVideo.id);
      toast.success(`Video "${deletingVideo.title}" deleted.`);
      setDeletingVideo(null);
      fetchVideos();
    } catch {
      toast.error("Failed to delete video");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-teal-600" />
            Clinical Video & Learning Media Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curate privacy-enhanced YouTube and Vimeo clinical lectures, playlists, and required subscription tier access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreate}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Video Lecture
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Video Lectures
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalVideos}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600">
              <Video className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Published & Active
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{publishedCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Curriculum Runtime
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {(totalMinutes / 60).toFixed(1)} Hours
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/60">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search lectures by title or tag..."
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
            <option value="all">All Topics</option>
            <option value="Clinical Judgment">Clinical Judgment</option>
            <option value="Pharmacology">Pharmacology</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Prioritization & Delegation">Prioritization & Delegation</option>
            <option value="Pediatrics">Pediatrics</option>
          </select>
          <select
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background hidden sm:block"
          >
            <option value="all">All Pathways (RN & PN)</option>
            <option value="rn">NCLEX-RN</option>
            <option value="pn">NCLEX-PN</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      {/* Videos Table */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading video curriculum...
        </div>
      ) : videos.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-lg border-border/70 p-8">
          <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No videos found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search query or topic filter.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Lecture</th>
                  <th className="py-3 px-4">Topic</th>
                  <th className="py-3 px-4">Pathway</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Tier Access</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {videos.map((vid) => (
                  <tr key={vid.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 max-w-md">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-10 rounded bg-muted overflow-hidden shrink-0 border relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={vid.thumbnailUrl}
                            alt={vid.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-foreground text-sm line-clamp-1">
                            {vid.title}
                          </p>
                          <p className="text-muted-foreground text-[11px] truncate mt-0.5">
                            {vid.provider.toUpperCase()} ID: {vid.externalVideoId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {vid.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                        {vid.programme}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {vid.durationMinutes} mins
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={vid.requiredTier === "free" ? "outline" : "default"}
                        className="text-[10px] uppercase"
                      >
                        {vid.requiredTier.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={vid.isPublished ? "default" : "outline"}
                        className={`text-[10px] ${
                          vid.isPublished ? "bg-emerald-600 text-white" : "text-muted-foreground"
                        }`}
                      >
                        {vid.isPublished ? "PUBLISHED" : "DRAFT"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleOpenEdit(vid)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-xs ${
                          vid.isPublished
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-emerald-600 hover:text-emerald-700"
                        }`}
                        onClick={() => handleTogglePublish(vid)}
                      >
                        {vid.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => setDeletingVideo(vid)}
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

      {/* Video Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingVideo ? "Edit Video Lecture" : "Add Clinical Video Lecture"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide privacy-enhanced video coordinates, duration, thumbnail, and curriculum parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="vid-title" className="text-xs font-semibold">
                Lecture Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vid-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Lethal Cardiac Dysrhythmias & ACLS"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="vid-desc" className="text-xs font-semibold">
                Clinical Description & Learning Objectives
              </Label>
              <textarea
                id="vid-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full mt-1 p-2.5 text-xs rounded-md border border-input bg-background"
                placeholder="Summarize the core clinical takeaways and assessment skills taught..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="vid-provider" className="text-xs font-semibold">
                  Provider
                </Label>
                <select
                  id="vid-provider"
                  value={formData.provider}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      provider: e.target.value as LearningVideo["provider"],
                    })
                  }
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="youtube">YouTube (Privacy-Enhanced)</option>
                  <option value="vimeo">Vimeo (DNT Mode)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="vid-extid" className="text-xs font-semibold">
                  External Video ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vid-extid"
                  value={formData.externalVideoId}
                  onChange={(e) => setFormData({ ...formData, externalVideoId: e.target.value })}
                  placeholder="e.g. dQw4w9WgXcQ"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="vid-duration" className="text-xs font-semibold">
                  Duration (Minutes)
                </Label>
                <Input
                  id="vid-duration"
                  type="number"
                  min={1}
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) || 1 })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Thumbnail Selection with MediaPicker */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Poster Thumbnail</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="h-7 text-xs flex items-center gap-1 text-teal-600 border-teal-600/40"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Select from Central Media Library
                </Button>
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-12 rounded bg-background border overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.thumbnailUrl}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Input
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="Thumbnail URL"
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="vid-category" className="text-xs font-semibold">
                  Topic Category
                </Label>
                <select
                  id="vid-category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as LearningVideo["category"],
                    })
                  }
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="Clinical Judgment">Clinical Judgment</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Prioritization & Delegation">Prioritization & Delegation</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Safety & Infection">Safety & Infection</option>
                </select>
              </div>

              <div>
                <Label htmlFor="vid-prog" className="text-xs font-semibold">
                  Pathway Alignment
                </Label>
                <select
                  id="vid-prog"
                  value={formData.programme}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      programme: e.target.value as LearningVideo["programme"],
                    })
                  }
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="both">Both (RN & PN)</option>
                  <option value="rn">NCLEX-RN Only</option>
                  <option value="pn">NCLEX-PN Only</option>
                </select>
              </div>

              <div>
                <Label htmlFor="vid-tier" className="text-xs font-semibold">
                  Required Tier
                </Label>
                <select
                  id="vid-tier"
                  value={formData.requiredTier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requiredTier: e.target.value as LearningVideo["requiredTier"],
                    })
                  }
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="free">Free Access</option>
                  <option value="1_month">1-Month Plan</option>
                  <option value="2_months">2-Month Plan</option>
                  <option value="3_months">3-Month Plan</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="vid-tags" className="text-xs font-semibold">
                Tags (comma-separated)
              </Label>
              <Input
                id="vid-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="ECG, Cardiology, ACLS, Emergency"
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSaving ? "Saving..." : editingVideo ? "Save Changes" : "Create Lecture"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Central Media Picker for Thumbnail */}
      <MediaPicker
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        category="video_thumbnail"
        title="Select Lecture Thumbnail from Library"
        onSelect={(asset) => {
          setFormData((prev) => ({
            ...prev,
            thumbnailUrl: asset.url,
          }));
          toast.success(`Selected "${asset.fileName}" as video thumbnail.`);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingVideo} onOpenChange={(open) => !open && setDeletingVideo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600">
              Delete Video Lecture
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{deletingVideo?.title}</strong>? This lecture will be removed from all candidate playlists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setDeletingVideo(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  Archive,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Check,
  Send,
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
import { blogService, AdminBlogPost } from "@/lib/blog-service";
import { MediaPicker } from "@/components/media/media-picker";
import { toast } from "sonner";

export function AdminBlogClient() {
  const [posts, setPosts] = React.useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // Modals
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<AdminBlogPost | null>(null);
  const [deletingPost, setDeletingPost] = React.useState<AdminBlogPost | null>(null);

  // Form State
  const [formData, setFormData] = React.useState<{
    title: string;
    slug: string;
    excerpt: string;
    category: AdminBlogPost["category"];
    authorName: string;
    authorRole: string;
    authorCredentials: string;
    readingTime: string;
    featuredImage: string;
    imageAlt: string;
    tags: string;
    lead: string;
    keyTakeaways: string;
    status: AdminBlogPost["status"];
    scheduledDate: string;
  }>({
    title: "",
    slug: "",
    excerpt: "",
    category: "Next Gen NCLEX",
    authorName: "PrepFord Nurse Educator Team",
    authorRole: "Clinical Testing Specialist",
    authorCredentials: "MSN, RN, CNE",
    readingTime: "8 min read",
    featuredImage: "/images/blog/prepford-ngn-article-hero.jpg",
    imageAlt: "Nursing education editorial hero image",
    tags: "NCLEX-RN, NGN, Clinical Judgment",
    lead: "",
    keyTakeaways: "Key takeaway 1\nKey takeaway 2\nKey takeaway 3",
    status: "draft",
    scheduledDate: "",
  });

  const [isSaving, setIsSaving] = React.useState(false);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogService.getPosts({
        search,
        status: statusFilter,
        category: categoryFilter,
        pageSize: 100,
      });
      setPosts(res.posts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load blog posts";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Metrics
  const totalArticles = posts.length;
  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;

  const handleOpenCreate = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      category: "Next Gen NCLEX",
      authorName: "PrepFord Nurse Educator Team",
      authorRole: "Clinical Testing Specialist",
      authorCredentials: "MSN, RN, CNE",
      readingTime: "7 min read",
      featuredImage: "/images/blog/prepford-ngn-article-hero.jpg",
      imageAlt: "Nursing editorial image",
      tags: "NCLEX-RN, Study Strategies",
      lead: "",
      keyTakeaways: "Understand clinical indications\nMaster priority interventions\nApply evidence-based rationales",
      status: "draft",
      scheduledDate: "",
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (post: AdminBlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      category: post.category,
      authorName: post.author.name,
      authorRole: post.author.role,
      authorCredentials: post.author.credentials,
      readingTime: post.readingTime,
      featuredImage: post.featuredImage,
      imageAlt: post.imageAlt,
      tags: post.tags.join(", "),
      lead: post.content.lead,
      keyTakeaways: post.content.keyTakeaways.join("\n"),
      status: post.status,
      scheduledDate: post.scheduledPublishDate || "",
    });
    setIsEditorOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Article title is required.");
      return;
    }
    if (!formData.excerpt.trim()) {
      toast.error("Article excerpt is required.");
      return;
    }

    setIsSaving(true);
    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const takeawaysArray = formData.keyTakeaways
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingPost) {
        await blogService.updatePost(editingPost.slug, {
          title: formData.title.trim(),
          excerpt: formData.excerpt.trim(),
          category: formData.category,
          author: {
            name: formData.authorName.trim(),
            role: formData.authorRole.trim(),
            credentials: formData.authorCredentials.trim(),
          },
          readingTime: formData.readingTime.trim(),
          featuredImage: formData.featuredImage,
          imageAlt: formData.imageAlt.trim(),
          tags: tagsArray,
          status: formData.status,
          scheduledPublishDate: formData.status === "scheduled" ? formData.scheduledDate : undefined,
          content: {
            ...editingPost.content,
            lead: formData.lead.trim(),
            keyTakeaways: takeawaysArray,
          },
        });
        toast.success(`Article "${formData.title}" updated.`);
      } else {
        await blogService.createPost({
          title: formData.title.trim(),
          slug: formData.slug.trim() || undefined,
          excerpt: formData.excerpt.trim(),
          category: formData.category,
          author: {
            name: formData.authorName.trim(),
            role: formData.authorRole.trim(),
            credentials: formData.authorCredentials.trim(),
          },
          publishedAt: new Date().toISOString().split("T")[0],
          readingTime: formData.readingTime.trim(),
          featuredImage: formData.featuredImage,
          imageAlt: formData.imageAlt.trim(),
          tags: tagsArray,
          status: formData.status,
          scheduledPublishDate: formData.status === "scheduled" ? formData.scheduledDate : undefined,
          content: {
            lead: formData.lead.trim() || formData.excerpt.trim(),
            keyTakeaways: takeawaysArray,
            sections: [
              {
                id: "overview",
                heading: "1. Overview & Clinical Rationale",
                body: [
                  "Entry-level nursing candidates must synthesize assessment findings and establish actionable clinical priorities.",
                  "Integrate pathophysiology with client safety standards to maximize patient outcomes.",
                ],
              },
            ],
          },
        });
        toast.success(`Article "${formData.title}" created.`);
      }

      setIsEditorOpen(false);
      fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save article";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (post: AdminBlogPost) => {
    try {
      const nextStatus = post.status === "published" ? "draft" : "published";
      await blogService.setPostStatus(post.slug, nextStatus);
      toast.success(
        nextStatus === "published"
          ? `Published "${post.title}".`
          : `Unpublished "${post.title}" to draft.`
      );
      fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update article status";
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPost) return;
    try {
      await blogService.deletePost(deletingPost.slug);
      toast.success(`Article "${deletingPost.title}" deleted.`);
      setDeletingPost(null);
      fetchPosts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete article";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-teal-600" />
            Blog & Editorial Publishing Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Author, review, schedule, and curate candidate nursing insights, clinical case studies, and NCLEX study guides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreate}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Article
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Articles
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalArticles}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Published Live
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
                Drafts
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{draftCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Scheduled Releases
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{scheduledCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
              <Calendar className="w-5 h-5" />
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
              placeholder="Search articles by title, author, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background hidden md:block"
          >
            <option value="all">All Categories</option>
            <option value="Next Gen NCLEX">Next Gen NCLEX</option>
            <option value="Clinical Judgment">Clinical Judgment</option>
            <option value="Pharmacology">Pharmacology</option>
            <option value="Study Strategies">Study Strategies</option>
            <option value="NCLEX-RN">NCLEX-RN</option>
            <option value="NCLEX-PN">NCLEX-PN</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading editorial articles...
        </div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-lg border-border/70 p-8">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No articles found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {posts.map((post) => (
                  <tr key={post.slug} className="hover:bg-muted/20">
                    <td className="py-3 px-4 max-w-md">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-10 rounded bg-muted overflow-hidden shrink-0 border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.featuredImage}
                            alt={post.imageAlt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-foreground text-sm line-clamp-1">
                            {post.title}
                          </p>
                          <p className="text-muted-foreground text-[11px] truncate mt-0.5">
                            /{post.slug} • {post.readingTime}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {post.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <p className="font-medium text-foreground">{post.author.name}</p>
                      <p className="text-[10px] text-muted-foreground">{post.author.credentials}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          post.status === "published"
                            ? "default"
                            : post.status === "scheduled"
                            ? "secondary"
                            : "outline"
                        }
                        className={`text-[10px] ${
                          post.status === "published"
                            ? "bg-emerald-600 text-white"
                            : post.status === "scheduled"
                            ? "bg-blue-600 text-white"
                            : "border-amber-500 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {post.status.toUpperCase()}
                      </Badge>
                      {post.status === "scheduled" && post.scheduledPublishDate && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {post.scheduledPublishDate}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {post.views?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="inline-flex items-center justify-center h-7 px-2 text-xs rounded-md border border-input bg-background hover:bg-muted"
                        title="View live article"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleOpenEdit(post)}
                        title="Edit article"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-xs ${
                          post.status === "published"
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-emerald-600 hover:text-emerald-700"
                        }`}
                        onClick={() => handleTogglePublish(post)}
                        title={post.status === "published" ? "Unpublish to draft" : "Publish live"}
                      >
                        {post.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => setDeletingPost(post)}
                        title="Delete article"
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

      {/* Article Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingPost ? "Edit Editorial Article" : "Create New Nursing Insight Article"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure editorial metadata, featured image, key takeaways, and publication status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="art-title" className="text-xs font-semibold">
                Article Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="art-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Understanding Next Gen NCLEX Case Studies"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="art-category" className="text-xs font-semibold">
                  Category
                </Label>
                <select
                  id="art-category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as AdminBlogPost["category"],
                    })
                  }
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="Next Gen NCLEX">Next Gen NCLEX</option>
                  <option value="Clinical Judgment">Clinical Judgment</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Study Strategies">Study Strategies</option>
                  <option value="NCLEX-RN">NCLEX-RN</option>
                  <option value="NCLEX-PN">NCLEX-PN</option>
                  <option value="Nursing Licensure">Nursing Licensure</option>
                  <option value="Nursing Education">Nursing Education</option>
                </select>
              </div>

              <div>
                <Label htmlFor="art-reading-time" className="text-xs font-semibold">
                  Estimated Reading Time
                </Label>
                <Input
                  id="art-reading-time"
                  value={formData.readingTime}
                  onChange={(e) => setFormData({ ...formData, readingTime: e.target.value })}
                  placeholder="e.g. 8 min read"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="art-excerpt" className="text-xs font-semibold">
                Summary / Excerpt <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="art-excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={2}
                className="w-full mt-1 p-2.5 text-xs rounded-md border border-input bg-background"
                placeholder="Brief summary displayed on cards and search snippets..."
                required
              />
            </div>

            {/* Featured Image & MediaPicker Integration */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Featured Hero Image</span>
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
                <div className="w-20 h-14 rounded bg-background border overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.featuredImage}
                    alt={formData.imageAlt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Input
                    placeholder="Image URL"
                    value={formData.featuredImage}
                    onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Accessibility Alt text (required for WCAG)"
                    value={formData.imageAlt}
                    onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Key Takeaways */}
            <div>
              <Label htmlFor="art-takeaways" className="text-xs font-semibold">
                Key Takeaways (one per line)
              </Label>
              <textarea
                id="art-takeaways"
                value={formData.keyTakeaways}
                onChange={(e) => setFormData({ ...formData, keyTakeaways: e.target.value })}
                rows={3}
                className="w-full mt-1 p-2.5 text-xs rounded-md border border-input bg-background"
                placeholder="Key clinical takeaway 1&#10;Key clinical takeaway 2&#10;Key clinical takeaway 3"
              />
            </div>

            {/* Status & Scheduling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label htmlFor="art-status" className="text-xs font-semibold">
                  Publishing Status
                </Label>
                <select
                  id="art-status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as AdminBlogPost["status"],
                    })
                  }
                  className="w-full h-9 px-3 mt-1 text-sm rounded-md border border-input bg-background"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Public)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {formData.status === "scheduled" && (
                <div>
                  <Label htmlFor="art-sched" className="text-xs font-semibold">
                    Scheduled Publish Date
                  </Label>
                  <Input
                    id="art-sched"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}
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
                {isSaving ? "Saving..." : editingPost ? "Save Changes" : "Create Article"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Central Media Picker for Hero Image */}
      <MediaPicker
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        category="blog"
        title="Select Featured Article Hero Image"
        onSelect={(asset) => {
          setFormData((prev) => ({
            ...prev,
            featuredImage: asset.url,
            imageAlt: asset.altText,
          }));
          toast.success(`Selected "${asset.fileName}" as featured image.`);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingPost} onOpenChange={(open) => !open && setDeletingPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600">
              Delete Article
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{deletingPost?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setDeletingPost(null)}>
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

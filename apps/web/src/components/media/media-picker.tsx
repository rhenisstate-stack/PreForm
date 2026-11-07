"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Check,
  Search,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
} from "lucide-react";
import {
  mediaService,
  MediaAsset,
  MAX_MEDIA_FILE_BYTES,
  ALLOWED_MEDIA_MIME_TYPES,
} from "@/lib/media-service";
import { toast } from "sonner";

export interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: MediaAsset) => void;
  category?: MediaAsset["category"];
  title?: string;
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  category: initialCategory,
  title = "Select Media Asset",
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = React.useState<"library" | "upload">("library");
  const [assets, setAssets] = React.useState<MediaAsset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>(initialCategory || "all");
  const [selectedAsset, setSelectedAsset] = React.useState<MediaAsset | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = React.useState<string | null>(null);
  const [uploadAltText, setUploadAltText] = React.useState("");
  const [uploadCaption, setUploadCaption] = React.useState("");
  const [uploadCategory, setUploadCategory] = React.useState<MediaAsset["category"]>(
    initialCategory || "general"
  );
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadAssets = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await mediaService.getAssets({
        search,
        category: selectedCategory,
        pageSize: 50,
      });
      setAssets(res.assets);
      if (selectedAsset && !res.assets.some((a) => a.id === selectedAsset.id)) {
        setSelectedAsset(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load assets";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedAsset]);

  React.useEffect(() => {
    if (open) {
      loadAssets();
    }
  }, [open, loadAssets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) {
      setUploadFile(null);
      setUploadPreview(null);
      return;
    }

    if (file.size > MAX_MEDIA_FILE_BYTES) {
      setUploadError(`File size ${(file.size / 1024 / 1024).toFixed(2)} MB exceeds the maximum 5 MB limit.`);
      return;
    }

    if (file.type && !ALLOWED_MEDIA_MIME_TYPES.includes(file.type)) {
      setUploadError(`Unsupported file format '${file.type}'. Allowed: PNG, JPEG, WebP, GIF, PDF.`);
      return;
    }

    setUploadFile(file);
    if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setUploadPreview(previewUrl);
    } else {
      setUploadPreview(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    if (!uploadAltText.trim()) {
      setUploadError("Alt text is required for clinical accessibility compliance (WCAG).");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const asset = await mediaService.uploadAsset({
        file: uploadFile,
        fileName: uploadFile.name,
        altText: uploadAltText.trim(),
        caption: uploadCaption.trim() || undefined,
        category: uploadCategory,
      });

      toast.success("Media asset uploaded successfully!");
      // Reset upload form
      setUploadFile(null);
      setUploadPreview(null);
      setUploadAltText("");
      setUploadCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Select new asset and return
      onSelect(asset);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload asset.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmSelect = () => {
    if (!selectedAsset) return;
    onSelect(selectedAsset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-teal-600" />
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Browse centralized media assets with WCAG-compliant alt text or upload new assets up to 5 MB.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 pt-2 border-b border-border/40 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "library"
                ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Media Library ({assets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "upload"
                ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Upload New Asset
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto py-3">
          {activeTab === "library" ? (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by file name, alt text, or caption..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
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

              {/* Grid / List */}
              {loading ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  Loading media library...
                </div>
              ) : assets.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed rounded-lg border-border/60">
                  <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium text-foreground">No media assets found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try modifying your search or upload a new asset.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {assets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <div
                        key={asset.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedAsset(asset)}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedAsset(asset)}
                        className={`group relative border rounded-lg p-2 flex flex-col cursor-pointer transition-all ${
                          isSelected
                            ? "border-teal-600 bg-teal-50/40 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                            : "border-border hover:border-border/80 bg-card"
                        }`}
                      >
                        <div className="aspect-video w-full rounded bg-muted/60 flex items-center justify-center overflow-hidden mb-2 relative">
                          {asset.contentType.startsWith("image/") ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={asset.url}
                              alt={asset.altText}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-teal-600 text-white rounded-full p-0.5 shadow-sm">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold truncate text-foreground" title={asset.fileName}>
                          {asset.fileName}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{(asset.fileSizeBytes / 1024).toFixed(0)} KB</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">
                            {asset.category.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected detail preview */}
              {selectedAsset && (
                <div className="border border-border/80 rounded-lg p-3 bg-muted/30 flex flex-col sm:flex-row gap-3 items-start">
                  <div className="w-24 h-16 rounded overflow-hidden bg-background shrink-0 border">
                    {selectedAsset.contentType.startsWith("image/") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedAsset.url}
                        alt={selectedAsset.altText}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-8 h-8 m-auto text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-xs space-y-1">
                    <p className="font-semibold text-foreground">{selectedAsset.fileName}</p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Alt text:</span> {selectedAsset.altText}
                    </p>
                    {selectedAsset.caption && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Caption:</span> {selectedAsset.caption}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Used in {selectedAsset.referenceCount} entity(ies) • SHA-256: {selectedAsset.sha256Hash.substring(0, 12)}...
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Upload tab */
            <form onSubmit={handleUploadSubmit} className="space-y-4 max-w-xl mx-auto">
              {uploadError && (
                <div className="flex items-start gap-2 p-3 text-xs bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drop area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-teal-500/80 rounded-lg p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {uploadPreview ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadPreview}
                      alt="Upload preview"
                      className="max-h-40 mx-auto rounded border object-contain"
                    />
                    <p className="text-xs text-muted-foreground">Click to replace file ({uploadFile?.name})</p>
                  </div>
                ) : uploadFile ? (
                  <div className="space-y-1">
                    <FileText className="w-10 h-10 mx-auto text-teal-600 mb-1" />
                    <p className="text-sm font-medium text-foreground">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-medium text-foreground">Click or drag file to upload</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG, WebP, GIF, or PDF (Max 5 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="upload-category" className="text-xs font-semibold">
                    Asset Category
                  </Label>
                  <select
                    id="upload-category"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as MediaAsset["category"])}
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
                  <Label htmlFor="upload-alt" className="text-xs font-semibold">
                    Accessibility Alt Text <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="upload-alt"
                    placeholder="Descriptive text for screen readers (e.g. Lead II ECG showing sinus rhythm)"
                    value={uploadAltText}
                    onChange={(e) => setUploadAltText(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Required for WCAG 2.1 AA clinical assessment compliance.
                  </p>
                </div>

                <div>
                  <Label htmlFor="upload-caption" className="text-xs font-semibold">
                    Caption (Optional)
                  </Label>
                  <Input
                    id="upload-caption"
                    placeholder="Figure 1.1 or source attribution..."
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isUploading ? "Uploading..." : "Upload & Select Asset"}
              </Button>
            </form>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/50 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {activeTab === "library" && selectedAsset && (
              <span className="flex items-center gap-1 text-teal-700 dark:text-teal-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready to insert: {selectedAsset.fileName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {activeTab === "library" && (
              <Button
                size="sm"
                disabled={!selectedAsset}
                onClick={handleConfirmSelect}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Insert Selected Asset
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

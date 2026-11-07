"use client";

import * as React from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const MAX_QUESTION_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes
export const MAX_QUESTION_IMAGE_MB = 5;
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"] as const;

export interface QuestionImageUploadProps {
  label?: string;
  fieldKey: string;
  questionId?: string;
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  testIdPrefix?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function QuestionImageUpload({
  label = "Clinical Image Exhibit",
  fieldKey,
  questionId,
  value,
  onChange,
  onRemove,
  disabled = false,
  className = "",
  testIdPrefix = "question-image-upload",
}: QuestionImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(value || null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<number | null>(null);
  const [imageLoadError, setImageLoadError] = React.useState(false);

  // Sync with incoming value when question loads or changes
  React.useEffect(() => {
    setPreviewUrl(value || null);
    setImageLoadError(false);
  }, [value]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_QUESTION_IMAGE_BYTES) {
      return `File size (${formatBytes(file.size)}) exceeds the maximum allowed limit of ${MAX_QUESTION_IMAGE_MB} MB (5,242,880 bytes).`;
    }

    const type = file.type?.toLowerCase();
    const name = file.name?.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => name?.endsWith(ext));
    const hasValidMime = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);

    if (!hasValidExtension && !hasValidMime) {
      return "Unsupported file format. Please upload a PNG, JPEG, WebP, or GIF image.";
    }

    return null;
  };

  const handleFileProcess = async (file: File) => {
    setUploadError(null);
    setImageLoadError(false);

    const validationMsg = validateFile(file);
    if (validationMsg) {
      setUploadError(validationMsg);
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Upload to BFF
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fieldKey", fieldKey);
      if (questionId) {
        formData.append("questionId", questionId);
      }

      const endpoint = questionId
        ? `/api/admin/questions/${encodeURIComponent(questionId)}/media`
        : "/api/admin/questions/media";

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        const errorMsg =
          json?.detail ||
          json?.error ||
          `Upload failed with HTTP status ${res.status}. Please check image format and size.`;
        setUploadError(errorMsg);
        setPreviewUrl(value || null);
        return;
      }

      const mediaUrl = json.media?.url;
      if (mediaUrl) {
        onChange(mediaUrl);
        setPreviewUrl(mediaUrl);
      } else {
        onChange(localUrl);
      }
    } catch (err: any) {
      setUploadError(err?.message || "An unexpected network error occurred while uploading image.");
      setPreviewUrl(value || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setFileName(null);
    setFileSize(null);
    setUploadError(null);
    setImageLoadError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onChange("");
    onRemove?.();
  };

  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  const hasImage = Boolean(previewUrl);

  return (
    <div
      className={`space-y-2 rounded-xl border border-border/80 bg-card p-3 shadow-xs text-xs ${className}`}
      data-testid={`${testIdPrefix}-container`}
    >
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {label}
        </Label>
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
          Max {MAX_QUESTION_IMAGE_MB} MB (PNG, JPEG, WebP, GIF)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="sr-only"
        aria-label={`${label} file input`}
        data-testid={`${testIdPrefix}-input`}
      />

      {/* Preview and Controls View when image is active */}
      {hasImage ? (
        <div
          className="rounded-lg border border-border bg-muted/20 p-3 space-y-3"
          data-testid={`${testIdPrefix}-preview-box`}
        >
          <div className="relative flex flex-col items-center justify-center rounded-lg border border-border/60 bg-background/50 p-2 overflow-hidden min-h-[140px]">
            {imageLoadError ? (
              <div
                className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground space-y-1"
                data-testid={`${testIdPrefix}-fallback`}
              >
                <AlertCircle className="h-6 w-6 text-amber-500" aria-hidden="true" />
                <p className="text-xs font-medium">Image preview unavailable or broken</p>
                <p className="text-[11px] font-mono text-muted-foreground truncate max-w-xs">
                  {previewUrl}
                </p>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl!}
                alt="Clinical question exhibit preview"
                data-testid={`${testIdPrefix}-preview-image`}
                onError={() => setImageLoadError(true)}
                className="max-h-48 rounded object-contain transition-all"
              />
            )}

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-primary font-medium text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Persisting image to database...</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <FileText className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[200px]" title={fileName || previewUrl || "Saved image"}>
                {fileName || "Persisted clinical exhibit"}
              </span>
              {fileSize !== null && (
                <span className="font-mono text-xs">({formatBytes(fileSize)})</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReplaceClick}
                disabled={disabled || isUploading}
                data-testid={`${testIdPrefix}-replace-button`}
                className="h-7 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>Replace</span>
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                data-testid={`${testIdPrefix}-remove-button`}
                className="h-7 text-xs gap-1"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                <span>Remove</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Dropzone View */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleReplaceClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleReplaceClick();
            }
          }}
          data-testid={`${testIdPrefix}-dropzone`}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isDragging
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-primary/60 hover:bg-muted/40 text-muted-foreground"
          } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold text-foreground">
                Uploading and validating image...
              </p>
              <p className="text-[11px] text-muted-foreground">
                Verifying magic bytes and saving to database
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-full bg-primary/10 p-2.5 text-primary mb-2">
                <UploadCloud className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                Click to select or drag and drop image here
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                PNG, JPEG, WebP, or GIF up to <strong>{MAX_QUESTION_IMAGE_MB} MB</strong>
              </p>
            </>
          )}
        </div>
      )}

      {/* Validation Error Alert */}
      {uploadError && (
        <div
          className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive"
          data-testid={`${testIdPrefix}-error`}
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 font-medium leading-relaxed">{uploadError}</div>
        </div>
      )}
    </div>
  );
}

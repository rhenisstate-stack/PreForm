"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Clock,
  Captions,
  MonitorPlay,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HeroVideoConfig } from "@/lib/hero-videos";

export interface ProductVideoPlayerProps {
  video: HeroVideoConfig;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  priorityPoster?: boolean;
  modalOnly?: boolean;
  frameTestId?: string;
  playButtonTestId?: string;
  modalTestId?: string;
  className?: string;
}

export function ProductVideoPlayer({
  video,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  priorityPoster = true,
  modalOnly = false,
  frameTestId = "product-video-frame",
  playButtonTestId = "product-video-play-button",
  modalTestId = "product-video-modal",
  className,
}: ProductVideoPlayerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      controlledOnOpenChange?.(next);
    },
    [isControlled, controlledOnOpenChange]
  );

  const [isLoading, setIsLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const prefersReducedMotion = React.useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener?.("change", callback);
      return () => mq.removeEventListener?.("change", callback);
    },
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    () => false
  );

  // Pause video when modal closes
  React.useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        setHasError(false);
        setIsLoading(!video.externalEmbedUrl);
      }
      setOpen(next);
    },
    [setOpen, video.externalEmbedUrl]
  );

  const handleOpen = React.useCallback(() => {
    handleOpenChange(true);
  }, [handleOpenChange]);

  return (
    <>
      {!modalOnly && (
        /* Polished Laptop / Application Frame Video Preview */
        <div
          data-testid={frameTestId}
        className={cn(
          "relative w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/5 overflow-hidden",
          className
        )}
      >
        {/* Subtle Application Window Header Bar */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/95">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500/70" />
            </span>
            <span className="ml-1.5 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
              {video.platformLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="secondary"
              className="bg-teal-50 text-teal-800 border border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/70 text-[11px] font-mono px-2 py-0.5"
            >
              <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
              {video.durationLabel}
            </Badge>
          </div>
        </div>

        {/* 16:9 Responsive Poster + Custom Branded Play Overlay */}
        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden group">
          <Image
            src={video.posterSrc}
            alt={video.posterAlt}
            fill
            priority={priorityPoster}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 640px"
            className="object-cover object-center transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
          />

          {/* Subtle gradient scrim for legible controls */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#142B4A]/85 via-[#142B4A]/25 to-[#142B4A]/10"
          />

          {/* Center Prominent Play Trigger */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <button
              type="button"
              data-testid={playButtonTestId}
              onClick={handleOpen}
              aria-label={video.accessibleLabel}
              className="inline-flex items-center gap-3 rounded-full bg-white/95 hover:bg-white text-[#142B4A] pl-2.5 pr-5 py-2.5 shadow-2xl ring-1 ring-slate-900/10 transition-all duration-200 motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D9488] text-white shadow-sm">
                <Play className="h-4 w-4 fill-current ml-0.5" aria-hidden="true" />
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold leading-tight text-[#142B4A]">
                  Watch Platform Tour
                </span>
                <span className="block text-[11px] font-medium text-slate-600">
                  {video.durationLabel} • Actual Interface
                </span>
              </span>
            </button>
          </div>

          {/* Bottom Metadata Bar */}
          <div className="absolute bottom-3 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/95 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#142B4A]/85 backdrop-blur-xs px-3 py-1 font-medium">
              <MonitorPlay className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
              <span>Actual PrepFord Platform</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#142B4A]/85 backdrop-blur-xs px-3 py-1 font-medium">
              <Captions className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
              <span>CC</span>
            </span>
          </div>
        </div>
        </div>
      )}

      {/* Accessible Lightbox Modal Player (lazy-loads video only when opened) */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          data-testid={modalTestId}
          className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl"
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-row items-start justify-between gap-4 text-left">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold text-[#0D9488] border-[#0D9488]/30 bg-teal-50/70 dark:bg-teal-950/40"
                >
                  {video.platformLabel}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {video.durationLabel}
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-serif font-bold text-foreground">
                {video.title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {video.subtitle}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close video player"
                className="h-8 w-8 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          {/* 16:9 Player Stage */}
          <div className="relative aspect-video w-full bg-slate-950">
            {video.externalEmbedUrl ? (
              <iframe
                src={video.externalEmbedUrl}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : hasError ? (
              <div
                data-testid="product-video-unavailable"
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-100"
              >
                <div className="max-w-md space-y-4">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
                    <AlertCircle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-white">
                      Walkthrough recording unavailable in this preview
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {video.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {video.fallbackLinks.map((link) => (
                      <Button
                        key={link.href}
                        size="sm"
                        variant="secondary"
                        asChild
                        onClick={() => setOpen(false)}
                        className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs"
                      >
                        <Link href={link.href}>
                          {link.label}
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isLoading && (
                  <div
                    aria-live="polite"
                    className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 pointer-events-none"
                  >
                    <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-400" aria-hidden="true" />
                      <span>Loading platform walkthrough...</span>
                    </div>
                  </div>
                )}
                <video
                  ref={videoRef}
                  data-testid="product-video-element"
                  controls
                  playsInline
                  preload="metadata"
                  poster={video.posterSrc}
                  autoPlay={!prefersReducedMotion}
                  aria-label={video.title}
                  onLoadStart={() => setIsLoading(true)}
                  onCanPlay={() => setIsLoading(false)}
                  onLoadedData={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                  className="w-full h-full object-contain bg-black"
                >
                  <source src={video.webmSrc} type="video/webm" />
                  <source src={video.mp4Src} type="video/mp4" />
                  <track
                    kind="captions"
                    src={video.captionsSrc}
                    srcLang="en"
                    label="English captions"
                    default
                  />
                  Your browser does not support HTML5 video playback.
                </video>
              </>
            )}
          </div>

          {/* Walkthrough Chapter Sequence */}
          {video.chapters.length > 0 && (
            <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                What this walkthrough demonstrates
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {video.chapters.map((chapter) => (
                  <div
                    key={chapter.label}
                    className="flex items-center gap-2 text-xs text-foreground/90"
                  >
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-[#0D9488] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                      {chapter.time}
                    </span>
                    <span className="truncate">{chapter.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

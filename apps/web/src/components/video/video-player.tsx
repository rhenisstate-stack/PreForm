"use client";

import * as React from "react";
import { Play, CheckCircle2, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LearningVideo, LearnerVideoProgress, videoService } from "@/lib/video-service";
import { toast } from "sonner";

export interface VideoPlayerProps {
  video: LearningVideo;
  progress?: LearnerVideoProgress;
  onProgressUpdate?: (updated: LearnerVideoProgress) => void;
  className?: string;
}

export function VideoPlayer({
  video,
  progress,
  onProgressUpdate,
  className = "",
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(progress?.completed || false);
  const [currentProgress, setCurrentProgress] = React.useState(progress?.progressPercent || 0);

  React.useEffect(() => {
    setIsCompleted(progress?.completed || false);
    setCurrentProgress(progress?.progressPercent || 0);
  }, [progress]);

  // Construct privacy-enhanced embed URL
  const embedUrl = React.useMemo(() => {
    if (video.provider === "vimeo") {
      return `https://player.vimeo.com/video/${video.externalVideoId}?dnt=1&title=0&byline=0`;
    }
    // YouTube nocookie domain complies with strict learner privacy regulations
    return `https://www.youtube-nocookie.com/embed/${video.externalVideoId}?rel=0&modestbranding=1&enablejsapi=1&autoplay=1`;
  }, [video.provider, video.externalVideoId]);

  const handleToggleComplete = async () => {
    const nextCompleted = !isCompleted;
    setIsCompleted(nextCompleted);
    const nextProgress = nextCompleted ? 100 : 0;
    setCurrentProgress(nextProgress);

    try {
      const updated = await videoService.updateProgress({
        videoId: video.id,
        progressPercent: nextProgress,
        lastWatchedSeconds: nextCompleted ? video.durationMinutes * 60 : 0,
        completed: nextCompleted,
      });
      onProgressUpdate?.(updated);
      toast.success(
        nextCompleted
          ? `Marked "${video.title}" as completed!`
          : `Marked "${video.title}" as in progress.`
      );
    } catch {
      toast.error("Failed to save video progress");
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Player Container */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-border shadow-lg">
        {isPlaying ? (
          <iframe
            src={embedUrl}
            title={`${video.title} - PrepFord Clinical Lecture`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          /* Custom branded poster overlay */
          <div className="relative w-full h-full group flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

            {/* Play Button Pill */}
            <button
              onClick={() => setIsPlaying(true)}
              className="relative z-10 flex items-center gap-3 px-6 py-3.5 rounded-full bg-teal-600/95 hover:bg-teal-500 text-white font-semibold text-sm shadow-xl hover:scale-105 transition-all"
              aria-label={`Play lecture: ${video.title}`}
            >
              <div className="w-8 h-8 rounded-full bg-white text-teal-800 flex items-center justify-center">
                <Play className="w-4 h-4 fill-teal-800 ml-0.5" />
              </div>
              <span>Start Clinical Lecture</span>
            </button>

            {/* Bottom bar overlay */}
            <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-white text-xs">
              <span className="flex items-center gap-1.5 opacity-90">
                <Clock className="w-3.5 h-3.5" /> {video.durationMinutes} minutes
              </span>
              <span className="flex items-center gap-1 text-teal-300">
                <ShieldCheck className="w-3.5 h-3.5" /> Privacy-Enhanced Player
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Video Details & Learner Progress Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs uppercase font-medium">
                {video.category}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs uppercase font-mono"
              >
                {video.programme === "both" ? "RN & PN" : video.programme.toUpperCase()}
              </Badge>
              {video.requiredTier !== "free" && (
                <Badge className="bg-amber-500 text-white text-[10px]">
                  {video.requiredTier.replace("_", " ").toUpperCase()}
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground">{video.title}</h2>
          </div>

          <Button
            size="sm"
            variant={isCompleted ? "default" : "outline"}
            onClick={handleToggleComplete}
            className={`flex items-center gap-1.5 shrink-0 ${
              isCompleted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isCompleted ? "Completed" : "Mark as Completed"}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Watch Progress</span>
            <span className="font-semibold text-foreground">{currentProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted ? "bg-emerald-500" : "bg-teal-500"
              }`}
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>

        {/* Clinical Description */}
        <p className="text-sm text-muted-foreground leading-relaxed pt-1">
          {video.description}
        </p>

        {/* Tags */}
        {video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {video.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Play,
  CheckCircle2,
  Clock,
  Video,
  Search,
  Filter,
  GraduationCap,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LearningVideo,
  LearnerVideoProgress,
  videoService,
} from "@/lib/video-service";
import { VideoPlayer } from "@/components/video/video-player";
import { notify as toast } from "@/lib/notifications";

export function LearnerVideosClient() {
  const [videos, setVideos] = React.useState<LearningVideo[]>([]);
  const [progress, setProgress] = React.useState<Record<string, LearnerVideoProgress>>({});
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedProgramme, setSelectedProgramme] = React.useState<string>("all");
  const [activeVideo, setActiveVideo] = React.useState<LearningVideo | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [vids, prog] = await Promise.all([
        videoService.getVideos({
          category: selectedCategory,
          programme: selectedProgramme,
          search,
          isPublished: true,
        }),
        videoService.getLearnerProgress(),
      ]);
      setVideos(vids);
      setProgress(prog);

      // Default active video
      if (!activeVideo && vids.length > 0) {
        setActiveVideo(vids[0]);
      }
    } catch {
      toast.error("Failed to load video library");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedProgramme, search, activeVideo]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const completedCount = Object.values(progress).filter((p) => p.completed).length;
  const totalMinutes = videos.reduce((sum, v) => sum + v.durationMinutes, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-teal-600" />
            Clinical Learning Media & Video Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual clinical lectures, unfolding Next Gen case breakdowns, and high-yield pharmacology masterclasses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
            {completedCount} of {videos.length} Lectures Completed
          </Badge>
        </div>
      </div>

      {/* Featured / Active Video Player */}
      {activeVideo && (
        <Card className="border-border/60 overflow-hidden shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <VideoPlayer
              video={activeVideo}
              progress={progress[activeVideo.id]}
              onProgressUpdate={(updated) => {
                setProgress((prev) => ({ ...prev, [updated.videoId]: updated }));
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/60">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search lectures by topic or medication..."
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
            <option value="all">All Topics</option>
            <option value="Clinical Judgment">Clinical Judgment</option>
            <option value="Pharmacology">Pharmacology</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Prioritization & Delegation">Prioritization & Delegation</option>
            <option value="Pediatrics">Pediatrics</option>
          </select>
          <select
            value={selectedProgramme}
            onChange={(e) => setSelectedProgramme(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background"
          >
            <option value="all">All Pathways (RN & PN)</option>
            <option value="rn">NCLEX-RN</option>
            <option value="pn">NCLEX-PN</option>
          </select>
        </div>
      </div>

      {/* Video Grid / Playlist */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-teal-600" />
          Clinical Playlist ({videos.length} Lectures • {(totalMinutes / 60).toFixed(1)} hrs)
        </h2>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading video playlist...
          </div>
        ) : videos.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed rounded-lg border-border/60 p-8">
            <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold text-foreground">No clinical videos found</p>
            <p className="text-xs text-muted-foreground mt-1">Try modifying your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((vid) => {
              const isSelected = activeVideo?.id === vid.id;
              const isDone = progress[vid.id]?.completed;
              return (
                <div
                  key={vid.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveVideo(vid);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setActiveVideo(vid)}
                  className={`group border rounded-xl overflow-hidden cursor-pointer transition-all ${
                    isSelected
                      ? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/20 dark:bg-teal-950/20 shadow-md"
                      : "border-border hover:border-border/80 bg-card hover:shadow-sm"
                  }`}
                >
                  <div className="aspect-video relative overflow-hidden bg-muted flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[11px] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {vid.durationMinutes}m
                    </div>
                    {isDone && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {vid.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {vid.programme}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                      {vid.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {vid.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

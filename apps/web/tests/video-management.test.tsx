import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { videoService, LearningVideo } from "@/lib/video-service";
import { VideoPlayer } from "@/components/video/video-player";

describe("Phase 10: Learning Media Library & Video Management", () => {
  describe("videoService catalog & telemetry", () => {
    it("retrieves pre-seeded clinical video lectures sorted by orderIndex", async () => {
      const vids = await videoService.getVideos();
      expect(vids.length).toBeGreaterThanOrEqual(4);
      expect(vids[0].id).toBe("vid-ncjmm-overview");
      expect(vids[0].category).toBe("Clinical Judgment");
    });

    it("filters videos by pathway alignment (RN vs PN)", async () => {
      const rnOnly = await videoService.getVideos({ programme: "rn" });
      expect(rnOnly.every((v) => v.programme === "rn" || v.programme === "both")).toBe(true);
      expect(rnOnly.some((v) => v.id === "vid-cardio-ecg")).toBe(true);
    });

    it("updates candidate watch progress and completion flag", async () => {
      const prog = await videoService.updateProgress({
        videoId: "vid-cardio-ecg",
        progressPercent: 95,
        lastWatchedSeconds: 1368,
      });

      expect(prog.progressPercent).toBe(95);
      expect(prog.completed).toBe(true);

      const allProg = await videoService.getLearnerProgress();
      expect(allProg["vid-cardio-ecg"]).toBeDefined();
      expect(allProg["vid-cardio-ecg"].completed).toBe(true);
    });

    it("creates, updates, and deletes clinical videos", async () => {
      const created = await videoService.createVideo({
        title: "Mechanical Ventilation Waveforms & Alarms",
        description: "Interpreting volume-controlled vs pressure-controlled curves.",
        provider: "youtube",
        externalVideoId: "ventilator123",
        durationMinutes: 28,
        thumbnailUrl: "/images/blog/prepford-clinical-judgment-hero.jpg",
        category: "Clinical Judgment",
        programme: "rn",
        requiredTier: "2_months",
        isPublished: true,
        orderIndex: 9,
        tags: ["Ventilator", "Critical Care", "Alarms"],
      });

      expect(created.slug).toBe("mechanical-ventilation-waveforms-alarms");

      // Update
      const updated = await videoService.updateVideo(created.id, {
        durationMinutes: 30,
      });
      expect(updated.durationMinutes).toBe(30);

      // Delete
      const delSuccess = await videoService.deleteVideo(created.id);
      expect(delSuccess).toBe(true);

      const lookup = await videoService.getVideoBySlug(created.slug);
      expect(lookup).toBeNull();
    });
  });

  describe("VideoPlayer component & privacy conformance", () => {
    const mockVideo: LearningVideo = {
      id: "vid-test-01",
      slug: "acls-shockable-rhythms",
      title: "ACLS Shockable Rhythms in Critical Care",
      description: "Immediate defibrillation protocols for V-Fib and Pulseless V-Tach.",
      provider: "youtube",
      externalVideoId: "test_yt_id",
      durationMinutes: 20,
      thumbnailUrl: "/images/ecg-lead2.png",
      category: "Cardiovascular",
      programme: "both",
      requiredTier: "1_month",
      isPublished: true,
      orderIndex: 1,
      tags: ["Cardio", "ACLS"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("renders video poster overlay and privacy-compliant play button", () => {
      render(<VideoPlayer video={mockVideo} />);

      expect(screen.getByText("ACLS Shockable Rhythms in Critical Care")).toBeInTheDocument();
      expect(screen.getByText(/20 minutes/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy-Enhanced Player/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Play lecture/i })).toBeInTheDocument();
    });

    it("loads privacy-enhanced youtube-nocookie.com iframe on play click", () => {
      render(<VideoPlayer video={mockVideo} />);

      const playBtn = screen.getByRole("button", { name: /Play lecture/i });
      fireEvent.click(playBtn);

      const iframe = screen.getByTitle(/ACLS Shockable Rhythms in Critical Care - PrepFord Clinical Lecture/i);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        "src",
        "https://www.youtube-nocookie.com/embed/test_yt_id?rel=0&modestbranding=1&enablejsapi=1&autoplay=1"
      );
    });

    it("allows toggling completion status", async () => {
      const onProgressUpdate = vi.fn();
      render(<VideoPlayer video={mockVideo} onProgressUpdate={onProgressUpdate} />);

      const completeBtn = screen.getByRole("button", { name: /Mark as Completed/i });
      fireEvent.click(completeBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Completed/i })).toBeInTheDocument();
      });

      expect(onProgressUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          videoId: "vid-test-01",
          completed: true,
          progressPercent: 100,
        })
      );
    });
  });
});

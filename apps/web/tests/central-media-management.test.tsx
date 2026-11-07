import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import {
  mediaService,
  MAX_MEDIA_FILE_BYTES,
  ALLOWED_MEDIA_MIME_TYPES,
} from "@/lib/media-service";
import { MediaPicker } from "@/components/media/media-picker";

describe("Phase 11: Central Media & Asset Management", () => {
  describe("mediaService integrity & validation rules", () => {
    it("returns pre-seeded media assets with dimensions and reference count", async () => {
      const res = await mediaService.getAssets();
      expect(res.assets.length).toBeGreaterThanOrEqual(3);

      const ecg = res.assets.find((a) => a.id === "media-ecg-lead2");
      expect(ecg).toBeDefined();
      expect(ecg?.category).toBe("question_exhibit");
      expect(ecg?.referenceCount).toBe(4);
      expect(ecg?.dimensions).toEqual({ width: 1200, height: 600 });
    });

    it("rejects uploads exceeding the 5 MB file size limit", async () => {
      const oversizedBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: "image/png" });
      await expect(
        mediaService.uploadAsset({
          file: oversizedBlob as any,
          fileName: "giant-mri-scan.png",
          altText: "High resolution brain scan",
          category: "question_exhibit",
        })
      ).rejects.toThrow(/exceeds maximum limit of 5 MB/i);
    });

    it("rejects uploads with unsupported MIME types", async () => {
      const exeBlob = new Blob(["malicious code"], { type: "application/x-msdownload" });
      await expect(
        mediaService.uploadAsset({
          file: exeBlob as any,
          fileName: "installer.exe",
          altText: "Executable file",
          category: "general",
        })
      ).rejects.toThrow(/Unsupported media type/i);
    });

    it("blocks deletion of media assets actively referenced by questions or guides", async () => {
      await expect(mediaService.deleteAsset("media-ecg-lead2")).rejects.toThrow(
        /Cannot delete media asset because it is actively referenced in 4 place\(s\)/i
      );
    });

    it("allows deletion of orphan / unreferenced media assets", async () => {
      // 1. Upload unreferenced asset
      const validBlob = new Blob(["sample image data"], { type: "image/png" });
      const asset = await mediaService.uploadAsset({
        file: validBlob as any,
        fileName: "temp-unreferenced.png",
        altText: "Temporary diagram",
        category: "general",
      });

      expect(asset.referenceCount).toBe(0);

      // 2. Delete should succeed
      const delRes = await mediaService.deleteAsset(asset.id);
      expect(delRes.success).toBe(true);

      const lookup = await mediaService.getAssetById(asset.id);
      expect(lookup).toBeNull();
    });

    it("updates alt text and caption metadata", async () => {
      const updated = await mediaService.updateMetadata("media-abg-diagram", {
        altText: "Updated ABG Tic-Tac-Toe diagnostic grid with metabolic labels",
        caption: "Figure 1.2: Acid-base interpretation matrix.",
      });

      expect(updated.altText).toContain("Updated ABG Tic-Tac-Toe");
      expect(updated.caption).toContain("Figure 1.2");
    });
  });

  describe("MediaPicker component", () => {
    it("renders the modal and allows selecting an asset", async () => {
      const onSelect = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <MediaPicker
          open={true}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
          category="question_exhibit"
        />
      );

      expect(screen.getByText("Select Media Asset")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Media Library/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Upload New Asset/i })).toBeInTheDocument();

      // Find an asset and click
      const item = await screen.findByText(/ecg-lead-ii-sinus-rhythm.png/i);
      expect(item).toBeInTheDocument();

      fireEvent.click(item);

      // Click insert selected asset
      const insertBtn = screen.getByRole("button", { name: /Insert Selected Asset/i });
      expect(insertBtn).toBeEnabled();

      fireEvent.click(insertBtn);
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "media-ecg-lead2",
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

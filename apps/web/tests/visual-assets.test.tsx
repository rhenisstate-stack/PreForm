import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { AppIllustration } from "@/components/ui/app-illustration";
import {
  ILLUSTRATION_CATALOG,
  MASTER_STYLE_SPECIFICATION,
} from "@/lib/illustration-manifest";

describe("PrepFord Visual Asset System & Manifest", () => {
  it("enforces the mandatory master prompt style specification", () => {
    expect(MASTER_STYLE_SPECIFICATION).toContain("online nursing exam preparation platform called PrepFord");
    expect(MASTER_STYLE_SPECIFICATION).toContain("medical teal, deep navy blue, crisp clean white, and soft light-blue accents");
    expect(MASTER_STYLE_SPECIFICATION).toContain("Modern vector graphic style with subtle flat-design shadows");
    expect(MASTER_STYLE_SPECIFICATION).toContain("isolated on a solid white background");
  });

  it("registers valid catalog assets with unique IDs and paths", () => {
    const ids = ILLUSTRATION_CATALOG.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (const asset of ILLUSTRATION_CATALOG) {
      expect(asset.id).toBeTruthy();
      expect(asset.filename).toMatch(/^prepford-[\w-]+\.png$/);
      expect(asset.path).toMatch(/^\/images\/illustrations\/prepford-[\w-]+\.png$/);
      expect(asset.altText).toBeTruthy();
    }
  });

  it("verifies physical existence and non-zero size of all generated image files", () => {
    const publicDir = path.resolve(__dirname, "../public");
    const generatedAssets = ILLUSTRATION_CATALOG.filter((a) => a.generationStatus === "generated");

    expect(generatedAssets.length).toBeGreaterThanOrEqual(9);

    for (const asset of generatedAssets) {
      const fullPath = path.join(publicDir, asset.path.replace(/^\//, ""));
      expect(fs.existsSync(fullPath), `Expected file ${fullPath} to exist`).toBe(true);

      const stats = fs.statSync(fullPath);
      expect(stats.size, `Expected file ${fullPath} to have non-zero size`).toBeGreaterThan(10000);
    }
  });

  describe("AppIllustration Component", () => {
    it("renders an accessible image with alt text and default styling", () => {
      render(
        <AppIllustration
          src="/images/illustrations/prepford-landing-hero.png"
          alt="PrepFord Nursing Candidate"
          dataTestId="test-illustration"
        />
      );

      const container = screen.getByTestId("test-illustration");
      expect(container).toBeInTheDocument();

      const img = screen.getByRole("img", { name: /PrepFord Nursing Candidate/i });
      expect(img).toBeInTheDocument();
      expect(decodeURIComponent(img.getAttribute("src") || "")).toContain(
        "/images/illustrations/prepford-landing-hero.png"
      );
    });

    it("supports decorative mode with empty alt and aria-hidden", () => {
      render(
        <AppIllustration
          src="/images/illustrations/prepford-empty-recent-activity.png"
          alt="Decorative Background"
          isDecorative
          dataTestId="decorative-illustration"
        />
      );

      const img = screen.getByTestId("decorative-illustration").querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("aria-hidden", "true");
    });

    it("applies specified aspect ratio class and optional caption", () => {
      render(
        <AppIllustration
          src="/images/illustrations/prepford-ehr-unfolding-case.png"
          alt="EHR Case"
          aspectRatio="4/3"
          caption="Unfolding Clinical Scenario Flowsheet"
          dataTestId="aspect-illustration"
        />
      );

      const container = screen.getByTestId("aspect-illustration");
      expect(container.className).toContain("aspect-4/3");
      expect(screen.getByText("Unfolding Clinical Scenario Flowsheet")).toBeInTheDocument();
    });
  });
});

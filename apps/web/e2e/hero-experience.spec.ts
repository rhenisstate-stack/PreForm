import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-360", width: 360, height: 800 },
];

test.describe("PrepFord Hero Experiences & Responsive Validation", () => {
  for (const vp of VIEWPORTS) {
    test(`zero horizontal overflow across /, /nclex-rn, /nclex-pn at ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of ["/", "/nclex-rn", "/nclex-pn"]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const hasOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(hasOverflow, `Horizontal overflow detected on ${route} at ${vp.name}`).toBe(false);
      }
    });
  }

  test("homepage hero autoplay background video, reduced-motion fallback, and optional tour modal work end-to-end", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeVisible();

    const bgVideo = page.getByTestId("home-hero-background-video");
    await expect(bgVideo).toBeAttached();
    await expect(bgVideo).toHaveAttribute("aria-hidden", "true");

    await page.waitForFunction(() => {
      const v = document.querySelector('[data-testid="home-hero-background-video"]') as HTMLVideoElement | null;
      return Boolean(v && v.readyState >= 1 && v.videoWidth === 1920 && v.videoHeight === 1080);
    }, { timeout: 15000 });

    const bgProps = await bgVideo.evaluate((v: HTMLVideoElement) => ({
      muted: v.muted,
      autoplay: v.autoplay,
      loop: v.loop,
      playsInline: v.playsInline,
      width: v.videoWidth,
      height: v.videoHeight,
      pointerEvents: getComputedStyle(v).pointerEvents,
    }));
    expect(bgProps.muted).toBe(true);
    expect(bgProps.autoplay).toBe(true);
    expect(bgProps.loop).toBe(true);
    expect(bgProps.playsInline).toBe(true);
    expect(bgProps.width).toBe(1920);
    expect(bgProps.height).toBe(1080);

    // Open optional video modal and verify real 1920x1080 WebM loads with captions
    await page.getByTestId("home-cta-watch-tour").click();
    const modal = page.getByTestId("home-hero-video-modal");
    await expect(modal).toBeVisible();

    const videoEl = modal.getByTestId("product-video-element");
    await expect(videoEl).toBeVisible();

    await page.waitForFunction(() => {
      const v = document.querySelector('[data-testid="product-video-element"]') as HTMLVideoElement | null;
      return Boolean(v && v.readyState >= 1 && v.videoWidth === 1920 && v.videoHeight === 1080);
    }, { timeout: 15000 });

    const videoMeta = await videoEl.evaluate((v: HTMLVideoElement) => ({
      width: v.videoWidth,
      height: v.videoHeight,
      duration: v.duration,
      hasCaptions: v.textTracks.length > 0,
    }));
    expect(videoMeta.width).toBe(1920);
    expect(videoMeta.height).toBe(1080);
    expect(videoMeta.duration).toBeGreaterThanOrEqual(75);
    expect(videoMeta.hasCaptions).toBe(true);

    // Close via Escape key
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    // Verify RN & PN pathway CTAs
    await expect(page.getByTestId("home-cta-explore-rn")).toHaveAttribute("href", "/nclex-rn");
    await expect(page.getByTestId("home-cta-explore-pn")).toHaveAttribute("href", "/nclex-pn");
    expect(pageErrors).toHaveLength(0);
  });

  test("prefers-reduced-motion disables hero background video and preserves poster", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("home-hero-background-video")).toHaveCount(0);
    await expect(page.getByTestId("home-hero-background-video-poster")).toBeVisible();
  });

  test("NCLEX-RN hero background video, modal tour, and dashboard CTA work end-to-end", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/nclex-rn", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Build the clinical judgment to become a confident Registered Nurse\./i,
      })
    ).toBeVisible();

    await page.waitForFunction(() => {
      const v = document.querySelector('[data-testid="rn-hero-background-video"]') as HTMLVideoElement | null;
      return Boolean(v && v.readyState >= 1 && v.currentSrc.includes("prepford-rn-tour"));
    }, { timeout: 15000 });

    await page.getByTestId("rn-hero-watch-tour").click();
    const modal = page.getByTestId("rn-hero-video-modal");
    await expect(modal).toBeVisible();

    await page.waitForFunction(() => {
      const v = document.querySelector('[data-testid="product-video-element"]') as HTMLVideoElement | null;
      return Boolean(v && v.readyState >= 1 && v.currentSrc.includes("prepford-rn-tour.webm"));
    }, { timeout: 15000 });

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    await page.getByTestId("rn-hero-dashboard-cta").click();
    await expect(page).toHaveURL(/\/sign-in\?from=%2Fdashboard%2Frn/);
  });

  test("NCLEX-PN hero background video, modal tour, and dashboard CTA work end-to-end", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/nclex-pn", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX-PN with confidence and clinical clarity\./i,
      })
    ).toBeVisible();

    await page.waitForFunction(() => {
      const v = document.querySelector('[data-testid="pn-hero-background-video"]') as HTMLVideoElement | null;
      return Boolean(v && v.readyState >= 1 && v.currentSrc.includes("prepford-pn-tour"));
    }, { timeout: 15000 });

    await page.getByTestId("pn-hero-watch-tour").click();
    const modal = page.getByTestId("pn-hero-video-modal");
    await expect(modal).toBeVisible();

    await page.waitForFunction(() => {
      const v = document.querySelector('[data-testid="product-video-element"]') as HTMLVideoElement | null;
      return Boolean(v && v.readyState >= 1 && v.currentSrc.includes("prepford-pn-tour.webm"));
    }, { timeout: 15000 });

    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    await page.getByTestId("pn-hero-dashboard-cta").click();
    await expect(page).toHaveURL(/\/sign-in\?from=%2Fdashboard%2Fpn/);
  });

  test("mobile 390px hero video modal opens and plays without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByTestId("home-cta-watch-tour").click();
    const modal = page.getByTestId("home-hero-video-modal");
    await expect(modal).toBeVisible();

    await page.waitForFunction(() => {
      const v = document.querySelector('[data-testid="product-video-element"]') as HTMLVideoElement | null;
      return Boolean(v && v.readyState >= 1);
    }, { timeout: 15000 });

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });
});

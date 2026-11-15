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

  test("homepage hero navigation and platform tour modal work end-to-end", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX with greater clarity and confidence\./i,
      })
    ).toBeVisible();

    // Open and close video modal via keyboard Escape
    await page.getByTestId("home-cta-watch-tour").click();
    await expect(page.getByTestId("home-hero-video-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("home-hero-video-modal")).toBeHidden();

    // Verify RN & PN pathway CTAs
    await expect(page.getByTestId("home-cta-explore-rn")).toHaveAttribute("href", "/nclex-rn");
    await expect(page.getByTestId("home-cta-explore-pn")).toHaveAttribute("href", "/nclex-pn");
  });

  test("NCLEX-RN hero video modal and dashboard CTA work end-to-end", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/nclex-rn", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Build the clinical judgment to become a confident Registered Nurse\./i,
      })
    ).toBeVisible();

    await page.getByTestId("rn-hero-watch-tour").click();
    await expect(page.getByTestId("rn-hero-video-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("rn-hero-video-modal")).toBeHidden();

    await page.getByTestId("rn-hero-dashboard-cta").click();
    await expect(page).toHaveURL(/\/sign-in\?from=%2Fdashboard%2Frn/);
  });

  test("NCLEX-PN hero video modal and dashboard CTA work end-to-end", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/nclex-pn", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Prepare for NCLEX-PN with confidence and clinical clarity\./i,
      })
    ).toBeVisible();

    await page.getByTestId("pn-hero-watch-tour").click();
    await expect(page.getByTestId("pn-hero-video-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("pn-hero-video-modal")).toBeHidden();

    await page.getByTestId("pn-hero-dashboard-cta").click();
    await expect(page).toHaveURL(/\/sign-in\?from=%2Fdashboard%2Fpn/);
  });
});

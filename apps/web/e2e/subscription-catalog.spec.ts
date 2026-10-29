import { test, expect } from "@playwright/test";

test.describe("Subscription Catalog & Pricing Integrity", () => {
  test("public subscription page displays canonical plans with authoritative prices", async ({
    page,
  }) => {
    await page.goto("/subscriptions");

    // Verify page loads
    await expect(page).toHaveTitle(/Subscription|Plans|Pricing/i);

    // Verify presence of canonical plan names or cards
    const pageText = await page.textContent("body");
    expect(pageText).toContain("NCLEX-RN");

    // Verify pricing format ($XX or $XX/mo)
    const hasPriceSymbol = pageText?.includes("$");
    expect(hasPriceSymbol).toBeTruthy();
  });

  test("API returns active plans with correct pathway and price metadata", async ({ request }) => {
    const res = await request.get("/api/subscriptions");
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.success).toBeTruthy();
    expect(Array.isArray(data.plans)).toBeTruthy();
    expect(data.plans.length).toBeGreaterThan(0);

    // Verify all returned plans are active
    for (const plan of data.plans) {
      expect(plan.isActive).toBe(true);
      const price = plan.priceCents ?? (typeof plan.price === "number" ? plan.price * 100 : 0);
      expect(price).toBeGreaterThan(0);
      expect(["rn", "pn", "both", "RN", "PN", "Both"]).toContain(plan.pathway);
    }
  });

  test("archived or non-existent plan lookup returns 404", async ({ request }) => {
    const res = await request.get("/api/subscriptions/non-existent-plan-slug-xyz");
    expect(res.status()).toBe(404);
  });
});

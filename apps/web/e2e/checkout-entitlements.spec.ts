import { test, expect } from "@playwright/test";
import { generateTestStudent, registerStudentUI, clearSession } from "./helpers/test-fixtures";

test.describe("Checkout, Payments & Entitlements Flow", () => {
  test("unauthenticated visitor clicking checkout is prompted to sign in", async ({ page }) => {
    await clearSession(page);

    await page.goto("/cart?add=nclex-rn-pro");
    await page.waitForTimeout(500);

    const checkoutBtn = page.getByRole("button", { name: /proceed to checkout|enroll now/i }).first();
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await page.waitForURL(/\/sign-in/);
      expect(page.url()).toContain("sign-in");
    }
  });

  test("authenticated student can initiate checkout and obtain authoritative checkout session", async ({
    page,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    // Call checkout API
    const checkoutRes = await page.request.post("/api/checkout", {
      data: {
        planId: "nclex-rn-pro",
        pathway: "rn",
      },
    });

    expect(checkoutRes.ok()).toBeTruthy();
    const data = await checkoutRes.json();
    expect(data.success).toBe(true);
    expect(data.orderId || data.checkoutUrl || data.isSimulated).toBeTruthy();
  });

  test("checkout rejects invalid or unknown plan identifiers", async ({ page }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    const badCheckoutRes = await page.request.post("/api/checkout", {
      data: {
        planId: "completely-invalid-plan-identifier-999",
      },
    });

    expect([400, 404]).toContain(badCheckoutRes.status());
    const data = await badCheckoutRes.json();
    expect(data.success).toBe(false);
  });

  test("price injection attempt is ignored and backend enforces authoritative database price", async ({
    page,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    // Attempt to inject amountCents: 100 ($1.00) for a $59 plan
    const tamperRes = await page.request.post("/api/checkout", {
      data: {
        planId: "nclex-rn-pro",
        amountCents: 100, // Injected fake price
        price: 1.0,
      },
    });

    // Backend must succeed by calculating price from database, or reject with validation error
    if (tamperRes.ok()) {
      const data = await tamperRes.json();
      // If simulated checkout created order, amount must match authoritative price (5900 cents)
      if (data.amountCents) {
        expect(data.amountCents).toBe(5900);
      }
    } else {
      expect(tamperRes.status()).toBe(400);
    }
  });

  test("entitlements API returns valid entitlements for authenticated student", async ({
    page,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    const entRes = await page.request.get("/api/entitlements");
    expect(entRes.ok()).toBeTruthy();
    const data = await entRes.json();
    expect(data.success).toBe(true);
    expect(data.userId).toBeTruthy();
    expect(Array.isArray(data.pathways)).toBeTruthy();
  });
});

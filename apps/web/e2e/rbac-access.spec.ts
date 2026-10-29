import { test, expect } from "@playwright/test";
import { generateTestStudent, registerStudentUI, clearSession } from "./helpers/test-fixtures";

test.describe("Role-Based Access Control (RBAC) Enforcement", () => {
  test("unauthenticated visitor cannot access protected candidate pages", async ({ page }) => {
    await clearSession(page);

    // Visiting /profile directly redirects to /sign-in
    await page.goto("/profile");
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");

    // Visiting /dashboard directly redirects to /sign-in
    await page.goto("/dashboard");
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");
  });

  test("unauthenticated API request to /api/profile returns 401", async ({ request }) => {
    const response = await request.get("/api/profile");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated API request to /api/admin/subscriptions returns 401", async ({ request }) => {
    const response = await request.get("/api/admin/subscriptions");
    expect(response.status()).toBe(401);
  });

  test("student candidate cannot access administrative pages or administrative APIs", async ({
    page,
    request,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    // 1. Direct browser navigation to /admin or /admin/subscriptions
    await page.goto("/admin");
    // Should be redirected away or forbidden (e.g. redirected to /dashboard or /profile or 403)
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/admin/dashboard");

    // 2. Direct HTTP request from candidate to admin subscriptions API receives 403 Forbidden
    const adminApiRes = await page.request.get("/api/admin/subscriptions");
    expect([401, 403]).toContain(adminApiRes.status());

    // 3. Candidate attempting to create a subscription plan via POST receives 403 Forbidden
    const createPlanRes = await page.request.post("/api/admin/subscriptions", {
      data: {
        code: "HACKED-PLAN",
        name: "Free Unauthorized Plan",
        priceCents: 0,
        interval: 1,
      },
    });
    expect([401, 403]).toContain(createPlanRes.status());
  });

  test("candidate cannot escalate role or grant admin rights via profile updates", async ({
    page,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    // Attempting to send { role: "admin", activePlan: "all-access" } via profile API
    const res = await page.request.put("/api/profile", {
      data: {
        displayName: "Hacked Candidate",
        role: "admin",
        activePlan: "NCLEX-RN & PN All-Access",
      },
    });

    // Server must reject with 403 Forbidden
    expect(res.status()).toBe(403);
  });
});

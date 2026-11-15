import { expect, test } from "@playwright/test";
import {
  clearSession,
  generateTestStudent,
  registerStudentUI,
} from "./helpers/test-fixtures";

test.describe("Learner Examination E2E (Live API + PostgreSQL)", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test("unauthenticated dashboard requests gate access with sign-in return destination", async ({ page }) => {
    await page.goto("/dashboard/rn");
    await expect(page.getByTestId("dashboard-unauthenticated")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('a[href="/sign-in?from=/dashboard/rn"]').first()).toBeVisible();

    await page.goto("/dashboard/pn");
    await expect(page.getByTestId("dashboard-unauthenticated")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('a[href="/sign-in?from=/dashboard/pn"]').first()).toBeVisible();
  });

  test("RN and PN learners are routed to their pathway dashboards and blocked from cross-pathway dashboards", async ({ page }) => {
    test.setTimeout(90000);
    const rnStudent = generateTestStudent("rn");
    await registerStudentUI(page, rnStudent);
    await expect(page).toHaveURL(/\/dashboard(\/rn)?$/);
    await page.goto("/dashboard/rn");
    await expect(page.getByTestId("learner-dashboard")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("dashboard-pathway-badge")).toContainText(/RN/i);

    // RN learner cannot access PN dashboard
    await page.goto("/dashboard/pn");
    await expect(page.getByTestId("dashboard-entitlement-blocked")).toBeVisible({ timeout: 15000 });

    // PN learner
    await clearSession(page);
    const pnStudent = generateTestStudent("pn");
    await registerStudentUI(page, pnStudent);
    await page.goto("/dashboard/pn");
    await expect(page.getByTestId("learner-dashboard")).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("dashboard-pathway-badge")).toContainText(/PN/i);

    // PN learner cannot access RN dashboard
    await page.goto("/dashboard/rn");
    await expect(page.getByTestId("dashboard-entitlement-blocked")).toBeVisible({ timeout: 15000 });
  });

  test("full learner examination lifecycle: start attempt, persist responses, survive browser refresh, submit, and enforce cross-user 403", async ({ page, browser }) => {
    test.setTimeout(90000);
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);
    const checkoutRes = await page.request.post("/api/checkout", {
      data: { planId: "rn-pro", pathway: "rn" },
    });
    expect(checkoutRes.ok()).toBeTruthy();

    await page.goto("/dashboard/rn");
    await expect(page.getByTestId("learner-dashboard")).toBeVisible({ timeout: 20000 });

    // Open Create Test modal
    await page.getByTestId("sidebar-create-test-btn").click();
    await expect(page.getByTestId("modal-create-test")).toBeVisible();

    // Start live backend attempt
    const [attemptRes, questionsRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().endsWith("/api/attempts") && res.request().method() === "POST"
      ),
      page.waitForResponse(
        (res) => /\/api\/attempts\/att_[^/]+\/questions/.test(res.url()) && res.request().method() === "GET"
      ),
      page.getByRole("button", { name: /Start Test Session/i }).click(),
    ]);

    expect([200, 201]).toContain(attemptRes.status());
    const attemptJson = await attemptRes.json();
    expect(attemptJson.success).toBe(true);
    expect(attemptJson.attemptId).toMatch(/^att_/);
    const attemptId: string = attemptJson.attemptId;

    expect(questionsRes.status()).toBe(200);
    const questionsJson = await questionsRes.json();
    expect(questionsJson.success).toBe(true);
    expect(Array.isArray(questionsJson.questions)).toBe(true);
    expect(questionsJson.questions.length).toBeGreaterThan(0);

    // Answer-key protection: pre-submission delivery must never expose correctAnswerIndices or rationale
    for (const q of questionsJson.questions) {
      expect(q.correctAnswerIndices).toBeUndefined();
      expect(q.rationale).toBeUndefined();
    }

    // Navigate until a question with selectable options is visible (handles any seeded non-option question first)
    const firstOption = page.locator('[role="radiogroup"] button, [role="group"] button').first();
    for (let i = 0; i < questionsJson.questions.length; i++) {
      if (await firstOption.isVisible().catch(() => false)) break;
      const nextBtn = page.getByRole("button", { name: /Next Question/i });
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
      }
    }
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    const [resp1] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/attempts/${attemptId}/responses`) && res.request().method() === "POST"
      ),
      firstOption.click(),
    ]);
    expect(resp1.status()).toBe(200);
    await expect(firstOption).toHaveAttribute("aria-checked", "true");

    // Navigate to another question and back to verify in-session persistence
    const nextBtn = page.getByRole("button", { name: /Next Question/i });
    const prevBtn = page.getByRole("button", { name: /Previous/i });
    if (await nextBtn.isEnabled().catch(() => false)) {
      await nextBtn.click();
      await prevBtn.click();
      await expect(firstOption).toHaveAttribute("aria-checked", "true");
    }

    // Browser refresh must restore the InProgress attempt and persisted answer from PostgreSQL
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/attempts/${attemptId}/questions`) && res.status() === 200
      ),
      page.reload(),
    ]);
    await expect(page.getByTestId("modal-create-test")).toBeVisible({ timeout: 20000 });
    for (let i = 0; i < questionsJson.questions.length; i++) {
      if (await firstOption.isVisible().catch(() => false)) break;
      if (await nextBtn.isEnabled().catch(() => false)) {
        await nextBtn.click();
      }
    }
    await expect(firstOption).toHaveAttribute("aria-checked", "true", { timeout: 15000 });

    // Submit the attempt
    const submitBtn = page.getByRole("button", { name: /Finish & Submit/i });
    const [submitRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/attempts/${attemptId}/submit`) && res.request().method() === "POST"
      ),
      submitBtn.click(),
    ]);
    expect(submitRes.status()).toBe(200);

    // Review modal opens with results
    await expect(page.getByRole("button", { name: /Close Review/i })).toBeVisible({ timeout: 15000 });

    // Cross-user isolation: a second learner must receive 403 on the first learner's attempt
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    try {
      const otherStudent = generateTestStudent("rn");
      await registerStudentUI(otherPage, otherStudent);
      const crossUserStatus = await otherPage.evaluate(async (id) => {
        const res = await fetch(`/api/attempts/${encodeURIComponent(id)}`);
        return res.status;
      }, attemptId);
      expect([403, 404]).toContain(crossUserStatus);
    } finally {
      await otherContext.close();
    }
  });
});

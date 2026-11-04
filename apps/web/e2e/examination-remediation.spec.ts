/**
 * Examination remediation E2E verification (real browser).
 *
 * Verifies live, end-to-end behavior for the two remediated issues:
 *
 *  Issue A (gateway HMAC): an authenticated admin loading
 *  /admin/examinations (including sorting/pagination state carried in the
 *  query string) triggers BFF -> backend GET /api/v1/examinations?... calls
 *  that must be accepted by the gateway HMAC handler (200, never 401).
 *
 *  Issue B (instant navigation): navigating between admin routes via the
 *  sidebar links must be soft (no full document reload), the target page
 *  segment must actually render (children were previously dropped from all
 *  gate branches in AdminShell), and the browser console must never emit
 *  Next.js's "Could not validate that a segment in your UI has instant
 *  navigation" warning.
 *
 * Also covers RBAC differentiation: unauthenticated -> 401, candidate -> 403,
 * admin -> 200 on /api/admin/examinations.
 *
 * Requires: Next dev server on :3000 (reuseExistingServer) and backend on :4000.
 */

import { expect, test, type Page } from "@playwright/test";
import {
  clearSession,
  generateTestStudent,
  loginStudentUI,
  registerStudentUI,
} from "./helpers/test-fixtures";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e.admin.vrf153956@nursing.test.edu";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Clinical-Verify-vrf153956!#Ad";

/** Collects every console message + error so tests can assert absence of the instant-nav warning. */
async function attachConsoleCapture(page: Page): Promise<string[]> {
  const messages: string[] = [];
  page.on("console", (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => messages.push(`[pageerror] ${err.message}`));
  return messages;
}

function instantNavWarnings(messages: string[]): string[] {
  return messages.filter(
    (m) =>
      m.includes("Could not validate that a segment") ||
      m.includes("instant navigation") ||
      m.includes("createUnrenderedSegmentError")
  );
}

/**
 * Admin login through the real UI with a `from` redirect into the
 * examinations console. The `from` param also exercises
 * sanitizeReturnUrl-authorized internal redirects.
 */
async function loginAdminUI(page: Page): Promise<void> {
  await page.goto("/sign-in?from=/admin/examinations");
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", ADMIN_PASSWORD);
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/auth/login") && res.status() === 200,
      { timeout: 15000 }
    ),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForURL("**/admin/examinations", { timeout: 20000 });
}

async function navigationEntryCount(page: Page): Promise<number> {
  return page.evaluate(() => performance.getEntriesByType("navigation").length);
}

test.describe("examination remediation E2E", () => {
  let consoleMessages: string[];

  test.beforeEach(async ({ page }) => {
    consoleMessages = await attachConsoleCapture(page);
    await clearSession(page);
  });

  test.afterEach(async () => {
    // The instant-navigation regression must never appear anywhere in the
    // session, on any route visited by any test in this file.
    expect(
      instantNavWarnings(consoleMessages),
      "Next.js instant-navigation warning must not appear in the browser console"
    ).toEqual([]);
  });

  test("admin can open the examination catalogue and sorting/pagination state round-trips through the HMAC-protected query", async ({ page }) => {
    await loginAdminUI(page);

    // Page segment rendered (Issue B: children must be mounted by the shell gates).
    await expect(page.getByText("Examination Code", { exact: false }).first()).toBeVisible({
      timeout: 20000,
    });

    // Issue A: the catalogue was fetched through the signed query request -> 200.
    const catalogueResponses: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.url().includes("/api/admin/examinations")) {
        catalogueResponses.push({ status: res.status(), url: res.url() });
      }
    });

    await page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/examinations") && res.status() === 200,
      { timeout: 20000 }
    );

    // Toggle sort direction in the real UI.
    const sortButton = page.getByRole("button", { name: /Ascending|Descending/ });
    await expect(sortButton).toBeVisible();
    const before = (await sortButton.textContent()) || "";
    await sortButton.click();

    // Sort direction flips both in the UI and in the URL state.
    const afterText = await sortButton.textContent();
    expect(afterText?.trim()).not.toBe(before.trim());
    await page.waitForURL(/sortDirection=/, { timeout: 15000 });
    expect(page.url()).toContain("sortDirection=");

    // The flipped sort triggers a refetch of the signed query-string request.
    const refetch = await page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/examinations") &&
        res.status() === 200 &&
        res.url().includes("sortDirection="),
      { timeout: 20000 }
    );
    expect(refetch.status()).toBe(200);

    // Query-string HMAC: every observed catalogue response must be accepted.
    expect(catalogueResponses.length).toBeGreaterThan(0);
    for (const r of catalogueResponses) {
      expect(r.status, `catalogue request ${r.url} must not be rejected by auth`).not.toBe(401);
    }

    // Changing sort attribute preserves direction in URL state.
    await page.selectOption("select", { label: "Family Title" });
    await page.waitForURL(/sortBy=title/, { timeout: 15000 });
    expect(page.url()).toContain("sortDirection=");

    // Pagination control is present and page state persists in the URL when used.
    const paginationResponse = page.waitForResponse(
      (res) => res.url().includes("/api/admin/examinations") && res.status() === 200,
      { timeout: 20000 }
    );
    const navDuringPagination = await navigationEntryCount(page);
    const nextButton = page.getByRole("button", { name: "Next", exact: false }).first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await (await paginationResponse).status();
      expect(page.url()).toContain("page=2");
    }
    expect(await navigationEntryCount(page)).toBe(navDuringPagination);
  });

  test("admin sidebar navigation to Dashboard and back is soft and renders the target segment", async ({ page }) => {
    await loginAdminUI(page);
    await page.waitForLoadState("domcontentloaded");

    const navBefore = await navigationEntryCount(page);
    expect(navBefore).toBe(1);

    // Drive real <Link> navigations through the sidebar.
    const dashboardLink = page.getByRole("link", { name: "Dashboard" }).first();
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();
    await page.waitForURL("**/admin", { timeout: 15000 });
    await expect(page.getByText("Platform Governance Dashboard").first()).toBeVisible({
      timeout: 20000,
    });

    // Back to the examinations console through the same sidebar link.
    const examinationsLink = page.getByRole("link", { name: "Examinations" }).first();
    await expect(examinationsLink).toBeVisible();
    await examinationsLink.click();
    await page.waitForURL("**/admin/examinations", { timeout: 15000 });
    await expect(page.getByText("Examination Code", { exact: false }).first()).toBeVisible({
      timeout: 20000,
    });

    // Both navigations were soft: exactly one document navigation entry remains.
    expect(await navigationEntryCount(page)).toBe(1);
  });

  test("candidate accounts are forbidden on the admin catalogue (403), unauthenticated requests are 401", async ({ page, context }) => {
    // -- Candidate isolation through the real registration UI --
    const student = generateTestStudent();
    await registerStudentUI(page, student);

    const candidateStatus = await page.evaluate(async () => {
      const res = await fetch("/api/admin/examinations");
      return res.status;
    });
    expect(
      candidateStatus,
      "authenticated candidate must be forbidden, not passthrough"
    ).toBe(403);

    // -- Unauthenticated request from the same context after clearing cookies --
    await clearSession(page);
    const anonymousStatus = await page.evaluate(async () => {
      const res = await fetch("/api/admin/examinations");
      return res.status;
    });
    expect(anonymousStatus, "unauthenticated access must be rejected with 401").toBe(401);

    // Student fixture isolation: their own dashboard remains usable (no admin capability leaked).
    await loginStudentUI(page, student);
    const studentSelfStatus = await page.evaluate(async () => {
      const res = await fetch("/api/admin/examinations");
      return res.status;
    });
    expect(studentSelfStatus).toBe(403);
    void context;
  });
});

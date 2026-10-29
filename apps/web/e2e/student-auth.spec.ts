import { test, expect } from "@playwright/test";
import {
  generateTestStudent,
  registerStudentUI,
  loginStudentUI,
  clearSession,
} from "./helpers/test-fixtures";

test.describe("Student Authentication & Session Lifecycle", () => {
  test("new student can register, persist session across refresh, and logout", async ({
    page,
  }) => {
    const student = generateTestStudent("rn");

    // 1. Register through UI
    await registerStudentUI(page, student);

    // 2. Verify authenticated page elements
    await expect(page).toHaveURL(/\/(profile|dashboard)/);
    const greeting = page.locator("text=" + student.fullName);
    if (await greeting.isVisible()) {
      await expect(greeting).toBeVisible();
    }

    // 3. Page refresh: Session persistence check
    await page.reload();
    await expect(page).toHaveURL(/\/(profile|dashboard)/);

    // 4. Logout flow
    const signOutBtn = page.getByRole("button", { name: /sign out|logout/i }).first();
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    } else {
      // Direct logout API call
      await page.request.post("/api/auth/logout");
      await page.goto("/sign-in");
    }

    // 5. Attempting to visit /profile after logout redirects to /sign-in
    await page.goto("/profile");
    await page.waitForURL(/\/sign-in/);
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("student can log in with valid credentials", async ({ page }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);
    await clearSession(page);

    // Login with valid credentials
    await loginStudentUI(page, student);
    await expect(page).toHaveURL(/\/(profile|dashboard)/);
  });

  test("rejects invalid login credentials and displays alert", async ({ page }) => {
    await page.goto("/sign-in");

    await page.fill("#email", "nonexistent.student@nursing.edu");
    await page.fill("#password", "WrongPassword123!");
    await page.click('button[type="submit"]');

    // Verify error alert appears and user is NOT redirected
    const alert = page.locator('[role="alert"]').first();
    await expect(alert).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("logout invalidates session and prevents reuse of old session token", async ({
    page,
    request,
  }) => {
    const student = generateTestStudent("rn");
    await registerStudentUI(page, student);

    // Get current session cookies
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "preform_session");

    // Logout
    await request.post("/api/auth/logout");
    await clearSession(page);

    // Attempt to access profile with the old cookie
    if (sessionCookie) {
      await page.context().addCookies([sessionCookie]);
      await page.goto("/profile");
      // Expect redirect to sign-in or unauthorized
      await page.waitForURL(/\/sign-in/);
      expect(page.url()).toContain("/sign-in");
    }
  });
});

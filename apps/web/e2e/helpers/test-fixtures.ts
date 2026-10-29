import type { Page } from "@playwright/test";

export interface TestStudent {
  fullName: string;
  email: string;
  password: string;
  pathway: "rn" | "pn";
}

/**
 * Generates an isolated candidate test fixture with safe credentials.
 */
export function generateTestStudent(pathway: "rn" | "pn" = "rn"): TestStudent {
  const nonce = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    fullName: `Test Student ${nonce}`,
    email: `student_${nonce}@nursing.test.edu`,
    password: `Nurs1ng!Pass_${nonce}`,
    pathway,
  };
}

/**
 * Performs student registration flow through the browser UI.
 */
export async function registerStudentUI(page: Page, student: TestStudent): Promise<void> {
  await page.goto("/sign-up");

  // Fill registration form using accessible stable selectors
  await page.fill("#fullName", student.fullName);
  await page.fill("#email", student.email);

  // Select examination pathway if PN requested
  if (student.pathway === "pn") {
    const pnRadio = page.locator('button[role="radio"]').filter({ hasText: "NCLEX-PN" });
    if (await pnRadio.isVisible()) {
      await pnRadio.click();
    }
  }

  await page.fill("#password", student.password);

  // Accept terms and conditions
  const termsCheckbox = page.locator("#terms, input[type='checkbox']").first();
  if (await termsCheckbox.isVisible()) {
    await termsCheckbox.check();
  }

  // Submit registration form
  await page.click('button[type="submit"]');

  // Verify redirected to authenticated destination (profile or dashboard)
  await page.waitForURL(/\/(profile|dashboard|study-guide)/, { timeout: 15000 });
}

/**
 * Performs student login flow through the browser UI.
 */
export async function loginStudentUI(page: Page, student: TestStudent): Promise<void> {
  await page.goto("/sign-in");

  await page.fill("#email", student.email);
  await page.fill("#password", student.password);

  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(profile|dashboard|study-guide)/, { timeout: 15000 });
}

/**
 * Clears session and local storage to simulate complete sign-out.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore in contexts without window storage
    }
  });
}

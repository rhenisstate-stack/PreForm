# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-auth.spec.ts >> Student Authentication & Session Lifecycle >> rejects invalid login credentials and displays alert
- Location: e2e\student-auth.spec.ts:54:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[role="alert"]').first()
Expected: visible
Timeout: 7000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[role="alert"]').first() with timeout 7000ms
  - waiting for locator('[role="alert"]').first()

```

```yaml
- main:
  - link "PrepFord home":
    - /url: /
    - img "PrepFord logo"
    - text: Prep Ford
  - img
  - text: Clinical Preparation Studio
  - heading "Your journey to nursing excellence continues here." [level=1]
  - paragraph: Access your candidate dashboard, resume clinical judgment case studies, and measure domain readiness across the NCLEX-RN and NCLEX-PN client needs categories.
  - img
  - text: Normal Sinus Rhythm (NSR) • 72 BPM Isoelectric P-QRS-T
  - img
  - heading "NGN Case Studies" [level=3]
  - text: Client Needs
  - paragraph: Bowtie, matrix, and 6-item unfolding clinical cases mapped to the NCSBN Clinical Judgment Model.
  - img
  - heading "Readiness Assessment" [level=3]
  - text: Telemetry
  - paragraph: Transparent difficulty signals and knowledge-gap identification with zero fabricated pass claims.
  - img
  - text: Independent Nursing Education Platform • RN & PN Pathways
  - link "Terms":
    - /url: /terms-and-conditions
  - text: •
  - link "Privacy":
    - /url: /privacy-policy
  - text: •
  - link "Support":
    - /url: /contact
  - button "Change theme":
    - img
    - text: Toggle theme (system)
  - heading "Sign in to your account" [level=2]
  - paragraph: Enter your registered email and password to access your study portal.
  - button "Continue with Google"
  - text: Or continue with email Email address
  - img
  - textbox "Email address":
    - /placeholder: name@example.com
  - text: Password
  - button "Forgot password?"
  - img
  - textbox "Password":
    - /placeholder: Enter your password
  - button "Show password":
    - img
  - checkbox "Remember this device"
  - text: Remember this device
  - button "Sign in":
    - text: Sign in
    - img
  - paragraph:
    - text: Don’t have an account yet?
    - link "Create an account":
      - /url: /sign-up
  - text: By signing in, you agree to our
  - link "Terms of Service":
    - /url: /terms-and-conditions
  - text: and
  - link "Privacy Policy":
    - /url: /privacy-policy
  - text: .
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import {
  3  |   generateTestStudent,
  4  |   registerStudentUI,
  5  |   loginStudentUI,
  6  |   clearSession,
  7  | } from "./helpers/test-fixtures";
  8  | 
  9  | test.describe("Student Authentication & Session Lifecycle", () => {
  10 |   test("new student can register, persist session across refresh, and logout", async ({
  11 |     page,
  12 |   }) => {
  13 |     const student = generateTestStudent("rn");
  14 | 
  15 |     // 1. Register through UI
  16 |     await registerStudentUI(page, student);
  17 | 
  18 |     // 2. Verify authenticated page elements
  19 |     await expect(page).toHaveURL(/\/(profile|dashboard)/);
  20 |     const greeting = page.locator("text=" + student.fullName).first();
  21 |     if (await greeting.isVisible()) {
  22 |       await expect(greeting).toBeVisible();
  23 |     }
  24 | 
  25 |     // 3. Page refresh: Session persistence check
  26 |     await page.reload();
  27 |     await expect(page).toHaveURL(/\/(profile|dashboard)/);
  28 | 
  29 |     // 4. Logout flow
  30 |     const signOutBtn = page.getByRole("button", { name: /sign out|logout/i }).first();
  31 |     if (await signOutBtn.isVisible()) {
  32 |       await signOutBtn.click();
  33 |     } else {
  34 |       // Direct logout API call
  35 |       await page.request.post("/api/auth/logout");
  36 |       await page.goto("/sign-in");
  37 |     }
  38 | 
  39 |     // 5. Attempting to visit /profile after logout displays sign in required gate
  40 |     await page.goto("/profile");
  41 |     await expect(page.getByRole("heading", { name: /Sign In Required/i }).or(page.getByText(/Sign In Required/i)).first()).toBeVisible({ timeout: 10000 });
  42 |   });
  43 | 
  44 |   test("student can log in with valid credentials", async ({ page }) => {
  45 |     const student = generateTestStudent("rn");
  46 |     await registerStudentUI(page, student);
  47 |     await clearSession(page);
  48 | 
  49 |     // Login with valid credentials
  50 |     await loginStudentUI(page, student);
  51 |     await expect(page).toHaveURL(/\/(profile|dashboard)/);
  52 |   });
  53 | 
  54 |   test("rejects invalid login credentials and displays alert", async ({ page }) => {
  55 |     await page.goto("/sign-in");
  56 | 
  57 |     await page.fill("#email", "nonexistent.student@nursing.edu");
  58 |     await page.fill("#password", "WrongPassword123!");
  59 |     await page.click('button[type="submit"]');
  60 | 
  61 |     // Verify error alert appears and user is NOT redirected
  62 |     const alert = page.locator('[role="alert"]').first();
> 63 |     await expect(alert).toBeVisible();
     |                         ^ Error: expect(locator).toBeVisible() failed
  64 |     await expect(page).toHaveURL(/\/sign-in/);
  65 |   });
  66 | 
  67 |   test("logout invalidates session and prevents reuse of old session token", async ({
  68 |     page,
  69 |   }) => {
  70 |     const student = generateTestStudent("rn");
  71 |     await registerStudentUI(page, student);
  72 | 
  73 |     // Get current session cookies
  74 |     const cookies = await page.context().cookies();
  75 |     const sessionCookie = cookies.find((c) => c.name === "preform_session");
  76 | 
  77 |     // Logout with active authenticated browser session
  78 |     await page.evaluate(async () => {
  79 |       await fetch("/api/auth/logout", { method: "POST" });
  80 |     });
  81 |     await clearSession(page);
  82 | 
  83 |     // Attempt to access profile with the old cookie
  84 |     if (sessionCookie) {
  85 |       await page.context().addCookies([sessionCookie]);
  86 |       await page.goto("/profile");
  87 |       await expect(page.getByRole("heading", { name: /Sign In Required/i }).or(page.getByText(/Sign In Required/i)).first()).toBeVisible({ timeout: 10000 });
  88 |     }
  89 |   });
  90 | });
  91 | 
```
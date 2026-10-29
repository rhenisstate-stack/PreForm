# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac-access.spec.ts >> Role-Based Access Control (RBAC) Enforcement >> unauthenticated visitor cannot access protected candidate pages
- Location: e2e\rbac-access.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Sign In Required/i }).or(getByText(/Sign In Required/i)).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Sign In Required/i }).or(getByText(/Sign In Required/i)).first() with timeout 10000ms
  - waiting for getByRole('heading', { name: /Sign In Required/i }).or(getByText(/Sign In Required/i)).first()

```

```yaml
- banner:
  - link "PrepFord home":
    - /url: /
    - img "PrepFord logo"
    - text: Prep Ford
  - navigation "Main Navigation":
    - navigation "Main":
      - list:
        - listitem:
          - button "Nursing":
            - text: Nursing
            - img
        - listitem:
          - link "Study Guide":
            - /url: /study-guide
          - button "Open Study Guide menu":
            - img
        - listitem:
          - link "Products & Pricing":
            - /url: /subscriptions
          - button "Open Products & Pricing menu":
            - img
        - listitem:
          - button "More":
            - text: More
            - img
  - button "Change theme":
    - img
    - text: Toggle theme (system)
  - link "Sign in":
    - /url: /sign-in
  - link "Create account":
    - /url: /sign-up
- main:
  - paragraph: Checking authentication session...
- contentinfo:
  - link "PrepFord home":
    - /url: /
    - img "PrepFord logo"
    - text: Prep Ford
  - paragraph: An independent, clinically grounded examination preparation platform dedicated to helping nursing candidates succeed on the NCLEX-RN® and NCLEX-PN® licensure exams.
  - paragraph: Connect With Us
  - link "Follow PrepFord on LinkedIn":
    - /url: https://www.linkedin.com/company/prepford
    - img
  - link "Follow PrepFord on X (formerly Twitter)":
    - /url: https://x.com/prepford
    - img
  - link "Follow PrepFord on YouTube":
    - /url: https://www.youtube.com/@prepford
    - img
  - link "Follow PrepFord on Facebook":
    - /url: https://www.facebook.com/prepford
    - img
  - heading "NCLEX Pathways" [level=3]
  - list:
    - listitem:
      - link "NCLEX-RN Overview":
        - /url: /nclex-rn
    - listitem:
      - link "NCLEX-PN Overview":
        - /url: /nclex-pn
    - listitem:
      - link "Course Catalogue":
        - /url: /courses
    - listitem:
      - link "Practice Questions":
        - /url: /courses?type=practice
    - listitem:
      - link "Subscription Plans":
        - /url: /subscriptions
    - listitem:
      - link "Create Account":
        - /url: /sign-up
  - heading "Learning Resources" [level=3]
  - list:
    - listitem:
      - link "Study Guide & Notes":
        - /url: /study-guide
    - listitem:
      - link "Blog & Learning Hub":
        - /url: /blog
    - listitem:
      - link "Platform Features":
        - /url: /features
    - listitem:
      - link "Readiness Assessments":
        - /url: /courses
    - listitem:
      - link "Candidate Testimonials":
        - /url: /testimonials
    - listitem:
      - link "Exam Preparation FAQs":
        - /url: /faq
  - heading "Support & Community" [level=3]
  - list:
    - listitem:
      - link "Help & FAQs":
        - /url: /faq
    - listitem:
      - link "Contact Us":
        - /url: /contact
    - listitem:
      - link "For Nursing Educators":
        - /url: /educators
    - listitem:
      - link "Candidate Portal Login":
        - /url: /sign-in
  - heading "Legal & Governance" [level=3]
  - list:
    - listitem:
      - link "Terms and Conditions":
        - /url: /terms-and-conditions
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy-policy
    - listitem:
      - link "About PrepFord":
        - /url: /about
  - paragraph:
    - strong: "Official Examination Disclaimer:"
    - text: PrepFord is an independent test preparation and educational platform. NCLEX-RN® and NCLEX-PN® are registered trademarks of the National Council of State Boards of Nursing, Inc. (NCSBN). PrepFord is not affiliated with, sponsored by, or endorsed by the National Council of State Boards of Nursing, Inc. Diagnostic readiness indicators are signals based on practice performance and do not guarantee an official examination pass result.
  - paragraph: © 2026 PrepFord. All rights reserved.
  - link "Terms of Use":
    - /url: /terms-and-conditions
  - link "Privacy Policy":
    - /url: /privacy-policy
  - link "Support":
    - /url: /contact
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { generateTestStudent, registerStudentUI, clearSession } from "./helpers/test-fixtures";
  3  | 
  4  | test.describe("Role-Based Access Control (RBAC) Enforcement", () => {
  5  |   test("unauthenticated visitor cannot access protected candidate pages", async ({ page }) => {
  6  |     // Visiting /profile directly presents the authentication gate
  7  |     await page.goto("/profile");
> 8  |     await expect(page.getByRole("heading", { name: /Sign In Required/i }).or(page.getByText(/Sign In Required/i)).first()).toBeVisible({ timeout: 10000 });
     |                                                                                                                            ^ Error: expect(locator).toBeVisible() failed
  9  |     await expect(page.getByRole("link", { name: /Sign In/i }).first()).toBeVisible();
  10 | 
  11 |     // Visiting /dashboard directly presents the unauthenticated sign-in CTA
  12 |     await page.goto("/dashboard");
  13 |     await expect(page.getByRole("link", { name: /Sign in/i }).first()).toBeVisible({ timeout: 10000 });
  14 |   });
  15 | 
  16 |   test("unauthenticated API request to /api/profile returns 401", async ({ request }) => {
  17 |     const response = await request.get("/api/profile");
  18 |     expect(response.status()).toBe(401);
  19 |   });
  20 | 
  21 |   test("unauthenticated API request to /api/admin/subscriptions returns 401", async ({ request }) => {
  22 |     const response = await request.get("/api/admin/subscriptions");
  23 |     expect(response.status()).toBe(401);
  24 |   });
  25 | 
  26 |   test("student candidate cannot access administrative pages or administrative APIs", async ({
  27 |     page,
  28 |   }) => {
  29 |     const student = generateTestStudent("rn");
  30 |     await registerStudentUI(page, student);
  31 | 
  32 |     // 1. Direct browser navigation to /admin or /admin/subscriptions
  33 |     await page.goto("/admin");
  34 |     // Should be redirected away or forbidden (e.g. redirected to /dashboard or /profile or 403)
  35 |     await page.waitForTimeout(1000);
  36 |     const currentUrl = page.url();
  37 |     expect(currentUrl).not.toContain("/admin/dashboard");
  38 | 
  39 |     // 2. Direct HTTP request from candidate to admin subscriptions API receives 403 Forbidden
  40 |     const adminApiRes = await page.request.get("/api/admin/subscriptions");
  41 |     expect([401, 403]).toContain(adminApiRes.status());
  42 | 
  43 |     // 3. Candidate attempting to create a subscription plan via POST receives 403 Forbidden
  44 |     const createPlanRes = await page.request.post("/api/admin/subscriptions", {
  45 |       data: {
  46 |         code: "HACKED-PLAN",
  47 |         name: "Free Unauthorized Plan",
  48 |         priceCents: 0,
  49 |         interval: 1,
  50 |       },
  51 |     });
  52 |     expect([401, 403]).toContain(createPlanRes.status());
  53 |   });
  54 | 
  55 |   test("candidate cannot escalate role or grant admin rights via profile updates", async ({
  56 |     page,
  57 |   }) => {
  58 |     const student = generateTestStudent("rn");
  59 |     await registerStudentUI(page, student);
  60 | 
  61 |     // Attempting to send { role: "admin", activePlan: "all-access" } via profile API
  62 |     const res = await page.request.put("/api/profile", {
  63 |       data: {
  64 |         displayName: "Hacked Candidate",
  65 |         role: "admin",
  66 |         activePlan: "NCLEX-RN & PN All-Access",
  67 |       },
  68 |     });
  69 | 
  70 |     // Server must reject with 403 Forbidden
  71 |     expect(res.status()).toBe(403);
  72 |   });
  73 | });
  74 | 
```
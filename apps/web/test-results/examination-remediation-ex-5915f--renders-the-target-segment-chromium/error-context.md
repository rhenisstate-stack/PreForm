# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: examination-remediation.spec.ts >> examination remediation E2E >> admin sidebar navigation to Dashboard and back is soft and renders the target segment
- Location: e2e\examination-remediation.spec.ts:162:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: page.waitForResponse: Timeout 15000ms exceeded while waiting for event "response"
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - main [ref=f1e2]:
    - generic [ref=f1e3]:
      - generic [ref=f1e4]:
        - generic [ref=f1e5]:
          - generic [ref=f1e6]:
            - link "PrepFord home" [ref=f1e7] [cursor=pointer]:
              - /url: /
              - img "PrepFord logo" [ref=f1e9]
              - generic [ref=f1e10]:
                - generic [ref=f1e11]: Prep
                - generic [ref=f1e12]: Ford
            - generic [ref=f1e13]: Clinical Preparation Studio
          - generic [ref=f1e18]:
            - heading "Your journey to nursing excellence continues here." [level=1] [ref=f1e19]
            - paragraph [ref=f1e20]: Access your candidate dashboard, resume clinical judgment case studies, and measure domain readiness across the NCLEX-RN and NCLEX-PN client needs categories.
        - generic [ref=f1e21]:
          - generic [ref=f1e23]:
            - generic [ref=f1e24]: Normal Sinus Rhythm (NSR) • 72 BPM
            - generic [ref=f1e28]: Isoelectric P-QRS-T
          - generic [ref=f1e33]:
            - generic [ref=f1e41]:
              - generic [ref=f1e42]:
                - heading "NGN Case Studies" [level=3] [ref=f1e43]
                - generic [ref=f1e44]: Client Needs
              - paragraph [ref=f1e45]: Bowtie, matrix, and 6-item unfolding clinical cases mapped to the NCSBN Clinical Judgment Model.
            - generic [ref=f1e52]:
              - generic [ref=f1e53]:
                - heading "Readiness Assessment" [level=3] [ref=f1e54]
                - generic [ref=f1e55]: Telemetry
              - paragraph [ref=f1e56]: Transparent difficulty signals and knowledge-gap identification with zero fabricated pass claims.
        - generic [ref=f1e57]:
          - generic [ref=f1e58]: Independent Nursing Education Platform • RN & PN Pathways
          - generic [ref=f1e63]:
            - link "Terms" [ref=f1e64] [cursor=pointer]:
              - /url: /terms-and-conditions
            - generic [ref=f1e65]: •
            - link "Privacy" [ref=f1e66] [cursor=pointer]:
              - /url: /privacy-policy
            - generic [ref=f1e67]: •
            - link "Support" [ref=f1e68] [cursor=pointer]:
              - /url: /contact
      - generic [ref=f1e69]:
        - button "Change theme" [ref=f1e72]:
          - generic [ref=f1e75]: Toggle theme (system)
        - generic [ref=f1e76]:
          - generic [ref=f1e77]:
            - heading "Sign in to your account" [level=2] [ref=f1e78]
            - paragraph [ref=f1e79]: Enter your registered email and password to access your study portal.
          - button "Continue with Google" [ref=f1e81] [cursor=pointer]
          - generic [ref=f1e88]: Or continue with email
          - generic [ref=f1e93]:
            - generic [ref=f1e94]:
              - generic [ref=f1e95]: Email address
              - textbox "Email address" [ref=f1e97]:
                - /placeholder: name@example.com
            - generic [ref=f1e98]:
              - generic [ref=f1e99]:
                - generic [ref=f1e100]: Password
                - button "Forgot password?" [ref=f1e101]
              - generic [ref=f1e102]:
                - textbox "Password" [ref=f1e103]:
                  - /placeholder: Enter your password
                - button "Show password" [ref=f1e104]
            - generic [ref=f1e109] [cursor=pointer]:
              - checkbox "Remember this device" [ref=f1e110]
              - generic [ref=f1e111]: Remember this device
            - button "Sign in" [ref=f1e112]
          - paragraph [ref=f1e115]:
            - text: Don’t have an account yet?
            - link "Create an account" [ref=f1e116] [cursor=pointer]:
              - /url: /sign-up
        - generic [ref=f1e117]:
          - text: By signing in, you agree to our
          - link "Terms of Service" [ref=f1e118] [cursor=pointer]:
            - /url: /terms-and-conditions
          - text: and
          - link "Privacy Policy" [ref=f1e119] [cursor=pointer]:
            - /url: /privacy-policy
          - text: .
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | /**
  2   |  * Examination remediation E2E verification (real browser).
  3   |  *
  4   |  * Verifies live, end-to-end behavior for the two remediated issues:
  5   |  *
  6   |  *  Issue A (gateway HMAC): an authenticated admin loading
  7   |  *  /admin/examinations (including sorting/pagination state carried in the
  8   |  *  query string) triggers BFF -> backend GET /api/v1/examinations?... calls
  9   |  *  that must be accepted by the gateway HMAC handler (200, never 401).
  10  |  *
  11  |  *  Issue B (instant navigation): navigating between admin routes via the
  12  |  *  sidebar links must be soft (no full document reload), the target page
  13  |  *  segment must actually render (children were previously dropped from all
  14  |  *  gate branches in AdminShell), and the browser console must never emit
  15  |  *  Next.js's "Could not validate that a segment in your UI has instant
  16  |  *  navigation" warning.
  17  |  *
  18  |  * Also covers RBAC differentiation: unauthenticated -> 401, candidate -> 403,
  19  |  * admin -> 200 on /api/admin/examinations.
  20  |  *
  21  |  * Requires: Next dev server on :3000 (reuseExistingServer) and backend on :4000.
  22  |  */
  23  | 
  24  | import { expect, test, type Page } from "@playwright/test";
  25  | import {
  26  |   clearSession,
  27  |   generateTestStudent,
  28  |   loginStudentUI,
  29  |   registerStudentUI,
  30  | } from "./helpers/test-fixtures";
  31  | 
  32  | const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e.admin.vrf153956@nursing.test.edu";
  33  | const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Clinical-Verify-vrf153956!#Ad";
  34  | 
  35  | /** Collects every console message + error so tests can assert absence of the instant-nav warning. */
  36  | async function attachConsoleCapture(page: Page): Promise<string[]> {
  37  |   const messages: string[] = [];
  38  |   page.on("console", (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
  39  |   page.on("pageerror", (err) => messages.push(`[pageerror] ${err.message}`));
  40  |   return messages;
  41  | }
  42  | 
  43  | function instantNavWarnings(messages: string[]): string[] {
  44  |   return messages.filter(
  45  |     (m) =>
  46  |       m.includes("Could not validate that a segment") ||
  47  |       m.includes("instant navigation") ||
  48  |       m.includes("createUnrenderedSegmentError")
  49  |   );
  50  | }
  51  | 
  52  | /**
  53  |  * Admin login through the real UI with a `from` redirect into the
  54  |  * examinations console. The `from` param also exercises
  55  |  * sanitizeReturnUrl-authorized internal redirects.
  56  |  */
  57  | async function loginAdminUI(page: Page): Promise<void> {
  58  |   await page.goto("/sign-in?from=/admin/examinations");
  59  |   await page.fill("#email", ADMIN_EMAIL);
  60  |   await page.fill("#password", ADMIN_PASSWORD);
  61  |   await Promise.all([
> 62  |     page.waitForResponse(
      |          ^ TimeoutError: page.waitForResponse: Timeout 15000ms exceeded while waiting for event "response"
  63  |       (res) => res.url().includes("/api/auth/login") && res.status() === 200,
  64  |       { timeout: 15000 }
  65  |     ),
  66  |     page.click('button[type="submit"]'),
  67  |   ]);
  68  |   await page.waitForURL("**/admin/examinations", { timeout: 20000 });
  69  | }
  70  | 
  71  | async function navigationEntryCount(page: Page): Promise<number> {
  72  |   return page.evaluate(() => performance.getEntriesByType("navigation").length);
  73  | }
  74  | 
  75  | test.describe("examination remediation E2E", () => {
  76  |   let consoleMessages: string[];
  77  | 
  78  |   test.beforeEach(async ({ page }) => {
  79  |     consoleMessages = await attachConsoleCapture(page);
  80  |     await clearSession(page);
  81  |   });
  82  | 
  83  |   test.afterEach(async () => {
  84  |     // The instant-navigation regression must never appear anywhere in the
  85  |     // session, on any route visited by any test in this file.
  86  |     expect(
  87  |       instantNavWarnings(consoleMessages),
  88  |       "Next.js instant-navigation warning must not appear in the browser console"
  89  |     ).toEqual([]);
  90  |   });
  91  | 
  92  |   test("admin can open the examination catalogue and sorting/pagination state round-trips through the HMAC-protected query", async ({ page }) => {
  93  |     await loginAdminUI(page);
  94  | 
  95  |     // Page segment rendered (Issue B: children must be mounted by the shell gates).
  96  |     await expect(page.getByText("Examination Code", { exact: false }).first()).toBeVisible({
  97  |       timeout: 20000,
  98  |     });
  99  | 
  100 |     // Issue A: the catalogue was fetched through the signed query request -> 200.
  101 |     const catalogueResponses: Array<{ status: number; url: string }> = [];
  102 |     page.on("response", (res) => {
  103 |       if (res.url().includes("/api/admin/examinations")) {
  104 |         catalogueResponses.push({ status: res.status(), url: res.url() });
  105 |       }
  106 |     });
  107 | 
  108 |     await page.waitForResponse(
  109 |       (res) =>
  110 |         res.url().includes("/api/admin/examinations") && res.status() === 200,
  111 |       { timeout: 20000 }
  112 |     );
  113 | 
  114 |     // Toggle sort direction in the real UI.
  115 |     const sortButton = page.getByRole("button", { name: /Ascending|Descending/ });
  116 |     await expect(sortButton).toBeVisible();
  117 |     const before = (await sortButton.textContent()) || "";
  118 |     await sortButton.click();
  119 | 
  120 |     // Sort direction flips both in the UI and in the URL state.
  121 |     const afterText = await sortButton.textContent();
  122 |     expect(afterText?.trim()).not.toBe(before.trim());
  123 |     await page.waitForURL(/sortDirection=/, { timeout: 15000 });
  124 |     expect(page.url()).toContain("sortDirection=");
  125 | 
  126 |     // The flipped sort triggers a refetch of the signed query-string request.
  127 |     const refetch = await page.waitForResponse(
  128 |       (res) =>
  129 |         res.url().includes("/api/admin/examinations") &&
  130 |         res.status() === 200 &&
  131 |         res.url().includes("sortDirection="),
  132 |       { timeout: 20000 }
  133 |     );
  134 |     expect(refetch.status()).toBe(200);
  135 | 
  136 |     // Query-string HMAC: every observed catalogue response must be accepted.
  137 |     expect(catalogueResponses.length).toBeGreaterThan(0);
  138 |     for (const r of catalogueResponses) {
  139 |       expect(r.status, `catalogue request ${r.url} must not be rejected by auth`).not.toBe(401);
  140 |     }
  141 | 
  142 |     // Changing sort attribute preserves direction in URL state.
  143 |     await page.selectOption("select", { label: "Family Title" });
  144 |     await page.waitForURL(/sortBy=title/, { timeout: 15000 });
  145 |     expect(page.url()).toContain("sortDirection=");
  146 | 
  147 |     // Pagination control is present and page state persists in the URL when used.
  148 |     const paginationResponse = page.waitForResponse(
  149 |       (res) => res.url().includes("/api/admin/examinations") && res.status() === 200,
  150 |       { timeout: 20000 }
  151 |     );
  152 |     const navDuringPagination = await navigationEntryCount(page);
  153 |     const nextButton = page.getByRole("button", { name: "Next", exact: false }).first();
  154 |     if (await nextButton.isVisible().catch(() => false)) {
  155 |       await nextButton.click();
  156 |       await (await paginationResponse).status();
  157 |       expect(page.url()).toContain("page=2");
  158 |     }
  159 |     expect(await navigationEntryCount(page)).toBe(navDuringPagination);
  160 |   });
  161 | 
  162 |   test("admin sidebar navigation to Dashboard and back is soft and renders the target segment", async ({ page }) => {
```
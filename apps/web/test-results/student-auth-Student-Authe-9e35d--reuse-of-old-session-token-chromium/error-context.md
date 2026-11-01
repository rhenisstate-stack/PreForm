# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-auth.spec.ts >> Student Authentication & Session Lifecycle >> logout invalidates session and prevents reuse of old session token
- Location: e2e\student-auth.spec.ts:67:3

# Error details

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
            - generic [ref=f1e13]: Next Gen Licensure Ready
          - generic [ref=f1e18]:
            - heading "Your nursing future begins with the right preparation." [level=1] [ref=f1e19]
            - paragraph [ref=f1e20]: Build unshakeable testing confidence with verified Next Generation rationales, adaptive clinical simulations, and comprehensive RN and PN study tracks.
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
            - heading "Create your account" [level=2] [ref=f1e78]
            - paragraph [ref=f1e79]: Select your examination pathway and create your credentials to begin your study journey.
          - button "Continue with Google" [ref=f1e81] [cursor=pointer]
          - generic [ref=f1e88]: Or continue with email
          - generic [ref=f1e93]:
            - generic [ref=f1e94]:
              - generic [ref=f1e95]: Full name
              - textbox "Full name" [ref=f1e97]:
                - /placeholder: e.g. Jane Doe
            - generic [ref=f1e98]:
              - generic [ref=f1e99]: Email address
              - textbox "Email address" [ref=f1e101]:
                - /placeholder: name@example.com
            - generic [ref=f1e102]:
              - generic [ref=f1e103]: Examination pathway
              - radiogroup "Examination pathway" [ref=f1e104]:
                - radio "NCLEX-RN Registered Nurse" [checked] [ref=f1e105]:
                  - generic [ref=f1e106]: NCLEX-RN
                  - generic [ref=f1e111]: Registered Nurse
                - radio "NCLEX-PN Practical / Vocational" [ref=f1e112]:
                  - generic [ref=f1e113]: NCLEX-PN
                  - generic [ref=f1e115]: Practical / Vocational
            - generic [ref=f1e116]:
              - generic [ref=f1e117]: Create password
              - generic [ref=f1e118]:
                - textbox "Create password" [ref=f1e119]:
                  - /placeholder: At least 8 characters
                - button "Show password" [ref=f1e120]
            - generic [ref=f1e124]:
              - generic [ref=f1e125]: Confirm password
              - generic [ref=f1e126]:
                - textbox "Confirm password" [ref=f1e127]:
                  - /placeholder: Re-enter your password
                - button "Show password" [ref=f1e128]
            - generic [ref=f1e133] [cursor=pointer]:
              - checkbox "I agree to the Terms and Conditions and acknowledge the Privacy Policy." [ref=f1e134]
              - generic [ref=f1e135]:
                - text: I agree to the
                - link "Terms and Conditions" [ref=f1e136]:
                  - /url: /terms-and-conditions
                - text: and acknowledge the
                - link "Privacy Policy" [ref=f1e137]:
                  - /url: /privacy-policy
                - text: .
            - button "Create account" [ref=f1e138]
          - paragraph [ref=f1e141]:
            - text: Already have an account?
            - link "Sign in" [ref=f1e142] [cursor=pointer]:
              - /url: /sign-in
        - generic [ref=f1e143]:
          - text: Official NCLEX-RN® and NCLEX-PN® Candidate Portal •
          - link "Terms of Use" [ref=f1e144] [cursor=pointer]:
            - /url: /terms-and-conditions
          - text: •
          - link "Privacy Policy" [ref=f1e145] [cursor=pointer]:
            - /url: /privacy-policy
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import type { Page } from "@playwright/test";
  2   | 
  3   | export interface TestStudent {
  4   |   fullName: string;
  5   |   email: string;
  6   |   password: string;
  7   |   pathway: "rn" | "pn";
  8   | }
  9   | 
  10  | /**
  11  |  * Generates an isolated candidate test fixture with safe credentials.
  12  |  */
  13  | export function generateTestStudent(pathway: "rn" | "pn" = "rn"): TestStudent {
  14  |   const nonce = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  15  |   return {
  16  |     fullName: `Test Student ${nonce}`,
  17  |     email: `student_${nonce}@nursing.test.edu`,
  18  |     password: `Clinical-Secure-${nonce}!#Pass`,
  19  |     pathway,
  20  |   };
  21  | }
  22  | 
  23  | /**
  24  |  * Performs student registration flow through the browser UI.
  25  |  */
  26  | export async function registerStudentUI(page: Page, student: TestStudent): Promise<void> {
  27  |   await page.goto("/sign-up?from=/dashboard");
  28  | 
  29  |   // Fill registration form using accessible stable selectors
  30  |   await page.fill("#fullName", student.fullName);
  31  |   await page.fill("#email", student.email);
  32  | 
  33  |   // Select examination pathway if PN requested
  34  |   if (student.pathway === "pn") {
  35  |     const pnRadio = page.locator('button[role="radio"]').filter({ hasText: "NCLEX-PN" });
  36  |     if (await pnRadio.isVisible()) {
  37  |       await pnRadio.click();
  38  |     }
  39  |   }
  40  | 
  41  |   await page.fill("#password", student.password);
  42  | 
  43  |   // Accept terms and conditions
  44  |   const termsCheckbox = page.locator('input[name="agreeTerms"], input[type="checkbox"]').first();
  45  |   if (await termsCheckbox.isVisible()) {
  46  |     await termsCheckbox.check({ force: true });
  47  |   }
  48  | 
  49  |   // Submit registration form and await successful 200 response
  50  |   await Promise.all([
> 51  |     page.waitForResponse(
      |          ^ TimeoutError: page.waitForResponse: Timeout 15000ms exceeded while waiting for event "response"
  52  |       (res) => res.url().includes("/api/auth/register") && res.status() === 200,
  53  |       { timeout: 15000 }
  54  |     ),
  55  |     page.click('button[type="submit"]'),
  56  |   ]);
  57  | 
  58  |   // Verify redirected to authenticated destination pathname
  59  |   await page.waitForURL(
  60  |     (url) => ["/dashboard", "/courses", "/profile"].includes(url.pathname),
  61  |     { timeout: 15000 }
  62  |   );
  63  | }
  64  | 
  65  | /**
  66  |  * Performs student login flow through the browser UI.
  67  |  */
  68  | export async function loginStudentUI(page: Page, student: TestStudent): Promise<void> {
  69  |   await page.goto("/sign-in?from=/dashboard");
  70  | 
  71  |   await page.fill("#email", student.email);
  72  |   await page.fill("#password", student.password);
  73  | 
  74  |   // Submit login form and await successful 200 response
  75  |   await Promise.all([
  76  |     page.waitForResponse(
  77  |       (res) => res.url().includes("/api/auth/login") && res.status() === 200,
  78  |       { timeout: 15000 }
  79  |     ),
  80  |     page.click('button[type="submit"]'),
  81  |   ]);
  82  | 
  83  |   await page.waitForURL(
  84  |     (url) => ["/dashboard", "/courses", "/profile"].includes(url.pathname),
  85  |     { timeout: 15000 }
  86  |   );
  87  | }
  88  | 
  89  | /**
  90  |  * Clears session and local storage to simulate complete sign-out.
  91  |  */
  92  | export async function clearSession(page: Page): Promise<void> {
  93  |   await page.context().clearCookies();
  94  |   try {
  95  |     if (page.url() !== "about:blank") {
  96  |       await page.evaluate(() => {
  97  |         try {
  98  |           localStorage.clear();
  99  |           sessionStorage.clear();
  100 |         } catch {
  101 |           // Ignore in contexts without window storage
  102 |         }
  103 |       });
  104 |     }
  105 |   } catch {
  106 |     // Ignore cross-origin or pre-navigation evaluations
  107 |   }
  108 | }
  109 | 
```
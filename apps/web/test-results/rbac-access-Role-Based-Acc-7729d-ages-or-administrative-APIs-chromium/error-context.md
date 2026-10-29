# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac-access.spec.ts >> Role-Based Access Control (RBAC) Enforcement >> student candidate cannot access administrative pages or administrative APIs
- Location: e2e\rbac-access.spec.ts:28:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - banner [ref=f1e2]:
    - generic [ref=f1e3]:
      - link "PrepFord home" [ref=f1e4] [cursor=pointer]:
        - /url: /
        - img "PrepFord logo" [ref=f1e5]
        - generic [ref=f1e6]:
          - generic [ref=f1e7]: Prep
          - generic [ref=f1e8]: Ford
      - navigation "Main Navigation" [ref=f1e9]:
        - navigation "Main" [ref=f1e10]:
          - list [ref=f1e12]:
            - listitem [ref=f1e13]:
              - button "Nursing" [ref=f1e14]
            - listitem [ref=f1e18]:
              - generic [ref=f1e19]:
                - link "Study Guide" [ref=f1e20] [cursor=pointer]:
                  - /url: /study-guide
                - button "Open Study Guide menu" [ref=f1e21]
            - listitem [ref=f1e24]:
              - generic [ref=f1e25]:
                - link "Products & Pricing" [ref=f1e26] [cursor=pointer]:
                  - /url: /subscriptions
                - button "Open Products & Pricing menu" [ref=f1e27]
            - listitem [ref=f1e30]:
              - button "More" [ref=f1e31]
      - generic [ref=f1e35]:
        - button "Change theme" [ref=f1e36]:
          - generic [ref=f1e39]: Toggle theme (system)
        - generic [ref=f1e40]:
          - link "Sign in" [ref=f1e41] [cursor=pointer]:
            - /url: /sign-in
          - link "Create account" [ref=f1e42] [cursor=pointer]:
            - /url: /sign-up
  - main [ref=f1e43]:
    - generic [ref=f1e44]:
      - generic [ref=f1e45]:
        - generic [ref=f1e46]:
          - link "PrepFord home" [ref=f1e47] [cursor=pointer]:
            - /url: /
            - img "PrepFord logo" [ref=f1e48]
            - generic [ref=f1e49]:
              - generic [ref=f1e50]: Prep
              - generic [ref=f1e51]: Ford
          - generic [ref=f1e52]: Comprehensive Licensure Preparation
          - heading "Structured preparation engineered for first-time pass rates." [level=1] [ref=f1e56]
          - paragraph [ref=f1e57]: Join nursing students preparing for RN and PN licensure with rigorous Next Gen practice, adaptive performance tracking, and verified clinical rationales.
          - generic [ref=f1e58]:
            - generic [ref=f1e64]:
              - heading "Targeted Examination Pathways" [level=3] [ref=f1e65]
              - paragraph [ref=f1e66]: Custom question pools tailored specifically to either NCLEX-RN or NCLEX-PN.
            - generic [ref=f1e72]:
              - heading "Clinical Judgment Mastery" [level=3] [ref=f1e73]
              - paragraph [ref=f1e74]: "NGN item formats: matrix, bowtie, drop-down, and 6-question clinical case studies."
            - generic [ref=f1e80]:
              - heading "Readiness Predictors" [level=3] [ref=f1e81]
              - paragraph [ref=f1e82]: Benchmark your category performance before stepping into the testing center.
        - generic [ref=f1e89]:
          - paragraph [ref=f1e90]: Free Trial Included
          - paragraph [ref=f1e91]: Test sample questions immediately after registration.
      - generic [ref=f1e93]:
        - generic [ref=f1e94]:
          - heading "Create your account" [level=2] [ref=f1e95]
          - paragraph [ref=f1e96]: Select your licensure track and register to begin your exam preparation.
        - button "Continue with Google" [ref=f1e98] [cursor=pointer]
        - generic [ref=f1e105]: Or continue with email
        - generic [ref=f1e110]:
          - generic [ref=f1e111]:
            - generic [ref=f1e112]: Full name
            - textbox "Full name" [ref=f1e114]:
              - /placeholder: e.g. Jane Doe
          - generic [ref=f1e115]:
            - generic [ref=f1e116]: Email address
            - textbox "Email address" [ref=f1e118]:
              - /placeholder: name@example.com
          - generic [ref=f1e119]:
            - generic [ref=f1e120]: Examination pathway
            - radiogroup "Examination pathway" [ref=f1e121]:
              - radio "NCLEX-RN Registered Nurse" [checked] [ref=f1e122]:
                - generic [ref=f1e123]: NCLEX-RN
                - generic [ref=f1e128]: Registered Nurse
              - radio "NCLEX-PN Practical / Vocational" [ref=f1e129]:
                - generic [ref=f1e130]: NCLEX-PN
                - generic [ref=f1e132]: Practical / Vocational
          - generic [ref=f1e133]:
            - generic [ref=f1e134]: Create password
            - generic [ref=f1e135]:
              - textbox "Create password" [ref=f1e136]:
                - /placeholder: At least 8 characters
              - button "Show password" [ref=f1e137]
          - generic [ref=f1e142] [cursor=pointer]:
            - checkbox "I agree to the Terms and Conditions and have read the Privacy Policy." [ref=f1e143]
            - generic [ref=f1e144]:
              - text: I agree to the
              - link "Terms and Conditions" [ref=f1e145]:
                - /url: /terms-and-conditions
              - text: and have read the
              - link "Privacy Policy" [ref=f1e146]:
                - /url: /privacy-policy
              - text: .
          - button "Create account" [ref=f1e147]
        - paragraph [ref=f1e150]:
          - text: Already have an account?
          - link "Sign in" [ref=f1e151] [cursor=pointer]:
            - /url: /sign-in
  - contentinfo [ref=f1e152]:
    - generic [ref=f1e153]:
      - generic [ref=f1e154]:
        - generic [ref=f1e155]:
          - link "PrepFord home" [ref=f1e156] [cursor=pointer]:
            - /url: /
            - img "PrepFord logo" [ref=f1e157]
            - generic [ref=f1e158]:
              - generic [ref=f1e159]: Prep
              - generic [ref=f1e160]: Ford
          - paragraph [ref=f1e161]: An independent, clinically grounded examination preparation platform dedicated to helping nursing candidates succeed on the NCLEX-RN® and NCLEX-PN® licensure exams.
          - generic [ref=f1e162]:
            - paragraph [ref=f1e163]: Connect With Us
            - generic [ref=f1e164]:
              - link "Follow PrepFord on LinkedIn" [ref=f1e165] [cursor=pointer]:
                - /url: https://www.linkedin.com/company/prepford
              - link "Follow PrepFord on X (formerly Twitter)" [ref=f1e170] [cursor=pointer]:
                - /url: https://x.com/prepford
              - link "Follow PrepFord on YouTube" [ref=f1e173] [cursor=pointer]:
                - /url: https://www.youtube.com/@prepford
              - link "Follow PrepFord on Facebook" [ref=f1e177] [cursor=pointer]:
                - /url: https://www.facebook.com/prepford
        - generic [ref=f1e180]:
          - generic [ref=f1e181]:
            - heading "NCLEX Pathways" [level=3] [ref=f1e182]
            - list [ref=f1e183]:
              - listitem [ref=f1e184]:
                - link "NCLEX-RN Overview" [ref=f1e185] [cursor=pointer]:
                  - /url: /nclex-rn
              - listitem [ref=f1e186]:
                - link "NCLEX-PN Overview" [ref=f1e187] [cursor=pointer]:
                  - /url: /nclex-pn
              - listitem [ref=f1e188]:
                - link "Course Catalogue" [ref=f1e189] [cursor=pointer]:
                  - /url: /courses
              - listitem [ref=f1e190]:
                - link "Practice Questions" [ref=f1e191] [cursor=pointer]:
                  - /url: /courses?type=practice
              - listitem [ref=f1e192]:
                - link "Subscription Plans" [ref=f1e193] [cursor=pointer]:
                  - /url: /subscriptions
              - listitem [ref=f1e194]:
                - link "Create Account" [ref=f1e195] [cursor=pointer]:
                  - /url: /sign-up
          - generic [ref=f1e196]:
            - heading "Learning Resources" [level=3] [ref=f1e197]
            - list [ref=f1e198]:
              - listitem [ref=f1e199]:
                - link "Study Guide & Notes" [ref=f1e200] [cursor=pointer]:
                  - /url: /study-guide
              - listitem [ref=f1e201]:
                - link "Blog & Learning Hub" [ref=f1e202] [cursor=pointer]:
                  - /url: /blog
              - listitem [ref=f1e203]:
                - link "Platform Features" [ref=f1e204] [cursor=pointer]:
                  - /url: /features
              - listitem [ref=f1e205]:
                - link "Readiness Assessments" [ref=f1e206] [cursor=pointer]:
                  - /url: /courses
              - listitem [ref=f1e207]:
                - link "Candidate Testimonials" [ref=f1e208] [cursor=pointer]:
                  - /url: /testimonials
              - listitem [ref=f1e209]:
                - link "Exam Preparation FAQs" [ref=f1e210] [cursor=pointer]:
                  - /url: /faq
          - generic [ref=f1e211]:
            - heading "Support & Community" [level=3] [ref=f1e212]
            - list [ref=f1e213]:
              - listitem [ref=f1e214]:
                - link "Help & FAQs" [ref=f1e215] [cursor=pointer]:
                  - /url: /faq
              - listitem [ref=f1e216]:
                - link "Contact Us" [ref=f1e217] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=f1e218]:
                - link "For Nursing Educators" [ref=f1e219] [cursor=pointer]:
                  - /url: /educators
              - listitem [ref=f1e220]:
                - link "Candidate Portal Login" [ref=f1e221] [cursor=pointer]:
                  - /url: /sign-in
          - generic [ref=f1e222]:
            - heading "Legal & Governance" [level=3] [ref=f1e223]
            - list [ref=f1e224]:
              - listitem [ref=f1e225]:
                - link "Terms and Conditions" [ref=f1e226] [cursor=pointer]:
                  - /url: /terms-and-conditions
              - listitem [ref=f1e227]:
                - link "Privacy Policy" [ref=f1e228] [cursor=pointer]:
                  - /url: /privacy-policy
              - listitem [ref=f1e229]:
                - link "About PrepFord" [ref=f1e230] [cursor=pointer]:
                  - /url: /about
      - generic [ref=f1e231]:
        - paragraph [ref=f1e233]:
          - strong [ref=f1e234]: "Official Examination Disclaimer:"
          - text: PrepFord is an independent test preparation and educational platform. NCLEX-RN® and NCLEX-PN® are registered trademarks of the National Council of State Boards of Nursing, Inc. (NCSBN). PrepFord is not affiliated with, sponsored by, or endorsed by the National Council of State Boards of Nursing, Inc. Diagnostic readiness indicators are signals based on practice performance and do not guarantee an official examination pass result.
        - generic [ref=f1e235]:
          - paragraph [ref=f1e236]: © 2026 PrepFord. All rights reserved.
          - generic [ref=f1e237]:
            - link "Terms of Use" [ref=f1e238] [cursor=pointer]:
              - /url: /terms-and-conditions
            - link "Privacy Policy" [ref=f1e239] [cursor=pointer]:
              - /url: /privacy-policy
            - link "Support" [ref=f1e240] [cursor=pointer]:
              - /url: /contact
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import type { Page } from "@playwright/test";
  2  | 
  3  | export interface TestStudent {
  4  |   fullName: string;
  5  |   email: string;
  6  |   password: string;
  7  |   pathway: "rn" | "pn";
  8  | }
  9  | 
  10 | /**
  11 |  * Generates an isolated candidate test fixture with safe credentials.
  12 |  */
  13 | export function generateTestStudent(pathway: "rn" | "pn" = "rn"): TestStudent {
  14 |   const nonce = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  15 |   return {
  16 |     fullName: `Test Student ${nonce}`,
  17 |     email: `student_${nonce}@nursing.test.edu`,
  18 |     password: `Nurs1ng!Pass_${nonce}`,
  19 |     pathway,
  20 |   };
  21 | }
  22 | 
  23 | /**
  24 |  * Performs student registration flow through the browser UI.
  25 |  */
  26 | export async function registerStudentUI(page: Page, student: TestStudent): Promise<void> {
  27 |   await page.goto("/sign-up?from=/dashboard");
  28 | 
  29 |   // Fill registration form using accessible stable selectors
  30 |   await page.fill("#fullName", student.fullName);
  31 |   await page.fill("#email", student.email);
  32 | 
  33 |   // Select examination pathway if PN requested
  34 |   if (student.pathway === "pn") {
  35 |     const pnRadio = page.locator('button[role="radio"]').filter({ hasText: "NCLEX-PN" });
  36 |     if (await pnRadio.isVisible()) {
  37 |       await pnRadio.click();
  38 |     }
  39 |   }
  40 | 
  41 |   await page.fill("#password", student.password);
  42 | 
  43 |   // Accept terms and conditions
  44 |   const termsCheckbox = page.locator('input[type="checkbox"]').first();
  45 |   if (await termsCheckbox.isVisible()) {
  46 |     await termsCheckbox.check();
  47 |   }
  48 | 
  49 |   // Submit registration form
  50 |   await page.click('button[type="submit"]');
  51 | 
  52 |   // Verify redirected to authenticated destination
> 53 |   await page.waitForURL(/\/(dashboard|courses|profile)/, { timeout: 15000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  54 | }
  55 | 
  56 | /**
  57 |  * Performs student login flow through the browser UI.
  58 |  */
  59 | export async function loginStudentUI(page: Page, student: TestStudent): Promise<void> {
  60 |   await page.goto("/sign-in?from=/dashboard");
  61 | 
  62 |   await page.fill("#email", student.email);
  63 |   await page.fill("#password", student.password);
  64 | 
  65 |   await page.click('button[type="submit"]');
  66 | 
  67 |   await page.waitForURL(/\/(dashboard|courses|profile)/, { timeout: 15000 });
  68 | }
  69 | 
  70 | /**
  71 |  * Clears session and local storage to simulate complete sign-out.
  72 |  */
  73 | export async function clearSession(page: Page): Promise<void> {
  74 |   await page.context().clearCookies();
  75 |   await page.evaluate(() => {
  76 |     try {
  77 |       localStorage.clear();
  78 |       sessionStorage.clear();
  79 |     } catch {
  80 |       // Ignore in contexts without window storage
  81 |     }
  82 |   });
  83 | }
  84 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac-access.spec.ts >> Role-Based Access Control (RBAC) Enforcement >> candidate cannot escalate role or grant admin rights via profile updates
- Location: e2e\rbac-access.spec.ts:55:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 401
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - complementary "Learner Workspace Navigation" [ref=e4]:
        - generic [ref=e5]:
          - link "PrepFord home" [ref=e6] [cursor=pointer]:
            - /url: /
            - img "PrepFord logo" [ref=e7]
            - generic [ref=e8]:
              - generic [ref=e9]: Prep
              - generic [ref=e10]: Ford
          - button "Collapse sidebar" [ref=e11]
        - generic [ref=e15]:
          - button "+ Create Test Now" [ref=e17]
          - generic [ref=e20]:
            - generic [ref=e21]: Learn
            - link "Dashboard" [ref=e22] [cursor=pointer]:
              - /url: /dashboard
            - link "NCLEX-RN" [ref=e27] [cursor=pointer]:
              - /url: /nclex-rn
            - link "NCLEX-PN" [ref=e32] [cursor=pointer]:
              - /url: /nclex-pn
            - link "Study Guides" [ref=e38] [cursor=pointer]:
              - /url: /study-guide
            - link "Practice Activities" [ref=e42] [cursor=pointer]:
              - /url: /courses
          - generic [ref=e47]:
            - generic [ref=e48]: Test Bank & Assessments
            - button "Tutored CATs" [ref=e49]
            - button "Readiness Tests (RAT)" [ref=e55]
            - link "Test-Taking Strategies" [ref=e60] [cursor=pointer]:
              - /url: /study-guide
          - generic [ref=e66]:
            - generic [ref=e67]: Reports
            - generic "Previous Tests" [ref=e68]:
              - generic [ref=e73]:
                - generic [ref=e74]: Previous Tests
                - generic [ref=e75]: Active
            - link "Statistics" [ref=e76] [cursor=pointer]:
              - /url: /profile
          - generic [ref=e79]:
            - generic [ref=e80]: Account
            - link "Profile & Settings" [ref=e81] [cursor=pointer]:
              - /url: /profile
            - link "Cart" [ref=e87] [cursor=pointer]:
              - /url: /cart
            - link "Learning Notes" [ref=e94] [cursor=pointer]:
              - /url: /study-guide
        - generic [ref=e100]:
          - generic [ref=e101]: TS
          - generic [ref=e102]:
            - paragraph [ref=e103]: Test Student 1793271972642_mw099
            - paragraph [ref=e104]: NCLEX-RN
      - generic [ref=e105]:
        - generic [ref=e106]:
          - navigation "Breadcrumbs" [ref=e108]:
            - link "Home" [ref=e109] [cursor=pointer]:
              - /url: /
            - generic [ref=e110]: /
            - generic [ref=e111]: Previous Tests
          - generic [ref=e112]:
            - generic [ref=e113]:
              - button "NCLEX-RN" [pressed] [ref=e114]
              - button "NCLEX-PN" [ref=e115]
            - link "Shopping Cart" [ref=e116] [cursor=pointer]:
              - /url: /cart
            - button "Notifications" [ref=e121]
            - button "Change theme" [ref=e126]:
              - generic [ref=e129]: Toggle theme (system)
            - link "TS Test Student 1793271972642_mw099" [ref=e130] [cursor=pointer]:
              - /url: /profile
              - generic [ref=e131]: TS
              - generic [ref=e132]: Test Student 1793271972642_mw099
        - main [ref=e133]:
          - region [ref=e134]:
            - generic [ref=e136]:
              - generic [ref=e137]:
                - generic [ref=e138]: Authenticated Learner Workspace
                - generic [ref=e144]: NCLEX-RN Focus
              - heading "Welcome back, Test Student 1793271972642_mw099." [level=1] [ref=e145]
              - paragraph [ref=e146]: Pick up where you left off in your NCLEX-RN preparation, review high-yield clinical study guides, or take a tutored Computer Adaptive Test.
              - generic [ref=e147]:
                - link "Explore study materials" [ref=e148] [cursor=pointer]:
                  - /url: /study-guide
                - button "+ Create Test Now" [ref=e150]
          - region [ref=e152]:
            - generic [ref=e153]:
              - generic [ref=e154]:
                - button "Tutored CATs" [ref=e155]
                - button "Readiness Assessment Tests (RAT)" [ref=e156]
                - button "All Recent Tests" [ref=e157]
              - generic [ref=e158]:
                - generic [ref=e159]: "Preview sample cohort:"
                - switch [ref=e160]
            - generic [ref=e162]:
              - img "Ready to begin NCLEX practice" [ref=e164]
              - generic [ref=e165]:
                - heading "No Assessment Attempts Recorded Yet" [level=3] [ref=e166]
                - paragraph [ref=e167]: Begin a tutored CAT session to evaluate your clinical readiness across all 8 NCLEX Client Needs categories. Your trend curve will populate here automatically.
              - generic [ref=e168]:
                - button "Start Your First Practice Test" [ref=e169]
                - button "Preview Reference Benchmark" [ref=e171]
          - region [ref=e173]:
            - generic [ref=e174]:
              - heading "Study Action Hub" [level=2] [ref=e175]
              - paragraph [ref=e176]: Jump directly into exam review hubs, nursing notes, or clinical course materials
            - generic [ref=e177]:
              - generic [ref=e178]:
                - generic [ref=e179]:
                  - heading "NCLEX-RN Preparation" [level=3] [ref=e184]
                  - paragraph [ref=e185]: Full Next-Gen case studies, clinical prioritization, and adaptive question pools.
                - link "Open NCLEX-RN Hub" [ref=e187] [cursor=pointer]:
                  - /url: /nclex-rn
              - generic [ref=e191]:
                - generic [ref=e192]:
                  - heading "NCLEX-PN Preparation" [level=3] [ref=e198]
                  - paragraph [ref=e199]: Practical nursing scenarios, delegation boundaries, and medication administration.
                - link "Open NCLEX-PN Hub" [ref=e201] [cursor=pointer]:
                  - /url: /nclex-pn
              - generic [ref=e205]:
                - generic [ref=e206]:
                  - heading "Nursing Study Guides" [level=3] [ref=e210]
                  - paragraph [ref=e211]: "All 7 core domains: Pharmacology, Med-Surg, Fundamentals, Pediatrics, and more."
                - link "Browse Study Guides" [ref=e213] [cursor=pointer]:
                  - /url: /study-guide
              - generic [ref=e217]:
                - generic [ref=e218]:
                  - heading "Practice & Course Finder" [level=3] [ref=e223]
                  - paragraph [ref=e224]: Filter question sets by client needs, taking mode, and test difficulty level.
                - link "Open Practice & Courses" [ref=e226] [cursor=pointer]:
                  - /url: /courses
          - generic [ref=e234]:
            - paragraph [ref=e235]: PrepFord Assessment Transparency Guarantee
            - paragraph [ref=e236]: PrepFord does not display fabricated personal scores or exam pass predictions. Every performance metric on this dashboard reflects either verified attempts completed by your account or clearly labeled illustrative cohort benchmarks.
          - region [ref=e237]:
            - generic [ref=e238]:
              - generic [ref=e239]:
                - heading "Clinical Curriculum Study Domains" [level=2] [ref=e240]
                - paragraph [ref=e241]: High-yield clinical topic summaries aligned with the NCSBN Test Plan
              - link "Browse All Domains" [ref=e242] [cursor=pointer]:
                - /url: /study-guide
            - generic [ref=e246]:
              - generic [ref=e247]:
                - generic [ref=e248]:
                  - generic [ref=e249]:
                    - generic [ref=e250]: High-Yield Core
                    - generic [ref=e251]: 3 Subjects
                  - heading "Medical-Surgical Nursing" [level=3] [ref=e252]
                  - paragraph [ref=e253]: In-depth pathophysiology, clinical cues, diagnostic laboratory trends, and prioritized nursing actions for adult client alterations.
                - link "Study Domain" [ref=e255] [cursor=pointer]:
                  - /url: /study-guide/medical-surgical
              - generic [ref=e259]:
                - generic [ref=e260]:
                  - generic [ref=e261]:
                    - generic [ref=e262]: Core Science
                    - generic [ref=e263]: 2 Subjects
                  - heading "Pharmacology & Medication Safety" [level=3] [ref=e264]
                  - paragraph [ref=e265]: Drug classes, mechanisms of action, high-alert medication protocols, specific antidotes, and clinical nursing safety implications.
                - link "Study Domain" [ref=e267] [cursor=pointer]:
                  - /url: /study-guide/pharmacology
              - generic [ref=e271]:
                - generic [ref=e272]:
                  - generic [ref=e273]:
                    - generic [ref=e274]: Specialty
                    - generic [ref=e275]: 1 Subjects
                  - heading "Maternal & Newborn Nursing" [level=3] [ref=e276]
                  - paragraph [ref=e277]: Antepartum assessment, intrapartum labor complications, fetal heart monitoring deceleration rules, and neonatal APGAR evaluation.
                - link "Study Domain" [ref=e279] [cursor=pointer]:
                  - /url: /study-guide/maternal-newborn
              - generic [ref=e283]:
                - generic [ref=e284]:
                  - generic [ref=e285]:
                    - generic [ref=e286]: Specialty
                    - generic [ref=e287]: 1 Subjects
                  - heading "Pediatrics & Child Health" [level=3] [ref=e288]
                  - paragraph [ref=e289]: Pediatric developmental milestones, congenital cardiac defects (cyanotic vs acyanotic), and childhood respiratory emergencies.
                - link "Study Domain" [ref=e291] [cursor=pointer]:
                  - /url: /study-guide/pediatrics
              - generic [ref=e295]:
                - generic [ref=e296]:
                  - generic [ref=e297]:
                    - generic [ref=e298]: Core Domain
                    - generic [ref=e299]: 1 Subjects
                  - heading "Mental Health Nursing" [level=3] [ref=e300]
                  - paragraph [ref=e301]: Therapeutic communication techniques, psychotropic medications, mood disorders, substance withdrawal protocols, and crisis de-escalation.
                - link "Study Domain" [ref=e303] [cursor=pointer]:
                  - /url: /study-guide/mental-health
              - generic [ref=e307]:
                - generic [ref=e308]:
                  - generic [ref=e309]:
                    - generic [ref=e310]: Foundation
                    - generic [ref=e311]: 1 Subjects
                  - heading "Fundamentals & Patient Safety" [level=3] [ref=e312]
                  - paragraph [ref=e313]: Infection control, contact/droplet/airborne isolation precautions, fluid and electrolyte balance, and sterile technique principles.
                - link "Study Domain" [ref=e315] [cursor=pointer]:
                  - /url: /study-guide/fundamentals
              - generic [ref=e319]:
                - generic [ref=e320]:
                  - generic [ref=e321]:
                    - generic [ref=e322]: Management
                    - generic [ref=e323]: 1 Subjects
                  - heading "Leadership, Delegation & Priority" [level=3] [ref=e324]
                  - paragraph [ref=e325]: Five rights of delegation, scope of practice distinctions between RN, LPN/VN, and UAP, and mass casualty disaster triage.
                - link "Study Domain" [ref=e327] [cursor=pointer]:
                  - /url: /study-guide/leadership-delegation
          - generic [ref=e331]:
            - heading "Quick Candidate Resources" [level=3] [ref=e332]
            - generic [ref=e333]:
              - link "Account & Profile" [ref=e334] [cursor=pointer]:
                - /url: /profile
              - link "All Study Plans" [ref=e335] [cursor=pointer]:
                - /url: /subscriptions
              - link "Cart (0)" [ref=e336] [cursor=pointer]:
                - /url: /cart
              - link "Learner FAQ" [ref=e337] [cursor=pointer]:
                - /url: /faq
              - link "Contact Support" [ref=e338] [cursor=pointer]:
                - /url: /contact
  - region "Notifications alt+T"
  - alert [ref=e339]: Welcome back, Test Student 1793271972642_mw099.
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
  8  |     await expect(page.getByRole("heading", { name: /Sign In Required/i }).or(page.getByText(/Sign In Required/i)).first()).toBeVisible({ timeout: 10000 });
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
> 71 |     expect(res.status()).toBe(403);
     |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  72 |   });
  73 | });
  74 | 
```
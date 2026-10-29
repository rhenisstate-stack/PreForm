# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout-entitlements.spec.ts >> Checkout, Payments & Entitlements Flow >> authenticated student can initiate checkout and obtain authoritative checkout session
- Location: e2e\checkout-entitlements.spec.ts:19:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
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
            - paragraph [ref=e103]: Test Student 1793272617711_apnrz
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
            - link "TS Test Student 1793272617711_apnrz" [ref=e130] [cursor=pointer]:
              - /url: /profile
              - generic [ref=e131]: TS
              - generic [ref=e132]: Test Student 1793272617711_apnrz
        - main [ref=e133]:
          - region [ref=e134]:
            - generic [ref=e136]:
              - generic [ref=e137]:
                - generic [ref=e138]: Authenticated Learner Workspace
                - generic [ref=e144]: NCLEX-RN Focus
              - heading "Welcome back, Test Student 1793272617711_apnrz." [level=1] [ref=e145]
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
  - alert [ref=e339]: Welcome back, Test Student 1793272617711_apnrz.
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { generateTestStudent, registerStudentUI, clearSession } from "./helpers/test-fixtures";
  3  | 
  4  | test.describe("Checkout, Payments & Entitlements Flow", () => {
  5  |   test("unauthenticated visitor clicking checkout is prompted to sign in", async ({ page }) => {
  6  |     await clearSession(page);
  7  | 
  8  |     await page.goto("/cart?add=nclex-rn-pro");
  9  |     await page.waitForTimeout(500);
  10 | 
  11 |     const checkoutBtn = page.getByRole("button", { name: /proceed to checkout|enroll now/i }).first();
  12 |     if (await checkoutBtn.isVisible()) {
  13 |       await checkoutBtn.click();
  14 |       await page.waitForURL(/\/sign-in/);
  15 |       expect(page.url()).toContain("sign-in");
  16 |     }
  17 |   });
  18 | 
  19 |   test("authenticated student can initiate checkout and obtain authoritative checkout session", async ({
  20 |     page,
  21 |   }) => {
  22 |     const student = generateTestStudent("rn");
  23 |     await registerStudentUI(page, student);
  24 | 
  25 |     // Call checkout API
  26 |     const checkoutRes = await page.request.post("/api/checkout", {
  27 |       data: {
  28 |         planId: "nclex-rn-pro",
  29 |         pathway: "rn",
  30 |       },
  31 |     });
  32 | 
> 33 |     expect(checkoutRes.ok()).toBeTruthy();
     |                              ^ Error: expect(received).toBeTruthy()
  34 |     const data = await checkoutRes.json();
  35 |     expect(data.success).toBe(true);
  36 |     expect(data.orderId || data.checkoutUrl || data.isSimulated).toBeTruthy();
  37 |   });
  38 | 
  39 |   test("checkout rejects invalid or unknown plan identifiers", async ({ page }) => {
  40 |     const student = generateTestStudent("rn");
  41 |     await registerStudentUI(page, student);
  42 | 
  43 |     const badCheckoutRes = await page.request.post("/api/checkout", {
  44 |       data: {
  45 |         planId: "completely-invalid-plan-identifier-999",
  46 |       },
  47 |     });
  48 | 
  49 |     expect([400, 404]).toContain(badCheckoutRes.status());
  50 |     const data = await badCheckoutRes.json();
  51 |     expect(data.success).toBe(false);
  52 |   });
  53 | 
  54 |   test("price injection attempt is ignored and backend enforces authoritative database price", async ({
  55 |     page,
  56 |   }) => {
  57 |     const student = generateTestStudent("rn");
  58 |     await registerStudentUI(page, student);
  59 | 
  60 |     // Attempt to inject amountCents: 100 ($1.00) for a $59 plan
  61 |     const tamperRes = await page.request.post("/api/checkout", {
  62 |       data: {
  63 |         planId: "nclex-rn-pro",
  64 |         amountCents: 100, // Injected fake price
  65 |         price: 1.0,
  66 |       },
  67 |     });
  68 | 
  69 |     // Backend must succeed by calculating price from database, or reject with validation error
  70 |     if (tamperRes.ok()) {
  71 |       const data = await tamperRes.json();
  72 |       // If simulated checkout created order, amount must match authoritative price (5900 cents)
  73 |       if (data.amountCents) {
  74 |         expect(data.amountCents).toBe(5900);
  75 |       }
  76 |     } else {
  77 |       expect(tamperRes.status()).toBe(400);
  78 |     }
  79 |   });
  80 | 
  81 |   test("entitlements API returns valid entitlements for authenticated student", async ({
  82 |     page,
  83 |   }) => {
  84 |     const student = generateTestStudent("rn");
  85 |     await registerStudentUI(page, student);
  86 | 
  87 |     const entRes = await page.request.get("/api/entitlements");
  88 |     expect(entRes.ok()).toBeTruthy();
  89 |     const data = await entRes.json();
  90 |     expect(data.success).toBe(true);
  91 |     expect(data.userId).toBeTruthy();
  92 |     expect(Array.isArray(data.pathways)).toBeTruthy();
  93 |   });
  94 | });
  95 | 
```
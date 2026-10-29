# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: subscription-catalog.spec.ts >> Subscription Catalog & Pricing Integrity >> API returns active plans with correct pathway and price metadata
- Location: e2e\subscription-catalog.spec.ts:21:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Matcher error: received value must be a number or bigint

Received has value: undefined
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Subscription Catalog & Pricing Integrity", () => {
  4  |   test("public subscription page displays canonical plans with authoritative prices", async ({
  5  |     page,
  6  |   }) => {
  7  |     await page.goto("/subscriptions");
  8  | 
  9  |     // Verify page loads
  10 |     await expect(page).toHaveTitle(/Subscription|Plans|Pricing/i);
  11 | 
  12 |     // Verify presence of canonical plan names or cards
  13 |     const pageText = await page.textContent("body");
  14 |     expect(pageText).toContain("NCLEX-RN");
  15 | 
  16 |     // Verify pricing format ($XX or $XX/mo)
  17 |     const hasPriceSymbol = pageText?.includes("$");
  18 |     expect(hasPriceSymbol).toBeTruthy();
  19 |   });
  20 | 
  21 |   test("API returns active plans with correct pathway and price metadata", async ({ request }) => {
  22 |     const res = await request.get("/api/subscriptions");
  23 |     expect(res.ok()).toBeTruthy();
  24 | 
  25 |     const data = await res.json();
  26 |     expect(data.success).toBeTruthy();
  27 |     expect(Array.isArray(data.plans)).toBeTruthy();
  28 |     expect(data.plans.length).toBeGreaterThan(0);
  29 | 
  30 |     // Verify all returned plans are active
  31 |     for (const plan of data.plans) {
  32 |       expect(plan.isActive).toBe(true);
> 33 |       expect(plan.priceCents).toBeGreaterThan(0);
     |                               ^ Error: expect(received).toBeGreaterThan(expected)
  34 |       expect(["rn", "pn", "both", "RN", "PN", "Both"]).toContain(plan.pathway);
  35 |     }
  36 |   });
  37 | 
  38 |   test("archived or non-existent plan lookup returns 404", async ({ request }) => {
  39 |     const res = await request.get("/api/subscriptions/non-existent-plan-slug-xyz");
  40 |     expect(res.status()).toBe(404);
  41 |   });
  42 | });
  43 | 
```
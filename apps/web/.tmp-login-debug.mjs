import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext();
const page = await context.newPage();

page.on("response", (res) => {
  if (res.url().includes("/api/")) {
    console.log(`RESPONSE: ${res.status()} ${res.request().method()} ${res.url()}`);
  }
});
page.on("requestfailed", (req) => {
  if (req.url().includes("/api/")) {
    console.log(`REQ FAILED: ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
  }
});
page.on("console", (msg) => {
  if (["error", "warning"].includes(msg.type())) {
    console.log(`CONSOLE ${msg.type()}: ${msg.text().slice(0, 300)}`);
  }
});
page.on("pageerror", (err) => console.log(`PAGEERROR: ${err.message.slice(0, 300)}`));

const t0 = Date.now();
console.log("goto /sign-in ...");
await page.goto("http://127.0.0.1:3000/sign-in?from=/admin/examinations", { timeout: 60000 });
console.log(`page loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

await page.fill("#email", "e2e.admin.vrf153956@nursing.test.edu");
await page.fill("#password", "Clinical-Verify-vrf153956!#Ad");

const submit = page.locator('button:has-text("Sign in")').first();
console.log("submit count:", await page.locator('button[type="submit"]').count());

console.log("clicking...");
await page.click('button[type="submit"]');
await page.waitForTimeout(25000);
console.log("URL now:", page.url());

await browser.close();

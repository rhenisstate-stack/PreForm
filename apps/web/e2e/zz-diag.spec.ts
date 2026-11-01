import { test } from "@playwright/test";
import { generateTestStudent } from "./helpers/test-fixtures";

test("diagnose register submit", async ({ page }) => {
  const student = generateTestStudent("rn");
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[console.error]", msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => console.log("[pageerror]", err.message.slice(0, 400)));
  page.on("response", (res) => {
    if (res.url().includes("/api/")) console.log("<< RES", res.status(), res.url());
  });
  page.on("requestfailed", (req) => console.log("!! FAILED", req.url(), req.failure()?.errorText));

  await page.goto("/sign-up?from=/dashboard", { timeout: 30000 });
  await page.locator("#fullName").waitFor({ state: "visible", timeout: 15000 });

  await page.fill("#fullName", student.fullName);
  await page.fill("#email", student.email);
  await page.fill("#password", student.password);
  await page.fill("#confirmPassword", student.password);

  // Checkbox state before submit
  const checkboxes = page.locator("input[type=checkbox]");
  console.log("checkbox count:", await checkboxes.count());
  for (let i = 0; i < (await checkboxes.count()); i++) {
    const cb = checkboxes.nth(i);
    console.log(`cb[${i}] name=${await cb.getAttribute("name")} checked=${await cb.isChecked()} visible=${await cb.isVisible()}`);
    if (!(await cb.isChecked())) await cb.check({ force: true });
  }

  // Pathway selection (button group, not select?)
  const rnButton = page.getByRole("button", { name: /NCLEX-RN/i }).first();
  console.log("pathway RN button visible:", await rnButton.isVisible().catch(() => false));
  if (await rnButton.isVisible().catch(() => false)) await rnButton.click();

  console.log("submitting...");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(12000);
  console.log("url after:", page.url());
  console.log("alerts:", await page.locator('[role="alert"]').allInnerTexts());
  console.log("error-ish text:", await page.locator("main").innerText().then(t => t.slice(0, 500)).catch(() => "n/a"));
});

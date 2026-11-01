import { test } from "@playwright/test";

test("diagnose auth session timing", async ({ page }) => {
  page.on("request", (req) => {
    if (req.url().includes("/api/")) console.log(">> REQ", req.method(), req.url());
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/")) console.log("<< RES", res.status(), res.url(), `${Date.now() - t0}ms`);
  });
  page.on("requestfailed", (req) => {
    console.log("!! FAILED", req.url(), req.failure()?.errorText);
  });

  const t0 = Date.now();
  console.log("--> goto /profile", `${Date.now() - t0}ms`);
  await page.goto("/profile");
  console.log("--> /profile loaded", `${Date.now() - t0}ms`);
  await page.waitForTimeout(6000);
  console.log("--> body snapshot", `${Date.now() - t0}ms`);
  console.log(await page.locator("main").first().innerText().catch(() => "(no main)"));

  // Now the same flow the register test uses:
  console.log("## register flow");
  const t1 = Date.now();
  await page.goto("/sign-up", `${"ignore"}` as never === undefined ? {} : { timeout: 20000 }).catch((e) => console.log("goto failed", `${Date.now() - t1}ms`));
  await page.waitForTimeout(4000);
});

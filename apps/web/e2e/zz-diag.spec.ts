import { test } from "@playwright/test";

test("diagnose page errors", async ({ page }) => {
  const t0 = Date.now();
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[console.${msg.type()}]`, msg.text().slice(0, 300));
    }
  });
  page.on("pageerror", (err) => {
    console.log("[pageerror]", err.message.slice(0, 500));
  });
  page.on("request", (req) => {
    console.log(">> REQ", req.method(), req.url(), `${Date.now() - t0}ms`);
  });
  page.on("requestfailed", (req) => {
    console.log("!! FAILED", req.url(), req.failure()?.errorText, `${Date.now() - t0}ms`);
  });

  await page.goto("/", { timeout: 30000 });
  console.log("--> / loaded", `${Date.now() - t0}ms`);
  await page.waitForTimeout(3000);

  await page.goto("/profile", { timeout: 30000 });
  console.log("--> /profile loaded", `${Date.now() - t0}ms`);
  await page.waitForTimeout(5000);
  console.log("--> main text:", await page.locator("main").first().innerText().catch(() => "(no main)"));
});

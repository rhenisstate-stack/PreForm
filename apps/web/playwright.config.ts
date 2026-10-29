import { defineConfig, devices } from "@playwright/test";

const rawBaseUrl =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost:3000";

// Hardened Production Safety Refusal
if (
  /prepford\.com|prepford\.edu|prod(uction)?\./i.test(rawBaseUrl) &&
  !rawBaseUrl.includes("localhost") &&
  !rawBaseUrl.includes("127.0.0.1")
) {
  throw new Error(
    `[SAFETY REFUSAL] Playwright automated tests cannot target production environment: ${rawBaseUrl}`
  );
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: {
    timeout: 7000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential execution for deterministic database state
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: rawBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Mask sensitive input attributes from traces & logs
    launchOptions: {
      slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 0,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // If system Chrome or Edge is installed, channel can be enabled
        channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120000,
      },
});

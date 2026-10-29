import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  
  page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  page.on("requestfailed", req => console.log("REQ FAILED:", req.url(), req.failure()?.errorText));
  page.on("response", res => {
    if (res.url().includes("/api/")) {
      console.log("API RES:", res.status(), res.url());
    }
  });

  console.log("Navigating to http://127.0.0.1:3000/profile...");
  await page.goto("http://127.0.0.1:3000/profile");
  
  await page.waitForTimeout(4000);
  
  const text = await page.innerText("body");
  console.log("BODY TEXT SAMPLE:", text.substring(0, 300));
  
  await browser.close();
}

run().catch(console.error);

import { chromium } from "playwright";
import path from "path";

const SCRATCH = "C:\\Users\\venkat\\AppData\\Local\\Temp\\claude\\c--Users-venkat-OneDrive---Promon-Software-Solution-veXsa-WealthManagement\\83cab839-cefe-4a14-8ae7-7ca5f0689bed\\scratchpad";
const BASE = "http://localhost:5173";

const consoleErrors = [];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[console] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const url = page.url();
  console.log("Landed on:", url);

  if (url.includes("/login")) {
    // go to signup
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    const ts = Date.now();
    const email = `test-glass-${ts}@test.com`;
    await page.fill('input[type="text"]', "Glass Test");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "TestPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE + "/", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    console.log("Signed up as", email, "now at", page.url());
  }

  // Dashboard light mode screenshot
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCRATCH, "01-dashboard-light.png"), fullPage: true });
  console.log("Saved dashboard light screenshot");

  // Go to settings, switch to dark mode
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const darkBtn = page.locator(".segmented button", { hasText: "Dark" });
  await darkBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCRATCH, "02-settings-dark.png"), fullPage: true });

  // Dashboard dark mode
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCRATCH, "03-dashboard-dark.png"), fullPage: true });
  console.log("Saved dashboard dark screenshot");

  // Debt Planner page (form/buttons)
  await page.goto(BASE + "/debt-planner", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCRATCH, "04-debt-planner-dark.png"), fullPage: true });
  console.log("Saved debt planner dark screenshot");

  // Portfolio page (likely has a data table)
  await page.goto(BASE + "/portfolio", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCRATCH, "05-portfolio-dark.png"), fullPage: true });
  console.log("Saved portfolio dark screenshot");

  // Monthly plan page too, extra coverage
  await page.goto(BASE + "/monthly-plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCRATCH, "06-monthly-plan-dark.png"), fullPage: true });
  console.log("Saved monthly plan dark screenshot");

  await browser.close();

  console.log("\n--- Console errors ---");
  if (consoleErrors.length === 0) {
    console.log("None");
  } else {
    consoleErrors.forEach((e) => console.log(e));
  }
})().catch((err) => {
  console.error("SCRIPT FAILED:", err);
  process.exit(1);
});

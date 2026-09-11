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
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  if (page.url().includes("/login")) {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    const ts = Date.now();
    const email = `glass-v3-${ts}@test.com`;
    await page.fill('input[type="text"]', "Glass V3");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "TestPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE + "/", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const darkBtn = page.locator(".segmented button", { hasText: "Dark" });
  if (await darkBtn.count()) {
    await darkBtn.click();
    await page.waitForTimeout(400);
  }

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Full dashboard screenshot
  await page.screenshot({ path: path.join(SCRATCH, "v3-dashboard-dark.png"), fullPage: true });

  // Zoom on a stat-tile card - try Total Assets / Net Worth
  let target = page.locator('text=Total Assets').first();
  if (!(await target.count())) {
    target = page.locator('text=Net Worth').first();
  }
  const card = target.locator('xpath=ancestor::*[contains(@class,"stat-tile") or contains(@class,"card")][1]');
  try {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await card.screenshot({ path: path.join(SCRATCH, "v3-zoom-card.png") });
  } catch (e) {
    console.log("card screenshot failed, fallback to bounding box", e.message);
    const box = await target.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(SCRATCH, "v3-zoom-card.png"),
        clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 60), width: 420, height: 220 },
      });
    }
  }

  await browser.close();

  console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors));
  console.log("done");
})().catch((err) => {
  console.error("SCRIPT FAILED:", err);
  process.exit(1);
});

import { chromium } from "playwright";
import path from "path";

const SCRATCH = "C:\\Users\\venkat\\AppData\\Local\\Temp\\claude\\c--Users-venkat-OneDrive---Promon-Software-Solution-veXsa-WealthManagement\\83cab839-cefe-4a14-8ae7-7ca5f0689bed\\scratchpad";
const BASE = "http://localhost:5173";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (page.url().includes("/login")) {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
    const ts = Date.now();
    const email = `glass-zoom-${ts}@test.com`;
    await page.fill('input[type="text"]', "Glass Zoom");
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
    await page.waitForTimeout(300);
  }

  // Debt/Savings page - zoom on Add button and card
  await page.goto(BASE + "/debt-planner".replace("debt-planner", "debt-planner"), { waitUntil: "networkidle" });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // navigate to Debt, Savings & Investments page via nav link text
  await page.click('text=Debt, Savings & Investments');
  await page.waitForTimeout(500);

  const addBtn = page.locator('button:has-text("Add")').first();
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.screenshot({ path: path.join(SCRATCH, "zoom-add-button.png") });

  const addDebtBtn = page.locator('button:has-text("Add debt")').first();
  await addDebtBtn.scrollIntoViewIfNeeded();
  await addDebtBtn.screenshot({ path: path.join(SCRATCH, "zoom-add-debt-button.png") });

  const card = page.locator('text=Savings & Investments').first().locator('xpath=ancestor::*[contains(@class,"card") or self::section][1]');
  // fallback: just screenshot the whole "Savings & Investments" panel bounding box by locating heading and going up
  try {
    await card.screenshot({ path: path.join(SCRATCH, "zoom-card-savings.png") });
  } catch (e) {
    console.log("card locator failed", e.message);
  }

  // top summary card "Net Worth" with colored border
  const netWorthCard = page.locator('text=Net Worth').first();
  try {
    const box = await netWorthCard.locator('xpath=ancestor::div[1]').boundingBox();
    console.log("networth box", box);
  } catch(e) {}

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const totalAssetsHeading = page.locator('text=Total Assets').first();
  const totalAssetsCard = totalAssetsHeading.locator('xpath=ancestor::div[contains(@class,"card")][1]');
  try {
    await totalAssetsCard.screenshot({ path: path.join(SCRATCH, "zoom-card-totalassets.png") });
  } catch (e) {
    console.log("totalAssetsCard failed", e.message);
    // fallback bounding box approach
    const box = await totalAssetsHeading.boundingBox();
    if (box) {
      await page.screenshot({ path: path.join(SCRATCH, "zoom-card-totalassets.png"), clip: { x: Math.max(0,box.x-30), y: Math.max(0,box.y-30), width: 400, height: 200 } });
    }
  }

  await browser.close();
  console.log("done");
})().catch((err) => {
  console.error("SCRIPT FAILED:", err);
  process.exit(1);
});

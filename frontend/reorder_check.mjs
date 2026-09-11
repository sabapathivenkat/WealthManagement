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
    const email = `reorder-check-${ts}@test.com`;
    await page.fill('input[type="text"]', "Reorder Check");
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

  // Navigate to Debt, Savings & Investments page
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.click('text=Debt, Savings & Investments');
  await page.waitForTimeout(600);

  // Determine field order in Savings form (h2 "Savings & Investments")
  const savingsHeading = page.locator('h2', { hasText: 'Savings' }).first();
  const savingsForm = savingsHeading.locator('xpath=following-sibling::form[1]');
  const savingsLabels = await savingsForm.locator('.field label').allTextContents();
  console.log("SAVINGS_FIELD_ORDER:", JSON.stringify(savingsLabels));
  await savingsForm.screenshot({ path: path.join(SCRATCH, "reorder-savings.png") });

  const debtHeading = page.locator('h2', { hasText: 'Debt' }).first();
  const debtForm = debtHeading.locator('xpath=following-sibling::form[1]');
  const debtLabels = await debtForm.locator('.field label').allTextContents();
  console.log("DEBT_FIELD_ORDER:", JSON.stringify(debtLabels));
  await debtForm.screenshot({ path: path.join(SCRATCH, "reorder-debt.png") });

  // Zoom on a date input - savings start date
  const dateInput = page.locator('#savings-start');
  await dateInput.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await dateInput.boundingBox();
  if (box) {
    await page.screenshot({
      path: path.join(SCRATCH, "reorder-date-input.png"),
      clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 },
    });
  } else {
    await dateInput.screenshot({ path: path.join(SCRATCH, "reorder-date-input.png") });
  }

  await browser.close();

  console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors));
  console.log("done");
})().catch((err) => {
  console.error("SCRIPT FAILED:", err);
  process.exit(1);
});

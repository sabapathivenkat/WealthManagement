import { chromium } from "playwright";
import path from "path";

const SCRATCH = "C:\\Users\\venkat\\AppData\\Local\\Temp\\claude\\c--Users-venkat-OneDrive---Promon-Software-Solution-veXsa-WealthManagement\\83cab839-cefe-4a14-8ae7-7ca5f0689bed\\scratchpad";
const BASE = "http://localhost:5173";

const consoleErrors = [];
const notes = [];

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
    const email = `datepicker-check-${ts}@test.com`;
    await page.fill('input[type="text"]', "DatePicker Check");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "TestPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE + "/", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // dark mode
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const darkBtn = page.locator(".segmented button", { hasText: "Dark" });
  if (await darkBtn.count()) {
    await darkBtn.click();
    await page.waitForTimeout(400);
  }

  // Monthly Income & Expenses page
  await page.goto(BASE + "/monthly-plan", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const dateTrigger = page.locator(".date-picker-trigger").first();
  await dateTrigger.scrollIntoViewIfNeeded();
  await dateTrigger.click();
  await page.waitForTimeout(300);

  const popover = page.locator(".date-picker-popover");
  const popoverVisible = await popover.count();
  notes.push("popover_count=" + popoverVisible);

  await page.screenshot({ path: path.join(SCRATCH, "datepicker-open.png") });

  // check computed style of popover for translucency/blur
  let styleInfo = null;
  if (popoverVisible) {
    styleInfo = await popover.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        background: cs.backgroundColor,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
        borderRadius: cs.borderRadius,
      };
    });
  }
  notes.push("popoverStyle=" + JSON.stringify(styleInfo));

  const beforeValue = await dateTrigger.innerText();
  notes.push("dateBefore=" + beforeValue.trim());

  // click a day in the grid (a non-outside day, not already selected ideally pick day "15")
  const dayBtn = page.locator(".date-picker-day:not(.outside)").nth(4);
  await dayBtn.click();
  await page.waitForTimeout(300);

  const popoverClosedAfterDay = (await popover.count()) === 0;
  notes.push("popoverClosedAfterDayClick=" + popoverClosedAfterDay);

  const afterValue = await dateTrigger.innerText();
  notes.push("dateAfterDayClick=" + afterValue.trim());

  // reopen and click Today
  await dateTrigger.click();
  await page.waitForTimeout(300);
  const todayBtn = page.locator(".date-picker-footer button", { hasText: "Today" });
  await todayBtn.click();
  await page.waitForTimeout(300);
  const afterToday = await dateTrigger.innerText();
  notes.push("dateAfterToday=" + afterToday.trim());
  const popoverClosedAfterToday = (await page.locator(".date-picker-popover").count()) === 0;
  notes.push("popoverClosedAfterToday=" + popoverClosedAfterToday);

  // Debt, Savings & Investments page -> History table date picker
  await page.goto(BASE + "/portfolio", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // Create a savings account so there is a row we can expand history on
  const catSelect = page.locator("select").first();
  const options = await catSelect.locator("option").allTextContents();
  notes.push("categoryOptions=" + JSON.stringify(options));
  // pick the first non-placeholder option if any, otherwise leave as is
  if (options.length > 1) {
    await catSelect.selectOption({ index: 1 });
  }
  await page.fill('input[placeholder="e.g. HDFC Mutual Fund"]', "Test Fund");
  await page.fill('input[placeholder="0"]', "1000");
  await page.click('button:has-text("Add")');

  const contributeBtn = page.locator("button", { hasText: "Contribute" }).first();
  await contributeBtn.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (await contributeBtn.count()) {
    await contributeBtn.click();
    await page.waitForTimeout(300);
    const amountInput = page.locator('input[placeholder="Amount"]');
    await amountInput.fill("500");
    const saveBtn = page.locator("button", { hasText: "Save" }).first();
    await saveBtn.click();
    await page.waitForTimeout(600);
  }

  // Contributing already auto-expands the history row (submitTxn sets expandedId),
  // so only click the toggle if it's still collapsed (reads exactly "History").
  const historyToggle = page.locator("button.ghost", { hasText: "history" }).first();
  await historyToggle.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (await historyToggle.count()) {
    const label = (await historyToggle.innerText()).trim();
    notes.push("historyToggleLabel=" + label);
    if (label === "History") {
      await historyToggle.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(SCRATCH, "debug-after-history-click.png") });
    notes.push("editButtonsAfterHistory=" + (await page.locator(".data-table button", { hasText: "Edit" }).count()));

    const editBtn = page.locator(".data-table button", { hasText: "Edit" }).last();
    if (await editBtn.count()) {
      await editBtn.scrollIntoViewIfNeeded();
      await editBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCRATCH, "debug-after-edit-click.png") });
      notes.push("editBtnCount=" + (await page.locator(".data-table button", { hasText: "Edit" }).count()));

      const tableDatePicker = page.locator(".data-table .date-picker-trigger");
      await tableDatePicker.waitFor({ state: "visible", timeout: 10000 }).catch((e) => notes.push("waitForErr=" + e.message));
      await tableDatePicker.click();
      await page.waitForTimeout(300);

      const tablePopover = page.locator(".date-picker-popover");
      const tablePopoverBox = await tablePopover.boundingBox();
      const viewport = page.viewportSize();
      let clipped = "unknown";
      if (tablePopoverBox && viewport) {
        clipped =
          tablePopoverBox.x < 0 ||
          tablePopoverBox.y < 0 ||
          tablePopoverBox.x + tablePopoverBox.width > viewport.width ||
          tablePopoverBox.y + tablePopoverBox.height > viewport.height;
      }
      notes.push("tablePopoverBox=" + JSON.stringify(tablePopoverBox));
      notes.push("tablePopoverClippedByViewport=" + clipped);

      await page.screenshot({ path: path.join(SCRATCH, "datepicker-table-context.png") });
    } else {
      notes.push("no edit button found in history table");
      await page.screenshot({ path: path.join(SCRATCH, "datepicker-table-context.png") });
    }
  } else {
    notes.push("no History button found on portfolio page");
    await page.screenshot({ path: path.join(SCRATCH, "datepicker-table-context.png") });
  }

  await browser.close();

  console.log("NOTES:\n" + notes.join("\n"));
  console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors));
  console.log("done");
})().catch((err) => {
  console.log("NOTES:\n" + notes.join("\n"));
  console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors));
  console.error("SCRIPT FAILED:", err);
  process.exit(1);
});

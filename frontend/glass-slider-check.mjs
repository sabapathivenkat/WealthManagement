import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const consoleErrors = [];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.setViewportSize({ width: 1440, height: 900 });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

  await page.goto(BASE);

  // Signup a new unique user
  const ts = Date.now();
  const email = `glassslider-check-${ts}@test.com`;
  await page.goto(`${BASE}/signup`);
  await page.waitForSelector("text=Create your account");
  await page.fill('label:has-text("Name") input', "Glass Slider Check");
  await page.fill('label:has-text("Email") input', email);
  await page.fill('label:has-text("Password") input', "password1234");
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  console.log("Signed up and logged in as", email);

  // Go to settings
  await page.goto(`${BASE}/settings`);
  await page.waitForSelector("#glass-light");

  async function readLabels() {
    const lightLabel = await page.locator('label[for="glass-light"]').innerText();
    const darkLabel = await page.locator('label[for="glass-dark"]').innerText();
    return { lightLabel, darkLabel };
  }

  async function readSurface1() {
    return await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--surface-1").trim()
    );
  }

  const defaults = await readLabels();
  console.log("Default labels:", defaults);
  await page.screenshot({ path: "slider-default.png" });

  // Helper to set a range input value reliably and fire events
  async function setRange(selector, value) {
    await page.locator(selector).evaluate((el, v) => {
      const proto = window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }

  // Step 3: still in Light theme, adjust light slider
  const themeAtStart = await page.evaluate(() => document.documentElement.getAttribute("data-theme") || document.documentElement.className);
  console.log("Theme attr/class at start:", themeAtStart);

  await setRange("#glass-light", 10);
  await page.waitForTimeout(150);
  const light10Surface = await readSurface1();
  await page.screenshot({ path: "slider-light-10.png" });
  console.log("Light=10 --surface-1:", light10Surface);

  await setRange("#glass-light", 95);
  await page.waitForTimeout(150);
  const light95Surface = await readSurface1();
  await page.screenshot({ path: "slider-light-95.png" });
  console.log("Light=95 --surface-1:", light95Surface);

  // Switch to Dark theme
  await page.click('.segmented button:has-text("Dark")');
  await page.waitForTimeout(200);

  await setRange("#glass-dark", 10);
  await page.waitForTimeout(150);
  const dark10Surface = await readSurface1();
  await page.screenshot({ path: "slider-dark-10.png" });
  console.log("Dark=10 --surface-1:", dark10Surface);

  await setRange("#glass-dark", 90);
  await page.waitForTimeout(150);
  const dark90Surface = await readSurface1();
  await page.screenshot({ path: "slider-dark-90.png" });
  console.log("Dark=90 --surface-1:", dark90Surface);

  // Reload and check persistence
  await page.reload();
  await page.waitForSelector("#glass-light");
  const afterReload = await readLabels();
  const afterReloadSurface = await readSurface1();
  console.log("After reload labels:", afterReload);
  console.log("After reload --surface-1:", afterReloadSurface);

  console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors));

  await browser.close();
})().catch((err) => {
  console.error("SCRIPT FAILED:", err);
  process.exit(1);
});

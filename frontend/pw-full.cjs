const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';
const ts = Date.now();
const email = `warmredesign-check-${ts}@test.com`;
const password = 'TestPass123!';

async function fillIfExists(page, selectors, value) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.count() > 0) {
      await loc.fill(value);
      return true;
    }
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  let loggedIn = false;
  try {
    await page.waitForSelector('text=Dashboard', { timeout: 3000 });
    loggedIn = true;
    console.log('Already logged in.');
  } catch (e) {
    console.log('Signing up new user:', email);
  }

  if (!loggedIn) {
    const signupLink = page.locator('text=/sign up/i').first();
    if (await signupLink.count() > 0) {
      await signupLink.click();
      await page.waitForTimeout(500);
    }
    await fillIfExists(page, ['input[type="text"]'], 'Warm Redesign Check');
    await fillIfExists(page, ['input[type="email"]'], email);
    await fillIfExists(page, ['input[type="password"]'], password);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign up")').first();
    if (await submitBtn.count() > 0) await submitBtn.click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('text=Dashboard', { timeout: 8000 });
    console.log('Signup succeeded.');
  }

  // List nav links for debugging
  const navLinks = await page.locator('nav a, aside a').all();
  const navTexts = [];
  for (const l of navLinks) {
    navTexts.push((await l.textContent() || '').trim());
  }
  console.log('Nav links:', navTexts.filter(Boolean));

  // Screenshot dashboard (whatever mode we're in now, likely light)
  await page.waitForTimeout(500);

  // Determine current theme
  const htmlAttrs = await page.evaluate(() => ({
    dataTheme: document.documentElement.getAttribute('data-theme'),
    className: document.documentElement.className,
  }));
  console.log('Initial theme attrs:', JSON.stringify(htmlAttrs));

  // Go to Settings to toggle dark mode
  const settingsLink = page.locator('a:has-text(\"Settings\"), nav a:has-text(\"Settings\")').first();
  if (await settingsLink.count() > 0) {
    await settingsLink.click();
    await page.waitForTimeout(800);
    console.log('Navigated to Settings. URL:', page.url());

    // Try to find a dark mode toggle (explicit "Dark" button)
    const darkToggle = page.locator('button:has-text("Dark")').first();
    if (await darkToggle.count() > 0) {
      console.log('Found Dark button, clicking...');
      await darkToggle.click();
      await page.waitForTimeout(600);
    } else {
      console.log('No explicit dark mode text control found; listing buttons on settings page.');
      const btns = await page.locator('button').all();
      for (const b of btns) console.log('SETTINGS BTN:', await b.textContent());
    }
  } else {
    console.log('No Settings link found in nav.');
  }

  const themeAfter = await page.evaluate(() => ({
    dataTheme: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  console.log('Theme after toggle attempt:', JSON.stringify(themeAfter));

  // Go to Dashboard and screenshot (dark mode expected)
  const dashLink = page.locator('a:has-text(\"Dashboard\")').first();
  if (await dashLink.count() > 0) {
    await dashLink.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'warm-dashboard.png', fullPage: true });
  console.log('Saved warm-dashboard.png');

  // Portfolio-ish page: Debt, Savings & Investments
  const portfolioLink = page.locator('a:has-text(\"Debt\"), a:has-text(\"Savings\"), a:has-text(\"Investments\")').first();
  if (await portfolioLink.count() > 0) {
    await portfolioLink.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'warm-portfolio.png', fullPage: true });
    console.log('Saved warm-portfolio.png, URL:', page.url());
  } else {
    console.log('Could not find Debt/Savings/Investments nav link.');
  }

  // Monthly Income & Expenses page
  const monthlyLink = page.locator('a:has-text(\"Monthly\"), a:has-text(\"Income\")').first();
  if (await monthlyLink.count() > 0) {
    await monthlyLink.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'warm-monthlyplan.png', fullPage: true });
    console.log('Saved warm-monthlyplan.png, URL:', page.url());
  } else {
    console.log('Could not find Monthly Income/Expenses nav link.');
  }

  // Switch back to light mode and screenshot dashboard
  const settingsLink2 = page.locator('a:has-text(\"Settings\")').first();
  if (await settingsLink2.count() > 0) {
    await settingsLink2.click();
    await page.waitForTimeout(800);
    const lightToggle2 = page.locator('button:has-text("Light")').first();
    if (await lightToggle2.count() > 0) {
      await lightToggle2.click();
      await page.waitForTimeout(600);
    }
  }
  const themeFinal = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Theme after second toggle (should be light):', themeFinal);

  const dashLink2 = page.locator('a:has-text(\"Dashboard\")').first();
  if (await dashLink2.count() > 0) {
    await dashLink2.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'warm-dashboard-light.png', fullPage: true });
  console.log('Saved warm-dashboard-light.png');

  console.log('ALL CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
})();

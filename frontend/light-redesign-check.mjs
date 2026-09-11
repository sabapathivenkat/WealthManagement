import { chromium } from 'playwright';

const ts = Date.now();
const email = `lighttheme-check-${ts}@test.com`;
const password = 'TestPass123!';

const consoleErrors = [];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1500);

  // Try to find signup link/tab
  const signupLink = page.getByText(/sign up/i).first();
  if (await signupLink.count()) {
    await signupLink.click();
    await page.waitForTimeout(500);
  }

  // Fill signup form - try common field names
  async function fillIfExists(selector, value) {
    const el = page.locator(selector).first();
    if (await el.count()) {
      await el.fill(value);
      return true;
    }
    return false;
  }

  await page.screenshot({ path: 'debug-initial-page.png' });

  // Attempt generic fill by placeholder/label; fall back to nth text input
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  let nameFilled = false;
  if (await nameInput.count()) {
    await nameInput.fill('Light Theme Tester');
    nameFilled = true;
  } else {
    const textInputs = page.locator('input[type="text"], input:not([type])');
    if (await textInputs.count()) {
      await textInputs.first().fill('Light Theme Tester');
      nameFilled = true;
    }
  }
  const emailFilled = await fillIfExists('input[name="email"], input[type="email"]', email);
  const pwInputs = page.locator('input[type="password"]');
  const pwCount = await pwInputs.count();
  for (let i = 0; i < pwCount; i++) {
    await pwInputs.nth(i).fill(password);
  }

  console.log('nameFilled', nameFilled, 'emailFilled', emailFilled, 'pwCount', pwCount);

  const submitBtn = page.getByRole('button', { name: /sign up|create account|register/i }).first();
  if (await submitBtn.count()) {
    await submitBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'debug-after-signup2.png' });

  // Screenshot dashboard
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'light-redesign-dashboard.png', fullPage: true });

  // Navigate to Debt, Savings & Investments
  const portfolioLink = page.getByText(/debt.*savings.*investments|savings.*investments/i).first();
  if (await portfolioLink.count()) {
    await portfolioLink.click();
    await page.waitForTimeout(1000);
  } else {
    console.log('portfolio link not found by text, trying nav items');
  }
  await page.screenshot({ path: 'light-redesign-portfolio.png', fullPage: true });

  // Navigate to Settings
  const settingsLink = page.getByText(/settings/i).first();
  if (await settingsLink.count()) {
    await settingsLink.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'light-redesign-settings.png', fullPage: true });

  // Switch to dark mode: Settings page has Light/Dark/System buttons under Appearance > Theme
  const darkBtn = page.getByRole('button', { name: /^dark$/i }).first();
  if (await darkBtn.count()) {
    await darkBtn.click();
    console.log('clicked Dark button');
  } else {
    const darkText = page.getByText(/^dark$/i).first();
    if (await darkText.count()) {
      await darkText.click();
      console.log('clicked Dark text');
    } else {
      console.log('dark mode toggle not found');
    }
  }
  await page.waitForTimeout(800);

  // go back to dashboard
  const dashLink = page.getByText(/dashboard/i).first();
  if (await dashLink.count()) {
    await dashLink.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'light-redesign-dark-check.png', fullPage: true });

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
})();

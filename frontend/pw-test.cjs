const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  const ts = Date.now();
  const email = `fluid-check-${ts}@test.com`;
  const password = 'TestPass123!';

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Try to detect if already logged in (dashboard visible) vs login page
  let loggedIn = false;
  try {
    const bodyText = await page.textContent('body');
    if (bodyText && /dashboard/i.test(bodyText) && !/log ?in/i.test(await page.title())) {
      loggedIn = true;
    }
  } catch (e) {}

  // Check for login/signup form presence
  const hasEmailField = await page.locator('input[type="email"], input[name="email"]').first().isVisible().catch(() => false);

  if (hasEmailField) {
    console.log('Login form detected, switching to Sign up and creating new user:', email);
    const signupToggle = page.locator('a:has-text("Sign up"), button:has-text("Sign up")').first();
    if (await signupToggle.isVisible().catch(() => false)) {
      await signupToggle.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Fill name field if present (first text input on the form)
    const nameField = page.locator('input[type="text"]').first();
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('Fluid Check');
    }

    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    await emailField.fill(email);

    const pwFields = page.locator('input[type="password"]');
    const pwCount = await pwFields.count();
    for (let i = 0; i < pwCount; i++) {
      await pwFields.nth(i).fill(password);
    }

    await page.screenshot({ path: 'signup-form-filled.png' });

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click().catch(async () => {
      await page.keyboard.press('Enter');
    });
    await page.waitForTimeout(2000);
  } else {
    console.log('No login form detected - assuming already logged in.');
    loggedIn = true;
  }

  await page.waitForTimeout(1500);
  console.log('Current URL after auth attempt:', page.url());

  // Screenshot 1 of background blobs
  await page.screenshot({ path: 'fluid-bg-1.png' });
  console.log('Saved fluid-bg-1.png');

  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'fluid-bg-2.png' });
  console.log('Saved fluid-bg-2.png');

  // Check computed style of body::before
  const beforeStyle = await page.evaluate(() => {
    const cs = getComputedStyle(document.body, '::before');
    return {
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      transform: cs.transform,
    };
  });
  console.log('body::before computed style:', JSON.stringify(beforeStyle));

  // Check brand-spin pseudo-element (.brand::before)
  const brandSpinInfo = await page.evaluate(() => {
    const el = document.querySelector('.brand');
    if (!el) return null;
    const cs = getComputedStyle(el, '::before');
    return { animationName: cs.animationName, animationDuration: cs.animationDuration };
  });
  console.log('brand icon style:', JSON.stringify(brandSpinInfo));

  // Navigate to Debt page
  const debtLink = page.locator('a', { hasText: 'Debt, Savings & Investments' }).first();
  if (await debtLink.count()) {
    await debtLink.click();
  } else {
    console.log('Could not find Debt nav link by text, trying href search');
    const links = await page.locator('a, [role="link"]').allTextContents();
    console.log('Available nav links:', JSON.stringify(links));
  }
  await page.waitForTimeout(1500);
  console.log('URL on debt page:', page.url());

  await page.screenshot({ path: 'debt-page-initial.png' });

  // Debt form is inline on the page (2nd CategorySelect on page belongs to the Debt section)
  const typeSelect = page.locator('select').nth(1);
  await typeSelect.waitFor({ state: 'visible' });
  const values = await typeSelect.locator('option').evaluateAll(opts => opts.map(o => o.value));
  const optionTexts = await typeSelect.locator('option').allTextContents();
  console.log('Debt type options:', JSON.stringify(optionTexts));
  for (let i = 0; i < values.length; i++) {
    if (values[i]) {
      await typeSelect.selectOption(values[i]);
      break;
    }
  }

  await page.locator('#debt-name').fill('Confetti Test Debt');
  await page.locator('#debt-amount').fill('500');

  await page.screenshot({ path: 'debt-form-filled.png' });

  await page.getByRole('button', { name: 'Add debt', exact: true }).click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'debt-added.png' });

  // Find the table row for "Confetti Test Debt" and click its "Record payment" button
  const debtRow = page.locator('tr', { has: page.locator('text=Confetti Test Debt') }).first();
  await debtRow.scrollIntoViewIfNeeded().catch(() => {});
  console.log('Debt row visible:', await debtRow.isVisible().catch(() => false));

  const recordPayBtn = debtRow.getByRole('button', { name: 'Record payment' });
  if (await recordPayBtn.count()) {
    await recordPayBtn.click();
    await page.waitForTimeout(800);
  } else {
    console.log('Record payment button not found directly, dumping all buttons');
    const btns2 = await page.locator('button').allTextContents();
    console.log('Buttons after add:', JSON.stringify(btns2));
  }

  await page.screenshot({ path: 'payment-form-open.png' });

  const paymentAmountField = page.locator('.inline-form input[type="number"]').first();
  await paymentAmountField.fill('500');

  await page.screenshot({ path: 'payment-form-filled.png' });

  const submitPayBtn = page.locator('.inline-form').getByRole('button', { name: 'Save' });
  await submitPayBtn.click();

  // Immediately scroll to top and screenshot to catch confetti + banner
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'confetti-payoff.png' });
  console.log('Saved confetti-payoff.png');
  const bannerVisible = await page.locator('.celebration-banner').isVisible().catch(() => false);
  const bannerText = await page.locator('.celebration-banner').textContent().catch(() => null);
  console.log('Celebration banner visible:', bannerVisible, 'text:', bannerText);

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'confetti-payoff-2.png' });

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));

  await browser.close();
})().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});

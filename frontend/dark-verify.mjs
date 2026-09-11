import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const ts = Date.now();
const email = `darkfix-check-${ts}@test.com`;
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

  // Step 2: Login page pre-login
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verify-login.png' });

  const htmlTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Pre-login data-theme attr:', htmlTheme);

  // Force dark mode manually
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'verify-login-dark.png' });

  // grab auth-card computed bg + heading color
  const authCardInfo = await page.evaluate(() => {
    const card = document.querySelector('.auth-card');
    const heading = document.querySelector('.auth-card h1, .auth-card h2, .auth-card h3');
    if (!card) return null;
    const cs = getComputedStyle(card);
    const hcs = heading ? getComputedStyle(heading) : null;
    return {
      cardBg: cs.backgroundColor,
      headingColor: hcs ? hcs.color : null,
      headingText: heading ? heading.textContent : null,
    };
  });
  console.log('auth-card info (dark forced):', JSON.stringify(authCardInfo));

  // reset theme attribute since we'll do real signup flow now (remove forced attr so app state takes over)
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

  // Step 3: Sign up
  // Try to find a "Sign up" link/toggle
  const signupLinkCandidates = ['text=Sign up', 'text=Create account', 'text=Register', 'a:has-text("Sign up")', 'button:has-text("Sign up")'];
  let switched = false;
  for (const sel of signupLinkCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      try {
        await el.click({ timeout: 2000 });
        switched = true;
        break;
      } catch {}
    }
  }
  console.log('Switched to signup form:', switched);
  await page.waitForTimeout(500);

  // Fill signup form - try common field names/placeholders
  async function fillFirst(selectors, value) {
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.fill(value);
        return true;
      }
    }
    return false;
  }

  await page.getByLabel('Name').fill('Dark Fix Check').catch(() => {});
  await page.getByLabel('Email').fill(email).catch(() => {});
  await page.getByLabel('Password').fill(password).catch(() => {});
  console.log('password filled via label: true (attempted)');

  await page.screenshot({ path: 'debug-signup-form.png' });

  // Submit
  const submitCandidates = ['button[type="submit"]', 'button:has-text("Sign up")', 'button:has-text("Create account")', 'button:has-text("Register")'];
  for (const sel of submitCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      await el.click();
      break;
    }
  }

  await page.waitForTimeout(1500);
  console.log('URL after signup:', page.url());
  await page.screenshot({ path: 'debug-after-signup.png' });

  // Step 3 continued: go to settings, switch to dark mode
  // Try navigating directly
  const settingsCandidates = ['text=Settings', 'a[href*="settings" i]'];
  let wentSettings = false;
  for (const sel of settingsCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      await el.click();
      wentSettings = true;
      break;
    }
  }
  if (!wentSettings) {
    await page.goto(BASE + '/settings', { waitUntil: 'networkidle' }).catch(() => {});
  }
  await page.waitForTimeout(800);
  console.log('URL at settings:', page.url());
  await page.screenshot({ path: 'debug-settings.png' });

  // find dark mode toggle
  const darkCandidates = ['button:has-text("Dark")', 'text="Dark"'];
  let darkClicked = false;
  for (const sel of darkCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      try {
        await el.click({ timeout: 2000 });
        darkClicked = true;
        break;
      } catch {}
    }
  }
  console.log('Dark mode clicked:', darkClicked);
  await page.waitForTimeout(500);

  const themeAfterToggle = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.className);
  console.log('theme state after toggle:', themeAfterToggle);

  // Step 4: Debt Savings & Investments page
  const debtNavCandidates = ['text=Debt, Savings & Investments', 'a:has-text("Debt")', 'text=Debt & Savings'];
  let wentDebt = false;
  for (const sel of debtNavCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      try { await el.click({ timeout: 2000 }); wentDebt = true; break; } catch {}
    }
  }
  console.log('Went to debt page via nav:', wentDebt);
  await page.waitForTimeout(800);
  console.log('URL at debt page:', page.url());
  await page.screenshot({ path: 'debug-debt-page.png' });

  // find Interest-bearing checkbox
  const checkboxLocator = page.locator('input[type="checkbox"]').filter({ hasText: '' });
  // Better: find label containing "Interest-bearing" then its checkbox
  let interestCheckbox = null;
  const labelWithText = page.locator('label:has-text("Interest-bearing")');
  if (await labelWithText.count() > 0) {
    const forAttr = await labelWithText.first().getAttribute('for');
    if (forAttr) {
      interestCheckbox = page.locator(`#${forAttr}`);
    } else {
      interestCheckbox = labelWithText.first().locator('input[type="checkbox"]');
      if (await interestCheckbox.count() === 0) {
        interestCheckbox = labelWithText.first().locator('xpath=preceding-sibling::input[@type="checkbox"] | following-sibling::input[@type="checkbox"]');
      }
    }
  }
  if (!interestCheckbox || (await interestCheckbox.count()) === 0) {
    // fallback: text search around
    const textNode = page.locator('text=Interest-bearing').first();
    if (await textNode.count() > 0) {
      interestCheckbox = textNode.locator('xpath=ancestor::*[self::label or self::div][1]//input[@type="checkbox"]').first();
    }
  }

  let checkboxColor = null;
  if (interestCheckbox && (await interestCheckbox.count()) > 0) {
    await interestCheckbox.first().scrollIntoViewIfNeeded();
    await interestCheckbox.first().check({ force: true }).catch(async () => {
      await interestCheckbox.first().click({ force: true });
    });
    await page.waitForTimeout(300);
    checkboxColor = await interestCheckbox.first().evaluate((el) => getComputedStyle(el).accentColor);
    await interestCheckbox.first().screenshot({ path: 'verify-checkbox.png' }).catch(async () => {
      await page.screenshot({ path: 'verify-checkbox.png' });
    });
  } else {
    console.log('Could not locate Interest-bearing checkbox precisely; taking full page screenshot as fallback');
    await page.screenshot({ path: 'verify-checkbox.png' });
  }
  console.log('Interest-bearing checkbox accent-color:', checkboxColor);

  // Step 5: Debt Planner page
  const plannerCandidates = ['text=Yearly Debt Settlement Plan', 'a:has-text("Debt Planner")', 'text=Debt Planner'];
  let wentPlanner = false;
  for (const sel of plannerCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      try { await el.click({ timeout: 2000 }); wentPlanner = true; break; } catch {}
    }
  }
  console.log('Went to planner page via nav:', wentPlanner);
  await page.waitForTimeout(800);
  console.log('URL at planner page:', page.url());
  await page.screenshot({ path: 'debug-planner-page.png' });

  const radioGroup = page.locator('input[type="radio"]');
  const radioCount = await radioGroup.count();
  console.log('radio count on planner page:', radioCount);
  let radioColor = null;
  if (radioCount > 0) {
    await radioGroup.first().scrollIntoViewIfNeeded();
    await radioGroup.first().check({ force: true }).catch(async () => { await radioGroup.first().click({ force: true }); });
    await page.waitForTimeout(300);
    radioColor = await radioGroup.first().evaluate((el) => getComputedStyle(el).accentColor);
    // screenshot area containing radios - find common ancestor
    const box = await radioGroup.first().evaluate(() => {
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      if (radios.length === 0) return null;
      let parent = radios[0].closest('div');
      // climb to a parent that contains all radios if possible
      return null;
    });
    await page.screenshot({ path: 'verify-radio.png' });
  } else {
    await page.screenshot({ path: 'verify-radio.png' });
  }
  console.log('radio accent-color:', radioColor);

  // Step 6: Monthly Income & Expenses page -> Yearly Expenses card
  const incomeCandidates = ['text=Monthly Income & Expenses', 'a:has-text("Income")', 'text=Income & Expenses'];
  let wentIncome = false;
  for (const sel of incomeCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      try { await el.click({ timeout: 2000 }); wentIncome = true; break; } catch {}
    }
  }
  console.log('Went to income page via nav:', wentIncome);
  await page.waitForTimeout(800);
  console.log('URL at income page:', page.url());
  await page.screenshot({ path: 'debug-income-page.png' });

  const yearlyExpensesHeading = page.locator('text=Yearly Expenses').first();
  if (await yearlyExpensesHeading.count() > 0) {
    await yearlyExpensesHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
  const yearInput = page.locator('.period-controls input[type="number"], .period-controls input').first();
  let yearInputClass = null;
  if (await yearInput.count() > 0) {
    yearInputClass = await yearInput.getAttribute('class');
    await yearInput.screenshot({ path: 'verify-year-input.png' }).catch(async () => {
      await page.screenshot({ path: 'verify-year-input.png' });
    });
  } else {
    await page.screenshot({ path: 'verify-year-input.png' });
  }
  console.log('year input class:', yearInputClass);

  // Step 7: Dashboard
  const dashCandidates = ['text=Dashboard', 'a:has-text("Dashboard")'];
  for (const sel of dashCandidates) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      try { await el.click({ timeout: 2000 }); break; } catch {}
    }
  }
  await page.waitForTimeout(800);
  console.log('URL at dashboard:', page.url());
  await page.screenshot({ path: 'verify-dashboard-warm.png', fullPage: false });

  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors));

  await browser.close();
})();

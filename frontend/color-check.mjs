import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const authPage = document.querySelector('.auth-page');
    const button = document.querySelector('button');
    return {
      dataTheme: root.getAttribute('data-theme'),
      prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      brandVar: rootStyle.getPropertyValue('--brand'),
      authPageBg: authPage ? getComputedStyle(authPage).backgroundImage : null,
      buttonBg: button ? getComputedStyle(button).backgroundImage : null,
      colorScheme: rootStyle.colorScheme,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'color-check.png' });
  await browser.close();
})();

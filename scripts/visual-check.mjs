import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/submissions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) }));

for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['small', 320, 568]]) {
  await page.setViewportSize({ width, height });
  await page.goto('http://127.0.0.1:5173');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `/tmp/seefish-${name}-type.png`, fullPage: true });
  await page.getByRole('button', { name: 'About you' }).click();
  await page.getByRole('button', { name: 'Man', exact: true }).click();
  await page.getByRole('slider', { name: 'Your age' }).fill('31');
  await page.getByRole('slider', { name: 'Your height' }).fill('178');
  await page.waitForTimeout(550);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `/tmp/seefish-${name}-about.png`, fullPage: true });
  console.log(name, await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight })));
}
await page.getByRole('button', { name: 'Methodology', exact: true }).click();
await page.getByRole('button', { name: 'Dating research', exact: true }).click();
await page.screenshot({ path: '/tmp/seefish-mobile-research.png', fullPage: true });
console.log('Page errors:', errors);
await browser.close();
if (errors.length) process.exitCode = 1;

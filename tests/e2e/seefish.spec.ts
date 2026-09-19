import { test, expect, type Page } from '@playwright/test';

const estimate = {
  estimate: 18420, range: [14500, 22700], denominator: 512000, share: 0.036,
  evidenceState: 'modelled combination', rangeMeaning: 'A modelled range around the estimate.',
  assumptions: ['Uses Australian population data.'], sourceIds: [], modelVersion: 'test',
  insights: [
    { id: 'one', eyebrow: 'CONTEXT', title: 'There is room for possibility.', body: 'A population estimate gives perspective.' },
    { id: 'two', eyebrow: 'SHAPE', title: 'A broad population view.', body: 'This is a demographic fit.' },
    { id: 'three', eyebrow: 'REMINDER', title: 'People are more than particulars.', body: 'The human part stays unknown.' },
  ],
};

async function mockSubmission(page: Page, status = 200) {
  await page.route('**/api/submissions', route => route.fulfill({ status, contentType: 'application/json', body: status === 200 ? JSON.stringify({ result: estimate, saved: true }) : 'Unavailable' }));
}

test('shows all filters directly and has no document overflow at supported sizes', async ({ page }) => {
  for (const size of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 375, height: 667 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Who’s your type?' })).toBeVisible();
    await expect(page.getByText('Age', { exact: true })).toBeVisible();
    await expect(page.getByText('Height', { exact: true })).toBeVisible();
    await expect(page.getByText('Yearly income', { exact: true })).toBeVisible();
    await expect(page.locator('.background-control legend')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
    const bounds = await page.locator('.pane-bottom, .background-control').evaluateAll(els => els.map(el => el.getBoundingClientRect().bottom));
    expect(bounds.every(bottom => bottom <= size.height)).toBe(true);
  }
});

test('completes the mocked pool, profile, and overlap flow with visible navigation', async ({ page }) => {
  await mockSubmission(page);
  await page.route('**/api/reciprocity', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ resultMode: 'community', cohortSize: 62, acceptance: 0.31, range: null, missingDimensions: [], message: 'A community snapshot.' }) }));
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Explorer steps' })).toBeVisible();
  await page.getByRole('button', { name: 'See my pool' }).click();
  await expect(page.getByRole('heading', { name: 'Your pool.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Would they be into me?' })).toBeVisible();
  await page.getByRole('button', { name: 'Would they be into me?' }).click();
  await expect(page.getByRole('heading', { name: 'Now, you.' })).toBeVisible();
  await page.getByRole('button', { name: 'See our overlap' }).click();
  await expect(page.getByRole('heading', { name: 'The other side.' })).toBeVisible();
  await expect(page.getByText('31%', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Your type' })).toBeVisible();
});

test('methodology is a full page with author link and matching favicon', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Methodology' }).click();
  await expect(page.getByRole('heading', { name: 'Behind the numbers.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sources' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Manav/ })).toHaveAttribute('href', 'https://manavdodia.com');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /favicon\.svg/);
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('keeps a local result and reports honest status after an API 503', async ({ page }) => {
  await mockSubmission(page, 503);
  await page.goto('/');
  await page.getByRole('button', { name: 'See my pool' }).click();
  await expect(page.getByRole('heading', { name: 'Your pool.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText(/couldn.t be saved/i);
  await expect(page.getByText('people fit your preferences.', { exact: true })).toBeVisible();
});


test('keeps the WebGL map stable while narrowing an income range and zooming to a city', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error' && /shader|WebGLProgram/i.test(message.text())) shaderErrors.push(message.text()); });
  await page.goto('/');
  const originalCount = await page.locator('.live-total strong').textContent();
  const canvas = await page.locator('.particle-map__render canvas').last().elementHandle();
  await page.getByRole('spinbutton', { name: 'Minimum yearly income value', exact: true }).fill('100');
  await expect(page.locator('.live-total strong')).not.toHaveText(originalCount!);
  await page.getByRole('spinbutton', { name: 'Maximum yearly income value', exact: true }).fill('150');
  await expect(page.getByRole('spinbutton', { name: 'Maximum yearly income value' })).toHaveValue('150');
  await page.getByLabel('Dating location').selectOption('sydney');
  await expect(page.locator('.particle-map')).toHaveClass(/is-zoomed/);
  await expect(page.locator('.map-location')).toHaveText('Sydney');
  await page.waitForTimeout(300);
  expect(await canvas?.evaluate(element => element.isConnected)).toBe(true);
  expect(shaderErrors).toEqual([]);
});

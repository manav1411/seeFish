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
  await page.route('**/api/reveal-events', route => route.fulfill({ status, contentType: 'application/json', body: status === 200 ? JSON.stringify({ saved: true }) : 'Unavailable' }));
}

test('keeps desktop contained and gives mobile filters room to scroll without horizontal overflow', async ({ page }) => {
  for (const size of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Who’s your type?' })).toBeVisible();
    await expect(page.getByText('Age', { exact: true })).toBeVisible();
    await expect(page.getByText('Height', { exact: true })).toBeVisible();
    await expect(page.locator('.range-equivalent')).toContainText(/′/);
    await expect(page.getByText('Yearly income', { exact: true })).toBeVisible();
    await expect(page.locator('.background-control legend')).toBeVisible();
    await expect(page.locator('.particle-map__badge')).toHaveCount(0);
    await expect(page.locator(size.width <= 760 ? '.mobile-map-cta .action-button' : '.desktop-cta .action-button')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (size.width > 760) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
      const bounds = await page.locator('.pane-bottom, .background-control').evaluateAll(els => els.map(el => el.getBoundingClientRect().bottom));
      expect(bounds.every(bottom => bottom <= size.height)).toBe(true);
    } else {
      expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
      const touchTargets = await page.locator('.gender-switch button, .select-box, .reset-button').evaluateAll(els => els.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
      expect(touchTargets.every(box => box.width >= 44 && box.height >= 44)).toBe(true);
      const compactButtons = await page.locator('.ancestry-chips button, .any-button').evaluateAll(els => els.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
      expect(compactButtons.every(box => box.height <= 36 && box.height >= 26)).toBe(true);
      await page.locator('.mobile-map-cta .action-button').scrollIntoViewIfNeeded();
      await expect(page.locator('.mobile-map-cta .action-button')).toBeInViewport();
    }
  }
});

test('completes the two-page flow and updates the mutual estimate', async ({ page }) => {
  await mockSubmission(page);
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Explorer pages' })).toBeVisible();
  await page.getByRole('button', { name: 'See how many are into you' }).click();
  await expect(page.getByRole('heading', { name: 'A little about you.' })).toBeVisible();
  await expect(page.getByText('My city', { exact: true })).toHaveCount(0);
  await expect(page.locator('.mutual-kicker')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip Your age' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip your gender' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Woman', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('slider', { name: 'Your height' }).fill('175');
  await expect(page.getByText('175 cm · 5′9″', { exact: true })).toBeVisible();
  await page.getByRole('slider', { name: 'Your age' }).fill('32');
  await expect(page.locator('.mutual-number')).toContainText('/');
  const inRangeMutual = await page.locator('.mutual-number strong').textContent();
  await page.getByRole('slider', { name: 'Your age' }).fill('80');
  await expect(page.locator('.mutual-number strong')).not.toHaveText(inRangeMutual!);
  await expect(page.getByRole('region', { name: 'About you note' })).toContainText('don’t take this too seriously');
  await expect(page.getByRole('button', { name: 'Your type' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'About you' })).toBeVisible();
  await expect(page.getByText('Continuing saves your preferences anonymously for aggregate research.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Optional. Just for this visit. Never sent or saved.', { exact: true })).toHaveCount(0);
});

test('methodology is a full page with author link and matching favicon', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Methodology' }).click();
  await expect(page.getByRole('heading', { name: 'Behind the numbers.' })).toBeVisible();
  await expect(page.locator('.source-list')).toBeVisible();
  await expect(page.getByRole('link', { name: /Manav/ })).toHaveAttribute('href', 'https://manavdodia.com');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /favicon\.svg/);
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('explains the scenario and links to research on desktop and mobile', async ({ page }) => {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'About you' }).click();
    await expect(page.getByText('Illustrative estimate · not a measured attraction rate')).toHaveCount(0);
    await expect(page.locator('.mutual-range')).toHaveCount(0);
    await expect(page.locator('.estimate-details')).toHaveCount(0);
    await expect(page.locator('.mutual-context')).toHaveCount(0);
    await page.getByRole('button', { name: 'Methodology' }).click();
    await expect(page.getByRole('heading', { name: 'Behind the numbers.' })).toBeVisible();
    await expect(page.locator('.source-list a[href*="abs.gov.au"]').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});

test('supports both same-sex pairings and personalizes unrestricted profile fields', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'About you' }).click();
  const settledCount = async () => {
    await page.waitForTimeout(550); // Let the intentional count animation finish.
    return (await page.locator('.mutual-number').getAttribute('aria-label'))!;
  };
  await page.getByRole('button', { name: 'Man', exact: true }).click();
  expect(await settledCount()).not.toContain('0 estimated mutual interest');
  for (const [field, first, second] of [['Your age', '30', '65'], ['Your height', '145', '185'], ['Your yearly income', '10000', '170000']]) {
    await page.getByRole('slider', { name: field, exact: true }).fill(first);
    const before = await settledCount();
    await page.getByRole('slider', { name: field, exact: true }).fill(second);
    expect(await settledCount(), `${field} should affect unrestricted preferences`).not.toBe(before);
  }
  await page.getByRole('button', { name: 'Your type' }).click();
  await page.getByRole('button', { name: 'Women', exact: true }).click();
  await page.getByRole('button', { name: 'Indian', exact: true }).click();
  await page.getByRole('button', { name: 'About you' }).click();
  await page.getByRole('button', { name: 'Clear your details' }).click();
  await page.getByRole('button', { name: 'Woman', exact: true }).click();
  expect(await settledCount()).not.toContain('0 estimated mutual interest');
  await page.locator('.own-background').getByRole('button', { name: 'Indian', exact: true }).click();
  const shared = await settledCount();
  await page.locator('.own-background').getByRole('button', { name: 'Indian', exact: true }).click();
  await page.locator('.own-background').getByRole('button', { name: 'English', exact: true }).click();
  expect(await settledCount()).not.toBe(shared);
});

test('mobile range controls support finger dragging, close handles and keyboard changes', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173');
  const lower = page.getByRole('slider', { name: 'Minimum age', exact: true });
  const upper = page.getByRole('slider', { name: 'Maximum age', exact: true });
  const track = page.locator('.dual-slider').first();
  await track.scrollIntoViewIfNeeded();
  const box = (await track.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  const session = await context.newCDPSession(page);
  const xAt = (age: number) => box.x + box.width * (age - 18) / 62;
  const drag = async (from: number, to: number) => {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: xAt(from), y: box.y + box.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: xAt(to), y: box.y + box.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await drag(25, 21);
  await expect(lower).toHaveValue('21');
  await drag(38, 45);
  await expect(upper).toHaveValue('45');
  await lower.fill('30');
  await upper.fill('31');
  await drag(30, 24);
  await expect(lower).toHaveValue('24');
  await drag(31, 40);
  await expect(upper).toHaveValue('40');
  await lower.focus();
  await page.keyboard.press('ArrowRight');
  await expect(lower).toHaveValue('25');
  await page.getByRole('button', { name: 'About you' }).click();
  const ownAge = page.getByRole('slider', { name: 'Your age', exact: true });
  await ownAge.scrollIntoViewIfNeeded();
  const ownBox = (await ownAge.boundingBox())!;
  expect(ownBox.height).toBeGreaterThanOrEqual(44);
  await page.touchscreen.tap(ownBox.x + ownBox.width * 0.7, ownBox.y + ownBox.height / 2);
  expect(Number(await ownAge.inputValue())).toBeGreaterThan(40);
  await context.close();
});

test('keeps a local result without error notice after an API 503', async ({ page }) => {
  await mockSubmission(page, 503);
  await page.goto('/');
  await page.getByRole('button', { name: 'See how many are into you' }).click();
  await expect(page.getByRole('heading', { name: 'A little about you.' })).toBeVisible();
  await expect(page.locator('.notice')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'About you note' })).toBeVisible();
});

test('shows the subtle creator hello only for an explicit matching profile', async ({ page }) => {
  await mockSubmission(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Women' }).click();
  await page.getByRole('spinbutton', { name: 'Minimum age value' }).fill('20');
  await page.getByRole('spinbutton', { name: 'Maximum age value' }).fill('24');
  await page.getByRole('button', { name: 'Indian', exact: true }).click();
  await page.getByRole('button', { name: 'See how many are into you' }).click();
  await page.getByRole('button', { name: 'Woman', exact: true }).click();
  await page.getByRole('slider', { name: 'Your age' }).fill('22');
  await page.locator('.own-background').getByRole('button', { name: 'Indian', exact: true }).click();
  await expect(page.locator('.own-background button[aria-pressed=true]')).toHaveText('Indian');
  await expect(page.getByRole('slider', { name: 'Your age' })).toHaveValue('22');
  await expect(page.getByRole('button', { name: 'Woman', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.creator-greeting')).toContainText('hi');
  await expect(page.getByRole('link', { name: 'Instagram @manav141' })).toHaveAttribute('href', 'https://www.instagram.com/manav141/');
  await expect(page.getByRole('tab', { name: /For you/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear Your age' }).click();
  await expect(page.locator('.creator-greeting')).toHaveCount(0);
  await page.getByRole('slider', { name: 'Your age' }).fill('22');
  await page.locator('.own-background').getByRole('button', { name: 'Indian', exact: true }).click();
  await expect(page.locator('.creator-greeting')).toHaveCount(0);
  await page.locator('.own-background').getByRole('button', { name: 'Indian', exact: true }).click();
  await page.getByRole('button', { name: 'Clear your details' }).click();
  await page.getByRole('button', { name: 'Man', exact: true }).click();
  await page.getByRole('slider', { name: 'Your age' }).fill('22');
  await expect(page.locator('.creator-greeting')).toHaveCount(0);
});

test('keeps profile details local and mobile results reachable by scrolling', async ({ page }) => {
  let submissions = 0;
  await page.route('**/api/reveal-events', route => { submissions += 1; return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ saved: true }) }); });
  for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
    submissions = 0;
    const submissionsBeforeVisit = submissions;
    await page.setViewportSize(size);
    await page.goto('/');
    await page.getByRole('button', { name: 'See how many are into you' }).click();
    await expect(page.getByRole('heading', { name: 'A little about you.' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'About you note' })).toContainText('don’t take this too seriously');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.getByRole('slider', { name: 'Your age' }).fill('31');
    await page.getByRole('slider', { name: 'Your height' }).fill('175');
    await page.getByRole('slider', { name: 'Your yearly income' }).fill('75000');
    await page.locator('.mutual-number').scrollIntoViewIfNeeded();
    await expect(page.locator('.mutual-number')).toBeInViewport();
    expect(submissions).toBe(submissionsBeforeVisit + 1);
  }
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
  await expect(page.locator('.particle-map__focus-label')).toHaveText('Sydney');
  await expect(page.locator('.particle-map__focus-label')).toBeVisible({ timeout: 1200 });
  await page.waitForTimeout(300);
  await page.locator('.particle-map__render canvas').last().click({ position: { x: 120, y: 100 } });
  await page.waitForTimeout(300);
  expect(await canvas?.evaluate(element => element.isConnected)).toBe(true);
  expect(shaderErrors).toEqual([]);
});

test('shows every capital label only after the national camera animation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Explore Canberra' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore Hobart' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore Sydney' }).click();
  await page.getByRole('button', { name: 'Australia', exact: true }).click();
  await expect(page.locator('.particle-map')).not.toHaveClass(/labels-ready/);
  await expect(page.getByRole('button', { name: 'Explore Canberra' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Explore Canberra' })).toBeVisible({ timeout: 1800 });
});

test('keeps the brand header and page toggle sticky and accessible when scrolling on mobile', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    // Scroll down past the first set of controls
    await page.evaluate(() => window.scrollTo(0, 350));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

    // Header should remain pinned at the top of the viewport
    const headerBox = (await page.locator('.app-header').boundingBox())!;
    expect(headerBox.y).toBe(0);

    // Brand, Manav, and page toggle should all be visible in header in viewport
    await expect(page.getByRole('link', { name: 'SeeFish home' })).toBeInViewport();
    await expect(page.getByRole('link', { name: /Manav/ })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Methodology' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Your type' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'About you' })).toBeInViewport();
    const mapHeight = (await page.locator('.visual-pane').boundingBox())!.height;
    expect(mapHeight).toBeLessThanOrEqual(180);
    const headerFontSizes = await page.locator('.header-links>button, .author-button').evaluateAll(elements => elements.map(element => getComputedStyle(element).fontSize));
    expect(new Set(headerFontSizes).size).toBe(1);

    const ctaIsOutsideViewport = await page.locator('.mobile-map-cta .action-button').evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.top > window.innerHeight || box.bottom < 0;
    });
    expect(ctaIsOutsideViewport).toBe(true);

    // Toggle to 'About you' while scrolled down
    await page.getByRole('button', { name: 'About you' }).click();
    await expect(page.getByRole('heading', { name: 'A little about you.' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    // Header still remains sticky and visible
    const aboutHeaderBox = (await page.locator('.app-header').boundingBox())!;
    expect(aboutHeaderBox.y).toBe(0);
    await expect(page.getByRole('button', { name: 'Your type' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'About you' })).toBeInViewport();

    // Toggle back to 'Your type'
    await page.getByRole('button', { name: 'Your type' }).click();
    await expect(page.getByRole('heading', { name: 'Who’s your type?' })).toBeVisible();
  }
});

test('protects the detailed admin dashboard behind login', async ({ page }) => {
  let authenticated = false;
  const analytics = {
    generatedAt: new Date().toISOString(), days: 30,
    summary: { page_views: 12, unique_visitors: 7, reveals: 5, reveal_visitors: 4, average_matches: 12670 },
    daily: [{ day: '2026-09-20', page_views: 12, reveals: 5, unique_visitors: 7 }],
    cities: [{ label: 'melbourne', count: 4 }], genders: [{ label: 'women', count: 3 }], backgrounds: [{ label: 'indian', count: 2 }],
    visitors: [{ visitor_id: 'visitor_123456789', first_seen: 1789880000, last_seen: 1789889000, page_views: 3, reveals: 2, ip_addresses: '203.0.113.8', countries: 'AU' }],
    activity: [{ event_type: 'reveal', occurred_at: 1789889000, visitor_id: 'visitor_123456789', session_id: 'session_123456789', ip_address: '203.0.113.8', user_agent: 'Test browser', referer: null, client_language: 'en-AU', client_timezone: 'Australia/Melbourne', viewport_width: 390, viewport_height: 844, cf_country: 'AU', cf_region: 'Victoria', cf_city: 'Melbourne', cf_colo: 'MEL', cf_asn: 64500, cf_as_organization: 'Test network', path: null, gender: 'women', city: 'melbourne', age_min: 25, age_max: 38, height_min: 165, height_max: 190, income_min: null, income_max: null, backgrounds_json: '["indian"]', estimated_matches: 12670, match_share: .0066 }],
  };
  await page.route('**/api/admin/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/login')) { authenticated = true; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"authenticated":true}' }); }
    if (!authenticated) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Admin authentication required."}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analytics) });
  });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Open dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Audience dashboard' })).toBeVisible();
  await expect(page.getByText('12', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Detailed activity' })).toBeVisible();
  await page.getByText('Reveal', { exact: true }).click();
  await expect(page.getByText('203.0.113.8', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Test network', { exact: false })).toBeVisible();
});

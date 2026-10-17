import { test, expect, type Page } from '@playwright/test';

const idle = async (page: Page) => {
  await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase', 'idle', { timeout: 12000 });
  await expect(page.locator('[data-transition-shell]')).not.toHaveAttribute('inert', '');
  expect(await page.evaluate(() => ({ entry: document.documentElement.dataset.pageEntry, overflow: document.body.style.overflow }))).toEqual({ entry: undefined, overflow: '' });
};
const marks = (page: Page) => page.evaluate(() => performance.getEntriesByType('mark').filter(e => e.name.startsWith('tr03:')).map(e => ({ name: e.name, t: e.startTime })));
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  (page as Page & { tr03Errors: string[] }).tr03Errors = errors;
});
test.afterEach(async ({ page }) => {
  await test.info().attach('marks', { body: JSON.stringify(await marks(page)), contentType: 'application/json' });
  expect((page as Page & { tr03Errors: string[] }).tr03Errors).toEqual([]);
});
async function holdBundles(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/static/**/*.js', async route => { await gate; await route.continue(); });
  return release;
}
test('greetings finish before blocked hydration, then reveal once after adoption', async ({ page }) => {
  const release = await holdBundles(page);
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('[data-curtain-words]')).toHaveText('Hallo', { timeout: 6000 });
  expect((await marks(page)).some(e => e.name === 'tr03:react-ready')).toBe(false);
  await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase', 'greeting');
  await expect(page.locator('[data-transition-shell]')).toHaveAttribute('inert', '');
  release(); await page.waitForLoadState(); await idle(page);
  const result = await marks(page), get = (name: string) => result.find(e => e.name === name)!.t;
  expect(get('tr03:greetings-start')).toBeLessThan(get('tr03:react-ready'));
  expect(get('tr03:reveal-start')).toBeGreaterThanOrEqual(get('tr03:hero-ready'));
  for (const name of ['tr03:greetings-start', 'tr03:reveal-start', 'tr03:reveal-complete', 'tr03:unlock']) expect(result.filter(e => e.name === name)).toHaveLength(1);
  await test.info().attach('causal-marks', { body: JSON.stringify(result), contentType: 'application/json' });
});
test('Escape before hydration is terminal and late hydration cannot replay', async ({ page }) => {
  const release = await holdBundles(page);
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.querySelector('[data-curtain-words]')?.textContent === 'Bonjour', null, { polling: 'raf', timeout: 5000 });
  await page.keyboard.press('Escape'); await idle(page); release(); await page.waitForLoadState();
  await page.waitForTimeout(1300); await idle(page);
  const result = await marks(page);
  expect(result.filter(e => e.name === 'tr03:greetings-start')).toHaveLength(1);
  expect(result.filter(e => e.name === 'tr03:unlock')).toHaveLength(1);
  expect(result.some(e => e.name === 'tr03:reveal-start')).toBe(false);
});
test('Escape after adoption releases the same lease once', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => performance.getEntriesByName('tr03:react-ready').length > 0);
  await page.keyboard.press('Escape'); await idle(page);
  await page.waitForTimeout(4500);
  expect((await marks(page)).filter(e => e.name === 'tr03:unlock')).toHaveLength(1);
  await expect(page.locator('html')).toHaveAttribute('data-transition-outcome', 'cancelled');
});
test('a delayed hero image stays covered beyond greetings and decodes before reveal', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/image?*', async route => { if (route.request().url().includes('mee-hero')) await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('[data-curtain-words]')).toHaveText('Hallo', { timeout: 6000 });
  await page.waitForTimeout(650);
  await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase', 'greeting');
  release(); await page.waitForLoadState(); await idle(page);
  expect(await page.locator('[data-hero-photo]').evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0)).toBe(true);
});
test('failed image uses the original bounded rescue without a reveal', async ({ page }) => {
  const release = await holdBundles(page);
  await page.route('**/_next/image?*', route => route.request().url().includes('mee-hero') ? route.abort('failed') : route.continue());
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('[data-curtain-words]')).toHaveText('Hallo', { timeout: 6000 });
  await page.waitForTimeout(1200); release(); await page.waitForLoadState(); await idle(page);
  const result = await marks(page), unlock = result.find(e => e.name === 'tr03:unlock')!.t;
  expect(unlock).toBeLessThan(10500); expect(unlock).toBeGreaterThan(8500);
  expect(result.some(e => e.name === 'tr03:reveal-start')).toBe(false);
  await expect(page.locator('html')).toHaveAttribute('data-transition-outcome', 'deadline');
});
test('fragment Home does not acquire the early lease', async ({ page }) => {
  await page.goto('/#main-content'); await idle(page);
  expect((await marks(page)).some(e => e.name === 'tr03:greetings-start')).toBe(false);
});

test('early hidden time pauses both the word animation and the shared rescue budget', async ({ page }) => {
  const release = await holdBundles(page);
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.querySelector('[data-curtain-words]')?.textContent === 'Hello' && window.__homeEntry?.active);
  // Explicit visibility fixture; native visibility is checked separately, without this override.
  const before = await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
    // WAAPI pause is pending until the next animation frame.
    await document.querySelector('[data-curtain-words]')?.getAnimations()[0]?.ready;
    return { label: document.querySelector('[data-curtain-words]')?.textContent, time: document.querySelector('[data-curtain-words]')?.getAnimations()[0]?.currentTime };
  });
  await page.waitForTimeout(10000);
  const after = await page.evaluate(() => ({ label: document.querySelector('[data-curtain-words]')?.textContent, time: document.querySelector('[data-curtain-words]')?.getAnimations()[0]?.currentTime }));
  expect(after).toEqual(before);
  await expect(page.locator('[data-transition-shell]')).toHaveAttribute('inert', '');
  await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); });
  release(); await page.waitForLoadState(); await idle(page);
  await expect(page.locator('html')).toHaveAttribute('data-transition-outcome', 'complete');
});

test('a finished greeting fade must stay finished when the hidden tab resumes', async ({ page }) => {
  await holdBundles(page);
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.querySelector('[data-curtain-words]')?.textContent === 'Guten tag', null, { polling: 'raf' });
  const before = await page.evaluate(() => {
    const words = document.querySelector<HTMLElement>('[data-curtain-words]')!, animation = words.getAnimations()[0];
    const state = { time: animation.currentTime, opacity: getComputedStyle(words).opacity };
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
    return state;
  });
  await page.waitForTimeout(300);
  const resumed = await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange'));
    const words = document.querySelector<HTMLElement>('[data-curtain-words]')!;
    return { time: words.getAnimations()[0].currentTime, opacity: getComputedStyle(words).opacity };
  });
  await test.info().attach('finished-fade-regression', { body: JSON.stringify({ before, resumed }), contentType: 'application/json' });
  expect(resumed).toEqual(before);
});

// H03 replaces H02/H01 design expectations, retaining their functional checks.
import { test, expect, type Page } from '@playwright/test';
const sizes = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }, { width: 719, height: 480 }, { width: 720, height: 480 }, { width: 721, height: 480 }, { width: 1440, height: 400 }, { width: 844, height: 390 }];
const hero = (page: Page) => page.locator('[data-section=hero]');
async function ready(page: Page) {
  await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000}); await expect(hero(page)).toHaveAttribute('data-hero-entry', 'complete');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-hero-photo]').evaluate(image => (image as HTMLImageElement).decode());
}
async function geometry(page: Page) {
  return hero(page).evaluate(root => {
    const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
    const heading = root.querySelector('h1')!, photo = root.querySelector('[data-hero-photo]')!;
    return { hero: rect(root), heading: rect(heading), photo: rect(photo), layer: rect(photo.parentElement!), role: rect(root.querySelector('[data-hero-role]')!),
      size: parseFloat(getComputedStyle(heading).fontSize), roleSize: parseFloat(getComputedStyle(root.querySelector('[data-hero-role]')!).fontSize),
      overflow: document.documentElement.scrollWidth > innerWidth, font: getComputedStyle(heading).fontFamily, weight: getComputedStyle(heading).fontWeight,
      radius: getComputedStyle(root).borderRadius, filter: getComputedStyle(photo).filter, mask: getComputedStyle(photo).maskImage, background: getComputedStyle(root).backgroundColor };
  });
}
for (const size of sizes) test(`H03 Dennis composition ${size.width}x${size.height}`, async ({ page }) => {
  await page.setViewportSize(size); await ready(page);
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Abdulrahman Elsayed —');
  await expect(hero(page).getByRole('link')).toHaveCount(0);
  await expect(page.locator('[data-hero-photo]')).toHaveCount(1);
  const g = await geometry(page), mobile = size.width <= 720;
  expect(g.overflow).toBe(false); expect(g.hero.x).toBe(0); expect(g.hero.width).toBe(size.width);
  if (size.height <= 550) expect(g.hero.height).toBeGreaterThanOrEqual(size.height);
  else expect(g.hero.height).toBeCloseTo(size.height * (mobile ? .92 : 1), 0);
  expect(g.photo.width / g.photo.height).toBeCloseTo(1191 / 1321, 3);
  expect(g.photo.height / g.hero.height).toBeCloseTo(mobile ? .98 : 1, 3);
  expect(g.layer.y).toBe(0);
  expect(g.radius).toBe('0px'); expect(g.filter).toBe('none'); expect(g.mask).toBe('none');
  expect(g.font.toLowerCase()).toContain('hero'); expect(g.weight).toBe('450'); expect(g.background).toBe('rgb(140, 144, 145)');
  await expect(page.locator('[data-floating-whatsapp]')).toHaveAttribute('data-blocked', 'true');
  if (size.width === 1440 && size.height === 900) { expect(g.size).toBeCloseTo(172.8,1); expect(g.roleSize).toBeCloseTo(33.12, 2); expect(g.heading.bottom).toBeCloseTo(846, 0); }
});
test('H03 keyboard, shared menu locking, focus trap, Escape and route appearance', async ({ page }) => {
  await ready(page);
  const toggle = page.locator('[data-menu-toggle]'); await toggle.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
  await expect(page.locator('[data-page-content]')).toHaveAttribute('inert', '');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.locator('[data-menu-panel] a:visible').last().focus(); await page.keyboard.press('Tab'); await expect(toggle).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Navigation' })).toHaveCount(0); await expect(toggle).toBeFocused();
  await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');
  await toggle.click(); await page.locator('[data-menu-panel] nav[aria-label="Explore"] a[href="/work"]').click(); await expect(page).toHaveURL(/\/work$/);
  await page.goBack(); await expect(hero(page)).toHaveAttribute('data-hero-entry', 'complete');
  await expect(page.locator('[data-hero-entry-layer]')).toHaveCount(0);
  await toggle.click(); await page.locator('[data-menu-panel] a[href="/contact"]:visible').click(); await expect(page).toHaveURL(/\/contact$/);
});
test('H03 reduced motion is final immediately and has no running Hero animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
  await expect(page.locator('[data-hero-entry-layer]')).toBeHidden();
  expect(await hero(page).evaluate(root => root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length)).toBe(0);
  await expect(page.locator('[data-hero-track]')).toBeVisible();
  await expect(page.locator('[data-hero-name-copy]').first()).toHaveText('AbdulrahmanElsayed—');
});
for (const size of [sizes[0], sizes[4], sizes[5], sizes[10]]) test(`H03 no JavaScript ${size.width}x${size.height}`, async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: size, javaScriptEnabled: false });
  try {
    const page = await context.newPage(); await page.goto(baseURL!);
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Abdulrahman Elsayed —');
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true })).toBeVisible();
    await expect(page.locator('[data-hero-entry-layer]')).toBeHidden();
    expect((await geometry(page)).overflow).toBe(false);
    await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(page).toHaveURL(/\/contact$/);
  } finally { await context.close(); }
});
test('H03 resize keeps cycle phase, pauses outside Hero/menu/hidden tab, and restores WhatsApp', async ({ page }) => {
  await ready(page);
  const phase = () => page.locator('[data-hero-track]').evaluate(e => -new DOMMatrix(getComputedStyle(e).transform).m41 / e.children[0].getBoundingClientRect().width);
  await page.waitForTimeout(500); const before = await phase();
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(80); expect(Math.abs(await phase() - before)).toBeLessThan(.03);
  await page.evaluate(() => scrollTo(0, 1000)); await expect(hero(page)).toHaveAttribute('data-hero-running', 'false');
  await expect(page.locator('[data-floating-whatsapp]')).toHaveAttribute('data-blocked', 'false');
  const outside = await phase(); await page.waitForTimeout(250); expect(await phase()).toBe(outside);
  await page.evaluate(() => scrollTo(0, 0)); await expect(hero(page)).toHaveAttribute('data-hero-running', 'true');
  await page.locator('[data-menu-toggle]').click(); await expect(hero(page)).toHaveAttribute('data-hero-running', 'false');
  const locked = await phase(); await page.waitForTimeout(250); expect(await phase()).toBe(locked);
  await page.keyboard.press('Escape'); await expect(hero(page)).toHaveAttribute('data-hero-running', 'true');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await phase(); await page.waitForTimeout(250); expect(await phase()).toBe(hidden);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(80); expect(Math.abs(await phase() - hidden)).toBeLessThan(.03);
});
test('H03 Home retains all sections, no gap, Introduction header reserve and footer', async ({ page }) => {
  await ready(page); await expect(page.locator('main > *')).toHaveCount(4);
  await expect(page.locator('main > [data-capability-marquee]')).toHaveCount(1); await expect(page.getByRole('contentinfo')).toHaveCount(1);
  expect(await page.evaluate(() => { const h = document.querySelector('[data-section=hero]')!, m = h.nextElementSibling!; return Math.abs(h.getBoundingClientRect().bottom - m.getBoundingClientRect().top); })).toBeLessThan(1);
  for (const size of sizes.toReversed()) {
    await page.setViewportSize(size); await page.waitForTimeout(80); expect((await geometry(page)).overflow).toBe(false);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
});




import { test, expect, type Page } from "@playwright/test";

type Rect = { x: number; y: number; width: number; height: number };
type StyleSnapshot = { selector: string; properties: { name: string; value: string; priority: string }[] };
type PressRecord = {
  down?: { trusted: boolean; onLink: boolean; rect: Rect; time: number; pointerId: number; height: number; textTransform: string; rollingTransforms: string[]; textRect: Rect; rollingRects: Rect[]; contentSizes: { actual: number; natural: number }[] };
  samples: { rect: Rect; time: number; textTransform: string; rollingTransforms: string[]; textRect: Rect; rollingRects: Rect[] }[];
  up?: { trusted: boolean; onLink: boolean; held: boolean };
  clicks: { trusted: boolean; held: boolean; defaultPrevented?: boolean }[];
  navigation: number;
  downStyles?: StyleSnapshot[];
  restoredStyles?: StyleSnapshot[];
  canceled?: { trusted: boolean; pointerId: number };
};
const target = '[data-footer-magnetic]';
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const state = { samples: [], clicks: [], navigation: 0 } as unknown as PressRecord;
    (window as unknown as { a01Press: PressRecord }).a01Press = state;
    const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    let held = false;
    const ownedStyles = () => [...document.querySelectorAll<HTMLElement | SVGElement>('[data-about-accordion], details[name=about-principles], [data-footer-magnetic], [data-footer-button-text], [data-footer-arrow] svg')].map(e => ({
      selector: e.tagName + (e.getAttribute('data-about-value') ?? ''),
      properties: ['block-size', '--about-held-size', '--about-held-opacity', '--about-held-visibility', 'transform', 'transition'].map(name => ({ name, value: e.style.getPropertyValue(name), priority: e.style.getPropertyPriority(name) })),
    }));
    window.addEventListener('about-footer-release', () => { state.restoredStyles = ownedStyles(); }, true);
    window.addEventListener('pointercancel', event => { held = false; state.canceled = { trusted: event.isTrusted, pointerId: event.pointerId }; }, true);
    // Window capture runs before the application guard. The origin is the actual
    // trusted pointerdown, not a box measured before a moving target was pressed.
    window.addEventListener('pointerdown', event => {
      const link = document.querySelector('[data-footer-magnetic]');
      if (!link) return;
      // Chromium's internal ::details-content transitions are not exposed by
      // getAnimations(). A partially rendered actual height proves motion.
      const contentSizes = [...document.querySelectorAll('details[name=about-principles]')].map(e => ({ actual: parseFloat(getComputedStyle(e, '::details-content').blockSize), natural: e.querySelector('div')!.getBoundingClientRect().height }));
      state.down = { trusted: event.isTrusted, onLink: event.target instanceof Node && link.contains(event.target), rect: rect(link), time: performance.now(), pointerId: event.pointerId, height: document.querySelector('[data-about-accordion]')?.getBoundingClientRect().height ?? document.querySelector('details[name=about-principles]')!.parentElement!.getBoundingClientRect().height, textTransform: getComputedStyle(link.querySelector('[data-footer-button-text]')!).transform, rollingTransforms: [...link.querySelectorAll('[data-rolling-copy]')].map(e => getComputedStyle(e).transform), textRect: rect(link.querySelector('[data-footer-button-text]')!), rollingRects: [...link.querySelectorAll('[data-rolling-copy]')].map(rect), contentSizes };
      state.samples = []; state.clicks = []; state.navigation = 0; held = true;
      state.downStyles = ownedStyles(); state.restoredStyles = undefined;
      const sample = () => {
        if (!held || !link.isConnected) return;
        state.samples.push({ rect: rect(link), time: performance.now(), textTransform: getComputedStyle(link.querySelector('[data-footer-button-text]')!).transform, rollingTransforms: [...link.querySelectorAll('[data-rolling-copy]')].map(e => getComputedStyle(e).transform), textRect: rect(link.querySelector('[data-footer-button-text]')!), rollingRects: [...link.querySelectorAll('[data-rolling-copy]')].map(rect) });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, true);
    window.addEventListener('pointerup', event => {
      held = false;
      const link = document.querySelector('[data-footer-magnetic]');
      state.up = { trusted: event.isTrusted, onLink: !!link && event.target instanceof Node && link.contains(event.target), held: !!document.querySelector('[data-about-footer-held]') };
    }, true);
    window.addEventListener('click', event => {
      const link = document.querySelector('[data-footer-magnetic]');
      if (link && event.target instanceof Node && link.contains(event.target)) {
        const click = { trusted: event.isTrusted, held: !!document.querySelector('[data-about-footer-held]'), defaultPrevented: event.defaultPrevented };
        // Native event dispatch can run a microtask between capture listeners.
        // Read cancellation after the whole input task, including the guard.
        state.clicks.push(click); setTimeout(() => { click.defaultPrevented = event.defaultPrevented; }, 0);
      }
    }, true);
    let route = '/about';
    new MutationObserver(() => {
      const next = document.querySelector('main')?.getAttribute('data-route');
      if (next && next !== route) { if (next === '/contact') state.navigation++; route = next; }
    }).observe(document, { childList: true, subtree: true });
  });
}
async function setup(page: Page, mode: string, existingStyles = false, edge = false) {
  await instrument(page); await page.goto('/about'); await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-about-hello]')).toHaveAttribute('aria-disabled', 'false');
  await page.waitForTimeout(850);
  // Setup only; the disclosure that initiates the measured transition is a
  // physical mouse press below. Native name exclusivity is left to the browser.
  await page.locator('details[name=about-principles]').evaluateAll((els, mode) => {
    els.forEach(e => (e as HTMLDetailsElement).open = mode === 'closing' ? e.getAttribute('data-about-value') === '3' : mode === 'switching' ? e.getAttribute('data-about-value') === '2' : false);
  }, mode);
  await page.waitForTimeout(600);
  await page.locator(target).evaluate(e => window.scrollTo({ top: scrollY + e.getBoundingClientRect().top - innerHeight * .55, behavior: 'instant' }));
  await page.waitForTimeout(750);
  const summary = page.locator('[data-about-value="3"] summary');
  let box = (await summary.boundingBox())!;
  // When closing the taller mobile answer, keep its summary below the fixed
  // header. Both the summary and CTA remain in the viewport after this shift.
  if (box.y < 100) {
    await page.evaluate(y => scrollTo({ top: scrollY - (110 - y), behavior: 'instant' }), box.y);
    await page.waitForTimeout(100); box = (await summary.boundingBox())!;
  }
  expect(box.y).toBeGreaterThan(0); expect(box.y + box.height).toBeLessThan(900);
  const initialHeight = await page.locator('details[name=about-principles]').first().evaluate(e => e.parentElement!.getBoundingClientRect().height);
  if (existingStyles) await page.evaluate(() => {
    const accordion = document.querySelector<HTMLElement>('[data-about-accordion]')!;
    accordion.style.setProperty('block-size', 'auto', 'important');
    for (const e of accordion.querySelectorAll<HTMLElement>('details')) {
      e.style.setProperty('--about-held-size', '71px', 'important'); e.style.setProperty('--about-held-opacity', '.7'); e.style.setProperty('--about-held-visibility', 'visible', 'important');
    }
    document.querySelector<HTMLElement>('[data-footer-magnetic]')!.style.setProperty('transition', 'color 3s linear', 'important');
    document.querySelector<HTMLElement>('[data-footer-button-text]')!.style.setProperty('transition', 'transform 3s linear', 'important');
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.up();
  expect(await page.locator('[data-about-value="3"]').evaluate(e => (e as HTMLDetailsElement).open), 'the real summary click reached the disclosure').toBe(mode !== 'closing');
  // Begin within the 450ms transition, after its steep first frames. This
  // improves the precondition's aim without waiting for target stability.
  await page.waitForTimeout(mode === 'closing' ? 60 : 120);
  const link = (await page.locator(target).boundingBox())!;
  const point = { x: link.x + link.width / 2, y: edge ? link.y + 16 : link.y + link.height * (mode === 'closing' ? .25 : .75) };
  await page.mouse.move(point.x, point.y);
  // Deliberately no stability wait and no locator.click on the measured link.
  await page.mouse.down();
  return { point, initialHeight };
}
const raw = (page: Page) => page.evaluate(() => (window as unknown as { a01Press: PressRecord }).a01Press);
async function evidence(page: Page, name: string) { const value = await raw(page); await test.info().attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' }); return value; }
for (const width of [1440, 390]) test(`A01-C01 original lost click at upper edge ${width} 240ms`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const { point } = await setup(page, 'opening', false, true);
  await page.waitForTimeout(240); await page.mouse.up(); await page.waitForTimeout(850);
  const value = await evidence(page, 'native-press-raw');
  expect(value.down?.trusted).toBe(true);
  expect(value.down?.onLink, `MISSED BEFORE POINTERDOWN at ${JSON.stringify(point)}`).toBe(true);
  expect(value.down!.contentSizes.some(a=>a.actual>.1 && a.actual<a.natural-.1), 'actual disclosure transition at pointerdown').toBe(true);
  expect(value.navigation, 'STARTED ON LINK: original native click must navigate exactly once').toBe(1);
  expect(value.clicks).toHaveLength(1); expect(value.clicks[0].trusted).toBe(true);
  const down=value.down!.rect;
  expect(Math.max(...value.samples.map(s=>Math.max(Math.abs(s.rect.x-down.x),Math.abs(s.rect.y-down.y))))).toBeLessThanOrEqual(1);
  expect(value.up?.held).toBe(true); expect(value.clicks[0].held).toBe(true);
});
for (const width of [1440, 390]) for (const mode of ['opening', 'closing', 'switching']) for (const duration of [40, 240, 900]) {
  test(`A01-C01 trusted press ${width} ${mode} ${duration}ms`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { point } = await setup(page, mode);
    await page.waitForTimeout(duration);
    await page.mouse.up();
    await page.waitForTimeout(850);
    const value = await evidence(page, 'native-press-raw');
    expect(value.down?.trusted).toBe(true);
    // A miss is a separate failed precondition, never counted as a lost click.
    expect(value.down?.onLink, `MISSED BEFORE POINTERDOWN at ${JSON.stringify(point)}`).toBe(true);
    expect(value.down!.contentSizes.some(a => a.actual > .1 && a.actual < a.natural - .1), 'pointerdown occurs during the actual disclosure height transition').toBe(true);
    const down = value.down!.rect;
    const displacement = Math.max(...value.samples.map(s => Math.max(Math.abs(s.rect.x - down.x), Math.abs(s.rect.y - down.y))));
    expect(displacement, `STARTED ON LINK: displacement ${displacement}px`).toBeLessThanOrEqual(1);
    // Geometry is the acceptance measure. Matrix serialization can differ by a
    // tiny compositor rounding step even when the rendered movement is .001px.
    const delta = (a: Rect, b: Rect) => Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height));
    expect(Math.max(...value.samples.map(s => delta(s.textRect, value.down!.textRect))), 'magnetic text movement from original pointerdown').toBeLessThanOrEqual(1);
    expect(Math.max(...value.samples.flatMap(s => s.rollingRects.map((r,i) => delta(r,value.down!.rollingRects[i])))), 'rolling text movement from original pointerdown').toBeLessThanOrEqual(1);
    expect(value.clicks).toHaveLength(1); expect(value.clicks[0].trusted).toBe(true);
    expect(value.up?.trusted).toBe(true); expect(value.up?.held).toBe(true); expect(value.clicks[0].held).toBe(true);
    expect(value.navigation).toBe(1); await expect(page.locator('main')).toHaveAttribute('data-route', '/contact');
  });
}
for (const width of [1440, 390]) for (const mode of ['opening', 'closing', 'switching']) test(`A01-C01 outside release resumes and restores styles ${width} ${mode}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page, mode); await page.waitForTimeout(240);
  await page.mouse.move(2, 350); await page.mouse.up(); await page.waitForTimeout(650);
  const value = await evidence(page, 'outside-release'); expect(value.down?.onLink).toBe(true);
  expect(value.clicks).toHaveLength(0); expect(value.navigation).toBe(0);
  await expect(page.locator('[data-about-footer-held],[data-about-held]')).toHaveCount(0);
  const height = await page.locator('details[name=about-principles]').first().evaluate(e => e.parentElement!.getBoundingClientRect().height);
  expect(Math.abs(height - value.down!.height)).toBeGreaterThan(1);
  expect(value.restoredStyles).toEqual(value.downStyles);
});

test('A01-C01 restores existing inline values and priorities exactly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await setup(page, 'switching', true); await page.waitForTimeout(240);
  await page.mouse.move(2, 350); await page.mouse.up(); await page.waitForTimeout(650);
  const value = await evidence(page, 'existing-styles'); expect(value.down?.onLink).toBe(true); expect(value.restoredStyles).toEqual(value.downStyles);
});

for (const signal of ['pointercancel', 'window-exit', 'blur', 'pagehide', 'menu-lock', 'reduced-motion']) test(`A01-C01 canceled press ${signal} cannot revive`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await setup(page, 'opening'); await page.waitForTimeout(80);
  await expect(page.locator('[data-about-footer-held]')).toHaveCount(1);
  // The down is real. These named lifecycle signals are explicitly simulated;
  // no fabricated click, focus transfer or capture is used by the application.
  if (signal === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
  else if (signal === 'menu-lock') await page.evaluate(() => { (document.querySelector('[data-page-content]') as HTMLElement).inert = true; });
  else await page.evaluate(signal => {
    if (signal === 'pointercancel') document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, isPrimary: true, bubbles: true }));
    else if (signal === 'window-exit') document.dispatchEvent(new PointerEvent('pointerout', { pointerId: 1, isPrimary: true, relatedTarget: null, bubbles: true }));
    else window.dispatchEvent(new Event(signal));
  }, signal);
  await expect(page.locator('[data-about-footer-held],[data-about-held]')).toHaveCount(0);
  if (signal === 'menu-lock') await page.evaluate(() => { (document.querySelector('[data-page-content]') as HTMLElement).inert = false; });
  if (signal === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow')); });
  await page.waitForTimeout(120);
  const box = (await page.locator(target).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.up();
  await page.waitForTimeout(700);
  const value = await evidence(page, 'cancellation-' + signal); expect(value.down?.onLink).toBe(true);
  expect(value.navigation).toBe(0); expect(value.clicks.every(c => c.trusted && c.defaultPrevented)).toBe(true); expect(value.restoredStyles).toEqual(value.downStyles);
  await expect(page.locator('[data-about-footer-held],[data-about-held]')).toHaveCount(0);
});

test('A01-C01 keyboard, reduced motion and held magnetic text', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await setup(page, 'switching');
  const valueBefore = await raw(page); await page.waitForTimeout(240);
  await page.mouse.move(2, 350); await page.mouse.move(valueBefore.down!.rect.x + 70, valueBefore.down!.rect.y + 20); await page.waitForTimeout(240);
  const during = await raw(page); expect(during.samples.length).toBeGreaterThan(2);
  expect(new Set(during.samples.map(s => s.textTransform)).size).toBe(1);
  expect(new Set(during.samples.map(s => JSON.stringify(s.rollingTransforms))).size).toBe(1);
  await page.mouse.move(2, 350); await page.mouse.up(); await page.waitForTimeout(700);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const summary = page.locator('[data-about-value="1"] summary'); await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-about-value="1"]')).toHaveAttribute('open'); await expect(summary).toBeFocused();
  expect(await page.locator('[data-about-value="1"]').evaluate(e => getComputedStyle(e, '::details-content').transitionDuration)).toBe('0s');
  const link = page.locator(target); await link.focus(); await expect(link).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toHaveAttribute('data-route', '/contact');
});

test('A01-C01 native touch cancellation and native window exit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 }); await setup(page, 'opening');
  await page.mouse.move(-20, -20); await expect(page.locator('[data-about-footer-held],[data-about-held]')).toHaveCount(0);
  await page.mouse.up(); await page.waitForTimeout(650);
  const exited = await evidence(page, 'native-window-exit'); expect(exited.down?.onLink).toBe(true); expect(exited.navigation).toBe(0);
  const box = (await page.locator(target).boundingBox())!;
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 60, y: box.y + 20 }] });
  await expect(page.locator('[data-about-footer-held]')).toHaveCount(1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('[data-about-footer-held],[data-about-held]')).toHaveCount(0); await page.waitForTimeout(650);
  const value = await evidence(page, 'native-pointercancel'); expect(value.down?.trusted).toBe(true); expect(value.down?.onLink).toBe(true);
  expect(value.canceled?.trusted).toBe(true); expect(value.navigation).toBe(0); expect(value.clicks).toHaveLength(0);
});

test('A01-C01 navigation unmount during a real press restores detached nodes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await setup(page, 'switching');
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll<HTMLElement | SVGElement>('[data-about-accordion],details[name=about-principles],[data-footer-magnetic],[data-footer-button-text],[data-footer-arrow] svg')];
    (window as unknown as { oldAbout: Element[] }).oldAbout = nodes;
  });
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toHaveAttribute('data-route', '/contact');
  await page.mouse.move(2, 350); await page.mouse.up(); await page.waitForTimeout(100);
  const restored = await page.evaluate(() => (window as unknown as { oldAbout: (HTMLElement | SVGElement)[] }).oldAbout.map(e => ({ selector: e.tagName + (e.getAttribute('data-about-value') ?? ''), properties: ['block-size', '--about-held-size', '--about-held-opacity', '--about-held-visibility', 'transform', 'transition'].map(name => ({ name, value: e.style.getPropertyValue(name), priority: e.style.getPropertyPriority(name) })) })));
  const value = await evidence(page, 'unmount-cleanup');
  // The guard restores the press snapshot, then MagneticLink's own unmount
  // cleanup removes its live transforms. Every guard-owned value is released.
  const expected = value.downStyles!.map(e => ({ ...e, properties: e.properties.map(p => p.name === 'transform' && ['A', 'SPAN'].includes(e.selector) ? { ...p, value: '', priority: '' } : p) }));
  expect(restored).toEqual(expected);
  await expect(page.locator('[data-about-footer-held],[data-about-held]')).toHaveCount(0);
});

for (const javaScriptEnabled of [false, true]) test(`A01-C01 ${javaScriptEnabled ? 'delayed hydration' : 'no JavaScript'} native disclosure is immediate and open content stays visible`, async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 390, height: 900 } }); const page = await context.newPage();
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  if (javaScriptEnabled) await page.route('**/*.js', async route => { await gate; await route.continue().catch(() => {}); });
  try {
    await page.goto(baseURL + '/about', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
    await expect(page.locator('main')).not.toHaveAttribute('data-about-guard-ready');
    await page.locator('[data-about-value="3"] summary').click();
    const before = await page.locator('[data-about-value="3"]').evaluate(e => ({ open: (e as HTMLDetailsElement).open, size: getComputedStyle(e, '::details-content').blockSize, opacity: getComputedStyle(e, '::details-content').opacity, visibility: getComputedStyle(e, '::details-content').contentVisibility, transitions: e.getAnimations().filter(a => a instanceof CSSTransition).length }));
    expect(before.open).toBe(true); expect(before.opacity).toBe('1'); expect(before.visibility).toBe('visible'); expect(before.transitions).toBe(0);
    release();
    if (javaScriptEnabled) {
      await expect(page.locator('main')).toHaveAttribute('data-about-guard-ready');
      const after = await page.locator('[data-about-value="3"]').evaluate(e => ({ open: (e as HTMLDetailsElement).open, opacity: getComputedStyle(e, '::details-content').opacity, visibility: getComputedStyle(e, '::details-content').contentVisibility }));
      expect(after).toEqual({ open: true, opacity: '1', visibility: 'visible' });
    } else { await page.locator(target).click(); await expect(page).toHaveURL(/\/contact$/); }
  } finally { release(); await context.close(); }
});

test('A01-C01 native touch up and its pointerout retain the original footer activation', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await instrument(page); await page.goto(baseURL + '/about'); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('main')).toHaveAttribute('data-about-guard-ready');
    await page.locator(target).scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
    await page.locator(target).tap(); await expect(page.locator('main')).toHaveAttribute('data-route', '/contact');
    const value = await evidence(page, 'native-touch-positive'); expect(value.down?.trusted).toBe(true); expect(value.down?.onLink).toBe(true);
    expect(value.up?.trusted).toBe(true); expect(value.clicks).toHaveLength(1); expect(value.clicks[0].trusted).toBe(true); expect(value.navigation).toBe(1);
  } finally { await context.close(); }
});

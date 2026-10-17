import { test, expect, type Page } from '@playwright/test';

type FadeProbe = { fade: Animation; calls: { method: string; time: number | null; pending: boolean; state: AnimationPlayState }[]; creations: number; fadeActive: boolean; clockActive: boolean };
declare global { interface Window { __c01: FadeProbe } }

function instrumentFade() {
  const probe = window.__c01 = { calls: [], creations: 0, fadeActive: false, clockActive: false } as unknown as FadeProbe;
  const animate = Element.prototype.animate, add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document);
  let expectFadeListener = false, fadeListener: EventListenerOrEventListenerObject | undefined, clockListener: EventListenerOrEventListenerObject | undefined;
  document.addEventListener = ((type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === 'visibilitychange') {
      if (expectFadeListener) { fadeListener = callback; probe.fadeActive = true; expectFadeListener = false; }
      else if (!clockListener && !probe.fade) { clockListener = callback; probe.clockActive = true; }
    }
    add(type, callback, options);
  }) as typeof document.addEventListener;
  document.removeEventListener = ((type: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
    if (type === 'visibilitychange' && callback === fadeListener) probe.fadeActive = false;
    if (type === 'visibilitychange' && callback === clockListener) probe.clockActive = false;
    remove(type, callback, options);
  }) as typeof document.removeEventListener;
  Element.prototype.animate = function (frames, options) {
    const animation = animate.call(this, frames, options);
    if (this.matches('[data-curtain-words]') && typeof options === 'object' && options.duration === 800 && options.delay === 500) {
      probe.fade = animation; probe.creations++; expectFadeListener = true;
      for (const method of ['play', 'pause', 'cancel'] as const) {
        const original = animation[method].bind(animation);
        animation[method] = () => { probe.calls.push({ method, time: animation.currentTime as number | null, pending: animation.pending, state: animation.playState }); original(); };
      }
    }
    return animation;
  };
  // Explicit synthetic visibility fixture, never presented as native tab hiding.
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
}
const idle = async (page: Page) => {
  await page.waitForFunction(() => document.querySelector('[data-page-curtain]')?.getAttribute('data-phase') === 'idle' && !document.documentElement.dataset.pageEntry && !document.querySelector<HTMLElement>('[data-transition-shell]')?.inert && document.body.style.overflow !== 'hidden', null, { timeout: 12000 });
};
async function begin(page: Page, owner: 'early' | 'react') {
  await page.addInitScript(instrumentFade);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/static/**/*.js', async route => { await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(() => !!window.__c01.fade);
  await page.evaluate(() => window.__c01.fade.ready);
  if (owner === 'react') { release(); await page.waitForFunction(() => performance.getEntriesByName('tr03:react-ready').length === 1); }
  expect(await page.evaluate(() => performance.getEntriesByName('tr03:react-ready').length)).toBe(owner === 'react' ? 1 : 0);
  return release;
}
const snapshot = (page: Page) => page.evaluate(() => {
  const p = window.__c01, words = document.querySelector('[data-curtain-words]')!;
  return { time: p.fade.currentTime as number | null, state: p.fade.playState, pending: p.fade.pending, opacity: getComputedStyle(words).opacity, label: words.textContent, calls: p.calls.slice(), creations: p.creations, fadeActive: p.fadeActive, clockActive: p.clockActive };
});
const show = (page: Page) => page.evaluate(async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'));
  await window.__c01.fade.ready;
});
async function assertClean(page: Page) {
  await idle(page); const before = await snapshot(page);
  expect(before.creations).toBe(1); expect(before.state).toBe('idle'); expect(before.fadeActive).toBe(false); expect(before.clockActive).toBe(false);
  expect(await page.locator('[data-page-curtain]').evaluate(e => e.getAnimations({ subtree: true }).length)).toBe(0);
  await page.evaluate(() => {
    for (const hidden of [true, false, true, false]) { Object.defineProperty(document, 'hidden', { configurable: true, value: hidden }); document.dispatchEvent(new Event('visibilitychange')); }
  });
  await page.waitForTimeout(100); expect((await snapshot(page)).calls).toEqual(before.calls);
  await test.info().attach('cleanup', { body: JSON.stringify(await snapshot(page)), contentType: 'application/json' });
}
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  (page as Page & { errors: string[] }).errors = errors;
});
test.afterEach(async ({ page }) => { expect((page as Page & { errors: string[] }).errors).toEqual([]); });

for (const owner of ['early', 'react'] as const) {
  test(`delay, middle, finished and repeated visibility preserve one fade (${owner})`, async ({ page }) => {
    const release = await begin(page, owner), rows = [];
    await show(page);
    for (const [phase, target] of [['delay', 200], ['middle', 850], ['finished', 1300]] as const) {
      await page.waitForFunction(t => Number(window.__c01.fade.currentTime) >= t, target, { polling: 'raf' });
      const start = await snapshot(page);
      if (phase === 'delay') expect(start.time!).toBeLessThan(500);
      if (phase === 'finished') { expect(start.state).toBe('finished'); expect(start.opacity).toBe('1'); }
      for (let repeat = 0; repeat < 2; repeat++) {
        await page.evaluate(async () => {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
          await window.__c01.fade.ready;
        });
        const paused = await snapshot(page); await page.waitForTimeout(120); const held = await snapshot(page);
        expect(held.time).toBe(paused.time); expect(held.opacity).toBe(paused.opacity); expect(held.label).toBe(paused.label);
        await page.evaluate(async () => {
          for (const hidden of [true, false, true, false]) { Object.defineProperty(document, 'hidden', { configurable: true, value: hidden }); document.dispatchEvent(new Event('visibilitychange')); }
          await window.__c01.fade.ready;
        });
        const resumed = await snapshot(page);
        expect(resumed.time!).toBeGreaterThanOrEqual(paused.time!); expect(resumed.time! - paused.time!).toBeLessThan(60);
        if (phase === 'finished') { expect(resumed.time).toBe(1300); expect(resumed.opacity).toBe('1'); expect(resumed.calls).toEqual(start.calls); }
        else expect(Number(resumed.opacity)).toBeGreaterThanOrEqual(Number(paused.opacity));
        rows.push({ owner, phase, repeat, start, paused, held, resumed });
      }
    }
    if (owner === 'early') expect(await page.evaluate(() => performance.getEntriesByName('tr03:react-ready').length)).toBe(0);
    release(); await page.waitForLoadState(); await assertClean(page);
    expect(await page.evaluate(() => performance.getEntriesByName('tr03:greetings-start').length)).toBe(1);
    await test.info().attach('visibility-matrix', { body: JSON.stringify({ synthetic: true, rows }), contentType: 'application/json' });
  });
  test(`cancel during pending visibility resume cannot restart after cleanup (${owner})`, async ({ page }) => {
    const release = await begin(page, owner);
    const pending = await page.evaluate(() => {
      for (const hidden of [false, true, false]) { Object.defineProperty(document, 'hidden', { configurable: true, value: hidden }); document.dispatchEvent(new Event('visibilitychange')); }
      const pending = window.__c01.fade.pending;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return pending;
    });
    expect(pending).toBe(true); await assertClean(page); release(); await page.waitForLoadState(); await assertClean(page);
    await expect(page.locator('html')).toHaveAttribute('data-transition-outcome', 'cancelled');
  });
}

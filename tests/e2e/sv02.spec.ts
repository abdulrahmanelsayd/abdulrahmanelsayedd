import { waitForRuntime } from "../support/runtime-ready";
import { test, expect, type Page } from "@playwright/test";
import { audiences, advantages, processPhases, phaseLabels } from "../../src/content/services";
const processSection = (p: Page) => p.locator('[data-section="services-process"]');
const quality = (p: Page) => p.locator('[data-section="advantages"]');
const picker = (p: Page) => p.locator("[data-services-phase-picker]");
const panel = (p: Page, i: number) => p.locator(`[data-services-phase-panel="${i}"]`);
const select = (p: Page, i: number) => p.locator(`label[for="services-phase-${i}"]`).click();
async function ready(p: Page) { await p.goto("/services"); await waitForRuntime(p); await expect(p.locator("[data-services-hero]")).toHaveAttribute("data-services-hero-ready", "true"); }

for (const width of [1440, 390]) test(`SV02 outline continuity at every interruption ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 }); await ready(page);
  const play = page.locator("[data-services-hero-play]"), outline = page.locator("[data-services-hero-outline]");
  // Keep the pointer outside the title so the cached initial pose is B.
  await page.mouse.move(0, 0); await play.focus(); await page.keyboard.press("Enter");
  expect(await outline.evaluate(el => el.getAnimations().length)).toBe(1);
  const rows = await outline.evaluate(async el => {
    const a = el.getAnimations()[0]; a.pause();
    const pose = async (time: number) => {
      a.currentTime = time; await new Promise<void>(r => requestAnimationFrame(() => r()));
      const s = getComputedStyle(el), m = new DOMMatrix(s.transform);
      return { x: m.m41, y: m.m42, width: parseFloat(s.width), height: parseFloat(s.height) };
    };
    const rows = [];
    for (const time of [80, 250, 420, 590, 760, 980, 1120]) {
      const before = await pose(time - .01), at = await pose(time), after = await pose(time + .01);
      rows.push({ time, before, at, after, deltas: Object.keys(before).map(k => Math.abs(after[k as keyof typeof after] - before[k as keyof typeof before])) });
    }
    a.currentTime = 1619; a.play(); return rows;
  });
  for (const row of rows) for (const delta of row.deltas) expect(delta).toBeLessThan(.05);
  await expect(page.locator("[data-services-hero]")).toHaveAttribute("data-services-hero-playing", "false");
  await page.keyboard.press("Space"); await expect(page.locator("[data-services-hero]")).toHaveAttribute("data-services-hero-playing", "true");
  await info.attach("outline-boundaries", { body: JSON.stringify({ diagnosticOnly: true, width, rows }), contentType: "application/json" });
});

test("SV02 initial native semantics, exact copy and SVG geometry", async ({ page }) => {
  await ready(page);
  expect(await processSection(page).locator('details[open]').count()).toBe(0);
  expect(await quality(page).locator('details[open]').count()).toBe(1);
  await expect(picker(page).getByRole("group")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Explore the five project steps" })).toHaveCount(1);
  await expect(picker(page).getByRole("radio")).toHaveCount(5);
  await expect(picker(page).getByRole("radio").first()).toBeChecked();
  for (const [i, item] of audiences.entries()) { await expect(processSection(page).locator('details').nth(i).locator('h2')).toHaveText(item.title); await expect(processSection(page).locator('details').nth(i).locator('p')).toHaveText(item.body); }
  for (const [i, item] of advantages.entries()) { await expect(quality(page).locator('details').nth(i).locator('h3')).toHaveText(item.title); await expect(quality(page).locator('details').nth(i).locator('p')).toHaveText(item.body); }
  for (const [i, item] of processPhases.entries()) {
    await select(page, i); await expect(panel(page, i)).toBeVisible();
    await expect(panel(page, i).locator("h3")).toHaveText(item.title + ".");
    await expect(panel(page, i).locator("svg")).toHaveAttribute("viewBox", "0 0 520 360");
    await expect(picker(page).getByRole("region")).toHaveCount(1);
  }
});

test("SV02 native Arrow keys and Space, panels inaccessible and stable shared height", async ({ page }) => {
  await ready(page); await picker(page).scrollIntoViewIfNeeded();
  const radio = picker(page).getByRole("radio").first(); await radio.focus();
  const rect = await picker(page).locator('label[for="services-phase-0"]').boundingBox();
  for (let i = 1; i < 5; i++) {
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("Space");
    await expect(picker(page).getByRole("radio").nth(i)).toBeChecked();
    expect(await picker(page).locator('label[for="services-phase-0"]').boundingBox()).toEqual(rect);
    for (let j = 0; j < 5; j++) if (j !== i) { await expect(panel(page, j)).toBeHidden(); expect(await panel(page, j).getByRole("heading").count()).toBe(0); }
    await expect(picker(page).getByRole("radio").nth(i)).toBeFocused();
  }
  await page.keyboard.press("ArrowLeft"); await expect(picker(page).getByRole("radio").nth(3)).toBeChecked();
  await page.keyboard.press("Tab"); expect(await page.evaluate(() => document.activeElement?.closest('[data-services-phase-panel]'))).toBeNull();
});

test("SV02 rapid selection cancels previous effects and leaves clean content", async ({ page }) => {
  await ready(page); await picker(page).scrollIntoViewIfNeeded();
  const result = await picker(page).evaluate(el => {
    const choose = (i: number) => { const input = el.querySelector<HTMLInputElement>(`input[value="${i}"]`)!; input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); };
    choose(4); choose(0); choose(3); choose(2);
    const animations = el.querySelector('[data-services-phase-panel="2"]')!.getAnimations({ subtree: true });
    return { durations: animations.map(a => a.effect!.getTiming().duration), delays: animations.map(a => a.effect!.getTiming().delay), inactive: [...el.querySelectorAll('[data-services-phase-panel]:not([data-services-phase-panel="2"])')].map(p => p.getAnimations({ subtree: true }).filter(a => !(a instanceof CSSTransition)).length) };
  });
  expect(result.durations).toContain(320); expect(result.durations).toContain(400); expect(result.delays).toContain(80); expect(result.inactive).toEqual([0, 0, 0, 0]);
  await page.waitForTimeout(700);
  expect(await panel(page, 2).evaluate(el => [...el.querySelectorAll('[data-services-phase-piece], [data-services-process-piece]')].every(piece => getComputedStyle(piece).opacity === "1" && ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(getComputedStyle(piece).transform)))).toBe(true);
});

test("SV02 independent native disclosures, instant height and stable long presses", async ({ page }) => {
  await ready(page);
  const audience = processSection(page).locator("details"), detail = quality(page).locator("details");
  await audience.nth(0).locator("summary").click(); await detail.nth(1).locator("summary").click();
  await expect(audience.nth(0)).toHaveAttribute("open"); await expect(detail.nth(1)).toHaveAttribute("open"); await expect(detail.nth(0)).not.toHaveAttribute("open");
  await audience.nth(2).locator("summary").click(); await expect(audience.nth(0)).not.toHaveAttribute("open"); await expect(detail.nth(1)).toHaveAttribute("open");
  const geometry = await detail.nth(2).evaluate(el => { const before = el.getBoundingClientRect().height; (el.querySelector("summary") as HTMLElement).click(); return { before, after: el.getBoundingClientRect().height, style: (el as HTMLElement).style.height, effects: el.getAnimations().map(a => (a.effect as KeyframeEffect).getKeyframes()) }; });
  expect(geometry.after).toBeGreaterThan(geometry.before); expect(geometry.style).toBe(""); expect(geometry.effects.flat().some(k => "height" in k || "maxHeight" in k || "gridTemplateRows" in k)).toBe(false);
  const summary = detail.nth(3).locator("summary"); await summary.scrollIntoViewIfNeeded(); const box = await summary.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down(); await page.waitForTimeout(600); expect(await summary.boundingBox()).toEqual(box); await page.mouse.up();
  await expect(detail.nth(3)).toHaveAttribute("open");
  await summary.focus(); await page.keyboard.press("Space"); await expect(detail.nth(3)).not.toHaveAttribute("open"); await expect(summary).toBeFocused();
});

test("SV02 menu/visibility pause phase animation and reduced motion keeps native controls", async ({ page }) => {
  await ready(page); await picker(page).scrollIntoViewIfNeeded(); await select(page, 1);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  const times = await panel(page, 1).evaluate(el => el.getAnimations({ subtree: true }).map(a => a.currentTime));
  await page.waitForTimeout(150); expect(await panel(page, 1).evaluate(el => el.getAnimations({ subtree: true }).map(a => a.currentTime))).toEqual(times);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  await select(page, 3); await page.locator("[data-menu-toggle]").click();
  expect(await panel(page, 3).evaluate(el => el.getAnimations({ subtree: true }).every(a => a.playState === "paused" || a.playState === "finished"))).toBe(true);
  await page.keyboard.press("Escape"); await expect(page.locator("[data-page-content]")).toHaveJSProperty("inert", false); await picker(page).getByRole("radio").nth(3).focus();
  await page.emulateMedia({ reducedMotion: "reduce" }); await expect(picker(page).getByRole("radio").nth(3)).toBeFocused(); await page.keyboard.press("ArrowRight");
  await expect(panel(page, 4)).toBeVisible(); expect(await panel(page, 4).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
});

test("SV02 no JavaScript: all stages, native independent details and full visible SVGs", async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage(); await page.goto("/services");
    for (let i = 0; i < 5; i++) { await select(page, i); await expect(panel(page, i)).toBeVisible(); await expect(picker(page).getByRole("region")).toHaveCount(1); }
    await picker(page).getByRole("radio").last().focus(); await page.keyboard.press("ArrowLeft"); await expect(panel(page, 3)).toBeVisible();
    await processSection(page).locator("summary").first().click(); await quality(page).locator("summary").nth(2).click();
    expect(await processSection(page).locator("details[open]").count()).toBe(1); expect(await quality(page).locator("details[open]").count()).toBe(1);
    await expect(quality(page).getByRole("heading", { name: "The details are included." })).toBeVisible();
    await expect(page.locator("footer")).toHaveCount(1);
  } finally { await context.close(); }
});

test("SV02 delayed hydration preserves native selection, disclosure and already-visible content", async ({ page }) => {
  let release!: () => void; const barrier = new Promise<void>(r => { release = r; });
  await page.route("**/_next/**/*.js", async route => { await barrier; await route.continue(); });
  await page.goto("/services", { waitUntil: "domcontentloaded" }); await select(page, 4); await quality(page).locator("summary").nth(2).click();
  release(); await expect(page.locator("[data-services-hero]")).toHaveAttribute("data-services-hero-ready", "true");
  await expect(picker(page).getByRole("radio").last()).toBeChecked(); await expect(quality(page).locator("details").nth(2)).toHaveAttribute("open");
  await expect(quality(page).locator("[data-services-section-enter]").first()).toHaveCSS("opacity", "1");
});

test("SV02 scroll across new sections/ribbon to footer, cleanup and re-entry without errors", async ({ page }) => {
  const errors: string[] = [], missing: string[] = []; page.on("pageerror", e => errors.push(e.message)); page.on("response", r => { if (r.status() >= 400) missing.push(r.url()); });
  await ready(page);
  for (const area of [page.locator('[data-services-ribbon]'), processSection(page), quality(page)]) {
    await area.scrollIntoViewIfNeeded(); const y = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 250); await page.waitForTimeout(650); expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y);
    expect(await area.locator('[data-scroll-native]').count()).toBe(0);
  }
  await page.locator('footer').scrollIntoViewIfNeeded(); await expect(page.locator('footer')).toBeInViewport();
  const detached = await picker(page).evaluateHandle(el => el); await page.locator('footer a[href="/about"]').first().click(); await expect(page.locator("main")).toHaveAttribute("data-route", "/about");
  expect(await detached.evaluate(el => el.getAnimations({ subtree: true }).filter(a => !(a instanceof CSSTransition)).length)).toBe(0);
  await page.goBack(); await expect(picker(page).getByRole("radio").first()).toBeChecked(); await expect(quality(page).locator('details[open]')).toHaveCount(1); expect(errors).toEqual([]); expect(missing).toEqual([]);
});

test("SV02 entrance/drawing pixel thresholds, one-time lengths, stable links and observer cleanup", async ({ page }) => {
  await page.addInitScript(() => {
    const observers = new Map<IntersectionObserver, Set<Element>>(), margins: string[] = [], lengths = new Map<Element, number>(), listeners = new Set<EventListenerOrEventListenerObject>();
    Object.assign(window, { __sv02Probe: { observers, margins, lengths, listeners } });
    const Base = IntersectionObserver;
    window.IntersectionObserver = class extends Base {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) { super(callback, options); margins.push(options?.rootMargin || ""); }
      observe(el: Element) { if (el.matches("[data-services-section-enter],[data-services-draw],[data-services-check]")) { if (!observers.has(this)) observers.set(this, new Set()); observers.get(this)!.add(el); } super.observe(el); }
      unobserve(el: Element) { observers.get(this)?.delete(el); super.unobserve(el); }
      disconnect() { observers.delete(this); super.disconnect(); }
    };
    const length = SVGGeometryElement.prototype.getTotalLength;
    SVGGeometryElement.prototype.getTotalLength = function () { if (this.closest("[data-services-section-motion]")) lengths.set(this, (lengths.get(this) || 0) + 1); return length.call(this); };
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, options) { if (this instanceof Element && (this.matches("[data-services-phase-picker]") || (this.matches("details") && this.closest("[data-services-section-motion]"))) && fn && !(typeof fn === "function" && fn.name.startsWith("bound "))) listeners.add(fn); return add.call(this, type, fn, options); };
    EventTarget.prototype.removeEventListener = function (type, fn, options) { if (fn) listeners.delete(fn); return remove.call(this, type, fn, options); };
  });
  await ready(page); await quality(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(80);
  const effects = await quality(page).evaluate(el => el.getAnimations({ subtree: true }).map(a => ({ duration: a.effect!.getTiming().duration, easing: a.effect!.getTiming().easing })));
  expect(effects.some(a => a.duration === 1100)).toBe(true);
  const probe = () => page.evaluate(() => { const p = (window as unknown as { __sv02Probe: { observers: Map<IntersectionObserver, Set<Element>>; margins: string[]; lengths: Map<Element, number>; listeners: Set<unknown> } }).__sv02Probe; return { observers: p.observers.size, listeners: p.listeners.size, margins: p.margins, lengths: [...p.lengths.values()] }; });
  let p = await probe(); expect(p.margins).toContain("0px 0px -63.00000000000001px 0px"); expect(p.margins).toContain("0px 0px -117px 0px"); expect(p.lengths.length).toBeGreaterThan(0); expect(p.lengths.every(n => n === 1)).toBe(true);
  await page.setViewportSize({ width: 1400, height: 900 }); await page.waitForTimeout(200); p = await probe(); expect(p.lengths.every(n => n === 1)).toBe(true);
  const link = page.getByRole("link", { name: "Discuss your website" }); await link.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); const box = await link.boundingBox();
  await page.mouse.move(box!.x + 10, box!.y + 10); await page.mouse.down(); await page.waitForTimeout(600); expect(await link.boundingBox()).toEqual(box); await page.mouse.up();
  await expect(page.locator("main")).toHaveAttribute("data-route", "/contact"); p = await probe(); expect(p.observers).toBe(0); expect(p.listeners).toBe(0);
});

for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [992, 900], [1366, 600], [1440, 900], [599, 900], [600, 900], [899, 900], [900, 900]]) test(`SV02 layout and every phase ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height }); await ready(page);
  for (let i = 0; i < phaseLabels.length; i++) { await select(page, i); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await quality(page).locator('summary').nth(4).click(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await quality(page).locator('svg[data-services-draw]').last().isVisible()).toBe(width >= 600);
});

import { fileURLToPath } from "node:url";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { serviceModes, servicesDescription } from "../../src/content/services";

const hero = (p: Page) => p.locator("[data-services-hero]");
const play = (p: Page) => p.getByRole("button", { name: "Play with the Build title" });
const ribbon = (p: Page) => p.locator("[data-services-ribbon]");
const panel = (p: Page, mode = "together") => p.locator(`[data-services-panel="${mode}"]`);
const select = (p: Page, mode: string) => p.locator(`label[for="services-mode-${mode}"]`).click();
const ready = async (p: Page) => { await p.goto("/services"); await expect(hero(p)).toHaveAttribute("data-services-hero-ready", "true"); };
const animations = (p: Page) => hero(p).evaluate(el => el.getAnimations({ subtree: true }).filter(a => !(a instanceof CSSTransition)).length);
const finish = async (p: Page) => expect(hero(p)).toHaveAttribute("data-services-hero-playing", "false");

test("SV01 production origin/build, server HTML, metadata and phase boundary", async ({ page, request }, info) => {
  expect(new URL(info.project.use.baseURL!).protocol).toBe("http:");
  const response = await request.get("/services"), html = await response.text();
  const runtime = fileURLToPath(new URL("../../.next", import.meta.url));
  const disk = await readFile(runtime + "/server/app/services.html", "utf8");
  const hash = (s: string) => createHash("sha256").update(s).digest("hex");
  expect(hash(html)).toBe(hash(disk));
  expect(html).toContain(serviceModes[2].body); expect(html).toContain("Choose the part you need.");
  await ready(page); await expect(page.locator("main")).toHaveAttribute("id", "main-content");
  await expect(page.locator("main")).toHaveAttribute("tabindex", "-1");
  await expect(page.locator("h1")).toHaveCount(1); await expect(page.locator("footer")).toHaveCount(1);
  await expect(page.locator('[data-section="services-process"],[data-section="advantages"]')).toHaveCount(2);
  expect(await page.locator("main > [data-section],main > #services-studio").evaluateAll(els => els.map(el => el.getAttribute("data-section")))).toEqual(["services-introduction", "capabilities", "services-process", "advantages"]);
  await expect(page).toHaveTitle("Services | Abdulrahman Elsayed");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", servicesDescription);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL("/services", process.env.SITE_URL).href);
  await info.attach("identity", { body: JSON.stringify({ build: (await readFile(runtime + "/BUILD_ID", "utf8")).trim(), origin: info.project.use.baseURL, htmlSha256: hash(html) }), contentType: "application/json" });
});

for (const activation of ["click", "Enter", "Space"]) test(`SV01 assembly ${activation}, repeat suppression and fixed playground`, async ({ page }) => {
  await ready(page); const box = await play(page).boundingBox();
  if (activation === "click") await play(page).click(); else { await play(page).focus(); await page.keyboard.press(activation); }
  await expect(hero(page)).toHaveAttribute("data-services-hero-playing", "true");
  const count = await animations(page); expect(count).toBe(8);
  await play(page).evaluate(el => { for (let i = 0; i < 8; i++) (el as HTMLButtonElement).click(); });
  expect(await animations(page)).toBe(count); expect(await play(page).boundingBox()).toEqual(box);
  const timing = await hero(page).evaluate(el => el.getAnimations({ subtree: true }).filter(a => !(a instanceof CSSTransition)).map(a => ({ duration: a.effect!.getTiming().duration, delay: a.effect!.getTiming().delay })));
  expect(timing.some(t => t.duration === 1620 && t.delay === 0)).toBe(true);
  expect(timing.some(t => t.duration === 160 && t.delay === 360)).toBe(true);
  await finish(page); expect(await animations(page)).toBe(0);
});

test("SV01 cached pointer poses, limits, pointer leave, resize/font measurements", async ({ page }) => {
  await ready(page);
  const letters = page.locator("[data-services-hero-letter]"), target = await letters.nth(4).boundingBox();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2); await page.waitForTimeout(350);
  const outline = page.locator("[data-services-hero-outline]"); expect((await outline.boundingBox())!.x).toBeGreaterThan(target!.x - 20);
  const reads = await play(page).evaluate(el => {
    let reads = 0; const original = Element.prototype.getBoundingClientRect, computed = window.getComputedStyle;
    Element.prototype.getBoundingClientRect = function () { reads++; return original.call(this); };
    window.getComputedStyle = (...args) => { reads++; return computed(...args); };
    el.dispatchEvent(new PointerEvent("pointermove", { clientX: 1100, clientY: 300, pointerType: "mouse" }));
    Element.prototype.getBoundingClientRect = original; window.getComputedStyle = computed; return reads;
  });
  expect(reads).toBe(0);
  await page.waitForTimeout(320);
  const pupil = page.locator("[data-services-hero-pupils]");
  const xy = await pupil.evaluate(el => { const m = new DOMMatrix(getComputedStyle(el).transform); return [m.m41, m.m42]; });
  expect(Math.abs(xy[0])).toBeLessThanOrEqual(3); expect(Math.abs(xy[1])).toBeLessThanOrEqual(2);
  await page.mouse.move(0, 600); await page.waitForTimeout(350);
  const b = await letters.first().boundingBox(); expect(Math.abs((await outline.boundingBox())!.x - b!.x)).toBeLessThan(15);
  for (const width of [768, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(380); const b = await letters.first().boundingBox(); expect(Math.abs((await outline.boundingBox())!.x - b!.x)).toBeLessThan(15); }
  await page.evaluate(() => document.fonts.dispatchEvent(new Event("loadingdone"))); await expect(play(page)).toHaveAttribute("aria-disabled", "false");
});

test("SV01 Canvas unavailable fallback stays finite and playable", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
  await ready(page); const b = await page.locator("[data-services-hero-outline]").boundingBox(); expect(b!.width).toBeGreaterThan(0);
  await play(page).click(); await finish(page);
});

test("SV01 modes, native keyboard, fast switching, hidden accessibility and active gaze", async ({ page }) => {
  await ready(page); await expect(page.getByRole("radio", { name: "Both", exact: true })).toBeChecked();
  for (const mode of serviceModes) {
    await select(page, mode.id); await expect(panel(page, mode.id)).toBeVisible();
    await expect(panel(page, mode.id).getByRole("heading", { level: 3 })).toHaveText(mode.title);
    await expect(page.getByRole("link", { name: "Discuss your website" })).toHaveCount(1);
    for (const other of serviceModes.filter(m => m.id !== mode.id)) await expect(panel(page, other.id)).toBeHidden();
  }
  await page.getByRole("radio", { name: "Both", exact: true }).focus(); await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "Develop", exact: true })).toBeChecked(); await page.keyboard.press(" ");
  await page.locator("[data-services-studio]").evaluate(el => { for (const mode of ["design", "develop", "together", "design"]) { const input = el.querySelector<HTMLInputElement>(`input[value="${mode}"]`)!; input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); } });
  await expect(panel(page, "design")).toBeVisible();
  expect(await panel(page, "together").evaluate(el => el.getAnimations({ subtree: true }).filter(a => !(a instanceof CSSTransition)).length)).toBe(0);
  await page.waitForTimeout(650); const area = await page.locator("[data-services-studio]").boundingBox();
  await page.mouse.move(area!.x + area!.width - 5, area!.y + 5); await page.waitForTimeout(380);
  expect(await panel(page, "together").locator("[data-services-pupil]").evaluate(el => (el as SVGElement).style.transform)).toBe("");
  const gaze = await panel(page, "design").locator("[data-services-pupil]").evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41); expect(Math.abs(gaze)).toBeLessThanOrEqual(3);
  await page.getByRole("radio", { name: "Design", exact: true }).focus();
  for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); expect(await page.evaluate(() => document.activeElement?.closest("[data-services-panel]")?.getAttribute("data-services-panel") ?? "design")).toBe("design"); }
});

test("SV01 disclosure uses immediate native height, closes inactive details, Explore and Contact", async ({ page }) => {
  await ready(page); await page.getByRole("link", { name: "Explore services" }).click(); await expect(page).toHaveURL(/#services-studio$/);
  await expect(page.locator("#services-studio")).toBeFocused();
  const result = await panel(page).locator("details").first().evaluate(el => {
    const before = el.getBoundingClientRect().height; (el.querySelector("summary") as HTMLElement).click();
    return { before, after: el.getBoundingClientRect().height, heightStyle: (el as HTMLElement).style.height };
  });
  expect(result.after).toBeGreaterThan(result.before + 60); expect(result.heightStyle).toBe("");
  await page.waitForTimeout(450); const footer = await page.locator("footer").boundingBox(); await page.waitForTimeout(100); expect(await page.locator("footer").boundingBox()).toEqual(footer);
  await select(page, "develop"); await expect(panel(page).locator("details").first()).not.toHaveAttribute("open");
  await page.getByRole("link", { name: "Discuss your website" }).click(); await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("main")).toHaveAttribute("data-route", "/contact");
});

test("SV01 ribbon manual state, hover/offscreen guards, resume and seamless 60s loop", async ({ page }) => {
  await ready(page); await ribbon(page).scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
  await expect(ribbon(page)).toHaveAttribute("data-ribbon-running", "true");
  const toggle = page.locator("[data-ribbon-toggle]"); await toggle.focus(); await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "true"); await expect(ribbon(page)).toHaveAttribute("data-ribbon-running", "false");
  const current = await ribbon(page).evaluate(el => el.getAnimations()[0]?.currentTime ?? el.getAnimations({ subtree: true }).find(a => a instanceof CSSAnimation)?.currentTime);
  await page.waitForTimeout(150); expect(await ribbon(page).evaluate(el => el.getAnimations({ subtree: true }).find(a => a instanceof CSSAnimation)?.currentTime)).toBe(current);
  await page.keyboard.press("Enter"); await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await ribbon(page).hover(); await expect(ribbon(page)).toHaveAttribute("data-ribbon-running", "false"); await page.mouse.move(0, 0); await expect(ribbon(page)).toHaveAttribute("data-ribbon-running", "true");
  const loop = await ribbon(page).evaluate(el => {
    const track = el.firstElementChild!.firstElementChild as HTMLElement, groups = [...track.children];
    const a = track.getAnimations().find(a => a instanceof CSSAnimation)!; a.pause();
    const width = groups[0].getBoundingClientRect().width; a.currentTime = 59999; const before = new DOMMatrix(getComputedStyle(track).transform).m41;
    a.currentTime = 60001; const after = new DOMMatrix(getComputedStyle(track).transform).m41;
    return { duration: a.effect!.getTiming().duration, widths: groups.map(g => g.getBoundingClientRect().width), seam: Math.abs(before + width - after) };
  });
  expect(loop.duration).toBe(60000); expect(loop.widths[0]).toBe(loop.widths[1]); expect(loop.seam).toBeLessThan(.2);
  await toggle.evaluate(el => (el as HTMLButtonElement).click()); await page.reload(); await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => scrollTo(0, 0)); await expect(ribbon(page)).toHaveAttribute("data-ribbon-running", "false");
});

test("SV01 menu/visibility guards pause assembly; reduced motion preserves focused controls", async ({ page }) => {
  await ready(page); await play(page).click(); await page.locator("[data-menu-toggle]").click();
  await expect(play(page)).toHaveAttribute("aria-disabled", "true");
  const time = await hero(page).evaluate(el => el.getAnimations({ subtree: true }).find(a => !(a instanceof CSSTransition))?.currentTime);
  await page.waitForTimeout(160); expect(await hero(page).evaluate(el => el.getAnimations({ subtree: true }).find(a => !(a instanceof CSSTransition))?.currentTime)).toBe(time);
  await page.keyboard.press("Escape"); await expect(play(page)).toHaveAttribute("aria-disabled", "false"); await finish(page);
  await play(page).focus(); await page.emulateMedia({ reducedMotion: "reduce" }); await expect(play(page)).toBeFocused();
  await expect(play(page)).toHaveAttribute("aria-disabled", "true"); await page.keyboard.press("Enter"); expect(await animations(page)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(play(page)).toHaveAttribute("aria-disabled", "true");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
  await ribbon(page).scrollIntoViewIfNeeded(); const toggle = page.locator("[data-ribbon-toggle]"); await toggle.focus();
  await page.emulateMedia({ reducedMotion: "reduce" }); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute("aria-disabled", "true");
});

test("SV01 No-JS native radios/arrows/Space/details/links and static ribbon", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage(); await page.goto("/services");
    await expect(play(page)).toBeVisible(); await expect(play(page)).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("[data-services-hero-outline]")).toBeHidden(); await expect(page.locator("[data-ribbon-toggle]")).toBeHidden();
    await page.getByRole("radio", { name: "Both", exact: true }).focus(); await page.keyboard.press("ArrowLeft"); await expect(panel(page, "develop")).toBeVisible(); await page.keyboard.press("Space");
    await panel(page, "develop").locator("summary").click(); await expect(panel(page, "develop").locator("details")).toHaveAttribute("open");
    await expect(page.getByRole("link", { name: "Discuss your website" })).toHaveAttribute("href", "/contact");
    expect(await ribbon(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await page.getByRole("link", { name: "Explore services" }).click(); await expect(page).toHaveURL(/#services-studio$/);
    await page.mouse.wheel(0, 180); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});

test("SV01 delayed hydration keeps native selection/details and visible copy", async ({ page }) => {
  let release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/**/*.js", async route => { await barrier; await route.continue(); });
  await page.goto("/services", { waitUntil: "domcontentloaded" });
  await select(page, "design"); await panel(page, "design").locator("summary").click();
  await expect(page.getByRole("heading", { name: "Pages with a clear purpose." })).toBeVisible();
  release(); await expect(hero(page)).toHaveAttribute("data-services-hero-ready", "true");
  await expect(page.getByRole("radio", { name: "Design", exact: true })).toBeChecked(); await expect(panel(page, "design").locator("details")).toHaveAttribute("open");
  await expect(page.locator("[data-services-hero-enter]").first()).toHaveCSS("opacity", "1");
});

test("SV01 removal cleans native listeners, observers and all animations", async ({ page }) => {
  await page.addInitScript(() => {
    const active = new Set<EventListenerOrEventListenerObject>(), observers = new Set<ResizeObserver | IntersectionObserver>();
    Object.assign(window, { __sv01Cleanup: { active, observers } });
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    // React's four bound native toggle dispatchers stay attached to detached DOM
    // until GC; the probe counts registrations owned by these service islands.
    EventTarget.prototype.addEventListener = function (type, fn, options) { if (this instanceof Element && this.matches("[data-services-hero-play],[data-services-studio],[data-services-ribbon],[data-ribbon-toggle],[data-services-detail]") && fn && !(typeof fn === "function" && fn.name.startsWith("bound "))) active.add(fn); return add.call(this, type, fn, options); };
    EventTarget.prototype.removeEventListener = function (type, fn, options) { if (fn) active.delete(fn); return remove.call(this, type, fn, options); };
    for (const name of ["ResizeObserver", "IntersectionObserver"] as const) {
      const Base = window[name]; const observe = Base.prototype.observe, disconnect = Base.prototype.disconnect;
      Base.prototype.observe = function (el: Element, options?: ResizeObserverOptions) { if (el.matches("[data-services-hero-play],[data-services-studio],[data-services-ribbon]")) observers.add(this); return observe.call(this, el, options); };
      Base.prototype.disconnect = function () { observers.delete(this); return disconnect.call(this); };
    }
  });
  await ready(page); await play(page).click();
  const counts = () => page.evaluate(() => { const c = (window as unknown as { __sv01Cleanup: { active: Set<unknown>; observers: Set<unknown> } }).__sv01Cleanup; return [c.active.size, c.observers.size]; });
  expect((await counts())[0]).toBeGreaterThan(8); expect((await counts())[1]).toBe(3);
  await page.locator("[data-menu-toggle]").click(); await page.locator('[data-site-header] a[href="/contact"]').first().click();
  await expect(page.locator("main")).toHaveAttribute("data-route", "/contact");
  const remaining = await page.evaluate(() => [...(window as unknown as { __sv01Cleanup: { active: Set<EventListener> } }).__sv01Cleanup.active].map(fn => ({ name: fn.name, source: String(fn).slice(0, 300) })));
  expect(await counts(), JSON.stringify(remaining)).toEqual([0, 0]);
});

for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [992, 900], [1366, 600], [1440, 900]]) test(`SV01 geometry/focus ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height }); await ready(page);
  const size = await play(page).boundingBox(); await play(page).focus(); await page.keyboard.press("Space");
  expect(await play(page).boundingBox()).toEqual(size); await finish(page);
  for (const mode of serviceModes) { await select(page, mode.id); await page.waitForTimeout(620); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.getByRole("link", { name: "Discuss your website" }).focus(); const initial = await page.evaluate(() => scrollY); await page.waitForTimeout(120);
  expect(await page.evaluate(() => scrollY)).toBe(initial);
});

test("SV01 breakpoint edges 599/600,899/900,1023/1024", async ({ page }, info) => {
  await ready(page); const rows = [];
  for (const width of [599, 600, 899, 900, 1023, 1024]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(380);
    rows.push(await page.locator("[data-services-studio]").evaluate(el => ({ width: innerWidth, columns: getComputedStyle(el.querySelector("[data-services-panel]")!).gridTemplateColumns, tabs: getComputedStyle(el.firstElementChild!).position, overflow: document.documentElement.scrollWidth > innerWidth })));
    expect(rows.at(-1)!.overflow).toBe(false);
  }
  await info.attach("edges", { body: JSON.stringify(rows), contentType: "application/json" });
});

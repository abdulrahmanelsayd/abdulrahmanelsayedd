import { waitForRuntime } from "../support/runtime-ready";
import { test, expect } from "@playwright/test";

type Geometry = { x: number; y: number; width: number; height: number };
type StartProbe = { before: Geometry; after: Geometry; first: Geometry; target: Geometry; transitionTimes: number[]; trusted: boolean; owners: number; duration: number; stageBefore: Geometry; stageAfter: Geometry };

for (const width of [1440, 390]) for (const activation of ["click", "Enter", "Space"]) test(`SV02-C01 displayed hover start ${width} ${activation}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    const geometry = (element: Element): Geometry => {
      const s = getComputedStyle(element), m = new DOMMatrixReadOnly(s.transform);
      return { x: m.m41, y: m.m42, width: parseFloat(s.width), height: parseFloat(s.height) };
    };
    const rect = (e: Element): Geometry => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    let before: Partial<StartProbe>;
    document.addEventListener("click", event => {
      const stage = (event.target as Element).closest("[data-services-hero-play]");
      if (!stage) return;
      const el = document.querySelector<HTMLElement>("[data-services-hero-outline]")!;
      const m = new DOMMatrixReadOnly(el.style.transform);
      before = { before: geometry(el), target: { x: m.m41, y: m.m42, width: parseFloat(el.style.width), height: parseFloat(el.style.height) }, transitionTimes: el.getAnimations().filter(a => a instanceof CSSTransition).map(a => Number(a.currentTime)), trusted: event.isTrusted, stageBefore: rect(stage) };
    }, true);
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const a = original.apply(this, args);
      if (this.matches("[data-services-hero-outline]")) {
        const effect = a.effect as KeyframeEffect, k = effect.getKeyframes()[0], m = new DOMMatrixReadOnly(String(k.transform));
        Object.assign(window, { __c01Start: { ...before, after: geometry(this), first: { x: m.m41, y: m.m42, width: parseFloat(String(k.width)), height: parseFloat(String(k.height)) }, owners: this.getAnimations().filter(a => !(a instanceof CSSTransition)).length, duration: effect.getTiming().duration, stageAfter: rect(document.querySelector("[data-services-hero-play]")!) } });
      }
      return a;
    };
  });
  await page.goto("/services"); await waitForRuntime(page);
  await expect(page.locator("[data-services-hero]")).toHaveAttribute("data-services-hero-ready", "true");
  const stage = page.locator("[data-services-hero-play]");
  await page.mouse.move(0, 0); await stage.focus();
  const last = (await page.locator("[data-services-hero-letter]").last().boundingBox())!;
  await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2);
  // Allow a painted intermediate pose, well before the 320ms transition ends.
  await page.waitForTimeout(35);
  if (activation === "click") { await page.mouse.down(); await page.mouse.up(); }
  else await page.keyboard.press(activation);
  const probe = await page.evaluate(() => (window as unknown as { __c01Start: StartProbe }).__c01Start);
  await info.attach("displayed-start", { body: JSON.stringify({ width, activation, diagnosticOnly: true, probe }), contentType: "application/json" });
  expect(probe.trusted).toBe(true); expect(probe.transitionTimes.length).toBeGreaterThan(0);
  expect(probe.transitionTimes.every(t => t >= 0 && t < 320)).toBe(true);
  expect(Math.abs(probe.before.x - probe.target.x)).toBeGreaterThan(1);
  for (const key of ["x", "y", "width", "height"] as const) {
    expect(Math.abs(probe.before[key] - probe.first[key])).toBeLessThan(.02);
    expect(Math.abs(probe.before[key] - probe.after[key])).toBeLessThan(.02);
  }
  expect(probe.owners).toBe(1); expect(probe.duration).toBe(1620); expect(probe.stageAfter).toEqual(probe.stageBefore);
});

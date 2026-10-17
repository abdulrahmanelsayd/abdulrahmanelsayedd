import { test, expect, type Page, type TestInfo } from "@playwright/test";

type Sample = { time: number; y: number };
type WheelRun = { origin: number; target: number; samples: Sample[]; final: number; wheel: { dy: number; trusted: boolean; prevented: boolean } | null; settled: boolean };
const ready = async (page: Page) => {
  await page.goto("/");
  await expect(page.locator('[data-section=hero]')).toHaveAttribute('data-hero-entry','complete');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await expect(page.locator("[data-capability-marquee]")).toHaveAttribute("data-marquee-enhanced", "true");
};

// Sample actual positions throughout the gesture. Completion requires the correct
// target AND 180ms of stability, rather than a position at a fixed short timeout.
async function wheelRun(page: Page, selector: string): Promise<WheelRun> {
  if (selector === "page") await page.mouse.move(1100, 450);
  else await page.locator(selector).hover();
  await page.evaluate(() => {
    const state = { origin: scrollY, target: scrollY + 120, samples: [] as Sample[], final: scrollY, wheel: null as WheelRun["wheel"], settled: false };
    const start = performance.now(); let last = scrollY, changed = start, frame = 0;
    const wheel = (event: WheelEvent) => { state.wheel = { dy: event.deltaY, trusted: event.isTrusted, prevented: event.defaultPrevented }; };
    window.addEventListener("wheel", wheel, { once: true, passive: true });
    const done = new Promise<WheelRun>(resolve => {
      const sample = (time: number) => {
        state.samples.push({ time, y: scrollY });
        if (scrollY !== last) { last = scrollY; changed = time; }
        state.final = scrollY;
        if (state.wheel && Math.abs(scrollY - state.target) <= 1 && time - changed >= 180) state.settled = true;
        if (state.settled || time - start > 8000) { cancelAnimationFrame(frame); window.removeEventListener("wheel", wheel); resolve(state); }
        else frame = requestAnimationFrame(sample);
      };
      frame = requestAnimationFrame(sample);
    });
    Object.assign(window, { sc01C01Run: done });
  });
  await page.mouse.wheel(0, 120);
  return page.evaluate(() => (window as unknown as { sc01C01Run: Promise<WheelRun> }).sc01C01Run);
}

function verify(run: WheelRun) {
  expect(run.wheel?.trusted).toBe(true);
  expect(run.wheel?.dy).toBe(120);
  expect(run.settled).toBe(true);
  expect(run.final).toBeCloseTo(run.target, 0);
  const intermediate = [...new Set(run.samples.filter(s => s.y > run.origin && s.y < run.target).map(s => s.y))];
  expect(intermediate.length, "several distinct actual intermediate scroll positions").toBeGreaterThanOrEqual(3);
  expect(run.samples.every(s => s.y >= run.origin && s.y <= run.target + 1)).toBe(true);
}

async function compare(page: Page, info: TestInfo, selector: string) {
  const runs: { region: string; run: WheelRun }[] = [];
  for (const region of ["[data-page-content] main", selector]) {
    await page.locator("[data-marquee-viewport]").evaluate(el => scrollTo(0, scrollY + el.getBoundingClientRect().top - innerHeight / 2));
    await expect.poll(() => page.locator("[data-capability-marquee]").getAttribute("data-marquee-running")).toBe("true");
    runs.push({ region, run: await wheelRun(page, region.includes("main") ? "page" : region) });
  }
  await info.attach("actual-scroll-trajectories", { body: JSON.stringify(runs, null, 2), contentType: "application/json" });
  for (const item of runs) verify(item.run);
}

test("SC01-C01 animated marquee vertical wheel has gradual page movement and the exact final target", async ({ page }, info) => {
  await ready(page); await compare(page, info, "[data-marquee-viewport]");
});

test("SC01-C01 closed header vertical wheel has gradual page movement and the exact final target", async ({ page }, info) => {
  await ready(page); await expect(page.locator("[data-site-header]")).toHaveAttribute("data-open", "false");
  await compare(page, info, "[data-menu-toggle]");
});

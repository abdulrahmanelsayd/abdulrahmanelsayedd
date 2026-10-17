import { test, expect, type Page } from "@playwright/test";

const ready = async (page: Page) => { await page.goto("/"); await expect(page.locator('[data-section=hero]')).toHaveAttribute('data-hero-entry','complete'); await page.evaluate(() => document.fonts.ready); await expect(page.locator("html")).toHaveClass(/lenis/); };
const stable = async (page: Page) => page.evaluate(() => new Promise<number>(resolve => {
  let last = scrollY, changed = performance.now();
  const sample = (time: number) => { if (last !== scrollY) { last = scrollY; changed = time; } if (time - changed >= 700) resolve(scrollY); else requestAnimationFrame(sample); };
  requestAnimationFrame(sample);
}));

test("SC01-C01 native menu owner only exists while open; internal wheel and closing preserve the page", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 480 }); await ready(page);
  await expect(page.locator("[data-navigation-scope]")).not.toHaveAttribute("data-scroll-native");
  await expect(page.locator("[data-menu-panel] [data-scroll-native]")).toHaveCount(0);
  await page.mouse.move(280, 350); await page.mouse.wheel(0, 900);
  await page.waitForFunction(() => scrollY > 0 && scrollY < 900);
  await page.locator("[data-menu-toggle]").click();
  await expect(page.locator("[data-page-content]")).toHaveAttribute("inert");
  const locked = await page.evaluate(() => scrollY), viewport = page.locator("[data-menu-panel] [data-scroll-native]");
  await expect(viewport).toHaveCount(1);
  // Wait for the real opening transitions before choosing the wheel hit point.
  await page.locator("[data-site-header]").evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  const dimensions = await viewport.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
  expect(dimensions.content).toBeGreaterThan(dimensions.height);
  const rect = (await viewport.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + Math.min(rect.height / 2, 70));
  await page.mouse.wheel(0, 160);
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await stable(page)).toBe(locked);
  await page.keyboard.press("Tab"); await expect(page.locator("[data-navigation-scope]")).toContainText("Work");
  expect(await page.evaluate(() => document.activeElement?.closest("[data-navigation-scope]") !== null)).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("[data-navigation-scope]") !== null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-site-header]")).toHaveAttribute("data-closing", "true");
  await expect(page.locator("[data-menu-panel] [data-scroll-native]")).toHaveCount(0);
  await page.mouse.wheel(0, 200); expect(await page.evaluate(() => scrollY)).toBe(locked);
  await expect(page.locator("[data-page-content]")).not.toHaveAttribute("inert");
  expect(await stable(page)).toBe(locked); await expect(page.locator("[data-menu-toggle]")).toBeFocused();
  await info.attach("menu-lock", { body: JSON.stringify({ locked, dimensions, final: await page.evaluate(() => scrollY) }), contentType: "application/json" });
});

test("SC01-C01 reduced motion fallback retains native horizontal marquee scrolling through resize and re-enhancement", async ({ page }) => {
  await ready(page); await page.emulateMedia({ reducedMotion: "reduce" });
  const viewport = page.locator("[data-marquee-viewport]");
  await expect(viewport).toHaveAttribute("data-scroll-native", "");
  await expect(page.locator("[data-capability-marquee]")).not.toHaveAttribute("data-marquee-enhanced");
  await viewport.scrollIntoViewIfNeeded(); await viewport.hover(); await page.mouse.wheel(0, 0); await page.mouse.wheel(160, 0);
  await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 768, height: 800 }); await expect(viewport).toHaveAttribute("data-scroll-native", "");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("[data-capability-marquee]")).toHaveAttribute("data-marquee-enhanced", "true");
  await expect(viewport).not.toHaveAttribute("data-scroll-native");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  expect(await viewport.evaluate(el => el.scrollLeft)).toBe(0);
});

test("SC01-C01 No-JS fallback retains native horizontal marquee and vertical page scrolling", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage(); await page.goto("/"); const viewport = page.locator("[data-marquee-viewport]");
    await expect(viewport).toHaveAttribute("data-scroll-native"); await viewport.scrollIntoViewIfNeeded(); await viewport.hover();
    await page.mouse.wheel(160, 0); await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    const y = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 120); await expect.poll(() => page.evaluate(() => scrollY)).toBe(y + 120);
    await expect(page.locator("[data-header-nojs]")).toBeVisible();
  } finally { await context.close(); }
});

test("SC01-C01 input, textarea, select and editable native exceptions stay available", async ({ page }) => {
  await ready(page);
  for (const tag of ["input", "textarea", "select", "div"]) {
    await page.evaluate(tag => {
      const field = document.createElement(tag); field.setAttribute("data-c01-field", "");
      if (tag === "div") field.setAttribute("contenteditable", "true");
      if (tag === "select") field.innerHTML = "<option>Native input probe</option>";
      field.style.cssText = "position:fixed;left:200px;top:300px;width:180px;height:40px;z-index:999";
      document.querySelector("main")!.append(field); scrollTo(0, 400);
    }, tag);
    await stable(page); await page.locator("[data-c01-field]").hover();
    await page.evaluate(() => Object.assign(window, { c01FieldWheel: new Promise<boolean>(resolve => window.addEventListener("wheel", e => resolve(e.defaultPrevented), { once: true, passive: true })) }));
    await page.mouse.wheel(0, 120);
    expect(await page.evaluate(() => (window as unknown as { c01FieldWheel: Promise<boolean> }).c01FieldWheel)).toBe(false);
    expect(await stable(page)).toBeGreaterThanOrEqual(400);
    await page.evaluate(() => document.querySelector("[data-c01-field]")!.remove());
  }
});

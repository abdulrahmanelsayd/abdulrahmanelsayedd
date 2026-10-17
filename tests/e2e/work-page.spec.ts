import { waitForRuntime } from "../support/runtime-ready";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { getProject, workProjectIds } from "../../src/content/projects";

const projects = workProjectIds.map(getProject);
const sizes = [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }];
const title = (page: Page) => page.locator("[data-work-playground]");
const cards = (page: Page) => page.locator("[data-work-card]");
async function titleReady(page: Page) {
  await waitForRuntime(page);
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  await expect(page.locator('[data-section="work-title"]')).toHaveAttribute("data-work-title-ready", String(!reduced));
  // Native disabled marks the pre-hydration fallback; aria-disabled preserves focus.
  await expect.poll(() => title(page).evaluate(el => (el as HTMLButtonElement).disabled)).toBe(false);
  if (reduced) await expect(title(page)).toBeDisabled();
  else await expect(title(page)).toBeEnabled();
}
async function ready(page: Page) {
  await page.goto("/work");
  await page.evaluate(() => document.fonts.ready);
  await titleReady(page);
}

test("Work production HTML contains the full ordered gallery and real headings before hydration", async ({ request, page }) => {
  const response = await request.get("/work");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toBe(await readFile(fileURLToPath(new URL("../..", import.meta.url)) + "/.next/server/app/work.html", "utf8"));
  // Parse only actual HTML nodes, independent of RSC/script payload strings.
  await page.setContent(html);
  await expect(page.locator("main h1")).toHaveText(`Work — ${projects.length} featured websites across 3 countries`);
  await expect(page.locator("main")).not.toContainText("Page in preparation");
  expect(await cards(page).evaluateAll(elements => elements.map(el => el.getAttribute("data-project-id")))).toEqual([...workProjectIds]);
  for (const [index, project] of projects.entries()) {
    const card = cards(page).nth(index);
    await expect(card.locator("h3")).toHaveText(project.name);
    await expect(card).toContainText(new URL(project.href).hostname);
    await expect(card.locator("a")).toHaveAttribute("href", project.href);
    await expect(card.locator("a")).toHaveAttribute("target", "_blank");
    await expect(card.locator("a")).toHaveAttribute("rel", "noopener noreferrer");
    await expect(card.locator("a img").first()).toHaveAttribute("width", String(project.preview.width));
    await expect(card.locator("a img").first()).toHaveAttribute("height", String(project.preview.height));
  }
  expect(await page.locator('link[rel="preload"][as="image"]').evaluateAll(elements => elements.some(el => /images(?:\/|%2F)projects/.test(el.outerHTML)))).toBe(false);
});

for (const size of sizes) {
  test(`Work remains usable without JavaScript at ${size.width}x${size.height}`, async ({ browser }) => {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, javaScriptEnabled: false, viewport: size });
    try {
      const page = await context.newPage();
      await page.goto("/work");
      await page.evaluate(() => document.fonts.ready);
      await expect(cards(page)).toHaveCount(projects.length);
      await expect(title(page)).toBeDisabled();
      expect(await title(page).evaluate(el => (el as HTMLButtonElement).disabled)).toBe(true);
      for (const [index, project] of projects.entries()) {
        const card = cards(page).nth(index);
        await card.locator("a").focus();
        await expect(card.locator("h3")).toBeInViewport();
        await expect(card.locator("h3")).toHaveText(project.name);
        expect(await card.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
      }
      await page.getByRole("navigation", { name: "Footer navigation" }).locator('a[href="/about"]').click();
      await expect(page.locator("main")).toHaveAttribute("data-route", "/about");
      await page.goBack(); await expect(cards(page)).toHaveCount(projects.length);
      await page.reload(); await expect(cards(page)).toHaveCount(projects.length);
    } finally { await context.close(); }
  });
}

for (const size of [...sizes, { width: 767, height: 1024 }, { width: 1023, height: 900 }, { width: 1024, height: 900 }, { width: 844, height: 390 }]) {
  test(`gallery geometry, keyboard visibility and focus at ${size.width}x${size.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await ready(page);
    const documentWidth = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      available: document.documentElement.clientWidth,
    }));
    expect(documentWidth.scroll).toBe(documentWidth.available);
    const columns = size.width < 768 ? 1 : size.width < 1024 ? 2 : 3;
    expect(await page.locator("[data-work-gallery]").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(columns);
    const dimensions = await cards(page).locator("a").evaluateAll(elements => elements.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })));
    expect(dimensions.every(box => Math.abs(box.height / box.width - 1.5) < .001)).toBe(true);
    const first = cards(page).first().locator("a");
    await first.focus();
    for (let index = 0; index < projects.length; index++) {
      const anchor = cards(page).nth(index).locator("a");
      await expect(anchor).toBeFocused();
      await expect(cards(page).nth(index).locator("h3")).toBeInViewport();
      const state = await cards(page).nth(index).evaluate(el => ({ opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform, outline: getComputedStyle(el.querySelector("a")!).outlineWidth }));
      expect(state.opacity).toBe("1");
      expect(state.transform).toBe("none");
      expect(state.outline).toBe("3px");
      if (index < projects.length - 1) await page.keyboard.press("Tab");
    }
    await testInfo.attach("keyboard-last-card", { body: await page.screenshot(), contentType: "image/png" });
  });
}

test("native project clicks, Control, Shift and middle clicks retain their destinations and new tab behavior", async ({ page, context }) => {
  await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Intercepted project destination</title>" }));
  await ready(page);
  const anchor = cards(page).first().locator("a");
  for (const click of [{}, { modifiers: ["Control" as const] }, { modifiers: ["Shift" as const] }, { button: "middle" as const }]) {
    // This Chromium runtime bypasses context routing for modified external tabs.
    // Validate the original href, then exercise those native modifiers against a
    // local intercepted destination, avoiding external network dependency.
    await expect(anchor).toHaveAttribute("href", projects[0].href);
    const destination = "modifiers" in click || "button" in click ? new URL("/native-project-probe", test.info().project.use.baseURL).href : projects[0].href;
    if (destination !== projects[0].href) await anchor.evaluate((el, href) => el.setAttribute("href", href), destination);
    const opened = context.waitForEvent("page");
    await anchor.click(click);
    const tab = await opened;
    await tab.waitForLoadState();
    expect(tab.url()).toBe(destination);
    await expect(page).toHaveURL(/\/work$/);
    await tab.close();
    await anchor.evaluate((el, href) => el.setAttribute("href", href), projects[0].href);
  }
});

test("title pointer, eyes, repeated presses and resizing have bounded motion and clean teardown", async ({ page }) => {
  await ready(page);
  const stage = title(page);
  await stage.focus();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * .85, box.y + box.height * .25);
  await expect.poll(() => page.locator("[data-work-pupil]").first().evaluate(el => getComputedStyle(el).transform)).not.toBe("none");
  const position = await page.locator("[data-work-cursor]").evaluate(el => (el as HTMLElement).style.translate);
  expect(position).not.toBe("");
  await page.mouse.move(2, 400);
  await expect.poll(() => page.locator("[data-work-pupil]").first().evaluate(el => el.getAttribute("style"))).toBe("transform: translate(0px, 0px);");
  for (let index = 0; index < 20; index++) await stage.dispatchEvent("click");
  expect(await stage.evaluate(el => el.getAnimations({ subtree: true }).length)).toBeLessThanOrEqual(8);
  await expect.poll(() => stage.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.keyboard.press("Space");
  await expect.poll(() => stage.evaluate(el => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect.poll(() => stage.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await page.locator("[data-work-letter]").evaluateAll(elements => elements.every(el => getComputedStyle(el).transform === "none"))).toBe(true);
  await stage.evaluate(el => { Object.assign(window, { departedTitle: el }); });
  await stage.click();
  await page.getByRole("navigation", { name: "Footer navigation" }).locator('a[href="/about"]').click();
  await expect(page.locator("main")).toHaveAttribute("data-route", "/about");
  expect(await page.evaluate(() => {
    const el = (window as unknown as { departedTitle: HTMLElement }).departedTitle;
    return { connected: el.isConnected, animations: el.getAnimations({ subtree: true }).length, cleanTransforms: [...el.querySelectorAll<HTMLElement>("[data-work-letter],[data-work-pupil],[data-work-cursor]")].every(node => !node.style.transform && !node.style.translate), nativeDisabled: (el as HTMLButtonElement).disabled, ariaDisabled: el.getAttribute("aria-disabled") };
  })).toEqual({ connected: false, animations: 0, cleanTransforms: true, nativeDisabled: true, ariaDisabled: null });
  await page.goBack(); await expect(title(page)).toBeEnabled();
  await page.goForward(); await expect(page.locator("main")).toHaveAttribute("data-route", "/about");
});

test("reduced motion at load and live changes cancel title and gallery effects without replay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  expect(await page.locator("main").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await title(page).dispatchEvent("click");
  expect(await title(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await titleReady(page);
  await title(page).focus(); await page.keyboard.press("Enter");
  await expect.poll(() => title(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await titleReady(page);
  await expect.poll(() => page.locator("main").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(title(page)).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await titleReady(page);
  await cards(page).nth(6).scrollIntoViewIfNeeded();
  await expect.poll(() => cards(page).nth(6).evaluate(el => el.getAnimations().length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await titleReady(page);
  await expect.poll(() => page.locator("main").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await cards(page).evaluateAll(elements => elements.every(el => getComputedStyle(el).transform === "none" && getComputedStyle(el).opacity === "1"))).toBe(true);
});

for (const initialMotion of ["reduce", "no-preference"] as const) {
  test(`Work title announces availability and retains focus across preference changes from ${initialMotion}`, async ({ page, context }, testInfo) => {
    await page.addInitScript(() => {
      const state = Object.assign(window, { workTitleAnimationCalls: 0 });
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        if (this.closest('[data-section="work-title"]')) state.workTitleAnimationCalls++;
        return animate.apply(this, args);
      };
    });
    await page.emulateMedia({ reducedMotion: initialMotion });
    await ready(page);
    const stage = title(page);
    const calls = () => page.evaluate(() => (window as unknown as { workTitleAnimationCalls: number }).workTitleAnimationCalls);
    const active = () => stage.evaluate(el => el.getAnimations({ subtree: true }).length);
    if (initialMotion === "reduce") {
      expect(await calls()).toBe(0);
      expect(await page.locator("main").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    }
    await stage.focus();
    const cdp = await context.newCDPSession(page);
    const assertState = async (motion: "reduce" | "no-preference", label: string) => {
      await titleReady(page);
      await expect(stage).toBeFocused();
      if (motion === "reduce") await expect(stage).toHaveAttribute("aria-disabled", "true");
      else await expect(stage).not.toHaveAttribute("aria-disabled", "true");
      await expect(stage).toMatchAriaSnapshot(motion === "reduce"
        ? '- button "Play with the Work title" [disabled]'
        : '- button "Play with the Work title"');
      const tree = await cdp.send("Accessibility.getFullAXTree");
      const button = tree.nodes.find(node => !node.ignored && node.role?.value === "button" && node.name?.value === "Play with the Work title");
      expect(button).toBeDefined();
      const property = (name: string) => button!.properties?.find(item => item.name === name)?.value.value;
      expect(property("disabled") === true).toBe(motion === "reduce");
      expect(property("focusable")).toBe(true);
      expect(property("focused")).toBe(true);
      await testInfo.attach(label, { body: JSON.stringify(button, null, 2), contentType: "application/json" });
    };
    const playAllInputs = async () => {
      for (const input of ["click", "Enter", "Space"]) {
        const before = await calls();
        if (input === "click") await stage.click();
        else await page.keyboard.press(input);
        await expect.poll(active).toBeGreaterThan(0);
        expect(await active()).toBeLessThanOrEqual(8);
        expect(await calls()).toBeGreaterThan(before);
        await expect(stage).toBeFocused();
        await expect.poll(active).toBe(0);
      }
    };
    await assertState(initialMotion, "initial-accessibility-state");
    if (initialMotion === "reduce") {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await assertState("no-preference", "enabled-while-focused");
      expect(await active()).toBe(0); // No entrance replay on preference change.
    }
    await playAllInputs();
    // Change preference during an active wave, with keyboard focus on the button.
    await page.keyboard.press("Enter");
    await expect.poll(active).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await assertState("reduce", "disabled-while-focused");
    await expect.poll(() => page.locator("main").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    const before = await calls();
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + box.width * .85, box.y + box.height * .25);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    for (let index = 0; index < 20; index++) await stage.dispatchEvent("click");
    expect(await calls()).toBe(before);
    expect(await active()).toBe(0);
    expect(await stage.locator("[data-work-letter],[data-work-pupil]").evaluateAll(elements => elements.every(el => getComputedStyle(el).transform === "none"))).toBe(true);
    await expect(stage).toBeFocused();
    await page.mouse.move(2, 400);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await assertState("no-preference", "restored-while-focused");
    expect(await active()).toBe(0);
    await playAllInputs();
    await cdp.detach();
  });
}

test("touch taps play one wave and live reduced motion cancels it", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage(); await page.goto("/work");
    await page.evaluate(() => document.fonts.ready); await expect(title(page)).toBeEnabled();
    await title(page).tap();
    await expect.poll(() => title(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
    await title(page).tap();
    expect(await title(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBeLessThanOrEqual(8);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => title(page).evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(page.getByText("Go on, tap it.")).toBeHidden();
  } finally { await context.close(); }
});

test("delayed project images keep exact card and footer geometry", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/image?**", async route => { await held; await route.continue(); });
  await page.goto("/work", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  const geometry = () => page.locator("[data-work-card] a,footer").evaluateAll(elements => elements.map(el => { const box = el.getBoundingClientRect(); return { x: box.x, y: box.y + scrollY, width: box.width, height: box.height }; }));
  const before = await geometry();
  await expect(cards(page).first().locator("h3")).toHaveText(projects[0].name);
  expect(await cards(page).first().locator("img").first().evaluate(el => (el as HTMLImageElement).complete)).toBe(false);
  release();
  await cards(page).first().locator("img").first().evaluate(el => (el as HTMLImageElement).decode());
  expect(await geometry()).toEqual(before);
});

test("late JavaScript keeps server headings, links and card content visible", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async route => { await held; await route.continue(); });
  await page.goto("/work", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await expect(cards(page)).toHaveCount(projects.length);
  await expect(cards(page).first().locator("h3")).toBeVisible();
  // The shared pre-hydration intro lease is intentionally inert, with a bounded rescue.
  await expect(page.locator("html")).toHaveAttribute("data-page-entry","pending");
  await waitForRuntime(page);
  await cards(page).last().locator("a").focus();
  await expect(cards(page).last().locator("h3")).toBeInViewport();
  release();
  await expect(title(page)).toBeEnabled();
  await expect(cards(page).last().locator("a")).toBeFocused();
  expect(await cards(page).last().evaluate(el => getComputedStyle(el).opacity)).toBe("1");
});

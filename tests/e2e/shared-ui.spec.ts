import { waitForRuntime } from "../support/runtime-ready";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/content/routes";
import { identity } from "../../src/content/identity";

const sizes = [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }];
const toggle = (page: Page) => page.locator("[data-menu-toggle]");
const panel = (page: Page) => page.locator("[data-menu-panel]");
const background = (page: Page) => page.locator("[data-page-content]");
const whatsapp = (page: Page) => page.locator("[data-floating-whatsapp]");
const waTrigger = (page: Page) => page.locator("[data-whatsapp-trigger]");
async function ready(page: Page, route = "/work") {
  await page.goto(route); await waitForRuntime(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(waTrigger(page)).toBeVisible();
}
async function closed(page: Page) {
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
  await expect(background(page)).not.toHaveAttribute("inert");
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
}

test("all routes load directly with landmarks, titles, approved link orders and no runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const route of routes) {
    const response = await page.goto(route.href); await waitForRuntime(page);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveAttribute("data-route", route.href);
    await expect(page).toHaveTitle(route.id === "home" ? `${identity.name} | ${identity.role}` : `${route.label} | ${identity.name}`);
    await expect(page.getByRole("banner")).toHaveCount(1);
    const footerNavigation = page.getByRole("navigation", { name: "Footer navigation" });
    {
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      expect(await footerNavigation.locator("a").evaluateAll(links => links.map(link => link.getAttribute("href")))).toEqual(["/", "/services", "/work", "/about", "/contact"]);
      await expect(footerNavigation.locator('a[aria-current="page"]')).toHaveAttribute("href", route.href);
    }
    expect(await panel(page).getAttribute("inert")).not.toBeNull();
    await expect(panel(page)).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("[data-work-card]")).toHaveCount(route.id === "work" ? 10 : 0);
    await expect(panel(page).getByRole("link", { name: "Rifq Shop", exact: true })).toHaveCount(0);
    if (route.id === "contact") {
      await expect(page.locator('[data-section="contact-cta"]')).toHaveCount(0);
      await expect(page.locator("footer [data-copy-email]")).toHaveCount(0);
      await expect(page.locator("footer a[href^='mailto:']")).toHaveCount(0);
    } else {
      await expect(page.locator('[data-section="contact-cta"]')).toBeVisible();
      await expect(page.locator("footer a[href^='mailto:']")).toHaveAttribute("href", `mailto:${identity.email}`);
      await expect(page.locator("footer a[href^='tel:']")).toHaveAttribute("href", identity.phoneUri);
    }
  }
  expect(errors).toEqual([]);
});

for (const size of sizes) {
  test(`menu keyboard containment, dismissals and navigation at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await ready(page);
    await toggle(page).focus();
    await page.keyboard.press("Enter");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(background(page)).toHaveAttribute("inert", "");
    await expect(whatsapp(page)).toHaveAttribute("data-blocked", "true");
    await expect(toggle(page)).toBeFocused();
    const count = await page.locator("[data-navigation-scope]").evaluate(scope => [...scope.querySelectorAll<HTMLElement>("a[href],button")]
      .filter(el => el.tabIndex >= 0 && el.getClientRects().length && !el.closest("[inert]")).length);
    for (let index = 0; index < count; index++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest("[data-navigation-scope]"))).toBe(true);
    }
    await expect(toggle(page)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(toggle(page)).not.toBeFocused();
    await page.keyboard.press("Tab");
    await expect(toggle(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await closed(page);
    await expect(toggle(page)).toBeFocused();
    await toggle(page).click();
    await panel(page).getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    await closed(page);
    await expect(toggle(page)).not.toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.goBack();
    await expect(page.locator("main")).toHaveAttribute("data-route", "/work");
    await page.goForward();
    await expect(page.locator("main")).toHaveAttribute("data-route", "/about");
  });
}

test("footer navigation visits the other routes and browser history follows naturally", async ({ page }) => {
  await ready(page, "/work");
  for (const route of routes.slice(1)) {
    await page.getByRole("navigation", { name: "Footer navigation" }).locator(`a[href="${route.href}"]`).click();
    await expect(page.locator("main")).toHaveAttribute("data-route", route.href);
  }
  await page.goBack(); await expect(page.locator("main")).toHaveAttribute("data-route", "/services");
  await page.goForward(); await expect(page.locator("main")).toHaveAttribute("data-route", "/contact");
});

test("menu restores exact prior styles, inert attribute and scroll after outside dismissal", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    document.body.style.setProperty("overflow", "auto", "important");
    document.body.style.setProperty("padding-right", "7px", "important");
    document.documentElement.style.setProperty("--navigation-gutter", "3px", "important");
    document.querySelector("[data-page-content]")!.setAttribute("inert", "previous");
    window.scrollTo(0, 120);
  });
  const before = await page.evaluate(() => ({ body: document.body.getAttribute("style"), html: document.documentElement.getAttribute("style"), y: scrollY }));
  await toggle(page).click();
  await page.mouse.wheel(0, 500);
  expect(await page.evaluate(() => scrollY)).toBe(before.y);
  await page.mouse.click(5, page.viewportSize()!.height - 5);
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
  const after = await page.evaluate(() => ({ body: document.body.getAttribute("style"), html: document.documentElement.getAttribute("style"), y: scrollY }));
  expect(after).toEqual(before);
  await expect(background(page)).toHaveAttribute("inert", "previous");
  await expect(toggle(page)).toBeFocused();
});

test("rapid reversals, resizing and reduced motion changes leave no locks or hidden focus", async ({ page }) => {
  await ready(page);
  for (let index = 0; index < 11; index++) await toggle(page).evaluate(button => (button as HTMLButtonElement).click());
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  await panel(page).getByRole("link", { name: "Design Develop Let’s work together. Get in touch" }).focus();
  await page.setViewportSize({ width: 320, height: 480 });
  await expect(toggle(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await closed(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await toggle(page).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Escape");
  await closed(page);
  await expect(toggle(page)).toBeFocused();
});

test("modified internal clicks open a native new tab without closing the menu", async ({ page, context }) => {
  await ready(page);
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  // This checks native modified-link semantics after the finite opening motion.
  // Wait for its actual animations, rather than an arbitrary timeout or an
  // accidental hit during the panel's delayed geometry changes.
  await page.locator("[data-navigation-scope]").evaluate(async scope => {
    await Promise.all(scope.getAnimations({ subtree: true })
      .filter(animation => Number.isFinite(animation.effect?.getTiming().iterations))
      .map(animation => animation.finished.catch(() => {})));
  });
  await page.evaluate(() => {
    const clicks: Array<{ href: string | null; ctrl: boolean; prevented: boolean; trusted: boolean }> = [];
    Object.assign(window, { testModifiedClicks: clicks });
    document.addEventListener("click", event => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor) clicks.push({ href: anchor.getAttribute("href"), ctrl: event.ctrlKey, prevented: event.defaultPrevented, trusted: event.isTrusted });
    });
  });
  const newTab = context.waitForEvent("page");
  await panel(page).getByRole("link", { name: "About", exact: true }).click({ modifiers: ["Control"] });
  expect(await page.evaluate(() => (window as unknown as {
    testModifiedClicks: Array<{ href: string; ctrl: boolean; prevented: boolean; trusted: boolean }>;
  }).testModifiedClicks)).toEqual([{ href: "/about", ctrl: true, prevented: false, trusted: true }]);
  const opened = await newTab;
  await opened.waitForLoadState();
  expect(opened.url()).toMatch(/\/about$/);
  await opened.close();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(/\/work$/);
});

for (const mode of ["success", "rejection", "absent"] as const) {
  test(`clipboard ${mode} announces the result and keeps the native email selectable`, async ({ page }) => {
    await page.addInitScript(mode => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: mode === "absent" ? undefined : { writeText: () => mode === "success" ? Promise.resolve() : Promise.reject(new Error("Denied")) } });
    }, mode);
    await ready(page);
    await page.getByRole("button", { name: "Copy email address" }).click();
    await expect(page.locator("footer").getByRole("status")).toHaveText(mode === "success" ? "Email copied." : "Select the email address to copy it.");
    const address = page.locator("footer a[href^='mailto:'] span");
    const selected = await address.evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const selection = getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
      return selection?.toString();
    });
    expect(selected).toBe(identity.email);
    await expect(page.locator('footer [role="status"]')).toHaveText("", { timeout: 4000 });
  });
}

test("out of order clipboard completions and unmount cannot publish stale results", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const pending: Array<{ resolve: () => void; reject: () => void }> = [];
    Object.assign(window, { pendingCopies: pending });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => new Promise<void>((resolve, reject) => pending.push({ resolve, reject: () => reject(new Error("Denied")) })) } });
  });
  await ready(page);
  const copy = page.locator("[data-copy-email]");
  await copy.click(); await copy.click();
  await page.evaluate(() => (window as unknown as { pendingCopies: Array<{ reject: () => void }> }).pendingCopies[1].reject());
  await expect(page.locator("footer").getByRole("status")).toHaveText("Select the email address to copy it.");
  await page.evaluate(() => (window as unknown as { pendingCopies: Array<{ resolve: () => void }> }).pendingCopies[0].resolve());
  await expect(page.locator("footer").getByRole("status")).toHaveText("Select the email address to copy it.");
  await copy.click();
  await page.getByRole("navigation", { name: "Footer navigation" }).locator('a[href="/contact"]').click();
  await expect(page.locator("main")).toHaveAttribute("data-route", "/contact");
  await waitForRuntime(page);
  await page.evaluate(() => (window as unknown as { pendingCopies: Array<{ resolve: () => void }> }).pendingCopies[2].resolve());
  await expect(page.locator("[data-contact-status]")).toHaveText("");
  await expect(page.locator("[data-contact-status]")).not.toContainText("copied");
  expect(await page.getByRole("status").allTextContents()).toEqual(["", "", ""]);
  expect(errors).toEqual([]);
});

test("WhatsApp hover, pin, outside, Escape, focus order and menu coordination", async ({ page, context }) => {
  await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.addInitScript(() => {
    const attempts: Array<{ href: string; preventedByApplication: boolean; ctrl: boolean }> = [];
    Object.assign(window, { externalAttempts: attempts });
    window.addEventListener("click", event => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor || anchor.origin === location.origin) return;
      attempts.push({ href: anchor.href, preventedByApplication: event.defaultPrevented, ctrl: event.ctrlKey });
      event.preventDefault();
    });
  });
  await ready(page);
  await waTrigger(page).hover(); await expect(whatsapp(page)).toHaveAttribute("data-open", "true");
  await page.mouse.move(100, 400); await expect(whatsapp(page)).toHaveAttribute("data-open", "false");
  await waTrigger(page).click(); await page.mouse.move(100, 400);
  await expect(whatsapp(page)).toHaveAttribute("data-open", "true");
  await waTrigger(page).focus(); await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Chat on desktop" })).toBeFocused();
  await page.keyboard.press("Shift+Tab"); await expect(waTrigger(page)).toBeFocused();
  await page.keyboard.press("Escape"); await expect(whatsapp(page)).toHaveAttribute("data-open", "false");
  await expect(waTrigger(page)).toBeFocused();
  await expect(page.getByRole("link", { name: "Chat on desktop" })).toHaveCount(0);
  await page.keyboard.press("Space"); await expect(whatsapp(page)).toHaveAttribute("data-open", "true");
  await page.mouse.click(100, 400); await expect(whatsapp(page)).toHaveAttribute("data-open", "false");
  await waTrigger(page).click();
  await toggle(page).click(); await expect(whatsapp(page)).toHaveAttribute("data-blocked", "true");
  await page.keyboard.press("Escape"); await closed(page);
  await expect(whatsapp(page)).toHaveAttribute("data-open", "false");
  await waTrigger(page).click({ modifiers: ["Control"] });
  expect(await page.evaluate(() => (window as unknown as { externalAttempts: Array<{ preventedByApplication: boolean }> }).externalAttempts.filter(attempt => !attempt.preventedByApplication))).toEqual([{ href: identity.whatsappUri, preventedByApplication: false, ctrl: true }]);
  await waTrigger(page).click();
  await page.getByRole("link", { name: "Chat on desktop" }).click();
  expect(await page.evaluate(() => (window as unknown as { externalAttempts: Array<{ preventedByApplication: boolean }> }).externalAttempts.filter(attempt => !attempt.preventedByApplication))).toEqual([
    { href: identity.whatsappUri, preventedByApplication: false, ctrl: true },
    { href: identity.whatsappUri, preventedByApplication: false, ctrl: false },
  ]);
});

for (const size of [{ width: 719, height: 480 }, { width: 720, height: 479 }, { width: 720, height: 480 }, { width: 767, height: 480 }, { width: 768, height: 480 }, { width: 991, height: 500 }, { width: 992, height: 500 }, { width: 1440, height: 400 }]) {
  test(`responsive mode and usable menu at boundary ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size); await ready(page);
    const desktop = size.width >= 720 && size.height >= 480;
    if (desktop) await expect(waTrigger(page)).toHaveAttribute("role", "button");
    else await expect(waTrigger(page)).not.toHaveAttribute("role");
    if (desktop) {
      await waTrigger(page).click(); await page.getByRole("link", { name: "Chat on desktop" }).focus();
      await page.setViewportSize({ width: 719, height: 479 });
      await expect(whatsapp(page)).toHaveAttribute("data-open", "false");
      await expect(waTrigger(page)).toBeFocused();
      await page.setViewportSize(size);
      await expect(whatsapp(page)).toHaveAttribute("data-open", "false");
    }
    await toggle(page).click();
    await panel(page).getByRole("link", { name: "Services", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toHaveAttribute("data-route", "/services");
    await closed(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test("touch/coarse mode uses intercepted native WhatsApp links and short landscape navigation", async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await context.addInitScript(() => {
    const attempts: string[] = []; Object.assign(window, { externalAttempts: attempts });
    window.addEventListener("click", event => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor && anchor.origin !== location.origin) { attempts.push(anchor.href); event.preventDefault(); }
    });
  });
  try {
    const page = await context.newPage(); await page.goto("/work");
    await expect(waTrigger(page)).not.toHaveAttribute("role");
    await waTrigger(page).click();
    expect(await page.evaluate(() => (window as unknown as { externalAttempts: string[] }).externalAttempts)).toEqual([identity.whatsappUri]);
    await toggle(page).click();
    await panel(page).getByRole("link", { name: "Services", exact: true }).click();
    await expect(page.locator("main")).toHaveAttribute("data-route", "/services");
  } finally { await context.close(); }
});

for (const width of [1440, 320]) {
  test(`native navigation without JavaScript at ${width}px`, async ({ browser }, info) => {
    const context = await browser.newContext({ baseURL: info.project.use.baseURL, javaScriptEnabled: false, viewport: { width, height: 740 } });
    try {
      const page = await context.newPage(); await page.goto("/");
      await expect(toggle(page)).toBeHidden();
      const navigation = page.getByRole("navigation", { name: "Main navigation", exact: true });
      for (const route of routes) {
        await navigation.getByRole("link", { name: route.label, exact: true }).click();
        await expect(page.locator("main")).toHaveAttribute("data-route", route.href);
        await expect(page.locator("main h1")).toHaveCount(1);
      }
      await expect(waTrigger(page)).toHaveAttribute("href", identity.whatsappUri);
      await expect(waTrigger(page)).not.toHaveAttribute("role");
    } finally { await context.close(); }
  });
}

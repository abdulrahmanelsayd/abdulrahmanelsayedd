import { waitForRuntime } from "../support/runtime-ready";
import { expect, test, type Page } from "@playwright/test";
import { portraits } from "../../src/content/assets";
import { waitForSceneImages } from "../../tools/wait-for-scene-images";

const portrait = (page: Page) => page.locator(`[data-menu-panel] img[src="${portraits.clean.src}"]`);
const toggle = (page: Page) => page.locator("[data-menu-toggle]");
const card = (page: Page) => page.getByRole("link", { name: "Design Develop Let’s work together. Get in touch", includeHidden: true });
async function observe(page: Page) {
  const requests: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === portraits.clean.src) requests.push(request.url()); });
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  return requests;
}
async function loaded(page: Page) {
  await page.goto("/contact"); await waitForRuntime(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
}
async function metrics(page: Page, requests: string[], state: string) {
  return { state, requests: [...requests], resources: await page.evaluate(src =>
    performance.getEntriesByName(new URL(src, location.origin).href).map(entry => {
      const resource = entry as PerformanceResourceTiming;
      return { transferSize: resource.transferSize, encodedBodySize: resource.encodedBodySize, decodedBodySize: resource.decodedBodySize };
    }), portraits.clean.src) };
}

for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 991, height: 900 }, { width: 992, height: 900 }]) {
  test(`portrait is requested only for an open visible card at ${size.width}px`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const requests = await observe(page);
    await loaded(page);
    await info.attach("initial-portrait-network", { body: JSON.stringify(await metrics(page, requests, "initial")), contentType: "application/json" });
    expect(requests).toHaveLength(0);
    await expect(portrait(page)).toHaveCount(0);
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    if (size.width >= 992) {
      await expect(card(page)).toBeVisible();
      await expect(portrait(page)).toHaveCount(1);
      await expect.poll(() => portrait(page).evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
      expect(requests).toHaveLength(1);
    } else {
      await expect(card(page)).toBeHidden();
      await page.waitForTimeout(1400); // Includes the entire opening animation and a negative request-observation window.
      expect(requests).toHaveLength(0);
      await expect(portrait(page)).toHaveCount(0);
    }
    const decoded = await waitForSceneImages(page, "[data-menu-panel][aria-hidden=false]");
    expect(decoded).toHaveLength(size.width >= 992 ? 1 : 0);
    expect(requests).toHaveLength(size.width >= 992 ? 1 : 0);
    await info.attach("open-portrait-network", { body: JSON.stringify(await metrics(page, requests, "open")), contentType: "application/json" });
  });
}

test("an open mobile menu loads the portrait only when crossing the visible-card breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await observe(page);
  await loaded(page);
  await toggle(page).click();
  await page.setViewportSize({ width: 991, height: 900 });
  await expect(card(page)).toBeHidden();
  await page.waitForTimeout(500);
  expect(requests).toHaveLength(0);
  await page.setViewportSize({ width: 992, height: 900 });
  await expect.poll(() => portrait(page).evaluate(image => (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
  expect(requests).toHaveLength(1);
  await card(page).focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
  await expect(page.locator("[data-page-content]")).not.toHaveAttribute("inert");
  await expect(toggle(page)).toBeFocused();
  await toggle(page).click();
  await page.waitForTimeout(500);
  await expect(portrait(page)).toHaveCount(0);
  expect(requests).toHaveLength(1);
});

test("delayed portrait loading reserves layout and retains the same image during close and reversal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${portraits.clean.src}`, async route => { await held; await route.continue(); });
  try {
    await loaded(page);
    await toggle(page).click();
    await expect(portrait(page)).toHaveCount(1);
    await page.waitForTimeout(1400);
    const oval = portrait(page).locator("..");
    const before = { card: await card(page).boundingBox(), oval: await oval.boundingBox(), bar: await page.locator("[data-header-bar]").boundingBox() };
    release();
    await expect.poll(() => portrait(page).evaluate(image => (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    expect({ card: await card(page).boundingBox(), oval: await oval.boundingBox(), bar: await page.locator("[data-header-bar]").boundingBox() }).toEqual(before);
    const image = await portrait(page).elementHandle();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-site-header]")).toHaveAttribute("data-closing", "true");
    expect(await image!.evaluate(node => node.isConnected)).toBe(true);
    await toggle(page).evaluate(button => (button as HTMLButtonElement).click());
    expect(await image!.evaluate(node => node === document.querySelector('[data-menu-panel] img'))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
    await expect(portrait(page)).toHaveCount(0);
    await expect(toggle(page)).toBeFocused();
    await expect(page.locator("[data-page-content]")).not.toHaveAttribute("inert");
  } finally { release(); }
});

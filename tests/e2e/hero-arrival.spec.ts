import {expect, test, type Page} from "@playwright/test";
import {installHeroArrivalProbe} from "../support/hero-arrival-probe";

async function verifyArrival(page: Page) {
  await page.waitForFunction(() => !!window.__heroArrival?.after);
  const observation = await page.evaluate(() => window.__heroArrival);
  await test.info().attach("hero-arrival", {body: JSON.stringify(observation), contentType: "application/json"});
  expect(observation.first).toBeDefined();
  expect(observation.after).toBeDefined();
  if (test.info().project.name === "classic-scrollbar") {
    expect(observation.after!.clientWidth, "classic scrollbar must occupy real layout space").toBeLessThan(1440);
  }
  for (const [index, first] of observation.first!.targets.entries()) {
    expect(first.running, first.selector + " still moving after curtain exit").toBe(0);
    expect(Math.abs(first.translationY), first.selector + " arrival offset").toBeLessThanOrEqual(.75);
    const final = observation.after!.targets[index];
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs(final[key] - first[key]), first.selector + " changed " + key).toBeLessThanOrEqual(.75);
    }
  }
  if (observation.beforeUnlock) {
    expect(Math.abs(observation.beforeUnlock.heroWidth - observation.after!.heroWidth), "Hero width changed when scrolling unlocked").toBeLessThanOrEqual(.75);
  }
  await expect(page.locator("html")).not.toHaveAttribute("data-page-entry");
  await expect(page.locator("[data-transition-shell]")).not.toHaveAttribute("inert");
  await expect(page.locator("[data-menu-toggle]")).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}

for (const visit of ["first open", "reload"] as const) {
  test(`Hero is settled when the curtain leaves on ${visit}`, async ({page}) => {
    await page.addInitScript(installHeroArrivalProbe);
    await page.goto("/");
    if (visit === "reload") {
      await page.waitForFunction(() => !!window.__heroArrival?.after);
      await page.reload();
    }
    await verifyArrival(page);
  });
}

test("returning to Home does not keep moving its Hero after the curtain", async ({page}) => {
  await page.addInitScript(installHeroArrivalProbe);
  await page.goto("/work");
  await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase", "idle");
  await page.getByRole("navigation", {name:"Footer navigation", exact:true}).locator('a[href="/"]').click();
  await expect(page.locator("main")).toHaveAttribute("data-route", "/");
  await verifyArrival(page);
});

test("locking and releasing the menu preserves the revealed Hero width", async ({page}) => {
  await page.addInitScript(installHeroArrivalProbe);
  await page.goto("/");
  await verifyArrival(page);
  const hero = page.locator('[data-section="hero"]');
  const before = await hero.boundingBox();
  const toggle = page.locator("[data-menu-toggle]");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const locked = await hero.boundingBox();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  const released = await hero.boundingBox();
  for (const box of [locked, released]) {
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width - before!.width)).toBeLessThanOrEqual(.75);
    expect(Math.abs(box!.x - before!.x)).toBeLessThanOrEqual(.75);
  }
});

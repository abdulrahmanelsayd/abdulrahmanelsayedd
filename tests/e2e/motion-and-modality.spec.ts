import { waitForRuntime } from "../support/runtime-ready";
import { expect, test } from "@playwright/test";

test("reduced motion at load and during rollover/CTA interaction cancels owned animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/work"); await waitForRuntime(page);
  const toggle = page.locator("[data-menu-toggle]");
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const contact = page.locator('[data-header-bar] a[href="/contact"]').first();
  await contact.focus();
  expect(await contact.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await contact.focus();
  await expect.poll(() => contact.evaluate(element => element.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => contact.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  const talk = page.locator('[data-footer-magnetic]');
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await talk.hover();
  await expect.poll(() => talk.evaluate(element => element.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => talk.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test("a live pointer change closes WhatsApp and moves focus out of the hidden panel", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/work"); await waitForRuntime(page);
  const trigger = page.locator("[data-whatsapp-trigger]");
  await expect(trigger).toHaveAttribute("role", "button");
  await trigger.click();
  await page.getByRole("link", { name: "Chat on desktop" }).focus();
  const protocol = await context.newCDPSession(page);
  await protocol.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
  await expect(trigger).not.toHaveAttribute("role");
  await expect(page.locator("[data-floating-whatsapp]")).toHaveAttribute("data-open", "false");
  await expect(trigger).toBeFocused();
  await protocol.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await expect(trigger).toHaveAttribute("role", "button");
  await expect(page.locator("[data-floating-whatsapp]")).toHaveAttribute("data-open", "false");
  await protocol.detach();
});

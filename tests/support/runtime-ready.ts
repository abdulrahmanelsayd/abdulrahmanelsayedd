import { expect, type Page } from "@playwright/test";

/** Component hydration is earlier than the shared transition unlock. */
export async function waitForRuntime(page: Page) {
  await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase","idle",{timeout:12000});
  await expect(page.locator("html")).not.toHaveAttribute("data-page-entry");
  await expect(page.locator("[data-transition-shell]")).not.toHaveAttribute("inert");
  expect(await page.locator("html").getAttribute("data-transition-outcome")||"").not.toMatch(/deadline|error/);
}

import type { Page } from "@playwright/test";

/** Decode only visible images within the caller's current scene. */
export async function waitForSceneImages(page: Page, scene: string) {
  await page.evaluate(() => document.fonts.ready);
  return page.locator(scene).locator("img:visible").evaluateAll(async elements => {
    const images = elements as HTMLImageElement[];
    await Promise.all(images.map(image => image.decode()));
    return images.map(image => ({ src: image.currentSrc, complete: image.complete, naturalWidth: image.naturalWidth }));
  });
}

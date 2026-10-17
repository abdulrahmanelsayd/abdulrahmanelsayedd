import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "../..");
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

test("production serves this build as HTML and loads the local font", async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/html");
  const html = await response.text();
  expect(html).toMatch(/^<!DOCTYPE html>/i);
  expect(html).toMatch(/<main[\s>]/);
  expect(html).toMatch(/<h1[\s>]/);
  const diskHtml = await readFile(path.join(root, ".next/server/app/index.html"));
  expect(hash(html)).toBe(hash(diskHtml));
  const assetUrl = html.match(/src="(\/_next\/static\/[^"?]+\.js)"/)?.[1];
  expect(assetUrl).toBeDefined();
  const assetResponse = await request.get(assetUrl!);
  expect(assetResponse.status()).toBe(200);
  const diskAsset = path.join(root, ".next", assetUrl!.replace("/_next/", ""));
  expect(hash(await assetResponse.body())).toBe(hash(await readFile(diskAsset)));
  const navigation = await page.goto("/");
  expect(navigation?.status()).toBe(200);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main h1")).toHaveCount(1);
  expect(await page.evaluate(() => document.compatMode)).toBe("CSS1Compat");
  expect(await page.locator("html").getAttribute("lang")).toBe("en");
  await page.evaluate(() => document.fonts.ready);
  const fontState = await page.evaluate(() => ({
    bodyFamily: getComputedStyle(document.body).fontFamily,
    fonts: [...document.fonts].map(font => ({ family: font.family, weight: font.weight, status: font.status })),
  }));
  expect(fontState.bodyFamily.toLowerCase()).toContain("chillax");
  expect(fontState.fonts.some(font => /chillax/i.test(font.family) && font.weight === "200 700" && font.status === "loaded")).toBe(true);
  const controlFonts = await page.evaluate(() => {
    const controls = ["button", "input", "select", "textarea"].map(tag => document.createElement(tag));
    document.body.append(...controls);
    const result = controls.map(control => getComputedStyle(control).fontFamily);
    controls.forEach(control => control.remove());
    return result;
  });
  expect(controlFonts.every(family => family === fontState.bodyFamily)).toBe(true);
  const fontUrls = await page.locator('link[rel="preload"][as="font"]').evaluateAll(links => links.map(link => link.getAttribute("href")!));
  const chillaxHash = hash(await readFile(path.join(root, "src/assets/fonts/Chillax-Variable.woff2")));
  let fontUrl: string | undefined;
  for (const url of fontUrls) {
    if (hash(await (await request.get(url)).body()) === chillaxHash) fontUrl = url;
  }
  expect(fontUrl).toMatch(/^\/_next\/static\/media\/.+\.woff2$/);
  const fontResponse = await request.get(fontUrl!);
  expect(fontResponse.status()).toBe(200);
  expect(hash(await fontResponse.body())).toBe(hash(await readFile(path.join(root, "src/assets/fonts/Chillax-Variable.woff2"))));
  expect(errors).toEqual([]);
  await testInfo.attach("production-html", { body: html, contentType: "text/html" });
  await testInfo.attach("production-home", { body: await page.screenshot(), contentType: "image/png" });
  await testInfo.attach("build-identity", { body: JSON.stringify({
    buildId: (await readFile(path.join(root, ".next/BUILD_ID"), "utf8")).trim(),
    htmlSha256: hash(html), assetUrl, assetSha256: hash(await assetResponse.body()), fontState,
    browserVersion: page.context().browser()?.version(),
  }, null, 2), contentType: "application/json" });
});

test("unknown production routes return HTTP 404", async ({ page, request }) => {
  const response = await request.get("/missing-phase-02-route");
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("text/html");
  const navigation = await page.goto("/missing-phase-02-route");
  expect(navigation?.status()).toBe(404);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('main a[href="/"]')).toBeVisible();
});

test("production content is available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);
  } finally { await context.close(); }
});

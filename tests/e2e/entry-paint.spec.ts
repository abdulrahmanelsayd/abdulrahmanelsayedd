import { createServer } from "node:http";
import { once } from "node:events";
import { test, expect, type Page } from "@playwright/test";

const idle = async (page: Page) => {
  await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase", "idle");
  await expect(page.locator("[data-transition-shell]")).not.toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.documentElement.dataset.pageEntry)).toBeUndefined();
};

// Use the real production document and assets; only pause delivery after the Hero.
// Delaying JS alone cannot expose content parsed before the cover's markup.
async function streamHome(origin: string, held: boolean) {
  const html = await (await fetch(new URL("/", origin))).text();
  const hero = html.indexOf("data-hero-photo");
  const end = html.indexOf("</section>", hero);
  expect(hero).toBeGreaterThan(0); expect(end).toBeGreaterThan(hero);
  const cut = end + "</section>".length;
  let holdNext = held, release = () => {};
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", origin);
      if (url.pathname === "/") {
        if (!holdNext) { response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); response.end(html); return; }
        holdNext = false;
        const gate = new Promise<void>(resolve => { release = resolve; });
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        response.write(html.slice(0, cut));
        await gate; response.end(html.slice(cut));
        return;
      }
      const asset = await fetch(url, { signal: AbortSignal.timeout(15000) });
      response.writeHead(asset.status, { "Content-Type": asset.headers.get("content-type") ?? "application/octet-stream" });
      response.end(Buffer.from(await asset.arrayBuffer()));
    } catch { response.writeHead(502); response.end("Test proxy upstream failed"); }
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing stream fixture address");
  return {
    url: `http://127.0.0.1:${address.port}/`,
    hold: () => { holdNext = true; }, release: () => release(),
    close: async () => { release(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); },
  };
}

async function holdBundles(page: Page) {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_next/static/**/*.js", async route => { await gate; await route.continue(); });
  return release;
}

async function coverSnapshot(page: Page) {
  return page.evaluate(() => ({
    entry: document.documentElement.dataset.pageEntry,
    greetingStarts: performance.getEntriesByName("tr03:greetings-start").length,
    reactStarts: performance.getEntriesByName("tr03:react-ready").length,
    covered: [[.1,.2],[.5,.15],[.9,.4],[.9,.8]].map(([x,y]) => !!document.elementFromPoint(innerWidth*x,innerHeight*y)?.closest("[data-page-curtain]")),
  }));
}

const pageErrors = new WeakMap<Page,string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page,errors);
  page.on("pageerror", error => errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

for (const visit of ["first open", "reload"] as const) test(`streamed ${visit} cannot paint the Hero before the intro`, async ({ page, baseURL }, info) => {
  const fixture = await streamHome(baseURL!, visit === "first open");
  let releaseBundles = () => {};
  try {
    if (visit === "reload") { await page.goto(fixture.url); await idle(page); fixture.hold(); }
    releaseBundles = await holdBundles(page);
    if (visit === "reload") await page.reload({ waitUntil:"commit" });
    else await page.goto(fixture.url, { waitUntil:"commit" });
    await page.locator("[data-hero-photo]").waitFor({ state:"attached" });
    const frames = [];
    for (const delay of [100, 1000]) {
      await page.waitForTimeout(delay);
      const frame = await coverSnapshot(page); frames.push(frame);
      await info.attach(`partial-document-${delay}ms`, { body:await page.screenshot(), contentType:"image/png" });
      expect(frame.entry).toBe("pending"); expect(frame.greetingStarts).toBe(1); expect(frame.reactStarts).toBe(0);
      expect(frame.covered).toEqual([true,true,true,true]);
    }
    console.log(JSON.stringify({ event:"entry-paint", visit, project:info.project.name, frames }));
    await info.attach("partial-document-observations", { body:JSON.stringify(frames), contentType:"application/json" });
    fixture.release(); releaseBundles(); await page.waitForLoadState(); await idle(page);
    const marks = await page.evaluate(() => performance.getEntriesByType("mark").map(mark=>mark.name));
    for (const name of ["tr03:greetings-start","tr03:reveal-start","tr03:reveal-complete","tr03:unlock"]) expect(marks.filter(mark=>mark===name)).toHaveLength(1);
  } finally { fixture.release(); releaseBundles(); await fixture.close(); }
});

test("Escape during partial delivery remains terminal after hydration", async ({ page, baseURL }) => {
  const fixture = await streamHome(baseURL!, true), releaseBundles = await holdBundles(page);
  try {
    await page.goto(fixture.url, { waitUntil:"commit" });
    await page.locator("[data-hero-photo]").waitFor({ state:"attached" });
    await page.keyboard.press("Escape");
    fixture.release(); releaseBundles(); await page.waitForLoadState(); await idle(page);
    await expect(page.locator("html")).toHaveAttribute("data-transition-outcome","cancelled");
    await page.waitForTimeout(1200);
    expect(await page.evaluate(()=>performance.getEntriesByName("tr03:greetings-start").length)).toBe(1);
    await idle(page);
  } finally { fixture.release(); releaseBundles(); await fixture.close(); }
});

test("reduced motion exposes partial content without acquiring an intro cover", async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion:"reduce" });
  const fixture = await streamHome(baseURL!, true), releaseBundles = await holdBundles(page);
  try {
    await page.goto(fixture.url, { waitUntil:"commit" });
    await page.locator("[data-hero-photo]").waitFor({ state:"attached" });
    await expect(page.locator("#home-hero-heading")).toBeVisible();
    const frame = await coverSnapshot(page);
    expect(frame.entry).toBeUndefined(); expect(frame.greetingStarts).toBe(0); expect(frame.covered).toEqual([false,false,false,false]);
    fixture.release(); releaseBundles(); await page.waitForLoadState(); await idle(page);
  } finally { fixture.release(); releaseBundles(); await fixture.close(); }
});

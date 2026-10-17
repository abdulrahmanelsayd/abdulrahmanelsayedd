import { waitForRuntime } from "../support/runtime-ready";
import { test, expect, type Page } from "@playwright/test";
import { about, commitments } from "../../src/content/about";
import { identity } from "../../src/content/identity";

const ready = async (page: Page) => {
  await page.goto("/about"); await waitForRuntime(page); await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-about-hello]")).toHaveAttribute("aria-disabled", "false");
  await page.waitForTimeout(1000);
};
const open = (page: Page) => page.locator("details[name=about-principles][open]");
const activeArt = (page: Page) => page.locator("[data-about-art]").evaluateAll(els => els.map(e => getComputedStyle(e).opacity));
const animations = (page: Page, selector: string) => page.locator(selector).evaluate(e => e.getAnimations({ subtree: true }).filter(a => a.playState === "running").length);

for (const [width, height] of [[320,740],[390,844],[768,1024],[992,900],[1366,600],[1440,900],[359,740],[360,740],[599,844],[600,844],[899,900],[900,900],[1199,900],[1200,900],[1366,760],[1366,761]]) {
  test(`A01 layout, reading order and reserved image ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({width,height}); await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/about"); await waitForRuntime(page); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main")).toHaveAttribute("id", "main-content");
    await expect(page.locator("main")).toHaveAttribute("tabindex", "-1");
    await expect(page.locator("h1")).toHaveText("A littleabout me.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const order = await page.locator("main button, main a").evaluateAll(els => els.map(e => e.getAttribute("aria-label") || e.textContent));
    expect(order.slice(0,2)).toEqual(["Say hello with a wave", "Say hi back"]);
    await expect(page.locator('main [tabindex]:not([tabindex="-1"]):not([tabindex="0"])')).toHaveCount(0);
    const image = page.locator("[data-about-photo]");
    await expect(image).toHaveAttribute("width", "1191"); await expect(image).toHaveAttribute("height", "1321");
    await expect(image).toHaveAttribute("loading", "eager"); await expect(image).toHaveAttribute("fetchpriority", "high");
    const boxes = await page.locator("[data-section=about-introduction] h1,[data-about-portrait],[data-section=about-introduction] dl").evaluateAll(els => els.map(e => {const r=e.getBoundingClientRect();return{x:r.x,y:r.y,bottom:r.bottom,width:r.width};}));
    if(width<900) {expect(boxes[1].y).toBeGreaterThan(boxes[0].bottom);expect(boxes[2].y).toBeGreaterThan(boxes[1].bottom);} else {expect(boxes[1].x).toBeGreaterThan(boxes[0].x+boxes[0].width);}
    await expect(page.locator("dl")).toContainText("Countries3+");
    await expect(page.locator('footer[data-footer-from="about"]')).toHaveCount(1);
  });
}

test("A01 metadata, structured identity and authoritative text", async ({ page }) => {
  await ready(page); await expect(page).toHaveTitle(`About | ${identity.name}`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content",about.description);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href",new URL("/about",process.env.SITE_URL).href);
  const schema = JSON.parse(await page.locator('main script[type="application/ld+json"]').textContent() || "{}");
  expect(schema.name).toBe(identity.name);expect(schema.address.addressCountry).toBe("EG");
  expect(schema.url).toBe(new URL("/about",process.env.SITE_URL).href);expect(schema.image).toBe(new URL("/images/me1.webp",process.env.SITE_URL).href);
  expect(schema.sameAs).toEqual(identity.socials.map(s=>s.href));
  for (const paragraph of about.introduction) await expect(page.locator("main")).toContainText(paragraph);
  expect(await page.locator("[data-about-value] h3").allTextContents()).toEqual(commitments.map(c=>c.title));
  expect(await page.locator("[data-about-value] p").allTextContents()).toEqual(commitments.map(c=>c.body));
});

test("A01 exclusive native disclosures, every scene, close all and keyboard", async ({ page }) => {
  await ready(page); await expect(open(page)).toHaveAttribute("data-about-value","0");
  for (const index of [1,2,3,0]) {
    await page.locator(`[data-about-value="${index}"] summary`).click();
    await expect(open(page)).toHaveCount(1);await expect(open(page)).toHaveAttribute("data-about-value",String(index));
    await expect.poll(()=>activeArt(page)).toEqual([0,1,2,3].map(i=>i===index?"1":"0"));
  }
  await page.locator('[data-about-value="0"] summary').press("Space");await expect(open(page)).toHaveCount(0);
  await expect.poll(()=>activeArt(page)).toEqual(["1","0","0","0"]);
  await page.locator('[data-about-value="2"] summary').press("Enter");await expect(open(page)).toHaveAttribute("data-about-value","2");
  expect(await page.locator("[data-about-art] svg").evaluateAll(els=>els.every(e=>e.getAttribute("aria-hidden")==="true"&&e.getAttribute("focusable")==="false"))).toBe(true);
});

test("A01 wave, wink timings and repeated activation never queue", async ({ page }) => {
  await ready(page);
  for (const key of ["click","Enter","Space"]) {
    const button=page.locator("[data-about-hello]");await button.focus();
    if(key==="click") await button.click();else await page.keyboard.press(key);
    await expect.poll(()=>animations(page,"[data-about-hand]")).toBe(1);
    const before=await page.locator("[data-about-hand]").evaluate(e=>e.getAnimations()[0].startTime);
    await button.evaluate(e=>{for(let i=0;i<12;i++)(e as HTMLButtonElement).click();});
    expect(await page.locator("[data-about-hand]").evaluate(e=>e.getAnimations()[0].startTime)).toBe(before);
    await page.waitForTimeout(900);expect(await animations(page,"[data-about-hand]")).toBe(0);
  }
  const face=page.locator("[data-about-face]");await face.focus();await page.keyboard.press("Enter");
  await expect.poll(() => page.locator("[data-about-wink]").evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m22), { intervals: [20], timeout: 400 }).toBeLessThan(.25);
  await face.evaluate(e=>{for(let i=0;i<12;i++)(e as HTMLButtonElement).click();});
  await page.waitForTimeout(320);await expect(page.locator("[data-about-mouth]")).toHaveAttribute("d","M14 29Q24 41 34 29");
  await page.keyboard.press("Space");await page.waitForTimeout(220);await expect(page.locator("[data-about-mouth]")).not.toHaveAttribute("d","M14 29Q24 41 34 29");
  await page.waitForTimeout(300);
});

test("A01 bounded tracking, steady idle RAF and neutral return", async ({ page }) => {
  await page.addInitScript(()=>{
    const original=window.requestAnimationFrame;let count=0;
    window.requestAnimationFrame=callback=>original(time=>{count++;callback(time);});
    Object.defineProperty(window,"a01FrameCount",{get:()=>count});
  });
  await ready(page);
  const box=(await page.locator("[data-about-portrait]").boundingBox())!;
  await page.mouse.move(box.x+box.width-35,box.y+35);await page.waitForTimeout(600);
  const pose=await page.locator("[data-about-photo]").evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).toJSON());
  expect(Math.abs(pose.m41)).toBeLessThanOrEqual(4);expect(Math.abs(pose.m42)).toBeLessThanOrEqual(4);expect(pose.m41).toBeGreaterThan(0);
  for(const value of await page.locator("[data-about-pupil]").evaluateAll(els=>els.map(e=>e.getAttribute("transform")))) {
    const [x,y]=value!.slice(10,-1).split(" ").map(Number);expect(Math.abs(x)).toBeLessThanOrEqual(2.2);expect(Math.abs(y)).toBeLessThanOrEqual(1.8);
  }
  const count=()=>page.evaluate(()=>(window as unknown as {a01FrameCount:number}).a01FrameCount);
  const idle=await count();await page.waitForTimeout(400);expect(await count()).toBe(idle);
  await page.mouse.move(2,200);await page.waitForTimeout(600);
  const neutral=await page.locator("[data-about-photo]").evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).toJSON());expect(neutral.m41).toBe(0);expect(neutral.m42).toBe(0);
});

test("A01 reduced motion changes retain focus, block activation and cancel motion", async ({ page }) => {
  await ready(page);
  for(const selector of ["[data-about-hello]","[data-about-face]"]) {
    const button=page.locator(selector);await button.focus();await page.keyboard.press("Space");
    await page.emulateMedia({reducedMotion:"reduce"});await expect(button).toBeFocused();await expect(button).toHaveAttribute("aria-disabled","true");
    await button.evaluate(e=>(e as HTMLButtonElement).click());await page.waitForTimeout(220);
    expect(await animations(page,"[data-about-hand]")).toBe(0);await expect(page.locator("[data-about-mouth]")).toHaveAttribute("d","M14 29Q24 41 34 29");
    await page.emulateMedia({reducedMotion:"no-preference"});await expect(button).toBeFocused();await expect(button).toHaveAttribute("aria-disabled","false");
  }
});

test("A01 focus order, tooltip, menu interruption and history", async ({ page }) => {
  await ready(page);await page.locator("[data-about-hello]").focus();
  expect(await page.locator("[data-about-hello] > span").last().evaluate(e=>getComputedStyle(e).opacity)).toBeDefined();
  await page.keyboard.press("Tab");await expect(page.locator("[data-about-face]")).toBeFocused();
  await page.keyboard.press("Tab");await expect(page.locator('main a[href="/contact"]')).toBeFocused();
  await page.keyboard.press("Tab");await expect(page.locator('main a[href="/work"]')).toBeFocused();
  await page.locator("[data-about-hello]").click();await page.locator("[data-menu-toggle]").click();
  await expect(page.locator("[data-page-content]")).toHaveAttribute("inert");expect(await animations(page,"[data-about-hand]")).toBe(0);
  await page.keyboard.press("Escape");await expect(page.locator("[data-page-content]")).not.toHaveAttribute("inert");
  await page.locator('main a[href="/work"]').click();await expect(page.locator("main")).toHaveAttribute("data-route","/work");
  await page.goBack();await expect(page.locator("main")).toHaveAttribute("data-route","/about");
  await page.goForward();await expect(page.locator("main")).toHaveAttribute("data-route","/work");
  await page.locator("[data-menu-toggle]").click();await page.locator('[data-menu-panel] a[href="/about"]').click();
  await expect(page.locator("main")).toHaveAttribute("data-route","/about");await page.reload();await expect(page.locator("[data-about-photo]")).toBeVisible();
});

test("A01 accordion resize during footer transition retains click and focus", async ({ page }) => {
  await ready(page);
  const footer=page.locator("footer"),panel=page.locator("[data-footer-panel]");
  await footer.evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-innerHeight*.7));await page.waitForTimeout(400);
  const before=await panel.getAttribute("style");
  await page.locator('[data-about-value="3"] summary').evaluate(e=>(e as HTMLElement).click());await page.waitForTimeout(700);
  expect(await panel.getAttribute("style")).not.toBe(before);
  const link=footer.locator('nav[aria-label="Footer navigation"] a[href="/contact"]');await link.focus();
  await expect(link).toBeFocused();const box=(await link.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(page.viewportSize()!.height+1);
  await link.click();await expect(page.locator("main")).toHaveAttribute("data-route","/contact");
});

for(const js of [false,true]) test(`A01 ${js?"delayed":"disabled"} JavaScript keeps SSR image, text and disclosure usable`,async({browser,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:js,viewport:{width:390,height:844}});
  const page=await context.newPage();let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r;});
  if(js)await page.route("**/*.js",async route=>{await gate;await route.continue().catch(()=>{});});
  try {
    await page.goto(baseURL+"/about",{waitUntil:"domcontentloaded"});await page.waitForTimeout(1300);
    await expect(page.locator("h1")).toBeVisible();await expect(page.locator("[data-about-photo]")).toBeVisible();
    expect(await page.locator("[data-about-photo]").evaluate(e=>(e as HTMLImageElement).complete)).toBe(true);
    await page.locator('[data-about-value="1"] summary').click();await expect(open(page)).toHaveAttribute("data-about-value","1");
    // Wait for the native CSS disclosure transition before activating the moving row again.
    await page.waitForTimeout(600);
    await page.locator('[data-about-value="1"] summary').click();await expect(open(page)).toHaveCount(0);
    await page.evaluate(()=>window.scrollTo(0,0));release();
    if(js){await expect(page.locator("[data-about-hello]")).toHaveAttribute("aria-disabled","false");expect(await page.locator("h1").evaluate(e=>getComputedStyle(e).opacity)).toBe("1");}
  }finally{release();await context.close();}
});

test("A01 delayed image reserves layout; one visible portrait request",async({page})=>{
  let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r;});const requested:string[]=[];
  page.on("request",r=>{if(r.resourceType()==="image")requested.push(decodeURIComponent(r.url()));});
  await page.route("**/_next/image?*",async route=>{if(decodeURIComponent(route.request().url()).includes("me1.webp"))await gate;await route.continue();});
  await page.goto("/about",{waitUntil:"domcontentloaded"});await page.evaluate(()=>document.fonts.ready);
  const before=await page.locator("[data-about-portrait]").boundingBox();release();await page.waitForFunction(()=>(document.querySelector("[data-about-photo]") as HTMLImageElement).complete);
  expect(await page.locator("[data-about-portrait]").boundingBox()).toEqual(before);
  expect(requested.filter(u=>u.includes("me1.webp"))).toHaveLength(1);expect(requested.filter(u=>u.includes("me2.webp"))).toHaveLength(0);
});

test("A01 touch activation without fine-pointer tracking",async({browser,baseURL})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
  try{await page.goto(baseURL+"/about");await expect(page.locator("[data-about-hello]")).toHaveAttribute("aria-disabled","false");await page.waitForTimeout(900);
    await page.locator("[data-about-hello]").tap();expect(await animations(page,"[data-about-hand]")).toBe(1);
    await page.locator("[data-about-face]").tap();await page.waitForTimeout(180);await expect(page.locator("[data-about-mouth]")).not.toHaveAttribute("d","M14 29Q24 41 34 29");
    expect(await page.locator("[data-about-photo]").evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41)).toBe(0);
  }finally{await context.close();}
});

import {test,expect,type Page} from "@playwright/test";
import {identity} from "../../src/content/identity";

const errors=new WeakMap<Page,string[]>();
const idle=async(page:Page)=>{
  await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase","idle");
  await expect(page.locator("html")).not.toHaveAttribute("data-page-entry");
  await expect(page.locator("[data-transition-shell]")).not.toHaveAttribute("inert");
  await expect(page.locator("[data-page-content]")).not.toHaveAttribute("inert");
  expect(await page.locator("html").getAttribute("data-transition-outcome")||"").not.toMatch(/deadline|error/);
};
const overflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
const footer=async(page:Page,route:string)=>{
  await page.getByRole("navigation",{name:"Footer navigation",exact:true}).locator(`a[href="${route}"]`).click();
  await expect(page.locator("main")).toHaveAttribute("data-route",route);await idle(page);
};
test.beforeEach(async({page,browser},info)=>{
  const found:string[]=[];errors.set(page,found);
  page.on("pageerror",error=>found.push(error.message));
  page.on("console",message=>{if(message.type()==="error"&&!/Failed to load resource.*404/.test(message.text()))found.push(message.text());});
  console.log(JSON.stringify({project:info.project.name,browser:browser.version(),test:info.title}));
});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);});

test("five routes, direct reload, readable content, images and 404",async({page})=>{
  for(const route of ["/","/work","/services","/contact","/about","/compatibility-missing-page"]){
    const status=route.includes("missing")?404:200;
    expect((await page.goto(route))?.status()).toBe(status);await idle(page);
    await expect(page.locator("main h1")).toHaveCount(1);await expect(page.locator("main h1")).toBeVisible();await overflow(page);
    // Firefox exposes the HTTP revalidation response, while Chromium/WebKit
    // expose the cached 200. A fresh navigation above must still return 200.
    const reloadStatus=(await page.reload())?.status();
    expect(status===200?[200,304]:[404]).toContain(reloadStatus);await idle(page);
    await expect(page.locator("main h1")).toBeVisible();await overflow(page);
  }
});

test("menu keyboard containment, five-page journey and browser history",async({page})=>{
  await page.goto("/");await idle(page);
  const toggle=page.locator("[data-menu-toggle]");await toggle.focus();await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  for(let index=0;index<16;index++){
    await page.keyboard.press(index%2?"Shift+Tab":"Tab");
    expect(await page.evaluate(()=>!!document.activeElement?.closest("[data-navigation-scope]"))).toBe(true);
  }
  await page.keyboard.press("Escape");await idle(page);await expect(toggle).toBeFocused();
  for(const route of ["/work","/services","/about"]){
    await toggle.click();
    await page.locator(`[data-menu-panel] nav[aria-label="Explore"] a[href="${route}"]`).click();
    await expect(page.locator("main")).toHaveAttribute("data-route",route);await idle(page);await overflow(page);
  }
  await footer(page,"/contact");await footer(page,"/");
  await page.goBack();await expect(page.locator("main")).toHaveAttribute("data-route","/contact");await idle(page);
  await page.goForward();await expect(page.locator("main")).toHaveAttribute("data-route","/");await idle(page);await overflow(page);
});

test("Home and Work galleries keep controls and destinations available",async({page})=>{
  await page.goto("/");await idle(page);
  const stage=page.locator("[data-project-stage]"),gallery=page.locator("[data-project-gallery]");
  await stage.scrollIntoViewIfNeeded();await expect(gallery).toHaveAttribute("data-project-enhanced","true");
  await stage.focus();await page.keyboard.press("ArrowRight");await expect(gallery).toHaveAttribute("data-project-active","1");
  await page.keyboard.press("ArrowLeft");await expect(gallery).toHaveAttribute("data-project-active","0");
  await page.locator("[data-project-next]").click();await expect(gallery).toHaveAttribute("data-project-active","1");
  await footer(page,"/work");await expect(page.locator("[data-work-card]")).toHaveCount(10);
  const links=await page.locator("[data-work-card] a[href]").evaluateAll(elements=>elements.map(element=>({href:element.getAttribute("href"),rel:element.getAttribute("rel")})));
  expect(links.length).toBeGreaterThanOrEqual(10);expect(links.every(link=>link.href?.startsWith("https://")&&link.rel?.includes("noopener"))).toBe(true);await overflow(page);
});

test("Contact preserves Arabic, numeric budget, draft encoding and denied-copy fallback",async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:()=>Promise.reject(new Error("Clipboard denied test fixture"))}});});
  await page.goto("/contact");await idle(page);
  const prepare=page.getByRole("button",{name:"Prepare email",exact:true});await prepare.click();
  await expect(page.locator('[name="name"]')).toBeFocused();
  await page.locator('[name="name"]').fill("أحمد 😀 &?");await page.locator('[name="email"]').fill("compatibility@example.com");
  const goal="متجر جديد 🛒\n&? # + %0A";await page.locator('[name="goal"]').fill(goal);
  await page.getByRole("group",{name:"Your project details"}).locator("details > summary").click();
  await page.locator('[name="budget"]').fill("١٥٠٠٫٥٠");await prepare.click();
  const message=page.locator('pre[aria-label="Prepared project message"]');
  await expect(message).toContainText("Budget: 1500.50 USD");await expect(message).toContainText(goal);
  const href=await page.getByRole("link",{name:"Open email app"}).getAttribute("href"),url=new URL(href!);
  expect(url.protocol).toBe("mailto:");expect(url.pathname).toBe(identity.email);expect([...url.searchParams.keys()]).toEqual(["subject","body"]);
  expect(url.searchParams.get("body")).toContain(goal.replaceAll("\n","\r\n"));
  await page.getByRole("button",{name:"Copy message",exact:true}).click();
  await expect(page.locator("[data-contact-status]")).toContainText("Clipboard unavailable");await expect(message).toBeFocused();
  await page.locator('[name="goal"]').fill("Changed brief");await expect(message).toHaveCount(0);await expect(page.getByRole("link",{name:"Open email app"})).toHaveCount(0);
});

test("About and Services controls respond to live motion preference changes",async({page})=>{
  await page.goto("/about");await idle(page);
  const hello=page.locator("[data-about-hello]");await expect(hello).toHaveAttribute("aria-disabled","false");
  await hello.focus();await page.emulateMedia({reducedMotion:"reduce"});await expect(hello).toHaveAttribute("aria-disabled","true");await expect(hello).toBeFocused();
  await page.keyboard.press("Enter");expect(await page.locator("[data-about-hand]").evaluate(element=>element.getAnimations().filter(animation=>animation.playState==="running").length)).toBe(0);
  await page.emulateMedia({reducedMotion:"no-preference"});await expect(hello).toHaveAttribute("aria-disabled","false");
  await page.locator('[data-about-value="1"] summary').press("Enter");await expect(page.locator('[data-about-value="1"]')).toHaveAttribute("open");
  await footer(page,"/services");
  const play=page.locator("[data-services-hero-play]");await expect(play).toHaveAttribute("aria-disabled","false");await play.focus();await page.keyboard.press("Space");
  await expect(page.locator("[data-services-hero]")).toHaveAttribute("data-services-hero-playing","true");
  await page.emulateMedia({reducedMotion:"reduce"});await expect(play).toHaveAttribute("aria-disabled","true");await expect(play).toBeFocused();
  const both=page.getByRole("radio",{name:"Both",exact:true});await both.focus();await page.keyboard.press("ArrowLeft");await expect(page.getByRole("radio",{name:"Develop",exact:true})).toBeChecked();
  await expect(page.locator('[data-services-panel="develop"]')).toBeVisible();
});

test("Escape, reduced motion and fragment links do not leave an intro lock",async({page})=>{
  await page.goto("/",{waitUntil:"commit"});await page.waitForFunction(()=>window.__homeEntry?.active);await page.keyboard.press("Escape");await idle(page);
  const starts=await page.evaluate(()=>performance.getEntriesByName("tr03:greetings-start").length);
  await page.goto("/#main-content");await idle(page);
  // Same-document hash navigation retains existing marks; it must not restart.
  expect(await page.evaluate(()=>performance.getEntriesByName("tr03:greetings-start").length)).toBe(starts);
  await page.goto("/work");await idle(page);
  await page.goto("/#main-content");await idle(page);
  expect(await page.evaluate(()=>performance.getEntriesByName("tr03:greetings-start").length)).toBe(0);
  await page.emulateMedia({reducedMotion:"reduce"});
  for(const route of ["/","/work","/about","/services","/contact"]){await page.goto(route);await idle(page);await expect(page.locator("main h1")).toBeVisible();await overflow(page);}
});

test("JavaScript-disabled route navigation remains usable",async({browser,baseURL},info)=>{
  const context=await browser.newContext({viewport:info.project.use.viewport,javaScriptEnabled:false,baseURL});
  try{
    const page=await context.newPage();await page.goto("/");await expect(page.locator("main h1")).toBeVisible();
    for(const route of ["/work","/services","/contact","/about","/"]){
      await page.getByRole("navigation",{name:"Main navigation",exact:true}).locator(`a[href="${route}"]`).click();
      await expect(page.locator("main")).toHaveAttribute("data-route",route);await expect(page.locator("main h1")).toBeVisible();await overflow(page);
    }
  }finally{await context.close();}
});

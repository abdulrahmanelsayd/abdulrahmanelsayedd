import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { identity } from "../../src/content/identity";
const routes = ["/","/work","/services","/contact","/about","/release-missing-page"];
const failures = new WeakMap<Page,string[]>();
function watch(page:Page,scriptsDisabled=false) {
  const errors:string[]=[]; failures.set(page,errors);
  page.on("pageerror",error=>errors.push("JavaScript: "+error.message));
  page.on("response",response=>{
    const url=new URL(response.url());
    if(response.status()>=400 && !(url.pathname==="/release-missing-page"&&response.status()===404))
      errors.push("HTTP "+response.status()+" "+response.url());
  });
  page.on("requestfailed",request=>{
    if(scriptsDisabled && request.resourceType()==="script" && request.failure()?.errorText==="csp") return;
    if(["image","font","stylesheet","script"].includes(request.resourceType()))
      errors.push("Resource "+request.url()+" "+request.failure()?.errorText);
  });
  page.on("console",message=>{
    if(message.type()==="error"&&!message.text().includes("Failed to load resource: the server responded with a status of 404"))
      errors.push("Console: "+message.text());
  });
}
async function idle(page:Page) {
  await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase","idle");
  await expect(page.locator("html")).not.toHaveAttribute("data-page-entry");
  await expect(page.locator("[data-transition-shell]")).not.toHaveAttribute("inert");
  await expect(page.locator("[data-page-content]")).not.toHaveAttribute("inert");
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe("hidden");
  expect(await page.locator("html").getAttribute("data-transition-outcome")||"").not.toMatch(/deadline|error/);
}
async function overflow(page:Page) {
  expect(await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth})))
    .toEqual(await page.evaluate(()=>({document:innerWidth,viewport:innerWidth})));
}
async function scan(page:Page) {
  await page.evaluate(()=>document.fonts.ready);
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<height;y+=Math.max(300,page.viewportSize()!.height-100)) {
    await page.evaluate(y=>scrollTo({top:y,behavior:"instant"}),y);
    await page.waitForTimeout(90);
    await overflow(page);
    await expect.poll(()=>page.locator("img").evaluateAll(elements=>(elements as HTMLImageElement[]).filter(image=>{
      const r=image.getBoundingClientRect();
      return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&(!image.complete||!image.naturalWidth);
    }).map(image=>image.currentSrc||image.src))).toEqual([]);
  }
  await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
}
async function footer(page:Page,href:string) {
  await page.getByRole("navigation",{name:"Footer navigation"}).locator('a[href="'+href+'"]').click();
  await expect(page.locator("main")).toHaveAttribute("data-route",href); await idle(page);
}
async function attach(page:Page,info:TestInfo) {
  const errors=failures.get(page)||[];
  await info.attach("resource-and-runtime-errors",{body:JSON.stringify(errors),contentType:"application/json"});
  expect(errors).toEqual([]);
}
test.beforeEach(async({page})=>watch(page));
test.afterEach(async({page},info)=>attach(page,info));
for(const route of routes) test("direct open, reload, readable content and assets: "+route,async({page},info)=>{
  const expected=route==="/release-missing-page"?404:200;
  for(const action of ["open","reload"]) {
    const response=action==="open"?await page.goto(route):await page.reload();
    expect(response?.status()).toBe(expected); await idle(page);
    await expect(page.locator("main")).toBeVisible(); await expect(page.locator("main h1")).toHaveCount(1);
    await scan(page);
  }
  if(route==="/"||route==="/contact") await info.attach("production-view",{body:await page.screenshot(),contentType:"image/png"});
});
test("Home → Work → Services → Contact → About → Home, menu focus and history",async({page})=>{
  await page.goto("/"); await idle(page);
  const toggle=page.locator("[data-menu-toggle]");
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  await expect(page.locator("[data-page-content]")).toHaveAttribute("inert");
  const count=await page.locator("[data-navigation-scope]").evaluate(scope=>[...scope.querySelectorAll<HTMLElement>("a[href],button")].filter(e=>e.tabIndex>=0&&e.getClientRects().length&&!e.closest("[inert]")).length);
  for(let i=0;i<count;i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(()=>!!document.activeElement?.closest("[data-navigation-scope]"))).toBe(true);
  }
  await expect(toggle).toBeFocused(); await page.keyboard.press("Shift+Tab");
  await expect(toggle).not.toBeFocused(); await page.keyboard.press("Tab"); await expect(toggle).toBeFocused();
  const focus=await toggle.evaluate(e=>({visible:e.matches(":focus-visible"),width:getComputedStyle(e).outlineWidth,style:getComputedStyle(e).outlineStyle}));
  expect(focus.visible).toBe(true); expect(parseFloat(focus.width)).toBeGreaterThan(0); expect(focus.style).not.toBe("none");
  await page.keyboard.press("Escape"); await expect(toggle).toHaveAttribute("aria-expanded","false"); await expect(toggle).toBeFocused(); await idle(page);
  await toggle.click(); await page.locator('[data-menu-panel] nav[aria-label="Explore"]').getByRole("link",{name:"Work",exact:true}).click(); await expect(page.locator("main")).toHaveAttribute("data-route","/work"); await idle(page);
  await toggle.click(); await page.locator('[data-menu-panel] a[href="/services"]').click(); await expect(page.locator("main")).toHaveAttribute("data-route","/services"); await idle(page);
  await page.getByRole("link",{name:"Explore services",exact:true}).click(); await expect(page).toHaveURL(/#services-studio$/);
  await page.getByRole("link",{name:"Discuss your website",exact:true}).click(); await expect(page.locator("main")).toHaveAttribute("data-route","/contact"); await idle(page);
  await footer(page,"/about"); await footer(page,"/");
  await page.goBack(); await expect(page.locator("main")).toHaveAttribute("data-route","/about"); await idle(page);
  await page.goForward(); await expect(page.locator("main")).toHaveAttribute("data-route","/"); await idle(page); await overflow(page);
});
test("intro Escape releases locks and late activity cannot replay",async({page})=>{
  await page.goto("/",{waitUntil:"commit"});
  await page.waitForFunction(()=>window.__homeEntry?.active);
  await page.keyboard.press("Escape"); await idle(page);
  await expect(page.locator("html")).toHaveAttribute("data-transition-outcome","cancelled");
  await page.waitForTimeout(1500); await idle(page);
  await page.locator("[data-menu-toggle]").click(); await expect(page.getByRole("dialog",{name:"Navigation"})).toBeVisible();
  await page.keyboard.press("Escape"); await idle(page);
});
test("Home gallery, Work gallery, About and Services controls",async({page})=>{
  await page.goto("/"); await idle(page);
  const gallery=page.locator("[data-project-gallery]"),stage=page.locator("[data-project-stage]");
  await stage.scrollIntoViewIfNeeded(); await expect(gallery).toHaveAttribute("data-project-enhanced","true");
  await stage.focus(); await page.keyboard.press("ArrowRight"); await expect(gallery).toHaveAttribute("data-project-active","1");
  await page.keyboard.press("ArrowLeft"); await expect(gallery).toHaveAttribute("data-project-active","0");
  await page.locator("[data-project-next]").click(); await expect(gallery).toHaveAttribute("data-project-active","1");
  await footer(page,"/work"); await expect(page.locator("[data-work-card]")).toHaveCount(10);
  const work=page.locator("[data-work-playground]"); await expect(work).toBeEnabled(); await work.focus(); await page.keyboard.press("Enter");
  await footer(page,"/about");
  const hello=page.locator("[data-about-hello]"); await expect(hello).toHaveAttribute("aria-disabled","false"); await hello.click();
  await expect.poll(()=>page.locator("[data-about-hand]").evaluate(e=>e.getAnimations().filter(a=>a.playState==="running").length)).toBe(1);
  await page.locator('[data-about-value="1"] summary').press("Enter"); await expect(page.locator('[data-about-value="1"]')).toHaveAttribute("open");
  await footer(page,"/services");
  const play=page.locator("[data-services-hero-play]"); await expect(play).toHaveAttribute("aria-disabled","false"); await play.focus(); await page.keyboard.press("Space");
  await expect(page.locator("[data-services-hero]")).toHaveAttribute("data-services-hero-playing","true");
  const mode=page.getByRole("radio",{name:"Both",exact:true}); await mode.focus(); await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio",{name:"Develop",exact:true})).toBeChecked();
  await expect(page.locator('[data-services-panel="develop"]')).toBeVisible();
  const phase=page.locator("[data-services-phase-picker] input[type=radio]").last();
  await page.locator('label[for="services-phase-4"]').click(); await expect(phase).toBeChecked();
  await scan(page);
});
test("Contact validation, numeric budget, draft, real clipboard and encoded mailto without sending",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await page.goto("/contact"); await idle(page);
  const prepare=page.getByRole("button",{name:"Prepare email",exact:true});
  await prepare.click(); await expect(page.locator('[name="name"]')).toBeFocused(); await expect(page.locator('[aria-invalid="true"]')).toHaveCount(3);
  await page.locator('[name="name"]').fill("R03 أحمد 😀 &?cc=outside@example.com");
  await page.locator('[name="email"]').fill("release+test@example.com");
  const goal="Test only: متجر 🛒 &? # + %0A\nKeep every line.";
  await page.locator('[name="goal"]').fill(goal);
  await page.getByRole("group",{name:"Your project details"}).locator("details > summary").click();
  const budget=page.locator('[name="budget"]');
  await budget.fill("-1"); await prepare.click(); await expect(budget).toBeFocused(); await expect(budget).toHaveAttribute("aria-invalid","true");
  await budget.fill("١٥٠٠٫٥٠"); await prepare.click(); await expect(page.locator("pre")).toContainText("Budget: 1500.50 USD");
  const href=await page.getByRole("link",{name:"Open email app"}).getAttribute("href"),url=new URL(href!);
  expect(url.protocol).toBe("mailto:"); expect(url.pathname).toBe(identity.email); expect([...url.searchParams.keys()]).toEqual(["subject","body"]);
  expect(url.searchParams.get("body")).toContain(goal.replace(/\n/g,"\r\n"));
  expect(url.searchParams.get("subject")).toBe("Project enquiry — R03 أحمد 😀 &?cc=outside@example.com");
  const text=await page.locator("pre").textContent();
  await page.getByRole("button",{name:"Copy message"}).click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  // Windows clipboard converts LF to CRLF. Preserve every character and line.
  expect(copied.replaceAll("\r\n","\n")).toBe(text);
  await expect(page.locator("[data-contact-status]")).toContainText("Message copied.");
  await page.locator('[name="goal"]').fill("Changed test brief"); await expect(page.locator("pre")).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Open email app"})).toHaveCount(0);
});
test("reduced motion keeps all routes, controls, focus and navigation available",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"}); await page.goto("/"); await idle(page);
  expect(await page.locator("[data-hero-track]").evaluate(e=>e.getAnimations().filter(a=>a.playState==="running").length)).toBe(0);
  for(const route of ["/work","/services","/contact","/about","/"]) {
    await footer(page,route); await expect(page.locator("main h1")).toBeVisible(); await overflow(page);
    const toggle=page.locator("[data-menu-toggle]"); await toggle.focus(); await page.keyboard.press("Enter"); await expect(toggle).toHaveAttribute("aria-expanded","true");
    await page.keyboard.press("Escape"); await expect(toggle).toBeFocused(); await idle(page);
  }
});
test("without JavaScript: direct open/reload, five-page native journey and 404",async({browser},info)=>{
  const context=await browser.newContext({...info.project.use,baseURL:info.project.use.baseURL,javaScriptEnabled:false});
  try {
    const page=await context.newPage(); watch(page,true);
    for(const route of routes) {
      const status=route==="/release-missing-page"?404:200;
      expect((await page.goto(route))?.status()).toBe(status); await expect(page.locator("main h1")).toBeVisible();
      expect((await page.reload())?.status()).toBe(status); await scan(page);
    }
    await page.goto("/");
    for(const href of ["/work","/services","/contact","/about","/"]) {
      await page.getByRole("navigation",{name:"Main navigation",exact:true}).locator('a[href="'+href+'"]').click();
      await expect(page.locator("main")).toHaveAttribute("data-route",href); await expect(page.locator("main h1")).toBeVisible(); await overflow(page);
    }
    await attach(page,info);
  } finally { await context.close(); }
});


import {test,expect} from "@playwright/test";

for (const route of ["/","/work","/services","/contact","/about"]) {
  test(`idle ${route} does not preload unused routes or emit warnings`, async ({page,browserName}, info) => {
    const prefetched:string[]=[], warnings:string[]=[], errors:string[]=[];
    page.on("request", request => { if (request.headers()["next-router-prefetch"] === "1") prefetched.push(request.url()); });
    page.on("console", message => { if (["warning","warn","error"].includes(message.type())) warnings.push(message.text()); });
    page.on("pageerror", error => errors.push(error.message));
    if (browserName === "chromium") {
      const cdp = await page.context().newCDPSession(page);
      cdp.on("Log.entryAdded", ({entry}) => { if (["warning","error"].includes(entry.level)) warnings.push(entry.text); });
      await cdp.send("Log.enable");
    }
    await page.goto(route);
    await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase","idle");
    // Chrome emits unused-preload warnings a few seconds after load.
    await page.waitForTimeout(6500);
    await info.attach("idle-resource-policy", {body:JSON.stringify({route,prefetched,warnings,errors}),contentType:"application/json"});
    expect(prefetched).toEqual([]);
    expect(warnings).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("a chosen route is prefetched during its transition and then opens", async ({page}) => {
  const prefetched:string[]=[];
  page.on("request", request => { if (request.headers()["next-router-prefetch"] === "1") prefetched.push(new URL(request.url()).pathname); });
  await page.goto("/services");
  await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase","idle");
  expect(prefetched).toEqual([]);
  await page.getByRole("navigation",{name:"Footer navigation",exact:true}).locator('a[href="/"]').click();
  await expect(page.locator("main")).toHaveAttribute("data-route","/");
  await expect(page.locator("[data-page-curtain]")).toHaveAttribute("data-phase","idle");
  expect(prefetched).toContain("/");
  await expect(page.locator("[data-menu-toggle]")).toBeEnabled();
});

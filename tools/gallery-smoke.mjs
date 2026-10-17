import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { preview, output, verifyBuild } from "./release-context.mjs";

const identity = await verifyBuild();
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {});
const results = [];
try {
  for (const mobile of [false,true]) {
    const context = await browser.newContext({baseURL:preview.origin,viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    try {
      const page = await context.newPage(),errors=[];
      page.on("pageerror",error=>errors.push(error.message));
      await page.goto("/");
      await page.waitForFunction(()=>document.querySelector("[data-page-curtain]")?.getAttribute("data-phase")==="idle"&&!document.querySelector("[data-transition-shell]")?.hasAttribute("inert"),null,{timeout:12000});
      assert.ok(!/deadline|error/.test(await page.locator("html").getAttribute("data-transition-outcome")||""));
      await page.waitForFunction(()=>document.querySelector("[data-project-gallery]")?.getAttribute("data-project-enhanced")==="true");
      const stage=page.locator("[data-project-stage]");
      async function center() {
        await stage.evaluate(element=>{const r=element.getBoundingClientRect();scrollTo({top:r.top+scrollY+r.height/2-innerHeight/2,behavior:"instant"});});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const box=await stage.boundingBox();
        const card=await page.locator("[data-project-card]").first().evaluate(element=>element.offsetWidth);
        return {x:box.x+box.width/2,y:box.y+box.height/2,card};
      }
      async function active(value) {
        await page.waitForFunction(value=>document.querySelector("[data-project-gallery]")?.getAttribute("data-project-active")===String(value),value);
        await page.waitForTimeout(500);
      }
      async function gesture(dx,dy=0) {
        const point=await center();
        if(mobile) {
          const cdp=await context.newCDPSession(page);
          try {
            await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:point.x,y:point.y}]});
            for(let i=1;i<=10;i++) {
              await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:point.x+dx*point.card*i/10,y:point.y+dy*i/10}]});
              await page.waitForTimeout(16);
            }
            await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
          } finally {await cdp.detach();}
        } else {
          await page.mouse.move(point.x,point.y);await page.mouse.down();
          await page.mouse.move(point.x+dx*point.card,point.y+dy,{steps:10});await page.mouse.up();
        }
      }
      await active(0);
      await gesture(-.35);await active(1);
      await gesture(.35);await active(0);
      let nativeVerticalScroll;
      if(mobile) {
        await center();const before=await page.evaluate(()=>scrollY);
        await gesture(0,-200);
        await page.waitForFunction(before=>scrollY>before+20,before);
        await active(0);
        nativeVerticalScroll={before,after:await page.evaluate(()=>scrollY)};
      }
      assert.deepEqual(errors,[]);
      results.push({mode:mobile?"mobile touch emulation":"desktop mouse",leftDrag:1,rightDrag:0,nativeVerticalScroll,errors});
    } finally {await context.close();}
  }
} finally {await browser.close();}
await verifyBuild();
const result={buildId:identity.buildId,preview:preview.origin,passed:true,results};
await writeFile(path.join(output,"gallery-gestures.json"),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));


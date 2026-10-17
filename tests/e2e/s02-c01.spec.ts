import {test,expect,type Page} from '@playwright/test';
const frames=async(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
async function ready(page:Page){await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await page.evaluate(()=>document.fonts.ready);await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-enhanced','true');}
async function scene(page:Page){return page.locator('footer').evaluate(el=>({scroll:scrollY,curve:el.querySelector('[data-footer-curve]')!.getBoundingClientRect().height,panel:new DOMMatrix(getComputedStyle(el.querySelector('[data-footer-panel]')!).transform).m42}));}
async function midpoint(page:Page){const y=await page.locator('footer').evaluate(el=>el.getBoundingClientRect().top+scrollY-innerHeight+(el as HTMLElement).offsetHeight*.5);await page.evaluate(y=>scrollTo(0,y),y);await frames(page);return scene(page);}
async function leaveFooter(page:Page){await page.locator('[data-project-next]').evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));await frames(page);}
for(const [name,size,touch] of [['laptop',{width:1366,height:600},false],['mobile',{width:390,height:844},true]] as const){
 test.describe(name,()=>{
  test.use({viewport:size,hasTouch:touch,isMobile:touch});
  for(const input of ['pointer','keyboard'] as const)test(`S02-C01 footer restores scroll scene after ${input} focus exits`,async({page},info)=>{
   await ready(page);const before=await midpoint(page);expect(before.curve).toBeGreaterThan(10);
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await frames(page);
   const copy=page.getByRole('button',{name:'Copy email address'});
   if(input==='pointer'){if(touch)await copy.tap();else await copy.click();}
   else{await copy.focus();await page.keyboard.press('Space');}
   await expect(copy).toBeFocused();
   await leaveFooter(page);await page.evaluate(y=>scrollTo(0,y),before.scroll);await frames(page);
   const after=await scene(page);await info.attach('scene-before-after',{body:JSON.stringify({input,touch,before,after},null,2),contentType:'application/json'});
   expect(after.curve).toBeCloseTo(before.curve,1);expect(after.panel).toBeCloseTo(before.panel,1);
   // Reversibility in both directions after releasing focus.
   await page.evaluate(()=>scrollBy(0,60));await frames(page);expect((await scene(page)).curve).toBeLessThan(before.curve);
   await page.evaluate(y=>scrollTo(0,y),before.scroll);await frames(page);expect((await scene(page)).curve).toBeCloseTo(before.curve,1);
  });
  test('S02-C01 pointer focus never pins the footer while it remains focused',async({page})=>{
   await ready(page);const before=await midpoint(page);await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await frames(page);
   const copy=page.getByRole('button',{name:'Copy email address'});if(touch)await copy.tap();else await copy.click();
   await page.evaluate(y=>scrollTo(0,y),before.scroll);await frames(page);await expect(copy).toBeFocused();expect((await scene(page)).curve).toBeCloseTo(before.curve,1);
  });
  test('S02-C01 keyboard focus stays visible across internal transfer and releases immediately',async({page})=>{
   await ready(page);const before=await midpoint(page);await page.keyboard.press('Tab');
   await page.locator('footer').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-innerHeight+(el as HTMLElement).offsetHeight*.1));await frames(page);
   await page.locator('[data-footer-magnetic]').evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));await frames(page);
   expect((await scene(page)).curve).toBe(0); // This target actually needs the temporary reveal.
   for(let i=0;i<4;i++){
    expect(await page.evaluate(()=>{const el=document.activeElement!,r=el.getBoundingClientRect(),footer=el.closest('footer')!,f=footer.getBoundingClientRect(),curve=footer.querySelector('[data-footer-curve]')!.getBoundingClientRect();return {inside:!!footer,visible:r.top>=Math.max(0,f.top+curve.height)-1&&r.bottom<=Math.min(innerHeight,f.bottom)+1&&r.left>=0&&r.right<=innerWidth};})).toEqual({inside:true,visible:true});
    // Sample every frame during Tab transfer, so a one-frame hide cannot pass.
    await page.evaluate(()=>{const samples:boolean[]=[];Object.assign(window,{focusSamples:samples});for(let i=0;i<4;i++)requestAnimationFrame(()=>{const el=document.activeElement!,r=el.getBoundingClientRect();samples.push(!!el.closest('footer')&&r.top>=-1&&r.bottom<=innerHeight+1);});});
    await page.keyboard.press('Tab');await frames(page);
    expect(await page.evaluate(()=>(window as unknown as {focusSamples:boolean[]}).focusSamples.every(Boolean))).toBe(true);
   }
   await leaveFooter(page);await page.evaluate(y=>scrollTo(0,y),before.scroll);await frames(page);expect((await scene(page)).curve).toBeCloseTo(before.curve,1);
  });
  test('S02-C01 reduced motion remains static after focus and reverse scroll',async({page})=>{
   await page.emulateMedia({reducedMotion:'reduce'});await ready(page);await page.locator('[data-footer-magnetic]').focus();await leaveFooter(page);await midpoint(page);
   await expect(page.locator('footer')).not.toHaveAttribute('data-footer-enhanced');expect((await scene(page)).panel).toBe(0);expect((await scene(page)).curve).toBe(0);
  });
 });
}
test('S02-C01 cursor stays in stage after scroll up and down without re-entry',async({page},info)=>{
 await ready(page);const stage=page.locator('[data-project-stage]'),gallery=page.locator('[data-project-gallery]');
 await stage.evaluate(el=>{const r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+r.height/2-innerHeight/2);});await frames(page);
 const r=(await stage.boundingBox())!;const x=r.x+r.width/2,y=r.y+r.height/2;await page.mouse.move(x,y);await expect(gallery).toHaveAttribute('data-project-cursor-visible');
 await stage.evaluate(el=>{Object.assign(window,{stageEntries:0});el.addEventListener('pointerenter',()=>{(window as unknown as {stageEntries:number}).stageEntries++;});});
 const measurements=[];
 for(const delta of [-180,180,180,-180]){
  // Keep the pointer in the overlap of the old and new stage positions during scroll.
  await page.mouse.move(x,y);
  await page.evaluate(delta=>scrollBy(0,delta),delta);await frames(page);
  const box=(await stage.boundingBox())!,py=delta<0?Math.min(580,box.y+box.height-15):Math.max(110,box.y+60);
  await page.mouse.move(x,py);expect(await page.evaluate(({x,py})=>!!document.elementFromPoint(x,py)?.closest('[data-project-stage]'),{x,py})).toBe(true);
  await expect(gallery).toHaveAttribute('data-project-cursor-visible');
  const first=await page.locator('[data-project-cursor]').evaluate(el=>el.style.transform);await page.mouse.move(x+35,py-5);await frames(page);
  expect(await page.locator('[data-project-cursor]').evaluate(el=>el.style.transform)).not.toBe(first);measurements.push({delta,box,py});
 }
 expect(await page.evaluate(()=>(window as unknown as {stageEntries:number}).stageEntries)).toBe(0);
 await info.attach('scroll-bounds',{body:JSON.stringify(measurements,null,2),contentType:'application/json'});
 await page.mouse.move(5,5);await expect(gallery).not.toHaveAttribute('data-project-cursor-visible');
});
test('S02-C01 captured cursor exits and returns inside, resize, menu and hidden tab stop it',async({page})=>{
 await ready(page);const stage=page.locator('[data-project-stage]'),gallery=page.locator('[data-project-gallery]');
 await stage.evaluate(el=>{const r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+r.height/2-innerHeight/2);});await frames(page);const r=(await stage.boundingBox())!,x=r.x+r.width/2,y=r.y+r.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-20,y);expect(await stage.evaluate(el=>el.hasPointerCapture(1))).toBe(true);
 await page.mouse.move(r.x-30,y);await expect(gallery).not.toHaveAttribute('data-project-cursor-visible');
 await page.mouse.move(x,y);await expect(gallery).toHaveAttribute('data-project-cursor-visible');await page.mouse.up();
 await page.setViewportSize({width:1440,height:675});await frames(page);const next=(await stage.boundingBox())!;await page.mouse.move(next.x+next.width/2,Math.max(20,next.y+25));await expect(gallery).toHaveAttribute('data-project-cursor-visible');
 await page.locator('[data-menu-toggle]').evaluate(el=>(el as HTMLElement).click());await expect(gallery).not.toHaveAttribute('data-project-cursor-visible');await page.keyboard.press('Escape');
 await page.mouse.move(5,5);await page.mouse.move(next.x+next.width/2,Math.max(20,next.y+25));await expect(gallery).toHaveAttribute('data-project-cursor-visible');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(gallery).not.toHaveAttribute('data-project-cursor-visible');
 await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(x,y);await expect(gallery).not.toHaveAttribute('data-project-cursor-visible');
});

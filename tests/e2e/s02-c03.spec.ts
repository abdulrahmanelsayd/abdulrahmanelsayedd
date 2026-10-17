import {test,expect,type Page} from '@playwright/test';

const cta=(page:Page)=>page.locator('[data-footer-magnetic]');
const frames=async(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
async function scene(page:Page){return page.locator('footer').evaluate(el=>{
 const panel=el.querySelector('[data-footer-panel]') as HTMLElement;
 const progress=Math.max(0,Math.min(1,(innerHeight-el.getBoundingClientRect().top)/panel.offsetHeight));
 const target=document.querySelector('[data-footer-magnetic]')!,rect=target.getBoundingClientRect(),footer=el.getBoundingClientRect();
 const curve=el.querySelector('[data-footer-curve]')!.getBoundingClientRect().height;
 return {scroll:scrollY,curve,panel:new DOMMatrix(getComputedStyle(panel).transform).m42,
  naturalCurve:innerHeight*.1*(1-progress),naturalPanel:panel.offsetHeight*-.4*(1-progress),
  active:document.activeElement===target,focusVisible:target.matches(':focus-visible'),
  visible:rect.top>=Math.max(0,footer.top+curve)-1&&rect.bottom<=Math.min(innerHeight,footer.bottom)+1&&rect.left>=0&&rect.right<=innerWidth};
});}
async function partialScroll(page:Page){
 await page.locator('footer').evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top-innerHeight+(el as HTMLElement).offsetHeight*.1));
 await frames(page);
}
async function reveal(page:Page){
 await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-enhanced','true');
 await page.keyboard.press('Tab');await partialScroll(page);
 await page.locator('a[href="/work"]').filter({hasText:'More work'}).evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
 await page.keyboard.press('Tab');await frames(page);
 expect(await scene(page)).toMatchObject({active:true,focusVisible:true,visible:true,curve:0});
}
type Lifecycle='visibility resume'|'window blur and focus';
async function suspend(page:Page,lifecycle:Lifecycle){
 // Deterministic lifecycle simulation. This does not switch a native window/tab.
 if(lifecycle==='visibility resume')await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
 });
 else {await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await frames(page);}
}
async function resume(page:Page,lifecycle:Lifecycle){
 if(lifecycle==='visibility resume')await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});
 else await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await frames(page);
}
async function expectNatural(page:Page){
 const state=await scene(page);expect(state.curve).toBeCloseTo(state.naturalCurve,1);expect(state.panel).toBeCloseTo(state.naturalPanel,1);
 return state;
}

for(const lifecycle of ['visibility resume','window blur and focus'] as const){
 test(`S02-C03 ${lifecycle} reveals existing keyboard focus without refocusing or scrolling`,async({page},info)=>{
  await reveal(page);const before=await scene(page);
  await page.evaluate(()=>{Object.assign(window,{resumeFocusEvents:0});document.addEventListener('focusin',()=>{(window as unknown as {resumeFocusEvents:number}).resumeFocusEvents++;});});
  await suspend(page,lifecycle);await resume(page,lifecycle);
  const after=await scene(page);await info.attach('simulated-resume',{body:JSON.stringify({lifecycle,before,after},null,2),contentType:'application/json'});
  expect(after).toMatchObject({active:true,focusVisible:true,visible:true,curve:0});expect(after.scroll).toBe(before.scroll);
  expect(await page.evaluate(()=>(window as unknown as {resumeFocusEvents:number}).resumeFocusEvents)).toBe(0);
  await page.locator('[data-project-next]').evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));await frames(page);
  expect((await expectNatural(page)).curve).toBeGreaterThan(10);
 });
 test(`S02-C03 ${lifecycle} refreshes geometry changed while suspended`,async({page},info)=>{
  await reveal(page);await suspend(page,lifecycle);
  // No scroll/resize event: model a layout change while away that needs a fresh measurement.
  await page.locator('footer').evaluate(el=>{(el.previousElementSibling as HTMLElement).style.marginBottom='-30px';});
  await resume(page,lifecycle);const restored=await scene(page);
  await info.attach('simulated-layout-resume',{body:JSON.stringify({lifecycle,restored},null,2),contentType:'application/json'});
  expect(restored).toMatchObject({active:true,focusVisible:true,visible:true,curve:0});
  await page.locator('[data-project-next]').evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));await frames(page);
  await expectNatural(page);
 });
 test(`S02-C03 ${lifecycle} respects current focus outside footer`,async({page})=>{
  await reveal(page);await suspend(page,lifecycle);
  const outside=page.locator('[data-project-next]');await outside.evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
  const scroll=await page.evaluate(()=>scrollY);await resume(page,lifecycle);
  await expect(outside).toBeFocused();expect((await expectNatural(page)).curve).toBeGreaterThan(10);
  expect(await page.evaluate(()=>scrollY)).toBe(scroll);
 });
 test(`S02-C03 ${lifecycle} does not force a keyboard target that already fits`,async({page})=>{
  await reveal(page);await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await frames(page);
  expect((await scene(page)).visible).toBe(true);await suspend(page,lifecycle);await resume(page,lifecycle);
  await expect(cta(page)).toBeFocused();expect((await scene(page)).focusVisible).toBe(true);
  // A forced reveal would remain pinned after this scroll without any new focus event.
  await partialScroll(page);expect((await expectNatural(page)).curve).toBeGreaterThan(10);
 });
 test(`S02-C03 ${lifecycle} never resumes a canceled native pointer press`,async({page},info)=>{
  await reveal(page);const r=(await cta(page).boundingBox())!;
  await page.evaluate(()=>{Object.assign(window,{resumeClicks:0});document.addEventListener('click',event=>{
   if(!(event.target instanceof Element)||!event.target.closest('[data-footer-magnetic]'))return;
   (window as unknown as {resumeClicks:number}).resumeClicks++;event.preventDefault();event.stopPropagation();
  },true);});
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await frames(page);expect((await scene(page)).curve).toBe(0);
  await suspend(page,lifecycle);await resume(page,lifecycle);
  const restored=await expectNatural(page);expect(restored.curve).toBeGreaterThan(10);expect(restored.active).toBe(true);
  await info.attach('simulated-lifecycle-native-press',{body:JSON.stringify({lifecycle,restored},null,2),contentType:'application/json'});
  await page.mouse.move(5,5);await page.mouse.up();await frames(page);await expectNatural(page);
  expect(await page.evaluate(()=>(window as unknown as {resumeClicks:number}).resumeClicks)).toBe(0);
  // A fresh keyboard input on this same active link restores keyboard intent.
  await page.keyboard.press('ArrowRight');await frames(page);
  expect(await scene(page)).toMatchObject({active:true,focusVisible:true,visible:true,curve:0});
 });
 test(`S02-C03 ${lifecycle} keeps reduced motion static`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await page.evaluate(()=>document.fonts.ready);
  await page.keyboard.press('Tab');await page.locator('a[href="/work"]').filter({hasText:'More work'}).evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
  await page.keyboard.press('Tab');await frames(page);await suspend(page,lifecycle);await resume(page,lifecycle);
  await expect(cta(page)).toBeFocused();await expect(page.locator('footer')).not.toHaveAttribute('data-footer-enhanced');
  expect(await scene(page)).toMatchObject({curve:0,panel:0});
 });
}

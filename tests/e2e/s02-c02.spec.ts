import {test,expect,type Page,type TestInfo} from '@playwright/test';

const cta=(page:Page)=>page.locator('[data-footer-magnetic]');
const frames=async(page:Page)=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
async function scene(page:Page){return page.locator('footer').evaluate(el=>({
 scroll:scrollY,curve:el.querySelector('[data-footer-curve]')!.getBoundingClientRect().height,
 panel:new DOMMatrix(getComputedStyle(el.querySelector('[data-footer-panel]')!).transform).m42,
 progress:(scrollY+innerHeight-el.getBoundingClientRect().top-scrollY)/(el as HTMLElement).offsetHeight,
}));}
async function scrollScene(page:Page){return page.locator('footer').evaluate(el=>{
 const height=(el.querySelector('[data-footer-panel]') as HTMLElement).offsetHeight;
 const progress=Math.max(0,Math.min(1,(innerHeight-el.getBoundingClientRect().top)/height));
 return {scroll:scrollY,curve:innerHeight*.1*(1-progress),panel:height*-.4*(1-progress)};
});}
async function reveal(page:Page,mode='native Tab from More work'){
 await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-enhanced','true');
 await page.keyboard.press('Tab');
 await page.locator('footer').evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top-innerHeight+(el as HTMLElement).offsetHeight*.1));
 await frames(page);const scrollScene=await scene(page);
 if(mode==='native Tab from More work'){
  const more=page.locator('a[href="/work"]').filter({hasText:'More work'});
  await more.evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
  await expect(more).toBeFocused();
  expect(await more.evaluate(el=>el.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('Tab');
 }else await cta(page).evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
 await expect(cta(page)).toBeFocused();await frames(page);
 expect(await cta(page).evaluate(el=>el.matches(':focus-visible'))).toBe(true);
 expect((await scene(page)).curve).toBe(0);
 expect(scrollScene.progress).toBeCloseTo(.1,2);
 return scrollScene;
}
async function recordActivation(page:Page,blockNavigation=false){
 await page.evaluate(block=>{
  sessionStorage.setItem('s02-c02-events','[]');
  for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,event=>{
   if(!(event.target instanceof Element)||!event.target.closest('[data-footer-magnetic]'))return;
   const el=document.querySelector('[data-footer-magnetic]')!,r=el.getBoundingClientRect();
   const events=JSON.parse(sessionStorage.getItem('s02-c02-events')!);
   events.push({type:event.type,trusted:event.isTrusted,detail:(event as MouseEvent).detail,x:r.x,y:r.y,
    curve:document.querySelector('[data-footer-curve]')!.getBoundingClientRect().height,
    href:el.getAttribute('href'),defaultPrevented:event.defaultPrevented});
   sessionStorage.setItem('s02-c02-events',JSON.stringify(events));
   if(block&&event.type==='click'){event.preventDefault();event.stopPropagation();}
  },true);
 },blockNavigation);
}
async function events(page:Page){return page.evaluate(()=>JSON.parse(sessionStorage.getItem('s02-c02-events')!) as {type:string;trusted:boolean;detail:number;curve:number;href:string;defaultPrevented:boolean}[]);}
async function press(page:Page,hold:number,info:TestInfo){
 const before=(await cta(page).boundingBox())!,x=before.x+before.width/2,y=before.y+before.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(hold);
 const pressed=(await cta(page).boundingBox())!,heldScene=await scene(page);
 const hit=await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('[data-footer-magnetic]'),{x,y});
 await info.attach('pressed-footer',{body:await page.screenshot(),contentType:'image/png'});
 await page.mouse.up();
 await info.attach('activation-geometry',{body:JSON.stringify({before,pressed,pointer:{x,y},hold,heldScene,hit},null,2),contentType:'application/json'});
 return {before,pressed,heldScene,hit};
}

// Migrated from the independent review's activation.spec.cjs: same 120ms native
// mouse gesture and click count, including a real Tab from More work.
for(const mode of ['keyboard focus reveal','native Tab from More work']){
 test(`S02-C02 CTA activates after ${mode} then mouse press`,async({page},info)=>{
  await reveal(page,mode);await recordActivation(page,true);
  const geometry=await press(page,120,info),activation=await events(page);
  await info.attach('native-activation',{body:JSON.stringify(activation,null,2),contentType:'application/json'});
  expect(activation.filter(event=>event.type==='click')).toHaveLength(1);
  expect(activation.every(event=>event.trusted)).toBe(true);
  expect(geometry.hit).toBe(true);
  expect(Math.abs(geometry.pressed.y-geometry.before.y)).toBeLessThan(1);
  expect(Math.abs(geometry.pressed.x-geometry.before.x)).toBeLessThan(1);
  expect(geometry.heldScene.curve).toBe(0);
  expect(activation.every(event=>event.curve===0)).toBe(true);
  await frames(page);expect((await scene(page)).curve).toBeGreaterThan(10);
 });
}

for(const hold of [20,120,1200])test(`S02-C02 real /contact navigation once after Tab and ${hold}ms press`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await reveal(page);await recordActivation(page);
 const navigations:string[]=[];page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&new URL(frame.url()).pathname==='/contact')navigations.push(frame.url());});
 const geometry=await press(page,hold,info);
 await expect(page).toHaveURL(/\/contact$/);await expect(page.locator('main h1')).toBeVisible();
 const activation=await events(page),clicks=activation.filter(event=>event.type==='click');
 await info.attach('real-navigation',{body:JSON.stringify({activation,navigations,url:page.url(),errors},null,2),contentType:'application/json'});
 expect(clicks).toHaveLength(1);expect(clicks[0]).toMatchObject({trusted:true,detail:1,href:'/contact',defaultPrevented:false,curve:0});
 expect(navigations).toHaveLength(1);expect(errors).toEqual([]);
 expect(geometry.hit).toBe(true);expect(Math.abs(geometry.pressed.y-geometry.before.y)).toBeLessThan(1);
});

test('S02-C02 a held reveal restores the current scroll scene after native activation',async({page},info)=>{
 await reveal(page);await recordActivation(page,true);
 const r=(await cta(page).boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
 await page.evaluate(()=>scrollBy(0,20));await frames(page);
 expect((await scene(page)).curve).toBe(0);expect((await scene(page)).panel).toBe(0);
 // The stationary pointer still lies inside the scrolled link. Moving while
 // holding an anchor can start the browser's native drag and cancel activation.
 expect(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('[data-footer-magnetic]'),{x:r.x+r.width/2,y:r.y+r.height/2})).toBe(true);
 await page.mouse.up();await frames(page);
 const restored=await scene(page),expected=await scrollScene(page);
 await info.attach('current-scroll-release',{body:JSON.stringify({restored,expected,activation:await events(page)},null,2),contentType:'application/json'});
 expect((await events(page)).filter(event=>event.type==='click')).toHaveLength(1);
 expect(restored.curve).toBeCloseTo(expected.curve,1);expect(restored.panel).toBeCloseTo(expected.panel,1);
 await page.evaluate(()=>scrollBy(0,40));await frames(page);expect((await scene(page)).curve).toBeLessThan(restored.curve);
 await page.evaluate(y=>scrollTo(0,y),restored.scroll);await frames(page);expect((await scene(page)).curve).toBeCloseTo(restored.curve,1);
});

for(const reason of ['release outside','pointercancel','viewport exit','window blur','hidden tab','inert menu'] as const){
 test(`S02-C02 ${reason} releases an in-progress reveal and permits another activation`,async({page},info)=>{
  await reveal(page);const original=await scrollScene(page);await recordActivation(page,true);
  const r=(await cta(page).boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await frames(page);
  expect((await scene(page)).curve).toBe(0);
  if(reason==='release outside'){
   await page.mouse.move(5,5);await page.mouse.up();
  }else if(reason==='pointercancel'){
   // Mouse has no OS touch cancellation; explicitly exercise the PointerEvent lifecycle.
   await cta(page).dispatchEvent('pointercancel',{pointerId:1,isPrimary:true});
  }else if(reason==='viewport exit'){
   // Playwright cannot move a native pointer into browser chrome.
   await cta(page).dispatchEvent('pointerout',{pointerId:1,relatedTarget:null});
  }else if(reason==='window blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  else if(reason==='hidden tab'){
   // Deterministic Page Visibility lifecycle, distinct from a native OS tab switch.
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});
  }else{
   await page.locator('[data-menu-toggle]').evaluate(el=>(el as HTMLElement).click());
   await expect(page.locator('[data-page-content]')).toHaveAttribute('inert');
   await page.keyboard.press('Escape');
   await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');
   // Closing the dialog may legitimately restore keyboard focus and scroll it
   // into view. Exit that focus and return to this gesture's scroll coordinate.
   await page.locator('[data-project-next]').evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
   await page.evaluate(y=>scrollTo(0,y),original.scroll);
  }
  await frames(page);const restored=await scene(page);
  expect(restored.curve).toBeCloseTo((await scrollScene(page)).curve,1);
  expect(restored.curve).toBeGreaterThan(10);
  await info.attach('cancellation-release',{body:JSON.stringify({reason,original,restored},null,2),contentType:'application/json'});
  if(reason!=='release outside'){await page.mouse.move(5,5);await page.mouse.up();}
  expect((await events(page)).filter(event=>event.type==='click')).toHaveLength(0);
  // Repeat on a fresh keyboard reveal in the same mounted component.
  await page.keyboard.press('Tab');
  await page.locator('a[href="/work"]').filter({hasText:'More work'}).evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
  await page.keyboard.press('Tab');await frames(page);await expect(cta(page)).toBeFocused();
  await press(page,120,info);expect((await events(page)).filter(event=>event.type==='click')).toHaveLength(1);
  await frames(page);expect((await scene(page)).curve).toBeGreaterThan(10);
 });
}

test('S02-C02 native anchor drag cancellation releases the reveal',async({page},info)=>{
 await reveal(page);await recordActivation(page,true);
 const r=(await cta(page).boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
 await page.mouse.move(r.x+r.width/2-30,r.y+r.height/2,{steps:5});await frames(page);
 const activation=await events(page),restored=await scene(page),expected=await scrollScene(page);
 await info.attach('native-drag-cancel',{body:JSON.stringify({activation,restored,expected},null,2),contentType:'application/json'});
 expect(activation.filter(event=>event.type==='pointercancel')).toEqual([expect.objectContaining({trusted:true})]);
 expect(restored.curve).toBeCloseTo(expected.curve,1);
 await page.keyboard.press('Escape');await page.mouse.move(5,5);await page.mouse.up();
 expect((await events(page)).filter(event=>event.type==='click')).toHaveLength(0);
});

test('S02-C02 Tab transfers retain visible focus and exit restores scrolling',async({page})=>{
 await reveal(page);
 for(let i=0;i<5;i++){
  expect(await page.evaluate(()=>{
   const el=document.activeElement!,r=el.getBoundingClientRect(),footer=el.closest('footer')!,f=footer.getBoundingClientRect(),curve=footer.querySelector('[data-footer-curve]')!.getBoundingClientRect();
   return {focus:el.matches(':focus-visible'),visible:r.top>=Math.max(0,f.top+curve.height)-1&&r.bottom<=Math.min(innerHeight,f.bottom)+1&&r.left>=0&&r.right<=innerWidth};
  })).toEqual({focus:true,visible:true});
  await page.keyboard.press('Tab');await frames(page);
 }
 await page.locator('[data-project-next]').evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
 await page.locator('footer').evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top-innerHeight+(el as HTMLElement).offsetHeight*.1));
 await frames(page);expect((await scene(page)).curve).toBeGreaterThan(10);
});

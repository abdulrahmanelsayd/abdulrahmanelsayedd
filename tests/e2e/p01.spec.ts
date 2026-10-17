import {test,expect,type Page} from '@playwright/test';
const frames=(page:Page)=>page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
const sizes=[{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1366,height:600},{width:1440,height:900}];
const center=async(page:Page)=>{await page.locator('[data-project-stage]').evaluate(el=>{const r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+r.height/2-innerHeight/2);});await frames(page);};
async function ready(page:Page){await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await page.evaluate(()=>document.fonts.ready);await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-enhanced','true');}
for(const size of sizes)test(`P01 full page, reload, Work return, keyboard and idle ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await ready(page);
 for(const selector of ['[data-section="hero"]','[data-capability-marquee]','#home-introduction','[data-project-stage]','footer']){await page.locator(selector).scrollIntoViewIfNeeded();await frames(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.screenshot({path:info.outputPath('footer.png')});await center(page);
 const toggle=page.locator('[data-menu-toggle]');await toggle.click();await expect(page.locator('[data-page-content]')).toHaveAttribute('inert');await page.keyboard.press('Escape');await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');await center(page);
 await page.locator('[data-project-stage]').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-active','1');await page.waitForTimeout(1200);
 await page.evaluate(()=>{Object.assign(window,{p01IdleChanges:0});const o=new MutationObserver(records=>{(window as unknown as {p01IdleChanges:number}).p01IdleChanges+=records.filter(r=>(r.target as Element).matches('[data-project-card],[data-project-copy]')).length;});o.observe(document.querySelector('[data-project-gallery]')!,{attributes:true,subtree:true,attributeFilter:['style','data-project-state']});Object.assign(window,{p01IdleObserver:o});});await page.waitForTimeout(1500);
 expect(await page.evaluate(()=>(window as unknown as {p01IdleChanges:number}).p01IdleChanges)).toBe(0);await page.evaluate(()=>(window as unknown as {p01IdleObserver:MutationObserver}).p01IdleObserver.disconnect());
 await page.locator('a[href="/work"]').filter({hasText:'More work'}).click();await expect(page).toHaveURL(/\/work$/);await page.goBack();await expect(page.locator('[data-project-copy]')).toHaveCount(4);await page.reload();await expect(page.locator('[data-project-copy]')).toHaveCount(4);
 await page.evaluate(()=>scrollTo(0,0));await frames(page);await expect(page.locator('h1')).toBeVisible();
 await page.screenshot({path:info.outputPath('hero.png')});expect(errors).toEqual([]);expect(await page.locator('img').evaluateAll(items=>items.map(el=>el as HTMLImageElement).filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src))).toEqual([]);
});
test('P01 resize crosses 720/721, 767/768 and 991/992 during gallery motion',async({page})=>{
 await ready(page);for(const width of [720,721,767,768,991,992,991,768,767,721,720]){await center(page);await page.locator('[data-project-next]').click();await page.waitForTimeout(60);await page.setViewportSize({width,height:844});await frames(page);await page.waitForTimeout(800);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('[data-project-copy]')).toHaveCount(4);await expect(page.locator('[data-project-gallery]')).not.toHaveAttribute('data-project-dragging');}
});
for(const size of [sizes[0],sizes[1],sizes[4]])test(`P01 early scrolling with delayed assets ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=route.request().url();if(/\.woff2|\/_next\/image/.test(u))await new Promise(r=>setTimeout(r,1500));await route.continue();});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.mouse.wheel(0,800);await page.mouse.wheel(0,400);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2000);
 await expect(page.locator('#home-introduction')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('early-scroll.png')});expect(errors).toEqual([]);
});
test('P01 route lifecycle cleans listeners and owned animations after repeated returns',async({page},info)=>{
 await page.addInitScript(()=>{
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,registry:{target:EventTarget;type:string;listener:EventListenerOrEventListenerObject;capture:boolean}[]=[];
  EventTarget.prototype.addEventListener=function(type,listener,options){const capture=typeof options==='boolean'?options:!!options?.capture;if(listener&&!registry.some(r=>r.target===this&&r.type===type&&r.listener===listener&&r.capture===capture))registry.push({target:this,type,listener,capture});return add.call(this,type,listener,options);};
  EventTarget.prototype.removeEventListener=function(type,listener,options){const capture=typeof options==='boolean'?options:!!options?.capture;const i=registry.findIndex(r=>r.target===this&&r.type===type&&r.listener===listener&&r.capture===capture);if(i>=0)registry.splice(i,1);return remove.call(this,type,listener,options);};
  Object.assign(window,{p01ListenerRegistry:registry});
 });
 await ready(page);const samples=[];
 for(let i=0;i<4;i++){
  await center(page);await page.waitForTimeout(500);
  const entryAnimations=await page.evaluate(()=>document.getAnimations().map(a=>({name:a instanceof CSSAnimation?a.animationName:a.constructor.name,state:a.playState,iterations:a.effect?.getTiming().iterations,duration:a.effect?.getTiming().duration})));
  // The gallery drawing (1200ms) and navigation transitions (600ms) restart on return.
  // Compare cleanup only after those finite entrances finish, retaining their details.
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getTiming().iterations)).map(a=>a.finished.catch(()=>{}))));
  const sample=await page.evaluate(()=>{const r=(window as unknown as {p01ListenerRegistry:{target:EventTarget;type:string;listener:EventListenerOrEventListenerObject}[]}).p01ListenerRegistry;const relevant=r.filter(v=>v.target===window||v.target===document||v.target instanceof MediaQueryList||v.target instanceof Element&&v.target.matches('[data-project-stage],[data-project-gallery],[data-project-next],[data-project-previous]'));return {listeners:relevant.map(v=>({type:v.type,name:typeof v.listener==='function'?v.listener.name:'object'})),copies:document.querySelectorAll('[data-project-copy]').length,animations:document.getAnimations().filter(a=>a.playState==='running').length,detachedGalleryListeners:r.filter(v=>v.target instanceof Element&&!v.target.isConnected&&v.target.matches('[data-project-stage],[data-project-gallery],[data-project-next],[data-project-previous]')).length};});samples.push({...sample,entryAnimations});
  await info.attach(`listener-animation-sample-${i}`,{body:JSON.stringify(samples.at(-1),null,2),contentType:'application/json'});
  expect(sample.copies).toBe(4);expect(sample.detachedGalleryListeners).toBe(0);if(i>0){const sorted=(listeners:typeof sample.listeners)=>listeners.toSorted((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));expect(sorted(sample.listeners)).toEqual(sorted(samples[0].listeners));expect(sample.animations).toBeLessThanOrEqual(samples[0].animations);}
  if(i<3){await page.locator('a[href="/work"]').filter({hasText:'More work'}).click();await expect(page).toHaveURL(/\/work$/);await page.goBack();await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-enhanced','true');}
 }await info.attach('listener-animation-samples',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});
test('P01 introduction defers geometry work while menu locks the page and resumes after closing',async({page},info)=>{
 await page.addInitScript(()=>{
  const original=Element.prototype.getBoundingClientRect;
  Object.assign(window,{p01LockedIntroReads:0,p01UnlockedIntroReads:0});
  Element.prototype.getBoundingClientRect=function(){
   if(this.closest('#home-introduction')){
    const state=window as unknown as {p01LockedIntroReads:number;p01UnlockedIntroReads:number};
    if(document.querySelector<HTMLElement>('[data-page-content]')?.inert)state.p01LockedIntroReads++;else state.p01UnlockedIntroReads++;
   }return original.call(this);
  };
 });
 await ready(page);await center(page);await page.locator('[data-menu-toggle]').click();await expect(page.locator('[data-page-content]')).toHaveAttribute('inert');await page.waitForTimeout(700);
 const locked=await page.evaluate(()=>(window as unknown as {p01LockedIntroReads:number}).p01LockedIntroReads);
 await info.attach('locked-introduction-reads',{body:JSON.stringify({locked}),contentType:'application/json'});expect(locked).toBe(0);
 const before=await page.evaluate(()=>(window as unknown as {p01UnlockedIntroReads:number}).p01UnlockedIntroReads);await page.keyboard.press('Escape');await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');await frames(page);
 expect(await page.evaluate(()=>(window as unknown as {p01UnlockedIntroReads:number}).p01UnlockedIntroReads)).toBeGreaterThan(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

import {test,expect,type Page} from '@playwright/test';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const ready=async(page:Page)=>{await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await expect(page.locator('[data-section=hero]')).toHaveAttribute('data-hero-entry','complete');await page.evaluate(()=>document.fonts.ready);await expect(page.locator('html')).toHaveClass(/lenis/);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(700);};
const y=(page:Page)=>page.evaluate(()=>scrollY);
const settle=(page:Page)=>page.waitForTimeout(650);
const sizes=[{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:992,height:900},{width:1366,height:600},{width:1440,height:900}];
for(const size of sizes)test('SC01 production journey and geometry '+size.width+'x'+size.height,async({page},info)=>{
 await page.setViewportSize(size);await ready(page);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const selector of ['[data-section="hero"]','#home-introduction','[data-project-stage]','footer']){
  await page.locator(selector).scrollIntoViewIfNeeded();await settle(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(selector.replaceAll(/[^a-z]/g,'')+'.png')});
 }
 await page.evaluate(()=>scrollTo(0,0));await settle(page);expect(await y(page)).toBe(0);
 expect(errors).toEqual([]);
});
test('SC01 wheel uses duration, exact distance, small steps and immediate reversal',async({page},info)=>{
 await ready(page);await page.mouse.move(900,350);await page.mouse.wheel(0,600);await page.waitForTimeout(50);
 const early=await y(page);expect(early).toBeGreaterThan(0);expect(early).toBeLessThan(600);await settle(page);expect(await y(page)).toBeCloseTo(600,0);
 for(let i=0;i<5;i++){await page.mouse.wheel(0,12);await page.waitForTimeout(25);}await settle(page);expect(await y(page)).toBeCloseTo(660,0);
 await page.evaluate(()=>{window.addEventListener('wheel',event=>{if(event.deltaY<0)Object.assign(window,{sc01ReverseOrigin:scrollY});},{capture:true,once:false,passive:true});});await page.mouse.wheel(0,900);await page.waitForTimeout(60);await page.mouse.wheel(0,-160);await settle(page);const reversal=await page.evaluate(()=>(window as unknown as {sc01ReverseOrigin:number}).sc01ReverseOrigin);
 expect(await y(page)).toBeCloseTo(reversal-160,0);await info.attach('wheel',{body:JSON.stringify({early,reversal,final:await y(page)}),contentType:'application/json'});
});
test('SC01 menu cancels residual motion throughout open and closing, then resumes',async({page})=>{
 await ready(page);await page.mouse.move(900,350);await page.mouse.wheel(0,1200);await page.waitForTimeout(50);
 await page.locator('[data-menu-toggle]').click();await expect(page.locator('[data-page-content]')).toHaveAttribute('inert');const locked=await y(page);
 await page.mouse.move(1100,550);await page.mouse.wheel(0,600);await page.waitForTimeout(700);expect(await y(page)).toBe(locked);
 await page.keyboard.press('Escape');await page.waitForTimeout(150);await page.mouse.wheel(0,600);expect(await y(page)).toBe(locked);
 await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');await settle(page);expect(await y(page)).toBe(locked);
 await page.mouse.wheel(0,200);await settle(page);expect(await y(page)).toBeGreaterThan(locked);
});
test('SC01 menu navigation and native history never restore the previous page over Work',async({page})=>{
 await ready(page);await page.evaluate(()=>scrollTo(0,1100));await settle(page);await page.locator('[data-menu-toggle]').click();
 await page.locator('[data-menu-panel] a[href="/work"]').first().click();await expect(page).toHaveURL(/\/work$/);await settle(page);
 await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');expect(await y(page)).toBeLessThan(400);
 await page.goBack();await expect(page).toHaveURL(/\/$/);await settle(page);const restored=await y(page);
 await page.goForward();await expect(page).toHaveURL(/\/work$/);await settle(page);expect(await y(page)).toBeLessThan(400);
 await page.goBack();await settle(page);expect(await y(page)).toBeCloseTo(restored,0);
});
test('SC01 native keyboard and focus interrupt wheel without stealing focus',async({page})=>{
 await ready(page);await page.mouse.wheel(0,1000);await page.waitForTimeout(50);await page.keyboard.press('Home');await settle(page);expect(await y(page)).toBe(0);
 await page.keyboard.press('PageDown');await settle(page);expect(await y(page)).toBeGreaterThan(200);
 await page.keyboard.press('PageUp');await settle(page);expect(await y(page)).toBeLessThan(100);
 await page.keyboard.press('End');await settle(page);expect(await y(page)).toBeGreaterThan(2000);
 await page.keyboard.press('Home');await settle(page);
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');if(await page.locator('.skip-link').evaluate(el=>el===document.activeElement))break;}await expect(page.locator('.skip-link')).toBeFocused();await page.keyboard.press('Enter');await settle(page);
 await expect(page.locator('main')).toBeFocused();
 await page.mouse.wheel(0,1000);await page.waitForTimeout(50);await page.locator('[data-project-next]').focus();await settle(page);
 await expect(page.locator('[data-project-next]')).toBeFocused();const position=await y(page);await settle(page);expect(await y(page)).toBe(position);
});
test('SC01 scrollIntoView and native scrollTo supersede an active wheel target',async({page})=>{
 await ready(page);await page.mouse.wheel(0,1200);await page.waitForTimeout(50);
 await page.evaluate(()=>document.querySelector('footer')!.scrollIntoView());const target=await y(page);await settle(page);expect(await y(page)).toBe(target);
 await page.mouse.wheel(0,-900);await page.waitForTimeout(50);const native=await page.evaluate(()=>{scrollTo(0,777);return scrollY;});await settle(page);expect(await y(page)).toBe(native);
});
test('SC01 reduced motion changes during inertia keep native scroll available',async({page})=>{
 await ready(page);await page.mouse.wheel(0,180);await page.waitForTimeout(50);await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('html')).not.toHaveClass(/lenis/);const stopped=await y(page);await settle(page);expect(await y(page)).toBe(stopped);
 await page.mouse.wheel(0,200);await settle(page);expect(await y(page)).toBeGreaterThan(stopped);
 const native=await y(page);await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('html')).toHaveClass(/lenis/);await settle(page);expect(await y(page)).toBe(native);
});
test('SC01 gallery vertical wheel, arrows and horizontal drag coexist',async({page})=>{
 await ready(page);await page.locator('[data-project-stage]').evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top+(el as HTMLElement).offsetHeight/2-innerHeight/2));await settle(page);
 const stage=page.locator('[data-project-stage]'),r=(await stage.boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);const before=await y(page);await page.mouse.wheel(0,150);await settle(page);expect(await y(page)).toBeGreaterThan(before);
 await stage.scrollIntoViewIfNeeded();await stage.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(1100);await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-active','1');
 await page.locator('[data-project-previous]').click();await page.waitForTimeout(1100);await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-active','0');
 await stage.evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top+(el as HTMLElement).offsetHeight/2-innerHeight/2));await settle(page);const box=(await stage.boundingBox())!,x=box.x+box.width/2,yy=box.y+box.height/2;
 await page.mouse.move(x,yy);await page.mouse.down();await page.mouse.move(x-180,yy,{steps:20});await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-dragging');await page.mouse.up();await page.waitForTimeout(1100);
 await expect(page.locator('[data-project-gallery]')).not.toHaveAttribute('data-project-dragging');
});
test('SC01 native touch on mobile has no active smooth engine',async({browser})=>{
 const context=await browser.newContext({ baseURL: test.info().project.use.baseURL,viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});try{
  const page=await context.newPage();await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await page.waitForTimeout(1500);await expect(page.locator('html')).not.toHaveClass(/lenis/);
  const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:550}]});for(let step=1;step<=20;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:550-350*step/20}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);expect(await y(page)).toBeGreaterThan(200);
 }finally{await context.close();}
});
test('SC01 reload restores an introduction position and retains one enhancement',async({page})=>{
 await ready(page);await page.locator('#home-introduction').scrollIntoViewIfNeeded();await settle(page);const position=await y(page);await page.reload();await expect(page.locator('html')).toHaveClass(/lenis/);await settle(page);expect(await y(page)).toBeCloseTo(position,0);
 await expect(page.locator('[data-project-copy]')).toHaveCount(4);
});
test('SC01 failed dynamic Lenis chunk leaves native scrolling usable',async({page})=>{
 const directory=fileURLToPath(new URL('../..',import.meta.url))+'/.next/static/chunks';const chunks:string[]=[];
 for(const file of await readdir(directory)){if(file.endsWith('.js')&&(await readFile(directory+'/'+file,'utf8')).includes('lenisVersion'))chunks.push(file);}
 expect(chunks.length).toBeGreaterThan(0);await page.route('**/_next/static/chunks/*.js',route=>chunks.some(file=>route.request().url().includes('/'+file))?route.abort():route.continue());
 await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await expect(page.locator('[data-section=hero]')).toHaveAttribute('data-hero-entry','complete');await expect(page.locator('html')).not.toHaveClass(/lenis/);await page.mouse.wheel(0,500);await settle(page);expect(await y(page)).toBeGreaterThan(300);
});
test('SC01 no JavaScript keeps content, internal marquee and native page scroll',async({browser})=>{
 const context=await browser.newContext({ baseURL: test.info().project.use.baseURL,javaScriptEnabled:false,viewport:{width:390,height:844}});try{const page=await context.newPage();await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await expect(page.locator('h1')).toBeVisible();await page.mouse.wheel(0,700);await settle(page);expect(await y(page)).toBeGreaterThan(300);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}finally{await context.close();}
});


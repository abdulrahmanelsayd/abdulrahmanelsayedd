import { test, expect, type Page } from '@playwright/test';

const idle = async (page:Page) => {
  await expect(page.locator('html')).not.toHaveAttribute('data-page-entry','pending');
  await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase','idle',{timeout:8500});
  await expect(page.locator('[data-transition-shell]')).not.toHaveAttribute('inert','');
  await expect.poll(()=>page.evaluate(()=>document.body.style.overflow),{timeout:2500}).not.toBe('hidden');
  expect(await page.locator('html').getAttribute('data-transition-outcome') ?? '').not.toMatch(/deadline|error/);
};
const header = (page:Page,href:string)=>page.locator('[data-site-header] a[href="'+href+'"]').first();
const footer = (page:Page,name:string)=>page.getByRole('navigation',{name:'Footer navigation'}).getByRole('link',{name,exact:true});
const arrived = async(page:Page,path:string)=>{await expect(page.locator('main')).toHaveAttribute('data-route',path);await idle(page);};

test.beforeEach(async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.addInitScript(()=>{
    const state={rows:[] as {t:number;phase?:string;label:string|null;path:string;outcome?:string}[],shifts:[] as number[],longTasks:[] as number[]};
    (window as unknown as {tr01:typeof state}).tr01=state;
    const record=()=>{
      const curtain=document.querySelector<HTMLElement>('[data-page-curtain]');
      const row={t:performance.now(),phase:curtain?.dataset.phase,label:curtain?.textContent??null,path:location.pathname,outcome:document.documentElement.dataset.transitionOutcome};
      const previous=state.rows.at(-1);
      if(!previous||row.phase!==previous.phase||row.label!==previous.label||row.path!==previous.path||row.outcome!==previous.outcome)state.rows.push(row);
    };
    new MutationObserver(record).observe(document,{subtree:true,attributes:true,childList:true,characterData:true});
    new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!(e as PerformanceEntry & {hadRecentInput:boolean}).hadRecentInput)state.shifts.push((e as PerformanceEntry & {value:number}).value);})).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(list=>list.getEntries().forEach(e=>state.longTasks.push(e.duration))).observe({type:'longtask',buffered:true});
  });
  await test.info().attach('errors-start',{body:'[]',contentType:'application/json'});
  test.info().annotations.push({type:'console',description:'Captured by the afterEach assertion'});
  (page as unknown as {tr01Errors:string[]}).tr01Errors=errors;
});
test.afterEach(async({page})=>{
  await test.info().attach('motion-metrics',{body:JSON.stringify(await page.evaluate(()=>(window as unknown as {tr01:unknown}).tr01)),contentType:'application/json'});
  expect((page as unknown as {tr01Errors:string[]}).tr01Errors).toEqual([]);
});

test('Escape after dispatch still positions the eventual destination',async({page})=>{
  await page.goto('/services');await idle(page);await page.evaluate(()=>scrollTo(0,900));
  await page.route('**/about?*',async route=>{await new Promise(resolve=>setTimeout(resolve,2200));await route.continue();});
  await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  const request=page.waitForRequest(r=>new URL(r.url()).pathname==='/about'&&r.url().includes('_rsc'));
  await page.getByRole('navigation',{name:'Explore',exact:true}).getByRole('link',{name:'About',exact:true}).click();
  await request;await page.keyboard.press('Escape');await idle(page);await arrived(page,'/about');
  expect(await page.evaluate(()=>scrollY)).toBe(0);
});

test('first open, refresh and all five routes through header/menu/footer/content',async({page})=>{
  await page.goto('/'); await idle(page);
  await expect(page.locator('[data-section="hero"]')).toHaveAttribute('data-hero-running','true');
  const image=page.locator('[data-hero-photo]'); expect(await image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
  const track=page.locator('[data-hero-track]'), before=await track.evaluate(e=>getComputedStyle(e).transform);
  await page.waitForTimeout(200); expect(await track.evaluate(e=>getComputedStyle(e).transform)).not.toBe(before);
  expect(await page.locator('[data-section="hero"] [class*="globeWrap"]').evaluate(e=>getComputedStyle(e).animationPlayState)).toBe('running');
  await page.screenshot({path:test.info().outputPath('hero.png')});
  await page.reload(); await idle(page);
  const intro=await page.evaluate(()=>(window as unknown as {tr01:{rows:{phase:string;label:string;t:number}[]}}).tr01.rows.filter(r=>r.phase==='greeting'));
  expect(intro.map(r=>r.label)).toEqual(['Hello','Bonjour','स्वागत हे','Ciao','Olá','おい','Hallå','Guten tag','Hallo']);
  await header(page,'/work').click(); await arrived(page,'/work'); expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.getByRole('button',{name:'Play with the Work title',exact:true}).click();
  await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  await page.getByRole('navigation',{name:'Explore',exact:true}).getByRole('link',{name:'Services',exact:true}).click(); await arrived(page,'/services');
  await page.getByRole('link',{name:'Explore services',exact:true}).click();
  await expect(page).toHaveURL(/#services-studio$/); await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase','idle');
  await page.getByRole('link',{name:'Discuss your website',exact:true}).click(); await arrived(page,'/contact');
  await footer(page,'About').click(); await arrived(page,'/about');
  await page.getByRole('link',{name:'See the work',exact:true}).click(); await arrived(page,'/work');
  await footer(page,'Home').click(); await arrived(page,'/');
  await expect(page.locator('[data-curtain-words]')).toHaveText('Home');
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await expect(page.locator('main')).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Back/Forward restore independent scroll positions, including Home',async({page})=>{
  await page.goto('/'); await idle(page); await page.evaluate(()=>scrollTo(0,650)); await page.waitForTimeout(150);
  const home=await page.evaluate(()=>scrollY);
  await header(page,'/work').click(); await arrived(page,'/work'); await page.evaluate(()=>scrollTo(0,900)); await page.waitForTimeout(150);
  const work=await page.evaluate(()=>scrollY);
  await header(page,'/contact').click(); await arrived(page,'/contact');
  await page.goBack(); await arrived(page,'/work'); expect(Math.abs(await page.evaluate(()=>scrollY)-work)).toBeLessThan(5);
  await page.goBack(); await arrived(page,'/'); expect(Math.abs(await page.evaluate(()=>scrollY)-home)).toBeLessThan(5);
  await page.goForward(); await arrived(page,'/work'); expect(Math.abs(await page.evaluate(()=>scrollY)-work)).toBeLessThan(5);
});

test('rapid clicks, Enter, Escape and menu focus release every owner',async({page})=>{
  await page.goto('/'); await idle(page);
  await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button',{name:'Open navigation menu',exact:true})).toBeFocused({timeout:3000});
  await header(page,'/work').press('Enter'); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await idle(page);
  await page.waitForTimeout(600); // Escape before cover must not schedule a late push.
  await header(page,'/contact').click({clickCount:3}); await page.keyboard.press('Escape'); await idle(page);
  await header(page,'/work').click(); await arrived(page,'/work');
  await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert','');
});

test('greetings retain their duration after a main-thread stall',async({page})=>{
  await page.goto('/'); await page.waitForFunction(()=>document.querySelector('[data-curtain-words]')?.textContent==='Bonjour',{},{polling:'raf',timeout:5000});
  await page.evaluate(()=>{const end=performance.now()+700;while(performance.now()<end){/* deliberate regression fixture */}});
  await idle(page);
  const rows=await page.evaluate(()=>(window as unknown as {tr01:{rows:{phase:string;label:string;t:number}[]}}).tr01.rows.filter(r=>r.phase==='greeting'));
  expect(rows).toHaveLength(9);
  for(let i=2;i<rows.length;i++)expect(rows[i].t-rows[i-1].t).toBeGreaterThan(125);
});

test('hidden tab resumes its intro without the rescue deadline',async({page,context})=>{
  await page.goto('/'); await page.waitForFunction(()=>document.querySelector('[data-curtain-words]')?.textContent==='Bonjour',{},{polling:'raf',timeout:5000});
  const cdp=await context.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});
  const other=await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
  // Explicit visibility fixture is needed on hosts that keep every automated window visible.
  const actual=await page.evaluate(()=>document.hidden);
  if(!actual)await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(10000);
  if(!actual)await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});
  await page.bringToFront(); await idle(page);
  await test.info().attach('visibility-environment',{body:JSON.stringify({nativeVisibility:actual,fixture:!actual}),contentType:'application/json'});
  await expect(page.locator('html')).toHaveAttribute('data-transition-outcome','complete');
});

test('slow destination stays covered until its actual content arrives',async({page})=>{
  await page.goto('/'); await idle(page);
  await page.route('**/about?*',async route=>{await new Promise(resolve=>setTimeout(resolve,2500));await route.continue();});
  await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  await page.getByRole('navigation',{name:'Explore',exact:true}).getByRole('link',{name:'About',exact:true}).click();
  await page.waitForTimeout(1400); await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase','waiting');
  await arrived(page,'/about');
});

test('reduced motion and no JavaScript preserve navigation and content',async({browser,baseURL,page})=>{
  await page.emulateMedia({reducedMotion:'reduce'}); await page.goto('/'); await idle(page);
  await header(page,'/work').click(); await arrived(page,'/work');
  const context=await browser.newContext({baseURL,javaScriptEnabled:false});
  try{const native=await context.newPage();await native.goto('/');await expect(native.locator('h1')).toBeVisible();
    await native.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Services',exact:true}).click();
    await expect(native.locator('main')).toHaveAttribute('data-route','/services');await native.getByRole('link',{name:'Explore services',exact:true}).click();await expect(native).toHaveURL(/#services-studio$/);
  }finally{await context.close();}
});


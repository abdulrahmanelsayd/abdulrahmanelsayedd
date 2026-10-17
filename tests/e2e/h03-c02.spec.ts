import { test, expect, type Page } from '@playwright/test';
const header = (p: Page) => p.locator('[data-site-header]');
const menu = (p: Page) => p.locator('[data-menu-toggle]');
async function ready(p: Page) {
  await p.goto('/');await p.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000}); await p.evaluate(() => document.fonts.ready);
  await expect(p.locator('[data-section=hero]')).toHaveAttribute('data-hero-entry', 'complete');
  await expect(header(p)).toHaveAttribute('data-hero-header', 'true');
  await expect.poll(() => p.locator('[data-hero-photo]').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}
async function at(p: Page, ratio: number) {
  await p.evaluate(r => { const hero = document.querySelector('[data-section=hero]')!.getBoundingClientRect(); scrollTo({ top: hero.bottom + scrollY - innerHeight * r, behavior: 'instant' }); }, ratio);
  await p.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}
async function settled(p: Page) { await p.waitForTimeout(480); }
for (const size of [{width:1440,height:900},{width:1366,height:768},{width:768,height:1024},{width:640,height:800},{width:639,height:800},{width:390,height:844},{width:320,height:740},{width:1440,height:400},{width:320,height:400}]) {
  test(`H03-C02 final geometry and stable introduction ${size.width}x${size.height}`, async ({page}, info) => {
    await page.setViewportSize(size); await ready(page); await settled(page);
    const nodes = await page.locator('[data-menu-toggle], [data-header-actions] a').elementHandles();
    const read = () => header(page).evaluate(el => {
      const box = (s: string) => el.querySelector(s)!.getBoundingClientRect().toJSON();
      return {menu:box('[data-menu-toggle]'),actions:box('[data-header-actions]'),bar:box('[data-header-bar]'),
        buttons:[...el.querySelectorAll<HTMLElement>('[data-header-menu-surface], [data-header-actions] [data-header-surface]')].map(b => ({...b.getBoundingClientRect().toJSON(),font:getComputedStyle(b).fontSize,radius:getComputedStyle(b).borderRadius,background:getComputedStyle(b).backgroundColor,padding:getComputedStyle(b).paddingLeft})),
        brand:getComputedStyle(el.querySelector('[data-brand-interactive]')!).opacity,brandHidden:getComputedStyle(el.querySelector('[data-brand-interactive]')!).visibility,
        gap:getComputedStyle(el.querySelector('[data-header-actions]')!).gap,background:getComputedStyle(el.querySelector('[data-header-back]')!).opacity,
        introHeight:document.querySelector('#home-introduction')!.getBoundingClientRect().height,readingTop:getComputedStyle(document.querySelector('#home-introduction')!).getPropertyValue('--reading-top'),
        overflow:document.documentElement.scrollWidth>innerWidth,viewport:document.documentElement.clientWidth};
    });
    const corners = await read(), mobile = size.width < 768, edge = mobile ? 16 : 24;
    expect(corners.menu.x).toBeCloseTo(edge, 0); expect(corners.menu.y).toBeCloseTo(edge, 0);
    expect(corners.viewport-corners.actions.right).toBeCloseTo(edge, 0);
    expect(corners.background).toBe('0'); expect(corners.brand).toBe('0');
    for (const [index,b] of corners.buttons.entries()) {
      expect(b.height).toBe(mobile?44:48); expect(b.radius).toBe('999px'); expect(b.padding).toBe(mobile?'14px':'18px');
      if(index) expect(b.font).toBe(mobile?'14px':'15px');
    }
    expect(corners.buttons.map(b=>b.background)).toEqual(['rgb(32, 29, 29)','rgb(79, 76, 76)','rgb(161, 255, 98)']);
    expect(corners.gap).toBe(mobile?'6px':'8px'); expect(corners.overflow).toBe(false);
    await page.screenshot({path:info.outputPath('corners.png')});
    await at(page,.79); await expect(header(page)).toHaveAttribute('data-hero-header-state','docked'); await settled(page);
    const docked = await read();
    expect(docked.bar.width).toBeLessThanOrEqual(600); expect(docked.bar.width).toBeLessThanOrEqual(size.width-32);
    expect(docked.bar.height).toBe(mobile?56:64); expect(docked.background).toBe('1');
    expect(docked.menu.x-docked.bar.x).toBe(mobile?6:8);
    expect(docked.bar.right-docked.actions.right).toBe(mobile?6:8);
    expect(docked.buttons.map(b=>[b.width,b.height])).toEqual(corners.buttons.map(b=>[b.width,b.height]));
    expect(docked.brand).toBe(size.width>=640?'1':'0');
    if(size.width>=640) await expect(header(page).locator('[data-header-wordmark]')).toHaveCSS('opacity','1');
    expect(docked.introHeight).toBe(corners.introHeight); expect(docked.readingTop).toBe(corners.readingTop); expect(docked.overflow).toBe(false);
    await page.screenshot({path:info.outputPath('docked.png')});
    await at(page,.86); await expect(header(page)).toHaveAttribute('data-hero-header-state','docked');
    await at(page,.94); await expect(header(page)).toHaveAttribute('data-hero-header-state','corners');
    await at(page,.86); await expect(header(page)).toHaveAttribute('data-hero-header-state','corners');
    await settled(page);
    for(const [i,node] of nodes.entries()) expect(await node.evaluate((el,i)=>el===document.querySelectorAll('[data-menu-toggle], [data-header-actions] a')[i],i)).toBe(true);
    await expect(page.locator('[data-site-header]')).toHaveCount(1); await expect(page.locator('[data-header-actions] a')).toHaveCount(2);
    // Reading's ring clears the final bar even at the sticky reading start.
    await page.evaluate(()=>{const intro=document.querySelector<HTMLElement>('#home-introduction')!;const padding=parseFloat(getComputedStyle(intro).paddingTop);const reserve=parseFloat(getComputedStyle(intro).getPropertyValue('--reading-top'));if(reserve)scrollTo(0,intro.getBoundingClientRect().top+scrollY+padding-reserve+5);});
    await settled(page);
    if(await page.locator('#home-introduction').getAttribute('data-reading-enhanced')) expect(await page.locator('[data-intro-ring]').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('[data-header-top]')!.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(11);
  });
}

test('H03-C02 delayed surface, reverse from live pose and no scroll layout reads', async({page})=>{
  await ready(page); await settled(page);
  const result=await page.evaluate(async()=>{
    const h=document.querySelector<HTMLElement>('[data-site-header]')!,m=h.querySelector<HTMLElement>('[data-menu-toggle]')!,back=h.querySelector<HTMLElement>('[data-header-back]')!,brand=h.querySelector<HTMLElement>('[data-brand-interactive]')!;
    const hero=document.querySelector('[data-section=hero]')!; const end=hero.getBoundingClientRect().bottom+scrollY;
    scrollTo(0,end-innerHeight*.79);
    await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
    const timing=m.getAnimations().map(a=>a.effect!.getTiming());
    await new Promise(r=>setTimeout(r,170)); const early={back:getComputedStyle(back).opacity,logo:getComputedStyle(brand).opacity};
    const before=m.getBoundingClientRect().left;scrollTo(0,end-innerHeight*.94);
    await new Promise<void>(r=>requestAnimationFrame(()=>r()));const after=m.getBoundingClientRect().left;
    await new Promise(r=>setTimeout(r,480));
    return{timing,early,before,after,final:m.getBoundingClientRect().left};
  });
  expect(result.timing.some(t=>t.duration===420&&t.easing==='cubic-bezier(0.22, 1, 0.36, 1)')).toBe(true);
  expect(result.early).toEqual({back:'0',logo:'0'});expect(Math.abs(result.after-result.before)).toBeLessThan(60);expect(result.final).toBeCloseTo(24,0);
  await page.evaluate(()=>{const original=Element.prototype.getBoundingClientRect;Object.assign(window,{headerReads:0});Element.prototype.getBoundingClientRect=function(){if(this.closest('[data-site-header]'))(window as unknown as {headerReads:number}).headerReads++;return original.call(this);};});
  for(let n=0;n<12;n++){await page.evaluate(()=>scrollBy(0,2));await page.waitForTimeout(20);}
  expect(await page.evaluate(()=>(window as unknown as {headerReads:number}).headerReads)).toBe(0);
});

for(const target of ['menu','work','contact']) test(`H03-C02 native long press holds ${target}, one click and menu continuity`,async({page})=>{
  await ready(page);await at(page,.79);await page.waitForTimeout(90);
  const button=target==='menu'?menu(page):page.locator(`[data-header-actions] a[href="/${target}"]`);
  const r=(await button.boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
  const before=await button.boundingBox();await at(page,.96);await page.waitForTimeout(500);expect(await button.boundingBox()).toEqual(before);
  await button.evaluate(el=>{sessionStorage.setItem('c02-clicks','0');el.addEventListener('click',()=>sessionStorage.setItem('c02-clicks',String(Number(sessionStorage.getItem('c02-clicks'))+1)));});
  await page.mouse.up();expect(await page.evaluate(()=>sessionStorage.getItem('c02-clicks'))).toBe('1');
  if(target!=='menu'){await expect(page).toHaveURL(new RegExp('/'+target+'$'));return;}
  await expect(menu(page)).toHaveAttribute('aria-expanded','true');await expect(menu(page)).toBeFocused();await expect(page.locator('[data-page-content]')).toHaveAttribute('inert');
  const y=await page.evaluate(()=>scrollY);await page.mouse.wheel(0,400);expect(await page.evaluate(()=>scrollY)).toBe(y);
  await page.locator('[data-menu-panel] a:visible').last().focus();await page.keyboard.press('Tab');await expect(menu(page)).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');await expect(menu(page)).toBeFocused();await settled(page);
  await expect(header(page)).toHaveAttribute('data-hero-header-state','corners');expect((await menu(page).boundingBox())!.x).toBeCloseTo(24,0);
  await at(page,.79);await page.waitForTimeout(80);const b=(await menu(page).boundingBox())!;await page.mouse.move(b.x+10,b.y+10);await page.mouse.down();await page.mouse.move(0,400);await page.mouse.up();await expect(menu(page)).toHaveAttribute('aria-expanded','false');
});

test('H03-C02 focused logo remains visible through return and mobile resize',async({page})=>{
  await ready(page);await at(page,.79);await settled(page);const brand=header(page).locator('[data-brand-interactive]');await brand.focus();await at(page,.96);await settled(page);await expect(brand).toBeFocused();await expect(brand).toHaveCSS('opacity','1');await page.setViewportSize({width:390,height:844});await expect(brand).toBeFocused();await expect(brand).toBeVisible();await page.keyboard.press('Tab');await expect(brand).toHaveCSS('visibility','hidden');
});

test('H03-C02 history and reload restore docked immediately; reduced motion has no trip',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page);await at(page,.6);await expect(header(page)).toHaveAttribute('data-hero-header-state','docked');
  expect(await menu(page).evaluate(el=>el.getAnimations().length)).toBe(0);
  const y=await page.evaluate(()=>scrollY);await page.locator('[data-header-actions] a[href="/work"]').click();await expect(page).toHaveURL(/\/work$/);await page.goBack();await expect(header(page)).toHaveAttribute('data-hero-header-state','docked');await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,-1);
  await page.reload();await expect(header(page)).toHaveAttribute('data-hero-header-state','docked');expect(await menu(page).evaluate(el=>el.getAnimations().length)).toBe(0);
  await at(page,.96);await expect(header(page)).toHaveAttribute('data-hero-header-state','corners');await menu(page).click();await page.keyboard.press('Escape');await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');
});
import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { introduction, capabilities } from '../../src/content/home-introduction';
const sizes=[{width:1366,height:600},{width:1536,height:675},{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:320,height:740},{width:844,height:390}];
const intro=(page:Page)=>page.locator('#home-introduction');
const marquee=(page:Page)=>page.locator('[data-capability-marquee]');
async function ready(page:Page) {
  await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000}); await page.evaluate(()=>document.fonts.ready);
  await expect.poll(async()=>{
    const g=await geometry(page);return g.enabled===(g.contentHeight<=g.availableHeight);
  }).toBe(true);
}
async function geometry(page:Page) {
  return intro(page).evaluate(el=>{
    const stage=el.querySelector<HTMLElement>('[data-intro-stage]')!,content=el.querySelector<HTMLElement>('[data-intro-content]')!;
    const top=el.getBoundingClientRect().top+scrollY,reserve=document.querySelector('[data-header-top]')!.getBoundingClientRect().bottom+12+Math.max(0,content.getBoundingClientRect().top-el.querySelector('[data-intro-ring]')!.getBoundingClientRect().top);
    const style=getComputedStyle(el),paddingTop=parseFloat(style.paddingTop),paddingBottom=parseFloat(style.paddingBottom),enabled=el.hasAttribute('data-reading-enhanced');
    return {top,start:top+paddingTop-reserve,distance:enabled?el.getBoundingClientRect().height-paddingTop-paddingBottom-stage.getBoundingClientRect().height:0,
      stageHeight:stage.getBoundingClientRect().height,reserve,contentHeight:content.getBoundingClientRect().height,count:el.querySelectorAll('[data-intro-letter]:not([data-intro-lead])').length,
      enabled,availableHeight:innerHeight-reserve,paddingTop,paddingBottom};
  });
}
async function scroll(page:Page,y:number) {
  await page.evaluate(y=>scrollTo(0,y),y);
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
const opacity=(page:Page)=>page.locator('[data-intro-letter]:not([data-intro-lead])').evaluateAll(items=>items.map(item=>Number(getComputedStyle(item).opacity)));
function expectSameOpacity(actual:number[],expected:number[]){
  expect(actual).toHaveLength(expected.length);
  for(let index=0;index<actual.length;index++)expect(actual[index]).toBeCloseTo(expected[index],5);
}
for(const size of sizes) {
  test(`S01 reading sequence, layout, reversal and navigation ${size.width}x${size.height}`,async({page},info)=>{
    await page.setViewportSize(size);await ready(page);
    await expect(page.getByRole('region',{name:introduction,exact:true})).toHaveCount(1);
    await expect(page.locator('#home-introduction-label')).toHaveCount(0);
    await expect(page.getByRole('heading',{name:introduction,exact:true})).toHaveCount(1);
    expect((await intro(page).ariaSnapshot()).split('\n').filter(line=>line.includes(`heading "${introduction}"`))).toHaveLength(1);
    await expect(page.locator('#home-introduction h2')).toHaveText(introduction);
    await expect(page.locator('#home-introduction svg')).toHaveCount(1);
    await expect(page.locator('[data-intro-track], [data-intro-feature]')).toHaveCount(0);
    await expect(page.locator('#home-introduction a, #home-introduction button')).toHaveCount(0);
    const g=await geometry(page),H=size.height-g.reserve;
    expect(g.paddingTop).toBe(size.width<768?16:24);
    if(g.enabled){expect(g.stageHeight).toBeGreaterThanOrEqual(g.contentHeight);expect(g.stageHeight-g.contentHeight).toBeLessThan(12);expect(g.distance).toBeCloseTo(Math.max(1.2*H,Math.min(.015*g.count*H,2.4*H)),0);}
    else{expect(g.contentHeight).toBeGreaterThan(H);expect(g.distance).toBe(0);expect(g.stageHeight).toBeCloseTo(g.contentHeight,1);}
    const style=await page.locator('#home-introduction h2').evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),weight:getComputedStyle(el).fontWeight,align:getComputedStyle(el).textAlign,color:getComputedStyle(el).color}));
    expect(style.weight).toBe('900');expect(style.align).toBe('center');expect(style.color).toBe('rgb(29, 29, 31)');
    expect(style.size).toBeCloseTo(size.width<768?Math.max(28,Math.min(size.width*.088,40)):size.width<1024?Math.max(40,Math.min(size.width*.064,62)):Math.max(46,Math.min(size.width*.051,76)),1);
    const typography=await page.locator('#home-introduction h2').evaluate(el=>{
      const s=getComputedStyle(el),root=getComputedStyle(el.closest('section')!),hero=getComputedStyle(document.querySelector('[data-section=hero] h1')!);
      return{family:s.fontFamily,heroFamily:hero.fontFamily,synthesis:root.fontSynthesis,lineHeight:parseFloat(s.lineHeight)/parseFloat(s.fontSize),spacing:parseFloat(s.letterSpacing)/parseFloat(s.fontSize),background:root.backgroundColor,
        serif:Array.from(el.querySelectorAll('em')).map(em=>{const s=getComputedStyle(em);return{text:em.textContent,family:s.fontFamily,size:parseFloat(s.fontSize),weight:s.fontWeight,style:s.fontStyle,spacing:parseFloat(s.letterSpacing)/parseFloat(s.fontSize)};}),
        ring:{path:el.querySelector('svg path')!.getAttribute('d'),heroPath:document.querySelector('[data-section=hero] svg path')!.getAttribute('d'),hidden:el.querySelector('svg')!.getAttribute('aria-hidden'),focusable:el.querySelector('svg')!.getAttribute('focusable'),pointer:getComputedStyle(el.querySelector('svg')!).pointerEvents,animations:el.querySelector('svg path')!.getAnimations().length}};
    });
    expect(typography.family).toMatch(/epilogue/i);expect(typography.heroFamily).toMatch(/chillax/i);expect(typography.synthesis).toBe('none');expect(typography.background).toBe('rgb(255, 255, 255)');
    expect(typography.lineHeight).toBeCloseTo(size.width<768?1.04:.98,2);expect(typography.spacing).toBeCloseTo(size.width<768?-.045:-.05,3);
    expect(typography.serif.map(em=>em.text)).toEqual(['stand out','cutting edge']);
    for(const em of typography.serif){expect(em.family).toMatch(/instrument/i);expect(em.weight).toBe('400');expect(em.style).toBe('italic');expect(em.size).toBeCloseTo(style.size*1.16,2);expect(em.spacing).toBeCloseTo(-.025,3);}
    expect(typography.ring.path).toBe('M380 14C302 0 121 5 43 29C-13 49-8 88 72 108C169 132 333 119 383 83C432 50 360 9 246 9M112 111C174 125 282 124 333 112');expect(typography.ring.hidden).toBe('true');expect(typography.ring.focusable).toBe('false');expect(typography.ring.pointer).toBe('none');expect(typography.ring.animations).toBe(0);
    expect(await page.locator('[data-intro-content]').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('[data-capability-marquee]')!.getBoundingClientRect().bottom)).toBe(g.paddingTop);
    await scroll(page,g.top-size.height*.65);await page.screenshot({path:info.outputPath('connection.png')});
    let middle:number[]=[];
    for(const progress of [0,.1,.25,.5,.75,.9,1]) {
      await scroll(page,progress===0?Math.floor(g.start):g.start+(g.enabled?g.distance:Math.max(0,g.contentHeight-H))*progress);
      const opacities=await opacity(page);
      expect(await page.locator('[data-intro-lead]').evaluateAll(items=>items.every(item=>getComputedStyle(item).opacity==='1'))).toBe(true);
      if(progress===0)expect(opacities.every(value=>value===(g.enabled?.22:1))).toBe(true);
      if(progress===1)expect(opacities.every(value=>value===1)).toBe(true);
      for(let index=1;index<opacities.length;index++)expect(opacities[index]).toBeLessThanOrEqual(opacities[index-1]);
      if(progress===.5){middle=opacities;if(g.enabled)expect(opacities.some(value=>value>.22&&value<1)).toBe(true);}
      const bounds=await page.locator('[data-intro-content]').boundingBox();
      if(g.enabled){expect(Math.abs(bounds!.y-g.reserve)).toBeLessThanOrEqual(1);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);expect(await page.locator('[data-intro-ring]').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('[data-header-top]')!.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(11);}
      expect(bounds!.x).toBeGreaterThanOrEqual(size.width<768?24:48);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(size.width-(size.width<768?24:48));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      expect(await page.locator('[data-intro-ring]').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})).toBe(true);
      expect(await page.locator('[data-intro-letter]').evaluateAll(items=>items.every(item=>getComputedStyle(item).transform==='none'&&getComputedStyle(item).filter==='none'))).toBe(true);
      if([0,.5,1].includes(progress))await page.screenshot({path:info.outputPath(progress===0?'start.png':progress===1?'end.png':'middle.png')});
    }
    await scroll(page,g.start+g.distance*.5);expectSameOpacity(await opacity(page),middle);
    await page.waitForTimeout(200);expectSameOpacity(await opacity(page),middle);
    await page.locator('[data-menu-toggle]').click();await expect(page.getByRole('dialog',{name:'Navigation'})).toBeVisible();
    await page.keyboard.press('Escape');await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');
    expectSameOpacity(await opacity(page),middle);
    const work=page.locator('[data-header-action=work]:visible');
    if(await work.count())await work.first().click();
    else{await page.locator('[data-menu-toggle]').click();await page.locator('[data-menu-panel]').getByRole('link',{name:'Work',exact:true}).click();}
    await expect(page.locator('[data-work-card]')).toHaveCount(10);await page.goBack();
    if(g.enabled)await expect(intro(page)).toHaveAttribute('data-reading-enhanced','true');
    else await expect(intro(page)).not.toHaveAttribute('data-reading-enhanced');
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(g.start+g.distance*.5,-1);
    await scroll(page,g.start+g.distance*.6);const y=await page.evaluate(()=>scrollY);
    await page.reload();await page.evaluate(()=>document.fonts.ready);
    if(g.enabled)await expect(intro(page)).toHaveAttribute('data-reading-enhanced','true');
    else await expect(intro(page)).not.toHaveAttribute('data-reading-enhanced');
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,-1);
    // Verify the sticky exit against the actual, adjacent projects section.
    expect(await page.locator('[data-section="selected-projects"]').evaluate(el=>el.previousElementSibling?.id)).toBe('home-introduction');
    expect(await page.locator('[data-section="selected-projects"]').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('#home-introduction')!.getBoundingClientRect().bottom)).toBeCloseTo(0,1);
    await scroll(page,g.start+g.distance+100);expect((await page.locator('[data-intro-stage]').boundingBox())!.y).toBeLessThan(g.reserve-50);
    expect((await opacity(page)).every(value=>value===1)).toBe(true);
  });
  test(`S01 natural fallbacks and text enlargement ${size.width}x${size.height}`,async({browser,baseURL},info)=>{
    const context=await browser.newContext({viewport:size,javaScriptEnabled:false});const page=await context.newPage();
    try{
      await page.goto(baseURL!);await page.evaluate(()=>document.fonts.ready);
      await expect(page.getByRole('region',{name:introduction,exact:true})).toHaveCount(1);
      await expect(page.getByRole('heading',{name:introduction})).toHaveCount(1);expect((await opacity(page)).every(value=>value===1)).toBe(true);
      await expect(intro(page)).not.toHaveAttribute('data-reading-enhanced');await expect(page.locator('[data-marquee-clone]')).toHaveCount(0);
      await expect(page.locator('[data-marquee-toggle]')).toBeHidden();
      expect(await page.locator('[data-marquee-viewport]').evaluate(el=>{el.scrollLeft=el.scrollWidth;return el.scrollLeft>0;})).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      await intro(page).screenshot({path:info.outputPath('no-js.png')});
    }finally{await context.close();}
    const reduced=await browser.newContext({viewport:size,reducedMotion:'reduce'});const motionPage=await reduced.newPage();
    try{
      await motionPage.goto(baseURL!);await motionPage.evaluate(()=>document.fonts.ready);await expect(intro(motionPage)).not.toHaveAttribute('data-reading-enhanced');
      expect((await opacity(motionPage)).every(value=>value===1)).toBe(true);
      await scroll(motionPage,(await geometry(motionPage)).top-size.height*.6);await motionPage.screenshot({path:info.outputPath('reduced-motion.png')});
      await scroll(motionPage,0);
      await motionPage.emulateMedia({reducedMotion:'no-preference'});
      if((await geometry(motionPage)).contentHeight<=size.height-(await geometry(motionPage)).reserve)await expect(intro(motionPage)).toHaveAttribute('data-reading-enhanced','true');
      await motionPage.locator('#home-introduction h2').evaluate(el=>{(el as HTMLElement).style.fontSize=`${parseFloat(getComputedStyle(el).fontSize)*2}px`;});
      await motionPage.waitForTimeout(100);
      const fits=await intro(motionPage).evaluate(el=>{const content=el.querySelector('[data-intro-content]')!;const reserve=document.querySelector('[data-header-top]')!.getBoundingClientRect().bottom+12+Math.max(0,content.getBoundingClientRect().top-el.querySelector('[data-intro-ring]')!.getBoundingClientRect().top);return content.getBoundingClientRect().height<=innerHeight-reserve;});
      if(!fits){await expect(intro(motionPage)).not.toHaveAttribute('data-reading-enhanced');expect((await opacity(motionPage)).every(value=>value===1)).toBe(true);}
      if(fits)await expect(intro(motionPage)).toHaveAttribute('data-reading-enhanced','true');
      if(!fits)expect(await intro(motionPage).evaluate(el=>{const s=getComputedStyle(el),h=el.getBoundingClientRect().height,c=el.querySelector('[data-intro-content]')!.getBoundingClientRect().height;return Math.abs(h-c-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom))<1;})).toBe(true);
      expect(await motionPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      await intro(motionPage).screenshot({path:info.outputPath('text-200.png')});
      await motionPage.emulateMedia({reducedMotion:'reduce'});await expect(intro(motionPage)).not.toHaveAttribute('data-reading-enhanced');expect((await opacity(motionPage)).every(value=>value===1)).toBe(true);
    }finally{await reduced.close();}
  });
}

test('S01 marquee seam, 24px/s, pause, keyboard, touch and offscreen resume',async({page,browser,baseURL})=>{
  await ready(page);const g=await geometry(page);await scroll(page,g.top-300);
  await expect(marquee(page)).toHaveAttribute('data-marquee-running','true');
  const state=()=>page.locator('[data-marquee-track]').evaluate(el=>{const a=el.getAnimations()[0];return{time:Number(a.currentTime),duration:Number(a.effect!.getTiming().duration),width:el.querySelector('[data-marquee-group]')!.getBoundingClientRect().width,x:new DOMMatrix(getComputedStyle(el).transform).m41};});
  const a=await state();await page.waitForTimeout(300);const b=await state();expect(-(b.x-a.x)/((b.time-a.time)/1000)).toBeCloseTo(24,1);expect(b.duration).toBeCloseTo(b.width/24*1000,3);
  expect(await page.locator('[data-marquee-group] li span').allTextContents()).toEqual([...capabilities]);await expect(page.getByRole('listitem')).toHaveCount(12);
  const seam=await page.locator('[data-marquee-track]').evaluate(el=>{const a=el.getAnimations()[0];a.pause();const duration=Number(a.effect!.getTiming().duration);a.currentTime=duration-10;const group=el.querySelector('[data-marquee-group]')!,clone=el.querySelector('[data-marquee-clone]')!;const gap=clone.firstElementChild!.getBoundingClientRect().x-group.lastElementChild!.getBoundingClientRect().right;const x=clone.getBoundingClientRect().x;a.currentTime=duration+10;return{gap,delta:group.getBoundingClientRect().x-x,inert:clone.hasAttribute('inert')&&clone.getAttribute('aria-hidden')==='true'};});
  expect(seam.gap).toBeCloseTo(48,1);expect(seam.delta).toBeCloseTo(-.48,1);expect(seam.inert).toBe(true);
  const button=page.locator('[data-marquee-toggle]');await button.focus();await page.keyboard.press('Space');await expect(button).toHaveAttribute('aria-label','Resume automatic capabilities scrolling');
  const paused=await state();await scroll(page,0);await scroll(page,g.top-300);expect((await state()).time).toBeCloseTo(paused.time,2);
  await page.setViewportSize(sizes[4]);await page.waitForTimeout(100);expect((await state()).x).toBeCloseTo(paused.x,0);
  await button.click();await scroll(page,0);await expect(marquee(page)).toHaveAttribute('data-marquee-running','false');const stopped=await state();await page.waitForTimeout(100);expect((await state()).time).toBe(stopped.time);
  const touch=await browser.newContext({viewport:sizes[4],hasTouch:true,isMobile:true});const touchPage=await touch.newPage();
  try{await touchPage.goto(baseURL!);const control=touchPage.locator('[data-marquee-toggle]');await control.scrollIntoViewIfNeeded();await control.tap();await expect(control).toHaveAttribute('aria-label','Resume automatic capabilities scrolling');await control.tap();await expect(control).toHaveAttribute('aria-label','Pause automatic capabilities scrolling');}finally{await touch.close();}
});

test('S01 resize, native wheel and live motion preference',async({page})=>{
  await ready(page);
  for(const size of [sizes[4],sizes[2],sizes[6],sizes[5],sizes[0]]){
    await page.setViewportSize(size);await expect.poll(async()=>{const g=await geometry(page);return g.enabled===(g.contentHeight<=g.availableHeight);}).toBe(true);const g=await geometry(page);await scroll(page,g.start+g.distance*.35);
    await page.mouse.wheel(0,80);await page.waitForTimeout(100);expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(g.start+g.distance*.35);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await expect(intro(page)).not.toHaveAttribute('data-reading-enhanced');expect((await opacity(page)).every(value=>value===1)).toBe(true);
  await scroll(page,0);await page.emulateMedia({reducedMotion:'no-preference'});await expect(intro(page)).toHaveAttribute('data-reading-enhanced','true');
});

test('S01 hidden-document controller stops and resumes from current scroll',async({page})=>{
  await ready(page);const g=await geometry(page);await scroll(page,g.start+g.distance*.3);
  const before=await opacity(page);
  // Exercise the visibility branch explicitly; this does not emulate browser tab scheduling.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await scroll(page,g.start+g.distance*.7);await page.waitForTimeout(150);
  expect(await opacity(page)).toEqual(before);
  await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(async()=>JSON.stringify(await opacity(page))).not.toBe(JSON.stringify(before));
  const resumed=await opacity(page);await page.waitForTimeout(150);expect(await opacity(page)).toEqual(resumed);
  await scroll(page,g.start+g.distance*.3);expect(await opacity(page)).toEqual(before);
});

test('S01 delayed fonts/JavaScript and initialization failure keep clear natural content',async({browser,baseURL},info)=>{
  const context=await browser.newContext({viewport:sizes[4]});let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await context.route('**/_next/static/**/*.js',async route=>{await gate;await route.continue();});await context.route('**/*.woff2',async route=>{await gate;await route.continue();});
  const page=await context.newPage();
  try{await page.goto(baseURL!,{waitUntil:'commit'});await intro(page).scrollIntoViewIfNeeded();await expect(intro(page)).not.toHaveAttribute('data-reading-enhanced');expect((await opacity(page)).every(value=>value===1)).toBe(true);
    const protocol=await context.newCDPSession(page);const capture=await protocol.send('Page.captureScreenshot');await writeFile(info.outputPath('delayed-before.png'),Buffer.from(capture.data,'base64'));await protocol.detach();
    release();await page.waitForLoadState();await page.evaluate(()=>document.fonts.ready);await expect(intro(page)).not.toHaveAttribute('data-reading-enhanced');expect((await opacity(page)).every(value=>value===1)).toBe(true);await scroll(page,0);await expect(intro(page)).toHaveAttribute('data-reading-enhanced','true');
  }finally{release();await context.close();}
  const failed=await browser.newContext({viewport:sizes[2]});const failedPage=await failed.newPage();
  const errors:string[]=[];failedPage.on('pageerror',error=>errors.push(error.message));
  // Only fail observation of reading content; shared UI and marquee retain theirs.
  await failed.addInitScript(()=>{const Native=ResizeObserver;window.ResizeObserver=class extends Native{override observe(target:Element,options?:ResizeObserverOptions){if(target.hasAttribute('data-intro-content'))throw new Error('Injected reading initialization failure');super.observe(target,options);}};});
  try{await failedPage.goto(baseURL!);await failedPage.evaluate(()=>document.fonts.ready);await expect(intro(failedPage)).not.toHaveAttribute('data-reading-enhanced');expect((await opacity(failedPage)).every(value=>value===1)).toBe(true);expect(errors).toEqual([]);}finally{await failed.close();}
});

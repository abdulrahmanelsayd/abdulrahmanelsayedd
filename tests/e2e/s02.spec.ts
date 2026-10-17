import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { homeProjectIds, getProject } from '../../src/content/projects';
import { projectStatement } from '../../src/content/home-projects';
const sizes = [{width:1366,height:600},{width:1536,height:675},{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:320,height:740},{width:844,height:390}];
const gallery = (page:Page)=>page.locator('[data-project-gallery]');
const stage = (page:Page)=>page.locator('[data-project-stage]');
async function frames(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
async function ready(page:Page){
  await page.goto('/');await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle',null,{timeout:12000});await page.evaluate(()=>document.fonts.ready);await expect(gallery(page)).toHaveAttribute('data-project-enhanced','true');
  await centerStage(page);
}
async function centerStage(page:Page){await stage(page).evaluate(el=>{const r=el.getBoundingClientRect();scrollTo(0,r.top+scrollY+r.height/2-innerHeight/2);});await frames(page);}
async function active(page:Page,index:number){
  await expect(gallery(page)).toHaveAttribute('data-project-active',String(index));
  const project=getProject(homeProjectIds[index]);
  await expect(page.locator('[data-project-info]:not([inert]) a')).toHaveAttribute('href',project.href);
  await expect(page.locator('[data-project-info]:not([inert]) h3')).toHaveText(project.name);
  await expect(page.locator('[data-project-status]')).toHaveText(`${String(index+1).padStart(2,'0')} / 04 — ${project.name}`);
  await expect(page.locator('[data-project-state=active][data-project-id]').first()).toHaveAttribute('data-project-id',project.id);
  await page.waitForTimeout(500);
}
async function mouseDrag(page:Page,fraction:number,vertical=0){
  await centerStage(page);const r=(await stage(page).boundingBox())!;
  const width=await page.locator('[data-project-card]').first().evaluate(el=>(el as HTMLElement).offsetWidth);
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
  await page.mouse.move(r.x+r.width/2+width*fraction,r.y+r.height/2+vertical,{steps:10});await page.mouse.up();
}
async function touchDrag(page:Page,cdp:CDPSession,fraction:number,vertical=0){
  await centerStage(page);const r=(await stage(page).boundingBox())!,width=await page.locator('[data-project-card]').first().evaluate(el=>(el as HTMLElement).offsetWidth);
  const x=r.x+r.width/2,y=r.y+r.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+width*fraction*i/10,y:y+vertical*i/10}]});await page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
for(const size of sizes){
  test(`S02 projects, input, intro connection and footer ${size.width}x${size.height}`,async({page,context},info)=>{
    await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
    await expect(page.locator('[data-project-statement] h2')).toHaveText(projectStatement);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);await expect(page.locator('[data-project-card]')).toHaveCount(4);
    await expect(page.locator('[data-project-copy]')).toHaveCount(4);
    expect(await page.locator('[data-project-copy]').evaluateAll(items=>items.every(el=>el.getAttribute('aria-hidden')==='true'&&el.hasAttribute('inert')&&!el.querySelector('a,button')))).toBe(true);
    expect(await page.locator('[data-project-card]').evaluateAll(items=>items.map(el=>el.getAttribute('data-project-id')))).toEqual([...homeProjectIds]);
    expect(await stage(page).evaluate(el=>getComputedStyle(el).touchAction)).toBe('pan-y');
    await active(page,0);await page.screenshot({path:info.outputPath('gallery.png')});
    for(let index=1;index<=4;index++){await page.getByRole('button',{name:'Next project',exact:true}).click();await active(page,index%4);}
    await page.getByRole('button',{name:'Previous project',exact:true}).focus();await page.keyboard.press('Space');await active(page,3);
    await page.getByRole('button',{name:'Next project',exact:true}).focus();await page.keyboard.press('Enter');await active(page,0);
    await stage(page).focus();await page.keyboard.press('End');await active(page,3);await page.keyboard.press('Home');await active(page,0);
    await page.keyboard.press('ArrowLeft');await active(page,3);await page.keyboard.press('ArrowRight');await active(page,0);
    const links=page.locator('[data-project-info]:not([inert]) a');await links.focus();await page.keyboard.press('ArrowRight');await active(page,1);
    await expect(page.locator('[data-project-info]:not([inert]) a')).toBeFocused();
    // Intercept only external navigation in the test; assert that application code permits Enter/click.
    await page.evaluate(()=>{Object.assign(window,{projectAttempts:[]});window.addEventListener('click',e=>{const a=e.target instanceof Element?e.target.closest<HTMLAnchorElement>('a'):null;if(a?.href.startsWith('https://')){(window as unknown as {projectAttempts:unknown[]}).projectAttempts.push({href:a.href,prevented:e.defaultPrevented});e.preventDefault();}});});
    await page.keyboard.press('Enter');expect(await page.evaluate(()=>(window as unknown as {projectAttempts:unknown[]}).projectAttempts)).toEqual([{href:getProject('dehaz-skincare').href,prevented:false}]);
    await page.locator('[data-project-info]:not([inert]) a').click();
    expect(await page.evaluate(()=>(window as unknown as {projectAttempts:unknown[]}).projectAttempts)).toHaveLength(2);
    await mouseDrag(page,-.1);await active(page,1);await mouseDrag(page,-.3);await active(page,2);await mouseDrag(page,.3);await active(page,1);
    await centerStage(page);await page.locator('[data-menu-toggle]').focus();await page.keyboard.press('ArrowRight');await active(page,1);
    // The real next section begins immediately after the measured sticky container.
    const g=await page.locator('#home-introduction').evaluate(el=>{const s=getComputedStyle(el),stage=el.querySelector('[data-intro-stage]')!,content=el.querySelector('[data-intro-content]')!,ring=el.querySelector('[data-intro-ring]')!;const p=parseFloat(s.paddingTop),b=parseFloat(s.paddingBottom),top=el.getBoundingClientRect().top+scrollY,reserve=parseFloat(el.style.getPropertyValue('--reading-top'));return{enabled:el.hasAttribute('data-reading-enhanced'),start:top+p-reserve,distance:el.getBoundingClientRect().height-p-b-stage.getBoundingClientRect().height,height:stage.getBoundingClientRect().height,content:content.getBoundingClientRect().height,decoration:Math.max(0,ring.getBoundingClientRect().bottom-content.getBoundingClientRect().bottom),paddingBottom:b};});
    if(g.enabled){expect(g.height).toBeCloseTo(g.content+g.decoration,1);await page.evaluate(y=>scrollTo(0,y),g.start+g.distance);await frames(page);expect(await page.locator('[data-intro-letter]').evaluateAll(items=>items.every(el=>getComputedStyle(el).opacity==='1'))).toBe(true);}
    expect(await page.locator('[data-section=selected-projects]').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('#home-introduction')!.getBoundingClientRect().bottom)).toBeCloseTo(0,1);
    const footer=page.locator('footer'),fg=await footer.evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:(el as HTMLElement).offsetHeight}));
    for(const p of [0,.25,.5,.75,1]){
      await page.evaluate(y=>scrollTo(0,y),fg.top-size.height+fg.height*p);await frames(page);
      const actual=await footer.evaluate(el=>{const curve=el.querySelector('[data-footer-curve]')!,panel=el.querySelector('[data-footer-panel]')!,travel=el.querySelector('[data-footer-travel]')!,arrow=el.querySelector('[data-footer-arrow]')!;return{curve:curve.getBoundingClientRect().height,panel:new DOMMatrix(getComputedStyle(panel).transform).m42,travel:new DOMMatrix(getComputedStyle(travel).transform).m41,arrow:new DOMMatrix(getComputedStyle(arrow).transform).a};});
      expect(actual.curve).toBeCloseTo(size.height*.1*(1-p),0);expect(actual.panel).toBeCloseTo(size.width>=721?fg.height*-.4*(1-p):0,0);
      expect(actual.travel).toBeCloseTo(size.width>=721?fg.height*-.1*(1-p):0,0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      await page.screenshot({path:info.outputPath(`footer-${p}.png`)});
    }
    await page.evaluate(y=>scrollTo(0,y),fg.top-size.height+5);await frames(page);
    await page.locator('[data-footer-magnetic]').focus();
    expect(await page.locator('[data-footer-curve]').evaluate(el=>el.getBoundingClientRect().height)).toBe(0);
    expect(await page.locator('[data-footer-magnetic]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&!el.closest('[inert]');})).toBe(true);
    expect(errors).toEqual([]);
    // Native, coarse-pointer touch input exercises the same four projects.
    const touch=await context.browser()!.newContext({viewport:size,hasTouch:true,isMobile:true});
    try{const tp=await touch.newPage();await tp.goto(test.info().project.use.baseURL!);await tp.evaluate(()=>document.fonts.ready);await expect(gallery(tp)).toHaveAttribute('data-project-enhanced','true');const cdp=await touch.newCDPSession(tp);
      for(let i=1;i<=4;i++){await touchDrag(tp,cdp,-.35);await active(tp,i%4);}
      await touchDrag(tp,cdp,-.08);await active(tp,0);await touchDrag(tp,cdp,.35);await active(tp,3);
      const before=await tp.evaluate(()=>scrollY);await touchDrag(tp,cdp,0,-130);await tp.waitForTimeout(150);expect(await tp.evaluate(()=>scrollY)).toBeGreaterThan(before+10);await active(tp,3);
      expect(await tp.locator('[data-project-cursor]').evaluate(el=>getComputedStyle(el).display)).toBe('none');await cdp.detach();
    }finally{await touch.close();}
  });
  test(`S02 natural fallback and reduced motion ${size.width}x${size.height}`,async({browser,baseURL},info)=>{
    const context=await browser.newContext({ baseURL: test.info().project.use.baseURL,viewport:size,javaScriptEnabled:false});
    try{const page=await context.newPage();await page.goto(baseURL!);await expect(gallery(page)).not.toHaveAttribute('data-project-enhanced');await expect(page.locator('[data-project-copy]')).toHaveCount(0);
      const links=page.locator('[data-project-card] a');expect(await links.evaluateAll(items=>items.map(el=>el.getAttribute('href')))).toEqual(homeProjectIds.map(id=>getProject(id).href));
      for(const link of await links.all()){await link.scrollIntoViewIfNeeded();await expect(link).toBeVisible();}
      await expect(page.locator('[data-project-next]')).toBeHidden();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      await page.locator('[data-section=selected-projects]').screenshot({path:info.outputPath('no-js-projects.png')});
    }finally{await context.close();}
    const reduced=await browser.newContext({ baseURL: test.info().project.use.baseURL,viewport:size,reducedMotion:'reduce'});
    try{const page=await reduced.newPage();await ready(page);for(let i=1;i<=4;i++){await page.getByRole('button',{name:'Next project',exact:true}).click();await active(page,i%4);}
      await centerStage(page);const before=await page.locator('[data-project-card]').first().evaluate(el=>el.style.transform),r=(await stage(page).boundingBox())!;
      await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2-90,r.y+r.height/2);
      expect(await page.locator('[data-project-card]').first().evaluate(el=>el.style.transform)).toBe(before);await page.mouse.up();await active(page,1);
      await page.locator('footer').scrollIntoViewIfNeeded();await expect(page.locator('footer')).not.toHaveAttribute('data-footer-enhanced');
      expect(await page.locator('[data-footer-panel]').evaluate(el=>getComputedStyle(el).transform)).toBe('none');expect(await page.locator('[data-project-cursor]').evaluate(el=>getComputedStyle(el).display)).toBe('none');
      await page.screenshot({path:info.outputPath('reduced-footer.png')});
    }finally{await reduced.close();}
  });
}
test('S02 rapid reversal, interrupted settling, cancellation, resize, menu and cleanup',async({page})=>{
  await ready(page);
  await page.locator('[data-project-next]').evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});await active(page,3);
  await page.locator('[data-project-next]').click();await page.waitForTimeout(60);
  const transform=await page.locator('[data-project-card]').first().evaluate(el=>el.style.transform);
  await page.locator('[data-project-previous]').evaluate(el=>(el as HTMLButtonElement).click());
  expect(await page.locator('[data-project-card]').first().evaluate(el=>el.style.transform)).toBe(transform);await active(page,3);
  await centerStage(page);await page.locator('[data-project-next]').evaluate(el=>(el as HTMLButtonElement).click());await page.waitForTimeout(80);
  const r=(await stage(page).boundingBox())!;await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
  const before=await page.locator('[data-project-card]').first().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);
  await page.mouse.move(r.x+r.width/2-8,r.y+r.height/2);await frames(page);
  const after=await page.locator('[data-project-card]').first().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);expect(Math.abs(after-before)).toBeLessThan(12);
  await stage(page).dispatchEvent('pointercancel',{pointerId:1,isPrimary:true});await page.mouse.up();await expect(gallery(page)).not.toHaveAttribute('data-project-dragging');
  await centerStage(page);await stage(page).focus();await page.keyboard.press('Home');await active(page,0);
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2-100,r.y+r.height/2);
  await page.setViewportSize(sizes[4]);await expect(gallery(page)).not.toHaveAttribute('data-project-dragging');await page.mouse.up();
  await centerStage(page);const small=(await stage(page).boundingBox())!;await page.mouse.move(195,small.y+small.height/2);await page.mouse.down();await page.mouse.move(110,small.y+small.height/2);
  await page.locator('[data-menu-toggle]').evaluate(el=>(el as HTMLButtonElement).click());await expect(page.locator('[data-page-content]')).toHaveAttribute('inert');
  await expect(gallery(page)).not.toHaveAttribute('data-project-dragging');await expect(gallery(page)).not.toHaveAttribute('data-project-cursor-visible');await page.mouse.up();await page.keyboard.press('Escape');await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');
  await page.locator('[data-project-next]').click();await active(page,1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(gallery(page)).not.toHaveAttribute('data-project-cursor-visible');
  await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('a[href="/work"]').filter({hasText:'More work'}).click();await expect(page.locator('[data-work-card]')).toHaveCount(10);await expect(gallery(page)).toHaveCount(0);
  await page.goBack();await expect(gallery(page)).toHaveAttribute('data-project-enhanced','true');await page.reload();await expect(gallery(page)).toHaveAttribute('data-project-enhanced','true');await active(page,0);
});

for(const size of [sizes[0],sizes[4],sizes[5]]){
  test(`S02 document zoom 200% keeps controls, links and footer usable ${size.width}x${size.height}`,async({page},info)=>{
    await page.setViewportSize(size);await ready(page);
    // CSS document zoom tests enlarged rendering and focus; it is distinct from browser chrome zoom.
    await page.evaluate(()=>{document.documentElement.style.zoom='2';});await frames(page);
    for(let i=1;i<=4;i++){await page.locator('[data-project-next]').click();await active(page,i%4);}
    await page.locator('[data-project-info]:not([inert]) a').focus();await expect(page.locator('[data-project-info]:not([inert]) a')).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:info.outputPath('zoom-gallery.png')});
    await page.keyboard.press('Tab');
    await page.locator('[data-footer-magnetic]').focus();expect(await page.locator('[data-footer-curve]').evaluate(el=>el.getBoundingClientRect().height)).toBe(0);
    expect(await page.locator('[data-footer-magnetic]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&!el.closest('[inert]');})).toBe(true);
    await page.screenshot({path:info.outputPath('zoom-footer.png')});
  });
}

test('S02 captured drag released outside, cursor stops, and image requests are shared',async({page})=>{
  await page.setViewportSize(sizes[4]);const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/_next/image?url=%2Fimages%2Fprojects%2F'))requests.push(r.url());});await ready(page);
  await page.waitForFunction(()=>[...document.querySelectorAll<HTMLImageElement>('[data-project-card] img[srcset]')].every(img=>img.complete&&img.naturalWidth>0));
  const r=(await stage(page).boundingBox())!,width=await page.locator('[data-project-card]').first().evaluate(el=>(el as HTMLElement).offsetWidth),x=r.x+r.width/2,y=r.y+r.height/2;
  await page.mouse.move(x,y);await expect(gallery(page)).toHaveAttribute('data-project-cursor-visible');await page.mouse.down();await page.mouse.move(x-20,y);await expect(gallery(page)).toHaveAttribute('data-project-dragging');
  expect(await stage(page).evaluate(el=>el.hasPointerCapture(1))).toBe(true);
  await page.mouse.move(x-width*.35,r.y+r.height+30,{steps:8});await expect(gallery(page)).not.toHaveAttribute('data-project-cursor-visible');await page.mouse.up();await active(page,1);
  await expect(gallery(page)).not.toHaveAttribute('data-project-dragging');expect(await stage(page).evaluate(el=>el.hasPointerCapture(1))).toBe(false);
  expect(requests).toHaveLength(4);expect(new Set(requests).size).toBe(4);
  expect(await page.locator('[data-project-card] img[srcset]').evaluateAll(items=>items.every(item=>{const img=item as HTMLImageElement;return img.loading==='lazy'&&new URL(img.currentSrc).searchParams.get('q')==='90';}))).toBe(true);
});

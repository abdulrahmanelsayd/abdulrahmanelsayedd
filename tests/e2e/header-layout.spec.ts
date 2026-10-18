import {expect, test, type Page} from "@playwright/test";
import {identity} from "../../src/content/identity";

const header=(page:Page)=>page.locator('[data-site-header]');
const toggle=(page:Page)=>page.locator('[data-menu-toggle]');
const logo=(page:Page)=>header(page).getByRole('link',{name:`${identity.name} — Home`,exact:true});
async function idle(page:Page){await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase','idle');}
async function composition(page:Page){
  await expect(logo(page)).toBeVisible(); await expect(toggle(page)).toBeVisible();
  const bounds=await header(page).evaluate(element=>{
    const menu=element.querySelector<HTMLElement>('[data-menu-toggle]')!, brand=element.querySelector<HTMLElement>('[data-brand-interactive]')!;
    const signature=brand.querySelector<SVGSVGElement>('[data-brand-logo]')!, m=menu.getBoundingClientRect(), b=brand.getBoundingClientRect(), s=signature.getBoundingClientRect();
    return {menu:m.toJSON(),brand:b.toJSON(),signature:s.toJSON(),width:document.documentElement.clientWidth,hidden:brand.inert,
      headerLinks:[...element.querySelectorAll<HTMLAnchorElement>('[data-header-top] a')].map(link=>link.getAttribute('href')),
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};
  });
  expect(bounds.headerLinks).toEqual(['/']); expect(bounds.hidden).toBe(false);
  expect(bounds.menu.height).toBeGreaterThanOrEqual(44); expect(bounds.menu.width).toBeGreaterThanOrEqual(44);
  expect(bounds.brand.height).toBeGreaterThanOrEqual(44); expect(bounds.brand.width).toBeGreaterThanOrEqual(44);
  expect(bounds.menu.right).toBeLessThan(bounds.brand.left);
  expect(bounds.menu.left).toBeGreaterThanOrEqual(0); expect(bounds.brand.right).toBeLessThanOrEqual(bounds.width);
  expect(bounds.signature.width).toBeGreaterThanOrEqual(80); expect(bounds.overflow).toBe(false);
  return bounds;
}

for(const route of ['/','/work','/services','/contact','/about','/header-layout-not-found']){
  test(`shared left Menu and right logo remain usable on ${route}`,async({page},info)=>{
    const response=await page.goto(route);expect(response?.status()).toBe(route==='/header-layout-not-found'?404:200);await idle(page);
    const before=await composition(page);
    const scrollable=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight>50);
    await page.evaluate(()=>window.scrollTo(0,Math.min(650,document.documentElement.scrollHeight-innerHeight)));
    await expect(header(page)).toHaveAttribute('data-scrolled',String(scrollable));
    const scrolled=await composition(page);
    expect(Math.abs(scrolled.brand.left-before.brand.left)).toBeLessThanOrEqual(.75);
    expect(Math.abs(scrolled.menu.left-before.menu.left)).toBeLessThanOrEqual(.75);
    await toggle(page).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog',{name:'Navigation',exact:true})).toBeVisible();
    await expect(page.locator('[data-page-content]')).toHaveAttribute('inert','');
    await expect(page.locator('[data-menu-panel] nav[aria-label="Explore"] a')).toHaveCount(5);
    const motion=await page.locator('[data-menu-panel]').evaluate(element=>({duration:getComputedStyle(element).transitionDuration,delay:getComputedStyle(element).transitionDelay}));
    expect(motion.duration.split(',')[0].trim()).toBe('0.9s');expect(motion.delay.split(',')[0].trim()).toBe('0.3s');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog',{name:'Navigation',exact:true})).toHaveCount(0);await expect(toggle(page)).toBeFocused();
    await composition(page);
    await info.attach('header-layout',{body:JSON.stringify({route,before,scrolled,motion}),contentType:'application/json'});
  });
}

test('logo stays readable and controls do not overlap at narrow, tablet and wide widths',async({page})=>{
  await page.goto('/work');await idle(page);
  for(const width of [195,280,320,390,639,640,767,768,991,992,1440,1920]){
    await page.setViewportSize({width,height:900});
    await expect.poll(async()=>{const a=await logo(page).boundingBox(),b=await toggle(page).boundingBox();return !!a&&!!b&&b.x+b.width<a.x;}).toBe(true);
    await composition(page);
  }
});

test('the logo navigates Home through the existing curtain and reduced motion keeps navigation usable',async({page})=>{
  await page.goto('/services');await idle(page);await logo(page).click();
  await expect(page.locator('main')).toHaveAttribute('data-route','/');await idle(page);await composition(page);
  await page.emulateMedia({reducedMotion:'reduce'});await toggle(page).click();
  await expect(page.getByRole('dialog',{name:'Navigation',exact:true})).toBeVisible();
  await page.locator('[data-menu-panel] nav[aria-label="Explore"]').getByRole('link',{name:'Contact',exact:true}).click();
  await expect(page.locator('main')).toHaveAttribute('data-route','/contact');await idle(page);await composition(page);
  await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert');
});

test('native held logo activation survives the closing width transition',async({page},info)=>{
  await page.goto('/work');await idle(page);await toggle(page).click();
  await page.waitForTimeout(1500);await page.keyboard.press('Escape');await page.waitForTimeout(120);
  const a=(await logo(page).boundingBox())!,x=a.x+a.width/2,y=a.y+a.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(350);
  const b=(await logo(page).boundingBox())!;await page.mouse.up();
  await info.attach('held-logo-position',{body:JSON.stringify({before:a,held:b}),contentType:'application/json'});
  expect(Math.abs(a.x-b.x)).toBeLessThanOrEqual(.75);expect(Math.abs(a.y-b.y)).toBeLessThanOrEqual(.75);
  await expect(page.locator('main')).toHaveAttribute('data-route','/');await idle(page);await composition(page);
});

test('tablet retains the existing inside Contact action when the portrait card is hidden',async({page})=>{
  await page.setViewportSize({width:768,height:1024});await page.goto('/work');await idle(page);await toggle(page).click();
  await page.locator('[data-menu-panel] a[href="/contact"]:visible').click();
  await expect(page.locator('main')).toHaveAttribute('data-route','/contact');await idle(page);
});

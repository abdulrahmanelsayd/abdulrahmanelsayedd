import {test,expect} from "@playwright/test";

test("Home prepares its offscreen controllers before revealing and unlocking", async ({page}, info) => {
  await page.addInitScript(() => {
    const phases: unknown[] = [];
    Object.assign(window, {entryLayoutPhases: phases});
    new MutationObserver(() => {
      const root = document.documentElement;
      if (!root) return;
      phases.push({entry:root.dataset.homeEntry, transition:root.dataset.pageTransition,
        gallery:document.querySelector<HTMLElement>('[data-project-gallery]')?.dataset.projectEnhanced});
    }).observe(document, {subtree:true,attributes:true,attributeFilter:['data-home-entry','data-page-transition']});
  });
  await page.goto("/");
  await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase','idle');
  const state = await page.evaluate(() => ({
    phases:(window as Window & {entryLayoutPhases?:unknown[]}).entryLayoutPhases,
    root:document.documentElement.dataset.homeEntry,
    deferred:[...document.querySelectorAll('[data-home-deferred]')].map(element => getComputedStyle(element).contentVisibility),
    marks:performance.getEntriesByType('mark').filter(mark => /home-entry:layout|tr03:reveal-start/.test(mark.name)).map(mark => ({name:mark.name,time:mark.startTime})),
    fonts:JSON.parse(document.querySelector<HTMLElement>('[data-entry-fonts]')!.dataset.entryFonts!).map((font:string) => document.fonts.check(font)),
  }));
  await info.attach('entry-layout-state',{body:JSON.stringify(state),contentType:'application/json'});
  expect(state.root).toBeUndefined(); expect(state.deferred).toHaveLength(4);
  expect(state.deferred).not.toContain('hidden'); expect(state.fonts).toEqual([true,true]);
  const ready = state.marks.find(mark=>mark.name==='home-entry:layout-ready')!;
  const reveal = state.marks.find(mark=>mark.name==='tr03:reveal-start')!;
  expect(ready.time).toBeLessThanOrEqual(reveal.time);
  expect(state.phases).toEqual(expect.arrayContaining([expect.objectContaining({entry:'pending'}),expect.objectContaining({entry:'preparing',gallery:'true'})]));
  await expect(page.locator('[data-capability-marquee]')).toHaveAttribute('data-marquee-enhanced','true');
  await expect(page.locator('[data-section="introduction-reading"]')).toHaveAttribute('data-reading-enhanced','true');
  await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-enhanced','true');
  await page.locator('[data-project-stage]').scrollIntoViewIfNeeded();
  await page.locator('[data-project-next]').click();
  await expect(page.locator('[data-project-gallery]')).toHaveAttribute('data-project-active','1');
});

test("Escape releases deferred Home content and its controls", async ({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-home-entry','pending');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-page-curtain]')).toHaveAttribute('data-phase','idle');
  await expect(page.locator('html')).not.toHaveAttribute('data-home-entry');
  await expect(page.locator('[data-project-next]')).toBeEnabled();
  const content = await page.locator('[data-home-deferred]').evaluateAll(elements => elements.map(element => getComputedStyle(element).contentVisibility));
  expect(content).not.toContain('hidden');
  await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
  await expect(page.getByRole('button',{name:'Close navigation menu',exact:true})).toBeVisible();
});

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'test-results/load-diagnostic';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const samples = [];
try {
  for (const motion of ['no-preference', 'reduce', 'no-preference', 'reduce']) {
    const index = samples.length + 1;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, reducedMotion: motion });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.loadReview = { lcp: [], shifts: [], tasks: [] };
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        window.loadReview.lcp.push({ start: entry.startTime, load: entry.loadTime, render: entry.renderTime, url: entry.url, size: entry.size, phase: document.querySelector('[data-page-curtain]')?.dataset.phase });
      })).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) window.loadReview.shifts.push({ start: entry.startTime, value: entry.value });
      })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        window.loadReview.tasks.push({ start: entry.startTime, duration: entry.duration, name: entry.name });
      })).observe({ type: 'longtask', buffered: true });
    });
    await browser.startTracing(page, { screenshots: true, categories: ['devtools.timeline', 'blink.user_timing', 'toplevel', 'disabled-by-default-devtools.timeline.stack'] });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://abdulrahmanelsayed.xyz/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('[data-page-curtain]')?.getAttribute('data-phase') === 'idle' && !document.documentElement.hasAttribute('data-page-entry'), { timeout: 25000 });
    await page.waitForTimeout(800);
    const result = await page.evaluate(() => ({
      ...window.loadReview,
      paints: performance.getEntriesByType('paint').map(entry => ({ name: entry.name, start: entry.startTime })),
      marks: performance.getEntriesByType('mark').map(entry => ({ name: entry.name, start: entry.startTime })),
      resources: performance.getEntriesByType('resource').filter(entry => entry.initiatorType === 'img' || entry.name.includes('.css') || entry.name.includes('.woff2')).map(entry => ({ name: entry.name, start: entry.startTime, end: entry.responseEnd, transfer: entry.transferSize, encoded: entry.encodedBodySize })),
    }));
    const trace = await browser.stopTracing();
    await writeFile(`${output}/${index}-${motion}.trace.json`, trace);
    const events = JSON.parse(trace).traceEvents;
    const layouts = events.filter(event => ['Layout', 'UpdateLayoutTree'].includes(event.name) && event.dur).map(event => ({ name: event.name, duration: event.dur / 1000, args: event.args }));
    const summary = { index, motion, errors, ...result, layoutCount: layouts.length, layoutTotalMs: layouts.reduce((sum, event) => sum + event.duration, 0), largestLayouts: layouts.sort((a,b) => b.duration - a.duration).slice(0,8) };
    samples.push(summary);
    await writeFile(`${output}/result.json`, JSON.stringify(samples,null,2));
    console.log(JSON.stringify(summary));
    await context.close();
  }
} finally { await browser.close(); }

import {chromium} from 'playwright';
import {writeFile, mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const origin='https://abdulrahmanelsayed.xyz';
const output=process.env.PERF_OUTPUT || path.resolve('test-results/published-performance');
await mkdir(output,{recursive:true});
const samples=[], routes=['/','/work','/services','/contact','/about'];
const browser=await chromium.launch({headless:true});
const sessionCLS=entries=>{
  let maximum=0, sum=0, first=-Infinity, previous=-Infinity;
  for(const entry of entries){
    if(entry.start-previous>=1000 || entry.start-first>=5000){sum=0;first=entry.start;}
    sum+=entry.value;previous=entry.start;maximum=Math.max(maximum,sum);
  }
  return maximum;
};
const report=()=>({origin,observedAt:new Date().toISOString(),browser:browser.version(),host:{platform:process.platform,architecture:process.arch,cpus:os.cpus().length,memoryBytes:os.totalmem(),freeBytes:os.freemem()},
 method:{rounds:5,routes,viewport:'390x844',dpr:1.75,cpu:4,latencyMs:150,downloadBytesPerSecond:200000,cache:'Disabled, fresh context each sample; provider image cache retained',observers:'Native buffered LCP, layout shifts, Event Timing and Long Tasks; no traces, geometry probes or font waits during scoring',cls:'Maximum session window: less than 1s between shifts, less than 5s per window; recent-input shifts excluded',scope:'Controlled synthetic mobile lab, never physical-device or field INP acceptance'},samples});
try{
 for(let round=0;round<5;round++) for(const route of round%2?[...routes].reverse():routes){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.75,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[],warnings=[],failed=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['warning','warn','error'].includes(message.type()))warnings.push(message.text());});
  page.on('requestfailed',request=>failed.push({url:request.url(),error:request.failure()?.errorText}));
  try{
   await page.addInitScript(()=>{
    const state=window.__lab={lcp:[],shifts:[],events:[],tasks:[]};
    new PerformanceObserver(list=>list.getEntries().forEach(entry=>state.lcp.push({start:entry.startTime,url:entry.url,load:entry.loadTime,render:entry.renderTime}))).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list=>list.getEntries().forEach(entry=>{if(!entry.hadRecentInput)state.shifts.push({start:entry.startTime,value:entry.value});})).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(list=>list.getEntries().forEach(entry=>{if(entry.interactionId)state.events.push({name:entry.name,start:entry.startTime,duration:entry.duration,processingStart:entry.processingStart,processingEnd:entry.processingEnd,id:entry.interactionId});})).observe({type:'event',buffered:true,durationThreshold:16});
    new PerformanceObserver(list=>list.getEntries().forEach(entry=>state.tasks.push({start:entry.startTime,duration:entry.duration}))).observe({type:'longtask',buffered:true});
   });
   const cdp=await context.newCDPSession(page);
   await cdp.send('Log.enable');cdp.on('Log.entryAdded',({entry})=>{if(['warning','error'].includes(entry.level))warnings.push(entry.text);});
   await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.goto(origin+route,{waitUntil:'load',timeout:45000});
   await page.waitForFunction(()=>document.querySelector('[data-page-curtain]')?.getAttribute('data-phase')==='idle'&&!document.querySelector('[data-transition-shell]')?.hasAttribute('inert'),null,{timeout:20000});
   await page.locator('[data-menu-toggle]').click();await page.locator('[data-menu-toggle][aria-expanded=true]').waitFor();
   await page.waitForTimeout(800);await page.keyboard.press('Escape');await page.locator('[data-menu-toggle][aria-expanded=false]').waitFor();
   await page.waitForTimeout(800);
   const footer=page.getByRole('navigation',{name:'Footer navigation',exact:true}).getByRole('link',{name:'Home',exact:true});
   await footer.scrollIntoViewIfNeeded();await footer.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
   await page.waitForTimeout(400);
   const raw=await page.evaluate(()=>{
    const nav=performance.getEntriesByType('navigation')[0];
    return {...window.__lab,outcome:document.documentElement.dataset.transitionOutcome,marks:performance.getEntriesByType('mark').map(entry=>({name:entry.name,start:entry.startTime})),
     navigation:{request:nav.requestStart,response:nav.responseStart,end:nav.responseEnd,transfer:nav.transferSize},resources:performance.getEntriesByType('resource').map(entry=>({url:entry.name,start:entry.startTime,end:entry.responseEnd,encoded:entry.encodedBodySize,transfer:entry.transferSize}))};
   });
   const sample={round,route,observedAt:new Date().toISOString(),lcpMs:raw.lcp.at(-1)?.start,cls:sessionCLS(raw.shifts),maxInteraction:Math.max(0,...raw.events.map(entry=>entry.duration)),errors,warnings,failed,raw};
   samples.push(sample);console.log(JSON.stringify({round,route,lcp:sample.lcpMs,cls:sample.cls,maxInteraction:sample.maxInteraction,outcome:raw.outcome,errors,warnings}));
  }catch(error){samples.push({round,route,error:String(error),errors,warnings,failed});console.log(JSON.stringify(samples.at(-1)));}
  finally{await context.close();await writeFile(path.join(output,'all-samples.json'),JSON.stringify(report(),null,2));}
 }
}finally{await browser.close();}
const summaries=routes.map(route=>{
 const rows=samples.filter(sample=>sample.route===route), lcps=rows.map(row=>row.lcpMs).filter(Number.isFinite).sort((a,b)=>a-b);
 return {route,count:rows.length,medianLCP:lcps.length===5?lcps[2]:null,maxLCP:Math.max(...lcps),maxCLS:Math.max(...rows.map(row=>row.cls??Infinity)),maxInteraction:Math.max(...rows.map(row=>row.maxInteraction??Infinity)),errors:rows.filter(row=>row.error||row.errors.length||row.failed.length),warnings:rows.flatMap(row=>row.warnings)};
});
await writeFile(path.join(output,'summary.json'),JSON.stringify({scope:'Synthetic lab only; all prior Windows samples remain valid observations',summaries},null,2));
console.log(JSON.stringify(summaries,null,2));
if(summaries.some(row=>row.count!==5||!Number.isFinite(row.medianLCP)||row.medianLCP>2500||row.maxCLS>.05||row.maxInteraction>200||row.errors.length||row.warnings.length))process.exitCode=1;

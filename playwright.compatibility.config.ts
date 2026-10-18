import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  projects: (["firefox","webkit"] as const).flatMap(browserName => [
    {name:browserName+"-desktop",testMatch:["compatibility.spec.ts","entry-paint.spec.ts","hero-arrival.spec.ts"],use:{browserName,viewport:{width:1440,height:900}}},
    {name:browserName+"-mobile-viewport",testMatch:["compatibility.spec.ts","entry-paint.spec.ts","hero-arrival.spec.ts"],use:{browserName,viewport:{width:390,height:844},hasTouch:true,...(browserName==="webkit"?{isMobile:true}:{})}},
  ]),
});

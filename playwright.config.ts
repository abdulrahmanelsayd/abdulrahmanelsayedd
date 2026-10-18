import { defineConfig } from "@playwright/test";
import path from "node:path";
import { preview, output, verifyBuild } from "./tools/release-context.mjs";
const identity = await verifyBuild();
const regression = ["production","contact","about","work-page","shared-ui","motion-and-modality","navigation-portrait","sv02","sv02-c01","tr03","tr03-c01"];
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel:false, workers:1, retries:0, forbidOnly:true,
  timeout:45000, expect:{timeout:12000},
  outputDir:path.join(output,"browser"),
  reporter:[["list"],["json",{outputFile:path.join(output,"results.json")}]],
  metadata:identity,
  use:{
    baseURL:preview.origin,browserName:"chromium",viewport:{width:1440,height:900},
    trace:"retain-on-failure",screenshot:"only-on-failure",
    launchOptions:process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{},
  },
  projects:[
    {name:"desktop",testMatch:["release.spec.ts","entry-paint.spec.ts","hero-arrival.spec.ts","resource-policy.spec.ts","entry-layout.spec.ts"]},
    {name:"mobile",testMatch:["release.spec.ts","entry-paint.spec.ts","hero-arrival.spec.ts","resource-policy.spec.ts","entry-layout.spec.ts"],use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
    {name:"classic-scrollbar",testMatch:["entry-paint.spec.ts","hero-arrival.spec.ts"],use:{launchOptions:{ignoreDefaultArgs:["--hide-scrollbars"],...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})}}},
    {name:"regression",testMatch:regression.map(name=>name+".spec.ts")},
  ],
});

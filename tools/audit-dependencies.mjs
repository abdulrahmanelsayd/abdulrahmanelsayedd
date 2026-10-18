import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {reviewDependencyAudit} from "./audit-policy.ts";

if (!process.env.npm_execpath) throw new Error("Run npm run audit:dependencies");
const result=spawnSync(process.execPath,[process.env.npm_execpath,"audit","--json"],{
  cwd:new URL("..",import.meta.url),encoding:"utf8",timeout:120000,maxBuffer:5*1024*1024,
});
if (result.error) throw result.error;
if (result.status!==0 && result.status!==1) throw new Error("Audit command failed: "+result.stderr);
const report=JSON.parse(result.stdout);
console.log(JSON.stringify(report,null,2));
const lock=JSON.parse(readFileSync(new URL("../package-lock.json",import.meta.url),"utf8"));
console.log(JSON.stringify(reviewDependencyAudit(report,lock),null,2));

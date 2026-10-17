import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { root, preview, site, output, verifyBuild } from "./release-context.mjs";
const identity = await verifyBuild();
console.log("Release build: " + identity.buildId + " at " + preview.origin);
const require = createRequire(import.meta.url);
async function run(args) {
  const code = await new Promise((resolve,reject) => {
    const child = spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:"inherit",env:{...process.env,SITE_URL:site.origin,TEST_BASE_URL:preview.origin,TEST_OUTPUT_DIR:output,RELEASE_BUILD_ID:identity.buildId}});
    child.once("error",reject); child.once("exit",code=>resolve(code ?? 1));
  });
  if (code) process.exit(code);
}
await run(["--test","tests/http/metadata.test.mjs"]);
await run([require.resolve("@playwright/test/cli"),"test",...process.argv.slice(2)]);
await verifyBuild();
console.log("Release checks passed for " + identity.buildId);

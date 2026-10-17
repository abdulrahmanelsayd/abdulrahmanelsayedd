import { existsSync, realpathSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseSiteUrl } from "../src/lib/site-url.ts";
export const root = fileURLToPath(new URL("..", import.meta.url));
if (existsSync(path.join(root, ".env.local"))) process.loadEnvFile(path.join(root, ".env.local"));
export const site = parseSiteUrl(process.env.SITE_URL);
if (site.protocol !== "https:" || ["localhost","127.0.0.1","[::1]"].includes(site.hostname)) throw Error("Release metadata requires a public HTTPS SITE_URL");
export const preview = parseSiteUrl(process.env.TEST_BASE_URL || "http://127.0.0.1:3000");
if (!["localhost","127.0.0.1","[::1]"].includes(preview.hostname)) throw Error("Release checks require a local production preview");
export const output = path.resolve(root, process.env.TEST_OUTPUT_DIR || "test-results/release");
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
export async function verifyBuild() {
  const buildId = (await readFile(path.join(root, ".next/BUILD_ID"), "utf8")).trim();
  if (path.relative(root, realpathSync(path.join(root, "node_modules"))) !== "node_modules") throw Error("Linked dependencies");
  const pages = [];
  for (const [route, file] of [["/","index"],["/work","work"],["/services","services"],["/contact","contact"],["/about","about"]]) {
    const response = await fetch(new URL(route, preview), {signal:AbortSignal.timeout(15000)});
    if (response.status !== 200) throw Error("Production page failed: " + route);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== hash(await readFile(path.join(root, ".next/server/app/" + file + ".html")))) throw Error("Preview differs from this build: " + route);
    pages.push({route,sha256:hash(bytes)});
  }
  const asset = (await readFile(path.join(root, ".next/server/app/index.html"), "utf8")).match(/src="(\/_next\/static\/[^"?]+\.js)"/)?.[1];
  if (!asset) throw Error("Missing production asset");
  const response = await fetch(new URL(asset, preview));
  const bytes = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200 || hash(bytes) !== hash(await readFile(path.join(root,".next",asset.replace("/_next/",""))))) throw Error("Served JS differs from this build");
  const identity = {buildId,preview:preview.origin,site:site.origin,node:process.version,verifiedAt:new Date().toISOString(),pages,asset:{url:asset,sha256:hash(bytes)},lockSha256:hash(await readFile(path.join(root,"package-lock.json")))};
  await mkdir(output,{recursive:true});
  await writeFile(path.join(output,"build-identity.json"),JSON.stringify(identity,null,2));
  return identity;
}

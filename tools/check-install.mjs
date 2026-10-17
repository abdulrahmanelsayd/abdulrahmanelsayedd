import { createRequire } from "node:module";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
const nodeModules = await realpath(path.join(root, "node_modules"));
if (path.relative(root, nodeModules) !== "node_modules") throw new Error("Linked node_modules root");
const resolutions = [];
for (const [name, expectedVersion] of Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })) {
  const location = path.join(root, "node_modules", name);
  if (!(await lstat(location)).isDirectory()) throw new Error("Linked package: " + name);
  const resolved = await realpath(require.resolve(name.startsWith("@types/") ? name + "/package.json" : name));
  if (!resolved.startsWith(nodeModules + path.sep)) throw new Error("External resolution: " + name);
  const installed = JSON.parse(await readFile(path.join(location, "package.json"), "utf8"));
  if (installed.version !== expectedVersion) throw new Error("Unexpected version: " + name);
  if (!lock.packages["node_modules/" + name]?.integrity) throw new Error("Missing lock integrity: " + name);
  resolutions.push({ name, version: installed.version, resolved });
}
console.log(JSON.stringify({ root, node: process.version, lockfileVersion: lock.lockfileVersion, resolutions }, null, 2));


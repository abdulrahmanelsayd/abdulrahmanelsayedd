import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { projects } from "../../src/content/projects.ts";
import { portraits, siteIcons, socialPreview } from "../../src/content/assets.ts";
import { inspectAsset, type AssetMetadata } from "../support/asset-metadata.ts";

interface AssetRecord extends AssetMetadata { file: string; bytes: number; sha256: string }
const root = path.resolve(import.meta.dirname, "../..");
const manifest: { files: AssetRecord[] } = JSON.parse(await readFile(new URL("../support/asset-manifest.json", import.meta.url), "utf8"));

for (const expected of manifest.files) {
  test("asset bytes, dimensions and actual format: " + expected.file, async () => {
    const file = path.resolve(root, expected.file);
    assert.ok(file.startsWith(root + path.sep));
    assert.equal((await lstat(file)).isFile(), true);
    const bytes = await readFile(file);
    assert.equal(bytes.length, expected.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256);
    assert.deepEqual(await inspectAsset(file), {
      format: expected.format,
      ...(expected.width ? { width: expected.width, height: expected.height } : {}),
    });
  });
}

test("every project preview and portrait points to an inspected asset with matching metadata", () => {
  for (const image of [...projects.map(project => project.preview), ...Object.values(portraits)]) {
    const asset = manifest.files.find(item => item.file === "public" + image.src);
    assert.ok(asset, image.src);
    assert.equal(asset.width, image.width);
    assert.equal(asset.height, image.height);
    assert.equal(asset.format, image.format);
  }
  for (const src of [...Object.values(siteIcons), socialPreview.src]) {
    assert.ok(manifest.files.some(asset => asset.file === "public" + src), src);
  }
});

async function filesIn(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    assert.equal(item.isSymbolicLink(), false, file);
    if (item.isDirectory()) result.push(...await filesIn(file));
    else result.push(path.relative(root, file).replaceAll(path.sep, "/"));
  }
  return result;
}

test("the manifest covers exactly the copied public assets, font and license", async () => {
  const actual = [...await filesIn(path.join(root, "public")), ...await filesIn(path.join(root, "src/assets/fonts"))].sort();
  assert.deepEqual(actual, manifest.files.map(asset => asset.file).sort());
  assert.equal(new Set(manifest.files.map(asset => asset.file)).size, manifest.files.length);
});

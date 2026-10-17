import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, unlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { guardedNext } from "../../tools/next-guard.mjs";

test("ordinary build/typegen need no manifest and use the validated project", async t => {
  const project = await mkdtemp(path.join(tmpdir(), "next-clean-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  await writeFile(path.join(project, "next.config.ts"), "export default {};");
  const config = async () => ({ distDir: ".next" });
  let invocations = 0;
  const run = async (validated: { project: string; output: string }) => {
    assert.equal(validated.project, project);
    assert.equal(validated.output, path.join(project, ".next"));
    invocations++;
    return 0;
  };
  for (const command of ["build", "typegen"]) {
    assert.equal(await guardedNext({ root: project, cwd: project, args: [command] }, run, config), 0);
  }
  await mkdir(path.join(project, ".next"));
  await writeFile(path.join(project, ".next/BUILD_ID"), "ordinary-rebuild");
  assert.equal(await guardedNext({ root: project, cwd: project, args: ["build"] }, run, config), 0);
  assert.equal(invocations, 3);
});

test("local policy and redirected writes are rejected before Next is invoked", async t => {
  const fixtures = await mkdtemp(path.join(tmpdir(), "next-protected-"));
  t.after(() => rm(fixtures, { recursive: true, force: true }));
  const project = path.join(fixtures, "clean"), saved = path.join(fixtures, "saved");
  await mkdir(project); await mkdir(saved);
  await writeFile(path.join(project, "next.config.ts"), "export default {};");
  const policy = { version: 1, protectProject: true, protectedPaths: ["saved"] };
  await writeFile(path.join(fixtures, ".next-guard.local.json"), JSON.stringify(policy));
  const config = async () => ({ distDir: ".next", typescript: { tsconfigPath: "tsconfig.json" } });
  let invocations = 0, configLoads = 0;
  const run = async () => { invocations++; return 0; };
  const load = async () => { configLoads++; return config(); };
  const options = { root: project, cwd: project, args: ["build"] };
  for (const command of ["build", "typegen"]) {
    await assert.rejects(guardedNext({ root: fixtures, cwd: fixtures, args: [command] }, run, load), /Protected review project/);
    await assert.rejects(guardedNext({ root: saved, cwd: saved, args: [command] }, run, load), /Protected review output/);
    await assert.rejects(guardedNext({ ...options, args: [command, saved] }, run, load), /Project argument/);
  }
  assert.equal(configLoads, 0);
  for (const command of ["build", "typegen"]) {
    await assert.rejects(guardedNext({ ...options, args: [command] }, run, async () => ({ ...await config(), distDir: saved })), /configuration redirects/);
  }
  await symlink(saved, path.join(project, ".next"), "junction");
  for (const command of ["build", "typegen"]) {
    await assert.rejects(guardedNext({ ...options, args: [command] }, run, load), /Protected review output/);
  }
  await unlink(path.join(project, ".next"));
  await mkdir(path.join(project, ".next"));
  await symlink(saved, path.join(project, ".next/types"), "junction");
  await assert.rejects(guardedNext(options, run, load), /Linked project\/output/);
  await unlink(path.join(project, ".next/types"));
  await symlink(path.join(fixtures, "missing"), path.join(project, ".next/types"), "junction");
  await assert.rejects(guardedNext(options, run, load), /Dangling output link/);
  await unlink(path.join(project, ".next/types"));
  await symlink(saved, path.join(project, "next-env.d.ts"), "junction");
  await assert.rejects(guardedNext(options, run, load), /Linked project\/output/);
  await unlink(path.join(project, "next-env.d.ts"));
  assert.equal(invocations, 0);
  assert.equal(configLoads, 0);
  assert.equal(await guardedNext(options, run, load), 0);
  assert.equal(invocations, 1);
});

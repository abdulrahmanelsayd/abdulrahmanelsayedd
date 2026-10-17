import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { physical } from './physical-path.mjs';

const normal = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
const same = (a, b) => normal(a) === normal(b);
const inside = (file, directory) => same(file, directory) || normal(file).startsWith(normal(directory) + path.sep);
const fail = reason => { throw Error('BUILD GUARD: ' + reason); };
const policyName = '.next-guard.local.json';

// Policies belong to the local review workspace, never to the delivered source.
// Ancestor policies also protect saved runtimes nested in that workspace.
async function checkPolicy(project, outputs) {
  for (let directory = project; ; directory = path.dirname(directory)) {
    let policy, found = false;
    try { policy = JSON.parse(await readFile(path.join(directory, policyName), 'utf8')); found = true; }
    catch (error) { if (error.code !== 'ENOENT') fail('Cannot read local protection policy: ' + error.message); }
    if (found) {
      if (!policy || policy.version !== 1 || typeof policy.protectProject !== 'boolean' ||
          !Array.isArray(policy.protectedPaths) || policy.protectedPaths.some(value => typeof value !== 'string')) {
        fail('Invalid local protection policy');
      }
      if (policy.protectProject && same(project, directory)) fail('Protected review project');
      for (const value of policy.protectedPaths) {
        const protectedPath = await physical(path.resolve(directory, value));
        if ([project, ...outputs].some(value => inside(value, protectedPath))) fail('Protected review output');
      }
    }
    if (path.dirname(directory) === directory) break;
  }
}

async function noLinks(file, recursive = false) {
  if (!same(await physical(file), file)) fail('Linked project/output path: ' + file);
  let info;
  try { info = await lstat(file); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (info.isSymbolicLink()) fail('Linked project/output entry: ' + file);
  if (recursive && info.isDirectory()) {
    for (const entry of await readdir(file)) await noLinks(path.join(file, entry), true);
  }
}

async function loadProjectConfig(project) {
  const require = createRequire(path.join(project, 'package.json'));
  const configModule = require.resolve('next/dist/server/config.js');
  if (!inside(await realpath(configModule), path.join(project, 'node_modules/next'))) fail('Next must be installed in this project');
  const { PHASE_PRODUCTION_BUILD } = require('next/constants');
  // Match build and typegen's phase and .env loading in the installed Next.
  return require(configModule).default(PHASE_PRODUCTION_BUILD, project);
}

export async function validateNext({ root, cwd, args }, loadConfig = loadProjectConfig) {
  if (!['build', 'typegen'].includes(args[0])) fail('Only build/typegen are permitted');
  const projects = [];
  for (const arg of args.slice(1)) {
    if (arg === '--webpack' && args[0] === 'build') continue;
    if (arg.startsWith('-')) fail('Unapproved option: ' + arg);
    projects.push(arg);
  }
  if (projects.length > 1) fail('Ambiguous project arguments');
  const project = await realpath(root);
  if (!same(project, root) || !same(await realpath(cwd), project) || !same(cwd, project)) fail('Unexpected project/cwd alias');
  if (!same(await realpath(path.resolve(cwd, projects[0] || '.')), project)) fail('Project argument redirects Next');
  const output = path.join(project, '.next');
  await checkPolicy(project, [await physical(output)]);
  const configs = (await readdir(project)).filter(name => /^next\.config\.(js|mjs|cjs|ts|mts)$/.test(name));
  if (configs.length !== 1 || configs[0] !== 'next.config.ts') fail('Expected this project\'s next.config.ts');
  for (const name of ['next.config.ts', 'package.json', 'tsconfig.json', 'next-env.d.ts', 'tsconfig.tsbuildinfo']) {
    await noLinks(path.join(project, name));
  }
  await noLinks(path.join(project, 'src'), true);
  await noLinks(output, true);
  const config = await loadConfig(project);
  // This project's tsconfig and start command use .next; reject redirection.
  if (config.distDir !== '.next' || (config.typescript?.tsconfigPath ?? 'tsconfig.json') !== 'tsconfig.json' || config.output === 'export') {
    fail('Output/TypeScript configuration redirects project writes');
  }
  // Check again after config evaluation, before creating the Next process.
  await checkPolicy(project, [await physical(output)]);
  await noLinks(output, true);
  return { project, output, args };
}

async function runNext({ project, args }) {
  const require = createRequire(path.join(project, 'package.json'));
  const bin = require.resolve('next/dist/bin/next');
  if (!inside(await realpath(bin), path.join(project, 'node_modules/next'))) fail('Next must be installed in this project');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], { cwd: project, windowsHide: true, stdio: 'inherit', env: process.env });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
}

export async function guardedNext(options, run = runNext, loadConfig = loadProjectConfig) {
  return run(await validateNext(options, loadConfig));
}

if (process.argv[1] && same(process.argv[1], import.meta.filename)) {
  process.env.NODE_ENV ??= 'production';
  try {
    process.exitCode = await guardedNext({ root: fileURLToPath(new URL('..', import.meta.url)), cwd: process.cwd(), args: process.argv.slice(2) });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

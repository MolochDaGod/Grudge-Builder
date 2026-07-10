#!/usr/bin/env node
/**
 * Optimize + upload huge_medieval_battle_scene.glb → R2
 *
 * Source is ~493–517 MB (Maya dump). Wrangler R2 put max = 300 MiB, and raw
 * multipart often hits TLS errors — so we always gltf-transform optimize
 * (Draco + WebP) first → ~20–40 MB, then wrangler put --remote.
 *
 *   npm run upload:war-scene
 *   node scripts/upload-war-scene-to-r2.mjs [--force] [--skip-optimize]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CDN_DIR = path.join(root, 'workers', 'cdn');
const BUCKET = 'grudge-assets';
const KEY = 'models/war/huge_medieval_battle_scene.glb';
const FORCE = process.argv.includes('--force');
const SKIP_OPT = process.argv.includes('--skip-optimize');

const optimizedOut = path.join(
  root,
  'client/public/models/war/huge_medieval_battle_scene.glb',
);

const sourceCandidates = [
  process.env.WAR_SCENE_GLB,
  'D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb',
  optimizedOut,
].filter(Boolean);

const source = sourceCandidates.find((p) => fs.existsSync(p));
if (!source) {
  console.error('Missing fortress GLB. Tried:\n', sourceCandidates.join('\n'));
  process.exit(1);
}

function mb(n) {
  return (n / (1024 * 1024)).toFixed(2);
}

let uploadPath = source;
const srcSize = fs.statSync(source).size;
console.log(`Source: ${source} (${mb(srcSize)} MB)`);

// Optimize if over wrangler limit or not already the optimized public path
const needsOpt =
  !SKIP_OPT &&
  (srcSize > 280 * 1024 * 1024 || path.resolve(source) !== path.resolve(optimizedOut));

if (needsOpt) {
  fs.mkdirSync(path.dirname(optimizedOut), { recursive: true });
  // Preserve mesh/node structure (walls, PG proxies) — no join/flatten/simplify
  console.log('Optimizing (Draco + WebP, keep meshes)…');
  const opt = spawnSync(
    'npx',
    [
      '--yes',
      '@gltf-transform/cli@4.1.1',
      'optimize',
      source,
      optimizedOut,
      '--compress',
      'draco',
      '--texture-compress',
      'webp',
      '--texture-size',
      '2048',
      '--join',
      'false',
      '--flatten',
      'false',
      '--simplify',
      'false',
      '--weld',
      'false',
      '--palette',
      'false',
      '--instance',
      'false',
    ],
    { cwd: root, stdio: 'inherit', shell: true },
  );
  if (opt.status !== 0) {
    console.error('gltf-transform optimize failed');
    process.exit(opt.status || 1);
  }
  uploadPath = optimizedOut;
}

const upSize = fs.statSync(uploadPath).size;
console.log(`Upload file: ${uploadPath} (${mb(upSize)} MB)`);
if (upSize > 300 * 1024 * 1024) {
  console.error('Still over wrangler 300 MiB limit after optimize — abort.');
  process.exit(1);
}
if (upSize < 1_000_000) {
  console.error('Optimized file suspiciously small — abort.');
  process.exit(1);
}

const args = [
  'wrangler',
  'r2',
  'object',
  'put',
  `${BUCKET}/${KEY}`,
  `--file=${uploadPath}`,
  '--content-type=model/gltf-binary',
  '--remote',
];
console.log(`→ ${KEY} (remote R2)`);
const r = spawnSync('npx', args, { cwd: CDN_DIR, stdio: 'inherit', shell: true });
if (r.status !== 0) {
  console.error('wrangler upload failed', r.status);
  process.exit(r.status || 1);
}

console.log('\nDone.');
console.log('Verify: curl -sI https://assets.grudge-studio.com/models/war/huge_medieval_battle_scene.glb');
console.log('Expect Content-Length ~', upSize, 'and Content-Type model/gltf-binary');
console.log('Live: https://grudgewarlords.com/war-scene');
void FORCE;

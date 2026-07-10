#!/usr/bin/env node
/**
 * Upload huge_medieval_battle_scene.glb → R2 grudge-assets
 *
 *   node scripts/upload-war-scene-to-r2.mjs --remote
 *
 * Source (first hit wins):
 *   WAR_SCENE_GLB env
 *   D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb
 *   client/public/models/war/huge_medieval_battle_scene.glb
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CDN_DIR = path.join(root, 'workers', 'cdn');
const REMOTE = process.argv.includes('--remote');
const BUCKET = 'grudge-assets';
const KEY = 'models/war/huge_medieval_battle_scene.glb';

const candidates = [
  process.env.WAR_SCENE_GLB,
  'D:/Games/grudge-game-engine/huge_medieval_battle_scene.glb',
  path.join(root, 'client/public/models/war/huge_medieval_battle_scene.glb'),
].filter(Boolean);

const file = candidates.find((p) => fs.existsSync(p));
if (!file) {
  console.error('Missing fortress GLB. Tried:\n', candidates.join('\n'));
  process.exit(1);
}

const st = fs.statSync(file);
const mb = (st.size / (1024 * 1024)).toFixed(1);
console.log(`Source: ${file}`);
console.log(`Size:   ${mb} MB (${st.size} bytes)`);
if (st.size < 50_000_000) {
  console.error('File looks too small for the fortress scene — aborting.');
  process.exit(1);
}

const args = [
  'wrangler',
  'r2',
  'object',
  'put',
  `${BUCKET}/${KEY}`,
  `--file=${file}`,
  '--content-type=model/gltf-binary',
];
if (REMOTE) args.push('--remote');

console.log(`→ ${KEY}${REMOTE ? ' (remote R2)' : ' (local miniflare)'}`);
console.log('This can take several minutes for ~500MB…');

const r = spawnSync('npx', args, {
  cwd: CDN_DIR,
  stdio: 'inherit',
  shell: true,
  env: process.env,
  // 30 min
  timeout: 30 * 60 * 1000,
});

if (r.status !== 0) {
  console.error('Upload failed, exit', r.status);
  process.exit(r.status || 1);
}

console.log('\nDone. Verify:');
console.log(`  curl -sI https://assets.grudge-studio.com/${KEY}`);
console.log('Expect Content-Type: model/gltf-binary and Content-Length ~517e6');
console.log('Live: https://grudgewarlords.com/war-scene');

#!/usr/bin/env node
/**
 * Upload Warlords session assets (creatures / obstacles / skeletons / enemies)
 * to R2 bucket `grudge-assets` via wrangler --remote.
 *
 * Usage:
 *   node scripts/upload-session-warlords-assets-to-r2.mjs [--dry-run]
 *
 * Requires: wrangler OAuth with R2 write (or CLOUDFLARE_API_TOKEN with R2).
 * CDN: https://assets.grudge-studio.com/<key>
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CDN_DIR = path.join(ROOT, 'workers', 'cdn');
const DRY = process.argv.includes('--dry-run');

/** @type {{ local: string, key: string, contentType: string }[]} */
const ASSETS = [
  // Land creatures (open world / islands)
  { local: 'public/models/creatures/land/free_reptile.glb', key: 'models/creatures/land/free_reptile.glb', contentType: 'model/gltf-binary' },
  { local: 'public/models/creatures/land/drake.glb', key: 'models/creatures/land/drake.glb', contentType: 'model/gltf-binary' },
  { local: 'public/models/creatures/land/ifrit.glb', key: 'models/creatures/land/ifrit.glb', contentType: 'model/gltf-binary' },
  { local: 'public/models/creatures/land/lava_golem.glb', key: 'models/creatures/land/lava_golem.glb', contentType: 'model/gltf-binary' },
  { local: 'public/models/creatures/land/monsters_x_free.glb', key: 'models/creatures/land/monsters_x_free.glb', contentType: 'model/gltf-binary' },
  { local: 'public/models/creatures/land/creature_crab.glb', key: 'models/creatures/land/creature_crab.glb', contentType: 'model/gltf-binary' },

  // Traps / defenses
  { local: 'public/models/obstacles/mobile_game_obstacles.glb', key: 'models/obstacles/mobile_game_obstacles.glb', contentType: 'model/gltf-binary' },

  // Skeleton corpse residuals (prefer GLB)
  { local: 'public/models/skeletons/Skeleton.glb', key: 'models/skeletons/Skeleton.glb', contentType: 'model/gltf-binary' },
  { local: 'public/models/skeletons/Skeleton_Archer.glb', key: 'models/skeletons/Skeleton_Archer.glb', contentType: 'model/gltf-binary' },
  { local: 'public/models/skeletons/Texture.png', key: 'models/skeletons/Texture.png', contentType: 'image/png' },
  // FBX fallbacks
  { local: 'public/models/skeletons/Skeleton.fbx', key: 'models/skeletons/Skeleton.fbx', contentType: 'application/octet-stream' },
  { local: 'public/models/skeletons/Skeleton_Archer.fbx', key: 'models/skeletons/Skeleton_Archer.fbx', contentType: 'application/octet-stream' },
];

// Also mirror dungeon enemy keys if present under animator (optional second root)
const ANIMATOR_ROOT = process.env.ANIMATOR_ROOT
  || 'D:\\GitHub\\threejs-rapier-react-three-controller\\artifacts\\animator';
const ENEMY_NAMES = [
  'free_reptile.glb',
  'drake.glb',
  'ifrit.glb',
  'lava_golem.glb',
  'monsters_x_free.glb',
  'creature_crab.glb',
];
for (const name of ENEMY_NAMES) {
  const local = path.join(ANIMATOR_ROOT, 'public', 'models', 'enemies', name);
  if (fs.existsSync(local)) {
    ASSETS.push({
      local, // absolute
      key: `models/enemies/${name}`,
      contentType: 'model/gltf-binary',
      abs: true,
    });
  }
}
// Obstacles + skeletons under animator public (same keys — skip if already listed)
const EXTRA = [
  ['public/models/obstacles/mobile_game_obstacles.glb', 'models/obstacles/mobile_game_obstacles.glb'],
  ['public/models/skeletons/Skeleton.glb', 'models/skeletons/Skeleton.glb'],
  ['public/models/skeletons/Skeleton_Archer.glb', 'models/skeletons/Skeleton_Archer.glb'],
];
// (enemies are the distinct keys; others share Warlords keys)

function resolveLocal(a) {
  if (a.abs || path.isAbsolute(a.local)) return a.local;
  return path.join(ROOT, a.local);
}

function uploadOne(a) {
  const filePath = resolveLocal(a);
  if (!fs.existsSync(filePath)) {
    console.error(`✗ missing ${filePath}`);
    return false;
  }
  const size = fs.statSync(filePath).size;
  const r2Arg = `grudge-assets/${a.key}`;
  console.log(`${DRY ? '[dry] ' : ''}→ ${a.key} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
  if (DRY) return true;

  const args = [
    'wrangler',
    'r2',
    'object',
    'put',
    r2Arg,
    `--file=${filePath}`,
    `--content-type=${a.contentType}`,
    '--remote',
  ];
  const result = spawnSync('npx', args, {
    cwd: CDN_DIR,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`✗ failed ${a.key}`);
    return false;
  }
  return true;
}

let ok = 0;
let fail = 0;
const seen = new Set();
for (const a of ASSETS) {
  if (seen.has(a.key)) continue;
  seen.add(a.key);
  if (uploadOne(a)) ok++;
  else fail++;
}

console.log(`\nDone: ${ok} ok, ${fail} failed (unique keys ${seen.size})`);
console.log('CDN base: https://assets.grudge-studio.com/');
if (fail) process.exit(1);

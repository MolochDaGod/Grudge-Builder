#!/usr/bin/env node
/**
 * Upload island harvest + evil mountain assets to R2 (grudge-assets bucket).
 * Wrangler path: grudge-assets/models/… → CDN URL: /models/…
 *
 * Usage:
 *   node scripts/upload-island-resources.mjs [--remote]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '..', 'client', 'public', 'models');
const ENV_DIR = path.join(MODELS_DIR, 'environment');
const VFX_DIR = path.join(MODELS_DIR, 'vfx');
const CDN_DIR = path.join(__dirname, '..', 'workers', 'cdn');
const REMOTE = process.argv.includes('--remote');

const ASSETS = [
  ['environment/island_tree.glb', path.join(ENV_DIR, 'island_tree.glb')],
  ['environment/island_rock.glb', path.join(ENV_DIR, 'island_rock.glb')],
  ['environment/gem_cluster.glb', path.join(ENV_DIR, 'gem_cluster.glb')],
  ['environment/harvest_logs.glb', path.join(ENV_DIR, 'harvest_logs.glb')],
  ['environment/harvest_rock_debris.glb', path.join(ENV_DIR, 'harvest_rock_debris.glb')],
  ['environment/harvest_gold_rocks.glb', path.join(ENV_DIR, 'harvest_gold_rocks.glb')],
  ['environment/harvest_stump.glb', path.join(ENV_DIR, 'harvest_stump.glb')],
  ['evil_rock_mountains_triad.glb', path.join(MODELS_DIR, 'evil_rock_mountains_triad.glb')],
  ['evil_rock_mountain_peak_0.glb', path.join(MODELS_DIR, 'evil_rock_mountain_peak_0.glb')],
  ['evil_rock_mountain_peak_1.glb', path.join(MODELS_DIR, 'evil_rock_mountain_peak_1.glb')],
  ['evil_rock_mountain_peak_2.glb', path.join(MODELS_DIR, 'evil_rock_mountain_peak_2.glb')],
  ['vfx/warning_01.glb', path.join(VFX_DIR, 'warning_01.glb')],
  ['vfx/warning_02.glb', path.join(VFX_DIR, 'warning_02.glb')],
  ['vfx/warning_03.glb', path.join(VFX_DIR, 'warning_03.glb')],
];

function uploadOne(keySuffix, filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${filePath}`);
    return false;
  }
  // wrangler syntax: <bucket>/<object-key> — CDN serves object-key (models/…)
  const key = `grudge-assets/models/${keySuffix}`;
  const args = [
    'wrangler', 'r2', 'object', 'put', key,
    `--file=${filePath}`,
    '--content-type=model/gltf-binary',
  ];
  if (REMOTE) args.push('--remote');

  console.log(`Uploading ${path.basename(filePath)} → ${key}${REMOTE ? ' (remote)' : ''}...`);
  const result = spawnSync('npx', args, { cwd: CDN_DIR, stdio: 'inherit', shell: true });
  return result.status === 0;
}

let ok = true;
for (const [key, file] of ASSETS) {
  if (!uploadOne(key, file)) ok = false;
}

if (!ok) process.exit(1);
console.log('Island resource assets uploaded.');
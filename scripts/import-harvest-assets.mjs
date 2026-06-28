#!/usr/bin/env node
/**
 * Import harvest FX GLBs from local model libraries into client/public.
 *
 * Sources (override with env vars):
 *   HARVEST_LOGS_SRC      — Survival RTS Logs.glb
 *   HARVEST_DEBRIS_SRC    — Survival RTS Rocks.glb
 *   HARVEST_GOLD_SRC      — Survival RTS Gold rocks.glb
 *   HARVEST_STUMP_SRC     — Quaternius DeadTree_3.gltf (or pre-built GLB)
 *
 * Usage:
 *   node scripts/import-harvest-assets.mjs [--optimize]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'client', 'public', 'models', 'environment');

const DEFAULTS = {
  logs: 'D:/Games/Models/Survival-Combat-Engine/Survival-Combat-Engine-main/client/public/models/rts/Logs.glb',
  debris: 'D:/Games/Models/Survival-Combat-Engine/Survival-Combat-Engine-main/client/public/models/rts/Rocks.glb',
  gold: 'D:/Games/Models/Survival-Combat-Engine/Survival-Combat-Engine-main/client/public/models/rts/Gold rocks.glb',
  stump: 'D:/Games/Models/Ultimate Stylized Nature/glTF/DeadTree_3.gltf',
};

const OPTIMIZE = process.argv.includes('--optimize');

const JOBS = [
  { env: 'HARVEST_LOGS_SRC', src: DEFAULTS.logs, out: 'harvest_logs.glb', convert: false },
  { env: 'HARVEST_DEBRIS_SRC', src: DEFAULTS.debris, out: 'harvest_rock_debris.glb', convert: false },
  { env: 'HARVEST_GOLD_SRC', src: DEFAULTS.gold, out: 'harvest_gold_rocks.glb', convert: false },
  { env: 'HARVEST_STUMP_SRC', src: DEFAULTS.stump, out: 'harvest_stump.glb', convert: true },
];

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  return result.status === 0;
}

function copyOrConvert(job) {
  const src = process.env[job.env] || job.src;
  const dest = path.join(OUT_DIR, job.out);

  if (!fs.existsSync(src)) {
    console.error(`Missing source: ${src} (set ${job.env} to override)`);
    return false;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (job.convert && !src.endsWith('.glb')) {
    const tmp = path.join(OUT_DIR, `_tmp_${job.out}`);
    if (!run('npx', ['@gltf-transform/cli', 'copy', src, tmp])) return false;
    if (OPTIMIZE) {
      if (!run('npx', ['@gltf-transform/cli', 'optimize', tmp, dest, '--compress', 'meshopt'])) return false;
      fs.unlinkSync(tmp);
    } else {
      fs.renameSync(tmp, dest);
    }
  } else {
    fs.copyFileSync(src, dest);
    if (OPTIMIZE) {
      const tmp = path.join(OUT_DIR, `_opt_${job.out}`);
      if (!run('npx', ['@gltf-transform/cli', 'optimize', dest, tmp, '--compress', 'meshopt'])) return false;
      fs.renameSync(tmp, dest);
    }
  }

  const sizeKb = Math.round(fs.statSync(dest).size / 1024);
  console.log(`✓ ${job.out} (${sizeKb} KB) ← ${src}`);
  return true;
}

let ok = true;
for (const job of JOBS) {
  if (!copyOrConvert(job)) ok = false;
}

if (!ok) process.exit(1);
console.log('Harvest assets imported to client/public/models/environment/');
console.log('Upload: node scripts/upload-island-resources.mjs --remote');
#!/usr/bin/env node
/**
 * Upload evil mountain triad + per-peak GLBs to R2 (grudge-assets bucket).
 *
 * Usage:
 *   node scripts/upload-triad-to-r2.mjs [--remote]
 *
 * Requires wrangler auth (Cloudflare) in workers/cdn.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(__dirname, '..', 'client', 'public', 'models');
const CDN_DIR = path.join(__dirname, '..', 'workers', 'cdn');
const REMOTE = process.argv.includes('--remote');

const ASSETS = [
  'evil_rock_mountains_triad.glb',
  'evil_rock_mountain_peak_0.glb',
  'evil_rock_mountain_peak_1.glb',
  'evil_rock_mountain_peak_2.glb',
];

function uploadOne(filename) {
  const filePath = path.join(MODELS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${filePath}`);
    return false;
  }
  const key = `grudge-assets/models/${filename}`;
  const args = [
    'wrangler', 'r2', 'object', 'put', key,
    `--file=${filePath}`,
    '--content-type=model/gltf-binary',
  ];
  if (REMOTE) args.push('--remote');

  console.log(`Uploading ${filename} → ${key}${REMOTE ? ' (remote)' : ''}...`);
  const result = spawnSync('npx', args, { cwd: CDN_DIR, stdio: 'inherit', shell: true });
  return result.status === 0;
}

let ok = true;
for (const name of ASSETS) {
  if (!uploadOne(name)) ok = false;
}

if (!ok) process.exit(1);
console.log('All triad assets uploaded.');
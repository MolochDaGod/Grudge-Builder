#!/usr/bin/env node
/**
 * Upload COTW wildlife GLBs to R2.
 * Usage: node scripts/upload-cotw-creatures.mjs [--remote]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COTW_DIR = path.join(__dirname, '..', 'client', 'public', 'models', 'creatures', 'land', 'cotw');
const CDN_DIR = path.join(__dirname, '..', 'workers', 'cdn');
const REMOTE = process.argv.includes('--remote');

if (!fs.existsSync(COTW_DIR)) {
  console.error('Missing COTW dir:', COTW_DIR);
  process.exit(1);
}

const files = fs.readdirSync(COTW_DIR).filter((f) => f.endsWith('.glb'));
let ok = true;

for (const filename of files) {
  const filePath = path.join(COTW_DIR, filename);
  const key = `grudge-assets/models/creatures/land/cotw/${filename}`;
  const args = [
    'wrangler', 'r2', 'object', 'put', key,
    `--file=${filePath}`,
    '--content-type=model/gltf-binary',
  ];
  if (REMOTE) args.push('--remote');
  console.log(`Uploading ${filename} → ${key}${REMOTE ? ' (remote)' : ''}...`);
  const result = spawnSync('npx', args, { cwd: CDN_DIR, stdio: 'inherit', shell: true });
  if (result.status !== 0) ok = false;
}

if (!ok) process.exit(1);
console.log(`Uploaded ${files.length} COTW creature models.`);
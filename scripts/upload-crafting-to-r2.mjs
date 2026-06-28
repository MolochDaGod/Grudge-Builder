#!/usr/bin/env node
/**
 * Upload crafting HTML + fleet JS to R2 for CDN bootstrap + browser Puter deploy.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'client', 'public');
const CDN_DIR = path.join(__dirname, '..', 'workers', 'cdn');
const REMOTE = process.argv.includes('--remote');

const BUCKET = 'grudge-assets';
const FILES = [
  { local: 'grudge-crafting.html', key: 'crafting/grudge-crafting.html', type: 'text/html' },
  { local: 'grudge-fleet.js', key: 'js/grudge-fleet.js', type: 'application/javascript' },
];

function put(key, filePath, contentType) {
  const args = [
    'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`,
    `--file=${filePath}`,
    `--content-type=${contentType}`,
  ];
  if (REMOTE) args.push('--remote');
  console.log(`→ ${key}${REMOTE ? ' (remote)' : ''}`);
  const r = spawnSync('npx', args, { cwd: CDN_DIR, stdio: 'inherit', shell: true });
  return r.status === 0;
}

let ok = true;
for (const f of FILES) {
  const fp = path.join(publicDir, f.local);
  if (!fs.existsSync(fp)) {
    console.error('Missing:', fp);
    ok = false;
    continue;
  }
  if (!put(f.key, fp, f.type)) ok = false;
}

if (!ok) process.exit(1);
console.log('\n✅ CDN ready:');
console.log('   https://assets.grudge-studio.com/crafting/grudge-crafting.html');
console.log('   https://assets.grudge-studio.com/js/grudge-fleet.js');
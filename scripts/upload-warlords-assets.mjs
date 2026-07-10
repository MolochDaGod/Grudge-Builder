#!/usr/bin/env node
/**
 * Upload Warlords-era canonical assets (mines, mountain, later faction packs).
 *
 *   npm run upload:warlords-assets
 *
 * Sources: client/public/models/warlords/* (copied from craftpix_mine + JJ mountain)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const warlords = path.join(root, 'client', 'public', 'models', 'warlords');
const CDN_DIR = path.join(root, 'workers', 'cdn');
const REMOTE = process.argv.includes('--remote') || true;
const BUCKET = 'grudge-assets';

function put(key, filePath, contentType) {
  const args = [
    'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`,
    `--file=${filePath}`,
    `--content-type=${contentType}`,
    '--remote',
  ];
  console.log(`→ ${key}`);
  const r = spawnSync('npx', args, { cwd: CDN_DIR, stdio: 'inherit', shell: true });
  return r.status === 0;
}

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, base, out);
    else if (/\.(glb|gltf|fbx)$/i.test(ent.name)) {
      const rel = path.relative(base, full).replace(/\\/g, '/');
      out.push({ full, key: `models/warlords/${rel}` });
    }
  }
  return out;
}

// Ensure mountain from D: if missing
const mtnLocal = path.join(warlords, 'mountains', 'rock_mountain_cave_entrance.glb');
const mtnSrc = 'D:/Games/Models/rock_mountain_with_cave_realistic_85k_by_jj_fbx.glb';
if (!fs.existsSync(mtnLocal) && fs.existsSync(mtnSrc)) {
  fs.mkdirSync(path.dirname(mtnLocal), { recursive: true });
  fs.copyFileSync(mtnSrc, mtnLocal);
  console.log('copied mountain GLB');
}

const files = walk(warlords);
if (!files.length) {
  console.error('No warlords assets under', warlords);
  process.exit(1);
}

let ok = true;
for (const f of files) {
  const ct = f.full.endsWith('.fbx')
    ? 'application/octet-stream'
    : 'model/gltf-binary';
  if (!put(f.key, f.full, ct)) ok = false;
}

if (!ok) process.exit(1);
console.log(`\n✅ Uploaded ${files.length} warlords assets`);
console.log('Catalog: shared/definitions/warlordsEraAssets.ts');
console.log('Mines: shared/definitions/homeIslandMines.ts (≥2 per island)');

#!/usr/bin/env node
/**
 * Upload build multipacks to R2 (studio best practice: binaries on CDN only).
 *
 * Sources (prefer client/public copy; fallback D:/Games/Models):
 *   free_survival_asset_kit.glb → models/buildings/survival/
 *   3_medieval_towers.glb       → models/buildings/towers/
 *   spell_table.glb             → models/buildings/benches/
 *   lumbermill.glb              → models/buildings/benches/
 *
 * Usage:
 *   node scripts/upload-build-packs-to-r2.mjs --remote
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'client', 'public', 'models', 'buildings');
const CDN_DIR = path.join(root, 'workers', 'cdn');
const REMOTE = process.argv.includes('--remote');
const BUCKET = 'grudge-assets';

const FILES = [
  {
    local: path.join(publicDir, 'survival', 'free_survival_asset_kit.glb'),
    alt: 'D:/Games/Models/free_survival_asset_kit.glb',
    key: 'models/buildings/survival/free_survival_asset_kit.glb',
  },
  {
    local: path.join(publicDir, 'towers', '3_medieval_towers.glb'),
    alt: 'D:/Games/Models/3_medieval_towers (1).glb',
    key: 'models/buildings/towers/3_medieval_towers.glb',
  },
  {
    local: path.join(publicDir, 'benches', 'spell_table.glb'),
    alt: 'D:/Games/Models/spell_table.glb',
    key: 'models/buildings/benches/spell_table.glb',
  },
  {
    local: path.join(publicDir, 'benches', 'lumbermill.glb'),
    alt: 'D:/Games/Models/lumbermill.glb',
    key: 'models/buildings/benches/lumbermill.glb',
  },
];

function put(key, filePath) {
  const args = [
    'wrangler',
    'r2',
    'object',
    'put',
    `${BUCKET}/${key}`,
    `--file=${filePath}`,
    '--content-type=model/gltf-binary',
  ];
  if (REMOTE) args.push('--remote');
  console.log(`→ ${key}${REMOTE ? ' (remote)' : ' (local miniflare)'}`);
  const r = spawnSync('npx', args, { cwd: CDN_DIR, stdio: 'inherit', shell: true });
  return r.status === 0;
}

let ok = true;
for (const f of FILES) {
  let fp = f.local;
  if (!fs.existsSync(fp) && f.alt && fs.existsSync(f.alt)) {
    // Ensure public copy for Vite dev
    fs.mkdirSync(path.dirname(f.local), { recursive: true });
    fs.copyFileSync(f.alt, f.local);
    fp = f.local;
    console.log(`copied ${f.alt} → ${f.local}`);
  }
  if (!fs.existsSync(fp)) {
    console.error('Missing:', f.local, 'and', f.alt);
    ok = false;
    continue;
  }
  if (!put(f.key, fp)) ok = false;
}

if (!ok) process.exit(1);
console.log('\n✅ Build packs on CDN:');
for (const f of FILES) {
  console.log(`   https://assets.grudge-studio.com/${f.key}`);
}
console.log('\nSSOT: docs/BUILD_SYSTEM_SSOT.md · shared/definitions/survivalKitBuildCatalog.ts');

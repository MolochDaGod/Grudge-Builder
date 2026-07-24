/**
 * Upload Lyoko / spiral / Hoth / Iceland GLBs to R2 grudge-assets bucket.
 *
 *   node scripts/upload-floating-island-assets.mjs
 *
 * Requires wrangler logged in (npx wrangler whoami).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const bucket = 'grudge-assets';

const FILES = [
  {
    key: 'models/biomes/ethereal/lyoko_mountain_sector.glb',
    local: 'client/public/models/biomes/ethereal/lyoko_mountain_sector.glb',
  },
  {
    key: 'models/biomes/event/spiral_mountain_reimagined.glb',
    local: 'client/public/models/biomes/event/spiral_mountain_reimagined.glb',
  },
  {
    key: 'models/biomes/frozen/hoth_boss_room_low_poly.glb',
    local: 'client/public/models/biomes/frozen/hoth_boss_room_low_poly.glb',
  },
  {
    key: 'models/biomes/cold/iceland_scene_for_canimatic.glb',
    local: 'client/public/models/biomes/cold/iceland_scene_for_canimatic.glb',
  },
];

let ok = 0;
let fail = 0;

for (const f of FILES) {
  const full = path.join(root, f.local);
  if (!fs.existsSync(full)) {
    console.error('MISSING', f.local);
    fail++;
    continue;
  }
  const mb = (fs.statSync(full).size / 1e6).toFixed(1);
  console.log(`\n→ put ${f.key} (${mb} MB)`);
  const r = spawnSync(
    'npx',
    [
      'wrangler',
      'r2',
      'object',
      'put',
      `${bucket}/${f.key}`,
      `--file=${full}`,
      '--content-type=model/gltf-binary',
      '--remote',
    ],
    { cwd: root, encoding: 'utf8', shell: true, maxBuffer: 20e6 },
  );
  if (r.status === 0) {
    console.log('OK', f.key);
    console.log(`   https://assets.grudge-studio.com/${f.key}`);
    ok++;
  } else {
    console.error('FAIL', f.key, r.stderr || r.stdout);
    fail++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);

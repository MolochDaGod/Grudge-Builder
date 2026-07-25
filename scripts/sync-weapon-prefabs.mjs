/**
 * Sync converted codex weapon GLBs → client/public/models/codex/**
 * and print 6-style × weapon-type production coverage.
 *
 *   node scripts/sync-weapon-prefabs.mjs
 *
 * Sources: D:\Games\Models\_codex_prod\dist\
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const CODEX =
  process.env.CODEX_PROD || 'D:/Games/Models/_codex_prod';
const dist = path.join(CODEX, 'dist');
const destRoot = path.join(root, 'client/public/models/codex');

const PACKS = ['glitch-weapons', 'voxel-weapons', 'cold-biome'];

function copyTree(src, dest) {
  if (!fs.existsSync(src)) return 0;
  let n = 0;
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) n += copyTree(s, d);
    else if (/\.(glb|json)$/i.test(ent.name)) {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

let copied = 0;
for (const pack of PACKS) {
  const src = path.join(dist, pack);
  const dest = path.join(destRoot, pack);
  if (!fs.existsSync(src)) {
    console.warn('missing pack dist', src);
    continue;
  }
  const n = copyTree(src, dest);
  console.log(`copied ${n} files ${pack} → client/public/models/codex/${pack}`);
  copied += n;
}

// Coverage (inline — mirrors weaponPrefabCatalog matrix logic for CLI)
const styles = ['copper', 'silver', 'gold', 'diamond', 'voxel', 'cold_viking'];
const glitchTools = {
  SWORD: 'sword',
  AXE: 'axe',
  SCYTHE: 'scyth',
  PICKAXE: 'picaxe',
  SHOVEL: 'shovel',
};
const voxelTools = {
  SWORD: 'sword',
  AXE: 'axe',
  SCYTHE: 'scythe',
  PICKAXE: 'pickaxe',
};

function existsGlitch(mat, tool) {
  return fs.existsSync(
    path.join(dist, 'glitch-weapons/weapons', `${mat}_${tool}`, `${mat}_${tool}.glb`),
  );
}
function existsVoxel(tool) {
  return fs.existsSync(
    path.join(dist, 'voxel-weapons/weapons', tool, `${tool}.glb`),
  );
}
function existsViking(name) {
  return fs.existsSync(path.join(dist, 'cold-biome/viking', name, `${name}.glb`))
    || fs.existsSync(path.join(dist, 'cold-biome/viking', `${name}.glb`));
}

console.log('\n=== 6-style production readiness (converted on disk) ===\n');
const types = Object.keys(glitchTools);
for (const wt of types) {
  const tool = glitchTools[wt];
  const cells = [];
  for (const mat of ['copper', 'silver', 'gold', 'diamond']) {
    cells.push(existsGlitch(mat, tool) ? '✓' : '·');
  }
  const vt = voxelTools[wt];
  cells.push(vt && existsVoxel(vt) ? '✓' : '·');
  cells.push(
    wt === 'AXE' && (existsViking('axe') || existsViking('axerune')) ? '✓' : '·',
  );
  console.log(
    `${wt.padEnd(8)} [${cells.join(' ')}]  styles: copper silver gold diamond voxel viking`,
  );
}

console.log(`\nSync done: ${copied} files → ${destRoot}`);
console.log('Catalog SSOT: shared/definitions/weaponPrefabCatalog.ts');
console.log('Coverage: import { buildWeaponPrefabCoverage } from that module');

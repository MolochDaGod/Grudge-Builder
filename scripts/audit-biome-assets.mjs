/**
 * Audit Warlords biome / home-island / land / water assets on R2 CDN.
 *
 * Usage:
 *   node scripts/audit-biome-assets.mjs
 *   node scripts/audit-biome-assets.mjs --strict   # exit 1 on any miss
 *
 * Sources (SSOT — do not invent parallel lists):
 *   shared/definitions/natureAssetCatalog.ts → WARLORDS_SURFACE_ASSETS
 *   Creature fish/land paths
 *   All 12 biome review GLBs
 *   Ground_1..10 PBR
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CDN = process.env.ASSET_CDN || 'https://assets.grudge-studio.com';
const strict = process.argv.includes('--strict');

/** Parse catalog TS lightly for path strings we care about. */
function extractPathsFromCatalog() {
  const src = readFileSync(
    path.join(root, 'shared/definitions/natureAssetCatalog.ts'),
    'utf8',
  );
  const paths = new Set();
  const re = /['"`](\/models\/[^'"`]+)['"`]|['"`](\/textures\/[^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src))) {
    paths.add(m[1] || m[2]);
  }
  // Explicit surface layers
  for (const id of [
    'abyssal', 'beach', 'desert', 'ethereal', 'forest', 'frozen',
    'nexus', 'plains', 'storm', 'tropical', 'volcanic', 'winter',
  ]) {
    paths.add(`/models/biomes/review/${id}.glb`);
  }
  for (let n = 1; n <= 10; n++) {
    paths.add(`/textures/pbr/ground/Ground_${n}_BaseColor.png`);
    paths.add(`/textures/pbr/ground/Ground_${n}_Normal.png`);
    paths.add(`/textures/pbr/ground/Ground_${n}_Roughness.png`);
    paths.add(`/textures/pbr/ground/Ground_${n}_AmbientOcclusion.png`);
  }
  for (const f of [
    'anglerfish', 'lionfish', 'goldfish', 'blobfish', 'catfish',
    'butterflyfish', 'flatfish', 'shark',
  ]) {
    paths.add(`/models/creatures/fish/${f}.glb`);
  }
  for (const a of [
    'deer', 'boar', 'bear', 'lynx', 'lioness', 'buffalo',
    'beaver', 'raccoon', 'mink', 'ibex', 'alligator', 'mallard',
  ]) {
    paths.add(`/models/creatures/land/cotw/${a}.glb`);
  }
  paths.add('/models/creatures/land/wolf.glb');
  paths.add('/models/creatures/land/deer.glb');
  paths.add('/models/creatures/land/buffalo.glb');
  paths.add('/models/creatures/predator/shark.glb');
  return [...paths].sort();
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return { ok: true, status: res.status };
    // Some CDNs block HEAD — try GET range
    const g = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    return { ok: g.ok || g.status === 206, status: g.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) };
  }
}

const paths = extractPathsFromCatalog();
console.log(`[audit-biome-assets] CDN=${CDN} paths=${paths.length}`);

const ok = [];
const miss = [];
// Parallel batches
const batchSize = 12;
for (let i = 0; i < paths.length; i += batchSize) {
  const batch = paths.slice(i, i + batchSize);
  const results = await Promise.all(
    batch.map(async (p) => {
      const r = await headOk(CDN + p);
      return { p, ...r };
    }),
  );
  for (const r of results) {
    if (r.ok) ok.push(r.p);
    else miss.push(r);
  }
  process.stdout.write(`\r  checked ${Math.min(i + batchSize, paths.length)}/${paths.length}`);
}
console.log('');

console.log(`\nOK:   ${ok.length}`);
console.log(`MISS: ${miss.length}`);
if (miss.length) {
  console.log('\nMissing:');
  for (const m of miss) {
    console.log(`  ${m.status || 'ERR'}  ${m.p}${m.error ? '  ' + m.error : ''}`);
  }
}

// Layer summary for humans
console.log('\n--- Warlords surface layers (expected) ---');
console.log('Land:   battle nature trees/rocks/bushes/grasses + stylized multipacks');
console.log('Coast:  tropical_plants pack + palm_a/b + ground_1 sand');
console.log('Water:  pond_pack + 8 fish GLBs + shark predator');
console.log('Mountain: evil_rock_mountain_peak_0|1|2 + triad');
console.log('Ground:  Ground_1..10 BaseColor/Normal/Roughness/AO');
console.log('Biomes:  /models/biomes/review/{12}.glb');

if (strict && miss.length) {
  process.exit(1);
}
console.log(miss.length ? '\n[audit] incomplete' : '\n[audit] all required Warlords biome assets present on CDN');

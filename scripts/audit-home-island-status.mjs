#!/usr/bin/env node
/**
 * Audit home-island CDN + catalog + ObjectStore health.
 * Usage: node scripts/audit-home-island-status.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Load TS sources via tsx when available — fall back to JSON manifests
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 15000 }, (res) => {
      resolve({ status: res.statusCode ?? 0, len: res.headers['content-length'] });
    });
    req.on('error', (e) => resolve({ status: 0, err: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, err: 'timeout' });
    });
    req.end();
  });
}

function getStatus(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => resolve(res.statusCode ?? 0))
      .on('error', () => resolve(0));
  });
}

async function main() {
  const base = 'https://assets.grudge-studio.com';
  const manifestPath = path.join(
    ROOT,
    'shared/definitions/published/organized-nature-manifest.json',
  );
  const contractPath = path.join(
    ROOT,
    'shared/definitions/published/home-island-contract.json',
  );
  const biomesPath = path.join(
    ROOT,
    'shared/definitions/published/biome-ecosystems.json',
  );

  const paths = new Set();

  // From manifest
  if (fs.existsSync(manifestPath)) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const t of m.organized?.trees ?? []) paths.add(t.path);
    for (const r of m.organized?.rocks ?? []) paths.add(r.path);
    for (const r of m.realistic ?? []) paths.add(r.path);
    if (m.sourcePacks?.trees) paths.add(m.sourcePacks.trees);
    if (m.sourcePacks?.rocks) paths.add(m.sourcePacks.rocks);
  }

  // Environment / harvest / mountains / reviews / catalogs
  [
    '/models/environment/island_tree.glb',
    '/models/environment/island_rock.glb',
    '/models/environment/gem_cluster.glb',
    '/models/environment/harvest_stump.glb',
    '/models/environment/harvest_logs.glb',
    '/models/environment/harvest_gold_rocks.glb',
    '/models/environment/harvest_rock_debris.glb',
    '/models/evil_rock_mountains_triad.glb',
    '/models/evil_rock_mountain_peak_0.glb',
    '/models/evil_rock_mountain_peak_1.glb',
    '/models/evil_rock_mountain_peak_2.glb',
    '/catalogs/home-island/home-island-contract.json',
    '/catalogs/home-island/biome-ecosystems.json',
    '/catalogs/home-island/organized-nature-manifest.json',
  ].forEach((p) => paths.add(p));

  for (const b of [
    'beach', 'tropical', 'forest', 'plains', 'winter', 'frozen',
    'desert', 'volcanic', 'storm', 'ethereal', 'abyssal', 'nexus',
  ]) {
    paths.add(`/models/biomes/review/${b}.glb`);
  }

  console.log('=== CDN (runtime assets) ===');
  let ok = 0;
  const miss = [];
  for (const p of [...paths].sort()) {
    const r = await head(base + p);
    if (r.status === 200) {
      ok++;
    } else {
      miss.push({ p, status: r.status, err: r.err });
      console.log(`MISS ${r.status} ${p}${r.err ? ' ' + r.err : ''}`);
    }
  }
  console.log(`OK ${ok} / ${paths.size}  MISS ${miss.length}`);

  console.log('\n=== BANNED megakit still on CDN (expected until deleted) ===');
  for (const p of [
    '/models/nature/CommonTree_1.glb',
    '/models/nature/Pine_1.glb',
    '/models/nature/Rock_Medium_1.glb',
    '/models/nature/TwistedTree_1.glb',
    '/models/nature/DeadTree_1.glb',
  ]) {
    const r = await head(base + p);
    console.log(`  ${r.status === 200 ? 'PRESENT' : 'gone '} ${r.status} ${p}`);
  }

  console.log('\n=== Local files ===');
  const localChecks = [
    'client/public/models/environment/island_tree.glb',
    'client/public/models/nature/organized/trees/pine2_14.glb',
    'client/public/models/nature/realistic/trees/pine/pine_a.glb',
    'client/public/models/biomes/review/forest.glb',
    'shared/definitions/published/organized-nature-manifest.json',
    'shared/definitions/homeIslandFoundations.ts',
    'shared/definitions/natureAssetCatalog.ts',
  ];
  for (const rel of localChecks) {
    const abs = path.join(ROOT, rel);
    console.log(`  ${fs.existsSync(abs) ? 'OK  ' : 'MISS'} ${rel}`);
  }

  console.log('\n=== ObjectStore / info live ===');
  for (const u of [
    'https://molochdagod.github.io/ObjectStore/api/v1/home-island-contract.json',
    'https://molochdagod.github.io/ObjectStore/api/v1/organized-nature-manifest.json',
    'https://molochdagod.github.io/ObjectStore/api/v1/biome-ecosystems.json',
    'https://info.grudge-studio.com/api/v1/home-island-contract.json',
    'https://info.grudge-studio.com/api/v1/biome-ecosystems.json',
  ]) {
    const s = await getStatus(u);
    console.log(`  ${s === 200 ? 'OK  ' : 'FAIL'} ${s} ${u.replace('https://', '')}`);
  }

  // Contract version check
  if (fs.existsSync(contractPath)) {
    const c = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    console.log('\n=== Contract local ===');
    console.log(`  version ${c.version}`);
    console.log(`  foundations ${c.sizeFoundations ? Object.keys(c.sizeFoundations).filter(k => k !== 'rule').join(', ') : 'MISSING'}`);
    console.log(`  nature ban listed: ${Boolean(c.natureAssets?.banned?.length)}`);
  }

  if (fs.existsSync(biomesPath)) {
    const b = JSON.parse(fs.readFileSync(biomesPath, 'utf8'));
    console.log('\n=== Biomes published ===');
    console.log(`  version ${b.version} biomes ${b.biomes?.length}`);
    console.log(`  sizeFoundations ${Boolean(b.sizeFoundations)}`);
    console.log(`  bannedNature ${Boolean(b.bannedNature)}`);
  }

  console.log('\n=== Code smell checklist (manual) ===');
  console.log('  - server routes still default biome "temperate" → maps to forest via normalize');
  console.log('  - crystals flash procedural cone/dodeca before gem GLB mounts');
  console.log('  - hemp/flower/scrap still pure procedural (no GLB)');
  console.log('  - groundcover scatter empty (bush/grass/fern banned, no HQ yet)');
  console.log('  - InstancedProceduralForest still last-resort if all CDN loads fail');
  console.log('  - extracted "realistic" meshes are pack-sourced, not photoreal HQ');
  console.log('  - client deploy may not include latest natureAssetCatalog until rebuild');

  if (miss.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

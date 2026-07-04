#!/usr/bin/env node
/**
 * Unified fleet asset uploader — fills production gaps on R2 + publishes manifest.json.
 *
 * Usage:
 *   node scripts/upload-fleet-assets.mjs [--dry-run] [--force]
 *   node scripts/upload-fleet-assets.mjs --only ships|fish|textures|town|manifest
 *
 * Env overrides:
 *   FISH_ASSET_ROOT, RTS_SHIP_ROOT, PIRATE_SHIP_GLB, MEDIEVAL_TOWN_ROOT
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import {
  loadEnvFiles,
  getR2Config,
  createR2Client,
  uploadFile,
  uploadBuffer,
} from './lib/r2Upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadEnvFiles(ROOT);

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1] : null;

const cfg = getR2Config();
const client = dryRun ? null : createR2Client(cfg);

const FISH_ROOT =
  process.env.FISH_ASSET_ROOT ||
  path.join(process.env.USERPROFILE || '', 'Documents', '1111111', 'Grudge-RPG-Sprite-Attack', 'client', 'public', '3dassets', 'fish');
const RTS_SHIP_ROOT =
  process.env.RTS_SHIP_ROOT ||
  path.join(process.env.USERPROFILE || '', '.grok', 'worktrees', 'github-grudanode', 'RTS-Grudge', 'studio', 'public', 'assets', 'models', 'nature');
const PIRATE_SHIP_GLB =
  process.env.PIRATE_SHIP_GLB ||
  path.join(process.env.USERPROFILE || '', 'Desktop', 'grudgeproduction', 'vox', 'pirate-ship.glb');
const MEDIEVAL_TOWN_ROOT =
  process.env.MEDIEVAL_TOWN_ROOT || path.join(ROOT, '.tmp', 'medieval_town');

const FISH_FILES = [
  'Clownfish.glb',
  'Blue Tang.glb',
  'Yellow Tang.glb',
  'Koi.glb',
  'Tuna.glb',
  'Shark.glb',
  'Goldfish.glb',
  'Tetra.glb',
  'Butterfly Fish.glb',
  'Piranha.glb',
  'Anglerfish.glb',
  'Lionfish.glb',
  'Puffer.glb',
  'Swordfish.glb',
  'Moorish Idol.glb',
  'Parrot Fish.glb',
  'Coral Grouper.glb',
  'Mandarin Fish.glb',
  'Zebra Clown Fish.glb',
  'Sunfish.glb',
];

const SHIP_MAP = [
  { local: 'ship-small.glb', r2: 'models/ships/ship-small.glb' },
  { local: 'ship-medium.glb', r2: 'models/ships/ship-medium.glb' },
  { local: 'ship-large.glb', r2: 'models/ships/ship-large.glb' },
  { local: 'ship-wreck.glb', r2: 'models/ships/ship-wreck.glb' },
];

const PIRATE_ALIASES = [
  'models/ships/ship-pirate-small.glb',
  'models/ships/ship-pirate-medium.glb',
  'models/ships/ship-pirate-large.glb',
];

const results = { uploaded: 0, skipped: 0, failed: 0, keys: [] };

async function put(localPath, r2Key) {
  const res = await uploadFile(client, cfg.bucket, localPath, r2Key, { force, dryRun });
  if (!res.ok) {
    console.error(`FAIL ${r2Key} — ${res.reason || 'error'} (${localPath})`);
    results.failed++;
    return false;
  }
  if (res.skipped) {
    console.log(`skip ${r2Key}`);
    results.skipped++;
  } else {
    console.log(`${dryRun ? 'dry-run' : 'upload'} ${r2Key} (${res.bytes} bytes)`);
    results.uploaded++;
    results.keys.push(r2Key);
  }
  return true;
}

async function putAlias(sourcePath, r2Key) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`FAIL ${r2Key} — missing alias source ${sourcePath}`);
    results.failed++;
    return false;
  }
  return put(sourcePath, r2Key);
}

async function generateShipTextures(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const specs = [
    {
      file: 'weathered_oak_hull.png',
      r2: 'textures/ships/weathered_oak_hull.png',
      base: { r: 92, g: 64, b: 51 },
    },
    {
      file: 'mahogany_deck.png',
      r2: 'textures/ships/mahogany_deck.png',
      base: { r: 110, g: 55, b: 35 },
    },
    {
      file: 'canvas_sail.png',
      r2: 'textures/ships/canvas_sail.png',
      base: { r: 235, g: 228, b: 210 },
    },
  ];
  for (const spec of specs) {
    const out = path.join(outDir, spec.file);
    const { r, g, b } = spec.base;
    const w = 512;
    const h = 512;
    const raw = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const grain = Math.sin(x * 0.08 + y * 0.02) * 12 + (Math.random() - 0.5) * 18;
        const i = (y * w + x) * 3;
        raw[i] = Math.max(0, Math.min(255, Math.round(r + grain)));
        raw[i + 1] = Math.max(0, Math.min(255, Math.round(g + grain * 0.7)));
        raw[i + 2] = Math.max(0, Math.min(255, Math.round(b + grain * 0.5)));
      }
    }
    await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toFile(out);
    await put(out, spec.r2);
  }
}

async function convertMedievalTown(outGlb) {
  const gltfPath = path.join(MEDIEVAL_TOWN_ROOT, 'scene.gltf');
  if (!fs.existsSync(gltfPath)) {
    const zip = path.join(process.env.USERPROFILE || '', 'Documents', 'medieval_town.zip');
    if (fs.existsSync(zip)) {
      fs.mkdirSync(MEDIEVAL_TOWN_ROOT, { recursive: true });
      const { execSync } = await import('node:child_process');
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -Path '${zip.replace(/'/g, "''")}' -DestinationPath '${MEDIEVAL_TOWN_ROOT.replace(/'/g, "''")}' -Force"`,
        { stdio: 'inherit' },
      );
    }
  }
  if (!fs.existsSync(gltfPath)) {
    console.error('medieval_town: scene.gltf not found — set MEDIEVAL_TOWN_ROOT or place medieval_town.zip in Documents');
    results.failed++;
    return;
  }
  fs.mkdirSync(path.dirname(outGlb), { recursive: true });
  const io = new NodeIO();
  const doc = await io.read(gltfPath);
  await io.write(outGlb, doc);
  await put(outGlb, 'models/medieval_town.glb');
}

async function publishManifest() {
  const manifest = {
    version: 1,
    generated: new Date().toISOString(),
    bucket: cfg.bucket,
    cdn: cfg.cdn,
    layout: {
      fonts: 'fonts/{family}/',
      icons: 'icons/{pack|tomes|weapons}/',
      sprites: 'sprites/',
      models: 'models/{characters|environment|weapons|ships|creatures}/',
      textures: 'textures/{pbr|ships|polyhaven}/',
      audio: 'audio/{sfx|music|voice|dialogue}/',
      cinematics: 'gruda-armada/grudge-warlords/videos/',
      fish: 'fish/ (legacy — migrate to models/creatures/fish/)',
    },
    worker: 'grudge-asset-cdn',
    workerSource: 'GrudgeBuilder/workers/cdn/',
    deprecated: {
      hosts: ['api.grudge-studio.com', 'molochdagod.github.io'],
      note: 'Use objectstore.grudge-studio.com and assets.grudge-studio.com',
    },
    required: [
      'sprites/gbux-token.png',
      'icons/tomes/fire.png',
      'models/grudge6/races/WK_Characters.fbx',
      'fonts/kaph/Kaph-Regular.woff2',
      'models/ships/ship-small.glb',
      'fish/Clownfish.glb',
      'textures/ships/weathered_oak_hull.png',
      'models/medieval_town.glb',
    ],
    lastUpload: {
      script: 'upload-fleet-assets.mjs',
      keys: results.keys,
      uploaded: results.uploaded,
      skipped: results.skipped,
      failed: results.failed,
    },
  };
  const body = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const res = await uploadBuffer(client, cfg.bucket, body, 'manifest.json', 'application/json', { dryRun });
  console.log(`${dryRun ? 'dry-run' : 'upload'} manifest.json (${body.length} bytes)`);
  if (!res.dryRun) results.uploaded++;
}

async function uploadShips() {
  for (const { local, r2 } of SHIP_MAP) {
    await put(path.join(RTS_SHIP_ROOT, local), r2);
  }
  const ghostSrc = path.join(RTS_SHIP_ROOT, 'ship-small.glb');
  await putAlias(ghostSrc, 'models/ships/ship-ghost.glb');
  if (fs.existsSync(PIRATE_SHIP_GLB)) {
    for (const r2 of PIRATE_ALIASES) {
      await putAlias(PIRATE_SHIP_GLB, r2);
    }
  } else {
    console.warn('pirate-ship.glb not found — aliasing ship-medium for pirate variants');
    const med = path.join(RTS_SHIP_ROOT, 'ship-medium.glb');
    for (const r2 of PIRATE_ALIASES) {
      await putAlias(med, r2);
    }
  }
}

async function uploadFish() {
  if (!fs.existsSync(FISH_ROOT)) {
    console.error(`Fish source missing: ${FISH_ROOT}`);
    results.failed += FISH_FILES.length;
    return;
  }
  for (const file of FISH_FILES) {
    await put(path.join(FISH_ROOT, file), `fish/${file}`);
  }
}

async function main() {
  const run = (name) => !only || only === name;
  console.log(`Fleet asset upload — bucket=${cfg.bucket} cdn=${cfg.cdn} dryRun=${dryRun} force=${force}`);

  if (run('textures')) {
    await generateShipTextures(path.join(ROOT, '.tmp', 'ship-textures'));
  }
  if (run('ships')) {
    await uploadShips();
  }
  if (run('fish')) {
    await uploadFish();
  }
  if (run('town')) {
    await convertMedievalTown(path.join(ROOT, '.tmp', 'medieval_town.glb'));
  }
  if (run('manifest')) {
    await publishManifest();
  }

  console.log(`\nDone: ${results.uploaded} uploaded, ${results.skipped} skipped, ${results.failed} failed`);
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
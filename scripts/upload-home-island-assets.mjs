#!/usr/bin/env node
/**
 * Upload home-island assets to R2 (grudge-assets → assets.grudge-studio.com).
 *
 * Uploads:
 *  - environment harvest packs (island_tree/rock, gems, stump, …)
 *  - organized + realistic nature variants
 *  - evil mountain triad / peaks
 *  - biome review GLBs
 *  - published SSOT JSON catalogs
 *
 * Usage:
 *   node scripts/upload-home-island-assets.mjs [--force] [--dry-run] [--skip-missing]
 *
 * Requires R2_* credentials in .env / .env.local (see scripts/lib/r2Upload.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadEnvFiles,
  getR2Config,
  createR2Client,
  uploadFile,
} from './lib/r2Upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODELS = path.join(ROOT, 'client', 'public', 'models');
const MODELS_ALT = path.join(ROOT, 'public', 'models');
const PUBLISHED = path.join(ROOT, 'shared', 'definitions', 'published');

function resolveModelsFile(...parts) {
  const a = path.join(MODELS, ...parts);
  if (fs.existsSync(a)) return a;
  const b = path.join(MODELS_ALT, ...parts);
  if (fs.existsSync(b)) return b;
  return a; // preferred path for missing reports
}

const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry-run');
const SKIP_MISSING = process.argv.includes('--skip-missing');

/** [localPath, r2Key] — r2Key is object key inside grudge-assets bucket */
function collectUploads() {
  const pairs = [];

  const add = (local, r2Key) => {
    pairs.push({ local, r2Key });
  };

  // Environment harvest packs
  const envFiles = [
    'island_tree.glb',
    'island_rock.glb',
    'gem_cluster.glb',
    'harvest_logs.glb',
    'harvest_rock_debris.glb',
    'harvest_gold_rocks.glb',
    'harvest_stump.glb',
  ];
  for (const f of envFiles) {
    add(resolveModelsFile('environment', f), `models/environment/${f}`);
  }

  // Mountain triad
  for (const f of [
    'evil_rock_mountains_triad.glb',
    'evil_rock_mountain_peak_0.glb',
    'evil_rock_mountain_peak_1.glb',
    'evil_rock_mountain_peak_2.glb',
  ]) {
    add(resolveModelsFile(f), `models/${f}`);
  }

  // Organized nature (extracted variants)
  const orgTrees = path.join(MODELS, 'nature', 'organized', 'trees');
  const orgRocks = path.join(MODELS, 'nature', 'organized', 'rocks');
  if (fs.existsSync(orgTrees)) {
    for (const f of fs.readdirSync(orgTrees).filter((x) => x.endsWith('.glb'))) {
      add(path.join(orgTrees, f), `models/nature/organized/trees/${f}`);
    }
  }
  if (fs.existsSync(orgRocks)) {
    for (const f of fs.readdirSync(orgRocks).filter((x) => x.endsWith('.glb'))) {
      add(path.join(orgRocks, f), `models/nature/organized/rocks/${f}`);
    }
  }

  // Realistic layout (catalog paths)
  const realisticRoot = path.join(MODELS, 'nature', 'realistic');
  if (fs.existsSync(realisticRoot)) {
    const walk = (dir, relParts = []) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p, [...relParts, ent.name]);
        else if (ent.name.endsWith('.glb')) {
          const rel = [...relParts, ent.name].join('/');
          add(p, `models/nature/realistic/${rel}`);
        }
      }
    };
    walk(realisticRoot);
  }

  // Biome review GLBs (client/public or legacy public/)
  for (const reviewDir of [
    path.join(MODELS, 'biomes', 'review'),
    path.join(MODELS_ALT, 'biomes', 'review'),
  ]) {
    if (!fs.existsSync(reviewDir)) continue;
    for (const f of fs.readdirSync(reviewDir).filter((x) => x.endsWith('.glb'))) {
      add(path.join(reviewDir, f), `models/biomes/review/${f}`);
    }
  }

  // Published SSOT JSON (also on ObjectStore; R2 copy for CDN fetch)
  const jsonFiles = [
    'biome-ecosystems.json',
    'home-island-contract.json',
    'organized-nature-manifest.json',
  ];
  for (const f of jsonFiles) {
    const local = path.join(PUBLISHED, f);
    if (fs.existsSync(local)) {
      add(local, `catalogs/home-island/${f}`);
    }
  }

  // Deduplicate by r2Key
  const seen = new Map();
  for (const p of pairs) {
    // Fix double-slash from walk
    p.r2Key = p.r2Key.replace(/\/{2,}/g, '/');
    if (p.r2Key.startsWith('models/nature/realistic//')) {
      p.r2Key = p.r2Key.replace('models/nature/realistic//', 'models/nature/realistic/');
    }
    // Fix empty segment from walk with prefix ''
    p.r2Key = p.r2Key.replace('models/nature/realistic//', 'models/nature/realistic/');
    if (p.r2Key.includes('realistic//')) {
      p.r2Key = p.r2Key.replace('realistic//', 'realistic/');
    }
    // When walk starts with '', paths become models/nature/realistic//trees/...
    p.r2Key = p.r2Key.replace(/\/+/g, '/');
    seen.set(p.r2Key, p);
  }
  return [...seen.values()];
}

async function main() {
  loadEnvFiles(ROOT);
  const cfg = getR2Config();
  console.log(`R2 bucket=${cfg.bucket} cdn=${cfg.cdn} force=${FORCE} dryRun=${DRY}`);

  const client = DRY ? null : createR2Client(cfg);
  const uploads = collectUploads();
  console.log(`Queued ${uploads.length} objects`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let missing = 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const { local, r2Key } of uploads) {
    if (!fs.existsSync(local)) {
      missing++;
      if (SKIP_MISSING) {
        console.warn(`  MISS ${r2Key}`);
        continue;
      }
      console.error(`  MISSING LOCAL ${local}`);
      failed++;
      continue;
    }
    let done = false;
    let lastErr = null;
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      try {
        const res = DRY
          ? { ok: true, skipped: false, dryRun: true, r2Key, bytes: fs.statSync(local).size }
          : await uploadFile(client, cfg.bucket, local, r2Key, { force: FORCE, dryRun: DRY });
        if (res.skipped) {
          skipped++;
          console.log(`  skip ${r2Key} (${res.bytes}b)`);
        } else {
          ok++;
          console.log(`  ${DRY ? 'dry' : 'PUT '} ${r2Key} (${res.bytes}b)${attempt > 1 ? ` [retry ${attempt}]` : ''}`);
        }
        done = true;
      } catch (e) {
        lastErr = e;
        if (attempt < 4) {
          console.warn(`  retry ${attempt}/4 ${r2Key}: ${e.message.slice(0, 80)}`);
          await sleep(600 * attempt);
        }
      }
    }
    if (!done) {
      failed++;
      console.error(`  FAIL ${r2Key}: ${lastErr?.message ?? 'unknown'}`);
    }
  }

  console.log('\n── Summary ──');
  console.log(` uploaded: ${ok}`);
  console.log(` skipped:  ${skipped}`);
  console.log(` missing:  ${missing}`);
  console.log(` failed:   ${failed}`);
  console.log(` CDN base: ${cfg.cdn}`);

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

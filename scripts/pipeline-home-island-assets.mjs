#!/usr/bin/env node
/**
 * Full home-island asset pipeline:
 *  1. Export organized nature from environment packs
 *  2. Generate biome review GLBs
 *  3. Publish SSOT catalogs → ObjectStore
 *  4. Upload all binaries + catalogs to R2
 *  5. Probe CDN for critical keys
 *
 * Usage:
 *   node scripts/pipeline-home-island-assets.mjs [--dry-run] [--force] [--skip-upload] [--skip-generate]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const SKIP_UPLOAD = process.argv.includes('--skip-upload');
const SKIP_GEN = process.argv.includes('--skip-generate');

function run(label, args) {
  console.log(`\n══ ${label} ══`);
  console.log(`> node ${args.join(' ')}`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`${label} failed with exit ${r.status}`);
  }
}

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 12000 }, (res) => {
      resolve({ url, status: res.statusCode, len: res.headers['content-length'] });
    });
    req.on('error', (e) => resolve({ url, status: 0, err: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 0, err: 'timeout' });
    });
    req.end();
  });
}

async function probeCdn() {
  const base = 'https://assets.grudge-studio.com';
  const keys = [
    '/models/environment/island_tree.glb',
    '/models/environment/island_rock.glb',
    '/models/environment/gem_cluster.glb',
    '/models/environment/harvest_stump.glb',
    '/models/evil_rock_mountain_peak_0.glb',
    '/models/nature/organized/trees/pine2_14.glb',
    '/models/nature/organized/rocks/rock_1.glb',
    '/models/nature/realistic/trees/pine/pine_a.glb',
    '/models/nature/realistic/rocks/boulder_a.glb',
    '/models/biomes/review/forest.glb',
    '/models/nature/CommonTree_1.glb', // still on CDN but banned in code
    '/catalogs/home-island/organized-nature-manifest.json',
  ];
  console.log('\n══ CDN probe ══');
  for (const k of keys) {
    const r = await head(base + k);
    const tag = r.status === 200 ? 'OK ' : 'MISS';
    console.log(`  ${tag} ${r.status} ${k}${r.len ? ` (${r.len}b)` : ''}${r.err ? ` ${r.err}` : ''}`);
  }
}

async function main() {
  if (!SKIP_GEN) {
    run('export organized nature', ['scripts/export-organized-nature.mjs']);
    run('generate biome review GLBs', ['scripts/generate-biome-review-glbs.mjs']);
    // Re-publish biome catalog after generator overwrites it with foundations note
    run('publish SSOT', ['scripts/publish-home-island-ssot.mjs']);
  }

  if (!SKIP_UPLOAD) {
    const args = ['scripts/upload-home-island-assets.mjs', '--skip-missing'];
    if (DRY) args.push('--dry-run');
    if (FORCE) args.push('--force');
    run('upload R2', args);
  }

  if (!DRY) {
    await probeCdn();
  }

  console.log('\nPipeline complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Publish home-island SSOT catalogs into GrudgeBuilder published/ + ObjectStore api/v1.
 *
 * Usage:
 *   node scripts/publish-home-island-ssot.mjs [--objectstore-only] [--no-objectstore]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLISHED = path.join(ROOT, 'shared', 'definitions', 'published');
const OBJECTSTORE = path.resolve(ROOT, '..', '..', '..', 'F:', 'GitHub', 'ObjectStore', 'api', 'v1');
// Prefer known ObjectStore path
const OBJECTSTORE_CANDIDATES = [
  path.join('F:', 'GitHub', 'ObjectStore', 'api', 'v1'),
  path.resolve(ROOT, '..', 'ObjectStore', 'api', 'v1'),
  process.env.OBJECTSTORE_API_V1 || '',
].filter(Boolean);

const NO_OS = process.argv.includes('--no-objectstore');
const OS_ONLY = process.argv.includes('--objectstore-only');

function resolveObjectStore() {
  for (const c of OBJECTSTORE_CANDIDATES) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function copyJson(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  ${path.basename(src)} → ${dest}`);
}

function main() {
  const files = [
    'biome-ecosystems.json',
    'home-island-contract.json',
    'organized-nature-manifest.json',
  ];

  const osDir = NO_OS ? null : resolveObjectStore();
  if (!NO_OS && !osDir) {
    console.warn('ObjectStore api/v1 not found — skipping OS copy (use --no-objectstore to silence)');
  } else if (osDir) {
    console.log('ObjectStore →', osDir);
  }

  for (const f of files) {
    const src = path.join(PUBLISHED, f);
    if (!fs.existsSync(src)) {
      console.warn(`  skip missing ${src}`);
      continue;
    }
    if (!OS_ONLY) {
      console.log(`published: ${f} (${fs.statSync(src).size}b)`);
    }
    if (osDir) {
      copyJson(src, path.join(osDir, f));
    }
  }

  // Ensure home-island-contract has nature/foundation notes if older
  console.log('Done. Commit/push ObjectStore separately if remote deploy needed.');
}

main();

#!/usr/bin/env node
/**
 * verify-production-assets — scan registered 3D asset paths for CDN/local presence.
 *
 * Sources:
 *   - client/src/lib/modelManifest.ts
 *   - client/src/island3d/objects/IslandResourceLoader.ts
 *   - client/src/game/sailing/ShipPrefabs.ts
 *   - client/src/game/sailing/FishManager.ts
 *
 * Run: node scripts/verify-production-assets.mjs [--cdn]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT_PUBLIC = path.join(ROOT, 'client', 'public');
const CDN_BASE = process.env.VITE_ASSETS_URL || 'https://assets.grudge-studio.com';
const useCdn = process.argv.includes('--cdn');

const SCAN_FILES = [
  'client/src/lib/modelManifest.ts',
  'client/src/island3d/objects/IslandResourceLoader.ts',
  'client/src/game/sailing/ShipPrefabs.ts',
  'client/src/game/sailing/FishManager.ts',
];

function extractPaths(content) {
  const paths = new Set();
  const patterns = [
    /['"`](\/(?:models|fish|textures|attached_assets)[^'"`]+)['"`]/g,
    /assetUrl\(['"`]([^'"`]+)['"`]\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) paths.add(m[1]);
  }
  return [...paths];
}

function localExists(rel) {
  const clean = rel.startsWith('/') ? rel.slice(1) : rel;
  return fs.existsSync(path.join(CLIENT_PUBLIC, clean));
}

async function cdnExists(rel) {
  const url = `${CDN_BASE}${rel.startsWith('/') ? rel : `/${rel}`}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

const allPaths = new Map();
for (const rel of SCAN_FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  for (const p of extractPaths(content)) {
    if (!allPaths.has(p)) allPaths.set(p, rel);
  }
}

let missing = 0;
let ok = 0;

console.log(`\nProduction asset verify — ${allPaths.size} registered paths`);
console.log(`Mode: ${useCdn ? `CDN (${CDN_BASE})` : 'local client/public'}\n`);

for (const [assetPath, source] of allPaths) {
  const exists = useCdn ? await cdnExists(assetPath) : localExists(assetPath);
  if (exists) {
    ok++;
  } else {
    missing++;
    console.log(`MISSING  ${assetPath}  (${source})`);
  }
}

console.log(`\n${ok} ok, ${missing} missing`);
process.exit(missing > 0 ? 1 : 0);
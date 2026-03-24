#!/usr/bin/env node
/**
 * migrate-assets.mjs
 *
 * Copies all media assets from Grudge-Builder client/public/ into the
 * ObjectStore repo, following the folder mapping defined in the plan.
 * Generates a JSON manifest of old-path → new-ObjectStore-path.
 *
 * Usage:
 *   node scripts/migrate-assets.mjs                       # dry-run (default)
 *   node scripts/migrate-assets.mjs --execute             # actually copy files
 *   node scripts/migrate-assets.mjs --execute --overwrite  # overwrite existing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────
const SRC_ROOT = path.resolve(__dirname, '..', 'client', 'public');
const DEST_ROOT = 'D:\\ObjectStore';
const MANIFEST_OUT = path.resolve(__dirname, '..', 'asset-migration-manifest.json');

const MEDIA_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.mp4', '.webm',
  '.mp3', '.wav', '.ogg', '.flac',
]);

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const OVERWRITE = args.includes('--overwrite');

// ── Folder mapping: source prefix → destination prefix ─────────────
// Paths are relative to their respective roots (SRC_ROOT / DEST_ROOT)
const FOLDER_MAP = [
  // assets/ sub-folders
  { src: 'assets/backgrounds', dest: 'backgrounds' },
  { src: 'assets/events',      dest: 'images/events' },
  { src: 'assets/misc',        dest: 'images/misc' },
  { src: 'assets/pirate',      dest: 'sprites/pirate' },
  { src: 'assets/portraits',   dest: 'images/portraits' },
  { src: 'assets/professions',  dest: 'images/professions' },
  { src: 'assets/ui',          dest: 'images/ui' },
  // top-level folders
  { src: 'icons',              dest: 'icons' },
  { src: 'sprites',            dest: 'sprites' },
  { src: 'lore',               dest: 'images/lore' },
  { src: 'avatars',            dest: 'images/avatars' },
  { src: 'terrain',            dest: 'images/terrain' },
];

// ── Helpers ─────────────────────────────────────────────────────────
function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (MEDIA_EXTS.has(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── Main ────────────────────────────────────────────────────────────
console.log(`\n🔍 Scanning ${SRC_ROOT} for media files...\n`);

const allFiles = walkDir(SRC_ROOT);
console.log(`   Found ${allFiles.length} media files\n`);

const manifest = {};
let copied = 0;
let skipped = 0;
let conflicts = 0;
let unmapped = 0;

// Also handle root-level files (e.g. logo.png)
const ROOT_FILES_DEST = 'branding';

for (const absPath of allFiles) {
  const relPath = path.relative(SRC_ROOT, absPath).replace(/\\/g, '/');

  // Find matching folder mapping
  let destRel = null;
  for (const map of FOLDER_MAP) {
    if (relPath.startsWith(map.src + '/') || relPath === map.src) {
      const remainder = relPath.slice(map.src.length);
      destRel = map.dest + remainder;
      break;
    }
  }

  // Root-level files (no folder prefix match)
  if (!destRel) {
    if (!relPath.includes('/')) {
      destRel = `${ROOT_FILES_DEST}/${relPath}`;
    } else {
      console.log(`   ⚠️  Unmapped: ${relPath}`);
      unmapped++;
      continue;
    }
  }

  const destAbs = path.join(DEST_ROOT, destRel);
  const webPath = '/' + destRel.replace(/\\/g, '/');

  // Check for existing file
  if (fs.existsSync(destAbs)) {
    const srcStat = fs.statSync(absPath);
    const destStat = fs.statSync(destAbs);
    if (srcStat.size === destStat.size && !OVERWRITE) {
      // Same file, skip
      manifest['/' + relPath] = webPath;
      skipped++;
      continue;
    }
    if (!OVERWRITE) {
      console.log(`   ⚡ Conflict (different size): ${relPath} → ${destRel}`);
      conflicts++;
      manifest['/' + relPath] = webPath;
      continue;
    }
  }

  manifest['/' + relPath] = webPath;

  if (EXECUTE) {
    ensureDir(path.dirname(destAbs));
    fs.copyFileSync(absPath, destAbs);
    copied++;
  } else {
    copied++;
  }
}

// Write manifest
fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2));

console.log(`\n✅ Migration ${EXECUTE ? 'complete' : 'dry-run complete (use --execute to copy)'}:`);
console.log(`   ${EXECUTE ? 'Copied' : 'Would copy'}: ${copied} files`);
console.log(`   Skipped (identical): ${skipped}`);
console.log(`   Conflicts (diff size, not overwritten): ${conflicts}`);
console.log(`   Unmapped: ${unmapped}`);
console.log(`   Manifest written to: ${MANIFEST_OUT}\n`);

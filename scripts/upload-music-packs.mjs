#!/usr/bin/env node
/**
 * Unzip + upload all music packs from D:/Games/Models to R2.
 *
 * Usage:
 *   node scripts/upload-music-packs.mjs [--dry-run] [--force] [--include-wav]
 *   node scripts/upload-music-packs.mjs --pack pirate [--dry-run]
 *   node scripts/upload-music-packs.mjs --unzip-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { MUSIC_PACKS, resolvePackSource } from './music-packs.config.mjs';
import { loadEnvFile, uploadMusicPack } from './lib/musicPackUpload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
loadEnvFile(path.join(root, '.env.local'));
loadEnvFile(path.join(root, '.env'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const INCLUDE_WAV = args.includes('--include-wav');
const UNZIP_ONLY = args.includes('--unzip-only');
const packArg = args.find((a) => a.startsWith('--pack='))?.split('=')[1]
  ?? (args.includes('--pack') ? args[args.indexOf('--pack') + 1] : null);

const packs = packArg
  ? MUSIC_PACKS.filter((p) => p.id === packArg)
  : MUSIC_PACKS;

if (!packs.length) {
  console.error(`Unknown pack: ${packArg}. Available: ${MUSIC_PACKS.map((p) => p.id).join(', ')}`);
  process.exit(1);
}

function unzipPack(pack) {
  if (!pack.zip || !fs.existsSync(pack.zip)) {
    if (pack.sourceFallback && fs.existsSync(pack.sourceFallback)) {
      fs.mkdirSync(pack.staging, { recursive: true });
      console.log(`[${pack.id}] using sourceFallback (no zip)`);
      return true;
    }
    console.warn(`[${pack.id}] zip missing: ${pack.zip}`);
    return false;
  }
  if (fs.existsSync(pack.staging) && resolvePackSource(pack) === pack.staging) {
    const hasFiles = fs.readdirSync(pack.staging).length > 0;
    if (hasFiles) {
      console.log(`[${pack.id}] staging exists, skip unzip`);
      return true;
    }
  }
  fs.mkdirSync(pack.staging, { recursive: true });
  console.log(`[${pack.id}] unzipping ${pack.zip} → ${pack.staging}`);
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${pack.zip.replace(/'/g, "''")}' -DestinationPath '${pack.staging.replace(/'/g, "''")}' -Force"`,
    { stdio: 'inherit' },
  );
  return true;
}

let totalFailed = 0;

for (const pack of packs) {
  if (pack.id === 'boss-battle-v2' && !packArg && !FORCE) {
    console.log(`\n── ${pack.label}: skip (already uploaded; use --pack=boss-battle-v2 --force to redo)`);
    continue;
  }

  unzipPack(pack);
  if (UNZIP_ONLY) continue;

  const sourceDir = resolvePackSource(pack);
  if (pack.id === 'free-action' && !fs.existsSync(sourceDir)) {
    const fb = pack.sourceFallback;
    if (fb && fs.existsSync(fb)) {
      fs.mkdirSync(pack.staging, { recursive: true });
      for (const f of fs.readdirSync(fb).filter((n) => n.endsWith('.wav'))) {
        fs.copyFileSync(path.join(fb, f), path.join(pack.staging, f));
      }
    }
  }

  try {
    const result = await uploadMusicPack({
      packMeta: pack,
      sourceDir: resolvePackSource(pack),
      dryRun: DRY_RUN,
      force: FORCE,
      includeWav: INCLUDE_WAV,
      rootDir: root,
    });
    console.log(`Done ${pack.id}: ${result.uploaded} up, ${result.skipped} skip, ${result.failed} fail`);
    totalFailed += result.failed;
  } catch (err) {
    console.error(`[${pack.id}] ${err.message}`);
    totalFailed++;
  }
}

if (UNZIP_ONLY) {
  console.log('\nUnzip complete.');
} else if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('\nAll music packs processed.');
}
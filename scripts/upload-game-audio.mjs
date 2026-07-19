#!/usr/bin/env node
/**
 * Upload ObjectStore/audio → R2 grudge-assets/audio/*
 *
 *   node scripts/upload-game-audio.mjs
 *   node scripts/upload-game-audio.mjs --dry-run
 *
 * Layout:
 *   audio/fx/*          curated combat/UI
 *   audio/music/*
 *   audio/*.ogg|mp3|wav root BGM/stingers
 *   audio/sfx/pack/*    selected pack OGGs (hit, jump, blip, …)
 *   audio/catalog/game-audio-events.json
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OS_AUDIO = path.resolve(ROOT, '..', 'ObjectStore', 'audio');
const CDN_DIR = path.join(ROOT, 'workers', 'cdn');
const BUCKET = 'grudge-assets';
const DRY = process.argv.includes('--dry-run');

function put(key, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    console.warn('skip missing', filePath);
    return false;
  }
  console.log(DRY ? '[dry]' : '→', key);
  if (DRY) return true;
  const r = spawnSync(
    'npx',
    [
      'wrangler',
      'r2',
      'object',
      'put',
      `${BUCKET}/${key}`,
      `--file=${filePath}`,
      `--content-type=${contentType}`,
      '--remote',
    ],
    { cwd: fs.existsSync(CDN_DIR) ? CDN_DIR : ROOT, shell: true, stdio: 'inherit' },
  );
  return r.status === 0;
}

function ct(file) {
  const e = path.extname(file).toLowerCase();
  if (e === '.ogg') return 'audio/ogg';
  if (e === '.mp3') return 'audio/mpeg';
  if (e === '.wav') return 'audio/wav';
  if (e === '.flac') return 'audio/flac';
  return 'application/octet-stream';
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(ogg|mp3|wav)$/i.test(ent.name)) out.push(full);
  }
  return out;
}

const uploads = [];

// Root audio files
for (const f of walk(OS_AUDIO).filter((p) => path.dirname(p) === OS_AUDIO)) {
  uploads.push({ key: `audio/${path.basename(f)}`, file: f });
}

// fx/
for (const f of walk(path.join(OS_AUDIO, 'fx'))) {
  uploads.push({ key: `audio/fx/${path.basename(f)}`, file: f });
}

// music/
for (const f of walk(path.join(OS_AUDIO, 'music'))) {
  uploads.push({ key: `audio/music/${path.basename(f)}`, file: f });
}

// Curated pack OGGs → flat names
const packRoot = path.join(OS_AUDIO, 'sfx', 'Sound effects Pack 2');
const packMap = [
  ['Hit', 'hit'],
  ['Jump', 'jump'],
  ['Blip', 'blip'],
  ['1up', 'powerup'],
  ['Explosions', 'explosion'],
  ['Teleport', 'teleport'],
  ['Power-up', 'powerup2'],
  ['Lose', 'lose'],
  ['Coins', 'coin'],
  ['Laser-weapon', 'laser'],
];
for (const [folder, slug] of packMap) {
  const oggDir = path.join(packRoot, folder, 'OGG');
  if (!fs.existsSync(oggDir)) continue;
  const files = fs.readdirSync(oggDir).filter((n) => n.endsWith('.ogg')).slice(0, 5);
  files.forEach((name, i) => {
    uploads.push({
      key: `audio/sfx/pack/${slug}_${i + 1}.ogg`,
      file: path.join(oggDir, name),
    });
  });
}

// Catalog JSON from definitions (static copy)
const catalogSrc = path.join(ROOT, 'shared', 'definitions', 'gameAudioCatalog.ts');
const catalogOut = path.join(ROOT, 'client', 'public', 'audio-catalog.json');
// Minimal runtime catalog for CDN
const eventsPath = path.join(OS_AUDIO, '..'); // unused
const catalogJson = {
  version: '1.0.0',
  updated: new Date().toISOString().slice(0, 10),
  cdnBase: 'https://assets.grudge-studio.com',
  note: 'See shared/definitions/gameAudioCatalog.ts for full event map',
  keys: uploads.map((u) => u.key),
};
fs.mkdirSync(path.dirname(catalogOut), { recursive: true });
fs.writeFileSync(catalogOut, JSON.stringify(catalogJson, null, 2));
uploads.push({ key: 'audio/catalog/game-audio-keys.json', file: catalogOut });

console.log(`Uploading ${uploads.length} audio objects to R2…`);
let ok = 0;
for (const u of uploads) {
  if (put(u.key, u.file, ct(u.file))) ok++;
}
console.log(`Done ${ok}/${uploads.length}`);
console.log('CDN example: https://assets.grudge-studio.com/audio/fx/magic_cast.ogg');

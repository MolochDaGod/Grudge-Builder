#!/usr/bin/env node
/**
 * Boss Battle Music Pack Vol. 2 → R2 (grudge-assets)
 * CDN: https://assets.grudge-studio.com/audio/music/boss-battle-v2/
 *
 * Best practice: upload OGG + MP3 only (pack ships all three; WAV is ~4× larger).
 * Games stream via HTMLAudioElement — no bundling on Vercel.
 *
 * Usage:
 *   node scripts/upload-boss-battle-music-v2.mjs [--dry-run] [--force] [--include-wav]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const INCLUDE_WAV = process.argv.includes('--include-wav');

const SOURCE_CANDIDATES = [
  'D:/Games/Models/_staging/boss-battle-music-v2',
  path.join(__dirname, '..', 'client', 'public', 'audio', 'music', 'boss-battle-v2', '_source'),
];

const R2_PREFIX = 'audio/music/boss-battle-v2';
const CDN_BASE = 'https://assets.grudge-studio.com';
const ALLOWED_EXT = INCLUDE_WAV ? new Set(['.ogg', '.mp3', '.wav']) : new Set(['.ogg', '.mp3']);

const MIME = {
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const root = path.resolve(__dirname, '..');
loadEnvFile(path.join(root, '.env.local'));
loadEnvFile(path.join(root, '.env'));

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET;
const BUCKET = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET_ASSETS || 'grudge-assets';
const ENDPOINT = process.env.R2_S3_ENDPOINT
  || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : null);

const sourceDir = SOURCE_CANDIDATES.find((d) => fs.existsSync(d));
if (!sourceDir) {
  console.error('Boss Battle Music source not found. Unzip to D:/Games/Models/_staging/boss-battle-music-v2');
  process.exit(1);
}

if (!DRY_RUN && (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !ENDPOINT)) {
  console.error('Missing R2 credentials in .env / .env.local');
  process.exit(1);
}

/** Slug a relative path; only strips the final file extension (not `1. Track Name`). */
function slugPath(relPath) {
  const base = relPath.replace(/\.[^./\\]+$/, '');
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function md5File(filePath) {
  const hash = crypto.createHash('md5');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/** @type {{ localPath: string, r2Key: string, bytes: number, section: string, format: string, label: string, slug: string }[]} */
const entries = [];

for (const section of ['Tracks', 'Loops', 'Advanced']) {
  const sectionPath = path.join(sourceDir, section);
  if (!fs.existsSync(sectionPath)) continue;
  const sectionSlug = section.toLowerCase();

  const walk = (dir, relParts) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, [...relParts, ent.name]);
        continue;
      }
      const ext = path.extname(ent.name).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) continue;

      const relFromSection = path.relative(sectionPath, full).split(path.sep).join('/');
      const formatFolder = relParts.find((p) => /^(ogg|mp3|wav)$/i.test(p));
      const format = (formatFolder || ext.slice(1)).toLowerCase();
      const labelParts = relParts.filter((p) => !/^(ogg|mp3|wav)$/i.test(p));
      const label = [...labelParts, ent.name].join(' / ');
      const slug = formatFolder ? slugPath(ent.name) : slugPath(relFromSection);
      const r2Key = `${R2_PREFIX}/${sectionSlug}/${format}/${slug}${ext}`;

      const stat = fs.statSync(full);
      entries.push({
        localPath: full,
        r2Key,
        bytes: stat.size,
        section: sectionSlug,
        format,
        label,
        slug,
      });
    }
  };

  walk(sectionPath, []);
}

if (!entries.length) {
  console.error('No audio files found under', sourceDir);
  process.exit(1);
}

entries.sort((a, b) => a.r2Key.localeCompare(b.r2Key));

const totalMb = entries.reduce((s, e) => s + e.bytes, 0) / (1024 * 1024);
console.log(`Source: ${sourceDir}`);
console.log(`Bucket: ${BUCKET}`);
console.log(`CDN: ${CDN_BASE}/${R2_PREFIX}/`);
console.log(`Formats: ${[...ALLOWED_EXT].join(', ')}`);
console.log(`Files: ${entries.length} (${totalMb.toFixed(1)} MB)`);

/** Group manifest for game loaders */
const manifest = {
  version: '1.0.0',
  pack: 'Boss Battle Music Pack Vol. 2',
  prefix: R2_PREFIX,
  cdnBase: `${CDN_BASE}/${R2_PREFIX}`,
  streaming: {
    recommendation: 'Use HTMLAudioElement with loop=true for loops; fetch manifest.json at boot',
    preferredFormat: 'ogg',
    fallbackFormat: 'mp3',
    skipWavOnWeb: !INCLUDE_WAV,
  },
  sections: ['tracks', 'loops', 'advanced'],
  totalFiles: entries.length,
  uploadedAt: new Date().toISOString(),
  bySlug: {},
  files: [],
};

for (const entry of entries) {
  const cdnUrl = `${CDN_BASE}/${entry.r2Key}`;
  const rec = {
    slug: entry.slug,
    section: entry.section,
    format: entry.format,
    label: entry.label,
    r2Key: entry.r2Key,
    cdnUrl,
    bytes: entry.bytes,
  };
  manifest.files.push(rec);
  if (!manifest.bySlug[entry.slug]) {
    manifest.bySlug[entry.slug] = { slug: entry.slug, label: entry.label, section: entry.section, urls: {} };
  }
  manifest.bySlug[entry.slug].urls[entry.format] = cdnUrl;
}

let uploaded = 0;
let skipped = 0;
let failed = 0;

if (!DRY_RUN) {
  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: ENDPOINT,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    forcePathStyle: true,
  });

  for (const entry of entries) {
    if (!FORCE) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: entry.r2Key }));
        if (head.ContentLength === entry.bytes) {
          skipped++;
          continue;
        }
      } catch {
        /* upload */
      }
    }

    const body = fs.readFileSync(entry.localPath);
    const ext = path.extname(entry.localPath).toLowerCase();
    let ok = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await client.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: entry.r2Key,
          Body: body,
          ContentType: MIME[ext] || 'application/octet-stream',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            category: 'music',
            'source-pack': 'boss-battle-v2',
            'source-hash': md5File(entry.localPath),
          },
        }));
        console.log(`  OK ${entry.r2Key} (${(body.length / 1024).toFixed(0)} KB)`);
        uploaded++;
        ok = true;
        break;
      } catch (err) {
        if (attempt === 5) {
          console.error(`  FAIL ${entry.r2Key}:`, err.message || err);
          failed++;
        } else {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }
    if (!ok) continue;
  }

  const manifestBody = JSON.stringify(manifest, null, 2);
  const manifestKey = `${R2_PREFIX}/manifest.json`;
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: manifestKey,
    Body: manifestBody,
    ContentType: 'application/json',
    CacheControl: 'public, max-age=3600',
  }));
  console.log(`\nManifest: ${CDN_BASE}/${manifestKey}`);
} else {
  for (const entry of entries) {
    console.log(`  [dry-run] ${entry.r2Key} (${(entry.bytes / 1024).toFixed(0)} KB)`);
    uploaded++;
  }
  const out = path.join(root, 'dist', 'boss-battle-music-v2-manifest.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log(`\n[dry-run] Wrote ${out}`);
}

console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
if (failed > 0) process.exit(1);
#!/usr/bin/env node
/**
 * Upload 4K PBR ground materials to R2 (grudge-assets).
 * CDN: https://assets.grudge-studio.com/textures/pbr/ground/
 *
 * Usage: node scripts/upload-pbr-ground-textures.mjs [--dry-run] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const SOURCE_CANDIDATES = [
  path.join(__dirname, '..', 'client', 'public', 'textures', 'pbr', 'ground'),
  'C:/Users/nugye/Documents/free-4k-pbr-materials-10-ground-materials-release',
  'C:/Users/nugye/Documents/grudge-studio-publish/public/textures/pbr/ground',
];

const R2_PREFIX = 'textures/pbr/ground';
const CDN_BASE = 'https://assets.grudge-studio.com';

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
  console.error('No PBR source folder found. Run: npm run sync:textures in grudge-studio-publish first.');
  process.exit(1);
}

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !ENDPOINT) {
  console.error('Missing R2 credentials in .env');
  process.exit(1);
}

const files = fs.readdirSync(sourceDir).filter((f) => f.startsWith('Ground_') && f.endsWith('.png'));
if (!files.length) {
  console.error('No Ground_*.png in', sourceDir);
  process.exit(1);
}

const { S3Client, PutObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

console.log(`Source: ${sourceDir}`);
console.log(`Bucket: ${BUCKET}`);
console.log(`CDN: ${CDN_BASE}/${R2_PREFIX}/`);
console.log(`Files: ${files.length}`);

const manifest = {
  version: '1.0.0',
  materials: 10,
  mapsPerMaterial: 6,
  prefix: R2_PREFIX,
  cdnBase: `${CDN_BASE}/${R2_PREFIX}`,
  files: {},
  uploadedAt: new Date().toISOString(),
};

let uploaded = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const r2Key = `${R2_PREFIX}/${file}`;
  const localPath = path.join(sourceDir, file);
  const stat = fs.statSync(localPath);
  const cdnUrl = `${CDN_BASE}/${r2Key}`;
  manifest.files[file] = { cdnUrl, bytes: stat.size };

  if (DRY_RUN) {
    console.log(`  [dry-run] ${r2Key} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
    uploaded++;
    continue;
  }

  if (!FORCE) {
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: r2Key }));
      if (head.ContentLength === stat.size) {
        console.log(`  cached ${file}`);
        skipped++;
        continue;
      }
    } catch {
      /* upload */
    }
  }

  const body = fs.readFileSync(localPath);
  let ok = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: r2Key,
        Body: body,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      console.log(`  OK ${file} (${(body.length / 1024 / 1024).toFixed(1)} MB)`);
      uploaded++;
      ok = true;
      break;
    } catch (err) {
      if (attempt === 5) {
        console.error(`  FAIL ${file}:`, err.message || err);
        failed++;
      } else {
        const wait = attempt * 3000;
        console.log(`  retry ${file} ${attempt}/5 in ${wait}ms (${err.code || err.message})`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  if (!ok) continue;
}

const manifestBody = JSON.stringify(manifest, null, 2);
const manifestKey = `${R2_PREFIX}/manifest.json`;
const indexKey = `${R2_PREFIX}/index.json`;

if (!DRY_RUN && (uploaded > 0 || skipped > 0)) {
  for (const key of [manifestKey, indexKey]) {
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: manifestBody,
      ContentType: 'application/json',
      CacheControl: 'public, max-age=3600',
    }));
  }
  console.log(`\nManifest: ${CDN_BASE}/${manifestKey}`);
  console.log(`Index (folder browse): ${CDN_BASE}/${R2_PREFIX}/`);
}

console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
if (failed > 0) process.exit(1);
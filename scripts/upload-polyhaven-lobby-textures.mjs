#!/usr/bin/env node
/**
 * Mirror Poly Haven lobby PBR maps to R2 (grudge-assets bucket).
 * Serves at: https://assets.grudge-studio.com/textures/polyhaven/lobby/{layer}/{map}.jpg
 *
 * Requires: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 * Usage: node scripts/upload-polyhaven-lobby-textures.mjs [--dry-run] [--resolution 2k]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const RES = (process.argv.find((a) => a.startsWith('--resolution='))?.split('=')[1])
  || process.argv[process.argv.indexOf('--resolution') + 1]
  || '2k';

const LOBBY_ASSETS = {
  beach: 'coast_sand_01',
  grass: 'forest_ground_04',
  forest: 'brown_mud_leaves_01',
  rock: 'coast_sand_rocks_02',
  ore: 'brown_mud_rocks_01',
  path: 'dirt_floor',
  building: 'defense_wall',
  seafloor: 'coral_ground_02',
};

const MAP_KINDS = [
  ['diff', 'Diffuse'],
  ['nor_gl', 'nor_gl'],
  ['rough', 'Rough'],
  ['ao', 'AO'],
];

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

const USER_AGENT = 'GrudgeWarlords/1.0 (grudgewarlords.com)';
const CDN_BASE = process.env.OBJECT_STORAGE_PUBLIC_URL || 'https://assets.grudge-studio.com';
const R2_PREFIX = 'textures/polyhaven/lobby';

async function fetchPolyHavenFiles(assetId) {
  const res = await fetch(`https://api.polyhaven.com/files/${assetId}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Poly Haven files/${assetId}: ${res.status}`);
  return res.json();
}

function resolveJpgUrl(files, kind) {
  const entry = files[kind]?.[RES]?.jpg ?? files[kind]?.[RES]?.png;
  return entry?.url ?? null;
}

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Download ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !ENDPOINT) {
  console.error('Missing R2 credentials — set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

const { S3Client, PutObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

console.log(`Endpoint: ${ENDPOINT}`);
console.log(`Bucket: ${BUCKET}`);
console.log(`Resolution: ${RES}`);
console.log(`CDN prefix: ${CDN_BASE}/${R2_PREFIX}/`);

const manifest = { resolution: RES, layers: {}, uploadedAt: new Date().toISOString() };

for (const [layer, assetId] of Object.entries(LOBBY_ASSETS)) {
  console.log(`\n[${layer}] ${assetId}`);
  const files = await fetchPolyHavenFiles(assetId);
  manifest.layers[layer] = { assetId, maps: {} };

  for (const [shortName, phKind] of MAP_KINDS) {
    const srcUrl = resolveJpgUrl(files, phKind);
    if (!srcUrl) {
      console.log(`  skip ${shortName} (no ${RES} file)`);
      continue;
    }

    const r2Key = `${R2_PREFIX}/${layer}/${shortName}.jpg`;
    const cdnUrl = `${CDN_BASE}/${r2Key}`;

    if (!DRY_RUN) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: r2Key }));
        if (head.ContentLength > 0) {
          console.log(`  ${shortName}: cached (${(head.ContentLength / 1024).toFixed(0)} KB)`);
          manifest.layers[layer].maps[shortName] = cdnUrl;
          continue;
        }
      } catch {
        /* upload */
      }

      const body = await downloadBuffer(srcUrl);
      let uploaded = false;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await client.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: r2Key,
            Body: body,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000, immutable',
          }));
          uploaded = true;
          break;
        } catch (err) {
          if (attempt === 5) throw err;
          const wait = attempt * 2000;
          console.log(`  ${shortName}: retry ${attempt}/5 in ${wait}ms (${err.code || err.message})`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      if (uploaded) console.log(`  ${shortName}: uploaded ${(body.length / 1024).toFixed(0)} KB`);
    } else {
      console.log(`  ${shortName}: would upload → ${r2Key}`);
    }

    manifest.layers[layer].maps[shortName] = cdnUrl;
  }
}

const manifestKey = `${R2_PREFIX}/manifest.json`;
if (!DRY_RUN) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: manifestKey,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=3600',
  }));
  console.log(`\nManifest: ${CDN_BASE}/${manifestKey}`);
} else {
  console.log('\nDry run — no uploads.');
}

console.log('Done.');
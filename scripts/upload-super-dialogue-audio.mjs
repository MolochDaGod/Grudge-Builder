#!/usr/bin/env node
/**
 * Upload Super Dialogue Audio Pack v1 to R2 (grudge-assets).
 * CDN: https://assets.grudge-studio.com/audio/dialogue/super-pack/
 *
 * Usage: node scripts/upload-super-dialogue-audio.mjs [--dry-run] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const SOURCE_CANDIDATES = [
  'C:/Users/nugye/Documents/advance_wars_infantry__mech_units/organized/audio/Super_Dialogue_Audio_Pack_v1/Super Dialogue Audio Pack v1/Step 2 - Audio Files',
  path.join(__dirname, '..', 'client', 'public', 'audio', 'dialogue', 'super-pack'),
];

const R2_PREFIX = 'audio/dialogue/super-pack';
const CDN_BASE = 'https://assets.grudge-studio.com';

const CATEGORY_MAP = {
  '1 - Completion': 'completion',
  '2 - Confirmation': 'confirmation',
  '3 - Greeting': 'greeting',
  '4 - Farewell': 'farewell',
  '5 - Refusal': 'refusal',
  '6 - Miscellaneous': 'miscellaneous',
  '7 - Damage': 'damage',
  '8 - Death': 'death',
  '9 - Grunting': 'grunting',
  '10 - Shouting': 'shouting',
};

const ACTOR_SLUG = {
  'Karen Cenon': 'karen-cenon',
  'Meghan Christian': 'meghan-christian',
  'Alex Brodie': 'alex-brodie',
  'Ian Lampert': 'ian-lampert',
  'Sean Lenhart': 'sean-lenhart',
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
  console.error('No Super Dialogue source folder found.');
  process.exit(1);
}

if (!DRY_RUN && (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !ENDPOINT)) {
  console.error('Missing R2 credentials in .env');
  process.exit(1);
}

/** @type {{ localPath: string, r2Key: string, bytes: number, category: string, gender: string, actor: string, file: string }[]} */
const entries = [];

for (const [srcFolder, category] of Object.entries(CATEGORY_MAP)) {
  const catPath = path.join(sourceDir, srcFolder);
  if (!fs.existsSync(catPath)) continue;

  for (const gender of ['Male', 'Female']) {
    const genderPath = path.join(catPath, gender);
    if (!fs.existsSync(genderPath)) continue;
    const genderSlug = gender.toLowerCase();

    for (const actorDir of fs.readdirSync(genderPath, { withFileTypes: true })) {
      if (!actorDir.isDirectory()) continue;
      const actorName = actorDir.name;
      const actorSlug = ACTOR_SLUG[actorName];
      if (!actorSlug) {
        console.warn(`Unknown actor folder: ${actorName}`);
        continue;
      }

      const actorPath = path.join(genderPath, actorName);
      for (const file of fs.readdirSync(actorPath).filter((f) => f.endsWith('.wav'))) {
        const localPath = path.join(actorPath, file);
        const stat = fs.statSync(localPath);
        const r2Key = `${R2_PREFIX}/${category}/${genderSlug}/${actorSlug}/${file}`;
        entries.push({
          localPath,
          r2Key,
          bytes: stat.size,
          category,
          gender: genderSlug,
          actor: actorSlug,
          file,
        });
      }
    }
  }
}

if (!entries.length) {
  console.error('No .wav files found under', sourceDir);
  process.exit(1);
}

console.log(`Source: ${sourceDir}`);
console.log(`Bucket: ${BUCKET}`);
console.log(`CDN: ${CDN_BASE}/${R2_PREFIX}/`);
console.log(`Files: ${entries.length}`);

const manifest = {
  version: '1.0.0',
  pack: 'Super Dialogue Audio Pack v1',
  prefix: R2_PREFIX,
  cdnBase: `${CDN_BASE}/${R2_PREFIX}`,
  categories: Object.values(CATEGORY_MAP),
  actors: Object.values(ACTOR_SLUG),
  totalFiles: entries.length,
  uploadedAt: new Date().toISOString(),
  files: {},
};

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
    const cdnUrl = `${CDN_BASE}/${entry.r2Key}`;
    manifest.files[entry.file] = {
      cdnUrl,
      r2Key: entry.r2Key,
      category: entry.category,
      gender: entry.gender,
      actor: entry.actor,
      bytes: entry.bytes,
    };

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
    let ok = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await client.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: entry.r2Key,
          Body: body,
          ContentType: 'audio/wav',
          CacheControl: 'public, max-age=31536000, immutable',
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
          const wait = attempt * 2000;
          console.log(`  retry ${entry.file} ${attempt}/5 in ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }
    if (!ok) continue;
  }

  const manifestBody = JSON.stringify(manifest, null, 2);
  const manifestKey = `${R2_PREFIX}/manifest.json`;
  const indexKey = `${R2_PREFIX}/index.json`;
  const folderKey = `${R2_PREFIX}/`;

  if (uploaded > 0 || skipped > 0) {
    for (const key of [manifestKey, indexKey, folderKey]) {
      await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: manifestBody,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=3600',
      }));
    }
    console.log(`\nManifest: ${CDN_BASE}/${manifestKey}`);
    console.log(`Index: ${CDN_BASE}/${R2_PREFIX}/`);
  }
} else {
  for (const entry of entries) {
    manifest.files[entry.file] = {
      cdnUrl: `${CDN_BASE}/${entry.r2Key}`,
      r2Key: entry.r2Key,
      category: entry.category,
      gender: entry.gender,
      actor: entry.actor,
      bytes: entry.bytes,
    };
    console.log(`  [dry-run] ${entry.r2Key} (${(entry.bytes / 1024).toFixed(0)} KB)`);
    uploaded++;
  }
}

console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
if (failed > 0) process.exit(1);
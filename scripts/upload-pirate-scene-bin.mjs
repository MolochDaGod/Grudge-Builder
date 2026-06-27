#!/usr/bin/env node
/**
 * Upload Chicken Gun pirate-islands scene.bin (132MB) to R2 via S3 multipart API.
 * Requires: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in env.
 *
 * Usage: node scripts/upload-pirate-scene-bin.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

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

const ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
// R2 S3 API tokens are 32-char access keys — prefer them over ObjectStore keys.
const ACCESS_KEY =
  process.env.R2_ACCESS_KEY_ID
  || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  || process.env.OBJECT_STORAGE_KEY;
const SECRET_KEY =
  process.env.R2_SECRET_ACCESS_KEY
  || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  || process.env.OBJECT_STORAGE_SECRET;
const BUCKET =
  process.env.R2_BUCKET_NAME
  || process.env.R2_BUCKET_ASSETS
  || process.env.OBJECT_STORAGE_BUCKET
  || 'grudge-assets';

const LOCAL_CANDIDATES = [
  process.env.PIRATE_SCENE_BIN,
  'D:/Games/Models/scene.bin',
  path.resolve(__dirname, '../public/models/lobby/pirate-islands/scene.bin'),
  'C:/Users/nugye/Documents/chicken_gun_pirateislands/scene.bin',
].filter(Boolean);
const LOCAL_FILE = LOCAL_CANDIDATES.find((p) => fs.existsSync(p));
const R2_KEY = 'models/lobby/pirate-islands/scene.bin';

if (!LOCAL_FILE) {
  console.error(`Missing scene.bin — tried:\n  ${LOCAL_CANDIDATES.join('\n  ')}`);
  process.exit(1);
}

const stat = fs.statSync(LOCAL_FILE);
console.log(`File: ${LOCAL_FILE} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`Target: s3://${BUCKET}/${R2_KEY}`);

if (DRY_RUN) {
  console.log('Dry run — no upload.');
  process.exit(0);
}

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error(
    'Missing R2 credentials. Set CLOUDFLARE_ACCOUNT_ID (or CF_ACCOUNT_ID) and '
    + 'R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (or OBJECT_STORAGE_KEY / OBJECT_STORAGE_SECRET) in .env',
  );
  process.exit(1);
}

const { S3Client, HeadObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');

function resolveR2Endpoint(accountId) {
  const candidates = [
    process.env.R2_S3_ENDPOINT,
    process.env.OBJECT_STORAGE_ENDPOINT,
  ].filter(Boolean);
  for (const raw of candidates) {
    // ObjectStore worker URL is NOT the S3-compatible R2 API.
    if (/objectstore\.grudge-studio\.com/i.test(raw)) continue;
    if (/\.r2\.cloudflarestorage\.com/i.test(raw)) return raw;
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

const endpoint = resolveR2Endpoint(ACCOUNT_ID);
console.log(`Endpoint: ${endpoint}`);
const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
  maxAttempts: 6,
});

try {
  const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: R2_KEY }));
  const localMd5 = crypto.createHash('md5').update(fs.readFileSync(LOCAL_FILE)).digest('hex');
  const etag = (head.ETag || '').replace(/"/g, '');
  if (etag === localMd5) {
    console.log('Already on R2 with matching ETag — skip.');
    process.exit(0);
  }
  console.log(`Remote ETag ${etag} != local md5 ${localMd5} — re-uploading.`);
} catch {
  console.log('Object not on R2 yet — uploading.');
}

const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = await import('@aws-sdk/client-s3');

/** R2/S3 minimum multipart part size (except the last part). */
const PART_SIZE = 5 * 1024 * 1024;
const fd = fs.openSync(LOCAL_FILE, 'r');
const totalParts = Math.ceil(stat.size / PART_SIZE);

async function runMultipartUpload(run) {
  let uploadId;
  try {
    console.log(`\nMultipart run ${run}…`);
    const created = await client.send(new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: R2_KEY,
      ContentType: 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    uploadId = created.UploadId;
    if (!uploadId) throw new Error('No UploadId from CreateMultipartUpload');

    const parts = [];
    for (let part = 1; part <= totalParts; part++) {
      const start = (part - 1) * PART_SIZE;
      const len = Math.min(PART_SIZE, stat.size - start);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, start);

      let etag;
      for (let attempt = 1; attempt <= 15; attempt++) {
        try {
          const res = await client.send(new UploadPartCommand({
            Bucket: BUCKET,
            Key: R2_KEY,
            UploadId: uploadId,
            PartNumber: part,
            Body: buf,
            ContentLength: len,
          }));
          etag = res.ETag;
          break;
        } catch (err) {
          if (attempt === 15) throw err;
          const wait = Math.min(20000, 2000 * attempt);
          console.warn(`\nPart ${part} retry ${attempt}: ${err?.message ?? err}`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      parts.push({ ETag: etag, PartNumber: part });
      const pct = Math.round((part / totalParts) * 100);
      process.stdout.write(`\rUploading… ${pct}% (part ${part}/${totalParts})`);
    }

    await client.send(new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: R2_KEY,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }));
    return true;
  } catch (err) {
    if (uploadId) {
      try {
        await client.send(new AbortMultipartUploadCommand({
          Bucket: BUCKET,
          Key: R2_KEY,
          UploadId: uploadId,
        }));
      } catch { /* ignore */ }
    }
    throw err;
  }
}

try {
  for (let run = 1; run <= 5; run++) {
    try {
      await runMultipartUpload(run);
      console.log(`\nDone: https://assets.grudge-studio.com/${R2_KEY}`);
      process.exit(0);
    } catch (err) {
      console.warn(`\nRun ${run} failed: ${err?.message ?? err}`);
      if (run === 5) throw err;
      await new Promise((r) => setTimeout(r, 5000 * run));
    }
  }
} finally {
  fs.closeSync(fd);
}
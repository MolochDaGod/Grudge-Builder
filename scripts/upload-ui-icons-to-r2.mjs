#!/usr/bin/env node
/**
 * Upload small UI icons (tomes, gbux token) to R2 grudge-assets.
 * Run: node scripts/upload-ui-icons-to-r2.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

for (const f of ['.env.local', '.env']) {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) continue;
  for (const line of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const dryRun = process.argv.includes('--dry-run');
const account = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const key = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY;
const secret = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET;
const endpoint =
  process.env.R2_S3_ENDPOINT ||
  (account ? `https://${account}.r2.cloudflarestorage.com` : null);
const bucket = process.env.R2_BUCKET_ASSETS || 'grudge-assets';

if (!endpoint || !key || !secret) {
  console.error('Missing R2 credentials (R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId: key, secretAccessKey: secret },
  forcePathStyle: true,
});

const mappings = [
  {
    source: path.join(root, 'client/public/icons/tomes'),
    prefix: 'icons/tomes',
  },
  {
    source: path.join(root, 'client/public/sprites'),
    prefix: 'sprites',
    filter: (name) => name === 'gbux-token.png',
  },
];

async function uploadFile(localPath, r2Key, contentType) {
  if (dryRun) {
    console.log(`[dry-run] ${r2Key}`);
    return;
  }
  const body = fs.readFileSync(localPath);
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: r2Key }));
    const etag = head.ETag?.replace(/"/g, '');
    const localHash = Buffer.from(body).toString('base64').slice(0, 8);
    if (etag && head.ContentLength === body.length) {
      console.log(`skip (exists) ${r2Key}`);
      return;
    }
    void localHash;
  } catch {
    /* new object */
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  console.log(`uploaded ${r2Key}`);
}

for (const map of mappings) {
  if (!fs.existsSync(map.source)) {
    console.warn(`skip missing ${map.source}`);
    continue;
  }
  const files = fs.readdirSync(map.source).filter((f) => f.endsWith('.png'));
  for (const file of files) {
    if (map.filter && !map.filter(file)) continue;
    const r2Key = `${map.prefix}/${file}`;
    await uploadFile(path.join(map.source, file), r2Key, 'image/png');
  }
}

console.log('done');
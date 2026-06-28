#!/usr/bin/env node
/** Upload index at textures/pbr/ground/index.json AND literal folder key for CDN browse */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const bucket = process.env.R2_BUCKET_ASSETS || 'grudge-assets';
let body;
const manifestPath = path.join(root, 'client/public/textures/pbr/ground/manifest.json');
if (fs.existsSync(manifestPath)) {
  body = fs.readFileSync(manifestPath, 'utf8');
} else {
  const res = await fetch('https://assets.grudge-studio.com/textures/pbr/ground/manifest.json');
  if (!res.ok) throw new Error('CDN manifest fetch failed');
  body = await res.text();
}

const keys = [
  'textures/pbr/ground/index.json',
  'textures/pbr/ground/manifest.json',
  'textures/pbr/ground/', // literal folder key so /textures/pbr/ground/ resolves
];

for (const key of keys) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'public, max-age=3600',
  }));
  console.log('OK', key);
}
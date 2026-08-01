#!/usr/bin/env node
/**
 * Shared R2 S3 upload helpers for fleet asset scripts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.fbx': 'application/octet-stream',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.css': 'text/css',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';

export function loadEnvFiles(root) {
  for (const f of ['.env.local', '.env']) {
    const fp = path.join(root, f);
    if (!fs.existsSync(fp)) continue;
    for (const line of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

export function getR2Config() {
  const account = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY;
  const secret = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET;
  const endpoint =
    process.env.R2_S3_ENDPOINT ||
    process.env.OBJECT_STORAGE_ENDPOINT ||
    (account ? `https://${account}.r2.cloudflarestorage.com` : null);
  const bucket = process.env.R2_BUCKET_ASSETS || process.env.OBJECT_STORAGE_BUCKET || 'grudge-assets';
  const cdn = process.env.FLEET_ASSETS_CDN || process.env.OBJECT_STORAGE_PUBLIC_URL || 'https://assets.grudge-studio.com';
  return { account, key, secret, endpoint, bucket, cdn };
}

export function createR2Client(cfg = getR2Config()) {
  if (!cfg.endpoint || !cfg.key || !cfg.secret) {
    throw new Error('Missing R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_S3_ENDPOINT)');
  }
  return new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.key, secretAccessKey: cfg.secret },
    forcePathStyle: true,
  });
}

export function guessMime(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

export async function headR2Key(client, bucket, key) {
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return res;
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound') return null;
    throw e;
  }
}

export async function uploadFile(client, bucket, localPath, r2Key, { force = false, dryRun = false } = {}) {
  if (!fs.existsSync(localPath)) {
    return { ok: false, skipped: false, reason: 'missing-local', localPath, r2Key };
  }
  if (!force) {
    const head = await headR2Key(client, bucket, r2Key);
    if (head) {
      const localStat = fs.statSync(localPath);
      if (head.ContentLength === localStat.size) {
        return { ok: true, skipped: true, r2Key, bytes: localStat.size };
      }
    }
  }
  const body = fs.readFileSync(localPath);
  const contentType = guessMime(localPath);
  if (dryRun) {
    return { ok: true, skipped: false, dryRun: true, r2Key, bytes: body.length, contentType };
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE_IMMUTABLE,
    }),
  );
  return { ok: true, skipped: false, r2Key, bytes: body.length, contentType };
}

export async function uploadBuffer(client, bucket, buffer, r2Key, contentType, { dryRun = false } = {}) {
  if (dryRun) {
    return { ok: true, dryRun: true, r2Key, bytes: buffer.length, contentType };
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: CACHE_IMMUTABLE,
    }),
  );
  return { ok: true, r2Key, bytes: buffer.length, contentType };
}
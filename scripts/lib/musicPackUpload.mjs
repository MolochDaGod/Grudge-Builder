import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CDN_BASE = 'https://assets.grudge-studio.com';

export const MIME = {
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const SKIP_DIR = new Set(['__macosx', 'node_modules', '.git']);
const SKIP_FILE = /\.(pdf|png|jpg|jpeg|gif|txt|ds_store|meta)$/i;

export function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

export function slugPath(relPath) {
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

/**
 * Recursively collect streamable audio under sourceDir.
 * R2 layout: {prefix}/{format}/{slug}.{ext}
 */
export function collectMusicEntries(sourceDir, r2Prefix, allowedExt) {
  /** @type {{ localPath: string, r2Key: string, bytes: number, format: string, label: string, slug: string }[]} */
  const entries = [];

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.')) continue;
      if (SKIP_DIR.has(ent.name.toLowerCase())) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (SKIP_FILE.test(ent.name)) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!allowedExt.has(ext)) continue;

      const rel = path.relative(sourceDir, full).split(path.sep).join('/');
      const format = ext.slice(1);
      const slug = slugPath(rel);
      const r2Key = `${r2Prefix}/${format}/${slug}${ext}`;

      const stat = fs.statSync(full);
      entries.push({
        localPath: full,
        r2Key,
        bytes: stat.size,
        format,
        label: rel,
        slug,
      });
    }
  }

  walk(sourceDir);
  entries.sort((a, b) => a.r2Key.localeCompare(b.r2Key));
  return entries;
}

export function buildManifest(packMeta, r2Prefix, entries) {
  const manifest = {
    version: '1.0.0',
    pack: packMeta.label,
    packId: packMeta.id,
    prefix: r2Prefix,
    cdnBase: `${CDN_BASE}/${r2Prefix}`,
    streaming: {
      preferredFormat: packMeta.preferredFormat ?? 'ogg',
      fallbackFormat: 'mp3',
      useHtmlAudioElement: true,
    },
    totalFiles: entries.length,
    uploadedAt: new Date().toISOString(),
    bySlug: {},
    files: [],
  };

  for (const entry of entries) {
    const cdnUrl = `${CDN_BASE}/${entry.r2Key}`;
    const rec = {
      slug: entry.slug,
      format: entry.format,
      label: entry.label,
      r2Key: entry.r2Key,
      cdnUrl,
      bytes: entry.bytes,
    };
    manifest.files.push(rec);
    if (!manifest.bySlug[entry.slug]) {
      manifest.bySlug[entry.slug] = { slug: entry.slug, label: entry.label, urls: {} };
    }
    manifest.bySlug[entry.slug].urls[entry.format] = cdnUrl;
  }

  return manifest;
}

export async function uploadMusicPack({
  packMeta,
  sourceDir,
  dryRun = false,
  force = false,
  includeWav = false,
  rootDir,
}) {
  const allowedExt = includeWav || packMeta.includeWav
    ? new Set(['.ogg', '.mp3', '.wav'])
    : new Set(['.ogg', '.mp3']);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source not found: ${sourceDir}`);
  }

  const r2Prefix = `audio/music/${packMeta.id}`;
  const entries = collectMusicEntries(sourceDir, r2Prefix, allowedExt);
  if (!entries.length) {
    throw new Error(`No audio (${[...allowedExt].join(', ')}) under ${sourceDir}`);
  }

  const totalMb = entries.reduce((s, e) => s + e.bytes, 0) / (1024 * 1024);
  console.log(`\n── ${packMeta.label} (${packMeta.id})`);
  console.log(`Source: ${sourceDir}`);
  console.log(`CDN: ${CDN_BASE}/${r2Prefix}/`);
  console.log(`Formats: ${[...allowedExt].join(', ')}`);
  console.log(`Files: ${entries.length} (${totalMb.toFixed(1)} MB)`);

  const manifest = buildManifest(packMeta, r2Prefix, entries);
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  if (dryRun) {
    for (const entry of entries) {
      console.log(`  [dry-run] ${entry.r2Key}`);
      uploaded++;
    }
    const out = path.join(rootDir, 'dist', `music-${packMeta.id}-manifest.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
    return { uploaded, skipped, failed, manifest };
  }

  const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY;
  const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET;
  const BUCKET = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET_ASSETS || 'grudge-assets';
  const ENDPOINT = process.env.R2_S3_ENDPOINT
    || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : null);

  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !ENDPOINT) {
    throw new Error('Missing R2 credentials');
  }

  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: ENDPOINT,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    forcePathStyle: true,
  });

  for (const entry of entries) {
    if (!force) {
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
            'source-pack': packMeta.id,
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

  const manifestKey = `${r2Prefix}/manifest.json`;
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: manifestKey,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=3600',
  }));
  console.log(`Manifest: ${CDN_BASE}/${manifestKey}`);

  return { uploaded, skipped, failed, manifest };
}
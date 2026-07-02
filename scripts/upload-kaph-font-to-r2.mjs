#!/usr/bin/env node
/**
 * Upload Kaph font (OFL) to R2: fonts/kaph/*
 * Source: C:\Users\nugye\Documents\Kaph_Font_1_20 (override with KAPH_FONT_ROOT)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
const fontRoot =
  process.env.KAPH_FONT_ROOT ||
  path.join(process.env.USERPROFILE || '', 'Documents', 'Kaph_Font_1_20');

const account = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const key = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY;
const secret = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET;
const endpoint =
  process.env.R2_S3_ENDPOINT ||
  (account ? `https://${account}.r2.cloudflarestorage.com` : null);
const bucket = process.env.R2_BUCKET_ASSETS || 'grudge-assets';
const cdn = process.env.FLEET_ASSETS_CDN || 'https://assets.grudge-studio.com';

if (!endpoint || !key || !secret) {
  console.error('Missing R2 credentials');
  process.exit(1);
}

if (!fs.existsSync(fontRoot)) {
  console.error(`Kaph font folder not found: ${fontRoot}`);
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId: key, secretAccessKey: secret },
  forcePathStyle: true,
});

const MIME = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain',
  '.css': 'text/css',
};

const uploads = [
  {
    local: path.join(fontRoot, 'Web Open Font Format (.woff)', 'Kaph-Regular.woff2'),
    r2: 'fonts/kaph/Kaph-Regular.woff2',
  },
  {
    local: path.join(fontRoot, 'Web Open Font Format (.woff)', 'Kaph-Regular.woff'),
    r2: 'fonts/kaph/Kaph-Regular.woff',
  },
  {
    local: path.join(fontRoot, 'Web Open Font Format (.woff)', 'Kaph-Italic.woff2'),
    r2: 'fonts/kaph/Kaph-Italic.woff2',
  },
  {
    local: path.join(fontRoot, 'Web Open Font Format (.woff)', 'Kaph-Italic.woff'),
    r2: 'fonts/kaph/Kaph-Italic.woff',
  },
  {
    local: path.join(fontRoot, 'TrueType (.ttf)', 'Kaph-Regular.ttf'),
    r2: 'fonts/kaph/Kaph-Regular.ttf',
  },
  {
    local: path.join(fontRoot, 'TrueType (.ttf)', 'Kaph-Italic.ttf'),
    r2: 'fonts/kaph/Kaph-Italic.ttf',
  },
  {
    local: path.join(fontRoot, 'License.txt'),
    r2: 'fonts/kaph/LICENSE.txt',
  },
];

const kaphCss = `@font-face {
  font-family: 'Kaph';
  src: url('Kaph-Regular.woff2') format('woff2'),
       url('Kaph-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Kaph';
  src: url('Kaph-Italic.woff2') format('woff2'),
       url('Kaph-Italic.woff') format('woff');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
`;

async function put(r2Key, body, contentType) {
  if (dryRun) {
    console.log(`[dry-run] ${r2Key}`);
    return;
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

for (const item of uploads) {
  if (!fs.existsSync(item.local)) {
    console.warn(`skip missing ${item.local}`);
    continue;
  }
  const ext = path.extname(item.local).toLowerCase();
  await put(item.r2, fs.readFileSync(item.local), MIME[ext] ?? 'application/octet-stream');
}

await put('fonts/kaph/kaph.css', Buffer.from(kaphCss, 'utf8'), 'text/css');

const catalog = {
  version: 1,
  family: 'Kaph',
  css: `${cdn}/fonts/kaph/kaph.css`,
  license: `${cdn}/fonts/kaph/LICENSE.txt`,
  files: uploads.map((u) => `${cdn}/${u.r2}`),
};
await put('fonts/kaph/catalog.json', Buffer.from(JSON.stringify(catalog, null, 2)), 'application/json');

console.log('done —', `${cdn}/fonts/kaph/kaph.css`);
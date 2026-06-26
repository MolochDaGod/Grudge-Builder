import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const account = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const key = process.env.R2_ACCESS_KEY_ID || process.env.OBJECT_STORAGE_KEY;
const secret = process.env.R2_SECRET_ACCESS_KEY || process.env.OBJECT_STORAGE_SECRET;
const endpoint = process.env.R2_S3_ENDPOINT
  || (account ? `https://${account}.r2.cloudflarestorage.com` : null);
const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId: key, secretAccessKey: secret },
  forcePathStyle: true,
});
await client.send(new PutObjectCommand({
  Bucket: 'grudge-assets',
  Key: 'models/lobby/pirate-islands/_smoke.txt',
  Body: Buffer.from('r2-smoke-test'),
  ContentType: 'text/plain',
}));
console.log('smoke upload ok');
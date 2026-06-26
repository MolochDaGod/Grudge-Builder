#!/usr/bin/env node
/** Sync OBJECT_STORAGE_KEY/SECRET from R2_ACCESS_* in .env (no output of secrets). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
let t = fs.readFileSync(envPath, 'utf8');

const get = (k) => {
  const m = t.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].replace(/^["']|["']$/g, '') : '';
};

const r2Key = get('R2_ACCESS_KEY_ID');
const r2Sec = get('R2_SECRET_ACCESS_KEY');
const acct = get('CF_ACCOUNT_ID') || get('CLOUDFLARE_ACCOUNT_ID');
const placeholder = 'NEED_FROM_CF_DASHBOARD_R2_API_TOKENS';

if (r2Key && r2Key !== placeholder) {
  t = t.replace(/^OBJECT_STORAGE_KEY=.*$/m, `OBJECT_STORAGE_KEY=${r2Key}`);
}
if (r2Sec && r2Sec !== placeholder) {
  t = t.replace(/^OBJECT_STORAGE_SECRET=.*$/m, `OBJECT_STORAGE_SECRET=${r2Sec}`);
}

if (!/^CLOUDFLARE_ACCOUNT_ID=/m.test(t) && acct) {
  t = t.replace(/^(CF_ACCOUNT_ID=.*)$/m, `$1\nCLOUDFLARE_ACCOUNT_ID=${acct}`);
}

const workerFromEnv = process.argv[2];
if (workerFromEnv && !workerFromEnv.startsWith('--')) {
  if (/^CF_WORKER_R2_API=/m.test(t)) {
    t = t.replace(/^CF_WORKER_R2_API=.*$/m, `CF_WORKER_R2_API=${workerFromEnv}`);
  } else {
    t = t.replace(
      /^(R2_BUCKET_OBJECTSTORE=.*)$/m,
      `$1\n# Wrangler / Worker R2 API token (NOT the S3 access key)\nCF_WORKER_R2_API=${workerFromEnv}`,
    );
  }
}

if (!/NOT S3 upload/.test(t)) {
  t = t.replace(
    /^# KEY\+SECRET:.*\nOBJECT_STORAGE_ENDPOINT=.*$/m,
    '# KEY+SECRET: dash.cloudflare.com → R2 → Manage R2 API Tokens (S3-compatible)\n# JSON API + search (NOT S3 upload — use R2_S3_ENDPOINT for upload scripts)\nOBJECT_STORAGE_ENDPOINT=https://objectstore.grudge-studio.com',
  );
}

fs.writeFileSync(envPath, t);
console.log('sync-r2-env: OBJECT_STORAGE_KEY/SECRET synced from R2_ACCESS_*; CLOUDFLARE_ACCOUNT_ID alias OK');
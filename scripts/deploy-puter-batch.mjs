#!/usr/bin/env node
/**
 * Deploy grudge-crafting via Puter /batch API (no SDK — avoids Node 24 SDK crash).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const REMOTE_DIR = '/GRUDACHAIN/grudge-crafting';
const SUBDOMAIN = 'grudge-crafting';

function loadToken() {
  const envPath = resolve(__dirname, '..', '.env');
  const envText = readFileSync(envPath, 'utf-8');
  for (const key of ['PUTER_AUTH_TOKEN', 'PUTER_API_KEY']) {
    const m = envText.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  throw new Error('No PUTER_AUTH_TOKEN in .env');
}

async function puterApi(path, token, body, isJson = true) {
  const res = await fetch(`${PUTER_API}${path}`, {
    method: 'POST',
    headers: isJson
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { Authorization: `Bearer ${token}` },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function batchWrite(token, dirPath, name, content, mime) {
  const operationId = randomUUID();
  const form = new FormData();
  form.append(
    'operation',
    JSON.stringify({
      op: 'write',
      dedupe_name: false,
      overwrite: true,
      create_missing_ancestors: true,
      operation_id: operationId,
      path: dirPath,
      name,
      item_upload_id: 0,
    }),
  );
  form.append('file', new Blob([content], { type: mime }), name);
  return puterApi('/batch', token, form, false);
}

const token = loadToken();
const publicDir = resolve(__dirname, '..', 'client', 'public');

console.log('╔══════════════════════════════════════════╗');
console.log('║  Grudge Crafting → Puter Batch Deploy    ║');
console.log('╚══════════════════════════════════════════╝\n');

const who = await fetch(`${PUTER_API}/whoami`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
console.log(`✓ Auth: ${who?.username || who?.user?.username || 'OK'}`);

try {
  await puterApi('/mkdir', token, JSON.stringify({ path: REMOTE_DIR, create_missing_parents: true }));
  console.log(`✓ Dir ${REMOTE_DIR}`);
} catch (e) {
  console.log(`  mkdir: ${e.message.slice(0, 80)}`);
}

const uploads = [
  ['grudge-crafting.html', 'index.html', 'text/html'],
  ['grudge-fleet.js', 'grudge-fleet.js', 'application/javascript'],
];

for (const [local, remote, mime] of uploads) {
  const content = readFileSync(resolve(publicDir, local));
  console.log(`→ ${remote} (${(content.length / 1024).toFixed(1)} KB)`);
  const result = await batchWrite(token, REMOTE_DIR, remote, content, mime);
  const item = Array.isArray(result?.results) ? result.results[0] : result;
  console.log(`✓ ${remote} → ${item?.path || item?.name || 'ok'}`);
}

async function driverCall(token, method, args) {
  const res = await fetch(`${PUTER_API}/drivers/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({
      interface: 'puter-subdomains',
      method,
      args,
      auth_token: token,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} drivers/call: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  if (data.success === false) throw new Error(data.error?.message || JSON.stringify(data.error));
  return data.result ?? data;
}

try {
  const site = await driverCall(token, 'read', { id: { subdomain: SUBDOMAIN } });
  console.log(`  hosting root: ${site?.root_dir || site?.rootDir || REMOTE_DIR}`);
} catch {
  console.log(`  hosting read skipped`);
}

try {
  await driverCall(token, 'update', {
    id: { subdomain: SUBDOMAIN },
    object: { root_dir: REMOTE_DIR },
  });
  console.log(`✓ Hosting → ${SUBDOMAIN}.puter.site (${REMOTE_DIR})`);
} catch (e) {
  console.warn(`⚠ hosting: ${e.message.slice(0, 200)}`);
}

console.log(`\n✅ https://${SUBDOMAIN}.puter.site`);
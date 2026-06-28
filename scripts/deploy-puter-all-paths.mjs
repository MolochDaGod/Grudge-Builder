#!/usr/bin/env node
/**
 * Shotgun deploy: write fleet-enabled index.html to every known grudge-crafting path.
 * GRUDACHAIN token can write FS but cannot update hosting (403).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
const token = env.match(/^PUTER_AUTH_TOKEN=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim()
  || env.match(/^PUTER_API_KEY=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim();

const PATHS = [
  '/GRUDACHAIN/crafting',
  '/GRUDACHAIN/grudge-crafting',
  '/GRUDACHAIN/sites/grudge-crafting/deployment',
  '/GRUDACHAIN/deployment-live',
  '/GRUDACHAIN/puter-deploy',
  '/GRUDACHAIN/sites/grudge-crafting',
];

const publicDir = resolve(__dirname, '..', 'client', 'public');
const html = readFileSync(resolve(publicDir, 'grudge-crafting.html'));
const fleet = readFileSync(resolve(publicDir, 'grudge-fleet.js'));

async function batchWrite(dirPath, name, content, mime) {
  const form = new FormData();
  form.append('operation', JSON.stringify({
    op: 'write', dedupe_name: false, overwrite: true, create_missing_ancestors: true,
    operation_id: randomUUID(), path: dirPath, name, item_upload_id: 0,
  }));
  form.append('file', new Blob([content], { type: mime }), name);
  const res = await fetch(`${PUTER_API}/batch`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

console.log('Shotgun deploy to', PATHS.length, 'paths...\n');
for (const dir of PATHS) {
  try {
    await batchWrite(dir, 'index.html', html, 'text/html');
    await batchWrite(dir, 'grudge-fleet.js', fleet, 'application/javascript');
    console.log('✓', dir);
  } catch (e) {
    console.log('✗', dir, e.message.slice(0, 80));
  }
}
console.log('\nDone. If live site unchanged, run puter login + deploy-puter-smart.mjs');
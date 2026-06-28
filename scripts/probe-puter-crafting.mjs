#!/usr/bin/env node
/** Probe Puter FS + hosting to find grudge-crafting root_dir */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';

function loadToken() {
  const envPath = resolve(__dirname, '..', '.env');
  const env = readFileSync(envPath, 'utf-8');
  for (const key of ['PUTER_AUTH_TOKEN', 'PUTER_API_KEY']) {
    const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  throw new Error('no token');
}

const token = loadToken();

async function stat(path) {
  const res = await fetch(`${PUTER_API}/stat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 200) };
}

async function readdir(path) {
  const res = await fetch(`${PUTER_API}/readdir`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return null;
  return res.json();
}

const candidates = [
  '/GRUDACHAIN/crafting',
  '/GRUDACHAIN/crafting/index.html',
  '/GRUDACHAIN/grudge-crafting',
  '/GRUDACHAIN/grudge-crafting/index.html',
  '/GRUDACHAIN/sites/grudge-crafting/deployment',
  '/GRUDACHAIN/sites/grudge-crafting/deployment/index.html',
  '/grudge-crafting',
  '/grudge-crafting/index.html',
  '/MolochDaDev/crafting',
  '/MolochDaDev/grudge-crafting',
];

console.log('Probing Puter FS paths...\n');
for (const p of candidates) {
  const s = await stat(p);
  const mark = s.status === 200 ? '✓' : '·';
  console.log(`${mark} ${p} → ${s.status} ${s.body.slice(0, 80)}`);
}

console.log('\n── readdir /GRUDACHAIN ──');
const root = await readdir('/GRUDACHAIN');
if (root) {
  const items = root.items || root || [];
  for (const item of (Array.isArray(items) ? items : []).slice(0, 30)) {
    console.log(' ', item.name || item.path || JSON.stringify(item).slice(0, 60));
  }
}

console.log('\n── Live site fingerprint ──');
const live = await fetch('https://grudge-crafting.puter.site').then((r) => r.text());
console.log('  length:', live.length);
console.log('  GRUDGE_CONFIG:', live.includes('GRUDGE_CONFIG'));
console.log('  title dash:', live.includes('Crafting &amp; Professions') ? 'ampersand' : live.includes('Crafting & Professions') ? 'plain' : 'other');
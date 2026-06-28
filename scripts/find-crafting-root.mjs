#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
const token = (env.match(/^PUTER_AUTH_TOKEN=(.+)$/m) || env.match(/^PUTER_API_KEY=(.+)$/m))[1]
  .replace(/^["']|["']$/g, '').trim();

const LIVE = (await fetch('https://grudge-crafting.puter.site').then((r) => r.text())).length;
console.log('Live site bytes:', LIVE);

const API = 'https://api.puter.com';
async function statSize(path) {
  const res = await fetch(`${API}/stat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.size ?? data.metadata?.size ?? null;
}

const dirs = await fetch(`${API}/readdir`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: '/GRUDACHAIN' }),
}).then((r) => r.json());
const names = (dirs.items || dirs || []).map((i) => i.name).filter((n) => n && !n.startsWith('.'));

console.log('\n── index.html sizes under /GRUDACHAIN ──');
for (const name of names) {
  const p = `/GRUDACHAIN/${name}/index.html`;
  const size = await statSize(p);
  if (size != null) {
    const match = size === LIVE ? ' *** MATCH ***' : '';
    console.log(`${p} → ${size}${match}`);
  }
}

// Nested paths under sites/
const nested = ['sites/grudge-crafting', 'sites/grudge-crafting/deployment', 'puter-deploy/grudge-crafting'];
for (const sub of nested) {
  const p = `/GRUDACHAIN/${sub}/index.html`;
  const size = await statSize(p);
  if (size != null) {
    const match = size === LIVE ? ' *** MATCH ***' : '';
    console.log(`${p} → ${size}${match}`);
  }
}
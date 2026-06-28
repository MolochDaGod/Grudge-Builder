#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.puter.com';
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
const token = env.match(/^PUTER_AUTH_TOKEN=(.+)$/m)[1].replace(/^["']|["']$/g, '').trim();

async function readdir(path) {
  const res = await fetch(`${API}/readdir`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return { status: res.status, items: [] };
  const data = await res.json();
  return { status: res.status, items: data.items || data || [] };
}

const who = await fetch(`${API}/whoami`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
console.log('whoami:', JSON.stringify(who).slice(0, 300));

for (const p of ['/', '/GRUDACHAIN', '/GRUDACHAIN/grudge-crafting', 'grudge-crafting', '~/grudge-crafting']) {
  const r = await readdir(p);
  const names = r.items.slice(0, 8).map((i) => i.name).join(', ');
  console.log(`readdir ${p} → ${r.status} [${names}]`);
}
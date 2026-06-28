#!/usr/bin/env node
/** Find which GRUDACHAIN index.html matches live grudge-crafting.puter.site byte size */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
const token = env.match(/^PUTER_AUTH_TOKEN=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim();

async function getReadUrl(path) {
  const res = await fetch(`${PUTER_API}/drivers/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({
      interface: 'puter-fs',
      method: 'get_read_url',
      args: { path },
      auth_token: token,
    }),
  });
  const text = await res.text();
  if (!res.ok) return null;
  const data = JSON.parse(text);
  return data.result?.url || data.url;
}

const live = await fetch('https://grudge-crafting.puter.site').then((r) => r.text());
console.log('Live:', live.length, 'bytes, fleet:', live.includes('grudge-fleet'));

const dirs = await fetch(`${PUTER_API}/readdir`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: '/GRUDACHAIN' }),
}).then((r) => r.json());

const names = (dirs.items || dirs || []).map((i) => i.name).filter(Boolean);
for (const name of names) {
  for (const file of ['index.html', '404.html']) {
    const p = `/GRUDACHAIN/${name}/${file}`;
    const url = await getReadUrl(p);
    if (!url) continue;
    try {
      const body = await fetch(url).then((r) => r.text());
      if (body.length === live.length || body.includes('Crafting')) {
        console.log(`${p} → ${body.length} match=${body.length === live.length} fleet=${body.includes('GRUDGE_CONFIG')}`);
      }
    } catch {}
  }
}
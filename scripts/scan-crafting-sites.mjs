#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.puter.com';
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
const token = (env.match(/^PUTER_AUTH_TOKEN=(.+)$/m) || env.match(/^PUTER_API_KEY=(.+)$/m))[1]
  .replace(/^["']|["']$/g, '').trim();
const LIVE = 111457;

async function readdir(path) {
  const res = await fetch(`${API}/readdir`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || data || []).map((i) => ({ name: i.name, path: i.path, is_dir: i.is_dir ?? i.isDir }));
}

async function statSize(path) {
  const res = await fetch(`${API}/stat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.size ?? null;
}

async function walk(base, depth = 0) {
  if (depth > 4) return;
  const items = await readdir(base);
  for (const item of items) {
    const p = item.path || `${base}/${item.name}`.replace(/\/+/g, '/');
    if (item.name === 'index.html' || p.endsWith('/index.html')) {
      const size = await statSize(p);
      if (size === LIVE || (p.toLowerCase().includes('craft') && size > 100000)) {
        console.log(`${size === LIVE ? '*** MATCH *** ' : ''}${p} → ${size}`);
      }
    }
    if (item.is_dir || item.name && !item.name.includes('.')) {
      if (/craft|grudge-craft|deployment/i.test(p) || depth < 2) {
        await walk(p, depth + 1);
      }
    }
  }
}

console.log('Scanning GRUDACHAIN FS for live crafting root (111457 bytes)...\n');
await walk('/GRUDACHAIN/sites');
await walk('/GRUDACHAIN');
console.log('\nDone.');
#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
const token = env.match(/^PUTER_AUTH_TOKEN=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim()
  || env.match(/^PUTER_API_KEY=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim();

const paths = [
  '/GRUDACHAIN/crafting/index.html',
  '/GRUDACHAIN/grudge-crafting/index.html',
  '/GRUDACHAIN/sites/grudge-crafting/deployment/index.html',
  '/GRUDACHAIN/index.html',
  '/GRUDACHAIN/deployment-live/index.html',
];

const liveLen = (await fetch('https://grudge-crafting.puter.site').then((r) => r.text())).length;
console.log('Live site bytes:', liveLen, '\n');

for (const p of paths) {
  const res = await fetch(`${PUTER_API}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: p }),
  });
  if (!res.ok) {
    console.log(p, '→', res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const hasFleet = buf.includes('grudge-fleet') || buf.includes('GRUDGE_CONFIG');
  console.log(`${p}`);
  console.log(`  bytes: ${buf.length}  match_live: ${buf.length === liveLen}  fleet: ${hasFleet}`);
}
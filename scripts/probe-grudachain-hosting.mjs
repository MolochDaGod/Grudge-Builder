#!/usr/bin/env node
/** Probe GRUDACHAIN hosting — which subdomains GRUDACHAIN owns */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.puter.com';
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8');
const token = (env.match(/^PUTER_AUTH_TOKEN=(.+)$/m) || env.match(/^PUTER_API_KEY=(.+)$/m))[1]
  .replace(/^["']|["']$/g, '').trim();

async function driver(method, args) {
  const res = await fetch(`${API}/drivers/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({ interface: 'puter-subdomains', method, args, auth_token: token }),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, text, data };
}

const who = await fetch(`${API}/whoami`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
console.log('Account:', who?.username);

const subs = ['grudge-crafting', 'grudge-studio', 'grudge-auth', 'grudgewarlords', 'grudge-cloud'];
console.log('\n── Subdomain ownership (GRUDACHAIN token) ──');
for (const sub of subs) {
  const read = await driver('read', { id: { subdomain: sub } });
  if (read.status === 200 && read.data?.result) {
    const r = read.data.result;
    const root = typeof r.root_dir === 'object' ? r.root_dir?.path : (r.root_dir || r.rootDir || '');
    console.log(`✓ ${sub} → ${root || JSON.stringify(r).slice(0, 100)}`);
  } else {
    console.log(`✗ ${sub} → ${read.status} (not owned by GRUDACHAIN — likely tester account)`);
  }
}
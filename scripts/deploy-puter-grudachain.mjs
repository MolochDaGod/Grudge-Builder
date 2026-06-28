#!/usr/bin/env node
/**
 * Canonical GRUDACHAIN Puter deploy for grudge-crafting.puter.site
 *
 * Account: GRUDACHAIN (dev + production). MolochDaDev is tester-only — never use for deploy.
 * Canonical FS path: /GRUDACHAIN/grudge-crafting (per fix-puter-404s.ps1 registry)
 * CLI versioned path: /GRUDACHAIN/sites/grudge-crafting/deployment
 *
 * Usage:
 *   node scripts/deploy-puter-grudachain.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const SUBDOMAIN = 'grudge-crafting';
const CANONICAL_DIR = '/GRUDACHAIN/grudge-crafting';
const CLI_DEPLOY_DIR = '/GRUDACHAIN/sites/grudge-crafting/deployment';

function loadGrudachainToken() {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) throw new Error('Missing .env');
  const env = readFileSync(envPath, 'utf-8');
  for (const key of ['PUTER_AUTH_TOKEN', 'PUTER_API_KEY', 'PUTER_DEPLOYER_TOKEN']) {
    const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  throw new Error('Set PUTER_AUTH_TOKEN (GRUDACHAIN) in .env');
}

async function batchWrite(token, dirPath, name, content, mime) {
  const form = new FormData();
  form.append('operation', JSON.stringify({
    op: 'write', dedupe_name: false, overwrite: true, create_missing_ancestors: true,
    operation_id: randomUUID(), path: dirPath, name, item_upload_id: 0,
  }));
  form.append('file', new Blob([content], { type: mime }), name);
  const res = await fetch(`${PUTER_API}/batch`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function driverCall(token, method, args) {
  const res = await fetch(`${PUTER_API}/drivers/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({ interface: 'puter-subdomains', method, args, auth_token: token }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, data: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}

const token = loadGrudachainToken();
const publicDir = resolve(__dirname, '..', 'client', 'public');
const html = readFileSync(resolve(publicDir, 'grudge-crafting.html'));
const fleet = readFileSync(resolve(publicDir, 'grudge-fleet.js'));

console.log('╔════════════════════════════════════════════════════╗');
console.log('║  GRUDACHAIN Deploy → grudge-crafting.puter.site    ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const who = await fetch(`${PUTER_API}/whoami`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
console.log(`✓ Account: ${who?.username || '?'}`);
if (who?.username && who.username !== 'GRUDACHAIN') {
  console.warn(`⚠ Expected GRUDACHAIN token, got ${who.username}`);
}

for (const dir of [CANONICAL_DIR, CLI_DEPLOY_DIR]) {
  console.log(`\n→ ${dir}`);
  for (const [buf, name, mime] of [[html, 'index.html', 'text/html'], [fleet, 'grudge-fleet.js', 'application/javascript']]) {
    await batchWrite(token, dir, name, buf, mime);
    console.log(`  ✓ ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}

console.log('\n── Hosting (GRUDACHAIN subdomain binding) ──');
for (const dir of [CANONICAL_DIR, CLI_DEPLOY_DIR]) {
  const upd = await driverCall(token, 'update', {
    id: { subdomain: SUBDOMAIN },
    object: { root_dir: dir },
  });
  if (upd.ok && upd.data?.success !== false) {
    console.log(`✓ hosting.update → ${dir}`);
    break;
  }
  console.log(`  update ${dir}: ${upd.status} ${upd.text.slice(0, 120)}`);
}

const read = await driverCall(token, 'read', { id: { subdomain: SUBDOMAIN } });
if (read.ok && read.data?.result) {
  console.log(`✓ hosting root: ${read.data.result.root_dir || read.data.result.rootDir}`);
} else {
  console.log(`⚠ hosting.read: ${read.status} — subdomain may be registered to another Puter account`);
  console.log('  Fix: sign in as GRUDACHAIN at puter.com → reclaim grudge-crafting subdomain');
  console.log('  Or open: https://assets.grudge-studio.com/tools/puter-deploy-crafting.html (as GRUDACHAIN)');
}

console.log(`\n✅ Files uploaded. Verify: https://${SUBDOMAIN}.puter.site`);
console.log('   Expect GRUDGE_CONFIG + grudge-fleet.js after hosting points at GRUDACHAIN paths.\n');
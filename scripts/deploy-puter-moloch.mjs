#!/usr/bin/env node
/**
 * Deploy grudge-crafting to MolochDaDev Puter (owns grudge-crafting.puter.site).
 * Requires: puter login (MolochDaDev profile)
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const SUBDOMAIN = 'grudge-crafting';

const PATHS = [
  '/MolochDaDev/crafting',
  '/MolochDaDev/grudge-crafting',
  '/MolochDaDev/sites/grudge-crafting/deployment',
  '/GRUDACHAIN/crafting',
  '/GRUDACHAIN/grudge-crafting',
];

function loadToken() {
  const cfgPath = join(process.env.APPDATA ?? '', 'puter-cli-nodejs', 'Config', 'config.json');
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
    const profile = cfg.profiles?.find((p) => p.uuid === cfg.selected_profile) || cfg.profiles?.[0];
    if (profile?.token) return { token: profile.token, username: profile.username };
  }
  throw new Error('No Puter CLI token. Run: puter login');
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
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function driverCall(token, method, args) {
  const res = await fetch(`${PUTER_API}/drivers/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({ interface: 'puter-subdomains', method, args, auth_token: token }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const { token, username } = loadToken();
const who = await fetch(`${PUTER_API}/whoami`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
if (who?.reauth_required || who?.error || !who?.username) {
  console.error('❌ Puter CLI token expired (config not updated).');
  console.error('   Open https://assets.grudge-studio.com/tools/puter-deploy-crafting.html');
  console.error('   Sign in as MolochDaDev → click "2. Deploy fleet-enabled crafting"');
  process.exit(1);
}
console.log(`✓ Auth: ${who.username}`);

const publicDir = resolve(__dirname, '..', 'client', 'public');
const html = readFileSync(resolve(publicDir, 'grudge-crafting.html'));
const fleet = readFileSync(resolve(publicDir, 'grudge-fleet.js'));

for (const dir of PATHS) {
  try {
    await batchWrite(token, dir, 'index.html', html, 'text/html');
    await batchWrite(token, dir, 'grudge-fleet.js', fleet, 'application/javascript');
    console.log('✓', dir);
  } catch (e) {
    console.log('✗', dir, e.message.slice(0, 100));
  }
}

for (const dir of PATHS.slice(0, 3)) {
  try {
    const upd = await driverCall(token, 'update', {
      id: { subdomain: SUBDOMAIN },
      object: { root_dir: dir },
    });
    if (upd?.result || upd?.success !== false) {
      console.log(`✓ hosting → ${dir}`);
      break;
    }
  } catch (e) {
    console.log(`  hosting ${dir}:`, e.message.slice(0, 100));
  }
}

console.log(`\n✅ https://${SUBDOMAIN}.puter.site`);
console.log('   Verify page contains GRUDGE_CONFIG and ./grudge-fleet.js\n');
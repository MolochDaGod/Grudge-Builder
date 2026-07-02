#!/usr/bin/env node
/**
 * Smart Puter deploy for grudge-crafting.puter.site
 *
 * Strategy (per Puter registry + fix-puter-404s.mjs):
 *  1. Auth as GRUDACHAIN (PUTER_AUTH_TOKEN in .env — production deploy account)
 *  2. Probe hosting root_dir via drivers/call (puter-subdomains)
 *  3. Upload to canonical /GRUDACHAIN/crafting/ via /batch (no SDK — Node 24 safe)
 *  4. Point hosting at that dir (or leave if already correct)
 *
 * Usage:
 *   node scripts/deploy-puter-smart.mjs
 *   node scripts/deploy-puter-smart.mjs --bootstrap   # tiny shell + CDN app
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const SUBDOMAIN = 'grudge-crafting';
const CANONICAL_DIR = '/GRUDACHAIN/grudge-crafting';
const CDN_APP = 'https://assets.grudge-studio.com/crafting/grudge-crafting.html';
const useBootstrap = process.argv.includes('--bootstrap');

function loadCliToken() {
  const candidates = [
    join(process.env.APPDATA ?? '', 'puter-cli-nodejs', 'Config', 'config.json'),
    join(homedir(), '.config', 'puter-cli-nodejs', 'config.json'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const cfg = JSON.parse(readFileSync(p, 'utf-8'));
    const profile =
      cfg.profiles?.find((pr) => pr.uuid === cfg.selected_profile) || cfg.profiles?.[0];
    if (profile?.token) return { token: profile.token, username: profile.username };
  }
  const envPath = resolve(__dirname, '..', '.env');
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf-8');
    for (const key of ['PUTER_AUTH_TOKEN', 'PUTER_API_KEY']) {
      const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
      if (m) return { token: m[1].replace(/^["']|["']$/g, '').trim(), username: 'env' };
    }
  }
  throw new Error('No token. Run: puter login');
}

async function driverCall(token, method, args) {
  const res = await fetch(`${PUTER_API}/drivers/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({
      interface: 'puter-subdomains',
      method,
      args,
      auth_token: token,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} drivers/${method}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  if (data.success === false) throw new Error(data.error?.message || JSON.stringify(data.error));
  return data.result ?? data;
}

async function batchWrite(token, dirPath, name, content, mime) {
  const form = new FormData();
  form.append(
    'operation',
    JSON.stringify({
      op: 'write',
      dedupe_name: false,
      overwrite: true,
      create_missing_ancestors: true,
      operation_id: randomUUID(),
      path: dirPath,
      name,
      item_upload_id: 0,
    }),
  );
  form.append('file', new Blob([content], { type: mime }), name);
  const res = await fetch(`${PUTER_API}/batch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} batch: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function buildBootstrapHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Grudge Warlords — Crafting</title>
<script src="https://js.puter.com/v2/"></script>
<script>
  window.GRUDGE_CONFIG = {
    AUTH_GATEWAY: 'https://id.grudge-studio.com',
    IDENTITY_API: 'https://the-engine.up.railway.app',
    GAME_DATA: 'https://grudge-api-production-0d46.up.railway.app',
    OBJECTSTORE_URL: 'https://objectstore.grudge-studio.com/api/v1',
    ASSETS: 'https://assets.grudge-studio.com',
    VERSION: '4.0.0'
  };
</script>
<script src="https://assets.grudge-studio.com/js/grudge-fleet.js"></script>
</head>
<body>
<div id="boot" style="font-family:system-ui;background:#0a0a10;color:#d4a843;padding:2rem;text-align:center">
  Loading Crafting Suite…
</div>
<script>
(async function () {
  const src = '${CDN_APP}';
  try {
    const html = typeof puter !== 'undefined' && puter.net
      ? await (await puter.net.fetch(src)).text()
      : await (await fetch(src)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.title = doc.title || document.title;
    for (const el of doc.head.querySelectorAll('link,style,meta[charset],meta[name=viewport]')) {
      if (el.tagName === 'SCRIPT') continue;
      document.head.appendChild(el.cloneNode(true));
    }
    document.body.innerHTML = doc.body.innerHTML;
    for (const s of doc.body.querySelectorAll('script')) {
      const ns = document.createElement('script');
      if (s.src) ns.src = s.src;
      else ns.textContent = s.textContent;
      document.body.appendChild(ns);
    }
    if (window.GrudgeFleet) await window.GrudgeFleet.init();
  } catch (e) {
    document.getElementById('boot').innerHTML =
      '<p>Failed to load crafting app.</p><p style="color:#888">' + e.message + '</p>';
  }
})();
</script>
</body>
</html>`;
}

console.log('╔══════════════════════════════════════════════════╗');
console.log('║  Smart Puter Deploy — grudge-crafting.puter.site ║');
console.log('╚══════════════════════════════════════════════════╝\n');

const { token, username } = loadCliToken();

const who = await fetch(`${PUTER_API}/whoami`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
if (who?.reauth_required) {
  console.error('❌ Puter session expired. Run: puter login');
  process.exit(1);
}
console.log(`✓ Auth: ${who?.username || username}`);

let hosting = null;
try {
  hosting = await driverCall(token, 'read', { id: { subdomain: SUBDOMAIN } });
  console.log(`✓ Hosting root: ${hosting?.root_dir || hosting?.rootDir || '(unknown)'}`);
} catch (e) {
  console.log(`  hosting read: ${e.message.slice(0, 120)}`);
}

const targetDir = hosting?.root_dir || hosting?.rootDir || CANONICAL_DIR;
console.log(`→ Target dir: ${targetDir}`);

const publicDir = resolve(__dirname, '..', 'client', 'public');
const fullHtml = readFileSync(resolve(publicDir, 'grudge-crafting.html'));
const indexContent = useBootstrap ? buildBootstrapHtml() : fullHtml;

const uploads = [
  [indexContent, 'index.html', 'text/html'],
];
if (!useBootstrap) {
  uploads.push([readFileSync(resolve(publicDir, 'grudge-fleet.js')), 'grudge-fleet.js', 'application/javascript']);
}

for (const [content, name, mime] of uploads) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  console.log(`→ ${targetDir}/${name} (${(buf.length / 1024).toFixed(1)} KB)`);
  const result = await batchWrite(token, targetDir, name, buf, mime);
  const item = Array.isArray(result?.results) ? result.results[0] : result;
  console.log(`✓ ${item?.path || name}`);
}

if (targetDir !== CANONICAL_DIR && !hosting?.root_dir?.includes('crafting')) {
  try {
    await driverCall(token, 'update', {
      id: { subdomain: SUBDOMAIN },
      object: { root_dir: CANONICAL_DIR },
    });
    console.log(`✓ Hosting repointed → ${CANONICAL_DIR}`);
  } catch (e) {
    console.warn(`⚠ hosting update: ${e.message.slice(0, 150)}`);
  }
}

console.log(`\n✅ https://${SUBDOMAIN}.puter.site`);
console.log(`   Mode: ${useBootstrap ? 'CDN bootstrap' : 'full inline'}`);
console.log(`   Verify: page should contain GRUDGE_CONFIG and grudge-fleet.js\n`);
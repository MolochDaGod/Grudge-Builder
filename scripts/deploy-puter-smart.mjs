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
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ensureAuth } from './lib/puter-auth.mjs';
import {
  batchWrite,
  deployCraftingSite,
  readHosting,
  hostingRootDir,
  CRAFTING_SUBDOMAIN,
} from './lib/puter-deploy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CDN_APP = 'https://assets.grudge-studio.com/crafting/grudge-crafting.html';
const useBootstrap = process.argv.includes('--bootstrap');

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
    IDENTITY_API: 'https://grudge-studio.com',
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

const auth = await ensureAuth();
console.log(`✓ Auth: ${auth.username} (${auth.source})`);

if (useBootstrap) {
  const hosting = await readHosting(auth.token);
  const targetDir = hostingRootDir(hosting) || `/${auth.username}/crafting`;
  const indexContent = buildBootstrapHtml();
  console.log(`→ Target dir: ${targetDir}`);
  await batchWrite(auth.token, targetDir, 'index.html', Buffer.from(indexContent, 'utf-8'), 'text/html');
  console.log('✓ index.html (CDN bootstrap)');
} else {
  const result = await deployCraftingSite(auth.token, auth.username);
  for (const u of result.uploads) {
    console.log(u.ok ? `✓ ${u.dir}` : `✗ ${u.dir}`);
  }
  if (result.bound) console.log(`✓ hosting → ${result.bound}`);
}

console.log(`\n✅ https://${CRAFTING_SUBDOMAIN}.puter.site`);
console.log(`   Mode: ${useBootstrap ? 'CDN bootstrap' : 'full inline'}`);
console.log(`   Verify: page should contain GRUDGE_CONFIG and grudge-fleet.js\n`);
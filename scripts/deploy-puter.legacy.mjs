#!/usr/bin/env node
/**
 * deploy-puter.mjs — Deploy/update Puter-hosted sites via REST API
 *
 * Usage:
 *   node scripts/deploy-puter.mjs --token YOUR_API_TOKEN
 *
 * Or set PUTER_API_KEY env var:
 *   $env:PUTER_API_KEY = "your-token"
 *   node scripts/deploy-puter.mjs
 *
 * To get your API token:
 *   1. Go to https://puter.com and sign in
 *   2. Open browser DevTools → Application → Cookies
 *   3. Copy the value of the 'puter.auth.token' cookie
 *
 * What this does:
 *   1. Writes the updated grudge-crafting HTML to Puter cloud storage
 *   2. Updates the grudge-crafting.puter.site hosting to serve it
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';

// ── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let token = process.env.PUTER_API_KEY || null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--token' && args[i + 1]) token = args[++i];
}

if (!token) {
  console.error('❌ No Puter API token. Provide via --token or PUTER_API_KEY env var.');
  console.error('   Get your token from https://puter.com → DevTools → Cookies → puter.auth.token');
  process.exit(1);
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function puterFetch(path, options = {}) {
  const url = `${PUTER_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Puter API ${res.status} ${path}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

async function writeFile(cloudPath, content) {
  // Puter's write API uses multipart form
  const boundary = '----PuterBoundary' + Date.now();
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="path"`,
    '',
    cloudPath,
    `--${boundary}`,
    `Content-Disposition: form-data; name="content"; filename="index.html"`,
    'Content-Type: text/html',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(`${PUTER_API}/write`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    // Try JSON write as fallback
    const res2 = await fetch(`${PUTER_API}/writeFile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: cloudPath,
        content: content,
        overwrite: true,
        create_missing_parents: true,
      }),
    });
    if (!res2.ok) {
      const errText = await res2.text();
      throw new Error(`Write failed: ${errText}`);
    }
    return await res2.json();
  }
  return await res.json();
}

// ── Deploy sites ────────────────────────────────────────────────────────────

const SITES = [
  {
    name: 'grudge-crafting',
    subdomain: 'grudge-crafting',
    localFile: resolve(__dirname, '..', 'client', 'public', 'grudge-crafting.html'),
    cloudDir: '/grudge-crafting',
    description: 'Grudge Warlords Crafting & Professions Suite',
  },
  {
    name: 'grudge-launcher',
    // Existing live subdomain — Puter auto-suffixed when first deployed
    subdomain: 'grudge-launcher-xu9q5',
    localFile: resolve(__dirname, '..', 'client', 'public', 'grudge-launcher.html'),
    cloudDir: '/grudge-launcher',
    description: 'Grudge Warlords Inventory Codex (items, weapons, materials, recipes)',
  },
];

async function deploySite(site) {
  console.log(`\n── Deploying ${site.name} ──────────────────────────`);

  // 1. Read local file
  if (!existsSync(site.localFile)) {
    console.error(`  ❌ File not found: ${site.localFile}`);
    return false;
  }
  const content = readFileSync(site.localFile, 'utf-8');
  console.log(`  📄 Read ${site.localFile} (${(content.length / 1024).toFixed(1)} KB)`);

  // 2. Create directory on Puter cloud
  try {
    await puterFetch('/mkdir', {
      method: 'POST',
      body: JSON.stringify({ path: site.cloudDir, overwrite: false }),
    });
    console.log(`  📁 Created ${site.cloudDir}`);
  } catch (e) {
    // Directory likely already exists
    console.log(`  📁 ${site.cloudDir} (exists)`);
  }

  // 3. Write index.html
  try {
    await writeFile(`${site.cloudDir}/index.html`, content);
    console.log(`  ✅ Wrote ${site.cloudDir}/index.html`);
  } catch (e) {
    console.error(`  ❌ Write failed: ${e.message}`);
    return false;
  }

  // 4. Update hosting (point subdomain to directory)
  try {
    await puterFetch('/hosting/update', {
      method: 'POST',
      body: JSON.stringify({
        subdomain: site.subdomain,
        root_dir: site.cloudDir,
      }),
    });
    console.log(`  🌐 Updated ${site.subdomain}.puter.site → ${site.cloudDir}`);
  } catch (e) {
    // Might need to create first
    try {
      await puterFetch('/hosting/create', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: site.subdomain,
          root_dir: site.cloudDir,
        }),
      });
      console.log(`  🌐 Created ${site.subdomain}.puter.site → ${site.cloudDir}`);
    } catch (e2) {
      console.error(`  ⚠️  Hosting update/create failed: ${e2.message}`);
      console.error(`     You may need to update manually via puter.com`);
    }
  }

  console.log(`  ✅ ${site.name} deployed → https://${site.subdomain}.puter.site`);
  return true;
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log('╔═══════════════════════════════════════╗');
console.log('║  Grudge Studio → Puter Deploy Script  ║');
console.log('╚═══════════════════════════════════════╝');

// Verify auth
try {
  const user = await puterFetch('/auth/check');
  console.log(`\n✅ Authenticated as: ${user?.username || user?.user?.username || 'OK'}`);
} catch (e) {
  console.error(`\n❌ Auth failed: ${e.message}`);
  console.error('   Check your token and try again.');
  process.exit(1);
}

// List current sites
try {
  const sites = await puterFetch('/hosting/list');
  if (Array.isArray(sites) && sites.length > 0) {
    console.log(`\n📋 Current Puter sites (${sites.length}):`);
    sites.forEach(s => console.log(`   • ${s.subdomain}.puter.site`));
  }
} catch (e) {
  console.log('   (Could not list existing sites)');
}

// Deploy each site
let success = 0;
for (const site of SITES) {
  if (await deploySite(site)) success++;
}

console.log(`\n════════════════════════════════════════`);
console.log(`Deployed ${success}/${SITES.length} sites.`);
if (success > 0) {
  console.log(`\nLive sites:`);
  SITES.forEach(s => console.log(`  → https://${s.subdomain}.puter.site`));
}

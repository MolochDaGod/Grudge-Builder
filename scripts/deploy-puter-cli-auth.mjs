#!/usr/bin/env node
/**
 * deploy-puter-cli-auth.mjs
 * Reads the auth token from the installed puter-cli config and
 * deploys grudge-crafting.html to grudge-crafting.puter.site.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';

// ── Read token from puter-cli config ─────────────────────────────────────────
function readCliToken() {
  // Windows: %APPDATA%\puter-cli-nodejs\Config\config.json
  const candidates = [
    join(process.env.APPDATA ?? '', 'puter-cli-nodejs', 'Config', 'config.json'),
    join(os.homedir(), '.config', 'puter-cli-nodejs', 'config.json'),
    join(os.homedir(), '.puter-cli', 'config.json'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      const data = JSON.parse(readFileSync(p, 'utf-8'));
      const profiles = data.profiles ?? [];
      const selected = data.selected_profile;
      const profile = profiles.find(p => p.name === selected) ?? profiles[0];
      if (profile?.token) {
        console.log(`  ✓ Token found in ${p} (profile: ${profile.name ?? 'default'})`);
        return profile.token;
      }
    }
  }
  throw new Error('Could not find puter-cli auth token. Run: puter login');
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function puterFetch(path, options = {}, token) {
  const url = `${PUTER_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Puter API ${res.status} ${path}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function writeFileToCloud(cloudPath, fileContent, token) {
  const boundary = `----PuterBoundary${Date.now()}`;
  const CRLF = '\r\n';
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="path"`,
    '',
    cloudPath,
    `--${boundary}`,
    `Content-Disposition: form-data; name="content"; filename="index.html"`,
    'Content-Type: text/html; charset=utf-8',
    '',
    fileContent,
    `--${boundary}--`,
  ].join(CRLF);

  const res = await fetch(`${PUTER_API}/write`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Write failed ${res.status}: ${text.slice(0, 200)}`);
  }
  return await res.json().catch(() => ({ ok: true }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('╔═══════════════════════════════════════════╗');
console.log('║  Grudge Crafting → Puter Deploy (CLI auth) ║');
console.log('╚═══════════════════════════════════════════╝\n');

const localFile  = resolve(__dirname, '..', 'client', 'public', 'grudge-crafting.html');
const cloudDir   = '/grudge-crafting';
const cloudPath  = `${cloudDir}/index.html`;
const subdomain  = 'grudge-crafting';

// 1. Get token
const token = readCliToken();

// 2. Verify auth
try {
  const user = await puterFetch('/whoami', {}, token);
  console.log(`✓ Authenticated as: ${user?.username ?? JSON.stringify(user).slice(0, 60)}`);
} catch (e) {
  // /whoami might not exist — try /auth/check
  try {
    await puterFetch('/auth/check', {}, token);
    console.log('✓ Auth token valid');
  } catch {
    console.warn(`⚠ Auth check failed: ${e.message} — proceeding anyway`);
  }
}

// 3. Read local file
if (!existsSync(localFile)) throw new Error(`File not found: ${localFile}`);
const content = readFileSync(localFile, 'utf-8');
console.log(`✓ Read ${localFile} (${(content.length / 1024).toFixed(1)} KB)`);

// 4. Ensure cloud directory exists
try {
  await puterFetch('/mkdir', { method: 'POST', body: JSON.stringify({ path: cloudDir, overwrite: false }) }, token);
  console.log(`✓ Ensured directory ${cloudDir}`);
} catch (e) {
  if (!e.message.includes('exists') && !e.message.includes('409')) {
    console.warn(`  mkdir: ${e.message} (continuing)`);
  } else {
    console.log(`  Directory already exists`);
  }
}

// 5. Write file
console.log(`→ Uploading ${cloudPath}…`);
try {
  await writeFileToCloud(cloudPath, content, token);
  console.log(`✓ Wrote ${cloudPath}`);
} catch (e) {
  // Try JSON write as fallback
  console.log(`  Multipart failed: ${e.message} — trying JSON write…`);
  await puterFetch('/write', {
    method: 'POST',
    body: JSON.stringify({ path: cloudPath, content, overwrite: true, create_missing_parents: true }),
  }, token);
  console.log(`✓ Wrote ${cloudPath} (JSON fallback)`);
}

// 6. Update hosting
console.log(`→ Updating hosting: ${subdomain}.puter.site → ${cloudDir}`);
try {
  await puterFetch('/hosting/update', {
    method: 'POST',
    body: JSON.stringify({ subdomain, root_dir: cloudDir }),
  }, token);
  console.log(`✓ Updated hosting`);
} catch (e) {
  try {
    await puterFetch('/hosting/create', {
      method: 'POST',
      body: JSON.stringify({ subdomain, root_dir: cloudDir }),
    }, token);
    console.log(`✓ Created hosting`);
  } catch (e2) {
    console.warn(`⚠ Hosting update failed: ${e2.message}`);
  }
}

console.log(`\n✅ Deployed → https://${subdomain}.puter.site`);

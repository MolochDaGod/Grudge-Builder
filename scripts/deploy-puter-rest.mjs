#!/usr/bin/env node
/** REST deploy to GRUDACHAIN Puter path (no SDK). */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const REMOTE_DIR = '/GRUDACHAIN/sites/grudge-crafting/deployment';
const SUBDOMAIN = 'grudge-crafting';

function loadToken() {
  const envPath = resolve(__dirname, '..', '.env');
  const envText = readFileSync(envPath, 'utf-8');
  for (const key of ['PUTER_API_KEY', 'PUTER_AUTH_TOKEN']) {
    const m = envText.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (m) return m[1].replace(/^["']|["']$/g, '').trim();
  }
  throw new Error('No PUTER_API_KEY or PUTER_AUTH_TOKEN in .env');
}

async function api(path, token, options = {}) {
  const res = await fetch(`${PUTER_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function writeText(token, cloudPath, content) {
  return api('/write', token, {
    method: 'POST',
    body: JSON.stringify({
      path: cloudPath,
      content,
      overwrite: true,
      create_missing_parents: true,
    }),
  });
}

const token = loadToken();
const publicDir = resolve(__dirname, '..', 'client', 'public');

console.log('Auth check…');
try {
  const who = await api('/whoami', token);
  console.log('✓', who?.username || who?.user?.username || 'authenticated');
} catch (e) {
  console.warn('whoami:', e.message.slice(0, 120));
}

console.log('Hosting list…');
try {
  const sites = await api('/hosting/list', token);
  const craft = Array.isArray(sites)
    ? sites.find((s) => s.subdomain === SUBDOMAIN)
    : null;
  console.log('  crafting root:', craft?.root_dir || craft?.rootDir || '(unknown)');
} catch (e) {
  console.warn('  list:', e.message.slice(0, 120));
}

try {
  await api('/mkdir', token, {
    method: 'POST',
    body: JSON.stringify({ path: REMOTE_DIR, create_missing_parents: true }),
  });
} catch {
  /* exists */
}

for (const [local, remote] of [
  ['grudge-crafting.html', 'index.html'],
  ['grudge-fleet.js', 'grudge-fleet.js'],
]) {
  const content = readFileSync(resolve(publicDir, local), 'utf-8');
  const cloudPath = `${REMOTE_DIR}/${remote}`;
  console.log(`→ ${cloudPath} (${(content.length / 1024).toFixed(1)} KB)`);
  await writeText(token, cloudPath, content);
  console.log(`✓ ${remote}`);
}

console.log('→ hosting update');
try {
  await api('/hosting/update', token, {
    method: 'POST',
    body: JSON.stringify({ subdomain: SUBDOMAIN, root_dir: REMOTE_DIR }),
  });
  console.log('✓ hosting');
} catch (e) {
  console.warn('hosting:', e.message.slice(0, 200));
}

console.log(`\n✅ https://${SUBDOMAIN}.puter.site`);
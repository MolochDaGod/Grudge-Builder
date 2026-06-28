#!/usr/bin/env node
/**
 * Deploy grudge-crafting to Puter via SDK fs.write (GRUDACHAIN account).
 * Usage: node scripts/deploy-puter-write.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const SDK_PATH =
  'C:/Users/nugye/npm-global/node_modules/puter-cli/node_modules/@heyputer/puter.js/src/init.cjs';

function readToken() {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) throw new Error('Missing .env');
  const envText = readFileSync(envPath, 'utf-8');
  for (const key of ['PUTER_AUTH_TOKEN', 'PUTER_API_KEY']) {
    const m = envText.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (m) {
      const val = m[1].replace(/^["']|["']$/g, '').trim();
      if (val) return { token: val, source: key };
    }
  }
  throw new Error('Set PUTER_AUTH_TOKEN or PUTER_API_KEY in .env');
}

const REMOTE_DIR = '/GRUDACHAIN/sites/grudge-crafting/deployment';
const PUBLIC = resolve(__dirname, '..', 'client', 'public');
const FILES = [
  { local: 'grudge-crafting.html', remote: 'index.html' },
  { local: 'grudge-fleet.js', remote: 'grudge-fleet.js' },
];

const { token, source } = readToken();
const { init } = require(SDK_PATH);
const puter = init();
puter.setAuthToken(token);

console.log(`Token: .env (${source})`);
console.log(`Remote: ${REMOTE_DIR}\n`);

for (const f of FILES) {
  const content = readFileSync(resolve(PUBLIC, f.local), 'utf-8');
  const remotePath = `${REMOTE_DIR}/${f.remote}`;
  console.log(`→ ${f.local} → ${remotePath} (${(content.length / 1024).toFixed(1)} KB)`);
  await puter.fs.write(remotePath, content, { overwrite: true });
  console.log(`✓ ${f.remote}`);
}

console.log('\n→ Hosting update…');
try {
  await puter.hosting.update('grudge-crafting', REMOTE_DIR);
  console.log('✓ Hosting updated');
} catch (e) {
  try {
    await puter.hosting.create('grudge-crafting', REMOTE_DIR);
    console.log('✓ Hosting created');
  } catch (e2) {
    console.warn(`⚠ Hosting: ${e2.message?.slice(0, 120)}`);
  }
}

console.log('\n✅ https://grudge-crafting.puter.site');
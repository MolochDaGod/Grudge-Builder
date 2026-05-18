#!/usr/bin/env node
'use strict';
/**
 * deploy-puter-cjs.cjs
 * Uses the @heyputer/puter.js SDK init() to upload grudge-crafting.html
 * to grudge-crafting.puter.site via the GRUDACHAIN account.
 */

const path    = require('path');
const fs      = require('fs');
const os      = require('os');

const SDK_PATH   = 'C:/Users/nugye/npm-global/node_modules/puter-cli/node_modules/@heyputer/puter.js/src/init.cjs';
const CONFIG_PATH = path.join(process.env.APPDATA || os.homedir(), 'puter-cli-nodejs', 'Config', 'config.json');
const LOCAL_FILE  = path.resolve(__dirname, '..', 'client', 'public', 'grudge-crafting.html');
const REMOTE_DIR  = '/GRUDACHAIN/sites/grudge-crafting/deployment';
const SUBDOMAIN   = 'grudge-crafting';

// ── Read CLI token ────────────────────────────────────────────────────────────
function readToken() {
  const data     = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const profiles = data.profiles ?? [];
  const uuid     = data.selected_profile;
  const profile  = profiles.find(p => p.uuid === uuid) ?? profiles[0];
  if (!profile?.token) throw new Error('No token. Run: puter login');
  return profile.token;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Grudge Crafting → Puter Deploy (CJS)    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Auth
  const token = readToken();
  const { init } = require(SDK_PATH);
  const puter   = init();
  puter.setAuthToken(token);
  console.log('✓ Auth set');

  // 2. Read file
  const content = fs.readFileSync(LOCAL_FILE);
  console.log(`✓ File: ${LOCAL_FILE} (${(content.length / 1024).toFixed(1)} KB)`);

  // 3. Create remote dir (idempotent)
  console.log(`→ Ensuring remote dir: ${REMOTE_DIR}`);
  let remoteDir;
  try {
    remoteDir = await puter.fs.mkdir(REMOTE_DIR, {
      overwrite: false,
      dedupeName: false,
      createMissingParents: true,
    });
    console.log(`✓ Dir ready: ${remoteDir.path}`);
  } catch (e) {
    // Already exists or other issue — stat it
    console.log(`  mkdir: ${e.message?.slice(0, 80)} — using path directly`);
    remoteDir = { path: REMOTE_DIR };
  }

  // Normalise path (ensure forward slashes, starts with /)
  const dirPath = (remoteDir.path || REMOTE_DIR).replace(/\\/g, '/');
  console.log(`  Remote path: ${dirPath}`);

  // 4. Upload
  console.log(`→ Uploading index.html…`);
  const file = new (globalThis.File ?? require('buffer').File)(
    [content], 'index.html', { type: 'text/html' }
  );

  const result = await puter.fs.upload(file, dirPath, { overwrite: true });
  const uploadedPath = Array.isArray(result) ? result[0]?.path : result?.path;
  console.log(`✓ Uploaded → ${uploadedPath ?? dirPath + '/index.html'}`);

  // 5. Point hosting to the dir
  console.log(`→ Hosting: ${SUBDOMAIN}.puter.site → ${dirPath}`);
  try {
    await puter.hosting.update(SUBDOMAIN, dirPath);
    console.log(`✓ Hosting updated`);
  } catch (e) {
    try {
      await puter.hosting.create(SUBDOMAIN, dirPath);
      console.log(`✓ Hosting created`);
    } catch (e2) {
      console.warn(`⚠ Hosting: ${e2.message?.slice(0, 80)}`);
      console.log('  File is uploaded. Verify: puter site info grudge-crafting');
    }
  }

  console.log(`\n✅ Done → https://${SUBDOMAIN}.puter.site`);
  process.exit(0);
})().catch(e => {
  console.error('\n❌ Deploy failed:', e.message ?? e);
  process.exit(1);
});

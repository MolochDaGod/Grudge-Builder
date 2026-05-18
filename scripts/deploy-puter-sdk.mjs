#!/usr/bin/env node
/**
 * deploy-puter-sdk.mjs
 * Uses the @heyputer/puter.js SDK (same as puter-cli) to deploy
 * grudge-crafting.html to grudge-crafting.puter.site.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
import os from 'os';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Read token from puter-cli Conf store ──────────────────────────────────────
function readCliToken() {
  const configFile = join(process.env.APPDATA ?? os.homedir(), 'puter-cli-nodejs', 'Config', 'config.json');
  if (!existsSync(configFile)) throw new Error(`Config not found: ${configFile}. Run: puter login`);

  const data = JSON.parse(readFileSync(configFile, 'utf-8'));
  const profiles = data.profiles ?? [];
  const uuid = data.selected_profile;
  const profile = profiles.find(p => p.uuid === uuid) ?? profiles[0];
  if (!profile?.token) throw new Error('No token in config. Run: puter login');
  console.log(`  ✓ Token from profile: ${profile.name ?? uuid ?? 'default'}`);
  return profile.token;
}

// ── Load puter.js SDK from puter-cli's own node_modules ──────────────────────
const puterCliBase = join(
  process.env.npm_global ?? 'C:\\Users\\nugye\\npm-global',
  'node_modules', 'puter-cli', 'node_modules', '@heyputer', 'puter.js'
);
const sdkPath = existsSync(puterCliBase)
  ? join(puterCliBase, 'src', 'init.cjs')
  : null;

let puter;
if (sdkPath) {
  const mod = require(sdkPath);
  puter = mod.puter ?? mod.default ?? mod;
} else {
  // Fallback: try @heyputer/puter.js from puter-cli top-level
  try {
    const mod = require(join(
      'C:\\Users\\nugye\\npm-global\\node_modules\\puter-cli',
      'node_modules', '@heyputer', 'puter.js', 'src', 'init.cjs'
    ));
    puter = mod.puter ?? mod.default ?? mod;
  } catch {
    throw new Error('Cannot find @heyputer/puter.js SDK');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════╗');
console.log('║  Grudge Crafting → Puter Deploy (SDK)    ║');
console.log('╚══════════════════════════════════════════╝\n');

const localFile = resolve(__dirname, '..', 'client', 'public', 'grudge-crafting.html');
const subdomain = 'grudge-crafting';
const remoteDir = `~/sites/${subdomain}/deployment`;

// 1. Authenticate
const token = readCliToken();
puter.setAuthToken(token);
console.log('✓ SDK authenticated');

// 2. Read local file
if (!existsSync(localFile)) throw new Error(`File not found: ${localFile}`);
const content = readFileSync(localFile);
console.log(`✓ Read ${localFile} (${(content.length / 1024).toFixed(1)} KB)`);

// 3. Create remote directory
console.log(`→ Creating remote dir: ${remoteDir}`);
let directory;
try {
  directory = await puter.fs.mkdir(remoteDir, {
    dedupeName: false,
    createMissingParents: true,
    overwrite: true,
  });
  console.log(`✓ Remote dir ready: ${directory.path}`);
} catch (e) {
  // If it already exists, try to stat it
  console.log(`  mkdir: ${e.message} — trying to stat existing dir`);
  directory = { path: remoteDir.replace('~', `/GRUDACHAIN`) };
}

// 4. Upload the file
console.log(`→ Uploading index.html to ${directory.path}`);
const fileBlob = new Blob([content], { type: 'text/html' });
// Give it the name index.html
Object.defineProperty(fileBlob, 'name', { value: 'index.html' });

try {
  const uploadResult = await puter.fs.upload(
    new File([content], 'index.html', { type: 'text/html' }),
    directory.path,
    { overwrite: true }
  );
  console.log(`✓ Uploaded → ${uploadResult?.path ?? directory.path + '/index.html'}`);
} catch (e) {
  console.error(`Upload failed: ${e.message}`);
  console.log('\nFallback: please deploy manually with:');
  console.log(`  puter site deploy "${resolve(__dirname, '..', 'client', 'public')}" grudge-crafting`);
  console.log('  (rename grudge-crafting.html to index.html first)');
  process.exit(1);
}

// 5. Create/update site
console.log(`→ Setting up hosting: ${subdomain}.puter.site`);
try {
  const Conf = require(join(
    'C:\\Users\\nugye\\npm-global\\node_modules\\puter-cli\\node_modules\\conf'
  ));
  // Import createSite from the CLI's sites module
  const { createSite } = await import(
    `file:///${join('C:\\Users\\nugye\\npm-global\\node_modules\\puter-cli\\src\\commands\\sites.js').replace(/\\/g, '/')}`
  );
  await createSite([subdomain, directory.path, `--subdomain=${subdomain}`]);
  console.log('✓ Hosting configured');
} catch (e) {
  console.warn(`⚠ Could not auto-configure hosting: ${e.message}`);
  console.log('  The file is uploaded. Run: puter sites');
}

console.log(`\n✅ Done → https://${subdomain}.puter.site`);

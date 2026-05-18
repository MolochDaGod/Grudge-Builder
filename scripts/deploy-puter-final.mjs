#!/usr/bin/env node
/**
 * deploy-puter-final.mjs
 * Uses the puter-cli's own initPuterModule + uploadFile + createSite
 * to deploy grudge-crafting.html to grudge-crafting.puter.site.
 *
 * Usage: node scripts/deploy-puter-final.mjs
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_SRC = 'C:/Users/nugye/npm-global/node_modules/puter-cli/src';

const toFileURL = p => `file:///${p.replace(/\\/g, '/')}`;

console.log('╔══════════════════════════════════════════════╗');
console.log('║  Grudge Crafting → Puter Deploy (final)      ║');
console.log('╚══════════════════════════════════════════════╝\n');

// ── Import CLI modules ────────────────────────────────────────────────────────
const { initPuterModule } = await import(toFileURL(`${CLI_SRC}/modules/PuterModule.js`));
const { uploadFile }      = await import(toFileURL(`${CLI_SRC}/commands/files.js`));
const { createSite }      = await import(toFileURL(`${CLI_SRC}/commands/sites.js`));

// ── Paths ─────────────────────────────────────────────────────────────────────
const localFile  = resolve(__dirname, '..', 'client', 'public', 'grudge-crafting.html');
const remotePath = '/GRUDACHAIN/sites/grudge-crafting/deployment';
const subdomain  = 'grudge-crafting';

if (!existsSync(localFile)) throw new Error(`File not found: ${localFile}`);
const fileSizeKB = (existsSync(localFile)
  ? (await import('fs')).readFileSync(localFile).length
  : 0) / 1024;
console.log(`✓ Local file: ${localFile} (${fileSizeKB.toFixed(1)} KB)`);

// ── Init auth from CLI config ─────────────────────────────────────────────────
initPuterModule();
console.log('✓ Auth initialised from puter-cli config\n');

// ── Upload ────────────────────────────────────────────────────────────────────
// uploadFile args: [localPath, remotePath (abs), dedupeName, overwrite]
// remotePath starts with '/' → treated as absolute by the CLI
console.log(`→ Uploading to ${remotePath}…`);
await uploadFile([localFile, remotePath, 'false', 'true']);

// ── Ensure hosting points to the right directory ──────────────────────────────
console.log(`\n→ Configuring hosting: ${subdomain}.puter.site → ${remotePath}`);
await createSite([subdomain, remotePath, `--subdomain=${subdomain}`]);

console.log(`\n✅ Deployed → https://${subdomain}.puter.site`);

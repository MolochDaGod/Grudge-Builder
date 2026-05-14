#!/usr/bin/env node
/**
 * fix-puter-404s.mjs — Deploy 404.html SPA fallback to all canonical Puter sites.
 *
 * Reads auth token from puter-cli config, then writes 404.html to each
 * canonical site's Puter FS directory via REST API.
 *
 * Usage:
 *   node scripts/fix-puter-404s.mjs
 *
 * Puter static hosting serves 404.html when a path doesn't match a real file,
 * so this fixes SPA sub-route 404s across all kept sites.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { init as initPuter } from '@heyputer/puter.js/src/init.cjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load token from puter-cli config ────────────────────────────────────────
function loadToken() {
  const configPath = join(homedir(), 'AppData', 'Roaming', 'puter-cli-nodejs', 'Config', 'config.json');
  if (!existsSync(configPath)) {
    console.error('❌ Puter CLI config not found. Run `puter login` first.');
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const profile = config.profiles?.find(p => p.uuid === config.selected_profile) || config.profiles?.[0];
  if (!profile?.token) {
    console.error('❌ No auth token in Puter CLI config. Run `puter login` first.');
    process.exit(1);
  }
  return profile.token;
}

const token = loadToken();
const puter = initPuter(token);

// ── 404.html content ────────────────────────────────────────────────────────
const FALLBACK_HTML = readFileSync(resolve(__dirname, 'puter-404.html'), 'utf-8');

// ── Canonical sites: directory → subdomain mapping ──────────────────────────
// Directory paths are relative to the user's Puter FS root (/GRUDACHAIN/)
const CANONICAL_SITES = [
  // OPERATIONS / USER SERVICES
  { dir: 'grudachain',           sub: 'grudachain-ve8e8',       cat: 'ops',   desc: 'GrudaChain Nexus Hub' },
  { dir: 'grudge-auth',          sub: 'grudge-auth',            cat: 'ops',   desc: 'Universal Auth Portal' },
  { dir: 'grudge-cloud',         sub: 'grudge-cloud',           cat: 'ops',   desc: 'Cloud Admin Dashboard' },
  { dir: 'grudge-studio',        sub: 'grudge-studio',          cat: 'ops',   desc: 'The ENGINE (Puter prod)' },
  { dir: 'GrudgeLauncher',       sub: 'agile-frog-4851',        cat: 'ops',   desc: 'Heroic Games Launcher' },
  { dir: 'chatgrudge',           sub: 'chatgrudge',             cat: 'ops',   desc: 'Multiplayer AI Chat' },

  // GRUDGE STUDIO GAMES
  { dir: 'dist',                 sub: 'grudge-attack-system',   cat: 'game',  desc: 'Attack Motion System' },
  { dir: 'Warlords',             sub: 'grudge-warlords-7dp9c',  cat: 'game',  desc: 'Warlords 2D RPG' },
  { dir: 'crafting',             sub: 'grudge-crafting',         cat: 'game',  desc: 'Crafting Suite' },
  { dir: 'gruda',                sub: 'active-meerkat-8204',     cat: 'game',  desc: 'GRUDGE Warlords Login' },
  { dir: 'grudge-arena-*',       sub: 'grudgechain-fixed-v2-wx18h', cat: 'game', desc: 'Grudge Arena 3D' },

  // AI AGENTS (all 9 GRUDA Legion agents)
  { dir: 'ga-grd1-7',            sub: 'ga-grd1-7',              cat: 'ai',    desc: 'GRD1.7 Agent' },
  { dir: 'ga-grd2-7',            sub: 'ga-grd2-7',              cat: 'ai',    desc: 'GRD2.7 Agent' },
  { dir: 'ga-aleofthought',      sub: 'ga-aleofthought',        cat: 'ai',    desc: 'ALEofThought Agent' },
  { dir: 'ga-perplexity',        sub: 'ga-perplexity',          cat: 'ai',    desc: 'Perplexity Agent' },
  { dir: 'ga-dangrd',            sub: 'ga-dangrd',              cat: 'ai',    desc: 'DANGRD Agent' },
  { dir: 'ga-grdviz',            sub: 'ga-grdviz',              cat: 'ai',    desc: 'GRDVIZ Agent' },
  { dir: 'ga-norightanswergrd',  sub: 'ga-norightanswergrd',    cat: 'ai',    desc: 'NoRightAnswerGRD Agent' },
  { dir: 'ga-ale',               sub: 'ga-ale',                 cat: 'ai',    desc: 'ALE Agent' },
  { dir: 'ga-grdsprint',         sub: 'ga-grdsprint',           cat: 'ai',    desc: 'GRDSPRINT Agent' },

  // EDITORS & TOOLS
  { dir: '3dputer',              sub: '3dputer',                cat: 'tool',  desc: 'GStudio 3D Viewer' },
  // FIXME: verify actual dir names from `puter ls` for these
  { dir: 'grudge-network',       sub: 'grudge-network-zk1qm',  cat: 'tool',  desc: 'Gruda Browser' },

  // PvPGN / DIABLO
  { dir: 'downloads',            sub: 'downloads',              cat: 'pvpgn', desc: 'Game Downloads Hub' },
  { dir: 'setup-guide',          sub: 'setup-guide',            cat: 'pvpgn', desc: 'Setup Guide' },
  { dir: 'gateway-installer',    sub: 'gateway-installer',      cat: 'pvpgn', desc: 'Gateway Installer' },
  { dir: 'server-status',        sub: 'server-status',          cat: 'pvpgn', desc: 'Server Status' },
];

// ── API helper using Puter.js SDK ───────────────────────────────────────────
async function puterWrite(cloudPath, content) {
  await puter.fs.write(cloudPath, content, { overwrite: true, createMissingParents: true });
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  Puter 404.html SPA Fallback — Canonical Deploy ║');
console.log('╚══════════════════════════════════════════════════╝');

// Verify auth
try {
  const user = await puter.auth.getUser();
  console.log(`\n✅ Authenticated as: ${user?.username || 'OK'}\n`);
} catch (e) {
  console.error(`\n❌ Auth failed: ${e.message}`);
  process.exit(1);
}

const results = { ok: 0, fail: 0, errors: [] };
const catIcons = { ops: '🏴‍☠️', game: '🎮', ai: '🤖', tool: '🛠️', pvpgn: '🎲' };

for (const site of CANONICAL_SITES) {
  const cloudPath = `/GRUDACHAIN/${site.dir}/404.html`;
  const icon = catIcons[site.cat] || '📦';
  const label = `${icon} [${site.cat}] ${site.sub}`;

  try {
    process.stdout.write(`  ${label.padEnd(55)} → ${cloudPath}  `);
    await puterWrite(cloudPath, FALLBACK_HTML);
    console.log('✅');
    results.ok++;
  } catch (e) {
    console.log(`❌ ${e.message.slice(0, 80)}`);
    results.fail++;
    results.errors.push({ site: site.sub, error: e.message });
  }
}

// Summary
console.log(`\n${'═'.repeat(55)}`);
console.log(`✅ Success: ${results.ok}/${CANONICAL_SITES.length}`);
if (results.fail > 0) {
  console.log(`❌ Failed: ${results.fail}`);
  results.errors.forEach(e => console.log(`   • ${e.site}: ${e.error.slice(0, 100)}`));
}

// Verify
console.log(`\n── Verifying sub-route on grudge-auth.puter.site/test ──`);
try {
  const res = await fetch('https://grudge-auth.puter.site/test', { redirect: 'follow' });
  console.log(`  Status: ${res.status} ${res.status === 200 ? '— 404 fix working! 🎉' : ''}`);
} catch (e) {
  console.log(`  Verification failed: ${e.message}`);
}

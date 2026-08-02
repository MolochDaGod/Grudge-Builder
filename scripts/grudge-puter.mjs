#!/usr/bin/env node
/**
 * Grudge Puter CLI — replaces broken `puter login` socket stack for fleet deploys.
 *
 *   npm run puter -- login
 *   npm run puter -- whoami
 *   npm run puter -- deploy crafting
 *   npm run puter -- site info grudge-crafting
 *   npm run puter -- cdn
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ensureAuth,
  credentialLogin,
  whoami,
  loadTokenFromCli,
  getConfigPath,
} from './lib/puter-auth.mjs';
import {
  deployCraftingSite,
  readHosting,
  hostingRootDir,
  CRAFTING_SUBDOMAIN,
} from './lib/puter-deploy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const [cmd, sub, arg] = args;

function usage() {
  console.log(`
Grudge Puter CLI (REST — no socket.io)

  login              PUTER_USER + PUTER_PASS → CLI config
  whoami             Show active Puter account
  deploy crafting    Upload fleet crafting app + bind hosting
  site info [name]   Show hosting root_dir (default: grudge-crafting)
  cdn                Upload crafting assets to R2 CDN

Env: PUTER_USER, PUTER_PASS, PUTER_TOKEN, PUTER_API_KEY
Config: ${getConfigPath()}
`);
}

async function cmdLogin() {
  const user = process.env.PUTER_USER || process.argv[4];
  const pass = process.env.PUTER_PASS || process.argv[5];
  if (!user || !pass) {
    console.error('Set PUTER_USER and PUTER_PASS (or: login <user> <pass>)');
    process.exit(1);
  }
  const r = await credentialLogin(user, pass);
  console.log(`✓ Logged in as ${r.username}`);
  console.log(`✓ Config: ${r.configPath}`);
}

async function cmdWhoami() {
  const auth = await ensureAuth();
  console.log(`username: ${auth.username}`);
  console.log(`source:   ${auth.source}`);
  const hosting = await readHosting(auth.token);
  if (hosting) {
    console.log(`crafting root: ${hostingRootDir(hosting) || '(unknown)'}`);
  }
}

async function cmdDeployCrafting() {
  const auth = await ensureAuth();
  console.log(`✓ Auth: ${auth.username} (${auth.source})`);
  const result = await deployCraftingSite(auth.token, auth.username);
  for (const u of result.uploads) {
    console.log(u.ok ? `✓ ${u.dir}` : `✗ ${u.dir} — ${u.error}`);
  }
  if (result.bound) console.log(`✓ hosting → ${result.bound}`);
  console.log(`\n✅ Puter redirect: ${result.url}`);
  console.log(`✅ Canonical craft: ${result.canonical || 'https://grudgewarlords.com/craft/'}`);
  console.log('   Puter index.html redirects here; full suite also at craft.html on Puter.\n');
}

async function cmdSiteInfo() {
  const auth = await ensureAuth();
  const name = arg || CRAFTING_SUBDOMAIN;
  const hosting = await readHosting(auth.token, name);
  if (!hosting) {
    console.log(`No hosting for ${name} on account ${auth.username}`);
    return;
  }
  console.log(JSON.stringify(hosting, null, 2));
}

function cmdCdn() {
  const script = resolve(__dirname, 'upload-crafting-to-r2.mjs');
  const remote = process.argv.includes('--remote');
  const r = spawnSync(process.execPath, [script, ...(remote ? ['--remote'] : [])], {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
  });
  process.exit(r.status ?? 1);
}

try {
  switch (cmd) {
    case 'login':
      await cmdLogin();
      break;
    case 'whoami':
      await cmdWhoami();
      break;
    case 'deploy':
      if (sub === 'crafting') await cmdDeployCrafting();
      else {
        console.error('Unknown deploy target. Use: deploy crafting');
        process.exit(1);
      }
      break;
    case 'site':
      if (sub === 'info') await cmdSiteInfo();
      else {
        console.error('Use: site info [subdomain]');
        process.exit(1);
      }
      break;
    case 'cdn':
      cmdCdn();
      break;
    case 'help':
    case '-h':
    case '--help':
    case undefined:
      usage();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      usage();
      process.exit(1);
  }
} catch (e) {
  console.error('❌', e.message || e);
  process.exit(1);
}
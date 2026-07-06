#!/usr/bin/env node
/**
 * Puter credential login without broken puter-cli socket stack.
 * Usage: PUTER_USER=... PUTER_PASS=... node scripts/puter-credential-login.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

const user = process.env.PUTER_USER || process.argv[2];
const pass = process.env.PUTER_PASS || process.argv[3];
if (!user || !pass) {
  console.error('Usage: PUTER_USER=... PUTER_PASS=... node scripts/puter-credential-login.mjs');
  process.exit(1);
}

const res = await fetch('https://puter.com/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: '*/*',
    Origin: 'https://puter.com',
    Referer: 'https://puter.com/',
  },
  body: JSON.stringify({ username: user, password: pass }),
});

const data = await res.json().catch(() => ({}));
if (!res.ok || !data.token) {
  console.error('Login failed:', data.error?.message || data.message || res.status);
  process.exit(1);
}

const token = data.token;
const who = await fetch('https://api.puter.com/whoami', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

const username = who?.username || user;
const cfgDir = join(process.env.APPDATA || join(homedir(), '.config'), 'puter-cli-nodejs', 'Config');
mkdirSync(cfgDir, { recursive: true });
const cfgPath = join(cfgDir, 'config.json');

let cfg = { profiles: [], selected_profile: null, username: null, cwd: null };
if (existsSync(cfgPath)) {
  try { cfg = JSON.parse(readFileSync(cfgPath, 'utf-8')); } catch {}
}

const uuid = randomUUID();
const profile = {
  host: 'https://puter.com',
  username,
  cwd: `/${username}`,
  token,
  uuid,
};

cfg.profiles = (cfg.profiles || []).filter((p) => p.username !== username);
cfg.profiles.push(profile);
cfg.selected_profile = uuid;
cfg.username = username;
cfg.cwd = profile.cwd;

writeFileSync(cfgPath, JSON.stringify(cfg, null, '\t') + '\n', 'utf-8');
console.log(`✓ Logged in as ${username}`);
console.log(`✓ Token saved to ${cfgPath}`);
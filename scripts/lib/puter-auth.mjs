/**
 * Canonical Puter auth for Grudge deploy scripts.
 * Bypasses broken puter-cli socket stack — uses REST only.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUTER_API = 'https://api.puter.com';
const PUTER_GUI = 'https://puter.com';

export function getConfigPath() {
  const base = process.env.APPDATA || join(homedir(), '.config');
  return join(base, 'puter-cli-nodejs', 'Config', 'config.json');
}

export function readConfig() {
  const path = getConfigPath();
  if (!existsSync(path)) return { profiles: [], selected_profile: null };
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { profiles: [], selected_profile: null };
  }
}

export function writeConfig(cfg) {
  const path = getConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cfg, null, '\t') + '\n', 'utf-8');
  return path;
}

export function loadTokenFromEnv() {
  for (const key of ['PUTER_TOKEN', 'PUTER_API_KEY', 'PUTER_AUTH_TOKEN']) {
    const v = process.env[key]?.trim();
    if (v) return { token: v.replace(/^["']|["']$/g, ''), source: key };
  }
  const envPath = resolve(__dirname, '..', '..', '.env');
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf-8');
    for (const key of ['PUTER_TOKEN', 'PUTER_API_KEY', 'PUTER_AUTH_TOKEN']) {
      const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
      if (m) return { token: m[1].replace(/^["']|["']$/g, '').trim(), source: `.env:${key}` };
    }
    const user = env.match(/^PUTER_USER=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim();
    const pass = env.match(/^PUTER_PASS=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim();
    if (user && pass) return { credentials: { user, pass }, source: '.env' };
  }
  if (process.env.PUTER_USER && process.env.PUTER_PASS) {
    return {
      credentials: { user: process.env.PUTER_USER, pass: process.env.PUTER_PASS },
      source: 'env',
    };
  }
  return null;
}

export function loadTokenFromCli() {
  const cfg = readConfig();
  const profile =
    cfg.profiles?.find((p) => p.uuid === cfg.selected_profile) || cfg.profiles?.[0];
  if (profile?.token) {
    return { token: profile.token, username: profile.username, source: 'cli-config' };
  }
  return null;
}

export async function whoami(token) {
  const data = await fetch(`${PUTER_API}/whoami`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  if (data?.reauth_required || data?.error || !data?.username) {
    return { ok: false, error: data?.message || data?.error || 'invalid token' };
  }
  return { ok: true, username: data.username, uuid: data.uuid, raw: data };
}

export async function credentialLogin(username, password) {
  const res = await fetch(`${PUTER_GUI}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
      Origin: PUTER_GUI,
      Referer: `${PUTER_GUI}/`,
    },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));

  if (data.proceed && data.next_step === 'otp') {
    throw new Error('2FA required — complete login at puter.com, then set PUTER_TOKEN');
  }
  if (!data.token) {
    throw new Error(data.error?.message || data.message || `login failed (${res.status})`);
  }

  const session = await whoami(data.token);
  const uname = session.ok ? session.username : (data.user?.username || username);

  const cfg = readConfig();
  const uuid = randomUUID();
  const profile = {
    host: PUTER_GUI,
    username: uname,
    cwd: `/${uname}`,
    token: data.token,
    uuid,
  };
  cfg.profiles = (cfg.profiles || []).filter((p) => p.username !== uname);
  cfg.profiles.push(profile);
  cfg.selected_profile = uuid;
  cfg.username = uname;
  cfg.cwd = profile.cwd;
  const path = writeConfig(cfg);

  return { token: data.token, username: uname, configPath: path };
}

/**
 * Resolve a valid Puter token — CLI config → env token → credential login.
 */
export async function ensureAuth(opts = {}) {
  const cli = loadTokenFromCli();
  if (cli?.token) {
    const session = await whoami(cli.token);
    if (session.ok) {
      return { token: cli.token, username: session.username, source: cli.source };
    }
  }

  const env = loadTokenFromEnv();
  if (env?.token) {
    const session = await whoami(env.token);
    if (session.ok) {
      return { token: env.token, username: session.username, source: env.source };
    }
  }

  const creds = env?.credentials;
  if (creds || (opts.username && opts.password)) {
    const user = creds?.user || opts.username;
    const pass = creds?.pass || opts.password;
    const login = await credentialLogin(user, pass);
    return { token: login.token, username: login.username, source: 'credential-login' };
  }

  throw new Error(
    'Puter auth required. Set PUTER_USER+PUTER_PASS or PUTER_TOKEN, or run: npm run puter:login',
  );
}
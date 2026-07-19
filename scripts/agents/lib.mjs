/**
 * Shared helpers for production agents (Node ESM).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');
export const REPORT_DIR = path.join(ROOT, 'scripts', 'agents', 'reports');

export const RAILWAY = {
  projectId: '92f039ec-2cce-4e1e-b06a-dd0ac6256d70',
  environmentId: '3c33203b-c01e-44f2-b4a5-943526e96981',
  serviceId: '7a31d77f-e10e-403b-94ff-894a0feb5608',
  publicUrl: 'https://grudge-api-production-0d46.up.railway.app',
};

export const URLS = {
  health: `${RAILWAY.publicUrl}/api/health`,
  colyseus: `${RAILWAY.publicUrl}/api/colyseus/health`,
  mpStatus: `${RAILWAY.publicUrl}/api/multiplayer/status`,
  mpSession: `${RAILWAY.publicUrl}/api/multiplayer/session`,
  client: 'https://grudge.studio',
  warlords: 'https://grudgewarlords.com',
  assets: 'https://assets.grudge-studio.com',
  id: 'https://id.grudge-studio.com',
};

export function ensureReportDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function writeReport(name, data) {
  ensureReportDir();
  const file = path.join(REPORT_DIR, `${name}-${stamp()}.json`);
  const latest = path.join(REPORT_DIR, `${name}-latest.json`);
  const body = JSON.stringify(data, null, 2);
  fs.writeFileSync(file, body, 'utf8');
  fs.writeFileSync(latest, body, 'utf8');
  return { file, latest };
}

export function run(cmd, args, opts = {}) {
  const cwd = opts.cwd ?? ROOT;
  const r = spawnSync(cmd, args, {
    cwd,
    shell: opts.shell ?? process.platform === 'win32',
    encoding: 'utf8',
    env: { ...process.env, ...opts.env },
    timeout: opts.timeout ?? 0,
    stdio: opts.silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    error: r.error?.message,
  };
}

export async function probe(url, { timeoutMs = 12000, expectStatus = null } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'grudge-production-agent/1.0' },
    });
    const ms = Date.now() - started;
    const ct = res.headers.get('content-type') || '';
    let json = null;
    let textSnippet = '';
    if (ct.includes('application/json')) {
      try {
        json = await res.json();
      } catch {
        /* ignore */
      }
    } else {
      try {
        textSnippet = (await res.text()).slice(0, 200);
      } catch {
        /* ignore */
      }
    }
    const statusOk = expectStatus
      ? expectStatus.includes(res.status)
      : res.status >= 200 && res.status < 400;
    return {
      url,
      status: res.status,
      ms,
      ok: statusOk,
      json,
      textSnippet,
    };
  } catch (err) {
    return {
      url,
      status: 0,
      ms: Date.now() - started,
      ok: false,
      error: err.message || String(err),
    };
  } finally {
    clearTimeout(t);
  }
}

export function log(agent, msg) {
  console.log(`[${agent}] ${msg}`);
}

export function argFlag(name) {
  return process.argv.includes(name);
}

export function argValue(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
    return process.argv[i + 1];
  }
  return fallback;
}

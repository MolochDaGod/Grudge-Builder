#!/usr/bin/env node
/**
 * hosting.mjs — AI check for vercel.json hosting/deploy wiring.
 * - Parse vercel.json
 * - Assert rewrites/headers/env are well-formed arrays/objects
 * - For every *.grudge-studio.com host referenced in env/rewrites, ensure it is permitted by CSP:
 *     connect-src and frame-src must include the host or a wildcard that covers it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const VERCEL = resolve(ROOT, 'vercel.json');

function parseJSONSafe(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function collectHostsFromRewrites(rewrites = []) {
  const hosts = new Set();
  for (const r of rewrites) {
    const dest = r?.destination || '';
    const m = dest.match(/^https?:\/\/([^/]+)/i);
    if (m) hosts.add(m[1]);
  }
  return hosts;
}

function collectHostsFromEnv(env = {}) {
  const hosts = new Set();
  for (const v of Object.values(env)) {
    if (typeof v !== 'string') continue;
    const m = v.match(/^https?:\/\/([^/]+)/i);
    if (m) hosts.add(m[1]);
  }
  return hosts;
}

function getCSP(cspValue) {
  // returns map like { 'connect-src': [...], 'frame-src': [...] }
  const out = {};
  const parts = cspValue.split(';').map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    const [dir, ...rest] = p.split(/\s+/);
    out[dir] = rest;
  }
  return out;
}

function hostAllowed(host, directives) {
  if (!directives || directives.length === 0) return false;
  if (directives.includes('https:') || directives.includes('*')) return true;
  // exact or wildcard suffix
  for (const d of directives) {
    if (d === host) return true;
    if (d.startsWith('*.')) {
      const suffix = d.slice(1); // .grudge-studio.com
      if (host.endsWith(suffix)) return true;
    }
  }
  return false;
}

function main() {
  if (!existsSync(VERCEL)) {
    console.error('❌ vercel.json not found');
    process.exit(1);
  }
  const cfg = parseJSONSafe(VERCEL);
  if (!cfg) {
    console.error('❌ vercel.json is not valid JSON');
    process.exit(1);
  }

  const issues = [];
  const warnings = [];

  if (!Array.isArray(cfg.rewrites)) warnings.push('vercel.json: rewrites should be an array');
  if (!Array.isArray(cfg.headers)) warnings.push('vercel.json: headers should be an array');
  if (cfg.env && typeof cfg.env !== 'object') issues.push('vercel.json: env must be an object');

  const rewrites = cfg.rewrites || [];
  const env = cfg.env || {};

  const hosts = new Set([
    ...collectHostsFromRewrites(rewrites),
    ...collectHostsFromEnv(env),
  ]);

  // Find CSP header for root
  let csp = null;
  for (const h of (cfg.headers || [])) {
    if (h.source === '/(.*)' || h.source === '/*' || h.source === '/') {
      const arr = h.headers || [];
      const c = arr.find((x) => String(x.key || '').toLowerCase() === 'content-security-policy');
      if (c) csp = c.value || c.Value || '';
    }
  }
  if (!csp) {
    warnings.push('No root CSP found in vercel.json headers; cannot fully validate connect-src/frame-src');
  } else {
    const directives = getCSP(csp);
    const connect = directives['connect-src'] || [];
    const frame = directives['frame-src'] || [];
    for (const host of hosts) {
      if (!host.includes('grudge-studio.com')) continue; // only care about our hosts per task
      if (!hostAllowed(host, connect) && !hostAllowed(host, ['https:'])) {
        issues.push(`Host ${host} referenced in rewrites/env but not permitted by CSP connect-src`);
      }
      if (!hostAllowed(host, frame) && !hostAllowed(host, ['https:'])) {
        issues.push(`Host ${host} referenced in rewrites/env but not permitted by CSP frame-src`);
      }
    }
  }

  // Basic rewrite shape sanity
  for (const r of rewrites) {
    if (!r || !r.source || !r.destination) {
      issues.push(`Malformed rewrite entry: ${JSON.stringify(r)}`);
    }
  }

  if (warnings.length) warnings.forEach((w) => console.warn(`⚠ ${w}`));
  if (issues.length) {
    console.error('❌ hosting check FAILED');
    issues.forEach((i) => console.error('  -', i));
    process.exit(1);
  }
  console.log('✅ hosting: vercel.json rewrites/headers/env well-formed; grudge hosts permitted by CSP');
}

main();

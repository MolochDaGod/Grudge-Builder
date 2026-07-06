/**
 * Canonical Puter FS + hosting deploy helpers (REST /batch — no SDK socket).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PUTER_API = 'https://api.puter.com';
export const CRAFTING_SUBDOMAIN = 'grudge-crafting';

const PUBLIC = resolve(__dirname, '..', '..', 'client', 'public');

export function craftingBundle() {
  return {
    html: readFileSync(resolve(PUBLIC, 'grudge-crafting.html')),
    fleet: readFileSync(resolve(PUBLIC, 'grudge-fleet.js')),
  };
}

/** Deploy dirs for a Puter account username (e.g. MolochDaDev). */
export function deployPathsForUser(username) {
  const u = `/${username}`;
  return [
    `${u}/crafting`,
    `${u}/grudge-crafting`,
    `${u}/sites/grudge-crafting/deployment`,
    '/GRUDACHAIN/crafting',
    '/GRUDACHAIN/grudge-crafting',
    '/GRUDACHAIN/sites/grudge-crafting/deployment',
  ];
}

export async function batchWrite(token, dirPath, name, content, mime) {
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const form = new FormData();
  form.append(
    'operation',
    JSON.stringify({
      op: 'write',
      dedupe_name: false,
      overwrite: true,
      create_missing_ancestors: true,
      operation_id: randomUUID(),
      path: dirPath,
      name,
      item_upload_id: 0,
    }),
  );
  form.append('file', new Blob([body], { type: mime }), name);
  const res = await fetch(`${PUTER_API}/batch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} batch ${dirPath}/${name}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

export async function driverCall(token, method, args) {
  const res = await fetch(`${PUTER_API}/drivers/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;actually=json' },
    body: JSON.stringify({
      interface: 'puter-subdomains',
      method,
      args,
      auth_token: token,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} drivers/${method}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  if (data.success === false) throw new Error(data.error?.message || JSON.stringify(data.error));
  return data.result ?? data;
}

export function hostingRootDir(hosting) {
  if (!hosting) return null;
  const raw = hosting.root_dir ?? hosting.rootDir;
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  return raw.path || raw.uid || null;
}

export async function readHosting(token, subdomain = CRAFTING_SUBDOMAIN) {
  try {
    return await driverCall(token, 'read', { id: { subdomain } });
  } catch {
    return null;
  }
}

export async function bindHosting(token, rootDir, subdomain = CRAFTING_SUBDOMAIN) {
  return driverCall(token, 'update', {
    id: { subdomain },
    object: { root_dir: rootDir },
  });
}

export async function deployCraftingToPaths(token, paths, opts = {}) {
  const { html, fleet } = craftingBundle();
  const results = [];
  for (const dir of paths) {
    try {
      await batchWrite(token, dir, 'index.html', html, 'text/html');
      await batchWrite(token, dir, 'grudge-fleet.js', fleet, 'application/javascript');
      results.push({ dir, ok: true });
      if (opts.stopOnFirst) break;
    } catch (e) {
      results.push({ dir, ok: false, error: e.message });
    }
  }
  return results;
}

export async function deployCraftingSite(token, username, opts = {}) {
  const hosting = await readHosting(token);
  const hostingRoot = hostingRootDir(hosting);
  const paths = [...(opts.paths || deployPathsForUser(username))];
  if (hostingRoot && !paths.includes(hostingRoot)) {
    paths.unshift(hostingRoot);
  }

  const uploads = await deployCraftingToPaths(token, paths, opts);

  let bound = null;
  const primary = `/${username}/crafting`;
  for (const dir of [primary, hostingRoot, paths[0]].filter(Boolean)) {
    try {
      await bindHosting(token, dir);
      bound = dir;
      break;
    } catch {
      /* try next */
    }
  }

  return { uploads, bound, hostingRoot, url: `https://${CRAFTING_SUBDOMAIN}.puter.site` };
}
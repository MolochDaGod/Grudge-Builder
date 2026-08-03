/**
 * Canonical Puter FS + hosting deploy helpers (REST /batch — no SDK socket).
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PUTER_API = 'https://api.puter.com';
export const CRAFTING_SUBDOMAIN = 'grudge-crafting';

const PUBLIC = resolve(__dirname, '..', '..', 'client', 'public');
const CRAFTING_ICONS_DIR = resolve(PUBLIC, 'crafting-icons');

export function craftingBundle() {
  // Prefer redirect shell so Puter bookmarks land on grudgewarlords.com/craft/
  const redirectPath = resolve(PUBLIC, 'grudge-crafting-redirect.html');
  const fullPath = resolve(PUBLIC, 'grudge-crafting.html');
  const htmlPath = existsSync(redirectPath) ? redirectPath : fullPath;
  return {
    html: readFileSync(htmlPath),
    /** Full suite still uploaded as craft.html for debugging / offline puter */
    fullHtml: existsSync(fullPath) ? readFileSync(fullPath) : null,
    fleet: readFileSync(resolve(PUBLIC, 'grudge-fleet.js')),
  };
}

/** Single-frame profession/camp/recipe icons (Grudge Islands SSOT). */
export function craftingIconFiles() {
  if (!existsSync(CRAFTING_ICONS_DIR)) return [];
  return readdirSync(CRAFTING_ICONS_DIR)
    .filter((n) => /\.(png|webp|jpe?g|svg)$/i.test(n))
    .map((name) => ({
      name,
      path: join(CRAFTING_ICONS_DIR, name),
      body: readFileSync(join(CRAFTING_ICONS_DIR, name)),
      mime: name.endsWith('.webp') ? 'image/webp' : 'image/png',
    }));
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
  // Keep Puter + Warlords public/craft in sync before upload
  try {
    const { spawnSync } = await import('node:child_process');
    const sync = resolve(__dirname, '../sync-craft-public.mjs');
    spawnSync(process.execPath, [sync], { stdio: 'inherit' });
  } catch {
    /* optional */
  }
  const { html, fullHtml, fleet } = craftingBundle();
  const icons = craftingIconFiles();
  const results = [];
  for (const dir of paths) {
    try {
      // index.html = redirect → grudgewarlords.com/craft/
      await batchWrite(token, dir, 'index.html', html, 'text/html');
      // Full suite kept as craft.html for emergency / offline
      if (fullHtml) {
        await batchWrite(token, dir, 'craft.html', fullHtml, 'text/html');
      }
      await batchWrite(token, dir, 'grudge-fleet.js', fleet, 'application/javascript');
      const iconsDir = `${dir.replace(/\/$/, '')}/crafting-icons`;
      for (const icon of icons) {
        await batchWrite(token, iconsDir, icon.name, icon.body, icon.mime);
      }
      results.push({ dir, ok: true, icons: icons.length, mode: 'redirect-to-warlords' });
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

  return {
    uploads,
    bound,
    hostingRoot,
    url: `https://${CRAFTING_SUBDOMAIN}.puter.site`,
    canonical: 'https://grudgewarlords.com/craft/',
  };
}
/**
 * Build layout save/load — placed props (benches, towers, camps, modular…) for
 * island-3d / editor. Local SSOT + optional Railway PATCH.
 *
 * Storage key: warlords_build_layout_v1:{accountId}:{islandKey}
 * Optional API: PATCH /api/island/build-layout  (soft-fail if missing)
 */
import type { BuildingSystem } from './BuildingSystem';
import { getBuildAsset } from './BuildAssetManifest';
import { authHeaders } from '@/lib/grudgeBackend';

export const BUILD_LAYOUT_VERSION = 1 as const;
export const BUILD_LAYOUT_STORAGE_PREFIX = 'warlords_build_layout_v1';

export interface BuildLayoutRecord {
  id: string;
  assetId: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export interface BuildLayoutDoc {
  version: typeof BUILD_LAYOUT_VERSION;
  updatedAt: number;
  accountId: string;
  islandKey: string;
  seed?: string;
  props: BuildLayoutRecord[];
}

export function buildLayoutStorageKey(accountId: string, islandKey: string): string {
  return `${BUILD_LAYOUT_STORAGE_PREFIX}:${accountId || 'guest'}:${islandKey || 'default'}`;
}

export function collectLayoutFromBuilding(
  building: BuildingSystem,
  meta: { accountId: string; islandKey: string; seed?: string },
): BuildLayoutDoc {
  return {
    version: BUILD_LAYOUT_VERSION,
    updatedAt: Date.now(),
    accountId: meta.accountId || 'guest',
    islandKey: meta.islandKey || 'default',
    seed: meta.seed,
    props: building.exportLayout(),
  };
}

export function saveBuildLayoutLocal(doc: BuildLayoutDoc): void {
  try {
    const key = buildLayoutStorageKey(doc.accountId, doc.islandKey);
    localStorage.setItem(key, JSON.stringify(doc));
  } catch (e) {
    console.warn('[buildLayoutSave] localStorage failed', e);
  }
}

export function loadBuildLayoutLocal(
  accountId: string,
  islandKey: string,
): BuildLayoutDoc | null {
  try {
    const key = buildLayoutStorageKey(accountId, islandKey);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const doc = JSON.parse(raw) as BuildLayoutDoc;
    if (!doc?.props || !Array.isArray(doc.props)) return null;
    // Drop unknown assets so old saves stay loadable
    doc.props = doc.props.filter((p) => !!getBuildAsset(p.assetId));
    return doc;
  } catch {
    return null;
  }
}

/** Best-effort cloud save — never throws. */
export async function saveBuildLayoutRemote(doc: BuildLayoutDoc): Promise<boolean> {
  try {
    const res = await fetch('/api/island/build-layout', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(doc),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadBuildLayoutRemote(
  accountId: string,
  islandKey: string,
): Promise<BuildLayoutDoc | null> {
  try {
    const q = new URLSearchParams({
      accountId: accountId || 'guest',
      islandKey: islandKey || 'default',
    });
    const res = await fetch(`/api/island/build-layout?${q}`, {
      headers: authHeaders(),
    });
    if (res.status === 401 || res.status === 404) return null;
    if (!res.ok) return null;
    const doc = (await res.json()) as BuildLayoutDoc;
    if (!doc?.props) return null;
    doc.props = doc.props.filter((p) => !!getBuildAsset(p.assetId));
    return doc;
  } catch {
    return null;
  }
}

/** Save local + fire-and-forget remote. */
export function persistBuildLayout(
  building: BuildingSystem,
  meta: { accountId: string; islandKey: string; seed?: string },
): BuildLayoutDoc {
  const doc = collectLayoutFromBuilding(building, meta);
  saveBuildLayoutLocal(doc);
  void saveBuildLayoutRemote(doc);
  return doc;
}

/** Prefer remote if newer, else local. */
export async function resolveBuildLayout(
  accountId: string,
  islandKey: string,
): Promise<BuildLayoutDoc | null> {
  const local = loadBuildLayoutLocal(accountId, islandKey);
  const remote = await loadBuildLayoutRemote(accountId, islandKey);
  if (remote && local) {
    return (remote.updatedAt ?? 0) >= (local.updatedAt ?? 0) ? remote : local;
  }
  return remote ?? local;
}

export function applyBuildLayout(
  building: BuildingSystem,
  doc: BuildLayoutDoc | null,
): { placed: number; skipped: number } {
  if (!doc?.props?.length) return { placed: 0, skipped: 0 };
  return building.importLayout(doc.props);
}

/** Download JSON for editor export. */
export function downloadBuildLayoutJson(doc: BuildLayoutDoc, filename?: string): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ||
    `warlords-build-${doc.islandKey}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

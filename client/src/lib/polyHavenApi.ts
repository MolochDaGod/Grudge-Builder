/**
 * Poly Haven API — free CC0 PBR textures.
 * Catalog: https://polyhaven.com/textures
 * API docs: https://polyhaven.com/our-api
 * Requires a unique User-Agent per their ToS.
 */
const POLY_HAVEN_USER_AGENT = 'GrudgeWarlords/1.0 (grudgewarlords.com)';
/** Prefer same-origin proxy when present; always fall back to public Poly Haven (CORS OK). */
const API_BASES = import.meta.env.DEV
  ? (['https://api.polyhaven.com'] as const)
  : (['/api/polyhaven', 'https://api.polyhaven.com'] as const);
const CDN_BASES = import.meta.env.DEV
  ? (['https://dl.polyhaven.org'] as const)
  : (['/api/polyhaven-dl', 'https://dl.polyhaven.org'] as const);

/** R2 mirror — run scripts/upload-polyhaven-lobby-textures.mjs */
export const POLYHAVEN_R2_LOBBY_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASSETS_URL)
    ? `${import.meta.env.VITE_ASSETS_URL}/textures/polyhaven/lobby`
    : 'https://assets.grudge-studio.com/textures/polyhaven/lobby';

export type LobbyPolyHavenLayer =
  | 'beach' | 'grass' | 'forest' | 'rock' | 'ore' | 'path' | 'building' | 'seafloor';

const R2_MAP_FILES: Record<string, string> = {
  map: 'diff',
  normalMap: 'nor_gl',
  roughnessMap: 'rough',
  aoMap: 'ao',
};

let r2LobbyManifestLoaded = false;
let r2LobbyLayers = new Set<LobbyPolyHavenLayer>();

async function probeR2LobbyManifest(): Promise<void> {
  if (r2LobbyManifestLoaded) return;
  r2LobbyManifestLoaded = true;
  try {
    const res = await fetch(`${POLYHAVEN_R2_LOBBY_BASE}/manifest.json`, { method: 'HEAD' });
    if (!res.ok) return;
    const json = await (await fetch(`${POLYHAVEN_R2_LOBBY_BASE}/manifest.json`)).json();
    r2LobbyLayers = new Set(Object.keys(json.layers ?? {}) as LobbyPolyHavenLayer[]);
  } catch {
    /* live Poly Haven API fallback */
  }
}

function r2LobbyMapUrl(layer: LobbyPolyHavenLayer, mapKey: keyof typeof R2_MAP_FILES): string {
  const file = R2_MAP_FILES[mapKey];
  return `${POLYHAVEN_R2_LOBBY_BASE}/${layer}/${file}.jpg`;
}

export type PolyHavenResolution = '1k' | '2k' | '4k';

export type PolyHavenMapKind = 'Diffuse' | 'nor_gl' | 'Rough' | 'AO' | 'Displacement';

interface FileEntry {
  url: string;
  size: number;
  md5: string;
}

type FilesResponse = Record<string, Record<PolyHavenResolution, Record<string, FileEntry>>>;

const fileCache = new Map<string, FilesResponse>();

function rewriteCdnUrl(url: string): string {
  // Prefer direct Poly Haven CDN in production when proxy is missing (404 spam)
  if (import.meta.env.DEV) return url;
  // Keep absolute dl.polyhaven.org — browser CORS allows texture loads
  return url;
}

export async function fetchPolyHavenFiles(assetId: string): Promise<FilesResponse> {
  const cached = fileCache.get(assetId);
  if (cached) return cached;

  let lastErr: Error | null = null;
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}/files/${assetId}`, {
        headers: { 'User-Agent': POLY_HAVEN_USER_AGENT },
      });
      if (!res.ok) {
        lastErr = new Error(`Poly Haven files/${assetId}: ${res.status} via ${base}`);
        continue;
      }
      const data = (await res.json()) as FilesResponse;
      fileCache.set(assetId, data);
      return data;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error(`Poly Haven files/${assetId}: all endpoints failed`);
}

export function resolveMapUrl(
  files: FilesResponse,
  kind: PolyHavenMapKind,
  resolution: PolyHavenResolution,
  format: 'jpg' | 'png' = 'jpg',
): string | null {
  const kindFiles = files[kind];
  if (!kindFiles) return null;
  const resFiles = kindFiles[resolution];
  if (!resFiles) return null;
  const entry = resFiles[format] ?? resFiles.jpg ?? resFiles.png;
  return entry?.url ? rewriteCdnUrl(entry.url) : null;
}

export interface PolyHavenPBRMaps {
  map?: string;
  normalMap?: string;
  roughnessMap?: string;
  aoMap?: string;
  displacementMap?: string;
}

export async function resolvePolyHavenPBR(
  assetId: string,
  resolution: PolyHavenResolution = '2k',
  r2Layer?: LobbyPolyHavenLayer,
): Promise<PolyHavenPBRMaps> {
  if (r2Layer) {
    await probeR2LobbyManifest();
    if (r2LobbyLayers.has(r2Layer)) {
      return {
        map: r2LobbyMapUrl(r2Layer, 'map'),
        normalMap: r2LobbyMapUrl(r2Layer, 'normalMap'),
        roughnessMap: r2LobbyMapUrl(r2Layer, 'roughnessMap'),
        aoMap: r2LobbyMapUrl(r2Layer, 'aoMap'),
      };
    }
  }

  const files = await fetchPolyHavenFiles(assetId);
  return {
    map: resolveMapUrl(files, 'Diffuse', resolution) ?? undefined,
    normalMap: resolveMapUrl(files, 'nor_gl', resolution) ?? undefined,
    roughnessMap: resolveMapUrl(files, 'Rough', resolution) ?? undefined,
    aoMap: resolveMapUrl(files, 'AO', resolution) ?? undefined,
    displacementMap: resolveMapUrl(files, 'Displacement', resolution, 'jpg') ?? undefined,
  };
}

export interface PolyHavenAssetInfo {
  name: string;
  categories: string[];
  tags: string[];
  description?: string;
  thumbnail_url?: string;
}

/** Browse page for a texture asset */
export function polyHavenTextureUrl(assetId: string): string {
  return `https://polyhaven.com/a/${assetId}`;
}

/** Search the public texture catalog (same data as polyhaven.com/textures filters) */
export async function searchPolyHavenTextures(opts: {
  categories?: string;
  tags?: string;
}): Promise<Record<string, PolyHavenAssetInfo>> {
  const params = new URLSearchParams({ t: 'textures' });
  if (opts.categories) params.set('categories', opts.categories);
  if (opts.tags) params.set('tags', opts.tags);

  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}/assets?${params}`, {
        headers: { 'User-Agent': POLY_HAVEN_USER_AGENT },
      });
      if (res.ok) return res.json();
    } catch {
      /* next */
    }
  }
  throw new Error(`Poly Haven assets search failed`);
}
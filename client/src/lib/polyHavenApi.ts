/**
 * Poly Haven API — free CC0 PBR textures (https://polyhaven.com/our-api).
 * Requires a unique User-Agent per their ToS.
 */
const POLY_HAVEN_USER_AGENT = 'GrudgeWarlords/1.0 (grudgewarlords.com)';
const API_BASE = import.meta.env.DEV
  ? 'https://api.polyhaven.com'
  : '/api/polyhaven';
const CDN_BASE = import.meta.env.DEV
  ? 'https://dl.polyhaven.org'
  : '/api/polyhaven-dl';

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
  if (import.meta.env.DEV) return url;
  return url.replace('https://dl.polyhaven.org/', `${CDN_BASE}/`);
}

export async function fetchPolyHavenFiles(assetId: string): Promise<FilesResponse> {
  const cached = fileCache.get(assetId);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/files/${assetId}`, {
    headers: { 'User-Agent': POLY_HAVEN_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Poly Haven files/${assetId}: ${res.status}`);
  const data = (await res.json()) as FilesResponse;
  fileCache.set(assetId, data);
  return data;
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
): Promise<PolyHavenPBRMaps> {
  const files = await fetchPolyHavenFiles(assetId);
  return {
    map: resolveMapUrl(files, 'Diffuse', resolution) ?? undefined,
    normalMap: resolveMapUrl(files, 'nor_gl', resolution) ?? undefined,
    roughnessMap: resolveMapUrl(files, 'Rough', resolution) ?? undefined,
    aoMap: resolveMapUrl(files, 'AO', resolution) ?? undefined,
    displacementMap: resolveMapUrl(files, 'Displacement', resolution, 'jpg') ?? undefined,
  };
}
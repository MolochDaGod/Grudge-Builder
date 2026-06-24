/**
 * ObjectStore 3D Model API
 *
 * Fetches 3D model metadata from ObjectStore (single source of truth).
 * Models are served from R2 via info.grudge-studio.com.
 *
 * Endpoints:
 *   GET /v1/models              List 3D models (glb, gltf, fbx, obj)
 *   GET /v1/models/:id/file     Download model file
 *   GET /v1/models/:id/thumbnail  Model thumbnail
 */

const OBJECTSTORE_URL = 'https://info.grudge-studio.com';
// Fallback — same domain, custom domain is stable now
const OBJECTSTORE_FALLBACK = 'https://info.grudge-studio.com';

export interface Model3D {
  id: string;
  filename: string;
  mime: string;
  size: number;
  category: string;
  tags: string[];
  created_at: string;
  file_url: string;
  thumbnail_url: string;
}

export interface ModelsResponse {
  models: Model3D[];
  count: number;
  total: number;
}

let _baseUrl: string | null = null;

/** Resolve the best available ObjectStore URL */
async function getBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl;
  try {
    const r = await fetch(`${OBJECTSTORE_URL}/health`, { method: 'GET' });
    if (r.ok) { _baseUrl = OBJECTSTORE_URL; return _baseUrl; }
  } catch { /* custom domain down */ }
  _baseUrl = OBJECTSTORE_FALLBACK;
  return _baseUrl;
}

/** Fetch 3D models from ObjectStore */
export async function fetchModels(opts?: {
  limit?: number;
  offset?: number;
  format?: string;
  q?: string;
  animated?: boolean;
}): Promise<ModelsResponse> {
  const base = await getBaseUrl();
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.format) params.set('format', opts.format);
  if (opts?.q) params.set('q', opts.q);
  if (opts?.animated !== undefined) params.set('animated', String(opts.animated));

  try {
    const res = await fetch(`${base}/v1/models?${params}`);
    if (!res.ok) return { models: [], count: 0, total: 0 };
    const data = await res.json();
    // Resolve file URLs to absolute
    const models = (data.models || []).map((m: any) => ({
      ...m,
      file_url: `${base}/v1/models/${m.id}/file`,
      thumbnail_url: `${base}/v1/models/${m.id}/thumbnail`,
    }));
    return { models, count: data.count || 0, total: data.total || 0 };
  } catch {
    return { models: [], count: 0, total: 0 };
  }
}

/** Get a direct download URL for a 3D model */
export function getModelUrl(modelId: string): string {
  const base = _baseUrl || OBJECTSTORE_URL;
  return `${base}/v1/models/${modelId}/file`;
}

/** Get thumbnail URL for a 3D model */
export function getModelThumbnailUrl(modelId: string): string {
  const base = _baseUrl || OBJECTSTORE_URL;
  return `${base}/v1/models/${modelId}/thumbnail`;
}

/** Search models by filename */
export async function searchModels(query: string): Promise<Model3D[]> {
  const result = await fetchModels({ q: query, limit: 50 });
  return result.models;
}

/**
 * Grudge AI Gateway — R2 Storage Helper
 *
 * Uploads generated assets (images, audio, video) to the grudge-assets R2 bucket.
 * Returns CDN URLs via assets.grudge-studio.com.
 */

import type { Env } from './types';

export interface UploadResult {
  r2_path: string;
  cdn_url: string;
  size: number;
  etag: string;
}

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  json: 'application/json',
};

function guessContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Upload a generated asset to R2.
 *
 * @param env   - Worker bindings (needs ASSETS R2 bucket)
 * @param path  - R2 key path (e.g. "generated/sprites/barbarian_idle.png")
 * @param data  - Raw bytes or base64 string
 * @param contentType - Override MIME type (auto-detected from path if omitted)
 */
export async function uploadToR2(
  env: Env,
  path: string,
  data: ArrayBuffer | Uint8Array | string,
  contentType?: string,
): Promise<UploadResult> {
  // Normalize path — strip leading slashes
  const key = path.replace(/^\/+/, '');

  // Convert base64 string to ArrayBuffer if needed
  let body: ArrayBuffer | Uint8Array;
  if (typeof data === 'string') {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    body = bytes;
  } else {
    body = data;
  }

  const ct = contentType || guessContentType(key);

  const obj = await env.ASSETS.put(key, body, {
    httpMetadata: {
      contentType: ct,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      source: 'grudge-ai-gateway',
      generated_at: new Date().toISOString(),
    },
  });

  return {
    r2_path: key,
    cdn_url: `${env.ASSETS_CDN_URL}/${key}`,
    size: body.byteLength,
    etag: obj.etag,
  };
}

/**
 * Generate a unique path for a generated asset.
 * Pattern: generated/{type}/{date}/{id}.{ext}
 */
export function generateAssetPath(
  type: 'sprites' | 'images' | 'audio' | 'video' | 'music',
  ext: string,
  filename?: string,
): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const id = filename || crypto.randomUUID().slice(0, 12);
  return `generated/${type}/${date}/${id}.${ext}`;
}

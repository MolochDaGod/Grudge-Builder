import { assetUrl } from '@/lib/assetConfig';

/**
 * Resolve a game-world asset path (models, textures, fish GLBs) to a loadable URL.
 * Production always uses the R2 CDN via assetUrl(); dev uses the same CDN fallback
 * so Vercel-sized builds never depend on uncommitted local binaries.
 */
export function resolveGameAssetPath(path: string): string {
  if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return assetUrl(path);
}
import { useQuery } from "@tanstack/react-query";
import { setSpriteUrlOverride } from "@/lib/spriteManifest";

interface SpriteResolveResponse {
  resolved: boolean;
  publicUrl?: string;
  objectPath?: string;
  localPath: string;
}

async function getSpriteUrl(localPath: string): Promise<string> {
  try {
    const encodedPath = encodeURIComponent(localPath);
    const response = await fetch(`/api/sprites/resolve?path=${encodedPath}`);
    if (response.ok) {
      const data: SpriteResolveResponse = await response.json();
      if (data.resolved && data.publicUrl) {
        setSpriteUrlOverride(localPath, data.publicUrl);
        return data.publicUrl;
      }
    }
  } catch (error) {
    console.debug("Sprite resolution failed, using local path:", localPath);
  }
  return localPath;
}

export function useSpriteUrl(localPath: string | null) {
  return useQuery({
    queryKey: ["sprite-url", localPath],
    queryFn: () => getSpriteUrl(localPath!),
    enabled: !!localPath,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });
}

export function resolveSpriteUrlSync(localPath: string): string {
  return localPath;
}

export async function resolveSpriteUrl(localPath: string): Promise<string> {
  return getSpriteUrl(localPath);
}

export async function preloadMigratedSprites(): Promise<number> {
  try {
    const response = await fetch("/api/sprites/manifest?migratedOnly=true");
    if (!response.ok) return 0;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return 0; // Guard against HTML 404 pages
    const entries = await response.json();
    if (!Array.isArray(entries)) return 0;
    let count = 0;
    for (const entry of entries) {
      if (entry.publicUrl && entry.localPath) {
        setSpriteUrlOverride(entry.localPath, entry.publicUrl);
        count++;
      }
    }
    return count;
  } catch {
    // Endpoint may not exist in production (Vercel SPA) — silently skip
    return 0;
  }
}

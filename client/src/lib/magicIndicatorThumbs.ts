/**
 * Magic indicator thumbnail cache — optional GLB→PNG bake.
 * Production: returns null until thumbs are preloaded from CDN; UI falls back to emoji/icon.
 */

import type { MagicIndicatorId } from "@shared/definitions/statusMagicIndicators";

const cache = new Map<string, string>();
const listeners = new Set<() => void>();
let preloadStarted = false;

function notify() {
  for (const l of listeners) l();
}

/** Subscribe to thumb-ready updates (useSyncExternalStore). */
export function subscribeMagicThumbs(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getMagicThumb(id: MagicIndicatorId | string): string | null {
  return cache.get(id) ?? null;
}

/**
 * Kick off optional preload of magic orb thumbs from CDN.
 * No-op if assets missing — StatusEffectIcons use emoji fallback.
 */
export async function preloadMagicIndicatorThumbs(): Promise<void> {
  if (preloadStarted) return;
  preloadStarted = true;

  const ids: MagicIndicatorId[] = [
    "arcane",
    "command",
    "magnetic",
    "kinetic",
    "chemical",
    "dark",
    "blood",
    "binding",
    "atomic",
    "primordial",
  ];

  // Prefer static PNG thumbs on assets CDN when present
  const base = "https://assets.grudge-studio.com/icons/magic-indicators";
  await Promise.all(
    ids.map(async (id) => {
      const url = `${base}/${id}.png`;
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) {
          cache.set(id, url);
        }
      } catch {
        /* offline / missing — keep null */
      }
    }),
  );
  notify();
}

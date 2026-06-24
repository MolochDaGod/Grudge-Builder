/**
 * IslandTopDownCapture — headless top-down render of a 3D island.
 *
 * Spins up a temporary Island3DEngine on an offscreen canvas, generates
 * the seeded procedural terrain (no character, no multiplayer, no building),
 * captures an orthographic top-down screenshot, destroys the engine,
 * and returns a data URL.  Results are cached in localStorage by seed.
 */
import { Island3DEngine } from '../engine/Island3DEngine';

const CACHE_PREFIX = 'grudge_island_topdown_';
const CACHE_VERSION = 3; // v3: opaque ocean + flattened underwater terrain

function cacheKey(seed: string): string {
  return `${CACHE_PREFIX}v${CACHE_VERSION}_${seed}`;
}

/**
 * Capture a top-down PNG of the 3D island for the given seed.
 * @param seed       Island seed string (same one used by the 3D view)
 * @param resolution Output image size in pixels (default 1024)
 * @returns          data:image/png base64 URL
 */
export async function captureIslandTopDown(
  seed: string,
  resolution = 1024,
): Promise<string> {
  // 1. Check localStorage cache
  const key = cacheKey(seed);
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch { /* storage full or unavailable — proceed without cache */ }

  // 2. Create an offscreen canvas (not added to DOM)
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;

  // 3. Spin up a lightweight engine — no character, no multiplayer
  const engine = new Island3DEngine({
    seed,
    canvas,
    width: resolution,
    height: resolution,
    enableCharacter: false,
    quality: 'low',  // we only need a single frame, keep it fast
  });

  try {
    await engine.init();

    // Render one frame so the scene is populated
    // (the engine won't auto-start since we don't call .start())
    // We call captureTopDown which renders directly
    const dataUrl = engine.captureTopDown(resolution);

    // 4. Cache the result
    try {
      localStorage.setItem(key, dataUrl);
    } catch {
      // localStorage might be full — silently skip caching
      console.warn('[IslandTopDownCapture] Cache write failed (storage full?)');
    }

    return dataUrl;
  } finally {
    // 5. Always clean up
    engine.destroy();
  }
}

/**
 * Clear cached top-down renders (e.g. when island is regenerated).
 */
export function clearTopDownCache(seed?: string): void {
  try {
    if (seed) {
      localStorage.removeItem(cacheKey(seed));
    } else {
      // Clear all cached renders
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
    }
  } catch { /* ignore */ }
}

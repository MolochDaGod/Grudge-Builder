/**
 * Debounced Island Save Hook
 *
 * Instead of calling saveIslandState() on every React state update,
 * this hook marks state as dirty and flushes to VPS every 5 seconds.
 * Prevents hammering the backend with rapid-fire PATCHes during
 * auto-harvest loops and hero movement.
 */

import { useRef, useCallback, useEffect } from 'react';
import { saveIslandState } from '@/lib/islandSystem';
import type { IslandState } from '@/lib/islandSystem';

const FLUSH_INTERVAL_MS = 5000; // 5 seconds

export function useDebouncedIslandSave(userId: string) {
  const dirtyStateRef = useRef<IslandState | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);

  /** Mark state as dirty — will be flushed on next tick */
  const markDirty = useCallback((state: IslandState) => {
    dirtyStateRef.current = state;
  }, []);

  /** Force an immediate flush (e.g., on page unload) */
  const flushNow = useCallback(async () => {
    const state = dirtyStateRef.current;
    if (!state || isSavingRef.current) return;

    isSavingRef.current = true;
    dirtyStateRef.current = null;

    try {
      const ok = await saveIslandState(userId, state);
      if (!ok) {
        // Save returned false (auth failure / VPS down) — don't re-dirty,
        // the data is already cached locally by saveIslandState.
        // The circuit breaker in puterIslandKV will prevent further spam.
      }
    } catch (e) {
      console.warn('Debounced island save failed:', e);
    } finally {
      isSavingRef.current = false;
    }
  }, [userId]);

  // Set up the periodic flush timer
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      if (dirtyStateRef.current && !isSavingRef.current) {
        flushNow();
      }
    }, FLUSH_INTERVAL_MS);

    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
      // Flush on unmount (page navigation, etc.)
      if (dirtyStateRef.current) {
        flushNow();
      }
    };
  }, [flushNow]);

  // Flush on beforeunload (tab close, refresh)
  useEffect(() => {
    const handleUnload = () => {
      const state = dirtyStateRef.current;
      if (state) {
        // Use sendBeacon for reliable save on tab close
        const body = JSON.stringify({ state: { ...state, lastUpdate: Date.now() } });
        navigator.sendBeacon?.('/api/game/player-islands/state', new Blob([body], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return { markDirty, flushNow };
}

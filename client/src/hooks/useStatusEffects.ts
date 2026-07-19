/**
 * Subscribe to local player (or entity) status effects for HUD.
 */
import { useSyncExternalStore } from 'react';
import {
  playerStatusEffects,
  getEntityStatusRuntime,
} from '@/lib/statusEffectRuntime';
import type { ActiveStatusInstance } from '@shared/definitions/statusEffects';

export function usePlayerStatusEffects(): ActiveStatusInstance[] {
  return useSyncExternalStore(
    (cb) => playerStatusEffects.subscribe(cb),
    () => playerStatusEffects.getSnapshot(),
    () => playerStatusEffects.getSnapshot(),
  );
}

export function useEntityStatusEffects(entityId: string | null | undefined): ActiveStatusInstance[] {
  return useSyncExternalStore(
    (cb) => {
      if (!entityId) return () => {};
      return getEntityStatusRuntime(entityId).subscribe(cb);
    },
    () => (entityId ? getEntityStatusRuntime(entityId).getSnapshot() : []),
    () => [],
  );
}

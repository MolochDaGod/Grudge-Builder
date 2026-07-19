/**
 * Client helpers for Warlords production onboarding.
 */
import {
  WARLORDS_FLOW_FLAGS,
  WARLORDS_HOME_ISLAND_MIN_LEVEL,
  resolveWarlordsProgress,
  warlordsStepUrl,
  type WarlordsFlowStepId,
  type WarlordsProgressResult,
} from '@shared/definitions/warlordsProductionFlow';

export { WARLORDS_HOME_ISLAND_MIN_LEVEL };

export function readFlowFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function setFlowFlag(key: string, value = true): void {
  try {
    if (value) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function markOpeningSeen(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.openingSeen);
}

export function markTutorialComplete(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.tutorialComplete);
}

export function getActiveCharacterId(): string | null {
  try {
    const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
    return (
      localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
      localStorage.getItem('grudge_active_character') ||
      localStorage.getItem('gruda_active_character_guest')
    );
  } catch {
    return null;
  }
}

export function buildWarlordsProgress(opts: {
  isAuthenticated: boolean;
  characterLevel?: number;
  hasHomeIsland?: boolean;
}): WarlordsProgressResult {
  const hasCharacter = !!getActiveCharacterId();
  return resolveWarlordsProgress({
    isAuthenticated: opts.isAuthenticated,
    hasCharacter,
    characterLevel: opts.characterLevel ?? 1,
    hasHomeIsland: opts.hasHomeIsland,
    flags: {
      openingSeen: readFlowFlag(WARLORDS_FLOW_FLAGS.openingSeen),
      tutorialComplete: readFlowFlag(WARLORDS_FLOW_FLAGS.tutorialComplete),
    },
  });
}

export function canEnterHomeIsland(level: number): boolean {
  return level >= WARLORDS_HOME_ISLAND_MIN_LEVEL;
}

export function homeIslandLockMessage(level: number): string {
  const need = WARLORDS_HOME_ISLAND_MIN_LEVEL;
  const cur = Math.max(1, level || 1);
  if (cur >= need) return '';
  return `Home Island unlocks at level ${need}. Your hero is level ${cur}. Keep playing the open world!`;
}

export function stepPath(
  id: WarlordsFlowStepId,
  characterId?: string | null,
): string {
  return warlordsStepUrl(id, { characterId: characterId || undefined });
}

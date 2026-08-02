/**
 * Client helpers for Warlords production onboarding (grudgewarlords.com).
 *
 * Flow: intro → create → airship (combat tab) → tutorial → raft → home island
 * Home island is NOT level-gated. Tutorial is skipped if home island already owned.
 */
import {
  WARLORDS_FLOW_FLAGS,
  WARLORDS_HOME_ISLAND_MIN_LEVEL,
  resolveWarlordsProgress,
  warlordsStepUrl,
  AFTER_TUTORIAL_PATH,
  type WarlordsFlowStepId,
  type WarlordsProgressResult,
} from '@shared/definitions/warlordsProductionFlow';

export {
  WARLORDS_HOME_ISLAND_MIN_LEVEL,
  AFTER_TUTORIAL_PATH,
  WARLORDS_FLOW_FLAGS,
};

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

export function markAirshipSeen(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.airshipSeen);
}

export function markTutorialComplete(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.tutorialComplete);
}

/** Raft craft/board — same unlock gate as tutorial complete for home island */
export function markRaftCrafted(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.raftCrafted);
  setFlowFlag(WARLORDS_FLOW_FLAGS.tutorialComplete);
}

export function markHomeIslandClaimed(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.homeIslandClaimed);
}

export function isTutorialComplete(): boolean {
  return (
    readFlowFlag(WARLORDS_FLOW_FLAGS.tutorialComplete) ||
    readFlowFlag(WARLORDS_FLOW_FLAGS.raftCrafted) ||
    readFlowFlag(WARLORDS_FLOW_FLAGS.homeIslandClaimed)
  );
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
      airshipSeen: readFlowFlag(WARLORDS_FLOW_FLAGS.airshipSeen),
      raftCrafted: readFlowFlag(WARLORDS_FLOW_FLAGS.raftCrafted),
      homeIslandClaimed: readFlowFlag(WARLORDS_FLOW_FLAGS.homeIslandClaimed),
    },
  });
}

/** Always true once character exists — level is never the gate */
export function canEnterHomeIsland(_level: number, opts?: {
  tutorialComplete?: boolean;
  hasHomeIsland?: boolean;
}): boolean {
  if (opts?.hasHomeIsland) return true;
  if (opts?.tutorialComplete ?? isTutorialComplete()) return true;
  return false;
}

export function homeIslandLockMessage(_level: number): string {
  if (isTutorialComplete()) return '';
  return 'Finish tutorial island and craft a raft to unlock your home island.';
}

export function stepPath(
  id: WarlordsFlowStepId,
  characterId?: string | null,
): string {
  return warlordsStepUrl(id, { characterId: characterId || undefined });
}

/** Smart entry for Play CTA — returns path for current onboarding state */
export function resolvePlayEntryPath(opts: {
  isAuthenticated: boolean;
  characterLevel?: number;
  hasHomeIsland?: boolean;
}): string {
  const p = buildWarlordsProgress(opts);
  return p.nextPath;
}

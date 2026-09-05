/**
 * Client helpers for Warlords production onboarding.
 */
import {
  WARLORDS_FLOW_FLAGS,
  WARLORDS_HOME_ISLAND_MIN_LEVEL,
  airshipForwardRelativePath,
  postCreateReturnRelativePath,
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

/** Raft craft is a tutorial milestone, not tutorial completion. */
export function markRaftCrafted(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.raftCrafted);
}

export function markTutorialComplete(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.tutorialComplete);
}

export function markAirshipSeen(): void {
  setFlowFlag(WARLORDS_FLOW_FLAGS.airshipSeen);
}

/** True once this browser completed shipwreck tutorial (account first voyage). */
export function isTutorialComplete(): boolean {
  return readFlowFlag(WARLORDS_FLOW_FLAGS.tutorialComplete);
}

export function isRaftCrafted(): boolean {
  return readFlowFlag(WARLORDS_FLOW_FLAGS.raftCrafted);
}

export function isOpeningSeen(): boolean {
  return readFlowFlag(WARLORDS_FLOW_FLAGS.openingSeen);
}

/**
 * Relative path for Foundry returnTo after create.
 * First play: leviathan cinema → pirate-islands wash-up tutorial.
 * After tutorial: /airship → home island.
 */
export function postCreatePlayPath(): string {
  return postCreateReturnRelativePath(isTutorialComplete());
}

/**
 * Absolute same-origin URL for Foundry returnTo.
 */
export function postCreatePlayAbsoluteUrl(): string {
  if (typeof window === 'undefined') {
    return `https://grudgewarlords.com${postCreatePlayPath()}`;
  }
  return `${window.location.origin}${postCreatePlayPath()}`;
}

/**
 * /airship bridge target after characterId is known.
 */
export function resolveAirshipForward(
  characterId: string,
  from: string = 'gcs',
): string {
  return airshipForwardRelativePath(characterId, isTutorialComplete(), from);
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
    },
  });
}

export function canEnterHomeIsland(_level?: number): boolean {
  // Home island after tutorial complete (or force query handled by page)
  return isTutorialComplete();
}

export function homeIslandLockMessage(_level?: number): string {
  if (isTutorialComplete()) return '';
  return 'Complete the shipwreck tutorial with your first hero first.';
}

export function stepPath(
  id: WarlordsFlowStepId,
  characterId?: string | null,
): string {
  return warlordsStepUrl(id, { characterId: characterId || undefined });
}

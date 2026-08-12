/**
 * Play Hub — product entry: Grudge account → active character → home island gameplay.
 */
import type { PlayerInfo } from '@/hooks/use-colyseus';
import { characterAPI, WARLORDS_ERA } from '@/lib/api';
import type { Character } from '@/lib/characterManager';
import { CharacterManager } from '@/lib/characterManager';
import { getToken, authHeaders } from '@/lib/grudgeBackend';
import { weaponTypeFromModel3d } from '@shared/fleet';

export type PlayDestination =
  | { path: '/'; reason: 'sign_in' }
  | { path: '/create-character'; reason: 'no_character' }
  | { path: '/island-reveal'; reason: 'no_island' }
  | { path: '/home-island'; reason: 'play_home_island' }
  | { path: string; reason: 'play_open_world' }
  | { path: '/ocean'; reason: 'play_ocean' }
  | { path: '/home'; reason: 'hub' };

export interface PlayReadiness {
  signedIn: boolean;
  hasCharacter: boolean;
  hasHomeIsland: boolean;
  activeCharacterId: string | null;
  islandSeed: string | null;
}

export function getActiveCharacterId(): string | null {
  const grudgeId = localStorage.getItem('grudge_account_id') || 'guest';
  return (
    localStorage.getItem(`gruda_active_character_${grudgeId}`) ||
    localStorage.getItem('grudge_active_character') ||
    localStorage.getItem('gruda_active_character_guest')
  );
}

export async function fetchPlayReadiness(): Promise<PlayReadiness> {
  const token = getToken();
  const activeCharacterId = getActiveCharacterId();

  if (!token) {
    return {
      signedIn: false,
      hasCharacter: false,
      hasHomeIsland: false,
      activeCharacterId: null,
      islandSeed: null,
    };
  }

  let hasHomeIsland = false;
  let islandSeed: string | null = null;
  let hasCharacter = !!activeCharacterId;
  let resolvedActiveId = activeCharacterId;

  try {
    const res = await fetch('/api/island/status', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      hasHomeIsland = !!data.homeIsland;
      islandSeed = data.seed ?? null;
    }
  } catch { /* offline */ }

  if (!hasCharacter) {
    try {
      const envelope = await characterAPI.getEnvelope(WARLORDS_ERA);
      if (envelope.characters.length > 0) {
        hasCharacter = true;
        const eraActive = envelope.eraSlots?.warlords?.activeCharacterId;
        resolvedActiveId =
          eraActive && envelope.characters.some((c) => c.id === eraActive)
            ? eraActive
            : envelope.characters[0].id;
      }
    } catch { /* offline */ }
  }

  return {
    signedIn: true,
    hasCharacter,
    hasHomeIsland,
    activeCharacterId: resolvedActiveId,
    islandSeed,
  };
}

/**
 * Resolve where "Play Warlords" should land for this account.
 *
 * Pipeline: auth → character → home island (create if missing) → home-island 3D.
 * Open world is a separate explicit action (ocean / sector play).
 */
export async function resolvePlayDestination(): Promise<PlayDestination> {
  const readiness = await fetchPlayReadiness();

  if (!readiness.signedIn) return { path: '/', reason: 'sign_in' };
  if (!readiness.hasCharacter) {
    return {
      path: '/create-character?returnTo=' + encodeURIComponent('/airship?from=play'),
      reason: 'no_character',
    };
  }

  const charQ = readiness.activeCharacterId
    ? `characterId=${encodeURIComponent(readiness.activeCharacterId)}&`
    : '';

  // First voyage before home island (same gate as /home)
  try {
    const { isTutorialComplete } = await import('@/lib/warlordsOnboarding');
    if (!isTutorialComplete()) {
      return {
        path: `/leviathan-cinema?${charQ}from=play`,
        reason: 'play_home_island',
      };
    }
  } catch {
    /* if helper missing, continue */
  }

  if (!readiness.hasHomeIsland) {
    return { path: `/island-reveal?${charQ}from=play`, reason: 'no_island' };
  }

  return {
    path: `/home-island?${charQ}from=play`.replace(/\?&/, '?'),
    reason: 'play_home_island',
  };
}

/** Direct open-world entry (Haven Shore starter sector). */
export function resolveOpenWorldDestination(sectorId = 'haven_shore'): PlayDestination {
  const zone = sectorId;
  return {
    path: `/play?sector=${encodeURIComponent(zone)}&mode=zone&worldSeed=grudge-world-1`,
    reason: 'play_open_world',
  };
}

export function playDestinationLabel(dest: PlayDestination): string {
  switch (dest.reason) {
    case 'sign_in': return 'Sign In to Play';
    case 'no_character': return 'Create Your Hero';
    case 'no_island': return 'Claim Home Island';
    case 'play_home_island': return 'Play Home Island';
    case 'play_open_world': return 'Enter Open World';
    case 'play_ocean': return 'Sail the Ocean';
    default: return 'Enter Grudge Warlords';
  }
}

/** Map a Railway character row → Colyseus / 3D engine player payload. */
export function characterToPlayerInfo(char: Character): PlayerInfo {
  const model3d = (char as Character & { model3d?: Record<string, unknown> }).model3d || {};
  const weaponSlots = (model3d.weaponSlots as Record<string, string> | undefined) || {};
  const equippedMeshes = (model3d.equippedMeshes as Record<string, string> | undefined) || {};
  // Freeform ARPG: anim/combat style follows what is equipped, not class role
  const equippedWeaponType = weaponTypeFromModel3d({
    weaponSlots,
    equippedMeshes,
    baseModelId: (model3d.baseModelId as string) || char.raceId || 'human',
    faceVariant: 'A',
    skinColor: '#ffffff',
    armorColor: '#ffffff',
    capeEnabled: false,
    scale: 1,
  });

  return {
    characterName: char.name,
    heroClass: char.classId,
    heroRace: char.raceId,
    faction: ((char as Character & { faction?: string }).faction) || 'crusade',
    level: char.level,
    characterId: char.id,
    accountId: (char as Character & { accountId?: string }).accountId,
    baseModelId: (model3d.baseModelId as string | undefined) || char.raceId || 'human',
    equippedMeshes,
    weaponSlots,
    skinColor: (model3d.skinColor as string | undefined) || '#ffffff',
    armorColor: (model3d.armorColor as string | undefined) || '#ffffff',
    equippedWeaponType,
  };
}

/**
 * Resolve the hero to use for live play — prefers explicit ?characterId=, then
 * localStorage, then Railway era roster (active slot → first character).
 */
export async function resolveActiveCharacterForPlay(
  explicitCharacterId?: string | null,
): Promise<Character | null> {
  const fromUrl =
    explicitCharacterId ??
    (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('characterId')
      : null);

  if (fromUrl) {
    try {
      const char = await characterAPI.get(fromUrl);
      CharacterManager.setActive(char.id);
      return char;
    } catch {
      /* stale or foreign id — fall through */
    }
  }

  const localId = getActiveCharacterId();
  if (localId) {
    try {
      return await characterAPI.get(localId);
    } catch {
      /* stale localStorage / 401 — fall through */
    }
  }

  if (!getToken()) return null;

  // Never throw: 401/network must return null so /play can guest-fallback
  // instead of uncaught "Authentication required" killing the page.
  try {
    const envelope = await characterAPI.getEnvelope(WARLORDS_ERA);
    const roster = envelope.characters;
    if (!roster.length) return null;

    const eraActive = envelope.eraSlots?.warlords?.activeCharacterId;
    const pickId =
      eraActive && roster.some((c) => c.id === eraActive) ? eraActive : roster[0].id;

    CharacterManager.setActive(pickId);
    return roster.find((c) => c.id === pickId) ?? null;
  } catch (err) {
    console.warn('[playHub] resolveActiveCharacterForPlay roster failed', err);
    return null;
  }
}
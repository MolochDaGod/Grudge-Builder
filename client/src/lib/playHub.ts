/**
 * Play Hub — product entry: Grudge account → active character → home island gameplay.
 */
import type { PlayerInfo } from '@/hooks/use-colyseus';
import { characterAPI, WARLORDS_ERA } from '@/lib/api';
import type { Character } from '@/lib/characterManager';
import { CharacterManager } from '@/lib/characterManager';
import { getToken, authHeaders } from '@/lib/grudgeBackend';
import { CLASS_WEAPON_MAP } from '@/lib/modelManifest';
import { weaponTypeFromModel3d } from '@shared/fleet';

export type PlayDestination =
  | { path: '/'; reason: 'sign_in' }
  | { path: '/create-character'; reason: 'no_character' }
  | { path: '/island-reveal'; reason: 'no_island' }
  | { path: '/home-island'; reason: 'play_home_island' }
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

/** Resolve where "Play Warlords" should land for this account. */
export async function resolvePlayDestination(): Promise<PlayDestination> {
  const readiness = await fetchPlayReadiness();

  if (!readiness.signedIn) return { path: '/', reason: 'sign_in' };
  if (!readiness.hasCharacter) return { path: '/create-character', reason: 'no_character' };
  return { path: '/test-play', reason: 'play_home_island' };
}

export function playDestinationLabel(dest: PlayDestination): string {
  switch (dest.reason) {
    case 'sign_in': return 'Sign In to Play';
    case 'no_character': return 'Create Your Hero';
    case 'no_island': return 'Claim Home Island';
    case 'play_home_island': return 'Play Home Island';
    default: return 'Enter Grudge Warlords';
  }
}

/** Map a Railway character row → Colyseus / 3D engine player payload. */
export function characterToPlayerInfo(char: Character): PlayerInfo {
  const model3d = (char as Character & { model3d?: Record<string, unknown> }).model3d || {};
  const weaponSlots = (model3d.weaponSlots as Record<string, string> | undefined) || {};
  const equippedWeaponType = Object.keys(weaponSlots).length
    ? weaponTypeFromModel3d(
        { weaponSlots, equippedMeshes: model3d.equippedMeshes as Record<string, string> | undefined },
        char.classId,
      )
    : (CLASS_WEAPON_MAP[char.classId] || 'sword-shield');

  return {
    characterName: char.name,
    heroClass: char.classId,
    heroRace: char.raceId,
    faction: ((char as Character & { faction?: string }).faction) || 'crusade',
    level: char.level,
    characterId: char.id,
    accountId: (char as Character & { accountId?: string }).accountId,
    baseModelId: (model3d.baseModelId as string | undefined) || char.raceId || 'human',
    equippedMeshes: (model3d.equippedMeshes as Record<string, string> | undefined) || {},
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
      /* stale localStorage — fall through */
    }
  }

  if (!getToken()) return null;

  const envelope = await characterAPI.getEnvelope(WARLORDS_ERA);
  const roster = envelope.characters;
  if (!roster.length) return null;

  const eraActive = envelope.eraSlots?.warlords?.activeCharacterId;
  const pickId =
    eraActive && roster.some((c) => c.id === eraActive) ? eraActive : roster[0].id;

  CharacterManager.setActive(pickId);
  return roster.find((c) => c.id === pickId) ?? (await characterAPI.get(pickId));
}
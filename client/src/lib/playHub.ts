/**
 * Play Hub — product entry: Grudge account → active character → home island gameplay.
 */
import { getToken, authHeaders } from '@/lib/grudgeBackend';

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

  try {
    const res = await fetch('/api/island/status', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      hasHomeIsland = !!data.homeIsland;
      islandSeed = data.seed ?? null;
    }
  } catch { /* offline */ }

  return {
    signedIn: true,
    hasCharacter: !!activeCharacterId,
    hasHomeIsland,
    activeCharacterId,
    islandSeed,
  };
}

/** Resolve where "Play Warlords" should land for this account. */
export async function resolvePlayDestination(): Promise<PlayDestination> {
  const readiness = await fetchPlayReadiness();

  if (!readiness.signedIn) return { path: '/', reason: 'sign_in' };
  if (!readiness.hasCharacter) return { path: '/create-character', reason: 'no_character' };
  if (!readiness.hasHomeIsland) return { path: '/island-reveal', reason: 'no_island' };
  return { path: '/home-island', reason: 'play_home_island' };
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
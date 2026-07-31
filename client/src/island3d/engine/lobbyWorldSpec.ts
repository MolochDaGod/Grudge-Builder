/** Lobby world scale / camera distance SSOT. */
import { OCEAN } from '@shared/definitions/namingSsot';

export const LOBBY_CHARACTER_HEIGHT_M = 1.8;
export const LOBBY_RENDER_NEAR_M = 0.1;
export const LOBBY_RENDER_FAR_M = 8000;

export interface LobbyWorldSpec {
  id: string;
  characterHeightM: number;
  nearM: number;
  farM: number;
  /**
   * Ocean free-surface Y (ocean ≡ open water ≡ sea).
   * Legacy field name waterLevel — same as oceanSurfaceY.
   */
  waterLevel: number;
  /** Preferred alias of waterLevel */
  oceanSurfaceY?: number;
}

export const WARLORDS_LOBBY_SPEC: LobbyWorldSpec = {
  id: "warlords_lobby",
  characterHeightM: LOBBY_CHARACTER_HEIGHT_M,
  nearM: LOBBY_RENDER_NEAR_M,
  farM: LOBBY_RENDER_FAR_M,
  waterLevel: OCEAN.lobbySurfaceY,
  oceanSurfaceY: OCEAN.lobbySurfaceY,
};

export function getLobbyWorldSpec(_id?: string): LobbyWorldSpec {
  return WARLORDS_LOBBY_SPEC;
}

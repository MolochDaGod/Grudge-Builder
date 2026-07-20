/** Lobby world scale / camera distance SSOT. */

export const LOBBY_CHARACTER_HEIGHT_M = 1.8;
export const LOBBY_RENDER_NEAR_M = 0.1;
export const LOBBY_RENDER_FAR_M = 8000;

export interface LobbyWorldSpec {
  id: string;
  characterHeightM: number;
  nearM: number;
  farM: number;
  waterLevel: number;
}

export const WARLORDS_LOBBY_SPEC: LobbyWorldSpec = {
  id: "warlords_lobby",
  characterHeightM: LOBBY_CHARACTER_HEIGHT_M,
  nearM: LOBBY_RENDER_NEAR_M,
  farM: LOBBY_RENDER_FAR_M,
  waterLevel: 0,
};

export function getLobbyWorldSpec(_id?: string): LobbyWorldSpec {
  return WARLORDS_LOBBY_SPEC;
}

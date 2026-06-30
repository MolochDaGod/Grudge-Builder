import { LOBBY_MAPS } from "./LobbyIslandLoader";

export const DEFAULT_PUBLIC_LOBBY_MAP_ID = "pirate-islands";

export function getDefaultPublicLobbyMapId(): string {
  return DEFAULT_PUBLIC_LOBBY_MAP_ID;
}

export interface LobbyMapRuntimeConfig {
  id: string;
  gltfUrl: string;
  name?: string;
}

export function worldServerHttpBase(): string {
  if (typeof window !== "undefined" && window.location.hostname.includes("localhost")) {
    return "http://localhost:5000";
  }
  return "";
}

export function lobbyGltfCdnUrl(mapId: string, file = "scene.gltf"): string {
  return `/api/assets/models/lobby/${mapId}/${file}`;
}

export function lobbyGltfWorldUrl(mapId: string): string {
  const base = worldServerHttpBase();
  return base ? `${base}/api/world/lobby/${mapId}/scene.gltf` : lobbyGltfCdnUrl(mapId);
}

export function resolveLobbyGltfUrl(mapId: string): string {
  const id = mapId || DEFAULT_PUBLIC_LOBBY_MAP_ID;
  const def = LOBBY_MAPS.find((m) => m.id === id) ?? LOBBY_MAPS[0];
  return def?.gltfPath ?? lobbyGltfCdnUrl(id);
}

export function resolveLobbyGltfUrls(mapId: string): string[] {
  return [resolveLobbyGltfUrl(mapId)];
}

export async function loadLobbyMapRuntime(
  mapId: string,
): Promise<LobbyMapRuntimeConfig | null> {
  const id = mapId || DEFAULT_PUBLIC_LOBBY_MAP_ID;
  const def = LOBBY_MAPS.find((m) => m.id === id);
  return {
    id,
    gltfUrl: resolveLobbyGltfUrl(id),
    name: def?.name,
  };
}

export async function saveLobbyMapRuntime(_config: LobbyMapRuntimeConfig): Promise<void> {
  // World-server persistence is handled by the native /world editor build.
}
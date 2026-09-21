/**
 * Multiplayer Shipwreck Tutorial — production contract.
 *
 * First playable Warlords shard after the Leviathan cinema.
 * The scene uses the real pirate-islands lobby map at Shipwreck Cove while
 * tutorial progression remains per-character on the authoritative server.
 */
export const MULTIPLAYER_SHIPWRECK = {
  roomName: 'tutorial',
  legacyAlias: 'shipwreck',
  shardId: 'shipwreck-cove-v1',
  mapId: 'pirate-islands',
  islandId: 'grudge-open-world',
  locationId: 'shipwreck_cove',
  maxPlayers: 24,
  movementHz: 10,
  nodeRespawnMs: 30_000,
  gameEra: 'warlords',
} as const;

export type MultiplayerShipwreckContract = typeof MULTIPLAYER_SHIPWRECK;

export function multiplayerShipwreckJoinOptions() {
  return {
    shardId: MULTIPLAYER_SHIPWRECK.shardId,
    mapId: MULTIPLAYER_SHIPWRECK.mapId,
    islandId: MULTIPLAYER_SHIPWRECK.islandId,
    locationId: MULTIPLAYER_SHIPWRECK.locationId,
    gameEra: MULTIPLAYER_SHIPWRECK.gameEra,
  } as const;
}

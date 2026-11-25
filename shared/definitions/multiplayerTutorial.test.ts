import { describe, expect, it } from 'vitest';
import {
  MULTIPLAYER_SHIPWRECK,
  multiplayerShipwreckJoinOptions,
} from './multiplayerTutorial';

describe('MULTIPLAYER_SHIPWRECK', () => {
  it('uses the canonical Warlords pirate-islands tutorial shard', () => {
    expect(MULTIPLAYER_SHIPWRECK.roomName).toBe('tutorial');
    expect(MULTIPLAYER_SHIPWRECK.mapId).toBe('pirate-islands');
    expect(MULTIPLAYER_SHIPWRECK.locationId).toBe('shipwreck_cove');
    expect(MULTIPLAYER_SHIPWRECK.gameEra).toBe('warlords');
  });

  it('is multiplayer and exposes stable join metadata', () => {
    expect(MULTIPLAYER_SHIPWRECK.maxPlayers).toBeGreaterThanOrEqual(16);
    expect(MULTIPLAYER_SHIPWRECK.nodeRespawnMs).toBeGreaterThan(0);
    expect(multiplayerShipwreckJoinOptions()).toEqual({
      shardId: 'shipwreck-cove-v1',
      mapId: 'pirate-islands',
      islandId: 'grudge-open-world',
      locationId: 'shipwreck_cove',
      gameEra: 'warlords',
    });
  });
});

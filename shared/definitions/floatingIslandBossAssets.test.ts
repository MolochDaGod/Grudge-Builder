import { describe, it, expect } from 'vitest';
import {
  DEEP_WOODS_BOSS_ROOM,
  DESERT_BOSS_ISLAND,
  HOTH_BOSS_ROOM,
  VOLCANIC_BOSS_ARENA,
  pickBossRoomInstance,
} from './floatingIslandBossAssets';

describe('pickBossRoomInstance', () => {
  it('maps sectors to Hoth / woods / desert / lava', () => {
    expect(pickBossRoomInstance({ sectorId: 'frostbite_expanse' })?.id).toBe(HOTH_BOSS_ROOM.id);
    expect(pickBossRoomInstance({ sectorId: 'thornwood_wilds' })?.id).toBe(DEEP_WOODS_BOSS_ROOM.id);
    expect(pickBossRoomInstance({ sectorId: 'ashen_wastes' })?.id).toBe(DESERT_BOSS_ISLAND.id);
    expect(pickBossRoomInstance({ sectorId: 'ember_depths' })?.id).toBe(VOLCANIC_BOSS_ARENA.id);
  });

  it('lets dungeon names override sector', () => {
    expect(
      pickBossRoomInstance({
        sectorId: 'thornwood_wilds',
        dungeonName: 'Ember Lava Vault',
      })?.id,
    ).toBe(VOLCANIC_BOSS_ARENA.id);
    expect(
      pickBossRoomInstance({
        sectorId: 'haven_shore',
        dungeonName: 'Deep Woods Crypt',
      })?.id,
    ).toBe(DEEP_WOODS_BOSS_ROOM.id);
    expect(
      pickBossRoomInstance({
        sectorId: 'haven_shore',
        dungeonName: 'Desert Dune Tomb',
      })?.id,
    ).toBe(DESERT_BOSS_ISLAND.id);
  });
});

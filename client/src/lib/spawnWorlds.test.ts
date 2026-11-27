import { describe, expect, it } from 'vitest';
import { SPAWN_WORLDS, spawnOverlayPath, spawnWorldById } from './spawnWorlds';

describe('spawn world desk', () => {
  it('keeps play urls on spawn.co with no account query', () => {
    for (const world of SPAWN_WORLDS) {
      const url = new URL(world.playUrl);
      expect(url.hostname).toBe('www.spawn.co');
      expect(url.search).toBe('');
    }
  });

  it('keeps the organizer on this origin', () => {
    expect(spawnOverlayPath('warlords')).toBe('/worlds/overlay?world=warlords');
    expect(spawnOverlayPath('social')).toBe('/worlds/overlay?world=social');
    expect(spawnWorldById('overlay')).toBeNull();
  });
});

/**
 * Scene load-gate: player entry requires walkable + finite ground above water.
 */
import { describe, expect, it } from 'vitest';
import {
  isPhysicsReadyForEntry,
  makeSceneLoadReport,
  sceneLoadLabel,
  waitForGroundSample,
} from './sceneLoadGate';

describe('isPhysicsReadyForEntry', () => {
  it('blocks when ground sample is missing', () => {
    expect(
      isPhysicsReadyForEntry({
        rapierWorld: true,
        walkableReady: true,
        groundY: null,
        walkableCount: 3,
        waterLevel: 0,
      }),
    ).toBe(false);
  });

  it('blocks water-level fake ground (fall-through)', () => {
    expect(
      isPhysicsReadyForEntry({
        rapierWorld: true,
        walkableReady: true,
        groundY: 0.2,
        walkableCount: 1,
        waterLevel: 0,
      }),
    ).toBe(false);
  });

  it('blocks when no walkable layer exists', () => {
    expect(
      isPhysicsReadyForEntry({
        rapierWorld: false,
        walkableReady: false,
        groundY: 12,
        walkableCount: 0,
        waterLevel: 0,
      }),
    ).toBe(false);
  });

  it('allows entry when BVH (or Rapier) + dry ground are ready', () => {
    expect(
      isPhysicsReadyForEntry({
        rapierWorld: true,
        walkableReady: true,
        groundY: 8.4,
        walkableCount: 2,
        waterLevel: 0,
      }),
    ).toBe(true);
  });
});

describe('sceneLoadLabel / report', () => {
  it('keeps physics stage label for the loadscreen', () => {
    expect(sceneLoadLabel('physics')).toMatch(/physics/i);
    const r = makeSceneLoadReport('physics', 86);
    expect(r.progress).toBe(86);
    expect(r.physicsReady).toBe(false);
  });
});

describe('waitForGroundSample', () => {
  it('rejects water hits and accepts a nearby dry sample', async () => {
    const y = await waitForGroundSample({
      x: 0,
      z: 0,
      waterLevel: 0,
      attempts: 4,
      offsetsM: [0, 4],
      sample: (x, z) => {
        if (x === 0 && z === 0) return 0.1;
        if (x === 4) return 6.2;
        return null;
      },
    });
    expect(y).toBe(6.2);
  });

  it('returns null when every sample is missing', async () => {
    const y = await waitForGroundSample({
      x: 0,
      z: 0,
      attempts: 2,
      offsetsM: [0],
      sample: () => null,
    });
    expect(y).toBeNull();
  });
});

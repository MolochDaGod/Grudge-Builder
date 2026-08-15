/**
 * Smoke: npx tsx client/src/island3d/physics/sceneLoadGate.smoke.ts
 */
import {
  isPhysicsReadyForEntry,
  makeSceneLoadReport,
  waitForGroundSample,
} from './sceneLoadGate.ts';

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

assert(
  !isPhysicsReadyForEntry({
    rapierWorld: true,
    walkableReady: true,
    groundY: null,
    walkableCount: 3,
    waterLevel: 0,
  }),
  'null ground blocks',
);
assert(
  !isPhysicsReadyForEntry({
    rapierWorld: true,
    walkableReady: true,
    groundY: 0.2,
    walkableCount: 1,
    waterLevel: 0,
  }),
  'water fake blocks',
);
assert(
  isPhysicsReadyForEntry({
    rapierWorld: true,
    walkableReady: true,
    groundY: 8.4,
    walkableCount: 2,
    waterLevel: 0,
  }),
  'dry ground allows',
);
assert(makeSceneLoadReport('physics', 86).physicsReady === false, 'physics stage not ready');

void (async () => {
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
  assert(y === 6.2, `nearby dry sample, got ${y}`);
  console.log('sceneLoadGate smoke ok');
})();

/**
 * Layout + loot smoke tests.
 * Run: npx tsx client/src/island3d/zone/VolcanicClimbIslandSystem.test.ts
 */
import {
  VOLCANIC_CLIMB,
  layoutVolcanicClimbFloor,
  volcanicClimbRng,
  volcanicClimbOrigin,
  volcanicClimbFloorBaseY,
  volcanicClimbSpawnY,
  rollSummitChestLoot,
  summitTierFromFloor,
} from '../../../../shared/definitions/volcanicClimb.ts';

function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

// Determinism
const a = layoutVolcanicClimbFloor(12);
const b = layoutVolcanicClimbFloor(12);
assert(a.x === b.x && a.z === b.z && a.kind === b.kind, 'same floor same layout');

// Summit cadence
const summit = layoutVolcanicClimbFloor(VOLCANIC_CLIMB.summitEveryFloors);
assert(summit.isSummit === true, 'floor 12 is summit');
assert(summit.kind === 'summit_plate', 'summit kind');

// Event cadence (not summit)
const event = layoutVolcanicClimbFloor(VOLCANIC_CLIMB.eventEveryFloors);
assert(event.isEvent === true, 'floor 6 is event');
assert(event.isSummit === false, 'event not summit');

// Sector offsets — ashen must not be origin (EventIsland clearance)
const emberO = volcanicClimbOrigin('ember_depths');
const ashenO = volcanicClimbOrigin('ashen_wastes');
assert(emberO.x === 0 && emberO.z === 0, 'ember origin 0');
assert(Math.hypot(ashenO.x, ashenO.z) > 50, 'ashen offset clears event islands');

// Floor Y SSOT
const y0 = volcanicClimbFloorBaseY(0, 10);
const y1 = volcanicClimbFloorBaseY(1, 10);
assert(Math.abs(y1 - y0 - VOLCANIC_CLIMB.floorStepM) < 1e-6, 'floor step Y');
assert(volcanicClimbSpawnY(10) > y0, 'spawn above base');

// Loot deterministic + non-empty
const lootA = rollSummitChestLoot(12);
const lootB = rollSummitChestLoot(12);
assert(lootA.length > 0, 'loot non-empty');
assert(
  lootA.map((g) => `${g.itemId}:${g.qty}`).join('|') ===
    lootB.map((g) => `${g.itemId}:${g.qty}`).join('|'),
  'loot deterministic',
);
assert(summitTierFromFloor(12) === 1, 'tier 1');
assert(summitTierFromFloor(24) === 2, 'tier 2');

// RNG range
const rng = volcanicClimbRng(0);
for (let i = 0; i < 20; i++) {
  const v = rng();
  assert(v >= 0 && v < 1, 'rng unit interval');
}

// Jumpable-ish horizontal spread
let spread = 0;
for (let f = 1; f < 20; f++) {
  const L = layoutVolcanicClimbFloor(f);
  spread = Math.max(spread, Math.hypot(L.x, L.z));
}
assert(spread > 5, `spiral has radius spread=${spread}`);

console.log('VolcanicClimbIslandSystem.test.ts OK', {
  summit: summit.kind,
  event: event.kind,
  ashenO,
  loot: lootA.map((g) => `${g.qty}×${g.itemId}`).join(', '),
  spread: spread.toFixed(1),
});

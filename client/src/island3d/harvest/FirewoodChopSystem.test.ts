/**
 * Firewood notch / split math smoke tests.
 * Run: npx vitest run --config client/vitest.config.ts client/src/island3d/harvest/FirewoodChopSystem.test.ts
 */
import {
  FIREWOOD_CHOP,
  evaluateBaseStrike,
  evaluateGroundSplit,
  fallYawFromNotchFace,
  isWithinNotchArc,
  initialSegmentHits,
  yawDelta,
} from '../../../../shared/definitions/firewoodChop.ts';

import { test } from 'vitest';

test('FirewoodChopSystem gameplay invariants', () => {
function assert(c: boolean, m: string) {
  if (!c) throw new Error(m);
}

// First hit locks face
const first = evaluateBaseStrike({
  treeX: 0,
  treeZ: 0,
  treeBaseY: 0,
  impactX: 1,
  impactY: 0.6,
  impactZ: 0,
  faceYaw: null,
});
assert(first.locksFace && first.grade === 'perfect', 'lock face');
assert(first.progressDelta >= FIREWOOD_CHOP.notchProgressPerHit * 0.9, 'progress');

// Same face continues
const same = evaluateBaseStrike({
  treeX: 0,
  treeZ: 0,
  treeBaseY: 0,
  impactX: 1.1,
  impactY: 0.7,
  impactZ: 0.1,
  faceYaw: first.strikeYaw,
});
assert(same.angleOk, 'same face ok');
assert(same.progressDelta > FIREWOOD_CHOP.chipProgressPerMiss, 'good progress');

// Opposite side chips only
const opp = evaluateBaseStrike({
  treeX: 0,
  treeZ: 0,
  treeBaseY: 0,
  impactX: -1,
  impactY: 0.6,
  impactZ: 0,
  faceYaw: first.strikeYaw,
});
assert(!opp.angleOk && opp.grade === 'chip', 'wrong side chip');

// Too high
const high = evaluateBaseStrike({
  treeX: 0,
  treeZ: 0,
  treeBaseY: 0,
  impactX: 1,
  impactY: 3.5,
  impactZ: 0,
  faceYaw: first.strikeYaw,
});
assert(high.grade === 'miss_high', 'miss high');

// Fall away from face
const fall = fallYawFromNotchFace(0);
assert(Math.abs(yawDelta(fall, Math.PI)) < 1e-6, 'fall opposite');

// Arc helper
assert(isWithinNotchArc(0.1, 0), 'within arc');
assert(!isWithinNotchArc(Math.PI, 0), 'outside arc');

// Ground segments
const segs = initialSegmentHits();
assert(segs.length === FIREWOOD_CHOP.groundSplitSegments, 'seg count');
let hits = segs.slice();
let last = evaluateGroundSplit({ segmentHits: hits, hitSegmentIndex: 0 });
assert(last.ok, 'split ok');
// Simulate hitsPerSegment on seg 0
hits[0] = FIREWOOD_CHOP.hitsPerSegment - 1;
last = evaluateGroundSplit({ segmentHits: hits, hitSegmentIndex: 0 });
assert(last.completedSegment, 'segment completes');

console.log('FirewoodChopSystem.test.ts OK', {
  first: first.grade,
  same: same.grade,
  opp: opp.grade,
  segs: segs.length,
});
});
